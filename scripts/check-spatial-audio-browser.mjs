// Native desktop HRTF rendering/playback evidence; never physical iPhone data.
import {createRequire} from 'node:module';
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const output='docs/validation-spatial-audio65-browser.json',preview='docs/art-release65/spatial-audio-preview',work='work/spatial-audio65-browser';
await mkdir(work,{recursive:true});await mkdir('docs/art-release65',{recursive:true});
const server=spawn(process.execPath,['scripts/preview.mjs','--port','4198'],{stdio:['ignore','pipe','pipe']});let browser;
try{
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Spatial audio server did not start')),15000);
  server.stdout.on('data',d=>{if(String(d).includes('preview ready')){clearTimeout(timer);resolve();}});
  server.on('error',reject);server.on('exit',code=>reject(Error('Spatial audio server exited: '+code)));
 });
 browser=await chromium.launch({executablePath:process.env.ART_TEST_BROWSER??'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/__spatial_audio',route=>route.fulfill({contentType:'text/html',body:'<button>Start native spatial audio</button>'}));
 await page.goto('http://127.0.0.1:4198/__spatial_audio');
 await page.evaluate(async()=>{const {AudioSystem}=await import('/js/audio.js');window.sound=new AudioSystem({volume:.8,haptics:false});document.querySelector('button').onclick=()=>sound.start();});
 await page.click('button');await page.waitForFunction(()=>sound.libraryStats||sound.libraryError,undefined,{timeout:90000});
 const result=await page.evaluate(async()=>{
  const {AudioSystem}=await import('/js/audio.js'),{listenerFrame}=await import('/js/spatial-audio.js');
  const s=window.sound;await s.libraryReady;if(s.libraryError)throw Error(s.libraryError);
  const check=(ok,message)=>{if(!ok)throw Error(message);},delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const sources=[],panners=[],stereos=[];
  for(const [method,list]of [['createBufferSource',sources],['createPanner',panners],['createStereoPanner',stereos]]){
   const create=s.context[method].bind(s.context);s.context[method]=()=>{const node=create(),disconnect=node.disconnect.bind(node);node.disconnect=(...args)=>{node.qaDisconnected=true;return disconnect(...args);};list.push(node);return node;};
  }
  const game={player:{x:3,y:0,z:-2,height:1.67,yaw:.47,pitch:.31},eye(p){return{x:p.x,y:p.y+p.height-.12,z:p.z};},arena:{visible:()=>true,indoors:()=>false}};
  const world={x:9,y:4,z:-8},remote={type:'shot',source:2,weapon:0,position:world};
  s.events(Array.from({length:40},()=>remote),game);const ambientVoices=s.voices;
  check(ambientVoices===16&&panners.length===16,'World voices failed the ambient 16-source bound');
  await delay(30); // AudioParam automation reaches the native render quantum.
  for(const panner of panners)check(panner.panningModel==='HRTF'&&panner.rolloffFactor===0&&panner.positionX.value===world.x&&panner.positionY.value===world.y&&panner.positionZ.value===world.z,'Native world HRTF node is misconfigured');
  s.events(Array.from({length:8},()=>({type:'explosion',position:world})),game);const maximumVoices=s.voices;check(maximumVoices===24,'Important world voices failed the 24-source bound');
  s.events([{type:'shot',source:0,weapon:0,position:game.eye(game.player)}],game);
  check(s.voices===24&&panners[0].qaDisconnected&&sources[0].qaDisconnected,'Priority replacement failed to release native world graph');
  check(stereos.length===1,'Local muzzle did not retain its immediate stereo path');
  game.player.x=5;game.player.yaw=-.71;game.player.pitch=-.43;s.events([],game);
  const listener=s.context.listener,frame=listenerFrame(game.player,game.eye(game.player));
  await delay(30);
  const modernListener={position:[listener.positionX.value,listener.positionY.value,listener.positionZ.value],forward:[listener.forwardX.value,listener.forwardY.value,listener.forwardZ.value],up:[listener.upX.value,listener.upY.value,listener.upZ.value]};
  const actual=[...modernListener.position,...modernListener.forward,...modernListener.up],expected=[frame.position.x,frame.position.y,frame.position.z,frame.forward.x,frame.forward.y,frame.forward.z,frame.up.x,frame.up.y,frame.up.z];
  check(actual.every((v,i)=>Math.abs(v-expected[i])<.00001),'Empty native event batch failed eye/yaw/pitch update');
  check(stereos[0].pan.value===0,'Actual local muzzle panned with listener yaw');
  s.pause();check(s.voices===0&&s.active.size===0,'Pause retained native sources before asynchronous end');
  check([...sources,...panners,...stereos].every(n=>n.qaDisconnected),'Pause retained a native source/panner graph');
  await delay(100);const pauseState=s.context.state;check(pauseState==='suspended','Native context did not suspend');await s.start();
  // A native HRTF database can load on a worker. Real-context playback above
  // warms it first; offline sources also receive 350 ms of preroll. Each test
  // has its own context so one listener automation cannot contaminate another.
  await delay(200);
  const buffer=s.buffers.get('shot0'),rate=s.context.sampleRate,preroll=.35;
  check(buffer.numberOfChannels===1,'Spatial evidence requires the shipped mono direct recording');
  const fixtures=[
   {id:'front',position:{x:0,y:0,z:-10}},
   {id:'back',position:{x:0,y:0,z:10}},
   {id:'above',position:{x:0,y:10,z:0}},
   {id:'below',position:{x:0,y:-10,z:0}},
   {id:'left',position:{x:-10,y:0,z:0}},
   {id:'right',position:{x:10,y:0,z:0}},
   {id:'front_after_half_turn',yaw:Math.PI,position:{x:0,y:0,z:-10},matches:'back'},
   {id:'front_after_right_turn',yaw:Math.PI/2,position:{x:0,y:0,z:-10},matches:'left'},
   {id:'front_while_looking_up',pitch:Math.PI/2,position:{x:0,y:0,z:-10},matches:'below'}
  ];
  const clips=[];let reelLength=0,nonfiniteSamples=0;
  for(const fixture of fixtures){
   const duration=preroll+buffer.duration+.35,context=new OfflineAudioContext(2,Math.ceil(duration*rate),rate),nativePanners=[];
   let scheduled=0;
   const proxy=new Proxy(context,{get(target,key){
    if(key==='state')return 'running';if(key==='currentTime')return scheduled;
    if(key==='createBufferSource')return()=>{const source=target.createBufferSource(),start=source.start.bind(source);source.start=(at=0,...args)=>start(scheduled+at,...args);return source;};
    if(key==='createPanner')return()=>{const panner=target.createPanner();nativePanners.push(panner);return panner;};
    const value=target[key];return typeof value==='function'?value.bind(target):value;
   }});
   const audio=new AudioSystem({volume:.8,haptics:false});audio.context=proxy;audio.master=context.createGain();audio.master.connect(context.destination);audio.buffers.set('shot0',buffer);
   const player={x:0,y:-1.55,z:0,height:1.67,yaw:fixture.yaw??0,pitch:fixture.pitch??0};
   // Fixed direct gain isolates binaural direction from the game's unchanged
   // manual distance/cover law. The real events path is exercised above.
   audio.events([],{player,eye:()=>({x:0,y:0,z:0}),arena:{}});scheduled=preroll;
   audio.play('shot0',{volume:.4,rate:1,position:fixture.position});
   check(nativePanners.length===1&&nativePanners[0].panningModel==='HRTF','Offline native HRTF route unavailable');
   const rendered=await context.startRendering(),left=rendered.getChannelData(0),right=rendered.getChannelData(1),interleaved=new Float32Array(left.length*2);
   let peak=0,sqL=0,sqR=0,onset=-1;
   for(let i=0;i<left.length;i++){
    if(!Number.isFinite(left[i])||!Number.isFinite(right[i]))nonfiniteSamples++;
    peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));sqL+=left[i]*left[i];sqR+=right[i]*right[i];
    if(onset<0&&Math.max(Math.abs(left[i]),Math.abs(right[i]))>.00001)onset=i;
    interleaved[2*i]=left[i];interleaved[2*i+1]=right[i];
   }
   check(peak>.001&&peak<1&&nonfiniteSamples===0,'Native HRTF render silent, clipped or nonfinite: '+fixture.id);
   const headFrame=listenerFrame(player,{x:0,y:0,z:0});
   const clip={...fixture,listener:headFrame,rmsLeft:Math.sqrt(sqL/left.length),rmsRight:Math.sqrt(sqR/right.length),peak,firstAudibleSeconds:onset/rate,sourceStartSeconds:preroll,sourceStartInReelSeconds:reelLength/rate+preroll,startSeconds:reelLength/rate,durationSeconds:rendered.duration,samples:interleaved};
   reelLength+=left.length;clips.push(clip);
   check(audio.voices===0&&audio.active.size===0,'Offline native natural end retained world graph');
  }
  const compare=(a,b)=>{
   const x=a.samples,y=b.samples;let aa=0,bb=0,ab=0;
   for(let i=0;i<x.length;i++){aa+=x[i]*x[i];bb+=y[i]*y[i];ab+=x[i]*y[i];}
   return {a:a.id,b:b.id,correlation:ab/Math.sqrt(aa*bb),normalizedRmsDifference:Math.sqrt(Math.max(0,2-2*ab/Math.sqrt(aa*bb)))};
  };
  const get=id=>clips.find(c=>c.id===id),distinctions=[compare(get('front'),get('back')),compare(get('above'),get('below')),compare(get('left'),get('right'))];
  for(const difference of distinctions)check(difference.normalizedRmsDifference>.025,'Native HRTF did not distinguish '+difference.a+' / '+difference.b);
  const rotations=clips.filter(c=>c.matches).map(c=>compare(c,get(c.matches)));
  for(const comparison of rotations)check(comparison.correlation>.995,'World/head rotation inconsistent: '+comparison.a+' / '+comparison.b);
  check(get('left').rmsLeft>get('left').rmsRight*1.05&&get('right').rmsRight>get('right').rmsLeft*1.05,'Native HRTF left/right ears reversed');
  const reel=new Float32Array(reelLength*2);let offset=0;for(const clip of clips){reel.set(clip.samples,offset);offset+=clip.samples.length;delete clip.samples;}
  const bytes=new Uint8Array(reel.buffer);let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
  s.pause();return {kind:'desktop_browser_spatial_audio_validation',actual_iphone_data:false,subjective_listening_review:false,sampleRate:rate,library:s.libraryStats,nativePlayback:{ambientVoices,maximumVoices,worldPanners:panners.length,localStereoPanners:stereos.length,localMuzzleCentered:true,manualDistanceRolloffPreserved:true,emptyBatchListener:modernListener,priorityReplacement:true,pauseCleanup:{contextState:pauseState,remainingVoices:s.voices,remainingSources:s.active.size,nodesDisconnected:true}},nativeOffline:{sourceKey:'shot0',monoDirectRecording:true,prerollSeconds:preroll,fixedDirectGain:.4,masterGain:.8,distinctions,orientationRotationConsistency:rotations,nonfiniteSamples,naturalCleanup:true},listeningPreview:{kind:'isolated_native_hrtf_direction_reel',sampleRate:rate,channels:2,durationSeconds:reelLength/rate,normalized:false,headphonesRecommended:true,segments:clips},pcmBase64:btoa(binary)};
 });
 assert.equal(errors.length,0,errors.join('\n'));const pcm=Buffer.from(result.pcmBase64,'base64');delete result.pcmBase64;await writeFile(work+'/preview.f32',pcm);
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','f32le','-ar',String(result.sampleRate),'-ac','2','-i',work+'/preview.f32','-c:a','aac','-b:a','192k','-movflags','+faststart',preview+'.m4a']);
 const runtimeFiles={};for(const file of ['dist/js/audio.js','dist/js/spatial-audio.js'])runtimeFiles[file]=createHash('sha256').update(await readFile(file)).digest('hex');
 const modifiedFiles=execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
 const provenance={sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceDirty:modifiedFiles.length>0,modifiedFiles,runtimeFiles,browser:browser.version(),capturedAt:new Date().toISOString()};
 await writeFile(preview+'.json',JSON.stringify({...provenance,...result.listeningPreview,actual_iphone_data:false,subjective_listening_review:false,description:'The same shipped native-decoded mono shot at front, back, above, below, left, right, followed by head-turn/pitch equivalents. Browser HRTF stereo PCM, fixed equal gains, 350 ms preroll, no loudness normalization. Equal gains isolate direction; runtime event gain/cover processing and cleanup are validated separately.'},null,2)+'\n');
 result.listeningPreview.file=preview+'.m4a';result.provenance=provenance;await writeFile(output,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({output,nativePlayback:result.nativePlayback,distinctions:result.nativeOffline.distinctions,rotations:result.nativeOffline.orientationRotationConsistency,preview:preview+'.m4a',previewSeconds:result.listeningPreview.durationSeconds}));
}finally{await browser?.close();server.kill();}
