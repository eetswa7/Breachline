import test from 'node:test';
import assert from 'node:assert/strict';
import {Weapon} from '../dist/js/weapons.js';
import {Game,emptyInput} from '../dist/js/engine.js';
import {aimFov,verticalFov,opticMagnification,scopeVisible,weaponPose,sightHeight} from '../dist/js/aim.js';

test('4x sights magnify equally on narrow and wide landscape displays',()=>{
 for(const weapon of [new Weapon(0,{optic:3}),new Weapon(7),new Weapon(8,{optic:3})])for(const aspect of [667/375,844/390,932/430]){
  const hip=verticalFov(aimFov(80,weapon,0),aspect),zoom=verticalFov(aimFov(80,weapon,1),aspect);
  assert(Math.abs(Math.tan(hip/2)/Math.tan(zoom/2)-4)<1e-8);assert.equal(opticMagnification(weapon),4);
 }
});
test('magnified sights clear the weapon pass while reflex sights stay aligned',()=>{
 const p=new Game().player;p.weapon.optic=3;p.ads=1;assert(scopeVisible(p));p.health=0;assert(!scopeVisible(p));p.health=100;p.weapon.optic=1;assert(!scopeVisible(p));const pose=weaponPose(p,0,false);assert.equal(pose.x,0);assert(Math.abs(pose.y+sightHeight(p.weapon))<1e-8);assert.equal(pose.roll,0);
});
test('scoped bullets still hit the target at the centre of the sight',()=>{
 for(const id of [0,7,8]){const g=new Game({loadout:{primary:id,secondary:10,optic:3}},{seed:25}),p=g.player,t=g.actors[4];for(const a of g.actors)a.health=0;p.health=t.health=100;p.spawnProtection=t.spawnProtection=0;p.x=t.x=0;p.y=t.y=0;p.z=0;t.z=-12;p.yaw=p.pitch=0;p.ads=1;g.arena.blocks=g.arena.blocks.filter(b=>b.ground);g.shoot(p);assert(t.health<100,`weapon ${id} should hit the centred target`);}
});
test('simple trigger repeats semi-automatic shots and empty magazines auto-reload',()=>{
 const g=new Game({loadout:{primary:8,secondary:10}}),p=g.player;for(const a of g.actors.slice(1))a.health=0;g.rules.time=999;const f={...emptyInput(),fire:true,repeatFire:true,autoReload:true};const before=p.weapon.ammo;
 for(let i=0;i<90;i++)g.update(1/60,f);assert(p.weapon.ammo<before-1);p.weapon.ammo=0;g.update(1/60,{...emptyInput(),autoReload:true});assert(p.weapon.reloadLeft>0);
});
