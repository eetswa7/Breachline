import test from 'node:test';
import assert from 'node:assert/strict';
import {Weapon,WEAPONS} from '../dist/js/weapons.js';
import {Game,emptyInput} from '../dist/js/engine.js';
import {AudioSystem} from '../dist/js/audio.js';
import {AUDIO_BANK} from '../dist/js/audio-files.js';

function reload(id,{empty=true,loadout={}}={}){
 const w=new Weapon(id,loadout);w.ammo=empty?0:w.capacity-1;assert(w.reload());return w;
}
function quietGame(id=0){
 const g=new Game({map:0},{seed:641}),p=g.player;g.actors=[p];p.weapons[0]=new Weapon(id);p.slot=0;g.events.length=0;return g;
}
function advance(g,seconds){for(let t=0;t<seconds;t+=1/120)g.update(Math.min(1/120,seconds-t));}
const cues=events=>events.filter(e=>e.type==='weaponFoley');

test('each reloadable rig crosses its actual components once with finite events and unchanged ammo timing',()=>{
 for(const def of WEAPONS){
  if(def.kind==='MELEE'){const w=new Weapon(def.id);w.ammo=0;assert(!w.reload());continue;}
  const w=reload(def.id),events=[],initialReserve=w.reserve;
  assert.equal(w.update(w.reloadTime*.17,e=>events.push(e)),false);assert.equal(w.ammo,0);
  assert.equal(w.update(w.reloadTime*.83+.00001,e=>events.push(e)),true);
  assert.equal(w.ammo,def.shellReload?1:w.capacity);assert.equal(w.reserve,initialReserve-w.ammo);
  assert(events.length>=3,def.name);assert(events.every(e=>e.weapon===def.id&&Number.isFinite(e.phase)&&e.cycle===0&&e.empty));
  assert.equal(new Set(events.map(e=>e.phase+'/'+e.cue+'/'+e.component)).size,events.length,def.name);
  assert(events.every((e,i)=>!i||e.phase>=events[i-1].phase),def.name);
  if(!def.shellReload){const total=events.length;w.update(100,e=>events.push(e));assert.equal(events.length,total,def.name);}
 }
});

test('empty-only actions distinguish held-open pistol slides from closed tactical actions',()=>{
 for(const def of WEAPONS.filter(d=>!d.shellReload&&!d.revolver&&d.kind!=='MELEE')){
  const tactical=reload(def.id,{empty:false}),normal=[];tactical.update(tactical.reloadTime+.01,e=>normal.push(e));
  assert(!normal.some(e=>e.component==='bolt'||e.component==='slide'),def.name);
  const empty=reload(def.id),events=[];empty.update(empty.reloadTime+.01,e=>events.push(e));
  const action=events.filter(e=>e.component==='bolt'||e.component==='slide');
  assert.deepEqual(action.map(e=>e.cue),def.kind==='PISTOL'?['close']:['open','close'],def.name);
 }
});

test('top-loader, feed covers/belt boxes, drums and revolver use their actual native families',()=>{
 const components=id=>{const w=reload(id),events=[];w.update(w.reloadTime+.01,e=>events.push(e));return events;};
 assert(components(4).filter(e=>e.cue==='seat').every(e=>e.component==='topMagazine'));
 for(const id of [9,27])assert.deepEqual(components(id).filter(e=>['coverOpen','feed','coverClose'].includes(e.cue)).map(e=>e.component),['feedCover','belt','feedCover']);
 assert(!components(20).some(e=>e.component==='feedCover'||e.component==='belt'),'Rampart reloads a drum, not a feed cover');
 assert.deepEqual(components(22).map(e=>[e.cue,e.component]),[['open','cylinder'],['chamberLoad','cylinder'],['cylinderClose','cylinder']]);
});

test('shell foley repeats per loaded round, stops on exhausted reserve and survives a large phase crossing',()=>{
 for(const id of [5,18]){
  const w=reload(id),events=[];w.reserve=2;
  for(let cycle=0;cycle<2;cycle++){
   assert(w.update(w.reloadTime+.05,e=>events.push(e)));assert.equal(w.ammo,cycle+1);
   assert.deepEqual(events.filter(e=>e.cycle===cycle).map(e=>e.cue),['retrieve','insert','seat']);
  }
  assert.equal(w.reloadLeft,0);assert.equal(w.reserve,0);w.update(10,e=>events.push(e));assert.equal(events.length,6);
 }
});

