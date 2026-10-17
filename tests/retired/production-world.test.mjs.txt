import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../dist/vendor/three.module.min.js';
import {Arena,MAPS} from '../dist/js/maps.js';
import {blenderWorld} from '../dist/js/blender-world.js';
import {wallOpenings} from '../dist/js/production-world.js';
import {BlenderAssets,decodeBlenderLibrary,parseBlenderGLB} from '../dist/js/blender-assets.js';
import {readRuntimeLibrary} from '../scripts/asset-parts.mjs';
import {compose} from '../dist/js/math.js';
import {fixture} from './renderer-fixture.mjs';

test('production composition preserves complete authoritative map state on all sixteen maps',()=>{
 for(const map of MAPS){
  const arena=new Arena(map.id),state=JSON.stringify({blocks:arena.blocks,decor:arena.decor,
   spawns:arena.spawns,objectives:arena.objectives,cover:arena.cover,doors:arena.doors});
  const parts=blenderWorld(arena);
  assert.equal(JSON.stringify({blocks:arena.blocks,decor:arena.decor,
   spawns:arena.spawns,objectives:arena.objectives,cover:arena.cover,doors:arena.doors}),state,map.name);
  assert(parts.every(p=>[p.x,p.y,p.z,p.w,p.h,p.d].every(Number.isFinite)),map.name);
  assert(parts.every(p=>p.w>0&&p.h>0&&p.d>0),map.name);
  assert(parts.filter(p=>p.productionArt).length<=140,'bounded native dressing');
 }
});

test('Blacksite native entries and windows exactly follow existing firing apertures',()=>{
 const arena=new Arena(14),parts=blenderWorld(arena),hall=arena.blocks.find(p=>p.roof&&p.x===0&&p.z===0);
 assert.equal(parts.filter(p=>p.blenderKind==='doorway_surround').length,20,'four hall doors and sixteen bunker doors');
 assert.equal(parts.filter(p=>p.blenderKind==='aperture_frame').length,8,'all eight hall windows stay open');
 for(const axis of ['x','z'])for(const sign of [-1,1]){
  const ground=wallOpenings(arena,hall,axis,sign),standing=wallOpenings(arena,hall,axis,sign,1.4);
  assert.equal(ground.length,1);assert(Math.abs(ground[0].width-3.8)<1e-8);
  assert.equal(standing.length,3);
 }
 for(const p of parts.filter(p=>p.productionOpening)){
  const opening=p.productionOpening;
  assert(Math.abs(p.w*.8-opening.width)<1e-8);
  assert(Math.abs(p.h*(p.blenderKind==='aperture_frame'?.76:.88)-(opening.top-opening.bottom))<1e-8);
  const point={x:opening.x,y:opening.bottom+.01,z:opening.z};
  assert(!arena.collides(point,.001,opening.top-opening.bottom-.02),'art frame must agree with the real empty opening');
 }
 // A roof-mounted installation cannot float inside the playable ground lane.
 for(const p of parts.filter(p=>['cable_tray','duct_run','roof_truss'].includes(p.blenderKind)))
  assert(p.y-p.h/2>3.3,'overhead head clearance');
});

test('native equipment replaces weak component layers and keeps destroyed-parent inheritance',()=>{
 const arena=new Arena(14),parts=blenderWorld(arena);
 assert(!parts.some(p=>p.surface==='fabric'&&p.h===.23&&p.w===.82&&p.d===.54),'Jersey barriers retain their native tapered silhouette');
 assert(!parts.some(p=>p.surface==='orange'&&p.h===.09&&p.d===2.2),'generator side bars belong to the merged native mesh');
 const room=arena.blocks.find(p=>p.roof&&p.x===-31&&p.z===-28),mounted=parts.filter(p=>p.productionArt&&Object.getPrototypeOf(p)===room);
 assert(mounted.length>4);room.destroyed=true;
 assert(mounted.every(p=>p.destroyed),'dependent dressing must never resurrect a destroyed construction');
 const nuketown=new Arena(15),classic=blenderWorld(nuketown);
 assert.equal(classic.filter(p=>p.productionOpening).length,0,'bespoke house portals remain authored by Nuketown');
 assert(classic.some(p=>p.blenderKind==='vehicle_sedan'),'civilian car is no longer selected as a freight container');
});

