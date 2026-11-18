import {GUN_ORDER} from './weapons.js?v=107';
import {distance} from './math.js?v=107';

export const MODES = [
 {id:'tdm',name:'TEAM DEATHMATCH',short:'TDM',description:'4 vs 4. First team to 40 eliminations.',limit:40,time:360,teams:true},
 {id:'ffa',name:'FREE FOR ALL',short:'FFA',description:'Every operator for themselves. First to 20.',limit:20,time:360,teams:false},
 {id:'sabotage',name:'SABOTAGE',short:'SAB',description:'Carry, recover, plant or defuse the charge. One life per round. First to 4 rounds.',limit:4,time:110,teams:true},
 {id:'domination',name:'DOMINATION',short:'DOM',description:'Capture A, B and C. Hold them to reach 150 points.',limit:150,time:480,teams:true},
 {id:'gun',name:'GUN GAME',short:'GUN',description:`${GUN_ORDER.length} guns. One elimination per tier. Final gun: Krait R revolver.`,limit:GUN_ORDER.length,time:900,teams:false},
 {id:'hardpoint',name:'HARDPOINT',short:'HARD',description:'Hold the rotating zone. Contested zones score nothing. First to 150.',limit:150,time:480,teams:true},
 {id:'confirmed',name:'KILL CONFIRMED',short:'KC',description:'Collect enemy tags to score. Recover allied tags to deny. First to 30.',limit:30,time:420,teams:true},
 {id:'ctf',name:'CAPTURE THE FLAG',short:'CTF',description:'Steal the enemy flag, carry it home, and keep your own flag safe. First to 3 captures.',limit:3,time:480,teams:true},
 {id:'hill',name:'KING OF THE HILL',short:'KOTH',description:'Every operator for themselves. Occupy the hill alone to score. First to 75.',limit:75,time:480,teams:false},
 {id:'elimination',name:'ELIMINATION',short:'ELIM',description:'4 vs 4. One life each round. Eliminate the other team. First to 5 rounds.',limit:5,time:75,teams:true},
 {id:'frontline',name:'FRONTLINE',short:'FRONT',description:'Capture the active sector to push the line. Break through the enemy rear sector to win.',limit:3,time:600,teams:true},
 {id:'survival',name:'LAST STAND',short:'LAST STAND',description:'Lead a three-operator squad through six enemy waves. Use three shared supply drops to stay in the fight.',limit:6,time:120,teams:true},
 {id:'convoy',name:'CONVOY',short:'CONVOY',description:'Escort the moving drone through the route, then swap sides. Furthest distance wins. Full deliveries are decided by time.',limit:100,time:150,teams:true},
 {id:'raid',name:'SALVAGE RAID',short:'RAID',description:'Recover salvage caches and return to extraction before time expires. Extract early or risk the squad for more.',limit:800,time:240,teams:true}
];

export const SURVIVAL_WAVES=[
 {name:'Vanguard',roles:[0,0,1,1]},
 {name:'Close Quarters',roles:[1,2,1,2,1,2]},
 {name:'Overwatch',roles:[3,0,3,0,4,0,3,0]},
 {name:'Smoke Screen',roles:[1,2,0,1,2,0,1,2,0,4],smoke:true},
 {name:'Second Front',roles:[4,0,1,0,4,3,2,1,2,4,0,5],reserve:5},
 {name:'The Commander',roles:[4,5,5,5,0,1,2,3,0,1,2,4,0,5]}
];
const OVERTIME_SECONDS = 90;
export const HARDPOINT_SECONDS = 45;
export const TAG_LIFETIME = 30;
export const MAX_TAGS = 32;
export const FLAG_RETURN_SECONDS = 25;

