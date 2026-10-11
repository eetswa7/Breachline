import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../dist/vendor/three.module.min.js';
import {SolidWallOcclusion,wallOccludesBox,shadowUpdatePending} from '../dist/js/solid-wall-occlusion.js';
import {fixture} from './renderer-fixture.mjs';
import {Game} from '../dist/js/engine.js';
import {readRuntimeLibrary} from '../scripts/asset-parts.mjs';
import {decodeBlenderLibrary,parseBlenderGLB,BlenderAssets} from '../dist/js/blender-assets.js';

const encoded=await readRuntimeLibrary(),manifest=JSON.parse(await readFile('dist/assets/blender/manifest.json'));
const assets=new BlenderAssets(parseBlenderGLB(await decodeBlenderLibrary(encoded.buffer.slice(encoded.byteOffset,encoded.byteOffset+encoded.byteLength))),manifest);
const eye={x:0,y:1.66,z:0},actor={x:0,y:0,z:-12},wall=(extra={})=>({x:0,y:3,z:-5,w:12,h:6,d:.4,surface:'concrete',...extra});
function occluders(parts,geometry='wall__near',material=new THREE.MeshStandardMaterial()){
 return new SolidWallOcclusion([{geometry:assets.geometries.get(geometry),material,userData:{parts}}]);
}

test('one closed slab hides the complete live/falling envelope and restores destroyed cover immediately',()=>{
 const p=wall(),occlusion=occluders([p]);assert(occlusion.hidden(actor,eye));
 assert(occlusion.hidden({...actor,z:-15,dead:true},eye),'larger leaning-death envelope is still fully covered');
 p.destroyed=true;assert(!occlusion.hidden(actor,eye));p.destroyed=false;assert(occlusion.hidden(actor,eye));
 p.invisible=true;assert(!occlusion.hidden(actor,eye));
});

test('door/window holes and disconnected corner hits cannot masquerade as solid coverage',()=>{
 // The centre sees a genuine door even when corners hit its wings/header.
 const doors=[wall({x:-5,w:6}),wall({x:5,w:6}),wall({y:5.5,h:1})];
 assert(!occluders(doors).hidden(actor,eye));
 // An opening surrounds the eye line between a solid sill and lintel.
 const windows=[wall({y:.5,h:1}),wall({y:4.5,h:3}),wall({x:-5,w:6}),wall({x:5,w:6})];
 assert(!occluders(windows).hidden(actor,eye));
 // Even a tiny gap prevents proof across separate adjacent slabs.
 assert(!occluders([wall({x:-3.05,w:6}),wall({x:3.05,w:6})]).hidden(actor,eye));
});

test('the whole held-weapon margin stays visible at wall edges and near the camera',()=>{
 const occlusion=occluders([wall()]);
 assert(!occlusion.hidden({...actor,x:12},eye),'body centre ray is blocked but equipment envelope crosses the edge');
 assert(!occlusion.hidden({...actor,z:-5.5},eye),'an actor overlapping the slab is visible');
 assert(!occlusion.hidden(actor,{...eye,z:-4.7}),'camera near the slab bypasses occlusion');
 assert(!occlusion.hidden(actor,{...eye,z:-5}),'camera inside the slab bypasses occlusion');
 assert(!occlusion.hidden({...actor,z:-2},eye),'foreground actors are not behind the wall');
 const side=occluders([wall({x:-5,z:0,w:.4,d:12})]);
 assert(side.hidden({...actor,x:-12,z:0},eye),'both wall orientations work');
 assert(occlusion.hidden({...actor,z:8},{...eye,z:-12}),'the opposite opaque face works');
});

test('facades, apertures, glass, broken, alpha-tested and rotated meshes never enter the trusted wall set',()=>{
 for(const geometry of ['building_industrial__near','doorway_surround__near','aperture_frame__near','barrier_x__near'])
  assert.equal(occluders([wall()],geometry).walls.length,0);
 for(const extra of [{surface:'glass'},{invisible:true},{breakable:true},{fence:true},{renderMicroDetail:true},{blenderWind:true},{yaw:.01},{pitch:.01},{roll:.01}])
  assert.equal(occluders([wall(extra)]).walls.length,0);
 for(const options of [{transparent:true},{opacity:.8},{alphaTest:.5},{wireframe:true}])
  assert.equal(occluders([wall()],'wall__near',new THREE.MeshStandardMaterial(options)).walls.length,0);
});

