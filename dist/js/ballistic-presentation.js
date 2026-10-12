import {boxInterval} from './ballistics.js?v=61';
import {footstepSurface} from './audio-library.js?v=61';

export function impactFamily(surface){
 if(['steel','dark','blue','rust','brass'].includes(surface))return 'Metal';
 if(surface==='wood')return 'Wood';if(surface==='glass')return 'Glass';
 if(surface==='water')return 'Water';if(surface==='plaster')return 'Plaster';return 'Stone';
}

export function casingFamily(arena,position,surface){
 const actual=footstepSurface(arena,position);if(actual)return actual==='Quarry'?'Gravel':actual;
 const family=impactFamily(surface??arena.info?.groundSurface);
 if(family==='Metal'||family==='Wood'||family==='Water')return family;
 if(['dirt','sand','grass','moss'].includes(surface??arena.info?.groundSurface))return 'Soft';
 if((surface??arena.info?.groundSurface)==='snow')return 'Snow';
 if((surface??arena.info?.groundSurface)==='gravel')return 'Gravel';return 'Hard';
}

// Foley shares the visible player's ejection offset, velocity and gravity, but
// has its own fixed pool: dropping visual particles cannot drop landing cues.
// Samples bake the short bounce/tumble; each body produces one landing voice.
export class CasingFoley {
 constructor(){this.slots=Array.from({length:32},()=>({life:0}));this.time=null;this.game=null;}
 clear(){for(const slot of this.slots){slot.life=0;slot.actor=null;}this.time=null;this.game=null;}
 eject(event,game,{revolver=false,count=1}={}){
  const weapon=event.weaponDef??game.actors?.find(a=>a.id===event.source)?.weapon?.def;
  if(!event.position||!weapon||weapon.kind==='MELEE'||weapon.revolver&&!revolver)return;
  if(event.source!==game.player.id&&Math.hypot(event.position.x-game.player.x,event.position.z-game.player.z)>18)return;
  const actor=game.actors?.find(a=>a.id===event.source)??game.player,yaw=actor.yaw??0,own=event.source===game.player.id;
  const rightX=Math.cos(yaw),rightZ=Math.sin(yaw);
  for(let i=0;i<Math.min(6,count);i++){
   let slot=this.slots.find(s=>s.life<=0);
   if(!slot&&own)slot=this.slots.find(s=>!s.own);if(!slot)break;
   // Pump/bolt actions release their case after the blast rather than before
   // the mechanism opens. Revolver cases leave together during extraction.
   const delay=revolver?Math.max(.08,(event.reloadTime??2.6)*.30)+i*.018:weapon.shellReload?.18:weapon.kind==='SNIPER'?.30:0;
   Object.assign(slot,{life:1.6+delay,delay,x:event.position.x+rightX*.23,y:event.position.y-.15,z:event.position.z+rightZ*.23,
    vx:rightX*(revolver?.65:1.8),vy:revolver?.25:1.2,vz:rightZ*(revolver?.65:1.8),source:event.source,own,collisions:0,landed:false,hull:weapon.kind==='SHOTGUN',actor,weaponId:weapon.id,extraction:revolver});
  }
 }
 update(game,onLanding){
  if(!Number.isFinite(game.time)||typeof game.arena.trace!=='function')return;
  if(this.game!==game||this.time===null||game.time<this.time){this.clear();this.game=game;this.time=game.time;return;}
  const elapsed=game.time-this.time;this.time=game.time;
  // A paused/tab-hidden gap is not a request to replay old cases in a burst.
  if(elapsed>.12){for(const slot of this.slots)slot.life=0;return;}
  if(elapsed<=0)return;
  for(const slot of this.slots){
   if(slot.life<=0)continue;slot.life-=elapsed;if(slot.landed)continue;
   if(slot.delay>0){
    const actor=slot.actor;
    if(actor.dead||actor.weapon.def.id!==slot.weaponId||slot.extraction&&actor.weapon.reloadLeft<=0){slot.life=0;continue;}
    const yaw=actor.yaw??0,rightX=Math.cos(yaw),rightZ=Math.sin(yaw),speed=slot.extraction?.65:1.8;
    slot.x=actor.x+rightX*.23;slot.y=actor.y+(actor.height??1.78)-.27;slot.z=actor.z+rightZ*.23;
    slot.vx=rightX*speed;slot.vz=rightZ*speed;
   }
   const dt=Math.max(0,elapsed-slot.delay);slot.delay=Math.max(0,slot.delay-elapsed);
   if(dt<=0||slot.life<=0)continue;
   const steps=Math.min(2,Math.ceil(dt/(1/30))),step=dt/steps;
   for(let i=0;i<steps&&slot.life>0;i++){
    const from={x:slot.x,y:slot.y,z:slot.z},next={x:slot.x+slot.vx*step,y:slot.y+slot.vy*step-4*step*step,z:slot.z+slot.vz*step};
    slot.vy-=8*step;
    const length=Math.hypot(next.x-from.x,next.y-from.y,next.z-from.z),dir={x:(next.x-from.x)/(length||1),y:(next.y-from.y)/(length||1),z:(next.z-from.z)/(length||1)};
    const hit=game.arena.trace(from,dir,length+.012);
    if(hit.block){
     const interval=boxInterval(from,dir,hit.block),normal=interval?.normal??{x:0,y:1,z:0};
     const position={x:from.x+dir.x*hit.t,y:from.y+dir.y*hit.t,z:from.z+dir.z*hit.t};
     if(normal.y>.5&&slot.vy<0){
      slot.life=.23;slot.landed=true;slot.x=position.x;slot.y=position.y+.012;slot.z=position.z;
      onLanding({position,source:slot.source,surface:casingFamily(game.arena,position,hit.block.surface),hull:slot.hull});break;
     }
     if(++slot.collisions>2||interval?.startsInside){slot.life=0;break;}
     const dot=slot.vx*normal.x+slot.vy*normal.y+slot.vz*normal.z;
     slot.vx=(slot.vx-2*dot*normal.x)*.45;slot.vy=(slot.vy-2*dot*normal.y)*.45;slot.vz=(slot.vz-2*dot*normal.z)*.45;
     slot.x=position.x+normal.x*.02;slot.y=position.y+normal.y*.02;slot.z=position.z+normal.z*.02;
    }else{slot.x=next.x;slot.y=next.y;slot.z=next.z;}
   }
  }
 }
}