test('attachment reload speed scales crossings while existing reload duration and ammo conservation stay intact',()=>{
 for(const loadout of [{},{magazine:1},{magazine:3}]){
  const w=reload(0,{loadout}),events=[],expected=(WEAPONS[0].reload+.18)*w.modifiers.reload;
  assert.equal(w.reloadTime,expected);w.update(expected*.179,e=>events.push(e));assert.equal(events.length,0);
  w.update(expected*.002,e=>events.push(e));assert.deepEqual(events.map(e=>e.cue),['release']);assert.equal(w.ammo,0);
  w.update(expected,e=>events.push(e));assert.equal(w.ammo,w.capacity);assert.equal(w.reserve,w.capacity*4);
 }
});

test('real engine reload, dry-fire reload and nearby bot reloads emit spatial cue events',()=>{
 const g=quietGame(),p=g.player;p.weapon.ammo=0;
 g.update(1/120,{...emptyInput(),reload:true});advance(g,p.weapon.reloadTime+.02);
 assert(cues(g.events).length);assert(cues(g.events).every(e=>e.source===0&&Number.isFinite(e.position.y)));
 assert.equal(g.events.filter(e=>e.type==='reloadDone').length,1);
 const h=quietGame();h.player.weapon.ammo=0;assert(!h.shoot(h.player));advance(h,h.player.weapon.reloadTime+.02);assert(cues(h.events).length);
 const b=new Game({map:0},{seed:643}),bot=b.actors[1];b.actors=[b.player,bot];bot.weapon.ammo=0;bot.weapon.reload();advance(b,.8);
 assert(cues(b.events).some(e=>e.source===bot.id&&Number.isFinite(e.position.x)));
});

test('pause, swap cancellation, shell firing and death suppress remaining component cues',()=>{
 const g=quietGame(),w=g.player.weapon;w.ammo=0;w.reload();advance(g,.5);
 const before=cues(g.events).length,left=w.reloadLeft;g.paused=true;advance(g,1);assert.equal(w.reloadLeft,left);assert.equal(cues(g.events).length,before);
 g.paused=false;g.update(1/120,{...emptyInput(),swap:true});g.events.length=0;advance(g,3);assert.equal(cues(g.events).length,0);assert.equal(w.ammo,0);
 const shell=quietGame(5);shell.player.weapon.ammo=2;shell.player.weapon.reload();advance(shell,.2);assert(shell.shoot(shell.player));shell.events.length=0;advance(shell,1);assert.equal(cues(shell.events).length,0);
 const dead=quietGame();dead.player.weapon.ammo=0;dead.player.weapon.reload();dead.player.health=0;dead.player.respawnLeft=10;advance(dead,2);assert.equal(cues(dead.events).length,0);
 const killed=quietGame();killed.player.spawnProtection=0;killed.player.weapon.ammo=0;killed.player.weapon.reload();killed.damage(killed.player,200,null);assert(killed.events.some(e=>e.type==='weaponFoleyCancel'&&e.weapon===0));
});

test('component playback selects original clips with player priority, spatial occlusion and bounded remote voices',()=>{
 const audio=new AudioSystem({volume:1}),played=[];audio.play=(key,options)=>played.push({key,...options});
 const game={player:{x:0,y:0,z:0,yaw:0},arena:{visible:()=>false}},remote={type:'weaponFoley',weapon:9,cue:'feed',component:'belt',source:2,position:{x:9,y:1.5,z:0}},own={...remote,weapon:0,cue:'seat',source:0,position:{x:0,y:1.5,z:0}};
 audio.events([...Array.from({length:30},()=>remote),own],game);
 assert.equal(played.length,4);assert.equal(played[0].key,'reload9');assert(played[0].pan>.99&&played[0].occluded&&!played[0].important);assert.equal(played.at(-1).key,'seat0');assert(played.at(-1).important&&!played.at(-1).occluded);
 assert(played[0].volume<played.at(-1).volume);assert.deepEqual(played[0].region,[.38,.59]);
 played.length=0;audio.events([{...remote,position:{x:20,y:0,z:0}},{type:'reload',weapon:0},{type:'reloadDone',source:0,weapon:0}],game);assert.equal(played.length,0,'no distant foley, full reload bed or duplicate finish contact');
 for(const def of WEAPONS.filter(d=>d.kind!=='MELEE')){const w=reload(def.id),events=[];w.update(w.reloadTime+.01,e=>events.push({...e,type:'weaponFoley',source:0}));audio.events(events,game);}
 assert(played.every(e=>AUDIO_BANK.sounds[e.key]?.length),'every component uses existing original assets');
});

