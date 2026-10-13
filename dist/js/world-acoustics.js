// Preserve the established event gain law while the listener moves past a
// fixed emission/contact. Native HRTF supplies direction only (zero rolloff).
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const distanceGain=(distance,occluded=false)=>clamp(1/(1+distance*distance*.004)-.015,0,.85)*(occluded?.48:1);
// Keep a moving biquad below Nyquist: reopening exactly onto Nyquist can make
// its native retained delay state ring explosively as coefficients converge.
export const lowpassFrequency=(distance,occluded,rate=44100)=>occluded?Math.max(600,1600/(1+distance*.018)):distance>14?Math.max(1200,10500/(1+distance*.045)):rate*.45;
export const coverBudget=()=>({remaining:8,cache:new Map()});
export function coverOcclusion(game,position,distance,height,budget){
 if(!position||distance<=2||distance>=80||!game.arena.visible)return false;
 const key=position.x+'/'+position.y+'/'+position.z+'/'+height;
 if(budget.cache.has(key))return budget.cache.get(key);
 if(budget.remaining<=0)return null;
 budget.remaining--;
 const p=game.player,result=game.arena.visible({x:p.x,y:p.y+1.55,z:p.z},{x:position.x,y:position.y+height,z:position.z})===false;
 budget.cache.set(key,result);return result;
}
export class WorldAcoustics {
 constructor(){this.voices=[];this.cursor=0;}
 add(voice){this.voices.push(voice);}
 remove(voice){const i=this.voices.indexOf(voice);if(i<0)return;this.voices.splice(i,1);if(i<this.cursor)this.cursor--;if(this.cursor>=this.voices.length)this.cursor=0;}
 update(game,context,budget){
  const voices=this.voices,count=voices.length;if(!count)return;
  const p=game.player,now=context.currentTime??0;
  // At most four existing voices request cover per gameplay batch. The shared
  // eight-ray budget includes new emissions; identical contacts share a ray.
  // Round-robin avoids starving later tails. Clips under 180 ms and the final
  // 60 ms retain emission cover but still update level/direction every batch.
  let refreshed=0,scanned=0;
  while(scanned++<count&&refreshed<4){
   const voice=voices[this.cursor];this.cursor=(this.cursor+1)%count;
   if(voice.seconds<.18||voice.endTime-now<.06)continue;
   const moved=Math.hypot(p.x-voice.coverX,p.y-voice.coverY,p.z-voice.coverZ)>=.2;
   if(!moved&&now-voice.coverAt<.08)continue;
   const distance=Math.hypot(voice.position.x-p.x,voice.position.y-p.y,voice.position.z-p.z);
   const cover=coverOcclusion(game,voice.position,distance,voice.height,budget);
   if(cover===null)continue;
   voice.occluded=cover;voice.coverAt=now;voice.coverX=p.x;voice.coverY=p.y;voice.coverZ=p.z;refreshed++;
  }
  for(const voice of voices){
   const dx=voice.position.x-p.x,dy=voice.position.y-p.y,dz=voice.position.z-p.z,distance=Math.hypot(dx,dy,dz);
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
