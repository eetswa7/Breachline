import test from 'node:test';
import assert from 'node:assert/strict';
import {muzzleFlash,muzzleGas} from '../dist/js/firing-presentation.js';
import {Weapon,WEAPONS,GUN_ORDER} from '../dist/js/weapons.js';
import {Game,emptyInput} from '../dist/js/engine.js';
import {Renderer} from '../dist/js/three-renderer.js';
import {fixture} from './renderer-fixture.mjs';

test('arsenal flash samples retain the previous area, light and lifetime bounds without changing weapon state',()=>{
 const out={};
 for(const def of WEAPONS)for(const age of [0,.003,.008,.02,.033,.04,.045,.1,NaN,-.01]){
  const w=new Weapon(def.id);w.sinceShot=age;w.shotSerial=3;const before=JSON.stringify(w),f=muzzleFlash(w,false,out);
  assert.equal(f,out);assert.equal(JSON.stringify(w),before);assert(Object.values(f).every(v=>typeof v==='boolean'||Number.isFinite(v)));
  const oldSize=def.kind==='SHOTGUN'?.23:def.kind==='PISTOL'?.10:.16;
  assert(f.width*f.height<=oldSize*oldSize+1e-12);assert(f.opacity>=0&&f.opacity<=1);assert(f.light>=0&&f.light<=.9);
  if(!Number.isFinite(age)||age<0||age>=.045||def.kind==='MELEE'||w.suppressed)assert(!f.visible);
 }
});

test('flash expands then fades continuously and isolated shots have deterministic distinct stamps',()=>{
 const w=new Weapon(0);w.shotSerial=1;
 const sample=age=>{w.sinceShot=age;return muzzleFlash(w);};
 const first=sample(0),peak=sample(.009),tail=sample(.032),end=sample(.043);
 assert(peak.width>first.width&&peak.height>first.height);assert(first.opacity>peak.opacity&&peak.opacity>tail.opacity);assert.equal(end.opacity,0);assert.equal(end.light,0);
 w.sinceShot=.009;w.shotIndex=1;const one=muzzleFlash(w);w.shotSerial=2;const two=muzzleFlash(w);assert.notEqual(one.rotation,two.rotation);assert.notEqual(one.width,two.width);assert.deepEqual(muzzleFlash(w),two);
 assert(!muzzleFlash(w,true).visible);assert.equal(muzzleFlash(w,true).light,0);
 for(const id of WEAPONS.map(w=>w.id)){const suppressed=new Weapon(id,{barrel:1});suppressed.sinceShot=0;assert(!muzzleFlash(suppressed).visible);}
});

test('family gas stays inside the existing single-puff size/lifetime budget and suppressors vent more slowly',()=>{
 const out={};
 for(const def of WEAPONS){const w=new Weapon(def.id),before=JSON.stringify(w),gas=muzzleGas(w,out);assert.equal(gas,out);assert.equal(JSON.stringify(w),before);assert(Object.values(gas).every(Number.isFinite));assert(gas.size>=0&&gas.size<=.07);assert(gas.life>=0&&gas.life<=.42);}
 const pistol=muzzleGas(new Weapon(10)),rifle=muzzleGas(new Weapon(0)),shotgun=muzzleGas(new Weapon(5)),suppressed=muzzleGas(new Weapon(0,{barrel:1}));
 assert(pistol.size<rifle.size&&rifle.size<shotgun.size);assert(pistol.life<rifle.life&&rifle.life<shotgun.life);assert(suppressed.forward<rifle.forward);assert(suppressed.size<rifle.size);
 assert.equal(muzzleGas(new Weapon(12)).life,0);
});

