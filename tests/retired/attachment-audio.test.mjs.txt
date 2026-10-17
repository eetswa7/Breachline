import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Weapon,WEAPONS} from '../dist/js/weapons.js';
import {Game,emptyInput} from '../dist/js/engine.js';
import {AudioSystem} from '../dist/js/audio.js';
import {AUDIO_BANK} from '../dist/js/audio-files.js';
import {attachmentFoleyCue,buildAttachmentFoley,ATTACHMENT_FOLEY_FAMILIES,ATTACHMENT_FOLEY_ACTIONS} from '../dist/js/attachment-audio.js';

test('magazine voices follow only modelled moving contacts and retain fixed attachment/action sounds',()=>{
 const base={weapon:0,component:'magazine',cue:'extract',magazine:1,handling:0};
 for(const [magazine,family] of [[1,'Fast'],[2,'Extended'],[3,'Drum']])for(const [cue,action] of [['extract','Extract'],['handling','Move'],['insert','Move'],['seat','Seat']])for(const component of ['magazine','topMagazine','beltBox'])
  assert.equal(attachmentFoleyCue({...base,magazine,cue,component},WEAPONS[0]).key,'attachment'+family+action);
 for(const component of ['bolt','slide','shell','cylinder','feedCover','belt','optic','barrel','grip'])assert.equal(attachmentFoleyCue({...base,component},WEAPONS[0]),null);
 for(const cue of ['release','open','close','coverOpen','feed','coverClose','switch'])assert.equal(attachmentFoleyCue({...base,cue},WEAPONS[0]),null);
 for(const id of [5,18,22,10,12])assert.equal(attachmentFoleyCue(base,WEAPONS[id]),null,WEAPONS[id].name);
 assert.equal(attachmentFoleyCue({...base,magazine:0},WEAPONS[0]),null);
 assert.equal(attachmentFoleyCue({...base,magazine:0,handling:4},WEAPONS[0]).key,'attachmentExtendedExtract');
 assert.equal(attachmentFoleyCue({...base,magazine:1,handling:4},WEAPONS[0]).key,'attachmentExtendedExtract','legacy extended geometry remains present with the fast tab');
 assert.equal(attachmentFoleyCue({...base,magazine:3,handling:4},WEAPONS[0]).key,'attachmentDrumExtract','the drum body takes precedence over the legacy extension');
 assert.equal(attachmentFoleyCue(base,undefined),null);
});

test('every reloadable arsenal selection carries its magazine state without changing phase or ammunition conservation',()=>{
 for(const def of WEAPONS.filter(w=>w.kind!=='MELEE'))for(const magazine of [0,1,2,3])for(const handling of [0,4]){
  const w=new Weapon(def.id,{magazine,handling});w.ammo=0;assert(w.reload());const before=w.reserve,events=[];
  w.update(w.reloadTime*.339,e=>events.push(e));assert.equal(w.ammo,0);
  w.update(w.reloadTime*.662,e=>events.push(e));
  assert(events.every(e=>e.weapon===def.id&&e.magazine===magazine&&e.handling===handling),def.name);
  assert.equal(w.ammo,def.shellReload?1:w.capacity);assert.equal(w.reserve,before-w.ammo);
  assert.deepEqual(events.map(e=>e.phase),[...events.map(e=>e.phase)].sort((a,b)=>a-b));
  const attachment=events.map(e=>attachmentFoleyCue(e,def)).filter(Boolean);
  const compatible=!['PISTOL','MELEE'].includes(def.kind)&&!def.shellReload&&!def.revolver&&(magazine!==0||handling===4);
  assert.equal(attachment.length,compatible?def.id===9||def.id===27?3:4:0,def.name);
 }
});

