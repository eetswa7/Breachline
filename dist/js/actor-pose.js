import {clamp} from './math.js?v=71';

const TAU=Math.PI*2;
const HEAD_PARTS=[10,11,12,13,30,31,32,33,34,38,39];
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
const approach=(v,target,rate,dt)=>v+(target-v)*(1-Math.exp(-rate*dt));

export function poseSegment(q,ax,ay,az,bx,by,bz){
 const x=ax-bx,y=ay-by,z=az-bz,l=Math.hypot(x,y,z)||1;
 q.x=(ax+bx)/2;q.y=(ay+by)/2;q.z=(az+bz)/2;q.h=l;q.yaw=0;q.roll=-Math.asin(clamp(x/l,-1,1));q.pitch=Math.atan2(z,y);
}

// These are presentation states, never simulation velocities or collision data.
// Reused state/matrices keep both native and fallback equipment on the same rig.
export function actorDeathProgress(actor,time=actor.operatorMotion?.time){
 if(!actor.dead)return 0;
 const elapsed=actor.lastDamage>=0&&Number.isFinite(time)?Math.max(0,time-actor.lastDamage):3-actor.respawnLeft;
 return clamp(elapsed*2,0,1);
}
export function updateActorMotion(actor,time){
 const speed=Math.hypot(actor.vx,actor.vz),old=actor.operatorMotion;
 const cy=Math.cos(actor.yaw),sy=Math.sin(actor.yaw),localSide=cy*actor.vx+sy*actor.vz,localForward=sy*actor.vx-cy*actor.vz;
 const reset=!old||time<old.time||old.dead&&!actor.dead||Math.hypot(actor.x-old.x,actor.z-old.z)>4;
 const m=actor.operatorMotion??(actor.operatorMotion={matrix:new Float64Array(9)});
 const dt=reset?0:clamp(time-m.time,0,.05);
 if(reset){
  m.side=localSide;m.forward=localForward;m.run=0;m.aimPitch=actor.pitch??0;m.landing=0;m.hitAge=1;m.hitAmplitude=0;
  m.hitValue=actor.hitReact??0;m.grounded=actor.grounded!==false;m.wasVy=actor.vy??0;
  actor.animSpeed=speed;actor.animDuck=actor.crouched?.5:0;
 }
 m.side=approach(m.side,localSide,18,dt);m.forward=approach(m.forward,localForward,18,dt);
 actor.animSpeed=approach(actor.animSpeed??speed,speed,14,dt);
 actor.animDuck=approach(actor.animDuck??0,actor.crouched?.5:0,12,dt);
 m.run=approach(m.run,actor.crouched?0:smooth(2.3,5.5,actor.animSpeed),10,dt);
 m.aimPitch=approach(m.aimPitch,clamp(actor.pitch??0,-.65,.65),16,dt);
 const ground=actor.grounded!==false;
 if(ground&&!m.grounded)m.landing=Math.max(m.landing,clamp(-m.wasVy*.012,.025,.085));
 m.landing=approach(m.landing,0,11,dt);
 const hit=clamp(actor.hitReact??0,0,.16);
 if(hit>m.hitValue+.004){m.hitAge=0;m.hitAmplitude=Math.max(m.hitAmplitude*.5,hit);}
 if(hit===0)m.hitAmplitude=0;
 m.hitAge+=dt;m.hitValue=hit;
 m.hit=m.hitAmplitude*Math.exp(-m.hitAge*13)*(1+Math.sin(m.hitAge*24)*.45);
 m.grounded=ground;m.wasVy=actor.vy??0;m.dead=actor.dead;m.time=time;m.x=actor.x;m.z=actor.z;
 const duck=actor.animDuck,weight=clamp(actor.animSpeed/1.4,0,1),crouch=duck*2;
 // Running spends less time on the ground. Cadence changes with speed, rather
 // than making every cycle a sine wave with the same exaggerated high knees.
 m.stance=.64-m.run*.32;m.reach=(.30+m.run*.09)*(1-crouch*.35);
 const directionLength=Math.hypot(m.side,m.forward)||1,sideRatio=m.side/directionLength,forwardRatio=m.forward/directionLength;
 const cycleDistance=2*m.reach*Math.max(.56,Math.hypot(sideRatio*.56,forwardRatio))/m.stance;
 actor.stride=((actor.stride??actor.id??0)+(ground&&!actor.dead?actor.animSpeed*dt/cycleDistance*TAU:0))%TAU;
 const death=actorDeathProgress(actor,time),collapse=smooth(0,.9,death);
 m.death=death;m.extraDrop=m.landing+collapse*.43*(1-crouch*.58)+m.hit*.22;
 m.hipY=.775-duck*.8-m.extraDrop;
 m.hipX=Math.sin(actor.stride)*.018*weight*(1-crouch*.5)*(1-collapse);
 m.hipZ=crouch*.045+collapse*.10;
 m.bodyPitch=-m.forward/directionLength*(.035+m.run*.095)*weight-crouch*.12+m.hit*.95-smooth(.12,1,death)*.48;
 m.bodyRoll=-m.side/directionLength*.055*weight+Math.sin(actor.stride)*.016*weight+(actor.id%2?1:-1)*(m.hit*.3+smooth(.18,1,death)*.38);
 m.settle=-Math.cos(actor.stride*2)*(.010+m.run*.009)*weight*(1-crouch*.5)*(1-collapse)+Math.sin(time*2.15+(actor.id??0))*.003*(1-weight);
 actor.operatorSettle=m.settle;
 // Roll then pitch, around the hips. Store a full rotation so limb joins,
 // sewn patches and weapon hand contacts survive the combined motion exactly.
 const cp=Math.cos(m.bodyPitch),sp=Math.sin(m.bodyPitch),cr=Math.cos(m.bodyRoll),sr=Math.sin(m.bodyRoll),r=m.matrix;
 r[0]=cr;r[1]=-sr;r[2]=0;r[3]=cp*sr;r[4]=cp*cr;r[5]=-sp;r[6]=sp*sr;r[7]=sp*cr;r[8]=cp;
 m.pivotY=.82-duck;m.dx=m.hipX;m.dy=m.settle-m.extraDrop;m.dz=m.hipZ;
 return duck;
}

