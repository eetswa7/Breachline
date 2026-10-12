// Render the shipped gameplay renderer at repeatable player camera positions.
// Software WebGL screenshots and scene counts are not physical iPhone timings.
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync,spawn} from 'node:child_process';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const stage=process.argv[2]??'current',origin=process.env.ART_TEST_ORIGIN??'http://127.0.0.1:4173';
const server=process.env.ART_TEST_ORIGIN?null:spawn(process.execPath,['scripts/preview.mjs','--port','4173'],{stdio:['ignore','pipe','pipe']});
if(server)await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('preview ready'))resolve();});server.on('error',reject);server.on('exit',c=>{if(c)reject(Error('Preview failed'));});});
const browser=await chromium.launch({headless:true,executablePath:process.env.ART_TEST_BROWSER,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:600},deviceScaleFactor:1,serviceWorkers:'block'}),errors=[],requestFailures=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
page.on('requestfailed',r=>requestFailures.push({url:r.url(),failure:r.failure()?.errorText}));
page.on('response',r=>{if(r.status()>=400)requestFailures.push({url:r.url(),status:r.status()});});
await page.route('**/__art',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><style>html,body{margin:0;overflow:hidden}canvas{width:100vw;height:100vh;display:block}</style><canvas id="view"></canvas>'}));
await page.goto(origin+'/__art');
await page.evaluate(async()=>{
 const [{Renderer},{Game},{Weapon},{MAPS}]=await Promise.all([import('/js/three-renderer.js'),import('/js/engine.js'),import('/js/weapons.js'),import('/js/maps.js')]);
 window.art={Renderer,Game,Weapon,MAPS};
 const game=new Game({map:14,mode:'domination'},{seed:817});
 const renderer=new Renderer(document.querySelector('canvas'),{quality:document.documentElement.dataset.quality??'high',motion:false,fov:80,frameRate:60});
 renderer.setArena(game.arena);await renderer.ready;window.art.game=game;window.art.renderer=renderer;
});
await mkdir('test-results/'+stage,{recursive:true});
const shots=[
 {name:'blacksite-approach',map:14,x:0,z:27,yaw:0,pitch:.02},
 {name:'blacksite-interior',map:14,x:0,z:9,yaw:0,pitch:0},
 {name:'blacksite-yard',map:14,x:-31,z:25,yaw:-.12,pitch:0},
 {name:'blacksite-oblique',map:14,x:12,z:30,yaw:.40,pitch:-.015},
 {name:'blacksite-forecourt',map:14,x:0,z:42,yaw:0,pitch:.02},
 {name:'blacksite-services',map:14,x:-5.5,z:8,yaw:-.95,pitch:0},
 {name:'weapon-close',map:14,x:0,z:27,yaw:0,pitch:0,weapon:1},
 {name:'operator-close',map:14,x:0,z:27,yaw:0,pitch:0,operator:true,actorX:-1.6,actorZ:22,operatorMotion:'stand'},
 {name:'combat',map:14,x:0,z:27,yaw:0,pitch:0,operator:true,combat:true},
 {name:'reload',map:14,x:0,z:9,yaw:0,pitch:0,reload:true},
];
if(process.argv.includes('--all-maps'))for(let map=0;map<16;map++)shots.push({name:'map-'+map,map,menu:true});
if(process.argv.includes('--all-weapons'))for(let weapon=0;weapon<30;weapon++)shots.push({name:'weapon-'+weapon,map:14,x:0,z:27,yaw:0,pitch:0,weapon});
if(process.argv.includes('--weapon-sides'))for(let weapon=0;weapon<30;weapon++)shots.push({name:'weapon-side-'+weapon,map:14,menu:true,weapon});
const results=[];
try{
 const selectedShot=process.argv.find(arg=>arg.startsWith('--shot='))?.slice(7);
 const captureShots=selectedShot?shots.filter(s=>s.name===selectedShot):process.argv.includes('--maps-only')?shots.filter(s=>s.name.startsWith('map-')):process.argv.includes('--operators-only')?shots.filter(s=>s.operator):shots;
 if(!captureShots.length)throw Error('No matching capture shots');
 for(const shot of captureShots){
  const stats=await page.evaluate(async shot=>{
   const {game,renderer,Game,Weapon}=window.art;
   let g=window.art.game;
   if(g.arena.info.id!==shot.map){g=new Game({map:shot.map,mode:'tdm'},{seed:817});window.art.game=g;renderer.setArena(g.arena);}
   const p=g.player;Object.assign(p,{x:shot.x??15,y:0,z:shot.z??25,yaw:shot.yaw??0,pitch:shot.pitch??0,vx:0,vz:0,ads:0});
   p.weapons[0]=new Weapon(shot.weapon??0,{optic:1});p.slot=0;renderer.weaponKey='';renderer.cameraY=null;g.time=2;
   if(shot.operator){const actor=g.actors.find(a=>a.id!==p.id&&a.team!==p.team);if(actor)Object.assign(actor,{x:shot.actorX??2,y:0,z:shot.actorZ??22,yaw:Math.PI,vx:shot.operatorMotion==='stand'?0:1.3,vz:0,pitch:0});}
   if(shot.reload){p.weapon.ammo=0;p.weapon.reload();p.weapon.reloadLeft=p.weapon.reloadTime*.40;}
   if(shot.combat){p.weapon.sinceShot=.018;renderer.events([{type:'shot',source:0,weapon:0,position:g.eye(p),end:{x:2,y:1.2,z:21},suppressed:false},{type:'impact',surface:'steel',position:{x:2,y:.8,z:21},normal:{x:0,y:0,z:1}}],g);}
   await renderer.prepareMatch(g);
   // Set the gameplay camera, then settle the CPU light/LOD state without
   // queueing 24 redundant full frames on the software renderer.
   renderer.render(g,1/60,!!shot.menu);
   for(let i=0;i<24;i++)renderer.updateLighting(1/60);
   renderer.blenderAssets.lodClock=0;renderer.blenderAssets.updateLOD(renderer,0);
   // Force one scheduled shadow update for comparable complete-frame counts.
   renderer.shadowClock=1;renderer.render(g,1/60,!!shot.menu);
   const world=renderer.worldBatches.filter(b=>b.count>0);
   return {map:g.arena.info.name,draws:renderer.drawCalls,triangles:renderer.triangles,shadowDraws:renderer.lastShadowDraws,textureEstimateBytes:renderer.textureMemory,programs:renderer.shaderPrograms,geometryCount:renderer.blenderAssets.geometries.size,activeWorldBatches:world.length,selectedWorldTriangles:world.reduce((n,b)=>n+b.count*(b.geometry.index?.count??b.geometry.getAttribute('position').count)/3,0)};
  },shot);
  await page.screenshot({path:'test-results/'+stage+'/'+shot.name+'.png',timeout:120000});results.push({name:shot.name,...stats});console.log(shot.name,JSON.stringify(stats));
 }
 const {BENCHMARK_BUILD:build}=await import('../dist/js/benchmark-build.js');
 const nativeSource=JSON.parse(await readFile('authoring/blender/source/manifest.json','utf8'));
 const distributionDirty=!!execFileSync('git',['status','--porcelain','--','dist'],{encoding:'utf8'}).trim();
 await writeFile('test-results/'+stage+'/scene-counts.json',JSON.stringify({kind:'software_WebGL_visual_validation',actual_iphone_data:false,build,distributionDirty,nativeSourceSha256:nativeSource.sha256,errors,requestFailures,results},null,2)+'\n');
 if(errors.length||requestFailures.length)throw Error(JSON.stringify({errors,requestFailures}));
}finally{await browser.close();server?.kill();}
