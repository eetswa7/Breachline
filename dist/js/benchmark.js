import {Game,emptyInput} from './engine.js?v=71';
import {BenchmarkRecorder,browserInfo,rendererInfo,graphicsSnapshot,LIMITS} from './benchmark-recorder.js?v=71';
import {BenchmarkStore,SAVED_REPORT_LIMIT} from './benchmark-store.js?v=71';
import {downloadBenchmark} from './benchmark-export.js?v=71';
import {StressSequence,STRESS_SCENARIO} from './benchmark-stress.js?v=71';
import {BENCHMARK_BUILD} from './benchmark-build.js?v=71';
import {TimingStats,round} from './benchmark-stats.js?v=71';

export class BenchmarkController {
 constructor(app){
  this.app=app;this.enabled=false;this.saving=false;this.store=new BenchmarkStore();this.reports=new Map();this.latestReport=null;this.nextHUD=0;this.nextCheckpoint=0;this.overhead=new TimingStats();
  this.ready=this.restore().catch(e=>{this.notify(`Benchmark storage unavailable: ${e.message}. Export JSON before closing Safari.`);return this.refreshReports().catch(()=>{});});
  globalThis.addEventListener?.('pagehide',()=>{this.recorder?.pause('page_hidden');this.checkpoint();});
  globalThis.document?.addEventListener('visibilitychange',()=>{if(document.hidden){this.recorder?.pause('page_hidden');this.checkpoint();}});
 }
 notify(message){this.app.ui?.toast(message);const el=document.getElementById('benchmark-status');if(el)el.textContent=message;}
 async restore(){await this.store.open();const active=await this.store.get('active');if(active){active.session.interrupted=true;active.session.reason='recovered_checkpoint';this.latestReport=active;await this.store.saveReport(active);await this.store.remove('active');}await this.refreshReports();}
 async toggle(value){if(this.saving)return;if(value)await this.start();else await this.stop();this.syncUI();}
 async start(kind='gameplay',scenario=null){
  if(this.enabled)return;await this.ready;
  if((await this.store.list('report:')).length>=SAVED_REPORT_LIMIT)throw new Error('Saved benchmarks are full. Export a report, then remove it from saved sessions to make space.');
  this.recorder=new BenchmarkRecorder({build:BENCHMARK_BUILD,environment:browserInfo(),renderer:rendererInfo(this.app.renderer),kind,scenario});this.recorder.gpuSupported=!!this.app.renderer.profiler?.extension;
  this.enabled=true;this.overhead.reset();this.checkpointMax=0;this.nextCheckpoint=performance.now()+60000;this.nextHUD=0;this.graphics=null;this.latestStats=null;
  const profiler=this.app.renderer.profiler;if(profiler){profiler.sampleListener=(ms,tag)=>{const t=performance.now();this.recorder?.gpuSample(ms,tag);this.overheadExtra=(this.overheadExtra??0)+performance.now()-t;};profiler.tagProvider=()=>{const t=performance.now(),tag=this.gpuTag();this.overheadExtra=(this.overheadExtra??0)+performance.now()-t;return tag;};}
  if(!this.store.persistent)this.notify('Browser storage is unavailable. Export this report before closing Safari.');
  this.syncUI();
 }
 async stop(reason='toggle_off'){
  if(!this.enabled||this.saving)return;this.saving=true;this.enabled=false;this.syncUI();
  const recorder=this.recorder;this.recorder=null;const profiler=this.app.renderer.profiler;if(profiler){profiler.sampleListener=null;profiler.tagProvider=null;}
  try{
   if(this.checkpointPromise)await this.checkpointPromise;
   const report=recorder.report({reason});report.instrumentation={cpu_overhead_ms:this.overhead.summary(),checkpoint_period_ms:60000,checkpoint_max_ms:round(this.checkpointMax??0),raw_observations:report.raw.samples.length};
   if(this.stress)report.session.scenario={...report.session.scenario,completed:this.stress.done,simulation_ticks:this.stress.tick,effect_counts:this.stress.effectCounts};
   this.latestReport=report;this.reports.set(report.session.id,report);let saved=false;try{await this.store.saveReport(report);await this.store.remove('active');saved=true;}catch(e){this.notify('Browser storage could not save this report. Export JSON before closing Safari.');}
   if(this.stress)this.restoreStress();await this.refreshReports(report.session.id);if(saved)this.notify('Benchmark saved on this device. Export JSON and attach it in ChatGPT.');
  }finally{this.saving=false;this.syncUI();}
 }
 beginFrame(now,active){
  const started=performance.now();this.overheadExtra=0;if(!active){this.recorder?.pause('inactive');const el=document.getElementById('benchmark-watermark');if(el&&now>=this.nextHUD){this.nextHUD=now+500;el.textContent='○ BENCHMARK MODE / PAUSED';}return;}
  this.frameNow=now;if(this.recorder?.game!==this.app.game){this.recorder.pause('match_changed');this.recorder.game=this.app.game;this.recorder.gameplayMs=0;this.recorder.nextPopulation=0;}
  this.overheadBegin=performance.now()-started;
 }
 events(events){const t=performance.now();this.recorder?.observeEvents(events,this.frameNow??t);this.overheadExtra=(this.overheadExtra??0)+performance.now()-t;}
 snapshot(){
  const r=this.app.renderer,s=this.app.store.data.settings,g=this.graphics;
  if(g&&g.requested_quality===s.quality&&g.effective_quality===(r.appliedQuality||r.quality||'unavailable')&&g.frame_cap===(s.frameRate===30?30:60)&&g.render_scale===(r.renderScale??1)&&g.width===(r.canvas?.width??r.width??0)&&g.height===(r.canvas?.height??r.height??0)&&g.device_pixel_ratio===(globalThis.devicePixelRatio??1)&&g.fov===(s.fov??80)&&g.camera_motion===(s.motion!==false))return g;
  return this.graphics=graphicsSnapshot(r,s);
 }
 gpuTag(){if(!this.recorder||!this.app.playing||this.app.game.paused||this.frameNow<this.recorder.start)return null;this.recorder.ensureContext(this.app.game,this.snapshot(),this.frameNow,this.recorder.last===null?0:this.frameNow-this.recorder.last);return this.recorder.gpuTag(this.frameNow);}
 endFrame(now,cpuMs,rendered,active){
  if(!this.recorder)return;const started=performance.now();if(!active||!rendered){if(!active)this.recorder.pause('inactive');return;}
  const r=this.app.renderer,graphics=this.snapshot();
  const capped=this.recorder.record({now,cpuMs,renderCpuMs:r.profiler?.renderCpuMs??null,game:this.app.game,graphics,render:{draw_calls:r.compatibility?null:r.drawCalls??null,canvas_draw_operations:r.compatibility?r.drawCalls:null,triangles:r.compatibility?null:r.triangles??null,textures:r.renderer?.info?.memory?.textures??null,geometries:r.renderer?.info?.memory?.geometries??null,main_render_passes:r.renderPasses??null,shadow_draw_calls:r.compatibility?null:r.shadowDraws??null,shadow_render_passes:null,texture_bytes_estimate:r.textureMemory??null}});
  if(now>=this.nextHUD){this.nextHUD=now+500;const el=document.getElementById('benchmark-watermark');if(el){const seconds=Math.floor(this.recorder.activeMs/1000),stats=this.recorder.phaseStats[this.recorder.lastPhase].frame;el.textContent=`● BENCHMARK MODE${this.stress?' / STRESS':''}\n${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} · ${Number.isFinite(r.fps)?r.fps:'…'} FPS${this.stress?' · '+this.stress.phase:''}`;}}
  if(now>=this.nextCheckpoint){this.nextCheckpoint=now+60000;const run=()=>this.checkpoint();if(globalThis.requestIdleCallback)requestIdleCallback(run,{timeout:2000});else setTimeout(run,0);}
  this.overhead.add((this.overheadBegin??0)+(this.overheadExtra??0)+performance.now()-started);if(capped||this.stress?.done)void this.stop(capped?'duration_limit':'stress_complete').catch(e=>this.notify(e.message));
 }
 checkpoint(){
  if(!this.recorder||this.checkpointPromise)return this.checkpointPromise;const recorder=this.recorder,t=performance.now(),report=recorder.report({now:this.frameNow??t,reason:'checkpoint',interrupted:true});this.checkpointMax=Math.max(this.checkpointMax??0,performance.now()-t);
  this.checkpointPromise=this.store.put('active',report).catch(()=>{}).finally(()=>{this.checkpointPromise=null;});return this.checkpointPromise;
 }
 async startStress(){
  if(this.enabled||this.app.playing||this.saving)throw new Error('Start the stress test from the main menu with Benchmark Mode off');
  const app=this.app;await app.audio.start();await Promise.resolve(app.renderer.ready);this.savedStress={game:app.game,config:app.config,resultShown:app.resultShown};
  try{
   app.config={...app.config,mode:'tdm',loadout:{...app.store.data.loadout}};app.game=new Game(app.config,{seed:STRESS_SCENARIO.seed});app.renderer.setArena(app.game.arena);await app.renderer.prepareMatch?.(app.game);this.stress=new StressSequence();app.playing=true;app.resultShown=false;app.accumulator=0;app.pending=emptyInput();app.last=0;app.framePacer.reset();app.input.reset();app.input.active=false;app.ui.play();
   await this.start('scripted',{...STRESS_SCENARIO,map:app.game.config.map,difficulty:app.game.config.difficulty,loadout:{...app.game.config.loadout}});if(navigator.wakeLock&&!document.hidden)navigator.wakeLock.request('screen').then(l=>{if(this.stress&&app.playing&&!document.hidden)app.wakeLock=l;else l.release();}).catch(()=>{});
  }catch(e){this.restoreStress();throw e;}
 }
 stressInput(){return this.stress?.input(this.app.game);}
 restoreStress(){const saved=this.savedStress;if(!saved)return;this.stress=null;this.savedStress=null;this.app.game=saved.game;this.app.config=saved.config;this.app.resultShown=saved.resultShown;this.app.renderer.setArena(saved.game.arena);this.app.renderer.weaponKey='';this.app.wakeLock?.release();this.app.wakeLock=null;this.app.playing=false;this.app.last=0;this.app.accumulator=0;this.app.pending=emptyInput();this.app.input.reset();this.app.input.active=false;this.app.framePacer.reset();this.app.ui.menu();}
 syncUI(){
  const toggle=document.getElementById('benchmark-toggle');if(toggle){toggle.checked=this.enabled;toggle.disabled=this.saving;}
  document.getElementById('benchmark-watermark')?.classList.toggle('hidden',!this.enabled);
  const stress=document.getElementById('benchmark-stress');if(stress)stress.disabled=this.enabled||this.app.playing||this.saving;
  for(const id of ['benchmark-export','benchmark-remove']){const button=document.getElementById(id);if(button)button.disabled=this.enabled||this.saving||!this.reports.size;}
  const select=document.getElementById('benchmark-report');if(select)select.disabled=this.enabled||this.saving||!this.reports.size;
 }
 async refreshReports(selectedID=null){
  const rows=(await this.store.list('report:').catch(()=>[...this.reports.values()].map(report=>({value:{report}})))).sort((a,b)=>b.value.report.session.started_at.localeCompare(a.value.report.session.started_at));this.reports=new Map(rows.map(r=>[r.value.report.session.id,r.value.report]));if(this.latestReport&&!this.reports.has(this.latestReport.session.id))this.reports.set(this.latestReport.session.id,this.latestReport);
  const select=document.getElementById('benchmark-report');if(select){const chosen=selectedID??select.value;select.replaceChildren();for(const [id,report]of this.reports){const option=document.createElement('option');option.value=id;option.textContent=`${new Date(report.session.started_at).toLocaleString()} · ${report.session.kind==='scripted'?'Stress test':'Gameplay'} · ${Math.round(report.session.active_duration_ms/1000)}s`;select.appendChild(option);}if(this.reports.has(chosen))select.value=chosen;select.disabled=this.enabled||!this.reports.size;}
  this.syncUI();
 }
 exportSelected(){const selected=document.getElementById('benchmark-report')?.value,report=this.reports.get(selected)??this.latestReport??this.reports.values().next().value;downloadBenchmark(report);this.notify('Benchmark JSON ready. Attach the file in ChatGPT.');}
 removeSelected(){
  const id=document.getElementById('benchmark-report')?.value;if(!this.reports.has(id))return;
  this.app.ui.modal('REMOVE SAVED BENCHMARK','LOCAL REPORT','<p>This removes the selected report from this browser. Export its JSON first if you want to keep it.</p>',[['REMOVE REPORT',async()=>{try{await this.store.remove('report:'+id);if(this.latestReport?.session.id===id)this.latestReport=null;this.app.ui.closeModal();await this.refreshReports();this.notify('Saved report removed.');}catch(e){this.notify(e.message);}},true],['CANCEL',()=>this.app.ui.closeModal()]]);
 }
 bindUI(){
  const toggle=document.getElementById('benchmark-toggle');if(!toggle)return;toggle.onchange=()=>this.toggle(toggle.checked).catch(e=>{this.notify(e.message);this.syncUI();});
  document.getElementById('benchmark-stress').onclick=()=>this.startStress().catch(e=>this.notify(e.message));
  document.getElementById('benchmark-export').onclick=()=>{try{this.exportSelected();}catch(e){this.notify(e.message);}};
  document.getElementById('benchmark-remove').onclick=()=>this.removeSelected();
  this.syncUI();
 }
}
