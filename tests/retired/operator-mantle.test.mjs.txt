import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/js/engine.js';
import {Weapon,WEAPONS} from '../dist/js/weapons.js';
import {actorModel} from '../dist/js/geometry.js';
import {operatorMuzzle,operatorWeaponMount,nativeOperatorWeapon} from '../dist/js/operator-detail.js';
import {muzzlePosition} from '../dist/js/weapon-models.js';
import {compose,multiply,identity} from '../dist/js/math.js';
import {updateWeaponClearance} from '../dist/js/weapon-clearance.js';
import {weaponPose} from '../dist/js/aim.js';
import {beginVault,advanceVault} from '../dist/js/traversal.js';

test('every firearm mounts its actual model, with stable rig references and bounded distant detail',()=>{
 const game=new Game({}, {seed:142}),actor=game.actors[1];let body;
 for(const def of WEAPONS){
  actor.weapons[0]=new Weapon(def.id);actor.slot=0;const parts=actorModel(actor,1);
  body??=parts.slice(0,actor.operatorBodyCount);
  assert.deepEqual(parts.slice(0,actor.operatorBodyCount),body);
  const carried=parts.filter(p=>p.carried);assert(carried.length>2&&carried.length<=24,def.name);
  assert(carried.filter(p=>p.actorFar).length<=5);assert(parts[20].hidden&&parts[21].hidden&&parts[22].hidden);
  const refs=parts.slice();for(let frame=0;frame<30;frame++){
   actor.pitch=(frame-15)/30;actor.crouched=frame>15;actorModel(actor,1+frame/60);
   assert(parts.every((p,i)=>p===refs[i]),'reuse component objects during animation');
   for(const p of parts)for(const key of ['x','y','z','pitch','roll'])assert(Number.isFinite(p[key]??0),def.name);
  }
  actor.pitch=0;actor.crouched=false;actorModel(actor,1.5);
  // Compare references only; poses legitimately change during a stance transition.
  for(let i=0;i<body.length;i++)assert.equal(parts[i],body[i]);
 }
});

test('muzzle follows equipped weapon, heading and crouch rather than the generic rifle',()=>{
 const g=new Game({}, {seed:4}),a=g.actors[1];a.x=a.y=a.z=0;a.yaw=a.pitch=0;
 a.weapons[0]=new Weapon(7);const long=operatorMuzzle(a);a.weapons[0]=new Weapon(10);const short=operatorMuzzle(a);
 assert(long.z<short.z-.2);a.yaw=Math.PI/2;const rotated=operatorMuzzle(a);
 assert(Math.abs(rotated.x+short.z)<1e-9);assert(Math.abs(rotated.z-short.x)<1e-9);
 a.crouched=true;assert.equal(operatorMuzzle(a).y,short.y-.5);
});

test('native carried rifles keep original joints and their mounted muzzle agrees with ballistics',()=>{
 const g=new Game({}, {seed:24}),a=g.actors[1],assets={weaponGroups(parts){
  const groups=new Map();for(let i=0;i<parts.coreCount;i++){
   const p=parts[i],key=p.tag??'static';if(!groups.has(key))groups.set(key,{...p,anchor:i,blenderMesh:key});
  }return [...groups.values()];
 }};
 const world=identity(),local=identity(),mounted=identity();
 for(const def of WEAPONS){
  a.weapons[0]=new Weapon(def.id,{optic:1,barrel:1});a.slot=0;a.yaw=.83;a.pitch=-.27;a.crouched=true;
  a.animDuck=.5;a.weapon.sinceShot=10;actorModel(a,1);
  const groups=nativeOperatorWeapon(a,assets,1),m=operatorWeaponMount(a),tip=muzzlePosition(a.weapon);
  compose(world,a.x,a.y,a.z,1,1,1,-a.yaw);compose(local,m.x,m.y,m.z,1,1,1,m.yaw,m.pitch,m.roll);multiply(mounted,world,local);
  const actual={x:mounted[0]*tip.x+mounted[4]*tip.y+mounted[8]*tip.z+mounted[12],
   y:mounted[1]*tip.x+mounted[5]*tip.y+mounted[9]*tip.z+mounted[13],
   z:mounted[2]*tip.x+mounted[6]*tip.y+mounted[10]*tip.z+mounted[14]},expected=operatorMuzzle(a);
  for(const axis of ['x','y','z'])assert(Math.abs(actual[axis]-expected[axis])<1e-5,`${def.name} ${axis}`);
  const ammo=a.weapon.ammo;a.weapon.reloadLeft=a.weapon.reloadTime*.45;
  assert.equal(nativeOperatorWeapon(a,assets,1.1),groups);assert.equal(a.weapon.ammo,ammo);
  for(const group of groups){
   const joint=a.nativeWeaponParts[group.anchor];for(const key of ['x','y','z','pitch','roll'])assert.equal(group[key],joint[key]);
  }
  assert(a.nativeWeaponAccessories.every(p=>!/^(rightHand|supportHand|pumpHand)$/.test(p.tag??'')));
 }
});

