import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../dist/vendor/three.module.min.js';
import {fixture} from './renderer-fixture.mjs';
import {Game} from '../dist/js/engine.js';
import {Weapon,WEAPONS} from '../dist/js/weapons.js';
import {readRuntimeLibrary} from '../scripts/asset-parts.mjs';
import {decodeBlenderLibrary,parseBlenderGLB,BlenderAssets} from '../dist/js/blender-assets.js';

const encoded=await readRuntimeLibrary(),manifest=JSON.parse(await readFile('dist/assets/blender/manifest.json'));
const assets=new BlenderAssets(parseBlenderGLB(await decodeBlenderLibrary(encoded.buffer.slice(encoded.byteOffset,encoded.byteOffset+encoded.byteLength))),manifest);

function actorFixture(x,z){
 const r=fixture(),g=new Game({map:0,mode:'tdm'},{seed:817});
 g.actors=g.actors.slice(0,2);g.player.reset({x:0,y:0,z:0},0);
 const a=g.actors[1];a.reset({x,y:0,z},0);g.time=2;
 r.blenderAssets=assets;r.quality='high';r.camera.aspect=874/402;r.camera.fov=55;
 r.camera.position.set(0,1.66,0);r.camera.lookAt(0,1.66,-10);
 r.camera.updateProjectionMatrix();r.camera.updateMatrixWorld();
 r.frustum=new THREE.Frustum().setFromProjectionMatrix(r.worldVP.multiplyMatrices(r.camera.projectionMatrix,r.camera.matrixWorldInverse));
 r.actorBounds=new THREE.Sphere(new THREE.Vector3(),1.5);
 return {r,g,a};
}
const instances=r=>[...r.actorBatches.values()].reduce((n,e)=>n+e.used,0);

test('native clothing detail simplifies at distance and restores without losing anatomy or identifiers',()=>{
 const {r,g,a}=actorFixture(0,-5);r.height=600;
 r.updateActors(g);const body=a.renderParts.slice(0,a.operatorBodyCount);
 assert.equal(a.renderBodyLOD,0);
 const near=instances(r);
 a.z=-20;r.updateActors(g);
 assert.equal(a.renderBodyLOD,1);
 for(const i of [0,2,4,7,12,13,26]){
  assert.equal(a.renderParts[i],body[i],'the existing posed rig is reused');
  assert(a.renderParts[i].blenderFar,'authored far anatomy is selected');
  const geometry=assets.geometry(a.renderParts[i],'actor',true);
  assert([...r.actorBatches.values()].some(b=>b.used&&b.mesh.geometry===geometry),'the body part stays visible');
 }
 for(const i of [28,29])assert(a.renderParts[i].actorFar,'sewn affiliation patches remain at distance');
 assert.equal(a.renderIdentifiers.length,2,'duplicate floating arm tabs are removed');
 a.z=-14;r.updateActors(g);assert.equal(a.renderBodyLOD,1,'a small approach does not switch detail repeatedly');
 a.z=-5;r.updateActors(g);assert.equal(a.renderBodyLOD,0);
 assert.equal(instances(r),near,'close geometry and every component restore');
});

test('near operators behind the camera submit no meshes and restore correctly when visible',()=>{
 const {r,g,a}=actorFixture(0,-5);
 r.updateActors(g);r.uploadDynamic(r.actorBatches);const front=instances(r);
 assert(front>20);assert(a.nativeWeaponVisible,'close visible native gun is preserved');
 a.z=5;r.updateActors(g);r.uploadDynamic(r.actorBatches);
 assert.equal(instances(r),0);assert([...r.actorBatches.values()].every(e=>e.mesh.count===0),'old visible instances are removed');
 a.z=-5;r.updateActors(g);r.uploadDynamic(r.actorBatches);
 assert.equal(instances(r),front,'returning to view restores every operator component');
});

test('frustum-edge operators retain held weapons even when their body centre is outside the view',()=>{
 const {r,g,a}=actorFixture(0,-5),halfWidth=5*Math.tan(r.camera.fov*Math.PI/360)*r.camera.aspect;
 a.x=halfWidth+.7;
 assert(!r.frustum.containsPoint(new THREE.Vector3(a.x,a.y+.9,a.z)),'body centre is outside the camera cone');
 r.updateActors(g);assert(instances(r)>20,'the intersecting conservative envelope keeps the whole rig');
 a.x=halfWidth+4;r.updateActors(g);assert.equal(instances(r),0,'the wholly excluded envelope is removed');
});

test('very close actors remain present behind the camera and match preparation bypasses all view culling',()=>{
 const {r,g,a}=actorFixture(0,2.99);
 r.updateActors(g);assert(instances(r)>20,'close safety margin includes actors behind the camera');
 a.z=5;r.updateActors(g);assert.equal(instances(r),0);
 r.updateActors(g,true);assert(instances(r)>20,'preparation populates materials behind the menu camera');
});

test('conservative live and falling envelopes contain the native body and every weapon family',()=>{
 const {r,g,a}=actorFixture(0,-5),matrix=new THREE.Matrix4(),point=new THREE.Vector3();
 let liveMax=0,deathMax=0,samples=0;
 // AABB corners bound every authored vertex. Suppressor/large optic settings,
 // firing recoil, maximum arm pitch, gait, crouch and the leaning death pose
 // exercise the largest envelopes without relying on artificial test meshes.
 for(const def of WEAPONS)for(const config of [{},{optic:3,barrel:1,handling:4,magazine:1}])
 for(const pitch of [-.65,0,.65])for(const crouched of [false,true])for(const death of [0,.18,.35,.65,.94,1.4,2.8]){
  a.weapons[0]=new Weapon(def.id,config);a.pitch=pitch;a.crouched=crouched;
  a.animDuck=crouched?.5:0;a.animSpeed=7;a.vx=7;a.stride=1.5;
  a.health=death?0:100;a.respawnLeft=3-death;
  a.weapon.ammo=0;a.weapon.reload();a.weapon.reloadLeft=a.weapon.reloadTime*.55;a.weapon.sinceShot=0;
  r.updateActors(g);r.uploadDynamic(r.actorBatches);samples++;
  for(const e of r.actorBatches.values())if(e.used){
   const geometry=e.mesh.geometry;geometry.computeBoundingBox();
   for(let i=0;i<e.used;i++){
    e.mesh.getMatrixAt(i,matrix);
    for(const x of [geometry.boundingBox.min.x,geometry.boundingBox.max.x])
    for(const y of [geometry.boundingBox.min.y,geometry.boundingBox.max.y])
    for(const z of [geometry.boundingBox.min.z,geometry.boundingBox.max.z]){
     point.set(x,y,z).applyMatrix4(matrix);
     const distance=Math.hypot(point.x-a.x,point.y-a.y-.9,point.z-a.z);
     assert(distance<r.actorBounds.radius,`${def.name} ${death?'falling':'live'} envelope: ${distance}`);
     if(death)deathMax=Math.max(deathMax,distance);else liveMax=Math.max(liveMax,distance);
    }
   }
  }
 }
 assert.equal(samples,2520);assert(liveMax>1,'native carried-weapon bounds were measured');
 assert(deathMax>liveMax,'full settled deaths require additional space around the standing centre');
});
