import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/js/engine.js';
import {MODES,HARDPOINT_SECONDS,TAG_LIFETIME,MAX_TAGS,FLAG_RETURN_SECONDS} from '../dist/js/modes.js';
import {updateBot} from '../dist/js/ai.js';
import {MAPS} from '../dist/js/maps.js';
import {Navigation} from '../dist/js/navigation.js';

function fixture(mode) {
 const game=new Game({mode},{seed:892});
 game.arena.blocks=[{x:0,y:-.2,z:0,w:200,h:.4,d:200,ground:true,surface:'concrete'}];
 game.actors=game.actors.filter(a=>a.id===0||a.id===4);
 const player=game.player,enemy=game.actors[1];
 player.reset({x:-20,y:0,z:0},0);enemy.reset({x:20,y:0,z:0},Math.PI);
 player.spawnProtection=enemy.spawnProtection=0;
 return {game,player,enemy,rules:game.rules};
}
function place(actor,p){actor.x=p.x;actor.y=p.y;actor.z=p.z;}

test('new objective modes are selectable, respawn-enabled team matches',()=>{
 assert.equal(new Set(MODES.map(m=>m.id)).size,11);
 for(const mode of ['hardpoint','confirmed','ctf']){
  const {rules}=fixture(mode);assert.equal(rules.mode.id,mode);assert(rules.mode.teams);assert(rules.respawns);
  if(mode==='ctf')assert.deepEqual(rules.flags.map(f=>f.team),[0,1]);
 }
 const last=new Game({map:MAPS.length-1});assert.equal(last.config.map,MAPS.length-1);
 assert.equal(new Game({map:999}).config.map,MAPS.length-1);
});

test('CTF flags pick up, drop on death, return by touch and score at a safe home flag',()=>{
 const {game,player,enemy,rules}=fixture('ctf'),blue=rules.flags.find(f=>f.team===0),red=rules.flags.find(f=>f.team===1);
 place(enemy,blue);rules.update(.02,game);assert.equal(blue.carrier,enemy.id);assert(!blue.atBase);
 const dropped={x:enemy.x,y:enemy.y,z:enemy.z};game.damage(enemy,200,player);
 assert.equal(blue.carrier,null);assert(!blue.atBase);assert.equal(blue.x,dropped.x);assert(game.events.some(e=>e.text==='BLUE FLAG DROPPED'));
 place(player,blue);rules.update(.02,game);assert(blue.atBase);assert.equal(blue.carrier,null);
 place(player,red);rules.update(.02,game);assert.equal(red.carrier,player.id);assert(!red.atBase);
 place(player,blue);rules.update(.02,game);assert.deepEqual(rules.scores,[1,0]);assert.equal(player.captures,1);assert(red.atBase);assert.equal(red.carrier,null);
});

test('CTF requires your own flag at home and automatically returns stale drops',()=>{
 const {game,player,enemy,rules}=fixture('ctf'),blue=rules.flags.find(f=>f.team===0),red=rules.flags.find(f=>f.team===1);
 place(enemy,blue);rules.update(.02,game);assert.equal(blue.carrier,enemy.id);
 place(player,red);rules.update(.02,game);assert.equal(red.carrier,player.id);
 place(player,{x:blue.homeX,y:blue.homeY,z:blue.homeZ});rules.update(.02,game);assert.deepEqual(rules.scores,[0,0]);
 game.damage(enemy,200,player);place(player,blue);rules.update(.02,game);assert.deepEqual(rules.scores,[1,0]);
 red.carrier=null;red.atBase=false;red.x=10;red.y=0;red.z=10;red.age=FLAG_RETURN_SECONDS-.1;
 place(player,{x:-20,y:0,z:0});rules.update(.2,game);assert(red.atBase);assert.equal(red.x,red.homeX);assert(game.events.some(e=>e.text==='RED FLAG RETURNED'));
});

