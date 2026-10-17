import {actorModel} from '../dist/js/geometry.js';
import {Game} from '../dist/js/engine.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {shadowDue,shadowBias} from '../dist/js/shadow-system.js';
import {QUALITY} from '../dist/js/graphics-quality.js';
import {fixture} from './renderer-fixture.mjs';
import * as THREE from '../dist/vendor/three.module.min.js';

test('shadow scheduling retains fractional time and delivers its selected cadence',()=>{
 for(const hz of [15,24,30]){const state={shadowClock:0};let updates=0;for(let i=0;i<600;i++)if(shadowDue(state,1/60,hz))updates++;
 assert(Math.abs(updates-hz*10)<=1,`${hz}: ${updates}`);}
 for(const q of Object.values(QUALITY))if(q.shadow){const b=shadowBias(q.shadow,q.shadowHalf);assert(b.normalBias<2*q.shadowHalf/q.shadow);assert(b.normalBias>=.006);}
});
test('weathering and thin-leaf lighting retain shared PBR passes and bounded shading',()=>{
 const r=fixture();const make=m=>{const s={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};m.onBeforeCompile(s);return s;};
 const wall=make(r.makeMaterial({surface:'concrete'},'world'));assert(wall.fragmentShader.includes('float breachDirt='));
 const leaf=make(r.makeMaterial({surface:'grass',leaf:0},'world'));assert(leaf.fragmentShader.includes('float leafBack='));assert(leaf.uniforms.uBreachLeafSun);
});


test('animated legs join at their knees, lift alternating feet and stay finite when crouched',()=>{
 const g=new Game({}, {seed:14}),a=g.actors[1];a.vx=3;a.vz=0;a.grounded=true;
 let lift=false;
 for(let i=0;i<120;i++){
  const p=actorModel(a,i/60);if(p[4].y>.1||p[5].y>.1)lift=true;
  for(const q of p)for(const k of ['x','y','z','pitch'])assert(Number.isFinite(q[k]??0));
  for(let leg=0;leg<2;leg++){
   const thigh=p[leg],shin=p[2+leg];
   const end=(q,sign)=>({x:q.x-Math.sin(q.roll)*sign*q.h/2,y:q.y+Math.cos(q.roll)*Math.cos(q.pitch)*sign*q.h/2,z:q.z+Math.cos(q.roll)*Math.sin(q.pitch)*sign*q.h/2});
   const kneeA=end(thigh,-1),kneeB=end(shin,1);
   assert(Math.hypot(kneeA.x-kneeB.x,kneeA.y-kneeB.y,kneeA.z-kneeB.z)<.002);
  }
 }
 assert(lift);a.vx=a.vz=0;for(let i=120;i<180;i++)actorModel(a,i/60);assert(a.renderParts[0].z<0,'knees bend toward the forward -Z axis');a.crouched=true;for(let i=180;i<210;i++)actorModel(a,i/60);assert(a.renderParts[6].y<.5);
});
