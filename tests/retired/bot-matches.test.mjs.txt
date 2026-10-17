import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../../dist/js/engine.js';
import {MAPS} from '../../dist/js/maps.js';
import {GUN_ORDER} from '../../dist/js/weapons.js';
import {MODES} from '../../dist/js/modes.js';

test('bots fight, investigate and complete the full Gun Game ladder on every map',()=>{for(let map=0;map<MAPS.length;map++){const g=new Game({mode:'gun',map},{seed:718});let shots=0;for(let i=0;i<Math.ceil(g.rules.mode.time*30)+1&&g.rules.phase!=='finished';i++){g.update(1/30);for(const e of g.events)shots+=e.type==='shot';g.events.length=0;}assert(shots>20);assert.equal(g.rules.phase,'finished',`map ${map} incomplete`);assert(g.actors.some(a=>a.gunStage===GUN_ORDER.length),`map ${map} needs a firearm finish`);}});

test('bots play Hardpoint, Kill Confirmed and CTF to a result on every map',()=>{
 for(const mode of ['hardpoint','confirmed','ctf'])for(const map of MAPS){
  // Forty players can contest both flags until a valid 0–0 timeout. Use a
  // reproducible capture match here; capture rules also have isolated fixtures.
  const seed=mode==='ctf'&&map.id===13?781:9281;
  const game=new Game({mode,map:map.id},{seed});
  for(let i=0;i<15000&&game.rules.phase!=='finished';i++){game.update(1/30);game.events.length=0;}
  assert.equal(game.rules.phase,'finished',`${mode} on ${map.name} must finish`);
  assert(game.rules.scores[0]+game.rules.scores[1]>0,`${mode} on ${map.name} bots must play their objective`);
 }
});

test('bots score in Hill and complete Elimination on the new maps',()=>{
 assert(MODES.some(m=>m.id==='hill')&&MODES.some(m=>m.id==='elimination'));
 for(const map of MAPS.slice(10))for(const mode of ['hill','elimination']){
  const game=new Game({mode,map:map.id},{seed:943});
  for(let i=0;i<33000&&game.rules.phase!=='finished';i++){game.update(1/30);game.events.length=0;}
  assert.equal(game.rules.phase,'finished',`${map.name}/${mode}`);
  if(mode==='hill')assert(game.actors.some(a=>a.hillScore>0),`${map.name} hill ignored`);
  else assert.equal(Math.max(...game.rules.scores),5);
 }
});

test('bots engage and move the front on the expanded maps',()=>{
 for(const map of [13,14]){
  const game=new Game({mode:'frontline',map},{seed:443});let shots=0,captures=0;
  for(let i=0;i<180*30&&game.rules.phase==='playing';i++){
   game.update(1/30);for(const event of game.events){shots+=event.type==='shot';captures+=event.type==='capture';}game.events.length=0;
  }
  assert(shots>30);assert(captures>0,`${game.arena.info.name} front never moved`);
 }
});

test('Nuketown bots play objective modes, finish rounds and progress through all gun tiers',()=>{
 for(const mode of ['tdm','gun','domination','elimination','ctf']){
  const g=new Game({map:15,mode},{seed:718});let shots=0;
  for(let i=0;i<(mode==='elimination'?45000:g.rules.mode.time*30+1)&&g.rules.phase!=='finished';i++){g.update(1/30);for(const e of g.events)shots+=e.type==='shot';g.events.length=0;}
  assert(shots>20,`${mode}: no combat`);assert.equal(g.rules.phase,'finished',`${mode}: incomplete`);
  if(mode==='gun')assert(g.actors.some(a=>a.gunStage===29));if(mode==='domination')assert(Math.max(...g.rules.scores)>=150);if(mode==='elimination')assert.equal(Math.max(...g.rules.scores),5);
 }
});
