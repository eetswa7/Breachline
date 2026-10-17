// Preserve the established event gain law while the listener moves past a
// fixed emission/contact. Native HRTF supplies direction only (zero rolloff).
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const distanceGain=(distance,occluded=false)=>clamp(1/(1+distance*distance*.004)-.015,0,.85)*(occluded?.48:1);
// Keep a moving biquad below Nyquist: reopening exactly onto Nyquist can make
// its native retained delay state ring explosively as coefficients converge.
export const lowpassFrequency=(distance,occluded,rate=44100)=>occluded?Math.max(600,1600/(1+distance*.018)):distance>14?Math.max(1200,10500/(1+distance*.045)):rate*.45;
// One ear snapshot is shared by HRTF, distance and all rays in a gameplay batch.
// Callers without an explicit snapshot retain Game.eye and height fallbacks.
export const coverBudget=eye=>({remaining:8,cache:new Map(),eye});
function listenerEye(game,budget){
 const p=game.player;
 return budget.eye??=game.eye?.(p)??{x:p.x,y:p.y+(p.height??1.67)-.12,z:p.z};
}
export function coverOcclusion(game,position,distance,height,budget){
 if(!position||distance<=2||distance>=80||!game.arena.visible)return false;
 const key=position.x+'/'+position.y+'/'+position.z+'/'+height;
 if(budget.cache.has(key))return budget.cache.get(key);
 if(budget.remaining<=0)return null;
 budget.remaining--;
 const result=game.arena.visible(listenerEye(game,budget),{x:position.x,y:position.y+height,z:position.z})===false;
 budget.cache.set(key,result);return result;
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
   const cover=coverOcclusion(game,voice.position,distance,voice.height,budget);
   if(cover===null)continue;
   voice.occluded=cover;voice.coverAt=now;voice.coverX=eye.x;voice.coverY=eye.y;voice.coverZ=eye.z;refreshed++;
  }
  for(const voice of voices){
   const dx=voice.position.x-eye.x,dy=voice.position.y-eye.y,dz=voice.position.z-eye.z,distance=Math.hypot(dx,dy,dz);
   const target=clamp(Math.max(voice.minimum,voice.level*distanceGain(distance,voice.occluded)),0,1.4);
   const frequency=lowpassFrequency(distance,voice.occluded,context.sampleRate??44100);
   // Intrinsic writes and a 25 ms exponential slew avoid accumulating Web
   // Audio automation events. The separate component envelope is untouched.
   const blend=1-Math.exp(-Math.max(0,now-voice.updatedAt)/.025);voice.updatedAt=now;
   voice.gain.gain.value+=(target-voice.gain.gain.value)*blend;
   if(voice.filter)voice.filter.frequency.value+=(frequency-voice.filter.frequency.value)*blend;
   if(voice.stereo)voice.stereo.pan.value=clamp(Math.sin(Math.atan2(dx,-dz)-(p.yaw??0)),-1,1);
  }
 }
}
