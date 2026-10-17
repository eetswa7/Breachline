import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.min.js';
import {fixture} from './renderer-fixture.mjs';
import {Arena} from '../dist/js/maps.js';
import {SceneLOD,detailVisible,actorDetailLevel} from '../dist/js/scene-lod.js';
import {weaponPose,sightHeight} from '../dist/js/aim.js';
import {Weapon} from '../dist/js/weapons.js';
import {orientWeaponEnvironment} from '../dist/js/environment-probes.js';
import {DecalSystem} from '../dist/js/decal-system.js';
import {ambientDust,weatherParticles} from '../dist/js/particles.js';

test('detail thresholds use hysteresis to avoid boundary flicker',()=>{
 assert.equal(detailVisible(true,.8),true);assert.equal(detailVisible(false,.8),false);
 assert.equal(detailVisible(true,.5),false);assert.equal(detailVisible(false,1),true);
 assert.equal(actorDetailLevel(0,40,38),0);assert.equal(actorDetailLevel(1,40,38),1);
 assert.equal(actorDetailLevel(1,30,38),0);assert.equal(actorDetailLevel(0,45,38),1);
});
test('world LOD preserves structural cover, restores close details and skips unchanged uploads',()=>{
 const r=fixture();r.arena=new Arena(0);r.buildWorld();r.height=390;r.eye={x:120,y:2,z:120};r.camera.fov=55;
 const lod=new SceneLOD();lod.update(r,1);let removed=0,detail;
 for(const b of r.worldBatches){const kept=b.userData.lodParts??b.userData.parts;
  for(const p of b.userData.parts)if(!kept.includes(p)){assert(p.renderMicroDetail);removed++;detail??=p;}
 }
 assert(removed>0);r.eye={x:detail.x,y:detail.y,z:detail.z};lod.update(r,1);
 const batch=r.worldBatches.find(b=>b.userData.parts.includes(detail));assert(batch.userData.lodParts.includes(detail));
 const versions=r.worldBatches.map(b=>b.instanceMatrix.version);lod.update(r,1);
 assert.deepEqual(r.worldBatches.map(b=>b.instanceMatrix.version),versions);
});
test('weapon inertia is restrained and fully aimed sights stay centred',()=>{
 const p={weapon:new Weapon(0),ads:0,vx:0,vz:0,yaw:0,pitch:0,landKick:0,sprinting:false};
 weaponPose(p,1,true);p.yaw=.04;p.pitch=.02;p.landKick=.1;
 const pose=weaponPose(p,1+1/60,true);assert(p.viewModel.inertiaX!==0);assert(Math.abs(pose.x-.22)<.025);
 p.ads=1;for(const t of [1.05,2,3,10]){const a=weaponPose(p,t,true);assert.equal(a.x,0);assert.equal(a.y,-sightHeight(p.weapon));assert.equal(a.roll,0);assert(Object.values(a).every(Number.isFinite));}
});
test('weapon probe rotation compensates the Three r180 environment convention',()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();camera.rotation.set(.35,1.2,0,'YXZ');camera.updateMatrixWorld();orientWeaponEnvironment(scene,camera);
 const e=scene.environmentRotation,shaderRotation=new THREE.Euler(-e.x,-e.y,-e.z,'XYZ'),m=new THREE.Matrix4().makeRotationFromEuler(shaderRotation);
 for(let i=0;i<16;i++)assert(Math.abs(m.elements[i]-camera.matrixWorld.elements[i])<1e-6);
});
test('impact decals are capped, surface-aligned and idle without uploads',()=>{
 const scene=new THREE.Scene(),decals=new DecalSystem(scene,8);
 for(let i=0;i<12;i++)decals.add({x:i,y:1,z:0},{x:1,y:0,z:0});decals.update(0);
 assert.equal(decals.mesh.count,8);assert.equal(decals.mesh.geometry.index.count,6);assert(!decals.mesh.castShadow);assert(!decals.mesh.material.transparent);
 const matrix=new THREE.Matrix4();decals.mesh.getMatrixAt(0,matrix);assert(new THREE.Vector3(0,0,1).transformDirection(matrix).x>.99);
 const version=decals.mesh.instanceMatrix.version;decals.update(.1);assert.equal(decals.mesh.instanceMatrix.version,version);
 decals.update(18);assert.equal(decals.mesh.count,0);decals.dispose();assert.equal(scene.children.length,0);
});
test('ambient dust stays inside lit rooms and shares a bounded billboard pool',()=>{
 const r={nearestLights:[{x:0,y:3,z:0}],weaponLampVisible:true,quality:'ultra',arena:{indoors:()=>true},eye:{},writeBillboard:n=>Math.min(280,n+1)};
 assert.equal(ambientDust(r,200,1),210);r.quality='medium';assert.equal(ambientDust(r,200,1),200);
 r.quality='high';assert.equal(ambientDust(r,200,1),206);r.weaponLampVisible=false;assert.equal(ambientDust(r,200,1),200);
});
test('map weather is deterministic, view-local, quality bounded and absent under roofs',()=>{
 const r={quality:'high',arena:{info:{id:8},indoors:()=>false},eye:{x:4,y:2,z:-3},weatherYaw:.7,weatherPitch:.1};
 const first=weatherParticles(r,12),again=weatherParticles(r,12),later=weatherParticles(r,13);
 assert.equal(first.length,14);assert.deepEqual(first,again);assert.notDeepEqual(first,later);
 for(const p of first){assert(Object.values(p).filter(v=>typeof v==='number').every(Number.isFinite));assert(p.y>r.eye.y-8&&p.y<r.eye.y+12);}
 r.quality='low';assert.equal(weatherParticles(r,12).length,5);r.quality='ultra';assert.equal(weatherParticles(r,12).length,18);
 r.arena={info:{id:0},indoors:()=>false};assert.deepEqual(weatherParticles(r,12),[]);
 r.arena={info:{id:9},indoors:()=>true};assert.deepEqual(weatherParticles(r,12),[]);
});