test('renderer uses the temporal sprite on the original muzzle and hides all flash/light in menu and suppression',()=>{
 const r=fixture(),g=new Game({map:14},{seed:6714});r.arena=g.arena;g.player.reset({x:0,y:0,z:27},0);g.actors=[g.player];
 const w=g.player.weapon;w.sinceShot=.008;w.shotSerial=1;r.prepareWeapon(g,844/390,false);
 const f=muzzleFlash(w);assert.equal(r.muzzle.visible,true);assert.equal(r.muzzle.material.opacity,f.opacity);assert.equal(r.muzzle.scale.x,f.width);assert.equal(r.muzzle.scale.y,f.height);assert.equal(r.muzzleLight.intensity,f.light);
 assert.equal(r.muzzle.position.x,r.weaponParts.muzzle.x);assert.equal(r.muzzle.position.z,r.weaponParts.muzzle.z);
 const sprite=r.muzzle,material=r.muzzle.material,light=r.muzzleLight;r.prepareWeapon(g,844/390,true);assert(!r.muzzle.visible);assert.equal(light.intensity,0);
 g.player.weapons[0]=new Weapon(0,{barrel:1});g.player.weapon.sinceShot=0;r.prepareWeapon(g,844/390,false);assert(!r.muzzle.visible);assert.equal(light.intensity,0);assert.equal(r.muzzle,sprite);assert.equal(r.muzzle.material,material);assert.equal(r.muzzleLight,light);
});

test('native shot dispatch keeps one gas emission, follows pitch, and leaves ballistics/casings and paused clocks intact',()=>{
 for(const id of [0,3,5,7,10,21]){
  const g=new Game({map:14},{seed:6714});g.player.weapons[0]=new Weapon(id);g.player.reset({x:0,y:0,z:27},0);g.player.pitch=.7;g.actors=[g.player];g.events=[];assert(g.shoot(g.player));
  const before=JSON.stringify({weapon:g.player.weapon,events:g.events,casings:g.casings}),emissions=[];
  const r=Object.create(Renderer.prototype);r.particle=(...args)=>emissions.push(args);r.events(g.events.filter(e=>e.type==='shot'),g);
  assert.equal(emissions.length,1);assert.equal(emissions[0][1],0);assert(emissions[0][6]>.3,'pitched muzzle gas must rise along the firing direction');assert.equal(JSON.stringify({weapon:g.player.weapon,events:g.events,casings:g.casings}),before);
  const f=muzzleFlash(g.player.weapon);g.paused=true;g.update(1/30,emptyInput());assert.deepEqual(muzzleFlash(g.player.weapon),f);
  g.paused=false;g.update(.03,emptyInput());g.update(.02,emptyInput());assert(!muzzleFlash(g.player.weapon).visible);
 }
});

test('a real Gun Game promotion retains gas from the firing event weapon and suppressor',()=>{
 // Spectre SD promotes to a shotgun; Talon promotes to a pistol. Both replace
 // player.weapon inside damage() before the killing shot reaches the renderer.
 for(const id of [21,19]){
  const g=new Game({mode:'gun'},{seed:71}),p=g.player,target=g.actors[4];g.arena.blocks=[];g.actors=[p,target];g.events=[];
  p.gunStage=GUN_ORDER.indexOf(id);p.weapons[0]=new Weapon(id);p.slot=0;p.switchLeft=0;
  Object.assign(p,{x:0,y:0,z:0,yaw:0,pitch:0,ads:1});Object.assign(target,{x:0,y:0,z:-3,health:10,spawnProtection:0});
  const oldWeapon=p.weapon;assert(g.shoot(p));assert.notEqual(p.weapon,oldWeapon);assert.equal(p.weapon.def.id,GUN_ORDER[p.gunStage]);
  const shot=g.events.find(e=>e.type==='shot');assert.equal(shot.weapon,id);assert.equal(shot.suppressed,oldWeapon.suppressed);
  const emissions=[],r=Object.create(Renderer.prototype);r.particle=(...args)=>emissions.push(args);r.events([shot],g);assert.equal(emissions.length,1);
  const expected=muzzleGas(oldWeapon),replacement=muzzleGas(p.weapon);assert.notEqual(expected.size,replacement.size,'fixture must distinguish the promoted weapon');
  assert.equal(emissions[0][3],expected.size);assert.equal(emissions[0][4],expected.life);assert(Math.abs(Math.hypot(emissions[0][5],emissions[0][6]-expected.lift,emissions[0][7])-expected.forward)<1e-12);
 }
});
