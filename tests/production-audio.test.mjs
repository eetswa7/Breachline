import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {AUDIO_BANK,AUDIO_PARTS} from '../dist/js/audio-files.js';
import {WEAPONS} from '../dist/js/weapons.js';
import {AudioSystem} from '../dist/js/audio.js';
import {footstepSurface,roomAcoustics} from '../dist/js/audio-library.js';

test('original audio bank covers every weapon, suppression, reload action and surface',async()=>{
 const bytes=Buffer.concat(await Promise.all(AUDIO_PARTS.map(p=>readFile('dist/assets/'+p))));assert.equal(bytes.length,AUDIO_BANK.bytes);
 for(const w of WEAPONS)for(const key of ['shot','suppressed','reload','seat','rack'])assert(AUDIO_BANK.sounds[key+w.id]?.length,`${key} ${w.name}`);
 for(const key of ['stepHard','stepGravel','stepSoft','stepSnow','stepQuarry','stepMetal','stepWater','stepWood','impactMetal','impactStone','impactWood','impactGlass','impactWater','explosion'])assert(AUDIO_BANK.sounds[key]?.length>=4);
 for(const key of ['ricochetMetal','ricochetStone','penetrationMetal','penetrationStone','penetrationWood','penetrationGlass','casingHard','casingMetal','casingWood','casingSoft','casingWater'])assert.equal(AUDIO_BANK.sounds[key]?.length,4,key);
 let end=0;for(const records of Object.values(AUDIO_BANK.sounds))for(const s of records){assert.equal(s.offset,end);assert(s.bytes>100);assert.equal(bytes.toString('ascii',s.offset+4,s.offset+8),'ftyp');assert(s.duration>0&&s.pcmPeak<=.92&&s.pcmRms>0);end+=s.bytes;}
 assert.equal(end,bytes.length);
});

test('weapon production preserves suppression and individual voicing within the decoded memory budget',async()=>{
 const manifest=JSON.parse(await readFile('dist/assets/audio/manifest.json','utf8'));
 assert.equal(manifest.schema,2);assert.equal(manifest.originalDesign,true);
 const signatures=new Set();let decodedBytes=0;
 for(const records of Object.values(AUDIO_BANK.sounds))for(const record of records){
  decodedBytes+=Math.ceil(record.duration*48000)*4;
  assert(record.spectralCentroidHz>0&&record.spectralCentroidHz<16000);
 }
 assert(decodedBytes<40*1024*1024,'native 48 kHz PCM exceeds mobile audio allowance');
 for(const w of WEAPONS){
  const shot=AUDIO_BANK.sounds['shot'+w.id],suppressed=AUDIO_BANK.sounds['suppressed'+w.id];
  assert.equal(shot.length,4);assert.equal(suppressed.length,3);
  signatures.add(shot.map(s=>Math.round(s.spectralCentroidHz)).join('/'));
  if(w.kind==='MELEE')continue;
  const average=list=>list.reduce((sum,s)=>sum+s.attackRms,0)/list.length;
  assert(average(suppressed)<average(shot)*.7,`${w.name} suppression lost its quieter muzzle front`);
 }
 assert.equal(signatures.size,WEAPONS.length);
});

test('ready audio variations do not repeat, including when a native decoder fills a missing take',()=>{
 const sources=[],node=()=>({gain:{value:1},pan:{value:0},playbackRate:{value:1},connect(){},disconnect(){},start(){}});
 const audio=new AudioSystem({volume:1});audio.context={state:'running',createBufferSource:()=>{const n=node();sources.push(n);return n;},createGain:node};audio.master=node();
 const a={},b={},c={};audio.variations.set('stepWood',[a,,c]);
 for(let i=0;i<12;i++){audio.play('stepWood');sources.at(-1).onended();if(i===4)audio.variations.get('stepWood')[1]=b;}
 for(let i=1;i<sources.length;i++)assert.notEqual(sources[i].buffer,sources[i-1].buffer);
 assert.equal(audio.voices,0);assert.equal(audio.active.size,0);
});

