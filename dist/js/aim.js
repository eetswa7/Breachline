import {clamp,lerp,angleDelta} from './math.js?v=61';
import {springStep,inspectionPose} from './weapon-presentation.js?v=61';

// Rendering, HUD and input share the same optic definition. Never put an opaque
// first-person scope model in front of the magnified world camera.
export const isScoped=w=>w.def.kind==='SNIPER'||w.def.id===7||[3,5,6].includes(w.optic);
export const opticMagnification=w=>w.optic===6?6:w.optic===5?2.5:isScoped(w)?4:w.optic===2?2:w.optic===4?1.6:1.35;
export function aimFov(horizontalDegrees,weapon,ads=0){
 const hip=horizontalDegrees*Math.PI/180;
 return lerp(hip,2*Math.atan(Math.tan(hip/2)/opticMagnification(weapon)),clamp(ads,0,1));
}
export const verticalFov=(horizontal,aspect)=>2*Math.atan(Math.tan(horizontal/2)/aspect);
export const scopeVisible=p=>!p.dead&&isScoped(p.weapon)&&p.ads>.62;
export const sightHeight=w=>isScoped(w)?.188:[1,2,4].includes(w.optic)?.169:.119;

// A small, damped sprint lens change. ADS and reduced-motion keep their exact lens.
export function movementFov(state,actor,horizontal,dt,enabled=true){
 if(!enabled){state.offset=0;return horizontal;}
 const target=enabled&&actor.sprinting&&!actor.vault?5:0;
 state.offset=lerp(state.offset??0,target,1-Math.exp(-clamp(dt,0,.05)*9));
 return horizontal+state.offset*(1-clamp(actor.ads,0,1))**2;
}

// Integrate travelled distance, not elapsed time times changing speed. The small
// amplitude settles smoothly on stops; fully aimed fire keeps the camera centred.
export function cameraBob(state,speed,grounded,ads,dt,enabled=true){
 dt=clamp(dt,0,.05);speed=Math.max(0,speed);
 state.phase=((state.phase??0)+(grounded?speed:0)*dt*2.8)%(Math.PI*2);
 const target=enabled&&grounded?Math.min(.023,speed*.006):0;
 state.amplitude=lerp(state.amplitude??0,target,1-Math.exp(-dt*16));
 return enabled?Math.sin(state.phase)*state.amplitude*(1-clamp(ads,0,1)):0;
}

