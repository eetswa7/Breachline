// Repeatable gameplay-render review. SwiftShader is not an iPhone measurement.
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {spawn,execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const origin=process.env.WEAPON_TEST_ORIGIN??'http://127.0.0.1:4178',destination=process.env.WEAPON_TEST_OUTPUT??'docs/art-overhaul-weapon-presentation';
const scratch='work/weapon-presentation-browser',errors=[],failures=[];
await mkdir(scratch,{recursive:true});await mkdir(destination,{recursive:true});
const html=await readFile('dist/index.html','utf8'),touch=html.match(/ <section id="touch-layer"[\s\S]*?<\/section>/)[0].replace('touch-layer hidden','touch-layer');
const server=process.env.WEAPON_TEST_ORIGIN?null:spawn(process.execPath,['scripts/preview.mjs','--port','4178'],{stdio:['ignore','pipe','pipe']});
if(server)await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('preview ready'))resolve();});server.on('error',reject);server.on('exit',c=>reject(Error('Preview exited '+c)));});
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.ART_TEST_BROWSER??'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:1,serviceWorkers:'block'});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('requestfailed',r=>failures.push({url:r.url(),reason:r.failure()?.errorText}));page.on('response',r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});
 await page.route('**/__weapon-presentation',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><link rel="stylesheet" href="/style.css"><style>html,body{margin:0;overflow:hidden}canvas{display:block;width:100vw;height:100vh}#frame-label{position:fixed;top:12px;left:12px;padding:4px 7px;background:#07111bcc;color:#fff;font:11px Arial;z-index:6}#touch-layer{opacity:0;pointer-events:none}body.controls #touch-layer{opacity:1;pointer-events:auto}</style><canvas id="view"></canvas><div id="frame-label"></div>${touch}`}));
 await page.goto(origin+'/__weapon-presentation');
 await page.evaluate(async()=>{
  const [{Renderer},{Game,emptyInput},{Weapon,WEAPONS},{TouchInput},{DEFAULT_SETTINGS},presentation,{weaponPose}]=await Promise.all([import('/js/three-renderer.js'),import('/js/engine.js'),import('/js/weapons.js'),import('/js/input.js'),import('/js/save.js'),import('/js/weapon-presentation.js'),import('/js/aim.js')]);
  const game=new Game({map:14,mode:'tdm'},{seed:817}),settings={...DEFAULT_SETTINGS,quality:'high',motion:true,fov:80,layout:{}};
  game.actors=[game.player];const renderer=new Renderer(document.querySelector('canvas'),settings);renderer.setArena(game.arena);await renderer.ready;
  const input=new TouchInput(document.querySelector('canvas'),document.querySelector('#touch-layer'),settings);input.active=true;
  await renderer.prepareMatch(game);renderer.render(game,1/60);for(let i=0;i<18;i++)renderer.updateLighting(1/60);renderer.render(game,1/60);
  window.art={game,renderer,input,settings,emptyInput,Weapon,WEAPONS,weaponPose,...presentation};
 });
 const results=[];
 async function capture(name,weapon,phase=null,{motion=true,ads=0,recoil=0,controls=false}={}){
  const result=await page.evaluate(async({name,weapon,phase,motion,ads,recoil,controls})=>{
   const {game:g,renderer:r,Weapon,beginInspection,updateWeaponPresentation,weaponPose,settings}=window.art,p=g.player;
   p.weapons[0]=new Weapon(weapon,{optic:1});p.reset({x:0,y:0,z:27},0);p.ads=ads;g.time=2;settings.motion=motion;r.weaponKey='';r.cameraY=null;
   if(phase!==null){if(!beginInspection(p))throw Error('Inspection rejected '+weapon);p.inspection.time=p.inspection.duration*phase;}
   if(recoil){g.shoot(p);for(let elapsed=0;elapsed<recoil;elapsed+=1/60){updateWeaponPresentation(p,1/60);p.weapon.update(1/60);g.time+=1/60;}}
   document.body.classList.toggle('controls',controls);document.querySelector('#frame-label').textContent=name+' · '+p.weapon.def.name;
   // The camera and world lighting are fixed for this gallery. Reuse the settled
   // native lighting/shadow state while presenting each freshly built weapon.
   r.render(g,0);
   return {name,weapon,kind:p.weapon.def.kind,phase,motion,ads,recoil,pose:{...weaponPose(p,g.time,motion)},draws:r.drawCalls,triangles:r.triangles,programs:r.shaderPrograms};
  },{name,weapon,phase,motion,ads,recoil,controls});
  const path=scratch+'/'+name+'.png';await page.screenshot({path,timeout:120000});results.push({...result,path});process.stdout.write(name+'\n');
 }
 // Inspect both sides of all thirty shipped rigs, including every distinct feed
 // system. Contact sheets are retained; full-sized frames stay in work/.
 for(const side of ['receiver','underside'])for(let weapon=0;weapon<30;weapon++)await capture('weapon-'+weapon+'-'+side,weapon,side==='receiver'?.43:.79);
 for(const weapon of [0,5,7,9,10,12,19,27]){
  await capture('detail-'+weapon+'-receiver',weapon,.43);
  await capture('detail-'+weapon+'-underside',weapon,.79);
 }
 for(const weapon of [0,9,10,12,19])await capture('calm-'+weapon,weapon,.43,{motion:false});
 for(const [name,elapsed]of [['onset',1/60],['peak',3/60],['return',10/60],['settled',30/60]])await capture('recoil-'+name,0,null,{recoil:elapsed});
 await capture('aimed-recoil',0,null,{ads:1,recoil:3/60});
 await capture('touch-controls',0,null,{controls:true});
 const temporal=[];
 if(process.argv.includes('--temporal')){
  const frames=scratch+'/temporal';await mkdir(frames,{recursive:true});let index=0;
  for(const weapon of [0,10,19,12]){
   const duration=await page.evaluate(async weapon=>{
    const {game:g,renderer:r,Weapon,beginInspection,settings}=window.art,p=g.player;
    document.body.classList.remove('controls');settings.motion=true;p.weapons[0]=new Weapon(weapon,{optic:1});p.reset({x:0,y:0,z:27},0);g.time=2;r.weaponKey='';r.cameraY=null;beginInspection(p);return p.inspection.duration;
   },weapon);
   for(let frame=0;frame<=Math.ceil((duration+.35)*20);frame++){
    const pose=await page.evaluate(({frame,duration})=>{
     const {game:g,renderer:r,weaponPose}=window.art,p=g.player,time=frame/20;
     if(p.inspection)p.inspection.time=Math.min(duration,time);g.time=2+time;
     document.querySelector('#frame-label').textContent='Inspection '+time.toFixed(2)+'s · '+p.weapon.def.name;
     r.render(g,1/20);return {...weaponPose(p,g.time,true)};
    },{frame,duration});
    await page.screenshot({path:frames+'/'+String(index++).padStart(4,'0')+'.png',timeout:120000});temporal.push({weapon,time:frame/20,pose});
   }
   process.stdout.write('temporal-'+weapon+'\n');
  }
  execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-framerate','20','-i',frames+'/%04d.png','-c:v','libx264','-preset','veryfast','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',destination+'/inspection-replay.mp4']);
 }
 const inputChecks=await page.evaluate(()=>{
  const {input,game:g,emptyInput}=window.art,p=g.player;input.reset();input.active=true;p.reset({x:0,y:0,z:27},0);
  const button=document.querySelector('[data-action="inspect"]'),rect=button.getBoundingClientRect();
  const event=(type,id)=>new PointerEvent(type,{bubbles:true,pointerId:id,pointerType:'touch',clientX:rect.x+rect.width/2,clientY:rect.y+rect.height/2});
  button.dispatchEvent(event('pointerdown',71));window.dispatchEvent(event('pointerup',71));const touch=input.sample(1/60);g.update(1/60,touch);if(!p.inspection)throw Error('Touch inspect did not reach game');
  const once=!input.sample(1/60).inspect;window.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,code:'KeyI'}));const keyboard=input.sample(1/60);g.update(1/60,keyboard);if(p.inspection)throw Error('Keyboard cancel failed');
  g.update(1/60,{...emptyInput(),inspect:true});const ammo=p.weapon.ammo;g.update(1/60,{...emptyInput(),fire:true,firePressed:true});if(p.inspection||p.weapon.ammo!==ammo-1)throw Error('Firing did not preempt inspect');
  return {visibleTouchTarget:!button.hidden,touchStarts:touch.inspect,oneShot:once,keyboardCancels:keyboard.inspect,firePreempts:true};
 });
 await writeFile(scratch+'/frames.json',JSON.stringify(results,null,2)+'\n');
 // Make labelled visual-review artifacts without changing screenshot pixels.
 execFileSync('python3',['-c',`from PIL import Image,ImageDraw\nfrom pathlib import Path\nimport json\nframes=json.loads(Path('${scratch}/frames.json').read_text())\nroot=Path('${destination}')\nfor side in ['receiver','underside']:\n rows=[f for f in frames if f['name'].startswith('weapon-') and f['name'].endswith('-'+side)]\n sheet=Image.new('RGB',(5*338,6*180),(8,14,17));draw=ImageDraw.Draw(sheet)\n for i,f in enumerate(rows):\n  image=Image.open(f['path']);image.thumbnail((338,156));x=(i%5)*338;y=(i//5)*180;sheet.paste(image,(x,y));draw.text((x+7,y+158),str(f['weapon'])+' / '+f['kind'],fill=(225,235,215))\n sheet.save(root/('all-weapons-'+side+'.jpg'),quality=91)\nfor group in ['detail-','calm-','recoil-']:\n rows=[f for f in frames if f['name'].startswith(group)];columns=4 if group=='detail-' else len(rows);width=422;height=218\n sheet=Image.new('RGB',(columns*width,((len(rows)+columns-1)//columns)*height),(8,14,17));draw=ImageDraw.Draw(sheet)\n for i,f in enumerate(rows):\n  image=Image.open(f['path']);image.thumbnail((width,195));x=(i%columns)*width;y=(i//columns)*height;sheet.paste(image,(x,y));draw.text((x+7,y+197),f['name'],fill=(225,235,215))\n sheet.save(root/(group.rstrip('-')+'-sequence.jpg'),quality=94)\nfor name in ['aimed-recoil','touch-controls']:\n f=next(f for f in frames if f['name']==name);Image.open(f['path']).save(root/(name+'.png'))\n`]);
 const report={kind:'software_WebGL_weapon_presentation_validation',actual_iphone_data:false,viewport:{width:844,height:390},weaponCount:30,capturedFrames:results.length,temporalReplay:{sampleHz:20,frames:temporal.length,kind:'Encoded deterministic gameplay-render samples, not a runtime FPS measurement',samples:temporal},errors,requestFailures:failures,inputChecks,results:results.map(({path,...result})=>result),visualAcceptance:'Requires inspection of retained gameplay contact sheets; no professional-quality or physical-device performance claim.'};
 await writeFile(destination+'/validation.json',JSON.stringify(report,null,2)+'\n');
 if(errors.length||failures.length)throw Error(JSON.stringify({errors,failures}));
 process.stdout.write(JSON.stringify({frames:results.length,inputChecks,errors,failures})+'\n');
}finally{await browser?.close();server?.kill();}
