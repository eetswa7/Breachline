import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioSystem} from '../dist/js/audio.js';
import {distanceGain,lowpassFrequency} from '../dist/js/world-acoustics.js';
const near=(a,b,epsilon=1e-6)=>assert(Math.abs(a-b)<epsilon,`${a} != ${b}`);
function harness({native=true,duration=2}={}){
 const sources=[],gains=[],filters=[],panners=[];
 const param=value=>({value,events:[],setValueAtTime(v,t){this.events.push(['set',v,t]);},linearRampToValueAtTime(v,t){this.events.push(['ramp',v,t]);}});
 const node=()=>({gain:param(1),pan:param(0),frequency:param(0),Q:param(0),playbackRate:param(1),connections:[],connect(n){this.connections.push(n);},disconnect(){this.disconnected=true;},start(...args){this.started=args;},stop(){this.stopped=true;}});
 const context={state:'running',sampleRate:48000,currentTime:1,createBufferSource(){const n=node();sources.push(n);return n;},createGain(){const n=node();gains.push(n);return n;},createBiquadFilter(){const n=node();filters.push(n);return n;},createStereoPanner(){return node();},suspend(){this.state='suspended';return Promise.resolve();}};
 if(native){context.listener={setPosition(){},setOrientation(){}};context.createPanner=()=>{const n=Object.assign(node(),{setPosition(x,y,z){this.position={x,y,z};}});panners.push(n);return n;};}
 const audio=new AudioSystem({volume:1,haptics:false});audio.context=context;audio.master=node();
 for(const key of ['shot0','explosion','reload0','hit'])audio.buffers.set(key,{duration,numberOfChannels:1});
 let blocked=false,rays=0;
 const game={player:{x:0,y:0,z:0,yaw:0,height:1.67},arena:{indoors:()=>false,visible:()=>{rays++;return !blocked;}}};
 return {audio,context,game,sources,gains,filters,panners,setBlocked(value){blocked=value;},rays:()=>rays,advance(seconds=.1){context.currentTime+=seconds;audio.events([],game);}};
}
const shot=position=>({type:'shot',source:2,weapon:0,position});

test('moving listener changes existing level and cutoff while its emitted wave stays at the original position',()=>{
 const h=harness(),position={x:10,y:0,z:0};h.audio.events([shot(position)],h.game);
 const gain=h.gains[0],filter=h.filters[0],initial=gain.gain.value;
 near(initial,distanceGain(10)*.72);near(filter.frequency.value,21600);
 position.x=99;h.game.player.x=-30;h.advance(.2);
 const blend=1-Math.exp(-.2/.025);
 near(gain.gain.value,initial+(distanceGain(40)*.72-initial)*blend);
 near(filter.frequency.value,21600+(lowpassFrequency(40,false,48000)-21600)*blend);
 assert.deepEqual(h.panners[0].position,{x:10,y:0,z:0});assert.equal(h.sources.length,1);
 h.game.player.x=8;h.advance(.2);assert(gain.gain.value>initial);assert(filter.frequency.value>21000);
 assert.equal(gain.gain.events.length,0,'live level must not accumulate an automation timeline');
});

test('stationary listener hears destroyed/added cover changes with bounded refresh and short slew',()=>{
 const h=harness();h.audio.events([shot({x:10,y:0,z:0})],h.game);const initial=h.gains[0].gain.value;
 h.setBlocked(true);h.advance(.05);assert.equal(h.rays(),1,'stationary cover is throttled to 80 ms');
 h.advance(.05);assert.equal(h.rays(),2);assert(h.gains[0].gain.value<initial*.6);assert(h.filters[0].frequency.value<4500);
 h.setBlocked(false);h.advance(.1);assert(h.gains[0].gain.value>initial*.98);assert(h.filters[0].frequency.value>21000);
});

