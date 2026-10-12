import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,emptyInput} from '../dist/js/engine.js';
import {Weapon} from '../dist/js/weapons.js';
import {traceBullet} from '../dist/js/ballistics.js';
import {AudioSystem} from '../dist/js/audio.js';
import {CASING_CAPACITY,casingSurface,ejectCasing,updateCasings} from '../dist/js/casing-foley.js';

function lane(){
 const g=new Game({}, {seed:61012});g.actors=[g.player,g.actors[4]];g.arena.blocks=[];g.arena.visualFloorCells=null;
 const p=g.player,t=g.actors[1];p.reset({x:0,y:0,z:0},0);t.reset({x:0,y:0,z:-8},0);p.spawnProtection=t.spawnProtection=0;
 p.weapons[0]=new Weapon(0);p.weapon.spread=()=>0;g.events.length=0;return {g,p,t};
}

test('actual cover exit emits one penetration cue and preserves reduced enemy damage and entry visuals',()=>{
 const {g,p,t}=lane();g.arena.box(0,1.5,-3,3,3,.12,'wood');g.arena.bakeCollision();
 const origin=g.eye(p),ray={x:0,y:0,z:-1},trace=traceBullet(g.arena,g.actors,p,origin,ray,p.weapon);
 const expected=p.weapon.damage(trace.t,trace.part)*trace.scale;
 assert.equal(trace.target,t);assert(g.shoot(p));assert(Math.abs(t.health-(100-expected))<1e-8);
 const entry=g.events.find(e=>e.type==='impact'),exit=g.events.find(e=>e.type==='penetration');
 assert(entry.penetrated&&entry.ballisticAudio);assert.equal(g.events.filter(e=>e.type==='penetration').length,1);
 assert.equal(exit.source,p.id);assert.equal(exit.surface,'wood');assert(Math.abs(exit.position.z+3.06)<1e-8);
 assert.equal(exit.entry,entry.position);assert.equal(exit.normal.z,-entry.normal.z);
 assert.equal(p.weapon.shotSerial,1);
});

test('only shallow hard-cover strikes create cosmetic ricochet cues; target damage and stopping distance stay unchanged',()=>{
 const {g,p,t}=lane();p.yaw=.18;g.arena.box(1.2,1.5,-7,.1,3,20,'steel');g.arena.bakeCollision();
 const dir={x:Math.sin(p.yaw),y:0,z:-Math.cos(p.yaw)},trace=traceBullet(g.arena,g.actors,p,g.eye(p),dir,p.weapon);
 assert.equal(trace.target,null);assert(!trace.impacts[0].penetrated);assert(g.shoot(p));
 const cue=g.events.find(e=>e.type==='ricochet');assert(cue);assert(cue.incidence<.32);
 assert.equal(t.health,100);assert.deepEqual(g.events.find(e=>e.type==='shot').end,trace.end);
 assert(g.events.find(e=>e.type==='impact').ballisticAudio);
 p.weapon.cooldown=0;g.events.length=0;g.arena.blocks[0].surface='wood';assert(g.shoot(p));assert(!g.events.some(e=>e.type==='ricochet'));
 const straight=lane();straight.g.arena.box(0,1.5,-3,3,3,.2,'steel');straight.g.arena.bakeCollision();straight.g.shoot(straight.p);
 assert(!straight.g.events.some(e=>e.type==='ricochet'));
});

test('cosmetic casing floor contacts select raised decks and authored puddles and emit only once',()=>{
 const events=[],ground={x:0,y:-.2,z:0,w:20,h:.4,d:20,surface:'concrete'},deck={x:0,y:1.8,z:0,w:8,h:.4,d:8,surface:'wood'};
 const arena={info:{groundSurface:'concrete'},nearby:()=>[ground,deck]},game={arena,casings:[],player:{id:0,x:0,z:0},emit:(type,data)=>events.push({type,...data})};
 const actor={id:0,x:0,z:0,yaw:0,vx:0,vz:0};ejectCasing(game,actor,new Weapon(0),{x:0,y:3.66,z:0});
 for(let i=0;i<100;i++)updateCasings(game,1/60);
 assert.equal(events.length,1);assert.equal(events[0].type,'casing');assert.equal(events[0].surface,'Wood');assert.equal(events[0].position.y,2);
 assert.equal(game.casings.length,0);
 const water={x:0,y:2.02,z:0,w:5,h:.02,d:5,surface:'water',mesh:'surface'};arena.visualFloorCells=new Map([['0/0',[{part:water}]]]);
 assert.equal(casingSurface(arena,{x:1,y:2,z:1},'wood'),'Water');water.destroyed=true;assert.equal(casingSurface(arena,{x:1,y:2,z:1},'wood'),'Wood');
});

