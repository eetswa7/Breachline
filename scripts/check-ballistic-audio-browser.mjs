// Native desktop event playback and an audible review fixture. This does not
// establish subjective sound quality or physical iPhone latency/performance.
import {createRequire} from 'node:module';
import {spawn,spawnSync} from 'node:child_process';
import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const server=spawn(process.execPath,['scripts/preview.mjs','--port','4197'],{stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('preview ready'))resolve();});server.on('error',reject);});
const browser=await chromium.launch({executablePath:process.env.ART_TEST_BROWSER,headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage();await page.route('**/__ballistic_audio',route=>route.fulfill({contentType:'text/html',body:'<button id="start">Start audio</button>'}));await page.goto('http://127.0.0.1:4197/__ballistic_audio');
 await page.evaluate(async()=>{const {AudioSystem}=await import('/js/audio.js');window.AudioClass=AudioSystem;window.sound=new AudioSystem({volume:.8,haptics:false});document.querySelector('button').onclick=()=>sound.start();});
 await page.click('button');await page.waitForFunction(()=>sound.libraryStats||sound.libraryError,undefined,{timeout:90000});
 const {result,wav}=await page.evaluate(async()=>{
  const bank=window.sound;if(bank.libraryError)throw Error(bank.libraryError);await bank.libraryReady;
  const {loadSoundLibrary}=await import('/js/audio-library.js');
  const native48=await loadSoundLibrary(new OfflineAudioContext(1,1,48000),()=>{});
  const rate=44100,duration=1.6,scenes=[],chunks=[];let nonfiniteSamples=0,peak=0;
  const player={x:0,y:0,z:0,yaw:0},position={x:5,y:1.5,z:-2},exitPosition={x:5.2,y:1.5,z:-2};
  const cases=[
   ...['steel','concrete'].map(surface=>({label:'Ricochet '+surface,event:{type:'ricochet',position,source:0,surface}})),
   ...['steel','wood','glass','plaster'].map(surface=>({label:'Penetration '+surface,event:{type:'penetration',position,exitPosition,source:0,surface}})),
   ...['concrete','steel','wood','dirt','water','snow'].map(surface=>({label:'Rifle then casing on '+surface,surface,event:{type:'shot',source:0,weapon:0,yaw:0,position:{x:0,y:1.66,z:0}}}))
  ];
  for(const item of cases){
   const offline=new OfflineAudioContext(2,Math.round(rate*duration),rate),audio=new window.AudioClass({volume:.8,haptics:false});
   audio.context=new Proxy(offline,{get(target,key){if(key==='state')return 'running';const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}});
   audio.master=offline.createGain();audio.master.gain.value=.8;audio.master.connect(offline.destination);audio.buffers=bank.buffers;audio.variations=bank.variations;
   const floor={x:0,y:0,z:0,w:20,h:0,d:20,surface:item.surface??'concrete'},arena={visible:()=>true,indoors:()=>false,floorAt:()=>0,nearby:()=>[floor]};
   audio.events([item.event],{player,arena});const scheduledVoices=audio.voices,rendered=await offline.startRendering();
   const left=rendered.getChannelData(0),right=rendered.getChannelData(1),pcm=new Int16Array(left.length*2);let sum=0,scenePeak=0;
   for(let i=0;i<left.length;i++)for(let ch=0;ch<2;ch++){const sample=ch?right[i]:left[i];if(!Number.isFinite(sample))nonfiniteSamples++;sum+=sample*sample;scenePeak=Math.max(scenePeak,Math.abs(sample));pcm[i*2+ch]=Math.round(Math.max(-1,Math.min(1,sample))*32767);}
   peak=Math.max(peak,scenePeak);chunks.push(new Uint8Array(pcm.buffer));
   scenes.push({label:item.label,startSeconds:(scenes.length*duration),durationSeconds:duration,scheduledVoices,pcmPeak:scenePeak,pcmRms:Math.sqrt(sum/(left.length*2))});
  }
  // Future sources consume the ambient budget as soon as they are scheduled.
  for(let i=0;i<40;i++)bank.play('casingMetal',{delay:1});const ambientPending=bank.voices;
  for(let i=0;i<9;i++)bank.play('shot0',{important:true});const priorityPending=bank.voices;bank.pause();
  const dataBytes=chunks.reduce((n,part)=>n+part.length,0),bytes=new Uint8Array(44+dataBytes),view=new DataView(bytes.buffer),tag=(offset,text)=>{for(let i=0;i<text.length;i++)bytes[offset+i]=text.charCodeAt(i);};
  tag(0,'RIFF');view.setUint32(4,36+dataBytes,true);tag(8,'WAVE');tag(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,rate,true);view.setUint32(28,rate*4,true);view.setUint16(32,4,true);view.setUint16(34,16,true);tag(36,'data');view.setUint32(40,dataBytes,true);
  let offset=44;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}
  let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return {wav:btoa(binary),result:{kind:'desktop_browser_ballistic_audio_validation',actual_iphone_data:false,subjective_listening_review:false,original_material_takes:42,sampleRate:rate,native48kHzDecodedBytes:native48.decodedBytes,renderedStereoPeak:peak,nonfiniteSamples,ambientPending,priorityPending,remainingVoicesAfterPause:bank.voices,remainingSourcesAfterPause:bank.active.size,preview:'audio-contact-preview.m4a',scenes}};
 });
 assert.equal(result.nonfiniteSamples,0);assert(result.renderedStereoPeak<1);assert.equal(result.ambientPending,16);assert.equal(result.priorityPending,24);assert.equal(result.remainingVoicesAfterPause,0);assert.equal(result.remainingSourcesAfterPause,0);
 assert(result.native48kHzDecodedBytes<40*1024*1024);
 assert(result.scenes.every(scene=>scene.pcmRms>0&&scene.scheduledVoices>0));
 await mkdir('work',{recursive:true});await writeFile('work/ballistic-audio-preview.wav',Buffer.from(wav,'base64'));
 const encoded=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i','work/ballistic-audio-preview.wav','-c:a','aac','-b:a','160k','-movflags','+faststart','docs/audio-contact-preview.m4a'],{encoding:'utf8'});assert.equal(encoded.status,0,encoded.stderr);
 await writeFile('docs/validation-ballistic-audio-browser.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser.close();server.kill();}
