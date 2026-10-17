import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.min.js';
import {Renderer,isFriendly,neutraliseFinish} from '../dist/js/three-renderer.js';
import {Arena,MAPS} from '../dist/js/maps.js';
import {Game} from '../dist/js/engine.js';
import {Weapon} from '../dist/js/weapons.js';
import {makeCube,makeCylinder,makeSphere,part} from '../dist/js/geometry.js';
import {roundedBox,tube,leafCard,rockMesh} from '../dist/js/meshes.js';
import {direction} from '../dist/js/math.js';

// Real Three geometry/materials/matrices are exercised here. GPU construction is
// deliberately replaced; these tests do not claim a device or shader compile.
import {fixture} from './renderer-fixture.mjs';

test('all ten maps build complete finite Three instances and release replaced batches',()=>{
 const r=fixture();let disposed=0;
 for(const info of MAPS){
  const oldCount=r.worldBatches.length;r.arena=new Arena(info.id);r.buildWorld();
  assert.equal(disposed,oldCount);
  const authored=[...r.arena.blocks,...r.arena.decor,...(r.arena.foliage??[])].filter(p=>!p.invisible&&!p.destroyed);
  assert.equal(r.worldBatches.reduce((n,b)=>n+b.userData.fullCount,0),authored.length);
  assert(r.worldBatches.length<220,'world draw batches must stay bounded');
  for(const batch of r.worldBatches){assert(batch.isInstancedMesh);assert(batch.boundingSphere.radius>0);assert([...batch.instanceMatrix.array].every(Number.isFinite));}
  disposed=0;for(const b of r.worldBatches)b.addEventListener('dispose',()=>disposed++);
 }
});

test('animated view models fit their Three batches and retain every weapon component',()=>{
 const r=fixture(),matrix=new THREE.Matrix4();
 for(let id=0;id<13;id++)for(const optic of [0,1,3]){
  const weapon=new Weapon(id,{optic,barrel:1,grip:4});weapon.reload();weapon.reloadLeft=weapon.reloadTime*.5;
  const game={time:2,player:{weapon,ads:0,vx:0,vz:0,visualKick:0,switchLeft:0,sprinting:false}};
  r.renderWeapon(game,844/390,false);
  assert.equal([...r.weaponBatches.values()].reduce((n,e)=>n+e.used,0),r.weaponParts.filter(p=>!p.hidden).length,`all parts for weapon ${id}`);
  for(const entry of r.weaponBatches.values()){assert(entry.used<=entry.capacity);for(let i=0;i<entry.used;i++){entry.mesh.getMatrixAt(i,matrix);assert(matrix.elements.every(Number.isFinite));}}
  assert(Number.isFinite(r.muzzleLight.position.z));
 }
});

test('world projection remains centred and magnified ADS omits the obstructing weapon pass',()=>{
 const r=fixture();r.applyQuality=()=>{};r.resize=()=>844/390;r.updateActors=()=>{};r.updateEffects=()=>{};r.uploadDynamic=()=>{};r.updateLighting=()=>{};
 const p={id:0,weapon:new Weapon(7),ads:1,x:0,y:0,z:0,yaw:.67,pitch:.18,vx:0,vz:0,visualKick:.05,landKick:0,dead:false,grounded:true,respawnLeft:0,switchLeft:0,sprinting:false};
 const game={time:3,player:p,eye:()=>({x:0,y:1.65,z:0}),rules:{phase:'playing'},paused:false};
 r.render(game,1/60,false,1/60);assert.deepEqual(r.rendered,[r.scene]);
 const d=direction(p.yaw,p.pitch),screen=r.project({x:d.x*30,y:1.65+d.y*30,z:d.z*30});
 assert(Math.abs(screen.x-.5)<1e-6);assert(Math.abs(screen.y-.5)<1e-6);
 assert.equal(r.project({x:-d.x*30,y:1.65-d.y*30,z:-d.z*30}),null);
 p.weapon=new Weapon(0,{optic:1});r.rendered.length=0;r.render(game,1/60,false,1/60);
 assert.deepEqual(r.rendered,[r.scene,r.weaponScene]);
 const afterWeapon=r.project({x:d.x*30,y:1.65+d.y*30,z:d.z*30});assert(Math.abs(afterWeapon.x-.5)<1e-6);
});

