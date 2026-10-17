import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './renderer-fixture.mjs';
import * as THREE from '../dist/vendor/three.module.min.js';
import {worldMaterialVariationEligible} from '../dist/js/world-material-variation.js';
import {material} from '../dist/js/geometry.js';

const part=(surface,extra={})=>({x:2,y:0,z:5,w:8,h:.03,d:8,surface,...extra});
test('world variation selects isotropic finishes and preserves manufactured and gameplay artwork',()=>{
 for(const surface of ['concrete','plaster','stone','limestone','asphalt','dirt','sand','gravel','grass','moss','rock']){
  const p=part(surface);assert(worldMaterialVariationEligible(p,'world',material(p)),surface);
  assert(!worldMaterialVariationEligible(p,'weapon',material(p)));assert(!worldMaterialVariationEligible(p,'actor',material(p)));
 }
 for(const surface of ['steel','wood','glass','fabric','rubber','snow','bark','tiles']){
  const p=part(surface);assert(!worldMaterialVariationEligible(p,'world',material(p)),surface);
 }
 for(const extra of [{tile:8},{leaf:0},{blenderWind:true},{objectiveBanner:true},{productionRole:'painted_service_lane'},{emissive:1}]){
  const p=part('concrete',extra);assert(!worldMaterialVariationEligible(p,'world',material(p)));
 }
});
test('variation cannot leak into an ineligible surface sharing the same cached base material',()=>{
 const r=fixture(),concrete=r.makeMaterial(part('concrete',{tile:0}),'world');
 const painted=r.makeMaterial(part('white',{tile:0}),'world');
 assert.notEqual(concrete,painted);assert.notEqual(concrete.customProgramCacheKey(),painted.customProgramCacheKey());
 assert.equal(concrete.map,painted.map);assert.equal(concrete.normalMap,painted.normalMap);assert.equal(concrete.roughnessMap,painted.roughnessMap);
 assert.equal(concrete.userData.worldMaterialVariation.maxSamplesPerMap,2);assert(!painted.userData.worldMaterialVariation);
});
test('all three native PBR channels share the phase/blend and retain direct lighting and vertex glazing rules',()=>{
 const r=fixture();r.surfaceMaps[0].baked=true;
 const mat=r.makeMaterial(part('concrete',{tile:0,blenderVertexMaterial:true}),'world');
 const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};mat.onBeforeCompile(shader);
 assert(shader.fragmentShader.includes('worldMaterialSample(map,vMapUv)'));
 assert(shader.fragmentShader.includes('worldMaterialSample(normalMap,vNormalMapUv)'));
 assert(shader.fragmentShader.includes('worldMaterialSample(roughnessMap,vRoughnessMapUv)'));
 assert(shader.fragmentShader.includes('breachGlazing'));assert(shader.fragmentShader.includes('breachSmooth'));
 assert(shader.fragmentShader.includes('textureGrad(image,base+worldMaterialOffset(index),dx,dy)'));
 assert(shader.fragmentShader.includes('textureGrad(image,base+worldMaterialOffset(index+1.0),dx,dy)'));
 assert.equal(shader.uniforms.uWorldMaterialVariation,r.worldMaterialVariationEnabled);
 assert.equal(shader.uniforms.uWorldMaterialDetail,r.worldMaterialVariationDetail);
 assert(!shader.fragmentShader.includes('reflectedLight.directDiffuse*='));
});
test('adaptive quality switches detail through a shared uniform without geometry or shader rebuilding',()=>{
 const r=fixture(),mat=r.makeMaterial(part('concrete'),'world'),key=mat.customProgramCacheKey();
 r.quality='low';r.applyQuality();assert.equal(r.worldMaterialVariationDetail.value,0);
 r.quality='high';r.applyQuality();assert.equal(r.worldMaterialVariationDetail.value,1);
 assert.equal(mat.customProgramCacheKey(),key);assert.equal(r.materials.size,1);
});
