import test from 'node:test';
import assert from 'node:assert/strict';
import {Actor,Game,emptyInput} from '../dist/js/engine.js';
import {Weapon,WEAPONS} from '../dist/js/weapons.js';
import {weaponPose,sightHeight} from '../dist/js/aim.js';
import {weaponModel,animateWeaponParts} from '../dist/js/weapon-models.js';
import {beginInspection,inspectionPose,resetWeaponPresentation,updateWeaponPresentation,impulseWeaponRecoil} from '../dist/js/weapon-presentation.js';

function actor(id=0){const p=new Actor(0,0,0);p.weapons[0]=new Weapon(id,{optic:1});p.reset({x:0,y:0,z:0},0);return p;}
function course(){const g=new Game({map:14},{seed:817}),p=g.player;g.actors=[p];g.arena.blocks=[];g.arena.box(0,-.2,0,100,.4,100,'concrete',{ground:true});g.arena.bakeCollision();p.reset({x:0,y:0,z:0},0);return g;}
const zeroPose=()=>({x:0,y:0,z:0,yaw:0,pitch:0,roll:0});

test('every weapon has a finite two-sided inspection and returns to its attached ready rig',()=>{
 for(const def of WEAPONS){
  const p=actor(def.id),w=p.weapon,parts=weaponModel(w),ammo=w.ammo,reserve=w.reserve;
  assert(beginInspection(p),def.name);assert.deepEqual(inspectionPose(p),zeroPose());
  let positive=false,negative=false;
  for(let frame=0;frame<220;frame++){
   updateWeaponPresentation(p,1/60);const inspect=inspectionPose(p),pose=weaponPose(p,frame/60,true);
   positive||=inspect.roll>.1;negative||=inspect.roll<-.1;
   for(const value of Object.values(pose))assert(Number.isFinite(value),def.name);
   animateWeaponParts(parts,w,p,frame/60);
   for(const q of parts)for(const key of ['x','y','z','yaw','pitch','roll'])assert(Number.isFinite(q[key]),`${def.name} ${q.tag??'core'} ${key}`);
  }
  assert(positive&&negative,`${def.name} should show both authored angles`);
  assert.equal(p.inspection,null);assert.deepEqual(inspectionPose(p),zeroPose());
  assert.equal(w.ammo,ammo);assert.equal(w.reserve,reserve);assert.equal(w.reloadLeft,0);
  assert.deepEqual([p.yaw,p.pitch,p.x,p.y,p.z],[0,0,0,0,0]);
 }
});

test('fire, ADS, reload, switch, equipment and traversal preempt inspection in the same simulation step',()=>{
 const g=course(),p=g.player;
 for(const action of ['fire','firePressed','ads','reload','swap','grenade','melee','interact','jump','crouch']){
  p.reset({x:0,y:0,z:0},0);p.weapon.ammo=20;g.events=[];const before=p.weapon.ammo;
  assert(beginInspection(p));g.update(1/60,{...emptyInput(),[action]:true,...(action==='firePressed'?{fire:true}: {})});
  assert.equal(p.inspection,null,action);
  if(action==='fire'||action==='firePressed')assert.equal(p.weapon.ammo,before-1,'inspect must not delay the shot');
  if(action==='reload')assert(p.weapon.reloadLeft>0,'reload starts without an inspect delay');
  if(action==='swap'){assert.equal(p.slot,1);assert(p.switchLeft>0);assert.equal(p.weaponMotion.weapon,p.weapon);assert.equal(p.weaponMotion.z,0);}
  if(action==='ads')assert(p.ads>0,'ADS starts immediately');
 }
 p.reset({x:0,y:0,z:0},0);assert(beginInspection(p));g.update(1/60,{...emptyInput(),sprint:true,mz:1});assert.equal(p.inspection,null);assert(p.sprinting);
});

test('busy weapons reject inspection and a second tap cancels without consuming ammo',()=>{
 const p=actor(),w=p.weapon;
 for(const block of [()=>p.ads=1,()=>p.switchLeft=.2,()=>p.sprinting=true,()=>p.sliding=true,()=>p.vault={},()=>w.cooldown=.1,()=>w.sinceShot=.05,()=>p.health=0]){
  p.reset({x:0,y:0,z:0},0);block();assert.equal(beginInspection(p),false);
 }
 p.reset({x:0,y:0,z:0},0);w.ammo=4;w.reload();assert.equal(beginInspection(p),false);
 p.reset({x:0,y:0,z:0},0);const ammo=w.ammo;updateWeaponPresentation(p,1/60,{inspect:true});assert(p.inspection);
 updateWeaponPresentation(p,1/60,{inspect:true});assert.equal(p.inspection,null);assert.equal(w.ammo,ammo);
});

test('an empty inspected weapon starts automatic reload with no stale inspection HUD state',()=>{
 const g=course(),p=g.player;p.weapon.ammo=0;assert(beginInspection(p));g.update(1/60,{...emptyInput(),autoReload:true});
 assert(p.weapon.reloadLeft>0);assert.equal(p.inspection,null);assert.deepEqual(inspectionPose(p),zeroPose());
});

