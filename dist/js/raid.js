import {Weapon,WEAPONS} from './weapons.js?v=111';
import {distance} from './math.js?v=111';

export const RAID_INSERTIONS = [
 {id:'standard',name:'Standard',cost:0,armor:0,hostiles:6,time:240,extract:4,minimum:1,multiplier:1,description:'Three operators against six defenders.'},
 {id:'armored',name:'Armored',cost:180,armor:65,hostiles:6,time:240,extract:4,minimum:1,multiplier:1,description:'Start with 65 armor per squad member.'},
 {id:'rapid',name:'Rapid extraction',cost:160,armor:0,hostiles:6,time:240,extract:2,minimum:1,multiplier:1,description:'Extract in two uncontested seconds.'},
 {id:'contract',name:'High stakes',cost:250,armor:0,hostiles:10,time:180,extract:4,minimum:375,multiplier:2,description:'Face ten defenders in three minutes. Extract at least 375 salvage for double payout.'}
];
export const raidInsertion=id=>RAID_INSERTIONS.find(plan=>plan.id===id);

export const RAID_STASH_LIMIT=8;

export function restoreRaidWeapon(record){
 if(!Number.isInteger(record?.weapon)||!WEAPONS[record.weapon]||WEAPONS[record.weapon].kind==='MELEE')return null;
 const weapon=new Weapon(record.weapon,record.attachments);
 weapon.ammo=Number.isFinite(record.ammo)?Math.max(0,Math.min(weapon.capacity,Math.floor(record.ammo))):0;
 weapon.reserve=Number.isFinite(record.reserve)?Math.max(0,Math.min(weapon.capacity*5,Math.floor(record.reserve))):0;
 weapon.raidClaim=true;
 return weapon;
}

export function raidWeaponRecord(weapon){
 return {weapon:weapon.def.id,attachments:{...weapon.attachments},ammo:weapon.ammo,reserve:weapon.reserve};
}

export class Raid {
 constructor(arena,nav,plan=RAID_INSERTIONS[0]){
  this.plan=plan;
  const snap=point=>{
   const node=nav.nodes[nav.nearest(point)]??point;
   return {x:node.x,y:node.y,z:node.z};
  };
  this.caches=arena.objectives.map((point,index)=>({...snap(point),name:point.name,kind:'cache',value:[100,275,425][index],opened:false}));
  const home=arena.spawns.find(spawn=>spawn.team===0);
  this.exit={...snap(home),name:'EXTRACTION',kind:'exit'};
  this.carried=0;this.banked=0;this.stash=null;this.target=null;this.progress=0;this.alert=false;
 }
 get payout(){return this.banked*this.plan.multiplier;}
 near(actor,point,engine,radius){
  return !actor.dead&&distance(actor,point)<radius&&Math.abs(actor.y-point.y)<1.6&&
   engine.arena.visible(engine.eye(actor),{x:point.x,y:point.y+.55,z:point.z});
 }
 contested(engine){
  return engine.actors.some(actor=>actor.team===1&&this.near(actor,this.exit,engine,5));
 }
 available(engine){
  const actor=engine.player;
  if(actor.ride||actor.dead||engine.rules.phase!=='playing')return null;
  if(this.stash&&this.near(actor,this.stash,engine,2.3))return this.stash;
  const cache=this.caches.find(cache=>!cache.opened&&this.near(actor,cache,engine,2.6));
  if(cache)return cache;
  return this.carried>=this.plan.minimum&&this.near(actor,this.exit,engine,3.1)?this.exit:null;
 }
 onDeath(victim,engine){
  if(victim!==engine.player||!this.carried)return;
  this.stash={x:victim.x,y:engine.arena.floorAt(victim,victim.y+.08),z:victim.z,kind:'stash',value:this.carried};
  this.carried=0;this.target=null;this.progress=0;
  engine.emit('capture',{text:'SALVAGE DROPPED',position:this.stash});
 }
 update(dt,engine){
  const {player,rules}=engine;
  if(rules.time<=0||player.dead&&(player.downedUntil<=engine.time||!engine.actors.some(actor=>actor.team===0&&!actor.dead))){
   rules.finish(1);return;
  }
  const target=player.interacting&&!player.sprinting&&engine.time-player.lastDamage>=.25&&!engine.findRescue(player)&&this.available(engine);
  if(!target||target.kind==='exit'&&this.contested(engine)){this.target=null;this.progress=0;return;}
  if(this.target!==target){this.target=target;this.progress=0;}
  if(target.kind==='exit'&&!this.alert){
   this.alert=true;
   for(const actor of engine.actors){actor.aiClock=0;actor.pathClock=0;}
   engine.emit('capture',{text:'EXTRACTION SIGNAL SENT · HOSTILES INBOUND',position:this.exit});
  }
  this.progress+=dt;
  if(this.progress<(target.kind==='exit'?this.plan.extract:target.kind==='stash'?.65:1.5))return;
  this.target=null;this.progress=0;
  if(target.kind==='exit'){
   this.banked=this.carried;this.carried=0;rules.finish(0);return;
  }
  this.carried+=target.value;
  if(target.kind==='stash')this.stash=null;
  else target.opened=true;
  engine.emit('capture',{text:`SALVAGE RECOVERED · ${this.carried} CARRIED`,position:target});
 }
}
