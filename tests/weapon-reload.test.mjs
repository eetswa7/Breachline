import test from 'node:test';
import assert from 'node:assert/strict';
import {Weapon,WEAPONS} from '../dist/js/weapons.js';
import {Game,emptyInput} from '../dist/js/engine.js';
import {weaponModel,animateWeaponParts} from '../dist/js/weapon-models.js';
import {compose} from '../dist/js/math.js';
import {Matrix4} from '../dist/vendor/three.module.min.js';

const poseKeys=['x','y','z','yaw','pitch','roll'];
function at(id,phase,empty=true,loadout={}){
 const w=new Weapon(id,loadout);w.ammo=empty?0:w.capacity-1;assert(w.reload());
 const parts=weaponModel(w);w.reloadLeft=w.reloadTime*(1-phase);animateWeaponParts(parts,w,{},0);
 return {w,parts,rig:parts.reloadRig,hand:parts[parts.reloadRig.hand.anchor]};
}
function surfaceGap(hand,component){
 const matrix=compose(new Float64Array(16),0,0,0,1,1,1,component.yaw,component.pitch,component.roll);
 const dx=hand.x-component.x,dy=hand.y-component.y,dz=hand.z-component.z;
 const x=matrix[0]*dx+matrix[1]*dy+matrix[2]*dz,y=matrix[4]*dx+matrix[5]*dy+matrix[6]*dz,z=matrix[8]*dx+matrix[9]*dy+matrix[10]*dz;
 return Math.hypot(Math.max(0,Math.abs(x)-component.w/2),Math.max(0,Math.abs(y)-component.h/2),Math.max(0,Math.abs(z)-component.d/2));
}

test('loading palms stay within glove contact of each real travelling magazine and attachment',()=>{
 for(const {id,shellReload,revolver,kind} of WEAPONS){
  if(shellReload||revolver||kind==='MELEE')continue;
  for(const handling of [0,1,4])for(const magazine of [0,2,3])for(const phase of [.40,.55,.70]){
   const {parts,rig,hand}=at(id,phase,true,{handling,magazine});
   // Covers rear bullpup wells, wide belt boxes/drums and the upper PDW well.
   if(rig.contact.operation!=='magazine')continue;
   assert(surfaceGap(hand,parts[rig.magazine.anchor])<.042,`${id}/${handling}/${magazine} at ${phase}: hand misses magazine`);
  }
 }
 const rifle=at(0,.4),bullpup=at(2,.4),pistol=at(10,.4),top=at(4,.4);
 assert(rifle.hand.y<-.35&&bullpup.hand.z>.15,'hands follow the actual lower and rear wells');
 assert(pistol.hand.y<-.4,'pistol hand reaches the extracted baseplate');
 assert(top.hand.y>.24,'top-loading hand reaches above the receiver');
});

test('empty reloads reach the actual charging action while tactical reloads leave it closed',()=>{
 for(const id of [0,2,4,7,9,10,11,19,24,27,29]){
  const empty=at(id,.89),tactical=at(id,.89,false),q=empty.parts[empty.rig.action];
  assert(['bolt','slide'].includes(empty.rig.contact.operation),`${id}: no empty action contact`);
  assert(surfaceGap(empty.hand,q)<.045,`${id}: action is outside glove reach`);
  assert.equal(empty.rig.contact.weight,1);assert.equal(tactical.rig.contact.operation,'magazine');
  const action=tactical.parts[tactical.rig.action];assert.equal(action.z,action.baseZ,`${id}: tactical reload cycles action`);
 }
 const pistol=at(10,.89),released=at(10,.98);
 assert(pistol.parts[pistol.rig.slide.anchor].z>pistol.parts[pistol.rig.slide.anchor].baseZ+.03);
 assert.equal(released.parts[released.rig.slide.anchor].z,released.parts[released.rig.slide.anchor].baseZ);
});

test('individual shells, revolver chambers and belt covers receive distinct hand contacts',()=>{
 for(const id of [5,18]){
  const retrieve=at(id,.2),feed=at(id,.65),late=at(id,.89),a=retrieve.parts[retrieve.rig.shell.anchor],b=feed.parts[feed.rig.shell.anchor];
  assert.equal(feed.rig.contact.operation,'shell');assert(surfaceGap(feed.hand,b)<.04);
  assert(b.y>a.y+.07&&b.z<a.z-.04,'shell enters the underside loading port');
  assert(!b.hidden);assert(late.parts[late.rig.shell.anchor].hidden,'seated shell does not remain in the hand');
 }
 const revolver=at(22,.4),cylinder=revolver.parts[revolver.rig.cylinder.anchor];
 assert(cylinder.x<-.08);assert.equal(revolver.rig.contact.operation,'cylinder');assert(surfaceGap(revolver.hand,cylinder)<.05);
 for(const id of [9,27]){
  assert.equal(at(id,.16).rig.contact.operation,'lid');assert.equal(at(id,.4).rig.contact.operation,'magazine');
  assert.equal(at(id,.76).rig.contact.operation,'lid');assert.equal(at(id,.89).rig.contact.operation,'bolt');
 }
});

