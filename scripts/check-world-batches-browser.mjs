// Cell-only native gameplay comparison. Immutable module snapshots keep both
// browser contexts on the same runtime even while other production work proceeds.
// Software WebGL counts and images never establish physical iPhone performance.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {spawn,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

const args=process.argv.slice(2),option=(name,fallback)=>args.find(a=>a.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const mode=option('comparison','cells'),out=option('out','docs/art-release67/world-batches'),port=Number(option('port','4202'));
assert(['cells','bounds'].includes(mode),'Unknown comparison mode');
const require=createRequire(import.meta.url),search=[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,...(process.env.NODE_PATH??'').split(':')].filter(Boolean);
let chromium;for(const path of [...search.map(p=>resolve(p,'playwright')),'playwright'])try{({chromium}=require(path));break;}catch{}
assert(chromium,'Playwright is required');
const git=(...argv)=>execFileSync('git',argv,{encoding:'utf8'}).trim(),hash=data=>createHash('sha256').update(data).digest('hex');
const modules=Object.fromEntries(await Promise.all((await readdir('dist/js')).filter(n=>n.endsWith('.js')).map(async n=>[n,await readFile(`dist/js/${n}`)])));
const sourceCommit=git('rev-parse','HEAD'),distributionDirtyAtSnapshot=!!git('status','--porcelain','--','dist'),current=modules['three-renderer.js'].toString(),originalChunk="`${Math.floor(p.x / cell)}/${Math.floor(p.z / cell)}`",centredChunk="`${Math.floor((p.x + cell*.5) / cell)}/${Math.floor((p.z + cell*.5) / cell)}`";
assert.equal(current.split(centredChunk).length,2,'Expected one centred assignment');
const original=mode==='cells'?current.replace(centredChunk,originalChunk):current,historical=git('show','d38e0f1:dist/js/three-renderer.js');
assert(historical.includes(originalChunk),'Historical source must contain original assignment');
const boundsCall='  unionBlenderLODBounds(geometries);',assetModule=modules['blender-assets.js'].toString(),originalAssetModule=mode==='bounds'?assetModule.replace(boundsCall,''):assetModule;
if(mode==='bounds')assert.equal(assetModule.split(boundsCall).length,2,'Expected one near/far bounds union call');
const runtimeSha256=Object.fromEntries(Object.entries(modules).map(([n,b])=>[n,hash(b)]));
const snapshots={original:{rendererSha256:hash(original),blenderAssetsSha256:hash(originalAssetModule),cellFormula:mode==='cells'?originalChunk:centredChunk},centred:{rendererSha256:hash(current),blenderAssetsSha256:hash(assetModule),cellFormula:centredChunk}};
const origin=process.env.ART_TEST_ORIGIN??`http://127.0.0.1:${port}`,server=process.env.ART_TEST_ORIGIN?null:spawn(process.execPath,['scripts/preview.mjs','--port',String(port)],{stdio:['ignore','pipe','pipe']});
const errors=[],requestFailures=[],sides={},captures=[];let browser;
try{
 if(server)await new Promise((ok,fail)=>{const timer=setTimeout(()=>fail(Error('Preview startup timed out')),15000);server.stdout.on('data',d=>{if(String(d).includes('preview ready')){clearTimeout(timer);ok();}});server.on('error',fail);});
 await mkdir(out,{recursive:true});
 browser=await chromium.launch({headless:true,executablePath:process.env.ART_TEST_BROWSER??'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 console.log('Immutable runtime snapshot captured',sourceCommit,snapshots);
 for(const side of ['original','centred']){
  const context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:1,serviceWorkers:'block'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push({side,error:e.message}));page.on('console',m=>{if(m.type()==='error')errors.push({side,error:m.text()});});
  page.on('requestfailed',r=>requestFailures.push({side,url:r.url(),failure:r.failure()?.errorText}));page.on('response',r=>{if(r.status()>=400)requestFailures.push({side,url:r.url(),status:r.status()});});
  await page.route('**/js/*.js*',route=>{const name=new URL(route.request().url()).pathname.split('/').at(-1),body=name==='three-renderer.js'?(side==='original'?original:current):name==='blender-assets.js'&&side==='original'?originalAssetModule:modules[name];assert(body,`Unknown snapshot module ${name}`);return route.fulfill({contentType:'application/javascript',body});});
  await page.route('**/__world_batches',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden}canvas{width:100vw;height:100vh;display:block}</style><canvas></canvas>'}));
  await page.goto(origin+'/__world_batches');
  const environment=await page.evaluate(async()=>{
   const [{Renderer},{Game},{Weapon},{rng},{MAPS},THREE]=await Promise.all([import('/js/three-renderer.js'),import('/js/engine.js'),import('/js/weapons.js'),import('/js/math.js'),import('/js/maps.js'),import('/vendor/three.module.min.js')]);
   Math.random=rng(670817);
   const game=new Game({map:14,mode:'tdm'},{seed:817}),renderer=new Renderer(document.querySelector('canvas'),{quality:'high',motion:false,fov:80,frameRate:60});renderer.setArena(game.arena);await renderer.ready;
   const q=window.batches={Game,Weapon,MAPS,THREE,game,renderer};
   q.state=()=>JSON.stringify({blocks:q.game.arena.blocks,decor:q.game.arena.decor,objectives:q.game.arena.objectives,spawns:q.game.arena.spawns,doors:q.game.arena.doors});
   q.describe=p=>JSON.stringify([p.x,p.y,p.z,p.w,p.h,p.d,p.yaw??0,p.pitch??0,p.roll??0,p.surface,p.mesh,p.blenderKind,p.blenderMesh,p.tile,p.color,p.renderMicroDetail??false]);
   q.digest=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',typeof v==='string'?new TextEncoder().encode(v):v)),b=>b.toString(16).padStart(2,'0')).join('');
   q.place=shot=>{
    const g=q.game,requested=shot.view==='spawn'?{x:g.player.x,y:g.player.y,z:g.player.z}:{x:shot.x??0,y:shot.y??0,z:shot.z??0},candidates=[requested];
    for(const distance of [1,2,4,6])for(let n=0;n<16;n++)candidates.push({x:requested.x+Math.sin(n*Math.PI/8)*distance,y:requested.y,z:requested.z+Math.cos(n*Math.PI/8)*distance});candidates.push(...g.arena.spawns);
    const selected=candidates.find(p=>Math.abs(p.x)<g.arena.info.size-.5&&Math.abs(p.z)<g.arena.info.size-.5&&!g.arena.collides({x:p.x,y:g.arena.floorAt(p,p.y+.36)+.04,z:p.z},.31,g.player.height-.04));
    if(!selected)throw Error(`No legal camera for ${shot.name}`);
    const position={x:selected.x,y:g.arena.floorAt(selected,selected.y+.36),z:selected.z},target=shot.target??{x:0,y:1.2,z:0};
    g.player.reset(position,shot.yaw??Math.atan2(target.x-position.x,-(target.z-position.z)));const eye=g.eye(g.player);g.player.pitch=shot.pitch??Math.atan2(target.y-eye.y,Math.hypot(target.x-eye.x,target.z-eye.z));
    g.player.weapons[0]=new Weapon(0,{optic:1});g.player.slot=0;g.actors=[g.player];g.time=2;g.events=[];g.rules.time=999;renderer.cameraY=null;renderer.weaponKey='';renderer.lightClock=0;
    q.placement={requested,position,adjusted:position.x!==requested.x||position.z!==requested.z};
   };
   q.prepare=async shot=>{
    if(q.game.arena.info.id!==shot.map){q.game=new Game({map:shot.map,mode:'tdm'},{seed:817});renderer.setArena(q.game.arena);}
    q.place(shot);await renderer.prepareMatch(q.game);renderer.render(q.game,0,false);for(let i=0;i<40;i++)renderer.updateLighting(1/60);
    renderer.blenderAssets.lodClock=0;renderer.blenderAssets.updateLOD(renderer,0);renderer.sceneLOD.clock=0;renderer.sceneLOD.update(renderer,0);q.authoritative=q.state();
   };
   q.frame=async fullDetail=>{
    const r=renderer,g=q.game,p=g.player;let updateLOD,updateScene;
    if(fullDetail){r.buildWorld();updateLOD=r.blenderAssets.updateLOD;updateScene=r.sceneLOD.update;r.blenderAssets.updateLOD=()=>{};r.sceneLOD.update=()=>{};}
    r.shadowClock=1;r.render(g,0,false);
    const active=r.worldBatches.filter(b=>b.count>0),allParts=r.worldBatches.filter(b=>!b.userData.blenderPair||b===b.userData.blenderPair.near).flatMap(b=>b.userData.parts.map(p=>[q.describe(p),r.materialKey(p,'world'),Array.from(r.partMatrix(p).elements)])),pairSelection=r.blenderWorldLODs.flatMap(pair=>pair.parts.map(p=>[q.describe(p),pair.visibility.get(p)??false]));
    let instances=0,instanceSphereOutsideBatch=0,instanceVertexOutsideBatch=0,instanceSphereFrustumDisagreements=0,frustumRejectedBatches=0;
    const sphere=new THREE.Sphere(),matrix=new THREE.Matrix4(),vertex=new THREE.Vector3();
    for(const batch of active){if(!batch.geometry.boundingSphere)batch.geometry.computeBoundingSphere();const batchVisible=!batch.frustumCulled||r.frustum.intersectsSphere(batch.boundingSphere);if(!batchVisible)frustumRejectedBatches++;
     for(let i=0;i<batch.count;i++){instances++;batch.getMatrixAt(i,matrix);sphere.copy(batch.geometry.boundingSphere).applyMatrix4(matrix);
      if(sphere.center.distanceTo(batch.boundingSphere.center)+sphere.radius>batch.boundingSphere.radius+.001){instanceSphereOutsideBatch++;const vertices=batch.geometry.getAttribute('position');let outside=false;for(let j=0;j<vertices.count;j++){vertex.fromBufferAttribute(vertices,j).applyMatrix4(matrix);if(vertex.distanceTo(batch.boundingSphere.center)>batch.boundingSphere.radius+.001){outside=true;break;}}if(outside)instanceVertexOutsideBatch++;}
      if(r.frustum.intersectsSphere(sphere)&&!batchVisible)instanceSphereFrustumDisagreements++;
     }
    }
    const gl=r.renderer.getContext(),pixels=new Uint8Array(r.width*r.height*4);gl.readPixels(0,0,r.width,r.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let binary='';for(let i=0;i<pixels.length;i+=32768)binary+=String.fromCharCode(...pixels.subarray(i,i+32768));
    const floor=g.arena.floorAt(p,p.y+.1),sample={map:shotMap(g),fullDetail,placement:q.placement,player:{x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch},framebuffer:{width:r.width,height:r.height},activeWorldBatches:active.length,worldInstances:instances,selectedWorldTriangles:active.reduce((n,b)=>n+b.count*(b.geometry.index?.count??b.geometry.getAttribute('position').count)/3,0),draws:r.drawCalls,triangles:r.triangles,shadowDraws:r.shadowDraws,renderPasses:r.renderPasses,textureEstimateBytes:r.textureMemory,shaderPrograms:r.shaderPrograms,nativeWeaponGroups:r.blenderWeaponGroups?.length??0,nativeAssetsLoaded:!!r.blenderAssets,authoritativeStatePreserved:q.state()===q.authoritative,feetOnFloor:Math.abs(p.y-floor)<.001,playerCollisionFree:!g.arena.collides({x:p.x,y:p.y+.04,z:p.z},.31,p.height-.04),cameraMatchesPlayerEye:Math.hypot(r.eye.x-g.eye(p).x,r.eye.y-g.eye(p).y,r.eye.z-g.eye(p).z)<1e-10,fullAppearanceSha256:await q.digest(JSON.stringify(allParts.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))))),pairSelectionSha256:await q.digest(JSON.stringify(pairSelection.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))))),culling:{instanceSphereOutsideBatch,instanceVertexOutsideBatch,instanceSphereFrustumDisagreements,frustumRejectedBatches},glError:gl.getError(),programsRunnable:r.renderer.info.programs.every(p=>p.diagnostics?.runnable!==false),pixelSha256:await q.digest(pixels),pixelsBase64:btoa(binary)};
    if(fullDetail){r.blenderAssets.updateLOD=updateLOD;r.sceneLOD.update=updateScene;r.buildWorld();r.blenderAssets.lodClock=0;r.sceneLOD.clock=0;}
    return sample;
   };
   function shotMap(g){return {id:g.arena.info.id,name:g.arena.info.name};}
   const gl=renderer.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return {webgl2:gl instanceof WebGL2RenderingContext,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),maps:MAPS.map(({id,name,size})=>({id,name,size}))};
  });
  const selectedMaps=option('maps',null)?.split(',').map(Number),selectedViews=option('views',null)?.split(',');
  const shots=environment.maps.filter(map=>!selectedMaps||selectedMaps.includes(map.id)).flatMap(map=>[{name:`map-${map.id}-spawn`,map:map.id,view:'spawn'},{name:`map-${map.id}-centre`,map:map.id,view:'centre',x:0,z:0,yaw:0,pitch:0},{name:`map-${map.id}-approach`,map:map.id,view:'approach',x:0,z:27,yaw:0,pitch:.02},...(map.id===14?[{name:'blacksite-interior',map:14,view:'interior',x:0,z:9,yaw:0,pitch:0}]:[])]).filter(shot=>!selectedViews||selectedViews.includes(shot.view));
  const boundaries=mode==='cells'&&(!selectedMaps||selectedMaps.includes(14))?[{name:'blacksite-positive-cell-edge',map:14,view:'boundary',x:23.95,z:26,yaw:.8,pitch:0},{name:'blacksite-positive-cell-return',map:14,view:'boundary',x:24.05,z:26,yaw:.8,pitch:0},{name:'blacksite-negative-cell-edge',map:14,view:'boundary',x:-23.95,z:26,yaw:-.8,pitch:0},{name:'blacksite-negative-cell-return',map:14,view:'boundary',x:-24.05,z:26,yaw:-.8,pitch:0}]:[];
  const results=[];
  for(const shot of [...shots,...boundaries]){
   await page.evaluate(async shot=>window.batches.prepare(shot),shot);
   const sample=await page.evaluate(()=>window.batches.frame(false));
   if(mode==='bounds'||shot.map===14||[0,7,11,15].includes(shot.map)&&shot.view==='spawn'){
    const path=`${shot.name}-${side}.png`,bytes=await page.screenshot({path:`${out}/${path}`,timeout:120000});captures.push({name:shot.name,side,fullDetail:false,path,bytes:bytes.length,sha256:hash(bytes)});
   }
   results.push({name:shot.name,view:shot.view,...sample});
   if(mode==='cells'&&shot.map===14&&['spawn','centre','approach','interior'].includes(shot.view)){
    const full=await page.evaluate(()=>window.batches.frame(true)),path=`${shot.name}-full-${side}.png`,bytes=await page.screenshot({path:`${out}/${path}`,timeout:120000});captures.push({name:shot.name,side,fullDetail:true,path,bytes:bytes.length,sha256:hash(bytes)});results.push({name:shot.name,view:shot.view,...full});
   }
   console.log(side,shot.name,JSON.stringify({batches:sample.activeWorldBatches,draws:sample.draws,triangles:sample.triangles,culling:sample.culling}));
  }
  sides[side]={environment,results};await context.close();
 }
 const comparisons=sides.centred.results.map(after=>{
  const before=sides.original.results.find(r=>r.name===after.name&&r.fullDetail===after.fullDetail),a=Buffer.from(before.pixelsBase64,'base64'),b=Buffer.from(after.pixelsBase64,'base64');assert.equal(a.length,b.length);let differentPixels=0,absolute=0,maxChannelDelta=0;
  for(let i=0;i<a.length;i+=4){let changed=false;for(let c=0;c<3;c++){const d=Math.abs(a[i+c]-b[i+c]);absolute+=d;maxChannelDelta=Math.max(maxChannelDelta,d);if(d>2)changed=true;}if(changed)differentPixels++;}
  return {name:after.name,fullDetail:after.fullDetail,map:after.map,placement:after.placement,cameraUnchanged:JSON.stringify(before.player)===JSON.stringify(after.player),fullAppearancePreserved:before.fullAppearanceSha256===after.fullAppearanceSha256,perInstanceDetailSelectionPreserved:before.pairSelectionSha256===after.pairSelectionSha256,authoritativeStatePreserved:before.authoritativeStatePreserved&&after.authoritativeStatePreserved,resourcesPreserved:before.textureEstimateBytes===after.textureEstimateBytes&&before.renderPasses===after.renderPasses,original:{activeWorldBatches:before.activeWorldBatches,worldInstances:before.worldInstances,selectedWorldTriangles:before.selectedWorldTriangles,draws:before.draws,triangles:before.triangles},centred:{activeWorldBatches:after.activeWorldBatches,worldInstances:after.worldInstances,selectedWorldTriangles:after.selectedWorldTriangles,draws:after.draws,triangles:after.triangles},pixels:{exact:before.pixelSha256===after.pixelSha256,changedAbove2Levels:differentPixels,changedPercent:+(differentPixels/(a.length/4)*100).toFixed(4),meanAbsoluteRGBDelta:+(absolute/(a.length/4*3)).toFixed(5),maxChannelDelta}};
 });
 for(const side of Object.values(sides))for(const r of side.results)delete r.pixelsBase64;
 const normal=sides.centred.results.filter(r=>!r.fullDetail&&r.view!=='boundary'),mapIds=option('maps',null)?.split(',').map(Number)??sides.centred.environment.maps.map(m=>m.id),views=option('views',null)?.split(',')??['spawn','centre','approach','interior'],expectedViews=mapIds.reduce((n,id)=>n+views.filter(v=>v!=='interior'||id===14).length,0),validation={nativeMaps:normal.length===expectedViews&&new Set(normal.map(r=>r.map.id)).size===mapIds.length,nativeLegalGameplay:sides.centred.results.every(r=>r.feetOnFloor&&r.playerCollisionFree&&r.cameraMatchesPlayerEye&&r.nativeAssetsLoaded&&r.nativeWeaponGroups>0),nativeWorldBatchBudget:normal.every(r=>r.activeWorldBatches<=220),unchangedCamerasAndAppearance:comparisons.every(c=>c.cameraUnchanged&&c.fullAppearancePreserved&&c.authoritativeStatePreserved),perInstanceDetailPreserved:comparisons.filter(c=>!c.fullDetail).every(c=>c.perInstanceDetailSelectionPreserved),sameTextureAndPassBudget:comparisons.every(c=>c.resourcesPreserved),conservativeCulling:sides.centred.results.every(r=>r.culling.instanceSphereFrustumDisagreements===0&&r.culling.instanceVertexOutsideBatch===0),frustumCullingExercised:sides.centred.results.some(r=>r.culling.frustumRejectedBatches>0),noBrowserOrGlErrors:errors.length===0&&requestFailures.length===0&&Object.values(sides).every(s=>s.results.every(r=>r.glError===0&&r.programsRunnable))};
 const report={kind:mode==='cells'?'software_WebGL_native_cell_only_world_batch_comparison':'software_WebGL_native_near_far_bound_only_comparison',comparison:mode,actual_iphone_data:false,subjective_visual_approval:false,capturedAt:new Date().toISOString(),sourceCommit,distributionDirtyAtSnapshot,historicalCellSource:'d38e0f1',centredCellSource:'3d36f64',snapshotIsolated:true,snapshots,runtimeSha256,viewport:{width:844,height:390,deviceScaleFactor:1},browser:browser.version(),validation,errors,requestFailures,maximumNativeActiveWorldBatches:Math.max(...normal.map(r=>r.activeWorldBatches)),comparisons,sides,scope:`Actual native Game/Renderer at grounded legal player cameras with fixed time and bots removed. Both contexts use identical immutable JavaScript module bytes; only ${mode==='cells'?'the spatial-cell assignment':'the near/far geometry bounds union constructor call'} differs. Native LOD and conservative batch/frustum checks are retained. Full-detail comparison temporarily disables only detail selection to assess identical source geometry. Raster differences and scene counts are not GPU timings, physical iPhone FPS, Safari memory, thermal results or professional visual acceptance.`};
 await writeFile(`${out}/validation.json`,JSON.stringify(report,null,2)+'\n');await writeFile(`${out}/manifest.json`,JSON.stringify({kind:mode==='cells'?'native_gameplay_cell_only_world_batch_screenshots':'native_gameplay_near_far_bounds_screenshots',actual_iphone_data:false,sourceCommit,runtimeSha256,snapshots,viewport:report.viewport,images:captures},null,2)+'\n');
 assert(Object.values(validation).every(Boolean),JSON.stringify(validation));console.log('Native world-batch validation passed',JSON.stringify({out,validation,images:captures.length,maximumNativeActiveWorldBatches:report.maximumNativeActiveWorldBatches}));
}finally{await browser?.close();server?.kill();}
