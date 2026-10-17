import {blenderKind} from './blender-kind.js?v=71';
export {blenderKind};
import * as THREE from '../vendor/three.module.min.js';
import {installMetricUV} from './surface-uv.js?v=71';
import {LIBRARY_FILES} from './blender-files.js?v=71';

export const BLENDER_FILES=[...LIBRARY_FILES,'blender/manifest.json'];
const components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
const types={5121:[Uint8Array,1,'getUint8'],5123:[Uint16Array,2,'getUint16'],5125:[Uint32Array,4,'getUint32'],5126:[Float32Array,4,'getFloat32']};

// This bounded loader reads our static, uncompressed Blender mesh library.
// Animation, images, external buffers, skinning and extension decoders are not
// needed: the existing game owns the rig and every asset is shipped offline.
export function parseBlenderGLB(buffer){
 const view=new DataView(buffer);
 if(buffer.byteLength<20||view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==buffer.byteLength)throw Error('Invalid Blender GLB header');
 let json,bin;
 for(let offset=12;offset<buffer.byteLength;){
  if(offset+8>buffer.byteLength)throw Error('Truncated Blender GLB chunk');
  const length=view.getUint32(offset,true),type=view.getUint32(offset+4,true),start=offset+8;
  if(start+length>buffer.byteLength)throw Error('Truncated Blender GLB data');
  if(type===0x4e4f534a)json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,start,length)));
  if(type===0x004e4942)bin=new DataView(buffer,start,length);
  offset=start+length;
 }
 if(json?.asset?.version!=='2.0'||!bin||json.buffers?.length!==1||json.buffers[0].uri||json.extensionsRequired?.length)throw Error('Unsupported Blender library layout');
 const attribute=index=>{
  const a=json.accessors?.[index],b=json.bufferViews?.[a?.bufferView],t=types[a?.componentType],size=components[a?.type];
  if(!a||!b||!t||!size||a.sparse||b.buffer!==0)throw Error('Unsupported Blender accessor');
  const [Type,bytes,get]=t,stride=b.byteStride??size*bytes,start=(b.byteOffset??0)+(a.byteOffset??0);
  if(!Number.isSafeInteger(a.count)||a.count<1||stride<size*bytes||start<0||start+(a.count-1)*stride+size*bytes>bin.byteLength)throw Error('Blender accessor outside buffer');
  const array=new Type(a.count*size);
  for(let i=0;i<a.count;i++)for(let j=0;j<size;j++)array[i*size+j]=bin[get](start+i*stride+j*bytes,true);
  return new THREE.BufferAttribute(array,size,a.normalized===true);
 };
 const geometries=new Map();
 for(const mesh of json.meshes??[]){
  if(!mesh.name||mesh.primitives?.length!==1)throw Error('Blender assets must have one mesh primitive');
  const p=mesh.primitives[0];if(p.mode!==undefined&&p.mode!==4)throw Error('Blender asset must be triangles');
  const g=new THREE.BufferGeometry();g.name=mesh.name;
  for(const [key,name] of Object.entries({POSITION:'position',NORMAL:'normal',TEXCOORD_0:'uv',COLOR_0:'color'})){
   if(p.attributes[key]===undefined)throw Error(`Missing Blender ${key}: ${mesh.name}`);
   g.setAttribute(name,attribute(p.attributes[key]));
  }
  if(p.attributes.TEXCOORD_1!==undefined)g.setAttribute('breachMaterial',attribute(p.attributes.TEXCOORD_1));
  if(p.indices!==undefined)g.setIndex(attribute(p.indices));
  const positions=g.getAttribute('position'),normals=g.getAttribute('normal');
  if(positions.count!==normals.count||positions.count!==g.getAttribute('color').count)throw Error('Mismatched Blender vertex streams');
  if(!positions.array.every(Number.isFinite)||!normals.array.every(Number.isFinite))throw Error('Non-finite Blender mesh');
  if(g.index&&g.index.array.some(i=>i>=positions.count))throw Error('Invalid Blender index');
  installMetricUV(g,'authored');g.computeBoundingBox();g.computeBoundingSphere();
  g.userData.blender=true;geometries.set(mesh.name,g);
 }
 return geometries;
}

// Authored LOD silhouettes are not guaranteed to nest: a simplified rock can
// protrude beyond its near mesh. Reuse the two geometries' existing CPU bounds
// so initial batches, paired LOD clones, swaps and destruction recomputation
// all enclose either mesh without allocating another renderer resource.
export function unionBlenderLODBounds(geometries){
 for(const [name,near] of geometries){
  if(!name.endsWith('__near'))continue;
  const far=geometries.get(name.slice(0,-6)+'__far');if(!far)continue;
  for(const geometry of [near,far]){if(!geometry.boundingBox)geometry.computeBoundingBox();if(!geometry.boundingSphere)geometry.computeBoundingSphere();}
  near.boundingBox.union(far.boundingBox);far.boundingBox.copy(near.boundingBox);
  near.boundingSphere.union(far.boundingSphere);far.boundingSphere.copy(near.boundingSphere);
 }
}