test('native hand pivots and fallback fingers/sleeves retain one coherent rigid transform',()=>{
 for(const id of [0,2,4,5,9,10,18,20,22])for(const phase of [.4,.76,.89]){
  const {parts,rig,hand}=at(id,phase),base=parts[rig.hand.anchor];
  for(const {index} of rig.hand.members){
   const q=parts[index],before=Math.hypot(q.baseX-base.baseX,q.baseY-base.baseY,q.baseZ-base.baseZ),after=Math.hypot(q.x-hand.x,q.y-hand.y,q.z-hand.z);
   assert(Math.abs(before-after)<1e-12,`${id}: glove or cuff separates at ${phase}`);
   const matrix=compose(new Float64Array(16),0,0,0,1,1,1,q.yaw,q.pitch,q.roll);
   assert([...matrix].every(Number.isFinite));
  }
  for(const group of [rig.hand,rig.magazine,rig.cylinder].filter(Boolean)){
   const anchor=parts[group.anchor],matrix=(q,neutral)=>new Matrix4().fromArray(compose(new Float64Array(16),q[neutral?'baseX':'x'],q[neutral?'baseY':'y'],q[neutral?'baseZ':'z'],q.w,q.h,q.d,q[neutral?'baseYaw':'yaw'],q[neutral?'basePitch':'pitch'],q[neutral?'baseRoll':'roll']));
   const change=matrix(anchor,false).multiply(matrix(anchor,true).invert());
   for(const {index} of group.members){
    const expected=change.clone().multiply(matrix(parts[index],true)),actual=matrix(parts[index],false);
    assert(expected.elements.every((value,i)=>Math.abs(value-actual.elements[i])<1e-10),`${id}: native pivot and fallback member ${index} disagree`);
   }
  }
 }
});

test('all thirty cached rigs reset exactly and animation never edits gameplay or attachment contracts',()=>{
 for(const {id} of WEAPONS)for(const handling of [0,1,4,8])for(const magazine of [0,2,3]){
  const w=new Weapon(id,{optic:3,barrel:1,handling,magazine}),parts=weaponModel(w),refs=parts.slice(),rig=parts.reloadRig,contact=rig.contact;
  const original=parts.map(q=>poseKeys.map(k=>q[k])),muzzle={...parts.muzzle};w.ammo=0;w.reload();
  for(const phase of [.01,.10,.18,.40,.55,.70,.76,.89,.98]){
   w.reloadLeft=w.reloadTime*(1-phase);
   const state=[w.ammo,w.reserve,w.reloadLeft,w.reloadTime,w.capacity,w.shotSerial,w.inspectLeft];
   animateWeaponParts(parts,w,{},phase);
   assert.deepEqual([w.ammo,w.reserve,w.reloadLeft,w.reloadTime,w.capacity,w.shotSerial,w.inspectLeft],state);
   assert.equal(parts.reloadRig,rig);assert.equal(rig.contact,contact);assert.deepEqual(parts.muzzle,muzzle);
   for(let i=0;i<parts.length;i++){assert.equal(parts[i],refs[i]);assert(poseKeys.every(k=>Number.isFinite(parts[i][k])));}
  }
  w.reset();animateWeaponParts(parts,w,{},3);assert.deepEqual(parts.map(q=>poseKeys.map(k=>q[k])),original,`${id}: incomplete reset`);
 }
});

test('reload choreography follows paused simulation and a loaded shell still fires immediately',()=>{
 const g=new Game({map:0},{seed:623}),p=g.player;g.actors=[p];p.weapons[0]=new Weapon(5);p.slot=0;p.weapon.ammo=2;
 const w=p.weapon,parts=weaponModel(w);assert(w.inspect());g.update(1/120,{...emptyInput(),reload:true});assert.equal(w.inspectLeft,0);
 g.update(.2);animateWeaponParts(parts,w,p,g.time);const before=parts.map(q=>poseKeys.map(k=>q[k])),left=w.reloadLeft;
 g.paused=true;g.update(.1);animateWeaponParts(parts,w,p,g.time);assert.equal(w.reloadLeft,left);assert.deepEqual(parts.map(q=>poseKeys.map(k=>q[k])),before);
 g.paused=false;g.update(1/120,{...emptyInput(),fire:true,firePressed:true});animateWeaponParts(parts,w,p,g.time);
 assert.equal(w.reloadLeft,0);assert.equal(w.ammo,1);assert.equal(parts.reloadRig.contact.operation,'ready');assert(parts[parts.reloadRig.shell.anchor].hidden);
});