test('trusted inner wall faces remain opaque in both shipped native LOD meshes',()=>{
 // Shoot through a grid over every core face using the actual triangles. This
 // guards the analytic contract if an artist later hollows/chips the wall kit.
 for(const name of ['wall__near','wall__far']){
  const mesh=new THREE.Mesh(assets.geometries.get(name),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
  mesh.updateMatrixWorld(true);const raycaster=new THREE.Raycaster();
  for(const axis of [0,1,2])for(const sign of [-1,1])for(let u=0;u<=12;u++)for(let v=0;v<=12;v++){
   const dimensions=[.94,.94,.76],target=new THREE.Vector3(),origin=new THREE.Vector3();
   const along=(axis+1)%3,vertical=(axis+2)%3;
   target.setComponent(axis,sign*dimensions[axis]/2);
   target.setComponent(along,(u/12-.5)*dimensions[along]);
   target.setComponent(vertical,(v/12-.5)*dimensions[vertical]);
   origin.copy(target).setComponent(axis,sign*2);
   raycaster.set(origin,target.clone().sub(origin).normalize());
   const hit=raycaster.intersectObject(mesh)[0];
   assert(hit&&hit.distance<=origin.distanceTo(target)+1e-5,`${name} axis ${axis} ${u},${v} solid core`);
  }
 }
});

test('projected corner proof covers every sampled interior point of the actor box',()=>{
 const p=wall(),occlusion=occluders([p]),slab=occlusion.walls[0];
 assert(wallOccludesBox(slab,eye,-2,-1.1,-14,2,2.9,-10));
 for(let x=-2;x<=2;x+=.25)for(let y=-1.1;y<=2.9;y+=.25)for(let z=-14;z<=-10;z+=.25)
  assert(wallOccludesBox(slab,eye,x,y,z,x,y,z),'convex projection never leaves the same rectangle');
});

test('scheduled and forced shadow refreshes bypass occlusion and keep original caster buffers',()=>{
 const renderer={renderer:{shadowMap:{enabled:true,autoUpdate:false,needsUpdate:false}},sun:{shadow:{needsUpdate:false}},shadowClock:0};
 assert(!shadowUpdatePending(renderer,1/60,24));renderer.shadowClock=.025;assert(shadowUpdatePending(renderer,1/60,24));
 renderer.shadowClock=0;renderer.renderer.shadowMap.needsUpdate=true;assert(shadowUpdatePending(renderer,0,24));
 renderer.renderer.shadowMap.needsUpdate=false;renderer.sun.shadow.needsUpdate=true;assert(shadowUpdatePending(renderer,0,24));
 renderer.renderer.shadowMap.enabled=false;assert(!shadowUpdatePending(renderer,1,24));
 const r=fixture(),g=new Game({map:14,mode:'tdm'},{seed:817});g.actors=g.actors.slice(0,2);
 g.player.reset({x:0,y:0,z:0},0);g.actors[1].reset(actor,0);g.time=2;
 r.camera.position.set(eye.x,eye.y,eye.z);r.blenderAssets=assets;r.solidWallOcclusion=occluders([wall()]);
 r.updateActors(g);r.uploadDynamic(r.actorBatches);assert.equal(r.actorOccluded,1);assert([...r.actorBatches.values()].every(e=>e.mesh.count===0));
 r.actorOcclusionAllowed=false;r.updateActors(g);r.uploadDynamic(r.actorBatches);
 const count=[...r.actorBatches.values()].reduce((n,e)=>n+e.used,0);assert(count>20);
 assert([...r.actorBatches.values()].filter(e=>e.used).every(e=>e.mesh.castShadow),'shadow refresh retains every original caster');
 r.actorOcclusionAllowed=true;r.updateActors(g,true);r.uploadDynamic(r.actorBatches);
 assert.equal(r.actorOccluded,0,'preparation bypasses occlusion');
 assert([...r.actorBatches.values()].reduce((n,e)=>n+e.used,0)>20,'preparation retains the whole rig while selecting native detail');
 g.actors[1].nativeWeaponVisible=false;
 r.solidWallOcclusion.walls[0].part.destroyed=true;r.updateActors(g);r.uploadDynamic(r.actorBatches);
 assert.equal([...r.actorBatches.values()].reduce((n,e)=>n+e.used,0),count,'destroyed wall restores all body and weapon slots');
});

test('normal render scheduling rebuilds identical live actor buffers before a sunlight refresh',()=>{
 const r=fixture(),g=new Game({map:14,mode:'tdm'},{seed:817});g.actors=g.actors.slice(0,2);
 g.player.reset({x:0,y:0,z:0},0);g.actors[1].reset({...actor,z:-15},0);g.time=2;
 r.blenderAssets=assets;r.solidWallOcclusion=occluders([wall()]);
 r.applyQuality=()=>{};r.resize=()=>874/402;r.updateEffects=()=>{};r.updateLighting=()=>{};r.renderWeapon=()=>{};
 Object.assign(r.renderer.shadowMap,{enabled:true,autoUpdate:false,needsUpdate:false});r.sun.shadow.needsUpdate=false;
 const snapshot=()=>[...r.actorBatches.values()].filter(e=>e.used).map(e=>({name:e.mesh.geometry.name,count:e.used,
  matrices:[...e.mesh.instanceMatrix.array.slice(0,e.used*16)],colours:[...e.mesh.instanceColor.array.slice(0,e.used*3)]}));
 r.shadowClock=1;r.render(g,0);assert.equal(r.actorOccluded,0);const original=snapshot();assert(original.length>0);
 r.shadowClock=0;r.render(g,1/60);assert.equal(r.actorOccluded,1);assert.deepEqual(snapshot(),[]);
 r.shadowClock=.05;r.render(g,1/60);assert.equal(r.actorOccluded,0);assert.deepEqual(snapshot(),original,'same main-view caster transforms and team colours return before scheduled shadows');
});
