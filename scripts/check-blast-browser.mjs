// Temporal shipped-renderer evidence; software WebGL is not iPhone performance.
import {createRequire} from 'node:module';
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const server=spawn(process.execPath,['scripts/preview.mjs','--port','4192'],{stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('preview ready'))resolve();});server.on('error',reject);});
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.ART_TEST_BROWSER,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:600},serviceWorkers:'block'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.route('**/__blast',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><style>body{margin:0}canvas{display:block;width:100vw;height:100vh}</style><canvas></canvas>'}));
 await page.goto('http://127.0.0.1:4192/__blast');
 await page.evaluate(async()=>{
  const [{Renderer},{Game}]=await Promise.all([import('/js/three-renderer.js'),import('/js/engine.js')]);
  const game=new Game({map:14,mode:'tdm'},{seed:817}),renderer=new Renderer(document.querySelector('canvas'),{quality:'high',motion:false,fov:80,frameRate:60});
  Object.assign(game.player,{x:0,y:0,z:27,yaw:0,pitch:-.07});game.time=2;
  renderer.setArena(game.arena);await renderer.ready;await renderer.prepareMatch(game);renderer.render(game,1/60);
  window.blast={game,renderer,previous:0};
  renderer.events([{type:'explosion',position:{x:0,y:.12,z:20},value:8}],game);
 });
 await mkdir('docs/art-release61',{recursive:true});const frames=[];
 for(const time of [.016,.08,.18,.32,.5,1.7]){
  const sample=await page.evaluate(time=>{const {game,renderer}=blast,dt=time-blast.previous;blast.previous=time;game.time=2+time;renderer.render(game,dt);return {time,particles:renderer.fxMesh.geometry.instanceCount,fronts:renderer.effects.filter(e=>e.kind===8&&e.life>0).length,draws:renderer.drawCalls,triangles:renderer.triangles};},time);
  const file='blast-'+String(Math.round(time*1000)).padStart(4,'0')+'.webp';
  await page.screenshot({path:'docs/art-release61/'+file,type:'webp',quality:86,timeout:120000});frames.push({...sample,file});
 }
 if(errors.length)throw Error(errors.join('\n'));
 if(frames[0].fronts!==1||frames.at(-1).fronts!==0)throw Error('Blast front did not play and expire');
 const result={kind:'software_WebGL_temporal_blast_validation',actual_iphone_data:false,source_commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),distribution_dirty:!!execFileSync('git',['status','--porcelain','--','dist'],{encoding:'utf8'}).trim(),errors,frames};
 await writeFile('docs/validation-release61-blast-browser.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser?.close();server.kill();}
