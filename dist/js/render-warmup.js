import * as THREE from '../vendor/three.module.min.js';

// compileAsync visits visible-material programs, but Three creates its shadow
// depth programs only during a shadow draw. Prepare both while controls are
// disabled, in small groups that let the loading screen keep painting.
const BATCH_SIZE=8;
const yieldLoading=()=>new Promise(resolve=>setTimeout(resolve,0));
const renderable=o=>o.isMesh||o.isSprite||o.isPoints||o.isLine;

function descriptors(state,scene,category){
 const result=[],seen=new Set();
 const actorParts=new Map([...state.actorBatches.values()].map(e=>[e.mesh,e.slots[0]]));
 const add=(source,geometry=source.geometry,material=source.material)=>{
  if(!geometry&&!source.isSprite||!material)return;
  const key=`${geometry?.id??'sprite'}/${material.id}/${!!source.isInstancedMesh}/${!!source.instanceColor}/${!!source.castShadow}/${!!source.receiveShadow}`;
  if(seen.has(key))return;seen.add(key);result.push({source,geometry,material});
 };
 scene.traverse(source=>{
  if(!renderable(source))return;add(source);
  if(!source.isInstancedMesh||!state.blenderAssets)return;
  const p=source.userData.parts?.[0]??(category==='actor'?actorParts.get(source):null);
  const kind=source.userData.parts?'world':category;
  if(!p)return;
  for(const far of [false,true]){
   const part={...p,blenderFar:far},geometry=state.blenderAssets.geometry(part,kind,far);
   if(geometry)add(source,geometry,kind==='actor'?state.makeMaterial(part,kind):source.material);
  }
 });
 // Reload-only parts may never enter the idle viewmodel batches. Reserve
 // their material interface without changing ammunition or animation time.
 if(category==='weapon'){
  const parts=[...(state.blenderWeaponGroups??[]),...(state.blenderHandGroups??[])];
  for(let i=state.blenderWeaponGroups?state.weaponParts?.coreCount??0:0;i<(state.weaponParts?.length??0);i++){
   const p=state.weaponParts[i];if(state.blenderHandGroups&&/^(rightHand|supportHand|pumpHand)$/.test(p.tag??''))continue;parts.push(p);
  }
  for(const p of parts)if(p.hidden){
   const source=new THREE.InstancedMesh(state.partGeometry(p,'weapon'),state.makeMaterial(p,'weapon'),1);
   source.setColorAt(0,new THREE.Color(1,1,1));add(source);source.dispose();
  }
 }
 return result;
}

function representative({source,geometry,material},camera){
 let mesh;
 if(source.isInstancedMesh){
  mesh=new THREE.InstancedMesh(geometry,material,1);
  mesh.setMatrixAt(0,new THREE.Matrix4());
  if(source.instanceColor)mesh.setColorAt(0,new THREE.Color(1,1,1));
 }else if(source.isSprite)mesh=new THREE.Sprite(material);
 else if(source.isPoints)mesh=new THREE.Points(geometry,material);
 else if(source.isLine)mesh=new THREE.Line(geometry,material);
 else mesh=new THREE.Mesh(geometry,material);
 // Visibility and instance counts are independent of the menu camera and LOD.
 mesh.frustumCulled=false;mesh.castShadow=source.castShadow;mesh.receiveShadow=source.receiveShadow;
 mesh.customDepthMaterial=source.customDepthMaterial;
 mesh.position.copy(camera.position).add(new THREE.Vector3(0,0,-2).applyQuaternion(camera.quaternion));
 return mesh;
}

function shadowMaterial(mesh){
 const source=mesh.material;
 const custom=mesh.customDepthMaterial;
 const depth=custom?custom.clone():new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
 if(custom){depth.onBeforeCompile=custom.onBeforeCompile;depth.customProgramCacheKey=custom.customProgramCacheKey;}
 // Match WebGLShadowMap's PCF depth variant, including its alpha-to-coverage
 // approximation. The real draw below still uses Three's actual depth cache.
 depth.side=source.shadowSide??(source.side===THREE.FrontSide?THREE.BackSide:source.side===THREE.BackSide?THREE.FrontSide:THREE.DoubleSide);
 depth.visible=source.visible;depth.wireframe=source.wireframe;
 depth.map=source.map;depth.alphaMap=source.alphaMap;depth.alphaTest=source.alphaToCoverage?.5:source.alphaTest;
 depth.displacementMap=source.displacementMap;depth.displacementScale=source.displacementScale;depth.displacementBias=source.displacementBias;
 depth.clipShadows=source.clipShadows;depth.clippingPlanes=source.clippingPlanes;depth.clipIntersection=source.clipIntersection;
 return depth;
}

async function compile(renderer,objects,camera,scene){
 if(renderer.compileAsync)await renderer.compileAsync(objects,camera,scene);
 else renderer.compile?.(objects,camera,scene);
}

