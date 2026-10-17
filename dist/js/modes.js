import {GUN_ORDER} from './weapons.js?v=71';
import {distance} from './math.js?v=71';

export const MODES = [
 {id:'tdm',name:'TEAM DEATHMATCH',short:'TDM',description:'4 vs 4. First team to 40 eliminations.',limit:40,time:360,teams:true},
 {id:'ffa',name:'FREE FOR ALL',short:'FFA',description:'Every operator for themselves. First to 20.',limit:20,time:360,teams:false},
 {id:'sabotage',name:'SABOTAGE',short:'SAB',description:'Plant or defuse. One life per round. First to 4 rounds.',limit:4,time:110,teams:true},
 {id:'domination',name:'DOMINATION',short:'DOM',description:'Capture A, B and C. Hold them to reach 150 points.',limit:150,time:480,teams:true},
 {id:'gun',name:'GUN GAME',short:'GUN',description:`${GUN_ORDER.length} guns. One elimination per tier. Final gun: Krait R revolver.`,limit:GUN_ORDER.length,time:900,teams:false},
 {id:'hardpoint',name:'HARDPOINT',short:'HARD',description:'Hold the rotating zone. Contested zones score nothing. First to 150.',limit:150,time:480,teams:true},
 {id:'confirmed',name:'KILL CONFIRMED',short:'KC',description:'Collect enemy tags to score. Recover allied tags to deny. First to 30.',limit:30,time:420,teams:true},
 {id:'ctf',name:'CAPTURE THE FLAG',short:'CTF',description:'Steal the enemy flag, carry it home, and keep your own flag safe. First to 3 captures.',limit:3,time:480,teams:true},
 {id:'hill',name:'KING OF THE HILL',short:'KOTH',description:'Every operator for themselves. Occupy the hill alone to score. First to 75.',limit:75,time:480,teams:false},
 {id:'elimination',name:'ELIMINATION',short:'ELIM',description:'4 vs 4. One life each round. Eliminate the other team. First to 5 rounds.',limit:5,time:75,teams:true},
 {id:'frontline',name:'FRONTLINE',short:'FRONT',description:'Capture the active sector to push the line. Break through the enemy rear sector to win.',limit:3,time:600,teams:true}
];

export const HARDPOINT_SECONDS = 45;
export const TAG_LIFETIME = 30;
export const MAX_TAGS = 32;
export const FLAG_RETURN_SECONDS = 25;

