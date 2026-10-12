import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/js/engine.js';
import {Weapon,WEAPONS} from '../dist/js/weapons.js';
import {actorModel} from '../dist/js/geometry.js';
import {operatorFootCycle,operatorDeathPose} from '../dist/js/actor-pose.js';
import {operatorWeaponMount} from '../dist/js/operator-detail.js';
import {fixture} from './renderer-fixture.mjs';

const TAU=Math.PI*2;
function actor(){const g=new Game({}, {seed:904}),a=g.actors[1];a.reset({x:0,y:0,z:0},0);a.weapon.sinceShot=10;return {g,a};}
function settle(a,frames=120){for(let i=0;i<=frames;i++)actorModel(a,i/60);return frames/60;}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);

test('walking, crouch, ADS and running feet remain planted in world space during contact',()=>{
 for(const [speed,crouched,ads] of [[.2,false,0],[.5,false,0],[1.4,false,1],[2.15,true,0],[3.4,false,0],[6.1,false,0]]){
  const {a}=actor();a.vz=-speed;a.crouched=crouched;a.ads=ads;
  let time=settle(a);a.stride=.06*TAU;actorModel(a,time);
  const planted={...a.renderParts[4],z:a.z+a.renderParts[4].z};let frames=0,maxDrift=0;
  for(let i=0;i<6;i++){
   time+=1/60;a.z-=speed/60;actorModel(a,time);
   assert(operatorFootCycle(a.stride,a.operatorMotion.stance).contact,`${speed} fixture stays in contact`);
   const foot=a.renderParts[4];assert.equal(foot.y,a.renderBase[4].y,'the contact phase has no sinusoidal vertical slide');
   maxDrift=Math.max(maxDrift,distance(planted,{...foot,z:a.z+foot.z}));frames++;
  }
  assert(frames>=5);assert(maxDrift<.003,`${speed} m/s contact drift ${maxDrift}`);
 }
});

test('locomotion, stance, ADS and direction changes blend without frame-sized body jumps',()=>{
 const {a}=actor();let previous,largest=0;const x=a.x,y=a.y,z=a.z,yaw=a.yaw,pitch=a.pitch;
 for(let frame=0;frame<300;frame++){
  a.vz=frame<90?-6.1:frame<160?-2.15:frame<220?2.15:0;a.ads=frame>=90&&frame<220?1:0;a.crouched=frame>=110&&frame<220;
  const parts=actorModel(a,frame/60),positions=[4,5,6,7,10,18,19].map(i=>({...parts[i]}));
  if(previous)for(let i=0;i<positions.length;i++)largest=Math.max(largest,distance(previous[i],positions[i]));
  previous=positions;
 }
 assert(largest<.13,`largest per-frame body displacement ${largest}`);
 assert(a.operatorMotion.run<.001&&a.operatorMotion.aim<.001&&a.animDuck<.001);
 assert.deepEqual([a.x,a.y,a.z,a.yaw,a.pitch],[x,y,z,yaw,pitch]);
});

test('every equipped weapon keeps its grip target and reusable rig through ready, aim, crouch and reload',()=>{
 const {a}=actor();let time=0;
 for(const def of WEAPONS){
  a.weapons[0]=new Weapon(def.id);a.weapon.sinceShot=10;actorModel(a,time);
  const references=a.renderParts.slice(),motion=a.operatorMotion;
  for(const state of [{speed:6.1,ads:0,duck:false,pitch:0},{speed:1.4,ads:1,duck:true,pitch:.60},{speed:0,ads:0,duck:false,pitch:-.60,reload:true}]){
   a.vz=-state.speed;a.ads=state.ads;a.crouched=state.duck;a.pitch=state.pitch;
   a.weapon.reloadLeft=state.reload?a.weapon.reloadTime*.5:0;
   for(let frame=0;frame<30;frame++){time+=1/60;actorModel(a,time);}
   assert.equal(a.operatorMotion,motion);assert(a.renderParts.every((p,i)=>p===references[i]));
   const grip=a.operatorPose.right,hand=a.renderParts[19];assert(distance(grip,hand)<.018,`${def.name} right-hand grip contact`);
   const mount=operatorWeaponMount(a);for(const key of ['x','y','z','pitch','roll'])assert(Number.isFinite(mount[key]));
   for(const part of a.renderParts)for(const key of ['x','y','z','h','pitch','roll'])assert(Number.isFinite(part[key]??0));
  }
 }
});

