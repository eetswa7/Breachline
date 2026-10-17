import test from 'node:test';
import assert from 'node:assert/strict';
import {Arena,MAPS} from '../dist/js/maps.js';
import {ridgeMesh,ridgeTint,coniferMesh,coniferTint,strataRockMesh,strataTint} from '../dist/js/meshes.js';
import {CompatibilityRenderer} from '../dist/js/compatibility-renderer.js';
import {identity} from '../dist/js/math.js';
import {fixture} from './renderer-fixture.mjs';

test('terrain ridges join seamlessly with outward winding and bounded geometry',()=>{
 for(const map of MAPS.filter(m=>m.id!==4)){
  const data=ridgeMesh(map.size,map.id),triangles=data.length/24;
  assert.equal(triangles,64*3*2);
  assert(data.every(Number.isFinite));
  assert(data[4]>.2&&data[5]<0,`${map.name} inward-facing ridge slope`);
  const first=data.slice(0,3),last=data.slice((63*2+1)*24+16,(63*2+1)*24+19);
  assert(Math.hypot(...first.map((v,i)=>v-last[i]))<.0001,`${map.name} terrain seam`);
  for(let i=0;i<data.length;i+=24){
   const a=data.slice(i,i+3),b=data.slice(i+8,i+11),c=data.slice(i+16,i+19);
   const u=b.map((v,j)=>v-a[j]),v=c.map((value,j)=>value-a[j]);
   const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
   assert(cross.reduce((n,value,j)=>n+value*data[i+3+j],0)>0,`${map.name} flipped ridge face`);
  }
 }
});

test('both renderers use a single non-shadowing landscape outside collision',()=>{
 const renderer=fixture();
 for(const info of MAPS){
  const arena=new Arena(info.id);renderer.arena=arena;renderer.buildWorld();
  const ridges=arena.decor.filter(p=>p.mesh==='ridge'),batches=renderer.worldBatches.filter(b=>b.userData.parts.some(p=>p.mesh==='ridge'));
  assert.equal(ridges.length,info.id===4?0:1);assert.equal(batches.length,ridges.length);
  if(batches.length){assert.equal(batches[0].geometry.getAttribute('position').count,64*3*2*3);assert.equal(batches[0].castShadow,false);}
  assert(!arena.blocks.some(p=>p.mesh==='ridge'));
 }
 const arena=new Arena(8),fallback=Object.create(CompatibilityRenderer.prototype);
 fallback.arena=arena;fallback.matrix=identity();fallback.meshes={ridge:ridgeMesh(arena.info.size,arena.info.id)};
 const faces=fallback.box(arena.decor.find(p=>p.mesh==='ridge'));
 assert.equal(faces.length,64*3*2);assert(faces.every(p=>p.landscape));
});

