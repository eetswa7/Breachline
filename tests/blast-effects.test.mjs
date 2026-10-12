import test from 'node:test';
import assert from 'node:assert/strict';
import {emitBlast,blastFront} from '../dist/js/blast-effects.js';

test('blast presentation is bounded, quality-scaled and keeps airborne blast height',()=>{
  for(const [quality,total] of [['low',15],['medium',27],['high',27],['ultra',27]]){
    const effects=[],renderer={quality,particle:(...args)=>effects.push(args)};
    const point={x:2,y:4,z:-3};emitBlast(renderer,{position:point,value:8},()=>.5);
    assert.equal(effects.length,total);const [ring,...debris]=effects;
    assert.equal(ring[1],8);assert.equal(ring[0].y,4.045);
    assert.equal(ring[3],4);assert.equal(ring[4],.48);
    assert(debris.some(e=>e[1]===0));assert(debris.some(e=>e[1]===1));assert(debris.some(e=>e[1]===2));
    assert(debris.filter(e=>e[1]===2).every(e=>e[4]<.3));
    assert.deepEqual(point,{x:2,y:4,z:-3});
  }
});

test('blast front expands monotonically, fades, and invalid events do not poison the pool',()=>{
  let previous=0;
  for(let age=0;age<=1;age+=.1){const f=blastFront({size:4,max:.48,life:.48*(1-age)});
    assert(f.size>=previous);assert(f.alpha>=0&&f.alpha<=.72);previous=f.size;}
  assert.equal(blastFront({size:4,max:.48,life:0}).alpha,0);
  const calls=[],renderer={particle:(...args)=>calls.push(args)};
  emitBlast(renderer,{position:{x:NaN,y:0,z:0}});assert.equal(calls.length,0);
  emitBlast(renderer,{position:{x:0,y:0,z:0},value:100},()=>.5);assert.equal(calls[0][3],8);
});
