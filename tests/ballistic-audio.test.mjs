import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/js/engine.js';
import {Weapon} from '../dist/js/weapons.js';
import {traceBullet} from '../dist/js/ballistics.js';
import {ballisticContactAudio} from '../dist/js/ballistic-audio.js';
import {casingLanding} from '../dist/js/audio-library.js';
import {AudioSystem} from '../dist/js/audio.js';
import {AUDIO_BANK} from '../dist/js/audio-files.js';

function lane(){
 const g=new Game({}, {seed:617});g.actors=[g.player,g.actors[4]];g.arena.blocks=[];
 const p=g.player,target=g.actors[1];p.reset({x:0,y:0,z:0},0);target.reset({x:0,y:0,z:-8},0);
 p.spawnProtection=target.spawnProtection=0;p.weapons[0]=new Weapon(0);p.ads=1;g.random=()=>0;g.events=[];
 return {g,p,target};
}

test('verified penetration emits entry and exit cues without changing hit position or reduced damage',()=>{
 const {g,p,target}=lane();g.arena.box(0,1,-3,3,2,.12,'wood');g.arena.bakeCollision();
 const dir={x:0,y:0,z:-1},result=traceBullet(g.arena,g.actors,p,g.eye(p),dir,p.weapon);
 assert.equal(result.target,target);const before=JSON.stringify(result),cue=ballisticContactAudio(result.impacts[0],dir,0);
 assert.equal(JSON.stringify(result),before);assert.equal(cue.type,'penetration');
 assert(Math.abs(cue.position.z+2.94)<1e-8);assert(Math.abs(cue.exitPosition.z+3.06)<1e-8);
 assert(g.shoot(p));assert.equal(target.health,100-p.weapon.damage(result.t,result.part)*result.scale);
 assert.deepEqual(g.events.find(e=>e.type==='shot').end,result.end);
 assert.equal(g.events.filter(e=>e.type==='penetration').length,1);
 assert.equal(g.events.find(e=>e.type==='impact').audioCue,'penetration');
});

test('thick and embedded cover cannot emit a false penetration cue',()=>{
 const {g,p}=lane(),dir={x:0,y:0,z:-1};
 g.arena.box(0,1,-3,3,2,2,'wood',{shellThickness:.035});g.arena.box(0,1,-3,2,2,.1,'concrete');g.arena.bakeCollision();
 const result=traceBullet(g.arena,g.actors,p,g.eye(p),dir,p.weapon);assert(!result.impacts[0].penetrated);
 assert.equal(ballisticContactAudio(result.impacts[0],dir,0),null);g.shoot(p);
 assert.equal(g.events.filter(e=>e.type==='penetration').length,0);
});

test('only glancing hard terminal impacts get ricochet audio and no trajectory is reflected',()=>{
 const {g,p}=lane(),dir={x:Math.sqrt(.96),y:0,z:-.2};g.actors=[p];
 g.arena.box(10,1,-2,30,2,.1,'concrete');g.arena.bakeCollision();
 const result=traceBullet(g.arena,g.actors,p,g.eye(p),dir,p.weapon),before=JSON.stringify(result);
 const cue=ballisticContactAudio(result.impacts[0],dir,0);assert.equal(cue.type,'ricochet');assert(Math.abs(cue.incidence-.2)<1e-8);
 assert.equal(JSON.stringify(result),before);assert.equal(result.target,null);assert.deepEqual(cue.position,result.end);
 p.yaw=Math.atan2(dir.x,-dir.z);g.shoot(p);assert(g.events.some(e=>e.type==='ricochet'));
 const contact={block:{x:0,y:1,z:-3,w:2,h:2,d:.1,surface:'steel'},position:{x:0,y:1,z:-2.95},penetrated:false};
 assert.equal(ballisticContactAudio(contact,{x:0,y:0,z:-1},0),null);
 contact.block.surface='wood';assert.equal(ballisticContactAudio(contact,dir,0),null);
});