test('impact reactions return to the base pose and never accumulate position drift',()=>{
 const g=new Game({}, {seed:19}),a=g.actors[1];a.spawnProtection=0;actorModel(a,0);
 const x=a.x,z=a.z,yaw=a.yaw,pitch=a.pitch;
 g.damage(a,30,g.actors[4]);assert(a.hitReact>0);
 for(let i=1;i<120;i++)actorModel(a,i/60);
 assert.equal(a.x,x);assert.equal(a.z,z);assert.equal(a.yaw,yaw);assert.equal(a.pitch,pitch);
 a.hitReact=0;actorModel(a,2);assert.equal(a.renderParts[7].z,a.renderBase[7].z);
 a.reset({x:0,y:0,z:0},0);assert.equal(a.hitReact,0);assert.equal(a.weaponObstruction,0);
});

test('wall clearance stays bounded, freezes while paused and leaves full ADS exact',()=>{
 const g=new Game({}, {seed:16}),p=g.player,state={};let rays=0;
 const arena={trace:()=>{rays++;return{t:.28,block:{}};}};
 for(let i=0;i<60;i++)updateWeaponClearance(state,arena,p,1/60);
 assert(rays<=39&&p.weaponObstruction>.75);const value=p.weaponObstruction;
 updateWeaponClearance(state,arena,p,0);assert.equal(p.weaponObstruction,value);
 p.ads=1;const aimed=weaponPose(p,2,false);p.weaponObstruction=0;const free=weaponPose(p,2,false);
 for(const key of ['x','y','z','pitch','roll'])assert.equal(aimed[key],free[key]);
 arena.trace=()=>({t:1,block:null});for(let i=0;i<60;i++)updateWeaponClearance(state,arena,p,1/60);
 assert(p.weaponObstruction<1e-5);
});

test('high mantles lift the capsule over a two metre face, with clearance at every step',()=>{
 const g=new Game({}, {seed:25}),p=g.player,a=g.arena;a.blocks=[];
 a.box(0,-.2,0,20,.4,20,'concrete',{ground:true});a.box(0,1,-1,1,2,1);a.bakeCollision();p.reset({x:0,y:0,z:0},0);
 assert(beginVault(p,a,0,-1));assert.equal(p.vault.kind,'mantle');assert.equal(p.vault.duration,.62);
 for(let i=0;i<60&&p.vault;i++){assert(advanceVault(p,a,1/60));assert(!a.collides({...p,y:p.y+.04},.31,1.74));}
 assert(p.grounded&&!p.vault);assert.equal(p.y,2);assert(p.z<-.8);
 p.reset({x:0,y:0,z:0},0);a.box(0,3.25,-.5,3,.3,3,'concrete',{roof:true});a.bakeCollision();
 assert(!beginVault(p,a,0,-1),'headroom blocks a high mantle');
 p.grounded=false;assert(!beginVault(p,a,0,-1),'cannot mantle while airborne');
});
