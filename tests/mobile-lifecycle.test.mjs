import test from 'node:test';
import assert from 'node:assert/strict';
import {Application} from '../dist/js/main.js';
import {FramePacer} from '../dist/js/frame-pacer.js';
import {Game,emptyInput} from '../dist/js/engine.js';
import {Weapon,defaultLoadout} from '../dist/js/weapons.js';

function environment(){
 const names=['document','navigator','requestAnimationFrame'],saved=names.map(n=>Object.getOwnPropertyDescriptor(globalThis,n));
 const nodes=new Map(),classes=()=>({add(){},remove(){},toggle(){}});
 const doc={hidden:false,body:{classList:classes()},exitPointerLock(){},getElementById(id){if(!nodes.has(id))nodes.set(id,{classList:classes()});return nodes.get(id);}};
 Object.defineProperty(globalThis,'document',{configurable:true,value:doc});
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{}});
 Object.defineProperty(globalThis,'requestAnimationFrame',{configurable:true,writable:true,value:fn=>{fn(100);return 0;}});
 return{doc,restore(){names.forEach((n,i)=>{if(saved[i])Object.defineProperty(globalThis,n,saved[i]);else delete globalThis[n];});}};
}
function fixture(){
 const a=Object.create(Application.prototype),calls={play:0,pause:0,menu:0,toasts:[],audioPause:0};
 Object.assign(a,{store:{data:{loadout:defaultLoadout(),settings:{frameRate:60,gyro:false}}},config:{mode:'tdm',map:0},playing:false,starting:false,assetsFailed:false,isTouch:true,wakeLock:null,last:0,framePacer:new FramePacer(),accumulator:0,pending:emptyInput(),controllerHUD:false,
  renderer:{ready:Promise.resolve(),setArena(){},prepareMatch:async()=>{},events(){}},audio:{start:async()=>{},pause(){calls.audioPause++;},events(){}},input:{active:true,reset(){},gyroListening:false},
  ui:{closeModal(){},play(){calls.play++;},pause(){calls.pause++;},menu(){calls.menu++;},toast(s){calls.toasts.push(s);},events(){},update(){},updateIdentities(){},controllerMenu(){}},game:{paused:false,rules:{phase:'playing'}}});
 return{app:a,calls};
}
function defer(){let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};}

test('deployment holds controls until preparation finishes and ignores duplicate starts',async()=>{
 const env=environment();try{
  const {app,calls}=fixture(),gate=defer(),entered=defer();let prepares=0;
  app.renderer.prepareMatch=async()=>{prepares++;entered.resolve();await gate.promise;};
  const started=app.start();await entered.promise;assert(app.starting);assert(!app.input.active&&!app.playing);await app.start();assert.equal(prepares,1);
  gate.resolve();await started;assert(app.playing&&app.input.active&&!app.starting);assert.equal(calls.play,1);assert.equal(app.game.time,0);
 }finally{env.restore();}
});
test('backgrounding during preparation deploys into a paused match without a screen lock',async()=>{
 const env=environment();try{
  const {app,calls}=fixture(),gate=defer(),entered=defer();let locks=0;
  navigator.wakeLock={request(){locks++;return Promise.resolve({release(){}});}};
  app.renderer.prepareMatch=async()=>{entered.resolve();await gate.promise;};const started=app.start();await entered.promise;env.doc.hidden=true;gate.resolve();await started;
  assert(app.playing&&app.game.paused&&!app.input.active);assert.equal(calls.pause,1);assert.equal(calls.audioPause,1);assert.equal(locks,0);assert(!app.starting);
 }finally{env.restore();}
});
test('failed or interrupted preparation returns to the menu and releases the previous lock',async()=>{
 const env=environment();try{
  for(const failure of ['rejection','context loss']){
   const {app,calls}=fixture();let released=0;app.wakeLock={release(){released++;}};
   app.renderer.prepareMatch=async()=>{if(failure==='rejection')throw new Error('Shader warmup failed');app.renderer.lost=true;};await app.start();
   assert(!app.playing&&!app.input.active&&!app.starting);assert(app.game.paused);assert.equal(calls.menu,1);assert.equal(released,1);assert.equal(app.wakeLock,null);assert(calls.toasts[0].includes('Match could not start'));
  }
 }finally{env.restore();}
});
test('a late screen-lock grant after returning to the menu releases itself',async()=>{
 const env=environment();try{
  const {app}=fixture(),lock=defer();let released=0;navigator.wakeLock={request:()=>lock.promise};await app.start();app.toMenu();
  lock.resolve({release(){released++;}});await Promise.resolve();assert.equal(released,1);assert.equal(app.wakeLock,null);assert(!app.playing);
 }finally{env.restore();}
});
test('the application keeps its 60 Hz simulation and single-use input edges at either render cap',()=>{
 const env=environment();try{
  globalThis.requestAnimationFrame=()=>0;
  for(const refresh of [60,90,120])for(const cap of [30,60]){
   const {app}=fixture();let steps=0,jumps=0,look=0,renders=0,samples=0;
   app.playing=true;app.store.data.settings.frameRate=cap;
   app.game={paused:false,time:0,events:[],player:{crouched:false,weapon:new Weapon(0),ads:0},actors:[],eye:()=>({x:0,y:1.66,z:0}),rules:{phase:'playing'},update(dt,input){assert.equal(dt,1/60);steps++;this.time+=dt;jumps+=Number(input.jump);look+=input.lx;}};
   app.input.controller={poll(){},connected:false,lost:false,edges:[]};app.input.sample=dt=>({...emptyInput(),mx:.5,lx:dt*.2,jump:++samples===1});
   app.renderer.render=()=>renders++;app.renderer.recordFrame=()=>{};
   for(let i=0;i<refresh*5;i++)app.frame(1000+i*1000/refresh);
   assert(Math.abs(steps-300)<=2,`${refresh} Hz / ${cap} FPS: ${steps} simulation steps`);assert.equal(jumps,1);assert(Math.abs(look-1)<.01);
   assert(Math.abs(renders-cap*5)<=1);
  }
 }finally{env.restore();}
});


