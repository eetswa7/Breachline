import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,emptyInput} from '../dist/js/engine.js';
import {Weapon} from '../dist/js/weapons.js';
import {updateAimAssist} from '../dist/js/aim-assist.js';
import {operatorTorso,operatorLimb} from '../dist/js/operator-meshes.js';
import {actorModel} from '../dist/js/geometry.js';
import {fixture as rendererFixture} from './renderer-fixture.mjs';

function course(){
 const game=new Game({mode:'tdm'},{seed:819}),p=game.player;
 game.arena.blocks=[];game.arena.box(0,-.2,0,100,.4,100,'concrete',{ground:true});game.arena.bakeCollision();
 p.reset({x:0,y:0,z:0},0);game.actors=[p];game.events=[];return game;
}
function duel(){
 const g=course(),enemy=new Game({}, {seed:7}).actors[4],ally=new Game({}, {seed:8}).actors[1];
 enemy.reset({x:0,y:0,z:-15},0);ally.reset({x:8,y:0,z:-15},0);g.actors.push(enemy,ally);return{g,enemy,ally};
}
function settle(state,g,enabled=true){for(let i=0;i<90;i++)updateAimAssist(state,g,1/60,enabled);return state.gain;}

test('touch friction follows visible enemy silhouettes without steering or firing',()=>{
 const {g,enemy}=duel(),s={},p=g.player,yaw=p.yaw,pitch=p.pitch,ammo=p.weapon.ammo;
 assert(settle(s,g)>.549&&s.gain<.56);assert.equal(p.yaw,yaw);assert.equal(p.pitch,pitch);assert.equal(p.weapon.ammo,ammo);assert.equal(g.shots,0);
 enemy.x=6;assert(settle(s,g)>.999);enemy.x=0;enemy.z=-70;assert(settle(s,g)>.999);
 enemy.z=-15;p.yaw=Math.PI;assert(settle(s,g)>.999);
});

test('touch friction ignores allies, corpses, smoke, flashes and covered targets',()=>{
 const {g,enemy,ally}=duel(),s={};enemy.health=0;ally.x=0;assert(settle(s,g)>.999);
 enemy.health=100;ally.x=8;g.arena.box(0,1.5,-8,2,3,1,'concrete');g.arena.bakeCollision();assert(settle(s,g)>.999);
 g.arena.blocks.pop();g.arena.bakeCollision();g.smokes=[{x:0,y:1.6,z:-8,age:3}];assert(settle(s,g)>.999);
 g.smokes=[];g.player.flashed=1;assert(settle(s,g)>.999);g.player.flashed=0;assert(settle(s,g)<.56);
 assert.equal(updateAimAssist(s,g,1/60,false),1);assert.equal(updateAimAssist(s,g,0),1);
 g.player.weapons[0]=new Weapon(12);assert.equal(updateAimAssist(s,g,1/60),1);
});

test('aim friction caches visibility queries, freezes at zero dt and resets on a new match',()=>{
 const {g}=duel(),s={};let calls=0;const visible=g.arena.visible.bind(g.arena);
 g.arena.visible=(...args)=>{calls++;return visible(...args);};settle(s,g);assert(calls<=60,`cached rays: ${calls}`);
 const gain=s.gain,clock=s.clock,count=calls;updateAimAssist(s,g,0);assert.equal(s.gain,gain);assert.equal(s.clock,clock);assert.equal(calls,count);
 const fresh=course();assert.equal(updateAimAssist(s,fresh,1/60),1);
});

test('a sprint jump carries momentum on release, lands once and brakes on the ground',()=>{
 const g=course(),p=g.player,run={...emptyInput(),mz:1,sprint:true};
 for(let i=0;i<30;i++)g.update(1/60,run);const start=p.z;
 g.update(1/60,{...run,jump:true});assert(!p.grounded&&p.vy>0);const launch=Math.hypot(p.vx,p.vz);
 for(let i=0;i<20;i++)g.update(1/60);assert(!p.grounded);assert(Math.hypot(p.vx,p.vz)>launch*.87);assert(start-p.z>1.8);
 for(let i=0;i<60&&!p.grounded;i++)g.update(1/60);assert(p.grounded);assert.equal(g.events.filter(e=>e.type==='land').length,1);
 const landing=g.events.find(e=>e.type==='land');assert.equal(landing.source,0);assert.equal(landing.position.y,0);assert(landing.value>.4);
 for(let i=0;i<20;i++)g.update(1/60);assert(Math.hypot(p.vx,p.vz)<.001);assert.equal(g.events.filter(e=>e.type==='land').length,1);
});

