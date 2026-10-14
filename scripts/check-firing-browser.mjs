// Native Game/Renderer firing evidence with matched pre-change controls.
// Chromium/SwiftShader establishes integration, never physical iPhone speed.
import {createRequire} from 'node:module';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {spawn,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

const require=createRequire(import.meta.url),search=[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,...(process.env.NODE_PATH??'').split(':')].filter(Boolean);
let chromium;
for(const p of [...search.map(p=>resolve(p,'playwright')),'playwright']){try{({chromium}=require(p));break;}catch{}}
if(!chromium)throw Error('Playwright is required');
const output=process.env.FIRING_CAPTURE_DIR??'work/firing-current',port=4199,origin=process.env.ART_TEST_ORIGIN??`http://127.0.0.1:${port}`;
const baselineCommit=process.env.FIRING_BASELINE_COMMIT??'0ec0b66',hash=d=>createHash('sha256').update(d).digest('hex');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim(),sourceCommit=git('rev-parse','HEAD'),distributionDirty=!!git('status','--porcelain','--','dist');
// Snapshot every JS module. A simultaneous release-number bump cannot mix
// runtime versions in a capture; the baseline replaces only its renderer.
const modules=new Map(await Promise.all((await readdir('dist/js')).filter(n=>n.endsWith('.js')).map(async n=>[n,await readFile(`dist/js/${n}`)])));
const baselineRenderer=execFileSync('git',['show',`${baselineCommit}:dist/js/three-renderer.js`]);
const runtimeFiles=['three-renderer.js','firing-presentation.js','particles.js','engine.js','weapons.js','graphics-quality.js','aim.js','weapon-models.js'];
const runtimeSha256=Object.fromEntries(runtimeFiles.map(n=>[n,hash(modules.get(n))]));
const allModuleSha256=Object.fromEntries([...modules].map(([n,data])=>[n,hash(data)]));
const server=process.env.ART_TEST_ORIGIN?null:spawn(process.execPath,['scripts/preview.mjs','--port',String(port)],{stdio:['ignore','pipe','pipe']});
if(server)await new Promise((ok,fail)=>{const timer=setTimeout(()=>fail(Error('Preview startup timed out')),15000);server.stdout.on('data',d=>{if(String(d).includes('preview ready')){clearTimeout(timer);ok();}});server.on('error',fail);});
await mkdir(output,{recursive:true});
let browser;
const reports={};
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.ART_TEST_BROWSER??'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const variant of ['before','after']){
  const errors=[],requestFailures=[],captures=[],validation={},scenarios={};
  const page=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:1,serviceWorkers:'block'});
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('requestfailed',r=>requestFailures.push({url:r.url(),failure:r.failure()?.errorText}));page.on('response',r=>{if(r.status()>=400)requestFailures.push({url:r.url(),status:r.status()});});
  await page.route('**/js/**',route=>{const n=new URL(route.request().url()).pathname.split('/').at(-1),body=variant==='before'&&n==='three-renderer.js'?baselineRenderer:modules.get(n);return body?route.fulfill({contentType:'application/javascript',body}):route.continue();});
  await page.route('**/__firing',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden}canvas{width:100vw;height:100vh;display:block}</style><canvas></canvas>'}));
  await page.goto(origin+'/__firing');
  scenarios.environment=await page.evaluate(async()=>{
   const [{Renderer},{Game,Actor,emptyInput},{Weapon,WEAPONS},{rng},{muzzleFlash,muzzleGas},{scopeVisible},{QUALITY}]=await Promise.all([import('/js/three-renderer.js'),import('/js/engine.js'),import('/js/weapons.js'),import('/js/math.js'),import('/js/firing-presentation.js'),import('/js/aim.js'),import('/js/graphics-quality.js')]);
   Math.random=rng(670714);const game=new Game({map:14,mode:'tdm'},{seed:670714});game.actors=[game.player];game.debug.god=true;game.rules.time=999;game.events=[];
   const renderer=new Renderer(document.querySelector('canvas'),{quality:'high',motion:false,fov:80,frameRate:60});renderer.setArena(game.arena);await renderer.ready;await renderer.prepareMatch(game);
   const m=window.firingQA={game,renderer,Game,Actor,Weapon,WEAPONS,emptyInput,muzzleFlash,muzzleGas,scopeVisible,events:[],particleCalls:[],gasSlots:new Set(),flashDraws:0,eventType:null,adsInput:false};
   const particle=renderer.particle;renderer.particle=function(...args){m.particleCalls.push({event:m.eventType,kind:args[1],size:args[3],life:args[4],velocity:args.slice(5),position:args[0]});const result=particle.apply(this,args);if(m.eventType==='shot'&&args[1]===0)m.gasSlots.add(renderer.effects[(renderer.effectCursor-1)%(QUALITY[renderer.quality]??QUALITY.medium).effects]);return result;};
   renderer.muzzle.onBeforeRender=()=>m.flashDraws++;
   m.dispatch=()=>{for(const e of game.events){m.eventType=e.type;renderer.events([e],game);m.events.push(e);}m.eventType=null;game.events=[];};
   m.tick=seconds=>{for(let i=0,n=Math.round(seconds*120);i<n;i++){const input=emptyInput();input.ads=m.adsInput;game.update(1/120,input);m.dispatch();renderer.updateEffects(1/120,game);}};
   m.select=(id,attachments={},ads=0)=>{game.actors=[game.player];game.paused=false;game.rules.phase='playing';game.player.weapons[0]=new Weapon(id,attachments);game.player.reset({x:0,y:game.arena.floorAt({x:0,y:0,z:23},.1),z:23},0);game.player.pitch=.14;game.player.ads=ads;m.adsInput=ads>0;game.casings=[];game.events=[];m.events=[];m.particleCalls=[];m.gasSlots.clear();for(const e of renderer.effects)e.life=0;renderer.events([{type:'round'}],game);renderer.cameraY=null;renderer.weaponClearanceState={};};
   m.shoot=()=>{const g=game,p=g.player,before=p.weapon.ammo;const success=g.shoot(p);m.dispatch();return {success,ammoBefore:before,ammoAfter:p.weapon.ammo,shotEvents:m.events.filter(e=>e.type==='shot').length,gasCalls:m.particleCalls.filter(e=>e.event==='shot'&&e.kind===0),nativeShot:m.events.find(e=>e.type==='shot'),pellets:p.weapon.def.pellets};};
   m.frame=(menu=false,dt=0,draw=true)=>{m.flashDraws=0;if(draw){renderer.shadowClock=1;renderer.render(game,dt,menu);}else{renderer.prepareWeapon(game,844/390,menu);renderer.updateEffects(0,game);}const p=game.player,w=p.weapon;return {rendered:draw,time:game.time,age:w.sinceShot,id:w.def.id,name:w.def.name,kind:w.def.kind,ammo:w.ammo,barrel:w.barrel,optic:w.optic,ads:p.ads,menu,paused:game.paused,scope:m.scopeVisible(p),cameraFov:renderer.camera.fov,flash:{visible:renderer.muzzle.visible,opacity:renderer.muzzle.material.opacity,width:renderer.muzzle.scale.x,height:renderer.muzzle.scale.y,rotation:renderer.muzzle.material.rotation,light:renderer.muzzleLight.intensity,draws:draw?m.flashDraws:null},gas:renderer.effects.filter(e=>e.life>0&&e.kind===0&&m.gasSlots.has(e)).map(e=>({size:e.size,life:e.life,max:e.max,x:e.x,y:e.y,z:e.z,vx:e.vx,vy:e.vy,vz:e.vz})),instances:renderer.fxMesh.geometry.instanceCount,draws:draw?renderer.drawCalls:null,triangles:draw?renderer.triangles:null,renderPasses:draw?renderer.renderPasses:null,resources:{textureEstimateBytes:renderer.textureMemory,textures:renderer.textures.length,glTextures:renderer.renderer.info.memory.textures,effectPool:renderer.effects.length,billboardCapacity:renderer.fxAttributes.instanceAlpha.count,sceneChildren:renderer.scene.children.length,weaponSceneChildren:renderer.weaponScene.children.length},feetOnFloor:Math.abs(p.y-game.arena.floorAt(p,p.y+.1))<.001,grounded:p.grounded,collisionFree:!game.arena.collides({...p,y:p.y+.04},.31,p.height-.04),loaded:renderer.loaded,nativeWorldBatches:renderer.worldBatches.length,nativeWeaponGroups:renderer.blenderWeaponGroups?.length??0,nativeHandGroups:renderer.blenderHandGroups?.length??0};};
   const gl=renderer.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return {webgl2:gl instanceof WebGL2RenderingContext,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),nativeAssetsLoaded:!!renderer.blenderAssets};
  });
  console.log(variant,'native firing initialized');
  async function frame(name,screenshot=true,menu=false,dt=0,draw=true){const sample=await page.evaluate(({menu,dt,draw})=>window.firingQA.frame(menu,dt,draw),{menu,dt,draw});let evidence={name,...sample};if(screenshot){const path=`${variant}-${name}.png`,data=await page.screenshot({path:`${output}/${path}`,timeout:120000});evidence={...evidence,path,bytes:data.length,sha256:hash(data)};captures.push(evidence);}console.log(variant,name,JSON.stringify({age:sample.age,flash:sample.flash,gas:sample.gas.length}));return evidence;}
  scenarios.families={};
  for(const [name,id]of [['pistol',10],['rifle',0],['shotgun',5],['sniper',7],['smg',3]]){
   await page.evaluate(id=>window.firingQA.select(id),id);const before=await frame(`${name}-control`,false);const shot=await page.evaluate(()=>window.firingQA.shoot());
   const timeline=[];let last=0;
   for(const [label,age]of [['birth-0ms',0],['peak-8ms',1/120],['fade-25ms',3/120],['gas-50ms',6/120],['gas-150ms',18/120],['expired-450ms',54/120]]){
    const screenshot=name==='rifle'?['birth-0ms','peak-8ms','fade-25ms','gas-150ms'].includes(label):variant==='after'&&['peak-8ms','gas-150ms'].includes(label);
    await page.evaluate(dt=>window.firingQA.tick(dt),age-last);timeline.push(await frame(`${name}-${label}`,screenshot,false,0,screenshot||name==='rifle'));last=age;
   }
   scenarios.families[name]={before,shot,timeline};
  }
  if(variant==='after'){
  scenarios.exclusions={};
  for(const [name,id,attachments]of [['suppressor',0,{barrel:1}],['integral-suppressor',21,{}],['blade',12,{}]]){
   await page.evaluate(({id,attachments})=>window.firingQA.select(id,attachments),{id,attachments});const shot=await page.evaluate(()=>window.firingQA.shoot());await page.evaluate(()=>window.firingQA.tick(1/120));scenarios.exclusions[name]={shot,frame:await frame(name,variant==='after'&&name==='suppressor')};
  }
  await page.evaluate(()=>{const m=window.firingQA;m.select(0);m.shoot();m.tick(1/120);m.game.paused=true;});
  const pausedBefore=await frame('paused-active-flash',false);
  scenarios.pause=await page.evaluate(()=>{const m=window.firingQA,snapshot=()=>JSON.stringify({time:m.game.time,weaponAge:m.game.player.weapon.sinceShot,effects:m.renderer.effects});const before=snapshot();for(let i=0;i<2;i++){m.game.update(1/30,m.emptyInput());m.frame(false,1/30);}return {exactlyFrozen:before===snapshot()};});
  scenarios.pause.before=pausedBefore;await page.evaluate(()=>{window.firingQA.game.paused=false;window.firingQA.tick(.1);});scenarios.pause.expired=await frame('pause-resume-expired',false);
  await page.evaluate(()=>{window.firingQA.select(0);window.firingQA.shoot();});scenarios.menu=await frame('menu-after-shot',false,true);
  scenarios.optics={};
  for(const [name,id,optic]of [['reflex',0,1],['scope',7,3],['rifle-6x',0,6]]){
   await page.evaluate(({id,optic})=>{const m=window.firingQA;m.select(id,{optic},1);m.frame(false,0,false);m.shoot();m.tick(1/120);},{id,optic});scenarios.optics[name]=await frame(`${name}-aimed-fire`,false);
  }
  scenarios.low=await page.evaluate(()=>{const m=window.firingQA;m.renderer.settings.quality='low';m.renderer.resetQuality();m.select(5);return m.shoot();});await page.evaluate(()=>window.firingQA.tick(1/120));scenarios.low.frame=await frame('low-shotgun-peak',variant==='after');
  scenarios.bot=await page.evaluate(()=>{const m=window.firingQA;m.select(0);const a=new m.Actor(1,1,0,{primary:0});a.reset({x:2,y:0,z:23},0);a.pitch=.14;m.game.actors.push(a);m.game.shoot(a,true);m.dispatch();const ordinary=m.particleCalls.filter(e=>e.event==='shot');m.particleCalls=[];a.weapons[0]=new m.Weapon(0,{barrel:1});m.game.shoot(a,true);m.dispatch();return {ordinary,suppressed:m.particleCalls.filter(e=>e.event==='shot')};});
  }
  scenarios.allWeapons=await page.evaluate(()=>{const m=window.firingQA,r=m.renderer,result=[];for(const def of m.WEAPONS){m.select(def.id);const shot=m.shoot();m.tick(1/120);r.prepareWeapon(m.game,844/390,false);const w=m.game.player.weapon,flash={visible:r.muzzle.visible,opacity:r.muzzle.material.opacity,width:r.muzzle.scale.x,height:r.muzzle.scale.y,light:r.muzzleLight.intensity},gas=m.muzzleGas(w),samples=[];for(const serial of [1,2,19])for(const age of [0,.006,.009,.025,.034,.044,.045,.1,NaN,-1]){w.shotSerial=serial;w.sinceShot=age;samples.push({...m.muzzleFlash(w)});}result.push({id:def.id,kind:def.kind,suppressed:w.suppressed,pellets:def.pellets,shot,flash,gas,finite:samples.every(s=>Object.values(s).every(v=>typeof v==='boolean'||Number.isFinite(v))),bounded:samples.every(s=>s.width*s.height<=(def.kind==='SHOTGUN'?.23:def.kind==='PISTOL'?.10:.16)**2+1e-9&&s.opacity>=0&&s.opacity<=1&&s.light>=0&&s.light<=.9),expiry:samples.filter((_,i)=>[6,7,8,9].includes(i%10)).every(s=>!s.visible)});}return result;});
  const families=Object.values(scenarios.families);
  validation.nativeOneShotOneGasParticle=families.every(f=>f.shot.success&&f.shot.ammoBefore-f.shot.ammoAfter===1&&f.shot.shotEvents===1&&f.shot.gasCalls.length===1);
  validation.nativeGasAndFlashExpire=families.every(f=>!f.timeline.at(-1).flash.visible&&f.timeline.at(-1).gas.length===0);
  validation.thirtyWeaponsFiniteAndBounded=scenarios.allWeapons.length===30&&scenarios.allWeapons.every(w=>w.finite&&w.bounded&&w.expiry);
  validation.nativePresentation=captures.every(c=>c.loaded&&c.nativeWorldBatches>0&&c.nativeWeaponGroups>0&&c.nativeHandGroups>0);
  validation.gameplayCamerasLegal=captures.filter(c=>!c.menu).every(c=>c.feetOnFloor&&c.grounded&&c.collisionFree);
  validation.webgl2=scenarios.environment.webgl2;validation.noBrowserOrNetworkErrors=errors.length===0&&requestFailures.length===0;
  if(variant==='after'){
   validation.suppressedAndBladeNoFlash=Object.values(scenarios.exclusions).every(s=>!s.frame.flash.visible&&s.frame.flash.draws===0&&s.frame.flash.light===0);
   validation.pauseFreezesAgeAndEffects=scenarios.pause.exactlyFrozen&&scenarios.pause.before.flash.draws===1&&scenarios.pause.expired.flash.draws===0;
   validation.menuClearsFlash=!scenarios.menu.flash.visible&&scenarios.menu.flash.draws===0&&scenarios.menu.flash.light===0;
   validation.opticAndScopePreserved=scenarios.optics.reflex.renderPasses===2&&scenarios.optics.reflex.flash.draws===1&&[scenarios.optics.scope,scenarios.optics['rifle-6x']].every(f=>f.scope&&f.renderPasses===1&&f.flash.draws===0);
   validation.lowKeepsSingleGasAndFlash=scenarios.low.gasCalls.length===1&&scenarios.low.frame.flash.draws===1&&scenarios.low.frame.renderPasses===2;
   validation.botRetainsFlashAndThreeTracers=scenarios.bot.ordinary.length===4&&scenarios.bot.suppressed.length===3&&scenarios.bot.ordinary.every(p=>p.kind===2)&&scenarios.bot.suppressed.every(p=>p.kind===2);
   validation.fiveFamiliesFlashExpandsAndFades=families.every(f=>f.timeline[1].flash.width>f.timeline[0].flash.width&&f.timeline[2].flash.opacity<f.timeline[1].flash.opacity&&f.timeline[2].flash.light<f.timeline[1].flash.light&&!f.timeline[3].flash.visible);
   validation.familySizedGas=families.every((f,i)=>f.shot.gasCalls[0].size===[.045,.06,.07,.065,.052][i]);
   const before=reports.before;
   validation.matchedControlsRetainResources=families.every((f,i)=>JSON.stringify(f.before.resources)===JSON.stringify(Object.values(before.scenarios.families)[i].before.resources))&&scenarios.families.rifle.timeline.every((t,j)=>JSON.stringify(t.resources)===JSON.stringify(before.scenarios.families.rifle.timeline[j].resources)&&t.draws<=before.scenarios.families.rifle.timeline[j].draws&&t.renderPasses===before.scenarios.families.rifle.timeline[j].renderPasses);
   // The pitched jet must rise faster than its family-only lift. Its native
   // upward aim now contributes velocity; the old gas emitter omitted it.
   validation.fullPitchGasVelocity=families.every(f=>f.shot.gasCalls[0].velocity[1]>scenarios.allWeapons.find(w=>w.id===f.before.id).gas.lift);
  }
  const report={kind:'software_WebGL_native_firing_temporal_validation',actual_iphone_data:false,subjective_visual_approval:false,capturedAt:new Date().toISOString(),sourceCommit,distributionDirty,baselineCommit:git('rev-parse',baselineCommit),variant,runtimeSha256:{...runtimeSha256,'three-renderer.js':hash(variant==='before'?baselineRenderer:modules.get('three-renderer.js'))},allModuleSha256:{...allModuleSha256,'three-renderer.js':hash(variant==='before'?baselineRenderer:modules.get('three-renderer.js'))},snapshotRoutesAllJS:true,viewport:{width:844,height:390},scenarioNotes:['Actual shipped Game.shoot, Game.update and Renderer.render with Blacksite original collision, native Blender weapon/hands/world.','Seeded grounded player at x0/z23, pitched upward .14 rad, no AI, god mode and fixed 1/120 s native simulation isolate shot presentation. Other engine events dispatch normally.','Matched before controls replace only three-renderer.js from the stated baseline commit; all other modules are identical byte snapshots.','Rifle timeline and evidence frames use actual Renderer.render. Uncaptured intermediate family samples are marked rendered:false and use native prepareWeapon/updateEffects without submitting a draw.','Scope gates count real Sprite draw submissions; stale unused object state is not treated as visible flame.','The all-30 matrix uses native shooting and prepareWeapon; bounded sampler stress is additional to the actual frame timelines.','Bot counts use actual Game.shoot on a scripted actor. No synthetic impact/explosion emitters are used.','Software WebGL does not establish physical iPhone performance, sustained frame pacing or professional visual acceptance.'],errors,requestFailures,validation,scenarios,captures};
  reports[variant]=report;await writeFile(`${output}/validation-${variant}.json`,JSON.stringify(report,null,2)+'\n');await page.close();
  console.log(variant,JSON.stringify(validation));
  const required=Object.entries(validation);if(required.some(([,v])=>v!==true))throw Error(`${variant} firing gates failed: ${JSON.stringify(Object.fromEntries(required.filter(([,v])=>!v)))}`);
 }
 const images=Object.values(reports).flatMap(r=>r.captures.map(({name,path,bytes,sha256})=>({variant:r.variant,name,path,bytes,sha256})));
 await writeFile(`${output}/manifest.json`,JSON.stringify({kind:'native_gameplay_firing_screenshots',actual_iphone_data:false,subjective_visual_approval:false,capturedAt:new Date().toISOString(),sourceCommit,baselineCommit:git('rev-parse',baselineCommit),runtimeSha256,snapshotRoutesAllJS:true,viewport:{width:844,height:390},images},null,2)+'\n');
 console.log('Firing evidence complete',output,images.length,'images');
}finally{await browser?.close();server?.kill();}
