import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCylinder,makeSphere} from '../dist/js/geometry.js';
import {tube} from '../dist/js/meshes.js';
import {fixture} from './renderer-fixture.mjs';
import {Arena} from '../dist/js/maps.js';
import * as THREE from '../dist/vendor/three.module.min.js';

test('curved primitives have continuous bounded UVs instead of per-segment repeats or a single texel',()=>{
 const c=makeCylinder(16);let sideSpan=0;
 for(let i=0;i<c.length;i+=24)if(Math.abs(c[i+4])<.1){const u=[c[i+6],c[i+14],c[i+22]];sideSpan=Math.max(sideSpan,Math.max(...u)-Math.min(...u));}
 assert(Math.abs(sideSpan-1/16)<1e-6);
 const s=makeSphere();assert(new Set(Array.from(s).filter((v,i)=>i%8===6)).size>10);
 const t=tube();for(let i=0;i<t.length;i+=24)if(Math.abs(t[i+4])<.1){const u=[t[i+6],t[i+14],t[i+22]];assert(Math.max(...u)-Math.min(...u)<.1);}
});
test('bevel face UV metrics remain constant across its rounded corners',()=>{
 const r=fixture(),g=r.geometry.bevel,u=g.getAttribute('breachUvU'),v=g.getAttribute('breachUvV'),perFace=u.count/6;
 for(let face=0;face<6;face++)for(let i=face*perFace;i<(face+1)*perFace;i++){
  assert.equal(u.getX(i),u.getX(face*perFace));assert.equal(u.getZ(i),u.getZ(face*perFace));assert.equal(v.getY(i),v.getY(face*perFace));
 }
 r.arena=new Arena(0);r.buildWorld();const m=r.worldBatches.find(b=>b.material.normalMap).material;
 const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};m.onBeforeCompile(shader);
 assert(shader.vertexShader.includes('attribute vec3 breachUvU'));assert(shader.fragmentShader.includes('roughness+(texelRoughness.g-.84)'));
});


test('hard weapon bevels keep a separate shader variant from soft gloves and cylindrical parts',()=>{
 const r=fixture(),base={x:0,y:0,z:0,w:.08,h:.09,d:.4,surface:'dark',mesh:'bevel',finishTile:0};
 const hard=r.makeMaterial(base,'weapon'),soft=r.makeMaterial({...base,finishTile:2,tile:9},'weapon');
 const cylinder=r.makeMaterial({...base,mesh:'cylinder'},'weapon');
 const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};hard.onBeforeCompile(shader);
 assert(shader.vertexShader.includes('breachRadius=min(.0025'));assert.notEqual(hard,cylinder);assert.notEqual(hard,soft);
});
