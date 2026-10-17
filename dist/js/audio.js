import {WEAPONS} from './weapons.js?v=71';
import {loadSoundLibrary,footstepSurface,roomAcoustics} from './audio-library.js?v=71';
import {listenerFrame,updateSpatialListener,createWorldPanner} from './spatial-audio.js?v=71';
import {WorldAcoustics,distanceGain,lowpassFrequency,coverBudget,coverOcclusion} from './world-acoustics.js?v=71';
import {attachmentFoleyCue,buildAttachmentFoley} from './attachment-audio.js?v=71';
// Original synthesized recordings: cached pressure transients, action sounds and
// surface impacts. No external audio downloads or continuously running ambience.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
// Regions reuse original recorded contacts/friction in the loaded bank. Native
// buffer views are not copied, so every component cue shares the same PCM.
const FOLEY={
 release:{key:'reload',region:[.095,.145],volume:.43},extract:{key:'reload',region:[.16,.225],volume:.5},
 handling:{key:'reload',region:[.50,.58],volume:.42},insert:{key:'reload',region:[.59,.65],volume:.44},
 seat:{key:'seat',volume:.52},open:{key:'rack',region:[0,.27],volume:.49},close:{key:'rack',region:[.35,.83],volume:.57},
 coverOpen:{key:'reload',region:[.095,.145],volume:.52},feed:{key:'reload',region:[.38,.59],volume:.46},
 coverClose:{key:'reload',region:[.81,.91],volume:.58},chamberLoad:{key:'reload',region:[.33,.41],volume:.5},
 cylinderClose:{key:'reload',region:[.77,.87],volume:.58},retrieve:{key:'reload',region:[0,.18],volume:.5}
};
function regionStart(buffer,start,end,cache){
 if(!buffer.getChannelData||!(buffer.sampleRate>0)||!(buffer.numberOfChannels>0))return start;
 let regions=cache.get(buffer);if(!regions){regions=new Map();cache.set(buffer,regions);}
 const key=start+'/'+end;if(regions.has(key))return regions.get(key);
 // The authored foley has at most ten distinct regions per shared buffer.
 // Keep arbitrary callers bounded too: 16 cached regions, at most 200 ms of
 // leading PCM per region, scanned once. Weak keys never retain old buffers.
 if(regions.size>=16)return start;
 const rate=buffer.sampleRate,first=Math.floor(start*rate),last=Math.min(buffer.length,Math.ceil(end*rate),first+Math.ceil(rate*.2));
 const channels=Array.from({length:Math.min(2,buffer.numberOfChannels)},(_,ch)=>buffer.getChannelData(ch));
 let offset=start;
 for(let i=first;i<last;i++){
  let audible=false;for(const data of channels)if(Math.abs(data[i])>.0001){audible=true;break;}
  if(audible){
   // Two milliseconds of preroll preserve the contact's approach and let the
   // edge ramp reach full level before its first audible sample (-80 dBFS).
   offset=Math.max(start,i/rate-.002);break;
  }
 }
 regions.set(key,offset);return offset;
}
const SHOTS=[
 [91,19,.32,1430],[69,12,.49,1020],[118,27,.24,1770],
 [137,37,.19,2180],[122,30,.25,1890],[52,9,.61,670],
 [61,12,.52,810],[46,7,.7,980],[64,12,.48,1280],
 [75,15,.54,880],[148,30,.26,2380],[81,16,.44,1720],[230,50,.1,3300],[106,23,.34,1620],[82,20,.39,1270],[66,13,.43,1500],
 [99,24,.35,1560],[153,39,.17,2590],[49,9,.64,770],[39,6,.77,890],
 [97,20,.38,1240],[113,26,.29,1460],[68,13,.51,1840],[164,35,.22,2690],
 [73,15,.46,1480],[141,33,.20,2210],[58,11,.57,930],[62,11,.60,1070],[71,14,.42,1650],[111,23,.33,2030]
];
function randomStream(seed){let n=seed>>>0;return()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return(n>>>0)/2147483648-1;};}
export class AudioSystem {
 constructor(settings){this.settings=settings;this.context=null;this.buffers=new Map();this.variations=new Map();this.variationLast=new Map();this.regionStarts=new WeakMap();this.voicePriority=new WeakMap();this.voiceGroup=new WeakMap();this.worldAcoustics=new WorldAcoustics();this.voices=0;this.active=new Set();this.hapticAt=0;this.muted=false;}
 async start(){try{
  if(!this.context){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;this.context=new C({latencyHint:'interactive'});this.master=this.context.createGain();this.master.gain.value=this.settings.volume;if(this.context.createDynamicsCompressor){this.limiter=this.context.createDynamicsCompressor();this.limiter.threshold.value=-7;this.limiter.knee.value=5;this.limiter.ratio.value=5;this.limiter.attack.value=.003;this.limiter.release.value=.12;this.master.connect(this.limiter);this.limiter.connect(this.context.destination);}else this.master.connect(this.context.destination);this.build();this.makeRoom();}
  if(this.context.state==='suspended')await this.context.resume();this.muted=false;
  if(!this.libraryReady)this.libraryReady=loadSoundLibrary(this.context,(key,variant,buffer)=>{
   if(!this.variations.has(key))this.variations.set(key,[]);this.variations.get(key)[variant]=buffer;
   if(variant===0)this.buffers.set(key,buffer);
   // Native decode already yields between recordings. Prime the fixed foley
   // regions here so their first gameplay contact needs no PCM scan.
   if(/^(reload|rack)\d+$/.test(key)){
    for(const cue of Object.values(FOLEY))if(cue.region&&key.startsWith(cue.key))regionStart(buffer,cue.region[0]*buffer.duration,cue.region[1]*buffer.duration,this.regionStarts);
    if(key==='reload5'||key==='reload18')regionStart(buffer,.34*buffer.duration,.58*buffer.duration,this.regionStarts);
   }
   if(key.startsWith('attachment'))regionStart(buffer,0,buffer.duration,this.regionStarts);
  }).then(stats=>{this.libraryStats=stats;}).catch(error=>{this.libraryError=error.message;});
 }catch{}}
 build(){
  const c=this.context,rate=c.sampleRate;
  const synth=(key,seconds,fn,seed=7919)=>{const b=c.createBuffer(1,Math.ceil(rate*seconds),rate),data=b.getChannelData(0),noise=randomStream(seed);let low=0;
   for(let i=0;i<data.length;i++){const t=i/rate,n=noise();low+=.095*(n-low);const sample=fn(t,n,low);data[i]=Math.tanh(sample)*Math.min(1,(data.length-i)/64);}
   this.buffers.set(key,b);return b;
  };
  SHOTS.forEach(([bass,decay,weight,mechanical],id)=>{
   const duration=Math.max(.31,Math.min(.92,5.5/decay));
   for(const suppressed of [false,true])synth(`${suppressed?'suppressed':'shot'}${id}`,duration,(t,n,low)=>{
    const crack=(n-low)*Math.exp(-t*(suppressed?390:210))*(suppressed?.21:.82);
    const width=.38/bass,u=t/width;
    const pressure=(1-2*u)*Math.exp(-u)*(1-Math.exp(-t*10000))*weight*(suppressed?.18:1.1);
    const blast=(low*2.8+(n-low)*.11)*Math.exp(-t*decay*1.35)*weight*(suppressed?.15:.89);
    const mech=t>.027?((n-low)*.11+Math.sin((t-.027)*mechanical*6.283185)*.018)*Math.exp(-(t-.027)*155):0;
    const shell=t>.135&&WEAPONS[id].kind!=='SNIPER'?(n-low)*Math.exp(-(t-.135)*195)*.022:0;
    // Pump and bolt closures follow the same animation timing, below the initial blast.
    const open=(WEAPONS[id].shellReload||WEAPONS[id].kind==='SNIPER')&&t>.14?(n-low)*Math.exp(-(t-.14)*100)*.058:0;
    const close=(WEAPONS[id].shellReload||WEAPONS[id].kind==='SNIPER')&&t>.47?(low*1.6+Math.sin((t-.47)*7300)*.13)*Math.exp(-(t-.47)*72)*.17:0;
    return crack+pressure+blast+mech+shell+open+close;
   },7133+id*811);
   const reload=Math.max(.3,(WEAPONS[id].reload||.3)*.84);
   synth(`reload${id}`,reload,(t,n,low)=>{
    const contact=(at,weight)=>{const u=t-at;return u>=0?((n-low)*.6+low*1.3+Math.sin(u*(1280+id*31))*.10)*Math.exp(-u*88)*weight:0;};
    if(WEAPONS[id].shellReload)return contact(.02,.16)+contact(.20,.23);
    const friction=(at,span)=>{const u=t-at;return u>=0&&u<span?(n*.025+low*.14)*Math.sin(u/span*Math.PI):0;};
    let sound=contact(reload*.105,.14)+contact(reload*.18,.22)+contact(reload*.61,.14)+contact(reload*.72,.29)+friction(reload*.19,.065)+friction(reload*.52,.13);
    if(WEAPONS[id].kind==='LMG')sound+=contact(reload*.40,.18)+friction(reload*.49,reload*.1)+contact(reload*.85,.24);
    if(WEAPONS[id].revolver)sound+=friction(reload*.36,.08)+contact(reload*.81,.2);
    return sound;
   },1013+id*13);
   synth(`seat${id}`,.11,(t,n,low)=>low*Math.exp(-t*49)*.31+(n-low)*Math.exp(-t*95)*.065,931+id*37);
   synth(`rack${id}`,.15,(t,n,low)=>{const u=t*(.28/.15),contact=at=>u>=at?((n-low)*.16+Math.sin((u-at)*mechanical*3.14159)*.09)*Math.exp(-(u-at)*100):0;return contact(.008)+contact(.105)*1.3;},712+id*91);
  });
  synth('stepHard',.17,(t,n,low)=>low*Math.exp(-t*32)*.9+Math.sin(t*730)*Math.exp(-t*55)*.16);
  synth('stepGravel',.20,(t,n,low)=>(n*.12+low*.58)*Math.exp(-t*24)+Math.sin(t*520)*Math.exp(-t*48)*.065);
  synth('stepSoft',.17,(t,n,low)=>low*Math.exp(-t*23)*.47+Math.sin(t*450)*Math.exp(-t*43)*.053);
  synth('stepSnow',.23,(t,n,low)=>low*1.08*Math.exp(-t*19)+(n-low)*(.18*Math.exp(-t*70)+.05*Math.exp(-t*10))+Math.sin(t*1910+Math.sin(t*18)*.018)*Math.exp(-t*38)*.035,7183);
  synth('stepQuarry',.20,(t,n,low)=>(n-low)*.18*Math.exp(-t*76)+low*.52*Math.exp(-t*26)+Math.sin(t*4021)*Math.exp(-t*46)*.047,1949);
  synth('stepWood',.20,(t,n,low)=>low*Math.exp(-t*30)*.65+(n-low)*Math.exp(-t*100)*.07,5371);
  synth('stepMetal',.22,(t,n,low)=>low*Math.exp(-t*29)*.56+(n-low)*Math.exp(-t*80)*.10,9109);
  synth('stepWater',.26,(t,n,low)=>low*Math.exp(-t*27)*.24+(n-low)*Math.exp(-t*18)*.13*(1-Math.exp(-t*250)),1237);
  synth('impactMetal',.28,(t,n,low)=>(n-low)*Math.exp(-t*160)*.24+(Math.sin(t*9420)+Math.sin(t*15437)*.42)*Math.exp(-t*36)*.10);
  synth('impactStone',.20,(t,n,low)=>n*Math.exp(-t*95)*.21+low*Math.exp(-t*24)*.23);
  synth('impactWood',.18,(t,n,low)=>low*Math.exp(-t*47)*.34+Math.sin(t*3370)*Math.exp(-t*84)*.10);
  synth('impactGlass',.28,(t,n,low)=>(n-low)*Math.exp(-t*28)*.13,7907);
  synth('impactWater',.24,(t,n,low)=>(n-low)*Math.exp(-t*22)*.16*(1-Math.exp(-t*500)),1097);
  // Responsive original fallbacks remain available before native AAC decoding.
  // Fast downward sweeps are fragments shedding speed, not alert-like notes.
  for(const family of ['Metal','Stone'])synth('ricochet'+family,.28,(t,n,low)=>
   (n-low)*Math.exp(-t*130)*.24+(n-low)*Math.exp(-t*19)*(1-Math.exp(-t*300))*.10+
   Math.sin(6.283185*(4400*t-5700*t*t))*Math.exp(-t*34)*(family==='Metal'?.027:.011),family==='Metal'?11867:13763);
  for(const family of ['Metal','Stone','Wood','Glass'])synth('penetration'+family,.20,(t,n,low)=>{
   const u=Math.max(0,t-.022),soft=family==='Wood';return (soft?low:n-low)*Math.exp(-t*120)*.21+
    (t>.022?(n-low)*Math.exp(-u*53)*(soft?.13:.21):0)+low*Math.exp(-t*30)*.12;
  },17099+family.charCodeAt(0)*17);
  for(const family of ['Hard','Metal','Wood','Soft','Water'])synth('casing'+family,.28,(t,n,low)=>{
   const soft=family==='Soft'||family==='Water',u=Math.max(0,t-.064);
   return (soft?low:n-low)*Math.exp(-t*(soft?54:180))*(soft?.10:.22)+
    (t>.064?(soft?low:n-low)*Math.exp(-u*120)*.07:0)+
    (family==='Metal'?Math.sin(t*16237)*Math.exp(-t*42)*.023:0);
  },19937+family.charCodeAt(0)*23);
  // Plastic hull compression/scuff and its short brass-head tick are authored
  // separately from the brighter thin-wall metallic case, including at startup.
  for(const family of ['Hard','Metal','Wood','Soft','Water'])synth('hull'+family,.22,(t,n,low)=>{
   const soft=family==='Soft'||family==='Water',u=Math.max(0,t-.052);
   return low*Math.exp(-t*(soft?65:115))*.18+(soft?low:n-low)*Math.exp(-t*215)*(soft?.025:.065)+
    (t>.052?low*Math.exp(-u*155)*.055:0)+
    (family==='Water'?(n-low)*Math.exp(-t*52)*(1-Math.exp(-t*450))*.055:0)+
    (family==='Metal'?Math.sin(t*9137)*Math.exp(-t*95)*.012:0);
  },27127+family.charCodeAt(0)*29);
  synth('click',.07,(t,n,low)=>(n-low)*Math.exp(-t*95)*.22);
  synth('hit',.085,t=>(Math.sin(t*6.283185*1710)+Math.sin(t*6.283185*2330)*.3)*Math.exp(-t*59)*.13);
  synth('kill',.19,t=>(Math.sin(t*6.283185*1210)+Math.sin(t*6.283185*1815)*.55)*Math.exp(-t*22)*.12);
  synth('explosion',1.5,(t,n,low)=>low*Math.exp(-t*4.2)*2.6+(1-t/.005)*Math.exp(-t/.005)*.6+(n-low)*Math.exp(-t*160)*.38);
  synth('hurt',.18,(t,n,low)=>low*Math.exp(-t*22)*.79);
  synth('whoosh',.24,(t,n,low)=>(low*.65+n*.09)*Math.sin(t/.24*Math.PI)*.30);
  for(const [key,buffer] of buildAttachmentFoley(c))this.buffers.set(key,buffer);
 }
 makeRoom(){
  const c=this.context;if(!c.createConvolver)return;
  // Two bounded shared responses distinguish close rooms from industrial
  // halls. The longer hall tail stays quieter than the direct action sounds.
  this.rooms=new Map();
  for(const [name,duration,decay,wet,taps] of [
   ['room',.36,19,.16,[[.009,.30],[.021,-.21],[.039,.14],[.067,-.07]]],
   ['hall',.72,10,.12,[[.023,.27],[.049,-.20],[.089,.16],[.139,-.09],[.207,.05]]]
  ]){
   const response=c.createBuffer(2,Math.ceil(c.sampleRate*duration),c.sampleRate),noise=randomStream(name==='room'?52378:71149);
   for(let ch=0;ch<2;ch++){const a=response.getChannelData(ch);let low=0;for(let i=0;i<a.length;i++){const t=i/c.sampleRate;low+=(.21/(1+t*11))*(noise()-low);a[i]=t<.008?0:low*Math.exp(-t*decay)*.15;}for(const [t,g]of taps)a[Math.round((t+ch*.0017)*c.sampleRate)]+=g;}
   const node=c.createConvolver(),gain=c.createGain();node.buffer=response;gain.gain.value=wet;node.connect(gain);gain.connect(this.master);this.rooms.set(name,{node,gain});
  }
  this.room=this.rooms.get('room').node;this.roomGain=this.rooms.get('room').gain;
 }
 play(key,{volume=1,pan=0,rate=1,indoor=false,distance=0,important=false,occluded=false,region,group,position,acoustics}={}){
  const c=this.context;if(!c||this.muted||c.state!=='running'||volume<.006)return;
  // Reserve ambient capacity and replace its oldest tail when a player shot
  // or hit cue needs the last voice. Cleanup remains idempotent on native end.
  if(important&&this.voices>=24)for(const tail of this.active)if(!this.voicePriority.get(tail)){try{tail.stop();}catch{}tail.onended?.();break;}
  if(this.voices>=(important?24:16))return;
  // Native decode publishes incrementally. Only select ready takes, and avoid
  // immediately repeating one; sustained automatic fire has no short loop.
  const variants=this.variations.get(key)?.filter(Boolean),last=variants?.indexOf(this.variationLast.get(key))??-1;
  const take=variants?.length>1?(last<0?0:(last+1+Math.floor(Math.random()*(variants.length-1)))%variants.length):0;
  const buffer=variants?.[take]??this.buffers.get(key);if(!buffer)return;
  this.variationLast.set(key,buffer);
  const source=c.createBufferSource(),gain=c.createGain();source.buffer=buffer;source.playbackRate.value=clamp(rate,.65,1.6);gain.gain.value=clamp(volume,0,1.4);
  let filter=null,panner=null,envelope=null,worldVoice=null;
  const tracked=!!(position&&acoustics),now=c.currentTime??0;
  // A component's edge envelope stays separate from listener-dependent gain.
  // This prevents movement/cover updates from overwriting its click-free end.
  if(region&&tracked){envelope=c.createGain();envelope.gain.value=1;envelope.connect(gain);}
  const input=envelope??gain;
  if((tracked||distance>14||occluded)&&c.createBiquadFilter){filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=lowpassFrequency(distance,occluded,c.sampleRate??44100);filter.Q.value=.45;source.connect(filter);filter.connect(input);}else source.connect(input);
  if(position&&this.spatialReady)panner=createWorldPanner(c,position);
  let stereo=null;if(!panner&&c.createStereoPanner){panner=c.createStereoPanner();panner.pan.value=clamp(pan,-1,1);stereo=panner;}
  if(panner){gain.connect(panner);panner.connect(this.master);}else gain.connect(this.master);
  if(indoor&&this.room)gain.connect(this.rooms?.get(indoor==='hall'?'hall':'room')?.node??this.room);
  this.voices++;this.active.add(source);this.voicePriority.set(source,important);if(group)this.voiceGroup.set(source,group);let ended=false;
  source.onended=()=>{if(ended)return;ended=true;this.voices=Math.max(0,this.voices-1);this.active.delete(source);if(worldVoice)this.worldAcoustics.remove(worldVoice);source.disconnect();gain.disconnect();envelope?.disconnect();filter?.disconnect();panner?.disconnect();};
  let seconds=(buffer.duration??0)/source.playbackRate.value;
  const track=()=>{if(!tracked)return;const p=acoustics.listener;worldVoice={position:{x:position.x,y:position.y,z:position.z},gain,filter,stereo,level:acoustics.minimum?1:volume/acoustics.attenuation,minimum:acoustics.minimum??0,height:acoustics.height,occluded,coverAt:now,coverX:p.x,coverY:p.y,coverZ:p.z,updatedAt:now,seconds,endTime:now+seconds};this.worldAcoustics.add(worldVoice);};
  if(region&&Number.isFinite(buffer.duration)&&buffer.duration>0){
   const start=clamp(region[0],0,.995)*buffer.duration,end=clamp(region[1],region[0]+.001,1)*buffer.duration;
   const offset=regionStart(buffer,start,end,this.regionStarts),duration=Math.max(.001,end-offset);seconds=duration/source.playbackRate.value;
   // Short edge ramps keep the selected transient intact without slicing clicks.
   const edge=envelope??gain;if(edge.gain.setValueAtTime&&edge.gain.linearRampToValueAtTime){const level=edge.gain.value;edge.gain.setValueAtTime(0,now);edge.gain.linearRampToValueAtTime(level,now+Math.min(.002,seconds*.1));edge.gain.setValueAtTime(level,now+Math.max(.002,seconds-.006));edge.gain.linearRampToValueAtTime(0,now+seconds);}
   track();
   source.start(0,offset,duration);
  }else{track();source.start();}
 }
 stopFoley(source,weapon){const group=source===undefined?null:`foley:${source}:${weapon}`;for(const voice of this.active){const tag=this.voiceGroup.get(voice);if(tag&&(group===null||tag===group)){try{voice.stop();}catch{}voice.onended?.();}}}
 haptic(ms){if(!this.settings.haptics||!navigator.vibrate)return;const now=performance.now();if(now-this.hapticAt<70)return;this.hapticAt=now;navigator.vibrate(ms);}
 events(events,game){
  if(this.master)this.master.gain.value=this.settings.volume;let impacts=0,ballistic=0,cases=0,foley=0;
  // Empty batches update listener direction and bounded live world acoustics.
  // No audio-specific timer, propagation delay or moving emitted wave origin.
  const p=game.player,eye=game.eye?.(p)??{x:p.x,y:p.y+(p.height??1.67)-.12,z:p.z};
  this.spatialReady=updateSpatialListener(this.context,listenerFrame(p,eye));
  const budget=coverBudget();if(this.context?.state==='running'&&!this.muted)this.worldAcoustics.update(game,this.context,budget);
  for(const e of events){
   const dx=e.position?e.position.x-game.player.x:0,dy=e.position?e.position.y-game.player.y:0,dz=e.position?e.position.z-game.player.z:0;
   const d=Math.hypot(dx,dy,dz),own=e.source===0;
   const spatial=['shot','step','land','impact','ricochet','penetration','casing','explosion','weaponFoley'].includes(e.type);
   // A local muzzle/boot stays immediate; the player's distant bullet contacts
   // still travel from their struck surface and pass through intervening cover.
   const localSource=own&&['shot','step','land','weaponFoley'].includes(e.type);
   const position=spatial&&!localSource?e.position:undefined;
   const height=e.type==='step'?1.1:.08,occluded=!!(position&&coverOcclusion(game,position,d,height,budget));
   const volume=localSource||!e.position?1:distanceGain(d,occluded);
   const acoustics=position?{attenuation:volume,minimum:e.type==='explosion'?.06:0,height,listener:p}:undefined;
   const pan=localSource?0:e.position?Math.sin(Math.atan2(dx,-dz)-game.player.yaw):0;
   const room=spatial?roomAcoustics(game.arena,e.position):null;
   switch(e.type){
    case 'shot':this.play(`${e.suppressed?'suppressed':'shot'}${e.weapon}`,{volume:volume*(own?.85:.72)*(e.loudness??1),pan,rate:.985+Math.random()*.030,indoor:room??e.indoor,distance:d,important:own,occluded,position,acoustics});if(own)this.haptic(8);break;
    case 'step':case 'land':if(d<24){const hard=game.arena.indoors(e.position),map=game.arena.info?.id,tag=game.arena.info?.tag,soft=tag==='MIXED'||tag?.includes('FOREST'),land=e.type==='land';const actual=footstepSurface(game.arena,e.position);const sound=actual?'step'+actual:hard?'stepHard':map===8?'stepSnow':map===9?'stepQuarry':soft?'stepSoft':'stepGravel';this.play(sound,{volume:volume*(land?.65:own?.28:.48)*(e.value??1),pan,rate:land?.76:.94+Math.random()*.11,distance:d,important:land&&own,occluded,indoor:room,position,acoustics});if(land&&own)this.haptic(Math.round(8+12*(e.value??0)));}break;
    case 'impact':if(!e.ballisticAudio&&d<40&&impacts++<3){const s=e.surface,key=['steel','dark','blue','rust','brass'].includes(s)?'impactMetal':s==='wood'?'impactWood':s==='glass'?'impactGlass':s==='water'?'impactWater':'impactStone';this.play(key,{volume:volume*.34,pan,distance:d,occluded,position,acoustics});}break;
    case 'ricochet':case 'penetration':if(d<40&&ballistic++<3){const s=e.surface,family=['steel','dark','blue','rust','brass'].includes(s)?'Metal':e.type==='penetration'&&s==='wood'?'Wood':e.type==='penetration'&&s==='glass'?'Glass':'Stone';this.play(e.type+family,{volume:volume*(e.type==='ricochet'?.29:.31),pan,rate:.97+Math.random()*.06,distance:d,occluded,indoor:room,position,acoustics});}break;
    case 'casing':if(d<18&&cases++<3){const family=['Hard','Metal','Wood','Soft','Water'].includes(e.surface)?e.surface:'Hard';this.play((e.shell?'hull':'casing')+family,{volume:volume*(own?.15:.11)*(.6+.4*(e.value??1)),pan,rate:.97+Math.random()*.06,distance:d,occluded,indoor:room,position,acoustics});}break;
    case 'explosion':this.play('explosion',{volume:Math.max(.06,volume),pan,distance:d,important:true,occluded,indoor:room,position,acoustics});if(d<14)this.haptic(30);break;
    case 'weaponFoley':{const cue=FOLEY[e.cue];if(cue&&(own||d<18&&foley++<3)){const attachment=attachmentFoleyCue(e,WEAPONS[e.weapon]);this.play(attachment?.key??cue.key+e.weapon,{volume:volume*cue.volume*(own?1:.46),pan,distance:d,important:own,occluded,indoor:room,region:attachment?.region??(e.component==='shell'&&e.cue==='insert'?[.34,.58]:cue.region),group:`foley:${e.source}:${e.weapon}`,position,acoustics});}break;}
    case 'weaponFoleyCancel':this.stopFoley(e.source,e.weapon);break;
    case 'round':this.stopFoley();break;
    // Finished reloads retain their haptic; seating/charging sounds already
    // occurred at the real component contact and must not replay at ammo refill.
    case 'reloadDone':if(own||e.source===undefined)this.haptic(9);break;
    case 'switch':{const id=e.weapon??game.player.weapon.def.id;this.play(id===12?'whoosh':'reload'+id,{volume:.4,important:true,indoor:roomAcoustics(game.arena,game.player),region:id===12?[.12,.65]:FOLEY.handling.region,group:`foley:0:${id}`});break;}
    case 'empty':this.play('click',{volume:.7,important:true});break;
    case 'hit':this.play('hit',{volume:e.headshot?1.1:.8,important:true});break;
    case 'kill':if(own)this.play('kill',{volume:.8,important:true});break;
    case 'hurt':this.play('hurt',{volume:.7,important:true});this.haptic(15);break;
    case 'throw':case 'melee':this.play('whoosh',{volume:.8});break;
   }
  }
 }
 pause(){this.muted=true;for(const source of this.active){try{source.stop();}catch{}source.onended?.();}this.context?.suspend().catch(()=>{});}
 ui(){this.play('click',{volume:.4});}
}
