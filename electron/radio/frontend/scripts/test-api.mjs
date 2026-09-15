import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createForgeServer} from '../server/index.mjs';
import {validateCommand,commandSchemas} from '../shared/commands.js';

test('shared command contract rejects malformed and out-of-range inputs',()=>{
 assert.equal(Object.keys(commandSchemas).length,13);
 for(const cmd of [null,{type:'__proto__'},{type:'pose.set',params:{ll:181}},{type:'pose.set',params:{ll:'90'}},{type:'pose.set',params:{x:2}},{type:'model.set',params:{}},{type:'colors.set',params:{shell:'red'}},{type:'motion.play',params:{name:'walk',period:505}},{type:'motion.play',params:{name:'walk',steps:1.2}},{type:'screen.js',params:{code:''}},{type:'screen.js',params:{code:'x'.repeat(100001)}}])assert.throws(()=>validateCommand(cmd));
 assert.deepEqual(validateCommand({type:'pose.set',params:{ll:0,rf:180}}).params,{ll:0,rf:180});
 assert.equal(validateCommand({type:'motion.play',params:{name:'walk',speed:.3}}).type,'motion.play');
});

test('HTTP pairing, tokens, queue, acknowledgement, isolation and disconnect',async t=>{
 const server=createForgeServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>{server.closeAllConnections();server.close();});
 const base=process.env.FORGE_BASE||'http://127.0.0.1:'+server.address().port;
 const req=async(path,method='GET',data,key,extra={})=>{const r=await fetch(base+path,{method,headers:{...(data!==undefined?{'Content-Type':'application/json'}:{}),...(key?{Authorization:'Bearer '+key}:{}),...extra},body:data===undefined?undefined:JSON.stringify(data)});return {status:r.status,data:await r.json()};};
 assert.equal((await req('/api/v1/health')).data.mode,'simulation-only');
 assert.equal((await req('/api/v1/capabilities')).data.requiresBrowser,true);
 const created=await req('/api/v1/sessions','POST',{});assert.equal(created.status,201);
 const s=created.data,path='/api/v1/sessions/'+s.id,browserKey=new URL(s.browserUrl).hash.split(':')[1];
 assert.equal((await req(path+'/state')).status,401);
 assert.equal((await req(path+'/state','GET',undefined,browserKey)).status,401);
 assert.equal((await req(path+'/commands','POST',{type:'motion.home'},s.token)).status,409);
 assert.equal((await req(path+'/browser/poll','POST',{instance:'one'},s.token)).status,401);
 assert.equal((await req(path+'/browser/poll','POST',{instance:'one',state:{loaded:true,pose:{ll:90}}},browserKey)).status,200);
 assert.equal((await req(path+'/browser/poll','POST',{instance:'two'},browserKey)).status,409);
 let state=await req(path+'/state','GET',undefined,s.token);assert.equal(state.data.connected,true);assert.equal(state.data.state.pose.ll,90);
 assert.equal((await req(path+'/commands','POST',{type:'pose.set',params:{ll:200}},s.token)).status,400);
 const command={type:'pose.set',params:{ll:120}};
 const posted=await req(path+'/commands','POST',command,s.token,{'Idempotency-Key':'test-1'});assert.equal(posted.status,202);
 const repeated=await req(path+'/commands','POST',command,s.token,{'Idempotency-Key':'test-1'});assert.equal(repeated.data.id,posted.data.id);
 assert.equal((await req(path+'/commands','POST',{type:'motion.home'},s.token,{'Idempotency-Key':'test-1'})).status,409);
 const delivered=await req(path+'/browser/poll','POST',{instance:'one'},browserKey);assert.equal(delivered.data.command.id,posted.data.id);
 assert.equal((await req(path+'/browser/poll','POST',{instance:'one'},browserKey)).data.command,null);
 assert.equal((await req(path+'/browser/ack','POST',{instance:'one',id:posted.data.id,ok:true,result:{state:{pose:{ll:120}}}},browserKey)).status,200);
 const result=await req(path+'/commands/'+posted.data.id,'GET',undefined,s.token);assert.equal(result.data.status,'applied');assert.equal(result.data.result.state.pose.ll,120);
 assert.equal((await req(path+'/browser/ack','POST',{instance:'one',id:posted.data.id,ok:true},browserKey)).status,409);
 const other=(await req('/api/v1/sessions','POST',{})).data;assert.equal((await req(path+'/state','GET',undefined,other.token)).status,401);
 assert.equal((await req(path+'/state','GET',undefined,s.token,{Origin:'https://evil.invalid'})).status,403);
 assert.equal((await req(path+'/browser/disconnect','POST',{instance:'one'},browserKey)).status,200);
 assert.equal((await req(path+'/state','GET',undefined,s.token)).data.connected,false);
 assert.equal((await req(path+'/browser/poll','POST',{instance:'one'},browserKey)).status,401);
 assert.equal((await req(path,'DELETE',undefined,s.token)).status,200);
 assert.equal((await req(path+'/state','GET',undefined,s.token)).status,404);
 for(const file of ['/','/agent.md','/openapi.json','/llms.txt'])assert.equal((await fetch(base+file)).status,200,file);
 assert.equal((await fetch(base+'/package.json')).status,404);
 assert.ok([403,404].includes((await fetch(base+'/%2e%2e%2fpackage.json')).status));
});

test('session capacity and expiry',async t=>{
 const server=createForgeServer({ttl:30,maxSessions:1});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>{server.closeAllConnections();server.close();});
 const base='http://127.0.0.1:'+server.address().port;
 const create=()=>fetch(base+'/api/v1/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
 const s=await(await create()).json();assert.equal((await create()).status,503);
 await new Promise(r=>setTimeout(r,40));assert.equal((await fetch(base+'/api/v1/sessions/'+s.id+'/state',{headers:{Authorization:'Bearer '+s.token}})).status,404);
 assert.equal((await create()).status,201);
});