test('paused inspection freezes; external reload, death, replacement and respawn leave no stale pose',()=>{
 const g=course(),p=g.player;assert(beginInspection(p));g.update(.02);const time=p.inspection.time;
 g.paused=true;g.update(.02,{...emptyInput(),fire:true});assert.equal(p.inspection.time,time);g.paused=false;
 p.weapon.ammo=0;p.weapon.reload();assert.deepEqual(inspectionPose(p),zeroPose());updateWeaponPresentation(p,.02);assert.equal(p.inspection,null);
 p.reset({x:0,y:0,z:0},0);p.spawnProtection=0;assert(beginInspection(p));g.damage(p,120,null);assert.equal(p.inspection,null);assert.deepEqual(inspectionPose(p),zeroPose());
 p.reset({x:0,y:0,z:0},0);assert.equal(p.inspection,null);assert(beginInspection(p));p.weapons[0]=new Weapon(7);updateWeaponPresentation(p,.02);assert.equal(p.inspection,null);assert.equal(p.weaponMotion.weapon,p.weapon);
});

test('fully aimed fire preserves every optic sight line through recoil, turn inertia and movement',()=>{
 for(const def of WEAPONS)for(const optic of [0,1,2,3,4,5,6]){
  const p=actor(def.id);p.weapons[0]=new Weapon(def.id,{optic});resetWeaponPresentation(p);p.ads=1;p.vx=3;
  weaponPose(p,0);impulseWeaponRecoil(p,p.weapon,p.weapon.recoilFor(1,false,false));
  for(let frame=1;frame<12;frame++){
   p.yaw+=.03;p.pitch+=.02;updateWeaponPresentation(p,1/60);
   const pose=weaponPose(p,frame/60,true);
   assert.equal(pose.x,0);assert.equal(pose.y,-sightHeight(p.weapon));assert.equal(pose.yaw,0);assert.equal(pose.pitch,0);assert.equal(pose.roll,0);assert(Number.isFinite(pose.z));
  }
 }
});

test('recoil springs have frame-rate-independent recovery, rebound and bounded sustained impulses',()=>{
 const states=[];
 for(const fps of [30,60,120]){
  const p=actor(11);impulseWeaponRecoil(p,p.weapon,p.weapon.recoil);const before={...p.weaponMotion};updateWeaponPresentation(p,0);assert.deepEqual(p.weaponMotion,before);
  let max=0,rebound=false;
  for(let frame=0;frame<fps;frame++){updateWeaponPresentation(p,1/fps);max=Math.max(max,p.weaponMotion.z);rebound||=p.weaponMotion.z<0;}
  assert(max>.015);assert(rebound);assert(Math.abs(p.weaponMotion.z)<1e-6);states.push(p.weaponMotion);
 }
 for(const key of ['z','zVelocity','pitch','pitchVelocity','roll','rollVelocity'])assert(Math.abs(states[0][key]-states[2][key])<1e-10,key);
 for(const def of WEAPONS.filter(w=>w.id!==12)){
  const p=actor(def.id);for(let frame=0;frame<600;frame++){
   updateWeaponPresentation(p,1/60);if(frame%Math.max(1,Math.round(def.interval*60))===0)impulseWeaponRecoil(p,p.weapon,p.weapon.recoil);
   const s=p.weaponMotion;assert(Math.abs(s.z)<.11);assert(Math.abs(s.pitch)<.24);assert(Math.abs(s.roll)<.07);
  }
 }
});

test('recoil rendering retains ballistic climb and reduced-motion mode suppresses angular shake',()=>{
 const g=course(),p=g.player,r=p.weapon.recoilFor(0,false,true),ammo=p.weapon.ammo;
 assert(g.shoot(p));assert.equal(p.weapon.ammo,ammo-1);assert(Math.abs(p.pitch-r)<1e-12);const yaw=p.yaw,pitch=p.pitch;
 const enabled=weaponPose(p,0,true),calm=weaponPose(p,0,false);
 assert(enabled.pitch>calm.pitch);assert.equal(calm.pitch,0);assert.equal(calm.roll,-.035);assert(enabled.z>calm.z);
 for(let frame=1;frame<100;frame++)weaponPose(p,frame/60,true);
 assert.equal(p.yaw,yaw);assert.equal(p.pitch,pitch);assert.equal(p.weapon.ammo,ammo-1);
});

test('turn and acceleration inertia settle continuously without changing the authored ADS endpoint',()=>{
 const p=actor();weaponPose(p,0,true);
 p.yaw=.05;weaponPose(p,1/60,true);assert(Math.abs(p.viewModel.inertiaX)<.003,'first turn must integrate from ready instead of jumping to its target');
 for(let frame=2;frame<=30;frame++){p.yaw+=.02;p.pitch+=.004;p.vx=3;weaponPose(p,frame/60,true);}
 const turned=weaponPose(p,.51,true);assert(Math.abs(p.viewModel.inertiaYaw)>.015);assert(Math.abs(p.viewModel.inertiaX)>.005);
 const stopped=weaponPose(p,.52,true);assert(Math.abs(stopped.x-turned.x)<.003);
 const calm=weaponPose(p,.52,false);assert.equal(calm.yaw,0);assert.equal(calm.pitch,0);assert.equal(calm.roll,-.035);assert.equal(calm.x,.22);
 for(let frame=32;frame<180;frame++){p.vx=0;weaponPose(p,frame/60,true);}
 assert(Math.abs(p.viewModel.inertiaYaw)<1e-6);assert(Math.abs(p.viewModel.inertiaX)<1e-6);assert(Math.abs(p.viewModel.travelZ)<1e-6);
 p.ads=1;const aimed=weaponPose(p,3,true);assert.equal(aimed.x,0);assert.equal(aimed.y,-sightHeight(p.weapon));assert.equal(aimed.yaw,0);
});
