import * as THREE from '../vendor/three.module.min.js';
import {clamp} from './math.js?v=71';

// Pack occlusion, roughness and exposed-metal variation in the map already read
// for roughness. No separate AO/metallic samplers, no added full-screen passes.
export function deriveSurfaceData(data,size,hero=false){
  const normal=new Uint8Array(size*size*4),orm=new Uint8Array(size*size*4);
  const heights=new Float32Array(size*size);
  for(let i=0;i<heights.length;i++)heights[i]=(data[i*4]*.25+data[i*4+1]*.6+data[i*4+2]*.15)/255;
  const height=(x,y)=>heights[((y+size)%size)*size+(x+size)%size];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=(y*size+x)*4,h=height(x,y),left=height(x-1,y),right=height(x+1,y),up=height(x,y-1),down=height(x,y+1);
    // Fine texture normals fade naturally through mipmaps; never displace vertices.
    const dx=(left-right)*(hero?1.05:1.5),dy=(down-up)*(hero?1.05:1.5),length=Math.hypot(dx,dy,1);
    normal[i]=(dx/length*.5+.5)*255;normal[i+1]=(dy/length*.5+.5)*255;normal[i+2]=(1/length*.5+.5)*255;normal[i+3]=255;
    const cavity=clamp(((left+right+up+down)*.25-h)*2,0,.22);
    orm[i]=(1-cavity)*255;orm[i+1]=clamp((hero?.68:.77)+h*(hero?.31:.22),.55,1)*255;
    orm[i+2]=clamp(.9+h*.1-cavity*.15,.8,1)*255;orm[i+3]=255;
  }return {normal,orm};
}
export function detailMaps(canvas,hero=false){
  const size=canvas.width,{normal,orm}=deriveSurfaceData(canvas.getContext('2d').getImageData(0,0,size,size).data,size,hero);
  const n=new THREE.DataTexture(normal,size,size,THREE.RGBAFormat),r=new THREE.DataTexture(orm,size,size,THREE.RGBAFormat);
  n.flipY=r.flipY=true;
  for(const t of [n,r]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.needsUpdate=true;}
  return {normal:n,roughness:r};
}
export function patchSurfaceDetail(shader,baked=false,vertexMaterial=false,roughnessScale=1){
  // Normal-map specular AA reuses derivatives already evaluated by Three's
  // geometry roughness. No extra texture tap, history buffer or screen pass.
  const physical=THREE.ShaderChunk.lights_physical_fragment.replace('dFdx( nonPerturbedNormal )','dFdx( normal )').replace('dFdy( nonPerturbedNormal )','dFdy( normal )');
  shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_fragment>',physical);

  // Keep the authored material roughness as the centre, instead of making
  // every material shinier by multiplying it by a grey photograph.
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`float roughnessFactor=roughness;
    #ifdef USE_ROUGHNESSMAP
    vec4 texelRoughness=texture2D(roughnessMap,vRoughnessMapUv);
    roughnessFactor=clamp(${baked&&!vertexMaterial?`texelRoughness.g*${roughnessScale.toFixed(2)}`:`(roughness+(texelRoughness.g-${baked?'.75':'.84'})*.45)*${roughnessScale.toFixed(2)}`},.14,1.0);
    #endif`);

  shader.fragmentShader=shader.fragmentShader.replace('#include <metalnessmap_fragment>',`#include <metalnessmap_fragment>
    #ifdef USE_ROUGHNESSMAP
    metalnessFactor*=texelRoughness.b;
    #endif`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>',`#include <aomap_fragment>
    #ifdef USE_ROUGHNESSMAP
    reflectedLight.indirectDiffuse*=texelRoughness.r;
    reflectedLight.indirectSpecular*=mix(1.0,texelRoughness.r,.5);
    #endif`);
}
