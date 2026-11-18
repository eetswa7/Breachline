import {Arena,MAPS} from './maps.js?v=98';
import {Navigation} from './navigation.js?v=98';
import {SpawnDirector} from './spawns.js?v=98';
import {Convoy} from './convoy.js?v=98';
import {MatchRules,SURVIVAL_WAVES} from './modes.js?v=98';
import {Weapon,WEAPONS,GUN_ORDER,sanitizeLoadout} from './weapons.js?v=98';
import {DIFFICULTY,ROLES,updateBot} from './ai.js?v=98';
import {clamp,lerp,distance,direction,rng,rayBox,pointSegment} from './math.js?v=98';
import {traceBullet} from './ballistics.js?v=98';
import {beginVault,advanceVault} from './traversal.js?v=98';
import {ejectCasing,dumpRevolverCases,updateCasings} from './casing-foley.js?v=98';

export const emptyInput=()=>({mx:0,mz:0,lx:0,ly:0,fire:false,firePressed:false,ads:false,sprint:false,jump:false,crouch:false,reload:false,swap:false,inspect:false,grenade:false,interact:false,melee:false,repeatFire:false,autoReload:false});
const names=['YOU','TRACE','ROOK','ECHO','ONYX','VALE','KESTREL','FLINT','GHOST','HAWK'];
export class Actor {
 constructor(id,team,role,loadout){this.id=id;this.name=names[id]??`OPERATOR ${id}`;this.team=team;this.role=role;this.weapons=[new Weapon(loadout?.primary??(role===0&&id%2?13:role===1&&id%2===0?14:ROLES[role].weapon),loadout),new Weapon(loadout?.secondary??10)];this.equipment=loadout?.equipment??'frag';this.slot=0;this.kills=0;this.assists=0;this.revives=0;this.deaths=0;this.captures=0;this.confirms=0;this.denies=0;this.streak=0;this.bestStreak=0;this.gunStage=0;this.hillScore=0;this.objectiveXP=0;this.reset({x:0,y:0,z:0},0);}
 get weapon(){return this.weapons[this.slot];}
 get dead(){return this.health<=0;}
 get height(){return this.crouched?1.12:1.78;}
 reset(p,yaw){this.x=p.x;this.y=p.y;this.z=p.z;this.vault=null;this.viewModel=null;this.weaponObstruction=0;this.hitReact=0;this.vx=this.vz=this.vy=0;this.yaw=yaw;this.pitch=0;this.health=100;this.armor=0;this.crouched=false;this.grounded=true;this.sprinting=false;this.sliding=false;this.slideLeft=0;this.slideCooldown=0;this.slideX=0;this.slideZ=0;this.ads=0;this.grenades=2;this.grenadeCooldown=0;this.spawnProtection=1.5;this.respawnLeft=0;this.downedUntil=0;this.revived=false;this.rescueTarget=null;this.rescueProgress=0;this.switchLeft=0;this.slot=0;this.lastDamage=-100;this.damageContributors=new Map();this.lastShot=-100;this.flashed=0;this.suppression=0;this.stepClock=0;this.knifeCooldown=0;this.interacting=false;this.interactProgress=0;this.state='patrol';this.aiClock=this.id*.019;this.pathClock=0;this.target=null;this.lastKnown=null;this.memory=0;this.reaction=0;this.burst=0;this.burstPause=0;this.path=[];this.pathIndex=0;this.goal=null;this.objectivePoint=null;this.stuckTime=0;this.jumpBuffer=0;this.coyote=0;this.recoilPitch=0;this.visualKick=0;this.landKick=0;for(const w of this.weapons)w.reset();}
}