test('through-cover audio spatialises both endpoints and suppresses duplicate ordinary impacts',()=>{
 const audio=new AudioSystem({volume:1}),played=[];audio.play=(key,options)=>played.push({key,...options});
 const game={player:{x:0,y:0,z:0,yaw:0},arena:{visible:()=>false,indoors:()=>false}};
 const position={x:9,y:1.5,z:0},exitPosition={x:10,y:1.5,z:0};
 audio.events([{type:'impact',position,surface:'wood',audioCue:'penetration'},{type:'penetration',source:0,position,exitPosition,surface:'wood'}],game);
 assert.deepEqual(played.map(p=>p.key),['penetrationWood','penetrationWood']);
 assert(played.every(p=>p.occluded&&p.pan>.99&&!p.important));assert(played[1].distance>played[0].distance);
 assert(played[1].volume<played[0].volume);assert.equal(played[1].delay,.012);
 played.length=0;audio.events(Array.from({length:20},()=>({type:'ricochet',position,surface:'steel'})),game);
 assert.equal(played.length,3);assert(played.every(p=>p.key==='ricochetMetal'));
});

test('casing landing follows raised floor materials and skips revolver and melee ejection',()=>{
 const floor={x:1.5,y:.5,z:0,w:5,h:0,d:3,surface:'steel'},arena={floorAt:()=>.5,nearby:()=>[floor]};
 const shot={position:{x:0,y:2.16,z:0},yaw:0},def={kind:'RIFLE'};
 const landing=casingLanding(arena,shot,def);assert.equal(landing.surface,'Metal');assert.equal(landing.position.y,.5);
 assert(landing.delay>.4&&landing.delay<1.2);assert(landing.position.x>1);
 floor.surface='water';assert.equal(casingLanding(arena,shot,def).surface,'Water');
 assert.equal(casingLanding(arena,shot,{kind:'PISTOL',revolver:true}),null);
 assert.equal(casingLanding(arena,shot,{kind:'MELEE'}),null);
});

test('native delayed casing playback stays within ambient voice capacity and can yield to a player shot',()=>{
 const sources=[],node=()=>({gain:{value:1},playbackRate:{value:1},connect(){},disconnect(){},start(when){this.when=when;},stop(){this.stopped=true;}});
 const audio=new AudioSystem({volume:1});audio.context={currentTime:10,state:'running',createBufferSource:()=>{const n=node();sources.push(n);return n;},createGain:node};audio.master=node();
 audio.buffers.set('casingMetal',{});audio.buffers.set('shot0',{});
 for(let i=0;i<40;i++)audio.play('casingMetal',{delay:.8});assert.equal(audio.voices,16);assert.equal(sources.length,16);assert(sources.every(s=>s.when===10.8));
 for(let i=0;i<9;i++)audio.play('shot0',{important:true});assert.equal(audio.voices,24);assert(sources[0].stopped);
 for(const source of sources)source.onended();assert.equal(audio.voices,0);assert.equal(audio.active.size,0);
});

test('pause immediately frees scheduled contacts before suspending the audio clock',()=>{
 const sources=[],node=()=>({gain:{value:1},playbackRate:{value:1},connect(){},disconnect(){},start(){},stop(){this.stopped=true;}});
 const audio=new AudioSystem({volume:1});audio.context={currentTime:10,state:'running',suspend:()=>Promise.resolve(),createBufferSource:()=>{const n=node();sources.push(n);return n;},createGain:node};audio.master=node();audio.buffers.set('casingMetal',{});
 for(let i=0;i<16;i++)audio.play('casingMetal',{delay:1});audio.pause();
 assert.equal(audio.voices,0);assert.equal(audio.active.size,0);assert(sources.every(s=>s.stopped));
 for(const source of sources)source.onended();assert.equal(audio.voices,0);
});

test('all ballistic and landing material takes remain original and under the native mobile PCM allowance',()=>{
 for(const key of ['ricochetMetal','ricochetStone','penetrationMetal','penetrationWood','penetrationGlass','penetrationStone'])assert.equal(AUDIO_BANK.sounds[key]?.length,4,key);
 for(const surface of ['Hard','Metal','Wood','Soft','Water','Snow'])assert.equal(AUDIO_BANK.sounds['casing'+surface]?.length,3,surface);
 const decodedBytes=Object.values(AUDIO_BANK.sounds).flat().reduce((sum,r)=>sum+Math.ceil(r.duration*48000)*4,0);
 assert(decodedBytes<40*1024*1024,`48 kHz PCM is ${decodedBytes} bytes`);
});
