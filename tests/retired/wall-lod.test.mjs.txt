import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../dist/vendor/three.module.min.js';
import {decodeBlenderLibrary,parseBlenderGLB,BlenderAssets} from '../dist/js/blender-assets.js';
import {fixture} from './renderer-fixture.mjs';
import {readRuntimeLibrary} from '../scripts/asset-parts.mjs';
const encoded=await readRuntimeLibrary(),manifest=JSON.parse(await readFile('dist/assets/blender/manifest.json'));
const assets=new BlenderAssets(parseBlenderGLB(await decodeBlenderLibrary(encoded.buffer.slice(encoded.byteOffset,encoded.byteOffset+encoded.byteLength))),manifest);

function wallFixture(part,kind){
 const r=fixture();r.blenderAssets=assets;r.height=600;r.quality='high';r.camera.fov=55;
 const material=new THREE.MeshStandardMaterial(),near=new THREE.InstancedMesh(assets.geometries.get('wall__near'),material,1),far=new THREE.InstancedMesh(assets.geometries.get('wall__far'),material,1);
 near.setMatrixAt(0,r.partMatrix(part));near.setColorAt(0,new THREE.Color());far.setMatrixAt(0,r.partMatrix(part));far.setColorAt(0,new THREE.Color());far.count=0;
 const pair={near,far,parts:[part],canopy:false,visibility:new WeakMap(),...(kind?{kind}:{})};
 near.userData={parts:[part],blenderPair:pair};far.userData={parts:[part],blenderPair:pair};
 r.blenderWorldLODs=[pair];r.worldBatches=[near,far];return {r,pair};
}
const wall=(extra={})=>({x:0,y:1.5,z:0,w:100,h:3,d:.4,surface:'concrete',...extra});
const select=(r,x,y,z)=>{r.camera.position.set(x,y,z);assets.lodClock=0;assets.updateLOD(r,0);};

test('long distant walls keep their casting and use far geometry when tie details are subpixel',()=>{
 // Deliberately omit pair.kind: synthetic fixtures and older pair records still
 // infer the authored wall from the presentation part.
 const p=wall(),{r,pair}=wallFixture(p);select(r,0,1.6,45);
 assert.equal(pair.near.count,0);assert.equal(pair.far.count,1);
 assert(pair.far.geometry.index.count>300,'far retains the detailed casting, not a replacement cube');
 assert(pair.far.geometry.index.count<pair.near.geometry.index.count*.25);
 assert.deepEqual(pair.far.geometry.boundingBox,pair.near.geometry.boundingBox,'structural wall silhouette is unchanged');
 const version=pair.far.instanceMatrix.version;select(r,0,1.6,45);assert.equal(pair.far.instanceMatrix.version,version,'unchanged selection uploads nothing');
});

test('a player beside the near end of a 45 degree long wall retains its authored detail',()=>{
 const yaw=Math.PI/4,p=wall({yaw}),{r,pair}=wallFixture(p,'wall');
 // Compose transforms local X/Z to world X=cX+sZ, Z=-sX+cZ.
 // Its correct inverse must recover this near-edge point rather than measure
 // it against the distant opposing side of the oriented wall box.
 const c=Math.cos(yaw),s=Math.sin(yaw),localX=49,localZ=.8;
 select(r,c*localX+s*localZ,1.6,-s*localX+c*localZ);
 assert.equal(pair.near.count,1);assert.equal(pair.far.count,0);
 assert(pair.near.userData.blenderSelection.includes(p));
});

test('wall feature selection has hysteresis and restores detail for magnified views',()=>{
 const {r,pair}=wallFixture(wall(),'wall');
 select(r,0,1.6,15);assert.equal(pair.near.count,1);
 select(r,0,1.6,15.7);assert.equal(pair.near.count,1,'moving away through the band keeps detail');
 select(r,0,1.6,25);assert.equal(pair.far.count,1);
 select(r,0,1.6,15.7);assert.equal(pair.far.count,1,'moving closer through the same band keeps the far mesh');
 r.camera.fov=25;select(r,0,1.6,25);assert.equal(pair.near.count,1,'zoom resolves the ties and restores geometry');
});

test('wall-specific criteria leave showcase facade selection intact and cannot restore destroyed instances',()=>{
 const p=wall(),{r,pair}=wallFixture(p,'building_industrial');select(r,0,1.6,45);
 assert.equal(pair.near.count,1,'large native facade still uses its existing whole-object projected-size policy');
 p.destroyed=true;select(r,0,1.6,1);assert.equal(pair.near.count+pair.far.count,0);
});
