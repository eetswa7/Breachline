import {clamp} from './math.js?v=61';

const TAU=Math.PI*2;
export function poseBlend(a,b,value){const t=clamp((value-a)/(b-a),0,1);return t*t*(3-2*t);}
const approach=(a,b,dt,rate)=>a+(b-a)*(1-Math.exp(-dt*rate));

// A persistent presentation state blends locomotion, stance and readiness.
// Simulation velocity, collision, aim and weapon timers are never written here.
export function updateOperatorMotion(actor,time){
 const speed=Math.hypot(actor.vx,actor.vz),dt=Math.min(.05,Math.max(0,time-(actor.animTime??time)));
 const c=Math.cos(actor.yaw),s=Math.sin(actor.yaw),side=c*actor.vx+s*actor.vz,forward=s*actor.vx-c*actor.vz;
 const m=actor.operatorMotion??(actor.operatorMotion={side,forward,run:0,aim:actor.ads??0,ground:actor.grounded===false?0:1,lastYaw:actor.yaw,turn:0,torsoPitch:0,torsoRoll:0,weaponRoll:0,weaponPitch:0,weaponX:0,weaponY:0,weaponZ:0,death:{}});
 const protection=actor.spawnProtection??0;
 if(!actor.dead&&(m.wasDead||m.lastDamage>=0&&actor.lastDamage===-100||protection>(m.protection??protection)+.25)){
  actor.animSpeed=speed;actor.animDuck=actor.crouched?.5:0;actor.stride=actor.id;
  m.side=side;m.forward=forward;m.run=0;m.aim=actor.ads??0;m.ground=actor.grounded===false?0:1;m.lastYaw=actor.yaw;m.turn=0;m.torsoPitch=0;m.torsoRoll=0;
 }
 m.wasDead=actor.dead;m.lastDamage=actor.lastDamage;m.protection=protection;
 actor.animTime=time;
 actor.animSpeed=approach(actor.animSpeed??speed,actor.dead?0:speed,dt,11);
 actor.animDuck=approach(actor.animDuck??0,actor.crouched?.5:0,dt,11);
 const reload=actor.weapon.reloadLeft>0,runTarget=actor.dead||actor.crouched||reload?0:poseBlend(3.5,5.8,speed)*(1-(actor.ads??0));
 m.run=approach(m.run,runTarget,dt,7);m.aim=approach(m.aim,actor.dead||reload?0:actor.ads??0,dt,12);
 const grounded=actor.grounded===false?0:1;m.ground=dt?approach(m.ground,grounded,dt,12):grounded;
 // Direction reversal eases through the neutral pose. A paused/manual pose can
 // still be evaluated at a new heading without advancing its animation clock.
 m.side=dt?approach(m.side,side,dt,10):side;m.forward=dt?approach(m.forward,forward,dt,10):forward;
 const turn=Math.atan2(Math.sin(actor.yaw-m.lastYaw),Math.cos(actor.yaw-m.lastYaw));
 m.lastYaw=actor.yaw;m.turn=approach(m.turn,dt?clamp(turn/dt,-5,5):0,dt,8);
 m.duck=actor.animDuck;m.death=operatorDeathPose(actor,time,m.death);
 const deathDuck=.14*poseBlend(.08,.32,m.death.age);if(actor.dead)m.duck+=deathDuck;
 m.cycleDistance=1.7+m.run*.5-actor.animDuck*.8;
 m.stance=.43-m.run*.09+actor.animDuck*.12;
 const phaseSpeed=actor.dead?0:actor.animSpeed;
 const strideWeight=Math.min(1,actor.animSpeed/3);
 actor.stride=((actor.stride??actor.id)+phaseSpeed*dt*TAU/(m.cycleDistance*Math.max(.000001,strideWeight)))%TAU;
 const moving=clamp(actor.animSpeed/2.2,0,1),gait=Math.sin(actor.stride),double=Math.cos(actor.stride*2);
 m.settle=-double*(.009+.011*m.run)*moving*m.ground+Math.sin(time*2.15+actor.id)*.003*(1-moving);
 if(actor.dead)m.settle*=1-poseBlend(.28,.90,m.death.age);
 const lean=-.11*m.run*m.ground-.11*actor.animDuck+.015*clamp(m.forward/4,-1,1)*(1-m.aim);
 m.torsoPitch=approach(m.torsoPitch,lean,dt,10);
 m.torsoRoll=approach(m.torsoRoll,-clamp(m.side/5,-1,1)*.055-clamp(m.turn,-3,3)*.013+gait*.018*moving*(1-m.aim),dt,10);
 const react=clamp(actor.hitReact??0,0,.16)*(actor.dead?1-poseBlend(.04,.40,m.death.age):1),sign=actor.id%2?1:-1;
 m.impactPitch=react*(1+.25*Math.sin(time*27+actor.id));m.impactRoll=react*sign*.45;
 m.headPitch=clamp(actor.pitch??0,-.65,.65)*.42*m.aim;
 m.weaponPitch=.24*m.run*(1-m.aim)+m.impactPitch*.55;
 m.weaponRoll=-.065*m.run+gait*.022*moving*(1-m.aim)+m.impactRoll*.5;
 m.weaponX=gait*.006*moving*(1-m.aim);m.weaponY=-.085*m.run;
 m.weaponZ=.045*m.run+react*.065;
 if(actor.dead){
  const release=poseBlend(.15,.60,m.death.age);
  m.weaponPitch-=release*(1.35+clamp(actor.pitch??0,-.65,.65));m.weaponY-=release*.10;m.weaponZ+=release*.05;m.headPitch+=release*.32;
 }
 actor.operatorSettle=m.settle;
 return m;
}

