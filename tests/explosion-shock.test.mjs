import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.min.js';
import {ExplosionShockSystem,SHOCK_LIMITS} from '../dist/js/explosion-shock.js';

test('explosion fronts share one bounded annulus batch and expire without idle uploads',()=>{
  const scene=new THREE.Scene(),fx=new ExplosionShockSystem(scene);
  assert.equal(scene.children.length,1);assert.equal(fx.mesh.geometry.index.count,SHOCK_LIMITS.segments*6);
  assert.equal(fx.mesh.geometry.instanceCount,0);assert.equal(fx.mesh.material.depthTest,true);
  assert.equal(fx.mesh.material.depthWrite,false);assert.equal(fx.mesh.material.forceSinglePass,true);
  for(let i=0;i<20;i++)fx.add({x:i,y:.12,z:0},8,0);
  assert.equal(fx.entries.length,6);assert.equal(fx.update(1/60,'low'),2);
  assert.equal(fx.attributes.instancePosition.getX(0),19,'new fronts receive priority');
  assert.equal(fx.update(0,'medium'),4);assert.equal(fx.update(0,'ultra'),6);
  fx.update(1);assert.equal(fx.mesh.geometry.instanceCount,0);
  const version=fx.attributes.instancePosition.version;fx.update(1);
  assert.equal(fx.attributes.instancePosition.version,version);fx.dispose();assert.equal(scene.children.length,0);
});

test('front origins respect raised floors and airborne blasts do not emit ground dust',()=>{
  const fx=new ExplosionShockSystem(new THREE.Scene()),position={x:1,y:3.7,z:2};
  fx.add(position,8,3.6);fx.update(.1);
  assert.equal(fx.attributes.instancePosition.getY(0),Math.fround(3.628));
  assert.equal(fx.attributes.instanceGround.getX(0),1);assert.deepEqual(position,{x:1,y:3.7,z:2});
  fx.add({x:1,y:5.5,z:2},8,0);fx.update(.1);
  assert.equal(fx.attributes.instancePosition.getY(0),5.5);assert.equal(fx.attributes.instanceGround.getX(0),0);
  fx.dispose();
});

test('off-camera fronts stay bounded, age while culled and reset cleanly',()=>{
  const fx=new ExplosionShockSystem(new THREE.Scene());
  fx.add({x:200,y:.12,z:0},8,0);assert.equal(fx.update(.2,'low',{x:0,y:2,z:0}),0);
  assert.equal(fx.update(.4,'ultra',{x:200,y:2,z:0}),0);
  assert.equal(fx.add({x:NaN,y:0,z:0}),false);
  fx.add({x:0,y:.12,z:0},10000,0);fx.update(0);
  assert.equal(fx.attributes.instanceRadius.getX(0),9);fx.clear();
  assert.equal(fx.update(0),0);assert.equal(fx.cursor,0);
  fx.dispose();fx.dispose();assert.equal(fx.add({x:0,y:0,z:0}),false);
});
