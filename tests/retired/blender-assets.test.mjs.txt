import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from '../dist/vendor/three.module.min.js';
import {decodeBlenderLibrary,parseBlenderGLB,BlenderAssets,BLENDER_FILES} from '../dist/js/blender-assets.js';
import {fixture} from './renderer-fixture.mjs';
import {Game} from '../dist/js/engine.js';
import {Weapon,WEAPONS} from '../dist/js/weapons.js';
import {MAPS} from '../dist/js/maps.js';
import {readRuntimeLibrary} from '../scripts/asset-parts.mjs';
import {BAKED_FILES} from '../dist/js/blender-files.js';

const root=new URL('../dist/assets/blender/',import.meta.url);
const packed=await readRuntimeLibrary();
const manifest=JSON.parse(await readFile(new URL('manifest.json',root),'utf8'));
const buffer=await decodeBlenderLibrary(packed.buffer.slice(packed.byteOffset,packed.byteOffset+packed.byteLength));
const geometries=parseBlenderGLB(buffer);
const assets=new BlenderAssets(geometries,manifest);

test('all nine Blender texture bakes reconstruct complete decodable WebP containers',async()=>{
 const names=['surfaces','weapon','leaves','horizon','effects','surfaceNormal','surfaceORM','weaponNormal','weaponORM'];
 for(const name of names){const files=BAKED_FILES[name];assert(files?.length,`missing bake ${name}`);const data=Buffer.concat(await Promise.all(files.map(p=>readFile(new URL('../dist/assets/'+p,import.meta.url)))));assert(data.length>32,name);assert.equal(data.toString('ascii',0,4),'RIFF',name);assert.equal(data.toString('ascii',8,12),'WEBP',name);assert.equal(data.readUInt32LE(4)+8,data.length,'complete WebP payload');}
});

test('native world dressing follows destroyed source props and never adds collision',()=>{
 const game=new Game({map:3},{seed:817}),r=fixture();r.blenderAssets=assets;r.arena=game.arena;const blocks=game.arena.blocks.length;r.buildWorld();assert.equal(game.arena.blocks.length,blocks);
 const batch=r.worldBatches.find(b=>b.userData.parts.some(p=>p.blenderKind==='generator'));assert(batch);const p=batch.userData.parts.find(p=>p.blenderKind==='generator'),source=Object.getPrototypeOf(p);source.destroyed=true;r.refreshDestroyed();assert(p.renderDestroyed);assert(batch.count<batch.userData.parts.length);
});

test('real Blender buffers have finite physical data, valid indices and neutral baked kit colour',()=>{
 assert(geometries.size>100);
 for(const [name,g] of geometries){
  assert(g.index.count>0&&g.index.count%3===0,name);assert(g.boundingSphere.radius>0,name);
  const colors=g.getAttribute('color');
  for(let i=0;i<colors.count;i++){
   assert(colors.getX(i)>=0&&colors.getX(i)<=1,name);assert(colors.getY(i)>=0&&colors.getY(i)<=1,name);
   assert(colors.getZ(i)>=0&&colors.getZ(i)<=1,name);assert.equal(colors.getW(i),1,'opaque authored alpha');
  }
  if(name.startsWith('weapon_')){
   const rm=g.getAttribute('breachMaterial');assert(rm,name);
   for(let i=0;i<rm.count;i++){assert(rm.getX(i)>=.1&&rm.getX(i)<=1,name);assert(rm.getY(i)>=0&&rm.getY(i)<=1,name);}
  }
 }
 for(const key of ['architecture__near','hard__near','sphere__near']){
  const c=geometries.get(key).getAttribute('color');
  for(let i=0;i<c.count;i++)assert(Math.abs(c.getX(i)-c.getY(i))<1e-6&&Math.abs(c.getY(i)-c.getZ(i))<1e-6,'UV data must not overwrite baked vertex colour');
 }
});

