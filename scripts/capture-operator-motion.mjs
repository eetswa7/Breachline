// Actual shipped-renderer poses on a desktop software WebGL browser. These
// captures are visual evidence, never physical iPhone timing or FPS data.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const output=process.argv[2]??'work/operator-motion-review',origin=process.env.ART_TEST_ORIGIN??'http://127.0.0.1:4193';
const server=process.env.ART_TEST_ORIGIN?null:spawn(process.execPath,['scripts/preview.mjs','--port','4193'],{stdio:['ignore','pipe','pipe']});
if(server)await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('preview ready'))resolve();});server.on('error',reject);server.on('exit',c=>reject(Error(`Preview exited ${c}`)));});
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.ART_TEST_BROWSER??'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:600},serviceWorkers:'block'}),errors=[],requestFailures=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('requestfailed',r=>requestFailures.push({url:r.url(),failure:r.failure()?.errorText}));
 page.on('response',r=>{if(r.status()>=400)requestFailures.push({url:r.url(),status:r.status()});});
 await page.route('**/__operator_motion',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><style>html,body{margin:0;overflow:hidden}canvas{display:block;width:100vw;height:100vh}</style><canvas></canvas>'}));
 await page.goto(origin+'/__operator_motion');
 await page.evaluate(async()=>{
  const [{Renderer},{Game},{actorModel}]=await Promise.all([import('/js/three-renderer.js'),import('/js/engine.js'),import('/js/geometry.js')]);
  const game=new Game({map:14,mode:'tdm'},{seed:817}),renderer=new Renderer(document.querySelector('canvas'),{quality:'low',motion:false,fov:80,frameRate:60});
  const operator=game.actors.find(a=>a.team!==game.player.team);game.actors=[game.player,operator];
  game.player.reset({x:0,y:0,z:27},0);game.player.pitch=-.10;operator.reset({x:-.75,y:0,z:23},Math.PI*.77);
  renderer.setArena(game.arena);await renderer.ready;await renderer.prepareMatch(game);
  window.review={game,renderer,operator,actorModel};
 });
 const shots=[
  {name:'standing',speed:0,phase:.10},
  {name:'walking-contact',speed:3.4,phase:.12},
  {name:'walking-recovery',speed:3.4,phase:.73},
  {name:'running-contact',speed:6.1,phase:.10},
  {name:'running-flight',speed:6.1,phase:.73},
  {name:'aiming-walk',speed:1.4,ads:1,pitch:.10,phase:.12},
  {name:'crouch-transition',speed:1.4,crouch:true,transitionFrames:6,phase:.12},
  {name:'crouched-aim',speed:2.15,crouch:true,ads:1,pitch:.10,phase:.12},
  {name:'reload',speed:0,crouch:true,reload:true,phase:.12},
  {name:'hit-reaction',speed:0,ads:1,hit:.16,phase:.12},
  {name:'death-buckle',speed:3.4,death:.18,phase:.12},
  {name:'death-fall',speed:3.4,death:.48,phase:.12},
  {name:'death-settled',speed:3.4,death:1.4,phase:.12},
 ];
 await mkdir(output,{recursive:true});const results=[];
 for(const shot of shots){
  const stats=await page.evaluate(shot=>{
   const {game,renderer,operator:a,actorModel}=window.review;
   a.reset({x:-.75,y:0,z:23},Math.PI*.77);a.operatorMotion=undefined;a.animTime=undefined;a.animSpeed=0;a.animDuck=0;a.stride=0;a.weapon.sinceShot=10;
   a.vx=Math.sin(a.yaw)*shot.speed;a.vz=-Math.cos(a.yaw)*shot.speed;
   a.ads=shot.ads??0;a.pitch=shot.pitch??0;
   for(let i=0;i<=120;i++)actorModel(a,2+i/60);
   a.crouched=!!shot.crouch;
   for(let i=1;i<=(shot.transitionFrames??90);i++)actorModel(a,4+i/60);
   game.time=6;a.stride=shot.phase*Math.PI*2;a.animTime=game.time;
   if(shot.reload){a.weapon.ammo=0;a.weapon.reload();a.weapon.reloadLeft=a.weapon.reloadTime*.5;}
   a.hitReact=shot.hit??0;
   if(shot.death){
    a.health=0;a.lastDamage=6;a.respawnLeft=3;
    for(let i=0;i<=Math.round(shot.death*60);i++){game.time=6+i/60;a.respawnLeft=3-i/60;actorModel(a,game.time);}
   }
   actorModel(a,game.time);
   renderer.render(game,1/60);
   let actorBatches=0,actorTriangles=0;for(const batch of renderer.actorBatches.values())if(batch.used){actorBatches++;actorTriangles+=batch.used*(batch.mesh.geometry.index?.count??batch.mesh.geometry.getAttribute('position').count)/3;}
   return {name:shot.name,draws:renderer.drawCalls,triangles:renderer.triangles,actorBatches,actorTriangles,nativeWeapon:a.nativeWeaponVisible,partCount:a.renderParts.length,runBlend:a.operatorMotion.run,aimBlend:a.operatorMotion.aim,duck:a.animDuck,death:a.operatorMotion.death,feet:a.renderParts.slice(4,6).map(q=>({x:q.x,y:q.y,z:q.z})),handContact:Math.hypot(a.renderParts[19].x-a.operatorPose.right.x,a.renderParts[19].y-a.operatorPose.right.y,a.renderParts[19].z-a.operatorPose.right.z)};
  },shot);
  await page.screenshot({path:`${output}/${shot.name}.png`,timeout:120000});results.push(stats);console.log(JSON.stringify(stats));
 }
 const report={kind:'desktop_software_WebGL_operator_motion_visual_validation',actual_iphone_data:false,date:new Date().toISOString(),map:'BLACKSITE',quality:'low',renderer:'shipped Three/WebGL with native Blender body and carried weapon',viewport:{width:1280,height:600},scope:'Controlled third-person readiness, walk/run contact and recovery, crouch/ADS, reload, impact and death poses. Actor position is fixed for comparable captures; separate world-contact tests move the actor. Rigid group posing remains; this does not establish skeletal skinning, commercial-game art equivalence or physical iPhone performance.',errors,requestFailures,results};
 await writeFile(`${output}/validation.json`,JSON.stringify(report,null,2)+'\n');
 if(errors.length||requestFailures.length)throw Error(JSON.stringify({errors,requestFailures}));
}finally{await browser?.close();server?.kill();}