test('CTF ends on three captures and resolves a tied time limit as a draw',()=>{
 const {game,player,rules}=fixture('ctf'),blue=rules.flags.find(f=>f.team===0),red=rules.flags.find(f=>f.team===1);
 place(player,red);rules.update(.02,game);place(player,blue);
 rules.scores[0]=rules.mode.limit-1;rules.update(.02,game);assert.equal(rules.phase,'finished');assert.equal(rules.winner,0);
 const tie=fixture('ctf');tie.rules.time=.01;tie.rules.update(.02,tie.game);assert.equal(tie.rules.phase,'finished');assert.equal(tie.rules.winner,-1);
});

test('CTF bases have safe, navigable routes on every map',()=>{
 for(const map of MAPS){const game=new Game({mode:'ctf',map:map.id},{seed:919}),nav=new Navigation(game.arena);
  for(const flag of game.rules.flags){const base={x:flag.homeX,y:flag.homeY,z:flag.homeZ};
   assert(!game.arena.collides(base,.31,1.75),`${map.name} ${flag.team} flag base obstructed`);
   const start=game.arena.spawns.find(p=>p.team===flag.team),path=nav.path(start,base),end=path.at(-1);
   assert(end&&Math.hypot(end.x-base.x,end.z-base.z)<1.9,`${map.name} ${flag.team} flag base unreachable`);
  }
 }
});

test('hardpoint scores exclusive occupation, stops on contest, and ignores dead occupants',()=>{
 const {game,player,enemy,rules}=fixture('hardpoint'),point=rules.points[rules.activePoint];
 place(player,point);rules.update(2.1,game);assert.deepEqual(rules.scores,[2,0]);assert.equal(point.owner,0);
 place(enemy,point);rules.update(3,game);assert(point.contested);assert.deepEqual(rules.scores,[2,0]);
 enemy.health=0;rules.update(1,game);assert(!point.contested);assert.deepEqual(rules.scores,[3,0]);
 player.y=point.y+3;rules.update(2,game);assert.deepEqual(rules.scores,[3,0]);assert.equal(point.owner,-1);
});

test('hardpoint rotates, clears previous control, and scores the new zone',()=>{
 const {game,player,enemy,rules}=fixture('hardpoint'),oldIndex=rules.activePoint,old=rules.points[oldIndex];
 place(player,old);enemy.health=0;rules.update(HARDPOINT_SECONDS,game);
 assert.equal(rules.activePoint,(oldIndex+1)%rules.points.length);
 assert.equal(rules.rotationRemaining,HARDPOINT_SECONDS);assert.equal(old.owner,-1);assert.equal(rules.scores[0],HARDPOINT_SECONDS);
 rules.update(2,game);assert.equal(rules.scores[0],HARDPOINT_SECONDS);
 place(player,rules.points[rules.activePoint]);rules.update(1,game);assert.equal(rules.scores[0],HARDPOINT_SECONDS+1);
 assert(game.events.some(e=>e.text?.startsWith('HARDPOINT MOVED')));
});

test('hardpoint finishes at the score limit and objective modes resolve time-limit ties',()=>{
 const {game,player,rules}=fixture('hardpoint');place(player,rules.points[rules.activePoint]);
 rules.scores[0]=rules.mode.limit-1;rules.update(1,game);assert.equal(rules.phase,'finished');assert.equal(rules.winner,0);
 for(const mode of ['hardpoint','confirmed']){
  const f=fixture(mode);f.rules.time=.01;f.rules.update(.02,f.game);assert.equal(f.rules.phase,'finished');assert.equal(f.rules.winner,-1);
 }
});

test('confirmed drops a tag without kill score, then awards one proximity confirmation',()=>{
 const {game,player,enemy,rules}=fixture('confirmed');
 game.damage(enemy,200,player);assert.equal(player.kills,1);assert.equal(rules.scores[0],0);assert.equal(rules.tags.length,1);
 const tag=rules.tags[0];assert.equal(tag.team,enemy.team);assert.equal(tag.owner,enemy.id);
 place(player,tag);rules.update(.02,game);assert.equal(rules.tags.length,0);assert.equal(rules.scores[0],1);assert.equal(player.confirms,1);
 rules.update(1,game);assert.equal(rules.scores[0],1);
});