export class Game {
 constructor(config={},options={}){
  const seed=options.seed??Date.now(),arsenalRandom=rng((seed^0x51b4e329)>>>0);
  this.config={mode:config.mode??'tdm',map:clamp(Math.floor(Number(config.map)||0),0,MAPS.length-1),difficulty:config.difficulty??'regular',loadout:sanitizeLoadout(config.loadout)};
  this.arena=new Arena(this.config.map);this.nav=new Navigation(this.arena);this.spawner=new SpawnDirector(this.arena,this.nav);this.rules=new MatchRules(this.config.mode,this.arena);if(this.rules.mode.id==='convoy')this.rules.convoy=new Convoy(this.arena,this.nav);this.random=rng(seed);this.difficulty=DIFFICULTY[this.config.difficulty]??DIFFICULTY.regular;
  this.operation=options.operation??null;this.reinforcements=this.operation?.tickets.slice()??null;
  this.time=0;this.paused=false;this.events=[];this.grenades=[];this.smokes=[];this.casings=[];this.actors=[];this.shots=0;this.hits=0;this.headshots=0;this.weaponKills={};this.debug={god:false,ammo:false};this.damageYaw=0;this.lastKiller='';this.saved=false;
  this.actors.push(new Actor(0,0,0,this.config.loadout));
  const survival=this.rules.mode.id==='survival';
  this.survival=survival?{supplies:3,station:null,pending:[],commander:null,guards:[],decision:null,support:null}:null;
  this.teamSize=survival?3:this.rules.mode.teams?(this.arena.info.teamSize??4):4;
  // Cosmetic/loadout variety has its own stream, keeping spawn safety and
  // simulation randomness stable as the weapon catalogue grows.
  for(let i=1;i<(survival?this.teamSize+SURVIVAL_WAVES.at(-1).roles.length:this.teamSize*2);i++){const role=(i-1)%6,variants=ROLES[role].variants,primary=this.rules.mode.id==='gun'?variants[0]:variants[Math.floor(arsenalRandom()*variants.length)];this.actors.push(new Actor(i,i<this.teamSize?0:1,role,{primary}));}
  this.player=this.actors[0];
  if(this.rules.mode.id==='gun')for(const a of this.actors)a.weapons=[new Weapon(GUN_ORDER[0]),new Weapon(10)];
  if(survival)this.startSurvivalWave();else this.resetRound();
 }
 startSurvivalWave(){
  const wave=this.rules.round,encounter=SURVIVAL_WAVES[wave-1],count=encounter.roles.length;
  this.spawner.resetRound();
  this.grenades.length=0;this.smokes.length=0;this.casings.length=0;
  for(const actor of this.actors)if(actor.team===1)actor.health=0;
  for(const ally of this.actors){
   if(ally.team!==0||ally===this.survival.support)continue;
   ally.armor=0;
   if(wave===1)this.spawn(ally,true);
   else if(ally.dead){
    const ammo=ally.weapons.map(weapon=>[weapon.ammo,weapon.reserve]),grenades=ally.grenades;
    this.spawn(ally,true);
    for(let i=0;i<ally.weapons.length;i++)[ally.weapons[i].ammo,ally.weapons[i].reserve]=ammo[i];
    ally.grenades=grenades;
   }
   ally.health=100;
  }
  const decision=this.survival.decision;
  if(this.survival.support)this.survival.support.health=0;
  if(decision==='reinforce'){
   if(!this.survival.support){
    const actor=new Actor(this.actors.length,0,4,{primary:9});
    actor.name='RESERVE GUNNER';
    this.survival.support=actor;this.actors.push(actor);
   }
   this.spawn(this.survival.support,true);
  }
  if(decision==='armor')for(const ally of this.actors)if(ally.team===0&&!ally.dead)ally.armor=65;
  if(decision==='ammo')this.fillSurvivalSupplies(true);
  this.survival.decision=null;
  if(!this.survival.station)this.survival.station={x:this.player.x,y:this.player.y,z:this.player.z};
  const roster=this.actors.filter(actor=>actor.team===1);
  this.survival.pending=[];
  this.survival.commander=wave===SURVIVAL_WAVES.length?roster[0]:null;
  this.survival.guards=this.survival.commander?roster.slice(1,4):[];
  for(let i=0;i<roster.length;i++){
   const enemy=roster[i],role=encounter.roles[i];
   if(role===undefined){enemy.downedUntil=0;enemy.respawnLeft=0;continue;}
   enemy.role=role;
   enemy.name=enemy===this.survival.commander?'COMMANDER':this.survival.guards.includes(enemy)?`RELAY GUARD ${i}`:names[enemy.id]??`OPERATOR ${enemy.id}`;
   const variants=ROLES[role].variants;
   enemy.weapons[0]=new Weapon(variants[(i+wave)%variants.length]);
   enemy.equipment=encounter.smoke&&i%3===0?'smoke':'frag';
   if(i>=count-(encounter.reserve??0))this.survival.pending.push(enemy);
   else this.spawn(enemy,true);
  }
  if(this.survival.commander)this.survival.commander.health=240;
  this.rules.scores[1]=count;
  this.emit('round',{text:`WAVE ${wave} · ${encounter.name.toUpperCase()} · ${count} ENEMIES`});
 }
 releaseSurvivalReserve(){
  const pending=this.survival.pending.splice(0);
  for(const enemy of pending)this.spawn(enemy,true);
  this.emit('round',{text:'SECOND FRONT · ENEMY RESERVES ARRIVING'});
  return pending.length;
 }
 get livingRelayGuards(){
  return this.survival?.guards.filter(guard=>!guard.dead).length??0;
 }
 get awaitingSurvivalSupport(){
  return !!this.survival&&this.rules.phase==='roundBreak'&&this.survival.supplies>0&&this.survival.decision===null;
 }
 chooseSurvivalSupport(choice){
  if(!this.awaitingSurvivalSupport||!['bank','ammo','armor','reinforce'].includes(choice))return false;
  if(choice!=='bank')this.survival.supplies--;
  this.survival.decision=choice;
  return true;
 }
 fillSurvivalSupplies(reload=false){
  for(const ally of this.actors){
   if(ally.team!==0||ally===this.survival.support)continue;
   for(const weapon of ally.weapons){
    weapon.reserve=weapon.capacity*5;
    if(reload){weapon.ammo=weapon.capacity;weapon.reloadLeft=0;}
   }
   ally.grenades=2;
  }
 }
 canUseSupplies(actor){
  const station=this.survival?.station;
  return !!station&&this.survival.supplies>0&&!actor.dead&&this.rules.phase==='playing'&&
   this.actors.some(ally=>ally.team===0&&ally!==this.survival.support&&(ally.grenades<2||ally.weapons.some(weapon=>weapon.reserve<weapon.capacity*5)))&&
   distance(actor,station)<3&&Math.abs(actor.y-station.y)<1.5&&
   this.arena.visible(this.eye(actor),{...station,y:station.y+.4});
 }
 resupplySquad(){
  if(!this.canUseSupplies(this.player))return;
  this.survival.supplies--;
  this.fillSurvivalSupplies();
  this.emit('capture',{text:`SQUAD RESUPPLIED · ${this.survival.supplies} DROPS LEFT`,source:0,position:this.survival.station});
 }
 get cameraActor(){
  const player=this.player;
  if(!player.dead||this.canRedeploy(player)&&player.downedUntil<=this.time)return player;
  return this.actors.find(actor=>!actor.dead&&actor.team===player.team)??player;
 }
 canRedeploy(actor){
  return this.rules.respawns&&(!this.reinforcements||this.reinforcements[actor.team]>0);
 }
 findRescue(actor,radius=2.4,requireSight=true){
  if(!(this.operation||this.survival)||actor.dead)return null;
  let target=null,best=radius;
  for(const ally of this.actors){
   if(!ally.dead||ally.team!==actor.team||ally.downedUntil<=this.time||Math.abs(actor.y-ally.y)>1.45)continue;
   const gap=distance(actor,ally);
   if(gap>=best||requireSight&&!this.arena.visible(this.eye(actor),{x:ally.x,y:ally.y+.35,z:ally.z}))continue;
   target=ally;best=gap;
  }
  return target;
 }
 updateRescues(dt){
  for(const actor of this.actors){
   const ally=actor.interacting&&!actor.sprinting&&this.findRescue(actor);
   if(!ally){actor.rescueTarget=null;actor.rescueProgress=0;continue;}
   if(actor.rescueTarget!==ally.id){actor.rescueTarget=ally.id;actor.rescueProgress=0;}
   actor.rescueProgress+=dt;
   if(actor.rescueProgress<2)continue;
   ally.health=45;ally.downedUntil=0;ally.revived=true;ally.spawnProtection=.75;
   ally.damageContributors.clear();ally.lastDamage=this.time;ally.interacting=false;
   ally.vx=ally.vy=ally.vz=0;ally.sprinting=false;ally.sliding=false;ally.vault=null;
   ally.grounded=true;ally.path=[];ally.pathIndex=0;ally.pathClock=0;ally.aiClock=0;
   actor.revives++;actor.rescueTarget=null;actor.rescueProgress=0;
   this.emit('capture',{text:`${ally.name} REVIVED`,source:actor.team,actor:actor.id,position:{x:ally.x,y:ally.y,z:ally.z}});
  }
 }
 get canCommandSquad(){
  return this.rules.mode.teams&&this.rules.phase==='playing'&&!this.player.dead&&
   this.actors.some(actor=>actor!==this.player&&actor.team===this.player.team&&!actor.dead);
 }
 get activeSquadOrder(){
  return this.squadOrder?.until>this.time?this.squadOrder:null;
 }
 issueSquadOrder(kind){
  if(!this.canCommandSquad||!['follow','hold','release'].includes(kind))return false;
  const player=this.player;
  const allies=this.actors.filter(actor=>actor!==player&&actor.team===player.team&&!actor.dead)
   .sort((a,b)=>distance(a,player)-distance(b,player)).slice(0,3);
  let point=null;
  if(kind==='hold'){
   const eye=this.eye(player),aim=direction(player.yaw,player.pitch);
   const trace=this.arena.trace(eye,aim,26),range=Math.max(0,trace.t-.8);
   const target={x:eye.x+aim.x*range,y:eye.y+aim.y*range,z:eye.z+aim.z*range};
   target.y=this.arena.floorAt(target,Math.max(player.y+.45,target.y));
   const node=this.nav.nodes[this.nav.nearest(target)];
   if(!node||distance(node,target)>4)return false;
   point={x:node.x,y:node.y,z:node.z};
  }
  const assigned=kind==='release'?this.activeSquadOrder?.ids??[]:allies.map(actor=>actor.id);
  this.squadOrder=kind==='release'?null:{kind,point,ids:assigned,until:this.time+35};
  for(const actor of this.actors)if(assigned.includes(actor.id)||actor.state==='order'){
   actor.aiClock=0;actor.pathClock=0;actor.path=[];actor.pathIndex=0;
  }
  this.emit('capture',{text:kind==='hold'?'SQUAD HOLDING MARK':kind==='follow'?'SQUAD RALLYING ON YOU':'SQUAD BACK ON MISSION',source:player.team,position:point});
  return true;
 }
 gateInReach(actor){
  if(actor.dead)return null;
  return this.arena.doors.find(gate=>!gate.opening&&!gate.barrier.destroyed&&gate.panels.some(panel=>
   distance(actor,panel)<1.85&&Math.abs(actor.y-panel.y)<1.35&&
   this.arena.visible(this.eye(actor),{...panel,y:panel.y+1.3})));
 }
 updateGates(dt){
  for(const gate of this.arena.doors){
   if(!gate.opening||gate.barrier.destroyed)continue;
   gate.lift=Math.min(1,gate.lift+dt/1.5);
   if(gate.lift<1)continue;
   gate.barrier.destroyed=true;
   for(const actor of this.actors){actor.pathClock=0;actor.aiClock=0;}
   this.emit('capture',{text:`${gate.name.toUpperCase()} OPEN · SHORTCUT AVAILABLE`});
  }
 }
 eye(a){return{x:a.x,y:a.y+a.height-.12,z:a.z};}
 emit(type,data={}){if(this.events.length<180)this.events.push({type,time:this.time,...data});}
 spawn(a,initial=false){
  const p=this.spawner.select(a,this,initial);a.reset(p,p.yaw);a.vault=null;
 }
 resetRound(){this.squadOrder=null;this.spawner.resetRound();for(const a of this.actors)a.health=0;for(const a of this.actors)this.spawn(a,true);this.rules.assignCharge(this.actors);this.grenades.length=0;this.smokes.length=0;this.casings.length=0;this.rules.tags.length=0;this.emit('round',{text:this.rules.mode.id==='elimination'?`ROUND ${this.rules.round} · ELIMINATE ALL ENEMIES`:this.rules.mode.id==='sabotage'?`ROUND ${this.rules.round} · ${this.rules.attackingTeam===0?'ATTACK':'DEFEND'}`:'ENGAGE'});}
 canSee(a,b){if(a.flashed>.3)return false;const from=this.eye(a),to=this.eye(b);if(!this.arena.visible(from,to))return false;for(const s of this.smokes)if(s.age<13&&pointSegment(s,from,to)<Math.min(5.2,s.age*4))return false;return true;}
 moveActor(a,tx,tz,dt){
  const speed=Math.hypot(tx,tz),wasGrounded=a.grounded,startX=a.x,startZ=a.z;
  // Releasing the stick in flight retains launch momentum. Ground friction
  // still stops promptly, and air steering approaches the chosen speed gradually.
  const response=a.id===0&&!wasGrounded?(speed>0?6:.35):(speed>0?30:38),accel=1-Math.exp(-dt*response);
  a.vx=lerp(a.vx,tx,accel);a.vz=lerp(a.vz,tz,accel);
  const radius=.31,height=a.height,step=a.grounded?.36:0;
  for(const key of ['x','z']){
   let p={x:a.x,y:a.y,z:a.z};p[key]+=(key==='x'?a.vx:a.vz)*dt;let ground=this.arena.floorAt(p,a.y+step);let nextY=a.grounded&&ground>=a.y-.08?ground:a.y;p.y=nextY+.04;
   if(!this.arena.collides(p,radius,height-.04)){a[key]=p[key];a.y=nextY;}else if(key==='x')a.vx=0;else a.vz=0;
  }
  a.vy-=19*dt;const next=a.y+a.vy*dt,ground=this.arena.floorAt(a,a.y+.08);
  if(next<=ground&&a.vy<=0){
   if(a.vy<-12)this.damage(a,Math.max(0,(-a.vy-12)*8),null,false);
   if(!wasGrounded){a.landKick=Math.min(.13,-a.vy*.006);if(a.vy<-3)this.emit('land',{position:{x:a.x,y:ground,z:a.z},source:a.id,value:Math.min(1,-a.vy/12)});}
   a.y=ground;a.vy=0;a.grounded=true;
  }
  else{const p={x:a.x,y:next,z:a.z};if(a.vy>0&&this.arena.collides(p,radius,height)){a.vy=0;}else a.y=next;a.grounded=false;}
  if(wasGrounded&&a.grounded){a.stepClock+=Math.hypot(a.x-startX,a.z-startZ);if(a.stepClock>1.8){a.stepClock%=1.8;this.emit('step',{position:{x:a.x,y:a.y,z:a.z},source:a.id,value:a.sprinting?1:.6});}}
 }
 update(dt,input=emptyInput()){
  if(this.paused||this.rules.phase==='finished')return;dt=clamp(dt,0,1/30);this.time+=dt;
  if(this.rules.phase==='roundBreak'){this.rules.update(dt,this);return;}
  const p=this.player;
  this.updateGates(dt);
  for(const a of this.actors){
   if(a.dead){
    if(a.downedUntil<=this.time&&this.canRedeploy(a)){
     a.respawnLeft-=dt;
     if(a.respawnLeft<=0){if(this.reinforcements)this.reinforcements[a.team]--;this.spawn(a);}
    }
    continue;
   }
   a.spawnProtection=Math.max(0,a.spawnProtection-dt);a.switchLeft=Math.max(0,a.switchLeft-dt);a.knifeCooldown=Math.max(0,a.knifeCooldown-dt);a.flashed=Math.max(0,a.flashed-dt);a.hitReact*=Math.exp(-dt*14);a.visualKick*=Math.exp(-dt*17);a.landKick*=Math.exp(-dt*9);
   for(const w of a.weapons)if(w.update(dt,w.reloadLeft>0?cue=>{if(cue.cue==='caseDump')dumpRevolverCases(this,a,w,cue.count,this.eye(a));else this.emit('weaponFoley',{...cue,source:a.id,position:this.eye(a)});}:undefined)&&a.id===0)this.emit('reloadDone',{source:a.id,weapon:w.def.id});
   if(a!==this.survival?.commander&&this.time-a.lastDamage>5.5)a.health=Math.min(100,a.health+dt*15);
  }
  if(!p.dead){
   p.yaw+=input.lx;p.pitch=clamp(p.pitch+input.ly,-1.48,1.48);
   p.slideCooldown=Math.max(0,p.slideCooldown-dt);p.slideLeft=Math.max(0,p.slideLeft-dt);if(p.slideLeft<=0)p.sliding=false;
   p.sprinting=input.sprint&&input.mz>.2&&!input.ads&&!input.fire&&!p.crouched&&!p.sliding&&!p.vault;
   const n=Math.max(1,Math.hypot(input.mx,input.mz)),forwardX=(Math.cos(p.yaw)*input.mx+Math.sin(p.yaw)*input.mz)/n,forwardZ=(Math.sin(p.yaw)*input.mx-Math.cos(p.yaw)*input.mz)/n;
   if(input.crouch){if(p.sprinting&&p.grounded&&n>.2&&p.slideCooldown<=0){p.sliding=true;p.slideLeft=.72;p.slideCooldown=1.25;p.crouched=true;p.sprinting=false;p.slideX=forwardX;p.slideZ=forwardZ;this.emit('slide',{source:p.id});}else if(!p.sliding){if(!p.crouched)p.crouched=true;else if(!this.arena.collides({...p,y:p.y+.03},.31,1.77))p.crouched=false;}}
   if(input.jump&&p.crouched&&!this.arena.collides({...p,y:p.y+.03},.31,1.77)){p.crouched=false;p.sliding=false;p.slideLeft=0;}
   let adsTarget=input.ads&&!p.sprinting&&!p.sliding&&!p.vault&&!p.weapon.reloadLeft&&!p.switchLeft?1:0;p.ads=lerp(p.ads,adsTarget,clamp(dt/p.weapon.adsTime*3,0,1));
   const maxSpeed=p.crouched?2.15:p.sprinting?6.1:4.1,speed=(p.sliding?2.8+3.7*p.slideLeft/.72:maxSpeed)*(p.weapon.def.kind==='LMG'?.88:1)*p.weapon.mobility*lerp(1,.6,p.ads);
   const dx=p.sliding?p.slideX*speed:forwardX*speed,dz=p.sliding?p.slideZ*speed:forwardZ*speed;
   p.coyote=p.grounded?.09:Math.max(0,p.coyote-dt);p.jumpBuffer=input.jump?.12:Math.max(0,p.jumpBuffer-dt);
   if(p.jumpBuffer>0&&p.coyote>0&&!p.crouched&&!p.vault){
    if(beginVault(p,this.arena,forwardX,forwardZ))this.emit('vault',{source:p.id});
    else{p.vy=6.7;p.grounded=false;}
    p.coyote=0;p.jumpBuffer=0;
   }
   if(!p.vault||!advanceVault(p,this.arena,dt))this.moveActor(p,dx,dz,dt);
   // Inspection is cosmetic and never delays a combat or traversal action.
   const interruptInspection=input.fire||input.ads||input.jump||input.crouch||input.reload||input.swap||input.grenade||input.melee||input.interact||p.sprinting||p.sliding||p.vault||p.switchLeft>0||p.weapon.reloadLeft>0;
   if(interruptInspection)p.weapon.cancelInspection();
   else if(input.inspect&&p.ads<.12&&p.weapon.sinceShot>.2)p.weapon.inspect();
   if(input.reload&&p.weapon.reload())this.emit('reload',{source:0,weapon:p.weapon.def.id});
   if(input.swap&&this.rules.mode.id!=='gun'){this.emit('weaponFoleyCancel',{source:p.id,weapon:p.weapon.def.id});p.weapon.reloadLeft=0;p.weapon.burstRemaining=0;p.slot=1-p.slot;p.switchLeft=.32;this.emit('switch',{source:p.id,weapon:p.weapon.def.id});}
   if(input.autoReload&&p.weapon.ammo===0&&!p.weapon.reloadLeft&&p.weapon.reserve>0){if(p.weapon.reload())this.emit('reload',{source:0,weapon:p.weapon.def.id});}
   if((p.weapon.burstRemaining>0||input.fire&&(p.weapon.def.automatic||input.firePressed||input.repeatFire))&&!p.sprinting&&!p.vault)this.shoot(p,false);
   if(input.grenade)this.throwGrenade(p);
   if(input.melee&&this.rules.mode.id!=='gun')this.melee(p);
   if(input.interact&&!p.interacting&&!this.findRescue(p)&&!this.rules.canUseCharge(p,this)){
    if(this.canUseSupplies(p))this.resupplySquad();
    else {
     const gate=this.gateInReach(p);
     if(gate)gate.opening=true;
    }
   }
   p.interacting=input.interact;
   // Recover only the recoil contribution, retaining the player's own look input.
   if(p.weapon.sinceShot>.14){const rec=p.recoilPitch*(1-Math.exp(-dt*8));p.pitch=clamp(p.pitch-rec,-1.48,1.48);p.recoilPitch-=rec;}
  }
  this.pathBudget=2;
  for(let i=1;i<this.actors.length;i++)if(!this.actors[i].dead)updateBot(this.actors[i],dt,this);
  updateCasings(this,dt);this.updateEquipment(dt);if(this.operation||this.survival)this.updateRescues(dt);this.rules.update(dt,this);
  if(this.reinforcements&&this.rules.phase==='playing'){
   const alive=[false,false];
   for(const actor of this.actors)if(!actor.dead)alive[actor.team]=true;
   const exhausted=this.reinforcements.map((tickets,team)=>tickets===0&&!alive[team]);
   if(this.operation?.id==='siege')exhausted[1]=false;
   if(exhausted.some(Boolean))this.rules.finish(exhausted[0]===exhausted[1]?-1:exhausted[0]?1:0);
  }
 }
 shoot(a,bot=false){
  const w=a.weapon,d=w.def;if(a.dead||this.rules.phase!=='playing'||this.paused||a.switchLeft>0||w.cooldown>0)return false;
  if(d.id===12)return this.melee(a);
  if(w.reloadLeft>0){if(d.shellReload&&w.ammo>0){w.reloadLeft=0;this.emit('weaponFoleyCancel',{source:a.id,weapon:d.id});}else return false;}
  if(w.ammo<=0){w.cooldown=.22;if(a.id===0)this.emit('empty');w.reload();return false;}
  if(d.burst){if(!w.burstRemaining)w.burstRemaining=d.burst;w.burstRemaining--;}
  w.cooldown=d.burst&&!w.burstRemaining?.28:d.interval;if(!(a.id===0&&this.debug.ammo))w.ammo--;a.spawnProtection=0;
  const origin=this.eye(a),baseSpread=w.spread(a.ads,Math.hypot(a.vx,a.vz)>.6,a.crouched)+(bot?this.difficulty.accuracy*(a.role===5?.8:1)*(a.flashed>.1?6:1):0);
  let anyHit=false,head=false;
  for(let i=0;i<d.pellets;i++){
   const angle=this.random()*Math.PI*2,spread=Math.sqrt(this.random())*baseSpread,dir=direction(a.yaw+Math.cos(angle)*spread,a.pitch+Math.sin(angle)*spread);
   const result=traceBullet(this.arena,this.actors,a,origin,dir,w),hit=result.target,part=result.part,t=result.t,impact=result.end;
   if(i===0)for(const other of this.actors){
    if(other.id===0||other.dead||other===hit||other.spawnProtection>0||!this.rules.enemies(a,other))continue;
    if(distance(a,other)>35)continue;
    const eye=this.eye(other),along=(eye.x-origin.x)*dir.x+(eye.y-origin.y)*dir.y+(eye.z-origin.z)*dir.z;
    if(along>0&&along<t-.4&&pointSegment(eye,origin,impact)<1.45)other.suppression=2;
   }
   if(hit&&this.rules.enemies(a,hit)){
    const shielded=this.damage(hit,w.damage(t,part)*result.scale,a,part==='head',w.def)===false;
    if(shielded)this.emit('impact',{position:impact,surface:'steel',value:4});
    else{anyHit=true;head=head||part==='head';this.emit('blood',{position:impact,value:part==='head'?8:5});}
   }
   for(const contact of result.impacts){
    const b=contact.block,normal=this.impactNormal(contact.position,b);
    // A shallow strike sheds/glances off hard cover. Its audible deflection is
    // cosmetic: the existing bullet still stops here and cannot damage on bounce.
    const glancing=!contact.penetrated&&d.kind!=='SHOTGUN'&&contact.incidence<.32&&['steel','dark','blue','rust','brass','concrete','stone','rock','limestone','tiles'].includes(b.surface);
    this.emit('impact',{position:contact.position,surface:b.surface,normal,value:d.kind==='SHOTGUN'?2:4,penetrated:contact.penetrated,ballisticAudio:contact.penetrated||glancing});
    if(contact.penetrated)this.emit('penetration',{position:contact.exitPosition,entry:contact.position,surface:b.surface,source:a.id,weapon:d.id,thickness:contact.thickness,normal:{x:-normal.x,y:-normal.y,z:-normal.z}});
    else if(glancing)this.emit('ricochet',{position:contact.position,surface:b.surface,source:a.id,weapon:d.id,incidence:contact.incidence,normal});
    if(b.breakable){b.hp-=d.damage;if(b.hp<=0&&!b.destroyed){b.destroyed=true;this.explode({...b,owner:a.id,kind:'frag'},5.5,90);}}
   }
   if(i===0){const finalContact=result.impacts.at(-1),stoppedBlock=!result.target&&finalContact&&!finalContact.penetrated?finalContact.block:null;
    this.emit('shot',{position:origin,end:impact,trailEnd:result.impacts[0]?.position??impact,stoppedBlock,source:a.id,weapon:d.id,suppressed:w.suppressed,loudness:w.ammunition===3?.7:w.barrel===5?1.15:1,indoor:this.arena.indoors(a)});}
  }
  if(a.id===0){this.shots++;if(anyHit){this.hits++;this.emit('hit',{headshot:head});}const r=w.recoilFor(a.ads,a.crouched,Math.hypot(a.vx,a.vz)<.6);const nextPitch=clamp(a.pitch+r,-1.48,1.48);a.recoilPitch+=nextPitch-a.pitch;a.pitch=nextPitch;a.yaw+=Math.sin(w.shotIndex*1.73+d.id)*r*.45*w.horizontalRecoil;a.visualKick+=r*2.5;}
  ejectCasing(this,a,w,origin);a.lastShot=this.time;w.sinceShot=0;w.shotIndex++;w.shotSerial=(w.shotSerial??0)+1;w.cancelInspection();
  for(const other of this.actors)if(other.id!==a.id&&!other.dead&&this.rules.enemies(a,other)&&distance(a,other)<w.hearingRadius&&other.target===null){other.lastKnown={x:a.x,y:a.y,z:a.z};other.memory=5;other.state='investigate';}
  return true;
 }
 impactNormal(p,b){let axis='x',sign=1,min=Infinity;for(const k of ['x','y','z']){const h=b[k==='x'?'w':k==='y'?'h':'d']/2,d=Math.abs(Math.abs(p[k]-b[k])-h);if(d<min){min=d;axis=k;sign=p[k]>b[k]?1:-1;}}return{x:axis==='x'?sign:0,y:axis==='y'?sign:0,z:axis==='z'?sign:0};}
 damage(victim,amount,killer,headshot=false,source=killer?.weapon.def){
  if(victim.dead||victim.spawnProtection>0||(victim.id===0&&this.debug.god)||this.rules.phase!=='playing')return;
  if(killer&&killer.id!==victim.id&&!this.rules.enemies(killer,victim))return;
  if(victim===this.survival?.commander&&this.livingRelayGuards)return false;
  if(victim.armor>0){
   const absorbed=Math.min(victim.armor,amount);
   victim.armor-=absorbed;amount-=absorbed;
   if(amount<=0)return false;
  }
  if(this.rules.mode.teams&&killer&&victim.team!==killer.team){
   const previous=victim.damageContributors.get(killer.id);
   const recent=previous&&this.time-previous.at<=8?previous.amount:0;
   victim.damageContributors.set(killer.id,{amount:recent+Math.min(victim.health,amount),at:this.time});
  }
  victim.health-=amount;victim.hitReact=Math.min(.16,(victim.hitReact??0)+amount/600);victim.lastDamage=this.time;
  if(victim.id===0){this.damageYaw=killer?Math.atan2(killer.x-victim.x,-(killer.z-victim.z)):victim.yaw;this.emit('hurt',{value:amount,angle:this.damageYaw});}
  if(victim.health>0)return;
  victim.health=0;for(const w of victim.weapons)this.emit('weaponFoleyCancel',{source:victim.id,weapon:w.def.id});this.spawner.noteDeath(victim,this.time);victim.deaths++;victim.streak=0;victim.respawnLeft=3;victim.interacting=false;this.rules.onDeath(victim,this);
  if((this.operation||this.survival&&victim.team===0)&&!victim.revived&&this.actors.some(actor=>actor.team===victim.team&&!actor.dead)){
   victim.downedUntil=this.time+9;victim.respawnLeft=0;
  }
  if(this.survival?.guards.includes(victim)&&!this.livingRelayGuards)this.emit('capture',{text:'RELAY GUARDS DOWN · COMMANDER VULNERABLE'});
  if(victim.id===0)this.lastKiller=killer?.name??'FALL';
  if(killer&&killer.id!==victim.id){killer.kills++;killer.streak++;killer.bestStreak=Math.max(killer.bestStreak,killer.streak);
   if(killer.id===0){
    if(source?.id!==undefined)this.weaponKills[source.id]=(this.weaponKills[source.id]??0)+1;
    if(headshot)this.headshots++;
   }
   for(const [id,contribution] of victim.damageContributors){
    if(id===killer.id||contribution.amount<25||this.time-contribution.at>8)continue;
    const ally=this.actors.find(actor=>actor.id===id&&actor.team===killer.team);
    if(!ally)continue;
    ally.assists++;
    if(ally===this.player)this.emit('assist',{source:id,target:victim.id,text:'ELIMINATION ASSIST'});
   }
   const weapon=source?.name??'ENVIRONMENT';
   if(this.rules.mode.id==='gun'){killer.gunStage++;if(killer.gunStage<GUN_ORDER.length){this.emit('weaponFoleyCancel',{source:killer.id,weapon:killer.weapons[0].def.id});killer.weapons[0]=new Weapon(GUN_ORDER[killer.gunStage]);killer.slot=0;killer.switchLeft=.28;}}
   this.rules.onKill(killer,victim,this);this.emit('kill',{source:killer.id,target:victim.id,text:`${killer.name}  ›  ${victim.name}`,weapon,headshot,streak:killer.streak,position:{x:victim.x,y:victim.y,z:victim.z}});
   for(const ally of this.actors)if(this.rules.mode.teams&&ally.id!==victim.id&&!ally.dead&&ally.team===victim.team&&distance(ally,victim)<12){ally.lastKnown={x:killer.x,y:killer.y,z:killer.z};ally.memory=5;ally.pathClock=0;}
  }else this.emit('kill',{source:-1,target:victim.id,text:`${victim.name}  ·  ${killer?'SELF DAMAGE':'FALL'}`,position:{x:victim.x,y:victim.y,z:victim.z}});
 }
 melee(a){
  if(a.knifeCooldown>0||a.dead||this.paused||this.rules.phase!=='playing')return false;a.knifeCooldown=.65;a.weapon.cooldown=.65;a.visualKick=.2;this.emit('melee',{source:a.id});
  let hit=null,best=2.2;for(const t of this.actors)if(!t.dead&&this.rules.enemies(a,t)){const d=distance(a,t),bearing=Math.atan2(t.x-a.x,-(t.z-a.z));if(d<best&&Math.abs(Math.atan2(Math.sin(bearing-a.yaw),Math.cos(bearing-a.yaw)))<.55&&this.canSee(a,t)){hit=t;best=d;}}
  if(hit){this.damage(hit,125,a,false,WEAPONS[12]);if(a.id===0)this.emit('hit');}return true;
 }
 throwGrenade(a){
  if(a.dead||a.grenades<=0||this.grenades.length>=16||this.rules.mode.id==='gun')return;a.grenades--;const d=direction(a.yaw,a.pitch+.22),eye=this.eye(a);this.grenades.push({...eye,vx:d.x*15,vy:d.y*15+2,vz:d.z*15,fuse:a.equipment==='smoke'?1.6:2.3,owner:a.id,kind:a.equipment});this.emit('throw',{source:a.id});
 }
 updateEquipment(dt){
  for(let i=this.grenades.length-1;i>=0;i--){const g=this.grenades[i];g.fuse-=dt;g.vy-=12*dt;const next={x:g.x+g.vx*dt,y:g.y+g.vy*dt,z:g.z+g.vz*dt};
   const len=Math.hypot(next.x-g.x,next.y-g.y,next.z-g.z),d={x:(next.x-g.x)/(len||1),y:(next.y-g.y)/(len||1),z:(next.z-g.z)/(len||1)},hit=this.arena.trace(g,d,len+.08);
   if(hit.block){const p={x:g.x+d.x*hit.t,y:g.y+d.y*hit.t,z:g.z+d.z*hit.t},n=this.impactNormal(p,hit.block),dot=g.vx*n.x+g.vy*n.y+g.vz*n.z;g.vx=(g.vx-2*dot*n.x)*.45;g.vy=(g.vy-2*dot*n.y)*.45;g.vz=(g.vz-2*dot*n.z)*.45;g.x=p.x+n.x*.11;g.y=Math.max(.11,p.y+n.y*.11);g.z=p.z+n.z*.11;}else Object.assign(g,next);
   if(g.y<.12){g.y=.12;g.vy=Math.abs(g.vy)*.35;g.vx*=.9;g.vz*=.9;}
   if(g.fuse<=0){this.explode(g);this.grenades.splice(i,1);}
  }
  for(let i=this.smokes.length-1;i>=0;i--){this.smokes[i].age+=dt;if(this.smokes[i].age>16)this.smokes.splice(i,1);}
 }
 explode(g,radius=8,damage=155){
  if(g.kind==='smoke'){if(this.smokes.length<8)this.smokes.push({x:g.x,y:g.y,z:g.z,age:0});this.emit('smoke',{position:{...g}});return;}
  if(g.kind==='flash'){
   for(const a of this.actors){const d=distance(a,g);if(a.dead||d>18||!this.arena.visible({...g,y:g.y+.2},this.eye(a)))continue;const facing=direction(a.yaw,a.pitch),eye=this.eye(a),dot=(facing.x*(g.x-eye.x)+facing.y*(g.y-eye.y)+facing.z*(g.z-eye.z))/(d||1);a.flashed=(dot>.15?3.5:.7)*(1-d/22);}
   this.emit('flash',{position:{...g}});return;
  }
  this.emit('explosion',{position:{x:g.x,y:g.y,z:g.z},value:radius,environmentalFire:!!g.breakable});const owner=this.actors.find(a=>a.id===g.owner)??null;
  for(const a of this.actors){let d=Math.hypot(a.x-g.x,a.y+.8-g.y,a.z-g.z);if(a.dead||d>radius)continue;if(!this.arena.visible({...g,y:g.y+.2},{x:a.x,y:a.y+.8,z:a.z}))continue;this.damage(a,damage*(1-d/radius),owner,false,{name:g.breakable?'ENVIRONMENT':'FRAG GRENADE'});}
 }
 spawnBot(){if(this.actors.length>=Math.max(12,this.teamSize*2))return;const id=this.actors.length,a=new Actor(id,1,id%6);this.actors.push(a);this.spawn(a);}
 result(){
  const p=this.player,r=this.rules,win=r.winner>=0&&(r.mode.teams?r.winner===p.team:r.winner===p.id);
  const xpBreakdown={completion:100,combat:p.kills*100+this.headshots*25,assists:p.assists*50,revives:p.revives*150,objective:p.objectiveXP,victory:win?350:0};
  const xp=Object.values(xpBreakdown).reduce((sum,amount)=>sum+amount,0);
  return {mode:r.mode.id,map:this.config.map,difficulty:this.config.difficulty,win,draw:r.winner===-1,overtime:r.overtime,operation:this.operation,
   kills:p.kills,assists:p.assists,revives:p.revives,deaths:p.deaths,headshots:this.headshots,accuracy:this.shots?Math.round(this.hits/this.shots*100):0,
   xp,xpBreakdown,streak:p.bestStreak,weaponKills:{...this.weaponKills},time:this.time,waves:this.survival?r.scores[0]:undefined};
 }
}
