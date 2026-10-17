import {weaponModel,muzzlePosition,animateWeaponParts} from './weapon-models.js?v=75';
import {clamp} from './math.js?v=75';
import {poseSegment,transformOperatorPose} from './actor-pose.js?v=75';

const templates=new Map(),MAX_TEMPLATES=32;
const HAND_PITCH=.1,HAND_PITCH_COS=Math.cos(HAND_PITCH),HAND_PITCH_SIN=Math.sin(HAND_PITCH);
function template(w){
 const key=`${w.def.id}/${w.optic}/${w.barrel}/${w.grip}/${w.magazine}/${w.ammunition}`;
 if(templates.has(key))return templates.get(key);
 const model=weaponModel(w),volume=p=>p.w*p.h*p.d,minVolume=w.def.kind==='MELEE'?.000005:.00008;
 const sourceIndices=[];
 for(let i=0;i<model.length;i++){const p=model[i];if(!p.hidden&&!/hand/i.test(p.tag??'')&&p.surface!=='glass'&&volume(p)>minVolume)sourceIndices.push(i);}
 sourceIndices.sort((a,b)=>volume(model[b])-volume(model[a]));sourceIndices.length=Math.min(sourceIndices.length,24);
 const grip=model.find(p=>p.tag==='rightHand'),support=model.find(p=>p.tag==='supportHand'||p.tag==='pumpHand');
 const magazine=model.filter(p=>p.tag==='magazine').sort((a,b)=>volume(b)-volume(a))[0];
 // A small pistol magazine still needs a visible exchange at reduced detail.
 // Each retained source slot displays either role, never another draw part.
 const magazineIndex=model.reloadRig.pistolMagazine>=0?model.reloadRig.pistolMagazine:model.indexOf(magazine);
 if(magazineIndex>=0&&!sourceIndices.includes(magazineIndex)){if(sourceIndices.length===24)sourceIndices[23]=magazineIndex;else sourceIndices.push(magazineIndex);}
 const pieces=sourceIndices.map(i=>model[i]);
 const result={key,pieces,sourceIndices,grip:grip??{x:.027,y:-.112,z:.1},support:support??grip};
 if(templates.size>=MAX_TEMPLATES)templates.delete(templates.keys().next().value);
 templates.set(key,result);return result;
}

export function addOperatorGear(parts,actor){
 const add=(x,y,z,w,h,d,surface='rubber',extra={})=>parts.push({x,y,z,w,h,d,surface,mesh:'bevel',...extra});
 // Preserve the established body rig indices; the placeholder rifle is hidden.
 for(const i of [20,21,22])parts[i].hidden=true;
 // The shaped ballistic shell owns the silhouette; the old rectangular cover
 // obscured it. Keep its rig slot for cached poses, with a compact NVG bracket.
 add(0,1.73,-.02,.27,.105,.28,'rubber',{hidden:true});
 add(0,1.70,-.159,.077,.067,.026,'steel',{actorFar:true});
 add(0,1.765,.04,.055,.015,.17,'steel');
 for(const sign of [-1,1]){
  add(sign*.168,1.585,.01,.06,.13,.095,'rubber',{mesh:'sphere'});
  add(sign*.19,1.605,.005,.018,.055,.10,'steel');
  add(sign*.24,1.34,-.035,.135,.145,.17,'fabric',{mesh:'sphere',roll:sign*.18,operatorNeutral:true,actorFar:actor.role===4});
  add(sign*.25,1.34,-.129,.07,.027,.016,'white',{actorFar:true});
  add(sign*.135,1.37,-.177,.053,.065,.045,'fabric');
 }
 add(0,1.31,-.213,.265,.03,.022,'rubber');
 add(0,1.19,-.223,.095,.062,.033,'steel');
 add(-.185,1.35,-.21,.065,.09,.055,'rubber');
 add(-.18,1.443,-.203,.012,.095,.012,'steel',{mesh:'cylinder'});
 add(.21,.86,.025,.084,.21,.14,'rubber',{roll:-.12});
 if(actor.role===4){
  add(0,1.14,.245,.34,.39,.22,'fabric',{actorFar:true});
  add(.21,1.11,-.17,.11,.17,.085,'rubber');
 }else if(actor.role===3){
  add(0,1.10,.21,.24,.31,.14,'fabric');
  add(-.15,.89,-.19,.065,.17,.04,'rubber');
 }else add(0,.84,-.17,.22,.07,.045,'rubber');
}

