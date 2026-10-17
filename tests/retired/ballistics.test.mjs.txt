import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/js/engine.js';
import {Weapon,WEAPONS,GUN_ORDER,sanitizeLoadout} from '../dist/js/weapons.js';
import {traceBullet,boxInterval} from '../dist/js/ballistics.js';
import {AudioSystem} from '../dist/js/audio.js';
import {weaponModel} from '../dist/js/weapon-models.js';

function lane(id=0){
 const g=new Game({}, {seed:611});g.actors=[g.player,g.actors[4]];g.arena.blocks=[];
 const p=g.player,t=g.actors[1];p.reset({x:0,y:0,z:0},0);t.reset({x:0,y:0,z:-8},0);
 p.spawnProtection=t.spawnProtection=0;p.weapons[0]=new Weapon(id);p.ads=1;
 return {g,p,t,shoot:()=>traceBullet(g.arena,g.actors,p,{x:0,y:1,z:0},{x:0,y:0,z:-1},p.weapon)};
}
test('thin wood penetrates with reduced damage, thick wood and concrete stop a rifle',()=>{
 const {g,t,shoot}=lane();g.arena.box(0,1,-3,3,2,.12,'wood');g.arena.bakeCollision();
 let result=shoot();assert.equal(result.target,t);assert(result.scale>0&&result.scale<1);assert(result.impacts[0].penetrated);
 g.arena.blocks[0].d=1.5;g.arena.bakeCollision();assert.equal(shoot().target,null);
 g.arena.blocks[0].d=.05;g.arena.blocks[0].surface='concrete';g.arena.bakeCollision();assert.equal(shoot().target,null);
});
test('cover costs actual ray thickness and cannot be skipped inside a hollow prop',()=>{
 const interval=boxInterval({x:0,y:1,z:0},{x:.6,y:0,z:-.8},{x:2,y:1,z:-3,w:8,h:2,d:.1});
 assert(Math.abs(interval.exit-interval.entry-.125)<1e-9);
 const {g,t,shoot}=lane();g.arena.box(0,1,-3,3,2,2,'wood',{shellThickness:.035});g.arena.bakeCollision();
 assert.equal(shoot().target,t);
 g.arena.box(0,1,-3,2,2,.1,'concrete');g.arena.bakeCollision();assert.equal(shoot().target,null);
});
test('multiple thin covers consume a bounded shared energy budget',()=>{
 const {g,t,shoot}=lane();for(const z of [-2,-4])g.arena.box(0,1,z,3,2,.035,'glass');g.arena.bakeCollision();
 const twice=shoot();assert.equal(twice.target,t);assert.equal(twice.impacts.length,2);assert(twice.scale<.7);
 for(const z of [-5,-6])g.arena.box(0,1,z,3,2,.035,'glass');g.arena.bakeCollision();
 assert.equal(shoot().target,null);assert.equal(shoot().impacts.length,4);
});
test('shots choose the nearest silhouette and allies still physically block enemy hits',()=>{
 const {g,p,t,shoot}=lane();const ally=g.actors[0].constructor;
 const a=new ally(1,p.team,0);a.reset({x:0,y:0,z:-4},0);a.spawnProtection=0;g.actors.push(a);
 assert.equal(shoot().target,a);a.health=0;assert.equal(shoot().target,t);
 g.arena.box(0,1,-5,3,2,.1,'wood');g.arena.bakeCollision();
 const result=traceBullet(g.arena,g.actors,p,{x:0,y:1.66,z:0},{x:0,y:0,z:-1},p.weapon);
 assert.equal(result.part,'head');assert.equal(result.target,t);
});
test('shotgun pellets stop at cover and an empty magazine needs an extra action cycle',()=>{
 const {g,shoot}=lane(26);g.arena.box(0,1,-3,3,2,.05,'wood');g.arena.bakeCollision();assert.equal(shoot().target,null);
 for(const id of [0,24,25,27,28,29]){
  const w=new Weapon(id);w.ammo=2;w.reload();const tactical=w.reloadLeft;w.update(tactical+.001);
  w.ammo=0;w.reload();assert(w.reloadLeft>tactical);w.update(tactical);assert.equal(w.ammo,0);w.update(1);assert.equal(w.ammo,w.capacity);
 }
});
test('six added firearms have distinct models, sound profiles, save IDs and progression tiers',()=>{
 const signatures=new Set(),audio=new AudioSystem({});audio.context={sampleRate:2000,createBuffer(c,n,r){const a=new Float32Array(n);return {getChannelData:()=>a};}};audio.build();
 for(const id of [24,25,26,27,28,29]){
  const w=new Weapon(id),model=weaponModel(w);signatures.add(JSON.stringify(model.map(p=>[p.x,p.y,p.z,p.w,p.h,p.d])));
  assert(model.some(p=>p.tag==='magazine')&&model.muzzle.z<-.15);assert(audio.buffers.has('shot'+id));assert(GUN_ORDER.includes(id));
  assert.equal(sanitizeLoadout(id===29?{secondary:id}:{primary:id})[id===29?'secondary':'primary'],id);
 }
 assert.equal(signatures.size,6);assert.equal(new Set(GUN_ORDER).size,WEAPONS.length-1);assert.equal(GUN_ORDER.at(-1),22);
});