const OBJECTIVE_XP={
 domination:{capture:150},frontline:{capture:200,recover:100,extract:400},ctf:{capture:300,return:100},
 confirmed:{confirm:100,deny:75},hardpoint:{hold:10},hill:{hold:12},
 sabotage:{recover:75,plant:225,defuse:300}
};
export class MatchRules {
 constructor(mode,arena) {
  this.mode=MODES.find(m=>m.id===mode)||MODES[0];
  // The expanded arenas need travel time as well as one kill per firearm.
  if(this.mode.id==='gun'&&arena.info.size>=58)this.mode={...this.mode,time:1350};
  this.time=this.mode.time;this.overtime=false;this.scores=[0,0];this.phase='playing';this.round=1;this.roundWait=0;
  this.winner=null;this.roundWinner=null;this.message='';this.planted=false;this.bombTime=35;
  this.bombSite=-1;this.chargeCarrier=null;this.droppedCharge=null;this.tick=0;
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
 awardObjective(actor,action,amount=1){
  actor.objectiveXP+=OBJECTIVE_XP[this.mode.id][action]*amount;
 }
 get attackingTeam(){return Math.floor((this.round-1)/3)%2;}
 get respawns(){return !['sabotage','elimination','survival','raid'].includes(this.mode.id);}
 enemies(a,b){return a.id!==b.id&&(!this.mode.teams||a.team!==b.team);}
 get sabotageSites(){return this.points.filter((_,index)=>index===0||index===2);}
 assignCharge(actors){
  if(this.mode.id!=='sabotage')return;
  this.chargeCarrier=actors.find(actor=>actor.team===this.attackingTeam&&!actor.dead)?.id??null;
  this.droppedCharge=null;
 }
 sabotageTarget(actor){
  if(this.mode.id!=='sabotage'||this.phase!=='playing'||actor.dead)return null;
  if(this.planted)return actor.team!==this.attackingTeam?this.points[this.bombSite]:null;
  if(actor.id!==this.chargeCarrier)return null;
  return this.sabotageSites.find(point=>distance(actor,point)<3&&Math.abs(actor.y-point.y)<=2)??null;
 }
 canUseCharge(actor,engine){
  const point=this.sabotageTarget(actor);
  return !!point&&!actor.sprinting&&distance(actor,point)<3&&Math.abs(actor.y-point.y)<=2&&
   engine.arena.visible(engine.eye(actor),{x:point.x,y:point.y+.7,z:point.z});
 }
 onDeath(victim,engine){
  this.raid?.onDeath(victim,engine);
  if(this.payload?.carrier===victim.id){
   this.payload.carrier=null;
   this.payload.position={x:victim.x,y:engine.arena.floorAt(victim,victim.y+.08),z:victim.z};
   engine.emit('capture',{text:'DATA CORE DROPPED',position:this.payload.position});
  }
  if(this.mode.id==='sabotage'&&!this.planted&&victim.id===this.chargeCarrier){
   this.chargeCarrier=null;
   this.droppedCharge={x:victim.x,y:engine.arena.floorAt(victim,victim.y+.08),z:victim.z};
   engine.emit('capture',{text:'CHARGE DROPPED',source:victim.team,position:this.droppedCharge});
  }
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
 scoreLeader(actors){
  if(this.mode.teams)return this.scores[0]===this.scores[1]?-1:this.scores[0]>this.scores[1]?0:1;
  const metric=this.mode.id==='gun'?'gunStage':this.mode.id==='hill'?'hillScore':'kills';
  let best=-Infinity,leader=-1;
  for(const actor of actors){
   const score=actor[metric]??0;
   if(score>best){best=score;leader=actor.id;}
   else if(score===best)leader=-1;
  }
  return leader;
 }
 resolveTimedMatch(engine){
  const leader=this.scoreLeader(engine.actors);
  if(leader>=0||this.overtime){this.finish(leader);return;}
  this.overtime=true;
  this.time=OVERTIME_SECONDS;
  engine.emit('round',{text:'OVERTIME · TAKE THE LEAD'});
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
  this.bombTime=35;this.bombSite=-1;this.chargeCarrier=null;this.droppedCharge=null;this.siteProgress=0;this.interactor=null;this.message='';
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
     const awarded=Math.min(points,this.mode.limit-this.scores[owner]);
     this.scores[owner]+=awarded;
     for(const actor of engine.actors)if(!actor.dead&&actor.team===owner&&distance(actor,p)<4.2&&Math.abs(actor.y-p.y)<2.6)this.awardObjective(actor,'hold',awarded);
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
   this.awardObjective(collector,denied?'deny':'confirm');
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
    if(score){this.tick=Math.max(0,this.tick-score);const awarded=Math.min(score,this.mode.limit-(owner.hillScore??0));owner.hillScore=(owner.hillScore??0)+awarded;this.awardObjective(owner,'hold',awarded);if(owner.hillScore>=this.mode.limit){this.finish(owner.id);return;}}
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
  if(this.payload||this.mode.id!=='frontline'||this.points.length<2)return true;
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
  for(const actor of occupants)if(actor.team===team){actor.captures++;this.awardObjective(actor,'capture');}
  if(team===0&&old===this.points.length-1&&engine.operation?.id==='siege'){
   this.payload={carrier:null,position:{x:point.x,y:point.y,z:point.z}};
   this.activePoint=0;this.time=150;
   engine.emit('capture',{text:'VAULT BREACHED · EXTRACT THE DATA CORE',position:this.payload.position});
  }else{
   engine.emit('capture',{text:`${team===0?'BLUE':'RED'} SECURED ${point.name} · LINE ADVANCED`,source:team,position:{x:point.x,y:point.y,z:point.z}});
   if(team===0&&old===this.points.length-1||team===1&&old===0){this.finish(team);return;}
   this.activePoint+=team===0?1:-1;
  }
  // Force a route refresh, with existing per-frame A* and spawn safety budgets.
  for(const actor of engine.actors)if(actor.id!==0){actor.pathClock=0;actor.aiClock=0;actor.path=[];actor.pathIndex=0;}
 }
 updateExtraction(engine){
  const payload=this.payload,exit=this.points[this.activePoint];
  const near=(actor,point,radius)=>distance(actor,point)<radius&&Math.abs(actor.y-point.y)<1.8&&
   engine.arena.visible(engine.eye(actor),{x:point.x,y:point.y+.4,z:point.z});
  if(payload.carrier===null){
   let collector=null,best=1.8;
   for(const actor of engine.actors){
    if(actor.dead||actor.team!==0||!near(actor,payload.position,best))continue;
    collector=actor;best=distance(actor,payload.position);
   }
   if(collector){
    payload.carrier=collector.id;payload.position=null;this.awardObjective(collector,'recover');
    engine.emit('capture',{text:'DATA CORE SECURED · RETURN TO EXTRACTION',actor:collector.id});
   }
   return;
  }
  const carrier=engine.actors.find(actor=>actor.id===payload.carrier&&!actor.dead);
  if(carrier&&near(carrier,exit,3.5)&&!engine.actors.some(actor=>!actor.dead&&actor.team===1&&near(actor,exit,4.8))){
   this.awardObjective(carrier,'extract');
   engine.emit('capture',{text:'DATA CORE EXTRACTED',source:0,position:exit});
   this.finish(0);
  }
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
    this.awardObjective(actor,'return');
    engine.emit('capture',{text:'FLAG RETURNED',source:actor.team,actor:actor.id,position:{x:own.x,y:own.y,z:own.z}});
   }
   const carried=this.flags.find(f=>f.carrier===actor.id);
   if(carried){
    if(own.atBase&&distance(actor,own)<2.2&&Math.abs(actor.y-own.y)<2.5){
     this.scores[actor.team]++;actor.captures++;this.awardObjective(actor,'capture');
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
 updateConvoy(dt,engine){
  const convoy=this.convoy,attacking=this.round-1;
  convoy.move(dt,engine,attacking);
  this.scores[attacking]=Math.floor(100*convoy.progress/(convoy.length||1));
  if(!convoy.checkpointReached&&convoy.progress>=convoy.checkpoint&&convoy.progress>0){
   convoy.checkpointReached=true;this.time+=35;
   engine.emit('capture',{text:'CONVOY CHECKPOINT · +35 SECONDS'});
  }
  const delivered=convoy.progress>=convoy.length;
  const first=convoy.results[0];
  if(first){
   if(!first.delivered&&convoy.progress>first.progress){this.finish(attacking);return;}
   if(delivered||this.time<=0||first.delivered&&convoy.elapsed>first.elapsed+1e-6){
    this.finish(delivered&&first.delivered&&Math.abs(convoy.elapsed-first.elapsed)<1e-6?-1:
     delivered&&convoy.elapsed<first.elapsed?attacking:convoy.progress===first.progress&&!first.delivered?-1:0);
   }
   return;
  }
  if(!delivered&&this.time>0)return;
  convoy.results.push({delivered,progress:convoy.progress,elapsed:convoy.elapsed});
  this.phase='roundBreak';this.roundWait=5;
  this.message='SIDES SWAPPING · BEAT THE FIRST RUN';
  engine.emit('round',{text:this.message});
 }
 updateSurvival(engine){
  const allies=engine.actors.filter(actor=>actor.team===0&&!actor.dead).length;
  let enemies=engine.actors.filter(actor=>actor.team===1&&!actor.dead).length;
  if(allies&&engine.survival.pending.length&&(enemies<=3||this.time<=92))enemies+=engine.releaseSurvivalReserve();
  this.scores[1]=enemies+engine.survival.pending.length;
  if(!allies){this.finish(1);return;}
  if(!enemies){
   this.scores[0]++;
   if(this.scores[0]>=this.mode.limit){this.finish(0);return;}
   this.phase='roundBreak';this.roundWait=6;
   this.message=`WAVE ${this.round} CLEARED · SQUAD REGROUPING`;
   engine.emit('round',{text:this.message});
   return;
  }
  if(this.time<=0)this.finish(1);
 }
 update(dt,engine) {
  if(this.phase==='finished')return;
  if(this.phase==='roundBreak') {
   this.roundWait-=dt;
   if(this.roundWait<=0){this.nextRound();this.convoy?.reset();if(this.mode.id==='survival')engine.startSurvivalWave();else engine.resetRound();}
   return;
  }
  const elapsed=Math.min(dt,this.time);
  this.time=Math.max(0,this.time-dt);
  if(this.raid){this.raid.update(elapsed,engine);return;}
  if(this.convoy){this.updateConvoy(elapsed,engine);return;}
  if(this.mode.id==='survival'){this.updateSurvival(engine);return;}
  if(this.mode.id==='ctf')this.updateFlags(elapsed,engine);
  if(this.mode.id==='hardpoint')this.updateHardpoint(elapsed,engine);
  if(this.mode.id==='confirmed')this.updateTags(elapsed,engine);
  if(this.mode.id==='hill')this.updateHill(elapsed,engine);
  if(this.payload)this.updateExtraction(engine);
  else if(this.mode.id==='frontline')this.updateFrontline(elapsed,engine);
  if(this.mode.id==='elimination'){this.updateElimination(engine);return;}
  if(this.phase==='finished')return;
  if(this.mode.id==='domination') {
   for(const p of this.points) {
    const count=[0,0];
    const occupants=engine.actors.filter(a=>!a.dead&&distance(a,p)<4.2&&Math.abs(a.y-p.y)<2.6);
    for(const a of occupants)count[a.team]++;
    p.contested=count[0]>0&&count[1]>0;
    if(!p.contested&&(count[0]||count[1])) {
     const team=count[0]?0:1;
     if(p.owner!==team) {
      if(p.capturing!==team){p.capturing=team;p.progress=0;}
      p.progress+=elapsed*Math.min(2,count[team])/5;
      if(p.progress>=1){p.owner=team;p.capturing=-1;p.progress=0;for(const actor of occupants){actor.captures++;this.awardObjective(actor,'capture');}engine.emit('capture',{text:`${p.name} captured`,source:team});}
     }else p.progress=0;
    }else if(!p.contested){p.progress=Math.max(0,p.progress-elapsed*.1);if(!p.progress)p.capturing=-1;}
   }
   this.tick+=elapsed;
   if(this.tick>=1) {
    this.tick-=1;
    for(const p of this.points)if(p.owner>=0)this.scores[p.owner]++;
    if(Math.max(...this.scores)>=this.mode.limit)this.resolveTimedMatch(engine);
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
   if(this.droppedCharge){
    const charge=this.droppedCharge;
    const nearby=engine.actors.filter(actor=>!actor.dead&&actor.team===this.attackingTeam&&
     distance(actor,charge)<1.65&&Math.abs(actor.y-charge.y)<1.6&&
     engine.arena.visible(engine.eye(actor),{...charge,y:charge.y+.3}));
    const collector=nearby.reduce((closest,actor)=>!closest||distance(actor,charge)<distance(closest,charge)?actor:closest,null);
    if(collector){
     this.chargeCarrier=collector.id;this.droppedCharge=null;this.awardObjective(collector,'recover');
     engine.emit('capture',{text:'CHARGE RECOVERED',source:collector.team,actor:collector.id,position:charge});
    }
   }
   const eligible=engine.actors.filter(actor=>actor.interacting&&this.canUseCharge(actor,engine));
   const chosen=eligible.find(actor=>actor.id===this.interactor)??eligible[0];
   const site=chosen?this.points.indexOf(this.sabotageTarget(chosen)):-1;
   if(chosen) {
    if(this.interactor!==chosen.id){this.siteProgress=0;for(const a of engine.actors)a.interactProgress=0;}
    this.interactor=chosen.id;this.siteProgress+=dt/(this.planted?5:3);chosen.interactProgress=this.siteProgress;
    if(this.siteProgress>=1) {
     this.awardObjective(chosen,this.planted?'defuse':'plant');
     if(this.planted)this.roundEnd(chosen.team,'CHARGE DEFUSED');
     else{this.planted=true;this.chargeCarrier=null;this.bombSite=site;this.bombTime=35;engine.emit('capture',{text:'CHARGE ARMED · DEFEND IT',source:chosen.team,position:this.points[site]});}
     chosen.interactProgress=0;this.siteProgress=0;this.interactor=null;
    }
   }else{this.siteProgress=0;this.interactor=null;for(const a of engine.actors)a.interactProgress=0;}
  }
  if(this.phase==='playing'&&this.respawns){
   if(this.time<=0&&engine.operation?.id==='siege')this.finish(1);
   else if(this.time<=0)this.resolveTimedMatch(engine);
   else if(this.overtime){
    const leader=this.scoreLeader(engine.actors);
    if(leader>=0)this.finish(leader);
   }
  }
 }
}
