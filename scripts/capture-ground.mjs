// Compare authored Blacksite ground with a historical production-world module
// while keeping the current renderer, PBR maps, game state and camera fixed.
// Software WebGL scene counts are not physical iPhone performance results.
import {createRequire} from 'node:module';
import {existsSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync,spawn} from 'node:child_process';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const stage=process.argv[2]??'current',directory=`test-results/ground-${stage}`;
const baselineRef=process.argv.find(a=>a.startsWith('--baseline-ref='))?.split('=').slice(1).join('=')??null;
const port=process.env.ART_CAPTURE_PORT??'4192',origin=process.env.ART_TEST_ORIGIN??`http://127.0.0.1:${port}`;
const server=process.env.ART_TEST_ORIGIN?null:spawn(process.execPath,['scripts/preview.mjs','--port',port],{stdio:['ignore','pipe','pipe']});
if(server)await new Promise((resolve,reject)=>{
 server.stdout.on('data',d=>{if(String(d).includes('preview ready'))resolve();});
 server.on('error',reject);server.on('exit',code=>{if(code)reject(Error('Preview failed'));});
});
const executablePath=process.env.ART_TEST_BROWSER??(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':chromium.executablePath());
const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:600},deviceScaleFactor:1,serviceWorkers:'block'}),errors=[],requestFailures=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
page.on('requestfailed',r=>requestFailures.push({url:r.url(),failure:r.failure()?.errorText}));
page.on('response',r=>{if(r.status()>=400)requestFailures.push({url:r.url(),status:r.status()});});
await page.route('**/__ground',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><style>html,body{margin:0;overflow:hidden}canvas{width:100vw;height:100vh;display:block}</style><canvas id="view"></canvas>'}));
if(baselineRef){
 const original=execFileSync('git',['show',`${baselineRef}:dist/js/production-world.js`],{encoding:'utf8'});
 await page.route('**/production-world.js*',route=>route.fulfill({contentType:'text/javascript',body:original}));
}
const shots=[
 {name:'approach',x:0,z:27,yaw:0,pitch:-.14},
 {name:'apron',x:12,z:30,yaw:.4,pitch:-.20},
 {name:'asphalt',x:18,z:39,yaw:-.28,pitch:-.24},
];
try{
 await page.goto(origin+'/__ground');
 await page.evaluate(async()=>{
  const [{Renderer},{Game}]=await Promise.all([import('/js/three-renderer.js'),import('/js/engine.js')]);
  const game=new Game({map:14,mode:'tdm'},{seed:817});
  const renderer=new Renderer(document.querySelector('canvas'),{quality:'high',motion:false,fov:80,frameRate:60});
  renderer.setArena(game.arena);await renderer.ready;await renderer.prepareMatch(game);window.art={game,renderer};
 });
 await mkdir(directory,{recursive:true});const results=[];
 for(const shot of shots){
  const stats=await page.evaluate(shot=>{
   const {game,renderer}=window.art;
   Object.assign(game.player,{x:shot.x,y:0,z:shot.z,yaw:shot.yaw,pitch:shot.pitch,vx:0,vz:0,ads:0});renderer.cameraY=null;game.time=2;
   renderer.render(game,1/60);for(let i=0;i<24;i++)renderer.updateLighting(1/60);
   renderer.blenderAssets.lodClock=0;renderer.blenderAssets.updateLOD(renderer,0);renderer.shadowClock=1;renderer.render(game,1/60);
   const active=renderer.worldBatches.filter(b=>b.count>0);
   return {draws:renderer.drawCalls,triangles:renderer.triangles,shadowDraws:renderer.lastShadowDraws,
    textureEstimateBytes:renderer.textureMemory,programs:renderer.shaderPrograms,activeWorldBatches:active.length,
    fullWorldBatches:renderer.worldBatches.length,groundDetailParts:active.reduce((n,b)=>n+b.userData.parts.filter(p=>p.productionGroundWear).length,0)};
  },shot);
  await page.screenshot({path:`${directory}/${shot.name}.png`,timeout:120000});results.push({...shot,...stats});console.log(shot.name,JSON.stringify(stats));
 }
 await writeFile(`${directory}/scene-counts.json`,JSON.stringify({kind:'software_WebGL_visual_validation',actual_iphone_data:false,
  comparison:'current renderer, historical ground placement only when baselineRef is set',baselineRef,viewport:{width:1280,height:600},
  quality:'high',fov:80,seed:817,errors,requestFailures,results},null,2)+'\n');
 if(errors.length||requestFailures.length)throw Error(JSON.stringify({errors,requestFailures}));
}finally{await browser.close();server?.kill();}
