import {BENCHMARK_SCHEMA,LIMITS,RAW_COLUMNS,CONDITIONS} from '../dist/js/benchmark-recorder.js';
import {BENCHMARK_METHODOLOGY} from '../dist/js/benchmark-methodology.js';
import {STRESS_SCENARIO} from '../dist/js/benchmark-stress.js';
import {MAPS} from '../dist/js/maps.js';
import {MODES} from '../dist/js/modes.js';

const fail=path=>{throw new Error(`Invalid benchmark field: ${path}`);};
const number=(min=0,max=1e12)=>(v,p)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)fail(p);return v;};
const integer=(min=0,max=1e9)=>(v,p)=>{number(min,max)(v,p);if(!Number.isInteger(v))fail(p);return v;};
const boolean=(v,p)=>{if(typeof v!=='boolean')fail(p);return v;};
const string=(regex,max=200)=>(v,p)=>{if(typeof v!=='string'||v.length>max||!regex.test(v))fail(p);return v;};
const enumeration=values=>(v,p)=>{if(!values.includes(v))fail(p);return v;};
const nullable=spec=>(v,p)=>v===null?null:spec(v,p);
const array=(spec,max,min=0)=>(v,p)=>{if(!Array.isArray(v)||v.length<min||v.length>max)fail(p);return v.map((x,i)=>spec(x,`${p}[${i}]`));};
const tuple=specs=>(v,p)=>{if(!Array.isArray(v)||v.length!==specs.length)fail(p);return specs.map((s,i)=>s(v[i],`${p}[${i}]`));};
const object=(specs,optional=[])=>(v,p)=>{if(!v||typeof v!=='object'||Array.isArray(v))fail(p);for(const k of Object.keys(v))if(!Object.hasOwn(specs,k))fail(`${p}.${k}`);const result={};for(const [k,s]of Object.entries(specs)){if(!Object.hasOwn(v,k)){if(optional.includes(k))continue;fail(`${p}.${k}`);}result[k]=s(v[k],`${p}.${k}`);}return result;};
const numeric=number(),timing=nullable(number()),count=integer(),contextID=integer(-1,63),phase=enumeration([0,1]);
const status=object({status:enumeration(['measured','estimate','unavailable'])});
const timingStats=object({count,mean_ms:timing,min_ms:timing,max_ms:timing,p50_ms:timing,p90_ms:timing,p95_ms:timing,p99_ms:timing,histogram:array(tuple([integer(0,1039),count,numeric]),1040)},['histogram']);
const fps=object({average:timing,median:timing,low_1_percent:timing});
const summarySpecs={fps,frame_time:timingStats,cpu_frame:timingStats,cpu_render:timingStats,gpu:timingStats,spikes:count,stutters:count};
const summary=object(summarySpecs),phased=object({warmup:summary,steady:summary});
const difficulty=enumeration(['recruit','regular','veteran']);
const graphics=object({requested_quality:enumeration(['auto','low','medium','high','ultra']),effective_quality:enumeration(['low','medium','high','ultra','compatibility','unavailable']),frame_cap:enumeration([30,60]),effective_frame_cap:enumeration([30,60]),render_scale:number(.1,2),width:integer(0,20000),height:integer(0,20000),device_pixel_ratio:number(.1,10),fov:number(1,180),camera_motion:boolean,dynamic_resolution:boolean,reason:nullable(enumeration(['Measuring gameplay','Reducing pixel cost','Recovering resolution','Measured headroom','Reducing scene cost','Minimum scene cost']))},['effective_frame_cap']);
const memory=object({status:enumeration(['estimate','unavailable']),js_heap_used_bytes:nullable(numeric),js_heap_limit_bytes:nullable(numeric)});
const loadout=object({primary:integer(0,100),secondary:integer(0,100),optic:integer(0,20),barrel:integer(0,20),handling:integer(0,20),magazine:integer(0,20),ammo:integer(0,20),equipment:enumeration(['frag','smoke','flash'])});
const scenario=nullable(object({id:enumeration([STRESS_SCENARIO.id]),seed:enumeration([STRESS_SCENARIO.seed]),duration_simulation_seconds:enumeration([180]),mode:enumeration(['tdm']),phases:(v,p)=>{if(JSON.stringify(v)!==JSON.stringify(STRESS_SCENARIO.phases))fail(p);return STRESS_SCENARIO.phases;},effects:()=>STRESS_SCENARIO.effects,map:integer(0,MAPS.length-1),difficulty,loadout,completed:boolean,simulation_ticks:integer(0,10800),effect_counts:object({shots:count,explosions:count,smokes:count})},['completed','simulation_ticks','effect_counts']));
const sha=string(/^[a-f0-9]{40}$/,40),digest=string(/^[a-f0-9]{64}$/,64),iso=string(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,24);
const genericRenderer=(v,p)=>{nullable(string(/^[a-zA-Z0-9 .()_\/-]+$/,100))(v,p);return v;};
const renderSample=object({elapsed_ms:numeric,context_id:contextID,alive_players:integer(0,100),alive_bots:integer(0,99),indoors:boolean,grenades:integer(0,100),smokes:integer(0,100),weapon:integer(0,100),draw_calls:nullable(count),canvas_draw_operations:nullable(count),triangles:nullable(count),textures:nullable(count),geometries:nullable(count),shader_programs:nullable(count),main_render_passes:nullable(count),shadow_draw_calls:nullable(count),shadow_render_passes:nullable(count),texture_bytes_estimate:nullable(numeric),memory},['shader_programs']);
const spikeFrame=object({elapsed_ms:numeric,context_id:contextID,weapon:integer(0,100),cpu_frame_ms:timing,cpu_render_ms:timing,draw_calls:nullable(count),triangles:nullable(count),shadow_draw_calls:nullable(count),shader_programs:nullable(count),textures:nullable(count),geometries:nullable(count),main_render_passes:nullable(count)});
const spike=object({elapsed_ms:numeric,frame_ms:numeric,context_id:contextID,condition_mask:integer(0,63),phase,frames:object({preceding:spikeFrame,current:spikeFrame})},['frames']);
const reportSpec=object({
 schema:enumeration([BENCHMARK_SCHEMA]),
 session:object({id:string(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/,36),kind:enumeration(['gameplay','scripted']),started_at:iso,ended_at:iso,duration_ms:numeric,active_duration_ms:number(0,7201000),warmup_per_match_ms:enumeration([15000]),reason:enumeration(['toggle_off','checkpoint','recovered_checkpoint','duration_limit','stress_complete','stress_cancelled','stress_match_finished']),interrupted:boolean,pause_count:count,scenario}),
 build:object({release:string(/^\d{1,6}$/,6),commit:nullable(sha),source_commit:sha,content_sha256:digest,commit_resolution:string(/^[a-z_]+$/,64)}),
 environment:object({browser:enumeration(['Safari','Chromium','Firefox','unavailable']),browser_version:nullable(string(/^\d{1,4}(\.\d{1,4})?$/,9)),device_family:enumeration(['iPhone','iPad','unavailable']),device_model:object({status:enumeration(['unavailable']),reason:()=> 'Safari does not reliably expose the hardware model'}),os:enumeration(['iOS','macOS','Android','Windows','unavailable'])}),
 renderer:object({backend:enumeration(['WebGL2','Canvas2D']),vendor:genericRenderer,renderer:genericRenderer,version:genericRenderer,shading_language:genericRenderer}),
 methodology:(v,p)=>{if(!v||Object.keys(v).some(k=>!Object.hasOwn(BENCHMARK_METHODOLOGY,k)))fail(p);return BENCHMARK_METHODOLOGY;},
 availability:object({cpu_frame:status,gpu:object({status:enumeration(['measured','unavailable']),supported:boolean}),js_heap:status,texture_bytes:status,process_memory:object({status:enumeration(['unavailable'])}),vram:object({status:enumeration(['unavailable'])}),temperature:object({status:enumeration(['unavailable'])}),display_refresh_rate:object({status:enumeration(['unavailable'])})}),
 summary:phased,
 contexts:array(object({id:integer(0,63),map:object({id:integer(0,MAPS.length-1),name:(v,p)=>string(/^[a-zA-Z0-9 '\-]+$/,80)(v,p)}),mode:enumeration(MODES.map(m=>m.id)),difficulty,players:integer(1,100),bots:integer(0,99),graphics,stats:phased}),LIMITS.contexts),
 conditions:array(object({name:enumeration(CONDITIONS),stats:summary}),CONDITIONS.length,CONDITIONS.length),
 timeline:array(object({start_ms:numeric,end_ms:numeric,context_id:contextID,phase,...summarySpecs}),LIMITS.windows),
 render_samples:array(renderSample,LIMITS.windows),transitions:array(object({elapsed_ms:numeric,context_id:contextID}),LIMITS.transitions),spikes:array(spike,LIMITS.spikes),
 activity:object({shots:count,player_shots:count,explosions:count,smokes:count,flashes:count,kills:count}),
 raw:object({columns:(v,p)=>{if(JSON.stringify(v)!==JSON.stringify(RAW_COLUMNS))fail(p);return RAW_COLUMNS;},seen:count,samples:array(tuple([numeric,numeric,timing,timing,contextID,integer(0,63),phase]),LIMITS.raw),gpu_columns:(v,p)=>{if(JSON.stringify(v)!=='["elapsed_ms","gpu_ms","context_id","phase"]')fail(p);return v;},gpu_samples:array(tuple([numeric,numeric,contextID,phase]),LIMITS.gpu)}),
 degradation:object({early_mean_frame_ms:timing,late_mean_frame_ms:timing,change_percent:nullable(number(-100,1e9)),status:enumeration(['estimate','insufficient_data']),note:()=> 'Uncontrolled maps, settings, combat and DRS can explain change; this does not establish thermal throttling'}),
 limits:object({...Object.fromEntries(Object.entries(LIMITS).map(([k,v])=>[k,integer(1,k==='windows'?3600:v)])),dropped:object({contexts:count,transitions:count,spikes:count,gpu:count}),timeline_decimated:boolean,context_overflow:summary}),
 instrumentation:object({cpu_overhead_ms:timingStats,checkpoint_period_ms:enumeration([60000]),checkpoint_max_ms:timing,raw_observations:integer(0,LIMITS.raw)})
},['instrumentation']);

export function validateReport(input){
 const report=reportSpec(input,'report');
 if(!Number.isFinite(Date.parse(report.session.started_at))||!Number.isFinite(Date.parse(report.session.ended_at))||Date.parse(report.session.ended_at)<Date.parse(report.session.started_at))fail('session.timestamp');
 if(report.session.active_duration_ms>report.session.duration_ms+1)fail('session.duration');
 if(report.summary.warmup.frame_time.count+report.summary.steady.frame_time.count!==report.raw.seen)fail('raw.seen');
 if(report.raw.samples.length>report.raw.seen)fail('raw.samples');
 if(report.session.kind==='gameplay'&&report.session.scenario!==null||report.session.kind==='scripted'&&!report.session.scenario)fail('session.scenario');
 report.contexts.forEach((c,i)=>{if(c.id!==i||c.players!==c.bots+1)fail('contexts');c.map.name=MAPS[c.map.id].name;});
 const knownID=id=>id===-1||id<report.contexts.length;
 for(const row of report.raw.samples)if(!knownID(row[4]))fail('raw.context');
 for(const row of report.raw.gpu_samples)if(!knownID(row[2]))fail('raw.gpu_context');
 for(const row of report.spikes)if(row.frames){const {preceding,current}=row.frames;if(!knownID(preceding.context_id)||!knownID(current.context_id)||current.context_id!==row.context_id||current.elapsed_ms!==row.elapsed_ms||preceding.elapsed_ms>=current.elapsed_ms||Math.abs(current.elapsed_ms-preceding.elapsed_ms-row.frame_ms)>.003)fail('spikes.frames');}
 return report;
}
