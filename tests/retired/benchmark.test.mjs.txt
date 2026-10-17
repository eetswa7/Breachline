import test from 'node:test';
import assert from 'node:assert/strict';
import {TimingStats,bounds,bucket} from '../dist/js/benchmark-stats.js';
import {LIMITS,browserInfo,BenchmarkRecorder} from '../dist/js/benchmark-recorder.js';
import {GraphicsProfiler} from '../dist/js/graphics-profiler.js';
import {BenchmarkStore} from '../dist/js/benchmark-store.js';
import {StressSequence,STRESS_SCENARIO} from '../dist/js/benchmark-stress.js';
import {Game} from '../dist/js/engine.js';
import {validateReport} from '../scripts/benchmark-validation.mjs';
import {fakeGame,graphics,render,makeRecorder,reportFixture} from './benchmark-fixture.mjs';

test('histograms report counted cadence and label percentile/1% estimates consistently',()=>{
 const s=new TimingStats();for(let i=0;i<990;i++)s.add(10);for(let i=0;i<10;i++)s.add(100);assert.equal(s.fps().average,91.743);assert.equal(s.fps().low_1_percent,10);assert(s.percentile(.99)>=10&&s.percentile(.99)<=10.125);assert.equal(s.max,100);assert.equal(s.count,1000);
 for(const v of [0,16.67,33.33,63.99,64,255.999,256,511,512,5000,100000]){const [lo,hi]=bounds(bucket(v));assert(v>=lo&&v<hi);}
});
test('a rAF timestamp before session creation is excluded rather than producing negative report times',()=>{
 const r=new BenchmarkRecorder({...makeRecorder(),now:100}),game=fakeGame();
 for(const now of [99,110,127])r.record({now,cpuMs:3,game,graphics,render});
 assert.equal(r.rawSeen,1);assert.equal(r.gpuTag(99),null);const report=r.report({now:127});assert.equal(report.timeline[0].start_ms,10);validateReport(report);
});
test('all gameplay frames include long spikes while warmup, pauses and resume gaps are separated',()=>{
 const r=makeRecorder(),game=fakeGame();for(let i=0;i<=1200;i++)r.record({now:i*1000/60,cpuMs:4,renderCpuMs:2,game,graphics,render});
 const before=r.rawSeen;r.pause('background');r.record({now:100000,cpuMs:4,game,graphics,render});assert.equal(r.rawSeen,before);r.observeEvents([{type:'explosion'},{type:'shot',source:0}],100600);r.record({now:100600,cpuMs:10,game,graphics,render});const report=r.report({now:100600});assert(report.summary.warmup.frame_time.count>=900);assert(report.summary.steady.frame_time.count>=300);assert.equal(report.summary.steady.frame_time.max_ms,600);assert.equal(report.spikes.length,1);assert.equal(report.conditions.find(c=>c.name==='explosion').stats.frame_time.count,1);assert.equal(report.availability.gpu.status,'unavailable');assert.equal(report.availability.js_heap.status,'unavailable');assert.equal(report.activity.player_shots,1);
});
test('resolution, cap and map changes create independent context statistics',()=>{
 const r=makeRecorder(),g=fakeGame();for(let i=0;i<2000;i++)r.record({now:i*16.67,cpuMs:3,game:g,graphics:i<1000?graphics:{...graphics,frame_cap:30,width:900,render_scale:.8},render});const g2=fakeGame();g2.config.map=1;g2.arena.info={...g2.arena.info,name:'test'};r.record({now:40000,cpuMs:3,game:g2,graphics,render});r.record({now:40017,cpuMs:3,game:g2,graphics,render});const report=r.report({now:40017});assert.equal(report.contexts.length,3);assert.equal(report.contexts[1].graphics.frame_cap,30);assert.equal(report.contexts[2].stats.warmup.frame_time.count,1);assert.equal(report.transitions.length,3);
});
test('two-hour recordings have bounded raw frames, windows, contexts, spikes and GPU storage',()=>{
 const r=makeRecorder(),game=fakeGame();for(let i=0;i<50000;i++)r.record({now:i*200,cpuMs:3,game,graphics:{...graphics,width:1200+i%100},render});assert(r.raw.length<=LIMITS.raw);assert(r.windows.length<=LIMITS.windows);assert(r.contexts.length<=LIMITS.contexts);assert(r.spikes.length<=LIMITS.spikes);assert(r.dropped.contexts>0);assert(r.dropped.spikes>0);assert.equal(r.rawSeen,49999);assert.equal(r.phaseStats[0].frame.count+r.phaseStats[1].frame.count,49999);
});
test('v1 validation rejects extra personal fields, malformed counts and unbounded arrays',()=>{
 const good=reportFixture();assert.equal(validateReport(good).schema,good.schema);for(const mutate of [r=>r.device_id='abc',r=>r.environment.email='x@example.com',r=>r.contexts[0].graphics.location='Sydney',r=>r.raw.seen++,r=>r.raw.samples=Array(4097).fill(r.raw.samples[0]),r=>r.session.id='../escape',r=>r.build.content_sha256=null]){const r=structuredClone(good);mutate(r);assert.throws(()=>validateReport(r));}
 const injection=structuredClone(good);injection.methodology.cpu='personal email';assert.equal(validateReport(injection).methodology.cpu,good.methodology.cpu);assert(!JSON.stringify(good).includes('Mozilla/'));
});
test('GPU samples carry the query issue context and disjoint queries never reach reports',()=>{
 let ready=false,disjoint=false;const ext={GPU_DISJOINT_EXT:1,TIME_ELAPSED_EXT:2},gl={QUERY_RESULT_AVAILABLE:3,QUERY_RESULT:4,getExtension:()=>ext,getParameter:()=>disjoint,createQuery:()=>({}),beginQuery(){},endQuery(){},deleteQuery(){},getQueryParameter(q,p){return p===3?ready:4000000;}};
 const p=new GraphicsProfiler(gl),got=[];let tag={context_id:1,phase:0};p.tagProvider=()=>({...tag});p.sampleListener=(ms,t)=>got.push([ms,t]);for(let i=0;i<12;i++){p.begin();p.end();}tag={context_id:2,phase:1};ready=true;p.begin();p.end();assert.equal(got.length,1);assert.deepEqual(got[0],[4,{context_id:1,phase:0}]);ready=false;for(let i=0;i<12;i++){p.begin();p.end();}disjoint=true;p.begin();ready=true;p.begin();assert.equal(got.length,1);assert.equal(p.queryTags.size,0);
});
test('local reports remain exportable after storage failure and session IDs are not overwritten',async()=>{
 const store=new BenchmarkStore(undefined),report=reportFixture();await store.open();await assert.rejects(store.saveReport(report));assert.equal((await store.list('report:')).length,1);assert.equal((await store.get('report:'+report.session.id)).report.session.id,report.session.id);
 const altered=structuredClone(report);altered.activity.shots++;await store.saveReport(altered);assert.equal((await store.get('report:'+report.session.id)).report.activity.shots,report.activity.shots);
 await store.remove('report:'+report.session.id);assert.equal((await store.list('report:')).length,0);
});
test('scripted input and visual workloads repeat without consuming simulation randomness',()=>{
 const a=new StressSequence(),b=new StressSequence(),ga=new Game({map:0},{seed:STRESS_SCENARIO.seed}),gb=new Game({map:0},{seed:STRESS_SCENARIO.seed});for(let i=0;i<10800;i++){assert.deepEqual(a.input(ga),b.input(gb));ga.events.length=0;gb.events.length=0;}assert(a.done);assert.equal(a.effectCounts.explosions,30);assert.equal(a.effectCounts.smokes,10);assert.equal(ga.random(),gb.random());assert.equal(ga.debug.god,false);assert.equal(ga.debug.ammo,false);assert.equal(ga.shots,0);
});
test('hardware model is unavailable and arbitrary browser user agent text is excluded',()=>{const info=browserInfo({userAgent:'Mozilla/5.0 (iPhone; user-specific-value) Version/26.1 Mobile Safari/605.1.15'});assert.equal(info.browser,'Safari');assert.equal(info.device_model.status,'unavailable');assert.equal(info.browser_version,'26.1');assert(!JSON.stringify(info).includes('user-specific-value'));});