test('allied tags are denied without points and dead actors cannot collect',()=>{
 const {game,player,enemy,rules}=fixture('confirmed');game.damage(enemy,200,player);
 rules.update(.1,game);assert.equal(rules.tags.length,1);assert.equal(enemy.denies,0);
 enemy.health=100;rules.update(.1,game);assert.equal(rules.tags.length,0);assert.equal(enemy.denies,1);assert.deepEqual(rules.scores,[0,0]);
});

test('tag collection respects walls and floors and tags expire within a bounded budget',()=>{
 const {game,player,enemy,rules}=fixture('confirmed');player.x=0;enemy.x=1;game.damage(enemy,200,player);
 game.arena.blocks.push({x:.5,y:1,z:0,w:.2,h:2,d:4,surface:'concrete'});
 rules.update(.02,game);assert.equal(rules.tags.length,1);
 game.arena.blocks.pop();player.y=3;rules.update(.02,game);assert.equal(rules.tags.length,1);
 player.x=-20;player.y=0;
 for(let i=0;i<MAX_TAGS+4;i++){enemy.health=100;game.damage(enemy,200,player);}
 assert.equal(rules.tags.length,MAX_TAGS);
 rules.update(TAG_LIFETIME,game);assert.equal(rules.tags.length,0);
});

test('last tag confirmation ends a match and freezing a completed match preserves score',()=>{
 const {game,player,enemy,rules}=fixture('confirmed');rules.scores[0]=rules.mode.limit-1;
 game.damage(enemy,200,player);place(player,enemy);rules.update(.02,game);
 assert.equal(rules.phase,'finished');assert.equal(rules.winner,0);assert.equal(rules.scores[0],rules.mode.limit);
 rules.update(1,game);assert.equal(rules.scores[0],rules.mode.limit);
});

test('bots select hold positions and recover both enemy and allied tags',()=>{
 for(const mode of ['hardpoint','confirmed']){
  const game=new Game({mode},{seed:781}),bot=game.actors[1];
  for(const a of game.actors)if(a!==bot)a.health=0;
  if(mode==='confirmed')game.rules.tags.push({id:1,x:bot.x+6,y:bot.y,z:bot.z,team:1,owner:4,age:0});
  bot.aiClock=0;updateBot(bot,1/60,game);
  if(mode==='hardpoint'){
   const p=game.rules.points[game.rules.activePoint];assert.equal(bot.state,'objective');assert(Math.hypot(bot.goal.x-p.x,bot.goal.z-p.z)<4.2);
  }else{
   assert.equal(bot.state,'collect');assert.equal(bot.goal.id,1);game.rules.tags[0].team=bot.team;bot.aiClock=0;updateBot(bot,1/60,game);assert.equal(bot.state,'collect');
  }
 }
});

test('bots pursue the enemy flag and prioritize a stolen or dropped home flag',()=>{
 const game=new Game({mode:'ctf',map:8},{seed:781}),bot=game.actors[1],own=game.rules.flags.find(f=>f.team===bot.team),enemy=game.rules.flags.find(f=>f.team!==bot.team);
 for(const a of game.actors)if(a!==bot)a.health=0;
 bot.aiClock=0;updateBot(bot,1/60,game);assert.equal(bot.state,'objective');assert.equal(bot.goal.x,enemy.x);assert.equal(bot.goal.z,enemy.z);
 own.atBase=false;own.carrier=null;own.x=bot.x+6;own.y=bot.y;own.z=bot.z;bot.aiClock=0;updateBot(bot,1/60,game);
 assert.equal(bot.state,'objective');assert.equal(bot.goal.x,own.x);assert.equal(bot.goal.z,own.z);
});