export class BlenderAssets {
 constructor(geometries,manifest){
  if(manifest?.schema!==1||manifest.units!=='metres'||Object.keys(manifest.weapons??{}).length!==30)throw Error('Invalid Blender manifest');
  this.geometries=geometries;this.manifest=manifest;this.lodClock=0;
  for(const key of Object.keys(manifest.meshes))if(!geometries.has(key))throw Error(`Missing Blender mesh ${key}`);
  unionBlenderLODBounds(geometries);
 }
 geometry(p,category,far=false){
  const name=blenderKind(p,category);if(!name)return null;
  return this.geometries.get(p.blenderMesh?name:`${name}__${far?'far':'near'}`)??null;
 }
 key(p,category){const name=blenderKind(p,category);return name?(p.blenderMesh?name:`${name}/${p.blenderFar?'far':'near'}`):null;}
 prepare(p,category){if(p.blenderPrepared===category)return;const g=this.geometry(p,category);p.blenderVertexMaterial=!!g?.getAttribute('breachMaterial');p.blenderPrepared=category;}
 weaponGroups(parts,id){
  const record=this.manifest.weapons[id];if(!record||record.coreCount!==parts.coreCount)throw Error('Blender weapon rig no longer matches source');
  const proxy=(g,anchor=g.anchor,members=g.members)=>({ ...parts[anchor],blenderMesh:g.mesh,blenderColour:true,mesh:g.mesh,
   color:[1,1,1],rough:g.rough,metal:g.metal,finishTile:g.finishTile<0?undefined:g.finishTile,tile:g.tile,
   blenderVertexMaterial:g.vertexMaterial,anchor,members });
  const groups=record.groups.map(g=>proxy(g)),replacement=parts.reloadExchange?.sourceToReplacement;
  if(replacement)for(const g of record.groups){
   if(g.tag!=='magazine'||!replacement.has(g.anchor)||!g.members.every(i=>replacement.has(i)))continue;
   // Cache another rig proxy over the authored mesh; exchange animation only
   // changes its cloned anchor, so no geometry or renderer buffer is copied.
   groups.push(proxy(g,replacement.get(g.anchor),g.members.map(i=>replacement.get(i))));
  }
  return groups;
 }
 handGroups(parts,id){
  const record=this.manifest.weapons[id],indices=[];
  for(let i=parts.coreCount;i<parts.length;i++)if(/^(rightHand|supportHand|pumpHand)$/.test(parts[i].tag??''))indices.push(i);
  if(!record.hands||record.handCount!==indices.length)return null;
  return record.hands.map(g=>({...parts[indices[g.anchor]],blenderMesh:g.mesh,blenderColour:true,mesh:g.mesh,color:[1,1,1],rough:.8,metal:0,finishTile:2,tile:-1,blenderVertexMaterial:true,anchor:indices[g.anchor],members:g.members.map(i=>indices[i])}));
 }
 updateLOD(renderer,dt){
  this.lodClock-=dt;if(this.lodClock>0)return;this.lodClock=.25;
  const near=renderer.quality==='low'?13:renderer.quality==='medium'?21:30;
  const canopyDistance=renderer.quality==='low'?12:renderer.quality==='medium'?18:24;
  const focal=(renderer.height??430)/(2*Math.tan(renderer.camera.fov*Math.PI/360));
  const detailPixels=renderer.quality==='low'?100:renderer.quality==='medium'?76:54;
  const wallDetailPixels=renderer.quality==='low'?3.8:renderer.quality==='medium'?3:renderer.quality==='ultra'?2:2.5;
  for(const pair of renderer.blenderWorldLODs??[]){
   const kind=pair.kind??pair.parts[0]?.kind??(pair.parts[0]?blenderKind(pair.parts[0],'world'):null);
   const selected=[[],[]];
   for(const p of pair.parts){
    if(p.destroyed)continue;
    const d=Math.hypot(p.x-renderer.camera.position.x,p.y-renderer.camera.position.y,p.z-renderer.camera.position.z);
    const wasFar=pair.visibility.get(p)??false;
    // Hero props and facades select their authored LOD per instance, not by
    // the nearest corner of a large batch. Big visible facades keep detail;
    // small distant crates and machinery use their silhouette-preserving mesh.
    let pixels=Math.max(p.w,p.h,p.d)*focal/Math.max(1,d),threshold=detailPixels;
    if(kind==='wall'){
      // The far casting keeps its panels, grooves, chipped silhouette, plinth
      // and coping. Near-only ties/aggregate are .022 of its shorter face axis;
      // a wide wall alone does not make those small features resolvable.
      // Measure from the closest surface so walking beside a long wall retains
      // its close detail even when the mesh centre is far away.
      let dx=renderer.camera.position.x-p.x,dz=renderer.camera.position.z-p.z;
      if(p.yaw){const c=Math.cos(p.yaw),s=Math.sin(p.yaw),x=dx;dx=c*x-s*dz;dz=s*x+c*dz;}
      const surfaceDistance=Math.hypot(Math.max(0,Math.abs(dx)-p.w*.5),
        Math.max(0,Math.abs(renderer.camera.position.y-p.y)-p.h*.5),Math.max(0,Math.abs(dz)-p.d*.5));
      const feature=Math.min(Math.max(p.w,p.d),p.h)*.022;
      pixels=surfaceDistance<3?Infinity:feature*focal/Math.max(1,surfaceDistance);
      threshold=wallDetailPixels;
    }
    const far=pair.canopy?(wasFar?d>canopyDistance*.85:d>canopyDistance*1.15):
      (wasFar?pixels<threshold*1.15:pixels<threshold*.85);
    pair.visibility.set(p,far);selected[far?1:0].push(p);
   }
   for(const [i,b] of [pair.near,pair.far].entries()){
    const parts=selected[i],old=b.userData.blenderSelection;
    if(old&&old.length===parts.length&&parts.every((p,j)=>p===old[j]))continue;
    for(let j=0;j<parts.length;j++){b.setMatrixAt(j,renderer.partMatrix(parts[j]));b.setColorAt(j,renderer.instanceColor(parts[j],'world'));}
    b.count=parts.length;b.userData.blenderSelection=parts;
    if(parts.length){
     b.instanceMatrix.clearUpdateRanges();b.instanceMatrix.addUpdateRange(0,parts.length*16);b.instanceMatrix.needsUpdate=true;
     b.instanceColor.clearUpdateRanges();b.instanceColor.addUpdateRange(0,parts.length*3);b.instanceColor.needsUpdate=true;
    }
   }
  }
  for(const batch of renderer.worldBatches){
   if(batch.userData.blenderPair)continue;
   const p=batch.userData.parts?.[0];if(!p||p.blenderMesh)continue;
   const sphere=batch.boundingSphere;if(!sphere)continue;
   const distance=Math.max(0,sphere.center.distanceTo(renderer.camera.position)-sphere.radius*.7);
   const far=batch.userData.blenderFar?distance>near*.8:distance>near*1.2;
   if(far===batch.userData.blenderFar)continue;
   const geometry=this.geometry(p,'world',far);if(!geometry)continue;
   batch.geometry=geometry;batch.userData.blenderFar=far;
   // Both LODs retain the same conservative world-space bounds and silhouettes.
  }
 }
 dispose(){for(const g of this.geometries.values())g.dispose();this.geometries.clear();}
}

