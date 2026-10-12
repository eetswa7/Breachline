import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/js/engine.js';
import {Arena,MAPS} from '../dist/js/maps.js';
import {Navigation} from '../dist/js/navigation.js';
import {SpawnDirector} from '../dist/js/spawns.js';

const near=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
test('all maps have broad connected ground spawn pools with two clear exits',()=>{
 for(const map of MAPS){
  const arena=new Arena(map.id),nav=new Navigation(arena),director=new SpawnDirector(arena,nav);
  assert(director.candidates.length>=60&&director.candidates.length<=144,`${map.name}: insufficient spawn coverage`);
  const quadrants=new Set();
  for(const p of director.candidates){
   assert(!arena.collides(p,.4,1.75),`${map.name}: occupied pocket`);
   assert.equal(p.y,0,`${map.name}: invalid elevated spawn`);
   assert.equal(arena.floorAt(p,.05),0);
   assert(p.open>=2);quadrants.add(`${p.x<0}:${p.z<0}`);
  }
  assert.equal(quadrants.size,4);
  // Exercise the full candidate pool against one anchor. A connected graph then
  // supplies routes to each objective from that anchor as well.
  const anchor=director.candidates[0];
  for(const p of director.candidates.slice(1)){
   const end=nav.path(p,anchor).at(-1);
   assert(end&&near(end,anchor)<1.9,`${map.name}: disconnected spawn at ${p.x},${p.z}`);
  }
  for(const q of arena.objectives){const end=nav.path(anchor,q).at(-1);assert(end&&near(end,q)<4.5,`${map.name}: objective ${q.name} unreachable`);}
 }
});

test('campers at every legacy home corner force respawns into sheltered interior lanes',()=>{
 for(const map of MAPS){
  const g=new Game({map:map.id},{seed:338}),p=g.player;
  for(const a of g.actors)a.health=0;
  const anchors=g.arena.spawns.filter(s=>s.team===0);
  const campers=g.actors.filter(a=>a.team===1);
  for(let i=0;i<campers.length;i++)campers[i].reset(anchors[i%anchors.length],0);
  p.health=0;g.time=12;g.spawn(p);
  const nearest=Math.min(...campers.map(a=>near(p,a)));
  assert(nearest>15,`${map.name}: spawned within camper kill range (${nearest.toFixed(1)} m)`);
  assert(!g.arena.spawns.some(s=>near(s,p)<2.2),`${map.name}: reused a corner`);
  assert(!campers.some(a=>g.arena.visible(g.eye(a),g.eye(p))),`${map.name}: spawned in camper sightline`);
  assert(!g.arena.collides(p,.4,1.75));
 }
});

test('repeat deaths and recent use rotate spawn pockets on every map',()=>{
 for(const map of MAPS){
  const g=new Game({map:map.id,mode:'ffa'},{seed:734}),p=g.player,visited=new Set();
  for(const a of g.actors)a.health=0;
  g.spawner.resetRound();
  for(let i=0;i<12;i++){
   g.time=i*3;g.spawn(p);visited.add(`${p.x}:${p.z}`);
   g.spawner.noteDeath(p,g.time);p.health=0;
  }
  assert(visited.size>=10,`${map.name}: repeated only ${visited.size} pockets`);
 }
});

test('round starts preserve separated teams and sabotage never uses mid-round respawns',()=>{
 for(const map of MAPS){
  const g=new Game({map:map.id,mode:'sabotage'},{seed:918});
  for(let round=0;round<4;round++){
   for(const a of g.actors){
    assert((a.x+a.z)*(a.team?1:-1)>g.arena.info.size*.4,`${map.name}: mixed initial side`);
    assert(!g.arena.collides(a,.35,1.75));
    for(const b of g.actors)if(a.id!==b.id)assert(near(a,b)>1.6);
   }
   assert.equal(g.rules.respawns,false);
   g.rules.nextRound();g.resetRound();
  }
 }
});

test('enemy grenade hazards and occupied pockets cannot become selected respawns',()=>{
 const g=new Game({map:2,mode:'ffa'},{seed:891}),p=g.player;
 for(const a of g.actors)a.health=0;
 g.spawner.resetRound();g.random=()=>0;
 const first=g.spawner.select(p,g);
 g.spawner.resetRound();
 const guard=g.actors[4];guard.reset(first,0);
 g.grenades.push({...first,kind:'frag',fuse:.2});
 const next=g.spawner.select(p,g);
 assert(near(first,next)>13);
 assert(!g.arena.collides(next,.4,1.75));
});

test('Foundry and Relay machinery halls have passable side doors and maps break outer sightlines',()=>{
 for(const id of [1,3]){
  const arena=new Arena(id),half=id===1?13:8.5;
  for(const sign of [-1,1])assert(arena.visible({x:sign*(half-2),y:1.5,z:0},{x:sign*(half+2),y:1.5,z:0}),`${arena.info.name}: blocked side loading door`);
 }
 for(const map of MAPS){
  const arena=new Arena(map.id),screens=arena.blocks.filter(b=>b.spawnScreen);
  assert(screens.length>=3,`${map.name}: missing boundary sightline breaks`);
  for(const b of screens){
   const horizontal=b.w>b.d;
   const a={x:b.x+(horizontal?0:-2),y:1.6,z:b.z+(horizontal?-2:0)},c={x:b.x+(horizontal?0:2),y:1.6,z:b.z+(horizontal?2:0)};
   assert(!arena.visible(a,c));
  }
 }
});

test('dense fights cap spawn visibility work and reuse baked ground clearance',()=>{
 const g=new Game({map:4,mode:'ffa'},{seed:889}),p=g.player;
 p.health=0;g.time=20;
 let rays=0;
 // Simulate an exposed arena to force the expensive worst-case branch. The
 // director must finish with a bounded ray budget even if every pocket is seen.
 g.arena.visible=()=>{rays++;return true;};
 g.arena.collides=()=>{throw new Error('Respawn repeated a static collision bake');};
 const spawn=g.spawner.select(p,g),enemies=g.actors.filter(a=>a.id!==p.id&&!a.dead);
 assert(Number.isFinite(spawn.x+spawn.y+spawn.z));
 assert(rays>0&&rays<=24*2*enemies.length,`unbounded visibility work: ${rays}`);
 assert(enemies.every(a=>near(a,spawn)>=1.6));
});
