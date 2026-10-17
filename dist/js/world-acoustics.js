// Preserve the established event gain law while the listener moves past a
// fixed emission/contact. Native HRTF supplies direction only (zero rolloff).
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
// These are unmeasured authoring approximations for one authoritative blocker,
// not physical transmission or stacked-cover simulation. Decorative/native
// glazing never changes collider ownership; glass applies to actual colliders.
const CLEAR=Object.freeze({occluded:false,gain:1,cutoff:0});
const GENERIC=Object.freeze({occluded:true,gain:.48,cutoff:1600});
const WOOD=Object.freeze({occluded:true,gain:.58,cutoff:2400});
const THIN_METAL=Object.freeze({occluded:true,gain:.40,cutoff:1800});
const MASONRY=Object.freeze({occluded:true,gain:.24,cutoff:1000});
const GLASS=Object.freeze({occluded:true,gain:.72,cutoff:4200});
const masonrySurfaces=new Set(['concrete','stone','rock','limestone','tiles']);
function colliderResponse(block){
 if(block?.surface==='glass')return GLASS;
 if(block?.surface==='wood')return WOOD;
 // Authored hollow cargo/car skins must not become metres of solid metal just
 // because gameplay retains their full AABB. This classifies, not measures.
 if(Number.isFinite(block?.shellThickness)&&block.shellThickness>0&&block.shellThickness<=.01)return THIN_METAL;
 return masonrySurfaces.has(block?.surface)?MASONRY:GENERIC;
}
// Optional profiles leave every existing boolean/default caller's law intact.
export const distanceGain=(distance,occluded=false,response)=>clamp(1/(1+distance*distance*.004)-.015,0,.85)*(occluded?(response?.gain??.48):1);
// Keep a moving biquad below Nyquist: reopening exactly onto Nyquist can make
// its native retained delay state ring explosively as coefficients converge.
export const lowpassFrequency=(distance,occluded,rate=44100,response)=>occluded?Math.max(600,(response?.cutoff??1600)/(1+distance*.018)):distance>14?Math.max(1200,10500/(1+distance*.045)):rate*.45;
// One ear snapshot is shared by HRTF, distance and all rays in a gameplay batch.
// Callers without an explicit snapshot retain Game.eye and height fallbacks.
export const coverBudget=eye=>({remaining:8,cache:new Map(),responses:new Map(),eye});
function listenerEye(game,budget){
 const p=game.player;
 return budget.eye??=game.eye?.(p)??{x:p.x,y:p.y+(p.height??1.67)-.12,z:p.z};
}
export function coverResponse(game,position,distance,height,budget){
 if(!position||distance<=2||distance>=80)return CLEAR;
 const arena=game.arena,traced=typeof arena.trace==='function';
 if(!traced&&typeof arena.visible!=='function')return CLEAR;
 const key=position.x+'/'+position.y+'/'+position.z+'/'+height;
 if(budget.cache.has(key))return budget.responses?.get(key)??(budget.cache.get(key)?GENERIC:CLEAR);
 if(budget.remaining<=0)return null;
 budget.remaining--;
 const eye=listenerEye(game,budget),end={x:position.x,y:position.y+height,z:position.z};
 let response=CLEAR;
 if(traced){
  const dx=end.x-eye.x,dy=end.y-eye.y,dz=end.z-eye.z,length=Math.hypot(dx,dy,dz);
  if(length>=.01){
   // Match Arena.visible's eye-to-source direction and endpoint tolerance.
   // Reversing the ray can select a different material in layered cover.
   const hit=arena.trace(eye,{x:dx/length,y:dy/length,z:dz/length},length);
   if(hit.t<length-.12)response=colliderResponse(hit.block);
  }
 }else if(arena.visible(eye,end)===false)response=GENERIC;
 // Keep the public boolean cache compatible, with at most eight shared
 // immutable responses beside it. Legacy hand-built budgets may omit storage.
 budget.cache.set(key,response.occluded);(budget.responses??=new Map()).set(key,response);return response;
}
export function coverOcclusion(game,position,distance,height,budget){
 const response=coverResponse(game,position,distance,height,budget);
 return response===null?null:response.occluded;
}
export class WorldAcoustics {
 constructor(){this.voices=[];this.cursor=0;}
 add(voice){this.voices.push(voice);}
 remove(voice){const i=this.voices.indexOf(voice);if(i<0)return;this.voices.splice(i,1);if(i<this.cursor)this.cursor--;if(this.cursor>=this.voices.length)this.cursor=0;}
 update(game,context,budget){
  const voices=this.voices,count=voices.length;if(!count)return;
  const p=game.player,eye=listenerEye(game,budget),now=context.currentTime??0;
  // At most four existing voices request cover per gameplay batch. The shared
  // eight-ray budget includes new emissions; identical contacts share a ray.
  // Round-robin avoids starving later tails. Clips under 180 ms and the final
  // 60 ms retain emission cover but still update level/direction every batch.
  let refreshed=0,scanned=0;
  while(scanned++<count&&refreshed<4){
   const voice=voices[this.cursor];this.cursor=(this.cursor+1)%count;
   if(voice.seconds<.18||voice.endTime-now<.06)continue;
   const moved=Math.hypot(eye.x-voice.coverX,eye.y-voice.coverY,eye.z-voice.coverZ)>=.2;
   if(!moved&&now-voice.coverAt<.08)continue;
   const distance=Math.hypot(voice.position.x-eye.x,voice.position.y-eye.y,voice.position.z-eye.z);
   const response=coverResponse(game,voice.position,distance,voice.height,budget);
   if(response===null)continue;
   voice.occluded=response.occluded;voice.response=response;voice.coverAt=now;voice.coverX=eye.x;voice.coverY=eye.y;voice.coverZ=eye.z;refreshed++;
  }
  for(const voice of voices){
   const dx=voice.position.x-eye.x,dy=voice.position.y-eye.y,dz=voice.position.z-eye.z,distance=Math.hypot(dx,dy,dz);
   const target=clamp(Math.max(voice.minimum,voice.level*distanceGain(distance,voice.occluded,voice.response)),0,1.4);
   const frequency=lowpassFrequency(distance,voice.occluded,context.sampleRate??44100,voice.response);
   // Intrinsic writes and a 25 ms exponential slew avoid accumulating Web
   // Audio automation events. The separate component envelope is untouched.
   const blend=1-Math.exp(-Math.max(0,now-voice.updatedAt)/.025);voice.updatedAt=now;
   voice.gain.gain.value+=(target-voice.gain.gain.value)*blend;
   if(voice.filter)voice.filter.frequency.value+=(frequency-voice.filter.frequency.value)*blend;
   if(voice.stereo)voice.stereo.pan.value=clamp(Math.sin(Math.atan2(dx,-dz)-(p.yaw??0)),-1,1);
  }
 }
}
