// Optional end-to-end test against a deliberately paired local browser.
// FORGE_SESSION / FORGE_TOKEN are ephemeral credentials; never commit them.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const base=process.env.FORGE_BASE||'http://127.0.0.1:5182';
if(!process.env.FORGE_SESSION||!process.env.FORGE_TOKEN)throw Error('Pair a test browser and set FORGE_SESSION, FORGE_TOKEN');
const path=base+'/api/v1/sessions/'+process.env.FORGE_SESSION;
async function request(url,method='GET',data){const r=await fetch(url,{method,headers:{Authorization:'Bearer '+process.env.FORGE_TOKEN,'Content-Type':'application/json','Idempotency-Key':randomUUID()},body:data?JSON.stringify(data):undefined});const result=await r.json();if(!r.ok)throw Error(r.status+': '+JSON.stringify(result));return result;}
async function command(type,params={}){
 const sent=await request(path+'/commands','POST',{type,params});
 for(let i=0;i<100;i++){await new Promise(r=>setTimeout(r,100));const result=await request(path+'/commands/'+sent.id);if(result.status==='applied')return result.result;if(['failed','expired'].includes(result.status))throw Error(JSON.stringify(result));}
 throw Error('Command timeout '+type);
}
assert.equal((await request(path+'/state')).state.loaded,true);
let result=await command('pose.set',{ll:115,rl:75,lf:100,rf:80});assert.equal(result.state.pose.ll,115);
result=await command('colors.set',{shell:'#ffffff',body:'#ffffff'});assert.equal(result.state.colors.shell,'#ffffff');
result=await command('model.set',{model:'a'});assert.equal(result.state.model,'a');
result=await command('mount.set',{shellHeight:55,explode:.2});assert.equal(result.state.mounts.shellHeight,55);
result=await command('assembly.view',{axes:true,transparent:true});assert.equal(result.state.assembly.axes,true);
result=await command('view.set',{view:'front',rotate:false,wireframe:true});assert.equal(result.state.wireframe,true);
result=await command('motion.play',{name:'walk',period:1000,steps:2,height:30,direction:1,speed:1});assert.equal(result.state.action,'walk');
result=await command('motion.pause');assert.equal(result.state.action,'manual');
result=await command('motion.home');assert.deepEqual(result.state.pose,{ll:90,rl:90,lf:90,rf:90});
await command('model.set',{model:'b'});await command('mount.set',{shellHeight:51,explode:0});await command('assembly.view',{axes:false,transparent:false});await command('view.set',{view:'front',wireframe:false});await command('colors.set',{shell:'#e8af06',body:'#e8af06'});
result=await command('screen.js',{code:"ctx.fillStyle='#00ff88';ctx.fillRect(0,0,width,height);ctx.fillStyle='#000';ctx.font='40px sans-serif';ctx.fillText('API',75,135);"});assert.equal(result.state.screen.mode,'js');assert.match(result.state.screen.status,/运行中/);
// Give an actual rendered frame time to pass from the sandbox Worker.
await new Promise(r=>setTimeout(r,200));
result=await command('snapshot');assert.match(result.image,/^data:image\/png;base64,/);await mkdir(new URL('../qa/',import.meta.url),{recursive:true});await writeFile(new URL('../qa/api-snapshot.png',import.meta.url),Buffer.from(result.image.split(',')[1],'base64'));
result=await command('screen.stop');assert.match(result.state.screen.status,/已停止/);
result=await command('screen.gif',{face:'happy'});assert.equal(result.state.screen.face,'happy');
await command('view.set',{view:'fit'});await command('screen.gif',{face:'neutral'});
console.log('PASS: 13 command types applied in real browser; snapshot written to qa/api-snapshot.png. Mouse coexistence test is separate.');