// Two-bone IK with a long, low stance and a shorter eased swing. Both feet can
// support a walk; a run gets brief flight and increased push-off. Foot yaw and
// lateral reach stay bounded during reverse/sideways travel and direction blends.
export function poseLegs(actor,duck){
 const parts=actor.renderParts,base=actor.renderBase,m=actor.operatorMotion;
 const weight=clamp((actor.animSpeed??0)/1.4,0,1),ground=actor.grounded===false?0:1;
 const cy=Math.cos(actor.yaw),sy=Math.sin(actor.yaw),side=m?.side??cy*actor.vx+sy*actor.vz,forward=m?.forward??sy*actor.vx-cy*actor.vz,speed=Math.hypot(side,forward)||1;
 const stance=m?.stance??.64,reach=m?.reach??.30,run=m?.run??0,crouch=duck*2;
 const tuck=ground?0:clamp(.11+(actor.vy??0)*.009,.05,.18);
 for(let leg=0;leg<2;leg++){
  const cycle=(((actor.stride??0)/TAU+leg*.5)%1+1)%1,standing=cycle<stance;
  const t=standing?cycle/stance:(cycle-stance)/(1-stance);
  const travel=standing?1-2*t:-Math.cos(t*Math.PI),lift=standing?0:Math.sin(t*Math.PI)**2;
  const foot=parts[4+leg],hipX=base[leg].x+(m?.hipX??0),hipY=m?.hipY??.775-duck*.8,hipZ=m?.hipZ??0;
  // Sideways steps cross less than forwards ones, keeping the boots clear.
  foot.x=base[4+leg].x+travel*reach*.56*side/speed*weight*ground;
  foot.z=base[4+leg].z-travel*reach*forward/speed*weight*ground+tuck*.35;
  foot.y=base[4+leg].y+lift*(.10+run*.055)*(1-crouch*.4)*weight*ground+tuck;
  const pushOff=.15+run*.10;
  const heel=standing?(1-smooth(0,.16,t))*.09-smooth(.68,1,t)*pushOff:
   -pushOff*(1-smooth(0,.30,t))+.12*Math.sin(t*Math.PI)+.09*smooth(.76,1,t);
  foot.pitch=heel*weight*ground;foot.roll=0;foot.yaw=clamp(side/speed*.16,-.16,.16)*weight;
  if(m?.death){foot.z+=(leg?-.09:.04)*smooth(0,1,m.death);foot.x+=(leg?.025:-.025)*m.death;foot.pitch*=1-m.death;}
  // Lift around the boot's heel/toe instead of rotating its lower corners
  // through the ground. Native and simplified boots share these extents.
  foot.y+=Math.sin(Math.abs(foot.pitch))*foot.d*.5+(Math.cos(foot.pitch)-1)*foot.h*.5;
  const ankleY=foot.y+.04,ankleZ=foot.z+.035,dx=foot.x-hipX,dy=ankleY-hipY,dz=ankleZ-hipZ,rawLength=Math.hypot(dx,dy,dz)||1,len=clamp(rawLength,.06,.749);
  const along=(.41*.41-.34*.34+len*len)/(2*len),bend=Math.sqrt(Math.max(0,.41*.41-along*along));
  const ux=dx/rawLength,uy=dy/rawLength,uz=dz/rawLength,bx=ux*uz,by=uy*uz,bz=-1+uz*uz,n=Math.hypot(bx,by,bz)||1;
  const kneeX=hipX+ux*along+bx/n*bend,kneeY=hipY+uy*along+by/n*bend,kneeZ=hipZ+uz*along+bz/n*bend;
  poseSegment(parts[leg],hipX,hipY,hipZ,kneeX,kneeY,kneeZ);poseSegment(parts[2+leg],kneeX,kneeY,kneeZ,foot.x,ankleY,ankleZ);
  const pad=parts[26+leg];if(pad){pad.x=kneeX;pad.y=kneeY;pad.z=kneeZ-.10;pad.pitch=parts[leg].pitch*.5;pad.roll=parts[leg].roll*.5;}
 }
}

