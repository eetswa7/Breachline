// Actual shipped WebGL gameplay images. Software Chromium is not an iPhone run.
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const origin=process.env.INSPECTION_TEST_ORIGIN??'http://127.0.0.1:4193',output='docs/art-inspection';
const server=process.env.INSPECTION_TEST_ORIGIN?null:spawn(process.execPath,['scripts/preview.mjs','--port','4193'],{stdio:['ignore','pipe','pipe']});
if(server)await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('preview ready'))resolve();});server.on('error',reject);});
const browser=await chromium.launch({headless:true,executablePath:process.env.INSPECTION_TEST_BROWSER??'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const onlyIndex=process.argv.indexOf('--only'),only=onlyIndex>=0?Number(process.argv[onlyIndex+1]):null;
const representatives=new Set(only===null?[0,3,5,7,9,10,12,21,22]:[only]);
const page=await browser.newPage({viewport:{width:932,height:430},deviceScaleFactor:1,serviceWorkers:'block'}),errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const html=await readFile('dist/index.html','utf8'),controls=html.match(/<section id="touch-layer"[\s\S]*?<\/section>/)[0].replace('touch-layer hidden','touch-layer');
await page.route('**/__inspection',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/style.css"><style>html,body{margin:0;overflow:hidden}canvas{width:100vw;height:100vh;display:block}</style><canvas id="view"></canvas>'+controls}));
await mkdir(output,{recursive:true});
try{
 await page.goto(origin+'/__inspection');
 await page.evaluate(async()=>{
  const [{Renderer},{Game,emptyInput},{Weapon,WEAPONS},{TouchInput},{DEFAULT_SETTINGS},THREE]=await Promise.all([import('/js/three-renderer.js'),import('/js/engine.js'),import('/js/weapons.js'),import('/js/input.js'),import('/js/save.js'),import('/vendor/three.module.min.js')]);
  const game=new Game({map:14,mode:'tdm'},{seed:731}),settings={...DEFAULT_SETTINGS,quality:'medium',motion:false,fov:80,layout:{}},renderer=new Renderer(document.querySelector('canvas'),settings);
  game.actors=[game.player];Object.assign(game.player,{x:0,y:0,z:27,yaw:0,pitch:0});renderer.setArena(game.arena);await renderer.ready;await renderer.prepareMatch(game);
  const input=new TouchInput(document.querySelector('canvas'),document.querySelector('#touch-layer'),settings);input.active=true;window.inspectionQA={renderer,game,input,settings,Weapon,WEAPONS,emptyInput,THREE};renderer.render(game,1/60);
 });
 // Real DOM keyboard and pointer paths reach the simulation, including cancel.
 await page.keyboard.press('i');assert(await page.evaluate(()=>{const q=window.inspectionQA;q.game.update(1/60,q.input.sample(1/60));return !!q.game.player.inspection;}));
 await page.keyboard.press('i');assert(await page.evaluate(()=>{const q=window.inspectionQA;q.game.update(1/60,q.input.sample(1/60));return q.game.player.inspection===null;}));
 await page.locator('[data-action=inspect]').click({force:true,timeout:120000});assert(await page.evaluate(()=>{const q=window.inspectionQA;q.game.update(1/60,q.input.sample(1/60));return !!q.game.player.inspection;}));
 for(let id=0;id<30;id++)for(const [phase,fraction]of [['side',.35],['top',.67]]){
  const result=await page.evaluate(async({id,phase,fraction,capture})=>{
   const q=window.inspectionQA,{renderer:r,game:g,Weapon,emptyInput,THREE}=q,p=g.player;p.weapons[0]=new Weapon(id,{optic:1});p.slot=0;p.inspection=null;p.ads=0;p.viewModel=null;p.vx=p.vz=0;g.update(1/60,{...emptyInput(),inspect:true});assertInspection();
   function assertInspection(){if(!p.inspection)throw Error('Inspection refused '+id);}
   p.inspection.elapsed=p.inspection.duration*fraction;g.time+=1;r.prepareWeapon(g,932/430,false);if(capture){for(let i=0;i<12;i++)r.updateLighting(1/60);r.shadowClock=1;r.render(g,1/60);}
   // Project native weapon geometry and accessory bounding corners, excluding
   // sleeves that naturally continue beyond the bottom of the first-person view.
   const parts=[...(r.blenderWeaponGroups??[]),...r.weaponParts.slice(r.weaponParts.coreCount)].filter(p=>!p.hidden&&!/^(rightHand|supportHand|pumpHand)$/.test(p.tag??'')),point=new THREE.Vector3(),matrix=new THREE.Matrix4(),bounds={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity};
   r.weaponRoot.updateMatrixWorld(true);r.weaponCamera.updateMatrixWorld(true);
   for(const part of parts){const geometry=r.partGeometry(part,'weapon');if(!geometry.boundingBox)geometry.computeBoundingBox();const box=geometry.boundingBox;matrix.multiplyMatrices(r.weaponRoot.matrixWorld,r.partMatrix(part));for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){point.set(x,y,z).applyMatrix4(matrix).project(r.weaponCamera);bounds.minX=Math.min(bounds.minX,point.x);bounds.maxX=Math.max(bounds.maxX,point.x);bounds.minY=Math.min(bounds.minY,point.y);bounds.maxY=Math.max(bounds.maxY,point.y);}}
   return{id,name:p.weapon.def.name,kind:p.weapon.def.kind,phase,bounds,rendered:capture,draws:capture?r.drawCalls:null,triangles:capture?r.triangles:null,inspectionElapsed:p.inspection.elapsed,ammo:p.weapon.ammo};
  },{id,phase,fraction,capture:representatives.has(id)});
  if(representatives.has(id))await page.screenshot({path:`${output}/${String(id).padStart(2,'0')}-${phase}.png`,timeout:120000});results.push(result);console.log(id,phase,JSON.stringify(result.bounds));
 }
 // Safest narrow landscape viewport: utility controls remain disjoint and inside
 // the safe area for the default simple profile and its left-handed mirror.
 await page.setViewportSize({width:667,height:375});
 const layouts=await page.evaluate(()=>{const {input,settings}=window.inspectionQA,result=[];for(const profile of ['simple','advanced'])for(const leftHanded of [false,true])for(const buttonScale of [1,1.4]){settings.controlProfile=profile;settings.leftHanded=leftHanded;settings.buttonScale=buttonScale;input.layout();const boxes=['reload','swap','inspect'].map(action=>{const b=document.querySelector(`[data-action=${action}]`),r=b.getBoundingClientRect();return{action,x:r.x,y:r.y,width:r.width,height:r.height,hidden:b.hidden};});result.push({profile,leftHanded,buttonScale,boxes});}return result;});
 for(const layout of layouts)for(const b of layout.boxes){assert(!b.hidden);assert(b.x>=0&&b.y>=0&&b.x+b.width<=667&&b.y+b.height<=375);}
 for(const layout of layouts){const [reload,swap,inspect]=layout.boxes;for(const b of [reload,swap])assert(inspect.x+inspect.width<=b.x||b.x+b.width<=inspect.x||inspect.y+inspect.height<=b.y||b.y+b.height<=inspect.y);}
 await writeFile(only===null?'docs/validation-inspection-browser.json':`docs/validation-inspection-${only}-browser.json`,JSON.stringify({kind:'software_WebGL_gameplay_visual_validation',actual_iphone_data:false,viewport:{width:932,height:430},date:'2026-10-11',runtimeControls:{keyboard:true,pointer:true},layouts,errors,results},null,2)+'\n');
 assert.equal(errors.length,0,JSON.stringify(errors));
 for(const result of results){const b=result.bounds;assert(b.minX>-.94&&b.maxX<.94&&b.minY>-.98&&b.maxY<.94,result.name+' '+result.phase+' framing '+JSON.stringify(b));}
}finally{await browser.close();server?.kill();}