test('instance identity is player-relative in team modes and free for all',()=>{
 const player={id:0,team:1},ally={id:1,team:1},enemy={id:2,team:0};
 const game={player,rules:{enemies:(a,b)=>a.team!==b.team}};
 assert(isFriendly(game,ally));assert(!isFriendly(game,enemy));
 game.rules.enemies=(a,b)=>a.id!==b.id;assert(!isFriendly(game,ally));assert(isFriendly(game,player));
 const r=fixture(),p=part(0,0,-2,1,1,1,'white',{tile:-1}),matrix=new THREE.Matrix4();
 r.addDynamic(r.actorBatches,r.scene,p,'actor',matrix,[.1,.72,.91]);r.uploadDynamic(r.actorBatches);
 const first=[...r.actorBatches.values()][0],color=new THREE.Color();first.mesh.getColorAt(0,color);assert(color.b>color.r);
 r.resetDynamic(r.actorBatches);r.addDynamic(r.actorBatches,r.scene,p,'actor',matrix,[.94,.16,.11]);r.uploadDynamic(r.actorBatches);first.mesh.getColorAt(0,color);assert(color.r>color.b);
});

test('CTF flags animate in the Three scene and keep team-relative cloth colours',()=>{
 const r=fixture(),game=new Game({mode:'ctf'},{seed:592}),carrier=game.actors.find(a=>a.team===1);
 game.player.x=0;game.player.y=0;game.player.z=0;carrier.x=3;carrier.y=0;carrier.z=-4;carrier.yaw=0;
 const blue=game.rules.flags.find(f=>f.team===0),red=game.rules.flags.find(f=>f.team===1);red.carrier=carrier.id;red.atBase=false;
 r.arena=game.arena;r.updateActors(game);r.uploadDynamic(r.actorBatches);
 assert.equal(blue.renderParts.length,2);assert.equal(red.renderParts.length,2);
 assert(red.renderParts[1].objectiveBanner,'the visible flag uses the authored cloth instead of floating trim');
 const banner=red.renderParts[1],binding=r.partData.get(banner).bindings.actor;assert(binding.color.r>binding.color.b,'enemy cloth uses the warm team colour');
 const x=banner.x;carrier.x+=3;game.time+=.1;r.updateActors(game);assert(banner.x>x+2.9,'carried flag follows the operator');
});

test('dynamic Three batches grow without dropping transforms or colours',()=>{
 const r=fixture(),p=part(0,0,-2,1,1,1,'white',{tile:-1}),matrix=new THREE.Matrix4();
 r.addDynamic(r.actorBatches,r.scene,p,'actor',matrix,[.1,.72,.91]);
 assert.equal([...r.actorBatches.values()][0].capacity,64);
 for(let i=1;i<1000;i++){p.x=i;r.addDynamic(r.actorBatches,r.scene,p,'actor',matrix,[.94,.16,.11]);}
 r.uploadDynamic(r.actorBatches);const entry=[...r.actorBatches.values()][0];assert.equal(entry.mesh.count,1000);assert.equal(entry.capacity,1024);
 for(const i of [0,63,64,383,999]){entry.mesh.getMatrixAt(i,matrix);assert.equal(matrix.elements[12],i);}
 const c=new THREE.Color();entry.mesh.getColorAt(0,c);assert(c.b>c.r);entry.mesh.getColorAt(999,c);assert(c.r>c.b);
});

test('destroyed props disappear without rebuilding intact world batches',()=>{
 const r=fixture();r.arena=new Arena(0);r.buildWorld();const count=r.worldBatches.reduce((n,b)=>n+b.count,0),refs=r.worldBatches.slice();
 const victim=r.worldBatches.find(b=>!b.userData.leaf&&b.userData.parts.some(p=>!p.ground)).userData.parts[0];victim.destroyed=true;r.refreshDestroyed();
 assert.equal(r.worldBatches.reduce((n,b)=>n+b.count,0),count-1);assert.deepEqual(r.worldBatches,refs);r.refreshDestroyed();assert.equal(r.worldBatches.reduce((n,b)=>n+b.count,0),count-1);
});

