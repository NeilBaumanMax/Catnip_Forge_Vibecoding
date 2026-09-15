import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sealCredentials,openCredentials} from '../shared/credential-vault.js';
test('encrypted credential round trip, wrong password, tampering and random salt',async()=>{
 const data={apiKey:'fake-key-for-tests',clientSecret:'fake-secret',clientId:'test-app'},password='test-only-passphrase';
 const a=await sealCredentials(data,password),b=await sealCredentials(data,password);
 assert.notEqual(a,b);assert.ok(!a.includes(data.apiKey));assert.deepEqual(await openCredentials(a,password),data);
 await assert.rejects(openCredentials(a,'wrong-passphrase'));
 const bad=JSON.parse(a);bad.ciphertext=(bad.ciphertext[0]==='A'?'B':'A')+bad.ciphertext.slice(1);
 await assert.rejects(openCredentials(JSON.stringify(bad),password));
 await assert.rejects(sealCredentials(data,'short'));
});