test('all 30 authored weapon cores cover every original component once and keep attachments and moving joints',()=>{
 const r=fixture();r.blenderAssets=assets;const matrix=new THREE.Matrix4();
 for(const def of WEAPONS)for(const optic of [0,1,2,3])for(const barrel of [0,1,2])for(const handling of [0,1,2,3,4]){
  const w=new Weapon(def.id,{optic,barrel,handling}),game={time:2,player:{weapon:w,ads:0,vx:0,vz:0,visualKick:0,switchLeft:0,sprinting:false}};
  r.renderWeapon(game,932/430,false);
  const members=r.blenderWeaponGroups.flatMap(g=>g.members).sort((a,b)=>a-b);
  assert.deepEqual(members,Array.from({length:r.weaponParts.coreCount},(_,i)=>i),def.name);
  const handMembers=new Set(r.blenderHandGroups?.flatMap(p=>p.members)??[]);
  const expected=r.blenderWeaponGroups.filter(p=>!p.hidden).length+(r.blenderHandGroups?.filter(p=>!p.hidden).length??0)+r.weaponParts.slice(r.weaponParts.coreCount).filter((p,i)=>!p.hidden&&!handMembers.has(i+r.weaponParts.coreCount)).length;
  assert.equal([...r.weaponBatches.values()].reduce((n,e)=>n+e.used,0),expected);
  const muzzle={...r.weaponParts.muzzle};w.reload();w.reloadLeft=w.reloadTime*.55;r.renderWeapon(game,932/430,false);
  assert.deepEqual(r.weaponParts.muzzle,muzzle,'sight and muzzle contract stays fixed during reload');
  for(const group of r.blenderWeaponGroups){const p=r.weaponParts[group.anchor];assert.equal(group.y,p.y);assert.equal(group.pitch,p.pitch);}
  for(const entry of r.weaponBatches.values())for(let i=0;i<entry.used;i++){entry.mesh.getMatrixAt(i,matrix);assert(matrix.elements.every(Number.isFinite));}
 }
});

test('every map uses shared authored world geometry without changing collision or spawn data',()=>{
 const r=fixture();r.blenderAssets=assets;
 for(const map of MAPS){
  const game=new Game({map:map.id},{seed:817}),before=JSON.stringify({blocks:game.arena.blocks.map(p=>[p.x,p.y,p.z,p.w,p.h,p.d,p.surface]),spawns:game.arena.spawns,objectives:game.arena.objectives});
  r.arena=game.arena;r.buildWorld();r.updateActors(game);r.uploadDynamic(r.actorBatches);
  assert(r.worldBatches.filter(b=>b.count>0).length<220,'mobile world draw budget counts submitted meshes, excluding dormant LODs');
  for(const b of r.worldBatches){assert(b.geometry.userData.blender);assert(b.boundingSphere.radius>0);assert([...b.instanceMatrix.array].every(Number.isFinite));}
  const after=JSON.stringify({blocks:game.arena.blocks.map(p=>[p.x,p.y,p.z,p.w,p.h,p.d,p.surface]),spawns:game.arena.spawns,objectives:game.arena.objectives});
  assert.equal(after,before,'graphics preparation must never edit physics or objectives');
  const living=game.actors.find(a=>a.id!==game.player.id);assert(living.renderParts.some(p=>p.blenderBodyIndex===4),'authored boot is attached to the existing leg rig');
 }
});

test('both native and fallback gzip decode exactly, and offline shell includes all Blender data',async()=>{
 const native=globalThis.DecompressionStream;
 try{globalThis.DecompressionStream=undefined;const fallback=await decodeBlenderLibrary(packed.buffer.slice(packed.byteOffset,packed.byteOffset+packed.byteLength));assert.deepEqual(new Uint8Array(fallback),new Uint8Array(buffer));}
 finally{globalThis.DecompressionStream=native;}
 assert(manifest.library.unpackedBytes<64*1048576,'geometry stays within the bounded runtime decoder');
 assert(manifest.downloadBytes>=manifest.library.bytes,'download accounting includes the library and compatibility textures');
 assert.equal(packed.length,manifest.library.bytes);
 assert.equal(createHash('sha256').update(packed).digest('hex'),manifest.library.sha256,'segments must reconstruct the exact compressed GLB');
 for(const f of manifest.files){const data=await readFile(new URL(f.path,root));assert.equal(data.length,f.bytes);assert.equal(createHash('sha256').update(data).digest('hex'),f.sha256);}
 const sourceRoot=new URL('../authoring/blender/source/',import.meta.url),source=JSON.parse(await readFile(new URL('manifest.json',sourceRoot),'utf8'));
 const editable=Buffer.concat(await Promise.all(source.files.map(f=>readFile(new URL(f.path,sourceRoot)))));
 assert.equal(editable.length,source.bytes);assert.equal(createHash('sha256').update(editable).digest('hex'),source.sha256,'editable source reconstructs byte-for-byte');
 const sw=await readFile(new URL('../dist/sw.js',import.meta.url),'utf8');
 for(const f of BLENDER_FILES)assert(sw.includes(`'./assets/${f}'`));assert(sw.includes("'./vendor/gzip.js'"));
});