test('actual reload events carry attachment cues, pause freezes them and a swap cancels their remaining contacts',()=>{
 const g=new Game({map:0},{seed:6719}),p=g.player,w=new Weapon(0,{magazine:3});g.actors=[p];p.weapons[0]=w;p.slot=0;w.ammo=0;g.events.length=0;
 g.update(1/120,{...emptyInput(),reload:true});const advance=seconds=>{for(let t=0;t<seconds;t+=1/120)g.update(Math.min(1/120,seconds-t));};
 advance(w.reloadTime*.4);const events=g.events.filter(e=>e.type==='weaponFoley'),count=events.length;
 assert(events.some(e=>e.cue==='extract'&&e.magazine===3&&e.component==='magazine'&&e.source===0&&Number.isFinite(e.position.y)));
 g.paused=true;const left=w.reloadLeft;advance(1);assert.equal(w.reloadLeft,left);assert.equal(g.events.filter(e=>e.type==='weaponFoley').length,count);
 g.paused=false;g.update(1/120,{...emptyInput(),swap:true});assert(g.events.some(e=>e.type==='weaponFoleyCancel'&&e.weapon===0));
 g.events.length=0;advance(5);assert.equal(g.events.filter(e=>e.type==='weaponFoley').length,0);assert.equal(w.ammo,0);
});

test('attachment replacement uses one existing cue voice with player priority, cover and the remote batch cutoff',()=>{
 const audio=new AudioSystem({volume:1}),played=[];audio.play=(key,options)=>played.push({key,...options});
 const game={player:{x:0,y:0,z:0,yaw:0},arena:{visible:()=>false}},remote={type:'weaponFoley',source:2,weapon:0,magazine:3,handling:0,cue:'seat',component:'magazine',position:{x:9,y:1.5,z:0}};
 audio.events([...Array.from({length:20},()=>remote),{...remote,source:0}],game);assert.equal(played.length,4);
 assert(played.every(e=>e.key==='attachmentDrumSeat'&&e.group==='foley:'+(e.important?'0':'2')+':0'));
 assert(played.slice(0,3).every(e=>!e.important&&e.occluded&&e.position&&e.acoustics&&e.pan>.99));
 assert(played.at(-1).important&&!played.at(-1).occluded&&!played.at(-1).position);assert.deepEqual(played[0].region,[0,1]);
 played.length=0;audio.events([{...remote,position:{x:19,y:0,z:0}},{...remote,source:0,cue:'release'},{...remote,source:0,cue:'close',component:'bolt'},{...remote,source:0,weapon:5,cue:'insert',component:'shell'}],game);
 assert.deepEqual(played.map(e=>e.key),['reload0','rack0','reload5']);assert.deepEqual(played.at(-1).region,[.34,.58]);
});

test('original compact attachment recordings and audible startup voices fit the existing decoded-memory allowance',async()=>{
 const design=JSON.parse(await readFile('authoring/audio/attachment-foley.json','utf8'));
 assert.equal(design.variants,2);assert.deepEqual(Object.keys(design.families),ATTACHMENT_FOLEY_FAMILIES);
 const signatures=new Set();let addedBytes=0,totalBytes=0;
 for(const records of Object.values(AUDIO_BANK.sounds))for(const r of records)totalBytes+=Math.ceil(r.duration*48000)*4;
 for(const family of ATTACHMENT_FOLEY_FAMILIES)for(const action of ATTACHMENT_FOLEY_ACTIONS){
  const key='attachment'+family+action,records=AUDIO_BANK.sounds[key];assert.equal(records?.length,2,key);
  assert(records.every(r=>r.duration<=.058&&r.pcmPeak<.92&&r.pcmRms>.001&&r.spectralCentroidHz>0));
  assert.notEqual(records[0].spectralCentroidHz,records[1].spectralCentroidHz,key+' takes');
  signatures.add(records.map(r=>Math.round(r.spectralCentroidHz)).join('/'));addedBytes+=records.reduce((n,r)=>n+Math.ceil(r.duration*48000)*4,0);
 }
 assert.equal(signatures.size,9);assert(addedBytes<220000);assert(totalBytes<40*1024*1024);
 for(const rate of [8000,44100,48000]){
  const buffers=buildAttachmentFoley({sampleRate:rate,createBuffer(ch,length,sampleRate){const samples=new Float32Array(length);return {duration:length/sampleRate,getChannelData:()=>samples};}});
  assert.equal(buffers.size,9);
  for(const [key,b] of buffers){const samples=b.getChannelData(0);assert(samples.every(Number.isFinite));assert(samples.some(v=>Math.abs(v)>.0001),key);assert(Math.abs(samples.at(-1))<.01);}
 }
});
