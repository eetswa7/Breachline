// Software WebGL checks shader coverage and state restoration. It cannot
// establish the cause or removal of a physical iPhone compilation stall.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const origin=process.env.ART_TEST_ORIGIN??'http://127.0.0.1:4184';
const server=process.env.ART_TEST_ORIGIN?null:spawn(process.execPath,['scripts/preview.mjs','--port','4184'],{stdio:['ignore','pipe','pipe']});
if(server)await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('preview ready'))resolve();});server.on('error',reject);});
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.ART_TEST_BROWSER??'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:844,height:390},serviceWorkers:'block'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());else if(m.type()==='info')console.log(m.text());});
 await page.route('**/__warmup',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><style>html,body{margin:0}canvas{width:844px;height:390px}</style><canvas></canvas>'}));
 await page.goto(origin+'/__warmup');
 const results=await page.evaluate(async()=>{
  const [{Renderer},{Game}]=await Promise.all([import('/js/three-renderer.js'),import('/js/engine.js')]);
  const results=[];let renderer;
  for(const map of [14,15]){
   const game=new Game({map,mode:'tdm',loadout:{primary:16,secondary:22}},{seed:817});
   if(!renderer){renderer=new Renderer(document.querySelector('canvas'),{quality:'medium',motion:false,fov:80,frameRate:60});renderer.setArena(game.arena);await renderer.ready;}
   else renderer.setArena(game.arena);
   console.info('Warmup assets ready: '+game.arena.info.name);
   let shadowDraws=0,maxGroup=0,loadingDraws=0,otherLoadingDraws=0,compileGroups=0;
   const originalDraw=renderer.renderer.renderBufferDirect.bind(renderer.renderer),originalCompile=renderer.renderer.compileAsync.bind(renderer.renderer),originalRender=renderer.renderer.render.bind(renderer.renderer);
   renderer.renderer.renderBufferDirect=(camera,scene,geometry,material,...args)=>{if(material.isMeshDepthMaterial)shadowDraws++;return originalDraw(camera,scene,geometry,material,...args);};
   renderer.renderer.compileAsync=(objects,...args)=>{maxGroup=Math.max(maxGroup,objects.children.length);if(++compileGroups%20===0)console.info('Warmup compile groups: '+game.arena.info.name+' '+compileGroups);return originalCompile(objects,...args);};
   renderer.renderer.render=(...args)=>{if(args[0]===renderer.scene||args[0]===renderer.weaponScene)loadingDraws++;else otherLoadingDraws++;return originalRender(...args);};
   const p=game.player,time=game.time,ammo=p.weapons.map(w=>w.ammo),slot=p.slot;
   const start=performance.now();await renderer.prepareMatch(game);const loadingMs=performance.now()-start;
   const warmPrograms=renderer.renderer.info.programs.length,warmShadowDraws=shadowDraws;console.info('Warmup complete: '+game.arena.info.name+' '+warmPrograms+' programs');
   const stateRestored=time===game.time&&JSON.stringify(ammo)===JSON.stringify(p.weapons.map(w=>w.ammo))&&slot===p.slot&&!renderer.renderer.getScissorTest()&&renderer.scene.children.every(o=>!o.isGroup||o===renderer.world);
   renderer.renderer.render=originalRender;renderer.renderer.compileAsync=originalCompile;
   const transitions=[];
   for(const view of [{name:'spawn',x:0,z:27},{name:'interior',x:0,z:9},{name:'near-operator',x:0,z:27,near:true},{name:'distant-operator',x:0,z:27,far:true},{name:'first-shot',x:0,z:27,shot:true},{name:'secondary',x:0,z:27,slot:1,shot:true},{name:'adaptive-low',x:0,z:27,quality:'low'},{name:'restore-medium',x:0,z:27,quality:'medium'}]){
    Object.assign(p,{x:view.x,y:0,z:view.z,yaw:0,pitch:0,slot:view.slot??0});
    if(view.quality)renderer.quality=view.quality;
    const actor=game.actors.find(a=>a.id!==p.id);if(view.near||view.far)Object.assign(actor,{x:1,y:0,z:p.z-(view.far?44:4),yaw:Math.PI});
    if(view.shot)p.weapon.sinceShot=.018;
    renderer.cameraY=null;renderer.sceneLOD.clock=0;renderer.blenderAssets.lodClock=0;renderer.shadowClock=1;
    const before=renderer.renderer.info.programs.length;renderer.render(game,1/60,false);
    transitions.push({name:view.name,before,after:renderer.renderer.info.programs.length,newPrograms:renderer.renderer.info.programs.length-before});console.info('Warmup transition: '+game.arena.info.name+' '+JSON.stringify(transitions.at(-1)));
   }
   results.push({map:game.arena.info.name,loadingMs,warmPrograms,maxGroup,loadingDraws,otherLoadingDraws,shadowDraws:warmShadowDraws,stateRestored,warmup:renderer.matchWarmup,transitions});renderer.renderer.renderBufferDirect=originalDraw;
  }
  renderer.dispose();
  return results;
 });
 const {BENCHMARK_BUILD:build}=await import('../dist/js/benchmark-build.js');
 await mkdir('test-results',{recursive:true});await writeFile('test-results/render-warmup-browser.json',JSON.stringify({kind:'software_WebGL_shader_warmup_validation',actual_iphone_data:false,timing_scope:'software_loading_stage_under_shared_host_load',build,errors,results},null,2)+'\n');
 if(errors.length)throw Error(errors.join('\n'));
 if(results.some(r=>!r.stateRestored||r.maxGroup>8||!r.shadowDraws||r.loadingDraws!==r.warmup.batches||r.warmup.yields!==r.warmup.batches||r.transitions.some(t=>t.newPrograms)))throw Error('Warmup must cover main/depth variants and restore loading state: '+JSON.stringify(results));
 console.log(JSON.stringify(results));
}finally{await browser?.close();server?.kill();}
