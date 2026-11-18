import {MatchRecording,ReplayCursor} from './replay.js?v=108';
import {raidInsertion} from './raid.js?v=108';
import {operationBattle} from './operation.js?v=108';
import {Game,emptyInput} from './engine.js?v=108';
import {Renderer} from './three-renderer.js?v=108';
import {CompatibilityRenderer} from './compatibility-renderer.js?v=108';
import {TouchInput} from './input.js?v=108';
import {AudioSystem} from './audio.js?v=108';
import {SaveStore} from './save.js?v=108';
import {Interface,$} from './ui.js?v=108';
import {Weapon} from './weapons.js?v=108';
import {opticMagnification} from './aim.js?v=108';
import {FramePacer} from './frame-pacer.js?v=108';
import {BenchmarkController} from './benchmark.js?v=108';
import {updateAimAssist} from './aim-assist.js?v=108';

export class Application {
 constructor(){this.store=new SaveStore();this.config={...this.store.data.matchSetup,loadout:this.store.data.loadout};this.playing=false;this.starting=false;this.assetsFailed=false;this.resultShown=false;this.accumulator=0;this.pending=emptyInput();this.wakeLock=null;this.last=0;this.framePacer=new FramePacer();
  try{this.renderer=new Renderer($('world'),this.store.data.settings);}catch(error){console.warn('WebGL renderer unavailable:',error.message);const fresh=$('world').cloneNode();$('world').replaceWith(fresh);this.renderer=new CompatibilityRenderer(fresh,this.store.data.settings);}
  this.game=new Game(this.config,{seed:881});this.renderer.setArena(this.game.arena);this.audio=new AudioSystem(this.store.data.settings);this.input=new TouchInput($('world'),$('touch-layer'),this.store.data.settings);this.benchmark=new BenchmarkController(this);this.ui=new Interface(this);this.benchmark.bindUI();this.controllerHUD=false;
  window.addEventListener('pointerdown',()=>{this.controllerHUD=false;this.touchUntil=performance.now()+750;document.body.classList.remove('controller-active');},{capture:true,passive:true});
  if(this.renderer.compatibility)this.ui.toast('Compatibility graphics enabled. WebGL is unavailable in this browser.');
  this.isTouch=new URLSearchParams(location.search).get('controls')==='touch'||matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;document.body.classList.toggle('desktop',!this.isTouch);
  this.frame=this.frame.bind(this);requestAnimationFrame(this.frame);Promise.resolve(this.renderer.ready).then(()=>$('loading').classList.add('hidden')).catch(e=>{this.assetsFailed=true;$('loading').classList.add('hidden');this.ui.modal('DOWNLOAD INTERRUPTED','BREACHLINE','<p>The battleground could not finish loading. Check your connection and retry. Saved progress is kept.</p>',[['RETRY',()=>location.reload(),true]]);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){if(this.playing)this.pause();this.audio.pause();this.wakeLock?.release();}else{this.last=0;this.orientation();}});
  window.addEventListener('resize',()=>this.orientation());window.addEventListener('orientationchange',()=>{this.input.reset();setTimeout(()=>this.orientation(),120);});
  document.addEventListener('pointerlockchange',()=>{if(this.playing&&!this.isTouch&&!this.replayPlayer&&!document.pointerLockElement&&!this.game.paused)this.pause();});
  $('world').addEventListener('click',()=>{if(this.playing&&!this.isTouch&&!this.replayPlayer&&!this.game.paused)this.lockMouse();});
  window.addEventListener('graphicslost',()=>{if(this.playing)this.pause();this.ui.modal('GRAPHICS INTERRUPTED','BREACHLINE','<p>Your browser released the graphics context. Reload to start a fresh match. Saved career progress is kept.</p>',[['RELOAD',()=>location.reload(),true]]);});
  window.addEventListener('error',e=>{if(e.message?.includes('ResizeObserver'))return;if(this.playing)this.pause();this.ui.toast('A game error occurred. Reload if controls stop responding.');});
 }
 orientation(){const portrait=innerHeight>innerWidth,need=(this.playing||this.input.editing)&&portrait;$('rotation-hint').classList.toggle('hidden',!need);if(need&&this.playing&&!this.game.paused)this.pause();}
 lockMouse(){try{const result=$('world').requestPointerLock?.();result?.catch?.(()=>{});}catch{}}
 async start(missionId=null,replay=null,raidPlan='standard',raidGearId=null){
  if(this.starting)return;
  const operation=replay?.operation??(missionId?operationBattle(this.store.data.operation,missionId):null);
  if(missionId&&!operation)return;
  const launchRaid=!replay&&!operation&&this.config.mode==='raid';
  const insertion=launchRaid?raidInsertion(raidPlan):null;
  const raidGear=launchRaid&&raidGearId!==null?this.store.data.raidStash?.find(item=>item.id===raidGearId):null;
  if(launchRaid&&raidGearId!==null&&!raidGear)return;
  if(launchRaid&&(!insertion||insertion.cost>(this.store.data.raidWallet??0)))return;if(this.assetsFailed){location.reload();return;}this.starting=true;await this.audio.start();await Promise.resolve(this.renderer.ready).catch(()=>{});this.ui.closeModal();this.input.reset();this.input.active=false;this.ui.toastTimer&&clearTimeout(this.ui.toastTimer);$('toast').classList.add('hidden');$('loading').classList.remove('hidden');
  if(!this.isTouch&&!replay)this.lockMouse();
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  try{this.config.loadout={...this.store.data.loadout};const seed=replay?.seed??Date.now();
   this.game=new Game(replay?.config??(operation?{...this.config,...operation}:launchRaid?{...this.config,raidPlan,raidGear}:this.config),{operation,seed});
   this.replayPlayer=replay?new ReplayCursor(replay):null;this.replaySpeed=1;this.replayIncomplete=false;
   this.recording=replay?null:new MatchRecording(this.game.config,seed,operation);
   this.game.recordReplayAction=(type,value)=>this.recording?.addAction(type,value);this.renderer.setArena(this.game.arena);this.renderer.weaponKey='';this.renderer.frameAverage=16.7;this.audio.prepareAmbience?.(this.game.arena);await this.renderer.prepareMatch?.(this.game);if(this.renderer.lost)throw new Error('Graphics context unavailable');
   if((insertion?.cost||raidGear)&&!this.store.payRaidInsertion(insertion.id,raidGearId))throw new Error('The salvage charge could not be saved');
   this.playing=true;this.resultShown=false;this.accumulator=0;this.pending=emptyInput();this.input.active=!this.replayPlayer;this.ui.play();this.last=0;if(document.hidden)this.pause();
   this.wakeLock?.release();this.wakeLock=null;const match=this.game;if(navigator.wakeLock&&!document.hidden&&!match.paused)navigator.wakeLock.request('screen').then(l=>{if(this.playing&&this.game===match&&!match.paused&&!document.hidden)this.wakeLock=l;else l.release();}).catch(()=>{});
   if(this.store.data.settings.gyro&&!this.input.gyroListening)this.ui.toast('Enable gyroscope again in Settings to grant motion access.');
  }catch(e){this.playing=false;this.replayPlayer=null;this.recording=null;this.game.paused=true;this.input.active=false;this.wakeLock?.release();this.wakeLock=null;document.exitPointerLock?.();this.ui.menu();this.ui.toast(`Match could not start: ${e.message}`);}finally{$('loading').classList.add('hidden');this.starting=false;this.last=0;this.framePacer.reset();}
 }
 openSquadOrders(){
  if(this.playing&&!this.replayPlayer&&!this.game.paused&&this.game.canCommandSquad)this.pause('squad');
 }
 pause(reason){if(!this.playing||this.game.rules.phase==='finished')return;this.game.paused=true;this.input.active=false;this.input.reset();this.aimAssistState={};this.pending=emptyInput();document.exitPointerLock?.();this.audio.pause();if(reason==='squad')this.ui.squadOrders();else this.ui.pause();}
 resume(){if(!this.playing)return;if(!this.replayPlayer&&this.game.awaitingSurvivalSupport)this.game.chooseSurvivalSupport('bank');this.ui.closeModal();this.input.reset();this.input.active=!this.replayPlayer;this.game.paused=false;this.last=0;this.accumulator=0;this.audio.start();if(!this.isTouch&&!this.replayPlayer)this.lockMouse();this.orientation();}
 toMenu(){if(this.benchmark?.stress){void this.benchmark.stop('stress_cancelled');return;}this.playing=false;this.recording=null;this.replayPlayer=null;this.game.paused=true;this.input.active=false;this.input.reset();document.exitPointerLock?.();this.audio.stopAmbience?.();this.previewMap(this.config.map);this.ui.menu();this.audio.start();this.wakeLock?.release();this.previewWeapon();}
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
  else if(pad.edges[12])this.openSquadOrders();
  if(this.playing&&!this.game.paused&&this.game.rules.phase!=='finished'){
   this.input.aimAssistGain=this.isTouch?updateAimAssist(this.aimAssistState??(this.aimAssistState={}),this.game,dt,this.store.data.settings.aimAssist!==false):1;
   this.input.crouched=this.game.player.crouched;this.input.scopeScale=1/Math.sqrt(opticMagnification(this.game.player.weapon));const next=this.benchmark?.stress||this.replayPlayer?emptyInput():this.input.sample(dt);this.pending.mx=next.mx;this.pending.mz=next.mz;this.pending.lx+=next.lx;this.pending.ly+=next.ly;for(const key of ['fire','ads','sprint','interact','repeatFire','autoReload'])this.pending[key]=next[key];for(const key of ['firePressed','jump','crouch','reload','swap','inspect','grenade','melee','light','ability'])this.pending[key]||=next[key];
   if(!this.replayPlayer&&pad.edges[15])this.pending.light=true;
   if(!this.replayPlayer&&pad.edges[14])this.pending.ability=true;
   const speed=this.replayPlayer?this.replaySpeed:1;
   this.accumulator=Math.min(.1*speed,this.accumulator+dt*speed);
   let steps=0;
   while(this.accumulator>=1/60&&steps++<6*speed&&this.game.rules.phase!=='finished'){
    if(this.replayPlayer){
     if(!this.replayPlayer.step(this.game)){
      this.game.rules.finish(-1);
      this.replayIncomplete=true;
     }
    }else{
     const input=this.benchmark?.stressInput()??this.pending;
     if(!this.benchmark?.stress)this.recording?.addInput(input);
     this.game.update(1/60,input);
    }
    this.accumulator-=1/60;
    this.pending.lx=this.pending.ly=0;
    for(const key of ['firePressed','jump','crouch','reload','swap','inspect','grenade','melee','light','ability'])this.pending[key]=false;
   }
   if(this.benchmark?.enabled)this.benchmark.events(this.game.events);this.renderer.events(this.game.events,this.game);this.audio.events(this.game.events,this.game);this.ui.events(this.game.events);this.game.events.length=0;this.ui.update(dt);if(!this.replayPlayer&&this.game.awaitingSurvivalSupport)this.pause();
  }else if(!this.playing)this.game.time+=dt;
  const rendered=this.renderer.render(this.game,dt,!this.playing,elapsed);if(this.playing&&!this.game.paused)this.ui.updateIdentities(dt);
  const cpuMs=performance.now()-cpuStart;this.renderer.recordFrame?.(cpuMs,elapsed,activeMatch);if(this.benchmark?.enabled)this.benchmark.endFrame(now,cpuMs,rendered,activeMatch);
  if(this.benchmark?.stress&&this.game.rules.phase==='finished'){this.audio.stopAmbience?.();void this.benchmark.stop('stress_match_finished');}
  if(this.playing&&!this.benchmark?.stress&&this.game.rules.phase==='finished'&&!this.resultShown){this.resultShown=true;this.audio.stopAmbience?.();this.wakeLock?.release();this.wakeLock=null;this.input.active=false;this.input.reset();document.exitPointerLock?.();
   if(this.replayPlayer)this.ui.replayResults(this.replayIncomplete||this.replayPlayer.tick!==this.replayPlayer.recording.ticks);
   else {
    if(this.recording?.valid&&this.recording.ticks)this.lastReplay=this.recording;
    this.recording=null;this.ui.results();
   }
  }
 }
}

export let application=null;
if(typeof document!=='undefined')try{application=new Application();}catch(e){console.error(e);$('loading').innerHTML='<div class="fatal"><h2>Unable to start Breachline</h2><p></p><button onclick="location.reload()">RELOAD</button></div>';$('loading').querySelector('p').textContent=e.message;}
