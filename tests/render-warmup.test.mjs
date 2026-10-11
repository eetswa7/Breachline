import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.min.js';
import {warmMatchMaterials} from '../dist/js/render-warmup.js';

function fixture(){
 const scene=new THREE.Scene(),weaponScene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),sun=new THREE.DirectionalLight();sun.castShadow=true;scene.add(sun,sun.target);
 const hidden=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());hidden.visible=false;scene.add(hidden);
 const matrices=new THREE.Matrix4(),near=new THREE.BoxGeometry(),far=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial({vertexColors:true});
 const world=new THREE.InstancedMesh(near,material,2);world.setColorAt(0,new THREE.Color());world.setMatrixAt(0,matrices);world.count=0;world.castShadow=true;world.receiveShadow=true;world.userData.parts=[{world:true}];scene.add(world);
 const actor=new THREE.InstancedMesh(near,new THREE.MeshStandardMaterial(),2);actor.castShadow=true;scene.add(actor);
 const muzzle=new THREE.Sprite(new THREE.SpriteMaterial());muzzle.visible=false;weaponScene.add(muzzle);
 const weapon=new THREE.InstancedMesh(near,new THREE.MeshStandardMaterial(),1);weaponScene.add(weapon);
 const calls=[],draws=[],game={time:18,player:{slot:1,weapons:[{ammo:30},{ammo:12}]}},farMaterial=new THREE.MeshStandardMaterial();
 const originalTarget=new THREE.WebGLRenderTarget(4,4),viewport=new THREE.Vector4(2,3,400,200),scissor=new THREE.Vector4(1,2,100,50);
 let target=originalTarget,scissorTest=false,currentViewport=viewport.clone(),currentScissor=scissor.clone();
 const renderer={shadowMap:{enabled:true,needsUpdate:false},getRenderTarget:()=>target,getActiveCubeFace:()=>2,getActiveMipmapLevel:()=>1,
  setRenderTarget(t,face,level){target=t;this.lastTarget=[t,face,level];},getViewport:o=>o.copy(currentViewport),setViewport:o=>currentViewport.copy(o),
  getScissor:o=>o.copy(currentScissor),setScissor(...args){if(args.length===1)currentScissor.copy(args[0]);else currentScissor.set(...args);},getScissorTest:()=>scissorTest,setScissorTest:v=>{scissorTest=v;},
  async compileAsync(objects,camera,scene){calls.push({objects:[...objects.children],camera,scene,target,environment:scene.environment,shadowEnabled:this.shadowMap.enabled});assert(objects.children.length<=8);},clear(){},
  render(scene){const visible=[];scene.traverseVisible(o=>{if(o.isMesh||o.isSprite)visible.push(o);});draws.push({scene,visible,target,scissorTest,scissor:currentScissor.clone()});assert(!visible.includes(world)&&!visible.includes(actor)&&!visible.includes(hidden)&&!visible.includes(muzzle));assert(visible.length<=8);},
 };
 const geometryCalls=[];
 const state={scene,weaponScene,camera,weaponCamera:new THREE.PerspectiveCamera(),sun,renderer,actorBatches:new Map([['actor',{mesh:actor,slots:[{world:false}]}]]),
  blenderAssets:{geometry(p,category,isFar){geometryCalls.push({world:p.world,category,isFar});return isFar?far:near;}},
  makeMaterial:(p,category)=>p.blenderFar?farMaterial:actor.material,prepareWeapon(){state.lastSlot=game.player.slot;},shadowClock:0};
 return {state,game,scene,weaponScene,world,actor,hidden,muzzle,calls,draws,geometryCalls,near,far,farMaterial,originalTarget,viewport,scissor};
}

test('loading warmup covers inactive world/actor LOD and muzzle programs, draws real shadows, and restores state',async()=>{
 const f=fixture(),{state,game}=f;let yields=0;
 const time=game.time,ammo=game.player.weapons.map(w=>w.ammo),children=[...state.scene.children];
 const stats=await warmMatchMaterials(state,game,2,{yieldFrame:async()=>{yields++;}});
 assert.equal(stats.batches,3);assert.equal(stats.yields,yields);assert.equal(stats.shadowVariants,4);
 assert(Number.isFinite(stats.durationMs)&&stats.durationMs>=0);assert.deepEqual(f.calls.filter(c=>c.scene===f.scene).map(c=>c.shadowEnabled),[false,true]);assert(state.renderer.shadowMap.enabled);
 assert(f.geometryCalls.some(c=>c.world&&c.category==='world'&&c.isFar));assert(f.geometryCalls.some(c=>!c.world&&c.category==='actor'&&c.isFar));
 assert(f.draws.some(d=>d.visible.some(m=>m.geometry===f.far&&m.material===f.farMaterial)));
 assert(f.draws.filter(d=>d.scene===f.weaponScene).every(d=>d.visible.some(m=>m.isSprite&&m.visible)),'first muzzle flash is warmed even though the real sprite is hidden');
 for(const draw of f.draws){assert.equal(draw.target,null);assert(draw.scissorTest);assert.deepEqual(draw.scissor.toArray(),[0,0,1,1]);}
 const depths=f.calls.filter(c=>c.camera===state.sun.shadow.camera);assert.equal(depths.length,1);assert(depths[0].target?.isWebGLRenderTarget);assert(depths[0].objects.every(o=>o.material.isMeshDepthMaterial&&o.material.side===THREE.BackSide));
 assert.equal(depths[0].scene.children.filter(o=>o.isLight&&o.castShadow).length,1,'depth preparation preserves the real shadow-light defines without fog or environment');assert.equal(depths[0].scene.fog,null);assert.equal(depths[0].scene.environment,null);
 assert.deepEqual(state.renderer.lastTarget,[f.originalTarget,2,1]);assert.deepEqual(state.renderer.getViewport(new THREE.Vector4()),f.viewport);assert.deepEqual(state.renderer.getScissor(new THREE.Vector4()),f.scissor);assert.equal(state.renderer.getScissorTest(),false);
 assert.deepEqual(state.scene.children,children);assert.equal(f.world.count,0);assert(f.world.visible);assert.equal(f.hidden.visible,false);assert.equal(f.muzzle.visible,false);assert.equal(game.player.slot,1);assert.equal(state.lastSlot,1);
 assert.equal(game.time,time);assert.deepEqual(game.player.weapons.map(w=>w.ammo),ammo);assert.equal(state.shadowClock,1);assert(state.sun.shadow.needsUpdate&&state.renderer.shadowMap.needsUpdate);
});

