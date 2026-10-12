// Actual native gameplay frames and temporal viewmodel validation. Chromium
// SwiftShader is a visual/functionality gate, never an iPhone performance claim.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {spawn,execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const origin=process.env.ART_TEST_ORIGIN??'http://127.0.0.1:4186';
const server=process.env.ART_TEST_ORIGIN?null:spawn(process.execPath,['scripts/preview.mjs','--port','4186'],{stdio:['ignore','pipe','pipe']});
if(server)await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('preview ready'))resolve();});server.on('error',reject);});
let browser;
const errors=[],requestFailures=[],captures=[];
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.ART_TEST_BROWSER??'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:1,serviceWorkers:'block'});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('requestfailed',r=>requestFailures.push({url:r.url(),failure:r.failure()?.errorText}));page.on('response',r=>{if(r.status()>=400)requestFailures.push({url:r.url(),status:r.status()});});
 await page.route('**/__weapon_motion',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><style>html,body{margin:0;overflow:hidden}canvas{width:100vw;height:100vh;display:block}</style><canvas></canvas>'}));
 await page.goto(origin+'/__weapon_motion');
 await page.evaluate(async()=>{
  const [{Renderer},{Game,emptyInput},{Weapon},{weaponPose,sightHeight}]=await Promise.all([import('/js/three-renderer.js'),import('/js/engine.js'),import('/js/weapons.js'),import('/js/aim.js')]);
  const game=new Game({map:14,mode:'tdm'},{seed:681});game.actors=[game.player];game.rules.time=999;
  const renderer=new Renderer(document.querySelector('canvas'),{quality:'high',motion:true,fov:80,frameRate:60});renderer.setArena(game.arena);await renderer.ready;await renderer.prepareMatch(game);
  window.motion={game,renderer,Weapon,emptyInput,weaponPose,sightHeight};
  window.motion.reset=(id,ads=0)=>{const p=game.player;p.weapons[0]=new Weapon(id,{optic:1});p.slot=0;p.reset({x:0,y:0,z:27},0);p.ads=ads;game.time=2;game.events=[];renderer.cameraY=null;renderer.weaponKey='';renderer.prepareWeapon(game,844/390,false);return p;};
  window.motion.step=(frames=1,input=emptyInput())=>{for(let frame=0;frame<frames;frame++){game.update(1/120,input);renderer.prepareWeapon(game,844/390,false);}};
 });
 console.log('Native renderer initialized');
 await mkdir('test-results/motion61',{recursive:true});
 async function capture(name){
  const sample=await page.evaluate(name=>{
   const {game:g,renderer:r}=window.motion,p=g.player,w=p.weapon;r.shadowClock=1;r.render(g,1/120,false);
   return {name,weapon:w.def.name,id:w.def.id,time:g.time,inspectLeft:w.inspectLeft,ammo:w.ammo,shotSerial:w.shotSerial,pose:{...r.weaponPoseState},draws:r.drawCalls,triangles:r.triangles,nativeWeaponGroups:r.blenderWeaponGroups?.length??0,nativeHandGroups:r.blenderHandGroups?.length??0,loaded:r.loaded};
  },name);
  await page.screenshot({path:`test-results/motion61/${name}.png`,timeout:120000});captures.push(sample);console.log(name,JSON.stringify(sample.pose));return sample;
 }
 for(const id of [0,10,12,9]){
  await page.evaluate(id=>{const m=window.motion,p=m.reset(id);m.game.update(1/120,{...m.emptyInput(),inspect:true});},id);
  await capture(`inspect-${id}-start`);
  let last=0;
  for(const [label,phase]of [['left',.3],['turn',.55],['right',.73],['end',1.01]]){
   await page.evaluate(({phase,last})=>{const m=window.motion;const duration=m.game.player.weapon.inspectTime;m.step(Math.round((phase-last)*duration*120));},{phase,last});last=phase;
   await capture(`inspect-${id}-${label}`);
  }
 }
 await page.evaluate(()=>{const m=window.motion,p=m.reset(0);m.game.shoot(p);m.renderer.events(m.game.events,m.game);m.game.events=[];m.step(1);});
 const first=await capture('recoil-0-impulse');
 await page.evaluate(()=>window.motion.step(5));const peak=await capture('recoil-0-peak');
 await page.evaluate(()=>window.motion.step(120));const settled=await capture('recoil-0-settled');
 const ads=[];
 for(const id of [0,10,9]){
  await page.evaluate(id=>{const m=window.motion,p=m.reset(id,1);m.game.shoot(p);m.game.events=[];for(let frame=0;frame<12;frame++)m.step(1,{...m.emptyInput(),ads:true,lx:.012,ly:.006,mx:1});},id);
  const sample=await capture(`ads-${id}-fire-turn`);ads.push(sample);
 }
 const validation=await page.evaluate(()=>{
  const m=window.motion,p=m.game.player,old=p.weapon;m.reset(0);m.game.update(1/120,{...m.emptyInput(),inspect:true});const inspection=p.weapon.inspectLeft;m.game.paused=true;m.game.update(1/30);const paused=p.weapon.inspectLeft;m.game.paused=false;m.game.update(1/120,{...m.emptyInput(),fire:true,firePressed:true});
  const interrupted=p.weapon.inspectLeft;
  return {inspectionStarted:inspection>0,pauseFreezesClock:inspection===paused,fireCancelsWithoutDelay:interrupted===0&&p.weapon.ammo===p.weapon.capacity-1,webgl2:m.renderer.renderer.getContext() instanceof WebGL2RenderingContext,nativeAssetsLoaded:!!m.renderer.blenderAssets,sightHeight:m.sightHeight(old),memoryEstimateBytes:m.renderer.textureMemory};
 });
 validation.firstImpulseThenPeak=peak.pose.z>first.pose.z+.005;validation.recoilSettled=Math.abs(settled.pose.z+.49)<.00001;
 validation.adsAlignment=ads.every(s=>s.pose.x===0&&s.pose.yaw===0&&s.pose.pitch===0&&s.pose.roll===0&&Math.abs(s.pose.y+.169)<1e-12);
 validation.nativePresentation=captures.every(s=>s.loaded&&s.nativeWeaponGroups>0&&s.nativeHandGroups>0);
 const report={kind:'software_WebGL_native_weapon_temporal_validation',actual_iphone_data:false,capturedAt:new Date().toISOString(),sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),distributionDirty:!!execFileSync('git',['status','--porcelain','--','dist'],{encoding:'utf8'}).trim(),viewport:{width:844,height:390},errors,requestFailures,validation,captures};
 await writeFile('docs/validation-weapon-motion61-browser.json',JSON.stringify(report,null,2)+'\n');
 if(errors.length||requestFailures.length||Object.entries(validation).some(([k,v])=>typeof v==='boolean'&&!v))throw Error(JSON.stringify({errors,requestFailures,validation}));
 console.log(JSON.stringify(validation));
}finally{await browser?.close();server?.kill();}
