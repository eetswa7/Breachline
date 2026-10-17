import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/js/engine.js';
import {Arena,MAPS} from '../dist/js/maps.js';
import {Navigation} from '../dist/js/navigation.js';
import {fixture as rendererFixture} from './renderer-fixture.mjs';

function sector(){
 const game=new Game({mode:'frontline'},{seed:847}),rules=game.rules;
 game.arena.blocks=[];rules.points=[{x:-20,y:0,z:0,name:'A',owner:0},{x:0,y:0,z:0,name:'B',owner:-1},{x:20,y:0,z:0,name:'C',owner:1}];
 for(const actor of game.actors)actor.health=0;
 return {game,rules,blue:game.player,red:game.actors[4]};
}
test('Frontline captures advance the active sector and the rear breakthrough wins',()=>{
 const {game,rules,blue}=sector();blue.reset({x:0,y:0,z:0},0);
 rules.update(8,game);assert.equal(rules.activePoint,2);assert.deepEqual(rules.scores,[2,1]);assert.equal(blue.captures,1);
 blue.x=20;rules.update(8,game);assert.equal(rules.phase,'finished');assert.equal(rules.winner,0);assert.deepEqual(rules.scores,[3,0]);
});
test('defenders reverse a sector push, contests freeze capture and empty sectors decay',()=>{
 const {game,rules,blue,red}=sector();blue.reset({x:0,y:0,z:0},0);rules.update(4,game);assert.equal(rules.frontlineProgress,.5);
 red.reset({x:1,y:0,z:0},0);rules.update(2,game);assert.equal(rules.frontlineProgress,.5);assert(rules.points[1].contested);
 blue.health=red.health=0;rules.update(2,game);assert(rules.frontlineProgress<.5);
 rules.frontlineProgress=0;red.reset({x:0,y:0,z:0},0);rules.update(8,game);assert.equal(rules.activePoint,0);
 red.x=-20;rules.update(8,game);assert.equal(rules.winner,1);
});
test('Frontline capture respects walls, floor separation and territory time-limit ties',()=>{
 const {game,rules,blue}=sector();blue.reset({x:2,y:0,z:0},0);
 game.arena.box(1,1,0,.2,2,4);game.arena.bakeCollision();rules.update(4,game);assert.equal(rules.frontlineProgress,0);
 game.arena.blocks=[];blue.y=3;rules.update(4,game);assert.equal(rules.frontlineProgress,0);
 rules.time=.1;rules.update(.1,game);assert.equal(rules.winner,-1);
});
test('Frontline respawns stay behind the current sector on every map and both sides',()=>{
 for(const map of MAPS){
  const game=new Game({mode:'frontline',map:map.id},{seed:812});
  for(const active of [0,1,2]){
   game.rules.activePoint=active;game.time+=12;
   for(const team of [0,1]){const actor=game.actors.find(a=>a.team===team);actor.health=0;game.spawn(actor);assert(game.rules.spawnAllowed(actor,actor),`${map.name} ${active} team ${team}`);assert(!game.arena.collides(actor,.31,1.75));}
  }
 }
});
test('expanded arenas contain real window apertures and navigable elevated sectors',()=>{
 for(const id of [13,14]){
  const a=new Arena(id),nav=new Navigation(a);assert(a.info.size>=58);assert(a.blocks.some(p=>p.aperture));
  for(const goal of a.objectives){const end=nav.path(a.spawns[0],goal).at(-1);assert(end&&Math.hypot(end.x-goal.x,end.z-goal.z)<1.9&&Math.abs(end.y-goal.y)<.1);}
  const r=rendererFixture();r.arena=a;r.buildWorld();assert(r.worldBatches.length<280);assert(r.worldBatches.every(b=>b.count>0));
 }
 const city=new Arena(13);
 assert(city.visible({x:-21,y:1.6,z:-30},{x:-21,y:1.6,z:-32.5}),'door opening stays traversable');
 assert(city.visible({x:-21,y:1.6,z:-27.45},{x:-30,y:1.6,z:-27.45}),'side window admits a shot');
 assert(!city.visible({x:-21,y:.5,z:-27.45},{x:-30,y:.5,z:-27.45}),'window sill remains physical cover');
});
