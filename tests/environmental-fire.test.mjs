import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.min.js';
import {EnvironmentalFireSystem,FIRE_LIMITS} from '../dist/js/environmental-fire.js';

test('persistent fuel fires use one bounded batch and respect every quality budget',()=>{
  const scene=new THREE.Scene(),fx=new EnvironmentalFireSystem(scene);
  assert.equal(scene.children.length,1);assert.equal(fx.mesh.geometry.instanceCount,0);
  assert.equal(fx.mesh.material.depthTest,true);assert.equal(fx.mesh.material.depthWrite,false);
  assert.equal(fx.mesh.material.forceSinglePass,true);
  for(let i=0;i<20;i++)fx.add({x:i,y:.65,z:0});
  assert.equal(fx.entries.length,FIRE_LIMITS.capacity);
  for(const quality of ['low','medium','high','ultra']){
    const b=FIRE_LIMITS[quality];assert.equal(fx.update(0,quality),b.fires*(b.flames+b.smoke));
  }
  assert.equal(fx.attributes.instancePosition.getX(0),19);fx.dispose();assert.equal(scene.children.length,0);
});

test('fuel flames persist, flicker, pause exactly and fade before expiry',()=>{
  const fx=new EnvironmentalFireSystem(new THREE.Scene());fx.add({x:1,y:.65,z:2},0);
  fx.update(1,'high');const height=fx.attributes.instanceSize.getY(0),alpha=fx.attributes.instanceAlpha.getX(0);
  fx.update(.17,'high');assert.notEqual(fx.attributes.instanceSize.getY(0),height);
  const frozen=Object.fromEntries(Object.entries(fx.attributes).map(([key,a])=>[key,Array.from(a.array)]));
  fx.update(0,'high');
  for(const [key,a] of Object.entries(fx.attributes))assert.deepEqual(Array.from(a.array),frozen[key]);
  fx.update(8.83,'high');assert(fx.attributes.instanceAlpha.getX(0)<alpha);
  fx.update(2.1,'high');assert.equal(fx.mesh.geometry.instanceCount,0);
  const version=fx.attributes.instancePosition.version;fx.update(1,'high');assert.equal(fx.attributes.instancePosition.version,version);
  fx.dispose();
});

test('fires stay on authored floor anchors and culled fires still extinguish',()=>{
  const fx=new EnvironmentalFireSystem(new THREE.Scene()),position={x:1,y:3.65,z:2};
  fx.add(position,3);fx.update(.2,'low',{x:1,y:4,z:2});
  assert.equal(fx.attributes.instancePosition.getY(0),Math.fround(3.035));assert.deepEqual(position,{x:1,y:3.65,z:2});
  assert.equal(fx.update(1,'low',{x:100,y:2,z:100}),0);
  fx.update(12,'high',{x:1,y:4,z:2});assert.equal(fx.mesh.geometry.instanceCount,0);
  assert.equal(fx.add({x:NaN,y:0,z:0}),false);fx.add(position,3);fx.clear();assert.equal(fx.update(0),0);
  assert.equal(fx.cursor,0);fx.dispose();fx.dispose();assert.equal(fx.add(position),false);
});
