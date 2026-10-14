// Matched native gameplay images from complete, separate distribution roots.
// Software WebGL raster images and scene counts do not measure iPhone timings.
import assert from 'node:assert/strict';
import http from 'node:http';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {mkdir,readFile,stat,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';

const args=process.argv.slice(2),option=(name,fallback)=>args.find(a=>a.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const roots={baseline:resolve(option('baseline','work/release68-baseline/dist')),current:resolve(option('current','dist'))};
const out=resolve(option('out','docs/art-release68/blacksite')),cache=resolve(option('cache','work/release68-native')),port=Number(option('port','4208'));
const sides=option('sides','baseline,current').split(',');assert(sides.every(s=>Object.hasOwn(roots,s)),'Unknown distribution side');
const require=createRequire(import.meta.url),search=[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,...(process.env.NODE_PATH??'').split(':')].filter(Boolean);
let chromium;for(const path of [...search.map(p=>resolve(p,'playwright')),'playwright'])try{({chromium}=require(path));break;}catch{}
assert(chromium,'Playwright is required');
const hash=data=>createHash('sha256').update(data).digest('hex');
const captureHarnessSha256=hash(await readFile(new URL(import.meta.url))),compatibleBaselineHarness=option('baseline-harness',null);
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'};
const shots=[
 {name:'approach',x:0,z:27,yaw:0,pitch:.02},
 {name:'interior',x:0,z:9,yaw:0,pitch:0},
 {name:'oblique',x:12,z:30,yaw:.40,pitch:-.015},
 {name:'forecourt',x:0,z:42,yaw:0,pitch:.02},
 {name:'services',x:-5.5,z:8,yaw:-.95,pitch:0},
 {name:'west-wall',x:-24,z:0,yaw:Math.PI/2,pitch:0},
 {name:'east-wall',x:24,z:0,yaw:-Math.PI/2,pitch:0},
 {name:'wall-close',x:-4.5,z:16,yaw:0,pitch:0},
 {name:'wall-inside',x:-4.5,z:8,yaw:Math.PI,pitch:0},
 {name:'north-approach',x:0,z:-27,yaw:Math.PI,pitch:.02},
 {name:'interior-low',x:0,z:9,yaw:0,pitch:0,quality:'low'},
 {name:'forecourt-low',x:0,z:42,yaw:0,pitch:.02,quality:'low'},
 // Test-only selection exercises shipped far topology even though a hall-size
 // hero facade can remain large enough on screen for normal LOD to stay near.
 {name:'oblique-far',x:12,z:30,yaw:.40,pitch:-.015,quality:'low',forceHallFar:true}
];
const selected=option('shots',null)?.split(','),captureShots=selected?shots.filter(s=>selected.includes(s.name)):shots;
assert(captureShots.length,'No matching camera');
await mkdir(out,{recursive:true});
await mkdir(cache,{recursive:true});
const errors=[],requestFailures=[],reports={};let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.ART_TEST_BROWSER??'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const readCached=async side=>{try{
  const candidate=JSON.parse(await readFile(resolve(cache,`side-${side}.json`),'utf8'));
  if(candidate.root!==roots[side]||candidate.browserVersion!==browser.version()||!candidate.sourceBytesUnchanged)return;
  if(!candidate.results.every(r=>r.captureHarnessSha256===captureHarnessSha256||side==='baseline'&&r.captureHarnessSha256===compatibleBaselineHarness))return;
  if(!(await Promise.all(Object.entries(candidate.resourceSha256).map(async([path,digest])=>hash(await readFile(resolve(roots[side],path)))===digest))).every(Boolean))return;
  if(!(await Promise.all(candidate.results.map(async r=>hash(await readFile(resolve(out,r.image.path)))===r.image.sha256))).every(Boolean))return;
  return candidate;
 }catch{}};
 for(const side of sides){
  const root=roots[side],served=new Map(),resourceHashes={};
  const previous=args.includes('--resume')?await readCached(side):undefined;
  if(previous)Object.assign(resourceHashes,previous.resourceSha256);
  const server=http.createServer(async(req,res)=>{try{
   const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   if(path==='/__blacksite'){res.writeHead(200,{'Content-Type':types['.html']});res.end('<!doctype html><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden}canvas{width:100vw;height:100vh;display:block}</style><canvas></canvas>');return;}
   let file=resolve(root,'.'+path);if(!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
   if((await stat(file)).isDirectory())file=resolve(file,'index.html');
   // Cache the first bytes served, keeping a side internally immutable.
   if(!served.has(file))served.set(file,await readFile(file));const bytes=served.get(file);resourceHashes[file.slice(root.length+1)]=hash(bytes);
   res.writeHead(200,{'Content-Type':types[extname(file)]??'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);
  }catch{res.writeHead(404);res.end('Not found');}});
  await new Promise((ok,fail)=>{server.once('error',fail);server.listen(port,'127.0.0.1',ok);});
  const context=await browser.newContext({viewport:{width:1280,height:600},deviceScaleFactor:1,serviceWorkers:'block'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push({side,error:e.message}));page.on('console',m=>{if(m.type()==='error')errors.push({side,error:m.text()});});
  page.on('requestfailed',r=>requestFailures.push({side,url:r.url(),error:r.failure()?.errorText}));page.on('response',r=>{if(r.status()>=400)requestFailures.push({side,url:r.url(),status:r.status()});});
  try{
   await page.goto(`http://127.0.0.1:${port}/__blacksite`);
   const environment=await page.evaluate(async()=>{
    const [{Renderer},{Game},{Weapon},{rng},THREE]=await Promise.all([import('/js/three-renderer.js'),import('/js/engine.js'),import('/js/weapons.js'),import('/js/math.js'),import('/vendor/three.module.min.js')]);
    Math.random=rng(680817);
    const game=new Game({map:14,mode:'tdm'},{seed:817}),renderer=new Renderer(document.querySelector('canvas'),{quality:'high',motion:false,fov:80,frameRate:60});renderer.setArena(game.arena);await renderer.ready;
    const q=window.blacksite={Game,Weapon,THREE,game,renderer};
    q.state=()=>JSON.stringify({blocks:game.arena.blocks,decor:game.arena.decor,foliage:game.arena.foliage,objectives:game.arena.objectives,spawns:game.arena.spawns,doors:game.arena.doors,cover:game.arena.cover,flagBases:game.arena.flagBases});
    q.digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',typeof value==='string'?new TextEncoder().encode(value):value)),b=>b.toString(16).padStart(2,'0')).join('');
    q.initialState=q.state();
    q.capture=async shot=>{
     const r=renderer,g=game,p=g.player,requested={x:shot.x,y:0,z:shot.z};
     const floor=g.arena.floorAt(requested,.36),position={...requested,y:floor};
     if(g.arena.collides({x:position.x,y:floor+.04,z:position.z},.31,p.height-.04))throw Error('Requested camera is not legal: '+shot.name);
     p.reset(position,shot.yaw);p.pitch=shot.pitch;p.weapons[0]=new Weapon(0,{optic:1});p.slot=0;g.actors=[p];g.time=2;g.events=[];g.rules.time=999;
     r.settings.quality=shot.quality??'high';r.resetQuality();r.applyQuality(true);r.cameraY=null;r.weaponKey='';r.lightClock=0;
     // A fresh world resets paired/fallback detail hysteresis for every camera.
     // Otherwise --resume or a different shot order changes non-hall geometry.
     r.buildWorld();r.sceneLOD.visibility=new WeakMap();
     await r.prepareMatch(g);r.render(g,0,false);for(let i=0;i<40;i++)r.updateLighting(1/60);
     r.blenderAssets.lodClock=0;r.blenderAssets.updateLOD(r,0);r.sceneLOD.clock=0;r.sceneLOD.update(r,0);
     let restore;
     if(shot.forceHallFar){
      for(const pair of r.blenderWorldLODs.filter(pair=>pair.parts.some(p=>p.blenderKind?.startsWith('blacksite_hall_')))){
       const parts=pair.parts.filter(p=>!p.destroyed);pair.near.count=0;pair.far.count=parts.length;
       for(let i=0;i<parts.length;i++){pair.far.setMatrixAt(i,r.partMatrix(parts[i]));pair.far.setColorAt(i,r.instanceColor(parts[i],'world'));pair.visibility.set(parts[i],true);}
       pair.far.instanceMatrix.needsUpdate=true;pair.far.instanceColor.needsUpdate=true;
      }
      for(const batch of r.worldBatches.filter(b=>!b.userData.blenderPair&&b.userData.parts?.some(p=>p.blenderKind?.startsWith('blacksite_hall_')))){
       batch.geometry=r.blenderAssets.geometry(batch.userData.parts[0],'world',true);batch.userData.blenderFar=true;
      }
      restore=r.blenderAssets.updateLOD;r.blenderAssets.updateLOD=()=>{};
     }
     r.shadowClock=1;r.render(g,0,false);if(restore)r.blenderAssets.updateLOD=restore;
     const active=r.worldBatches.filter(b=>b.count>0),lod=r.worldBatches.filter(b=>!b.userData.blenderPair||b===b.userData.blenderPair.near).flatMap(batch=>batch.userData.parts.filter(p=>p.blenderKind?.startsWith('blacksite_hall_')).map(p=>{
      const pair=batch.userData.blenderPair,selected=pair?(pair.visibility.get(p)?pair.far:pair.near):batch;
      return {kind:p.blenderKind,role:p.productionRole,far:selected.geometry===r.blenderAssets.geometry(p,'world',true),triangles:selected.geometry.index.count/3,paired:!!pair};
     }));
     const sphere=new THREE.Sphere(),matrix=new THREE.Matrix4(),vertex=new THREE.Vector3();let instanceVertexOutsideBatch=0,instanceSphereFrustumDisagreements=0;
     for(const batch of active){
      if(!batch.geometry.boundingSphere)batch.geometry.computeBoundingSphere();const visible=!batch.frustumCulled||r.frustum.intersectsSphere(batch.boundingSphere);
      for(let i=0;i<batch.count;i++){
       batch.getMatrixAt(i,matrix);sphere.copy(batch.geometry.boundingSphere).applyMatrix4(matrix);
       if(r.frustum.intersectsSphere(sphere)&&!visible)instanceSphereFrustumDisagreements++;
       if(sphere.center.distanceTo(batch.boundingSphere.center)+sphere.radius>batch.boundingSphere.radius+.001){const vertices=batch.geometry.getAttribute('position');for(let j=0;j<vertices.count;j++){vertex.fromBufferAttribute(vertices,j).applyMatrix4(matrix);if(vertex.distanceTo(batch.boundingSphere.center)>batch.boundingSphere.radius+.001){instanceVertexOutsideBatch++;break;}}}
      }
     }
     const gl=r.renderer.getContext(),pixels=new Uint8Array(r.width*r.height*4);gl.readPixels(0,0,r.width,r.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let binary='';for(let i=0;i<pixels.length;i+=32768)binary+=String.fromCharCode(...pixels.subarray(i,i+32768));
     return {placement:{requested,position},quality:r.quality,forceHallFar:!!shot.forceHallFar,player:{x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch},framebuffer:{width:r.width,height:r.height},nativeAssetsLoaded:!!r.blenderAssets,nativeWeaponGroups:r.blenderWeaponGroups?.length??0,authoritativeStatePreserved:q.state()===q.initialState,authoritativeStateSha256:await q.digest(q.state()),feetOnFloor:Math.abs(p.y-g.arena.floorAt(p,p.y+.1))<.001,playerCollisionFree:!g.arena.collides({x:p.x,y:p.y+.04,z:p.z},.31,p.height-.04),cameraMatchesPlayerEye:Math.hypot(r.eye.x-g.eye(p).x,r.eye.y-g.eye(p).y,r.eye.z-g.eye(p).z)<1e-10,activeWorldBatches:active.length,selectedWorldTriangles:active.reduce((n,b)=>n+b.count*(b.geometry.index?.count??b.geometry.getAttribute('position').count)/3,0),draws:r.drawCalls,triangles:r.triangles,textureEstimateBytes:r.textureMemory,renderPasses:r.renderPasses,shaderPrograms:r.shaderPrograms,hallLOD:lod,culling:{instanceVertexOutsideBatch,instanceSphereFrustumDisagreements},glError:gl.getError(),programsRunnable:r.renderer.info.programs.every(p=>p.diagnostics?.runnable!==false),pixelSha256:await q.digest(pixels),pixelsBase64:btoa(binary)};
    };
    const gl=renderer.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return {webgl2:gl instanceof WebGL2RenderingContext,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};
   });
   const results=[];
   for(const shot of captureShots){
    const cached=previous?.results.find(r=>r.name===shot.name&&(!shot.forceHallFar||r.captureHarnessSha256===captureHarnessSha256)&&r.player.x===shot.x&&r.player.z===shot.z&&r.player.yaw===shot.yaw&&r.player.pitch===shot.pitch&&r.quality===(shot.quality??'high')&&r.forceHallFar===!!shot.forceHallFar);
    if(cached){try{if(hash(await readFile(resolve(out,cached.image.path)))===cached.image.sha256){results.push(cached);console.log(side,shot.name,'resumed unchanged source/image');continue;}}catch{}}
    const sample=await page.evaluate(shot=>window.blacksite.capture(shot),shot),path=`${shot.name}-${side}.png`,bytes=await page.screenshot({path:resolve(out,path),timeout:120000});
    results.push({name:shot.name,captureHarnessSha256,...sample,image:{path,bytes:bytes.length,sha256:hash(bytes)}});
    console.log(side,shot.name,JSON.stringify({batches:sample.activeWorldBatches,worldTriangles:sample.selectedWorldTriangles,draws:sample.draws,quality:sample.quality,forcedFar:sample.forceHallFar}));
   }
   // Detect mutations in any distribution byte actually consumed by a side.
   const sourceBytesUnchanged=(await Promise.all(Object.entries(resourceHashes).map(async([path,digest])=>hash(await readFile(resolve(root,path)))===digest))).every(Boolean);
   assert(sourceBytesUnchanged,'Distribution changed during native capture');
   const report={side,root,browserVersion:browser.version(),environment,sourceBytesUnchanged,resourceSha256:resourceHashes,results};reports[side]=report;
   await writeFile(resolve(cache,`side-${side}.json`),JSON.stringify(report,null,2)+'\n');
  }finally{await context.close();await new Promise(ok=>server.close(ok));}
 }
 for(const side of ['baseline','current'])if(!reports[side])reports[side]=await readCached(side);
 for(const side of ['baseline','current'])if(!reports[side])delete reports[side];
 if(sides.includes('current'))assert(reports.baseline,'A validated baseline cache is required for a current comparison');
 const comparisons=reports.baseline&&reports.current?reports.current.results.map(after=>{
  const before=reports.baseline.results.find(r=>r.name===after.name);assert(before,'Missing baseline camera '+after.name);
  const a=Buffer.from(before.pixelsBase64,'base64'),b=Buffer.from(after.pixelsBase64,'base64');assert.equal(a.length,b.length);let differentPixels=0,absolute=0,maxChannelDelta=0;
  for(let i=0;i<a.length;i+=4){let changed=false;for(let c=0;c<3;c++){const d=Math.abs(a[i+c]-b[i+c]);absolute+=d;maxChannelDelta=Math.max(maxChannelDelta,d);if(d>2)changed=true;}if(changed)differentPixels++;}
  return {name:after.name,cameraUnchanged:JSON.stringify(before.player)===JSON.stringify(after.player),qualityUnchanged:before.quality===after.quality,authoritativeStateUnchanged:before.authoritativeStateSha256===after.authoritativeStateSha256,sameTextureAndPassBudget:before.textureEstimateBytes===after.textureEstimateBytes&&before.renderPasses===after.renderPasses,baseline:{activeWorldBatches:before.activeWorldBatches,worldTriangles:before.selectedWorldTriangles,draws:before.draws,triangles:before.triangles},current:{activeWorldBatches:after.activeWorldBatches,worldTriangles:after.selectedWorldTriangles,draws:after.draws,triangles:after.triangles},pixels:{exact:before.pixelSha256===after.pixelSha256,changedAbove2Levels:differentPixels,changedPercent:+(differentPixels/(a.length/4)*100).toFixed(4),meanAbsoluteRGBDelta:+(absolute/(a.length/4*3)).toFixed(5),maxChannelDelta}};
 }):[];
 const all=Object.values(reports).flatMap(s=>s.results),current=reports.current?.results??[],comparisonAvailable=!!reports.baseline&&!!reports.current;
 const hallCoverage=r=>r.hallLOD.length===10&&Object.entries({blacksite_hall_roof:1,blacksite_hall_cladding:4,blacksite_hall_wall_long:2,blacksite_hall_wall_short:2,blacksite_hall_ceiling:1}).every(([kind,count])=>r.hallLOD.filter(p=>p.kind===kind).length===count);
 const validation={nativeLegalGameplay:all.every(r=>r.feetOnFloor&&r.playerCollisionFree&&r.cameraMatchesPlayerEye&&r.nativeAssetsLoaded&&r.nativeWeaponGroups>0),authoritativeStatePreserved:all.every(r=>r.authoritativeStatePreserved)&&comparisons.every(c=>c.authoritativeStateUnchanged),comparisonComplete:!sides.includes('current')||comparisonAvailable&&captureShots.every(s=>reports.baseline.results.some(r=>r.name===s.name)&&current.some(r=>r.name===s.name))&&comparisons.length>=captureShots.length,matchedCameras:comparisons.every(c=>c.cameraUnchanged&&c.qualityUnchanged),sameTextureAndPassBudget:comparisons.every(c=>c.sameTextureAndPassBudget),worldBatchBudget:all.every(r=>r.activeWorldBatches<=220),worldTriangleBudget:all.every(r=>r.selectedWorldTriangles<375000),conservativeCulling:all.every(r=>r.culling.instanceSphereFrustumDisagreements===0&&r.culling.instanceVertexOutsideBatch===0),noBrowserOrGlErrors:errors.length===0&&requestFailures.length===0&&all.every(r=>r.glError===0&&r.programsRunnable),completeNativeHall:current.every(hallCoverage),forcedFarNativeHall:!current.some(r=>r.forceHallFar)||current.filter(r=>r.forceHallFar).every(r=>hallCoverage(r)&&r.hallLOD.every(p=>p.far))};
 // Base64 working pixels are kept only in scratch side reports for a later
 // --sides=current invocation. The consolidated evidence stays compact.
 const compact=Object.fromEntries(Object.entries(reports).map(([side,report])=>[side,{...report,results:report.results.map(({pixelsBase64,...sample})=>sample)}]));
 const report={kind:'software_WebGL_native_blacksite_distribution_comparison',actual_iphone_data:false,subjective_visual_approval:false,capturedAt:new Date().toISOString(),captureHarnessSha256,acceptedCompatibleBaselineHarness:compatibleBaselineHarness,comparisonAvailable,viewport:{width:1280,height:600,deviceScaleFactor:1},browser:browser.version(),validation,errors,requestFailures,comparisons,sides:compact,scope:'Separate complete baseline/current distribution roots; same seeded native Game/Renderer at exact grounded legal player cameras, fixed time, no bots, high and low quality plus explicitly forced hall far topology. Each image records its actual harness digest. An explicitly accepted earlier baseline harness may retain unchanged ordinary captures; forced-far captures always rerun after a harness change. Raster changes establish image differences, not professional visual acceptance or physical device performance.'};
 await writeFile(resolve(out,'validation.json'),JSON.stringify(report,null,2)+'\n');
 assert(Object.values(validation).every(Boolean),JSON.stringify(validation));console.log('Blacksite native validation passed',JSON.stringify({out,validation,images:all.length,comparisons:comparisons.length}));
}finally{await browser?.close();}
