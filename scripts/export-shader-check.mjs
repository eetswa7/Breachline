// Offline GLSL ES syntax/link input. This is not a WebGL runtime or image test.
import * as T from '../dist/vendor/three.module.min.js';
import {fixture} from '../tests/renderer-fixture.mjs';
import {Arena,MAPS} from '../dist/js/maps.js';
import {LightingField} from '../dist/js/lighting-field.js';
import {weaponModel} from '../dist/js/weapon-models.js';
import {Game} from '../dist/js/engine.js';
import {Weapon,WEAPONS} from '../dist/js/weapons.js';
import {readFile} from 'node:fs/promises';
import {decodeBlenderLibrary,parseBlenderGLB,BlenderAssets} from '../dist/js/blender-assets.js';
import {readRuntimeLibrary} from './asset-parts.mjs';
import {billboardVertex,billboardFragment} from '../dist/js/particles.js';
import {DecalSystem} from '../dist/js/decal-system.js';
import {shockVertex,shockFragment} from '../dist/js/explosion-shock.js';
import {fireVertex,fireFragment} from '../dist/js/environmental-fire.js';
const counts={NUM_DIR_LIGHTS:1,NUM_POINT_LIGHTS:3,NUM_SPOT_LIGHTS:0,NUM_HEMI_LIGHTS:1,NUM_RECT_AREA_LIGHTS:0,NUM_DIR_LIGHT_SHADOWS:1,NUM_POINT_LIGHT_SHADOWS:0,NUM_SPOT_LIGHT_SHADOWS:0,NUM_SPOT_LIGHT_MAPS:0,NUM_SPOT_LIGHT_COORDS:0,NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS:0,NUM_CLIPPING_PLANES:0,UNION_CLIPPING_PLANES:0};
function expand(s){return s.replace(/#include <([\w_]+)>/g,(_,key)=>{if(!T.ShaderChunk[key])throw Error(key);return expand(T.ShaderChunk[key]);});}
function finalise(s,lights){s=expand(s);for(const [k,v]of Object.entries(lights))s=s.replace(new RegExp('\\b'+k+'\\b','g'),String(v));return s.replace(/#pragma unroll_loop_start\s+for \( int i = (\d+); i < (\d+); i \+\+ \) \{([\s\S]+?)\}\s+#pragma unroll_loop_end/g,(_,a,b,body)=>Array.from({length:b-a},(_,i)=>body.replace(/\[\s*i\s*\]/g,'[ '+(Number(a)+i)+' ]').replace(/UNROLLED_LOOP_INDEX/g,String(Number(a)+i))).join(''));}
function shaderVariant(m,name,authored=false){
 const weapon=name.startsWith('weapon/'),lights={...counts,NUM_POINT_LIGHTS:weapon?2:3,NUM_DIR_LIGHT_SHADOWS:weapon?0:1};
 const lib=m.isMeshPhysicalMaterial?T.ShaderLib.physical:T.ShaderLib.standard,s={uniforms:{},vertexShader:lib.vertexShader,fragmentShader:lib.fragmentShader};m.onBeforeCompile(s);
 const defs=['USE_INSTANCING','USE_INSTANCING_COLOR',authored?'USE_COLOR_ALPHA':'USE_COLOR','DITHERING','USE_ENVMAP','ENVMAP_TYPE_CUBE_UV','TONE_MAPPING'];
 if(!weapon)defs.push('USE_SHADOWMAP','SHADOWMAP_TYPE_PCF_SOFT','USE_FOG');if(m.alphaToCoverage)defs.push('ALPHA_TO_COVERAGE');
 if(m.isMeshPhysicalMaterial)defs.push('PHYSICAL');
 if(m.map)defs.push('USE_MAP');if(m.normalMap)defs.push('USE_NORMALMAP','USE_NORMALMAP_TANGENTSPACE');if(m.roughnessMap)defs.push('USE_ROUGHNESSMAP');if(m.alphaTest)defs.push('USE_ALPHATEST');if(m.side===T.DoubleSide)defs.push('DOUBLE_SIDED');if(m.clearcoat)defs.push('USE_CLEARCOAT','IOR','PHYSICAL');
 const common='#version 300 es\nprecision highp float;precision highp int;precision highp sampler2D;precision highp samplerCube;\n'+defs.map(d=>'#define '+d).join('\n')+'\n#define HIGH_PRECISION\n#define MAP_UV uv\n#define NORMALMAP_UV uv\n#define ROUGHNESSMAP_UV uv\n#define CUBEUV_TEXEL_WIDTH 0.001488095\n#define CUBEUV_TEXEL_HEIGHT 0.001953125\n#define CUBEUV_MAX_MIP 7.0\n';
 const uniforms='uniform mat4 modelMatrix,modelViewMatrix,projectionMatrix,viewMatrix;uniform mat3 normalMatrix;uniform vec3 cameraPosition;uniform bool isOrthographic;\n';
 const vertex=common+'#define attribute in\n#define varying out\n'+uniforms+'in vec3 position,normal;in '+(authored?'vec4':'vec3')+' color;in vec2 uv;in mat4 instanceMatrix;in vec3 instanceColor;\n'+s.vertexShader;
 const fragment=common+'#define varying in\n#define texture2D texture\n#define textureCube texture\n#define texture2DGradEXT textureGrad\n#define texture2DLodEXT textureLod\n#define gl_FragColor breachOutput\nlayout(location=0) out vec4 breachOutput;\n'+uniforms+T.ShaderChunk.colorspace_pars_fragment+'\nvec4 linearToOutputTexel(vec4 value){return sRGBTransferOETF(value);}\n'+T.ShaderChunk.tonemapping_pars_fragment+'\nvec3 toneMapping(vec3 color){return ACESFilmicToneMapping(color);}\n'+s.fragmentShader;
 return {vertex:finalise(vertex,lights),fragment:finalise(fragment,lights)};
}
const unique=new Map();
if(!process.argv.includes('--effects-only')){
const data=await readRuntimeLibrary();
const manifest=JSON.parse(await readFile(new URL('../dist/assets/blender/manifest.json',import.meta.url),'utf8'));
const assets=new BlenderAssets(parseBlenderGLB(await decodeBlenderLibrary(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength))),manifest);
for(const authored of [false,true]){
 const r=fixture();if(authored){r.blenderAssets=assets;for(const maps of [...r.surfaceMaps,...r.weaponMaps])maps.baked=true;}r.lightingField=new LightingField();
 for(const m of MAPS){const g=new Game({map:m.id},{seed:718});r.arena=g.arena;r.buildWorld();r.updateActors(g);}
 for(const def of WEAPONS){
  const w=new Weapon(def.id),parts=weaponModel(w);
  for(const p of authored?[...assets.weaponGroups(parts,def.id),...parts.slice(parts.coreCount)]:parts)r.makeMaterial(p,'weapon');
 }
 r.makeMaterial({x:0,y:1,z:0,w:.6,h:.38,d:.025,surface:'white',tile:9,rough:.92,objectiveBanner:true},'actor');
 for(const [name,m]of r.materials){const s=shaderVariant(m,name,authored),key=s.vertex+s.fragment;if(!unique.has(key))unique.set(key,{name:(authored?'blender/':'legacy/')+name,...s});}
}
}
const decal=new DecalSystem(new T.Scene()),decalShader=shaderVariant(decal.mesh.material,'effects/material-impact');
unique.set('impact',{name:'effects/material-impact',...decalShader});decal.dispose();
if(process.argv.includes('--effects-only')){
 const r=fixture(),material=r.makeMaterial({surface:'concrete'},'world');
 unique.set('atmosphere',{name:'world/atmosphere',...shaderVariant(material,'world/atmosphere')});
}
const fxPrefix='#version 300 es\nprecision highp float;precision highp int;\nuniform mat4 modelViewMatrix,projectionMatrix,viewMatrix;\n';
const fx={
 vertex:finalise(fxPrefix+'#define attribute in\n#define varying out\nin vec3 position;in vec2 uv;\n'+billboardVertex,{}),
 fragment:finalise(fxPrefix+'#define varying in\n#define texture2D texture\n#define gl_FragColor breachOutput\n#define TONE_MAPPING\nlayout(location=0) out vec4 breachOutput;\n'+T.ShaderChunk.colorspace_pars_fragment+'\nvec4 linearToOutputTexel(vec4 value){return sRGBTransferOETF(value);}\n'+T.ShaderChunk.tonemapping_pars_fragment+'\nvec3 toneMapping(vec3 color){return ACESFilmicToneMapping(color);}\n'+billboardFragment,{})
};
unique.set('billboards',{name:'effects/instanced-billboards',...fx});
// Export the shipped Release 64 world-space programs too. Attribute declarations
// live in the shaders; this gate checks their expanded GLSL, not a substitute.
for(const [name,vertexShader,fragmentShader] of [
 ['effects/explosion-shock',shockVertex,shockFragment],
 ['effects/environmental-fire',fireVertex,fireFragment]
]){
 const vertex=finalise(fxPrefix+'#define attribute in\n#define varying out\nin vec3 position;in vec2 uv;\n'+vertexShader,{});
 const fragment=finalise(fxPrefix+'#define varying in\n#define gl_FragColor breachOutput\n#define TONE_MAPPING\nlayout(location=0) out vec4 breachOutput;\n'+T.ShaderChunk.colorspace_pars_fragment+'\nvec4 linearToOutputTexel(vec4 value){return sRGBTransferOETF(value);}\n'+T.ShaderChunk.tonemapping_pars_fragment+'\nvec3 toneMapping(vec3 color){return ACESFilmicToneMapping(color);}\n'+fragmentShader,{});
 unique.set(name,{name,vertex,fragment});
}
console.log(JSON.stringify([...unique.values()]));
