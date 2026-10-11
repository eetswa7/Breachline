// Submitted geometry and Node CPU only. This never estimates physical-device FPS.
import {readFile,writeFile} from 'node:fs/promises';
import * as THREE from '../dist/vendor/three.module.min.js';
import {fixture} from '../tests/renderer-fixture.mjs';
import {Game} from '../dist/js/engine.js';
import {readRuntimeLibrary} from './asset-parts.mjs';
import {BlenderAssets,decodeBlenderLibrary,parseBlenderGLB} from '../dist/js/blender-assets.js';
import {direction} from '../dist/js/math.js';
import {verticalFov} from '../dist/js/aim.js';
import {QUALITY} from '../dist/js/graphics-quality.js';
import {framebufferSize} from '../dist/js/render-budget.js';

export const OCCLUSION_VIEWS=[
 {name:'blacksite-approach',x:0,z:27,yaw:0},
 {name:'blacksite-interior',x:0,z:9,yaw:0},
 {name:'blacksite-yard',x:-31,z:25,yaw:-.12},
 {name:'blacksite-oblique',x:12,z:30,yaw:.4},
 {name:'blacksite-services',x:-5.5,z:8,yaw:-.95}
];
export const OCCLUSION_ROSTER=[[-15,-40],[-10,-30],[10,-30],[15,-40],[0,-20],[0,-5],[5,-10],[-5,-10],[-20,0],[20,0],[-38,5],[38,5],[0,15],[-5,18],[5,18]];
export function placeOcclusionFixture(game,shot){
 game.player.reset({x:shot.x,y:0,z:shot.z},shot.yaw);game.time=2;
 for(let i=1;i<game.actors.length;i++){
  const [x,z]=OCCLUSION_ROSTER[i-1];
  if(game.arena.collides({x,y:0,z},.32,1.75))throw Error(`Roster operator ${i} overlaps a collider at ${x},${z}`);
  game.actors[i].reset({x,y:0,z},Math.PI);
 }
}
const percentile=(values,p)=>values.slice().sort((a,b)=>a-b)[Math.floor((values.length-1)*p)];
export function actorCounts(renderer){
 let batches=0,triangles=0,instances=0;
 for(const e of renderer.actorBatches.values())if(e.used){batches++;instances+=e.used;triangles+=e.used*(e.mesh.geometry.index?.count??e.mesh.geometry.getAttribute('position').count)/3;}
 return {batches,triangles,instances,occludedActors:renderer.actorOccluded??0};
}
async function main(){
 const encoded=await readRuntimeLibrary(),manifest=JSON.parse(await readFile('dist/assets/blender/manifest.json'));
 const assets=new BlenderAssets(parseBlenderGLB(await decodeBlenderLibrary(encoded.buffer.slice(encoded.byteOffset,encoded.byteOffset+encoded.byteLength))),manifest);
 const results=[];
 for(const quality of ['low','high']){
  const r=fixture(),g=new Game({map:14,mode:'tdm'},{seed:817});r.blenderAssets=assets;r.quality=quality;r.arena=g.arena;r.buildWorld();
  r.height=framebufferSize(874,402,1,QUALITY[quality].scale,QUALITY[quality].pixels).height;
  r.camera.aspect=874/402;r.camera.fov=verticalFov(80*Math.PI/180,r.camera.aspect)*180/Math.PI;
  r.actorBounds=new THREE.Sphere(new THREE.Vector3(),2);
  for(const shot of OCCLUSION_VIEWS){
   placeOcclusionFixture(g,shot);const d=direction(shot.yaw,0);r.camera.position.set(shot.x,1.66,shot.z);r.camera.lookAt(shot.x+d.x,1.66,shot.z+d.z);r.camera.updateProjectionMatrix();r.camera.updateMatrixWorld();
   r.frustum=new THREE.Frustum().setFromProjectionMatrix(r.worldVP.multiplyMatrices(r.camera.projectionMatrix,r.camera.matrixWorldInverse));
   for(const policy of ['disabled','closed-wall']){
    r.actorOcclusionAllowed=policy==='closed-wall';
    const times=[];
    for(let i=0;i<150;i++){const start=performance.now();r.updateActors(g);r.uploadDynamic(r.actorBatches);if(i>=30)times.push(performance.now()-start);}
    results.push({view:shot.name,quality,policy,framebufferHeight:r.height,trustedWallSlabs:r.solidWallOcclusion.walls.length,...actorCounts(r),cpuMedianMs:+percentile(times,.5).toFixed(4),cpuP95Ms:+percentile(times,.95).toFixed(4)});
   }
  }
 }
 const report={scope:'Fixed 16-operator Blacksite roster on verified unoccupied gameplay positions, five representative views, 80 degree horizontal FOV, 874x402 CSS reference viewport at DPR 1 with each tier actual resolution scale. Same native library, poses and quality for both policies. Node CPU + submitted actor geometry only; excludes world, effects, weapon and shadow passes. Shadow-refresh frames deliberately retain original actor buffers, so these are between-refresh savings. CPU times were captured with concurrent software browser validation; no physical iPhone FPS/GPU/timing/thermal/memory measurement.',actual_iphone_data:false,librarySha256:manifest.library.sha256,wallContract:'One native wall closed inner core (.94,.94,.76) must cover the projected AABB of the full live/falling sphere (radius 2/2.5 m, centre y+0.9). No combined independent hits. Excludes apertures/facades/props/rotated/translucent/breakable/microdetail/wind geometry. Rechecks destroyed/invisible state each call. Bypass within 3 m and on preparation/shadow-refresh frames.',roster:OCCLUSION_ROSTER,views:OCCLUSION_VIEWS,results};
 const output=process.argv[2]??'docs/validation-release61-occlusion.json';await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({output,results},null,2));
}
if(process.argv[1]?.endsWith('profile-occlusion.mjs'))await main();
