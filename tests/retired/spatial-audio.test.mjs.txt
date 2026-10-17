import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioSystem} from '../dist/js/audio.js';
import {listenerFrame,updateSpatialListener,createWorldPanner} from '../dist/js/spatial-audio.js';
import {direction,lookAt} from '../dist/js/math.js';
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const vector=(actual,expected)=>['x','y','z'].forEach(k=>near(actual[k],expected[k]));
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const xyz=node=>({x:node.positionX.value,y:node.positionY.value,z:node.positionZ.value});
function params(node,names){for(const name of names)node[name]={value:0,setValueAtTime(value,time){this.value=value;this.time=time;}};return node;}
const positionParams=['positionX','positionY','positionZ'];
const orientationParams=['forwardX','forwardY','forwardZ','upX','upY','upZ'];
function harness({legacy=false,native=true,listener=true,stereo=true,unsupported=false,ignored=false}={}){
 const sources=[],gains=[],panners=[],stereos=[],filters=[];
 const node=()=>({connections:[],gain:{value:1},pan:{value:0},playbackRate:{value:1},frequency:{value:0},Q:{value:0},connect(n){this.connections.push(n);},disconnect(){this.disconnected=true;},start(...args){this.started=args;},stop(){this.stopped=true;}});
 const spatialNode=()=>legacy?Object.assign(node(),{setPosition(x,y,z){this.position={x,y,z};}}):params(node(),positionParams);
 const head=legacy?{setPosition(x,y,z){this.position={x,y,z};},setOrientation(...values){this.orientation=values;}}:params({},[...positionParams,...orientationParams]);
 const context={state:'running',currentTime:7,listener:listener?head:undefined,createBufferSource(){const n=node();sources.push(n);return n;},createGain(){const n=node();gains.push(n);return n;},createBiquadFilter(){const n=node();filters.push(n);return n;},suspend(){this.state='suspended';return Promise.resolve();}};
 if(native)context.createPanner=()=>{const n=spatialNode();panners.push(n);if(unsupported)Object.defineProperty(n,'panningModel',{set(){throw Error('HRTF unavailable');}});if(ignored)Object.defineProperty(n,'panningModel',{set(){},get(){return 'equalpower';}});return n;};
 if(stereo)context.createStereoPanner=()=>{const n=node();stereos.push(n);return n;};
 const audio=new AudioSystem({volume:1,haptics:false});audio.context=context;audio.master=node();
 for(const key of ['shot0','stepHard','stepGravel','impactMetal','ricochetMetal','penetrationMetal','casingMetal','explosion','reload0','hit'])audio.buffers.set(key,{duration:1,numberOfChannels:1});
 const game={player:{x:3,y:2,z:-4,height:1.4,yaw:0,pitch:0},eye(p){return{x:p.x,y:p.y+p.height-.12,z:p.z};},arena:{indoors:()=>false,visible:()=>true}};
 return {audio,game,context,sources,gains,panners,stereos,filters,head};
}

test('head frame matches camera forward and view-up at all yaw/pitch quadrants',()=>{
 const eye={x:3,y:4,z:5};
 for(const yaw of [-Math.PI,-Math.PI/2,0,Math.PI/2,Math.PI,.71])for(const pitch of [-1.48,-.62,0,.62,1.48]){
  const frame=listenerFrame({yaw,pitch},eye),forward=direction(yaw,pitch);
  vector(frame.forward,forward);near(dot(frame.forward,frame.up),0);near(dot(frame.forward,frame.forward),1);near(dot(frame.up,frame.up),1);
  // The renderer looks at eye+direction using world +Y. Its computed camera-up
  // must match the listener's pitched head-up, including combined yaw/pitch.
  const view=new Float32Array(16);lookAt(view,eye,{x:eye.x+forward.x,y:eye.y+forward.y,z:eye.z+forward.z});
  vector(frame.up,{x:view[1],y:view[5],z:view[9]});
 }
 vector(listenerFrame({yaw:0,pitch:Math.PI/2},eye).forward,{x:0,y:1,z:0});
 vector(listenerFrame({yaw:0,pitch:-Math.PI/2},eye).forward,{x:0,y:-1,z:0});
});

