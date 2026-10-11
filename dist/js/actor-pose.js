import {clamp} from './math.js?v=61';

export function poseSegment(q,ax,ay,az,bx,by,bz){
 const x=ax-bx,y=ay-by,z=az-bz,l=Math.hypot(x,y,z)||1;
 q.x=(ax+bx)/2;q.y=(ay+by)/2;q.z=(az+bz)/2;q.h=l;q.yaw=0;q.roll=-Math.asin(clamp(x/l,-1,1));q.pitch=Math.atan2(z,y);
}

// Two-bone leg IK follows velocity in the operator's local frame. Backpedalling
// reverses the stride, strafing moves feet sideways, and flight tucks the boots.
// Every pose reuses rig objects and remains independent of collision and aim.
export function poseLegs(actor,duck){
 const parts=actor.renderParts,base=actor.renderBase;
 const weight=Math.min(1,(actor.animSpeed??0)/3),ground=actor.grounded===false?0:1;
 const c=Math.cos(actor.yaw),s=Math.sin(actor.yaw),side=c*actor.vx+s*actor.vz,forward=s*actor.vx-c*actor.vz,speed=Math.hypot(side,forward)||1;
 const tuck=ground?0:clamp(.085+(actor.vy??0)*.007,.035,.135);
 for(let leg=0;leg<2;leg++){
  const phase=(actor.stride??0)+leg*Math.PI,swing=Math.max(0,Math.sin(phase));
  const foot=parts[4+leg],hipX=base[leg].x,hipY=.775-duck*.8,stride=Math.cos(phase)*weight*ground;
  foot.x=base[4+leg].x+stride*.16*side/speed;
  foot.z=base[4+leg].z-stride*.23*forward/speed+tuck*.35;
  foot.y=base[4+leg].y+swing*.105*weight*ground+tuck;
  foot.pitch=-swing*.15*weight*ground;
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
