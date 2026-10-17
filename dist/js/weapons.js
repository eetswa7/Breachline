import {clamp,lerp} from './math.js?v=71';
import {ATTACHMENTS,attachmentIndex,attachmentProfile} from './attachments.js?v=71';
export {ATTACHMENTS} from './attachments.js?v=71';
// All distances are metres. Rates and timings drive the simulation, models and audio.
const specs=[
 ['Kestrel AR','RIFLE',29,700,30,2.2,.019,.016,42,.19,1,true,1],
 ['Bastion 7','RIFLE',39,510,24,2.55,.030,.019,50,.25,1,true,2],
 ['Raptor C','RIFLE',23,950,32,2.1,.015,.022,34,.18,1,true,3],
 ['Vesper 9','SMG',21,1150,36,1.65,.016,.028,20,.12,1,true,1],
 ['Lynx PDW','SMG',25,760,28,1.8,.012,.017,31,.14,1,true,2],
 ['Breach 12','SHOTGUN',18,68,7,.52,.065,.076,12,.23,8,false,1],
 ['Tempest S','SHOTGUN',13,188,8,2.7,.044,.09,10,.23,8,false,3],
 ['Longbow M','SNIPER',90,48,5,3,.082,.065,100,.38,1,false,2],
 ['Warden D','MARKSMAN',53,214,15,2.45,.038,.038,75,.26,1,false,1],
 ['Atlas L','LMG',31,612,80,4.5,.025,.035,55,.34,1,true,3],
 ['Sable P','PISTOL',31,316,15,1.3,.024,.027,23,.1,1,false,1],
 ['Dire 50','PISTOL',59,167,7,1.65,.061,.035,32,.15,1,false,2],
 ['Field blade','MELEE',125,92,1,0,0,0,2.2,.1,1,false,1],
 ['Harrow B3','RIFLE',30,840,27,2.3,.018,.018,48,.21,1,false,1],
 ['Marten 45','SMG',34,540,24,1.95,.024,.025,26,.15,1,true,1],
 ['Mako 7','MARKSMAN',46,390,20,2.35,.031,.032,64,.24,1,false,4],
 ['Peregrine 6','RIFLE',34,900,24,2.15,.021,.019,48,.19,1,false,2],
 ['Osprey S','SMG',18,1320,40,1.9,.013,.032,18,.11,1,true,1],
 ['Bison 12','SHOTGUN',20,75,6,.58,.069,.073,14,.24,7,false,2],
 ['Talon 338','SNIPER',100,37,6,3.35,.095,.057,120,.42,1,false,4],
 ['Rampart 556','LMG',25,860,100,4.75,.019,.036,46,.31,1,true,3],
 ['Spectre SD','SMG',27,810,30,1.85,.015,.024,30,.14,1,true,2],
 ['Krait R','PISTOL',70,145,6,2.6,.073,.033,35,.17,1,false,2],
 ['Swift 93','PISTOL',20,1050,20,1.5,.019,.033,19,.1,1,true,1],
 ['Storm 68','RIFLE',36,610,25,2.4,.026,.020,54,.22,1,true,2],
 ['Needle 57','SMG',19,980,50,2.65,.011,.025,28,.14,1,true,2],
 ['Jackal 12','SHOTGUN',15,240,10,2.85,.052,.078,13,.24,8,false,3],
 ['Sentinel 762','LMG',38,540,60,4.1,.032,.030,65,.35,1,true,3],
 ['Heron S','MARKSMAN',48,300,12,2.15,.029,.027,82,.23,1,false,2],
 ['Paladin 45','PISTOL',37,285,12,1.4,.029,.025,27,.11,1,false,1]
];
export const WEAPONS=specs.map((s,id)=>{const[name,kind,damage,rpm,magazine,reload,recoil,spread,range,ads,pellets,automatic,unlock]=s;return{id,name,kind,damage,rpm,magazine,reload,recoil,spread,range,ads,pellets,automatic,unlock,burst:id===13?3:id===16?2:0,shellReload:id===5||id===18,integralSuppressor:id===21,revolver:id===22,interval:60/rpm};});
export const PRIMARY_IDS=WEAPONS.filter(w=>!['PISTOL','MELEE'].includes(w.kind)).map(w=>w.id);
export const SECONDARY_IDS=WEAPONS.filter(w=>w.kind==='PISTOL').map(w=>w.id);
export const GUN_ORDER=[0,1,2,13,16,3,4,14,17,21,5,6,18,9,20,24,25,26,27,28,15,8,7,19,10,29,11,23,22];
export const defaultLoadout=()=>({primary:0,secondary:10,optic:1,barrel:0,handling:0,magazine:0,ammo:0,equipment:'frag'});
// Contact phases follow the component motions in animateWeaponParts. These are
// simulation crossings, not an audio timer: pause/cancellation cannot leave a
// complete recorded reload playing over a different weapon or a live shot.
export function reloadFoleyStages(w){
 const stage=(phase,cue,component)=>({phase,cue,component});
 if(w.def.kind==='MELEE')return [];
 if(w.def.shellReload)return [stage(.12,'retrieve','shell'),stage(.68,'insert','shell'),stage(.78,'seat','shell')];
 if(w.def.revolver)return [stage(.18,'open','cylinder'),stage(.28,'caseDump','cylinder'),stage(.40,'chamberLoad','cylinder'),stage(.84,'cylinderClose','cylinder')];
 const covered=w.def.id===9||w.def.id===27,component=covered?'beltBox':w.def.id===4?'topMagazine':'magazine';
 const stages=covered?[stage(.16,'coverOpen','feedCover'),stage(.31,'release',component),stage(.43,'extract',component),stage(.53,'feed','belt'),stage(.68,'insert',component),stage(.74,'seat',component),stage(.86,'coverClose','feedCover')]:[stage(.18,'release',component),stage(.34,'extract',component),stage(.52,'handling',component),stage(.64,'insert',component),stage(.74,'seat',component)];
 if(w.reloadStartedEmpty){if(w.def.kind==='PISTOL')stages.push(stage(.94,'close','slide'));else stages.push(stage(.84,'open','bolt'),stage(.94,'close','bolt'));}
 return stages.sort((a,b)=>a.phase-b.phase);
}
export function sanitizeLoadout(v={}){if(!v||typeof v!=='object')v={};const d=defaultLoadout();for(const k of ['primary','secondary'])if(Number.isFinite(v[k]))d[k]=Math.round(v[k]);d.primary=PRIMARY_IDS.includes(d.primary)?d.primary:clamp(d.primary,0,9);d.secondary=SECONDARY_IDS.includes(d.secondary)?d.secondary:clamp(d.secondary,10,11);for(const key of Object.keys(ATTACHMENTS))d[key]=attachmentIndex(key,v[key]??d[key],WEAPONS[d.primary].kind);d.equipment=['frag','smoke','flash'].includes(v.equipment)?v.equipment:'frag';return d;}
export class Weapon {
 constructor(id,loadout={}){this.def=WEAPONS[Number.isFinite(id)?clamp(Math.floor(id),0,WEAPONS.length-1):0];const selection={};for(const key of Object.keys(ATTACHMENTS))selection[key]=attachmentIndex(key,loadout[key]??(key==='optic'&&this.def.kind==='SNIPER'?3:0),this.def.kind);if(this.def.integralSuppressor)selection.barrel=1;this.optic=selection.optic;this.barrel=selection.barrel;this.grip=selection.handling;this.magazine=selection.magazine;this.ammunition=selection.ammo;this.attachments=selection;this.modifiers=attachmentProfile(selection,this.def.kind);this.ammo=this.capacity;this.reserve=this.capacity*5;this.cooldown=0;this.burstRemaining=0;this.reloadLeft=0;this.reloadStartedEmpty=false;this.reloadFoley=[];this.reloadFoleyIndex=0;this.reloadCycle=0;this.spentCases=0;this.sinceShot=10;this.shotIndex=0;this.shotSerial=0;this.inspectLeft=0;}
 get capacity(){return Math.max(1,Math.round(this.def.magazine*this.modifiers.capacity));}
 get recoil(){const climb=this.def.automatic?lerp(.92,1.12,clamp(this.shotIndex/9,0,1)):1;return this.def.recoil*climb*this.modifiers.recoil;}
 recoilFor(ads,crouched,stationary){return this.recoil*lerp(1,.65,ads)*(crouched?.78:1)*(crouched&&stationary?this.modifiers.bracedRecoil:1);}
 get horizontalRecoil(){return this.modifiers.horizontal;}
 get mobility(){return this.modifiers.mobility;}
 get suppressed(){return this.barrel===1;}
 get hearingRadius(){return 44*this.modifiers.noise;}
 get penetration(){return this.modifiers.penetration;}
 get adsTime(){return this.def.ads*this.modifiers.ads;}
 get reloadTime(){const empty=this.reloadStartedEmpty&&!this.def.shellReload&&!this.def.revolver?(this.def.kind==='LMG'?.38:this.def.kind==='SNIPER'?.28:.18):0;return (this.def.reload+empty)*this.modifiers.reload;}
 get range(){return this.def.range*this.modifiers.range;}
 get inspectTime(){return this.def.kind==='PISTOL'||this.def.kind==='MELEE'?2.6:this.def.kind==='LMG'?3.4:3;}
 inspect(){if(this.inspectLeft>0||this.reloadLeft>0||this.cooldown>0||this.burstRemaining>0)return false;this.inspectLeft=this.inspectTime;return true;}
 cancelInspection(){this.inspectLeft=0;}
 reload(){if(this.reloadLeft>0||this.ammo>=this.capacity||this.reserve<=0||this.def.id===12)return false;this.cancelInspection();this.burstRemaining=0;this.reloadStartedEmpty=this.ammo===0;this.reloadLeft=this.reloadTime;this.reloadFoley=reloadFoleyStages(this);this.reloadFoleyIndex=0;this.reloadCycle=0;return true;}
 update(dt,onFoley){this.cooldown=Math.max(0,this.cooldown-dt);this.inspectLeft=Math.max(0,this.inspectLeft-dt);this.sinceShot+=dt;if(this.sinceShot>.4)this.shotIndex=0;if(this.reloadLeft<=0)return false;this.reloadLeft-=dt;
  const phase=clamp(1-this.reloadLeft/this.reloadTime,0,1);
  while(this.reloadFoleyIndex<this.reloadFoley.length&&this.reloadFoley[this.reloadFoleyIndex].phase<=phase){const stage=this.reloadFoley[this.reloadFoleyIndex++],count=stage.cue==='caseDump'?this.spentCases:undefined;if(stage.cue==='caseDump')this.spentCases=0;onFoley?.({...stage,weapon:this.def.id,magazine:this.magazine,handling:this.grip,cycle:this.reloadCycle,empty:this.reloadStartedEmpty,...(count===undefined?{}:{count})});}
  if(this.reloadLeft>0)return false;const n=Math.min(this.def.shellReload?1:this.capacity-this.ammo,this.reserve);this.ammo+=n;this.reserve-=n;this.reloadLeft=this.def.shellReload&&this.ammo<this.capacity&&this.reserve>0?this.reloadTime:0;if(this.reloadLeft>0){this.reloadFoleyIndex=0;this.reloadCycle++;}return true;}
 damage(d,part='body'){return this.def.damage*this.modifiers.damage*lerp(1,.48,clamp((d-this.range)/(this.range*1.1),0,1))*(part==='head'?(this.def.kind==='SNIPER'?2:1.9)*this.modifiers.head:part==='leg'?.75:1);}
 spread(ads,moving,crouched){return this.def.spread*lerp(1,this.def.kind==='SNIPER'?.003:.16,ads)*lerp(this.modifiers.hip,this.modifiers.aim,ads)*(moving?1.45*this.modifiers.moving:1)*(crouched?.72:1)*(crouched&&!moving?this.modifiers.bracedSpread:1)*(this.sinceShot>.35&&!moving?.45:1)*(this.def.automatic?1+clamp((this.shotIndex-2)/12,0,.38):1);}
 reset(){this.burstRemaining=0;this.ammo=this.capacity;this.reserve=this.capacity*5;this.reloadLeft=0;this.reloadStartedEmpty=false;this.reloadFoley=[];this.reloadFoleyIndex=0;this.reloadCycle=0;this.spentCases=0;this.cooldown=0;this.shotIndex=0;this.shotSerial=0;this.inspectLeft=0;this.sinceShot=10;}
}