test('modern and Safari legacy listeners receive full eye position and pitched orientation',()=>{
 for(const legacy of [false,true]){
  const {audio,game,head}=harness({legacy});game.player.yaw=Math.PI/2;game.player.pitch=Math.PI/6;
  audio.events([],game);assert.equal(audio.spatialReady,true);
  const frame=listenerFrame(game.player,game.eye(game.player));
  if(legacy){vector(head.position,frame.position);frame.forward&&head.orientation.forEach((v,i)=>near(v,[frame.forward.x,frame.forward.y,frame.forward.z,frame.up.x,frame.up.y,frame.up.z][i]));}
  else{vector(xyz(head),frame.position);orientationParams.forEach((k,i)=>near(head[k].value,[frame.forward.x,frame.forward.y,frame.forward.z,frame.up.x,frame.up.y,frame.up.z][i]));assert.equal(head.forwardY.time,undefined,'live pose does not enqueue an automation timeline');}
  game.player.x+=4;game.player.pitch=-.4;audio.events([],game);
  near(legacy?head.position.x:head.positionX.value,7);assert((legacy?head.orientation[1]:head.forwardY.value)<0,'empty batches update playing tails during head turns');
 }
});

test('world contacts preserve all three coordinates while local muzzle, boots and handling stay immediate',()=>{
 const {audio,game,panners,stereos,sources}=harness();
 const position={x:9,y:5.5,z:-1};
 audio.events([
  ...['shot','step','land','weaponFoley'].map(type=>({type,source:0,weapon:0,cue:'handling',position})),
  ...['shot','step','land','impact','ricochet','penetration','casing','explosion','weaponFoley'].map(type=>({type,source:2,weapon:0,surface:type==='casing'?'Metal':'steel',cue:'handling',position})),
  {type:'penetration',source:0,surface:'steel',position}
 ],game);
 assert.equal(stereos.length,4);assert.equal(panners.length,10);assert.equal(sources.length,14);
 for(const panner of panners){vector(xyz(panner),position);assert.equal(panner.panningModel,'HRTF');assert.equal(panner.rolloffFactor,0);assert.equal(panner.coneInnerAngle,360);assert.equal(panner.coneOuterAngle,360);}
});

test('actual player muzzle/boot/handling positions stay centered at every yaw while distant own impacts remain world sources',()=>{
 for(const yaw of [-Math.PI,-Math.PI/2,0,Math.PI/2,Math.PI]){
  const {audio,game,stereos,panners}=harness();game.player.yaw=yaw;game.player.pitch=.4;
  const eye=game.eye(game.player),boot={x:game.player.x,y:game.player.y,z:game.player.z},contact={x:game.player.x+9,y:4,z:game.player.z+3};
  audio.events([{type:'shot',source:0,weapon:0,position:eye},{type:'step',source:0,position:boot},{type:'land',source:0,position:boot},{type:'weaponFoley',source:0,weapon:0,cue:'handling',position:eye},{type:'impact',source:0,surface:'steel',position:contact}],game);
  assert.equal(stereos.length,4);assert(stereos.every(n=>n.pan.value===0),`local source panned with yaw ${yaw}`);
  assert.equal(panners.length,1);vector(xyz(panners[0]),contact);assert.equal(panners[0].panningModel,'HRTF');
 }
});