test('24 world voices share an eight-ray batch limit and all long tails receive round-robin cover updates',()=>{
 const h=harness();h.audio.events(Array.from({length:16},(_,i)=>shot({x:5+i,y:0,z:-5})),h.game);
 assert.equal(h.audio.voices,16);assert.equal(h.rays(),8,'new emissions have a shared ray budget');
 h.audio.events(Array.from({length:8},(_,i)=>({type:'explosion',position:{x:-5-i,y:0,z:-5}})),h.game);
 assert.equal(h.audio.voices,24);assert.equal(h.audio.worldAcoustics.voices.length,24);
 h.setBlocked(true);h.game.player.x=1;
 for(let i=0;i<6;i++){const before=h.rays();h.advance(.1);assert(h.rays()-before<=4,'existing refresh exceeds four rays');}
 assert(h.audio.worldAcoustics.voices.every(v=>v.occluded),'later tails were starved');
 const before=h.rays();h.audio.events(Array.from({length:40},(_,i)=>({type:'explosion',position:{x:30+i,y:0,z:2}})),h.game);
 assert(h.rays()-before<=8,'refresh plus emissions exceeded eight rays');assert.equal(h.audio.worldAcoustics.voices.length,24);
 h.audio.pause();assert.equal(h.audio.worldAcoustics.voices.length,0);assert.equal(h.audio.voices,0);
 h.sources.forEach(s=>s.onended());assert.equal(h.audio.worldAcoustics.voices.length,0);
});

test('identical emission contacts share cover rays and short clips skip repeat cover while their distance still updates',()=>{
 const h=harness({duration:.12});h.audio.events(Array.from({length:16},()=>shot({x:10,y:0,z:0})),h.game);
 assert.equal(h.rays(),1);h.setBlocked(true);h.game.player.x=-20;h.advance(.04);assert.equal(h.rays(),1);
 assert(h.gains[0].gain.value<distanceGain(10)*.72);assert(h.audio.worldAcoustics.voices.every(v=>!v.occluded));
});

test('remote component envelope automation survives moving-listener updates and cancellation releases both gains',()=>{
 const h=harness();h.audio.events([{type:'weaponFoley',source:2,weapon:0,cue:'handling',position:{x:10,y:0,z:0}}],h.game);
 assert.equal(h.gains.length,2);const envelope=h.gains[1],edges=structuredClone(envelope.gain.events),initial=h.gains[0].gain.value;
 assert.equal(edges.length,4);assert.equal(edges.at(-1)[1],0);assert.equal(edges[1][1],1);
 h.game.player.x=-10;h.advance(.04);assert(h.gains[0].gain.value<initial);assert.deepEqual(envelope.gain.events,edges);
 h.audio.events([{type:'weaponFoleyCancel',source:2,weapon:0}],h.game);
 assert.equal(h.audio.worldAcoustics.voices.length,0);assert(h.gains.every(g=>g.disconnected));assert(h.sources[0].stopped);
});

test('legacy stereo fallback follows head turns, local cues remain immediate, and far explosion floor stays intact',()=>{
 const h=harness({native:false});h.audio.events([shot({x:10,y:0,z:0}),{type:'shot',source:0,weapon:0,position:{x:0,y:1.55,z:0}}],h.game);
 const world=h.audio.worldAcoustics.voices[0];near(world.stereo.pan.value,1);assert.equal(h.audio.worldAcoustics.voices.length,1);
 const local=h.gains[1];h.game.player.yaw=Math.PI/2;h.advance(.1);near(world.stereo.pan.value,0);near(local.gain.value,.85);
 h.audio.events([{type:'explosion',position:{x:1000,y:0,z:0}}],h.game);const far=h.gains.at(-1);near(far.gain.value,.06);
 h.game.player.x=-1000;h.advance(.1);near(far.gain.value,.06);assert(Number.isFinite(far.gain.value));
 for(const source of h.sources)source.onended();assert.equal(h.audio.worldAcoustics.voices.length,0);
});
