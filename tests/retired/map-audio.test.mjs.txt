import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioSystem} from '../dist/js/audio.js';

test('Frostline and Iron Quarry footsteps use authored outdoor foley and hard interiors',()=>{
 const audio=new AudioSystem({volume:1}),played=[];audio.play=(key,options)=>played.push({key,options});
 const step={type:'step',source:2,position:{x:3,y:0,z:0},value:1};
 const game=(id,tag,inside)=>({player:{x:0,y:0,z:0,yaw:0},arena:{info:{id,tag},indoors:()=>inside}});
 audio.events([step],game(8,'ALPINE',false));audio.events([step],game(9,'QUARRY',false));
 audio.events([step],game(8,'ALPINE',true));audio.events([step],game(7,'FOREST BASE',false));
 assert.deepEqual(played.map(x=>x.key),['stepSnow','stepQuarry','stepHard','stepSoft']);
 assert(played.every(x=>x.options.distance===3&&Number.isFinite(x.options.pan)));
});

test('landing uses heavier surface foley with local impact feedback',()=>{
 const audio=new AudioSystem({volume:1}),played=[],vibrations=[];audio.play=(key,options)=>played.push({key,options});audio.haptic=ms=>vibrations.push(ms);
 const game={player:{x:0,y:0,z:0,yaw:0},arena:{info:{id:8,tag:'ALPINE'},indoors:()=>false}},position={x:0,y:0,z:0};
 audio.events([{type:'step',source:0,position,value:.6},{type:'land',source:0,position,value:.6}],game);
 assert.deepEqual(played.map(p=>p.key),['stepSnow','stepSnow']);assert(played[1].options.volume>played[0].options.volume*2);
 assert(played[1].options.rate<played[0].options.rate);assert(played[1].options.important);assert.deepEqual(vibrations,[15]);
});
