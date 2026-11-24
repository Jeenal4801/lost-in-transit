import type { Run } from './director.js';
export type UploadPort=(run:Run,expectedRevision:number|null)=>Promise<number>;
export async function syncCheckpoint(run:Run,revision:number|null,upload:UploadPort):Promise<{state:'synced';revision:number}|{state:'paused';message:string}>{
 try{return {state:'synced',revision:await upload(structuredClone(run),revision)};}
 catch(error){const e=error as {code?:string;message?:string};const message=e.code==='resource-exhausted'?'The cloud quota is temporarily exhausted. Continue locally and retry later.':e.code==='unavailable'?'The cloud is offline. Continue locally and reconnect later.':e.message??'Cloud sync failed. Continue locally.';return {state:'paused',message};}
}
