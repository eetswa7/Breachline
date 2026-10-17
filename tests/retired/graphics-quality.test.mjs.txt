import test from 'node:test';
import assert from 'node:assert/strict';
import {GraphicsQuality,QUALITY} from '../dist/js/graphics-quality.js';
import {GraphicsProfiler,textureBytes} from '../dist/js/graphics-profiler.js';
import {SaveStore} from '../dist/js/save.js';
const run=(q,seconds,elapsed=1/60,cpu=5,gpu=8)=>{for(let t=0;t<seconds;t+=elapsed)q.sample(elapsed,cpu,gpu);};
test('automatic graphics earns higher tiers with sustained measured gameplay headroom',()=>{
 const q=new GraphicsQuality();assert.equal(q.tier,'medium');run(q,22);assert.equal(q.tier,'high');run(q,28);assert.equal(q.tier,'ultra');assert.equal(q.scale,1);
});
test('Safari without GPU timings recovers resolution without guessing a higher detail tier',()=>{
 const q=new GraphicsQuality();run(q,120,1/60,3.7,null);assert.equal(q.tier,'medium');
 run(q,9,1/30,4,null);assert(q.scale<1);const reduced=q.scale;
 run(q,60,1/60,3.7,null);assert(q.scale>reduced);assert.equal(q.tier,'medium');
});
test('GPU overload lowers resolution then quality; CPU overload lowers scene cost',()=>{
 const gpu=new GraphicsQuality('ultra');run(gpu,8,1/30,5,28);assert(gpu.scale<1);run(gpu,45,1/30,5,28);assert.notEqual(gpu.tier,'ultra');
 const cpu=new GraphicsQuality('high');run(cpu,9,1/30,23,8);assert.notEqual(cpu.tier,'high');
});
test('pause, resume gaps and manual tiers cannot spuriously promote or collapse',()=>{
 const q=new GraphicsQuality('low');run(q,80);assert.equal(q.tier,'low');
 for(let i=0;i<500;i++){q.sample(1,40,40);q.sample(.1,40,40,false);}assert.equal(q.scale,1);
 assert.equal(Object.keys(QUALITY).length,4);q.reset('ultra');assert.equal(q.tier,'ultra');
});
test('unsupported GPU timer reports unavailable and texture accounting includes mipmaps',()=>{
 const p=new GraphicsProfiler({getExtension:()=>null});p.begin();p.end();assert.equal(p.gpuMs,null);
 p.record(5,1/60,true);assert.equal(p.cpuMs,5);p.dispose();
 const t={image:{width:512,height:512},generateMipmaps:true};assert.equal(textureBytes([t,t]),Math.ceil(512*512*4*4/3));
});
test('timer polling never waits for an unavailable query and rejects disjoint samples',()=>{
 let ready=false,disjoint=false,resultReads=0,deleted=0;
 const ext={GPU_DISJOINT_EXT:1,TIME_ELAPSED_EXT:2},gl={QUERY_RESULT_AVAILABLE:3,QUERY_RESULT:4,getExtension:()=>ext,getParameter:()=>disjoint,createQuery:()=>({}),beginQuery(){},endQuery(){},deleteQuery(){deleted++;},getQueryParameter(q,p){if(p===3)return ready;resultReads++;return 12000000;}};
 const p=new GraphicsProfiler(gl);for(let i=0;i<24;i++){p.begin();p.end();}assert.equal(resultReads,0);assert.equal(p.pending.length,2);
 ready=true;p.begin();p.end();assert.equal(p.gpuMs,12);disjoint=true;p.begin();assert.equal(p.gpuMs,null);assert(deleted>=2);
});