async function warmScene(state,scene,camera,items,stats,yieldFrame,depthTarget){
 const renderer=state.renderer,hidden=[],group=new THREE.Group();
 scene.traverse(object=>{if(renderable(object)){hidden.push([object,object.visible]);object.visible=false;}});
 scene.add(group);
 try{
  for(let start=0;start<items.length;start+=BATCH_SIZE){
   if(state.lost)throw Error('Graphics context unavailable');
   const meshes=[],depths=[],depthScene=new THREE.Scene(),depthGroup=new THREE.Group(),counts=[];
   depthScene.add(depthGroup);
   // Shadow draws use an empty fog/environment but retain the current scene's
   // light-count defines. Match those counts during asynchronous preparation.
   scene.traverseVisible(object=>{if(object.isLight&&object.layers.test(camera.layers))depthScene.add(object.clone());});
   try{
    for(const item of items.slice(start,start+BATCH_SIZE)){
     const mesh=representative(item,camera);meshes.push(mesh);group.add(mesh);
     if(mesh.geometry?.isInstancedBufferGeometry&&!mesh.geometry.instanceCount){counts.push([mesh.geometry,mesh.geometry.instanceCount]);mesh.geometry.instanceCount=1;}
     if(renderer.shadowMap.enabled&&mesh.castShadow){
      const depth=shadowMaterial(mesh),proxy=representative({...item,material:depth},camera);
      depths.push([depth,proxy]);depthGroup.add(proxy);
     }
    }
    if(depths.length){
     renderer.setRenderTarget(depthTarget);
     await compile(renderer,depthGroup,state.sun.shadow.camera,depthScene);
    }
    // An offscreen colour target changes Three's tone/output defines. Use the
    // actual framebuffer with a one-pixel scissor under the loading overlay.
    renderer.setRenderTarget(null);
    // Adaptive quality can turn shadows off mid-match. Cache that main
    // program family too, without adding another draw or changing quality.
    if(scene===state.scene){
     const enabled=renderer.shadowMap.enabled;
     try{renderer.shadowMap.enabled=!enabled;await compile(renderer,group,camera,scene);}
     finally{renderer.shadowMap.enabled=enabled;}
    }
    await compile(renderer,group,camera,scene);
    renderer.setScissor?.(0,0,1,1);renderer.setScissorTest?.(true);
    if(depths.length){renderer.shadowMap.needsUpdate=true;state.sun.shadow.needsUpdate=true;}
    renderer.clear?.(true,true,false);renderer.render(scene,camera);
    stats.batches++;stats.materialVariants+=meshes.length;stats.shadowVariants+=depths.length;
   }finally{
    for(const [geometry,count]of counts)geometry.instanceCount=count;
    for(const mesh of meshes){group.remove(mesh);if(mesh.isInstancedMesh)mesh.dispose();}
    for(const [depth,proxy]of depths){depth.dispose();if(proxy.isInstancedMesh)proxy.dispose();}
   }
   // Also yields when parallel shader compilation is unavailable.
   await yieldFrame();stats.yields++;
  }
 }finally{scene.remove(group);for(const [object,visible]of hidden)object.visible=visible;}
}

export async function warmMatchMaterials(state,game,aspect,{yieldFrame=yieldLoading}={}){
 const started=performance.now(),renderer=state.renderer,p=game.player,slot=p.slot,shadowEnabled=renderer.shadowMap.enabled;
 const target=renderer.getRenderTarget?.()??null,face=renderer.getActiveCubeFace?.()??0,level=renderer.getActiveMipmapLevel?.()??0;
 const viewport=renderer.getViewport?.(new THREE.Vector4()),scissor=renderer.getScissor?.(new THREE.Vector4()),scissorTest=renderer.getScissorTest?.()??false;
 const depthTarget=renderer.shadowMap.enabled?new THREE.WebGLRenderTarget(1,1):null;
 const weaponEnvironment=state.weaponScene.environment;
 const environments=[...new Set([state.environment?.texture,weaponEnvironment,state.environmentProbes?.interior?.texture].filter(Boolean))];
 const stats={batches:0,materialVariants:0,shadowVariants:0,yields:0};
 try{
  for(let i=0;i<p.weapons.length;i++){
   p.slot=i;state.prepareWeapon(game,aspect,false);
   const items=descriptors(state,state.weaponScene,'weapon');
   for(const environment of environments.length?environments:[weaponEnvironment]){
    state.weaponScene.environment=environment;
    await warmScene(state,state.weaponScene,state.weaponCamera,items,stats,yieldFrame,depthTarget);
   }
  }
  await warmScene(state,state.scene,state.camera,descriptors(state,state.scene,'actor'),stats,yieldFrame,depthTarget);
  if(state.lost)throw Error('Graphics context unavailable');
  return stats;
 }finally{
  stats.durationMs=performance.now()-started;renderer.shadowMap.enabled=shadowEnabled;
  state.weaponScene.environment=weaponEnvironment;p.slot=slot;
  depthTarget?.dispose();renderer.setRenderTarget(target,face,level);
  if(viewport)renderer.setViewport(viewport);if(scissor)renderer.setScissor(scissor);renderer.setScissorTest?.(scissorTest);
  // The warmup shadow map contains representatives, so replace it on the
  // first gameplay draw even if the normal update interval has not elapsed.
  state.shadowClock=1;renderer.shadowMap.needsUpdate=true;state.sun.shadow.needsUpdate=true;
  state.prepareWeapon(game,aspect,false);
 }
}