test('both interior and exterior hero probes and reload-only parts are ready without changing live visibility',async()=>{
 const f=fixture(),exterior=new THREE.Texture(),interior=new THREE.Texture(),hiddenPart={hidden:true};
 f.state.weaponScene.environment=exterior;f.state.environment={texture:exterior};f.state.environmentProbes={interior:{texture:interior}};
 f.state.weaponParts=[hiddenPart];f.state.partGeometry=()=>f.near;
 const makeMaterial=f.state.makeMaterial;f.state.makeMaterial=(p,category)=>category==='weapon'?f.farMaterial:makeMaterial(p,category);
 const stats=await warmMatchMaterials(f.state,f.game,2,{yieldFrame:async()=>{}});
 assert.equal(stats.batches,5);assert.deepEqual(f.calls.filter(c=>c.scene===f.weaponScene).map(c=>c.environment),[exterior,interior,exterior,interior]);
 assert(f.draws.filter(d=>d.scene===f.weaponScene).every(d=>d.visible.some(o=>o.material===f.farMaterial)));
 assert(hiddenPart.hidden);assert.equal(f.state.weaponScene.environment,exterior);assert.equal(f.game.player.slot,1);
});

test('starting at low quality precompiles the shadow-enabled main family and restores its disabled shadow state',async()=>{
 const f=fixture();f.state.renderer.shadowMap.enabled=false;
 const stats=await warmMatchMaterials(f.state,f.game,2,{yieldFrame:async()=>{}});
 assert.deepEqual(f.calls.filter(c=>c.scene===f.scene).map(c=>c.shadowEnabled),[true,false]);
 assert.equal(f.state.renderer.shadowMap.enabled,false);assert.equal(stats.shadowVariants,0);assert.equal(stats.batches,3);assert.equal(f.draws.length,3);
});

test('warmup restores visibility and framebuffer state after async compile rejection or context loss between yields',async()=>{
 for(const failure of ['compile','compile_low','context']){
  const f=fixture();if(failure==='compile')f.state.renderer.compileAsync=async()=>{throw Error('Shader failure');};
  if(failure==='compile_low')f.state.renderer.compileAsync=async(objects,camera,scene)=>{if(scene===f.scene&&!f.state.renderer.shadowMap.enabled)throw Error('Shader failure');};
  await assert.rejects(()=>warmMatchMaterials(f.state,f.game,2,{yieldFrame:async()=>{if(failure==='context')f.state.lost=true;}}),failure.startsWith('compile')?/Shader failure/:/Graphics context unavailable/);
  assert.equal(f.game.player.slot,1);assert.equal(f.state.lastSlot,1);assert(f.world.visible);assert(f.actor.visible);assert(!f.hidden.visible);assert(!f.muzzle.visible);
  assert.deepEqual(f.state.renderer.lastTarget,[f.originalTarget,2,1]);assert.equal(f.state.renderer.getScissorTest(),false);assert(f.state.renderer.shadowMap.enabled);assert.equal(f.state.scene.children.length,5);assert.equal(f.weaponScene.children.length,2);
 }
});

test('synchronous compile fallback still yields between groups and prepares alpha-tested custom shadow variants',async()=>{
 const f=fixture(),depth=new THREE.MeshDepthMaterial(),map=new THREE.Texture();let patched=0;
 f.world.material.side=THREE.DoubleSide;f.world.material.alphaToCoverage=true;f.world.material.map=map;
 depth.onBeforeCompile=()=>{patched++;};depth.customProgramCacheKey=()=> 'wind-test';f.world.customDepthMaterial=depth;
 delete f.state.renderer.compileAsync;let calls=0,yields=0;
 f.state.renderer.compile=(objects,camera,scene)=>{calls++;if(camera===f.state.sun.shadow.camera){for(const object of objects.children){if(object.material.customProgramCacheKey()==='wind-test'){assert.equal(object.material.alphaTest,.5);assert.equal(object.material.map,map);assert.equal(object.material.side,THREE.DoubleSide);object.material.onBeforeCompile();}}}};
 await warmMatchMaterials(f.state,f.game,2,{yieldFrame:async()=>{yields++;}});
 assert.equal(yields,3);assert.equal(calls,5);assert.equal(patched,2);assert.equal(f.world.customDepthMaterial,depth);
});
