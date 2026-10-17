import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,emptyInput} from '../dist/js/engine.js';
import {Weapon} from '../dist/js/weapons.js';
import {Arena} from '../dist/js/maps.js';
import {Navigation} from '../dist/js/navigation.js';
function burstGame(){const g=new Game({}, {seed:12});g.actors=[g.player];g.arena.blocks=[];g.player.weapons[0]=new Weapon(13);g.player.reset({x:0,y:0,z:0},0);return g;}
test('Harrow fires exactly three rounds after one tap, then requires another trigger',()=>{const g=burstGame(),w=g.player.weapon;g.update(1/60,{...emptyInput(),fire:true,firePressed:true});for(let i=0;i<90;i++)g.update(1/60);assert.equal(w.ammo,w.capacity-3);assert.equal(w.burstRemaining,0);});
test('burst reload and weapon switching cancel pending shots',()=>{for(const action of ['reload','swap']){const g=burstGame(),w=g.player.weapon;g.update(1/60,{...emptyInput(),fire:true,firePressed:true});g.update(1/60,{...emptyInput(),[action]:true});for(let i=0;i<15;i++)g.update(1/60);assert.equal(w.ammo,w.capacity-1);assert.equal(w.burstRemaining,0);}});

test('new overlook and rail platform connect to ground routes',()=>{for(const [id,q]of [[6,{x:23,y:1.08,z:3}],[7,{x:0,y:1.08,z:-21}]]){const a=new Arena(id),n=new Navigation(a),end=n.path(a.spawns[0],q).at(-1);assert(end&&Math.hypot(end.x-q.x,end.z-q.z)<2&&Math.abs(end.y-q.y)<.1,`map ${id} overlook inaccessible`);}});
