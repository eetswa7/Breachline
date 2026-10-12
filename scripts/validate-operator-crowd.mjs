import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from '../dist/vendor/three.module.min.js';
import {fixture} from '../tests/renderer-fixture.mjs';
import {Game} from '../dist/js/engine.js';
import {readRuntimeLibrary} from './asset-parts.mjs';
import {decodeBlenderLibrary,parseBlenderGLB,BlenderAssets} from '../dist/js/blender-assets.js';

const encoded=await readRuntimeLibrary(),manifest=JSON.parse(await readFile('dist/assets/blender/manifest.json'));
const decoded=await decodeBlenderLibrary(encoded.buffer.slice(encoded.byteOffset,encoded.byteOffset+encoded.byteLength));
const assets=new BlenderAssets(parseBlenderGLB(decoded),manifest);
const source=JSON.parse(await readFile('authoring/blender/source/manifest.json'));
const results=[];
for(const quality of ['low','high'])for(const radius of [5,20])for(const policy of ['unbounded','previous','current']){
 const r=fixture(),g=new Game({map:14,mode:'tdm'},{seed:817});
 if(g.actors.length!==g.teamSize*2||g.arena.info.name!=='BLACKSITE')throw Error('Crowd fixture must use the full Blacksite roster');
 g.player.reset({x:0,y:0,z:0},0);g.time=2;r.blenderAssets=assets;r.quality=quality;
 for(let i=1;i<g.actors.length;i++){
  const angle=(i-1)/(g.actors.length-1)*Math.PI*2;
  g.actors[i].reset({x:Math.cos(angle)*radius,y:0,z:Math.sin(angle)*radius},angle);
 }
 r.camera.aspect=874/402;r.camera.fov=55;r.camera.position.set(0,1.66,0);r.camera.lookAt(0,1.66,-10);
 r.camera.updateProjectionMatrix();r.camera.updateMatrixWorld();
 const frustum=new THREE.Frustum().setFromProjectionMatrix(r.worldVP.multiplyMatrices(r.camera.projectionMatrix,r.camera.matrixWorldInverse));
 r.actorBounds=new THREE.Sphere(new THREE.Vector3(),1.5);
 if(policy==='current')r.frustum=frustum;
 if(policy==='previous')r.frustum={intersectsSphere(sphere){
  // Reproduce the previous radius and unconditional twelve-metre exemption
  // with the same current meshes, camera, pose and native weapon detail.
  if(Math.hypot(sphere.center.x,sphere.center.z)<=12)return true;
  sphere.radius=1.5;return frustum.intersectsSphere(sphere);
 }};
 r.updateActors(g);r.uploadDynamic(r.actorBatches);
 let actorBatches=0,actorTriangles=0,nativeWeaponBatches=0,nativeWeaponTriangles=0;
 for(const e of r.actorBatches.values())if(e.used){
  actorBatches++;const tris=(e.mesh.geometry.index?.count??e.mesh.geometry.getAttribute('position').count)/3;
  actorTriangles+=tris*e.used;
  const native=e.slots.slice(0,e.used).filter(p=>p.operatorWeapon).length;
  if(native){nativeWeaponBatches++;nativeWeaponTriangles+=native*tris;}
 }
 results.push({quality,crowdRadius:radius,policy,actorsTotal:g.actors.length,
  actorsRendered:g.actors.slice(1).filter(a=>a.renderParts).length,
  nativeWeapons:g.actors.slice(1).filter(a=>a.renderParts&&a.nativeWeaponVisible).length,
  actorBatches,actorTriangles,nativeWeaponBatches,nativeWeaponTriangles});
}
const report={scope:'Conservative static Blacksite full-roster fixtures with all remote operators evenly distributed around the player. Same native mesh library, 55 degree vertical FOV, 874/402 aspect, standing poses and seed 817 for all three policies. Counts are submitted actor meshes excluding world, effects and first-person gun. Unbounded cases preserve the all-actor worst case; previous cases reproduce the former 12 m culling exemption and 1.5 m distant sphere. No GPU submission or physical iPhone FPS, timing, memory or thermal measurement.',
 actual_iphone_data:false,meshes:assets.geometries.size,
 library:{compressedSha256:manifest.library.sha256,decodedSha256:createHash('sha256').update(new Uint8Array(decoded)).digest('hex'),sourceSha256:source.sha256},
 bodyDetail:{method:'Authored near/far meshes selected by projected 1.8 m body height, independently of whole-equipment omission. Rig, silhouette and sewn affiliation patches retained.',pixels:{low:110,medium:85,high:70,ultra:60},hysteresis:{enterFar:1.12,restoreNear:.88},preparationRetainsNear:true},
 envelope:{centreY:.9,liveRadius:2,fallingRadius:2.5,unconditionalCloseRange:3,prepareMatchBypasses:true},results};
const release=/const RELEASE='(\d+)'/.exec(await readFile('dist/js/boot.js','utf8'))[1];
const output=process.argv[2]??`docs/validation-release${release}-operator-crowd.json`;
await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output,results}));
