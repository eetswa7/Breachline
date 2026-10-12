import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,emptyInput} from '../dist/js/engine.js';
import {Weapon,WEAPONS} from '../dist/js/weapons.js';
import {weaponPose,inspectionPose,sightHeight} from '../dist/js/aim.js';

function player(id=0){return {weapon:new Weapon(id),vx:0,vz:0,yaw:0,pitch:0,ads:0,sprinting:false,switchLeft:0,visualKick:0};}
function game(){const g=new Game({map:14},{seed:681}),p=g.player;g.actors=[p];p.reset({x:0,y:0,z:27},0);g.events=[];g.rules.time=999;return g;}

test('every weapon inspection shows both sides and returns without changing its ammunition or action',()=>{
 for(const {id} of WEAPONS){
  const w=new Weapon(id),ammo=w.ammo,reserve=w.reserve,parts=inspectionPose(w),out={};
  assert.equal(parts.weight,0);assert(w.inspect());assert(!w.inspect(),'holding inspection cannot restart it');
  const duration=w.inspectTime;w.update(duration*.3);const first=inspectionPose(w,true,out);assert.equal(first,out);assert(first.weight>.99&&first.roll<-.5);
  w.update(duration*.43);const second=inspectionPose(w);assert(second.weight>.99&&second.roll>.2);
  w.update(duration);assert.equal(w.inspectLeft,0);assert.deepEqual(inspectionPose(w),parts);
  assert.equal(w.ammo,ammo);assert.equal(w.reserve,reserve);assert.equal(w.reloadLeft,0);assert.equal(w.shotSerial,0);
  w.inspect();w.reset();assert.equal(w.inspectLeft,0);
 }
});

test('inspection freezes during pause, declines during reload and cancels immediately for combat and traversal',()=>{
 const g=game(),p=g.player,w=p.weapon;
 g.update(1/60,{...emptyInput(),inspect:true});assert(w.inspectLeft>0);const left=w.inspectLeft;
 g.paused=true;g.update(1/30);assert.equal(w.inspectLeft,left);g.paused=false;
 for(const action of ['fire','ads','reload','swap','grenade','melee','interact']){
  const fresh=game(),wp=fresh.player.weapon;wp.ammo--;assert(wp.inspect());fresh.update(1/60,{...emptyInput(),[action]:true,firePressed:action==='fire'});assert.equal(wp.inspectLeft,0,action);
 }
 for(const state of ['sprinting','vault']){
  const fresh=game(),wp=fresh.player.weapon;assert(wp.inspect());
  if(state==='vault')fresh.player.vault={from:{x:0,y:0,z:27},to:{x:0,y:.6,z:26},time:0,duration:.5,kind:'vault'};
  fresh.update(1/60,state==='sprinting'?{...emptyInput(),mz:1,sprint:true}:emptyInput());assert.equal(wp.inspectLeft,0,state);
 }
 w.cancelInspection();w.ammo--;assert(w.reload());assert(!w.inspect());
});

test('cosmetic weapon motion leaves shooting directions, damage and gameplay recoil unchanged',()=>{
 const a=game(),b=game();weaponPose(a.player,0,true);weaponPose(b.player,0,false);
 for(let frame=1;frame<=90;frame++){
  const f={...emptyInput(),fire:true,firePressed:frame===1};a.update(1/60,f);b.update(1/60,f);
  weaponPose(a.player,a.time,true);weaponPose(b.player,b.time,false);
 }
 assert.equal(a.shots,b.shots);assert.equal(a.player.weapon.ammo,b.player.weapon.ammo);
 assert.equal(a.player.pitch,b.player.pitch);assert.equal(a.player.yaw,b.player.yaw);assert.equal(a.player.recoilPitch,b.player.recoilPitch);
 assert.deepEqual(a.events.filter(e=>e.type==='shot'),b.events.filter(e=>e.type==='shot'));
});

test('recoil springs peak after the impulse, remain bounded under automatic fire and settle smoothly',()=>{
 const p=player(),w=p.weapon;weaponPose(p,0);w.shotSerial=1;w.shotIndex=1;w.sinceShot=0;
 const first={...weaponPose(p,1/120)},peak={...weaponPose(p,1/30)};assert(peak.z>first.z+.005);assert(peak.pitch>first.pitch);
 let maxPush=0,maxPitch=0;
 for(let frame=5;frame<300;frame++){
  w.sinceShot+=1/120;if(frame%9===0){w.shotSerial++;w.shotIndex++;w.sinceShot=0;}
  const pose=weaponPose(p,frame/120);maxPush=Math.max(maxPush,pose.z+.49);maxPitch=Math.max(maxPitch,pose.pitch);
  assert(Object.values(pose).every(Number.isFinite));
 }
 assert(maxPush>.02&&maxPush<=.10);assert(maxPitch>.02&&maxPitch<=.11);
 for(let frame=300;frame<=540;frame++){w.sinceShot+=1/120;weaponPose(p,frame/120);}
 assert(Math.abs(p.viewModel.recoilZ)<1e-9);assert(Math.abs(p.viewModel.recoilPitch)<1e-9);
});

