import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from '../dist/vendor/three.module.min.js';
import {Arena,MAPS} from '../dist/js/maps.js';
import {blenderWorld} from '../dist/js/blender-world.js';
import {decodeBlenderLibrary,parseBlenderGLB} from '../dist/js/blender-assets.js';
import {readRuntimeLibrary} from '../scripts/asset-parts.mjs';
import {compose} from '../dist/js/math.js';

const hash=data=>createHash('sha256').update(JSON.stringify(data)).digest('hex');
const sourceOf=p=>{while(Object.getPrototypeOf(p)!==Object.prototype)p=Object.getPrototypeOf(p);return p;};
const effective=p=>{const keys=[];for(const key in p)keys.push(key);return Object.fromEntries(keys.sort().map(key=>[key,p[key]]));};
let library;
const geometries=()=>library??= (async()=>{
 const bytes=await readRuntimeLibrary();return parseBlenderGLB(await decodeBlenderLibrary(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)));
})();
const matrixFor=p=>{const raw=new Float32Array(16);compose(raw,p.x,p.y,p.z,p.w,p.h,p.d,p.yaw??0,p.pitch??0,p.roll??0);return new THREE.Matrix4().fromArray(raw);};
const state=arena=>({blocks:arena.blocks,decor:arena.decor,foliage:arena.foliage,spawns:arena.spawns,objectives:arena.objectives,cover:arena.cover,doors:arena.doors});

// Release 67 df2e14e0297da1524f0ffe4a333cda74ba323fb2. Hash all effective
// inherited appearance properties and the authoritative source binding: own
// properties alone would silently omit the underlying visual transform/state.
const unchangedPresentation={
 0:'7efbbfdcf4063ba3e829647d9c7e85fb5528d10651b5b60a879136d719a81e28',
 1:'7838effe6f8359c2b53f003533ae79ae516fb0312836b29b196a461de9993652',
 2:'5354c61fb443a9a560362f97909d9d09203a73e20860856302807b1e41d3979b',
 3:'6bb4b0421231d42c4130f39fe308c1a0b7438e25782755c6018124bb4420ab45',
 4:'f04abebb06b9161fc9146d9b40a88567af16eaa4569cad4db6617c2cd5d0d944',
 5:'00f07c122829fc2e0bed60e9cc3bfc282779253af76546396898455fbaaf26b9',
 6:'b02a64907db8a7aa18a07ac0f71f9ae324ddead29e27b7167abd60cf95303313',
 7:'db2ef86c2986ab6eb91c6b356e5f895fd7a0875bbefcbdf5e2cec067d6a89a9f',
 8:'a0d0ef7aa22ea46300578f3a83cd06508938fa966c405917b0e30bd1fd84f520',
 9:'cee2d8afbb9b60d9b9ee9ed79e9c6a81e9d1177300a410e7ec42da795d5f2971',
 10:'47cb68f611ab5584ede4b244b34313de2f8c1ffd0fd221ba9c86fa86b068e395',
 11:'03c18549652a410c5fa1776c109f13c0c2b97e6760eb93671a2c974c4dad5c60',
 12:'62ffb76be55f058d2d8911b5f9bea7a860c4bd70a99b455775f03c015791ae6b',
 13:'268ddecf6bfa1839b609b669c841322b393f7ccd32fa72cd1332759ca7ed1812',
 15:'1272829db3fba505df04912ed39f74aa8ad281572b5f78f553f54432f7711111'
};

test('Blacksite-only architecture leaves all other fifteen map presentations and source bindings exact',()=>{
 for(const map of MAPS.filter(m=>m.id!==14)){
  const arena=new Arena(map.id),sources=[...arena.blocks,...arena.decor,...arena.foliage??[]];
  assert.equal(hash(blenderWorld(arena).map(p=>({part:effective(p),source:sources.indexOf(sourceOf(p))}))),unchangedPresentation[map.id],map.name);
 }
});

test('Blacksite complete hall replaces visual proxies while preserving authoritative gameplay and destruction',()=>{
 const arena=new Arena(14),before=hash(state(arena)),hall=arena.blocks.find(p=>p.roof&&p.room&&p.x===0&&p.z===0),parts=blenderWorld(arena);
 assert.equal(before,'74f15776555e0d6b418ccb2b0037ebedd3318e65c489002c43e944074ba83297','original Blacksite simulation geometry, cover, spawns, routes and objectives');
 assert.equal(hash(state(arena)),before,'composition cannot mutate the simulation');
 const oldWalls=arena.blocks.filter(p=>p.aperture&&!p.house);assert.equal(oldWalls.length,36);
 assert(!parts.some(p=>!p.productionArt&&oldWalls.includes(sourceOf(p))),'complete hall geometry replaces every central legacy wall visual');
 assert(!parts.some(p=>sourceOf(p)===hall&&!p.productionArt),'complete soffit replaces the original roof render proxy');
 assert(!parts.some(p=>sourceOf(p)===hall&&['roof_truss','cable_tray','pipe_rack'].includes(p.blenderKind)),'merged soffit replaces the generic seven-piece ceiling kit');
 const walls=parts.filter(p=>p.productionRole==='turbine_hall_wall'),ceiling=parts.filter(p=>p.productionRole==='turbine_hall_ceiling');
 assert.equal(walls.length,4);assert.equal(ceiling.length,1);
 assert.equal(walls.filter(p=>p.blenderKind==='blacksite_hall_wall_long').length,2);
 assert.equal(walls.filter(p=>p.blenderKind==='blacksite_hall_wall_short').length,2);
 const assembly=[...walls,...ceiling];
 assert(assembly.every(p=>sourceOf(p)===hall&&!Object.hasOwn(p,'destroyed')),'all new architecture remains bound to its authoritative hall');
 hall.destroyed=true;assert(assembly.every(p=>p.destroyed),'destroyed source cannot leave a visible new shell');
 const rebuilt=blenderWorld(arena),rebuiltAssembly=rebuilt.filter(p=>['turbine_hall_wall','turbine_hall_ceiling'].includes(p.productionRole));
 assert.equal(rebuiltAssembly.length,5);assert(rebuiltAssembly.every(p=>p.destroyed),'rebuilding after destruction retains source state');
 assert(!rebuilt.some(p=>!p.productionArt&&oldWalls.includes(sourceOf(p))),'destroying the hall cannot resurrect its suppressed legacy wall proxies');
});

