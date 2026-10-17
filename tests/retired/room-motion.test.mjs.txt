import test from 'node:test';
import assert from 'node:assert/strict';
import {Arena,MAPS} from '../dist/js/maps.js';
import {RoomLights} from '../dist/js/room-lights.js';
import {cameraBob} from '../dist/js/aim.js';

test('room bulbs contain interior wall faces and exclude exterior faces and roof tops on all maps',()=>{
 const lights=new RoomLights();let checked=0;
 for(const map of MAPS){const arena=new Arena(map.id);
  for(const roof of arena.blocks.filter(b=>b.room&&b.roof)){
   lights.assign(0,arena,{x:roof.x,y:roof.y-.5,z:roof.z});
   const bounds=lights.bounds.value[0],ceiling=lights.ceiling.value[0];
   assert.equal(bounds.x,roof.x);assert.equal(bounds.y,roof.z);
   const inner=roof.w/2-.5,outer=roof.w/2-.1;
   assert(inner<=bounds.z+.06);assert(outer>bounds.z+.30);
   assert(Math.abs(ceiling-(roof.y-roof.h/2))<1e-6);assert(roof.y+roof.h/2>ceiling+.12);
   checked++;
  }
 }
 assert(checked>=20);
});
test('unbounded lamps and destroyed rooms clear the previous light bounds',()=>{
 const arena=new Arena(0),lights=new RoomLights(),roof=arena.blocks.find(b=>b.room);
 const lamp={x:roof.x,y:roof.y-.5,z:roof.z};lights.assign(1,arena,lamp);
 assert(lights.bounds.value[1].z<100);roof.destroyed=true;lights.assign(1,arena,lamp);
 assert(lights.bounds.value[1].z>10000);assert(lights.ceiling.value[1]>10000);
 lights.assign(1,arena,null);assert(lights.bounds.value[1].w>10000);
});
test('camera stride remains continuous on speed changes, settles at rest and freezes on pause',()=>{
 const state={};let last=0;
 for(let i=0;i<600;i++){
  const speed=i<80?7:i<110?0:i<250?2:0;
  const bob=cameraBob(state,speed,true,0,1/60);
  assert(Math.abs(bob-last)<.009,`frame ${i} jumped by ${bob-last}`);assert(Math.abs(bob)<=.023);last=bob;
 }
 assert(Math.abs(last)<1e-12);const copy={...state};cameraBob(state,7,true,0,0);assert.deepEqual(state,copy);
 assert.equal(cameraBob(state,7,true,1,1/60),0);assert.equal(cameraBob(state,7,true,0,1/60,false),0);
 const phase=state.phase;cameraBob(state,7,false,0,1/60);assert.equal(state.phase,phase);
});
