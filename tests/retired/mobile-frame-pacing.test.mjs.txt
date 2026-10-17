import test from 'node:test';
import assert from 'node:assert/strict';
import {FramePacer} from '../dist/js/frame-pacer.js';
import {GraphicsQuality} from '../dist/js/graphics-quality.js';
import {SaveStore,DEFAULT_SETTINGS} from '../dist/js/save.js';
import {fixture} from './renderer-fixture.mjs';
import {Game} from '../dist/js/engine.js';

test('60 and 30 FPS caps maintain the right average across display refresh rates',()=>{
 for(const refresh of [30,45,60,75,90,120,144])for(const cap of [30,60]){
  const pacer=new FramePacer(),times=[];
  for(let i=0;i<refresh*20;i++){const t=i*1000/refresh;if(pacer.accept(t,cap))times.push(t);}
  assert(Math.abs(times.length-Math.min(refresh,cap)*20)<=1,`${refresh} Hz / ${cap} FPS: ${times.length/20}`);
  for(let i=1;i<times.length;i++)assert(times[i]>times[i-1]);
 }
});
test('missed frames, resumed clocks and cap changes never trigger catch-up render bursts',()=>{
 const p=new FramePacer();assert(p.accept(100));assert(!p.accept(104));
 assert(p.accept(2000));for(let i=0;i<10;i++)assert(!p.accept(2000+i*.1));
 assert(p.accept(2017));assert(p.accept(2020,30));assert(!p.accept(2028,30));assert(p.accept(2054,30));
 assert(p.accept(30,30));assert(!p.accept(NaN));p.reset();assert(p.accept(31,60));
});
test('a jittering 90 Hz display holds a 60 FPS average without long-term timing drift',()=>{
 const p=new FramePacer();let count=0;
 for(let i=0;i<2700;i++)if(p.accept(i*1000/90+Math.sin(i*.71)*.45,60))count++;
 assert(Math.abs(count-1800)<=2,`${count/30} FPS`);
});

const run=(q,seconds,cap,cpu,gpu)=>{for(let t=0;t<seconds;t+=1/cap)q.sample(1/cap,cpu,gpu,true,cap);};
test('30 FPS graphics budgets preserve quality with headroom and still react to real overload',()=>{
 const q=new GraphicsQuality('high');run(q,40,30,18,20);assert.equal(q.tier,'high');assert.equal(q.scale,1);
 run(q,9,30,38,12);assert.notEqual(q.tier,'high');
 const gpu=new GraphicsQuality('ultra');run(gpu,8,30,8,38);assert(gpu.scale<1);
 const auto=new GraphicsQuality();run(auto,25,30,8,15);assert.equal(auto.tier,'high');
});
test('switching frame targets remeasures quality and skips stale overload history',()=>{
 const q=new GraphicsQuality('high');q.warmup=0;q.slow=2.49;q.frameMs=40;
 q.sample(1/30,5,8,true,30);assert.equal(q.tier,'high');assert.equal(q.scale,1);
 run(q,4,30,5,8);run(q,4,60,5,8);assert.equal(q.tier,'high');assert.equal(q.scale,1);
 assert(Math.abs(q.frameMs-1000/60)<.01);
});
test('frame-rate preferences persist and malformed old saves default to 60 FPS',()=>{
 assert.equal(DEFAULT_SETTINGS.frameRate,60);
 let data='';const storage={getItem:()=>data,setItem:(key,value)=>data=value};
 const s=new SaveStore(storage);s.data.settings.frameRate=30;s.persist();assert.equal(new SaveStore(storage).data.settings.frameRate,30);
 for(const value of [0,NaN,-30,120,null,'broken',undefined]){
  const loaded=new SaveStore({getItem:()=>JSON.stringify({version:1,controlRevision:2,settings:{frameRate:value}})});
  assert.equal(loaded.data.settings.frameRate,60);
 }
 const old=new SaveStore({getItem:()=>JSON.stringify({version:1,controlRevision:2,settings:{frameRate:'30'}})});assert.equal(old.data.settings.frameRate,30);
});

test('match preparation compiles both equipped guns and populated actors before drawing',async()=>{
 const r=fixture(),g=new Game({map:11,mode:'hill',loadout:{primary:16,secondary:22}},{seed:44}),calls=[];
 r.arena=g.arena;r.buildWorld();r.resize=()=>844/390;r.applyQuality=()=>{};
 // The menu camera can face away from every live operator. Warmup must still
 // prepare their full materials before gameplay culling starts.
 r.frustum={intersectsSphere:()=>false};r.actorBounds={center:{set(){}}};
 r.renderer.compileAsync=async(scene,camera)=>{calls.push({scene,key:r.weaponKey});assert(camera.isPerspectiveCamera);};
 const ammo=g.player.weapons.map(w=>w.ammo),time=g.time;await r.prepareMatch(g);
 assert.equal(calls.length,3);assert(calls[0].key.startsWith('16/'));assert(calls[1].key.startsWith('22/'));assert.equal(calls[2].scene,r.scene);
 assert(g.actors.slice(1).every(a=>a.renderParts?.length>0));assert([...r.actorBatches.values()].some(b=>b.used>0));assert.equal(g.player.slot,0);assert(r.weaponKey.startsWith('16/'));
 assert.deepEqual(g.player.weapons.map(w=>w.ammo),ammo);assert.equal(g.time,time);assert.deepEqual(r.rendered,[]);
 r.renderWeapon(g,844/390,false);assert.deepEqual(r.rendered,[r.weaponScene]);
});
test('failed or unavailable shader warmup preserves the active weapon slot',async()=>{
 const r=fixture(),g=new Game({loadout:{primary:19,secondary:23}},{seed:44});r.arena=g.arena;r.resize=()=>844/390;r.applyQuality=()=>{};
 g.player.slot=1;r.renderer.compileAsync=async()=>{throw new Error('Lost graphics context');};
 await assert.rejects(()=>r.prepareMatch(g),/Lost graphics context/);assert.equal(g.player.slot,1);assert(r.weaponKey.startsWith('23/'));
 delete r.renderer.compileAsync;await r.prepareMatch(g);assert.equal(g.player.slot,1);assert.deepEqual(r.rendered,[]);
});
