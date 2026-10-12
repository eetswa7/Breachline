// Actual native browser decoding and voice cleanup, never physical iPhone data.
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {AUDIO_BANK} from '../dist/js/audio-files.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const server=spawn(process.execPath,['scripts/preview.mjs','--port','4188'],{stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('preview ready'))resolve();});server.on('error',reject);});
const browser=await chromium.launch({executablePath:process.env.ART_TEST_BROWSER,headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage();await page.route('**/__audio',route=>route.fulfill({contentType:'text/html',body:'<button id="start">Start audio</button>'}));await page.goto('http://127.0.0.1:4188/__audio');
 await page.evaluate(async()=>{const {AudioSystem}=await import('/js/audio.js');window.sound=new AudioSystem({volume:.8,haptics:false});document.querySelector('button').onclick=()=>sound.start();});
 await page.click('button');await page.waitForFunction(()=>window.sound.libraryStats||window.sound.libraryError,undefined,{timeout:90000});
 const result=await page.evaluate(async()=>{
  const s=window.sound;await s.libraryReady;
  if(s.libraryError)throw Error(s.libraryError);
  const keys=[...s.variations.keys()];let decodedPeak=0,nonfiniteSamples=0;
  for(const takes of s.variations.values())for(const take of takes)for(let ch=0;ch<take.numberOfChannels;ch++)for(const sample of take.getChannelData(ch)){decodedPeak=Math.max(decodedPeak,Math.abs(sample));if(!Number.isFinite(sample))nonfiniteSamples++;}
  const contactKeys=keys.filter(key=>/^(ricochet|penetration|casing)/.test(key));
  for(const key of contactKeys)s.play(key,{volume:.2,pan:.35,distance:8,occluded:true,indoor:'room'});
  const contactVoices=s.voices,playedContactKeys=contactKeys.filter(key=>s.variationLast.has(key));
  for(let i=0;i<40;i++)s.play('shot0',{volume:.6,important:i%2===0,pan:(i%3-1)*.6,indoor:i%2===0?'hall':false,occluded:i%3===0,distance:i*2});
  const peakVoices=s.voices;await new Promise(resolve=>setTimeout(resolve,1400));
  const out={kind:'desktop_browser_audio_validation',actual_iphone_data:false,...s.libraryStats,decodedKeys:keys.length,decodedPeak,nonfiniteSamples,playedContactKeys,contactVoices,sharedConvolvers:s.rooms.size,contextState:s.context.state,sampleRate:s.context.sampleRate,peakVoices,remainingVoices:s.voices,remainingSources:s.active.size};s.pause();return out;
 });
 assert.equal(result.recordings,Object.values(AUDIO_BANK.sounds).reduce((n,takes)=>n+takes.length,0));assert.equal(result.decodedKeys,Object.keys(AUDIO_BANK.sounds).length);assert(result.decodedBytes<40*1024*1024);assert.equal(result.nonfiniteSamples,0);assert(result.decodedPeak<=1.05);assert.equal(result.sharedConvolvers,2);assert(result.peakVoices<=24&&result.peakVoices>0);assert.equal(result.remainingVoices,0);assert.equal(result.remainingSources,0);
 assert.equal(result.playedContactKeys.length,13);assert.equal(result.contactVoices,13);
 await writeFile(process.argv[2]??'docs/validation-production-audio-browser.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser.close();server.kill();}