export function weaponPose(p,time,motion=true,menu=false,out={}){
 if(menu){
  const kind=p.weapon.def.kind,compact=kind==='PISTOL'||kind==='MELEE',smg=kind==='SMG';
  // Keep the complete stock and magazine inside the landscape menu framing.
  Object.assign(out,{x:compact?.28:smg?.29:.24,y:compact?.025:.02,z:compact?-.95:smg?-1.05:-1.22,yaw:1,pitch:-.06,roll:-.075,scale:compact?1.75:smg?1.50:1.32});return out;
 }
 const w=p.weapon,ads=clamp(p.ads,0,1),speed=Math.hypot(p.vx,p.vz),short=w.def.kind==='PISTOL';
 const view=p.viewModel??(p.viewModel={time,phase:0,speed:0,sprint:0});
 const dt=clamp(time-view.time,0,.05);view.time=time;
 const blend=1-Math.exp(-dt*14);view.speed=lerp(view.speed,speed,blend);view.sprint=lerp(view.sprint,p.sprinting?1:0,blend);
 view.vault=lerp(view.vault??0,p.vault?1:0,blend);
 const strafe=(p.vx??0)*Math.cos(p.yaw??0)+(p.vz??0)*Math.sin(p.yaw??0);
 view.strafe=lerp(view.strafe??0,motion?clamp(strafe/5,-1,1):0,blend);
 const yaw=p.yaw??0,pitch=p.pitch??0;
 const turn=dt>0?clamp(angleDelta(view.yaw??yaw,yaw)/dt,-3,3):0;
 const tilt=dt>0?clamp((pitch-(view.pitch??pitch))/dt,-2,2):0;
 view.yaw=yaw;view.pitch=pitch;
 // Shoulder/hand lag catches up with a restrained rebound instead of following
 // raw input directly. Heavy rigs settle slower; ADS fades every lateral axis.
 const weight=['LMG','SNIPER'].includes(w.def.kind)?.82:short?1.15:1;
 springStep(view,'inertiaX',motion?-turn*.010:0,19*weight,.79,dt);
 springStep(view,'inertiaY',motion?-tilt*.007:0,21*weight,.80,dt);
 springStep(view,'inertiaYaw',motion?-turn*.022:0,18*weight,.78,dt);
 springStep(view,'inertiaPitch',motion?tilt*.018:0,20*weight,.79,dt);
 const forward=(p.vx??0)*Math.sin(yaw)-(p.vz??0)*Math.cos(yaw);
 const acceleration=dt>0?clamp((forward-(view.forward??forward))/dt,-18,18):0;view.forward=forward;
 springStep(view,'travelZ',motion?clamp(-forward*.0018-acceleration*.00055,-.018,.018):0,17*weight,.82,dt);
 view.land=lerp(view.land??0,motion?clamp(p.landKick??0,0,.15):0,blend);
 // Integrating stride phase avoids the sudden bob reversal of time * current speed.
 view.phase=(view.phase+view.speed*dt*2.8)%(Math.PI*2);
 const r=w.reloadLeft>0?clamp(1-w.reloadLeft/w.reloadTime,0,1):0;
 const reload=w.reloadLeft>0?Math.sin(r*Math.PI):0,hip=1-ads;
 const shell=w.def.shellReload||w.def.id===5,heavy=w.def.kind==='LMG',reloadTilt=shell?.42:heavy?1.13:1;
 const grounded=p.grounded!==false?1:.18;
 const bob=motion?Math.sin(view.phase)*Math.min(.012,view.speed*.0035)*hip*grounded:0;
 const sway=motion?(Math.cos(view.phase*.5)*Math.min(.005,view.speed*.0015)+Math.sin(time*1.7)*.0012)*hip:0;
 const sprint=view.sprint*hip,kick=clamp(p.visualKick??0,0,.3),sign=Math.sin((w.shotIndex??0)*1.73+w.def.id);
 const recoil=p.weaponMotion?.weapon===w&&w.def.kind!=='MELEE'?p.weaponMotion:null;
 const recoilZ=recoil?recoil.z:kick*.48,recoilPitch=recoil?recoil.pitch:kick*.16,recoilRoll=recoil?recoil.roll:sign*kick*.11;
 // Aimed recoil translates along the sight ray, retaining exact front/rear
 // alignment. Ballistic camera climb is still handled by the simulation.
 const settle=hip*hip,inertial=motion?settle:0,inspect=inspectionPose(p,motion,view.inspectPose??(view.inspectPose={}));
 out.x=(view.inertiaX??0)*inertial+lerp(short?.18:.22,0,ads)+sway+reload*(shell?.018:.035)+inspect.x;
 out.y=((view.inertiaY??0)-view.land*.16)*inertial+lerp(short?-.218:-.245,-sightHeight(w),ads)+bob-reload*.11*reloadTilt-(p.switchLeft??0)*.42-sprint*.075-view.vault*.19*hip+inspect.y;
 out.z=lerp(short?-.43:-.49,short?-.29:-.32,ads)+recoilZ*lerp(motion?1:.35,.52,ads)+(view.travelZ??0)*inertial-reload*.02+inspect.z;
 out.yaw=(view.inertiaYaw??0)*inertial+reload*.2*reloadTilt-sprint*.20+inspect.yaw;
 out.pitch=(view.inertiaPitch??0)*inertial+reload*.47*reloadTilt+sprint*.21+(motion?recoilPitch*settle:0)+view.vault*.42*hip+inspect.pitch;
 out.roll=((view.inertiaX??0)*.4-view.strafe*.028)*inertial+lerp(short?-.02:-.035,0,ads)-reload*.22*reloadTilt+sprint*.18+(motion?recoilRoll*settle:0)+inspect.roll;
 const obstruction=clamp(p.weaponObstruction??0,0,1)*hip*hip;out.x+=obstruction*.08;out.y-=obstruction*.15;out.z+=obstruction*.10;out.pitch+=obstruction*.55;out.roll-=obstruction*.18;
 out.scale=1;return out;
}
