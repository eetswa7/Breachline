// Native gameplay reload sequences at phone-sized resolution. Software WebGL
// validates presentation/functionality, not physical iPhone performance.
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {spawn,execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const release=/const RELEASE='(\d+)'/.exec(await readFile('dist/js/boot.js','utf8'))[1];
const stage=process.argv[2]??`reload${release}`,origin=process.env.ART_TEST_ORIGIN??'http://127.0.0.1:4187';
if(!/^[a-z\d-]+$/i.test(stage))throw Error('Invalid capture stage');
const server=process.env.ART_TEST_ORIGIN?null:spawn(process.execPath,['scripts/preview.mjs','--port','4187'],{stdio:['ignore','pipe','pipe']});
if(server)await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('preview ready'))resolve();});server.on('error',reject);});
let browser;const errors=[],requestFailures=[],captures=[];
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.ART_TEST_BROWSER??'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:1,serviceWorkers:'block'});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('requestfailed',r=>requestFailures.push({url:r.url(),failure:r.failure()?.errorText}));page.on('response',r=>{if(r.status()>=400)requestFailures.push({url:r.url(),status:r.status()});});
 await page.route('**/__reload',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><style>html,body{margin:0;overflow:hidden}canvas{width:100vw;height:100vh;display:block}</style><canvas></canvas>'}));
 await page.goto(origin+'/__reload');
 await page.evaluate(async()=>{
  const [{Renderer},{Game,emptyInput},{Weapon}]=await Promise.all([import('/js/three-renderer.js'),import('/js/engine.js'),import('/js/weapons.js')]);
  const game=new Game({map:14,mode:'tdm'},{seed:681});game.actors=[game.player];game.rules.time=999;
  const renderer=new Renderer(document.querySelector('canvas'),{quality:'high',motion:true,fov:80,frameRate:60});renderer.setArena(game.arena);await renderer.ready;await renderer.prepareMatch(game);
  window.reload={game,renderer,Weapon,emptyInput};
  window.reload.start=(id,empty)=>{const m=window.reload,p=m.game.player;p.weapons[0]=new Weapon(id,{optic:1});p.slot=0;p.reset({x:0,y:0,z:27},0);p.ads=0;m.game.time=2;m.game.events=[];m.renderer.cameraY=null;m.renderer.weaponKey='';const w=p.weapon;w.ammo=empty?0:Math.max(1,w.capacity-3);if(!w.reload())throw Error('Reload failed');m.renderer.prepareWeapon(m.game,844/390,false);return w.reloadTime;};
  window.reload.step=frames=>{const m=window.reload;for(let i=0;i<frames;i++){m.game.update(1/120,m.emptyInput());m.renderer.prepareWeapon(m.game,844/390,false);}};
 });
 await mkdir(`test-results/${stage}`,{recursive:true});
 async function capture(name){
  const sample=await page.evaluate(name=>{
   const m=window.reload,r=m.renderer,w=m.game.player.weapon;r.shadowClock=1;r.render(m.game,1/120,false);
   const parts=r.weaponParts,rig=parts.reloadRig,xyz=q=>q?{x:q.x,y:q.y,z:q.z,yaw:q.yaw,pitch:q.pitch,roll:q.roll}:null;
   const groups=[...(r.blenderWeaponGroups??[]),...(r.blenderHandGroups??[])];
   const jointsMatch=groups.every(g=>{const q=parts[g.anchor];return q&&['x','y','z','yaw','pitch','roll'].every(k=>Math.abs((g[k]??0)-(q[k]??0))<1e-7);});
   return {name,weapon:w.def.name,id:w.def.id,phase:1-w.reloadLeft/w.reloadTime,ammo:w.ammo,reloadStartedEmpty:w.reloadStartedEmpty,nativeWeaponGroups:r.blenderWeaponGroups?.length??0,nativeHandGroups:r.blenderHandGroups?.length??0,jointsMatch,finite:parts.every(q=>['x','y','z','yaw','pitch','roll'].every(k=>Number.isFinite(q[k]??0))),parts:parts.filter(q=>/^(supportHand|pumpHand|magazine|bolt|slide|cylinder|loadShell|lid)$/.test(q.tag??'')).map(q=>({tag:q.tag,...xyz(q),hidden:!!q.hidden})),contact:rig?.contact?{...rig.contact}:null,draws:r.drawCalls,triangles:r.triangles};
  },name);
  await page.screenshot({path:`test-results/${stage}/${name}.png`,timeout:120000});captures.push(sample);console.log(name,JSON.stringify({phase:sample.phase,contact:sample.contact,jointsMatch:sample.jointsMatch}));
 }
 for(const [id,empty]of [[0,true],[0,false],[2,true],[4,true],[5,true],[9,true],[10,true],[18,true],[20,true],[22,true]]){
  const duration=await page.evaluate(({id,empty})=>window.reload.start(id,empty),{id,empty});let last=0;
  const phases=id===0&&empty?[.10,.40,.76,.89,.98]:[.40,.76,.89];
  for(const phase of phases){await page.evaluate(frames=>window.reload.step(frames),Math.round((phase-last)*duration*120));last=phase;await capture(`reload-${id}-${empty?'empty':'tactical'}-${Math.round(phase*100)}`);}
 }
 const pause=await page.evaluate(()=>{const m=window.reload;m.start(0,true);m.step(30);const before=m.game.player.weapon.reloadLeft;m.game.paused=true;m.step(8);m.game.paused=false;return before===m.game.player.weapon.reloadLeft;});
 const report={kind:'software_WebGL_native_reload_temporal_validation',actual_iphone_data:false,capturedAt:new Date().toISOString(),release,sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),distributionDirty:!!execFileSync('git',['status','--porcelain','--','dist'],{encoding:'utf8'}).trim(),viewport:{width:844,height:390},errors,requestFailures,validation:{pauseFreezesClock:pause,nativePresentation:captures.every(s=>s.nativeWeaponGroups>0&&s.nativeHandGroups>0),coherentNativeJoints:captures.every(s=>s.jointsMatch),finiteTransforms:captures.every(s=>s.finite)},captures};
 await writeFile(`docs/validation-${stage}-browser.json`,JSON.stringify(report,null,2)+'\n');
 if(errors.length||requestFailures.length||Object.values(report.validation).some(v=>!v))throw Error(JSON.stringify(report.validation));
 console.log(JSON.stringify(report.validation));
}finally{await browser?.close();server?.kill();}
