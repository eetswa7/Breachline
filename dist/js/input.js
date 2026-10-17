import {emptyInput} from './engine.js?v=71';
import {ControllerInput} from './gamepad.js?v=71';
import {clamp} from './math.js?v=71';

export const CONTROL_LAYOUT={fire:[.87,.68,88],ads:[.91,.40,56],reload:[.36,.90,50],jump:[.70,.81,54],crouch:[.70,.9,48],swap:[.49,.9,50],grenade:[.72,.48,48],interact:[.60,.53,56],melee:[.94,.26,44],sprint:[.13,.43,44]};
const ADVANCED_LAYOUT={...CONTROL_LAYOUT,fire:[.9,.57,82],ads:[.81,.31,52],reload:[.81,.8,51],jump:[.94,.88,51],crouch:[.7,.9,48],grenade:[.65,.72,48],swap:[.51,.91,48],interact:[.7,.51,48]};
const simpleHidden=new Set(['crouch','melee','sprint']);
const TAP_SLOP=9;
const INSPECT_HOLD=.42;

export class TouchInput {
 constructor(canvas,layer,settings){
  this.controller=new ControllerInput(settings);this.canvas=canvas;this.layer=layer;this.settings=settings;this.active=false;this.editing=false;
  this.pointers=new Map();this.keys=new Set();this.actions=emptyInput();this.holds={};this.look={x:0,y:0};this.move={x:0,z:0};
  this.stickID=null;this.adsToggle=false;this.sprintToggle=false;this.previousFire=false;this.gyro={x:0,y:0};this.aimAssistGain=1;this.lastGamepadButtons=[];this.contextAvailable=false;this.nativeTouches=null;
  this.stick=layer.querySelector('#stick');this.knob=layer.querySelector('#stick-knob');
  layer.addEventListener('pointerdown',e=>this.pointerDown(e),{passive:false});
  // Window capture still receives releases outside the HUD or after Safari loses capture.
  for(const [name,fn]of [['pointermove',e=>this.pointerMove(e)],['pointerup',e=>this.pointerUp(e)],['pointercancel',e=>this.pointerUp(e,true)]])window.addEventListener(name,fn,{passive:false,capture:true});
  layer.addEventListener('lostpointercapture',e=>{if(e.target===this.layer)this.pointerUp(e,true);},{passive:true});
  for(const type of ['touchstart','touchmove','touchend','touchcancel'])window.addEventListener(type,e=>this.syncTouches(e),{passive:true,capture:true});
  window.addEventListener('pagehide',()=>this.reset());
  layer.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener?.('contextmenu',e=>e.preventDefault());
  window.addEventListener('keydown',e=>{if(!this.active||e.target.matches('input,select,textarea'))return;this.keys.add(e.code);const action={KeyR:'reload',Space:'jump',KeyC:'crouch',ControlLeft:'crouch',KeyQ:'swap',Digit1:'swap',KeyF:'inspect',KeyG:'grenade',KeyV:'melee'}[e.code];if(action&&!e.repeat)this.actions[action]=true;if(['Space','Tab','ControlLeft'].includes(e.code))e.preventDefault();});
  window.addEventListener('keyup',e=>this.keys.delete(e.code));
  window.addEventListener('mousemove',e=>{if(this.active&&document.pointerLockElement)this.addLook(e.movementX,e.movementY);});
  window.addEventListener('mousedown',e=>{if(this.active&&document.pointerLockElement){if(e.button===0){this.holds.mouseFire=true;this.actions.firePressed=true;}if(e.button===2)this.holds.mouseADS=true;}});
  window.addEventListener('mouseup',e=>{if(e.button===0)this.holds.mouseFire=false;if(e.button===2)this.holds.mouseADS=false;});
  window.addEventListener('blur',()=>this.reset());window.addEventListener('resize',()=>{this.reset();this.layout();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.reset();});this.layout();
 }
 get simple(){return this.settings.controlProfile!=='advanced';}
 layout(){
  const s=this.settings,box=this.layer.getBoundingClientRect();this.layer.classList.toggle('left-handed',!!s.leftHanded);this.layer.classList.toggle('simple-controls',this.simple);this.layer.style.setProperty('--control-opacity',s.opacity);
  for(const [id,defaults]of Object.entries(this.simple?CONTROL_LAYOUT:ADVANCED_LAYOUT)){
   const b=this.layer.querySelector(`[data-action="${id}"]`),custom=s.layout?.[id];
   const size=defaults[2]*(s.buttonScale??1),utility=this.simple&&['reload','swap'].includes(id),width=utility?size*1.12:size,height=utility?size*(id==='swap'?1.04:.84):size,xm=Math.max(.055,(width/2+8)/(box.width||844)),ym=Math.max(.08,(height/2+8)/(box.height||390));const x=clamp(custom?.x??defaults[0],xm,1-xm),y=clamp(custom?.y??defaults[1],Math.max(.13,ym),Math.min(.91,1-ym));
   b.style.left=`${(s.leftHanded?1-x:x)*100}%`;b.style.top=`${y*100}%`;b.style.width=`${width}px`;b.style.height=`${height}px`;
   b.hidden=(this.mode==='gun'&&['grenade','melee'].includes(id))||this.simple&&simpleHidden.has(id)||id==='interact'&&!this.contextAvailable&&!this.editing;
   if(id==='swap'){b.setAttribute?.('aria-label',this.mode==='gun'?'Inspect weapon':'Tap to switch weapon, hold to inspect');const label=b.querySelector?.('span');if(label)label.textContent=this.mode==='gun'?'INSPECT':'SWAP';}
  }
  this.stick.style.left=s.leftHanded?'85%':'15%';
  const fireLabel=this.layer.querySelector('[data-action="fire"] span');if(fireLabel)fireLabel.textContent=this.simple&&s.aimFire!==false?'AIM + FIRE':'FIRE';
 }
 setContext(available){if(available===this.contextAvailable)return;this.contextAvailable=available;this.layer.querySelector('[data-action="interact"]').hidden=!available&&!this.editing;}
 reset(){
  this.controller.suspend();
  // Remove ownership before releasing capture; the lost-capture event can be synchronous.
  for(const id of this.pointers.keys())this.pointerUp({pointerId:id},true);
  this.pointers.clear();this.nativeTouches=null;this.keys.clear();this.holds={};this.actions=emptyInput();this.look.x=this.look.y=0;this.move.x=this.move.z=0;this.stickID=null;this.adsToggle=false;this.sprintToggle=false;this.previousFire=false;this.lastGamepadButtons=[];this.gyro.x=this.gyro.y=0;
  this.aimAssistGain=1;if(this.knob)this.knob.style.transform='translate(-50%,-50%)';for(const b of this.layer.querySelectorAll('.pressed'))b.classList.remove('pressed');
 }
 isAiming(){return this.adsToggle||this.holds.mouseADS||(this.settings.adsMode==='hold'&&this.holds.ads)||(this.simple&&this.settings.aimFire!==false&&this.holds.fire);}
 addLook(dx,dy,touch=false){
  if(!Number.isFinite(dx)||!Number.isFinite(dy))return;
  let mult=this.settings.sensitivity*.0027;if(this.isAiming())mult*=this.settings.adsSensitivity*(this.scopeScale??1);
  if(this.settings.aimAcceleration)mult*=1+Math.min(1,Math.hypot(dx,dy)/28)*.5;
  if(touch&&this.settings.aimAssist!==false)mult*=clamp(this.aimAssistGain??1,.55,1);
  this.look.x+=clamp(dx,-180,180)*mult;this.look.y-=clamp(dy,-180,180)*mult;
 }
 pointerDown(e){
  if(!this.active&&!this.editing)return;if(e.pointerType==='mouse'&&document.pointerLockElement)return;if(!Number.isFinite(e.clientX)||!Number.isFinite(e.clientY))return;if(this.pointers.has(e.pointerId))this.pointerUp(e,true);e.preventDefault();
  const button=e.target.closest('[data-action]'),action=button?.dataset.action,rect=this.layer.getBoundingClientRect();let role='look';
  if(this.editing){if(!button||button.hidden)return;role='edit';}
  else if(action){
   if(button.hidden)return;role=action;button.classList.add('pressed');
   if(action==='ads'&&this.settings.adsMode==='toggle')this.adsToggle=!this.adsToggle;
   else if(action==='sprint')this.sprintToggle=!this.sprintToggle;
   else if(action==='fire')this.actions.firePressed=true;
   else if(!(action==='jump'&&this.simple)&&!['ads','interact','swap'].includes(action))this.actions[action]=true;
   this.holds[action]=true;
  }else if(this.stickID===null&&(this.settings.leftHanded?e.clientX>rect.left+rect.width*.55:e.clientX<rect.left+rect.width*.45)){role='stick';this.stickID=e.pointerId;}
  // Capture each contact separately: leaving a button must not drop a held shot.
  const pointer={role,type:e.pointerType??'touch',touchID:null,x:e.clientX,y:e.clientY,ox:e.clientX,oy:e.clientY,button,action,age:0,held:false};this.pointers.set(e.pointerId,pointer);this.bindTouch(pointer);
  try{this.layer.setPointerCapture?.(e.pointerId);}catch{/* Global release and native touch tracking remain active. */}
 }
 bindTouch(pointer){
  if(pointer.type!=='touch'||pointer.touchID!==null||!this.nativeTouches)return;
  let best=null,distance=48*48;
  for(let i=0;i<this.nativeTouches.length;i++){const t=this.nativeTouches[i];let used=false;for(const p of this.pointers.values())if(p!==pointer&&p.touchID===t.identifier){used=true;break;}if(used)continue;
   const d=(t.clientX-pointer.x)**2+(t.clientY-pointer.y)**2;if(d<distance){distance=d;best=t;}
  }
  if(best)pointer.touchID=best.identifier;
 }
 syncTouches(event){
  this.nativeTouches=event.touches;
  if(!this.nativeTouches)return;
  const ending=event.type==='touchend'||event.type==='touchcancel';
  for(const [id,p]of this.pointers){if(p.type!=='touch')continue;
   if(!ending)this.bindTouch(p);
   let active=false;for(let i=0;i<this.nativeTouches.length;i++)if(this.nativeTouches[i].identifier===p.touchID){active=true;break;}
   // Touch.identifier and PointerEvent.pointerId are different on iOS. Bind by
   // initial contact position, then trust the complete native contact list.
   if(ending&&(!this.nativeTouches.length||p.touchID!==null&&!active))this.pointerUp({pointerId:id},event.type==='touchcancel');
  }
 }
 pointerMove(e){
  const p=this.pointers.get(e.pointerId);if(!p)return;if(!this.active&&!this.editing||e.pointerType==='mouse'&&e.buttons===0){this.pointerUp(e,true);return;}if(!Number.isFinite(e.clientX)||!Number.isFinite(e.clientY))return;e.preventDefault();const dx=e.clientX-p.x,dy=e.clientY-p.y;
  if(['look','fire','ads'].includes(p.role)){
   // Safari/ProMotion can batch several hardware samples into one pointer event.
   // Integrate each segment once, preserving acceleration without double counting.
   const samples=e.getCoalescedEvents?.()??[];let x=p.x,y=p.y;
   const touch=p.type==='touch'||p.type==='pen';
   for(const sample of samples)if(Number.isFinite(sample.clientX)&&Number.isFinite(sample.clientY)){this.addLook(sample.clientX-x,sample.clientY-y,touch);x=sample.clientX;y=sample.clientY;}
   this.addLook(e.clientX-x,e.clientY-y,touch);
  }
  if(p.role==='stick'){
   const x=(e.clientX-p.ox)/45,z=-(e.clientY-p.oy)/45,n=Math.hypot(x,z),gain=n>.1?Math.min(1,(n-.1)/.9)/n:0;
   this.move.x=x*gain;this.move.z=z*gain;this.knob.style.transform=`translate(calc(-50% + ${this.move.x*28}px),calc(-50% + ${-this.move.z*28}px))`;
  }
  if(p.role==='edit'){
   const b=this.layer.getBoundingClientRect(),x=clamp((e.clientX-b.left)/b.width,.055,.945),y=clamp((e.clientY-b.top)/b.height,.13,.91);
   this.settings.layout[p.action]={x:this.settings.leftHanded?1-x:x,y};this.layout();
  }
  p.x=e.clientX;p.y=e.clientY;
 }
 pointerUp(e,cancelled=false){
  const p=this.pointers.get(e.pointerId);if(!p)return;
  if(!cancelled&&p.role==='jump'&&this.simple&&!p.held&&Math.hypot(p.x-p.ox,p.y-p.oy)<TAP_SLOP*3)this.actions[this.crouched?'crouch':'jump']=true;
  if(!cancelled&&p.role==='swap'&&!p.held&&Math.hypot(p.x-p.ox,p.y-p.oy)<TAP_SLOP*3)this.actions[this.mode==='gun'?'inspect':'swap']=true;
  this.pointers.delete(e.pointerId);
  try{if(this.layer.hasPointerCapture?.(e.pointerId))this.layer.releasePointerCapture(e.pointerId);}catch{}
  if(p.role==='stick'){this.stickID=null;this.move.x=this.move.z=0;this.knob.style.transform='translate(-50%,-50%)';}
  if(p.action){this.holds[p.action]=false;for(const q of this.pointers.values())if(q.action===p.action)this.holds[p.action]=true;if(!this.holds[p.action])p.button?.classList.remove('pressed');}
  if(cancelled&&p.action==='ads')this.adsToggle=false;
  if(cancelled&&p.action==='fire'&&!this.holds.fire)this.actions.firePressed=false;
 }
 async enableGyro(){
  const C=globalThis.DeviceMotionEvent;if(!C)return false;
  try{if(typeof C.requestPermission==='function'&&(await C.requestPermission())!=='granted')return false;
   if(!this.gyroListening){window.addEventListener('devicemotion',e=>{if(!this.active||!this.settings.gyro)return;const r=e.rotationRate;if(!r)return;const sign=(screen.orientation?.angle??window.orientation??90)<0?-1:1,dt=Math.min(.04,(e.interval||16.7)/1000),gain=this.settings.gyroSensitivity*.01745*dt;this.gyro.x+=-(r.beta||0)*gain*sign;this.gyro.y+=(r.alpha||0)*gain*sign;});this.gyroListening=true;}return true;
  }catch{return false;}
 }
 sample(dt){
  if(this.stickID===null||this.pointers.get(this.stickID)?.role!=='stick'){this.stickID=null;this.move.x=this.move.z=0;this.knob.style.transform='translate(-50%,-50%)';}
  for(const p of this.pointers.values())if(p.role==='jump'&&this.simple&&!p.held){p.age+=dt;if(p.age>.34){p.held=true;this.actions.crouch=true;}}
  for(const p of this.pointers.values())if(p.role==='swap'&&!p.held){p.age+=dt;if(p.age>=INSPECT_HOLD&&Math.hypot(p.x-p.ox,p.y-p.oy)<TAP_SLOP*3){p.held=true;this.actions.inspect=true;}}
  const f={...this.actions};this.actions=emptyInput();
  f.mx=this.move.x+(this.keys.has('KeyD')?1:0)-(this.keys.has('KeyA')?1:0);f.mz=this.move.z+(this.keys.has('KeyW')?1:0)-(this.keys.has('KeyS')?1:0);
  f.fire=!!(this.holds.fire||this.holds.mouseFire||f.firePressed);f.ads=!!this.isAiming();
  const aimGain=f.ads?this.settings.adsSensitivity*(this.scopeScale??1):1;
  f.lx=this.look.x+this.gyro.x*aimGain;f.ly=this.look.y+this.gyro.y*aimGain;this.look.x=this.look.y=this.gyro.x=this.gyro.y=0;
  f.sprint=this.sprintToggle||this.keys.has('ShiftLeft')||this.settings.autoSprint&&f.mz>.87;f.interact=!!(this.holds.interact||this.keys.has('KeyE'));
  f.repeatFire=this.simple&&!!this.holds.fire;f.autoReload=this.settings.autoReload!==false;
  this.controller.apply(f,dt,this.scopeScale??1,this.contextAvailable);
  f.sprint||=this.settings.autoSprint&&f.mz>.87;
  f.firePressed||=f.fire&&!this.previousFire;this.previousFire=f.fire;return f;
 }
}
