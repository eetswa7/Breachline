import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {decodeASTC} from '../dist/js/production-textures.js';
import {PRODUCTION_ASSETS,PRODUCTION_FILES} from '../dist/js/production-files.js';
import {textureBytes} from '../dist/js/graphics-profiler.js';
import {ProductionLighting} from '../dist/js/production-lighting.js';
import {fixture} from './renderer-fixture.mjs';

test('every physical material has a full checked native ASTC mip chain and independent fallback',async()=>{
 assert.equal(PRODUCTION_ASSETS.surfaces.length,16);assert.equal(PRODUCTION_ASSETS.weapons.length,4);assert.equal(PRODUCTION_ASSETS.lightmaps.length,16);
 for(const spec of [...PRODUCTION_ASSETS.surfaces,...PRODUCTION_ASSETS.weapons])for(const map of Object.values(spec)){
  const encoded=Buffer.concat(await Promise.all(map.astc.map(p=>readFile('dist/assets/'+p)))),data=encoded.buffer.slice(encoded.byteOffset,encoded.byteOffset+encoded.byteLength),texture=decodeASTC(data);
  assert.equal(texture.mipmaps.at(-1).width,1);assert(texture.width>=1024);assert.equal(textureBytes([{isCompressedTexture:true,mipmaps:texture.mipmaps}]),encoded.length-12-4*texture.mipmaps.length);
  const fallback=Buffer.concat(await Promise.all(map.webp.map(p=>readFile('dist/assets/'+p))));assert.equal(fallback.toString('ascii',8,12),'WEBP');assert.equal(fallback.readUInt32LE(4)+8,fallback.length);
  const broken=data.slice(0,data.byteLength-1);assert.throws(()=>decodeASTC(broken),/Truncated/);
 }
});

test('all production segments match hashes and survive complete offline caching',async()=>{
 const manifest=JSON.parse(await readFile('dist/assets/production/manifest.json','utf8')),sw=await readFile('dist/sw.js','utf8');let total=0;
 for(const f of manifest.files){const data=await readFile('dist/assets/production/'+f.path);assert.equal(data.length,f.bytes);assert.equal(createHash('sha256').update(data).digest('hex'),f.sha256);total+=data.length;}
 assert.equal(total,manifest.downloadBytes);for(const file of PRODUCTION_FILES)assert(sw.includes(`'./assets/${file}'`),file);
});

test('map changes reuse GI uniform bindings and shader radiance remains distinct from Three lighting variables',()=>{
 const light=new ProductionLighting(),map={};light.setArena({info:{id:14,size:58}},Array.from({length:16},()=>map));
 const shader={uniforms:{},fragmentShader:'#include <lights_fragment_end>'};light.patch(shader);assert.equal(shader.uniforms.uProductionGI.value,map);assert(shader.fragmentShader.includes('productionIrradiance'));assert(!shader.fragmentShader.includes('vec3 irradiance='));
 light.setArena({info:{id:4,size:39}},null);assert.equal(shader.uniforms.uProductionGIEnabled.value,0);assert.equal(shader.uniforms.uProductionGISize.value,39);
});

test('distinct lighting interfaces cannot reuse a cached shader program',()=>{
 const renderer=fixture();
 const make=(category,extra={})=>renderer.makeMaterial({x:0,y:0,z:0,w:1,h:1,d:1,surface:'rubber',mesh:'cube',tile:-1,...extra},category);
 const keys=['world','actor','weapon'].map(category=>make(category).customProgramCacheKey());
 assert.equal(new Set(keys).size,3,'ground bounce, operator lighting and viewmodel shaders require separate programs');
 const ground=make('world',{surface:'concrete',tile:0,productionGround:true});
 const epoxy=make('world',{surface:'concrete',tile:0,productionGround:true,productionEpoxy:true});
 assert.notEqual(ground.customProgramCacheKey(),epoxy.customProgramCacheKey(),'the concrete and epoxy diffuse code must stay distinct');
});