export async function loadBlenderAssets(){
 const responses=await Promise.all(BLENDER_FILES.map(file=>fetch(new URL(`../assets/${file}`,import.meta.url))));
 for(const r of responses)if(!r.ok)throw Error(`Could not load Blender asset (${r.status})`);
 const manifest=await responses.pop().json();
 const segments=await Promise.all(responses.map(r=>r.arrayBuffer()));
 const buffer=await new Blob(segments).arrayBuffer();
 return new BlenderAssets(parseBlenderGLB(await decodeBlenderLibrary(buffer)),manifest);
}

export async function decodeBlenderLibrary(buffer){
 const header=new Uint8Array(buffer);
 if(header[0]!==0x1f||header[1]!==0x8b)return buffer; // A host may already decode Content-Encoding.
 const bytes=new DataView(buffer).getUint32(buffer.byteLength-4,true);
 if(bytes>64*1048576)throw Error('Blender library exceeds memory budget');
 if(typeof DecompressionStream!=='undefined'){
  const stream=new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
 }
 const {gunzipSync}=await import('../vendor/gzip.js');
 const decoded=gunzipSync(header);return decoded.buffer.slice(decoded.byteOffset,decoded.byteOffset+decoded.byteLength);
}

export function syncBlenderWeapon(groups,parts){
 // Reuse proxies and the original moving-part animation. Never touch ammo,
 // attachment modifiers, recoil, damage, sight alignment or fire cadence.
 for(const group of groups){const anchor=parts[group.anchor];
  group.x=anchor.x;group.y=anchor.y;group.z=anchor.z;group.w=anchor.w;group.h=anchor.h;group.d=anchor.d;
  group.yaw=anchor.yaw;group.pitch=anchor.pitch;group.roll=anchor.roll;group.hidden=anchor.hidden;
 }
}
