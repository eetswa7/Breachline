import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {makeRecorder,fakeGame,graphics,render,reportFixture} from './benchmark-fixture.mjs';
import {validateReport} from '../scripts/benchmark-validation.mjs';

test('long intervals retain preceding submission and current callback separately after reservoir replacement',()=>{
 const r=makeRecorder(),game=fakeGame();
 r.record({now:0,cpuMs:1096,renderCpuMs:1095,game,graphics,render:{...render,shadow_draw_calls:155,shader_programs:32}});
 r.record({now:1107,cpuMs:3,renderCpuMs:2,game,graphics,render:{...render,shadow_draw_calls:0,shader_programs:33}});
 for(let i=1;i<12000;i++)r.record({now:1107+i*17,cpuMs:2,renderCpuMs:1,game,graphics,render});
 // The raw reservoir can lose either observation independently.
 r.raw=r.raw.filter(row=>row[0]!==1107);
 const report=validateReport(r.report({now:205107})),spike=report.spikes[0];
 assert.equal(spike.frame_ms,1107);assert.equal(spike.frames.preceding.elapsed_ms,0);
 assert.equal(spike.frames.preceding.cpu_render_ms,1095);assert.equal(spike.frames.preceding.shadow_draw_calls,155);
 assert.equal(spike.frames.current.cpu_render_ms,2);assert.equal(spike.frames.current.shader_programs,33);
 assert.equal(spike.frames.current.elapsed_ms,1107);
});

test('spike evidence preserves both graphics contexts and never bridges pauses or match loading',()=>{
 const r=makeRecorder(),game=fakeGame(),record=(now,g=graphics)=>r.record({now,cpuMs:3,renderCpuMs:2,game,graphics:g,render});
 record(0);record(100,{...graphics,width:900});
 assert.equal(r.spikes[0].frames.preceding.context_id,0);assert.equal(r.spikes[0].frames.current.context_id,1);
 r.pause();record(10000);record(10017);
 assert.equal(r.spikes.length,1);validateReport(r.report({now:10017}));
});

test('optional spike observations are strict numeric records and old v1 reports still validate',async()=>{
 const old=JSON.parse(await readFile('benchmarks/iphone-release60-2026-10-06.json','utf8'));
 assert.equal(validateReport(old).spikes[1].frame_ms,1107);
 const r=makeRecorder(),game=fakeGame();
 r.record({now:0,cpuMs:3,game,graphics,render});r.record({now:100,cpuMs:3,game,graphics,render});
 const report=r.report({now:100});validateReport(report);
 for(const mutate of [v=>v.spikes[0].frames.preceding.email='personal',v=>v.spikes[0].frames.current.shadow_draw_calls=-1,v=>v.spikes[0].frames.current.elapsed_ms=90]){
  const v=structuredClone(report);mutate(v);assert.throws(()=>validateReport(v));
 }
 assert.equal(validateReport(reportFixture()).schema,old.schema);
});