test('hit recoil affects chest and bound equipment, then returns without accumulating drift',()=>{
 const {a}=actor();let time=settle(a);a.hitReact=.16;const parts=actorModel(a,time),chest=parts[7],gear=parts[8];
 assert(chest.pitch>.12&&Math.abs(chest.roll)>.04);assert(Math.abs(chest.pitch-gear.pitch)<1e-9,'armour shares the chest reaction');
 assert(Math.abs(parts[19].z-a.operatorPose.right.z)<.001,'the gripping hand follows the reacting weapon');
 a.hitReact=0;for(let i=0;i<120;i++){time+=1/60;actorModel(a,time);}
 assert(Math.abs(parts[7].pitch)<.001&&Math.abs(parts[7].roll)<.001);
 assert.equal(parts[7].z,a.renderBase[7].z);
});

test('death buckles, releases support grip, settles until respawn and resets presentation state',()=>{
 const {g,a}=actor();const r=fixture();g.actors=[g.player,a];g.player.reset({x:0,y:0,z:5},0);
 a.vz=-6.1;let time=settle(a);a.health=0;a.lastDamage=time;a.respawnLeft=3;a.hitReact=.16;
 const references=a.renderParts.slice();let held,relaxed;
 for(const age of [0,.12,.35,.65,.94,1.4,2.8]){
  a.respawnLeft=3-age;g.time=time+age;r.updateActors(g);
  assert([...r.actorBatches.values()].some(b=>b.used),'the corpse is visible through the respawn interval');
  if(age===0)held={...a.renderParts[18]};if(age===.65)relaxed={...a.renderParts[18]};
  const death=operatorDeathPose(a,g.time);assert(death.pitch>=0&&death.pitch<Math.PI/2);
 }
 assert(distance(held,relaxed)>.15,'support arm relaxes instead of keeping both hands rigidly attached');
 const resting=operatorDeathPose(a,time+1.4),later=operatorDeathPose(a,time+2.8);
 for(const key of ['pitch','roll','y','z'])assert.equal(resting[key],later[key]);
 assert.equal(a.operatorMotion.impactPitch,0,'the fatal impact fades even though dead actors no longer update hitReact');
 assert(Math.abs(operatorWeaponMount(a).pitch+resting.pitch)<.3,'the gun relaxes across the body instead of pointing vertically up');
 a.reset({x:0,y:0,z:0},Math.PI);actorModel(a,time+3);
 assert.equal(a.operatorMotion.run,0);assert.equal(a.animDuck,0);assert.equal(a.operatorMotion.torsoPitch,0);assert.equal(a.operatorMotion.death.pitch,0);
 assert(a.renderParts.every((p,i)=>p===references[i]),'spawn reuses the same authored components');
});

test('a new round resets a surviving crouched operator without requiring a rendered death',()=>{
 const {a}=actor();a.spawnProtection=0;a.crouched=true;a.vz=-2.15;const time=settle(a);
 assert(a.animDuck>.49);assert.equal(a.lastDamage,-100);
 a.reset({x:4,y:0,z:2},Math.PI/2);actorModel(a,time+1/60);
 assert.equal(a.animDuck,0);assert.equal(a.animSpeed,0);assert.equal(a.operatorMotion.torsoPitch,0);assert.equal(a.operatorMotion.turn,0);
});
