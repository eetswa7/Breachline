import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.min.js';
import {Arena,MAPS} from '../dist/js/maps.js';
import {bakeLightField,LightingField} from '../dist/js/lighting-field.js';
import {deriveSurfaceData,patchSurfaceDetail} from '../dist/js/material-detail.js';
import {environmentRadiance,interiorRadiance,roomProbeSelected,sampleCloud,sampleCloudColor} from '../dist/js/environment-probes.js';

test('every map bakes a bounded finite light field with room and exterior contrast',()=>{
 for(const info of MAPS){const a=new Arena(info.id),f=bakeLightField(a);assert.equal(f.data.byteLength,16384);assert(f.data.every(Number.isFinite));
  const sky=Array.from(f.data).filter((v,i)=>i%4===0);assert(Math.min(...sky)<120);assert(Math.max(...sky)>240);
 }
});
test('removing a roof rebakes sky visibility instead of retaining stale indoor shade',()=>{
 const roof={x:0,y:4,z:0,w:10,h:.3,d:10,roof:true},a={info:{size:8},blocks:[roof],decor:[]};
 const first=bakeLightField(a,8);roof.destroyed=true;const next=bakeLightField(a,8);
 assert(first.data[4*(4*8+4)]<120);assert.equal(next.data[4*(4*8+4)],255);
});
test('light field shader affects indirect light and preserves direct sunlight and albedo',()=>{
 const field=new LightingField(),shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
 field.patch(shader);assert(shader.vertexShader.includes('modelMatrix*instanceMatrix'));assert(shader.fragmentShader.includes('reflectedLight.indirectDiffuse'));
 assert(!shader.fragmentShader.includes('reflectedLight.directDiffuse*='));assert(shader.fragmentShader.includes('aboveRoof'));assert.equal(shader.uniforms.uBreachField,field.texture);
});
test('packed cavity/roughness/metalness data has neutral normals on a flat surface',()=>{
 const rgba=new Uint8ClampedArray(16*16*4).fill(128),d=deriveSurfaceData(rgba,16,true);
 for(let i=0;i<d.normal.length;i+=4){assert(Math.abs(d.normal[i]-127.5)<1);assert.equal(d.normal[i+2],255);assert.equal(d.orm[i],255);assert(d.orm[i+1]>180);}
 rgba[8*16*4+8*4]=0;const damaged=deriveSurfaceData(rgba,16,true);assert(damaged.orm[8*16*4+8*4]<255);
 const shader={fragmentShader:THREE.ShaderLib.standard.fragmentShader};patchSurfaceDetail(shader);assert(shader.fragmentShader.includes('metalnessFactor*=texelRoughness.b'));assert(!shader.fragmentShader.includes('texture2D( aoMap'));
});
test('original HDR reflection probes remain finite and put the sun above the horizon',()=>{
 for(const info of MAPS){const r=environmentRadiance(info,64,32);assert.equal(r.pixels.length,64*32*4);assert(r.pixels.every(v=>Number.isFinite(THREE.DataUtils.fromHalfFloat(v))));}
 const r=environmentRadiance({...MAPS[0],sun:[1,1,0]},256,128);let peak=0,at=0;
 for(let i=0;i<r.pixels.length;i+=4){const v=THREE.DataUtils.fromHalfFloat(r.pixels[i]);if(v>peak){peak=v;at=i/4;}}assert(peak>5);assert(Math.floor(at/256)>64);
});

test('destruction spreads light-field work across frames and uploads only a complete field',()=>{
 const roof={x:0,y:4,z:0,w:10,h:.3,d:10,roof:true},arena={info:{size:8},blocks:[roof],decor:[]};
 const field=new LightingField();field.setArena(arena);const texture=field.texture.value,old=texture.image.data;
 roof.destroyed=true;field.invalidate(arena);
 for(let i=0;i<31;i++){field.update();assert.equal(texture.image.data,old);}
 for(let i=0;i<256&&field.pending;i++)field.update();assert.equal(field.texture.value,texture);assert.notEqual(texture.image.data,old);assert.equal(field.pending,null);assert.equal(field.field.data[4*(32*64+32)],255);field.dispose();
});