function arm(parts,upperIndex,foreIndex,handIndex,side,target,duck){
 const sx=side*.25,sy=1.36-duck,sz=-.02,dx=target.x-sx,dy=target.y-sy,dz=target.z-sz,raw=Math.hypot(dx,dy,dz)||1,length=clamp(raw,.035,.649);
 const ux=dx/raw,uy=dy/raw,uz=dz/raw,along=(.32*.32-.34*.34+length*length)/(2*length),bend=Math.sqrt(Math.max(0,.32*.32-along*along));
 let bx=side,by=-.65,bz=.12;const dot=bx*ux+by*uy+bz*uz;bx-=ux*dot;by-=uy*dot;bz-=uz*dot;const n=Math.hypot(bx,by,bz)||1;
 const ex=sx+ux*along+bx/n*bend,ey=sy+uy*along+by/n*bend,ez=sz+uz*along+bz/n*bend,wx=sx+ux*length,wy=sy+uy*length,wz=sz+uz*length;
 poseSegment(parts[upperIndex],sx,sy,sz,ex,ey,ez);poseSegment(parts[foreIndex],ex,ey,ez,wx,wy,wz);
 const hand=parts[handIndex];hand.x=wx;hand.y=wy;hand.z=wz;hand.yaw=target.yaw??0;hand.pitch=target.pitch??HAND_PITCH;hand.roll=target.roll??side*.2;
}
function reloadWrist(out,pitch,contact){
 const weight=contact.weight;
 out.yaw=0;out.pitch=HAND_PITCH;out.roll=-.2;
 if(!weight)return;
 // Compose in the same weapon-local frame as the shared hand contact:
 // mount pitch, contact roll, then the operator glove's neutral orientation.
 // Reach eases both rotations back to the exact held pose on cancellation or
 // release. Adding Euler angles would roll around the wrong axis while aimed.
 const c=Math.cos(pitch*weight),s=Math.sin(pitch*weight),cr=Math.cos(contact.roll*weight),sr=Math.sin(contact.roll*weight);
 out.pitch=Math.asin(clamp(c*cr*HAND_PITCH_SIN+s*HAND_PITCH_COS,-1,1));
 out.yaw=Math.atan2(sr*HAND_PITCH_SIN,-s*cr*HAND_PITCH_SIN+c*HAND_PITCH_COS);
 out.roll=Math.atan2(c*sr,c*cr*HAND_PITCH_COS-s*HAND_PITCH_SIN)-.2;
}
function mount(out,p,c,s,y,recoil){
 out.x=.075+p.x;out.y=y+p.y*c-p.z*s;out.z=-.23+p.y*s+p.z*c+recoil;return out;
}
function mountPart(out,p,c,s,y,recoil,pitch){
 mount(out,p,c,s,y,recoil);
 out.hidden=!!p.hidden;
 // The common zero-yaw case composes directly. Other pieces need the full
 // rotation to retain their animated roll/yaw under the mounting pitch.
 if(!p.yaw){out.yaw=0;out.pitch=pitch+(p.pitch??0);out.roll=p.roll??0;return;}
 const cy=Math.cos(p.yaw??0),sy=Math.sin(p.yaw??0),cp=Math.cos(p.pitch??0),sp=Math.sin(p.pitch??0),cr=Math.cos(p.roll??0),sr=Math.sin(p.roll??0);
 const r12=-c*sp-s*cy*cp;
 out.pitch=Math.asin(clamp(-r12,-1,1));
 if(Math.abs(r12)<.9999999){
  out.yaw=Math.atan2(sy*cp,-s*sp+c*cy*cp);
  out.roll=Math.atan2(c*cp*sr-s*(-sy*cr+cy*sp*sr),c*cp*cr-s*(sy*sr+cy*sp*cr));
 }else{out.yaw=Math.atan2(-s*cp*sr-c*(-sy*cr+cy*sp*sr),cy*cr+sy*sp*sr);out.roll=0;}
}
export function operatorWeaponMount(actor,out={}){
 const w=actor.weapon,duck=actor.animDuck??(actor.crouched?.5:0);
 out.pitch=clamp(actor.pitch??0,-.65,.65)+Math.exp(-w.sinceShot*20)*.025;
 out.x=.075;out.y=1.30-duck;out.yaw=0;out.roll=0;
 out.z=-.23+Math.exp(-w.sinceShot*22)*.027;return transformOperatorPose(actor,out);
}
export function nativeOperatorWeapon(actor,assets,time){
 const key=actor.carriedTemplate.key,parts=actor.carriedModel;
 if(actor.nativeWeaponKey!==key||actor.nativeWeaponLibrary!==assets||actor.nativeWeaponParts!==parts){
  actor.nativeWeaponKey=key;actor.nativeWeaponLibrary=assets;
  actor.nativeWeaponParts=parts;
  actor.nativeWeaponGroups=assets.weaponGroups(parts,actor.weapon.def.id);
  // The authored cores keep their exact original local joint matrices. Optics,
  // muzzle devices and attachments remain under the same mounting transform.
  actor.nativeWeaponAccessories=parts.slice(parts.coreCount).filter(p=>!p.reloadNativeCore&&!/^(rightHand|supportHand|pumpHand)$/.test(p.tag??''));
  for(const q of [...actor.nativeWeaponGroups,...actor.nativeWeaponAccessories])q.operatorWeapon=true;
 }
 for(const group of actor.nativeWeaponGroups){
  const anchor=actor.nativeWeaponParts[group.anchor];
  group.x=anchor.x;group.y=anchor.y;group.z=anchor.z;group.w=anchor.w;group.h=anchor.h;group.d=anchor.d;
  group.yaw=anchor.yaw;group.pitch=anchor.pitch;group.roll=anchor.roll;group.hidden=anchor.hidden;
 }
 return actor.nativeWeaponGroups;
}
export function poseOperator(actor,duck){
 const w=actor.weapon;
 if(actor.carriedWeapon!==w||actor.carriedOptic!==w.optic||actor.carriedBarrel!==w.barrel||actor.carriedGrip!==w.grip||actor.carriedMagazine!==w.magazine||actor.carriedAmmunition!==w.ammunition){
  const t=template(w);actor.carriedTemplate=t;actor.carriedWeapon=w;actor.carriedOptic=w.optic;actor.carriedBarrel=w.barrel;actor.carriedGrip=w.grip;actor.carriedMagazine=w.magazine;actor.carriedAmmunition=w.ammunition;
  if(actor.carriedKey!==t.key||!actor.carriedModel){
   actor.carriedKey=t.key;actor.carriedModel=weaponModel(w,{reloadExchange:true});actor.renderParts.length=actor.operatorBodyCount;actor.renderBase.length=actor.operatorBodyCount;
   for(const [i,p]of t.pieces.entries()){
    const source=t.sourceIndices[i],q={...p,carried:true,carriedSourceIndex:source,carriedReplacementIndex:actor.carriedModel.reloadExchange?.sourceToReplacement.get(source),actorFar:i<5,finishTile:undefined,tile:-1,rough:p.metal>.4?.4:.8,metal:p.metal>.4?.7:0};
    actor.renderParts.push(q);actor.renderBase.push({...q});
   }
  }
 }
 const t=actor.carriedTemplate,pose=actor.operatorPose??(actor.operatorPose={right:{},left:{}});
 const model=actor.carriedModel;animateWeaponParts(model,w,actor,actor.animTime);
 const pitch=clamp(actor.pitch??0,-.65,.65)+Math.exp(-w.sinceShot*20)*.025,c=Math.cos(pitch),s=Math.sin(pitch);
 const recoil=Math.exp(-w.sinceShot*22)*.027,mountY=1.30-duck;
 for(let i=actor.operatorBodyCount;i<actor.renderParts.length;i++){
  const q=actor.renderParts[i],base=actor.renderBase[i];let source=model[base.carriedSourceIndex];
  if(source.hidden&&base.carriedReplacementIndex!==undefined)source=model[base.carriedReplacementIndex];
  mountPart(q,source,c,s,mountY,recoil,pitch);
 }
 mount(pose.right,t.grip,c,s,mountY,recoil);mount(pose.left,t.support??t.grip,c,s,mountY,recoil);
 const contact=model.reloadRig.contact;
 reloadWrist(pose.left,pitch,contact);
 if(contact.weight>0){
  const target=pose.reloadTarget??(pose.reloadTarget={});mount(target,contact,c,s,mountY,recoil);
  pose.left.x+=(target.x-pose.left.x)*contact.weight;pose.left.y+=(target.y-pose.left.y)*contact.weight;pose.left.z+=(target.z-pose.left.z)*contact.weight;
 }
 arm(actor.renderParts,15,17,19,1,pose.right,duck);arm(actor.renderParts,14,16,18,-1,pose.left,duck);
}

export function operatorMuzzle(actor,weapon=actor.weapon){
 const m=muzzlePosition(weapon),pitch=clamp(actor.pitch??0,-.65,.65)+Math.exp(-actor.weapon.sinceShot*20)*.025,cp=Math.cos(pitch),sp=Math.sin(pitch),c=Math.cos(actor.yaw),s=Math.sin(actor.yaw);
 const point=actor.operatorMuzzlePose??(actor.operatorMuzzlePose={});
 point.x=.075+m.x;point.y=1.30-(actor.operatorMotion?actor.animDuck:(actor.crouched?.5:0))+m.y*cp-m.z*sp;
 point.z=-.23+m.y*sp+m.z*cp+Math.exp(-actor.weapon.sinceShot*22)*.027;
 point.yaw=point.pitch=point.roll=0;transformOperatorPose(actor,point);
 return{x:actor.x+c*point.x-s*point.z,y:actor.y+point.y,z:actor.z+s*point.x+c*point.z};
}
