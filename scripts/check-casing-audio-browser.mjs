// Native decoding/playback and listening evidence for cases and polymer hulls.
// Desktop Chromium evidence; no subjective quality or physical-device claim.
import {createRequire} from 'node:module';
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {AUDIO_BANK} from '../dist/js/audio-files.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const output='docs/validation-casing-audio66-browser.json',preview='docs/audio-release66/casing-foley-preview',work='work/casing-audio66-browser';
await mkdir(work,{recursive:true});await mkdir('docs/audio-release66',{recursive:true});
const runtimeFiles=['dist/js/audio.js','dist/js/audio-files.js','dist/js/engine.js','dist/js/weapons.js','dist/js/casing-foley.js','dist/js/weapon-models.js','dist/js/three-renderer.js'];
const snapshot=async()=>Object.fromEntries(await Promise.all(runtimeFiles.map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')])));
const hashes=await snapshot();
const server=spawn(process.execPath,['scripts/preview.mjs','--port','4199'],{stdio:['ignore','pipe','pipe']});let browser;
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Casing preview server did not start')),15000);server.stdout.on('data',d=>{if(String(d).includes('preview ready')){clearTimeout(timer);resolve();}});server.on('error',reject);server.on('exit',code=>reject(Error('Preview server exited: '+code)));});
 browser=await chromium.launch({executablePath:process.env.ART_TEST_BROWSER??'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/__casing_audio',route=>route.fulfill({contentType:'text/html',body:'<button>Start native casing audio</button>'}));await page.goto('http://127.0.0.1:4199/__casing_audio');
 await page.evaluate(async()=>{const {AudioSystem}=await import('/js/audio.js');window.sound=new AudioSystem({volume:.8,haptics:false});document.querySelector('button').onclick=()=>sound.start();});
 await page.click('button');await page.waitForFunction(()=>sound.libraryStats||sound.libraryError,undefined,{timeout:90000});
 const result=await page.evaluate(async()=>{
  const [{AudioSystem},{Game},{Weapon},{weaponModel,animateWeaponParts}]=await Promise.all([import('/js/audio.js'),import('/js/engine.js'),import('/js/weapons.js'),import('/js/weapon-models.js')]);
  const s=window.sound;await s.libraryReady;if(s.libraryError)throw Error(s.libraryError);
  const check=(ok,message)=>{if(!ok)throw Error(message);},delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const families=['Hard','Metal','Wood','Soft','Water'],keys=families.flatMap(f=>['casing'+f,'hull'+f]);
  check(keys.every(k=>s.variations.get(k)?.filter(Boolean).length===4),'A casing/hull native take failed to decode');
  const nativeSources=[],create=s.context.createBufferSource.bind(s.context);s.context.createBufferSource=()=>{const source=create();nativeSources.push(source);return source;};
  const game={player:{x:0,y:0,z:0,yaw:0},arena:{blocks:[],visible:()=>false}};
  s.events(Array.from({length:30},(_,i)=>({type:'casing',source:0,surface:'Metal',position:{x:3,y:0,z:0},shell:i%2===0,value:1})),game);
  const admitted=nativeSources.length;check(admitted===3&&s.voices===3,'Case/hull event batch exceeded or lost its three-contact limit');
  check(nativeSources.every(source=>!s.voicePriority.get(source)),'Quiet landings consumed reserved player priority');
  check(s.variations.get('hullMetal').includes(nativeSources[0].buffer)&&s.variations.get('casingMetal').includes(nativeSources[1].buffer),'Runtime event did not select distinct decoded hull/case PCM');
  check(nativeSources.every(source=>source.playbackRate.value>=.97&&source.playbackRate.value<=1.03),'Hull is still a slowed metallic case');
  await delay(500);check(s.voices===0&&s.active.size===0,'Native casing graph retained sources after natural end');
  const farBefore=nativeSources.length;s.events([{type:'casing',source:0,surface:'Hard',position:{x:19,y:0,z:0},shell:true}],game);check(nativeSources.length===farBefore,'Casing hearing cutoff changed');
  const rate=s.context.sampleRate,clips=[],segments=[];let reelLength=0,nonfinite=0;
  const append=(buffer,metadata)=>{
   const left=buffer.getChannelData(0),right=buffer.getChannelData(Math.min(1,buffer.numberOfChannels-1)),pcm=new Float32Array(buffer.length*2);let peak=0,squares=0;
   for(let i=0;i<buffer.length;i++){const a=left[i],b=right[i];if(!Number.isFinite(a)||!Number.isFinite(b))nonfinite++;peak=Math.max(peak,Math.abs(a),Math.abs(b));squares+=a*a+b*b;pcm[i*2]=a;pcm[i*2+1]=b;}
   check(peak>.0001&&peak<1&&nonfinite===0,'Listening segment is silent, clipped or nonfinite');
   segments.push({...metadata,startSeconds:reelLength/rate,durationSeconds:buffer.duration,peak,rms:Math.sqrt(squares/(buffer.length*2))});clips.push(pcm);reelLength+=buffer.length;
  };
  // All 40 shipped material/take comparisons at equal unity gain, with no
  // rate change or normalization. This makes source distinctions reviewable.
  const gap=.35;let isolatedSeconds=0;const isolatedCues=[];
  for(const family of families)for(let take=0;take<4;take++)for(const kind of ['casing','hull']){
   const key=kind+family,buffer=s.variations.get(key)[take];isolatedCues.push({key,take,startSeconds:isolatedSeconds,durationSeconds:buffer.duration});isolatedSeconds+=buffer.duration+gap;
  }
  const isolated=new OfflineAudioContext(2,Math.ceil(isolatedSeconds*rate),rate);
  for(const cue of isolatedCues){const source=isolated.createBufferSource();source.buffer=s.variations.get(cue.key)[cue.take];source.connect(isolated.destination);source.start(cue.startSeconds);}
  append(await isolated.startRendering(),{kind:'unity_gain_case_then_hull_comparisons',normalized:false,cues:isolatedCues});
  // The remaining reel uses real gameplay shot/reload/landing events, the
  // production gains, room responses and world panners, with 350 ms preroll.
  const fixtures=[...families.map(surface=>({id:'revolver_reload_'+surface,weapon:22,surface,room:surface==='Metal'})),{id:'pump_shot_and_hull_Hard',weapon:5,surface:'Hard'},{id:'autoloading_shot_and_hull_Metal',weapon:6,surface:'Metal',room:true}];
  const surfaces={Hard:'concrete',Metal:'steel',Wood:'wood',Soft:'dirt',Water:'water'};
  for(const fixture of fixtures){
   const g=new Game({map:0},{seed:6601}),p=g.player,w=new Weapon(fixture.weapon);g.actors=[p];p.reset({x:0,y:0,z:0},0);p.weapons[0]=w;p.slot=0;p.spawnProtection=0;
   g.arena.info={...g.arena.info,groundSurface:surfaces[fixture.surface]};g.arena.visualFloorCells=null;g.arena.blocks=[];
   if(fixture.room)g.arena.blocks.push({x:0,y:3,z:0,w:8,h:.2,d:8,roof:true,surface:'concrete'});
   g.arena.bakeCollision();g.events.length=0;
   const generated=[];
   if(fixture.weapon===22){for(let i=0;i<3;i++){w.cooldown=0;check(g.shoot(p),'Revolver source shot failed');}g.events.length=0;check(w.spentCases===3&&g.casings.length===0&&w.reload(),'Revolver retention/reload failed');}
   else{check(g.shoot(p),'Shotgun source shot failed');generated.push(...g.events);g.events.length=0;}
   const originalAmmo=w.ammo,originalReserve=w.reserve,step=1/120,duration=fixture.weapon===22?w.reloadTime+.6:1.8;let cylinderAtDump;
   while(g.time<duration){g.update(Math.min(step,duration-g.time));for(const event of g.events){generated.push(event);if(event.type==='casingDump'){const parts=weaponModel(w);animateWeaponParts(parts,w,p,g.time);const q=parts[parts.reloadRig.cylinder.anchor];cylinderAtDump={x:q.x,baseX:q.baseX,fullyOpen:Math.abs(q.x-(q.baseX-.09))<1e-8,ammo:w.ammo,reserve:w.reserve};}}g.events.length=0;}
   const landings=generated.filter(e=>e.type==='casing'),dumps=generated.filter(e=>e.type==='casingDump');
   check(landings.length===(fixture.weapon===22?3:1)&&landings.every(e=>e.surface===fixture.surface),'Actual landings selected wrong count/surface: '+fixture.id);
   if(fixture.weapon===22){check(dumps.length===1&&dumps[0].count===3&&cylinderAtDump.fullyOpen,'Revolver extraction did not follow fully opened cylinder');check(cylinderAtDump.ammo===originalAmmo&&cylinderAtDump.reserve===originalReserve,'Extraction changed ammo/refill timing');check(landings.every(e=>e.time>dumps[0].time),'Revolver sound preceded ground contact');check(w.ammo===w.capacity&&w.reserve===originalReserve-3,'Revolver reload lost ammo');}
   const preroll=.35,offline=new OfflineAudioContext(2,Math.ceil((duration+preroll+.6)*rate),rate);let scheduled=0;
   const proxy=new Proxy(offline,{get(target,key){if(key==='state')return 'running';if(key==='currentTime')return scheduled;if(key==='createBufferSource')return()=>{const source=target.createBufferSource(),start=source.start.bind(source);source.start=(at=0,...args)=>start(scheduled+at,...args);return source;};const value=target[key];return typeof value==='function'?value.bind(target):value;}});
   const audio=new AudioSystem({volume:.8,haptics:false});audio.context=proxy;audio.master=offline.createGain();audio.master.connect(offline.destination);audio.buffers=s.buffers;audio.variations=new Map([...s.variations].map(([key,takes])=>[key,[takes[0]]]));audio.makeRoom();
   audio.events([],g);const played=[],play=audio.play.bind(audio);audio.play=(key,options)=>{played.push({key,time:scheduled,...options});return play(key,options);};
   const batches=new Map();for(const event of generated){const batch=batches.get(event.time)??[];batch.push(event);batches.set(event.time,batch);}
   for(const [time,events]of batches){scheduled=preroll+time;audio.events(events,g);}
   check(played.filter(e=>e.key===(fixture.weapon===22?'casing':'hull')+fixture.surface).length===landings.length,'Landing events failed actual playback');
   const rendered=await offline.startRendering();check(audio.voices===0&&audio.active.size===0,'Offline native graph failed natural cleanup');
   append(rendered,{kind:'actual_gameplay_events',...fixture,masterGain:.8,normalized:false,prerollSeconds:preroll,cylinderAtDump,events:generated.filter(e=>['shot','weaponFoley','casingDump','casing'].includes(e.type)),playback:played.map(({key,time,volume,rate,important,indoor})=>({key,time,volume,rate,important:!!important,indoor}))});
  }
  const pcm=new Float32Array(reelLength*2);let offset=0;for(const clip of clips){pcm.set(clip,offset);offset+=clip.length;}
  const bytes=new Uint8Array(pcm.buffer);let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
  s.pause();return {kind:'desktop_browser_casing_audio_validation',actual_iphone_data:false,subjective_listening_review:false,library:s.libraryStats,sampleRate:rate,keys,nativePlayback:{batchAdmitted:admitted,quietVoicesRemainAmbient:true,separateDecodedHullBuffers:true,normalPlaybackRate:true,hearingCutoffMetres:18,naturalCleanup:true,remainingVoices:s.voices,remainingSources:s.active.size},nativeOffline:{nonfiniteSamples:nonfinite,isolatedTakes:isolatedCues.length,gameplayFixtures:fixtures.length,naturalCleanup:true},listeningPreview:{sampleRate:rate,channels:2,durationSeconds:reelLength/rate,segments},pcmBase64:btoa(binary)};
 });
 assert.equal(errors.length,0,errors.join('\n'));assert.equal(result.library.recordings,Object.values(AUDIO_BANK.sounds).flat().length);assert(result.library.decodedBytes<40*1024*1024);assert.deepEqual(await snapshot(),hashes,'Runtime changed while capturing audio evidence');
 const pcm=Buffer.from(result.pcmBase64,'base64');delete result.pcmBase64;await writeFile(work+'/preview.f32',pcm);
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','f32le','-ar',String(result.sampleRate),'-ac','2','-i',work+'/preview.f32','-c:a','aac','-b:a','192k','-movflags','+faststart',preview+'.m4a']);
 const modifiedFiles=execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);result.provenance={sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceDirty:modifiedFiles.length>0,modifiedFiles,runtimeFiles:hashes,browser:browser.version(),capturedAt:new Date().toISOString()};result.listeningPreview.file=preview+'.m4a';
 await writeFile(preview+'.json',JSON.stringify({...result.provenance,...result.listeningPreview,actual_iphone_data:false,subjective_listening_review:false,description:'Forty exact decoded AAC takes at unity gain (case then hull), followed by five actual revolver reload timelines and pump/autoloading shotgun shots with actual landings. Runtime sections use production gains, native Web Audio world panners and shared room responses. No normalization. Generated listening evidence has not been subjectively reviewed.'},null,2)+'\n');
 await writeFile(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({output,library:result.library,nativePlayback:result.nativePlayback,nativeOffline:result.nativeOffline,preview:preview+'.m4a',durationSeconds:result.listeningPreview.durationSeconds}));
}finally{await browser?.close();server.kill();}
