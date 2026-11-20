import {randomId,encryptJSON,decryptJSON,encryptBytes,decryptBytes,unlockVault,b64ToBytes,bytesToB64} from './crypto.js';
const DB_NAME = 'memory-grove-vault';
const VERSION = 2;
let connection;
let lastEventMillis=0;
const nextEventTime=()=>{const ms=Math.max(Date.now(),lastEventMillis+1);lastEventMillis=ms;return new Date(ms).toISOString();};
const request = r => new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
export async function database() {
  if (connection) return connection;
  connection=await new Promise((resolve,reject)=>{
    const r=indexedDB.open(DB_NAME,VERSION);
    r.onupgradeneeded=()=>{const d=r.result;for(const name of ['meta','events','assets','preferences','drafts']) if(!d.objectStoreNames.contains(name)) d.createObjectStore(name,{keyPath:'id'});};
    r.onsuccess=()=>{const db=r.result;db.onversionchange=()=>{db.close();connection=null;};resolve(db);};
    r.onerror=()=>reject(r.error);
    r.onblocked=()=>reject(new Error('Another Memory Grove tab is blocking a storage upgrade. Close other tabs and reopen this one.'));
  });
  return connection;
}
async function store(name,mode='readonly'){return (await database()).transaction(name,mode).objectStore(name);}
export async function getRaw(name,id){return request((await store(name)).get(id));}
// Await the transaction commit, not merely an individual request's success.
// This is crucial for media saved close to the browser's quota limit.
export async function putRaw(name,item){
  const db=await database();
  await new Promise((resolve,reject)=>{
    let tx;
    try{
      tx=db.transaction(name,'readwrite');
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error||new Error('This device could not finish saving the record.'));
      tx.onabort=()=>reject(tx.error||new Error('The save was cancelled; nothing was committed.'));
      tx.objectStore(name).put(item);
    }catch(error){try{tx?.abort();}catch{}reject(error);}
  });
  return item.id;
}
export async function allRaw(name){return request((await store(name)).getAll());}
export async function hasVault(){return !!(await getRaw('meta','vault'));}
export async function getMeta(){return (await getRaw('meta','vault'))?.value;}
export async function initializeVault(meta){if(await hasVault()) throw new Error('A grove already exists on this browser.');await putRaw('meta',{id:'vault',value:meta});}
// Create the vault and its first records as ONE transaction. If creation is
// interrupted or storage is full, no half-initialized vault is left behind.
export async function createFamilyVault(meta,key,familyName,firstPersonName,actor='A family member') {
  if(await hasVault())throw new Error('A grove already exists on this browser.');
  const firstPersonId=randomId();
  const family={id:randomId(),at:nextEventTime(),type:'family.create',actor,payload:{name:familyName,motto:'Our stories, still growing.'}};
  const person={id:randomId(),at:nextEventTime(),type:'person.create',actor,payload:{id:firstPersonId,name:firstPersonName,born:'',died:'',bio:''}};
  const eventRows=await Promise.all([family,person].map(async evt=>({id:evt.id,...await encryptJSON(key,evt)})));
  const actorPreference={id:'private-actor',...await encryptJSON(key,{value:actor})};
  await atomicAdd({meta:[{id:'vault',value:meta}],events:eventRows,preferences:[actorPreference]});
  return firstPersonId;
}
export async function getPreference(id,fallback){return (await getRaw('preferences',id))?.value ?? fallback;}
export async function setPreference(id,value){return putRaw('preferences',{id,value});}
export async function getPrivatePreference(key,id,fallback){const raw=await getRaw('preferences','private-'+id);return raw?(await decryptJSON(key,raw)).value:fallback;}
export async function setPrivatePreference(key,id,value){return putRaw('preferences',{id:'private-'+id,...await encryptJSON(key,{value})});}
export async function saveDraft(key,draft){await putRaw('drafts',{id:'capture',...await encryptJSON(key,{draft,at:new Date().toISOString()})});}
export async function readDraft(key){const row=await getRaw('drafts','capture');return row?(await decryptJSON(key,row)).draft:null;}
export async function clearDraft(key){await putRaw('drafts',{id:'capture',...await encryptJSON(key,{draft:null,at:new Date().toISOString()})});}
// Write a whole operation as one IndexedDB transaction. If quota, validation or
// another tab causes any add to fail, the browser rolls back every record.
async function atomicAdd(records){
  const names=Object.keys(records).filter(name=>records[name].length);
  if(!names.length)return;
  const db=await database();
  await new Promise((resolve,reject)=>{
    let tx;
    try{
      tx=db.transaction(names,'readwrite');
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error||new Error('Could not complete the archive write. No changes were committed.'));
      tx.onabort=()=>reject(tx.error||new Error('Archive write was cancelled. No changes were committed.'));
      for(const name of names){
        const store=tx.objectStore(name);
        for(const row of records[name])store.add(row); // add, never overwrite an existing history item
      }
    }catch(error){try{tx?.abort();}catch{}reject(error);}
  });
}
export async function appendEvent(key,type,payload,actor='A family member'){
  const evt={id:randomId(),at:nextEventTime(),type,actor,payload};
  const encrypted=await encryptJSON(key,evt);
  await atomicAdd({events:[{id:evt.id,...encrypted}]});
  return evt;
}
export async function appendEventBatch(key,items,actor='A family member'){
  if(!Array.isArray(items)||!items.length)return [];
  const events=[];
  for(const item of items){
    const evt={id:randomId(),at:nextEventTime(),type:item.type,actor,payload:item.payload};
    events.push({evt,row:{id:evt.id,...await encryptJSON(key,evt)}});
  }
  await atomicAdd({events:events.map(x=>x.row)});
  return events.map(x=>x.evt);
}
export async function loadEvents(key){
  const raws=await allRaw('events');
  const events=await Promise.all(raws.map(row=>decryptJSON(key,row)));
  return events.sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id));
}
export async function saveAsset(key,file){
  if(!file || !file.size) throw new Error('Choose a nonempty file.');
  const id=randomId();const buffer=await file.arrayBuffer();
  const encrypted=await encryptBytes(key,new Uint8Array(buffer));
  await putRaw('assets',{id,...encrypted});
  return {id,name:file.name||'Recording',mime:file.type||'application/octet-stream',size:file.size};
}
export async function loadAsset(key,id,mime='application/octet-stream'){
  const raw=await getRaw('assets',id);
  if(!raw) throw new Error('Original media not found on this device. Restore a backup containing it.');
  const bytes=await decryptBytes(key,raw);
  return new Blob([bytes],{type:mime});
}
export async function backupVault(){
  const [meta,events,assets,drafts,preferences]=await Promise.all([getMeta(),allRaw('events'),allRaw('assets'),allRaw('drafts'),allRaw('preferences')]);
  if(!meta) throw new Error('No grove exists to back up.');
  return {kind:'memory-grove-backup',version:1,exportedAt:new Date().toISOString(),vault:meta,events,assets,drafts,privatePreferences:preferences.filter(p=>p.id.startsWith('private-'))};
}
function validateArchive(data){
  if(!data||data.kind!=='memory-grove-backup'||data.version!==1||!Array.isArray(data.events)||!Array.isArray(data.assets)||!data.vault) throw new Error('Not a supported Memory Grove archive.');
  if(data.events.length>500000 || data.assets.length>100000) throw new Error('Archive has an unexpected number of records.');
  for(const [name,rows] of Object.entries({events:data.events,assets:data.assets,drafts:data.drafts||[],privatePreferences:data.privatePreferences||[]})){
    if(!Array.isArray(rows))throw new Error('Archive contains an invalid collection.');
    if(new Set(rows.map(r=>r?.id)).size!==rows.length)throw new Error('Duplicate entries in archive.');
    for(const row of rows){
      if(typeof row?.id!=='string'||!row.id||typeof row.data!=='string'||!row.data||typeof row.iv!=='string'||!row.iv)throw new Error('Archive contains an invalid encrypted record.');
      if(name==='privatePreferences'&&!row.id.startsWith('private-'))throw new Error('Archive has an invalid private preference.');
    }
  }
  return data;
}
export async function readArchive(file){
  if(file.size>1200*1024*1024) throw new Error('This archive is too large to open in the browser. Please use a smaller backup.');
  return validateArchive(JSON.parse(await file.text()));
}
export async function restoreArchive(data,passphrase){
  data=validateArchive(data);
  if(await hasVault()) throw new Error('This browser already has a grove. Unlock it and merge the archive instead.');
  const key=await unlockVault(passphrase,data.vault);
  // Authenticate everything, including event identities, before opening a write transaction.
  for(const row of data.events){
    const evt=await decryptJSON(key,row);
    if(!evt||evt.id!==row.id||typeof evt.type!=='string'||typeof evt.at!=='string')throw new Error('Archive event identity invalid.');
  }
  // Do not silently accept a backup with missing original recordings or photos.
  const originalIds=new Set(data.assets.map(row=>row.id));
  for(const row of data.events){
    const evt=await decryptJSON(key,row);
    const asset=evt.type==='memory.attach'?evt.payload?.asset:evt.type==='person.photo'?evt.payload?.asset:null;
    if(asset?.id&&!originalIds.has(asset.id))throw new Error('The archive is missing original media referenced by a family memory.');
  }
  for(const row of data.assets)await decryptBytes(key,row);
  for(const row of (data.drafts||[]))await decryptJSON(key,row);
  for(const row of (data.privatePreferences||[]))await decryptJSON(key,row);
  // Meta, media, events, drafts and private settings commit together or not at all.
  await atomicAdd({meta:[{id:'vault',value:data.vault}],events:data.events,assets:data.assets,drafts:data.drafts||[],preferences:data.privatePreferences||[]});
  return {key,count:data.events.length,media:data.assets.length};
}
export async function mergeArchive(data,sourcePassword,targetKey){
  data=validateArchive(data);
  const sourceKey=await unlockVault(sourcePassword,data.vault);
  const events=[];const assets=[];
  for(const row of data.events){
    const plain=await decryptJSON(sourceKey,row);
    if(plain.id!==row.id || !plain.type || !plain.at) throw new Error('Archive event identity invalid.');
    const existing=await getRaw('events',row.id);
    if(existing){const old=await decryptJSON(targetKey,existing);if(JSON.stringify(old)!==JSON.stringify(plain))throw new Error('A conflicting history entry was detected. The merge was cancelled.');}
    else events.push({id:row.id,...await encryptJSON(targetKey,plain)});
  }
  for(const row of data.assets){
    const plain=await decryptBytes(sourceKey,row);
    const existing=await getRaw('assets',row.id);
    if(existing){const old=await decryptBytes(targetKey,existing);if(old.length!==plain.length || old.some((v,i)=>v!==plain[i]))throw new Error('A conflicting original media file was detected. The merge was cancelled.');}
    else assets.push({id:row.id,...await encryptBytes(targetKey,plain)});
  }
  // Both new original files and all contributed events are committed atomically.
  await atomicAdd({assets,events});
  return {count:events.length,media:assets.length};
}
// Read back and authenticate everything before describing a vault as healthy.
export async function inspectVaultIntegrity(key){
  const [eventRows,assetRows]=await Promise.all([allRaw('events'),allRaw('assets')]);
  const references=new Map();let totalBytes=0;
  for(const row of eventRows){
    const evt=await decryptJSON(key,row);
    if(!evt||evt.id!==row.id||typeof evt.type!=='string')throw new Error('An archive history entry failed its identity check.');
    const asset=evt.type==='memory.attach'?evt.payload?.asset:evt.type==='person.photo'?evt.payload?.asset:null;
    if(asset?.id)references.set(asset.id,asset.size);
  }
  const assetIds=new Set();
  for(const row of assetRows){
    if(assetIds.has(row.id))throw new Error('Duplicate original media ID.');
    assetIds.add(row.id);
    const bytes=await decryptBytes(key,row);
    const expected=references.get(row.id);
    if(expected!==undefined&&Number(expected)!==bytes.byteLength)throw new Error('An original file differs in size from its archived description.');
    totalBytes+=bytes.byteLength;
  }
  for(const id of references.keys())if(!assetIds.has(id))throw new Error('A story refers to an original file that is missing. Do not rely on this vault as a complete backup.');
  return {events:eventRows.length,assets:assetRows.length,bytes:totalBytes};
}
export async function storageUsage(){
  if(!navigator.storage?.estimate)return null;
  const estimate=await navigator.storage.estimate();return {usage:estimate.usage||0,quota:estimate.quota||0,persisted:await navigator.storage.persisted?.()||false};
}
