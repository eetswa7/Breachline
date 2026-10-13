import test from 'node:test';
import assert from 'node:assert/strict';
import {grenadeSmokeBillboards} from '../dist/js/particles.js';
import {Game,emptyInput} from '../dist/js/engine.js';

function samples(smokes,quality='high',index=0){
 const points=[],renderer={quality,writeBillboard(i,...values){points.push(values);return i+1;}};
 const count=grenadeSmokeBillboards(renderer,index,smokes);return {points,count};
}
const puff={x:3,y:.12,z:-8,age:4};

test('grenade smoke expands from an emission-sized plume before forming a rolling bank',()=>{
 const birth=samples([{...puff,age:.02}]).points,early=samples([{...puff,age:.3}]).points,mature=samples([{...puff,age:1.3}]).points;
 assert(birth.every(p=>p[4]<1.1),'a fresh grenade must not instantly draw the former 3.7 m smoke wall');
 assert(early[0][3]>birth[0][3]);assert(mature[0][3]>early[0][3]);assert(mature[0][4]>early[0][4]);
 const held=samples([{...puff,age:6}]).points;assert.notEqual(held[0][1],mature[0][1]);assert.notEqual(held[0][3],mature[0][3]);
});

test('smoke quality retains the concealment alpha and fixed existing layer budget',()=>{
 for(const [quality,layers]of [['low',4],['medium',5],['high',6],['ultra',6]]){
  const {points,count}=samples([puff],quality,12);assert.equal(count,12+layers);assert.equal(points.length,layers);
  const transmission=points.reduce((t,p)=>t*(1-p[8]),1);assert(Math.abs(transmission-Math.pow(.2,8))<1e-12);
  assert(points.every(p=>p[8]>=.8&&p[9]>=0&&p[9]<1));
 }
});

test('rolling puffs stay within gameplay lateral radius and previous fragment footprint',()=>{
 for(const age of [.05,.2,.8,1.3,2,5,12,14,15.95])for(const quality of ['low','medium','high','ultra']){
  const {points}=samples([{...puff,age}],quality),radius=Math.min(5.2,age*4);
  for(const p of points){const displacement=Math.hypot(p[0]-puff.x,p[2]-puff.z);assert(displacement+p[3]/2<=radius+1e-12,'camera-facing outer coverage must stay near the authoritative smoke radius');assert(p.every(Number.isFinite));}
  const footprint=points.reduce((area,p)=>area+p[3]*p[4],0);assert(footprint<=points.length*radius*1.7*3.7,'temporal quality must not spend more billboard fragment area');
 }
});

test('visual lifetime fades to zero and malformed or overflowing diagnostic clouds stay bounded',()=>{
 assert.equal(samples([{...puff,age:0}]).points.length,0);assert.equal(samples([{...puff,age:16}]).points.length,0);
 const full=samples([puff]).points[0][8],fade=samples([{...puff,age:14.5}]).points[0][8],end=samples([{...puff,age:15.95}]).points[0][8];assert(full>fade&&fade>end&&end>0);
 assert.equal(samples(Array.from({length:30},()=>puff),'low').points.length,32);
 assert.equal(samples([{...puff,age:NaN},{...puff,x:Infinity}]).points.length,0);
});

test('visual sampling is deterministic, stateless and does not change smoke, collision or equipment',()=>{
 const smoke=Object.freeze({...puff});assert.deepEqual(samples([smoke]),samples([smoke]));
 const game=new Game({mode:'tdm'},{seed:660713});game.arena.blocks=[{x:0,y:-.2,z:0,w:200,h:.4,d:200,ground:true,surface:'concrete'}];game.actors=game.actors.filter(a=>a.id===0||a.id===4);
 const p=game.player,t=game.actors[1];p.reset({x:0,y:0,z:0},0);t.reset({x:0,y:0,z:-8},Math.PI);t.aiClock=10000;t.path=[];game.events=[];
 assert(game.canSee(p,t));game.explode({x:0,y:.12,z:-4,owner:0,kind:'smoke'});game.smokes[0].age=2;
 const before=JSON.stringify({smokes:game.smokes,blocks:game.arena.blocks,grenades:game.grenades,actors:game.actors});samples(game.smokes);assert.equal(JSON.stringify({smokes:game.smokes,blocks:game.arena.blocks,grenades:game.grenades,actors:game.actors}),before);
 assert(!game.canSee(p,t));game.smokes[0].age=13;assert(game.canSee(p,t));game.updateEquipment(3.1);assert.equal(game.smokes.length,0);
 p.equipment='smoke';game.throwGrenade(p);assert.equal(game.grenades.length,1);assert.equal(p.grenades,1);for(let i=0;i<193;i++)game.update(1/120,emptyInput());assert.equal(game.grenades.length,0);assert.equal(game.smokes.length,1);assert(game.events.some(e=>e.type==='smoke'));
 game.paused=true;const paused=JSON.stringify(game.smokes);game.update(.1,emptyInput());assert.equal(JSON.stringify(game.smokes),paused);game.paused=false;game.resetRound();assert.equal(game.smokes.length,0);
});
