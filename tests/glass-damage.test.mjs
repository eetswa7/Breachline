import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../dist/vendor/three.module.min.js';
import {collectGlassPanels,intersectGlassPanel,GlassPanelIndex} from '../dist/js/glass-panels.js';
import {GlassDamageSystem,GLASS_DAMAGE_BUDGET} from '../dist/js/glass-damage.js';
import {decodeBlenderLibrary,parseBlenderGLB,BlenderAssets} from '../dist/js/blender-assets.js';
import {readRuntimeLibrary} from '../scripts/asset-parts.mjs';
import {blenderWorld} from '../dist/js/blender-world.js';
import {Arena,MAPS} from '../dist/js/maps.js';

const packed=await readRuntimeLibrary(),buffer=await decodeBlenderLibrary(packed.buffer.slice(packed.byteOffset,packed.byteOffset+packed.byteLength));
const assets=new BlenderAssets(parseBlenderGLB(buffer),JSON.parse(await readFile(new URL('../dist/assets/blender/manifest.json',import.meta.url),'utf8')));
const pane=(x=0)=>({x,y:1.5,z:0,w:1.2,h:1.1,d:.05,surface:'glass'});

test('visual glass intersects the actual stopped bullet segment and respects rotated pane bounds',()=>{
 const part=pane(),panels=collectGlassPanels([part]);assert.equal(panels.length,2);
 const index=new GlassPanelIndex(panels),start={x:0,y:1.5,z:2};
 const hits=index.trace(start,{x:0,y:1.5,z:-2});assert.equal(hits.length,1,'only entry face counts');assert.equal(hits[0].panel.normal.z,1);
 assert.equal(index.trace(start,{x:0,y:1.5,z:.2}).length,0,'cover stopped the bullet before the pane');
 assert.equal(index.trace({x:1,y:1.5,z:2},{x:1,y:1.5,z:-2}).length,0,'no cracks outside the true glass rectangle');
 part.yaw=Math.PI/2;const rotated=new GlassPanelIndex(collectGlassPanels([part]));assert.equal(rotated.trace({x:2,y:1.5,z:0},{x:-2,y:1.5,z:0}).length,1);
 part.destroyed=true;assert.equal(rotated.trace({x:2,y:1.5,z:0},{x:-2,y:1.5,z:0}).length,0);
});

test('native glazing comes from actual smooth blue mesh faces, while open apertures retain no panes',()=>{
 let count=0;
 for(const map of MAPS){
  const arena=new Arena(map.id),blocksBefore=JSON.stringify(arena.blocks),parts=blenderWorld(arena),panels=collectGlassPanels(parts,p=>assets.geometry(p,'world'));
  count+=panels.length;assert.equal(JSON.stringify(arena.blocks),blocksBefore,'presentation cannot mutate collision');
  for(const panel of panels){assert(panel.width>=.12&&panel.height>=.12);assert([panel.centre.x,panel.centre.y,panel.centre.z,panel.width,panel.height].every(Number.isFinite));assert.equal(panel.part.blenderKind==='aperture_frame',false,'combat apertures remain unglazed');}
  if(map.id===0)assert(panels.some(p=>p.part.h>5),'native building facade glazing is detected');
  if(map.id===14)assert.equal(panels.filter(p=>p.part.productionOpening).length,0,'Blacksite open combat windows stay open');
 }
 assert(count>100,'the visual system includes real glazing throughout the native kit');
 const native=collectGlassPanels([{x:0,y:1.5,z:0,w:1.33,h:1.26,d:.17,surface:'steel',blenderKind:'blast_window'}],p=>assets.geometry(p,'world'));
 assert.equal(native.length,2,'native window pane front and back, excluding its metal frame');
 assert(Math.abs(native[0].width-.757*1.33)<.0001);assert(Math.abs(native[0].height-.758*1.26)<.0001);
});

test('spatial glass lookup matches brute-force intersections across diagonal and vertical cell boundaries',()=>{
 const parts=[];for(let x=-24;x<=24;x+=8)for(let z=-24;z<=24;z+=8)parts.push({...pane(x),z});
 const panels=collectGlassPanels(parts),index=new GlassPanelIndex(panels);
 for(let n=0;n<120;n++){
  const start={x:Math.sin(n*.73)*30,y:1.5,z:Math.cos(n*.21)*30},end=n===0?{...start,y:-2}:{x:Math.cos(n*.91)*30,y:1.5,z:Math.sin(n*.33)*30};
  const expected=panels.map(p=>intersectGlassPanel(p,start,end)).filter(Boolean).sort((a,b)=>a.t-b.t),actual=index.trace(start,end);
  assert.deepEqual(actual.map(h=>h.panel),expected.map(h=>h.panel));
 }
});

test('progressive cracks grow on repeated genuine hits, clip to pane edges and never upload at idle',()=>{
 const system=new GlassDamageSystem(new THREE.Scene());system.setPanels([pane()]);
 const shot={position:{x:.58,y:1.5,z:2},end:{x:.58,y:1.5,z:-2}};system.shot(shot);system.update();assert.equal(system.mesh.count,1);
 const first=new THREE.Matrix4();system.mesh.getMatrixAt(0,first);const state=[...system.states.values()][0];assert.equal(state.hits,1);
 assert(system.clips.getY(0)<1,'stamp ends exactly at the pane edge');
 for(let i=0;i<7;i++)system.shot(shot);system.update();assert.equal(state.hits,6);
 const grown=new THREE.Matrix4();system.mesh.getMatrixAt(0,grown);assert(Math.hypot(...grown.elements.slice(0,3))>Math.hypot(...first.elements.slice(0,3)));
 assert(Math.hypot(...grown.elements.slice(0,3))<=GLASS_DAMAGE_BUDGET.maxRadius*2);
 const version=system.mesh.instanceMatrix.version;system.update();assert.equal(system.mesh.instanceMatrix.version,version);
 assert.equal(system.mesh.material.transparent,false);assert.equal(system.mesh.castShadow,false);assert.equal(system.mesh.receiveShadow,false);
 const shader={vertexShader:'#include <begin_vertex>',fragmentShader:'#include <alphatest_fragment>'};system.mesh.material.onBeforeCompile(shader);assert(shader.fragmentShader.includes('glass')||shader.fragmentShader.includes('vGlassClip'));assert(!shader.fragmentShader.includes('texture2D'),'no texture/sampler allocation');
 system.dispose();
});

test('damage storage and draw count stay bounded, and map/round/destruction cleanup removes overlays',()=>{
 const scene=new THREE.Scene(),system=new GlassDamageSystem(scene,2),parts=[pane(0),pane(2),pane(4)];system.setPanels(parts);
 for(const part of parts)for(const dx of [-.3,.3])system.shot({position:{x:part.x+dx,y:1.5,z:2},end:{x:part.x+dx,y:1.5,z:-2}});
 system.update();assert.equal(system.states.size,2);assert.equal(system.mesh.count,4);assert.equal(system.mesh.geometry.index.count*system.mesh.count/3,8);
 parts[1].destroyed=true;system.update();assert.equal(system.states.size,1);assert.equal(system.mesh.count,2);
 system.clear();assert.equal(system.states.size,0);assert.equal(system.mesh.count,0);
 system.shot({position:{x:4,y:1.5,z:2},end:{x:4,y:1.5,z:-2}});system.update();assert(system.mesh.count>0);
 system.setPanels([]);assert.equal(system.mesh.count,0);assert.equal(system.shot({position:{x:4,y:1.5,z:2},end:{x:4,y:1.5,z:-2}}).length,0);
 system.dispose();assert.equal(scene.children.length,0);
});
