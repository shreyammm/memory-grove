import test from 'node:test';
import assert from 'node:assert/strict';
import {newVault,unlockVault,encryptBytes,decryptBytes,encryptJSON,decryptJSON} from '../crypto.js';
test('AES-GCM vault round-trip preserves multilingual content and checks passphrase',async()=>{
 const {key,meta}=await newVault('this passphrase is unique ♥');
 const unlocked=await unlockVault('this passphrase is unique ♥',meta);
 const original={name:'नानी',english:'A story that belongs to us',transcript:'दिवाली और होली',moment:83};
 const sealed=await encryptJSON(key,original);
 assert.equal(JSON.stringify(sealed).includes('नानी'),false);
 assert.deepEqual(await decryptJSON(unlocked,sealed),original);
 await assert.rejects(()=>unlockVault('bad password',meta));
});
test('media original survives encrypt/decrypt with exact bytes',async()=>{
 const {key}=await newVault('enough characters pass!');
 const source=new Uint8Array(65537).map((_,i)=>i%251);
 const sealed=await encryptBytes(key,source);
 const recovered=await decryptBytes(key,sealed);
 assert.deepEqual(recovered,source);
 await assert.rejects(()=>decryptBytes(key,{...sealed,data:sealed.data.slice(0,-5)+'abcde'}));
});
