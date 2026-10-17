import test from 'node:test';
import assert from 'node:assert/strict';
import {Weapon} from '../dist/js/weapons.js';
import {weaponModel,animateWeaponParts} from '../dist/js/weapon-models.js';
import {weaponPose,sightHeight} from '../dist/js/aim.js';
import {AudioSystem} from '../dist/js/audio.js';

test('top-loading magazine clears the receiver and empty pistols hold their slide back',()=>{
 const pdw=new Weapon(4),parts=weaponModel(pdw),mag=parts.find(p=>p.tag==='magazine');pdw.ammo=4;pdw.reload();pdw.reloadLeft=pdw.reloadTime*.6;animateWeaponParts(parts,pdw,{},0);assert(mag.y>mag.baseY+.12);
 for(const id of [10,11]){const w=new Weapon(id),model=weaponModel(w),slide=model.find(p=>p.tag==='slide');w.ammo=0;w.sinceShot=1;animateWeaponParts(model,w,{},0);assert(slide.z>slide.baseZ+.03);w.reload();w.update(w.reloadTime+.01);animateWeaponParts(model,w,{},0);assert.equal(slide.z,slide.baseZ);}
});
test('tactical reload preserves the closed action while an empty reload cycles it',()=>{
 const w=new Weapon(0),parts=weaponModel(w),bolt=parts.find(p=>p.tag==='bolt');w.ammo=6;w.reload();w.reloadLeft=w.reloadTime*.11;animateWeaponParts(parts,w,{},0);assert.equal(bolt.z,bolt.baseZ);
 w.reloadLeft=0;w.ammo=0;w.reload();w.reloadLeft=w.reloadTime*.11;animateWeaponParts(parts,w,{},0);assert(bolt.z>bolt.baseZ+.02);
});
test('reusable viewmodel poses keep fully aimed sights centred through movement',()=>{
 const p={weapon:new Weapon(0,{optic:1}),vx:0,vz:0,ads:1,sprinting:false,switchLeft:0,visualKick:0},out={};
 for(let frame=0;frame<120;frame++){p.vx=frame%2?4:0;assert.equal(weaponPose(p,frame/60,true,false,out),out);assert.equal(out.x,0);assert.equal(out.y,-sightHeight(p.weapon));assert.equal(out.roll,0);assert(Number.isFinite(out.z));}
 p.ads=0;p.vx=4;const a=weaponPose(p,2,true,false,{});p.vx=0;const b=weaponPose(p,2+1/60,true,false,{});assert(Math.abs(a.y-b.y)<.004,'stopping should not reverse the stride phase');
});
test('controlled bursts remain accurate and sustained recoil stays bounded',()=>{
 const w=new Weapon(0),grip=new Weapon(0,{handling:1,barrel:2}),initial=w.spread(1,false,false),recoil=w.recoil;
 w.shotIndex=100;w.sinceShot=.02;const sustained=w.spread(1,false,false);assert(sustained>initial);assert(w.recoil<recoil*1.25);grip.shotIndex=100;assert(grip.recoil<w.recoil*.6);
 w.update(.5);assert.equal(w.spread(1,false,false),initial);assert.equal(w.recoil,recoil);
});
test('bot gunfire leaves audio voices available for the player and hit confirmation',()=>{
 const node=()=>({gain:{value:1},pan:{value:0},playbackRate:{value:1},connect(){},disconnect(){},start(){}});
 const audio=new AudioSystem({volume:1,haptics:false});audio.context={state:'running',createBufferSource:node,createGain:node,createStereoPanner:node};audio.master=node();audio.buffers.set('shot0',{});audio.buffers.set('hit',{});
 const game={player:{x:0,y:0,z:0,yaw:0},arena:{}};
 audio.events(Array.from({length:24},()=>({type:'shot',source:1,weapon:0,position:{x:1,y:0,z:0}})),game);assert.equal(audio.voices,16);
 audio.events([{type:'shot',source:0,weapon:0},{type:'hit'}],game);assert.equal(audio.voices,18);
});