// Shared torso/arm/gear transform around the pelvis. Keeping it separate from
// the held weapon lets the chest absorb locomotion while ADS remains stable.
export function operatorTorsoPoint(actor,x,y,z,out={}){
 const m=actor.operatorMotion,pivot=.82-(m?.duck??actor.animDuck??0)*.8;
 const pitch=(m?.torsoPitch??0)+(m?.impactPitch??0),roll=(m?.torsoRoll??0)+(m?.impactRoll??0);
 const cr=Math.cos(roll),sr=Math.sin(roll),cp=Math.cos(pitch),sp=Math.sin(pitch),dy=y-pivot;
 const rx=cr*x-sr*dy,ry=sr*x+cr*dy;
 out.x=rx;out.y=pivot+cp*ry-sp*z+(m?.settle??0);out.z=sp*ry+cp*z;return out;
}

// Deaths buckle, lose the support-hand grip and settle on the ground. The root
// pose persists until respawn, instead of rolling upright and vanishing at .5s.
export function operatorDeathPose(actor,time,out={}){
 const age=actor.dead?Math.max(0,actor.lastDamage>=0&&actor.lastDamage<=time?time-actor.lastDamage:3-(actor.respawnLeft??3)):0;
 const fall=poseBlend(.07,.76,age),settle=poseBlend(.55,.94,age),side=actor.id%2?1:-1;
 out.age=age;out.pitch=fall*1.40+settle*.065;out.roll=side*(fall*.32+Math.sin(fall*Math.PI)*.12);
 out.y=fall*.21-settle*.018;out.z=fall*.17;return out;
}

// Each foot has a flat contact interval and an eased recovery arc. Its contact
// travel is tied to the same distance-driven phase as the actor's translation.
export function operatorFootCycle(phase,stance,out={}){
 const cycle=((phase%TAU)+TAU)%TAU/TAU;
 if(cycle<stance){const t=cycle/stance;out.travel=1-2*t;out.lift=0;out.pitch=.085*(1-t)-.14*t*t;out.contact=true;}
 else{const t=(cycle-stance)/(1-stance),ease=t*t*(3-2*t);out.travel=-1+2*ease;out.lift=Math.sin(t*Math.PI)**2;out.pitch=-.14*(1-ease)+.085*ease;out.contact=false;}
 return out;
}

