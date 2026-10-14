// Isolate spatial-cell origin in real shipped Blender scene construction.
// No GPU, rendered images or physical-device timings are measured here.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname} from 'node:path';
import {fixture} from '../tests/renderer-fixture.mjs';
import {decodeBlenderLibrary,parseBlenderGLB,BlenderAssets} from '../dist/js/blender-assets.js';
import {readRuntimeLibrary} from './asset-parts.mjs';
import {Game} from '../dist/js/engine.js';
import {MAPS} from '../dist/js/maps.js';

const rendererURL=new URL('../dist/js/three-renderer.js',import.meta.url),current=await readFile(rendererURL,'utf8');
const centred='`${Math.floor((p.x + cell*.5) / cell)}/${Math.floor((p.z + cell*.5) / cell)}`',original='`${Math.floor(p.x / cell)}/${Math.floor(p.z / cell)}`';
assert.equal(current.split(centred).length,2,'Expected one centred cell assignment');
const baseline=current.replace(centred,original),absolute=baseline.replace(/from (['"])(\.{1,2}\/[^'"]+)\1/g,(_,quote,path)=>`from ${quote}${new URL(path,rendererURL).href}${quote}`);
const {Renderer:OriginalRenderer}=await import('data:text/javascript;base64,'+Buffer.from(absolute).toString('base64'));
const encoded=await readRuntimeLibrary(),manifest=JSON.parse(await readFile('dist/assets/blender/manifest.json','utf8'));
const assets=new BlenderAssets(parseBlenderGLB(await decodeBlenderLibrary(encoded.buffer.slice(encoded.byteOffset,encoded.byteOffset+encoded.byteLength))),manifest);
const stats=r=>({activeBatches:r.worldBatches.filter(b=>b.count>0).length,worldTriangles:r.worldBatches.reduce((n,b)=>n+b.geometry.index.count*b.count/3,0)}),sides={};
for(const side of ['original','centred']){
 const results=[];
 for(const map of MAPS){
  const game=new Game({map:map.id,mode:'tdm'},{seed:817}),r=fixture();if(side==='original')Object.setPrototypeOf(r,OriginalRenderer.prototype);
  r.blenderAssets=assets;r.arena=game.arena;r.height=600;r.quality='high';r.buildWorld();const full=stats(r);
  const positions=[['spawn',game.player.x,1.6,game.player.z],['centre',0,1.6,0],['approach',0,1.6,27]];if(map.id===14)positions.push(['interior',0,1.6,9]);
  for(const [view,x,y,z]of positions){
   r.camera.position.set(x,y,z);assets.lodClock=0;assets.updateLOD(r,0);
   for(const pair of r.blenderWorldLODs)assert.equal(pair.near.count+pair.far.count,pair.parts.filter(p=>!p.destroyed).length,`${map.name} ${view}: missing/duplicate LOD instance`);
   results.push({map:map.name,view,camera:{x,y,z},fullDetail:full,selectedLOD:stats(r)});
  }
 }
 sides[side]={maps:MAPS.length,views:results.length,maximumActiveWorldBatches:Math.max(...results.map(r=>r.selectedLOD.activeBatches)),results};
}
const validation={sixteenMapsAnd49Views:Object.values(sides).every(s=>s.maps===16&&s.views===49),centredFits220BatchBudget:sides.centred.results.every(r=>r.selectedLOD.activeBatches<=220),fullDetailGeometryPreserved:sides.centred.results.every((r,i)=>r.fullDetail.worldTriangles===sides.original.results[i].fullDetail.worldTriangles)};
const sha=data=>createHash('sha256').update(data).digest('hex'),report={kind:'cell_only_source_world_batch_comparison',actual_iphone_data:false,sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),distributionDirtyAtSnapshot:!!execFileSync('git',['status','--porcelain','--','dist'],{encoding:'utf8'}).trim(),capturedAt:new Date().toISOString(),rendererSnapshots:{centredSha256:sha(current),originalSha256:sha(baseline)},scope:'Actual shipped native mesh scene construction at 600 px focal-size policy. Both renderer classes use identical source and dependencies, differing only in the spatial-cell assignment. Counts include the complete scene without frustum/occlusion subtraction; these are not browser frames, GPU timings or physical iPhone measurements.',validation,sides};
assert(Object.values(validation).every(Boolean),JSON.stringify(validation));
const output=process.argv[2]??'work/world-batches67/source-comparison.json';await mkdir(dirname(fileURLToPath(new URL(output,new URL('../',import.meta.url)))),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output,validation,originalMaximum:sides.original.maximumActiveWorldBatches,centredMaximum:sides.centred.maximumActiveWorldBatches,blacksite:sides.centred.results.filter(r=>r.map==='BLACKSITE').map(r=>({view:r.view,original:sides.original.results.find(b=>b.map===r.map&&b.view===r.view).selectedLOD,centred:r.selectedLOD}))},null,2));
