import test from 'node:test';
import assert from 'node:assert/strict';
import {Arena,MAPS} from '../dist/js/maps.js';
import {Navigation} from '../dist/js/navigation.js';
import {Game} from '../dist/js/engine.js';
import {rayBox,rng} from '../dist/js/math.js';
import {Weapon} from '../dist/js/weapons.js';
import {traceBullet} from '../dist/js/ballistics.js';
import {fixture as rendererFixture} from './renderer-fixture.mjs';

test('Nuketown has usable classic landmarks, interiors and mobile geometry budgets',()=>{
 const a=new Arena(15),nav=new Navigation(a);assert.equal(MAPS[15].name,'NUKETOWN');assert.equal(a.houseRooms.length,2);
 assert(a.blocks.some(b=>b.schoolBus));assert(a.blocks.some(b=>b.movingTruck));assert(a.blocks.some(b=>b.openTruck));
 for(const p of a.spawns)assert(!a.collides(p,.45,1.78));
 for(const p of [...a.objectives,...a.houseRooms.flatMap(h=>[h.upper,h.balcony]),a.truckInterior]){
  assert(!a.collides(p,.34,1.75));const route=nav.path(a.spawns[0],p),end=route.at(-1);
  assert(nav.lastReached,`${JSON.stringify(p)} disconnected`);assert(end&&Math.hypot(end.x-p.x,end.z-p.z)<1.6&&Math.abs(end.y-p.y)<.06);
  assert(route.every((node,i)=>i===0||nav.walkable(route[i-1],node)));
 }
 const r=rendererFixture();r.arena=a;r.buildWorld();assert(r.worldBatches.length<280);assert(a.blocks.length<a.info.colliderBudget);assert(a.decor.length<a.info.decorBudget);
 assert.equal(new Game({map:15,mode:'tdm'},{seed:4}).actors.length,8);
});
test('generation-stamped searches reuse their heap and remain correct after repeated goals and rollover',()=>{
 const a=new Arena(15),nav=new Navigation(a),ids=nav.heapIds,scores=nav.heapScores;
 for(let i=0;i<20;i++)for(const point of a.objectives){const route=nav.path(a.spawns[i%a.spawns.length],point);assert(nav.lastReached);assert(route.length);}
 assert.equal(nav.heapIds,ids);assert.equal(nav.heapScores,scores);
 nav.searchId=0xffffffff;assert(nav.path(a.spawns[0],a.objectives[1]).length);assert.equal(nav.searchId,1);assert(nav.lastReached);
});
test('allocation-free bullet broadphase matches the original hitboxes on random and vertical rays',()=>{
 const random=rng(177),arena={trace:(o,d,t)=>({t,block:null})},g=new Game({}, {seed:177}),shooter=g.player,weapon=new Weapon(0);
 const oldHit=(origin,dir)=>{let target=null,part='body',t=140;for(const a of g.actors){if(a===shooter||a.dead)continue;const h=a.height;
  for(const b of [{x:a.x,y:a.y+h-.16,z:a.z,w:.36,h:.33,d:.36,part:'head'},{x:a.x,y:a.y+h*.57,z:a.z,w:.55,h:h*.52,d:.38,part:'body'},{x:a.x,y:a.y+h*.2,z:a.z,w:.43,h:h*.4,d:.36,part:'leg'}]){const hit=rayBox(origin,dir,b,t);if(hit!==null&&hit<t){t=hit;target=a;part=b.part;}}
 }return {target,part,t};};
 for(let i=0;i<2000;i++){
  for(const a of g.actors)Object.assign(a,{x:(random()-.5)*20,y:random()*4,z:(random()-.5)*20,crouched:random()>.5,health:100});
  const origin={x:(random()-.5)*10,y:random()*5,z:(random()-.5)*10},dir=i%10===0?{x:0,y:i%20?1:-1,z:0}:{x:random()-.5,y:random()-.5,z:random()-.5},len=Math.hypot(dir.x,dir.y,dir.z);for(const k of ['x','y','z'])dir[k]/=len;
  const expected=oldHit(origin,dir),actual=traceBullet(arena,g.actors,shooter,origin,dir,weapon);assert.equal(actual.target,expected.target);assert.equal(actual.part,expected.part);assert.equal(actual.t,expected.t);
 }
});
