import test from 'node:test';
import assert from 'node:assert/strict';
import {weaponModel,animateWeaponParts,muzzlePosition} from '../dist/js/weapon-models.js';
import {WEAPONS} from '../dist/js/weapons.js';
const weapon=(id,optic=1,barrel=0,grip=0)=>({def:WEAPONS[id],optic,barrel,grip,reloadTime:WEAPONS[id].reload,reloadLeft:0,sinceShot:10});
test('every arsenal entry builds a distinct mobile-sized view model with finite transforms',()=>{
 const signatures=new Set();
 for(let id=0;id<WEAPONS.length;id++)for(const optic of [0,1,2,3]){
  const w=weapon(id,optic),parts=weaponModel(w);assert(parts.length>20&&parts.length<200,`${id}: ${parts.length} parts`);
  for(const q of parts){for(const k of ['x','y','z','w','h','d','yaw','pitch','roll'])assert(Number.isFinite(q[k]),`${id}.${k}`);assert(q.w>0&&q.h>0&&q.d>0);}
  if(optic===1)signatures.add(JSON.stringify(parts.map(q=>[q.x,q.y,q.z,q.w,q.h,q.d])));
 }
 assert.equal(signatures.size,WEAPONS.length);
});
test('all attachment combinations animate cached arrays without drifting or replacing parts',()=>{
 for(let id=0;id<WEAPONS.length;id++)for(const grip of [0,1,2,4]){
  const w=weapon(id,1,1,grip),parts=weaponModel(w),refs=parts.slice(),base=parts.map(q=>[q.x,q.y,q.z,q.pitch,q.roll]);
  for(let i=0;i<120;i++){w.reloadLeft=w.reloadTime*(1-i/120);w.sinceShot=i/120;assert.equal(animateWeaponParts(parts,w,{},i/60),parts);for(let j=0;j<parts.length;j++){assert.equal(parts[j],refs[j]);assert(Number.isFinite(parts[j].y));}}
  w.reloadLeft=0;w.sinceShot=10;animateWeaponParts(parts,w,{},5);assert.deepEqual(parts.map(q=>[q.x,q.y,q.z,q.pitch,q.roll]),base);
 }
});
test('muzzles follow real barrel tips and suppressors extend the origin',()=>{
 for(let id=0;id<WEAPONS.length;id++){if(id===12)continue;const a=muzzlePosition(weapon(id)),s=muzzlePosition(weapon(id,1,1));assert(s.z<a.z-.1);assert.equal(a.x,0);assert(a.z<-.15);assert(a.y>0);}
});
test('telescopic, solid and skeleton stocks enter their actual receiver rear',()=>{
 const stocked=[0,1,5,6,7,8,9,13,14,15,16,17,18,19,20,21,25,27,28];
 for(const id of stocked){
  const p=weaponModel(weapon(id)),core=p.slice(0,p.coreCount);
  const receiver=core.find(q=>q.x===0&&q.y===.034&&q.h===.092),rear=receiver.z+receiver.d/2;
  const beam=core.find(q=>q.x===0&&(
   q.mesh==='cylinder'&&q.y===.026&&q.w===.035||
   q.y===-.009&&q.w===.072&&q.h===.079||
   q.y===.027&&q.w===.037&&q.h===.026));
  assert(beam,`${id}: missing structural stock beam`);
  const length=beam.mesh==='cylinder'?beam.h:beam.d;
  const front=beam.z-Math.cos(beam.mesh==='cylinder'?0:beam.pitch)*length/2;
  assert(front<=rear-.002,`${id}: stock starts ${front-rear} m behind receiver`);
  assert(beam.z+length/2>rear+.09,`${id}: stock no longer spans receiver to butt`);
 }
});
test('rifle and shotgun barrels continue through the fore-end into the receiver',()=>{
 let checked=0;
 for(const def of WEAPONS){
  const w=weapon(def.id),p=weaponModel(w),core=p.slice(0,p.coreCount);
  const receiver=core.find(q=>q.x===0&&q.y===.034&&q.h===.092);if(!receiver)continue;
  const tip=muzzlePosition(w).z+.02;
  const barrel=core.find(q=>q.mesh==='cylinder'&&q.x===0&&q.y===.06&&Math.abs(q.z-q.h/2-tip)<1e-9);
  assert(barrel,`${def.name}: original barrel tip changed`);
  assert(barrel.z+barrel.h/2>=receiver.z-receiver.d/2+.002,`${def.name}: floating forward barrel`);
  checked++;
 }
 assert.equal(checked,23);
});
test('pistol reflex bases meet the frame while optical height stays fixed',()=>{
 for(const id of [10,22,29]){
  const p=weaponModel(weapon(id)),frame=p[0],base=p[p.coreCount];
  assert(Math.abs(base.y+base.h/2-.133)<1e-12,'optic cap and sight remain at their original height');
  assert(base.y-base.h/2<=frame.y+frame.h/2-.003,`${id}: floating optic base`);
 }
});
test('reflex and prism optics leave a clear central sight ray',()=>{
 for(let id=0;id<WEAPONS.length;id++)for(const optic of [1,2]){
  if(WEAPONS[id].kind==='SNIPER'||id===12)continue;const p=weaponModel(weapon(id,optic));
  // Conservative test for axis-aligned opaque boxes crossing the optical centre.
  for(const q of p){if(q.mesh!=='bevel'&&q.mesh!=='cube'||q.pitch||q.yaw||q.roll)continue;
   const crossed=Math.abs(q.x)<q.w/2&&Math.abs(q.y-.169)<q.h/2&&q.z<.32;
   assert(!crossed,`weapon ${id} optic ${optic} obstructed by ${JSON.stringify(q)}`);
  }
 }
});
test('coated scope lenses belong only to magnified optics',()=>{
 for(const id of [0,7,8,10])for(const optic of [0,1,2,3]){
  const lenses=weaponModel(weapon(id,optic)).filter(p=>p.surface==='glass');
  assert.equal(lenses.length,id===7||optic===3?2:0,`${id}/${optic}`);
  for(const lens of lenses){assert(lens.rough<.2);assert(lens.z<-.15||lens.z>.15);}
 }
});
