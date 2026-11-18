const MAX_CANDIDATES=144,MAX_HISTORY=32,MAX_LOS_CANDIDATES=24;
const separation=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

// Bake broad, walkable spawn pockets once. Expensive threat checks only run on
// respawn, never per frame. Fixed round starts remain an independent choice.
export class SpawnDirector {
 constructor(arena,nav){
  this.arena=arena;this.nav=nav;this.recent=[];this.deaths=[];
  this.candidates=this.bake();
  this.starts=arena.spawns.filter(p=>this.valid(p));
 }
 valid(p){
  return Number.isFinite(p.x+p.y+p.z)&&!this.arena.collides({x:p.x,y:p.y+.04,z:p.z},.45,1.78)&&Math.abs(this.arena.floorAt(p,p.y+.05)-p.y)<.06;
 }
 bake(){
  const {nav,arena}=this,components=new Int32Array(nav.nodes.length).fill(-1),groups=[];
  for(const first of nav.nodes){
   if(components[first.id]>=0)continue;
   const id=groups.length,queue=[first.id];components[first.id]=id;
   for(let i=0;i<queue.length;i++)for(const next of nav.nodes[queue[i]].links)if(components[next]<0){components[next]=id;queue.push(next);}
   groups.push(queue);
  }
  // Keep only the objective-connected main play space, excluding decorative
  // rooftops and isolated floor islands that happen to fit a collision capsule.
  const votes=new Uint8Array(groups.length);
  for(const p of arena.objectives){const id=nav.nearest(p);if(id>=0)votes[components[id]]++;}
  let main=-1;
  for(let i=0;i<groups.length;i++)if(main<0||votes[i]>votes[main]||(votes[i]===votes[main]&&groups[i].length>groups[main].length))main=i;
  const buckets=new Map(),step=6.25;
  for(const id of groups[main]??[]){
   const p=nav.nodes[id];
   if(p.y>.06||p.links.length<5||!this.valid(p)||Math.max(Math.abs(p.x),Math.abs(p.z))>arena.info.size-2.5)continue;
   // A wide exit to either side prevents spawning inside a one-way corner.
   let open=0;
   for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){
    let clear=true;
    for(const d of [1.1,2.2])if(arena.collides({x:p.x+dx*d,y:p.y+.04,z:p.z+dz*d},.4,1.75)){clear=false;break;}
    if(clear)open++;
   }
   if(open<2)continue;
   const ix=Math.floor((p.x+arena.info.size)/step),iz=Math.floor((p.z+arena.info.size)/step),key=`${ix}:${iz}`;
   const cx=-arena.info.size+(ix+.5)*step,cz=-arena.info.size+(iz+.5)*step;
   const rank=(p.x-cx)**2+(p.z-cz)**2+(4-open)*.8;
   if(!buckets.has(key)||rank<buckets.get(key).rank)buckets.set(key,{x:p.x,y:p.y,z:p.z,node:id,open,rank});
  }
  let pool=[...buckets.values()];
  // Farthest-point reduction maintains coverage of every lane on the large map.
  if(pool.length>MAX_CANDIDATES){
   const keep=[pool[0]],remaining=pool.slice(1),nearest=remaining.map(p=>separation(p,keep[0]));
   while(keep.length<MAX_CANDIDATES){
    let best=0;for(let i=1;i<remaining.length;i++)if(nearest[i]>nearest[best])best=i;
    const next=remaining.splice(best,1)[0];nearest.splice(best,1);keep.push(next);
    for(let i=0;i<remaining.length;i++)nearest[i]=Math.min(nearest[i],separation(remaining[i],next));
   }
   pool=keep;
  }
  for(const p of pool){let best=-Infinity;p.yaw=Math.atan2(-p.x,p.z);
   for(const id of nav.nodes[p.node].links){const q=nav.nodes[id],dx=q.x-p.x,dz=q.z-p.z,n=Math.hypot(dx,dz)||1;
    const exit={x:p.x+dx/n*2.2,y:p.y,z:p.z+dz/n*2.2};if(!nav.walkable(p,exit))continue;
    const score=-(exit.x**2+exit.z**2);if(score>best){best=score;p.yaw=Math.atan2(dx,-dz);}
   }
  }
  return pool;
 }
 noteDeath(actor,time){
  this.deaths.push({x:actor.x,y:actor.y,z:actor.z,id:actor.id,team:actor.team,time});
  if(this.deaths.length>MAX_HISTORY)this.deaths.shift();
 }
 resetRound(){this.recent.length=0;this.deaths.length=0;}
 select(actor,game,initial=false){
  const {rules,actors,time,random}=game,teams=rules.mode.teams;
  this.recent=this.recent.filter(p=>time-p.time<22);
  this.deaths=this.deaths.filter(p=>time-p.time<18);
  const enemies=[],allies=[];
  for(const other of actors)if(other.id!==actor.id&&!other.dead)(rules.enemies(actor,other)?enemies:allies).push(other);
  const homeTeam=rules.convoy&&rules.round===2?1-actor.team:actor.team;
  const side=homeTeam?1:-1;
  const home=this.starts.filter(p=>p.team===homeTeam&&(p.x+p.z)*side>this.arena.info.size*.4);
  let pool=initial&&teams?home:this.candidates;
  if(!pool.length)pool=this.candidates.length?this.candidates:this.starts;
  if(rules.mode.id==='frontline'){
   const rear=pool.filter(p=>rules.spawnAllowed(actor,p));
   pool=rear.length?rear:this.candidates.filter(p=>rules.spawnAllowed(actor,p));
   if(!pool.length)pool=home.length?home:this.starts.filter(p=>p.team===actor.team);
  }
  let ax=0,az=0,ex=0,ez=0;
  for(const a of allies){ax+=a.x;az+=a.z;}for(const a of enemies){ex+=a.x;ez+=a.z;}
  if(allies.length){ax/=allies.length;az/=allies.length;}
  else if(home.length){ax=home[0].x;az=home[0].z;}
  if(enemies.length){ex/=enemies.length;ez/=enemies.length;}
  const frontX=ex-ax,frontZ=ez-az,frontLength=Math.hypot(frontX,frontZ)||1;
  // The map only removes breakable geometry during a match. Positions baked as
  // clear ground remain valid, so static capsule/floor tests are not repeated.
  const controlled=!initial&&rules.warfront?rules.points.filter(point=>point.owner===actor.team&&!point.contested):[];
  const preferred=actor===game.player&&controlled.includes(game.preferredSpawn)?game.preferredSpawn:null;
  const ranked=[];
  for(const p of pool){
   if(game.deployables?.length&&!this.valid(p))continue;
   let occupied=false;
   for(const other of actors)if(other.id!==actor.id&&!other.dead&&Math.abs(other.y-p.y)<1.9&&separation(p,other)<1.6){occupied=true;break;}
   if(occupied)continue;
   let nearest=100;
   for(const enemy of enemies){nearest=Math.min(nearest,separation(p,enemy));
    // Anticipate a rushing enemy reaching an otherwise empty spawn pocket.
    const predicted=Math.hypot(p.x-enemy.x-(enemy.vx||0)*1.1,p.z-enemy.z-(enemy.vz||0)*1.1);nearest=Math.min(nearest,predicted);
   }
   // Threats dominate flow preferences. Losing a home side naturally flips the
   // spawn to an unoccupied rear pocket instead of feeding the same corner.
   let score=Math.min(nearest,42)*1.2;
   if(nearest<13)score-=180+(13-nearest)*18;
   if(teams&&!initial){
    let nearAlly=allies.length?Infinity:30;
    for(const ally of allies)nearAlly=Math.min(nearAlly,separation(p,ally));
    score-=Math.abs(nearAlly-11)*.48;
    if(allies.length&&enemies.length){const front=((p.x-ax)*frontX+(p.z-az)*frontZ)/frontLength;score-=Math.max(0,front)*.8;score+=Math.min(10,Math.max(0,-front))*.35;}
   }
   if(preferred)score+=Math.max(0,88-Math.abs(separation(preferred,p)-9)*5);
   if(controlled.length){
    const nearSector=Math.min(...controlled.map(point=>separation(point,p)));
    score+=Math.max(0,24-Math.abs(nearSector-10)*1.5);
   }
   for(const death of this.deaths){
    if(teams&&death.team!==actor.team)continue;
    const d=separation(p,death);
    if(d<15)score-=(1-(time-death.time)/18)*(1-d/15)*(death.id===actor.id?100:60);
   }
   for(const used of this.recent){const d=separation(p,used);if(d<9)score-=(1-(time-used.time)/22)*(1-d/9)*(used.id===actor.id?85:24);}
   for(const g of game.grenades??[]){const d=separation(p,g);if(d<11&&g.kind!=='smoke')score-=(11-d)*35;}
   // Keep the initial spawn away from immediate objective capture radii. Later
   // respawns can approach an objective, but cannot appear directly on it.
   for(const q of rules.points){const d=separation(p,q);if(d<6)score-=(6-d)*10;}
   score+=random()*7;
   ranked.push({p,score});
  }
  // Cheap scores are upper bounds: line of sight can only lower a candidate's
  // score. Test the most promising pockets first and discard losing bounds.
  // A hard shortlist limit prevents clustered simultaneous respawns from
  // issuing hundreds of visibility rays per actor on iPhone.
  ranked.sort((a,b)=>b.score-a.score);
  const eyes=enemies.map(enemy=>({enemy,eye:game.eye(enemy)}));
  let best=null,bestScore=-Infinity;
  this.lastChecks=0;this.lastRays=0;
  for(let i=0;i<Math.min(ranked.length,MAX_LOS_CANDIDATES);i++){
   const {p}=ranked[i];let score=ranked[i].score;
   if(score<=bestScore)break;
   this.lastChecks++;
   const head={x:p.x,y:p.y+1.62,z:p.z},torso={x:p.x,y:p.y+.9,z:p.z};
   for(const {enemy,eye} of eyes){
    const d=separation(p,enemy);if(d>140)continue;
    // Both standing head and torso must be sheltered. A low wall must not
    // count as full cover, and destroyed geometry is checked on each ray.
    this.lastRays++;let visible=this.arena.visible(eye,head);
    if(!visible){this.lastRays++;visible=this.arena.visible(eye,torso);}
    if(visible)score-=65+(d<24?55:0);
    if(score<=bestScore)break;
   }
   if(score>bestScore){best=p;bestScore=score;}
  }
  // Initial anchors are intentionally a small authored set. If all are occupied
  // use the same-side connected pockets, with no unchecked random displacement.
  if(!best&&initial&&teams){
   const fallback=this.candidates.filter(p=>(p.x+p.z)*side>this.arena.info.size*.4&&rules.spawnAllowed(actor,p));
   const free=fallback.find(p=>!actors.some(a=>a.id!==actor.id&&!a.dead&&separation(p,a)<1.6));
   best=free??fallback[0];
  }
  if(!best)best=pool.find(p=>this.valid(p))??this.candidates[0]??this.starts[0];
  if(!best)throw new Error('Map has no reachable spawn position');
  this.recent.push({x:best.x,z:best.z,id:actor.id,team:actor.team,time});
  if(this.recent.length>MAX_HISTORY)this.recent.shift();
  const yaw=best.yaw??Math.atan2(-best.x,best.z);
  return{x:best.x,y:best.y,z:best.z,yaw};
 }
}