test('air steering turns gradually and wall pressure cannot produce footsteps',()=>{
 const g=course(),p=g.player;p.grounded=false;p.y=1;p.vz=-6;
 g.moveActor(p,4,0,1/60);assert(p.vx>0&&p.vx<.5);assert(p.vz< -5.3);assert(Math.hypot(p.vx,p.vz)<=6);
 p.reset({x:0,y:0,z:0},0);g.arena.box(0,1.5,-.84,10,3,1);g.arena.bakeCollision();g.events=[];
 for(let i=0;i<180;i++)g.moveActor(p,0,-6,1/60);assert.equal(g.events.filter(e=>e.type==='step').length,0);
 g.arena.blocks.pop();g.arena.bakeCollision();for(let i=0;i<120;i++)g.moveActor(p,0,-4,1/60);
 assert(g.events.filter(e=>e.type==='step').length>=4);assert(p.z< -7);
});

test('operator sections are closed, outward, smooth and keep limb triangle cost bounded',()=>{
 for(const [make,triangles]of [[operatorTorso,120],[operatorLimb,48]]){
  const data=make(),edges=new Map();assert.equal(data.length/24,triangles);assert(data.every(Number.isFinite));
  for(let i=0;i<data.length;i+=24){
   const pts=[0,8,16].map(o=>Array.from(data.slice(i+o,i+o+3))),keys=pts.map(p=>p.map(v=>Math.round(v*1e6)).join(','));
   for(let j=0;j<3;j++){
    const edge=[keys[j],keys[(j+1)%3]].sort().join('/');edges.set(edge,(edges.get(edge)??0)+1);
    const at=i+j*8;assert(Math.abs(Math.hypot(...data.slice(at+3,at+6))-1)<1e-6);
    assert(pts[j].every(v=>Math.abs(v)<=.50001));
   }
   const a=pts[1].map((v,j)=>v-pts[0][j]),b=pts[2].map((v,j)=>v-pts[0][j]),cross=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
   assert(cross.reduce((n,v,j)=>n+v*data[i+3+j],0)>0);
  }
  assert([...edges.values()].every(n=>n===2),'watertight silhouette including caps');
 }
 const g=course(),parts=actorModel(g.player,1),r=rendererFixture();assert.equal(parts[7].mesh,'operatorTorso');
 assert.equal(r.partGeometry(parts[7],'actor'),r.geometry.operatorTorso);
 for(const i of [0,1,2,3,14,15,16,17]){assert.equal(parts[i].mesh,'operatorLimb');assert.equal(r.partGeometry(parts[i],'actor'),r.geometry.operatorLimb);}
});

test('operator locomotion follows strafing and reverse travel while preserving the simulation pose',()=>{
 const g=course(),a=g.player;a.id=1;const x=a.x,y=a.y,z=a.z,yaw=a.yaw,pitch=a.pitch;
 actorModel(a,0);a.vx=3;
 for(let frame=1;frame<=60;frame++)actorModel(a,frame/60);
 a.stride=0;let p=actorModel(a,1);
 assert(Math.abs(p[4].x-a.renderBase[4].x)>.15);assert(Math.abs(p[4].z-a.renderBase[4].z)<1e-9);
 a.vx=0;a.vz=-3;for(let frame=61;frame<=120;frame++)actorModel(a,frame/60);
 a.stride=0;p=actorModel(a,2);const forward=p[4].z-a.renderBase[4].z;assert(forward<-.25);
 a.vz=3;for(let frame=121;frame<=180;frame++)actorModel(a,frame/60);
 a.stride=0;p=actorModel(a,3);assert(Math.abs(p[4].z-a.renderBase[4].z+forward)<.00001);
 a.grounded=false;a.vy=6;p=actorModel(a,3);assert(p[4].y>.18&&p[5].y>.18);
 assert.deepEqual([a.x,a.y,a.z,a.yaw,a.pitch],[x,y,z,yaw,pitch]);
});
