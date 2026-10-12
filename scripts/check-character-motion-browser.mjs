// Repeatable poses rendered by the shipped gameplay renderer with native art.
// Scripted visual fixtures / software WebGL are not physical iPhone results.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {spawn,execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const origin=process.env.ART_TEST_ORIGIN??'http://127.0.0.1:4190';
const server=process.env.ART_TEST_ORIGIN?null:spawn(process.execPath,['scripts/preview.mjs','--port','4190'],{stdio:['ignore','pipe','pipe']});
if(server)await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('preview ready'))resolve();});server.on('error',reject);});
let browser;const errors=[],requestFailures=[],captures=[];
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.ART_TEST_BROWSER??'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:1,serviceWorkers:'block'});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('requestfailed',r=>requestFailures.push({url:r.url(),failure:r.failure()?.errorText}));page.on('response',r=>{if(r.status()>=400)requestFailures.push({url:r.url(),status:r.status()});});
 await page.route('**/__character_motion',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><style>html,body{margin:0;overflow:hidden}canvas{width:100vw;height:100vh;display:block}</style><canvas></canvas>'}));
 await page.goto(origin+'/__character_motion');
 await page.evaluate(async()=>{
  const [{Renderer},{Game},{actorModel},{actorDeathProgress}]=await Promise.all([import('/js/three-renderer.js'),import('/js/engine.js'),import('/js/geometry.js'),import('/js/actor-pose.js')]);
  const game=new Game({map:14,mode:'tdm'}, {seed:817}),actor=game.actors.find(a=>a.team!==game.player.team);
  game.actors=[game.player,actor];game.player.reset({x:0,y:0,z:27},0);game.player.pitch=-.08;game.player.spawnProtection=0;
  const renderer=new Renderer(document.querySelector('canvas'),{quality:'high',motion:false,fov:80,frameRate:60});
  renderer.setArena(game.arena);await renderer.ready;await renderer.prepareMatch(game);
  window.characters={game,actor,renderer,actorModel,actorDeathProgress};
  window.characters.reset=()=>{actor.reset({x:-1.25,y:0,z:22.5},Math.PI);actor.operatorMotion=null;actor.spawnProtection=0;actor.weapon.sinceShot=10;game.time=2;actorModel(actor,game.time);renderer.cameraY=null;};
  window.characters.step=(frames=1)=>{for(let f=0;f<frames;f++){game.time+=1/120;actor.hitReact*=Math.exp(-14/120);actor.weapon.update(1/120);actorModel(actor,game.time);}};
 });
 console.log('Native character renderer initialized');
 await mkdir('test-results/characters61',{recursive:true});
 async function capture(name){
  const sample=await page.evaluate(name=>{
   const {game:g,actor:a,renderer:r,actorDeathProgress}=window.characters;r.shadowClock=1;r.render(g,1/120,false);
   return {name,time:g.time,deathProgress:actorDeathProgress(a,g.time),duck:a.animDuck,stride:a.stride,stance:a.operatorMotion.stance,run:a.operatorMotion.run,hipY:a.operatorMotion.hipY,chest:{x:a.renderParts[7].x,y:a.renderParts[7].y,z:a.renderParts[7].z,pitch:a.renderParts[7].pitch,roll:a.renderParts[7].roll},feet:a.renderParts.slice(4,6).map(p=>({x:p.x,y:p.y,z:p.z,pitch:p.pitch})),nativeWeaponVisible:a.nativeWeaponVisible,nativeParts:a.nativeWeaponGroups?.length??0,draws:r.drawCalls,triangles:r.triangles};
  },name);
  await page.screenshot({path:`test-results/characters61/${name}.png`,timeout:120000});captures.push(sample);console.log(name,JSON.stringify(sample.chest));
 }
 await page.evaluate(()=>window.characters.reset());await capture('stand');
 for(const [label,params]of [['walk',{vx:0,vz:1.8}],['run',{vx:0,vz:6.1}],['strafe',{vx:3,vz:0}],['reverse',{vx:0,vz:-2.4}]]){
  await page.evaluate(params=>{const m=window.characters;m.reset();Object.assign(m.actor,params);m.step(120);m.actor.stride=0;},params);
  for(const [frame,count]of [['support',0],['transfer',14],['swing',14]]){await page.evaluate(count=>window.characters.step(count),count);await capture(`${label}-${frame}`);}
 }
 await page.evaluate(()=>{const m=window.characters;m.reset();m.actor.crouched=true;m.actor.pitch=.4;});
 for(const [label,count]of [['entry',8],['mid',10],['settled',60]]){await page.evaluate(count=>window.characters.step(count),count);await capture(`crouch-aim-${label}`);}
 await page.evaluate(()=>{const m=window.characters;m.reset();m.game.damage(m.actor,35,m.game.player);});
 for(const [label,count]of [['impact',3],['recover',15],['settled',90]]){await page.evaluate(count=>window.characters.step(count),count);await capture(`hit-${label}`);}
 await page.evaluate(()=>{const m=window.characters;m.reset();m.game.damage(m.actor,120,m.game.player);});
 for(const [label,count]of [['start',0],['knees',14],['fold',18],['end',25]]){await page.evaluate(count=>window.characters.step(count),count);await capture(`death-${label}`);}
 const validation={nativePresentation:captures.every(s=>s.nativeWeaponVisible&&s.nativeParts>0),crouchEases:captures.find(s=>s.name==='crouch-aim-entry').duck<captures.find(s=>s.name==='crouch-aim-mid').duck&&captures.find(s=>s.name==='crouch-aim-settled').duck>.49,deathDropsChest:captures.find(s=>s.name==='death-end').chest.y<captures.find(s=>s.name==='death-start').chest.y-.4,runChangesStance:captures.find(s=>s.name==='run-support').stance<captures.find(s=>s.name==='walk-support').stance-.2};
 const report={kind:'software_WebGL_native_character_temporal_visual_fixtures',actual_iphone_data:false,capturedAt:new Date().toISOString(),sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),distributionDirty:!!execFileSync('git',['status','--porcelain','--','dist'],{encoding:'utf8'}).trim(),viewport:{width:844,height:390},errors,requestFailures,validation,captures};
 await writeFile('docs/validation-character-motion61-browser.json',JSON.stringify(report,null,2)+'\n');
 if(errors.length||requestFailures.length||Object.values(validation).some(v=>!v))throw Error(JSON.stringify({errors,requestFailures,validation}));
 console.log(JSON.stringify(validation));
}finally{await browser?.close();server?.kill();}