export class MatchRules {
 constructor(mode,arena) {
  this.mode=MODES.find(m=>m.id===mode)||MODES[0];
  // The expanded arenas need travel time as well as one kill per firearm.
  if(this.mode.id==='gun'&&arena.info.size>=58)this.mode={...this.mode,time:1350};
  this.time=this.mode.time;this.scores=[0,0];this.phase='playing';this.round=1;this.roundWait=0;
  this.winner=null;this.roundWinner=null;this.message='';this.planted=false;this.bombTime=35;
  this.bombSite=-1;this.tick=0;
  this.points=arena.objectives.map(p=>({...p,owner:-1,progress:0,capturing:-1,contested:false}));
  this.siteProgress=0;this.interactor=null;
  this.activePoint=this.points.length>1?1:0;this.rotationRemaining=HARDPOINT_SECONDS;
  this.frontlineProgress=0;
  if(this.mode.id==='frontline'){
   for(let i=0;i<this.points.length;i++)this.points[i].owner=i<this.activePoint?0:i>this.activePoint?1:-1;
   this.scores=[this.points.filter(p=>p.owner===0).length,this.points.filter(p=>p.owner===1).length];
  }
  // A tag belongs to the fallen actor's team; collecting your own team's tag denies it.
  this.tags=[];this.nextTagId=1;
  this.flags=mode==='ctf'?arena.spawns.reduce((out,spawn)=>{
   const group=arena.spawns.filter(p=>p.team===spawn.team).slice(0,4);
   if(out.some(flag=>flag.team===spawn.team)||!group.length)return out;
   const x=group.reduce((n,p)=>n+p.x,0)/group.length,z=group.reduce((n,p)=>n+p.z,0)/group.length;
   out.push({team:spawn.team,x,y:arena.floorAt({x,y:0,z}),z,homeX:x,homeY:arena.floorAt({x,y:0,z}),homeZ:z,carrier:null,atBase:true,age:0});return out;
  },[]):[];
  for(const base of arena.flagBases??[])if(this.mode.id==='ctf'){
   const flag=this.flags.find(f=>f.team===base.team);if(flag)Object.assign(flag,{x:base.x,y:base.y,z:base.z,homeX:base.x,homeY:base.y,homeZ:base.z});
  }
 }
 get attackingTeam(){return Math.floor((this.round-1)/3)%2;}
 get respawns(){return !['sabotage','elimination'].includes(this.mode.id);}
 enemies(a,b){return a.id!==b.id&&(!this.mode.teams||a.team!==b.team);}
 onDeath(victim,engine){
  if(this.mode.id!=='ctf')return;
  const flag=this.flags.find(f=>f.carrier===victim.id);if(!flag)return;
  flag.carrier=null;flag.x=victim.x;flag.y=engine.arena.floorAt(victim,victim.y+.08);flag.z=victim.z;flag.atBase=false;flag.age=0;
  engine.emit('capture',{text:`${flag.team===0?'BLUE':'RED'} FLAG DROPPED`,source:victim.team,position:{x:flag.x,y:flag.y,z:flag.z}});
 }
 onKill(killer,victim,engine) {
  if(this.mode.id==='tdm') {
   this.scores[killer.team]++;
   if(this.scores[killer.team]>=this.mode.limit)this.finish(killer.team);
  }
  if(this.mode.id==='ffa'&&killer.kills>=this.mode.limit)this.finish(killer.id);
  if(this.mode.id==='gun'&&killer.gunStage>=GUN_ORDER.length)this.finish(killer.id);
  if(this.mode.id==='confirmed'&&victim&&this.enemies(killer,victim)) {
   if(this.tags.length>=MAX_TAGS)this.tags.shift();
   const y=engine?engine.arena.floorAt(victim,victim.y+.08):victim.y;
   this.tags.push({id:this.nextTagId++,x:victim.x,y,z:victim.z,team:victim.team,owner:victim.id,age:0});
  }
 }
 finish(winner){this.phase='finished';this.winner=winner;}
 roundEnd(team,text) {
  if(this.phase!=='playing')return;
  if(team>=0)this.scores[team]++;this.roundWinner=team;this.message=text;
  if(team>=0&&this.scores[team]>=this.mode.limit){this.finish(team);return;}
  this.phase='roundBreak';this.roundWait=4;
 }
 nextRound() {
  this.round++;this.phase='playing';this.time=this.mode.time;this.planted=false;
  this.bombTime=35;this.bombSite=-1;this.siteProgress=0;this.interactor=null;this.message='';
 }
 updateHardpoint(dt,engine) {
  if(!this.points.length)return;
  let remaining=dt;
  while(remaining>0&&this.phase==='playing') {
   const step=Math.min(remaining,this.rotationRemaining),p=this.points[this.activePoint];
   let blue=0,orange=0;
   for(const a of engine.actors)if(!a.dead&&distance(a,p)<4.2&&Math.abs(a.y-p.y)<2.6) {
    if(a.team===0)blue++;else orange++;
   }
   p.contested=blue>0&&orange>0;
   const owner=p.contested||(!blue&&!orange)?-1:blue?0:1;
   if(owner!==p.owner||owner<0)this.tick=0;
   p.owner=owner;p.capturing=owner;p.progress=owner>=0?1:0;
   if(owner>=0) {
    this.tick+=step;
    const points=Math.floor(this.tick+1e-9);
    if(points>0) {
     this.tick=Math.max(0,this.tick-points);
     this.scores[owner]=Math.min(this.mode.limit,this.scores[owner]+points);
     if(this.scores[owner]>=this.mode.limit){this.finish(owner);return;}
    }
   }
   remaining-=step;this.rotationRemaining-=step;
   if(this.rotationRemaining<=1e-8) {
    p.owner=-1;p.capturing=-1;p.progress=0;p.contested=false;this.tick=0;
    this.activePoint=(this.activePoint+1)%this.points.length;
    this.rotationRemaining=HARDPOINT_SECONDS;
    engine.emit('capture',{text:`HARDPOINT MOVED · ${this.points[this.activePoint].name}`});
   }
  }
 }
 updateTags(dt,engine) {
  for(let i=this.tags.length-1;i>=0;i--) {
   const tag=this.tags[i];tag.age+=dt;
   if(tag.age>=TAG_LIFETIME){this.tags.splice(i,1);continue;}
   let collector=null,nearest=1.65;
   for(const a of engine.actors) {
    if(a.dead||Math.abs(a.y-tag.y)>1.9)continue;
    const d=distance(a,tag);
    if(d>=nearest)continue;
    // Reachable tags must not be collected through a wall or a floor.
    if(!engine.arena.visible(engine.eye(a),{x:tag.x,y:tag.y+.32,z:tag.z}))continue;
    collector=a;nearest=d;
   }
   if(!collector)continue;
   this.tags.splice(i,1);
   const denied=collector.team===tag.team;
   if(denied)collector.denies=(collector.denies??0)+1;
   else {
    collector.confirms=(collector.confirms??0)+1;
    this.scores[collector.team]++;
   }
   engine.emit('capture',{text:denied?'TAG DENIED':'KILL CONFIRMED',source:collector.team,actor:collector.id,denied,position:{x:tag.x,y:tag.y,z:tag.z}});
   if(this.scores[collector.team]>=this.mode.limit){this.finish(collector.team);return;}
  }
 }
 updateHill(dt,engine){
  if(!this.points.length)return;
  let remaining=dt;
  while(remaining>0&&this.phase==='playing'){
   const step=Math.min(remaining,this.rotationRemaining),point=this.points[this.activePoint];
   const occupants=engine.actors.filter(a=>!a.dead&&distance(a,point)<4.2&&Math.abs(a.y-point.y)<2.6);
   const owner=occupants.length===1?occupants[0]:null;
   point.contested=occupants.length>1;
   if(point.owner!==owner?.id||!owner)this.tick=0;
   point.owner=owner?.id??-1;point.progress=owner?1:0;point.capturing=point.owner;
   if(owner){
    this.tick+=step;const score=Math.floor(this.tick+1e-9);
    if(score){this.tick=Math.max(0,this.tick-score);owner.hillScore=Math.min(this.mode.limit,(owner.hillScore??0)+score);if(owner.hillScore>=this.mode.limit){this.finish(owner.id);return;}}
   }
   remaining-=step;this.rotationRemaining-=step;
   if(this.rotationRemaining<=1e-8){
    point.owner=-1;point.progress=0;point.contested=false;this.tick=0;
    this.activePoint=(this.activePoint+1)%this.points.length;this.rotationRemaining=HARDPOINT_SECONDS;
    engine.emit('capture',{text:`HILL MOVED · ${this.points[this.activePoint].name}`});
   }
  }
 }
 spawnAllowed(actor,p){
  if(this.mode.id!=='frontline'||this.points.length<2)return true;
  const a=this.points[0],b=this.points.at(-1),front=this.points[this.activePoint],dx=b.x-a.x,dz=b.z-a.z,n=Math.hypot(dx,dz)||1;
  const separation=((p.x-front.x)*dx+(p.z-front.z)*dz)/n;
  return actor.team===0?separation<-6:separation>6;
 }
 updateFrontline(dt,engine){
  const point=this.points[this.activePoint];if(!point)return;
  const occupants=engine.actors.filter(a=>!a.dead&&distance(a,point)<4.8&&Math.abs(a.y-point.y)<1.8&&engine.arena.visible(engine.eye(a),{x:point.x,y:point.y+.3,z:point.z}));
  const count=[occupants.filter(a=>a.team===0).length,occupants.filter(a=>a.team===1).length];
  point.contested=count[0]>0&&count[1]>0;
  if(!point.contested){
   if(count[0]||count[1]){const team=count[0]?0:1;this.frontlineProgress+=(team===0?1:-1)*dt*Math.min(2,count[team])/8;point.capturing=team;}
   else {const sign=Math.sign(this.frontlineProgress);this.frontlineProgress=sign*Math.max(0,Math.abs(this.frontlineProgress)-dt*.05);point.capturing=-1;}
  }
  point.progress=Math.min(1,Math.abs(this.frontlineProgress));
  if(point.progress<1-1e-8)return;
  const team=this.frontlineProgress>0?0:1,old=this.activePoint;
  point.owner=team;point.progress=0;point.capturing=-1;point.contested=false;this.frontlineProgress=0;
  this.scores=[this.points.filter(p=>p.owner===0).length,this.points.filter(p=>p.owner===1).length];
  for(const actor of occupants)if(actor.team===team)actor.captures=(actor.captures??0)+1;
  engine.emit('capture',{text:`${team===0?'BLUE':'RED'} SECURED ${point.name} · LINE ADVANCED`,source:team,position:{x:point.x,y:point.y,z:point.z}});
  if(team===0&&old===this.points.length-1||team===1&&old===0){this.finish(team);return;}
  this.activePoint+=team===0?1:-1;
  // Force a route refresh, with existing per-frame A* and spawn safety budgets.
  for(const actor of engine.actors)if(actor.id!==0){actor.pathClock=0;actor.aiClock=0;actor.path=[];actor.pathIndex=0;}
 }
 updateElimination(engine){
  const alive=[0,0],health=[0,0];
  for(const actor of engine.actors)if(!actor.dead){alive[actor.team]++;health[actor.team]+=actor.health;}
  if(!alive[0]&&!alive[1]){this.roundEnd(-1,'ROUND DRAW');return;}
  if(!alive[0]||!alive[1]){this.roundEnd(alive[0]?0:1,'ENEMY TEAM ELIMINATED');return;}
  if(this.time<=0){
   const winner=alive[0]!==alive[1]?(alive[0]>alive[1]?0:1):Math.abs(health[0]-health[1])<.001?-1:health[0]>health[1]?0:1;
   this.roundEnd(winner,winner<0?'ROUND DRAW':'ROUND SECURED');
  }
 }
 updateFlags(dt,engine){
  for(const flag of this.flags)if(flag.carrier!==null){
   const carrier=engine.actors.find(a=>a.id===flag.carrier&&!a.dead);
   if(carrier){flag.x=carrier.x;flag.y=carrier.y;flag.z=carrier.z;}
  }
  for(const flag of this.flags)if(!flag.atBase&&flag.carrier===null){
   flag.age+=dt;if(flag.age>=FLAG_RETURN_SECONDS){flag.x=flag.homeX;flag.y=flag.homeY;flag.z=flag.homeZ;flag.age=0;flag.atBase=true;engine.emit('capture',{text:`${flag.team===0?'BLUE':'RED'} FLAG RETURNED`,source:flag.team,position:{x:flag.x,y:flag.y,z:flag.z}});}
  }
  const near=(actor,flag,radius=1.65)=>!actor.dead&&Math.abs(actor.y-flag.y)<2.2&&distance(actor,flag)<radius&&engine.arena.visible(engine.eye(actor),{x:flag.x,y:flag.y+.45,z:flag.z});
  for(const actor of engine.actors){if(actor.dead)continue;
   const own=this.flags.find(f=>f.team===actor.team),enemy=this.flags.find(f=>f.team!==actor.team);if(!own||!enemy)continue;
   if(!own.atBase&&own.carrier===null&&near(actor,own,1.8)){
    own.x=own.homeX;own.y=own.homeY;own.z=own.homeZ;own.atBase=true;own.age=0;
    engine.emit('capture',{text:'FLAG RETURNED',source:actor.team,actor:actor.id,position:{x:own.x,y:own.y,z:own.z}});
   }
   const carried=this.flags.find(f=>f.carrier===actor.id);
   if(carried){
    if(own.atBase&&distance(actor,own)<2.2&&Math.abs(actor.y-own.y)<2.5){
     this.scores[actor.team]++;actor.captures=(actor.captures??0)+1;
     engine.emit('capture',{text:`${actor.team===0?'BLUE':'RED'} FLAG CAPTURED`,source:actor.team,actor:actor.id,position:{x:own.x,y:own.y,z:own.z}});
     carried.x=carried.homeX;carried.y=carried.homeY;carried.z=carried.homeZ;carried.carrier=null;carried.atBase=true;carried.age=0;
     if(this.scores[actor.team]>=this.mode.limit){this.finish(actor.team);return;}
    }
    continue;
   }
   if(enemy.carrier===null&&near(actor,enemy)){
    enemy.carrier=actor.id;enemy.atBase=false;enemy.age=0;
    engine.emit('capture',{text:`${enemy.team===0?'BLUE':'RED'} FLAG TAKEN`,source:actor.team,actor:actor.id,position:{x:enemy.x,y:enemy.y,z:enemy.z}});
   }
  }
 }
 update(dt,engine) {
  if(this.phase==='finished')return;
  if(this.phase==='roundBreak') {
   this.roundWait-=dt;
   if(this.roundWait<=0){this.nextRound();engine.resetRound();}
   return;
  }
  const elapsed=Math.min(dt,this.time);
  this.time=Math.max(0,this.time-dt);
  if(this.mode.id==='ctf')this.updateFlags(elapsed,engine);
  if(this.mode.id==='hardpoint')this.updateHardpoint(elapsed,engine);
  if(this.mode.id==='confirmed')this.updateTags(elapsed,engine);
  if(this.mode.id==='hill')this.updateHill(elapsed,engine);
  if(this.mode.id==='frontline')this.updateFrontline(elapsed,engine);
  if(this.mode.id==='elimination'){this.updateElimination(engine);return;}
  if(this.phase==='finished')return;
  if(this.mode.id==='domination') {
   for(const p of this.points) {
    const count=[0,0];
    for(const a of engine.actors)if(!a.dead&&distance(a,p)<4.2&&Math.abs(a.y-p.y)<2.6)count[a.team]++;
    p.contested=count[0]>0&&count[1]>0;
    if(!p.contested&&(count[0]||count[1])) {
     const team=count[0]?0:1;
     if(p.owner!==team) {
      if(p.capturing!==team){p.capturing=team;p.progress=0;}
      p.progress+=dt*Math.min(2,count[team])/5;
      if(p.progress>=1){p.owner=team;p.progress=0;engine.emit('capture',{text:`${p.name} captured`,source:team});}
     }else p.progress=0;
    }else if(!p.contested)p.progress=Math.max(0,p.progress-dt*.1);
   }
   this.tick+=dt;
   if(this.tick>=1) {
    this.tick-=1;
    for(const p of this.points)if(p.owner>=0)this.scores[p.owner]++;
    if(Math.max(...this.scores)>=150)this.finish(this.scores[0]===this.scores[1]?-1:this.scores[0]>this.scores[1]?0:1);
   }
  }
  if(this.mode.id==='sabotage') {
   if(this.planted) {
    this.bombTime-=dt;
    if(this.bombTime<=0){engine.emit('explosion',{position:this.points[this.bombSite],value:12});this.roundEnd(this.attackingTeam,'CHARGE DETONATED');return;}
   }
   const alive=[0,0];
   for(const a of engine.actors)if(!a.dead)alive[a.team]++;
   if(alive[1-this.attackingTeam]===0){this.roundEnd(this.attackingTeam,'DEFENDERS ELIMINATED');return;}
   if(!this.planted&&alive[this.attackingTeam]===0){this.roundEnd(1-this.attackingTeam,'ATTACKERS ELIMINATED');return;}
   if(this.time<=0&&!this.planted){this.roundEnd(1-this.attackingTeam,'SITE SECURED');return;}
   let chosen=null,site=-1;
   for(const a of engine.actors) {
    if(a.dead||!a.interacting||a.sprinting)continue;
    for(let i=0;i<2;i++) {
     const index=i===0?0:2,p=this.points[index];
     if(distance(a,p)>3||Math.abs(a.y-p.y)>2)continue;
     if((!this.planted&&a.team===this.attackingTeam)||(this.planted&&a.team!==this.attackingTeam&&index===this.bombSite)){chosen=a;site=index;break;}
    }
    if(chosen)break;
   }
   if(chosen) {
    if(this.interactor!==chosen.id){this.siteProgress=0;for(const a of engine.actors)a.interactProgress=0;}
    this.interactor=chosen.id;this.siteProgress+=dt/(this.planted?5:3);chosen.interactProgress=this.siteProgress;
    if(this.siteProgress>=1) {
     if(this.planted)this.roundEnd(chosen.team,'CHARGE DEFUSED');
     else{this.planted=true;this.bombSite=site;this.bombTime=35;engine.emit('capture',{text:'CHARGE ARMED · DEFEND IT'});}
     chosen.interactProgress=0;this.siteProgress=0;this.interactor=null;
    }
   }else{this.siteProgress=0;this.interactor=null;for(const a of engine.actors)a.interactProgress=0;}
  }
  if(this.time<=0&&this.mode.id!=='sabotage') {
   if(this.mode.teams)this.finish(this.scores[0]===this.scores[1]?-1:this.scores[0]>this.scores[1]?0:1);
   else {
    const value=a=>this.mode.id==='gun'?a.gunStage:this.mode.id==='hill'?a.hillScore??0:a.kills;
    const ranking=engine.actors.slice().sort((a,b)=>value(b)-value(a));
    this.finish(!ranking[1]||value(ranking[0])!==value(ranking[1])?ranking[0].id:-1);
   }
  }
 }
}
