import {clamp,lerp} from './math.js?v=61';

// An intentional handling action: no camera movement, new meshes, or background
// clock. The existing weapon and both gripping hands move together as one rig.
export const inspectionDuration=w=>w.def.kind==='LMG'?3.8:w.def.kind==='SNIPER'?3.6:w.def.kind==='PISTOL'||w.def.kind==='MELEE'?2.9:3.35;
export function updateInspection(p,input,dt){
 const w=p.weapon,busy=p.dead||p.sprinting||p.sliding||p.vault||!p.grounded||w.reloadLeft>0||p.switchLeft>0||w.burstRemaining>0||input.fire||input.firePressed||input.ads||input.reload||input.swap||input.grenade||input.melee||input.jump||input.interact||input.autoReload&&w.ammo===0&&w.reserve>0;
 if(busy||p.inspection&&p.inspection.weapon!==w){p.inspection=null;return;}
 if(input.inspect){
  if(p.inspection){p.inspection=null;return;}
  // Do not pull a weapon out of its last shot/ADS recovery or switching pose.
  if(w.cooldown>0||p.ads>.1)return;
  p.inspection={weapon:w,elapsed:0,duration:inspectionDuration(w)};
 }
 if(p.inspection){p.inspection.elapsed+=clamp(dt,0,1/30);if(p.inspection.elapsed>=p.inspection.duration)p.inspection=null;}
}

const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
// The presentation has two reads: receiver/side, then a gentle top/action check.
// Larger rigs move further away so their stock, optic and muzzle stay readable.
export function applyInspectionPose(out,p){
 const state=p.inspection;if(!state||state.weapon!==p.weapon||p.ads>.1)return out;
 const kind=p.weapon.def.kind,compact=kind==='PISTOL'||kind==='MELEE',heavy=kind==='LMG'||kind==='SNIPER',smg=kind==='SMG';
 const t=clamp(state.elapsed/state.duration,0,1),lift=smooth(t/.18)*(1-smooth((t-.81)/.19)),turn=smooth((t-.43)/.18);
 const depth=compact?-.64:heavy?-1.04:smg?-.85:-.96;
 const x=compact?.16:heavy?.21:.20,y=compact?-.09:heavy?-.085:-.075;
 const yaw=lerp(.83,compact?.49:.59,turn),pitch=lerp(.10,-.20,turn),roll=lerp(kind==='MELEE'?-.44:-.31,.24,turn);
 out.x=lerp(out.x,x,lift);out.y=lerp(out.y,y,lift);out.z=lerp(out.z,depth-(p.weapon.barrel===1&&!compact?.04:0),lift);
 out.yaw=lerp(out.yaw,yaw,lift);out.pitch=lerp(out.pitch,pitch,lift);out.roll=lerp(out.roll,roll,lift);
 return out;
}
