import test from 'node:test';
import assert from 'node:assert/strict';
import {Arena,MAPS} from '../dist/js/maps.js';
import {Navigation} from '../dist/js/navigation.js';

const freshMaps=MAPS.filter(m=>m.id>=4);
test('map roster includes sixteen distinct selectable battlegrounds',()=>{
 assert.equal(MAPS.length,16);assert.equal(new Set(MAPS.map(m=>m.id)).size,16);
 assert.equal(new Arena(4).info.name,'BREAKWATER');assert.equal(new Arena(5).info.name,'CITADEL');
 assert.equal(new Arena(8).info.name,'FROSTLINE');assert.equal(new Arena(9).info.name,'IRON QUARRY');
 assert.equal(new Arena(99).info.id,MAPS.length-1);assert.equal(new Arena(NaN).info.id,0);
});
test('Frostline and Iron Quarry use authored terrain and landmark dressing',()=>{
 const frost=new Arena(8),quarry=new Arena(9);
 assert.equal(frost.blocks.find(b=>b.ground).surface,'snow');assert.equal(quarry.blocks.find(b=>b.ground).surface,'gravel');
 assert(frost.decor.some(p=>p.surface==='snow'));assert(quarry.decor.some(p=>p.surface==='dark'&&p.d===32));
 assert(frost.info.sky[2]>quarry.info.sky[2]);assert.notDeepEqual(frost.info.fog,quarry.info.fog);
});
test('every new spawn is collision safe and reaches every ground objective',()=>{
 for(const m of freshMaps){
  const arena=new Arena(m.id),nav=new Navigation(arena);
  assert.equal(arena.objectives.length,3);
  for(const q of arena.objectives)assert(!arena.collides(q,.34,1.75),`${m.name} objective ${q.name} is obstructed`);
  for(const spawn of arena.spawns){
   assert(!arena.collides(spawn,.34,1.75),`${m.name} spawn ${spawn.x},${spawn.z} obstructed`);
   for(const q of arena.objectives){
    const path=nav.path(spawn,q),end=path.at(-1);
    assert(end,`${m.name} no route from ${spawn.x},${spawn.z} to ${q.name}`);
    assert(Math.hypot(end.x-q.x,end.z-q.z)<1.9&&Math.abs(end.y-q.y)<.1,`${m.name} ${q.name} unreachable from ${spawn.x},${spawn.z}`);
   }
  }
 }
});
test('new raised routes are reachable by navigation without teleporting or jumping',()=>{
 for(const [id,targets]of [[4,[{x:-7,y:1.08,z:0},{x:7,y:1.08,z:0}]],[5,[{x:24,y:1.08,z:-13}]]]){
  const arena=new Arena(id),nav=new Navigation(arena);
  for(const q of targets){
   const path=nav.path(arena.spawns[0],q),end=path.at(-1);
   assert(end&&Math.hypot(end.x-q.x,end.z-q.z)<1.9&&Math.abs(end.y-q.y)<.05,`${arena.info.name} raised route unavailable`);
   for(let i=1;i<path.length;i++)assert(Math.abs(path[i].y-path[i-1].y)<=.36,`${arena.info.name} excessive step`);
  }
 }
});
test('new scenery remains finite and bounded for mobile rendering',()=>{
 for(const m of freshMaps){const arena=new Arena(m.id);
  assert(arena.blocks.length<(m.colliderBudget??180));assert(arena.decor.length<(m.decorBudget??900));assert(arena.foliage.length<800);
  for(const b of [...arena.blocks,...arena.decor,...arena.foliage])for(const key of ['x','y','z','w','h','d'])assert(Number.isFinite(b[key])&&(key.length!==1||!['w','h','d'].includes(key)||b[key]>0),`${m.name} invalid ${key}`);
 }
});

test('arid maps have bounded perimeter grass cover',()=>{
 for(const id of [2,9]){
  const arena=new Arena(id),grass=arena.foliage.filter(p=>p.leaf===2);
  assert(grass.length>200&&grass.length<800);
  assert(grass.some(p=>Math.max(Math.abs(p.x),Math.abs(p.z))>arena.info.size*.7));
  assert(grass.every(p=>p.mesh==='leaf'&&p.h>0&&p.h<2));
 }
});
