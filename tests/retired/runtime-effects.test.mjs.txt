import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.min.js';
import {weatherParticles} from '../dist/js/particles.js';
import {DecalSystem} from '../dist/js/decal-system.js';
import {EnvironmentProbes} from '../dist/js/environment-probes.js';
import {stageTextureUploads} from '../dist/js/production-textures.js';

test('weather selects distinct precipitation silhouettes instead of concrete chips',()=>{
 const renderer={quality:'medium',eye:{x:3,y:2,z:1},weatherYaw:.7,weatherPitch:.25};
 renderer.arena={info:{id:11,weather:'rain'},indoors:()=>false};
 const rain=weatherParticles(renderer,5);assert(rain.length>0);assert(rain.every(p=>p.kind===5&&p.sizeY>20*p.sizeX));
 renderer.arena={info:{id:8},indoors:()=>false};
 const snow=weatherParticles(renderer,5);assert(snow.length>0);assert(snow.every(p=>p.kind===6));
 renderer.arena={info:{id:9},indoors:()=>false};
 assert(weatherParticles(renderer,5).every(p=>p.kind===7));
 renderer.arena.indoors=()=>true;assert.deepEqual(weatherParticles(renderer,5),[]);
});

test('material impact colours share one draw, preserve the struck normal and stay idle',()=>{
 const scene=new THREE.Scene(),decals=new DecalSystem(scene,2),matrix=new THREE.Matrix4();
 assert(decals.mesh.instanceColor,'impact shader interface must exist before the first hit');
 const normal=new THREE.Vector3(.3,.2,.7).normalize(),point={x:1,y:2,z:3};
 decals.add(point,normal,'steel');decals.add(point,normal,'concrete');decals.update(0);
 assert.equal(scene.children.length,1);assert.equal(decals.mesh.count,2);
 const metal=new THREE.Color(),concrete=new THREE.Color();decals.mesh.getColorAt(0,metal);decals.mesh.getColorAt(1,concrete);
 assert(!metal.equals(concrete));
 for(let i=0;i<2;i++){
  decals.mesh.getMatrixAt(i,matrix);
  const direction=new THREE.Vector3(0,0,1).transformDirection(matrix);
  assert(direction.dot(normal)>.99999,'stamp twist must stay in the struck plane');
 }
 const matrixVersion=decals.mesh.instanceMatrix.version,colorVersion=decals.mesh.instanceColor.version;
 decals.update(1);assert.equal(decals.mesh.instanceMatrix.version,matrixVersion);assert.equal(decals.mesh.instanceColor.version,colorVersion);
 decals.add(point,normal,'wood');decals.update(0);assert.equal(decals.mesh.count,2);
 decals.update(20);assert.equal(decals.mesh.count,0);assert.deepEqual(point,{x:1,y:2,z:3});decals.dispose();
});

test('runtime precipitation reuses its bounded pool and matches diagnostic samples',()=>{
 const renderer={quality:'high',eye:{x:2,y:3,z:-1},weatherYaw:.7,weatherPitch:.4,arena:{info:{id:11,weather:'rain'},indoors:()=>false}};
 const pool={active:[],slots:Array.from({length:36},()=>({color:[0,0,0]}))};
 const first=weatherParticles(renderer,2,pool),entry=first[0],color=entry.color;
 assert.deepEqual(first,weatherParticles(renderer,2));
 const next=weatherParticles(renderer,5,pool);assert.equal(next,first);assert.equal(next[0],entry);assert.equal(next[0].color,color);
 assert.deepEqual(next,weatherParticles(renderer,5));renderer.quality='low';assert.equal(weatherParticles(renderer,6,pool).length,10);
 renderer.arena.info={id:0};assert.equal(weatherParticles(renderer,7,pool).length,0);
});

test('static room reflection storage is reused when switching outdoor maps',()=>{
 let captures=0,disposed=0;
 const probes=Object.create(EnvironmentProbes.prototype);
 Object.assign(probes,{clouds:null,sky:null,target:null,interior:null,generator:{
  fromEquirectangular(){captures++;return {texture:new THREE.Texture(),dispose(){disposed++;}};},dispose(){}
 }});
 const info={sun:[.7,.8,.2],sky:[.2,.3,.4],fog:[.3,.4,.5]};
 probes.setArena(info);const room=probes.interior;
 probes.setArena({...info,weather:'rain'});
 assert.equal(captures,3);assert.equal(probes.interior,room);assert.equal(disposed,1);
 probes.dispose();assert.equal(disposed,3);
});

test('large fallback uploads yield by byte cost and shared textures upload once',async()=>{
 const make=size=>({image:{width:size,height:size},generateMipmaps:false}),a=make(512),b=make(512),large=make(1024);
 const batches=[[]],renderer={initTexture:t=>batches.at(-1).push(t)};
 const result=await stageTextureUploads(renderer,[a,b,a,large],{budgetBytes:2*1048576,yieldFrame:async()=>{batches.push([]);}});
 assert.deepEqual(batches,[[a,b],[large]]);assert.equal(result.uploadedBytes,6*1048576);assert.equal(result.batches,2);
 assert.deepEqual(await stageTextureUploads({},[large]),{uploadedBytes:0,batches:0});
});