test('native buffer regions retain shared PCM, bounded sources, short envelopes and idempotent cleanup',()=>{
 const sources=[],nodes=[],node=()=>({gain:{value:1,setValueAtTime(value,time){this.calls??=[];this.calls.push(['set',value,time]);},linearRampToValueAtTime(value,time){this.calls.push(['ramp',value,time]);}},pan:{value:0},playbackRate:{value:1},connect(){},disconnect(){this.disconnected=true;},start(...args){this.startArgs=args;},stop(){this.stopped=true;}});
 const audio=new AudioSystem({volume:1});audio.context={state:'running',currentTime:12,createBufferSource(){const n=node();sources.push(n);return n;},createGain(){const n=node();nodes.push(n);return n;},createStereoPanner:node};audio.master=node();const buffer={duration:2};audio.buffers.set('reload0',buffer);
 for(let i=0;i<16;i++)audio.play('reload0',{region:[.50,.58]});for(let i=0;i<12;i++)audio.play('reload0',{important:true,region:[.095,.145]});
 assert.equal(audio.voices,24);assert.equal(audio.active.size,24);assert(sources[0].stopped);
 for(const source of sources){assert.equal(source.buffer,buffer);assert.equal(source.startArgs[0],0);assert(source.startArgs[1]>=0);assert(source.startArgs[2]<.2);assert(source.startArgs[1]+source.startArgs[2]<=buffer.duration);source.onended();source.onended();}
 assert.equal(audio.voices,0);assert.equal(audio.active.size,0);assert(nodes.every(n=>n.gain.calls.at(-1)[1]===0));assert.equal(audio.buffers.size,1,'regions allocate no decoded sample copies');
});

test('canceling component playback stops only its matching tails and rounds clear all foley',()=>{
 const sources=[],node=()=>({gain:{value:1},pan:{value:0},playbackRate:{value:1},connect(){},disconnect(){},start(){},stop(){this.stopped=true;}});
 const audio=new AudioSystem({volume:1});audio.context={state:'running',createBufferSource:()=>{const n=node();sources.push(n);return n;},createGain:node};audio.master=node();audio.buffers.set('reload0',{duration:2});audio.buffers.set('shot0',{});
 audio.play('reload0',{region:[.5,.58],group:'foley:0:0'});audio.play('reload0',{region:[.5,.58],group:'foley:2:0'});audio.play('shot0',{important:true});
 const game={player:{x:0,y:0,z:0,yaw:0},arena:{}};audio.events([{type:'weaponFoleyCancel',source:0,weapon:0}],game);
 assert(sources[0].stopped);assert(!sources[1].stopped&&!sources[2].stopped);assert.equal(audio.voices,2);sources[0].onended();assert.equal(audio.voices,2);
 audio.events([{type:'round'}],game);assert(sources[1].stopped);assert(!sources[2].stopped);assert.equal(audio.voices,1);sources[2].onended();assert.equal(audio.voices,0);
});

test('all startup fallback component regions contain audible finite contacts before the native decoder is ready',()=>{
 const audio=new AudioSystem({});audio.context={sampleRate:8000,createBuffer(c,n,rate){const samples=new Float32Array(n);return {duration:n/rate,getChannelData:()=>samples};}};audio.build();
 const game={player:{x:0,y:0,z:0,yaw:0},arena:{}},played=[];audio.play=(key,options)=>played.push({key,...options});
 for(const def of WEAPONS.filter(d=>d.kind!=='MELEE')){const w=reload(def.id),events=[];w.update(w.reloadTime+.01,e=>events.push({...e,type:'weaponFoley',source:0}));audio.events(events,game);}
 for(const cue of played){const buffer=audio.buffers.get(cue.key),samples=buffer.getChannelData(0),[start,end]=cue.region??[0,1],region=samples.subarray(Math.floor(start*samples.length),Math.ceil(end*samples.length));assert(region.every(Number.isFinite));assert(region.some(s=>Math.abs(s)>.0001),cue.key+' '+cue.region);}
});