test('spatial direction keeps the existing manual level/filter law and shared wet room sends',()=>{
 const {audio,game,panners,gains,filters}=harness();
 const roof={x:3,y:8,z:-4,w:24,h:.3,d:18,roof:true};game.arena.blocks=[roof];game.arena.visible=()=>false;
 const room={connect(){}};audio.rooms=new Map([['hall',{node:room}]]);audio.room=room;
 const position={x:12,y:5,z:-4},d=Math.hypot(position.x-game.player.x,position.y-game.player.y,position.z-game.player.z);
 audio.events([{type:'shot',source:2,weapon:0,position}],game);
 near(gains[0].gain.value,(1/(1+d*d*.004)-.015)*.48*.72);
 near(filters[0].frequency.value,Math.max(600,1600/(1+d*.018)));assert.equal(panners[0].rolloffFactor,0);
 assert.deepEqual(gains[0].connections,[panners[0],room]);assert.equal(panners[0].connections[0],audio.master);
});

test('missing/unsupported HRTF or listener keeps stereo azimuth and unsupported stereo keeps direct playback',()=>{
 for(const options of [{native:false},{listener:false},{unsupported:true},{ignored:true},{native:false,stereo:false}]){
  const {audio,game,panners,stereos,sources,gains}=harness(options);
  audio.events([{type:'shot',source:2,weapon:0,position:{x:12,y:3.5,z:-4}}],game);
  assert.equal(sources.length,1);assert.equal(audio.voices,1);
  if(options.stereo===false)assert.deepEqual(gains[0].connections,[audio.master]);
  else{assert.equal(stereos.length,1);near(stereos[0].pan.value,1);}
  if(options.unsupported||options.ignored)assert(panners[0].disconnected,'partially created HRTF node must be released');
 }
 assert.equal(updateSpatialListener({},listenerFrame({yaw:0,pitch:0},{x:0,y:0,z:0})),false);
 assert.equal(createWorldPanner(harness().context,{x:NaN,y:0,z:0}),null);
});

test('legacy Safari world panners keep elevation with zero native distance attenuation',()=>{
 const {audio,game,panners}=harness({legacy:true});const position={x:-1,y:6,z:7};
 audio.events([{type:'shot',source:2,weapon:0,position}],game);
 assert.equal(panners.length,1);vector(panners[0].position,position);assert.equal(panners[0].rolloffFactor,0);
});

test('HRTF stays within 16 ambient/24 total voices and priority replacement releases the old graph once',()=>{
 const {audio,game,panners,sources,gains,filters}=harness();const remote={type:'shot',source:2,weapon:0,position:{x:20,y:3.5,z:4}};
 audio.events(Array.from({length:30},()=>remote),game);assert.equal(audio.voices,16);assert.equal(panners.length,16);
 audio.events(Array.from({length:8},()=>({type:'explosion',position:remote.position})),game);assert.equal(audio.voices,24);
 audio.events([{type:'explosion',position:remote.position}],game);assert.equal(audio.voices,24);assert.equal(panners.length,25);assert(sources[0].stopped&&panners[0].disconnected&&gains[0].disconnected&&filters[0].disconnected);
 sources[0].onended();assert.equal(audio.voices,24,'native end following forced end is idempotent');
 for(const source of sources)source.onended();assert.equal(audio.voices,0);assert.equal(audio.active.size,0);
 assert([...sources,...gains,...panners,...filters].every(n=>n.disconnected));
});

test('foley cancellation and pause immediately disconnect native graphs even before asynchronous onended',()=>{
 const {audio,game,panners,sources}=harness();const position={x:10,y:3.5,z:-4};
 audio.events([{type:'weaponFoley',source:2,weapon:0,cue:'handling',position},{type:'shot',source:2,weapon:0,position}],game);
 audio.events([{type:'weaponFoleyCancel',source:2,weapon:0}],game);assert.equal(audio.voices,1);assert(panners[0].disconnected);assert(!panners[1].disconnected);
 audio.pause();assert.equal(audio.voices,0);assert.equal(audio.active.size,0);assert(panners.every(p=>p.disconnected));assert(sources.every(s=>s.stopped));assert.equal(audio.context.state,'suspended');
 sources.forEach(s=>s.onended());assert.equal(audio.voices,0);
});
