import {emptyInput} from './engine.js?v=71';

export const STRESS_SCENARIO=Object.freeze({id:'breachline-stress-v1',seed:771891,duration_simulation_seconds:180,mode:'tdm',phases:[['warmup',0,20],['camera_sweep',20,60],['movement',60,100],['combat',100,150],['effects',150,180]],effects:'Renderer receives scripted shot, explosion and smoke events in the effects phase; these have no damage. AI and all other simulation use the original engine.'});
export class StressSequence {
 constructor(){this.tick=0;this.phase='warmup';this.effectCounts={shots:0,explosions:0,smokes:0};}
 input(game){
  const t=this.tick/60,input=emptyInput();this.phase=STRESS_SCENARIO.phases.find(([,from,to])=>t>=from&&t<to)?.[0]??'complete';
  input.lx=t<20?.003:.018;input.ly=Math.sin(t*.4)*.002;
  if(t>=60&&t<100){input.mz=Math.sin(t*.18);input.mx=Math.cos(t*.21)*.6;input.sprint=true;input.jump=this.tick%240===0;}
  if(t>=100&&t<150){input.fire=true;input.repeatFire=true;input.autoReload=true;input.ads=t%8<4;input.grenade=this.tick%900===0;}
  // Real renderer workload. The benchmark records measured frames, not fake FPS.
  if(t>=150){const p=game.player,pos={x:p.x+Math.sin(p.yaw)*8,y:p.y+1,z:p.z-Math.cos(p.yaw)*8};if(this.tick%6===0){game.emit('shot',{position:game.eye(p),end:pos,source:0,weapon:p.weapon.def.id});this.effectCounts.shots++;}if(this.tick%60===0){game.emit('explosion',{position:pos,value:6});this.effectCounts.explosions++;}if(this.tick%180===0){game.emit('smoke',{position:pos});this.effectCounts.smokes++;}}
  this.tick++;return input;
 }
 get done(){return this.tick>=STRESS_SCENARIO.duration_simulation_seconds*60;}
}
