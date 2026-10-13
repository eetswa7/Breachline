import * as THREE from '../vendor/three.module.min.js';

// Randomise isotropic finishes, never manufactured seams/grain, hero artwork,
// alpha foliage or painted machinery. The three PBR maps remain registered.
const surfaces=new Set(['concrete','plaster','stone','limestone','asphalt','dirt','sand','gravel','grass','moss','rock']);
const tiles=new Set([0,1,2,4,5,6,7,12,13,15]);
export function worldMaterialVariationEligible(part,category,desc){
 return category==='world'&&surfaces.has(part.surface)&&tiles.has(Math.round(desc.pattern-1))&&
  part.leaf===undefined&&!part.blenderWind&&!part.objectiveBanner&&
  part.productionRole!=='painted_service_lane'&&!(desc.emissive>0);
}

export function patchWorldMaterialVariation(shader,enabled,detail){
 shader.uniforms.uWorldMaterialVariation=enabled;
 shader.uniforms.uWorldMaterialDetail=detail;
 shader.vertexShader='varying vec2 vWorldMaterialPhase;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
  #ifdef USE_INSTANCING
  vec3 materialOrigin=instanceMatrix[3].xyz;
  #else
  vec3 materialOrigin=modelMatrix[3].xyz;
  #endif
  // Constant on an instance, and independent of camera/time/gameplay RNG.
  vec3 materialSeed=fract(materialOrigin*.1031);
  materialSeed+=dot(materialSeed,materialSeed.yzx+33.33);
  vWorldMaterialPhase=fract((materialSeed.xx+materialSeed.yz)*materialSeed.zy);
 `);
 shader.fragmentShader=`varying vec2 vWorldMaterialPhase;
 uniform float uWorldMaterialVariation,uWorldMaterialDetail;
 float worldMaterialHash(vec2 p){
  vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);
  return fract((q.x+q.y)*q.z);
 }
 float worldMaterialNoise(vec2 p){
  vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(worldMaterialHash(i),worldMaterialHash(i+vec2(1,0)),f.x),
   mix(worldMaterialHash(i+vec2(0,1)),worldMaterialHash(i+vec2(1,1)),f.x),f.y);
 }
 vec2 worldMaterialOffset(float index){
  return vec2(worldMaterialHash(vec2(index,17.0)),worldMaterialHash(vec2(index,43.0)))*7.0;
 }
 vec4 worldMaterialSample(sampler2D image,vec2 uv){
  // Derivatives come from the original metric UV. Random offset transitions
  // must not select blurry mip levels or introduce minification seams.
  vec2 dx=dFdx(uv),dy=dFdy(uv);
  if(uWorldMaterialVariation<.5)return texture2D(image,uv);
  vec2 base=uv+vWorldMaterialPhase;
  if(uWorldMaterialDetail<.5)return textureGrad(image,base,dx,dy);
  float cell=worldMaterialNoise(base*.19)*8.0,index=floor(cell);
  float blend=smoothstep(.2,.8,fract(cell));
  // At an index boundary B becomes the next A, making the blend continuous.
  // Translation preserves tangent-space normals; rotation/mirroring would not.
  return mix(textureGrad(image,base+worldMaterialOffset(index),dx,dy),
   textureGrad(image,base+worldMaterialOffset(index+1.0),dx,dy),blend);
 }
 `+shader.fragmentShader;
 // Expand only these chunks. Existing calibrated native paint/ORM overrides
 // stay intact; no added sampler, map, light, draw or full-screen pass.
 for(const chunk of ['map_fragment','normal_fragment_maps'])shader.fragmentShader=shader.fragmentShader.replace(`#include <${chunk}>`,THREE.ShaderChunk[chunk]);
 shader.fragmentShader=shader.fragmentShader
  .replace(/texture2D\(\s*map\s*,\s*vMapUv\s*\)/g,'worldMaterialSample(map,vMapUv)')
  .replace(/texture2D\(\s*normalMap\s*,\s*vNormalMapUv\s*\)/g,'worldMaterialSample(normalMap,vNormalMapUv)')
  .replace(/texture2D\(\s*roughnessMap\s*,\s*vRoughnessMapUv\s*\)/g,'worldMaterialSample(roughnessMap,vRoughnessMapUv)');
}
