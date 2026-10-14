import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../dist/vendor/three.module.min.js';
import {decodeBlenderLibrary,parseBlenderGLB,BlenderAssets} from '../dist/js/blender-assets.js';
import {readRuntimeLibrary} from '../scripts/asset-parts.mjs';
import {fixture} from './renderer-fixture.mjs';
import {Arena,MAPS} from '../dist/js/maps.js';

const packed=await readRuntimeLibrary(),manifest=JSON.parse(await readFile('dist/assets/blender/manifest.json','utf8'));
const buffer=await decodeBlenderLibrary(packed.buffer.slice(packed.byteOffset,packed.byteOffset+packed.byteLength)),geometries=parseBlenderGLB(buffer);
const rawNearStrataSphere=geometries.get('strata__near').boundingSphere.clone();
const originalResources=new Map([...geometries].map(([name,g])=>[name,{geometry:g,box:g.boundingBox,sphere:g.boundingSphere,attributes:{...g.attributes},index:g.index}]));
const assets=new BlenderAssets(geometries,manifest),point=new THREE.Vector3(),matrix=new THREE.Matrix4();

function vertexOverflow(geometry,sphere,transform=null){
 const positions=geometry.getAttribute('position');let overflow=-Infinity;
 for(let i=0;i<positions.count;i++){point.fromBufferAttribute(positions,i);if(transform)point.applyMatrix4(transform);overflow=Math.max(overflow,point.distanceTo(sphere.center)-sphere.radius);}
 return overflow;
}

function assertBatchBounds(batches){
 for(const batch of batches){
  const part=batch.userData.parts[0],near=assets.geometry(part,'world'),far=assets.geometry(part,'world',true);
  for(let i=0;i<batch.count;i++){
   batch.getMatrixAt(i,matrix);
   // A dormant LOD must be covered too: swapping it in cannot extend outside
   // the retained batch sphere or world box.
   for(const geometry of new Set([near,far].filter(Boolean))){
    assert(vertexOverflow(geometry,batch.boundingSphere,matrix)<=1e-6,`${batch.geometry.name} instance ${i} omits an authored LOD vertex`);
    const positions=geometry.getAttribute('position');for(let j=0;j<positions.count;j++){point.fromBufferAttribute(positions,j).applyMatrix4(matrix);assert(batch.boundingBox.containsPoint(point),`${batch.geometry.name} omits an authored LOD vertex from its world box`);}
   }
  }
 }
}

test('the actual far strata silhouette requires expanded bounds without replacing render resources',()=>{
 assert(vertexOverflow(geometries.get('strata__far'),rawNearStrataSphere)>.01,'the shipped asset must reproduce the non-nested silhouette');
 assert.equal(assets.geometries,geometries);assert.equal(geometries.size,originalResources.size);
 for(const [name,g] of geometries){const before=originalResources.get(name);assert.equal(g,before.geometry);assert.equal(g.boundingSphere,before.sphere);assert.equal(g.boundingBox,before.box);assert.equal(g.index,before.index);assert.deepEqual(g.attributes,before.attributes);}
});

test('every shipped near/far mesh remains enclosed under translated, rotated and nonuniform instance transforms',()=>{
 const transforms=[new THREE.Matrix4(),new THREE.Matrix4().compose(new THREE.Vector3(28.45,1.14,-49.33),new THREE.Quaternion().setFromEuler(new THREE.Euler(.23,-.54,.17,'YXZ')),new THREE.Vector3(2.6,.3,4.7)),new THREE.Matrix4().compose(new THREE.Vector3(-34.29,2.01,38.55),new THREE.Quaternion().setFromEuler(new THREE.Euler(-.31,.88,-.42,'YXZ')),new THREE.Vector3(.45,7.4,1.9))];
 let pairs=0;
 for(const [name,near] of geometries){
  if(!name.endsWith('__near'))continue;const far=geometries.get(name.slice(0,-6)+'__far');if(!far)continue;pairs++;
  for(const geometry of [near,far])for(const transform of transforms){
   for(const boundOwner of [near,far]){
    const sphere=boundOwner.boundingSphere.clone().applyMatrix4(transform),box=boundOwner.boundingBox.clone().applyMatrix4(transform);
    assert(vertexOverflow(geometry,sphere,transform)<=1e-6,`${name} failed ${geometry.name} under a transformed sphere`);
    const positions=geometry.getAttribute('position');for(let i=0;i<positions.count;i++){point.fromBufferAttribute(positions,i).applyMatrix4(transform);assert(box.containsPoint(point),`${name} failed ${geometry.name} under a transformed box`);}
   }
  }
 }
 assert(pairs>20,'the regression must cover the real authored world kit');
});

test('actual strata batches on every map retain both silhouettes through LOD swaps and destruction recomputation',()=>{
 let mapsWithStrata=0,changedGeometry=0,reproducedOldOverflow=0;
 for(const map of MAPS){
  const r=fixture();r.blenderAssets=assets;r.arena=new Arena(map.id);r.buildWorld();const rocks=r.worldBatches.filter(b=>b.userData.parts[0]?.mesh==='strata');if(!rocks.length)continue;mapsWithStrata++;
  const resourceCount=r.worldBatches.length,bounds=new Map(rocks.map(b=>[b,b.boundingSphere.clone()]));
  for(const batch of rocks)for(let i=0;i<batch.count;i++){batch.getMatrixAt(i,matrix);const old=rawNearStrataSphere.clone().applyMatrix4(matrix);if(vertexOverflow(assets.geometry(batch.userData.parts[0],'world',true),old,matrix)>.001)reproducedOldOverflow++;}
  assertBatchBounds(rocks);
  r.camera.position.set(300,2,300);assets.lodClock=0;assets.updateLOD(r,0);assertBatchBounds(rocks);
  for(const batch of rocks){if(batch.userData.blenderFar)changedGeometry++;assert(batch.boundingSphere.equals(bounds.get(batch)),'a swap keeps its conservative batch sphere');}
  const survivor=rocks.find(b=>b.count>1),destroyed=survivor??rocks[0],part=destroyed.userData.parts[0];part.destroyed=true;r.refreshDestroyed();
  assert.equal(r.worldBatches.length,resourceCount,'bounds and destruction allocate no new world batches');assert.equal(destroyed.count,destroyed.userData.parts.length-1);assertBatchBounds(rocks.filter(b=>b.count>0));
  if(survivor){const remaining=survivor.userData.parts.find(p=>!p.destroyed);r.camera.position.set(remaining.x,remaining.y,remaining.z);assets.lodClock=0;assets.updateLOD(r,0);assertBatchBounds([survivor]);}
 }
 assert(mapsWithStrata>=2);assert(changedGeometry>=2);assert(reproducedOldOverflow>=2,'actual placed assets must exercise the old near-only omission');
});
