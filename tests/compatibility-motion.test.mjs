import test from 'node:test';
import assert from 'node:assert/strict';
import {CompatibilityRenderer} from '../dist/js/compatibility-renderer.js';
import {Game} from '../dist/js/engine.js';
import {compose,identity} from '../dist/js/math.js';

test('compatibility deaths share articulated posing, yaw-only root and elapsed lifetime in non-respawn modes',()=>{
 const game=new Game({mode:'elimination'},{seed:618}),player=game.player,actor=game.actors[1];
 player.health=0;actor.health=0;actor.lastDamage=2;actor.respawnLeft=3;actor.yaw=.41;game.time=2.2;game.actors=[player,actor];
 const r=Object.create(CompatibilityRenderer.prototype),submitted=[];
 Object.assign(r,{images:{},settings:{fov:80,motion:false},arena:game.arena,canvas:{clientWidth:160,clientHeight:90,width:160,height:90},renderScale:1,ctx:{fillRect(){}},frames:0,fpsAge:0,lastRender:0,world:[],view:identity(),parent:identity(),drawCalls:0});
 r.sky=()=>{};r.paint=()=>{};r.box=(part,parent)=>{submitted.push({part,parent:Array.from(parent)});return [];};
 assert(r.render(game,1/30,false));assert(submitted.length>0);
 const expected=identity();compose(expected,actor.x,actor.y,actor.z,1,1,1,-actor.yaw);
 for(const q of submitted)assert.deepEqual(q.parent,Array.from(expected),'folded body must not receive the old extra root roll');
 assert(actor.operatorMotion.death>0&&actor.operatorMotion.death<1);assert(actor.renderParts[7].y<1.13);
 submitted.length=0;game.time=2.6;assert(r.render(game,1/30,false));assert.equal(submitted.length,0,'elapsed death hides even when its respawn timer stays at three');
});
