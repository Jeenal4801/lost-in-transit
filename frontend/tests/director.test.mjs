import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newRun,configuration,nextIncident,finishRun,feasible,simulate,verified,evaluateEnding,incident} from '../.test-build/frontend/src/director.js';
import {loadVault,saveVault,validateRun,checkpoint,vaultKey} from '../.test-build/frontend/src/persistence.js';
const probes=['trace','distribution','queue'];
test('Seeds reproduce incidents; variation includes gate, sequence, timing and count',()=>{
 const values=new Set();for(let seed=1;seed<=30;seed++){const a=newRun(seed),b=newRun(seed);assert.deepEqual(a.current,b.current);values.add(JSON.stringify(a.current.workload));}assert.ok(values.size>20);
});
for(const seed of [1,27,4801])test(`Complete solvable campaign and all eight concepts / seed ${seed}`,()=>{
 let r=newRun(seed);for(let i=0;i<11;i++){const state=simulate(feasible(r));assert.ok(verified(r.current,state,probes),JSON.stringify({seed,i,metrics:state.metrics}));r=finishRun(r,state,probes,2,false);assert.deepEqual(validateRun(r),r);}assert.equal(new Set(r.outcomes.slice(0,8).map(o=>o.family)).size,8);assert.equal(r.ending,'golden');
});
test('Inherited architecture changes eligibility priority and remains in the next workload',()=>{const a=newRun(22);a.outcomes=[{family:'outage'}];const b=structuredClone(a);b.architecture.retries=3;b.architecture.balance=true;assert.notDeepEqual(nextIncident(a),nextIncident(b));b.current=nextIncident(b);assert.equal(configuration(b).retries,3);});
test('Storage migration, reload, invalid input and storage quota failure',()=>{
 const m=new Map();const storage={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};const v=loadVault(storage);saveVault(storage,v);assert.deepEqual(loadVault(storage),v);assert.throws(()=>validateRun({...v.runs[0],architecture:{}}));assert.throws(()=>saveVault({...storage,setItem(){throw Error('quota');}},v));assert.equal(v.runs[0].seed,loadVault(storage).runs[0].seed);m.set(vaultKey,'bad');assert.throws(()=>loadVault(storage));
});
test('Final evaluation requires real completed workloads and three stages',()=>{const r=newRun(1);assert.equal(verified(r.current,{...simulate(feasible(r)),done:false},probes),false);assert.equal(evaluateEnding([]),null);});
for(const [name,patch,probes] of [['architect',{capacity:6},['trace','distribution','queue']],['precision',{capacity:4},['trace']],['headroom',{capacity:6},['trace']],['golden',{},['trace']],['silent',{capacity:6,validate_payload:false},['trace']],['fast',{capacity:6,retries:0},['trace']],['domino',{capacity:1,retries:0,isolate:false,queue_limit:0},['trace']],['phoenix',{capacity:6},['trace']]])test(`Measured three-stage ending is reachable: ${name}`,()=>{
 let r=newRun(27);
 for(let i=0;i<11;i++) {
  const c=feasible(r);if(i>=8)Object.assign(c,patch);
  const severe=name==='phoenix'&&i<2 ? simulate({...c,online:[false,false,false]}).metrics.succeeded<c.scenario.count*.8 : false;
  r=finishRun(r,simulate(c),i>=8?probes:['trace','distribution','queue'],severe?3:1,severe);
 }
 assert.equal(r.ending,name);
});
test('Bounded scenario parameters reject invalid saves; boundary workloads are solvable',()=>{
 for(const seed of [0,4294967295])for(const family of ['outage','latency','transport','headers','surge','distribution','correctness','dependency']){
  const r=newRun(seed);r.current=incident(seed,family,0,r.architecture);const s=simulate(feasible(r));assert.ok(verified(r.current,s,probes));
 }
});
