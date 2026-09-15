import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../app/src/otto-motion.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const scope={exports:{},require:()=>({HOME:{ll:90,rl:90,lf:90,rf:90}})};vm.runInNewContext(js,scope);
const {createMotion,oscillatorSpec,MOTIONS}=scope.exports;
const p={period:1000,steps:1,height:30,direction:1};
const list=x=>[x.ll,x.rl,x.lf,x.rf];
assert.deepEqual(list(createMotion('walk',p).sample(0)),[90,90,65,55]);
assert.deepEqual(list(createMotion('walk',p).sample(250)),[120,120,95,85]);
assert.deepEqual(list(createMotion('walk',{...p,direction:-1}).sample(0)),[90,90,125,115]);
assert.deepEqual(list(createMotion('jump',p).sample(1000)),[90,90,150,30]);
assert.equal(createMotion('jump',{...p,steps:9}).duration,2700);
assert.deepEqual(list(createMotion('bend',p).sample(400)),[90,90,62,35]);
assert.deepEqual(list(createMotion('bend',{...p,direction:-1}).sample(800)),[90,90,75,120]);
assert.deepEqual(list(createMotion('shake',p).sample(500)),[90,90,145,122]);
assert.equal(oscillatorSpec('jitter',170,1).A[0],25);
assert.equal(oscillatorSpec('ascending',170,1).A[0],13);
assert.equal(oscillatorSpec('crusaito',30,1).P[0],90);
for(const [name] of MOTIONS)for(const direction of [-1,1])for(const height of [0,25,170]){
 const m=createMotion(name,{...p,direction,height});
 for(let t=0;t<=m.duration;t+=37)for(const v of list(m.sample(t)))assert.ok(Number.isFinite(v)&&v>=0&&v<=180,name);
 assert.deepEqual(list(m.sample(m.duration)),[90,90,90,90]);
}
console.log('PASS: 13 actions, both directions, source keyframes, clamps, home return, Jump/Crusaito quirks.');