test('ridge elevation adds pale snow caps and stable rock shading in both renderers',()=>{
 const snowBase=ridgeTint(0,8),snowPeak=ridgeTint(20,8),rockBase=ridgeTint(0,3),rockPeak=ridgeTint(20,3);
 assert(snowPeak.every((v,i)=>v>snowBase[i]));
 assert(rockPeak.every((v,i)=>v>rockBase[i]));
 for(const map of MAPS.filter(m=>m.id!==4))for(const y of [-10,0,8,20,30]){
  const color=ridgeTint(y,map.id);assert(color.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
 }
 const renderer=fixture(),arena=new Arena(8);renderer.arena=arena;renderer.buildWorld();
 const ridge=renderer.worldBatches.find(b=>b.userData.parts[0].mesh==='ridge');
 const colors=ridge.geometry.getAttribute('color'),positions=ridge.geometry.getAttribute('position');
 assert.equal(colors.count,positions.count);assert.equal(ridge.material.vertexColors,true);
 assert(colors.array.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
 const low=[],high=[];for(let i=0;i<positions.count;i++)(positions.getY(i)<2?low:positions.getY(i)>16?high:[]).push(colors.getX(i));
 assert(low.length&&high.length);assert(Math.max(...low)<Math.min(...high));
 const fallback=Object.create(CompatibilityRenderer.prototype);
 fallback.arena=arena;fallback.matrix=identity();fallback.meshes={ridge:ridgeMesh(arena.info.size,arena.info.id)};
 const faces=fallback.box(arena.decor.find(p=>p.mesh==='ridge'));
 assert(new Set(faces.map(f=>f.color.map(Math.round).join(','))).size>20);
});

test('Frostline conifers have outward boughs and replace alpha-card canopy',()=>{
 const mesh=coniferMesh();assert.equal(mesh.length/24,45);assert(mesh.every(Number.isFinite));
 for(let i=0;i<mesh.length;i+=24){
  const centre=[0,0,0];for(const offset of [0,8,16])for(let axis=0;axis<3;axis++)centre[axis]+=mesh[i+offset+axis]/3;
  const normal=mesh.slice(i+3,i+6);
  if(normal[1]>-.9)assert(centre[0]*normal[0]+centre[2]*normal[2]>0,'bough faces inward');
 }
 const arena=new Arena(8),conifers=arena.decor.filter(p=>p.mesh==='conifer');
 assert(conifers.length>=15);assert(!arena.decor.some(p=>p.mesh==='leaf'));
 const renderer=fixture();renderer.arena=arena;renderer.buildWorld();
 const batch=renderer.worldBatches.find(b=>b.userData.parts[0].mesh==='conifer');
 assert(batch);assert.equal(batch.geometry.getAttribute('position').count,mesh.length/8);
 const fallback=Object.create(CompatibilityRenderer.prototype);
 fallback.arena=arena;fallback.matrix=identity();fallback.meshes={conifer:mesh};
 assert.equal(fallback.box(conifers[0]).length,45);
});

test('snow-dusted conifers share a finite colour ramp in WebGL and Canvas',()=>{
 const low=coniferTint(-.43),high=coniferTint(.5);
 assert(high.every((v,i)=>v>low[i]&&v<=1));
 const arena=new Arena(8),renderer=fixture();renderer.arena=arena;renderer.buildWorld();
 const crown=renderer.worldBatches.find(b=>b.userData.parts[0].mesh==='conifer');
 const color=crown.geometry.getAttribute('color'),position=crown.geometry.getAttribute('position');
 assert.equal(color.count,position.count);assert.equal(crown.material.vertexColors,true);
 assert(color.array.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
 const fallback=Object.create(CompatibilityRenderer.prototype);
 fallback.arena=arena;fallback.matrix=identity();fallback.meshes={conifer:coniferMesh()};
 const faces=fallback.box(arena.decor.find(p=>p.mesh==='conifer'));
 const top=faces.filter(f=>f.centre.y>arena.decor.find(p=>p.mesh==='conifer').y+1);
 const bottom=faces.filter(f=>f.centre.y<arena.decor.find(p=>p.mesh==='conifer').y-1);
 assert(top.length&&bottom.length);assert(top.some(f=>f.color[0]>bottom[0].color[0]));
});

test('desert outcrops have outward strata and remain visual scenery',()=>{
 const data=strataRockMesh();assert.equal(data.length/24,130);assert(data.every(Number.isFinite));
 for(let i=0;i<data.length;i+=24){
  const a=data.slice(i,i+3),b=data.slice(i+8,i+11),c=data.slice(i+16,i+19);
  const u=b.map((v,j)=>v-a[j]),v=c.map((v,j)=>v-a[j]);
  const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  assert(cross.reduce((sum,n,j)=>sum+n*data[i+3+j],0)>0,'strata face winding');
 }
 for(const id of [2,9]){
  const arena=new Arena(id),stones=arena.decor.filter(p=>p.mesh==='strata');
  assert.equal(stones.length,24);assert(stones.every(p=>p.landscape&&Math.hypot(p.x,p.z)>arena.info.size+12));
  assert(!arena.blocks.some(p=>p.mesh==='strata'));
  const renderer=fixture();renderer.arena=arena;renderer.buildWorld();
  const batches=renderer.worldBatches.filter(b=>b.userData.parts[0].mesh==='strata');
  assert(batches.length>0);assert.equal(batches.reduce((n,b)=>n+b.count,0),24);
  assert(batches.every(b=>!b.castShadow&&b.material.vertexColors&&b.geometry.getAttribute('color').count===390));
 }
 const arena=new Arena(2),fallback=Object.create(CompatibilityRenderer.prototype);
 fallback.arena=arena;fallback.matrix=identity();fallback.meshes={strata:data};
 const faces=fallback.box(arena.decor.find(p=>p.mesh==='strata'));
 assert.equal(faces.length,130);assert(faces.every(f=>f.landscape));
 fallback.meshes.strata=strataRockMesh(5);
 assert.equal(fallback.box(arena.decor.find(p=>p.mesh==='strata')).length,65);
 assert(strataTint(-.4)[0]<strataTint(.4)[0]);
});