test('idle weapon transforms and instance buffers stop uploading after warmup',()=>{
 const r=fixture(),weapon=new Weapon(0,{optic:1});weapon.sinceShot=10;
 const game={time:1,player:{weapon,ads:0,vx:0,vz:0,visualKick:0,switchLeft:0,sprinting:false}};
 r.renderWeapon(game,844/390,false);
 const versions=[...r.weaponBatches.values()].map(e=>[e.mesh.instanceMatrix.version,e.mesh.instanceColor.version]);
 let recomposed=0;const original=r.partMatrix.bind(r);r.partMatrix=(...args)=>{recomposed++;return original(...args);};
 game.time+=1/60;r.renderWeapon(game,844/390,false);
 assert.equal(recomposed,0,'static local component transforms should be reused');
 assert.deepEqual([...r.weaponBatches.values()].map(e=>[e.mesh.instanceMatrix.version,e.mesh.instanceColor.version]),versions,'an idle view model needs no instance buffer writes');
 weapon.reload();weapon.reloadLeft=weapon.reloadTime*.65;r.renderWeapon(game,844/390,false);
 assert(recomposed>0,'magazine and hand transforms still animate during a reload');
 assert([...r.weaponBatches.values()].some((e,i)=>e.mesh.instanceMatrix.version>versions[i][0]));
});

test('culled and restored parts cannot reuse another actor slot transform or colour',()=>{
 const r=fixture(),a=part(3,1,0,1,1,1,'white',{tile:-1,color:[.1,.72,.91]}),b=part(8,1,0,1,1,1,'white',{tile:-1,color:[.94,.16,.11]});
 const draw=parts=>{r.resetDynamic(r.actorBatches);for(const p of parts)r.addDynamic(r.actorBatches,r.scene,p,'actor');r.uploadDynamic(r.actorBatches);};
 draw([a,b]);draw([b]);draw([a,b]);
 const entry=[...r.actorBatches.values()][0],matrix=new THREE.Matrix4(),color=new THREE.Color();
 entry.mesh.getMatrixAt(0,matrix);assert.equal(matrix.elements[12],3);entry.mesh.getColorAt(0,color);assert(color.b>color.r);
 entry.mesh.getMatrixAt(1,matrix);assert.equal(matrix.elements[12],8);entry.mesh.getColorAt(1,color);assert(color.r>color.b);
 r.clearDynamic(r.actorBatches);draw([a,b]);assert.equal([...r.actorBatches.values()][0].mesh.count,2,'reused parts reconnect to fresh batches after a map reset');
});

test('instance uploads contain only occupied slots and world/actor meshes use fewer triangles',()=>{
 const r=fixture(),p=part(0,0,-2,1,1,1,'white',{tile:-1,mesh:'bevel'});
 r.addDynamic(r.actorBatches,r.scene,p,'actor');r.uploadDynamic(r.actorBatches);
 const entry=[...r.actorBatches.values()][0];
 assert.deepEqual(entry.mesh.instanceMatrix.updateRanges,[{start:0,count:16}]);
 assert.deepEqual(entry.mesh.instanceColor.updateRanges,[{start:0,count:3}]);
 const original=r.partGeometry(p,'weapon').getAttribute('position').count;
 assert.equal(r.partGeometry(p,'actor').getAttribute('position').count,original/4);
 assert(r.partGeometry(p,'world').getAttribute('position').count<original*.6);
});

test('dedicated weapon finishes retain wear contrast and occupy independent material batches',()=>{
 const r=fixture(),metal=part(0,0,-1,.1,.1,.1,'dark',{tile:-1,finishTile:0}),polymer={...metal,finishTile:3};
 const a=r.makeMaterial(metal,'weapon'),b=r.makeMaterial(polymer,'weapon');
 assert.notEqual(a,b);assert.equal(a.map,r.weaponMaps[0].map);assert.equal(b.map,r.weaponMaps[3].map);
 assert.equal(a.normalMap,r.weaponMaps[0].normal);assert(a.normalScale.x<.3,'fine weapon finishes must not look like rock');
 const pixels=new Uint8ClampedArray([20,30,40,255,40,60,80,255]);neutraliseFinish(pixels);
 assert(pixels[0]<pixels[4]);assert(Math.abs(pixels[4]-pixels[5])<2);assert.equal(pixels[3],255);
});

