// Memory Grove vault encryption. No keys/passphrases are written to storage.
export const KDF_ITERATIONS = 310000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const VERIFIER = 'Memory Grove vault verification v1';
export const randomId = () => crypto.randomUUID();
export const bytesToB64 = bytes => {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = '';
  for (let i=0;i<u8.length;i+=0x6000) str += String.fromCharCode(...u8.subarray(i,i+0x6000));
  return btoa(str);
};
export const b64ToBytes = str => Uint8Array.from(atob(str), c => c.charCodeAt(0));
export async function deriveKey(passphrase, salt, iterations=KDF_ITERATIONS) {
  if (!passphrase) throw new Error('Enter your grove passphrase.');
  if (!Number.isInteger(iterations) || iterations < 250000 || iterations > 2000000) throw new Error('Unsupported archive encryption parameters.');
  const base = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt:typeof salt === 'string' ? b64ToBytes(salt) : salt,iterations,hash:'SHA-256'}, base, {name:'AES-GCM',length:256}, false,['encrypt','decrypt']);
}
export async function encryptBytes(key, input) {
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,bytes);
  return {iv:bytesToB64(iv),data:bytesToB64(cipher)};
}
export async function decryptBytes(key, envelope) {
  try { return new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:b64ToBytes(envelope.iv)},key,b64ToBytes(envelope.data))); }
  catch { throw new Error('Incorrect passphrase, corrupted archive, or modified encrypted data.'); }
}
export async function encryptJSON(key,value) { return encryptBytes(key,encoder.encode(JSON.stringify(value))); }
export async function decryptJSON(key,envelope) { return JSON.parse(decoder.decode(await decryptBytes(key,envelope))); }
export async function newVault(passphrase) {
  const salt=bytesToB64(crypto.getRandomValues(new Uint8Array(16)));
  const key=await deriveKey(passphrase,salt);
  const check=await encryptJSON(key,{message:VERIFIER});
  return {key,meta:{kind:'memory-grove',version:1,salt,iterations:KDF_ITERATIONS,check}};
}
export async function unlockVault(passphrase,meta) {
  if (!meta || meta.kind !== 'memory-grove' || meta.version !== 1) throw new Error('This is not a supported Memory Grove vault.');
  const key=await deriveKey(passphrase,meta.salt,meta.iterations);
  const test=await decryptJSON(key,meta.check);
  if (test.message !== VERIFIER) throw new Error('Incorrect passphrase or invalid vault.');
  return key;
}