test('Blacksite turbine hall and joined loading surface preserve sightlines and contact height',async()=>{
 const arena=new Arena(14),parts=blenderWorld(arena),hall=arena.blocks.find(p=>p.roof&&p.x===0&&p.z===0);
 const roof=parts.find(p=>p.blenderKind==='blacksite_hall_roof');
 const walls=parts.filter(p=>p.blenderKind==='blacksite_hall_cladding');
 assert.equal(walls.length,4);assert.equal(Object.getPrototypeOf(roof),hall);
 assert(roof.y-roof.h/2>=hall.y+hall.h/2-.001,'new silhouette remains above the original roof');
 assert(walls.every(p=>p.y-p.h/2>3.01),'cladding remains above the tallest empty doorway');
 for(const sign of [-1,1]){
  const apron=parts.find(p=>p.productionRole==='service_apron'&&Math.sign(p.z)===sign);
  const approach=parts.find(p=>p.productionRole==='service_approach'&&Math.sign(p.z)===sign);
  assert(Math.abs(approach.z)-approach.d/2<Math.abs(apron.z)+apron.d/2,'poured approach meets loading apron');
  assert.equal(apron.blenderKind,'blacksite_service_apron');
  assert.equal(approach.blenderKind,'blacksite_service_approach');
 }
 const packed=await readRuntimeLibrary(),buffer=await decodeBlenderLibrary(packed.buffer.slice(packed.byteOffset,packed.byteOffset+packed.byteLength));
 const geometries=parseBlenderGLB(buffer),raw=new Float32Array(16),matrix=new THREE.Matrix4();
 const kinds=['blacksite_hall_roof','blacksite_hall_cladding','blacksite_service_apron','blacksite_service_approach'];
 for(const p of parts.filter(p=>kinds.includes(p.blenderKind))){
  const g=geometries.get(p.blenderKind+'__near');assert(g,'site-specific native model must ship');
  compose(raw,p.x,p.y,p.z,p.w,p.h,p.d,p.yaw??0,0,0);
  const bounds=g.boundingBox.clone().applyMatrix4(matrix.fromArray(raw));
  if(p.productionGround)assert(bounds.max.y<.034,'native joints and wear stay below impact/contact receiver');
  else if(p===roof){
   assert(bounds.min.y>=hall.y+hall.h/2-.01);
   const position=g.getAttribute('position'),indices=g.index;
   const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();let slopes=0;
   for(let i=0;i<indices.count;i+=3){
    a.fromBufferAttribute(position,indices.getX(i));b.fromBufferAttribute(position,indices.getX(i+1));c.fromBufferAttribute(position,indices.getX(i+2));
    const centre=a.clone().add(b).add(c).multiplyScalar(1/3),normal=b.clone().sub(a).cross(c.clone().sub(a));
    if(normal.length()>.2&&Math.abs(centre.z)<.25&&Math.abs(centre.y-(.468-Math.abs(centre.x)*1.822))<.01){
     assert(normal.y>0,'both mirrored roof slopes face outwards');slopes++;
    }
   }
   assert.equal(slopes,4);
  }
  else assert(bounds.min.y>3.01);
 }
 const detailTriangles=['blacksite_hall_roof','blacksite_hall_cladding','blacksite_service_apron','blacksite_service_approach']
  .reduce((sum,kind)=>sum+geometries.get(kind+'__near').index.count/3,0);
 assert(detailTriangles<4000,'four site-specific assets have a bounded native topology');
 hall.destroyed=true;assert(walls.every(p=>p.destroyed)&&roof.destroyed,'site shell inherits the authoritative hall state');
});