export function poseSegment(q,ax,ay,az,bx,by,bz){
 const x=ax-bx,y=ay-by,z=az-bz,l=Math.hypot(x,y,z)||1;
 q.x=(ax+bx)/2;q.y=(ay+by)/2;q.z=(az+bz)/2;q.h=l;q.yaw=0;q.roll=-Math.asin(clamp(x/l,-1,1));q.pitch=Math.atan2(z,y);
}

// Two-bone leg IK follows velocity in the operator's local frame. Backpedalling
// reverses the stride, strafing moves feet sideways, and flight tucks the boots.
// Every pose reuses rig objects and remains independent of collision and aim.
export function poseLegs(actor,duck){
 const parts=actor.renderParts,base=actor.renderBase;
 const weight=Math.min(1,(actor.animSpeed??0)/3),ground=actor.operatorMotion?.ground??(actor.grounded===false?0:1);
 const m=actor.operatorMotion,c=Math.cos(actor.yaw),s=Math.sin(actor.yaw),side=m?.side??c*actor.vx+s*actor.vz,forward=m?.forward??s*actor.vx-c*actor.vz;
 // Filtered direction shrinks through zero during a reversal. Normalising by
 // blended travel speed prevents its sign from snapping a foot across the body.
 const speed=Math.max(Math.hypot(side,forward),actor.animSpeed??0)||1;
 const tuck=(1-ground)*clamp(.085+(actor.vy??0)*.007,.035,.135);
 for(let leg=0;leg<2;leg++){
  const phase=(actor.stride??0)+leg*Math.PI,cycle=operatorFootCycle(phase,m?.stance??.43,m?.foot??(m?m.foot={}:{})),swing=cycle.lift;
  const foot=parts[4+leg],hipX=base[leg].x+(m?.torsoRoll??0)*.075,hipY=.775-duck*.8+(m?.settle??0);
  const reach=(m?.cycleDistance??1.7)*(m?.stance??.43)/2,stride=cycle.travel*reach*weight*ground;
  foot.x=base[4+leg].x+stride*side/speed;
  foot.z=base[4+leg].z-stride*forward/speed+tuck*.35;
  foot.y=base[4+leg].y+swing*(.10+.055*(m?.run??0))*weight*ground+tuck;
  foot.pitch=cycle.pitch*weight*ground*clamp(Math.abs(forward)/speed,0,1);
  if(actor.dead){foot.x+=(leg?1:-1)*.07*poseBlend(.10,.48,m?.death.age??0);foot.z+=(leg?.04:-.06)*poseBlend(.10,.48,m?.death.age??0);}
  const ankleY=foot.y+.04,ankleZ=foot.z+.035;
  const dx=foot.x-hipX,dy=ankleY-hipY,dz=ankleZ,rawLength=Math.hypot(dx,dy,dz)||1,len=Math.min(.749,Math.max(.06,rawLength));
  const along=(.41*.41-.34*.34+len*len)/(2*len),bend=Math.sqrt(Math.max(0,.41*.41-along*along));
  const ux=dx/rawLength,uy=dy/rawLength,uz=dz/rawLength;
  const bx=ux*uz,by=uy*uz,bz=-1+uz*uz,n=Math.hypot(bx,by,bz)||1;
  const kneeX=hipX+ux*along+bx/n*bend,kneeY=hipY+uy*along+by/n*bend,kneeZ=uz*along+bz/n*bend;
  const thigh=parts[leg],shin=parts[2+leg];
  poseSegment(thigh,hipX,hipY,0,kneeX,kneeY,kneeZ);
  poseSegment(shin,kneeX,kneeY,kneeZ,foot.x,ankleY,ankleZ);
  const pad=parts[26+leg];if(pad){pad.x=kneeX;pad.y=kneeY;pad.z=kneeZ-.10;pad.pitch=thigh.pitch*.5;pad.roll=thigh.roll*.5;}
 }
}
