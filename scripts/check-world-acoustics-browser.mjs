// Native desktop playback and moving-listener PCM; no physical iPhone claims.
import {createRequire} from 'node:module';
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const output='docs/validation-world-acoustics67-browser.json',preview='docs/art-release67/world-acoustics-preview',work='work/world-acoustics67-browser';
await mkdir(work,{recursive:true});await mkdir('docs/art-release67',{recursive:true});
const server=spawn(process.execPath,['scripts/preview.mjs','--port','4197'],{stdio:['ignore','pipe','pipe']});let browser;
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Acoustics server did not start')),15000);server.stdout.on('data',d=>{if(String(d).includes('preview ready')){clearTimeout(timer);resolve();}});server.on('error',reject);});
 browser=await chromium.launch({executablePath:process.env.ART_TEST_BROWSER??'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/__world_acoustics',route=>route.fulfill({contentType:'text/html',body:'<button>Start native moving-listener audio</button>'}));
 await page.goto('http://127.0.0.1:4197/__world_acoustics');
 await page.evaluate(async()=>{const {AudioSystem}=await import('/js/audio.js');window.sound=new AudioSystem({volume:.8,haptics:false});document.querySelector('button').onclick=()=>sound.start();});
 await page.click('button');await page.waitForFunction(()=>sound.libraryStats||sound.libraryError,undefined,{timeout:90000});
 const result=await page.evaluate(async()=>{
  const {AudioSystem}=await import('/js/audio.js'),{distanceGain}=await import('/js/world-acoustics.js');
  const s=window.sound;await s.libraryReady;if(s.libraryError)throw Error(s.libraryError);
  const check=(ok,message)=>{if(!ok)throw Error(message);},delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const audioDelay=async seconds=>{const start=s.context.currentTime,wall=performance.now();while(s.context.currentTime-start<seconds){await delay(10);check(performance.now()-wall<5000,'Native audio clock did not advance');}};
  let blocked=false,rays=0;
  const game={player:{x:0,y:0,z:0,height:1.67,yaw:0,pitch:0},eye(p){return{x:p.x,y:0,z:p.z};},arena:{indoors:()=>false,visible:()=>{rays++;return !blocked;}}};
  const remote={type:'explosion',position:{x:0,y:0,z:-10}};
  s.events([remote],game);const voice=s.worldAcoustics.voices[0],initial=voice.gain.gain.value;
  check(voice&&voice.filter&&voice.gain&&s.voices===1,'Native tracked world graph unavailable');
  await audioDelay(.06);game.player.z=30;s.events([],game);await audioDelay(.03);
  const moved={gain:voice.gain.gain.value,cutoff:voice.filter.frequency.value,position:[voice.position.x,voice.position.y,voice.position.z]};
  check(moved.gain<initial*.4&&moved.cutoff<15000,'Native existing tail did not react to listener distance');
  game.player.z=0;blocked=true;await audioDelay(.06);s.events([],game);await audioDelay(.03);
  const covered={gain:voice.gain.gain.value,cutoff:voice.filter.frequency.value,occluded:voice.occluded};
  check(covered.occluded&&covered.gain<initial*.6&&covered.cutoff<4000,'Native existing tail did not react to cover');
  blocked=false;await audioDelay(.12);s.events([],game);await audioDelay(.04);s.events([],game);await audioDelay(.02);
  check(!voice.occluded&&voice.gain.gain.value>initial*.95,'Stationary native tail did not react to cover removal: '+JSON.stringify({occluded:voice.occluded,gain:voice.gain.gain.value,initial,time:s.context.currentTime,coverAt:voice.coverAt}));
  s.pause();check(s.voices===0&&s.worldAcoustics.voices.length===0,'Pause retained tracked native voices');await s.start();
  // Actual native component envelope remains on its own gain node. Moving the
  // listener changes acoustic gain only; cancellation releases it immediately.
  s.events([{type:'weaponFoley',source:2,weapon:0,cue:'feed',position:{x:0,y:0,z:-10}}],game);
  const component=s.worldAcoustics.voices[0];check(component,'Remote component graph missing');
  game.player.z=10;await audioDelay(.03);s.events([],game);
  s.events([{type:'weaponFoleyCancel',source:2,weapon:0}],game);check(s.worldAcoustics.voices.length===0&&s.voices===0,'Native component cancellation retained live acoustics');
  // Player priority must also remove its replaced world's live tracking.
  game.player.z=0;s.events(Array.from({length:16},(_,i)=>({type:'shot',source:2,weapon:0,position:{x:i*.2,y:0,z:-10}})),game);
  s.events(Array.from({length:8},()=>remote),game);const oldest=s.worldAcoustics.voices[0];
  s.events([{type:'shot',source:0,weapon:0,position:game.eye(game.player)}],game);
  check(s.voices===24&&s.worldAcoustics.voices.length===23&&!s.worldAcoustics.voices.includes(oldest),'Native player-priority replacement retained world tracking');
  s.pause();await s.start();
  // Cost fixture uses actual nodes/buffers, within the preserved 24-voice cap.
  game.player.z=0;const before=rays;s.events(Array.from({length:24},(_,i)=>({type:'explosion',position:{x:i*.2,y:0,z:-10}})),game);
  const startRays=rays-before;check(s.voices===24&&s.worldAcoustics.voices.length===24&&startRays<=8,'Native initial cover/voice budget exceeded');
  let maximumBatchRays=0,maximumTracked=0;const samples=[];
  for(let i=0;i<2000;i++){game.player.x=(i%120)*.03;const old=rays,t=performance.now();s.events([],game);samples.push(performance.now()-t);maximumBatchRays=Math.max(maximumBatchRays,rays-old);maximumTracked=Math.max(maximumTracked,s.worldAcoustics.voices.length);}
  samples.sort((a,b)=>a-b);check(maximumBatchRays<=4&&maximumTracked===24,'Native refresh exceeded per-batch cost bounds');
  s.events([{type:'shot',source:0,weapon:0,position:game.eye(game.player)}],game);check(s.voices===24&&s.worldAcoustics.voices.length===24,'Important-only voices exceeded preserved cap');
  s.pause();check(s.worldAcoustics.voices.length===0&&s.voices===0,'Cost-fixture pause retained world voices');await s.start();await delay(150);
  const rate=s.context.sampleRate,buffer=s.buffers.get('explosion'),preroll=.35,changeTime=.65;
  const fixtures=[{id:'fixed_front_reference'},{id:'listener_moves_30m_back',z:30},{id:'cover_added',afterBlocked:true},{id:'cover_removed',beforeBlocked:true},{id:'listener_moves_8m_left',x:-8}];
  const clips=[];let reelLength=0,nonfiniteSamples=0;
  for(const fixture of fixtures){
   const duration=preroll+buffer.duration+.2,context=new OfflineAudioContext(2,Math.ceil(duration*rate),rate);
   let scheduled=preroll,hidden=!!fixture.beforeBlocked;
   const proxy=new Proxy(context,{get(target,key){
    if(key==='state')return 'running';if(key==='currentTime')return scheduled;
    if(key==='createBufferSource')return()=>{const source=target.createBufferSource(),start=source.start.bind(source);source.start=(at=0,...args)=>start(scheduled+at,...args);return source;};
    const value=target[key];return typeof value==='function'?value.bind(target):value;
   }});
   const audio=new AudioSystem({volume:.8,haptics:false});audio.context=proxy;audio.master=context.createGain();audio.master.gain.value=.8;audio.master.connect(context.destination);audio.buffers.set('explosion',buffer);
   const player={x:0,y:0,z:0,height:1.67,yaw:0,pitch:0},scene={player,eye:p=>({x:p.x,y:0,z:p.z}),arena:{indoors:()=>false,visible:()=>!hidden}};
   audio.events([{type:'explosion',position:{x:0,y:0,z:-10}}],scene);
   const steps=[];for(let t=preroll+1/60;t<preroll+buffer.duration-.08;t+=1/60)steps.push({time:t,promise:context.suspend(t)});
   const rendering=context.startRendering(),states=[];
   for(const step of steps){await step.promise;scheduled=context.currentTime;if(scheduled>=changeTime){player.x=fixture.x??0;player.z=fixture.z??0;hidden=!!fixture.afterBlocked;}audio.events([],scene);
    const live=audio.worldAcoustics.voices[0];if(scheduled>=changeTime&&states.length<8)states.push({time:scheduled,gain:live?.gain.gain.value,cutoff:live?.filter.frequency.value,occluded:live?.occluded});
    await context.resume();
   }
   const rendered=await rendering,left=rendered.getChannelData(0),right=rendered.getChannelData(1),interleaved=new Float32Array(left.length*2);
   let peak=0,sqL=0,sqR=0,afterSq=0,afterN=0,afterLeftSq=0,afterRightSq=0,differenceSq=0;
   for(let i=0;i<left.length;i++){
    if(!Number.isFinite(left[i])||!Number.isFinite(right[i]))nonfiniteSamples++;
    peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));sqL+=left[i]*left[i];sqR+=right[i]*right[i];
    if(i/rate>.85&&i/rate<1.45){afterSq+=left[i]*left[i]+right[i]*right[i];afterLeftSq+=left[i]*left[i];afterRightSq+=right[i]*right[i];afterN+=2;if(i>0)differenceSq+=(left[i]-left[i-1])**2+(right[i]-right[i-1])**2;}
    interleaved[2*i]=left[i];interleaved[2*i+1]=right[i];
   }
   check(peak>.001&&peak<1&&nonfiniteSamples===0,'Native dynamic PCM silent, clipped or nonfinite: '+fixture.id+' peak='+peak+' nonfinite='+nonfiniteSamples);
   check(audio.worldAcoustics.voices.length===0&&audio.voices===0,'Native natural end retained world-acoustics record');
   clips.push({...fixture,startSeconds:reelLength/rate,durationSeconds:rendered.duration,sourceStartSeconds:preroll,listenerChangeSeconds:changeTime,rmsLeft:Math.sqrt(sqL/left.length),rmsRight:Math.sqrt(sqR/right.length),afterRms:Math.sqrt(afterSq/afterN),afterRmsLeft:Math.sqrt(afterLeftSq/(afterN/2)),afterRmsRight:Math.sqrt(afterRightSq/(afterN/2)),afterDifferenceRms:Math.sqrt(differenceSq/afterN),peak,states,samples:interleaved});reelLength+=left.length;
  }
  const get=id=>clips.find(c=>c.id===id),reference=get('fixed_front_reference');
  const comparisons=clips.slice(1).map(c=>({fixture:c.id,afterRmsRatio:c.afterRms/reference.afterRms,afterDifferenceRmsRatio:c.afterDifferenceRms/reference.afterDifferenceRms}));
  check(comparisons[0].afterRmsRatio<.3,'Native tail PCM retained emission-time distance');
  check(comparisons[1].afterRmsRatio<.6&&comparisons[1].afterDifferenceRmsRatio<.5,'Native tail PCM retained emission-time cover');
  check(Math.abs(comparisons[2].afterRmsRatio-1)<.03,'Native tail PCM failed to recover after removed cover');
  check(get('listener_moves_8m_left').afterRmsRight>get('listener_moves_8m_left').afterRmsLeft*1.02,'Native HRTF failed to follow moving listener side');
  const reel=new Float32Array(reelLength*2);let offset=0;for(const clip of clips){reel.set(clip.samples,offset);offset+=clip.samples.length;delete clip.samples;}
  const bytes=new Uint8Array(reel.buffer);let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));s.pause();
  return {kind:'desktop_browser_live_world_acoustics_validation',actual_iphone_data:false,subjective_listening_review:false,sampleRate:rate,library:s.libraryStats,nativePlayback:{initialGain:initial,moved,covered,stationaryCoverRemoval:true,componentCancellation:true,playerPriorityReplacement:true,pauseCleanup:true},costBounds:{existingRefreshMaximum:4,sharedEmissionAndRefreshMaximum:8,startRays,maximumBatchRays,maximumTracked,updates:samples.length,desktopUpdateMedianMs:samples[Math.floor(samples.length*.5)],desktopUpdateP95Ms:samples[Math.floor(samples.length*.95)],desktopUpdateMaximumMs:samples.at(-1)},nativeOffline:{sourceKey:'explosion',monoDirectRecording:buffer.numberOfChannels===1,prerollSeconds:preroll,comparisons,nonfiniteSamples,naturalCleanup:true},listeningPreview:{kind:'native_dynamic_tail_reel',sampleRate:rate,channels:2,durationSeconds:reelLength/rate,normalized:false,headphonesRecommended:true,segments:clips},pcmBase64:btoa(binary)};
 });
 assert.equal(errors.length,0,errors.join('\n'));const pcm=Buffer.from(result.pcmBase64,'base64');delete result.pcmBase64;await writeFile(work+'/preview.f32',pcm);
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','f32le','-ar',String(result.sampleRate),'-ac','2','-i',work+'/preview.f32','-c:a','aac','-b:a','192k','-movflags','+faststart',preview+'.m4a']);
 const runtimeFiles={};for(const file of ['dist/js/audio.js','dist/js/world-acoustics.js','dist/js/spatial-audio.js'])runtimeFiles[file]=createHash('sha256').update(await readFile(file)).digest('hex');
 const modifiedFiles=execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
 const provenance={sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceDirty:modifiedFiles.length>0,modifiedFiles,runtimeFiles,browser:browser.version(),capturedAt:new Date().toISOString()};
 await writeFile(preview+'.json',JSON.stringify({...provenance,...result.listeningPreview,actual_iphone_data:false,subjective_listening_review:false,description:'The same shipped native-decoded explosion: fixed front reference, listener receding 30 m during tail, cover added, cover removed, listener moving 8 m left. Changes begin 300 ms after sound starts. Native HRTF/manual gain/filter with 60 Hz updates, no normalization or shared-room wet responses.'},null,2)+'\n');
 result.listeningPreview.file=preview+'.m4a';result.provenance=provenance;await writeFile(output,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({output,nativePlayback:result.nativePlayback,costBounds:result.costBounds,comparisons:result.nativeOffline.comparisons,preview:preview+'.m4a',previewSeconds:result.listeningPreview.durationSeconds}));
}finally{await browser?.close();server.kill();}
