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
import {Game} from '../dist/js/engine.js';
import {Weapon} from '../dist/js/weapons.js';
import {traceBullet} from '../dist/js/ballistics.js';

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

test('actual native facade shots receive cosmetic cracks on the stopped owner while collision and endpoints stay unchanged',()=>{
 const owns=(part,block)=>part===block||block.isPrototypeOf(part);
 for(const map of [0,13,14]){
  const game=new Game({map},{seed:64013}),player=game.player;game.actors=[player];
  const parts=blenderWorld(game.arena),panels=collectGlassPanels(parts,p=>assets.geometry(p,'world'));
  const owner=game.arena.blocks.find(b=>b.h>5&&b.w>4&&b.d>4&&panels.some(p=>owns(p.part,b)));assert(owner);
  const system=new GlassDamageSystem(new THREE.Scene());system.setPanels(parts,p=>assets.geometry(p,'world'));
  const blocksBefore=JSON.stringify(game.arena.blocks);
  for(const sign of [-1,1]){
   const panel=panels.find(p=>owns(p.part,owner)&&p.normal.z*sign>.995&&(p.centre.z-owner.z)*sign>0);assert(panel);
   const origin=panel.centre.clone().addScaledVector(panel.normal,1),dir=panel.normal.clone().negate();
   player.reset({x:origin.x,y:origin.y-player.height+.12,z:origin.z},Math.atan2(dir.x,-dir.z));player.spawnProtection=0;
   player.weapons[0]=new Weapon(0);player.weapon.spread=()=>0;game.events.length=0;
   const expected=traceBullet(game.arena,game.actors,player,origin,dir,player.weapon);assert.equal(expected.impacts.at(-1).block,owner);
   assert.equal(intersectGlassPanel(panel,origin,expected.end),null,'retained collider precedes the visible inset');
   assert(game.shoot(player));const event=game.events.find(e=>e.type==='shot');assert.equal(event.stoppedBlock,owner);assert.deepEqual(event.end,expected.end);
   const contacts=system.shot(event);assert(contacts.some(h=>owns(h.panel.part,owner)&&h.panel.normal.z*sign>.995&&h.cosmeticInset));
   assert(contacts.every(h=>owns(h.panel.part,owner)),'the stop cannot fracture a different building');
  }
  system.update();assert.equal(system.mesh.count,2);assert.equal(JSON.stringify(game.arena.blocks),blocksBefore);assert.equal(player.health,100);system.dispose();
 }
});

test('inset projection requires exact owner, matching entry face and a bounded in-pane contact',()=>{
 const owner={x:0,y:1.5,z:0,w:10,h:3,d:10,surface:'concrete'};
 const makeVisual=(z,source=owner)=>Object.assign(Object.create(source),{x:0,y:1.5,z,w:1.2,h:1.1,d:.05,surface:'glass'});
 const near=makeVisual(4.4),deep=makeVisual(2),unrelated={...makeVisual(4.4)},far=makeVisual(-4.4);
 const system=new GlassDamageSystem(new THREE.Scene());system.setPanels([near,deep,unrelated,far]);
 const position={x:0,y:1.5,z:7},end={x:0,y:1.5,z:5};
 assert.equal(system.shot({position,end}).length,0,'no guessed collision provenance');
 assert.equal(system.shot({position,end,stoppedBlock:{...owner}}).length,0,'identical dimensions do not prove ownership');
 let contacts=system.shot({position,end,stoppedBlock:owner});assert.equal(contacts.length,1);assert.equal(contacts[0].panel.part,near);assert(contacts[0].cosmeticInset);
 assert.equal(system.shot({position:{x:.8,y:1.5,z:7},end:{x:.8,y:1.5,z:5},stoppedBlock:owner}).length,0,'no crack beyond the exact pane rectangle');
 assert.equal(system.shot({position,end:{...end,z:5.2},stoppedBlock:owner}).length,0,'cover stopped before the claimed owner');
 assert.equal(system.shot({position,end:{...end,z:4.8},stoppedBlock:owner}).length,0,'a target inside cover is not a stopped entry');
 owner.destroyed=true;assert.equal(system.shot({position,end,stoppedBlock:owner}).length,0);system.dispose();
});

test('penetrated covers and actor hits never claim a stopped collider for inset damage',()=>{
 const game=new Game({}, {seed:64014}),player=game.player,target=game.actors[4];game.actors=[player,target];game.arena.blocks=[];
 player.reset({x:0,y:0,z:0},0);target.reset({x:0,y:0,z:-8},0);player.spawnProtection=target.spawnProtection=0;
 player.weapons[0]=new Weapon(0);player.weapon.spread=()=>0;
 const wood=game.arena.box(0,1.5,-3,3,3,.12,'wood');game.arena.bakeCollision();game.events.length=0;
 assert(game.shoot(player));assert(game.events.some(e=>e.type==='penetration'));assert.equal(game.events.find(e=>e.type==='shot').stoppedBlock,null);assert(target.health<100);
 player.weapon.cooldown=0;target.health=0;game.events.length=0;assert(game.shoot(player));assert.equal(game.events.find(e=>e.type==='shot').stoppedBlock,null,'a through-shot retains no final stop');
 player.weapon.cooldown=0;wood.surface='concrete';game.events.length=0;assert(game.shoot(player));assert.equal(game.events.find(e=>e.type==='shot').stoppedBlock,wood);
});

test('a real foreground cover stop cannot project cracks onto another owner behind it',()=>{
 const game=new Game({}, {seed:64015}),player=game.player;game.actors=[player];game.arena.blocks=[];
 const owner=game.arena.box(0,1.5,0,10,3,10,'concrete'),cover=game.arena.box(0,1.5,6,2,3,.05,'concrete');game.arena.bakeCollision();
 const visual=Object.assign(Object.create(owner),{x:0,y:1.5,z:4.4,w:1.2,h:1.1,d:.05,surface:'glass'});
 const system=new GlassDamageSystem(new THREE.Scene());system.setPanels([visual]);
 player.reset({x:0,y:1.5-player.height+.12,z:7},0);player.spawnProtection=0;player.weapons[0]=new Weapon(0);player.weapon.spread=()=>0;game.events.length=0;
 assert(game.shoot(player));const event=game.events.find(e=>e.type==='shot');assert.equal(event.stoppedBlock,cover);assert.equal(system.shot(event).length,0);
 system.update();assert.equal(system.mesh.count,0);system.dispose();
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
