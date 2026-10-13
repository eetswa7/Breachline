// Actual grounded Game + native Renderer material comparisons. This gate uses
// software WebGL and records scene/resource evidence, never physical iPhone FPS.
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {spawn,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

const args=process.argv.slice(2),option=(name,fallback)=>args.find(a=>a.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const stage=option('stage','world-materials'),out=option('out',`work/${stage}`),reportPath=option('report',`${out}/validation.json`);
if(!/^[a-z\d-]+$/i.test(stage))throw Error('Invalid capture stage');
const require=createRequire(import.meta.url),paths=[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,...(process.env.NODE_PATH??'').split(':')].filter(Boolean);
let chromium;
for(const path of [...paths.map(p=>resolve(p,'playwright')),'playwright'])try{({chromium}=require(path));break;}catch{}
if(!chromium)throw Error('Playwright must be installed or supplied through NODE_PATH/CODEX_PRIMARY_RUNTIME_NODE_MODULES');
const git=(...argv)=>execFileSync('git',argv,{encoding:'utf8'}).trim(),hash=data=>createHash('sha256').update(data).digest('hex');
const runtimeFiles=['boot.js','three-renderer.js','world-material-variation.js','surface-uv.js','material-detail.js','blender-material.js','production-lighting.js','blender-world.js','production-world.js','maps.js'];
const runtimeSha256=Object.fromEntries(await Promise.all(runtimeFiles.map(async name=>[name,hash(await readFile(`dist/js/${name}`))])));
const sourceCommit=git('rev-parse','HEAD'),runtimeRelease=/const RELEASE='(\d+)'/.exec(await readFile('dist/js/boot.js','utf8'))?.[1];
const nativeSource=JSON.parse(await readFile('authoring/blender/source/manifest.json','utf8'));
const origin=process.env.ART_TEST_ORIGIN??'http://127.0.0.1:4196';
const server=process.env.ART_TEST_ORIGIN?null:spawn(process.execPath,['scripts/preview.mjs','--port','4196'],{stdio:['ignore','pipe','pipe']});
const errors=[],requestFailures=[],captures=[],comparisons=[],mapSweep=[],validation={};
let browser;
try{
 if(server)await new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(Error('Preview startup timed out')),15000);
  server.stdout.on('data',d=>{if(String(d).includes('preview ready')){clearTimeout(timeout);resolve();}});
  server.on('error',reject);server.on('exit',code=>{if(code)reject(Error(`Preview exited ${code}`));});
 });
 await mkdir(out,{recursive:true});await mkdir(resolve(reportPath,'..'),{recursive:true});
 browser=await chromium.launch({headless:true,executablePath:process.env.ART_TEST_BROWSER??'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:1,serviceWorkers:'block'});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('requestfailed',r=>requestFailures.push({url:r.url(),failure:r.failure()?.errorText}));
 page.on('response',r=>{if(r.status()>=400)requestFailures.push({url:r.url(),status:r.status()});});
 await page.route('**/__world_materials',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden}canvas{width:100vw;height:100vh;display:block}</style><canvas></canvas>'}));
 await page.goto(origin+'/__world_materials');
 const environment=await page.evaluate(async()=>{
  const [{Renderer},{Game},{Weapon},{rng},{MAPS}]=await Promise.all([import('/js/three-renderer.js'),import('/js/engine.js'),import('/js/weapons.js'),import('/js/math.js'),import('/js/maps.js')]);
  Math.random=rng(660817);
  const game=new Game({map:14,mode:'tdm'},{seed:660817});game.actors=[game.player];game.rules.time=999;game.events=[];game.time=2;
  const renderer=new Renderer(document.querySelector('canvas'),{quality:'high',motion:false,fov:80,frameRate:60});renderer.setArena(game.arena);await renderer.ready;
  if(!renderer.worldMaterialVariationEnabled||!renderer.worldMaterialVariationDetail)throw Error('Missing shared world material variation uniforms');
  const m=window.materials={renderer,game,Game,Weapon,MAPS};
  m.state=()=>JSON.stringify({blocks:m.game.arena.blocks,decor:m.game.arena.decor,objectives:m.game.arena.objectives,spawns:m.game.arena.spawns,doors:m.game.arena.doors});
  m.place=shot=>{
   const g=m.game,requested={x:shot.x??0,z:shot.z??g.arena.info.size*.65,y:shot.y??0},candidates=[requested];
   // A requested art camera must be a real standing, grounded gameplay position.
   // Search nearby positions if a map-specific collider blocks the request.
   for(const distance of [1,2,4,6])for(let n=0;n<16;n++)candidates.push({x:requested.x+Math.sin(n*Math.PI/8)*distance,y:requested.y,z:requested.z+Math.cos(n*Math.PI/8)*distance});
   candidates.push(...g.arena.spawns);
   const selected=candidates.find(p=>{
    if(Math.abs(p.x)>g.arena.info.size-.5||Math.abs(p.z)>g.arena.info.size-.5)return false;
    const y=g.arena.floorAt(p,p.y+.36);
    return !g.arena.collides({x:p.x,y:y+.04,z:p.z},.31,g.player.height-.04);
   });
   if(!selected)throw Error(`No legal camera for ${shot.name}`);
   const position={x:selected.x,y:g.arena.floorAt(selected,selected.y+.36),z:selected.z};
   const target=shot.target??{x:0,y:1.2,z:0},yaw=shot.yaw??Math.atan2(target.x-position.x,-(target.z-position.z));
   g.player.reset(position,yaw);const eye=g.eye(g.player);
   g.player.pitch=shot.pitch??Math.atan2(target.y-eye.y,Math.hypot(target.x-eye.x,target.z-eye.z));
   g.player.weapons[0]=new Weapon(0,{optic:1});g.player.slot=0;g.time=2;g.events=[];
   renderer.cameraY=null;renderer.weaponKey='';renderer.lightClock=0;
   m.placement={requested,position,adjusted:position.x!==requested.x||position.z!==requested.z};
  };
  m.frame=async enabled=>{
   const r=m.renderer,g=m.game,p=g.player;r.worldMaterialVariationEnabled.value=enabled?1:0;r.shadowClock=1;r.render(g,0,false);
   const gl=r.renderer.getContext(),pixels=new Uint8Array(r.width*r.height*4);gl.readPixels(0,0,r.width,r.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
   const digest=await crypto.subtle.digest('SHA-256',pixels),pixelSha256=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
   const active=r.worldBatches.filter(b=>b.count>0),eligible=active.filter(b=>b.material.userData.worldMaterialVariation?.eligible);
   const totalWorld=active.reduce((n,b)=>n+b.count*(b.geometry.index?.count??b.geometry.getAttribute('position').count)/3,0),floor=g.arena.floorAt(p,p.y+.1);
   const materials=[...new Set(eligible.map(b=>b.material))].map(mat=>({key:mat.customProgramCacheKey(),...mat.userData.worldMaterialVariation}));
   return {map:g.arena.info.id,mapName:g.arena.info.name,quality:r.quality,enabled:!!enabled,detailUniform:r.worldMaterialVariationDetail.value,
    gameTime:g.time,placement:m.placement,player:{x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch,grounded:p.grounded},eye:{...r.eye},floor,
    feetOnFloor:Math.abs(p.y-floor)<.001,playerCollisionFree:!g.arena.collides({x:p.x,y:p.y+.04,z:p.z},.31,p.height-.04),
    cameraMatchesPlayerEye:Math.hypot(r.eye.x-g.eye(p).x,r.eye.y-g.eye(p).y,r.eye.z-g.eye(p).z)<1e-10,
    framebuffer:{width:r.width,height:r.height},pixelSha256,draws:r.drawCalls,triangles:r.triangles,shadowDraws:r.shadowDraws,renderPasses:r.renderPasses,
    activeWorldBatches:active.length,selectedWorldTriangles:totalWorld,eligibleActiveWorldBatches:eligible.length,eligibleInstances:eligible.reduce((n,b)=>n+b.count,0),
    materials,textureEstimateBytes:r.textureMemory,shaderPrograms:r.shaderPrograms,nativeAssetsLoaded:!!r.blenderAssets,nativeWeaponGroups:r.blenderWeaponGroups?.length??0,
    glError:gl.getError(),programsRunnable:r.renderer.info.programs.every(p=>p.diagnostics?.runnable!==false)};
  };
  m.prepare=async(shot,quality)=>{
   if(m.game.arena.info.id!==shot.map){const g=new Game({map:shot.map,mode:'tdm'},{seed:660817+shot.map});g.actors=[g.player];g.rules.time=999;g.events=[];m.game=g;renderer.setArena(g.arena);}
   renderer.settings.quality=quality;renderer.resetQuality();m.place(shot);await renderer.prepareMatch(m.game);
   renderer.render(m.game,0,false);for(let i=0;i<40;i++)renderer.updateLighting(1/60);
   renderer.blenderAssets.lodClock=0;renderer.blenderAssets.updateLOD(renderer,0);renderer.sceneLOD.clock=0;renderer.sceneLOD.update(renderer,0);
   m.authoritativeBefore=m.state();
  };
  const gl=renderer.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
  return {webgl2:gl instanceof WebGL2RenderingContext,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),nativeAssetsLoaded:!!renderer.blenderAssets,comparison:'One native renderer and a shared shader uniform; identical gameplay state, camera, quality and time. No image post-processing.'};
 });
 console.log('Native material renderer initialized',JSON.stringify(environment));
 async function capture(name,enabled){
  const sample=await page.evaluate(enabled=>window.materials.frame(enabled),enabled),path=`${out}/${name}.png`,image=await page.screenshot({path,timeout:120000});
  captures.push({name,path,bytes:image.length,sha256:hash(image),...sample});return sample;
 }
 const blacksite=[
  {name:'blacksite-approach',map:14,x:0,z:27,yaw:0,pitch:.02},
  {name:'blacksite-interior',map:14,x:0,z:9,yaw:0,pitch:0},
  {name:'blacksite-forecourt',map:14,x:0,z:42,yaw:0,pitch:.02},
 ];
 const representative=[
  {name:'blacksite-concrete-close',map:14,x:5,z:13.5,target:{x:5,y:.9,z:11}},
  {name:'blacksite-asphalt-close',map:14,x:0,z:34,target:{x:0,y:.035,z:30}},
  {name:'old-quarter-masonry',map:0,x:0,z:14,target:{x:-14,y:2,z:15}},
  {name:'dustline-ground',map:2,x:0,z:17,target:{x:0,y:.1,z:9}},
  {name:'canopy-ground',map:7,x:0,z:20,target:{x:0,y:.1,z:14}},
  {name:'quarry-ground',map:9,x:0,z:27,target:{x:0,y:.1,z:20}},
  {name:'monsoon-wet-ground',map:11,x:0,z:25,target:{x:0,y:.035,z:18}},
 ];
 const qualities=option('qualities','low,medium,high,ultra').split(',');
 if(qualities.some(q=>!['low','medium','high','ultra'].includes(q)))throw Error('Invalid quality list');
 const selectedShot=option('shot',null),shots=[...qualities.flatMap(quality=>blacksite.map(shot=>({shot,quality}))),...(args.includes('--showcase-only')?[]:representative.map(shot=>({shot,quality:'high'})))].filter(({shot})=>!selectedShot||shot.name===selectedShot);
 if(!shots.length)throw Error('No matching material capture shots');
 for(const {shot,quality}of shots){
  await page.evaluate(async({shot,quality})=>window.materials.prepare(shot,quality),{shot,quality});
  const name=`${shot.name}-${quality}`,before=await capture(`${name}-before`,false),after=await capture(`${name}-after`,true);
  const returned=await page.evaluate(()=>window.materials.frame(false)),preservation=await page.evaluate(()=>window.materials.state()===window.materials.authoritativeBefore);
  const costs=['draws','triangles','shadowDraws','renderPasses','activeWorldBatches','selectedWorldTriangles','textureEstimateBytes'];
  const comparison={name,map:shot.map,quality,before:`${out}/${name}-before.png`,after:`${out}/${name}-after.png`,pixelsChanged:before.pixelSha256!==after.pixelSha256,
   disabledReturnsExactPixels:returned.pixelSha256===before.pixelSha256,authoritativeStatePreserved:preservation,costsPreserved:costs.every(k=>before[k]===after[k]),
   costDelta:Object.fromEntries(costs.map(k=>[k,after[k]-before[k]])),legalCamera:[before,after,returned].every(s=>s.feetOnFloor&&s.playerCollisionFree&&s.cameraMatchesPlayerEye),
   nativePresentation:[before,after].every(s=>s.nativeAssetsLoaded&&s.nativeWeaponGroups>0),noGlErrors:[before,after,returned].every(s=>s.glError===0&&s.programsRunnable),
   framebuffer:after.framebuffer,eligibleActiveWorldBatches:after.eligibleActiveWorldBatches,detailUniform:after.detailUniform};
  comparisons.push(comparison);console.log(name,JSON.stringify(comparison));
 }
 // High and low exercise both texture-detail policies across the complete native
 // map library. Medium and ultra are separately rendered in the showcase above.
 if(!args.includes('--skip-map-sweep'))for(const quality of ['low','high'])for(let map=0;map<16;map++){
  const shot={name:`map-${map}`,map};await page.evaluate(async({shot,quality})=>window.materials.prepare(shot,quality),{shot,quality});
  const sample=await page.evaluate(()=>window.materials.frame(true)),statePreserved=await page.evaluate(()=>window.materials.state()===window.materials.authoritativeBefore);
  mapSweep.push({...sample,authoritativeStatePreserved:statePreserved});console.log(`map ${map} ${quality}`,JSON.stringify({batches:sample.activeWorldBatches,eligible:sample.eligibleActiveWorldBatches,triangles:sample.selectedWorldTriangles,glError:sample.glError}));
 }
 validation.nativeGroundedGameplay=comparisons.every(c=>c.legalCamera&&c.nativePresentation);
 validation.originalStatePreserved=comparisons.every(c=>c.authoritativeStatePreserved)&&mapSweep.every(s=>s.authoritativeStatePreserved);
 validation.sameFrameComparison=comparisons.every(c=>c.disabledReturnsExactPixels);
 validation.materialChangeVisible=comparisons.every(c=>c.pixelsChanged);
 validation.sceneCountsUnchanged=comparisons.every(c=>c.costsPreserved);
 validation.allQualitiesCaptured=qualities.every(q=>comparisons.some(c=>c.quality===q));
 validation.qualityPolicyMatches=comparisons.every(c=>c.detailUniform===(c.quality==='low'?0:1));
 validation.allMapNativePrograms=args.includes('--skip-map-sweep')?null:mapSweep.length===32&&mapSweep.every(s=>s.nativeAssetsLoaded&&s.feetOnFloor&&s.playerCollisionFree&&s.cameraMatchesPlayerEye&&s.glError===0&&s.programsRunnable);
 validation.noBrowserErrors=errors.length===0&&requestFailures.length===0&&comparisons.every(c=>c.noGlErrors);
 const runtimeEndSha256=Object.fromEntries(await Promise.all(runtimeFiles.map(async name=>[name,hash(await readFile(`dist/js/${name}`))])));
 validation.runtimeSourceStayedFixed=JSON.stringify(runtimeSha256)===JSON.stringify(runtimeEndSha256);
 const report={kind:'software_WebGL_native_world_material_comparison',actual_iphone_data:false,capturedAt:new Date().toISOString(),stage,runtimeRelease,sourceCommit,
  distributionDirty:!!git('status','--porcelain','--','dist'),runtimeSha256,runtimeEndSha256,nativeSourceSha256:nativeSource.sha256,
  viewport:{width:844,height:390,deviceScaleFactor:1},environment,errors,requestFailures,validation,comparisons,captures,mapSweep,
  scope:'Unmodified native gameplay screenshots and GL compile/scene-count evidence. Bots are removed solely to hold paired fixture scenes fixed. Shader material sampling increases at medium/high/ultra; equal draws, triangles and texture estimates do not mean equal GPU cost. These measurements do not establish professional visual acceptance, physical Safari memory, iPhone frame time or thermal performance.'};
 await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
 if(Object.values(validation).some(v=>v===false))throw Error(JSON.stringify({reportPath,errors,requestFailures,validation}));
 console.log('Material validation passed',JSON.stringify({reportPath,validation,captures:captures.length,mapFixtures:mapSweep.length}));
}finally{await browser?.close();server?.kill();}
