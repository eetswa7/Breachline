import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/js/engine.js';

test('authored fuel explosions distinguish persistent cosmetic fire from frag, smoke and flash',()=>{
 const g=new Game({map:0},{seed:640});g.actors=[g.player];g.events.length=0;
 const fuel=g.arena.breakables.find(b=>b.surface==='rust');assert(fuel?.breakable);
 g.explode({...fuel,kind:'frag',owner:0},5.5,90);
 assert.equal(g.events.at(-1).type,'explosion');assert.equal(g.events.at(-1).environmentalFire,true);assert.equal(g.events.at(-1).value,5.5);
 const frag={x:0,y:1,z:0,owner:0,kind:'frag'};g.explode(frag);assert.equal(g.events.at(-1).type,'explosion');assert.equal(g.events.at(-1).environmentalFire,false);assert.equal(g.events.at(-1).value,8);
 for(const kind of ['smoke','flash']){g.events.length=0;g.explode({...frag,kind});assert.equal(g.events.at(-1).type,kind);assert(!g.events.some(e=>e.type==='explosion'));}
 assert.equal(g.smokes.length,1);assert.equal(g.player.health,100,'protected player preserves existing blast damage rules');
});
