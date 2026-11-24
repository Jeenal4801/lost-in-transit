import {test} from 'node:test';
import assert from 'node:assert/strict';
import {syncCheckpoint} from '../.test-build/frontend/src/cloudSync.js';
import {newRun} from '../.test-build/frontend/src/director.js';
import {ConflictError} from '../.test-build/frontend/src/persistence.js';
test('Guest migration creates a new remote copy only with a missing revision; stale copies never overwrite',async()=>{
 const run=newRun(7);let remote=null;
 const upload=async(r,expected)=>{if((remote?.revision??null)!==expected)throw new ConflictError();remote={revision:(expected??0)+1,run:r};return remote.revision;};
 assert.deepEqual(await syncCheckpoint(run,null,upload),{state:'synced',revision:1});
 const stale=await syncCheckpoint({...run,revision:2},null,upload);assert.equal(stale.state,'paused');assert.equal(remote.run.revision,0);
 assert.deepEqual(await syncCheckpoint(run,1,upload),{state:'synced',revision:2});
});
for(const code of ['unavailable','resource-exhausted','permission-denied'])test(`Cloud ${code} preserves local progress and pauses synchronization`,async()=>{
 const run=newRun(27),before=structuredClone(run);let attempts=0;
 const result=await syncCheckpoint(run,4,async remote=>{attempts++;remote.architecture.capacity=12;throw Object.assign(Error('Save rejected'),{code});});
 assert.equal(result.state,'paused');assert.equal(attempts,1);assert.deepEqual(run,before);
});
