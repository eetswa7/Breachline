import {Game,emptyInput} from './engine.js?v=71';
import {Renderer} from './three-renderer.js?v=71';
import {CompatibilityRenderer} from './compatibility-renderer.js?v=71';
import {TouchInput} from './input.js?v=71';
import {AudioSystem} from './audio.js?v=71';
import {SaveStore} from './save.js?v=71';
import {Interface,$} from './ui.js?v=71';
import {Weapon} from './weapons.js?v=71';
import {opticMagnification} from './aim.js?v=71';
import {FramePacer} from './frame-pacer.js?v=71';
import {BenchmarkController} from './benchmark.js?v=71';
import {updateAimAssist} from './aim-assist.js?v=71';

export class Application {
 constructor(){this.store=new SaveStore();this.config={mode:'tdm',map:14,difficulty:'regular',loadout:this.store.data.loadout};this.playing=false;this.starting=false;this.assetsFailed=false;this.resultShown=false;this.accumulator=0;this.pending=emptyInput();this.wakeLock=null;this.last=0;this.framePacer=new FramePacer();
  try{this.renderer=new Renderer($('world'),this.store.data.settings);}catch(error){console.warn('WebGL renderer unavailable:',error.message);const fresh=$('world').cloneNode();$('world').replaceWith(fresh);this.renderer=new CompatibilityRenderer(fresh,this.store.data.settings);}
  this.game=new Game(this.config,{seed:881});this.renderer.setArena(this.game.arena);this.audio=new AudioSystem(this.store.data.settings);this.input=new TouchInput($('world'),$('touch-layer'),this.store.data.settings);this.benchmark=new BenchmarkController(this);this.ui=new Interface(this);this.benchmark.bindUI();this.controllerHUD=false;
  window.addEventListener('pointerdown',()=>{this.controllerHUD=false;this.touchUntil=performance.now()+750;document.body.classList.remove('controller-active');},{capture:true,passive:true});
  if(this.renderer.compatibility)this.ui.toast('Compatibility graphics enabled. WebGL is unavailable in this browser.');
  this.isTouch=new URLSearchParams(location.search).get('controls')==='touch'||matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;document.body.classList.toggle('desktop',!this.isTouch);
  this.frame=this.frame.bind(this);requestAnimationFrame(this.frame);Promise.resolve(this.renderer.ready).then(()=>$('loading').classList.add('hidden')).catch(e=>{this.assetsFailed=true;$('loading').classList.add('hidden');this.ui.modal('DOWNLOAD INTERRUPTED','BREACHLINE','<p>The battleground could not finish loading. Check your connection and retry. Saved progress is kept.</p>',[['RETRY',()=>location.reload(),true]]);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){if(this.playing)this.pause();this.audio.pause();this.wakeLock?.release();}else{this.last=0;this.orientation();}});
  window.addEventListener('resize',()=>this.orientation());window.addEventListener('orientationchange',()=>{this.input.reset();setTimeout(()=>this.orientation(),120);});
  document.addEventListener('pointerlockchange',()=>{if(this.playing&&!this.isTouch&&!document.pointerLockElement&&!this.game.paused)this.pause();});
  $('world').addEventListener('click',()=>{if(this.playing&&!this.isTouch&&!this.game.paused)this.lockMouse();});
  window.addEventListener('graphicslost',()=>{if(this.playing)this.pause();this.ui.modal('GRAPHICS INTERRUPTED','BREACHLINE','<p>Your browser released the graphics context. Reload to start a fresh match. Saved career progress is kept.</p>',[['RELOAD',()=>location.reload(),true]]);});
  window.addEventListener('error',e=>{if(e.message?.includes('ResizeObserver'))return;if(this.playing)this.pause();this.ui.toast('A game error occurred. Reload if controls stop responding.');});
 }
 orientation(){const portrait=innerHeight>innerWidth,need=(this.playing||this.input.editing)&&portrait;$('rotation-hint').classList.toggle('hidden',!need);if(need&&this.playing&&!this.game.paused)this.pause();}
 lockMouse(){try{const result=$('world').requestPointerLock?.();result?.catch?.(()=>{});}catch{}}
 async start(){
  if(this.starting)return;if(this.assetsFailed){location.reload();return;}this.starting=true;await this.audio.start();await Promise.resolve(this.renderer.ready).catch(()=>{});this.ui.closeModal();this.input.reset();this.input.active=false;this.ui.toastTimer&&clearTimeout(this.ui.toastTimer);$('toast').classList.add('hidden');$('loading').classList.remove('hidden');
  if(!this.isTouch)this.lockMouse();
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  try{this.config.loadout={...this.store.data.loadout};this.game=new Game(this.config);this.renderer.setArena(this.game.arena);this.renderer.weaponKey='';this.renderer.frameAverage=16.7;await this.renderer.prepareMatch?.(this.game);if(this.renderer.lost)throw new Error('Graphics context unavailable');this.playing=true;this.resultShown=false;this.accumulator=0;this.pending=emptyInput();this.input.active=true;this.ui.play();this.last=0;if(document.hidden)this.pause();
   this.wakeLock?.release();this.wakeLock=null;const match=this.game;if(navigator.wakeLock&&!document.hidden&&!match.paused)navigator.wakeLock.request('screen').then(l=>{if(this.playing&&this.game===match&&!match.paused&&!document.hidden)this.wakeLock=l;else l.release();}).catch(()=>{});
   if(this.store.data.settings.gyro&&!this.input.gyroListening)this.ui.toast('Enable gyroscope again in Settings to grant motion access.');
  }catch(e){this.playing=false;this.game.paused=true;this.input.active=false;this.wakeLock?.release();this.wakeLock=null;document.exitPointerLock?.();this.ui.menu();this.ui.toast(`Match could not start: ${e.message}`);}finally{$('loading').classList.add('hidden');this.starting=false;this.last=0;this.framePacer.reset();}
 }
 pause(){if(!this.playing||this.game.rules.phase==='finished')return;this.game.paused=true;this.input.active=false;this.input.reset();this.aimAssistState={};this.pending=emptyInput();document.exitPointerLock?.();this.audio.pause();this.ui.pause();}
 resume(){if(!this.playing)return;this.ui.closeModal();this.input.reset();this.input.active=true;this.game.paused=false;this.last=0;this.accumulator=0;this.audio.start();if(!this.isTouch)this.lockMouse();this.orientation();}
 toMenu(){if(this.benchmark?.stress){void this.benchmark.stop('stress_cancelled');return;}this.playing=false;this.game.paused=true;this.input.active=false;this.input.reset();document.exitPointerLock?.();this.ui.menu();this.audio.start();this.wakeLock?.release();this.previewWeapon();}
 previewMap(id){if(this.playing)return;this.game=new Game({...this.config,map:id},{seed:881});this.renderer.setArena(this.game.arena);}
 previewWeapon(){if(this.playing)return;const slot=this.ui?.slot??'primary',id=this.store.data.loadout[slot];this.game.player.weapons[0]=new Weapon(id,slot==='primary'?this.store.data.loadout:{});this.game.player.slot=0;this.renderer.weaponKey='';}
 frame(now){requestAnimationFrame(this.frame);if(document.hidden||this.renderer.lost)return;const activeMatch=this.playing&&!this.game.paused&&this.game.rules.phase!=='finished',frameRate=activeMatch?this.store.data.settings.frameRate===30?30:60:this.playing?10:30;if(!this.last)this.framePacer.reset();if(!this.framePacer.accept(now,frameRate))return;const elapsed=this.last?Math.max(.001,(now-this.last)/1000):1/60,dt=Math.min(.08,elapsed);this.last=now;if(this.starting)return;
  const cpuStart=performance.now();if(this.benchmark?.enabled)this.benchmark.beginFrame(now,activeMatch);
  this.input.controller.poll();
  const pad=this.input.controller;
  if(!pad.connected&&this.controllerHUD){this.controllerHUD=false;document.body.classList.remove('controller-active');}
  if(pad.connected&&this.playing&&!this.input.editing&&now>(this.touchUntil??0)&&(pad.sticks.some(v=>Math.abs(v)>.1)||pad.edges.some(v=>v))&&!this.controllerHUD){this.controllerHUD=true;document.body.classList.add('controller-active');}

  if(this.input.controller.lost&&this.playing&&!this.game.paused){this.pause();this.ui.toast("Controller disconnected. Reconnect or use touch controls.");}
  if(this.input.controller.edges[9]&&this.playing&&this.game.rules.phase!=='finished'){if(this.game.paused)this.resume();else this.pause();}
  if(!this.playing||this.game.paused||this.game.rules.phase==='finished')this.ui.controllerMenu(this.input.controller);
  if(this.playing&&!this.game.paused&&this.game.rules.phase!=='finished'){
   this.input.aimAssistGain=this.isTouch?updateAimAssist(this.aimAssistState??(this.aimAssistState={}),this.game,dt,this.store.data.settings.aimAssist!==false):1;
   this.input.crouched=this.game.player.crouched;this.input.scopeScale=1/Math.sqrt(opticMagnification(this.game.player.weapon));const next=this.benchmark?.stress?emptyInput():this.input.sample(dt);this.pending.mx=next.mx;this.pending.mz=next.mz;this.pending.lx+=next.lx;this.pending.ly+=next.ly;for(const key of ['fire','ads','sprint','interact','repeatFire','autoReload'])this.pending[key]=next[key];for(const key of ['firePressed','jump','crouch','reload','swap','inspect','grenade','melee'])this.pending[key]||=next[key];
   this.accumulator=Math.min(.1,this.accumulator+dt);let steps=0;while(this.accumulator>=1/60&&steps++<6){this.game.update(1/60,this.benchmark?.stressInput()??this.pending);this.accumulator-=1/60;this.pending.lx=this.pending.ly=0;for(const key of ['firePressed','jump','crouch','reload','swap','inspect','grenade','melee'])this.pending[key]=false;}
   if(this.benchmark?.enabled)this.benchmark.events(this.game.events);this.renderer.events(this.game.events,this.game);this.audio.events(this.game.events,this.game);this.ui.events(this.game.events);this.game.events.length=0;this.ui.update(dt);
  }else if(!this.playing)this.game.time+=dt;
  const rendered=this.renderer.render(this.game,dt,!this.playing,elapsed);if(this.playing&&!this.game.paused)this.ui.updateIdentities(dt);
  const cpuMs=performance.now()-cpuStart;this.renderer.recordFrame?.(cpuMs,elapsed,activeMatch);if(this.benchmark?.enabled)this.benchmark.endFrame(now,cpuMs,rendered,activeMatch);
  if(this.benchmark?.stress&&this.game.rules.phase==='finished')void this.benchmark.stop('stress_match_finished');
  if(this.playing&&!this.benchmark?.stress&&this.game.rules.phase==='finished'&&!this.resultShown){this.resultShown=true;this.wakeLock?.release();this.wakeLock=null;this.input.active=false;this.input.reset();document.exitPointerLock?.();this.ui.results();}
 }
}

if(typeof document!=='undefined')try{new Application();}catch(e){console.error(e);$('loading').innerHTML='<div class="fatal"><h2>Unable to start Breachline</h2><p></p><button onclick="location.reload()">RELOAD</button></div>';$('loading').querySelector('p').textContent=e.message;}
