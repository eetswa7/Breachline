import {clamp,lerp,angleDelta} from './math.js?v=71';

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

// Analytic critically damped springs remain stable across frame rates and do
// not allocate per frame. They affect only the rendered model, never the aim ray.
function spring(state,key,target,frequency,dt){
 const velocityKey=key+'Velocity',offset=(state[key]??0)-target,velocity=state[velocityKey]??0;
 const carry=velocity+frequency*offset,decay=Math.exp(-frequency*dt);
 state[key]=target+(offset+carry*dt)*decay;
 state[velocityKey]=(velocity-frequency*carry*dt)*decay;
 return state[key];
}
const WEAPON_MASS={PISTOL:27,SMG:24,RIFLE:21,MARKSMAN:19,LMG:16,SHOTGUN:18,SNIPER:17,MELEE:23};
const smooth=(a,b,t)=>{const x=clamp((t-a)/(b-a),0,1);return x*x*(3-2*x);};

// Both hands retain their grip while the receiver and its opposite side are
// presented. Short weapons use a smaller arc; heavy weapons take longer.
export function inspectionPose(w,motion=true,out={}){
 const t=w.inspectLeft>0?clamp(1-w.inspectLeft/w.inspectTime,0,1):0;
 const lift=w.inspectLeft>0?smooth(0,.18,t)*(1-smooth(.82,1,t)):0;
 const reverse=smooth(.43,.66,t),compact=['PISTOL','MELEE'].includes(w.def.kind),arc=(compact?.83:1)*(motion?1:.6);
 out.x=-.12*lift;out.y=.13*lift;out.z=-.055*lift;
 out.yaw=(.34-.68*reverse)*lift*arc;out.pitch=(.09+.05*Math.sin(t*Math.PI))*lift*arc;
 out.roll=(-.72+1.44*reverse)*lift*arc;out.weight=lift;
 return out;
}

