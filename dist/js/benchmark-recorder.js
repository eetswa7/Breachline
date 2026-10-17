import {BENCHMARK_METHODOLOGY} from './benchmark-methodology.js?v=71';
import {FrameStats,TimingStats,round} from './benchmark-stats.js?v=71';

export const BENCHMARK_SCHEMA='breachline.benchmark.v1';
export const LIMITS=Object.freeze({contexts:64,raw:4096,windows:720,spikes:512,transitions:512,gpu:4096,activeSeconds:7200});
export const RAW_COLUMNS=['elapsed_ms','frame_ms','cpu_frame_ms','cpu_render_ms','context_id','condition_mask','phase'];
export const CONDITIONS=['movement','gunfight','explosion','smoke','indoors','player_dead'];
export function browserInfo(nav=globalThis.navigator??{}){
 const ua=nav.userAgent??'',safari=/Version\/(\d+(?:\.\d+)?)/.exec(ua),chrome=/Chrome\/(\d+)/.exec(ua),firefox=/Firefox\/(\d+)/.exec(ua);
 return {browser:chrome?'Chromium':firefox?'Firefox':safari?'Safari':'unavailable',browser_version:safari?.[1]??chrome?.[1]??firefox?.[1]??null,device_family:/iPhone/.test(ua)?'iPhone':/iPad/.test(ua)?'iPad':'unavailable',device_model:{status:'unavailable',reason:'Safari does not reliably expose the hardware model'},os:/iPhone|iPad/.test(ua)?'iOS':/Macintosh/.test(ua)?'macOS':/Android/.test(ua)?'Android':/Windows/.test(ua)?'Windows':'unavailable'};
}
export function rendererInfo(r){
 const info={backend:r.compatibility?'Canvas2D':'WebGL2',vendor:null,renderer:null,version:null,shading_language:null};
 if(r.gl)for(const [key,constant]of [['vendor','VENDOR'],['renderer','RENDERER'],['version','VERSION'],['shading_language','SHADING_LANGUAGE_VERSION']])try{info[key]=String(r.gl.getParameter(r.gl[constant])).slice(0,100);}catch{}
 return info;
}
export function graphicsSnapshot(r,settings){
 return {requested_quality:settings.quality??'auto',effective_quality:r.appliedQuality||r.quality||'unavailable',frame_cap:settings.frameRate===30?30:60,effective_frame_cap:r.compatibility?30:settings.frameRate===30?30:60,render_scale:round(r.renderScale??1),width:r.canvas?.width??r.width??0,height:r.canvas?.height??r.height??0,device_pixel_ratio:round(globalThis.devicePixelRatio??1),fov:settings.fov??80,camera_motion:settings.motion!==false,dynamic_resolution:!r.compatibility,reason:r.qualityController?.reason??null};
}
const contextKey=(game,graphics)=>[game.config.map,game.config.mode,game.config.difficulty,game.actors.length,...Object.values(graphics).slice(0,-1)].join('|');
const memoryInfo=()=>{
 const m=globalThis.performance?.memory;
 return m&&Number.isFinite(m.usedJSHeapSize)?{status:'estimate',js_heap_used_bytes:m.usedJSHeapSize,js_heap_limit_bytes:m.jsHeapSizeLimit??null}:{status:'unavailable',js_heap_used_bytes:null,js_heap_limit_bytes:null};
};
export class BenchmarkRecorder {
 constructor({build,environment,renderer,kind='gameplay',scenario=null,id=globalThis.crypto?.randomUUID?.(),startedAt=new Date().toISOString(),now=performance.now(),warmupSeconds=15}={}){
  if(!id)throw new Error('Secure session identifiers are unavailable');
  this.id=id;this.startedAt=startedAt;this.start=now;this.build=build;this.environment=environment;this.renderer=renderer;this.kind=kind;this.scenario=scenario;this.warmupMs=warmupSeconds*1000;
  this.phaseStats=[new FrameStats(),new FrameStats()];this.conditionStats=CONDITIONS.map(()=>new FrameStats());this.contexts=[];this.contextMap=new Map();this.currentContext=null;this.transitions=[];this.raw=[];this.rawSeen=0;this.randomState=0x701ca1;this.windows=[];this.window=new FrameStats();this.windowStart=null;this.spikes=[];this.gpuRaw=[];this.counters={shots:0,player_shots:0,explosions:0,smokes:0,flashes:0,kills:0};this.activeMs=0;this.last=null;this.game=null;this.gameplayMs=0;this.gunUntil=0;this.explosionUntil=0;this.population=null;this.nextPopulation=0;this.dropped={contexts:0,transitions:0,spikes:0,gpu:0};this.renderSamples=[];this.lastPhase=0;this.pauseCount=0;this.lastPauseReason=null;this.overflowStats=new FrameStats();
 }
 pause(reason='inactive'){
  if(this.last!==null){this.pauseCount++;this.flushWindow(this.last);}
  this.last=null;this.lastPauseReason=reason;
 }
 observeEvents(events,now){for(const e of events){if(e.type==='shot'){this.counters.shots++;if(e.source===0)this.counters.player_shots++;this.gunUntil=now+1000;}else if(e.type==='explosion'){this.counters.explosions++;this.explosionUntil=now+2000;}else if(e.type==='smoke')this.counters.smokes++;else if(e.type==='flash')this.counters.flashes++;else if(e.type==='kill')this.counters.kills++;}}
 ensureContext(game,graphics,now,elapsed=0){
  if(this.contextGame===game&&this.contextGraphics===graphics&&this.contextPlayers===game.actors.length)return this.currentContext;
  this.contextGame=game;this.contextGraphics=graphics;this.contextPlayers=game.actors.length;
  const key=contextKey(game,graphics);let context=this.contextMap.get(key);
  if(!context){
   if(this.contexts.length<LIMITS.contexts){context={id:this.contexts.length,map:{id:game.config.map,name:game.arena.info.name},mode:game.config.mode,difficulty:game.config.difficulty,players:game.actors.length,bots:Math.max(0,game.actors.length-1),graphics,stats:[new FrameStats(),new FrameStats()]};this.contexts.push(context);this.contextMap.set(key,context);}
   else{this.dropped.contexts++;context=null;}
  }
  if(this.currentContext!==context){this.flushWindow(now-elapsed);this.currentContext=context;if(this.transitions.length<LIMITS.transitions)this.transitions.push({elapsed_ms:round(now-this.start),context_id:context?.id??-1});else this.dropped.transitions++;}
  return context;
 }
 record({now,cpuMs,renderCpuMs=null,game,graphics,render={},memory=null}){
  // rAF's timestamp can precede a session created later in the same task.
  if(now<this.start)return false;
  // A boundary primes the clock. Never insert the game's synthetic first dt.
  if(this.game!==game){this.pause('match_changed');this.game=game;this.gameplayMs=0;this.nextPopulation=0;}
  if(this.last===null){this.ensureContext(game,graphics,now);this.last=now;return false;}
  const elapsed=now-this.last;this.last=now;if(!(elapsed>0))return false;
  const context=this.ensureContext(game,graphics,now,elapsed);
  const phase=this.gameplayMs<this.warmupMs?0:1;if(phase!==this.lastPhase)this.flushWindow(now-elapsed);this.lastPhase=phase;this.gameplayMs+=elapsed;this.activeMs+=elapsed;
  if(now>=this.nextPopulation){const alive=game.actors.reduce((n,a)=>n+!a.dead,0);this.population={alive_players:alive,alive_bots:alive-!game.player.dead,indoors:!!game.arena.indoors(game.player),grenades:game.grenades.length,smokes:game.smokes.length,weapon:game.player.weapon.def.id};this.nextPopulation=now+1000;this.renderSamples.push({elapsed_ms:round(now-this.start),context_id:context?.id??-1,...this.population,...render,memory:memory??memoryInfo()});if(this.renderSamples.length>LIMITS.windows)this.renderSamples=this.renderSamples.filter((_,i)=>i%2===0);}
  const mask=(Math.hypot(game.player.vx,game.player.vz)>.3?1:0)|(now<this.gunUntil?2:0)|(now<this.explosionUntil?4:0)|(game.smokes.length?8:0)|(this.population?.indoors?16:0)|(game.player.dead?32:0);
  this.phaseStats[phase].add(elapsed,cpuMs,renderCpuMs,graphics.effective_frame_cap??graphics.frame_cap);(context?.stats[phase]??this.overflowStats).add(elapsed,cpuMs,renderCpuMs,graphics.effective_frame_cap??graphics.frame_cap);
  // Conditions are overlapping labels, and describe steady gameplay only.
  if(phase)for(let i=0;i<CONDITIONS.length;i++)if(mask&(1<<i))this.conditionStats[i].add(elapsed,cpuMs,renderCpuMs,graphics.effective_frame_cap??graphics.frame_cap);
  if(this.windowStart===null)this.windowStart=now-elapsed;
  this.window.add(elapsed,cpuMs,renderCpuMs,graphics.effective_frame_cap??graphics.frame_cap);
  const row=[round(now-this.start),round(elapsed),round(cpuMs),round(renderCpuMs),context?.id??-1,mask,phase];
  this.rawSeen++;if(this.raw.length<LIMITS.raw)this.raw.push(row);else{this.randomState=(Math.imul(this.randomState,1664525)+1013904223)>>>0;const index=Math.floor(this.randomState/4294967296*this.rawSeen);if(index<LIMITS.raw)this.raw[index]=row;}
  if(elapsed>Math.max(50,2000/(graphics.effective_frame_cap??graphics.frame_cap))){if(this.spikes.length<LIMITS.spikes)this.spikes.push({elapsed_ms:row[0],frame_ms:row[1],context_id:row[4],condition_mask:mask,phase});else this.dropped.spikes++;}
  if(now-this.windowStart>=1000)this.flushWindow(now);
  return this.activeMs>=LIMITS.activeSeconds*1000;
 }
 gpuSample(ms,tag){if(!tag||!Number.isFinite(ms)||ms<=0)return;this.phaseStats[tag.phase].gpu.add(ms);const context=this.contexts[tag.context_id];context?.stats[tag.phase].gpu.add(ms);if(this.gpuRaw.length<LIMITS.gpu)this.gpuRaw.push([round(tag.elapsed_ms),round(ms),tag.context_id,tag.phase]);else this.dropped.gpu++;}
 gpuTag(now){return this.last!==null&&now>=this.start?{elapsed_ms:now-this.start,context_id:this.currentContext?.id??-1,phase:this.gameplayMs<this.warmupMs?0:1}:null;}
 flushWindow(now){if(!this.window.frame.count)return;this.windows.push({start_ms:round(this.windowStart-this.start),end_ms:round(now-this.start),context_id:this.currentContext?.id??-1,phase:this.lastPhase,...this.window.summary(false)});this.window=new FrameStats();this.windowStart=null;if(this.windows.length>LIMITS.windows){this.windows=this.windows.filter((_,i)=>i%2===0);this.windowDecimated=true;}}
 report({now=performance.now(),reason='toggle_off',interrupted=false}={}){
  this.flushWindow(now);
  const summary={warmup:this.phaseStats[0].summary(),steady:this.phaseStats[1].summary()};
  const measuredWindows=this.windows.filter(w=>w.phase===1&&w.frame_time.count>0),third=Math.max(1,Math.floor(measuredWindows.length/3));
  const mean=rows=>{const n=rows.reduce((s,w)=>s+w.frame_time.count,0);return n?rows.reduce((s,w)=>s+w.frame_time.mean_ms*w.frame_time.count,0)/n:null;};
  const early=mean(measuredWindows.slice(0,third)),late=mean(measuredWindows.slice(-third));
  return {schema:BENCHMARK_SCHEMA,session:{id:this.id,kind:this.kind,started_at:this.startedAt,ended_at:new Date().toISOString(),duration_ms:round(now-this.start),active_duration_ms:round(this.activeMs),warmup_per_match_ms:this.warmupMs,reason,interrupted,pause_count:this.pauseCount,scenario:this.scenario},build:this.build,environment:this.environment,renderer:this.renderer,
   methodology:BENCHMARK_METHODOLOGY,
   availability:{cpu_frame:{status:summary.steady.cpu_frame.count||summary.warmup.cpu_frame.count?'measured':'unavailable'},gpu:{status:summary.steady.gpu.count||summary.warmup.gpu.count?'measured':'unavailable',supported:this.gpuSupported??false},js_heap:{status:this.renderSamples.some(s=>s.memory.status==='estimate')?'estimate':'unavailable'},texture_bytes:{status:this.renderSamples.some(s=>Number.isFinite(s.texture_bytes_estimate))?'estimate':'unavailable'},process_memory:{status:'unavailable'},vram:{status:'unavailable'},temperature:{status:'unavailable'},display_refresh_rate:{status:'unavailable'}},
   summary,contexts:this.contexts.map(c=>({...c,stats:{warmup:c.stats[0].summary(),steady:c.stats[1].summary()}})),conditions:CONDITIONS.map((name,i)=>({name,stats:this.conditionStats[i].summary(false)})),timeline:this.windows,render_samples:this.renderSamples,transitions:this.transitions,spikes:this.spikes,activity:this.counters,
   raw:{columns:RAW_COLUMNS,seen:this.rawSeen,samples:[...this.raw].sort((a,b)=>a[0]-b[0]),gpu_columns:['elapsed_ms','gpu_ms','context_id','phase'],gpu_samples:this.gpuRaw},
   degradation:{early_mean_frame_ms:round(early),late_mean_frame_ms:round(late),change_percent:round(early&&late?(late/early-1)*100:null),status:measuredWindows.length>=30?'estimate':'insufficient_data',note:'Uncontrolled maps, settings, combat and DRS can explain change; this does not establish thermal throttling'},
   limits:{...LIMITS,dropped:this.dropped,timeline_decimated:!!this.windowDecimated,context_overflow:this.overflowStats.summary(false)}};
 }
}
