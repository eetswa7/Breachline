// Native smoke equipment lifecycle and matched gameplay frames. Software
// Chromium/WebGL evidence does not establish physical iPhone performance.
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {spawn,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

const require=createRequire(import.meta.url),search=[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,...(process.env.NODE_PATH??'').split(':')].filter(Boolean);
let chromium;
for(const path of [...search.map(p=>resolve(p,'playwright')),'playwright']){try{({chromium}=require(path));break;}catch{}}
if(!chromium)throw Error('Playwright is required');
const output=process.env.SMOKE_CAPTURE_DIR??'work/smoke-current',port=4197,origin=process.env.ART_TEST_ORIGIN??`http://127.0.0.1:${port}`;
const server=process.env.ART_TEST_ORIGIN?null:spawn(process.execPath,['scripts/preview.mjs','--port',String(port)],{stdio:['ignore','pipe','pipe']});
if(server)await new Promise((ok,fail)=>{const timer=setTimeout(()=>fail(Error('Preview startup timed out')),15000);server.stdout.on('data',d=>{if(String(d).includes('preview ready')){clearTimeout(timer);ok();}});server.on('error',fail);});
const hash=d=>createHash('sha256').update(d).digest('hex'),runtimeFiles=['three-renderer.js','particles.js','engine.js','graphics-quality.js'];
const runtimeSha256=Object.fromEntries(await Promise.all(runtimeFiles.map(async name=>[name,hash(await readFile(`dist/js/${name}`))])));
const errors=[],requestFailures=[],captures=[],validation={},scenarios={};
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.ART_TEST_BROWSER??'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:1,serviceWorkers:'block'});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('requestfailed',r=>requestFailures.push({url:r.url(),failure:r.failure()?.errorText}));page.on('response',r=>{if(r.status()>=400)requestFailures.push({url:r.url(),status:r.status()});});
 await page.route('**/__smoke',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden}canvas{width:100vw;height:100vh;display:block}</style><canvas></canvas>'}));
 await page.goto(origin+'/__smoke');
 scenarios.environment=await page.evaluate(async()=>{
  const [{Renderer},{Game,emptyInput},{rng}]=await Promise.all([import('/js/three-renderer.js'),import('/js/engine.js'),import('/js/math.js')]);
  Math.random=rng(660713);const game=new Game({map:14,mode:'tdm'},{seed:660713});game.actors=[game.player];game.debug.god=true;game.rules.time=999;game.events=[];
  const renderer=new Renderer(document.querySelector('canvas'),{quality:'high',motion:false,fov:80,frameRate:60});renderer.setArena(game.arena);await renderer.ready;await renderer.prepareMatch(game);
  const m=window.smokeQA={game,renderer,emptyInput,events:[]};
  m.dispatch=()=>{m.events.push(...game.events);renderer.events(game.events,game);game.events=[];};
  m.tick=seconds=>{for(let i=0,n=Math.round(seconds*120);i<n;i++){game.update(1/120,emptyInput());m.dispatch();renderer.updateEffects(1/120,game);}};
  m.look=(position,target)=>{const p=game.player;p.reset(position,Math.atan2(target.x-position.x,-(target.z-position.z)));const eye=game.eye(p);p.pitch=Math.atan2(target.y-eye.y,Math.hypot(target.x-eye.x,target.z-eye.z));renderer.cameraY=null;};
  m.frame=()=>{renderer.shadowClock=1;renderer.render(game,0,false);const p=game.player;return {time:game.time,age:game.smokes[0]?.age??null,smokes:game.smokes.length,quality:renderer.quality,instances:renderer.fxMesh.geometry.instanceCount,draws:renderer.drawCalls,triangles:renderer.triangles,renderPasses:renderer.renderPasses,feetOnFloor:Math.abs(p.y-game.arena.floorAt(p,p.y+.1))<.001,grounded:p.grounded,collisionFree:!game.arena.collides({...p,y:p.y+.04},.31,p.height-.04),alpha:renderer.fxAttributes.instanceAlpha.getX(0),positions:Array.from(renderer.fxAttributes.instancePosition.array.slice(0,renderer.fxMesh.geometry.instanceCount*3)),sizes:Array.from(renderer.fxAttributes.instanceSize.array.slice(0,renderer.fxMesh.geometry.instanceCount*2)),loaded:renderer.loaded,nativeWorldBatches:renderer.worldBatches.length,nativeWeaponGroups:renderer.blenderWeaponGroups?.length??0,nativeHandGroups:renderer.blenderHandGroups?.length??0};};
  const gl=renderer.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return {webgl2:gl instanceof WebGL2RenderingContext,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),nativeAssetsLoaded:!!renderer.blenderAssets,textureEstimateBytes:renderer.textureMemory};
 });
 console.log('Native smoke renderer ready',JSON.stringify(scenarios.environment));
 scenarios.thrownGrenade=await page.evaluate(()=>{
  const m=window.smokeQA,g=m.game;m.look({x:0,y:0,z:23},{x:0,y:1.2,z:45});g.player.equipment='smoke';const grenadesBefore=g.player.grenades;g.throwGrenade(g.player);const grenadesAfterThrow=g.player.grenades;m.dispatch();
  let frames=0;while(g.grenades.length&&frames++<600){g.update(1/120,m.emptyInput());m.dispatch();}
  const event=m.events.find(e=>e.type==='smoke'),smoke=g.smokes[0];if(!event||!smoke)throw Error('Native thrown smoke did not detonate');
  let camera;const target={x:smoke.x,y:smoke.y+1.6,z:smoke.z};
  for(const distance of [11,9,13])for(let n=0;n<16&&!camera;n++){
   const angle=n*Math.PI/8,p={x:smoke.x+Math.sin(angle)*distance,y:0,z:smoke.z+Math.cos(angle)*distance};p.y=g.arena.floorAt(p,smoke.y+.5);
   if(g.arena.collides({...p,y:p.y+.04},.31,1.74))continue;const eye={...p,y:p.y+1.66},length=Math.hypot(target.x-eye.x,target.y-eye.y,target.z-eye.z),hit=g.arena.trace(eye,{x:(target.x-eye.x)/length,y:(target.y-eye.y)/length,z:(target.z-eye.z)/length},length);if(hit.block&&hit.t<length-.25)continue;camera=p;
  }
  if(!camera)throw Error('No legal visible smoke camera');m.look(camera,target);m.outside={camera,target,collisionBefore:JSON.stringify(g.arena.blocks)};
  return {frames,grenadesBefore,grenadesAfterThrow,remainingGrenades:g.grenades.length,event,position:{x:smoke.x,y:smoke.y,z:smoke.z},camera,target};
 });
 await mkdir(output,{recursive:true});
 async function capture(name){const sample=await page.evaluate(name=>({name,...window.smokeQA.frame()}),name);const data=await page.screenshot({path:`${output}/${name}.png`,timeout:120000});captures.push({...sample,path:`${name}.png`,bytes:data.length,sha256:hash(data)});console.log(name,JSON.stringify({age:sample.age,instances:sample.instances,alpha:sample.alpha}));return sample;}
 const birth=await capture('smoke-birth');
 const stages=[];let lastAge=birth.age??0;
 for(const [name,age]of [['smoke-burst-100ms',.1],['smoke-expansion-500ms',.5],['smoke-established-1300ms',1.3],['smoke-roll-5s',5],['smoke-hold-12s',12],['smoke-fade-14p5s',14.5],['smoke-final-15p9s',15.9],['smoke-expired-16p1s',16.1]]){await page.evaluate(seconds=>window.smokeQA.tick(seconds),age-lastAge);stages.push(await capture(name));lastAge=age;}
 scenarios.pause=await page.evaluate(()=>{
  const m=window.smokeQA,g=m.game,r=m.renderer;g.explode({...m.outside.target,y:m.outside.target.y-1.6,owner:0,kind:'smoke'});m.dispatch();m.tick(2);m.frame();g.paused=true;const snapshot=()=>JSON.stringify({time:g.time,smokes:g.smokes,positions:Array.from(r.fxAttributes.instancePosition.array),alpha:Array.from(r.fxAttributes.instanceAlpha.array),kind:Array.from(r.fxAttributes.instanceKind.array)}),before=snapshot();for(let i=0;i<3;i++){g.update(1/30,m.emptyInput());r.render(g,1/30,false);}const after=snapshot();g.paused=false;return {exactlyFrozen:before===after};
 });
 scenarios.inside=await page.evaluate(()=>{
  const m=window.smokeQA,g=m.game,s=g.smokes[0];let p;for(const distance of [1,2,3])for(let n=0;n<16&&!p;n++){const angle=n*Math.PI/8,c={x:s.x+Math.sin(angle)*distance,y:0,z:s.z+Math.cos(angle)*distance};c.y=g.arena.floorAt(c,s.y+.5);if(!g.arena.collides({...c,y:c.y+.04},.31,1.74))p=c;}
  if(!p)throw Error('No legal smoke interior camera');m.look(p,{x:s.x,y:s.y+1.4,z:s.z-7});return {position:p,planarDistance:Math.hypot(p.x-s.x,p.z-s.z)};
 });
 const inside=await capture('smoke-inside');
 scenarios.low=await page.evaluate(()=>{const m=window.smokeQA;m.look(m.outside.camera,m.outside.target);m.renderer.settings.quality='low';m.renderer.resetQuality();return m.frame();});
 const low=await capture('smoke-low-quality');
 scenarios.capacity=await page.evaluate(()=>{
  const m=window.smokeQA,g=m.game;for(let i=0;i<20;i++)g.explode({...m.outside.target,y:m.outside.target.y-1.6,owner:0,kind:'smoke'});for(const s of g.smokes)s.age=2;m.frame();const peak={smokes:g.smokes.length,instances:m.renderer.fxMesh.geometry.instanceCount};g.resetRound();m.dispatch();m.look(m.outside.camera,m.outside.target);m.frame();return {...peak,afterRoundSmokes:g.smokes.length,afterRoundInstances:m.renderer.fxMesh.geometry.instanceCount,collisionUnchanged:JSON.stringify(g.arena.blocks)===m.outside.collisionBefore};
 });
 validation.nativeThrowFuse=scenarios.thrownGrenade.frames>=192&&scenarios.thrownGrenade.remainingGrenades===0&&scenarios.thrownGrenade.grenadesBefore-scenarios.thrownGrenade.grenadesAfterThrow===1;
 validation.visibleExpansion=stages[2].sizes[0]>stages[0].sizes[0];validation.temporalRolling=JSON.stringify(stages[2].positions)!==JSON.stringify(stages[3].positions);
 validation.holdFadeExpiry=stages[4].smokes===1&&stages[5].alpha<stages[4].alpha&&stages[6].alpha<stages[5].alpha&&stages[7].smokes===0&&stages[7].instances===0;
 validation.pausedClocksAndBillboardsFrozen=scenarios.pause.exactlyFrozen;validation.lowQualityKeepsFourLayers=low.instances===4&&low.alpha>=.8;
 validation.smokeInteriorLegal=scenarios.inside.planarDistance<5.2&&inside.collisionFree&&inside.feetOnFloor;validation.engineCapAndRoundReset=scenarios.capacity.smokes===8&&scenarios.capacity.instances===32&&scenarios.capacity.afterRoundSmokes===0&&scenarios.capacity.afterRoundInstances===0;validation.originalCollisionPreserved=scenarios.capacity.collisionUnchanged;
 validation.nativePresentation=captures.every(c=>c.loaded&&c.nativeWorldBatches>0&&c.nativeWeaponGroups>0&&c.nativeHandGroups>0);
 validation.gameplayCamerasLegal=captures.every(c=>c.grounded&&c.feetOnFloor&&c.collisionFree);validation.webgl2=scenarios.environment.webgl2;validation.noBrowserOrNetworkErrors=errors.length===0&&requestFailures.length===0;
 const unchanged=await Promise.all(runtimeFiles.map(async n=>runtimeSha256[n]===hash(await readFile(`dist/js/${n}`))));validation.runtimeUnchangedDuringCapture=unchanged.every(Boolean);
 const report={kind:'software_WebGL_native_smoke_temporal_validation',actual_iphone_data:false,subjective_visual_approval:false,capturedAt:new Date().toISOString(),sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),runtimeSha256,viewport:{width:844,height:390},scenarioNotes:['Shipped Game and Renderer, original Blacksite collision, native Blender world and first-person weapon/hands.','Initial cloud is created by thrown native smoke equipment with its actual fuse and bounce. Camera is held through continuous 1/120 second native simulation between captured frames.','Pause/interior/quality/reset scenarios use a second engine explode() cloud. Capacity scenario is explicitly synthetic engine event stress.','Software WebGL captures prove lifecycle and give visual evidence; they do not establish physical iPhone performance or professional visual quality.'],errors,requestFailures,validation,scenarios,captures};
 await writeFile(`${output}/validation.json`,JSON.stringify(report,null,2)+'\n');await writeFile(`${output}/manifest.json`,JSON.stringify({kind:'native_gameplay_smoke_screenshots',actual_iphone_data:false,subjective_visual_approval:false,capturedAt:report.capturedAt,sourceCommit:report.sourceCommit,runtimeSha256,images:captures.map(({name,path,bytes,sha256})=>({name,path,bytes,sha256}))},null,2)+'\n');
 console.log(JSON.stringify(validation));if(Object.values(validation).some(v=>v!==true))throw Error('Smoke validation failed: '+JSON.stringify(validation));
}finally{await browser?.close();server?.kill();}
