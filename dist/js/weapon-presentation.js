import {clamp,lerp} from './math.js?v=61';

// Presentation only: none of these springs change aim, spread or ballistics.
// The exact damped solution remains stable at different simulation/render rates.
export function springStep(state,key,target,frequency,damping,dt){
 const velocity=key+'Velocity';state[key]??=0;state[velocity]??=0;
 if(!(dt>0))return;
 const x=state[key]-target,v=state[velocity];
 const decay=frequency*damping,oscillation=frequency*Math.sqrt(1-damping*damping);
 const envelope=Math.exp(-decay*dt),c=Math.cos(oscillation*dt),s=Math.sin(oscillation*dt);
 state[key]=target+envelope*(x*c+(v+decay*x)/oscillation*s);
 state[velocity]=envelope*(v*c-(decay*v+frequency*frequency*x)/oscillation*s);
}

export function resetWeaponPresentation(p){
 p.inspection=null;
 p.weaponMotion={weapon:p.weapon,z:0,zVelocity:0,pitch:0,pitchVelocity:0,roll:0,rollVelocity:0};
}
export function cancelInspection(p){p.inspection=null;}

export function beginInspection(p){
 const w=p.weapon;
 if(p.dead||p.switchLeft>0||w.reloadLeft>0||w.cooldown>0||w.sinceShot<.18||p.ads>.1||p.sprinting||p.sliding||p.vault)return false;
 p.inspection={weapon:w,time:0,duration:['PISTOL','MELEE'].includes(w.def.kind)?2.7:3.4};return true;
}

export function updateWeaponPresentation(p,dt,input={}){
 if(p.weaponMotion?.weapon!==p.weapon)resetWeaponPresentation(p);
 const state=p.weaponMotion,heavy=['LMG','SNIPER'].includes(p.weapon.def.kind);
 const frequency=heavy?19:p.weapon.def.kind==='PISTOL'?27:24;
 springStep(state,'z',0,frequency,.69,dt);
 springStep(state,'pitch',0,frequency*.91,.72,dt);
 springStep(state,'roll',0,frequency*1.12,.76,dt);
 // Combat and traversal always take priority. Cancellation changes no timers,
 // ammo or burst state, so firing/aiming never waits for an inspect animation.
 const conflict=p.dead||p.switchLeft>0||p.weapon.reloadLeft>0||p.sprinting||p.sliding||p.vault||
  input.ads||input.fire||input.firePressed||input.reload||input.swap||input.grenade||input.melee||input.interact||input.jump||input.crouch;
 if(conflict)cancelInspection(p);
 else if(input.inspect){if(p.inspection)cancelInspection(p);else beginInspection(p);}
 if(p.inspection){
  p.inspection.time+=Math.max(0,dt);
  if(p.inspection.weapon!==p.weapon||p.inspection.time>=p.inspection.duration)cancelInspection(p);
 }
}

export function impulseWeaponRecoil(p,w,recoil){
 if(p.weaponMotion?.weapon!==w)resetWeaponPresentation(p);
 cancelInspection(p);
 const state=p.weaponMotion,kind=w.def.kind;
 const lift=kind==='PISTOL'?1.38:kind==='LMG'?.83:kind==='SHOTGUN'?1.17:1;
 const lateral=Math.sin((w.shotIndex+1)*1.73+w.def.id)*w.horizontalRecoil;
 state.z=clamp(state.z+recoil*.22,-.018,.075);
 state.zVelocity=clamp(state.zVelocity+recoil*28,-1.5,2);
 state.pitch=clamp(state.pitch+recoil*.38*lift,-.06,.22);
 state.pitchVelocity=clamp(state.pitchVelocity+recoil*42*lift,-3,4);
 state.roll=clamp(state.roll+recoil*lateral*.12,-.035,.035);
 state.rollVelocity=clamp(state.rollVelocity+recoil*lateral*6,-.75,.75);
}

// Receiver view, a second glance across the sights/magazine, then return to
// ready. Smoothstep holds zero velocity at each authored pose, including ends.
const INSPECTION_KEYS=[
 [0,0,0,0,0,0,0],
 [.18,-.12,.145,-.25,.68,.12,.38],
 [.43,-.13,.15,-.26,.73,.15,.40],
 [.65,-.08,.13,-.24,.35,-.04,-.43],
 [.79,-.075,.125,-.24,.31,-.055,-.45],
 [1,0,0,0,0,0,0]
];
export function inspectionPose(p,motion=true,out={}){
 const inspect=p.inspection,active=inspect?.weapon===p.weapon&&!p.weapon.reloadLeft&&!p.switchLeft&&!p.dead;
 const t=active?clamp(inspect.time/inspect.duration,0,1):0;
 let a=INSPECTION_KEYS[0],b=INSPECTION_KEYS[1];
 for(let i=1;i<INSPECTION_KEYS.length;i++)if(t<=INSPECTION_KEYS[i][0]){a=INSPECTION_KEYS[i-1];b=INSPECTION_KEYS[i];break;}
 const blend=clamp((t-a[0])/(b[0]-a[0]),0,1),ease=blend*blend*(3-2*blend);
 const compact=['PISTOL','MELEE'].includes(p.weapon.def.kind),hip=(1-clamp(p.ads,0,1))**2;
 const calm=motion?1:.65;
 out.x=lerp(a[1],b[1],ease)*hip*(compact?.7:1);
 // A long shoulder stock approaches the camera during the receiver turn. Raise
 // long guns a little farther so the complete butt stays inside landscape view.
 out.y=lerp(a[2],b[2],ease)*hip*(compact?1:1.28);
 out.z=lerp(a[3],b[3],ease)*hip*(compact?.6:1);
 out.yaw=lerp(a[4],b[4],ease)*hip*calm*(compact?1.15:1);
 out.pitch=lerp(a[5],b[5],ease)*hip*calm;
 out.roll=lerp(a[6],b[6],ease)*hip*calm;
 return out;
}
