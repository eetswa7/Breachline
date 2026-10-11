import test from 'node:test';
import assert from 'node:assert/strict';
import {Weapon,WEAPONS} from '../dist/js/weapons.js';
import {weaponDynamics,weaponPose,sightHeight} from '../dist/js/aim.js';

function actor(id=0,loadout={}){return{weapon:new Weapon(id,loadout),yaw:0,pitch:0,vx:0,vz:0,ads:0,crouched:false,sprinting:false,switchLeft:0,visualKick:0};}
function shotAt(fps){const p=actor(),s={};weaponDynamics(s,p,0);p.weapon.shotIndex++;for(let i=0;i<fps/10;i++)weaponDynamics(s,p,1/fps);return s.recoilSpring;}
test('analytic visual recoil agrees at 30/60/120 Hz and changes no aim or weapon simulation values',()=>{
 const values=[30,60,120].map(shotAt);assert(values[0]>.005);assert(Math.max(...values)-Math.min(...values)<1e-12);
 const p=actor(),s={};weaponDynamics(s,p,0);p.weapon.shotIndex=1;p.weapon.sinceShot=0;const before={yaw:p.yaw,pitch:p.pitch,ammo:p.weapon.ammo,cooldown:p.weapon.cooldown,recoil:p.weapon.recoil};
 for(let i=0;i<120;i++)weaponDynamics(s,p,1/120);
 assert.deepEqual({yaw:p.yaw,pitch:p.pitch,ammo:p.weapon.ammo,cooldown:p.weapon.cooldown,recoil:p.weapon.recoil},before);assert(Math.abs(s.recoilSpring)<1e-9);
});
test('angular weapon lag opposes turns, settles smoothly and scales with weapon handling',()=>{
 function turn(p){const s={};weaponDynamics(s,p,0);for(let i=0;i<30;i++){p.yaw+=.025;p.pitch+=.01;weaponDynamics(s,p,1/60);}const lag=s.inertiaYaw;for(let i=0;i<90;i++)weaponDynamics(s,p,1/60);assert(Math.abs(s.inertiaYaw)<1e-9);return lag;}
 const quick=turn(actor(0,{handling:8})),standard=turn(actor()),heavy=turn(actor(9));assert(quick<0&&standard<0&&heavy<0);assert(Math.abs(quick)<Math.abs(standard));assert(Math.abs(heavy)>Math.abs(standard));
});
test('all thirty recoil and inertia responses remain bounded through sustained fire, turn reversals and pause',()=>{
 for(const w of WEAPONS){const p=actor(w.id),s={};weaponDynamics(s,p,0);
  for(let frame=0;frame<600;frame++){if(frame%4===0)p.weapon.shotIndex++;p.yaw+=(frame%90<45?.11:-.11);p.pitch+=(frame%60<30?.06:-.06);weaponDynamics(s,p,1/60);
   for(const key of ['inertiaYaw','inertiaPitch','inertiaRoll','recoilSpring','recoilSpringVelocity'])assert(Number.isFinite(s[key]),w.name+' '+key);
   assert(Math.abs(s.inertiaYaw)<=.085);assert(Math.abs(s.inertiaPitch)<=.06);assert(Math.abs(s.inertiaRoll)<=.045);assert(s.recoilSpring>=-.015&&s.recoilSpring<=.23);
  }
  const before={...s};weaponDynamics(s,p,0);assert.deepEqual(s,before,w.name+' paused animation');
 }
});
test('full ADS retains exact sight alignment while visual kick responds along the barrel',()=>{
 const p=actor(0,{optic:1});p.ads=1;weaponPose(p,0);p.weapon.shotIndex++;
 const neutral=weaponPose(actor(0,{optic:1}),0),q={};let kicked=false;
 for(let i=1;i<50;i++){p.yaw+=.02;p.pitch+=.008;weaponPose(p,i/60,true,false,q);assert.equal(q.x,0);assert.equal(q.y,-sightHeight(p.weapon));assert.equal(q.yaw,0);assert.equal(q.pitch,0);assert.equal(q.roll,0);if(q.z>-.315)kicked=true;}
 assert(kicked);assert.equal(neutral.yaw,0);
});
test('motion off immediately clears optional inertia and recoil springs, while keeping basic firing feedback',()=>{
 const p=actor(),s={};weaponDynamics(s,p,0);p.weapon.shotIndex++;p.yaw=.08;weaponDynamics(s,p,1/60);assert(s.recoilSpring>0);weaponDynamics(s,p,1/60,false);
 for(const key of ['inertiaYaw','inertiaPitch','inertiaRoll','recoilSpring'])assert.equal(s[key],0);
 p.visualKick=.1;const q=weaponPose(p,0,false);assert.equal(q.yaw,0);assert.equal(q.roll,-.035);assert(q.z>-.49);
});

test('melee retains its immediate strike feedback without needing a gunshot index',()=>{
 for(const id of [0,12]){const p=actor(id);const rest=weaponPose(p,0,true);p.knifeCooldown=.65;p.visualKick=.2;const strike=weaponPose(p,1/60,true);assert(strike.z>rest.z+.08);assert(strike.pitch>rest.pitch+.04);assert.equal(p.weapon.shotIndex,0);}
});
