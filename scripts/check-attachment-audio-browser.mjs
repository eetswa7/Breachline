// Native AAC contacts and actual magazine reload timelines. This is desktop
// evidence and a listening artifact, never a physical latency/quality claim.
import {createRequire} from 'node:module';
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {AUDIO_BANK} from '../dist/js/audio-files.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const argument=(flag,fallback)=>{const i=process.argv.indexOf(flag);if(i<0)return fallback;const value=process.argv[i+1];if(!value||value.startsWith('--'))throw Error(flag+' requires a value');return value;};
const output=argument('--output','work/attachment-audio67-browser/validation.json'),preview=argument('--preview','work/attachment-audio67-browser/magazine-contacts'),work='work/attachment-audio67-browser',sampleRate=Number(argument('--sample-rate','48000'));
assert([44100,48000].includes(sampleRate));await mkdir(work,{recursive:true});await mkdir(dirname(output),{recursive:true});await mkdir(dirname(preview),{recursive:true});
const runtimeFiles=['dist/js/audio.js','dist/js/attachment-audio.js','dist/js/audio-files.js','dist/js/engine.js','dist/js/weapons.js','dist/js/weapon-models.js','authoring/audio/attachment-foley.json','authoring/audio/attachment_foley.py'];
const snapshot=async()=>Object.fromEntries(await Promise.all(runtimeFiles.map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')]))),hashes=await snapshot();
const server=spawn(process.execPath,['scripts/preview.mjs','--port','4197'],{stdio:['ignore','pipe','pipe']});let browser;
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Attachment preview server did not start')),15000);server.stdout.on('data',d=>{if(String(d).includes('preview ready')){clearTimeout(timer);resolve();}});server.on('error',reject);server.on('exit',code=>reject(Error('Preview server exited: '+code)));});
 browser=await chromium.launch({executablePath:process.env.ART_TEST_BROWSER??'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/__attachment_audio',route=>route.fulfill({contentType:'text/html',body:'<button>Start native attachment audio</button>'}));await page.goto('http://127.0.0.1:4197/__attachment_audio');
 await page.evaluate(async sampleRate=>{const Native=window.AudioContext;window.AudioContext=class extends Native{constructor(options){super({...options,sampleRate});}};const {AudioSystem}=await import('/js/audio.js');window.sound=new AudioSystem({volume:.8,haptics:false});document.querySelector('button').onclick=()=>sound.start();},sampleRate);
 await page.click('button');await page.waitForFunction(()=>sound.libraryStats||sound.libraryError,undefined,{timeout:90000});
 const result=await page.evaluate(async()=>{
  const [{AudioSystem},{Game},{Weapon},{attachmentFoleyCue,ATTACHMENT_FOLEY_FAMILIES,ATTACHMENT_FOLEY_ACTIONS}]=await Promise.all([import('/js/audio.js'),import('/js/engine.js'),import('/js/weapons.js'),import('/js/attachment-audio.js')]);
  const s=window.sound;await s.libraryReady;if(s.libraryError)throw Error(s.libraryError);
  const check=(ok,message)=>{if(!ok)throw Error(message);},delay=ms=>new Promise(resolve=>setTimeout(resolve,ms)),rate=s.context.sampleRate;
  const keys=ATTACHMENT_FOLEY_FAMILIES.flatMap(f=>ATTACHMENT_FOLEY_ACTIONS.map(a=>'attachment'+f+a));let attachmentDecodedBytes=0,peak=0,nonfinite=0;
  const takes=[];for(const key of keys){const buffers=s.variations.get(key)?.filter(Boolean);check(buffers?.length===2,'Missing attachment decoded takes: '+key);
   for(let take=0;take<buffers.length;take++){const b=buffers[take],data=b.getChannelData(0);attachmentDecodedBytes+=b.length*b.numberOfChannels*4;let takePeak=0,squares=0,first=-1;
    for(let i=0;i<data.length;i++){const value=data[i];if(!Number.isFinite(value))nonfinite++;takePeak=Math.max(takePeak,Math.abs(value));squares+=value*value;if(first<0&&Math.abs(value)>.0001)first=i;}
    check(first>=0&&takePeak>.001&&takePeak<1,'Silent or clipped attachment recording: '+key);peak=Math.max(peak,takePeak);takes.push({key,take,frames:b.length,durationSeconds:b.duration,peak:takePeak,rms:Math.sqrt(squares/data.length),firstAudibleSeconds:first/rate});
   }
  }
  check(nonfinite===0&&s.libraryStats.decodedBytes<40*1024*1024,'Native attachment library exceeded finite PCM/memory allowance');
  const nativeSources=[],create=s.context.createBufferSource.bind(s.context);s.context.createBufferSource=()=>{const source=create();nativeSources.push(source);return source;};
  const game={player:{x:0,y:0,z:0,yaw:0},arena:{visible:()=>false,blocks:[]}},remote={type:'weaponFoley',weapon:0,magazine:3,handling:0,cue:'seat',component:'magazine',source:2,position:{x:9,y:1.5,z:0}};
  s.events([...Array.from({length:30},()=>remote),{...remote,source:0}],game);
  check(nativeSources.length===4&&s.voices===4,'Attachment replacement doubled voices or lost batch/player reserve');
  check(nativeSources.every(source=>s.variations.get('attachmentDrumSeat').includes(source.buffer)),'Native events used stock magazine PCM');
  check(nativeSources.slice(0,3).every(source=>!s.voicePriority.get(source))&&s.voicePriority.get(nativeSources[3]),'Local attachment lost player priority');
  s.events([{type:'weaponFoleyCancel',source:0,weapon:0}],game);check(s.voices===3,'Local cancellation affected remote contacts or retained local source');
  const farBefore=nativeSources.length;s.events([{...remote,position:{x:19,y:0,z:0}}],game);check(nativeSources.length===farBefore,'Attachment hearing cutoff changed');
  await delay(350);check(s.voices===0&&s.active.size===0,'Native attachment sources retained after natural end');
  // Match the existing shared 24-source cap and replacement policy with new
  // magazine keys; no additional graph or voice pool is allocated.
  for(let i=0;i<16;i++)s.play('attachmentDrumMove');for(let i=0;i<9;i++)s.play('attachmentFastSeat',{important:true});
  const peakVoices=s.voices;check(peakVoices===24&&s.active.size===24,'Attachment voices bypassed the 24-source cap');s.pause();check(s.voices===0&&s.active.size===0,'Pause retained attachment voices');
  const clips=[],segments=[];let reelLength=0;
  const append=(buffer,metadata)=>{const left=buffer.getChannelData(0),right=buffer.getChannelData(Math.min(1,buffer.numberOfChannels-1)),pcm=new Float32Array(buffer.length*2);let segmentPeak=0,squares=0;
   for(let i=0;i<buffer.length;i++){const a=left[i],b=right[i];check(Number.isFinite(a)&&Number.isFinite(b),'Nonfinite listening PCM');segmentPeak=Math.max(segmentPeak,Math.abs(a),Math.abs(b));squares+=a*a+b*b;pcm[i*2]=a;pcm[i*2+1]=b;}
   check(segmentPeak>.0001&&segmentPeak<1,'Listening segment was silent or clipped');segments.push({...metadata,startSeconds:reelLength/rate,durationSeconds:buffer.duration,peak:segmentPeak,rms:Math.sqrt(squares/(buffer.length*2))});clips.push(pcm);reelLength+=buffer.length;
  };
  let isolatedSeconds=0;const isolatedCues=[];
  for(const take of takes){const buffer=s.variations.get(take.key)[take.take];isolatedCues.push({...take,startSeconds:isolatedSeconds});isolatedSeconds+=buffer.duration+.28;}
  const isolated=new OfflineAudioContext(2,Math.ceil(isolatedSeconds*rate),rate);for(const cue of isolatedCues){const source=isolated.createBufferSource();source.buffer=s.variations.get(cue.key)[cue.take];source.connect(isolated.destination);source.start(cue.startSeconds);}
  append(await isolated.startRendering(),{kind:'unity_gain_attachment_takes',normalized:false,cues:isolatedCues});
  const fixtures=[{id:'rifle_stock',weapon:0,magazine:0},{id:'rifle_fast',weapon:0,magazine:1},{id:'rifle_extended',weapon:0,magazine:2},{id:'rifle_drum',weapon:0,magazine:3},{id:'top_loader_drum',weapon:4,magazine:3},{id:'belt_box_extended',weapon:9,magazine:2},{id:'legacy_extended',weapon:0,magazine:0,handling:4},{id:'pistol_drum_unchanged',weapon:10,magazine:3},{id:'pump_shell_unchanged',weapon:5,magazine:3}];
  let renderedFixtureCount=0;
  for(const fixture of fixtures){
   const g=new Game({map:0},{seed:6719}),p=g.player,w=new Weapon(fixture.weapon,{magazine:fixture.magazine,handling:fixture.handling??0});g.actors=[p];p.reset({x:0,y:0,z:0},0);p.weapons[0]=w;p.slot=0;
   g.arena.blocks=[];g.arena.visualFloorCells=null;g.arena.bakeCollision();g.events.length=0;w.ammo=0;if(w.def.shellReload)w.reserve=1;
   const initialReserve=w.reserve;check(w.reload(),'Fixture failed to reload: '+fixture.id);const duration=w.reloadTime+.3,generated=[];
   while(g.time<duration){g.update(Math.min(1/120,duration-g.time));generated.push(...g.events);g.events.length=0;}
   const componentEvents=generated.filter(e=>e.type==='weaponFoley');check(componentEvents.length>0,'Fixture had no real magazine timeline');
   check(w.ammo===(w.def.shellReload?1:w.capacity)&&w.reserve===initialReserve-w.ammo,'Attachment changed ammo timing/conservation');
   const preroll=.28,offline=new OfflineAudioContext(2,Math.ceil((duration+preroll+.3)*rate),rate);let scheduled=0;
   const proxy=new Proxy(offline,{get(target,key){if(key==='state')return 'running';if(key==='currentTime')return scheduled;if(key==='createBufferSource')return()=>{const source=target.createBufferSource(),start=source.start.bind(source);source.start=(at=0,...args)=>start(scheduled+at,...args);return source;};const value=target[key];return typeof value==='function'?value.bind(target):value;}});
   const audio=new AudioSystem({volume:.8,haptics:false});audio.context=proxy;audio.master=offline.createGain();audio.master.gain.value=.8;audio.master.connect(offline.destination);audio.buffers=s.buffers;audio.variations=new Map([...s.variations].map(([key,buffers])=>[key,[buffers[0]]]));
   const played=[],play=audio.play.bind(audio);audio.play=(key,options)=>{played.push({key,time:scheduled,...options});return play(key,options);};
   const batches=new Map();for(const event of generated){const batch=batches.get(event.time)??[];batch.push(event);batches.set(event.time,batch);}
   for(const [time,events] of batches){scheduled=preroll+time;audio.events(events,g);}
   const expectedAttachment=componentEvents.filter(e=>attachmentFoleyCue(e,w.def)).length;
   check(played.filter(e=>e.key.startsWith('attachment')).length===expectedAttachment&&played.length===componentEvents.length,'Attachment events doubled/lost their recorded contacts');
   const rendered=await offline.startRendering();check(audio.voices===0&&audio.active.size===0,'Offline attachment graph failed cleanup');renderedFixtureCount++;
   append(rendered,{kind:'actual_reload_timeline',...fixture,reloadTimeSeconds:w.reloadTime,masterGain:.8,normalized:false,prerollSeconds:preroll,events:componentEvents,playback:played.map(({key,time,volume,important,region})=>({key,time,volume,important:!!important,region}))});
  }
  const pcm=new Float32Array(reelLength*2);let offset=0;for(const clip of clips){pcm.set(clip,offset);offset+=clip.length;}
  const bytes=new Uint8Array(pcm.buffer);let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
  return {kind:'desktop_browser_attachment_audio_validation',actual_iphone_data:false,subjective_listening_review:false,library:s.libraryStats,sampleRate:rate,keys,takes,attachmentDecodedBytes,decodedHeadroomBytes:40*1024*1024-s.libraryStats.decodedBytes,attachmentPeak:peak,nonfiniteSamples:nonfinite,nativePlayback:{batchAdmitted:4,singleVoiceReplacement:true,playerPriority:true,localCancellation:true,hearingCutoffMetres:18,naturalCleanup:true,peakVoices,pauseCleanup:true,remainingVoices:s.voices,remainingSources:s.active.size},nativeOffline:{isolatedTakes:takes.length,gameplayFixtures:renderedFixtureCount,naturalCleanup:true},listeningPreview:{sampleRate:rate,channels:2,durationSeconds:reelLength/rate,segments},pcmBase64:btoa(binary)};
 });
 assert.equal(errors.length,0,errors.join('\n'));assert.equal(result.library.recordings,Object.values(AUDIO_BANK.sounds).flat().length);assert(result.library.decodedBytes<40*1024*1024);assert.equal(result.sampleRate,sampleRate);assert.deepEqual(await snapshot(),hashes,'Runtime changed while capturing attachment evidence');
 const pcm=Buffer.from(result.pcmBase64,'base64');delete result.pcmBase64;await writeFile(work+'/preview.f32',pcm);
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','f32le','-ar',String(result.sampleRate),'-ac','2','-i',work+'/preview.f32','-c:a','aac','-b:a','192k','-movflags','+faststart',preview+'.m4a']);
 result.provenance={sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceDirty:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim().length>0,runtimeFiles:hashes,browser:browser.version(),capturedAt:new Date().toISOString()};result.listeningPreview.file=preview+'.m4a';
 await writeFile(preview+'.json',JSON.stringify({...result.provenance,...result.listeningPreview,actual_iphone_data:false,subjective_listening_review:false,description:'Eighteen decoded original attachment takes at unity gain, followed by nine actual reload timelines at the production cue gains with unchanged releases, bolts, feed covers, pistol/shell actions and ammunition conservation. No normalization. Listening evidence has not been subjectively reviewed.'},null,2)+'\n');
 await writeFile(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({output,library:result.library,sampleRate:result.sampleRate,attachmentDecodedBytes:result.attachmentDecodedBytes,decodedHeadroomBytes:result.decodedHeadroomBytes,nativePlayback:result.nativePlayback,nativeOffline:result.nativeOffline,preview:preview+'.m4a',durationSeconds:result.listeningPreview.durationSeconds}));
}finally{await browser?.close();server.kill();}