function segmentHitsGeometry(geometry,matrix,start,end){
 const inverse=matrix.clone().invert(),from=start.clone().applyMatrix4(inverse),to=end.clone().applyMatrix4(inverse),length=from.distanceTo(to),ray=new THREE.Ray(from,to.sub(from).normalize());
 if(!ray.intersectsBox(geometry.boundingBox))return false;
 const position=geometry.getAttribute('position'),indices=geometry.index,a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),hit=new THREE.Vector3();
 for(let i=0;i<indices.count;i+=3){
  a.fromBufferAttribute(position,indices.getX(i));b.fromBufferAttribute(position,indices.getX(i+1));c.fromBufferAttribute(position,indices.getX(i+2));
  if(ray.intersectTriangle(a,b,c,false,hit)&&from.distanceTo(hit)<=length+1e-6)return true;
 }
 return false;
}

test('Blacksite complete native walls and ceiling keep their collision envelopes at both authored LODs',async()=>{
 const models=await geometries(),parts=blenderWorld(new Arena(14)),walls=parts.filter(p=>p.productionRole==='turbine_hall_wall'),ceiling=parts.find(p=>p.productionRole==='turbine_hall_ceiling');
 assert.equal(walls.length,4);assert(ceiling);
 for(const p of [...walls,ceiling])for(const level of ['near','far']){
  const name=p.blenderKind+'__'+level,g=models.get(name);assert(g,`${name} must ship in the native library`);assert(g.index.count>0);
  for(const axis of ['x','y','z'])assert(g.boundingBox.min[axis]>=-.5001&&g.boundingBox.max[axis]<=.5001,`${name}: authored ${axis} envelope`);
  const box=g.boundingBox.clone().applyMatrix4(matrixFor(p));
  assert(box.min.x>=-17.301&&box.max.x<=17.301,`${name}: authoritative roof width`);
  assert(box.min.z>=-11.301&&box.max.z<=11.301,`${name}: authoritative roof depth`);
  if(p===ceiling){assert(box.min.y>=4.899,`${name}: open headroom`);assert(box.max.y<=6.301,`${name}: meets the original roof surface`);}
  else {assert(box.min.y>=-.001&&box.max.y<=6.001,`${name}: no wall beyond the authoritative height`);}
 }
});

test('Blacksite complete native facade leaves all door and window apertures empty at near and far LOD',async()=>{
 const models=await geometries(),arena=new Arena(14),parts=blenderWorld(arena),hall=arena.blocks.find(p=>p.roof&&p.room&&p.x===0&&p.z===0);
 const walls=parts.filter(p=>p.productionRole==='turbine_hall_wall'),frames=parts.filter(p=>p.productionOpening&&sourceOf(p)===hall);assert.equal(walls.length,4);assert.equal(frames.length,12);
 for(const level of ['near','far']){
  const rendered=[...walls,...frames].map(p=>{const geometry=models.get(p.blenderKind+'__'+level);assert(geometry,`${p.blenderKind} ${level}`);return {p,geometry,matrix:matrixFor(p)};});
  for(const frame of frames){
   const opening=frame.productionOpening,normal=new THREE.Vector3(opening.axis==='x'?1:0,0,opening.axis==='z'?1:0);
   for(const along of [-.499,-.25,0,.25,.499])for(const vertical of [.002,.25,.5,.75,.998]){
    const point=new THREE.Vector3(opening.x,opening.bottom+(opening.top-opening.bottom)*vertical,opening.z);point[opening.axis==='z'?'x':'z']+=along*opening.width;
    const start=point.clone().addScaledVector(normal,-.8),end=point.clone().addScaledVector(normal,.8);
    for(const {p,geometry,matrix} of rendered)assert(!segmentHitsGeometry(geometry,matrix,start,end),`${p.blenderKind} ${level} obstructs ${opening.axis} aperture at ${along}/${vertical}`);
   }
  }
 }
 // Four actual cardinal entries remain passable for the real player capsule;
 // these routes cross the native shell at standing height, not a free camera.
 for(const axis of ['x','z'])for(const sign of [-1,1])for(let step=-2;step<=2;step+=.25){
  const point={x:0,y:.04,z:0};point[axis]=sign*((axis==='x'?17:11)+step);
  assert(!arena.collides(point,.31,1.76),`standing route through ${axis} ${sign} entry`);
 }
});
