import test from 'node:test';
import assert from 'node:assert/strict';
import {newVault,encryptJSON} from '../crypto.js';
function mockIndexedDB(){
 const stores=new Map();let version=0;
 const request=(run)=>{const r={onsuccess:null,onerror:null,result:undefined,error:undefined};queueMicrotask(()=>{try{r.result=run();r.onsuccess?.({target:r});}catch(err){r.error=err;r.onerror?.({target:r});}});return r;};
 const db={
   objectStoreNames:{contains:n=>stores.has(n)},
   createObjectStore:n=>stores.set(n,new Map()),
   transaction:(names,mode='readonly')=>{
     const namesArray=Array.isArray(names)?names:[names];
     const staged=new Map(namesArray.map(n=>[n,new Map(stores.get(n))]));
     let closed=false,scheduled=false;
     const tx={oncomplete:null,onerror:null,onabort:null,error:null,
       abort:()=>{if(!closed){closed=true;queueMicrotask(()=>tx.onabort?.({target:tx}));}},
       objectStore:n=>({
         get:id=>request(()=>staged.get(n).get(id)),
         getAll:()=>request(()=>[...staged.get(n).values()]),
         put:entry=>{staged.get(n).set(entry.id,structuredClone(entry));schedule();return request(()=>entry.id);},
         add:entry=>{if(staged.get(n).has(entry.id))throw new Error('Duplicate record');staged.get(n).set(entry.id,structuredClone(entry));schedule();return request(()=>entry.id);}
       })
     };
     const schedule=()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{if(closed)return;closed=true;if(mode==='readwrite')for(const [n,m] of staged)stores.set(n,m);tx.oncomplete?.({target:tx});});};
     return tx;
   }
 };
 return {open:(_name,v)=>{const r={onsuccess:null,onerror:null,onupgradeneeded:null,result:db,error:null};queueMicrotask(()=>{try{if(v>version){r.onupgradeneeded?.();version=v;}queueMicrotask(()=>r.onsuccess?.({target:r}));}catch(err){r.error=err;r.onerror?.({target:r});}});return r;}};
}
const instance=async name=>{globalThis.indexedDB=mockIndexedDB();return import(`../db.js?case=${name}`);};
test('backup, restore and additive family merge preserve events, encrypted originals and private drafts',async()=>{
 const dbA=await instance('source');const {key:keyA,meta:metaA}=await newVault('original-fam1ly-passphrase');
 await dbA.initializeVault(metaA);
 await dbA.appendEvent(keyA,'person.create',{id:'p1',name:'नानी',born:'1940'},'Shreya');
 const asset=await dbA.saveAsset(keyA,new File([new Uint8Array([0,12,255,66,1])],'original.mp4',{type:'video/mp4'}));
 await dbA.appendEvent(keyA,'memory.create',{id:'m1',title:'Our Hindi story',personIds:['p1'],story:'बचपन की कहानी',branch:'childhood'},'Shreya');
 await dbA.appendEvent(keyA,'memory.attach',{id:'m1',asset},'Shreya');
 await dbA.saveDraft(keyA,{story:'An unfinished story',recordAsset:asset});
 await dbA.setPrivatePreference(keyA,'actor','Shreya');
 const archive=await dbA.backupVault(),serialized=JSON.stringify(archive);
 assert.equal(serialized.includes('बचपन की कहानी'),false);
 assert.equal(serialized.includes('An unfinished story'),false);
 assert.equal(serialized.includes('original.mp4'),false);
 assert.equal(archive.events.length,3);assert.equal(archive.assets.length,1);
 const dbB=await instance('restored');
 await assert.rejects(()=>dbB.restoreArchive(archive,'wrong-password'));
 assert.equal(await dbB.hasVault(),false);
 const restored=await dbB.restoreArchive(archive,'original-fam1ly-passphrase');
 assert.equal(restored.count,3);
 const eventsB=await dbB.loadEvents(restored.key);
 assert.equal(eventsB.find(e=>e.type==='memory.create')?.payload.story,'बचपन की कहानी');
 assert.deepEqual(new Uint8Array(await (await dbB.loadAsset(restored.key,asset.id,asset.mime)).arrayBuffer()),new Uint8Array([0,12,255,66,1]));
 assert.equal((await dbB.readDraft(restored.key)).story,'An unfinished story');
 assert.equal(await dbB.getPrivatePreference(restored.key,'actor','x'),'Shreya');
 const dbC=await instance('merge');const {key:keyC,meta:metaC}=await newVault('second-private-passphrase');
 await dbC.initializeVault(metaC);
 const merged=await dbC.mergeArchive(archive,'original-fam1ly-passphrase',keyC);
 assert.equal(merged.count,3);assert.equal(merged.media,1);
 const again=await dbC.mergeArchive(archive,'original-fam1ly-passphrase',keyC);
 assert.equal(again.count,0);assert.equal(again.media,0);
 const forged=structuredClone(archive);
 const event=await dbA.loadEvents(keyA);
 forged.events[0]={id:event[0].id,...await encryptJSON(keyA,{...event[0],payload:{id:'p1',name:'An overwritten name'}})};
 await assert.rejects(()=>dbC.mergeArchive(forged,'original-fam1ly-passphrase',keyC),/conflicting history/);
 assert.equal((await dbC.loadEvents(keyC)).length,3);
});

test('archive validation rejects tampered identities and duplicate entries without creating a vault',async()=>{
 const dbSource=await instance('tamper-source');
 const {key,meta}=await newVault('long-safe-archive-passphrase');
 await dbSource.initializeVault(meta);
 await dbSource.appendEvent(key,'person.create',{id:'person-tamper',name:'Dada'},'Family');
 const original=await dbSource.backupVault();
 const tampered=structuredClone(original);
 tampered.events[0].id='substituted-event-id';
 const dbTarget=await instance('tamper-target');
 await assert.rejects(()=>dbTarget.restoreArchive(tampered,'long-safe-archive-passphrase'),/identity invalid/);
 assert.equal(await dbTarget.hasVault(),false);
 assert.equal((await dbTarget.allRaw('events')).length,0);
 const duplicated=structuredClone(original);
 duplicated.events.push(structuredClone(duplicated.events[0]));
 await assert.rejects(()=>dbTarget.restoreArchive(duplicated,'long-safe-archive-passphrase'),/Duplicate entries/);
 assert.equal(await dbTarget.hasVault(),false);
 const restored=await dbTarget.restoreArchive(original,'long-safe-archive-passphrase');
 assert.equal(restored.count,1);
});

test('new family vault is created atomically with its initial people and private contributor',async()=>{
 const db=await instance('atomic-family');
 const {key,meta}=await newVault('vault-initialization-is-atomic');
 const personId=await db.createFamilyVault(meta,key,'The Test Family','Grandmother','Grandmother');
 assert.equal(await db.hasVault(),true);
 const events=await db.loadEvents(key);
 assert.equal(events.length,2);
 assert.equal(events.find(x=>x.type==='person.create').payload.id,personId);
 assert.equal(events.find(x=>x.type==='family.create').payload.name,'The Test Family');
 assert.equal(await db.getPrivatePreference(key,'actor','missing'),'Grandmother');
 await assert.rejects(()=>db.createFamilyVault(meta,key,'Another','Other','Other'),/already exists/);
});
