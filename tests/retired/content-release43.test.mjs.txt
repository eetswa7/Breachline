import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,emptyInput} from '../dist/js/engine.js';
import {Arena} from '../dist/js/maps.js';
import {Weapon,WEAPONS,PRIMARY_IDS,SECONDARY_IDS,GUN_ORDER,sanitizeLoadout} from '../dist/js/weapons.js';
import {SaveStore} from '../dist/js/save.js';
import {opticMagnification,sightHeight} from '../dist/js/aim.js';
import {AudioSystem} from '../dist/js/audio.js';
import {weatherParticles} from '../dist/js/particles.js';
import {fixture as rendererFixture} from './renderer-fixture.mjs';

test('new primary and sidearm slots save with stable old IDs and a complete Gun Game ladder',()=>{
 assert.equal(WEAPONS.length,30);assert.deepEqual(SECONDARY_IDS,[10,11,22,23,29]);
 assert.equal(GUN_ORDER.length,WEAPONS.length-1);assert.equal(new Set(GUN_ORDER).size,WEAPONS.length-1);assert.equal(GUN_ORDER.at(-1),22);
 let text='';const storage={getItem:()=>text,setItem:(key,value)=>text=value};
 for(const id of PRIMARY_IDS){const store=new SaveStore(storage);store.data.loadout.primary=id;store.data.loadout.secondary=22;store.persist();const loaded=new SaveStore(storage);assert.equal(loaded.data.loadout.primary,id);assert.equal(loaded.data.loadout.secondary,22);}
 assert.equal(sanitizeLoadout({primary:19,secondary:23}).secondary,23);
 assert.equal(sanitizeLoadout({primary:12}).primary,9);
});
test('Peregrine fires exactly two rounds from a tap and Bison loads and interrupts by shell',()=>{
 const game=new Game({loadout:{primary:16}},{seed:43});game.actors=[game.player];game.arena.blocks=[];
 game.update(1/60,{...emptyInput(),fire:true,firePressed:true});for(let i=0;i<60;i++)game.update(1/60);
 assert.equal(game.player.weapon.ammo,22);
 const pump=new Weapon(18);pump.ammo=0;pump.reload();pump.update(pump.reloadTime+.001);assert.equal(pump.ammo,1);assert(pump.reloadLeft>0);
 game.player.weapons[0]=pump;pump.cooldown=0;game.player.switchLeft=0;assert(game.shoot(game.player));assert.equal(pump.ammo,0);assert.equal(pump.reloadLeft,0);
 const sniper=new Weapon(19,{optic:0});assert.equal(opticMagnification(sniper),4);assert.equal(sightHeight(sniper),.188);
 const suppressed=new Weapon(21,{barrel:2});assert.equal(suppressed.barrel,1);
});
test('every gun has distinct cached shot, suppressed, reload and mechanical sound buffers',()=>{
 const audio=new AudioSystem({});audio.context={sampleRate:4000,createBuffer(channels,length,rate){const data=new Float32Array(length);return{length,sampleRate:rate,getChannelData:()=>data};}};
 audio.build();const signatures=new Set();
 for(const weapon of WEAPONS){
  for(const key of ['shot','suppressed','reload','seat','rack'])assert(audio.buffers.has(key+weapon.id),`Missing ${key}${weapon.id}`);
  const data=audio.buffers.get('shot'+weapon.id).getChannelData(0);assert(data.every(Number.isFinite));signatures.add(Array.from(data.subarray(0,24)).join(','));
 }
 assert.equal(signatures.size,WEAPONS.length);
});
test('new maps include raised concourse routes, wet reflections, bounded rain and refinery landmarks',()=>{
 const sky=new Arena(10),rain=new Arena(11),ember=new Arena(12);
 assert(sky.blocks.some(b=>b.concourse));assert.equal(sky.objectives[1].y,1.08);
 assert(rain.decor.some(p=>p.surface==='water'));assert(rain.blocks.some(p=>p.wet));
 assert(ember.blocks.some(p=>p.catwalk));assert(ember.decor.some(p=>p.surface==='rust'&&p.h>5));
 for(const quality of ['low','medium','high','ultra','compatibility']){
  const renderer={arena:rain,quality,eye:{x:0,y:2,z:30},weatherYaw:0,weatherPitch:0};
  const particles=weatherParticles(renderer,8);assert(particles.length<=36);assert(particles.every(p=>p.sizeY>.2&&p.sizeX<.02));
  assert(particles.every(p=>!rain.indoors(p)));assert.deepEqual(weatherParticles(renderer,8),particles);
 }
 const r=rendererFixture();r.arena=rain;r.buildWorld();
 const wet=r.makeMaterial(rain.blocks.find(p=>p.wet),'world'),dry=r.makeMaterial({...rain.blocks.find(p=>p.wet),wet:false},'world');
 assert.notEqual(wet,dry);assert(wet.roughness<dry.roughness);assert(r.worldBatches.length<230);
});

const arenaGame=mode=>{
 const game=new Game({mode},{seed:44});game.arena.blocks=[];game.actors=game.actors.filter(a=>a.id===0||a.id===4);
 for(const [i,a]of game.actors.entries()){a.reset({x:i?25:-25,y:0,z:0},0);a.spawnProtection=0;}
 return game;
};
test('hill scores personal occupation, resets fractional contested time and resolves by hill score',()=>{
 const game=arenaGame('hill'),r=game.rules,p=game.player,enemy=game.actors[1],point=r.points[r.activePoint];
 Object.assign(p,{x:point.x,y:point.y,z:point.z});r.update(.8,game);assert.equal(p.hillScore,0);
 Object.assign(enemy,{x:point.x+1,y:point.y,z:point.z});r.update(.4,game);assert(point.contested);assert.equal(p.hillScore,0);
 enemy.x=30;r.update(.3,game);assert.equal(p.hillScore,0);r.update(.8,game);assert.equal(p.hillScore,1);
 r.rotationRemaining=.1;r.update(.2,game);assert.notEqual(r.points[r.activePoint],point);
 enemy.hillScore=5;r.time=.01;r.update(.02,game);assert.equal(r.phase,'finished');assert.equal(r.winner,enemy.id);
 const scoreGame=arenaGame('hill'),sr=scoreGame.rules,sp=scoreGame.player,sq=sr.points[sr.activePoint];Object.assign(sp,sq);sp.hillScore=74;sr.update(1.1,scoreGame);assert.equal(sr.winner,sp.id);
});
test('elimination prevents respawns, resets rounds, resolves timeout ties and wins at five',()=>{
 const game=arenaGame('elimination'),r=game.rules,p=game.player,enemy=game.actors[1];
 assert(!r.respawns);enemy.health=0;game.update(1/60);assert.equal(r.scores[0],1);assert.equal(r.phase,'roundBreak');
 r.roundWait=.01;game.update(1/60);assert.equal(r.round,2);assert.equal(r.phase,'playing');assert(!enemy.dead);
 r.time=.01;p.health=80;enemy.health=50;r.update(.02,game);assert.equal(r.scores[0],2);
 r.nextRound();p.health=enemy.health=100;r.time=.01;r.update(.02,game);assert.equal(r.roundWinner,-1);assert.equal(r.scores[0],2);
 r.nextRound();r.scores[0]=4;enemy.health=0;r.update(.02,game);assert.equal(r.phase,'finished');assert.equal(r.winner,0);
});