test('doorway visibility produces indirect gradients and CPU lighting samples stay bounded',()=>{
 const roof={x:0,y:4,z:0,w:12,h:.3,d:12,roof:true};
 const arena={info:{size:10},blocks:[roof],decor:[],visible:(a,b)=>b.z>6};
 const f=new LightingField();f.setArena(arena);
 assert(f.sample({x:0,y:1.6,z:5})>f.sample({x:0,y:1.6,z:0}));
 assert.equal(f.sample({x:0,y:5,z:0}),1);
 for(let x=-20;x<20;x+=.5)assert(f.sample({x,y:1.6,z:0})>=0&&f.sample({x,y:1.6,z:0})<=1);
 f.dispose();
});


test('room reflection probe is bounded and selection has doorway hysteresis',()=>{
 const r=interiorRadiance();assert.equal(r.pixels.byteLength,256*128*8);
 for(const v of r.pixels)assert(Number.isFinite(THREE.DataUtils.fromHalfFloat(v)));
 assert.equal(roomProbeSelected(false,.5),false);assert.equal(roomProbeSelected(true,.5),true);
 assert.equal(roomProbeSelected(false,.3),true);assert.equal(roomProbeSelected(true,.8),false);
});


test('exterior ambient occlusion survives at eye height and only real roofs restore open sky above them',()=>{
 const arena={info:{size:10},blocks:[{x:0,y:3,z:0,w:2,h:6,d:10}],decor:[]};
 const f=new LightingField();f.setArena(arena);assert(f.sample({x:1.5,y:1.6,z:0})<.95);assert(f.sample({x:8,y:1.6,z:0})>.99);f.dispose();
});

test('opposite sides of an overhung wall retain exterior sky and interior shade',()=>{
 const roof={x:0,y:4,z:0,w:12,h:.3,d:12,roof:true};
 const arena={info:{size:10},blocks:[roof],decor:[],visible:()=>false};
 const field=new LightingField();field.setArena(arena);
 const wall={x:0,y:1.6,z:5.7};
 assert(field.sample(wall,{x:0,y:0,z:1})>.95,'the outward face sees open sky');
 assert(field.sample(wall,{x:0,y:0,z:-1})<.3,'the inward face keeps room shade');
 assert.equal(field.sample({x:0,y:5,z:0},{x:0,y:1,z:0}),1,'roof tops retain daylight');
 field.dispose();
});
test('cloud sampling joins at the sky seam and fades at the pole',()=>{
 const m={width:2,height:2,data:new Float32Array([.2,.9,.4,.8])};
 assert.equal(sampleCloud(m,0,.4),sampleCloud(m,1,.4));assert.equal(sampleCloud(m,.3,1),0);
 const sun=environmentRadiance(MAPS[0],64,32,m),grey=environmentRadiance(MAPS[1],64,32,m);assert.notDeepEqual(sun.pixels,grey.pixels);
});
test('authored cloud luminance survives sky conversion with a continuous wrap',()=>{
 const make=value=>({width:2,height:2,data:new Float32Array(4).fill(.9),rgba:new Uint8ClampedArray(16).fill(value)});
 const dark=make(50),bright=make(220);
 assert.deepEqual(sampleCloudColor(bright,0,.5),sampleCloudColor(bright,1,.5));
 const low=environmentRadiance(MAPS[1],64,32,dark),high=environmentRadiance(MAPS[1],64,32,bright);
 const index=(24*64+16)*4;
 assert(THREE.DataUtils.fromHalfFloat(high.pixels[index])>THREE.DataUtils.fromHalfFloat(low.pixels[index])+.15);
});