function weaponMotion(view,p,w,dt,motion){
 const frequency=WEAPON_MASS[w.def.kind]??21,yaw=p.yaw??0,pitch=p.pitch??0;
 if(view.weapon!==w){
  view.weapon=w;view.shotSerial=Math.max(0,(w.shotSerial??0)-(w.sinceShot<.15?1:0));view.yaw=yaw;view.pitch=pitch;
  for(const key of ['inertiaX','inertiaY','inertiaYaw','inertiaPitch','recoilZ','recoilPitch','recoilRoll'])view[key]=view[key+'Velocity']=0;
 }
 const turn=dt>0?clamp(angleDelta(view.yaw,yaw)/dt,-3,3):0;
 const tilt=dt>0?clamp((pitch-view.pitch)/dt,-2,2):0;
 view.yaw=yaw;view.pitch=pitch;
 spring(view,'inertiaX',motion?-turn*.008:0,frequency,dt);
 spring(view,'inertiaY',motion?-tilt*.006:0,frequency,dt);
 spring(view,'inertiaYaw',motion?-turn*.021:0,frequency*.9,dt);
 spring(view,'inertiaPitch',motion?tilt*.015:0,frequency*.9,dt);
 const serial=w.shotSerial??0,shots=Math.max(0,Math.min(3,serial-view.shotSerial));view.shotSerial=serial;
 if(motion&&shots&&w.sinceShot<.15){
  const strength=clamp(w.def.recoil*w.modifiers.recoil,.015,.13),sign=Math.sin((w.shotIndex??0)*1.73+w.def.id);
  // Velocity impulses give the gun a brief rearward push, a weighted peak and
  // a smooth return; sustained fire remains bounded rather than accumulating.
  view.recoilZVelocity=clamp(view.recoilZVelocity+strength*frequency*3.0*shots,-2.8,2.8);
  view.recoilPitchVelocity=clamp(view.recoilPitchVelocity+strength*frequency*2.2*shots,-2.4,2.4);
  view.recoilRollVelocity=clamp(view.recoilRollVelocity+sign*strength*frequency*.65*shots,-.7,.7);
 }
 spring(view,'recoilZ',0,frequency,dt);spring(view,'recoilPitch',0,frequency*.85,dt);spring(view,'recoilRoll',0,frequency*.9,dt);
 if(!motion)for(const key of ['inertiaX','inertiaY','inertiaYaw','inertiaPitch','recoilZ','recoilPitch','recoilRoll'])view[key]=view[key+'Velocity']=0;
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
 weaponMotion(view,p,w,dt,motion);
 view.land=lerp(view.land??0,motion?clamp(p.landKick??0,0,.15):0,blend);
 // Integrating stride phase avoids the sudden bob reversal of time * current speed.
 view.phase=(view.phase+view.speed*dt*2.8)%(Math.PI*2);
 const r=w.reloadLeft>0?clamp(1-w.reloadLeft/w.reloadTime,0,1):0;
 const reload=w.reloadLeft>0?Math.sin(r*Math.PI):0,hip=1-ads;
 const shell=w.def.shellReload||w.def.id===5,heavy=w.def.kind==='LMG',reloadTilt=shell?.42:heavy?1.13:1;
 const bob=motion?Math.sin(view.phase)*Math.min(.012,view.speed*.0035)*hip:0;
 const sway=motion?(Math.cos(view.phase*.5)*Math.min(.005,view.speed*.0015)+Math.sin(time*1.7)*.0012)*hip:0;
 const sprint=view.sprint*hip,kick=clamp(p.visualKick??0,0,.3),recoil=motion?clamp(view.recoilZ,0,.10):kick*.48;
 const presentation=hip*hip;
 out.x=view.inertiaX*hip+lerp(short?.18:.22,0,ads)+sway+reload*(shell?.018:.035);
 out.y=(view.inertiaY-view.land*.16)*hip+lerp(short?-.218:-.245,-sightHeight(w),ads)+bob-reload*.11*reloadTilt-(p.switchLeft??0)*.42-sprint*.075-view.vault*.19*hip;
 out.z=lerp(short?-.43:-.49,short?-.29:-.32,ads)+recoil*lerp(1,.56,ads)-reload*.02;
 out.yaw=reload*.2*reloadTilt-sprint*.20+view.inertiaYaw*presentation;
 out.pitch=reload*.47*reloadTilt+sprint*.21+clamp(view.recoilPitch,0,.11)*presentation+view.inertiaPitch*presentation+view.vault*.42*hip;
 out.roll=(view.inertiaX*.4-view.strafe*.028)*hip+lerp(short?-.02:-.035,0,ads)-reload*.22*reloadTilt+sprint*.18+view.recoilRoll*presentation;
 // The blade uses a deliberate wrist stroke rather than a firearm impulse.
 const slash=w.def.kind==='MELEE'?kick*hip*(motion?1:.35):0;
 out.x-=slash*.18;out.y+=slash*.09;out.z-=slash*.48;
 out.yaw-=slash*.6;out.pitch-=slash*.35;out.roll-=slash*1.4;
 const inspect=inspectionPose(w,motion,view.inspection??(view.inspection={}));
 const inspectGain=hip*hip*(w.reloadLeft<=0&&!(p.switchLeft>0)&&!p.sprinting&&!p.vault?1:0);
 out.x+=inspect.x*inspectGain;out.y+=inspect.y*inspectGain;out.z+=inspect.z*inspectGain;
 out.yaw+=inspect.yaw*inspectGain;out.pitch+=inspect.pitch*inspectGain;out.roll+=inspect.roll*inspectGain;
 const obstruction=clamp(p.weaponObstruction??0,0,1)*hip*hip;out.x+=obstruction*.08;out.y-=obstruction*.15;out.z+=obstruction*.10;out.pitch+=obstruction*.55;out.roll-=obstruction*.18;
 out.scale=1;return out;
}
