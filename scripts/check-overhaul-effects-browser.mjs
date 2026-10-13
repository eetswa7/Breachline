// Release64 native Renderer + Game integration gate. Chromium/SwiftShader is
// software WebGL evidence, never an iPhone performance or visual approval claim.
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {spawn,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

const require=createRequire(import.meta.url);
const paths=[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,...(process.env.NODE_PATH??'').split(':')].filter(Boolean);
let chromium;
for(const path of [...paths.map(p=>resolve(p,'playwright')),'playwright']){
 try{({chromium}=require(path));break;}catch{}
}
if(!chromium)throw Error('Playwright must be installed or supplied through NODE_PATH/CODEX_PRIMARY_RUNTIME_NODE_MODULES');
const runtimeRelease=/const RELEASE='(\d+)'/.exec(await readFile('dist/js/boot.js','utf8'))?.[1];
if(Number(runtimeRelease)<64)throw Error(`This capture gate targets the Release64 effects stage or later, found ${runtimeRelease}`);
const origin=process.env.ART_TEST_ORIGIN??'http://127.0.0.1:4194';
const server=process.env.ART_TEST_ORIGIN?null:spawn(process.execPath,['scripts/preview.mjs','--port','4194'],{stdio:['ignore','pipe','pipe']});
if(server)await new Promise((resolve,reject)=>{
 const timeout=setTimeout(()=>reject(Error('Preview startup timed out')),15000);
 server.stdout.on('data',d=>{if(String(d).includes('preview ready')){clearTimeout(timeout);resolve();}});
 server.on('error',reject);server.on('exit',code=>{if(code)reject(Error(`Preview exited ${code}`));});
});
const artDir='docs/art-release64',reportPath='docs/validation-effects64-browser.json';
const errors=[],requestFailures=[],captures=[],validation={},scenarios={};
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const sourceCommit=git('rev-parse','HEAD');
const hash=data=>createHash('sha256').update(data).digest('hex');
const runtimeFiles=['boot.js','engine.js','three-renderer.js','explosion-shock.js','environmental-fire.js','glass-damage.js','glass-panels.js','blender-world.js','maps.js'];
const runtimeSha256=Object.fromEntries(await Promise.all(runtimeFiles.map(async name=>[name,hash(await readFile(`dist/js/${name}`))])));
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.ART_TEST_BROWSER??'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:1,serviceWorkers:'block'});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('requestfailed',r=>requestFailures.push({url:r.url(),failure:r.failure()?.errorText}));
 page.on('response',r=>{if(r.status()>=400)requestFailures.push({url:r.url(),status:r.status()});});
 await page.route('**/__overhaul_effects',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden}canvas{width:100vw;height:100vh;display:block}</style><canvas></canvas>'}));
 await page.goto(origin+'/__overhaul_effects');
 scenarios.environment=await page.evaluate(async()=>{
  const [{Renderer},{Game,emptyInput},{Weapon},{rng},{SHOCK_LIMITS},{FIRE_LIMITS},{GLASS_DAMAGE_BUDGET}]=await Promise.all([import('/js/three-renderer.js'),import('/js/engine.js'),import('/js/weapons.js'),import('/js/math.js'),import('/js/explosion-shock.js'),import('/js/environmental-fire.js'),import('/js/glass-damage.js')]);
  Math.random=rng(640681);
  const game=new Game({map:14,mode:'tdm'},{seed:640681});game.actors=[game.player];game.debug.god=true;game.rules.time=999;game.events=[];
  const renderer=new Renderer(document.querySelector('canvas'),{quality:'high',motion:false,fov:80,frameRate:60});
  renderer.setArena(game.arena);await renderer.ready;await renderer.prepareMatch(game);
  const m=window.effects64={game,renderer,Game,Weapon,emptyInput,SHOCK_LIMITS,FIRE_LIMITS,GLASS_DAMAGE_BUDGET,events:[]};
  m.dispatch=()=>{m.events.push(...m.game.events);renderer.events(m.game.events,m.game);m.game.events=[];};
  // Effects retain fixed-step native simulation between sampled gameplay frames.
  // Avoid spending software raster time drawing frames that are not captured.
  m.tick=seconds=>{const frames=Math.round(seconds*120);for(let n=0;n<frames;n++){m.game.update(1/120,emptyInput());m.dispatch();renderer.updateEffects(1/120,m.game);}};
  m.look=(position,target)=>{const p=m.game.player;p.reset(position,Math.atan2(target.x-position.x,-(target.z-position.z)));const eye=m.game.eye(p);p.pitch=Math.atan2(target.y-eye.y,Math.hypot(target.x-eye.x,target.z-eye.z));renderer.cameraY=null;};
  m.visiblePosition=(target,targetBlock=null)=>{
   const g=m.game;
   for(const distance of [6,4,9])for(let n=0;n<16;n++){
    const angle=n*Math.PI/8,start={x:target.x+Math.sin(angle)*distance,y:0,z:target.z+Math.cos(angle)*distance};start.y=g.arena.floorAt(start,target.y+.5);
    if(g.arena.collides({...start,y:start.y+.04},.31,1.74))continue;
    const eye={x:start.x,y:start.y+1.66,z:start.z},len=Math.hypot(target.x-eye.x,target.y-eye.y,target.z-eye.z),dir={x:(target.x-eye.x)/len,y:(target.y-eye.y)/len,z:(target.z-eye.z)/len},hit=g.arena.trace(eye,dir,len);
    if(hit.block&&hit.block!==targetBlock&&hit.t<len-.25)continue;
    return start;
   }
   return null;
  };
  m.snapshot=()=>({gameTime:m.game.time,shockLives:renderer.explosionShock.entries.map(e=>e.life),fireLives:renderer.environmentalFire.entries.map(e=>e.life),particleLives:renderer.effects.map(e=>e.life),fireAttributes:Object.fromEntries(Object.entries(renderer.environmentalFire.attributes).map(([k,a])=>[k,Array.from(a.array)])),shockAttributes:Object.fromEntries(Object.entries(renderer.explosionShock.attributes).map(([k,a])=>[k,Array.from(a.array)]))});
  m.draws={shock:0,fire:0,glass:0};
  for(const [key,mesh]of [['shock',renderer.explosionShock.mesh],['fire',renderer.environmentalFire.mesh],['glass',renderer.glassDamage.mesh]])mesh.onBeforeRender=()=>{if((mesh.geometry.instanceCount??mesh.count)>0)m.draws[key]++;};
  m.frame=(dt=0)=>{m.draws={shock:0,fire:0,glass:0};renderer.shadowClock=1;renderer.render(m.game,dt,false);const g=m.game,p=g.player,floor=g.arena.floorAt(p,p.y+.1);return {time:g.time,map:g.arena.info.id,playerPosition:{x:p.x,y:p.y,z:p.z},floor,grounded:p.grounded,feetOnFloor:Math.abs(p.y-floor)<.001,playerCollisionFree:!g.arena.collides({x:p.x,y:p.y+.04,z:p.z},.31,p.height-.04),eye:{...renderer.eye},draws:renderer.drawCalls,triangles:renderer.triangles,renderPasses:renderer.renderPasses,effectDraws:{...m.draws},shockInstances:renderer.explosionShock.mesh.geometry.instanceCount,fireInstances:renderer.environmentalFire.mesh.geometry.instanceCount,glassInstances:renderer.glassDamage.mesh.count,glassStates:renderer.glassDamage.states.size,shockLives:renderer.explosionShock.entries.filter(e=>e.life>0).map(e=>e.life),fireLives:renderer.environmentalFire.entries.filter(e=>e.life>0).map(e=>e.life),fireHeight:renderer.environmentalFire.attributes.instanceSize.getY(0),fireAlpha:renderer.environmentalFire.attributes.instanceAlpha.getX(0),nativeWorldBatches:renderer.worldBatches.length,nativeWeaponGroups:renderer.blenderWeaponGroups?.length??0,nativeHandGroups:renderer.blenderHandGroups?.length??0,loaded:renderer.loaded};};
  const gl=renderer.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
  return {webgl2:gl instanceof WebGL2RenderingContext,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),nativeAssetsLoaded:!!renderer.blenderAssets,textureEstimateBytes:renderer.textureMemory,panels:renderer.glassDamage.panels.length,authoredBarrels:game.arena.breakables.map(b=>({x:b.x,y:b.y,z:b.z,hp:b.hp}))};
 });
 console.log('Release64 native Game + Renderer initialized',JSON.stringify(scenarios.environment));
 await mkdir(artDir,{recursive:true});
 async function capture(name){
  const sample=await page.evaluate(name=>({name,...window.effects64.frame()}),name);
  const image=await page.screenshot({path:`${artDir}/${name}.png`,timeout:120000});
  captures.push({...sample,path:`art-release64/${name}.png`,bytes:image.length,sha256:hash(image)});
  console.log(name,JSON.stringify({shock:sample.shockInstances,fire:sample.fireInstances,glass:sample.glassInstances,time:sample.time}));return sample;
 }
 // Use the game's thrown grenade, fuse, bounce and explosion event, with no
 // fake render-only blast. Seeded QA placement and god mode keep the view stable.
 scenarios.grenade=await page.evaluate(()=>{
  const m=window.effects64,g=m.game;m.look({x:0,y:0,z:27},{x:0,y:1.2,z:5});g.player.equipment='frag';g.throwGrenade(g.player);m.dispatch();
  let frames=0;while(g.grenades.length&&frames++<600){g.update(1/120,m.emptyInput());m.dispatch();}
  const event=m.events.filter(e=>e.type==='explosion').at(-1);
  if(!event)throw Error('Thrown grenade did not emit its explosion');
  const target={...event.position,y:event.position.y+.1},position=m.visiblePosition(target);
  if(!position)throw Error('No collision-free visible gameplay camera for the grenade blast');
  m.look(position,target);return {frames,event,remainingGrenades:g.grenades.length};
 });
 await capture('grenade-before-front');
 await page.evaluate(()=>window.effects64.tick(.067));const grenadeEarly=await capture('grenade-front-067ms');
 await page.evaluate(()=>window.effects64.tick(.183));const grenadeMid=await capture('grenade-front-250ms');
 await page.evaluate(()=>window.effects64.tick(.35));const grenadeExpired=await capture('grenade-front-expired');
 validation.engineGrenadeFuse=scenarios.grenade.remainingGrenades===0&&scenarios.grenade.frames>=276;
 validation.grenadeEmitsShockWithoutFuelFire=grenadeEarly.shockInstances===1&&grenadeEarly.fireInstances===0;
 validation.shockAgesAndExpires=grenadeMid.shockLives[0]<grenadeEarly.shockLives[0]&&grenadeExpired.shockInstances===0;
 // Shoot a real authored barrel using authoritative engine ballistics.
 scenarios.barrel=await page.evaluate(()=>{
  const m=window.effects64,g=m.game,r=m.renderer;let b,start;
  for(const barrel of g.arena.breakables){if(barrel.destroyed)continue;const candidate=m.visiblePosition(barrel,barrel);if(candidate){b=barrel;start=candidate;break;}}
  if(!b)throw Error('Native Blacksite contains no available authored barrel');
  r.events([{type:'round'}],g);g.player.weapons[0]=new m.Weapon(0);g.player.slot=0;let shots=0;
  while(!b.destroyed&&shots<8){shots++;m.look(start,b);g.player.ads=1;g.player.weapon.cooldown=0;g.shoot(g.player);m.dispatch();}
  const event=m.events.filter(e=>e.type==='explosion'&&e.environmentalFire).at(-1);m.look(start,{x:b.x,y:b.y+.2,z:b.z});
  return {shots,destroyed:!!b.destroyed,hp:b.hp,position:{x:b.x,y:b.y,z:b.z},playerPosition:start,event};
 });
 await page.evaluate(()=>window.effects64.tick(.2));const fireEarly=await capture('barrel-aftermath-200ms');
 await page.evaluate(()=>window.effects64.tick(.8));const fireOne=await capture('barrel-aftermath-1s');
 scenarios.pause=await page.evaluate(()=>{
  const m=window.effects64;m.game.paused=true;const before=m.snapshot();for(let i=0;i<4;i++){m.game.update(1/30,m.emptyInput());m.renderer.render(m.game,1/30,false);}const after=m.snapshot();m.game.paused=false;
  return {exactlyFrozen:JSON.stringify(before)===JSON.stringify(after),gameTime:after.gameTime,activeFireLives:after.fireLives.filter(n=>n>0),activeShockLives:after.shockLives.filter(n=>n>0)};
 });
 await page.evaluate(()=>window.effects64.tick(3));const fireFour=await capture('barrel-aftermath-4s');
 await page.evaluate(()=>window.effects64.tick(6.5));const fireFade=await capture('barrel-aftermath-fade-10p5s');
 await page.evaluate(()=>window.effects64.tick(1.6));const fireExpired=await capture('barrel-aftermath-expired');
 validation.engineBarrelDestructionCreatesFuelFire=!!scenarios.barrel.destroyed&&!!scenarios.barrel.event?.environmentalFire&&fireEarly.fireInstances===6;
 validation.fireFlickersAndPersists=fireOne.fireInstances===6&&fireFour.fireInstances===6&&fireOne.fireHeight!==fireFour.fireHeight;
 validation.fireFadesAndExpires=fireFade.fireAlpha<fireOne.fireAlpha&&fireExpired.fireInstances===0;
 validation.pausedClocksExactlyFrozen=scenarios.pause.exactlyFrozen;
 // Genuine Game.shoot regression coverage on native glazing embedded inside
 // coarse original building colliders. The selected world parts are unchanged.
 for(const map of [0,14]){
  scenarios[`glass${map}`]=await page.evaluate(async map=>{
   const m=window.effects64,g=new m.Game({map,mode:'tdm'},{seed:640681+map});g.actors=[g.player];g.debug.god=true;g.rules.time=999;g.events=[];m.game=g;m.events=[];m.renderer.setArena(g.arena);await m.renderer.prepareMatch(g);
   g.player.weapons[0]=new m.Weapon(0);const r=m.renderer,panels=r.glassDamage.panels.filter(p=>p.part.h>5&&p.centre.y<4&&p.centre.y>.5&&Math.abs(p.normal.y)<.1&&p.width>.3&&p.height>.3).sort((a,b)=>Math.abs(a.centre.y-1.66)-Math.abs(b.centre.y-1.66));
   // The candidate must have an actual shot terminating on an original building
   // collider. Check the cosmetic system through Renderer.events, not damage().
   let selected,attempts=[];
   for(const panel of panels){
    const start=panel.centre.clone().addScaledVector(panel.normal,3);start.y=g.arena.floorAt(start,2);
    if(g.arena.collides({...start,y:start.y+.04},.31,1.74))continue;
    m.look(start,panel.centre);g.player.ads=1;g.player.weapon.cooldown=0;const before=r.glassDamage.states.size;g.shoot(g.player);const shot=g.events.find(e=>e.type==='shot');const bullet=shot&&g.arena.trace(shot.position,{x:Math.sin(g.player.yaw)*Math.cos(g.player.pitch),y:Math.sin(g.player.pitch),z:-Math.cos(g.player.yaw)*Math.cos(g.player.pitch)},250);m.dispatch();
    const state=[...r.glassDamage.states.values()].find(s=>s.panel===panel),inset=shot?(shot.end.x-panel.centre.x)*panel.normal.x+(shot.end.y-panel.centre.y)*panel.normal.y+(shot.end.z-panel.centre.z)*panel.normal.z:0;
    let originalColliderMatch=false;for(let owner=panel.part;owner&&owner!==Object.prototype;owner=Object.getPrototypeOf(owner))if(owner===shot?.stoppedBlock){originalColliderMatch=true;break;}
    attempts.push({centre:panel.centre.toArray(),fractured:!!state,shotEnd:shot?.end,originalColliderMatch,inset});
    if(state&&originalColliderMatch&&inset>.01){selected={panel,start,shot,bullet,inset};break;}r.glassDamage.clear();
    if(attempts.length>=24)break;
   }
   if(!selected)return {selected:false,candidates:panels.length,attempts};
   r.glassDamage.clear();m.tick(2.2);m.look(selected.start,selected.panel.centre);g.player.ads=0;g.player.weapon.cooldown=0;const collisionBefore=JSON.stringify(g.arena.blocks);const visibleBefore=r.worldBatches.map(b=>b.userData.fullCount);
   m.selectedGlass={...selected,collisionBefore,visibleBefore};
   return {selected:true,candidates:panels.length,attempts:attempts.length,originalColliderMatch:true,facadeInsetBeyondAuthoritativeStop:selected.inset,panel:{centre:selected.panel.centre.toArray(),normal:selected.panel.normal.toArray(),width:selected.panel.width,height:selected.panel.height,part:{mesh:selected.panel.part.mesh,blenderKind:selected.panel.part.blenderKind,w:selected.panel.part.w,h:selected.panel.part.h,d:selected.panel.part.d,surface:selected.panel.part.surface}},actualShot:selected.shot,glassPanels:r.glassDamage.panels.length};
  },map);
  await capture(`glass-map${map}-intact`);
  const first=await page.evaluate(()=>{
   const m=window.effects64,s=m.selectedGlass;if(!s)return {hits:0};const g=m.game;m.look(s.start,s.panel.centre);g.player.ads=1;g.player.weapon.cooldown=0;g.shoot(g.player);m.dispatch();m.tick(.65);m.look(s.start,s.panel.centre);m.frame();const state=m.renderer.glassDamage.states.get(s.panel);return {hits:state?.hits??0,radius:state?.hits?Math.min(.58,.14+state.hits*.065):0,shot:m.events.filter(e=>e.type==='shot').at(-1)};
  });
  await capture(`glass-map${map}-first-hit`);
  const progressive=await page.evaluate(()=>{
   const m=window.effects64,s=m.selectedGlass;if(!s)return {hits:0};const g=m.game;
   for(let n=0;n<5;n++){m.look(s.start,s.panel.centre);g.player.ads=1;g.player.weapon.cooldown=0;g.shoot(g.player);m.dispatch();m.tick(.12);}m.tick(.65);m.look(s.start,s.panel.centre);m.frame();const state=m.renderer.glassDamage.states.get(s.panel);
   return {hits:state?.hits??0,radius:state?.hits?Math.min(.58,.14+state.hits*.065):0,collisionUnchanged:JSON.stringify(g.arena.blocks)===s.collisionBefore,originalPanesRemain:JSON.stringify(m.renderer.worldBatches.map(b=>b.userData.fullCount))===JSON.stringify(s.visibleBefore),instances:m.renderer.glassDamage.mesh.count};
  });
  await capture(`glass-map${map}-progressive`);
  scenarios[`glass${map}`].first=first;scenarios[`glass${map}`].progressive=progressive;
  validation[`actualEngineShotFracturesNativeBuildingGlassMap${map}`]=first.hits===1&&progressive.hits===6&&progressive.radius>first.radius;
  validation[`coarseOriginalColliderRegressionMap${map}`]=scenarios[`glass${map}`].originalColliderMatch===true&&scenarios[`glass${map}`].facadeInsetBeyondAuthoritativeStop>.01&&!!scenarios[`glass${map}`].actualShot?.stoppedBlock;
  validation[`glassRetainsCollisionAndOriginalPanesMap${map}`]=!!progressive.collisionUnchanged&&!!progressive.originalPanesRemain;
  const reset=await page.evaluate(()=>{const m=window.effects64;m.game.resetRound();m.dispatch();if(m.selectedGlass)m.look(m.selectedGlass.start,m.selectedGlass.panel.centre);m.frame();return {states:m.renderer.glassDamage.states.size,instances:m.renderer.glassDamage.mesh.count};});
  scenarios[`glass${map}`].roundReset=reset;validation[`roundResetClearsGlassMap${map}`]=reset.states===0&&reset.instances===0;
  await capture(`glass-map${map}-round-reset`);
 }
 // Pool stress is explicitly an event replay gate. It uses native engine barrel
 // event fields, while avoiding changes to map content or additional emitters.
 scenarios.lowQuality=await page.evaluate(()=>{
  const m=window.effects64,r=m.renderer,g=m.game;r.events([{type:'round'}],g);r.settings.quality='low';r.resetQuality();const s=m.selectedGlass;
  if(s)for(const offset of [-.15,.15]){const target=s.panel.centre.clone().addScaledVector(s.panel.u,offset);m.look(s.start,target);g.player.ads=1;g.player.weapon.cooldown=0;g.shoot(g.player);m.dispatch();}
  if(s)m.look(s.start,s.panel.centre);const p=g.player,position={x:p.x+3,y:g.arena.floorAt({x:p.x+3,y:p.y,z:p.z-4},p.y+.1)+.12,z:p.z-4};
  for(let n=0;n<20;n++)r.events([{type:'explosion',position,value:8,environmentalFire:true}],g);
  const highWater={shock:r.explosionShock.entries.filter(e=>e.life>0).length,fire:r.environmentalFire.entries.filter(e=>e.life>0).length,particlePool:r.effects.length};const frame=m.frame(.1);
  return {quality:r.quality,highWater,frame,limits:{shock:m.SHOCK_LIMITS.low,fire:m.FIRE_LIMITS.low.fires*(m.FIRE_LIMITS.low.flames+m.FIRE_LIMITS.low.smoke),glass:m.GLASS_DAMAGE_BUDGET.panels*m.GLASS_DAMAGE_BUDGET.stampsPerPanel},shaderResources:{shockTransparent:r.explosionShock.mesh.material.transparent,fireTransparent:r.environmentalFire.mesh.material.transparent,glassTransparent:r.glassDamage.mesh.material.transparent,shockDepthWrite:r.explosionShock.mesh.material.depthWrite,fireDepthWrite:r.environmentalFire.mesh.material.depthWrite,glassCastsShadow:r.glassDamage.mesh.castShadow}};
 });
 await capture('low-quality-bounded-event-burst');
 const low=scenarios.lowQuality;validation.lowQualityPoolsAndDrawsBounded=low.quality==='low'&&low.highWater.shock===6&&low.highWater.fire===6&&low.frame.shockInstances===low.limits.shock&&low.frame.fireInstances===low.limits.fire&&low.frame.glassInstances<=low.limits.glass&&low.frame.effectDraws.shock<=1&&low.frame.effectDraws.fire<=1&&low.frame.effectDraws.glass<=1&&low.frame.renderPasses===2;
 scenarios.pauseWithShock=await page.evaluate(()=>{const m=window.effects64;m.game.paused=true;const before=m.snapshot();for(let i=0;i<4;i++){m.game.update(1/30,m.emptyInput());m.renderer.render(m.game,1/30,false);}const after=m.snapshot();m.game.paused=false;return {exactlyFrozen:JSON.stringify(before)===JSON.stringify(after),activeShocks:before.shockLives.filter(n=>n>0).length,activeFires:before.fireLives.filter(n=>n>0).length};});
 validation.pauseFreezesActiveShockAndFire=scenarios.pauseWithShock.exactlyFrozen&&scenarios.pauseWithShock.activeShocks>0&&scenarios.pauseWithShock.activeFires>0;
 scenarios.cleanup=await page.evaluate(async()=>{
  const m=window.effects64,r=m.renderer,g=m.game,oldMeshCount=r.scene.children.length,worldCount=r.worldBatches.length;
  r.events([{type:'round'}],g);const round={shock:r.explosionShock.mesh.geometry.instanceCount,fire:r.environmentalFire.mesh.geometry.instanceCount,glass:r.glassDamage.mesh.count};
  r.events([{type:'explosion',position:g.eye(g.player),value:8,environmentalFire:true}],g);r.render(g,.1,false);r.setArena(g.arena);await r.prepareMatch(g);const rebuilt=m.frame();
  r.buildWorld();const twice=m.frame();const afterMeshCount=r.scene.children.length;
  const systems=[r.explosionShock,r.environmentalFire,r.glassDamage];r.dispose();
  return {round,rebuilt,twice,oldMeshCount,afterMeshCount,worldCount,systemsRemoved:systems.every(s=>!r.scene.children.includes(s.mesh)),disposedShock:r.explosionShock.disposed,disposedFire:r.environmentalFire.disposed};
 });
 const clean=scenarios.cleanup;validation.roundClearsAllNewEffects=Object.values(clean.round).every(n=>n===0);
 validation.arenaResetAndRebuildClearEffects=[clean.rebuilt,clean.twice].every(f=>f.shockInstances===0&&f.fireInstances===0&&f.glassInstances===0)&&clean.rebuilt.nativeWorldBatches===clean.twice.nativeWorldBatches&&clean.oldMeshCount===clean.afterMeshCount;
 validation.disposalRemovesEffectMeshes=clean.systemsRemoved&&clean.disposedShock&&clean.disposedFire;
 validation.nativePresentation=scenarios.environment.nativeAssetsLoaded&&captures.every(c=>c.loaded&&c.nativeWorldBatches>0&&c.nativeWeaponGroups>0&&c.nativeHandGroups>0);
 validation.gameplayCameraPlacementLegal=captures.every(c=>c.feetOnFloor&&c.grounded&&c.playerCollisionFree);
 validation.webgl2=scenarios.environment.webgl2;
 validation.noBrowserOrNetworkErrors=errors.length===0&&requestFailures.length===0;
 const runtimeUnchanged=await Promise.all(runtimeFiles.map(async name=>runtimeSha256[name]===hash(await readFile(`dist/js/${name}`))));
 validation.runtimeUnchangedDuringCapture=runtimeUnchanged.every(Boolean);
 const report={kind:'software_WebGL_native_game_effects_temporal_validation',actual_iphone_data:false,subjective_visual_approval:false,featureStage:'effects64',runtimeRelease,capturedAt:new Date().toISOString(),sourceCommit,distributionDirty:!!git('status','--porcelain','--','dist'),runtimeSha256,viewport:{width:844,height:390},scenarioNotes:['Native Game and Renderer with shipped Blender world and authored weapon/hands.','Seeded player placement, no bots, god mode and fixed 1/120 s Game and Renderer.updateEffects simulation isolate reproducible cosmetic behavior between captured native render() frames.','Grenade is thrown and expires through native equipment physics; authored barrel is destroyed through Game.shoot.','Glass shots use actual engine shot events against native building glazing; no direct damage() calls.','Low quality event replay stresses bounded pools; it is separate from the gameplay trigger scenarios.','Software WebGL timings do not establish physical iPhone performance, frame pacing, or subjective visual acceptance.'],errors,requestFailures,validation,scenarios,captures};
 await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
 await writeFile(`${artDir}/manifest.json`,JSON.stringify({kind:'native_gameplay_effect_temporal_screenshots',actual_iphone_data:false,subjective_visual_approval:false,featureStage:'effects64',runtimeRelease,capturedAt:report.capturedAt,sourceCommit,runtimeSha256,viewport:report.viewport,images:captures.map(({path,bytes,sha256,name})=>({path,bytes,sha256,name}))},null,2)+'\n');
 console.log(JSON.stringify(validation));
 if(Object.values(validation).some(v=>v!==true))throw Error(`Native effect validation failed: ${JSON.stringify(Object.fromEntries(Object.entries(validation).filter(([,v])=>!v)))}`);
}finally{await browser?.close();server?.kill();}