function inspectionApplication(cap){
 const {app}=fixture(),game=new Game({map:14},{seed:619}),p=game.player;
 game.actors=[p];p.reset({x:0,y:0,z:27},0);game.rules.time=999;game.events=[];
 app.playing=true;app.isTouch=false;app.store.data.settings.frameRate=cap;app.game=game;
 app.input.controller={poll(){},connected:false,lost:false,edges:[]};
 app.renderer.render=()=>true;app.renderer.recordFrame=()=>{};
 const delivered=[],update=game.update.bind(game);let requests=0,samples=0;
 const inspect=p.weapon.inspect.bind(p.weapon);p.weapon.inspect=()=>{requests++;return inspect();};
 game.update=(dt,input)=>{delivered.push({...input});update(dt,input);};
 app.input.sample=()=>({...emptyInput(),inspect:++samples===2});
 return {app,game,delivered,requests:()=>requests};
}

test('application frame forwarding delivers an inspection edge once at either cap and it completes normally',()=>{
 const env=environment();try{
  globalThis.requestAnimationFrame=()=>0;
  for(const refresh of [60,90,120])for(const cap of [30,60]){
   const {app,game,delivered,requests}=inspectionApplication(cap);
   for(let frame=0;frame<refresh*5;frame++)app.frame(1000+frame*1000/refresh);
   assert.equal(delivered.filter(input=>input.inspect).length,1,`${refresh} Hz / ${cap} FPS must forward inspection once`);
   assert.equal(requests(),1,'the real weapon inspection must start through Application.frame');
   assert.equal(game.player.weapon.inspectLeft,0,'the inspection must finish without an edge replay');
   assert.equal(game.player.weapon.ammo,game.player.weapon.capacity);
  }
 }finally{env.restore();}
});

test('application pending inspection survives frames without a simulation step and clears after first catch-up step',()=>{
 const env=environment();try{
  globalThis.requestAnimationFrame=()=>0;
  for(const cap of [30,60]){
   const {app,game,delivered,requests}=inspectionApplication(cap);
   // Accept short displayed frames deliberately to exercise the accumulator's
   // pending-edge path, independently of the selected rendering deadline.
   app.framePacer={reset(){},accept:()=>true};
   app.frame(1000);assert.equal(delivered.length,1);
   app.frame(1004);app.frame(1008);assert.equal(delivered.length,1);
   assert.equal(app.pending.inspect,true,'inspection must remain queued before a simulation tick');
   app.frame(1080);assert(delivered.length>=5,'a long frame must catch up several simulation ticks');
   assert.equal(delivered.filter(input=>input.inspect).length,1);assert.equal(requests(),1);assert(game.player.weapon.inspectLeft>0);
   assert.equal(app.pending.inspect,false,'the first catch-up step must consume the edge');
   app.frame(1147);assert.equal(delivered.filter(input=>input.inspect).length,1);
   app.pending.inspect=true;app.pause();assert.equal(app.pending.inspect,false,'pause must clear a queued inspection');
  }
 }finally{env.restore();}
});
