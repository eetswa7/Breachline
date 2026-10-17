import {AUDIO_BANK,AUDIO_PARTS} from './audio-files.js?v=71';

export async function loadSoundLibrary(context,onSound){
 const chunks=new Array(AUDIO_PARTS.length);let next=0;
 await Promise.all(Array.from({length:4},async()=>{
  while(next<AUDIO_PARTS.length){const i=next++,file=AUDIO_PARTS[i],response=await fetch(new URL('../assets/'+file,import.meta.url));if(!response.ok)throw Error('Could not load '+file);chunks[i]=new Uint8Array(await response.arrayBuffer());}
 }));
 const bytes=new Uint8Array(chunks.reduce((n,c)=>n+c.length,0));let offset=0;
 for(let i=0;i<chunks.length;i++){bytes.set(chunks[i],offset);offset+=chunks[i].length;chunks[i]=null;}
 if(bytes.length!==AUDIO_BANK.bytes)throw Error('Incomplete sound library');
 // Decode the first variation of every gun before additional variations and
 // foley. Two native decoder tasks at a time keep menu interaction responsive.
 const jobs=Object.entries(AUDIO_BANK.sounds).flatMap(([key,records])=>records.map(record=>({key,...record})))
  .sort((a,b)=>a.variant-b.variant||(a.key.startsWith('shot')?0:1)-(b.key.startsWith('shot')?0:1));
 next=0;let decodedBytes=0;
 await Promise.all(Array.from({length:2},async()=>{
  while(next<jobs.length){const job=jobs[next++];
   if(job.offset<0||job.offset+job.bytes>bytes.length)throw Error('Invalid sound offset');
   const encoded=bytes.buffer.slice(job.offset,job.offset+job.bytes);
   const buffer=await context.decodeAudioData(encoded);decodedBytes+=buffer.length*buffer.numberOfChannels*4;
   onSound(job.key,job.variant,buffer);await new Promise(resolve=>setTimeout(resolve,0));
  }
 }));
 return {recordings:jobs.length,downloadBytes:bytes.length,decodedBytes};
}

export function footstepSurface(arena,position){
 if(!position)return null;
 let selected=null,top=-Infinity;
 const consider=p=>{
  if(p.destroyed||p.pitch||p.roll||p.h>.8)return;
  const y=p.mesh==='surface'?p.y:p.y+p.h*.5;
  if(Math.abs(y-position.y)>.22||y<top)return;
  const c=Math.cos(p.yaw??0),s=Math.sin(p.yaw??0),x=position.x-p.x,z=position.z-p.z;
  if(Math.abs(c*x-s*z)>p.w*.5||Math.abs(s*x+c*z)>p.d*.5)return;selected=p.surface;top=y;
 };
 for(const f of arena.visualFloorCells?.get(`${Math.floor(position.x/8)}/${Math.floor(position.z/8)}`)??[])consider(f.part);
 for(const p of arena.nearby?.(position)??[])consider(p);
 if(selected==='water')return 'Water';
 if(selected==='wood')return 'Wood';
 if(['steel','dark','blue','rust','brass'].includes(selected))return 'Metal';
 if(['concrete','asphalt','plaster','stone','limestone','tiles'].includes(selected))return 'Hard';
 if(['grass','moss','dirt','sand'].includes(selected))return 'Soft';
 if(selected==='snow')return 'Snow';if(selected==='gravel')return 'Gravel';return null;
}

// Geometry selects a shared short-room or warehouse response. No acoustic
// volumes, extra physics objects or per-voice convolution graphs are created.
export function roomAcoustics(arena,position){
 if(!position)return null;
 let selected=null;
 for(const roof of arena.nearby?.(position)??arena.blocks??[]){
  if(!roof.roof||roof.destroyed||position.y>=roof.y-roof.h*.5)continue;
  const c=Math.cos(roof.yaw??0),s=Math.sin(roof.yaw??0),x=position.x-roof.x,z=position.z-roof.z;
  if(Math.abs(c*x-s*z)>=roof.w*.5||Math.abs(s*x+c*z)>=roof.d*.5)continue;
  if(!selected||roof.y<selected.y)selected=roof;
 }
 if(selected)return selected.w*selected.d*Math.max(1,selected.y-selected.h*.5)>450?'hall':'room';
 return arena.indoors?.(position)?'room':null;
}
