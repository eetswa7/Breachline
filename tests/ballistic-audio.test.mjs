import test from 'node:test';
import assert from 'node:assert/strict';
import {rayBox} from '../dist/js/math.js';
import {traceBullet,boxInterval} from '../dist/js/ballistics.js';
import {CasingFoley} from '../dist/js/ballistic-presentation.js';
import {AudioSystem} from '../dist/js/audio.js';
import {Weapon,WEAPONS} from '../dist/js/weapons.js';
import {AUDIO_BANK} from '../dist/js/audio-files.js';
import {Game} from '../dist/js/engine.js';

function arena(blocks){return {blocks,info:{groundSurface:'concrete'},nearby:()=>blocks,indoors:()=>false,visible:()=>true,
 trace(origin,dir,limit,ignore){let t=limit,block=null;for(const b of blocks){if(b.destroyed||b===ignore)continue;const hit=rayBox(origin,dir,b,t);if(hit!==null&&hit<t){t=hit;block=b;}}return {t,block};}};}
function scene(surface='concrete',height=0){
 const floor={x:0,y:height-.2,z:0,w:40,h:.4,d:40,surface,ground:true},player={id:0,x:0,y:height,z:0,yaw:0,weapon:new Weapon(0)};
 return {arena:arena([floor]),actors:[player],player,time:0};
}
function ejection(game,id=0){return {type:'shot',source:0,weapon:id,weaponDef:WEAPONS[id],position:{x:0,y:game.player.y+1.66,z:0}};}

test('grazing ricochet presentation is hard-surface gated and never adds a damage ray',()=>{
 const dir={x:Math.sqrt(1-.2**2),y:0,z:-.2},origin={x:0,y:1,z:0},weapon=new Weapon(0),wall={x:5,y:1,z:-2,w:20,h:2,d:.2,surface:'steel'};
 const world=arena([wall]);let traces=0,trace=world.trace;world.trace=(...args)=>{traces++;return trace(...args);};
 let result=traceBullet(world,[],{id:0},origin,dir,weapon,50);
 assert.equal(result.impacts[0].ricochet,true);assert.equal(result.target,null);assert.equal(traces,1);
 assert.deepEqual(result.impacts[0].normal,{x:0,y:0,z:1});assert(Math.abs(result.t-9.5)<1e-9);
 wall.surface='concrete';assert(traceBullet(world,[],{id:0},origin,dir,weapon,50).impacts[0].ricochet);
 for(const surface of ['wood','glass','plaster','water']){wall.surface=surface;assert.equal(traceBullet(world,[],{id:0},origin,dir,weapon,50).impacts[0].ricochet,false);}
 wall.surface='steel';wall.x=0;const frontal=traceBullet(world,[],{id:0},origin,{x:0,y:0,z:-1},weapon,50);assert.equal(frontal.impacts[0].ricochet,false);
 const inside=traceBullet(world,[],{id:0},{x:0,y:1,z:-2},dir,weapon,50);assert.equal(inside.impacts[0].ricochet,false);
});

test('penetration records the physical exit while retaining existing energy scaling',()=>{
 const wall={x:0,y:1,z:-3,w:3,h:2,d:.12,surface:'wood'},target={id:1,x:0,y:0,z:-8,height:1.78,dead:false};
 const result=traceBullet(arena([wall]),[target],{id:0},{x:0,y:1,z:0},{x:0,y:0,z:-1},new Weapon(0));
 assert.equal(result.target,target);assert.equal(result.impacts.length,1);assert(result.scale<1&&result.scale>0);
 const contact=result.impacts[0];assert(contact.penetrated);assert(!contact.ricochet);assert.deepEqual(contact.exitPosition,{x:0,y:1,z:-3.06});
 const interval=boxInterval({x:0,y:1,z:0},{x:0,y:0,z:-1},wall);assert.equal(interval.incidence,1);assert.deepEqual(interval.normal,{x:0,y:0,z:1});
});