test('native doorway and window geometry leaves the authoritative aperture completely empty',async()=>{
 const packed=await readRuntimeLibrary(),buffer=await decodeBlenderLibrary(packed.buffer.slice(packed.byteOffset,packed.byteOffset+packed.byteLength));
 const geometries=parseBlenderGLB(buffer),parts=blenderWorld(new Arena(14));
 const matrix=new THREE.Matrix4(),raw=new Float32Array(16),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),hit=new THREE.Vector3();
 for(const p of parts.filter(p=>p.productionOpening)){
  const g=geometries.get(p.blenderKind+'__near');assert(g,`${p.blenderKind} native source must be deployed`);
  compose(raw,p.x,p.y,p.z,p.w,p.h,p.d,p.yaw??0,0,0);matrix.fromArray(raw).invert();
  const opening=p.productionOpening,position=g.getAttribute('position'),indices=g.index;
  for(const along of [-.499,0,.499])for(const vertical of [.002,.5,.998]){
   const point=new THREE.Vector3(opening.x,opening.bottom+(opening.top-opening.bottom)*vertical,opening.z);
   point[opening.axis==='z'?'x':'z']+=along*opening.width;
   const normal=new THREE.Vector3(opening.axis==='x'?1:0,0,opening.axis==='z'?1:0);
   const localOrigin=point.clone().addScaledVector(normal,-2).applyMatrix4(matrix),localTarget=point.clone().addScaledVector(normal,2).applyMatrix4(matrix);
   const ray=new THREE.Ray(localOrigin,localTarget.sub(localOrigin).normalize());
   for(let i=0;i<indices.count;i+=3){
    a.fromBufferAttribute(position,indices.getX(i));b.fromBufferAttribute(position,indices.getX(i+1));c.fromBufferAttribute(position,indices.getX(i+2));
    assert.equal(ray.intersectTriangle(a,b,c,false,hit),null,`${p.blenderKind} intrudes into the playable aperture`);
   }
  }
 }
 // Validate the actual rotated native topology, not its pre-rotation height:
 // columns retain the original narrow footprint, spans stay above head level.
 const cranes=parts.filter(p=>p.productionCrane);assert.equal(cranes.length,6);
 assert.equal(parts.filter(p=>p.surface==='steel'&&p.mesh==='cylinder'&&p.roll===Math.PI/2&&p.y===5.1&&p.h===23&&p.w===.3&&p.d===.3).length,0,
  'unsupported original service-bridge rods must not remain in the visual scene');
 const columns=[],spans=[];
 for(const p of cranes){
  const g=geometries.get('roof_truss__near');let source=p;
  while(Object.getPrototypeOf(source)!==Object.prototype)source=Object.getPrototypeOf(source);
  compose(raw,p.x,p.y,p.z,p.w,p.h,p.d,p.yaw??0,p.pitch??0,p.roll??0);
  const box=g.boundingBox.clone().applyMatrix4(matrix.fromArray(raw)),size=box.getSize(new THREE.Vector3());
  if(source.surface==='orange'){
   columns.push(box);
   assert(size.x<=source.w+.001&&size.z<=source.d+.001,'native column cannot introduce wider invisible cover');
   assert(box.min.y>=-.001&&box.max.y<=source.h+.001,'original column height stays authoritative');
  }else{spans.push(box);assert(box.min.y>3.3,'native overhead span must preserve player head clearance');}
 }
 assert.equal(spans.length,2);assert.equal(columns.length,4);
 for(const span of spans)assert.equal(columns.filter(column=>span.intersectsBox(column)).length,2,
  'each remaining crane span physically meets both of its original support columns');
});

test('native composition stays within mobile active world batch and scene triangle budgets',async()=>{
 const packed=await readRuntimeLibrary(),buffer=await decodeBlenderLibrary(packed.buffer.slice(packed.byteOffset,packed.byteOffset+packed.byteLength));
 const manifest=JSON.parse(await readFile(new URL('../dist/assets/blender/manifest.json',import.meta.url),'utf8'));
 const assets=new BlenderAssets(parseBlenderGLB(buffer),manifest),renderer=fixture();renderer.blenderAssets=assets;
 for(const map of MAPS){
  renderer.arena=new Arena(map.id);renderer.buildWorld();
  const active=renderer.worldBatches.filter(b=>b.count>0),triangles=active.reduce((n,b)=>n+b.geometry.index.count/3*b.count,0);
  assert(active.length<220,`${map.name}: ${active.length} submitted world batches`);
  assert(triangles<375000,`${map.name}: ${triangles} full-detail scene triangles before frustum/LOD culling`);
 }
});
