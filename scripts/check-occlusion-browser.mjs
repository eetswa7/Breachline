// Matched software WebGL frames. Counts/pixel equality are not iPhone timings.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {OCCLUSION_VIEWS,OCCLUSION_ROSTER} from './profile-occlusion.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const origin=process.env.ART_TEST_ORIGIN??'http://127.0.0.1:4183',output=process.argv[2]??'test-results/occlusion';
const server=process.env.ART_TEST_ORIGIN?null:spawn(process.execPath,['scripts/preview.mjs','--port','4183'],{stdio:['ignore','pipe','pipe']});
if(server)await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('preview ready'))resolve();});server.on('error',reject);});
let browser;const errors=[],requestFailures=[],results=[];
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.ART_TEST_BROWSER??'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:874,height:402},deviceScaleFactor:1,serviceWorkers:'block'});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('requestfailed',r=>requestFailures.push({url:r.url(),failure:r.failure()?.errorText}));
 page.on('response',r=>{if(r.status()>=400)requestFailures.push({url:r.url(),status:r.status()});});
 await page.route('**/__occlusion',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><style>html,body{margin:0;overflow:hidden}canvas{width:100vw;height:100vh;display:block}</style><canvas id="view"></canvas>'}));
 await page.goto(origin+'/__occlusion');
 await page.evaluate(async()=>{
  const [{Renderer},{Game}]=await Promise.all([import('/js/three-renderer.js'),import('/js/engine.js')]);
  const game=new Game({map:14,mode:'tdm'},{seed:817}),renderer=new Renderer(document.querySelector('canvas'),{quality:'high',motion:false,fov:80,frameRate:60});
  renderer.setArena(game.arena);await renderer.ready;
  renderer.qualityController=null;window.occlusion={game,renderer,slabs:renderer.solidWallOcclusion};
 });
 await mkdir(output,{recursive:true});
 for(const shot of OCCLUSION_VIEWS){
  const setup=await page.evaluate(({shot,roster})=>{
   const {game,renderer,slabs}=window.occlusion,p=game.player;
   p.reset({x:shot.x,y:0,z:shot.z},shot.yaw);game.time=2;renderer.cameraY=null;
   for(let i=1;i<game.actors.length;i++){
    const [x,z]=roster[i-1];if(game.arena.collides({x,y:0,z},.32,1.75))throw Error('Occlusion roster overlaps collision');
    game.actors[i].reset({x,y:0,z},Math.PI);
   }
   renderer.solidWallOcclusion=null;renderer.shadowClock=1;renderer.render(game,1/60,false);
   for(let i=0;i<24;i++)renderer.updateLighting(1/60);
   renderer.shadowClock=1;renderer.render(game,1/60,false);
   renderer.solidWallOcclusion=slabs;
   return {walls:slabs.walls.length,webgl2:renderer.renderer.getContext() instanceof WebGL2RenderingContext};
  },{shot,roster:OCCLUSION_ROSTER});
  const policy=async enabled=>page.evaluate(enabled=>{
   const {game,renderer,slabs}=window.occlusion;
   renderer.solidWallOcclusion=enabled?slabs:null;
   renderer.shadowClock=0;renderer.renderer.shadowMap.needsUpdate=false;renderer.sun.shadow.needsUpdate=false;
   renderer.render(game,0,false,0);
   const gl=renderer.renderer.getContext(),pixels=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);
   gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
   let changedPixels=0,changedBytes=0,maxChannelDelta=0;
   if(!enabled)window.occlusion.pixels=pixels;
   else for(let i=0;i<pixels.length;i+=4){let changed=false;for(let channel=0;channel<4;channel++){
    const delta=Math.abs(pixels[i+channel]-window.occlusion.pixels[i+channel]);if(delta){changed=true;changedBytes++;maxChannelDelta=Math.max(maxChannelDelta,delta);}
   }if(changed)changedPixels++;}
   let actorBatches=0,actorTriangles=0,actorInstances=0;
   for(const e of renderer.actorBatches.values())if(e.used){actorBatches++;actorInstances+=e.used;actorTriangles+=e.used*(e.mesh.geometry.index?.count??e.mesh.geometry.getAttribute('position').count)/3;}
   return {draws:renderer.drawCalls,triangles:renderer.triangles,actorBatches,actorTriangles,actorInstances,occludedActors:renderer.actorOccluded,changedPixels,changedBytes,maxChannelDelta,width:gl.drawingBufferWidth,height:gl.drawingBufferHeight};
  },enabled);
  const disabled=await policy(false);await page.screenshot({path:`${output}/${shot.name}-disabled.png`,timeout:120000});
  const enabled=await policy(true);await page.screenshot({path:`${output}/${shot.name}-enabled.png`,timeout:120000});
  const shadow=await page.evaluate(()=>{
   const {game,renderer}=window.occlusion;renderer.shadowClock=1;renderer.render(game,0,false,0);
   return {occludedActors:renderer.actorOccluded,allowed:renderer.actorOcclusionAllowed,shadowDraws:renderer.lastShadowDraws};
  });
  const result={view:shot.name,...setup,disabled,enabled,shadow};results.push(result);console.log(JSON.stringify(result));
  if(enabled.changedPixels)throw Error(`${shot.name}: visible output changed across occlusion toggle`);
  if(shadow.occludedActors||shadow.allowed||!shadow.shadowDraws)throw Error(`${shot.name}: shadow frame must retain every caster`);
 }
 const report={kind:'software_WebGL_occlusion_validation',actual_iphone_data:false,scope:'Same live Blacksite 16-actor roster, camera, LOD, lights, shadow texture and pose; only closed-wall actor occlusion toggled between two frames. Exact RGBA pixels compared before screenshots. Forced shadow-refresh frame checks bypass and real caster submission. This is Chromium SwiftShader, not iPhone Safari or GPU timings.',errors,requestFailures,results};
 await writeFile(output+'/report.json',JSON.stringify(report,null,2)+'\n');
 if(errors.length||requestFailures.length)throw Error(JSON.stringify({errors,requestFailures}));
}finally{await browser?.close();server?.kill();}