test('casing first landing follows real raised supports and painted/wet finishes',()=>{
 for(const [surface,family]of [['concrete','Hard'],['steel','Metal'],['wood','Wood'],['snow','Snow'],['grass','Soft'],['gravel','Gravel']]){
  const game=scene(surface,2),pool=new CasingFoley(),landings=[];pool.update(game,e=>landings.push(e));pool.eject(ejection(game),game);
  for(let i=0;i<75;i++){game.time+=1/60;pool.update(game,e=>landings.push(e));}
  assert.equal(landings.length,1,surface);assert.equal(landings[0].surface,family);assert(Math.abs(landings[0].position.y-2)<1e-8);
  assert(pool.slots.every(s=>s.life<=0));
 }
 const game=scene(),pool=new CasingFoley(),landings=[];
 game.arena.visualFloorCells=new Map([['0/0',[{part:{x:2,y:.04,z:0,w:5,h:.04,d:3,mesh:'surface',surface:'water'}}]]]);
 pool.update(game,()=>{});pool.eject(ejection(game),game);
 for(let i=0;i<70;i++){game.time+=1/60;pool.update(game,e=>landings.push(e));}
 assert.equal(landings[0].surface,'Water');
});

test('casing foley respects pump/bolt/revolver actions, player pool priority and pause gaps',()=>{
 const game=scene(),pool=new CasingFoley();pool.update(game,()=>{});
 pool.eject(ejection(game,22),game);assert(pool.slots.every(s=>s.life<=0),'revolvers retain cases on firing');
 pool.eject(ejection(game,7),game);assert.equal(pool.slots.find(s=>s.life>0).delay,.3);
 pool.clear();pool.update(game,()=>{});pool.eject(ejection(game,5),game);assert.equal(pool.slots.find(s=>s.life>0).delay,.18);
 pool.clear();pool.update(game,()=>{});
 for(let i=0;i<100;i++)pool.eject({...ejection(game),source:1},game);
 assert.equal(pool.slots.filter(s=>s.life>0).length,32);
 pool.eject(ejection(game),game);assert(pool.slots.some(s=>s.life>0&&s.own));assert.equal(pool.slots.length,32);
 game.time+=1;pool.update(game,()=>assert.fail('stale landing'));assert(pool.slots.every(s=>s.life<=0));
 pool.eject(ejection(game,22),game,{revolver:true,count:6});assert.equal(pool.slots.filter(s=>s.life>0).length,6);
 pool.clear();assert(pool.slots.every(s=>s.life<=0));
});

test('casing pool clears on changed games/regressed clocks and respects rotated material footprints',()=>{
 const game=scene(),pool=new CasingFoley();pool.update(game,()=>{});pool.eject(ejection(game),game);
 const other=scene('wood');pool.update(other,()=>assert.fail('cross-match landing'));assert(pool.slots.every(s=>s.life<=0));
 pool.eject(ejection(other),other);other.time=-1;pool.update(other,()=>assert.fail('regressed-clock landing'));assert(pool.slots.every(s=>s.life<=0));
 const rotated={x:0,y:.04,z:0,w:.4,h:.04,d:5,mesh:'surface',surface:'wood',yaw:Math.PI/2};
 game.arena.visualFloorCells=new Map([['0/0',[{part:rotated}]]]);pool.clear();pool.update(game,()=>{});pool.eject(ejection(game),game);
 const landings=[];for(let i=0;i<70;i++){game.time+=1/60;pool.update(game,e=>landings.push(e));}
 assert.equal(landings[0].surface,'Wood');
 rotated.yaw=0;pool.clear();pool.update(game,()=>{});pool.eject(ejection(game),game);landings.length=0;
 for(let i=0;i<70;i++){game.time+=1/60;pool.update(game,e=>landings.push(e));}
 assert.equal(landings[0].surface,'Hard');
});

