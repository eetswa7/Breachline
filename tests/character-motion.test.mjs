import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/js/engine.js';
import {MODES} from '../dist/js/modes.js';
import {Weapon,WEAPONS} from '../dist/js/weapons.js';
import {actorModel} from '../dist/js/geometry.js';
import {actorDeathProgress,transformOperatorPose} from '../dist/js/actor-pose.js';
import {operatorWeaponMount} from '../dist/js/operator-detail.js';
import {compose,angleDelta} from '../dist/js/math.js';

const end=(q,sign)=>{const r=new Float32Array(16);compose(r,q.x,q.y,q.z,1,1,1,q.yaw??0,q.pitch??0,q.roll??0);return {x:r[12]+r[4]*q.h/2*sign,y:r[13]+r[5]*q.h/2*sign,z:r[14]+r[6]*q.h/2*sign};};
const near=(a,b,limit=.00001)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<limit;
const step=(a,start,frames,callback=()=>{})=>{for(let f=1;f<=frames;f++){callback(f);actorModel(a,start+f/120);}};

test('stance has grounded heel/toe support, alternating swing and no knee separation in every direction',()=>{
 const g=new Game({}, {seed:141}),a=g.actors[1];a.reset({x:0,y:0,z:0},0);a.weapon.sinceShot=10;
 let grounded=0,swing=0;
 for(const [vx,vz]of [[0,-1.8],[0,-6.1],[3,0],[0,3]]){
  a.vx=vx;a.vz=vz;step(a,0,120);
  for(let f=0;f<120;f++){
   actorModel(a,1+f/120);
   for(let leg=0;leg<2;leg++){
    const foot=a.renderParts[4+leg],bottom=foot.y-Math.cos(foot.pitch)*foot.h/2-Math.abs(Math.sin(foot.pitch))*foot.d/2;
    assert(bottom>-.00001,'rotating heel/toe never sinks the boot through the ground');
    if(bottom<.00001)grounded++;else if(bottom>.035)swing++;
    assert(near(end(a.renderParts[leg],-1),end(a.renderParts[2+leg],1)), 'IK joins survive the whole cycle');
   }
  }
 }
 assert(grounded>250&&swing>100,'both prolonged support and readable swing were exercised');
});

test('heel and toe posing remain continuous at contact release and the cycle wrap',()=>{
 const a=new Game({}, {seed:141}).actors[1];a.reset({x:0,y:0,z:0},0);
 for(const speed of [1.8,6.1])for(const crouched of [false,true]){
  a.vz=-speed;a.crouched=crouched;step(a,0,120);
  for(const boundary of [a.operatorMotion.stance*Math.PI*2,Math.PI*2]){
   a.stride=boundary-.000001;actorModel(a,1);const before=a.renderParts.slice(4,6).map(p=>({...p}));
   a.stride=boundary+.000001;actorModel(a,1);
   for(let leg=0;leg<2;leg++){
    const p=a.renderParts[4+leg];assert(near(p,before[leg],.00001),'foot position has no contact-boundary pop');
    assert(Math.abs(angleDelta(before[leg].pitch,p.pitch))<.00001,'heel/toe rotation joins both sides of contact continuously');
   }
  }
 }
});

