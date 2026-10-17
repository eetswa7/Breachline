// First-person magazine exchange is a deterministic presentation of the existing
// reload phase. It owns no ammunition, event crossings, clocks or world debris.
const smooth=(a,b,value)=>{const t=Math.max(0,Math.min(1,(value-a)/(b-a)));return t*t*(3-2*t);};

export function magazineExchangeEligible(w){
 return w.def.kind!=='MELEE'&&!w.def.shellReload&&!w.def.revolver;
}
export function magazineExchangeSample(){
 return {active:false,phase:0,stage:'ready',handBlend:0,
  source:{x:0,y:0,z:0,roll:0,hidden:false},
  replacement:{x:0,y:0,z:0,roll:0,hidden:true},
  sourceHand:{x:0,y:0,z:0,roll:0}};
}
export function sampleMagazineExchange(w,phase,active,out){
 const source=out.source,replacement=out.replacement,hand=out.sourceHand;
 out.active=active;out.phase=active?Math.max(0,Math.min(1,phase)):0;out.handBlend=0;out.stage='ready';
 source.x=source.y=source.z=source.roll=0;source.hidden=false;
 replacement.x=replacement.y=replacement.z=replacement.roll=0;replacement.hidden=true;
 hand.x=hand.y=hand.z=hand.roll=0;
 if(!active)return out;
 const r=out.phase,top=w.def.id===4,covered=w.def.id===9||w.def.id===27,empty=w.reloadStartedEmpty!==false;
 const release=covered?.29:.18,extractEnd=covered?.43:.34,sourceEnd=covered?.49:.45,retrieveStart=covered?.51:.47,retrieveEnd=covered?.60:.58;
 const extract=smooth(release,extractEnd,r),depart=smooth(extractEnd,sourceEnd,r);
 const travelX=top?-.07:-.045,travelY=top?.155:covered?-.23:-.29,travelZ=top?0:.035,travelRoll=top?.16:-.22;
 source.x=travelX*extract;source.y=travelY*extract;source.z=travelZ*extract;source.roll=travelRoll*extract;
 // The released empty component departs independently. A tactical reload keeps
 // the source in the support hand as it is lowered into the stow position.
 hand.x=source.x;hand.y=source.y;hand.z=source.z;hand.roll=source.roll;
 source.x-=(empty?.16:.12)*depart;source.y-=(top?.35:empty?.27:.18)*depart;source.z+=(empty?.08:.10)*depart;
 source.roll+=(empty?(top?1.35:-1.45):-.30)*depart;source.hidden=r>=sourceEnd;
 if(!empty){hand.x=source.x;hand.y=source.y;hand.z=source.z;hand.roll=source.roll;}
 // The replacement starts beyond the opening, becomes graspable, then follows
 // the existing .64/.68 insertion and .74 seating contacts back to the joint.
 const retrieve=1-smooth(retrieveStart,retrieveEnd,r),unseated=1-smooth(retrieveEnd,.74,r);
 replacement.x=travelX*unseated-.12*retrieve;
 replacement.y=travelY*unseated-(top?.22:.16)*retrieve;
 replacement.z=travelZ*unseated+.10*retrieve;
 replacement.roll=travelRoll*unseated-.30*retrieve;replacement.hidden=r<retrieveStart;
 out.handBlend=smooth(extractEnd,retrieveStart+.035,r);
 out.stage=r<release?'reach':r<extractEnd?'extract':r<sourceEnd?(empty?'discard':'stow'):r<retrieveEnd?'retrieve':r<.74?'insert':'seat';
 return out;
}