test('player priority replaces an ambient tail at the 24-source cap and cleanup remains idempotent',()=>{
 const sources=[],node=()=>({gain:{value:1},playbackRate:{value:1},connect(){},disconnect(){},start(){},stop(){this.stopped=true;}});
 const audio=new AudioSystem({volume:1});audio.context={state:'running',createBufferSource:()=>{const n=node();sources.push(n);return n;},createGain:node};audio.master=node();audio.buffers.set('shot0',{});
 for(let i=0;i<16;i++)audio.play('shot0');for(let i=0;i<8;i++)audio.play('shot0',{important:true});
 assert.equal(audio.voices,24);audio.play('shot0',{important:true});assert.equal(audio.voices,24);assert(sources[0].stopped);
 sources[0].onended();assert.equal(audio.voices,24);for(const source of sources)source.onended();assert.equal(audio.voices,0);assert.equal(audio.active.size,0);
});

test('boot foley follows actual metal decks and puddles without changing collision',()=>{
 const steel={x:0,y:.5,z:0,w:5,h:.1,d:5,surface:'steel'},water={x:0,y:.51,z:0,w:2,h:.08,d:2,surface:'water'};
 const arena={nearby:()=>[steel,water]};assert.equal(footstepSurface(arena,{x:0,y:.55,z:0}),'Water');assert.equal(footstepSurface(arena,{x:2,y:.55,z:0}),'Metal');
 water.destroyed=true;assert.equal(footstepSurface(arena,{x:0,y:.55,z:0}),'Metal');
 steel.surface='wood';assert.equal(footstepSurface(arena,{x:0,y:.55,z:0}),'Wood');
});

test('occluded gunfire remains directional while losing high frequency and level',()=>{
 const audio=new AudioSystem({volume:1}),played=[];audio.play=(key,options)=>played.push({key,...options});
 const game={player:{x:0,y:0,z:0,yaw:0},arena:{visible:()=>false}};
 audio.events([{type:'shot',weapon:0,source:2,position:{x:9,y:1.5,z:0}},{type:'shot',weapon:0,source:0,position:{x:0,y:1.5,z:0}}],game);
 assert.equal(played[0].key,'shot0');assert(played[0].occluded);assert(played[0].pan>.99);assert(played[0].volume<played[1].volume*.5);assert(!played[1].occluded);assert(played[1].important);
});

test('room sound follows actual roof geometry and destruction while outdoor cues stay dry',()=>{
 const hall={x:0,y:5,z:0,w:24,h:.3,d:18,roof:true};
 const room={x:30,y:3,z:0,w:5,h:.3,d:4,roof:true};
 const arena={blocks:[hall,room],indoors:()=>false};
 assert.equal(roomAcoustics(arena,{x:0,y:1.6,z:0}),'hall');
 assert.equal(roomAcoustics(arena,{x:30,y:1.6,z:0}),'room');
 assert.equal(roomAcoustics(arena,{x:0,y:6,z:0}),null);
 assert.equal(roomAcoustics(arena,{x:20,y:1.6,z:0}),null);
 const audio=new AudioSystem({volume:1}),played=[];audio.play=(key,options)=>played.push(options);
 const game={player:{x:0,y:0,z:0,yaw:0},arena};
 audio.events([{type:'shot',weapon:0,source:2,position:{x:3,y:1.6,z:0}}],game);
 hall.destroyed=true;audio.events([{type:'shot',weapon:0,source:2,position:{x:3,y:1.6,z:0}}],game);
 assert.equal(played[0].indoor,'hall');assert(!played[1].indoor);
});

test('roof-selected acoustics follow rotated building footprints',()=>{
 const roof={x:0,y:4,z:0,w:18,h:.3,d:4,roof:true,yaw:Math.PI/2};
 const arena={blocks:[roof],indoors:()=>false};
 assert.equal(roomAcoustics(arena,{x:0,y:1.6,z:7}),'room');
 assert.equal(roomAcoustics(arena,{x:7,y:1.6,z:0}),null);
});