test('upper body, hand contacts and native gun share one transform through aiming, crouch, impact and collapse',()=>{
 const g=new Game({}, {seed:24}),a=g.actors[1],local=new Float32Array(16);a.reset({x:0,y:0,z:0},.8);
 let time=0;
 for(const def of WEAPONS){
  a.weapons[0]=new Weapon(def.id);a.vx=2;a.vz=-4;a.pitch=.4;a.crouched=true;a.hitReact=.1;
  step(a,time,60);time+=.5;
  const refs=a.renderParts.slice(),m=operatorWeaponMount(a),t=a.carriedTemplate;
  compose(local,m.x,m.y,m.z,1,1,1,m.yaw,m.pitch,m.roll);
  const grip={x:local[0]*t.grip.x+local[4]*t.grip.y+local[8]*t.grip.z+local[12],y:local[1]*t.grip.x+local[5]*t.grip.y+local[9]*t.grip.z+local[13],z:local[2]*t.grip.x+local[6]*t.grip.y+local[10]*t.grip.z+local[14]};
  assert(near(grip,a.renderParts[19],.035),`${def.name} trigger hand stays on its actual grip`);
  const support=t.support??t.grip,foreEnd={x:local[0]*support.x+local[4]*support.y+local[8]*support.z+local[12],y:local[1]*support.x+local[5]*support.y+local[9]*support.z+local[13],z:local[2]*support.x+local[6]*support.y+local[10]*support.z+local[14]};
  assert(near(foreEnd,a.renderParts[18],.035),`${def.name} support hand stays on its actual fore-end`);
  for(const [upper,fore,hand]of [[14,16,18],[15,17,19]]){
   assert(near(end(a.renderParts[upper],-1),end(a.renderParts[fore],1)),`${def.name} elbow remains joined`);
   assert(near(end(a.renderParts[fore],-1),a.renderParts[hand]),`${def.name} wrist remains joined`);
  }
  step(a,time,12);time+=.1;assert(a.renderParts.every((q,i)=>q===refs[i]),'poses reuse part objects');
 }
 a.health=0;a.lastDamage=time;const standing=a.renderParts[7].y;
 step(a,time,48);assert(a.renderParts[7].y<standing-.12,'collapse lowers the chest even from crouch');
 const q={x:.3,y:1,z:-.4,yaw:.3,pitch:.4,roll:-.2},before={...q};
 const m=a.operatorMotion,r=new Float32Array(16),p=new Float32Array(16);compose(r,q.x,q.y,q.z,1,1,1,q.yaw,q.pitch,q.roll);transformOperatorPose(a,q);compose(p,q.x,q.y,q.z,1,1,1,q.yaw,q.pitch,q.roll);
 for(const col of [0,4,8])for(let row=0;row<3;row++){
  const expected=m.matrix[row*3]*r[col]+m.matrix[row*3+1]*r[col+1]+m.matrix[row*3+2]*r[col+2];
  assert(Math.abs(p[col+row]-expected)<.000001,'combined rotations preserve the full part orientation');
 }
 assert.notDeepEqual(q,before);
});

test('crouch, travel direction, head aim and landing ease while simulation state and pause remain exact',()=>{
 const g=new Game({}, {seed:73}),a=g.actors[1];a.reset({x:0,y:0,z:0},0);actorModel(a,0);
 const simulation=[a.x,a.y,a.z,a.yaw];a.vz=-3;a.crouched=true;a.pitch=.6;actorModel(a,1/120);
 assert(a.animDuck>0&&a.animDuck<.08);assert(a.operatorMotion.aimPitch>0&&a.operatorMotion.aimPitch<.1);
 step(a,1/120,120);assert(a.animDuck>.499&&a.operatorMotion.forward>2.99&&a.operatorMotion.aimPitch>.599);
 a.vz=3;actorModel(a,122/120);assert(a.operatorMotion.forward>0,'a reversal blends through the previous travel heading');
 const paused=a.renderParts.map(q=>[q.x,q.y,q.z,q.pitch,q.roll,q.yaw]),phase=a.stride;
 actorModel(a,122/120);assert.equal(a.stride,phase);assert.deepEqual(a.renderParts.map(q=>[q.x,q.y,q.z,q.pitch,q.roll,q.yaw]),paused);
 a.grounded=false;a.vy=-6;actorModel(a,123/120);a.grounded=true;a.vy=0;actorModel(a,124/120);assert(a.operatorMotion.landing>.04);
 step(a,124/120,120);assert(a.operatorMotion.landing<.00001);
 assert.deepEqual([a.x,a.y,a.z,a.yaw],simulation);assert.equal(a.pitch,.6);
 a.health=0;a.lastDamage=3;actorModel(a,3.3);a.reset({x:0,y:0,z:0},0);actorModel(a,3.4);
 assert.equal(a.operatorMotion.death,0);assert.equal(a.operatorMotion.hit,0);assert.equal(a.animDuck,0,'respawn clears the animation stance');
});

test('death collapse progresses in every mode, including modes without a respawn timer',()=>{
 for(const mode of MODES){
  const g=new Game({mode:mode.id}, {seed:22}),a=g.actors[4];g.time=2;a.spawnProtection=0;
  actorModel(a,g.time);g.damage(a,120,g.player);assert(a.dead,mode.id);
  const before=a.renderParts[7].y;for(let f=0;f<30;f++)g.update(1/120);actorModel(a,g.time);
  assert(actorDeathProgress(a,g.time)>=.49,mode.id);assert(a.renderParts[7].y<before-.18,mode.id);
  if(!g.rules.respawns)assert.equal(a.respawnLeft,3,'no timer decrement is required');
  assert.equal(actorDeathProgress(a,2.5),1,'same half-second render lifetime');
 }
 const fallback={dead:true,respawnLeft:2.8,lastDamage:-100};assert(Math.abs(actorDeathProgress(fallback,99)-.4)<.00001);
});
