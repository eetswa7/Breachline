import test from 'node:test';
import assert from 'node:assert/strict';
import {framebufferSize,sceneryOcclusion} from '../dist/js/render-budget.js';
import {actorModel} from '../dist/js/geometry.js';
import {Game} from '../dist/js/engine.js';
import {angleDelta} from '../dist/js/math.js';
test('framebuffers obey pixel budgets and preserve landscape aspect',()=>{for(const [w,h]of [[844,390],[932,430],[1920,1080],[3840,2160]])for(const budget of [850000,1400000,2200000]){const s=framebufferSize(w,h,3,1,budget);assert(s.width*s.height<=budget);assert(Math.abs(s.width/s.height-w/h)<.01);}});
test('baked ambient attenuation keeps roofed props darker while emissive and foliage stay legible',()=>{const arena={indoors:()=>true},p={x:0,y:1,z:0,w:1,h:2,d:1};assert(sceneryOcclusion(p,arena)<1);assert.equal(sceneryOcclusion({...p,emissive:1},arena),1);assert.equal(sceneryOcclusion({...p,leaf:0},arena),1);});
test('bot stride stays continuous through speed changes, phase wrap and crouch blends',()=>{
 const a=new Game({}, {seed:71}).actors[1],control=new Game({}, {seed:71}).actors[1];
 for(const actor of [a,control]){actor.vx=3;actorModel(actor,100);actorModel(actor,100.016);}
 const phase=a.stride,feet=a.renderParts.slice(4,6).map(p=>({...p}));
 a.vx=4;actorModel(a,100.032);actorModel(control,100.032);
 const changedStep=angleDelta(phase,a.stride),steadyStep=angleDelta(phase,control.stride);
 assert(changedStep>0&&steadyStep>0,'both cycles advance instead of restarting on a speed change');
 assert(Math.abs(changedStep-steadyStep)<.04,'a speed change adds only a small increment over the existing cadence');
 for(let leg=0;leg<2;leg++){
  const p=a.renderParts[4+leg],before=feet[leg],steady=control.renderParts[4+leg];
  assert(Math.hypot(p.x-steady.x,p.y-steady.y,p.z-steady.z)<.03,'speed blending prevents a sudden foot target jump');
  assert(Math.hypot(p.x-before.x,p.y-before.y,p.z-before.z)<.15,'the visible foot displacement remains bounded in a 16ms frame');
 }
 a.stride=Math.PI*2-.04;actorModel(a,100.032);const wrapPhase=a.stride;
 actorModel(a,100.048);assert(a.stride<wrapPhase,'exercise the numerical phase wrap');
 assert(angleDelta(wrapPhase,a.stride)>0&&angleDelta(wrapPhase,a.stride)<.6,'wrapped angular travel remains a normal forward step');
 const chest=a.renderParts[7].y;a.crouched=true;actorModel(a,100.064);
 assert(a.animDuck>0&&a.animDuck<.12,'stance enters crouch gradually');assert(Math.abs(a.renderParts[7].y-chest)<.12,'the body does not snap to the completed crouch pose');
});
