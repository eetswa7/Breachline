import test from 'node:test';
import assert from 'node:assert/strict';
import {Arena,MAPS} from '../dist/js/maps.js';
import {Game,emptyInput} from '../dist/js/engine.js';
import {rng,direction} from '../dist/js/math.js';
import {beginVault,advanceVault} from '../dist/js/traversal.js';
import {movementFov,weaponPose} from '../dist/js/aim.js';

test('grid ray traversal exactly preserves hits, ground and destroyed cover across every map',()=>{
 let tested=0,full=0;
 for(const map of MAPS){
  const arena=new Arena(map.id),random=rng(429+map.id);
  for(let i=0;i<750;i++){
   const o={x:(random()-.5)*map.size*2.8,y:-.2+random()*12,z:(random()-.5)*map.size*2.8};
   const d=i%15===0?{x:0,y:-1,z:0}:i%17===0?{x:1,y:0,z:0}:direction(random()*Math.PI*2,(random()-.5)*2.8);
   const limit=.1+random()*180,actual=arena.trace(o,d,limit);tested+=arena.rayGrid.tested;full+=arena.blocks.length;
   const cells=arena.collisionCells;arena.collisionCells=null;const expected=arena.trace(o,d,limit);arena.collisionCells=cells;
   assert.equal(actual.t,expected.t,`${map.name} ray ${i}`);assert.equal(actual.block,expected.block);
   if(i===300){const b=arena.blocks.find(b=>!b.ground&&!b.roof);b.destroyed=true;}
  }
 }
 assert(tested<full*.3,`Candidate budget ${tested}/${full}`);
});

test('ray grid preserves overlapping hit order, exact corners and changed collision arrays',()=>{
 const a=new Arena(0);a.blocks=[];
 const first=a.box(0,1,-3,2,2,2);a.box(0,1,-3,2,2,2);a.bakeCollision();
 assert.equal(a.trace({x:0,y:1,z:0},{x:0,y:0,z:-1}).block,first);
 for(const o of [{x:-2,y:1,z:0},{x:-1,y:1,z:0},{x:0,y:1,z:-3}]){
  const actual=a.trace(o,{x:1,y:0,z:-1});a.collisionCells=null;assert.deepEqual(a.trace(o,{x:1,y:0,z:-1}),actual);a.bakeCollision();
 }
 a.box(0,1,-1,1,2,.1);assert.equal(a.trace({x:0,y:1,z:0},{x:0,y:0,z:-1}).t,.95);
});

const course=()=>{
 const g=new Game({}, {seed:42});g.actors=[g.player];g.arena.blocks=[];
 g.arena.box(0,-.2,0,100,.4,100,'concrete',{ground:true});g.arena.box(0,.5,-1,1,1,1);
 g.arena.bakeCollision();g.player.reset({x:0,y:0,z:0},0);return g;
};
test('vault crosses low cover with valid capsules and returns to grounded play',()=>{
 const g=course(),p=g.player;assert(beginVault(p,g.arena,0,-1));
 for(let i=0;i<30&&p.vault;i++){
  assert(advanceVault(p,g.arena,1/60));assert(!g.arena.collides({...p,y:p.y+.04},.31,1.74));
 }
 assert(!p.vault&&p.grounded);assert.equal(p.y,1);assert(p.z<-.8);
});
test('vault refuses tall walls, occupied landings and low ceilings',()=>{
 for(const kind of ['tall','occupied','ceiling']){
  const g=course(),p=g.player;
  if(kind==='tall'){g.arena.blocks[1].h=2.4;g.arena.blocks[1].y=1.2;}
  if(kind==='occupied')g.arena.box(0,2,-1.15,1,2,.5);
  if(kind==='ceiling')g.arena.box(0,2,0,3,.3,3,'concrete',{roof:true});
  g.arena.bakeCollision();assert(!beginVault(p,g.arena,0,-1),kind);
 }
});
test('jump releases a slide and spawn reset clears traversal and weapon animation',()=>{
 const g=course(),p=g.player;p.z=4;p.crouched=true;p.sliding=true;p.slideLeft=.5;
 g.update(1/60,{...emptyInput(),jump:true});assert(!p.sliding&&!p.crouched&&p.vy>0);
 p.vault={};p.viewModel={};p.reset({x:0,y:0,z:0},0);assert.equal(p.vault,null);assert.equal(p.viewModel,null);
});
test('sprint FOV settles, freezes when paused and leaves aimed projection exact',()=>{
 const g=course(),p=g.player,state={};p.sprinting=true;
 for(let i=0;i<90;i++)movementFov(state,p,80,1/60);assert(state.offset>4.9);
 const before=state.offset;movementFov(state,p,80,0);assert.equal(state.offset,before);
 p.ads=1;assert.equal(movementFov(state,p,80,1/60),80);
 p.ads=0;assert.equal(movementFov(state,p,80,1/60,false),80);
 p.ads=0;p.sprinting=false;for(let i=0;i<120;i++)movementFov(state,p,80,1/60);assert(state.offset<1e-6);
 p.vault={};const pose=weaponPose(p,0),next=weaponPose(p,.05);assert(next.y<pose.y&&next.pitch>pose.pitch);
});
