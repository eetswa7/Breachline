import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,emptyInput} from '../dist/js/engine.js';
import {Weapon,WEAPONS} from '../dist/js/weapons.js';
import {weaponPose,sightHeight} from '../dist/js/aim.js';
import {ControllerInput} from '../dist/js/gamepad.js';

function fixture(id=0){
 const g=new Game({map:0,mode:'tdm'},{seed:713});g.actors=[g.player];g.arena.blocks=[{x:0,y:-.2,z:0,w:200,h:.4,d:200,ground:true,surface:'concrete'}];
 const p=g.player;p.reset({x:0,y:0,z:0},0);p.weapons[0]=new Weapon(id);p.spawnProtection=0;
 const step=input=>g.update(1/60,{...emptyInput(),...input});return{g,p,step};
}
test('all thirty live weapon rigs inspect both side and top, then restore without inventory changes',()=>{
 for(const w of WEAPONS){
  const {g,p,step}=fixture(w.id),ammo=p.weapon.ammo,reserve=p.weapon.reserve;step({inspect:true});assert(p.inspection,w.name);
  const duration=p.inspection.duration,pose={};let side,top,maxJump=0,previous;
  for(let i=0;i<Math.ceil(duration*60)+3;i++){
   const q={...weaponPose(p,g.time,false,false,pose)};
   for(const key of ['x','y','z','yaw','pitch','roll','scale'])assert(Number.isFinite(q[key]),w.name+' '+key);
   if(previous)maxJump=Math.max(maxJump,...['x','y','z','yaw','pitch','roll'].map(k=>Math.abs(previous[k]-q[k])));
   if(p.inspection){const t=p.inspection.elapsed/duration;if(t>.3&&t<.4)side=q;if(t>.65&&t<.7)top=q;}
   previous=q;step({});
  }
  assert(side.yaw>.75&&side.roll<-.25,w.name+' side view');assert(top.pitch<-.15&&top.roll>.20,w.name+' action view');
  assert(maxJump<.045,w.name+' smooth timeline');assert.equal(p.inspection,null);assert.equal(p.weapon.ammo,ammo);assert.equal(p.weapon.reserve,reserve);assert.equal(g.shots,0);
 }
});
test('combat, aim, sprint, reload, swap and equipment interrupt inspection in the same simulation step',()=>{
 for(const command of [{fire:true,firePressed:true},{ads:true},{sprint:true,mz:1},{reload:true},{swap:true},{grenade:true},{melee:true},{jump:true},{interact:true}]){
  const {p,step,g}=fixture();p.weapon.ammo--;step({inspect:true});for(let i=0;i<40;i++)step({});assert(p.inspection);
  const ammo=p.weapon.ammo;step(command);assert.equal(p.inspection,null,JSON.stringify(command));
  if(command.fire)assert.equal(p.weapon.ammo,ammo-1,'inspection never delays the shot');
  if(command.ads)assert(p.ads>0,'ADS responds immediately');if(command.reload)assert(p.weapon.reloadLeft>0);if(command.swap)assert.equal(p.slot,1);if(command.grenade)assert.equal(g.grenades.length,1);
 }
});
test('a second inspection tap cancels, walking and looking stay live, pause freezes and damage cancels',()=>{
 const {g,p,step}=fixture();step({inspect:true});step({inspect:true});assert.equal(p.inspection,null);
 step({inspect:true});step({mx:1,lx:.08});assert(p.inspection&&p.x>0);assert.equal(p.yaw,.08);
 const elapsed=p.inspection.elapsed;g.paused=true;step({});assert.equal(p.inspection.elapsed,elapsed);g.paused=false;
 g.damage(p,5,null);assert.equal(p.inspection,null);step({inspect:true});assert(p.inspection);g.spawn(p);assert.equal(p.inspection,null);
 step({inspect:true});g.rules.finish(0);step({});assert.equal(p.inspection,null);
});
test('busy states reject inspection and auto reload keeps its original priority',()=>{
 for(const state of ['reload','switch','burst','air','vault','ads']){
  const {p,step}=fixture();
  if(state==='reload'){p.weapon.ammo--;p.weapon.reload();}if(state==='switch')p.switchLeft=.2;if(state==='burst')p.weapon.burstRemaining=2;
  if(state==='air'){p.grounded=false;p.y=1;}if(state==='vault')p.vault={time:0,duration:.4,from:{x:0,y:0,z:0},to:{x:0,y:.5,z:-1},arc:.2};if(state==='ads')p.ads=1;
  step({inspect:true});assert.equal(p.inspection,null,state);
 }
 const {p,step}=fixture();p.weapon.ammo=0;step({inspect:true,autoReload:true});assert.equal(p.inspection,null);assert(p.weapon.reloadLeft>0);
});
test('after cancellation full ADS sights remain centred and inspection never moves the camera',()=>{
 const {g,p,step}=fixture();step({inspect:true});for(let i=0;i<40;i++)step({});step({ads:true});
 for(let i=0;i<90;i++)step({ads:true,mx:.5,lx:.01});p.ads=1;
 const q=weaponPose(p,g.time,true);assert.equal(q.x,0);assert.equal(q.y,-sightHeight(p.weapon));assert.equal(q.roll,0);assert.equal(q.yaw,0);
 assert.equal(p.pitch,0);assert(p.yaw>.8);
});
test('controller D-pad down is an inspection edge and neutral rearming still applies',()=>{
 const pad={index:0,id:'standard',connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false}))},controller=new ControllerInput({});
 controller.poll(()=>[pad]);pad.buttons[13].pressed=true;controller.poll(()=>[pad]);let f=emptyInput();controller.apply(f,1/60);assert(f.inspect);
 controller.poll(()=>[pad]);f=emptyInput();controller.apply(f,1/60);assert(!f.inspect);controller.suspend();pad.buttons[13].pressed=false;controller.poll(()=>[pad]);pad.buttons[13].pressed=true;controller.poll(()=>[pad]);f=emptyInput();controller.apply(f,1/60);assert(f.inspect);
});
