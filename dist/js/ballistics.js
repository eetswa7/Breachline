import {rayBox,clamp} from './math.js?v=71';

const POWER={PISTOL:.38,SMG:.3,RIFLE:1,LMG:1.18,MARKSMAN:1.35,SNIPER:1.85,SHOTGUN:0,MELEE:0};
const COVER={wood:{resistance:1.3,depth:.55},glass:{resistance:.45,depth:.18},plaster:{resistance:3.8,depth:.22},steel:{resistance:12,depth:.075},blue:{resistance:12,depth:.075},rust:{resistance:12,depth:.075},dark:{resistance:12,depth:.075}};

// The exact entry and exit along the ray, including oblique surfaces. A hollow
// prop still has a full collision volume; its two physical skins consume energy.
export function boxInterval(origin,dir,box){
 let entry=-Infinity,exit=Infinity,incidence=1;
 for(const k of ['x','y','z']){
  const half=box[k==='x'?'w':k==='y'?'h':'d']/2;
  if(Math.abs(dir[k])<1e-8){if(origin[k]<box[k]-half||origin[k]>box[k]+half)return null;}
  else{
   const a=(box[k]-half-origin[k])/dir[k],b=(box[k]+half-origin[k])/dir[k],near=Math.min(a,b);
   if(near>entry){entry=near;incidence=Math.abs(dir[k]);}
   exit=Math.min(exit,Math.max(a,b));if(entry>exit)return null;
  }
 }
 return exit<0?null:{entry:Math.max(0,entry),exit,incidence};
}

const hitBox={x:0,y:0,z:0,w:0,h:0,d:0};
function actorHit(actors,shooter,origin,dir,limit){
 let target=null,part='body',t=limit;
 const horizontal=dir.x*dir.x+dir.z*dir.z;
 for(const actor of actors){
  if(actor.dead||actor.id===shooter.id)continue;
  const along=horizontal>1e-9?clamp(((actor.x-origin.x)*dir.x+(actor.z-origin.z)*dir.z)/horizontal,0,t):0;
  if((origin.x+dir.x*along-actor.x)**2+(origin.z+dir.z*along-actor.z)**2>.58**2)continue;
  const h=actor.height;
  hitBox.x=actor.x;hitBox.z=actor.z;
  for(let section=0;section<3;section++){
   hitBox.y=actor.y+(section===0?h-.16:section===1?h*.57:h*.2);hitBox.w=section===0?.36:section===1?.55:.43;hitBox.h=section===0?.33:section===1?h*.52:h*.4;hitBox.d=section===0?.36:section===1?.38:.36;
   const hit=rayBox(origin,dir,hitBox,t);if(hit!==null&&hit<t){t=hit;target=actor;part=section===0?'head':section===1?'body':'leg';}
  }
 }
 return {target,part,t};
}

export function traceBullet(arena,actors,shooter,origin,dir,weapon,limit=Math.max(140,(weapon.range??100)*1.35)){
 const start=(POWER[weapon.def.kind]??0)*(weapon.penetration??1);
 let energy=start,travelled=0,current=origin,layers=0;
 const impacts=[];
 for(let step=0;step<4;step++){
  const wall=arena.trace(current,dir,limit-travelled),actor=actorHit(actors,shooter,current,dir,wall.t);
  if(actor.target){const t=travelled+actor.t;return {target:actor.target,part:actor.part,t,scale:layers?clamp(energy/start,.15,1)*.82**layers:1,impacts,end:{x:origin.x+dir.x*t,y:origin.y+dir.y*t,z:origin.z+dir.z*t}};}
  const t=travelled+wall.t,end={x:origin.x+dir.x*t,y:origin.y+dir.y*t,z:origin.z+dir.z*t};
  if(!wall.block)return {target:null,part:'body',t,scale:1,impacts,end};
  const block=wall.block,profile=COVER[block.surface],interval=boxInterval(current,dir,block);
  const thickness=interval?(block.shellThickness?block.shellThickness*2/Math.max(.08,interval.incidence):interval.exit-interval.entry):Infinity;
  const cost=profile?thickness*profile.resistance+.12:Infinity;
  let penetrated=!!(step<3&&start>0&&profile&&!block.ground&&!block.roof&&interval&&thickness<=profile.depth&&energy>cost+.08&&travelled+interval.exit+.004<limit);
  if(penetrated){
   const from={x:end.x+dir.x*.004,y:end.y+dir.y*.004,z:end.z+dir.z*.004};
   // Never skip another wall embedded in the volume of a hollow prop.
   penetrated=!arena.trace(from,dir,Math.max(.001,interval.exit-interval.entry-.004),block).block;
  }
  // Cosmetic contact metadata exposes the real outgoing face without changing
  // the ray path, energy budget, target selection or penetration rules.
  const exitPosition=penetrated?{x:current.x+dir.x*interval.exit,y:current.y+dir.y*interval.exit,z:current.z+dir.z*interval.exit}:null;
  impacts.push({block,position:end,penetrated,thickness,incidence:interval?.incidence??1,exitPosition});
  if(!penetrated)return {target:null,part:'body',t,scale:1,impacts,end};
  energy-=cost;layers++;travelled+=interval.exit+.004;
  current={x:origin.x+dir.x*travelled,y:origin.y+dir.y*travelled,z:origin.z+dir.z*travelled};
 }
 return {target:null,part:'body',t:travelled,scale:1,impacts,end:current};
}