test('canopy LOD retains every tree, reduces distant work, restores detail and avoids idle uploads',()=>{
 const r=fixture();r.blenderAssets=assets;r.arena=new Game({map:8},{seed:817}).arena;r.buildWorld();
 assert(r.blenderWorldLODs.length>0);const tris=()=>r.blenderWorldLODs.reduce((n,p)=>n+(p.near.geometry.index.count*p.near.count+p.far.geometry.index.count*p.far.count)/3,0),full=tris();
 r.camera.position.set(300,2,300);assets.lodClock=0;assets.updateLOD(r,1);
 assert(tris()<full*.65,'distant canopy triangle cost falls');
 for(const p of r.blenderWorldLODs){assert.equal(p.near.count+p.far.count,p.parts.length);assert.equal(p.near.count,0);assert(p.far.boundingSphere.equals(p.near.boundingSphere));}
 const versions=r.blenderWorldLODs.flatMap(p=>[p.near.instanceMatrix.version,p.far.instanceMatrix.version]);assets.updateLOD(r,1);
 assert.deepEqual(r.blenderWorldLODs.flatMap(p=>[p.near.instanceMatrix.version,p.far.instanceMatrix.version]),versions);
 const pair=r.blenderWorldLODs[0],tree=pair.parts[0];r.camera.position.set(tree.x,tree.y,tree.z);assets.updateLOD(r,1);
 assert(pair.near.userData.blenderSelection.includes(tree));
 const represented=r.blenderWorldLODs.flatMap(p=>[...p.near.userData.blenderSelection,...p.far.userData.blenderSelection]);
 assert.equal(new Set(represented).size,represented.length,'no duplicate tree instances');
});

test('prop LOD retains close detail, represents each prop once and removes destroyed far instances',()=>{
 const r=fixture();r.blenderAssets=assets;r.arena=new Game({map:14},{seed:817}).arena;r.buildWorld();r.height=600;r.quality='high';
 const pair=r.blenderWorldLODs.find(p=>!p.canopy&&p.parts[0].blenderKind==='generator');assert(pair);
 const prop=pair.parts[0];r.camera.position.set(prop.x,prop.y,prop.z);assets.lodClock=0;assets.updateLOD(r,0);
 assert(pair.near.userData.blenderSelection.includes(prop),'close machinery keeps its native hero mesh');
 r.camera.position.set(300,2,300);assets.lodClock=0;assets.updateLOD(r,0);
 assert(pair.far.userData.blenderSelection.includes(prop));
 for(const p of r.blenderWorldLODs){
  const represented=[...p.near.userData.blenderSelection,...p.far.userData.blenderSelection];
  assert.equal(new Set(represented).size,p.parts.length,'each living render proxy appears exactly once');
 }
 const source=Object.getPrototypeOf(prop);source.destroyed=true;r.refreshDestroyed();
 assert(!pair.near.userData.blenderSelection.includes(prop));assert(!pair.far.userData.blenderSelection.includes(prop));
 assert.equal(pair.near.count+pair.far.count,pair.parts.length-1,'the far mesh cannot resurrect destroyed combat cover');
});

