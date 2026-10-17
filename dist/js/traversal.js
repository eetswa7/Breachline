import {clamp,lerp} from './math.js?v=71';

export function beginVault(actor,arena,dx,dz){
 const length=Math.hypot(dx,dz);
 if(length<.5||!actor.grounded||actor.vault)return false;
 dx/=length;dz/=length;
 const hit=arena.trace({x:actor.x,y:actor.y+.55,z:actor.z},{x:dx,y:0,z:dz},.95);
 if(!hit.block||hit.block.roof||hit.block.ground)return false;
 const top=hit.block.y+hit.block.h/2,rise=top-actor.y;
 if(rise<.4||rise>2.2)return false;
 const to={x:actor.x+dx*(hit.t+.62),y:top+.025,z:actor.z+dz*(hit.t+.62)};
 const head={x:actor.x,y:actor.y+1.67,z:actor.z},lifted={x:actor.x,y:to.y+1.67,z:actor.z};
 if(arena.collides({...to,y:to.y+.035},.31,1.75)||!arena.visible(head,lifted)||!arena.visible(lifted,{x:to.x,y:to.y+1.67,z:to.z}))return false;
 actor.vault={from:{x:actor.x,y:actor.y,z:actor.z},to,time:0,duration:rise>1.25?.62:.36,kind:rise>1.25?'mantle':'vault'};
 actor.vy=actor.vx=actor.vz=0;actor.grounded=false;actor.crouched=false;actor.sliding=false;actor.slideLeft=0;
 return true;
}

export function advanceVault(actor,arena,dt){
 const vault=actor.vault;if(!vault)return false;
 vault.time=Math.min(vault.duration,vault.time+dt);
 const t=vault.time/vault.duration,smooth=value=>value*value*(3-2*value);
 // Lift before moving over the face. Every intermediate capsule is validated.
 const horizontal=smooth(clamp((t-.42)/.58,0,1)),lift=smooth(clamp(t/.42,0,1));
 const next={x:lerp(vault.from.x,vault.to.x,horizontal),y:lerp(vault.from.y,vault.to.y,lift)+Math.sin(Math.PI*t)*.035,z:lerp(vault.from.z,vault.to.z,horizontal)};
 if(arena.collides({...next,y:next.y+.035},.31,1.74)){actor.vault=null;actor.vy=0;return false;}
 actor.x=next.x;actor.y=next.y;actor.z=next.z;
 if(t>=1){actor.vault=null;actor.y=arena.floorAt(actor,actor.y+.08);actor.grounded=true;actor.landKick=.025;}
 return true;
}
