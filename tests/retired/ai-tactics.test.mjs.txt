import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/js/engine.js';
import {updateBot} from '../dist/js/ai.js';

test('visible enemies can trigger a tactical bot frag with bounded cooldown',()=>{
 const game=new Game({mode:'tdm'},{seed:208}),bot=game.actors[1],target=game.actors[4];
 game.arena.blocks=[{x:0,y:-.2,z:0,w:200,h:.4,d:200,ground:true,surface:'concrete'}];
 for(const actor of game.actors)actor.health=0;
 bot.reset({x:0,y:0,z:0},0);target.reset({x:0,y:0,z:-9},Math.PI);
 bot.spawnProtection=target.spawnProtection=0;bot.target=target.id;bot.state='engage';bot.aiClock=1;bot.pathClock=1;bot.path=[];bot.reaction=2;bot.grenadeCooldown=0;bot.equipment='frag';bot.grenades=2;
 game.pathBudget=0;game.random=()=>0;updateBot(bot,1/30,game);
 assert.equal(game.grenades.length,1);assert.equal(game.grenades[0].owner,bot.id);assert.equal(game.grenades[0].kind,'frag');
 assert.equal(bot.grenades,1);assert(bot.grenadeCooldown>5);
});

test('bots flank instead of firing through an allied operator',()=>{
 const game=new Game({mode:'tdm'},{seed:910}),bot=game.actors[1],ally=game.actors[2],enemy=game.actors[4];
 game.arena.blocks=[{x:0,y:-.2,z:0,w:200,h:.4,d:200,ground:true,surface:'concrete'}];
 for(const actor of game.actors)actor.health=0;
 bot.reset({x:0,y:0,z:0},0);ally.reset({x:0,y:0,z:-3.5},0);enemy.reset({x:0,y:0,z:-8},0);
 bot.spawnProtection=ally.spawnProtection=enemy.spawnProtection=0;bot.grenades=0;bot.reaction=0;bot.aiClock=0;game.pathBudget=0;
 const ammo=bot.weapon.ammo;updateBot(bot,1/30,game);
 assert.equal(bot.state,'flank');assert(Math.abs(bot.goal.x)>1.8);assert.equal(bot.weapon.ammo,ammo);
 ally.x=3;bot.aiClock=0;bot.reaction=0;updateBot(bot,1/30,game);
 assert.equal(bot.weapon.ammo,ammo-1);
});

test('a close miss makes an enemy bot seek cover without taking damage',()=>{
 const game=new Game({mode:'tdm'},{seed:714}),player=game.player,bot=game.actors[4];
 game.arena.blocks=[{x:0,y:-.2,z:0,w:200,h:.4,d:200,ground:true,surface:'concrete'}];
 for(const actor of game.actors)actor.health=0;
 player.reset({x:0,y:0,z:0},0);bot.reset({x:1.1,y:0,z:-7},Math.PI);
 player.spawnProtection=bot.spawnProtection=0;player.weapon.cooldown=0;player.weapon.spread=()=>0;
 const health=bot.health;assert.equal(game.shoot(player),true);
 assert.equal(bot.health,health);assert(bot.suppression>1.5);
 bot.aiClock=0;game.pathBudget=0;updateBot(bot,1/30,game);
 assert.equal(bot.state,'retreat');assert(bot.goal);
 bot.reset({x:1.1,y:0,z:-7},Math.PI);assert.equal(bot.suppression,0);
});

test('suppression does not interrupt flag objectives',()=>{
 const game=new Game({mode:'ctf'},{seed:715}),bot=game.actors[1],enemy=game.actors[4];
 game.arena.blocks=[{x:0,y:-.2,z:0,w:200,h:.4,d:200,ground:true,surface:'concrete'}];
 for(const actor of game.actors)actor.health=0;
 bot.reset({x:0,y:0,z:0},0);enemy.reset({x:0,y:0,z:-8},Math.PI);
 bot.suppression=2;bot.aiClock=0;bot.grenades=0;game.pathBudget=0;
 updateBot(bot,1/30,game);
 assert.equal(bot.state,'objective');
});