test('authored texture axes use exact byte values and primary geometry cannot silently fall back',()=>{
 let vertices=0;
 for(const g of geometries.values())for(const name of ['breachUvU','breachUvV']){
  const a=g.getAttribute(name);assert(a.array instanceof Uint8Array);assert.equal(a.normalized,false);
  for(let i=0;i<a.count;i++)assert.equal(a.getX(i)+a.getY(i)+a.getZ(i),1);
  vertices+=a.count;
 }
 assert(vertices*9>1024*1024,'real CPU/GPU stream saving exceeds one MiB');
 const r=fixture();r.blenderAssets=assets;assert.throws(()=>r.partGeometry({blenderMesh:'absent'},'weapon'),/Missing required Blender geometry/);
});

test('compact native colours and physical scalars retain 16-bit precision and exact spatial streams',()=>{
 const p=manifest.geometryPacking;assert.equal(p.normalisedBits,16);
 assert(p.maxColourError<=.5/65535+1e-12);assert(p.maxMaterialError<=.5/65535+1e-12);
 assert.equal(p.exactSourceSha256,p.exactPackedSha256,'positions, normals, UVs and indices remain byte-exact');
 let colourStreams=0,physicalStreams=0,colourSavings=0,physicalSavings=0;
 for(const [name,g] of geometries){
  const colour=g.getAttribute('color');assert(colour.array instanceof Uint16Array,name);assert(colour.normalized,name);
  colourStreams++;colourSavings+=colour.count*colour.itemSize*2;
  const physical=g.getAttribute('breachMaterial');
  if(physical){assert(physical.array instanceof Uint16Array,name);assert(physical.normalized,name);physicalStreams++;physicalSavings+=physical.count*physical.itemSize*2;}
 }
 // Blender 4.3 already exports normalised 16-bit colours. Blender 4.0 exported
 // float colours, so the same packing step reported a larger byte reduction.
 // Account for the actual converted streams, not an arbitrary saving floor
 // that penalises an exporter which produced compact colours in the first place.
 assert(p.streams===physicalStreams||p.streams===physicalStreams+colourStreams,'every float material stream is compacted');
 assert.equal(p.savedBytes,physicalSavings+(p.streams===physicalStreams?0:colourSavings),'exact two-byte reduction per converted scalar');
});

test('all 30 first-person weapons and visual attachment combinations stay within explicit geometry and batch caps',()=>{
 const classic=fixture(),authored=fixture();authored.blenderAssets=assets;
 const stats=r=>{const active=[...r.weaponBatches.values()].filter(e=>e.mesh.count);return{
  draws:active.length,triangles:active.reduce((n,e)=>n+(e.mesh.geometry.index?.count??e.mesh.geometry.getAttribute('position').count)/3*e.mesh.count,0)};};
 let classicDraws=0,authoredDraws=0;
 for(const def of WEAPONS){
  const game={time:1,player:{weapon:new Weapon(def.id,{optic:1}),ads:0,vx:0,vz:0,visualKick:0,switchLeft:0,sprinting:false}};
  for(const r of [classic,authored])r.renderWeapon(game,932/430,false);
  classicDraws+=stats(classic).draws;authoredDraws+=stats(authored).draws;
  for(let optic=0;optic<7;optic++)for(let barrel=0;barrel<7;barrel++)for(let handling=0;handling<9;handling++)for(let magazine=0;magazine<4;magazine++){
   game.player.weapon=new Weapon(def.id,{optic,barrel,handling,magazine});authored.renderWeapon(game,932/430,false);
   const current=stats(authored),context=`${def.name} optic ${optic} barrel ${barrel} handling ${handling} magazine ${magazine}`;
   // Production hero shapes intentionally exceed the primitive fixture's
   // triangle cost. Bound the complete view, including gloves and accessories,
   // with measured engineering caps; these are not physical iPhone FPS claims.
   assert(current.triangles<=32000,`${context}: ${current.triangles} exceeds the 32k first-person cap`);
   const drawCap=game.player.weapon.magazine===3?17:16;
   assert(current.draws<=drawCap,`${context}: ${current.draws} exceeds the ${drawCap}-batch first-person cap`);
  }
 }
 assert(authoredDraws<classicDraws,'merged native cores reduce total default-arsenal draw batches');
});
