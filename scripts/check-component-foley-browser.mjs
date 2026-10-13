// Release 64 component contacts through native Chromium decoding and playback.
// This is desktop evidence, not a subjective listening or physical-device review.
import {createRequire} from 'node:module';
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {AUDIO_BANK} from '../dist/js/audio-files.js';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const output='docs/validation-component-foley64-browser.json';
const preview='docs/art-release64/component-foley-preview';
const work='work/component-foley64-browser';
await mkdir(work,{recursive:true});await mkdir('docs/art-release64',{recursive:true});
const runtimeFiles=['boot.js','audio.js','spatial-audio.js','audio-library.js','audio-files.js','weapons.js','engine.js','weapon-models.js','casing-foley.js','math.js'];
async function snapshot(){
 const files={};for(const name of runtimeFiles){
  const file='dist/js/'+name;
  try{files[file]=createHash('sha256').update(await readFile(file)).digest('hex');}
  catch(error){if(name!=='spatial-audio.js'||error.code!=='ENOENT')throw error;}
 }
 return files;
}
const runtimeHashes=await snapshot();
const boot=await readFile('dist/js/boot.js','utf8'),runtimeRelease=boot.match(/const RELEASE=['"](\d+)['"]/)?.[1];
assert(runtimeRelease,'Cannot identify the running release from boot.js');
const server=spawn(process.execPath,['scripts/preview.mjs','--port','4197'],{stdio:['ignore','pipe','pipe']});
let browser;
try{
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Component audio preview server did not start')),15000);
  server.stdout.on('data',d=>{if(String(d).includes('preview ready')){clearTimeout(timer);resolve();}});
  server.on('error',reject);server.on('exit',code=>reject(Error('Preview server exited: '+code)));
 });
 browser=await chromium.launch({executablePath:process.env.ART_TEST_BROWSER,headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/__component_audio',route=>route.fulfill({contentType:'text/html',body:'<button>Start native component audio</button>'}));
 await page.goto('http://127.0.0.1:4197/__component_audio');
 await page.evaluate(async()=>{
  const {AudioSystem}=await import('/js/audio.js');
  window.sound=new AudioSystem({volume:.8,haptics:false});document.querySelector('button').onclick=()=>sound.start();
 });
 await page.click('button');await page.waitForFunction(()=>sound.libraryStats||sound.libraryError,undefined,{timeout:90000});
 const result=await page.evaluate(async()=>{
  const [{Weapon,WEAPONS},{Game,emptyInput},{AudioSystem}]=await Promise.all([import('/js/weapons.js'),import('/js/engine.js'),import('/js/audio.js')]);
  const s=window.sound;await s.libraryReady;if(s.libraryError)throw Error(s.libraryError);
  const check=(ok,message)=>{if(!ok)throw Error(message);};
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const step=1/120;
  const makeGame=(id,empty)=>{
   const g=new Game({map:0},{seed:6401}),p=g.player;g.actors=[p];p.weapons[0]=new Weapon(id);p.slot=0;
   p.weapon.ammo=empty?0:p.weapon.capacity-1;g.events.length=0;return g;
  };
  const generate=(id,empty)=>{
   const g=makeGame(id,empty),w=g.player.weapon,events=[];g.update(step,{...emptyInput(),reload:true});g.events.length=0;
   let elapsed=0;
   while(w.reloadLeft>0&&elapsed<40){
    g.update(step);elapsed+=step;
    for(const e of g.events)if(e.type==='weaponFoley')events.push({...e,emittedSeconds:elapsed});
    g.events.length=0;
   }
   check(!w.reloadLeft,'Reload never completed: '+id);
   const direct=new Weapon(id);direct.ammo=empty?0:direct.capacity-1;check(direct.reload(),'Direct reload did not start: '+id);
   const predicted=[];while(direct.reloadLeft>0)direct.update(step,e=>predicted.push(e));
   const signature=e=>[e.phase,e.cue,e.component,e.cycle,e.empty].join('/');
   check(events.map(signature).join('|')===predicted.map(signature).join('|'),'Game and Weapon timeline disagree: '+id);
   check(w.ammo===w.capacity,'Engine reload lost ammunition: '+id);
   return {weapon:id,name:w.def.name,empty,reloadTime:w.reloadTime,durationSeconds:elapsed,events,game:g};
  };
  const cases=WEAPONS.filter(w=>w.kind!=='MELEE').flatMap(w=>[generate(w.id,true),generate(w.id,false)]);
  const decodedBuffers=new Set([...s.variations.values()].flat().filter(Boolean));
  let prewarmedBuffers=0;for(const [key,takes] of s.variations)if(/^(reload|rack)\d+$/.test(key))for(const buffer of takes){check(s.regionStarts.get(buffer)?.size>=2,'Native foley was not prewarmed: '+key);prewarmedBuffers++;}
  const sources=[],create=s.context.createBufferSource.bind(s.context);let played;
  const originalPlay=s.play.bind(s);s.play=(key,options)=>{played={key,...options};return originalPlay(key,options);};
  s.context.createBufferSource=()=>{
   const source=create(),start=source.start.bind(source);source.qaStart=[];
   source.start=(...args)=>{source.qaStart=args;start(...args);};sources.push(source);return source;
  };
  const regions=new Map();let emitted=0;
  const inspect=(source,e)=>{
   const buffer=source.buffer,[at=0,offset=0,duration=buffer.duration]=source.qaStart;
   check(at===0&&offset>=0&&duration>0&&offset+duration<=buffer.duration+.000001,'Invalid native region: '+e.weapon+'/'+e.cue);
   check(decodedBuffers.has(buffer),'Component allocated a decoded PCM copy');
   const untrimmedOffset=played.region?played.region[0]*buffer.duration:0;
   check(Math.abs(offset+duration-(played.region?played.region[1]*buffer.duration:buffer.duration))<.000001,'Onset trim removed an authored contact tail');
   const data=buffer.getChannelData(0),first=Math.floor(offset*buffer.sampleRate),last=Math.min(data.length,Math.ceil((offset+duration)*buffer.sampleRate));
   let peak=0,squares=0,onset=-1;
   for(let i=first;i<last;i++){const sample=data[i];check(Number.isFinite(sample),'Nonfinite decoded component');peak=Math.max(peak,Math.abs(sample));squares+=sample*sample;if(onset<0&&Math.abs(sample)>.0001)onset=i;}
   check(peak>.0001,'Silent native component region: '+e.weapon+'/'+e.cue);
   const firstAudibleDelayMs=(onset-first)/buffer.sampleRate*1000;
   check(firstAudibleDelayMs<=3,'Native component onset exceeds three milliseconds: '+e.weapon+'/'+e.cue);
   return {key:played.key,offsetSeconds:offset,durationSeconds:duration,untrimmedOffsetSeconds:untrimmedOffset,trimmedLeadingSilenceMs:(offset-untrimmedOffset)*1000,decodedPeak:peak,decodedRms:Math.sqrt(squares/(last-first)),firstAudibleDelayMs};
  };
  for(const c of cases){
   const playback=[];
   for(const e of c.events){
    const before=sources.length;s.events([e],c.game);check(sources.length===before+1,'Component did not reach native playback: '+c.weapon+'/'+e.cue);
    const source=sources.at(-1),metric=inspect(source,e);
    check(s.voiceGroup.get(source)==='foley:0:'+c.weapon,'Component source missing cancellation group');
    check(s.voicePriority.get(source),'Local component lost voice priority');
    const key=c.weapon+'/'+e.cue+'/'+e.component;
    if(!regions.has(key))regions.set(key,{weapon:c.weapon,cue:e.cue,component:e.component,...metric});
    playback.push({cue:e.cue,component:e.component,phase:e.phase,cycle:e.cycle,emittedSeconds:e.emittedSeconds});emitted++;
    s.stopFoley(0,c.weapon);check(s.voices===0&&s.active.size===0,'Immediate cancellation retained component source');
   }
   c.playback=playback;
  }
  // Natural completion must clean native nodes without invoking cancellation.
  const local=cases[0].events.find(e=>e.cue==='seat');s.events([local],cases[0].game);
  check(s.voices===1,'Natural cleanup contact did not start');await delay(400);
  check(s.voices===0&&s.active.size===0,'Natural native component retained its nodes');
  // A source/weapon cancellation must leave another actor and the gunshot alive.
  const own={...cases[0].events[0]},listener=cases[0].game.player;
  const remote={...own,source:2,position:{x:listener.x+2,y:listener.y+1.5,z:listener.z}};
  s.events([own,remote],cases[0].game);s.play('shot0',{important:true});
  check(s.voices===3,'Cancellation fixture did not start all sources');s.events([{type:'weaponFoleyCancel',source:0,weapon:0}],cases[0].game);
  check(s.voices===2,'Cancellation stopped unrelated actor or gunshot');s.events([{type:'round'}],cases[0].game);
  check(s.voices===1,'Round reset failed to remove all remaining foley');await delay(1200);check(s.voices===0&&s.active.size===0,'Cancellation fixture retained native nodes');
  // Pause freezes simulation cues, kills playing sources and can safely resume.
  const paused=makeGame(0,true);paused.player.weapon.reload();paused.update(.033);paused.paused=true;
  const left=paused.player.weapon.reloadLeft;for(let i=0;i<120;i++)paused.update(step);
  check(paused.player.weapon.reloadLeft===left&&!paused.events.some(e=>e.type==='weaponFoley'),'Pause advanced the simulation timeline');
  s.events([own,remote],cases[0].game);s.pause();await delay(100);
  const pauseState=s.context.state,pauseVoices=s.voices,pauseSources=s.active.size;
  await s.start();await delay(100);check(s.voices===0&&s.active.size===0,'Pause/resume retained stopped sources');
  check(pauseState==='suspended'&&pauseVoices===0&&pauseSources===0,'Pause failed to suspend and clear live native sources');
  // Interrupt a shell reload with a real shot and swap a magazine reload.
  const shell=makeGame(5,false);shell.player.weapon.reload();for(let i=0;i<12;i++)shell.update(step);shell.events.length=0;
  check(shell.shoot(shell.player),'Shell firing did not interrupt reload');check(shell.events.some(e=>e.type==='weaponFoleyCancel'),'Shell firing omitted cancellation');
  shell.events.length=0;for(let i=0;i<120;i++)shell.update(step);check(!shell.events.some(e=>e.type==='weaponFoley'),'Interrupted shell emitted later cues');
  const swap=makeGame(0,true);swap.player.weapon.reload();for(let i=0;i<30;i++)swap.update(step);swap.events.length=0;
  swap.update(step,{...emptyInput(),swap:true});check(swap.events.some(e=>e.type==='weaponFoleyCancel'),'Swap omitted cancellation');
  swap.events.length=0;for(let i=0;i<400;i++)swap.update(step);check(!swap.events.some(e=>e.type==='weaponFoley'),'Swapped weapon emitted later cues');
  // Render representative dry player reloads with the same decoded bank,
  // clip regions, levels and edge ramps. No loudness normalization is applied.
  const selected=[[0,true],[0,false],[4,true],[5,true],[9,true],[10,true],[20,true],[22,true],[27,true]];
  const reelCases=selected.map(([id,empty])=>cases.find(c=>c.weapon===id&&c.empty===empty));
  let length=0;const segments=reelCases.map(c=>{const segment={weapon:c.weapon,name:c.name,empty:c.empty,startSeconds:length,durationSeconds:c.durationSeconds};length+=c.durationSeconds+.65;return segment;});
  const rate=s.context.sampleRate,offline=new OfflineAudioContext(1,Math.ceil((length+.4)*rate),rate);let scheduled=0;
  const offlineProxy=new Proxy(offline,{get(target,key){
   if(key==='state')return 'running';if(key==='currentTime')return scheduled;
   if(key==='createBufferSource')return()=>{const source=target.createBufferSource(),start=source.start.bind(source);source.start=(at=0,...args)=>start(scheduled+at,...args);return source;};
   const value=target[key];return typeof value==='function'?value.bind(target):value;
  }});
  for(let i=0;i<reelCases.length;i++){
   const c=reelCases[i],audio=new AudioSystem({volume:.8,haptics:false});audio.context=offlineProxy;audio.buffers=s.buffers;audio.variations=s.variations;audio.master=offline.createGain();audio.master.connect(offline.destination);
   const game={player:{x:0,y:0,z:0,yaw:0},arena:{indoors:()=>false,nearby:()=>[]}};
   for(const e of c.events){scheduled=segments[i].startSeconds+e.emittedSeconds;audio.events([{...e,position:{x:0,y:1.55,z:0}}],game);}
   segments[i].cues=c.playback;
  }
  const rendered=await offline.startRendering(),samples=rendered.getChannelData(0);let renderPeak=0,renderSquares=0;
  for(const sample of samples){check(Number.isFinite(sample),'Nonfinite listening reel');renderPeak=Math.max(renderPeak,Math.abs(sample));renderSquares+=sample*sample;}
  check(renderPeak>.001&&renderPeak<=1,'Listening reel missing contacts or clipped');
  const bytes=new Uint8Array(samples.buffer);let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
  const out={kind:'desktop_browser_component_foley_validation',actual_iphone_data:false,subjective_listening_review:false,...s.libraryStats,sampleRate:rate,reloadCases:cases.length,generatedComponentEvents:emitted,nativeRegions:[...regions.values()],maxNativeFirstAudibleDelayMs:Math.max(...[...regions.values()].map(r=>r.firstAudibleDelayMs)),prewarmedFoleyBuffers:prewarmedBuffers,originalContactTailsPreserved:true,sharedDecodedBuffers:true,timelines:cases.map(({game,events,playback,...c})=>({...c,cues:playback})),naturalCleanup:true,matchingGroupCancellation:true,roundGroupCancellation:true,simulationPauseFreezesTimeline:true,pauseCleanup:{contextState:pauseState,remainingVoices:pauseVoices,remainingSources:pauseSources},shellShotCancellation:true,weaponSwapCancellation:true,remainingVoices:s.voices,remainingSources:s.active.size,listeningPreview:{kind:'isolated_native_component_timeline_reel',sampleRate:rate,durationSeconds:rendered.duration,decodedPeak:renderPeak,decodedRms:Math.sqrt(renderSquares/samples.length),dryLocalPlayer:true,normalized:false,segments},pcmBase64:btoa(binary)};
  s.pause();return out;
 });
 assert.equal(errors.length,0,errors.join('\n'));
 assert.equal(result.recordings,Object.values(AUDIO_BANK.sounds).reduce((n,takes)=>n+takes.length,0));
 assert.equal(result.reloadCases,58);assert(result.generatedComponentEvents>300);assert.equal(result.remainingVoices,0);assert.equal(result.remainingSources,0);
 const pcm=Buffer.from(result.pcmBase64,'base64');delete result.pcmBase64;
 await writeFile(work+'/preview.f32',pcm);
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','f32le','-ar',String(result.sampleRate),'-ac','1','-i',work+'/preview.f32','-c:a','aac','-b:a','160k','-movflags','+faststart',preview+'.m4a']);
 assert.deepEqual(await snapshot(),runtimeHashes,'Runtime files changed while capturing audio; rerun against a stable checkpoint');
 const provenance={runtimeRelease,sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),runtimeWorkingTreeDirty:Boolean(execFileSync('git',['status','--porcelain','--','dist/js'],{encoding:'utf8'}).trim()),runtimeHashes,browser:browser.version(),capturedAt:new Date().toISOString()};
 await writeFile(preview+'.json',JSON.stringify({...provenance,...result.listeningPreview,actual_iphone_data:false,subjective_listening_review:false,description:'Representative empty/tactical component timelines from real Weapon/Game reload events. Exact shipped native-decoded clips use gameplay regions, gains and edge ramps. Dry isolated local-player playback, without combat masking or loudness normalization.'},null,2)+'\n');
 result.runtimeRelease=runtimeRelease;result.listeningPreview.file=preview+'.m4a';result.provenance=provenance;await writeFile(output,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({output,runtimeRelease,reloadCases:result.reloadCases,componentEvents:result.generatedComponentEvents,nativeRegions:result.nativeRegions.length,pauseCleanup:result.pauseCleanup,preview:preview+'.m4a',previewSeconds:result.listeningPreview.durationSeconds,decodedBytes:result.decodedBytes}));
}finally{await browser?.close();server.kill();}