test('delayed cases follow moving action transforms and cancelled extraction emits no abandoned cases',()=>{
 const game=scene(),pool=new CasingFoley();game.player.weapon=new Weapon(7);pool.update(game,()=>{});pool.eject(ejection(game,7),game);
 for(let i=0;i<12;i++){game.player.x+=4.1/60;game.player.yaw=Math.PI/2;game.time+=1/60;pool.update(game,()=>{});}
 const slot=pool.slots.find(s=>s.life>0);assert(slot.delay>0);assert(Math.abs(slot.x-game.player.x)<1e-9);assert(Math.abs(slot.z-.23)<1e-9);
 game.player.weapon=new Weapon(0);game.time+=1/60;pool.update(game,()=>assert.fail('switched bolt action'));assert(pool.slots.every(s=>s.life<=0));
 game.player.weapon=new Weapon(22);game.player.weapon.ammo=0;game.player.weapon.reload();pool.eject({...ejection(game,22),reloadTime:2.6},game,{revolver:true,count:6});
 game.player.x+=1;game.time+=1/60;pool.update(game,()=>{});assert(pool.slots.filter(s=>s.life>0).every(s=>Math.abs(s.x-game.player.x)<1e-9));
 game.player.weapon.reloadLeft=0;game.time+=1/60;pool.update(game,()=>assert.fail('cancelled extraction'));assert(pool.slots.every(s=>s.life<=0));
});

test('shared game casing bodies freeze while paused and emit one landing without changing simulation randomness',()=>{
 const make=()=>{const g=new Game({}, {seed:676});g.actors=[g.player];g.player.reset({x:0,y:0,z:0},0);g.player.spawnProtection=0;
  g.arena=scene().arena;g.arena.floorAt=()=>0;g.arena.collides=()=>false;g.events.length=0;return g;};
 const game=make(),control=make();control.casingFoley.eject=()=>{};
 assert(game.shoot(game.player));assert(control.shoot(control.player));assert.equal(game.random(),control.random());
 const slot=game.casingFoley.slots.find(s=>s.life>0),snapshot={...slot};game.paused=true;game.update(1/30);assert.deepEqual(slot,snapshot);
 game.paused=false;for(let i=0;i<72;i++){game.update(1/60);control.update(1/60);}
 const landings=game.events.filter(e=>e.type==='casing');assert.equal(landings.length,1);assert.equal(landings[0].source,0);assert.equal(landings[0].surface,'Hard');
 assert.equal(game.random(),control.random());game.resetRound();assert(game.casingFoley.slots.every(s=>s.life<=0));
});

test('ballistic cues retain contact spatial filtering, room response and bounded incidental voices',()=>{
 const audio=new AudioSystem({volume:1}),played=[];audio.play=(key,options)=>played.push({key,...options});
 const game=scene();game.arena.visible=()=>false;game.arena.blocks.push({x:8,y:4,z:0,w:15,h:.2,d:15,roof:true});
 const impact={type:'impact',source:0,position:{x:9,y:1,z:0},surface:'steel',ricochet:true};
 audio.events([impact,{...impact,type:'ricochet'}, {...impact,type:'penetration',surface:'wood'}, {...impact,type:'casing',surface:'Metal'}],game);
 assert.deepEqual(played.map(p=>p.key),['ricochetMetal','penetrationWood','casingMetal']);
 for(const cue of played){assert(cue.occluded);assert(cue.volume<.2);assert(cue.pan>.99);assert.equal(cue.indoor,'hall');assert(!cue.important);}
 played.length=0;audio.events(Array.from({length:50},()=>({...impact,type:'ricochet'})),game);assert.equal(played.length,3);
});

test('new original contact bank covers every runtime family within the 48 kHz PCM budget',()=>{
 for(const type of ['ricochetMetal','ricochetStone','penetrationMetal','penetrationWood','penetrationGlass','penetrationPlaster',...['Hard','Gravel','Soft','Snow','Metal','Water','Wood'].map(s=>'casing'+s)]){
  assert.equal(AUDIO_BANK.sounds[type]?.length,4,type);
  for(const take of AUDIO_BANK.sounds[type]){assert(take.pcmRms>0&&take.pcmPeak<=.9);assert(take.duration<=.25);}
 }
 assert(Object.values(AUDIO_BANK.sounds).flat().reduce((sum,take)=>sum+Math.ceil(take.duration*48000)*4,0)<40*1024*1024);
});
