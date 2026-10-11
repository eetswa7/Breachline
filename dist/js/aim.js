import {clamp,lerp,angleDelta} from './math.js?v=61';
import {applyInspectionPose} from './inspection.js?v=61';

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

// Analytic damped springs remain stable at 30/60/120 Hz and pause at dt=0.
// All values are presentation only; the player's aim and bullet direction stay
// in the simulation. Full ADS removes angular inertia from the sight line.
function handlingSpring(state,key,target,omega,dt,limit){
 const position=state[key]??0,velocity=state[key+'Velocity']??0,delta=position-target,e=Math.exp(-omega*dt),step=(velocity+omega*delta)*dt;
 state[key]=clamp(target+(delta+step)*e,-limit,limit);state[key+'Velocity']=(velocity-omega*step)*e;
}
export function weaponDynamics(view,p,dt,motion=true){
 const w=p.weapon;
 if(view.dynamicWeapon!==w){view.dynamicWeapon=w;for(const key of ['inertiaYaw','inertiaPitch','inertiaRoll','recoilSpring']){view[key]=0;view[key+'Velocity']=0;}view.recoilShot=w.shotIndex;}
 const yaw=p.yaw??0,pitch=p.pitch??0,turn=dt>0?clamp(angleDelta(view.yaw??yaw,yaw)/dt,-4,4):0,tilt=dt>0?clamp((pitch-(view.pitch??pitch))/dt,-3,3):0;
 view.yaw=yaw;view.pitch=pitch;
 if(!motion){for(const key of ['inertiaYaw','inertiaPitch','inertiaRoll','recoilSpring']){view[key]=0;view[key+'Velocity']=0;}view.recoilShot=w.shotIndex;return;}
 const heavy=w.def.kind==='LMG'||w.def.kind==='SNIPER',compact=w.def.kind==='PISTOL'||w.def.kind==='MELEE',weight=(heavy?1.24:compact?.72:1)*clamp(w.adsTime/w.def.ads,.65,1.4),response=(compact?34:heavy?22:28)/Math.sqrt(weight);
 handlingSpring(view,'inertiaYaw',-turn*.017*weight,response,dt,.085);
 handlingSpring(view,'inertiaPitch',tilt*.012*weight,response,dt,.06);
 handlingSpring(view,'inertiaRoll',-turn*.008*weight,response*.9,dt,.045);
 if(view.recoilShot!==w.shotIndex){
  const shots=clamp(w.shotIndex-view.recoilShot,1,3),impulse=clamp(w.recoilFor(clamp(p.ads,0,1),p.crouched,Math.hypot(p.vx,p.vz)<.6)*2.5*shots,0,.2);
  view.recoilSpring=clamp(view.recoilSpring+impulse*.5,0,.23);view.recoilSpringVelocity+=impulse*response*1.8;view.recoilShot=w.shotIndex;
 }
 // A slightly underdamped return gives a short counter-motion after the shot,
 // bounded independently of the game's actual aim recoil and firing cadence.
 const omega=heavy?27:compact?40:34,zeta=.74,frequency=omega*Math.sqrt(1-zeta*zeta),decay=Math.exp(-zeta*omega*dt),sin=Math.sin(frequency*dt),cos=Math.cos(frequency*dt),x=view.recoilSpring,v=view.recoilSpringVelocity;
 view.recoilSpring=clamp(decay*(x*cos+(v+zeta*omega*x)/frequency*sin),-.015,.23);
 view.recoilSpringVelocity=clamp(decay*(v*cos-(zeta*omega*v+omega*omega*x)/frequency*sin),-5,5);
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
 weaponDynamics(view,p,dt,motion);
 view.inertiaX=lerp(view.inertiaX??0,motion?-turn*.006:0,blend);
 view.inertiaY=lerp(view.inertiaY??0,motion?-tilt*.004:0,blend);
 view.land=lerp(view.land??0,motion?clamp(p.landKick??0,0,.15):0,blend);
 if(!motion)view.inertiaX=view.inertiaY=view.strafe=view.land=0;
 // Integrating stride phase avoids the sudden bob reversal of time * current speed.
 view.phase=(view.phase+view.speed*dt*2.8)%(Math.PI*2);
 const r=w.reloadLeft>0?clamp(1-w.reloadLeft/w.reloadTime,0,1):0;
 const reload=w.reloadLeft>0?Math.sin(r*Math.PI):0,hip=1-ads;
 const shell=w.def.shellReload||w.def.id===5,heavy=w.def.kind==='LMG',reloadTilt=shell?.42:heavy?1.13:1;
 const bob=motion?Math.sin(view.phase)*Math.min(.012,view.speed*.0035)*hip:0;
 const sway=motion?(Math.cos(view.phase*.5)*Math.min(.005,view.speed*.0015)+Math.sin(time*1.7)*.0012)*hip:0;
 const sprint=view.sprint*hip,kick=motion?Math.max(view.recoilSpring,p.knifeCooldown>0?clamp(p.visualKick??0,0,.3):-.015):clamp(p.visualKick??0,0,.3),sign=Math.sin((w.shotIndex??0)*1.73+w.def.id);
 out.x=view.inertiaX*hip+lerp(short?.18:.22,0,ads)+sway+reload*(shell?.018:.035);
 out.y=(view.inertiaY-view.land*.16)*hip+lerp(short?-.218:-.245,-sightHeight(w),ads)+bob-reload*.11*reloadTilt-(p.switchLeft??0)*.42-sprint*.075-view.vault*.19*hip;
 out.z=lerp(short?-.43:-.49,short?-.29:-.32,ads)+kick*lerp(.48,.27,ads)-reload*.02;
 out.yaw=reload*.2*reloadTilt-sprint*.20+(motion?view.inertiaYaw+sign*kick*.10*w.horizontalRecoil:0)*hip*hip;
 out.pitch=reload*.47*reloadTilt+sprint*.21+kick*(motion?.24:.16)*hip+view.inertiaPitch*hip*hip+view.vault*.42*hip;
 out.roll=(view.inertiaX*.4-view.strafe*.028+view.inertiaRoll)*hip+lerp(short?-.02:-.035,0,ads)-reload*.22*reloadTilt+sprint*.18+(motion?sign*kick*.14*hip:0);
 const obstruction=clamp(p.weaponObstruction??0,0,1)*hip*hip;out.x+=obstruction*.08;out.y-=obstruction*.15;out.z+=obstruction*.10;out.pitch+=obstruction*.55;out.roll-=obstruction*.18;
 out.scale=1;return applyInspectionPose(out,p);
}