test('mobile smoke keeps concealment while reducing overlapping billboard layers',()=>{
 const r=fixture();r.effects=[];r.decals=[];r.fxAttributes={};r.fxAttributeList=[];
 for(const [key,size] of [['instancePosition',3],['instanceTint',3],['instanceSize',2],['instanceAlpha',1],['instanceKind',1]]){
  r.fxAttributes[key]=new THREE.InstancedBufferAttribute(new Float32Array(280*size),size);r.fxAttributeList.push(r.fxAttributes[key]);
 }
 r.fxMesh={geometry:{instanceCount:0}};r.contactShadows=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial(),64);
 const game={actors:[],grenades:[],smokes:[{x:0,y:0,z:0,age:4}]};
 const counts=[];for(const quality of ['low','medium','high']){r.quality=quality;r.updateEffects(0,game);counts.push(r.fxMesh.geometry.instanceCount);assert(r.fxAttributes.instanceAlpha.getX(0)>=.8);}
 assert.deepEqual(counts,[4,5,6]);
 assert.deepEqual(r.fxAttributes.instancePosition.updateRanges,[{start:0,count:18}]);
 assert.equal(r.contactShadows.instanceMatrix.version,0,'empty contact-shadow buffers do not upload');
});


test('replaced authored colours refresh cached instance tints without rebuilding materials',()=>{
 const r=fixture(),p=part(0,1,-2,1,1,1,'white',{tile:-1,color:[.1,.72,.91]});
 const draw=()=>{r.resetDynamic(r.actorBatches);r.addDynamic(r.actorBatches,r.scene,p,'actor');r.uploadDynamic(r.actorBatches);};
 draw();const entry=[...r.actorBatches.values()][0],material=entry.mesh.material,color=new THREE.Color();
 p.color=[.94,.16,.11];draw();entry.mesh.getColorAt(0,color);
 assert(color.r>color.b);assert.equal(entry.mesh.material,material);
});

test('shadow texels stay stable through small movements and gun lighting follows the world',()=>{
 const r=fixture();r.arena={info:{sun:[.6,.7,.45]},indoors:()=>false};
 r.lightingField=null; // This minimal arena exercises the no-baked-field fallback.
 Object.assign(r,{nearestLights:[null,null,null],lightDistances:[Infinity,Infinity,Infinity],interiorLights:[],lightPositions:[],weaponKeyLight:new THREE.DirectionalLight(),weaponFill:new THREE.HemisphereLight(),shadowClock:1});
 r.sun.shadow.mapSize.set(1024,1024);Object.assign(r.sun.shadow.camera,{left:-28,right:28,top:28,bottom:-28});r.sun.shadow.camera.updateProjectionMatrix();
 r.scene.add(r.sun,r.sun.target);r.weaponScene.environmentIntensity=.85;
 const point=new THREE.Vector3(2,0,3),project=()=>{r.scene.updateMatrixWorld(true);r.sun.shadow.updateMatrices(r.sun);return point.clone().applyMatrix4(r.sun.shadow.matrix);};
 r.updateLighting(1/60);const a=project(),key=r.weaponKeyLight.position.clone();
 r.eye.x+=.00001;r.eye.z+=.00001;r.updateLighting(1/60);const b=project();
 assert(Math.abs(a.x-b.x)<1e-10);assert(Math.abs(a.y-b.y)<1e-10);
 r.camera.rotation.y=Math.PI/2;r.camera.updateMatrixWorld();r.updateLighting(1/60);
 assert(key.distanceTo(r.weaponKeyLight.position)>1,'turning changes camera-space sunlight');
 const outdoorIntensity=r.weaponScene.environmentIntensity;
 r.arena.indoors=()=>true;r.updateLighting(.2);assert(r.weaponScene.environmentIntensity<outdoorIntensity);
 assert(r.sun.shadow.matrix.elements.every(Number.isFinite));
});
