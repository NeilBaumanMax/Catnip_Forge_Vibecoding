// Local encrypted envelope. The passphrase and plaintext are never persisted here.
const encode=bytes=>btoa(Array.from(bytes,b=>String.fromCharCode(b)).join(''));
const decode=text=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));
async function derive(passphrase,salt){
 const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(passphrase),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:310000},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function sealCredentials(data,passphrase){
 if(passphrase.length<12)throw Error('解锁口令至少 12 个字符');
 const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const key=await derive(passphrase,salt);
 const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(data)));
 return JSON.stringify({version:1,salt:encode(salt),iv:encode(iv),ciphertext:encode(new Uint8Array(encrypted))});
}
export async function openCredentials(envelope,passphrase){
 const data=JSON.parse(envelope);
 if(data.version!==1||typeof data.ciphertext!=='string'||data.ciphertext.length>100000)throw Error('Invalid vault');
 const key=await derive(passphrase,decode(data.salt));
 const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(data.iv)},key,decode(data.ciphertext));
 return JSON.parse(new TextDecoder().decode(plain));
}