test('analytic recoil recovery matches 30, 60 and 120 Hz and heavy weapons have a slower response',()=>{
 function impulse(id,hz){const p=player(id);weaponPose(p,0);p.weapon.shotSerial=1;p.weapon.sinceShot=0;for(let frame=1;frame<=hz/5;frame++){p.weapon.sinceShot=frame/hz;weaponPose(p,frame/hz);}return p.viewModel;}
 const samples=[30,60,120].map(hz=>impulse(0,hz));
 for(const view of samples.slice(1)){assert(Math.abs(view.recoilZ-samples[0].recoilZ)<1e-12);assert(Math.abs(view.recoilPitch-samples[0].recoilPitch)<1e-12);}
 const pistol=player(10),heavy=player(9);weaponPose(pistol,0);weaponPose(heavy,0);
 for(let frame=1;frame<20;frame++){pistol.yaw=heavy.yaw=frame*.025;weaponPose(pistol,frame/60);weaponPose(heavy,frame/60);}
 pistol.yaw=heavy.yaw=.475;for(let frame=20;frame<26;frame++){weaponPose(pistol,frame/60);weaponPose(heavy,frame/60);}
 assert(Math.abs(heavy.viewModel.inertiaYaw)>Math.abs(pistol.viewModel.inertiaYaw)*1.3);
});

test('all optics retain exact fully aimed alignment through inertia, firing and inspection',()=>{
 for(const {id} of WEAPONS)for(const optic of [0,1,2,3,4,5,6]){
  const p=player(id);p.weapon=new Weapon(id,{optic});p.ads=1;weaponPose(p,0);p.weapon.inspect();
  for(let frame=1;frame<12;frame++){
   p.yaw+=.1;p.pitch+=.04;p.vx=3;p.weapon.shotSerial++;p.weapon.shotIndex++;p.weapon.sinceShot=0;p.weapon.update(1/60);
   const pose=weaponPose(p,frame/60);assert.equal(pose.x,0);assert.equal(pose.y,-sightHeight(p.weapon));assert.equal(pose.yaw,0);assert.equal(pose.pitch,0);assert.equal(pose.roll,0);
  }
 }
});

test('reduced motion clears inertial and rotational recoil while explicit inspection keeps a smaller arc',()=>{
 const p=player();weaponPose(p,0);p.yaw=.2;p.weapon.shotSerial=1;p.weapon.sinceShot=0;weaponPose(p,1/60);
 p.visualKick=.1;const reduced=weaponPose(p,2/60,false);assert.equal(reduced.yaw,0);assert.equal(reduced.pitch,0);assert.equal(reduced.roll,-.035);
 assert.equal(p.viewModel.inertiaX,0);assert.equal(p.viewModel.recoilZ,0);
 p.weapon.inspect();p.weapon.update(p.weapon.inspectTime*.3);
 const full=inspectionPose(p.weapon,true),small=inspectionPose(p.weapon,false);assert(Math.abs(small.roll)<Math.abs(full.roll));assert(small.weight>.99);
 const frozen={...weaponPose(p,3/60,false)};assert.deepEqual(weaponPose(p,3/60,false),frozen);
 const newWeapon=new Weapon(10);p.weapon=newWeapon;weaponPose(p,4/60);assert.equal(p.viewModel.recoilZ,0);assert.equal(p.viewModel.inertiaYaw,0);
});

test('blade attacks retain a visible deliberate stroke and recover without a firearm impulse',()=>{
 const g=game(),p=g.player;p.weapons[0]=new Weapon(12);const ready={...weaponPose(p,0)};assert(g.melee(p));
 const stroke={...weaponPose(p,1/120)};assert(stroke.z<ready.z-.08);assert(stroke.roll<ready.roll-.2);assert.equal(p.weapon.shotSerial,0);
 for(let frame=2;frame<120;frame++){g.update(1/120);weaponPose(p,frame/120);}
 assert(Math.abs(p.visualKick)<1e-7);assert(Math.abs(p.viewModel.recoilZ)<1e-12);
});