test('case capacity preserves local shots, revolvers retain cases, pump/bolt delay ejection, and cosmetics do not consume simulation randomness',()=>{
 const {g,p}=lane(),same=lane().g,bot={id:2,x:0,z:0,yaw:0,vx:0,vz:0},origin=g.eye(p),w=p.weapon;
 for(let i=0;i<CASING_CAPACITY+20;i++)ejectCasing(g,bot,w,origin);assert.equal(g.casings.length,CASING_CAPACITY);
 ejectCasing(g,p,w,origin);assert.equal(g.casings.length,CASING_CAPACITY);assert(g.casings.some(c=>c.source===0));
 assert.equal(g.random(),same.random());
 g.casings.length=0;ejectCasing(g,p,new Weapon(22),origin);assert.equal(g.casings.length,0);
 ejectCasing(g,p,new Weapon(5),origin);assert.equal(g.casings[0].delay,.24);updateCasings(g,.1);assert(g.casings[0].delay>0);assert.equal(g.casings[0].y,origin.y-.15);
 g.casings.length=0;ejectCasing(g,p,new Weapon(7),origin);assert.equal(g.casings[0].delay,.30);
 g.paused=true;const before=JSON.stringify(g.casings);g.update(1/60,emptyInput());assert.equal(JSON.stringify(g.casings),before);
 g.resetRound();assert.equal(g.casings.length,0);
});

test('ballistic and casing sounds remain material-specific, occluded, directional, bounded and below player-shot priority',()=>{
 const audio=new AudioSystem({volume:1}),played=[];audio.play=(key,options)=>played.push({key,...options});
 const roof={x:8,y:4,z:0,w:6,h:.3,d:6,roof:true},game={player:{x:0,y:0,z:0,yaw:0},arena:{blocks:[roof],visible:()=>false}},position={x:8,y:1,z:0};
 const ricochet={type:'ricochet',source:2,surface:'steel',position},penetration={type:'penetration',source:2,surface:'wood',position};
 audio.events([{type:'impact',surface:'steel',position,ballisticAudio:true},ricochet,penetration,...Array.from({length:30},()=>({type:'casing',source:2,surface:'Metal',position,value:1}))],game);
 assert.deepEqual(played.map(p=>p.key),['ricochetMetal','penetrationWood','casingMetal','casingMetal','casingMetal']);
 assert(played.every(p=>p.occluded&&p.pan>.99&&p.indoor==='room'&&!p.important));assert(played[2].volume<played[0].volume);
 played.length=0;audio.events(Array.from({length:30},()=>ricochet),game);assert.equal(played.length,3);
 played.length=0;audio.events([{...ricochet,position:{x:45,y:0,z:0}},{type:'casing',source:2,surface:'Hard',position:{x:20,y:0,z:0}}],game);assert.equal(played.length,0);
 played.length=0;audio.events([{...penetration,source:0,position:{x:3,y:0,z:0}},{...penetration,source:0,position:{x:32,y:0,z:0}}],game);
 assert(played[1].occluded);assert(played[1].volume<played[0].volume*.25,'own distant exit must attenuate from the cover, not the muzzle');
});

test('new ballistic events have finite startup buffers before native library decoding',()=>{
 const audio=new AudioSystem({});audio.context={sampleRate:4000,createBuffer(c,n,r){const a=new Float32Array(n);return {getChannelData:()=>a};}};audio.build();
 for(const key of ['ricochetMetal','ricochetStone','penetrationMetal','penetrationStone','penetrationWood','penetrationGlass','casingHard','casingMetal','casingWood','casingSoft','casingWater']){
  const samples=audio.buffers.get(key)?.getChannelData(0);assert(samples?.length);assert(samples.every(Number.isFinite));assert(samples.some(n=>n!==0));
 }
});
