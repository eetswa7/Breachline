import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,emptyInput} from '../dist/js/engine.js';
import {Weapon,ATTACHMENTS,WEAPONS,GUN_ORDER,sanitizeLoadout} from '../dist/js/weapons.js';
import {opticMagnification} from '../dist/js/aim.js';
import {SaveStore} from '../dist/js/save.js';
import {traceBullet} from '../dist/js/ballistics.js';

test('Gun Game uses every firearm once and ends with the revolver',()=>{
 assert.equal(GUN_ORDER.length,29);assert.equal(new Set(GUN_ORDER).size,29);
 assert(GUN_ORDER.every(id=>WEAPONS[id].kind!=='MELEE'));assert.equal(GUN_ORDER.at(-1),22);
 const g=new Game({mode:'gun'},{seed:71}),p=g.player,t=g.actors[4];g.arena.blocks=[];
 for(let i=0;i<GUN_ORDER.length;i++){t.health=30;t.spawnProtection=0;p.switchLeft=0;p.weapon.cooldown=0;Object.assign(p,{x:0,y:0,z:0,yaw:0,pitch:0,ads:1});Object.assign(t,{x:0,y:0,z:-3});assert(g.shoot(p));assert.equal(p.gunStage,i+1);}
 assert.equal(g.rules.winner,0);assert.equal(p.weapon.def.id,22);
});
test('new attachment slots survive saves and reject incompatible shotgun chokes',()=>{
 assert(Object.values(ATTACHMENTS).reduce((n,a)=>n+a.length,0)>=30);
 let text='';const storage={getItem:()=>text,setItem:(key,v)=>text=v},store=new SaveStore(storage);
 Object.assign(store.data.loadout,{primary:0,optic:6,barrel:3,handling:7,magazine:3,ammo:1});store.persist();
 assert.deepEqual(new SaveStore(storage).data.loadout,store.data.loadout);
 assert.equal(sanitizeLoadout({primary:0,barrel:6}).barrel,0);
 assert.equal(sanitizeLoadout({primary:5,barrel:6}).barrel,6);
 const bad=new Weapon(0,{optic:Infinity,barrel:NaN,handling:-9,magazine:999,ammo:null});
 assert(Number.isFinite(bad.adsTime+bad.capacity+bad.range));
});
test('attachment builds materially change firing, zoom, reload, capacity and braced recoil',()=>{
 const base=new Weapon(0),control=new Weapon(0,{barrel:2,handling:1}),laser=new Weapon(0,{handling:2});
 assert(control.recoil<base.recoil*.5);assert(control.horizontalRecoil<=.5);
 assert(laser.spread(0,true,false)<base.spread(0,true,false)*.6);
 const fast=new Weapon(0,{magazine:1}),drum=new Weapon(0,{magazine:3});
 assert(fast.reloadTime<base.reloadTime*.7);assert(fast.capacity<base.capacity);
 assert.equal(drum.capacity,base.capacity*2);assert(drum.reloadTime>base.reloadTime);assert(drum.mobility<1);
 const long=new Weapon(0,{barrel:3}),quick=new Weapon(0,{barrel:4,handling:8}),bipod=new Weapon(0,{handling:7});
 assert(long.range>base.range*1.3);assert(quick.adsTime<base.adsTime*.5);
 assert(bipod.recoilFor(1,true,true)<base.recoilFor(1,true,true)*.45);
 assert(bipod.spread(1,false,true)<base.spread(1,false,true)*.6);
 assert.equal(opticMagnification(new Weapon(0,{optic:5})),2.5);assert.equal(opticMagnification(new Weapon(0,{optic:6})),6);
 assert(new Weapon(0,{ammo:2}).damage(5)>base.damage(5)*1.1);
});
test('armour-piercing ammunition passes a metal skin that stops standard rounds',()=>{
 const g=new Game({}, {seed:21});g.arena.blocks=[];g.arena.box(0,1,-2,3,2,.07,'steel');
 const p=g.player,t=g.actors[4];g.actors=[p,t];Object.assign(p,{x:0,y:0,z:0});Object.assign(t,{x:0,y:0,z:-4,health:100});
 const origin={x:0,y:1,z:0},dir={x:0,y:0,z:-1};
 assert.equal(traceBullet(g.arena,g.actors,p,origin,dir,new Weapon(0)).target,null);
 assert.equal(traceBullet(g.arena,g.actors,p,origin,dir,new Weapon(0,{ammo:1})).target,t);
});
test('quiet attachments reduce actual bot investigation distance',()=>{
 for(const [loadout,heard]of [[{},true],[{barrel:1},false],[{ammo:3},false]]){
  const g=new Game({loadout},{seed:82});g.arena.blocks=[];const p=g.player,t=g.actors[4];g.actors=[p,t];Object.assign(p,{x:0,y:0,z:0,yaw:0,pitch:0,spawnProtection:0});Object.assign(t,{x:28,y:0,z:0,target:null,lastKnown:null});g.shoot(p);assert.equal(!!t.lastKnown,heard);
 }
});
test('long sniper barrels can hit across the diagonal of an expanded arena',()=>{
 const g=new Game({}, {seed:17});g.arena.blocks=[];const p=g.player,t=g.actors[4];g.actors=[p,t];Object.assign(p,{x:0,y:0,z:0});Object.assign(t,{x:0,y:0,z:-180,health:100});
 const origin={x:0,y:1,z:0},dir={x:0,y:0,z:-1};
 assert.equal(traceBullet(g.arena,g.actors,p,origin,dir,new Weapon(19)).target,null);
 assert.equal(traceBullet(g.arena,g.actors,p,origin,dir,new Weapon(19,{barrel:3})).target,t);
});
test('attachment mobility changes player movement in the simulation',()=>{
 const travel=loadout=>{const g=new Game({loadout},{seed:71});g.actors=[g.player];g.arena.blocks=[];Object.assign(g.player,{x:0,y:0,z:0,yaw:0});for(let i=0;i<60;i++)g.update(1/60,{...emptyInput(),mz:1});return -g.player.z;};
 assert(travel({handling:3})>travel({})*1.08);assert(travel({magazine:3})<travel({})*.93);
});
test('all team modes field twenty per side on huge maps and retain safe separated starts',()=>{
 for(const map of [13,14])for(const mode of ['tdm','sabotage','domination','hardpoint','confirmed','ctf','elimination','frontline']){
  const g=new Game({map,mode},{seed:443});assert.equal(g.actors.length,40);
  for(const team of [0,1])assert.equal(g.actors.filter(a=>a.team===team).length,20);
  for(const a of g.actors){assert(!g.arena.collides(a,.31,1.75));assert(g.actors.every(b=>a===b||Math.hypot(a.x-b.x,a.z-b.z)>.6),`${map}/${mode}: overlapping starts`);}
 }
 assert.equal(new Game({map:0,mode:'tdm'}).actors.length,8);
 assert.equal(new Game({map:13,mode:'gun'}).actors.length,8);
});