export function transformOperatorPose(actor,q){
 const m=actor.operatorMotion;if(!m)return q;
 const r=m.matrix,x=q.x,y=q.y-m.pivotY,z=q.z;
 q.x=r[0]*x+r[1]*y+r[2]*z+m.dx;q.y=r[3]*x+r[4]*y+r[5]*z+m.pivotY+m.dy;q.z=r[6]*x+r[7]*y+r[8]*z+m.dz;
 if(m.bodyPitch===0&&m.bodyRoll===0)return q;
 const cy=Math.cos(q.yaw??0),sy=Math.sin(q.yaw??0),cp=Math.cos(q.pitch??0),sp=Math.sin(q.pitch??0),cr=Math.cos(q.roll??0),sr=Math.sin(q.roll??0);
 const a02=sy*cp,a12=-sp,a22=cy*cp,a10=cp*sr,a11=cp*cr;
 const b12=r[3]*a02+r[4]*a12+r[5]*a22;
 q.pitch=Math.asin(clamp(-b12,-1,1));
 q.yaw=Math.atan2(r[0]*a02+r[1]*a12+r[2]*a22,r[6]*a02+r[7]*a12+r[8]*a22);
 const a00=cy*cr+sy*sp*sr,a01=-cy*sr+sy*sp*cr,a20=-sy*cr+cy*sp*sr,a21=sy*sr+cy*sp*cr;
 q.roll=Math.atan2(r[3]*a00+r[4]*a10+r[5]*a20,r[3]*a01+r[4]*a11+r[5]*a21);return q;
}

export function finishActorMotion(actor,duck){
 const p=actor.renderParts,m=actor.operatorMotion;if(!m)return;
 // Head equipment follows a subdued, blended aim nod around the neck. Its
 // movement is independent of the exact gun/ballistic pitch.
 const nod=m.aimPitch*.38,cp=Math.cos(nod),sp=Math.sin(nod),neckY=1.43-duck;
 for(const i of HEAD_PARTS){
  const q=p[i];if(!q)continue;const y=q.y-neckY,z=q.z;q.y=neckY+y*cp-z*sp;q.z=y*sp+z*cp;q.pitch=(q.pitch??0)+nod;
 }
 for(let i=6;i<p.length;i++)if(i!==26&&i!==27&&i!==28&&i!==29)transformOperatorPose(actor,p[i]);
 // Patches are attached after this transform by actorModel, so they inherit
 // the final sleeve orientation exactly instead of acquiring a second lean.
}
