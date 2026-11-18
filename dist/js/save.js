import {sanitizeLoadout,defaultLoadout,WEAPONS} from './weapons.js?v=106';
import {MODES} from './modes.js?v=106';
import {raidInsertion,RAID_STASH_LIMIT,restoreRaidWeapon,raidWeaponRecord} from './raid.js?v=106';
import {MAPS} from './maps.js?v=106';
import {restoreOperation,finishOperationBattle} from './operation.js?v=106';
export const MATCH_HISTORY_LIMIT=12;
const count=(value,max=1000000)=>Number.isFinite(value)?Math.max(0,Math.min(max,Math.floor(value))):0;
export function matchRecord(result,completedAt=Date.now()){
 if(!result||!MODES.some(m=>m.id===result.mode)||!Number.isInteger(result.map)||!MAPS[result.map])return null;
 return {mode:result.mode,map:result.map,difficulty:['recruit','regular','veteran'].includes(result.difficulty)?result.difficulty:'regular',completedAt:Number.isFinite(completedAt)&&completedAt>0?Math.min(completedAt,8640000000000000):null,outcome:result.draw?'draw':result.win?'win':'loss',overtime:result.overtime===true,night:result.night===true,kills:count(result.kills),assists:count(result.assists),waves:count(result.waves,6),salvage:count(result.salvage,800),raidPayout:count(result.raidPayout??result.salvage,1600),raidPlan:raidInsertion(result.raidPlan)?.id??null,deaths:count(result.deaths),headshots:count(result.headshots),accuracy:count(result.accuracy,100),xp:count(result.xp),objectiveXP:count(result.xpBreakdown?.objective??result.objectiveXP),streak:count(result.streak),time:count(result.time,86400)};
}
export function matchSetup(value) {
 return {
  map:Number.isInteger(value?.map)&&MAPS[value.map]?value.map:14,
  night:value?.night===true,
  mode:MODES.some(mode=>mode.id===value?.mode)?value.mode:'tdm',
  difficulty:['recruit','regular','veteran'].includes(value?.difficulty)?value.difficulty:'regular'
 };
}
export const LOADOUT_SLOTS=3;
const KEY='breachline-save-v1';
export const DEFAULT_SETTINGS={controllerSensitivity:1,controllerADSSensitivity:.55,controllerDeadzone:.14,controllerInvertY:false,controlProfile:'simple',aimFire:true,aimAssist:true,autoReload:true,quality:'auto',frameRate:60,fov:80,sensitivity:.85,adsSensitivity:.6,aimAcceleration:false,adsMode:'toggle',autoSprint:true,leftHanded:false,gyro:false,gyroSensitivity:1,motion:true,volume:.75,ambience:.65,music:.22,haptics:true,opacity:.7,buttonScale:1,layout:{}};
export class SaveStore {
 constructor(storage){this.error=false;if(arguments.length===0){try{storage=globalThis.localStorage;}catch{this.error=true;}}this.storage=storage;this.data={version:1,controlRevision:2,xp:0,matches:0,wins:0,kills:0,deaths:0,bestStreak:0,weaponXP:{},matchHistory:[],raidWallet:0,raidStash:[],raidStashSerial:0,operation:null,matchSetup:matchSetup(),unlockAll:false,loadout:defaultLoadout(),activeLoadout:0,loadouts:Array.from({length:LOADOUT_SLOTS},defaultLoadout),settings:{...DEFAULT_SETTINGS,layout:{}}};
  try{const d=JSON.parse(storage?.getItem(KEY)||'null');if(d&&d.version===1){for(const k of ['xp','matches','wins','kills','deaths','bestStreak'])if(Number.isFinite(d[k]))this.data[k]=Math.max(0,d[k]);this.data.unlockAll=d.unlockAll===true;this.data.weaponXP=d.weaponXP&&typeof d.weaponXP==='object'?d.weaponXP:{};this.data.matchHistory=Array.isArray(d.matchHistory)?d.matchHistory.slice(0,MATCH_HISTORY_LIMIT).map(r=>r&&['win','draw','loss'].includes(r.outcome)?matchRecord({...r,win:r.outcome==='win',draw:r.outcome==='draw'},r.completedAt??null):null).filter(Boolean):[];this.data.raidWallet=d.raidWallet===undefined?this.data.matchHistory.reduce((sum,match)=>sum+(match.mode==='raid'&&match.outcome==='win'?match.raidPayout:0),0):count(d.raidWallet);
  for(const entry of Array.isArray(d.raidStash)?d.raidStash.slice(0,RAID_STASH_LIMIT):[]){
   const weapon=restoreRaidWeapon(entry);
   if(!weapon||!Number.isSafeInteger(entry.id)||entry.id<=0||this.data.raidStash.some(item=>item.id===entry.id))continue;
   this.data.raidStash.push({...raidWeaponRecord(weapon),id:entry.id});
  }
  this.data.raidStashSerial=Math.max(count(d.raidStashSerial,Number.MAX_SAFE_INTEGER-100),...this.data.raidStash.map(item=>item.id));
  this.data.operation=restoreOperation(d.operation);this.data.matchSetup=matchSetup(d.matchSetup);this.restoreLoadouts(d);this.data.settings={...DEFAULT_SETTINGS,...d.settings};if(!d.controlRevision){this.data.settings.controlProfile='simple';this.data.settings.layout={};this.data.settings.autoSprint=true;this.data.settings.aimFire=true;}this.sanitize();}}catch{this.error=true;}
 }
 restoreLoadouts(saved){
  const index=saved.activeLoadout;
  this.data.activeLoadout=Number.isInteger(index)&&index>=0&&index<LOADOUT_SLOTS?index:0;
  this.data.loadouts=Array.from({length:LOADOUT_SLOTS},(_,slot)=>
   sanitizeLoadout(Array.isArray(saved.loadouts)?saved.loadouts[slot]:undefined));
  this.data.loadout=sanitizeLoadout(saved.loadout??this.data.loadouts[this.data.activeLoadout]);
  this.data.loadouts[this.data.activeLoadout]={...this.data.loadout};
 }
 selectLoadout(index){
  const data=this.data;
  if(!Number.isInteger(index)||index<0||index>=LOADOUT_SLOTS||index===data.activeLoadout)return false;
  data.loadouts[data.activeLoadout]=sanitizeLoadout(data.loadout);
  const kit=sanitizeLoadout(data.loadouts[index]),defaults=defaultLoadout();
  for(const key of ['primary','secondary'])if(!this.unlocked(WEAPONS[kit[key]]))kit[key]=defaults[key];
  data.loadout=sanitizeLoadout(kit);
  data.activeLoadout=index;
  return true;
 }
 sanitize(){const s=this.data.settings;if(!['simple','advanced'].includes(s.controlProfile))s.controlProfile='simple';for(const [k,a,b]of [['controllerSensitivity',.2,2.5],['controllerADSSensitivity',.2,1.5],['controllerDeadzone',.05,.35],['fov',65,100],['sensitivity',.2,2.5],['adsSensitivity',.2,1.5],['gyroSensitivity',.2,2],['volume',0,1],['ambience',0,1],['music',0,.6],['opacity',.25,1],['buttonScale',.7,1.4]])s[k]=Number.isFinite(+s[k])?Math.max(a,Math.min(b,+s[k])):DEFAULT_SETTINGS[k];s.aimAssist=s.aimAssist!==false;s.frameRate=Number(s.frameRate)===30?30:60;if(!['auto','low','medium','high','ultra'].includes(s.quality))s.quality='auto';if(!['toggle','hold'].includes(s.adsMode))s.adsMode='toggle';if(!s.layout||typeof s.layout!=='object')s.layout={};for(const [key,pos]of Object.entries(s.layout))if(!pos||!Number.isFinite(pos.x)||!Number.isFinite(pos.y))delete s.layout[key];}
 get level(){return 1+Math.floor(Math.sqrt(this.data.xp/450));}
 get nextXP(){return this.level*this.level*450;}
 unlocked(weapon){return this.data.unlockAll||weapon.unlock<=this.level;}
 persist(){try{if(!this.storage?.setItem)throw new Error('Saving unavailable');this.data.loadouts[this.data.activeLoadout]=sanitizeLoadout(this.data.loadout);this.storage.setItem(KEY,JSON.stringify(this.data));this.error=false;return true;}catch{this.error=true;return false;}}
 payRaidInsertion(id,gearId=null){
  const plan=raidInsertion(id),gearIndex=this.data.raidStash.findIndex(item=>item.id===gearId);
  if(!plan||plan.cost>this.data.raidWallet||gearId!==null&&gearIndex<0)return false;
  if(!plan.cost&&gearIndex<0)return true;
  this.data.raidWallet-=plan.cost;
  const [gear]=gearIndex<0?[]:this.data.raidStash.splice(gearIndex,1);
  if(this.persist())return true;
  this.data.raidWallet+=plan.cost;
  if(gear)this.data.raidStash.splice(gearIndex,0,gear);
  return false;
 }
 beginOperation(difficulty){
  if(this.data.operation?.status==='active')return;
  this.data.operation=restoreOperation({difficulty});
  this.persist();
 }
 finish(result){if(result.operation&&!finishOperationBattle(this.data.operation,result))return false;const record=matchRecord(result);if(record?.mode==='raid'&&record.outcome==='win'){
  this.data.raidWallet=count(this.data.raidWallet+record.raidPayout);
  for(const item of Array.isArray(result.raidRecovered)?result.raidRecovered.slice(0,2):[]){
   const weapon=restoreRaidWeapon(item);
   if(!weapon||this.data.raidStash.length>=RAID_STASH_LIMIT)continue;
   this.data.raidStash.push({...raidWeaponRecord(weapon),id:++this.data.raidStashSerial});
  }
 }if(record)this.data.matchHistory=[record,...this.data.matchHistory].slice(0,MATCH_HISTORY_LIMIT);this.data.xp+=result.xp;this.data.matches++;this.data.wins+=Number(result.win);this.data.kills+=result.kills;this.data.deaths+=result.deaths;this.data.bestStreak=Math.max(this.data.bestStreak,result.streak);for(const [id,n]of Object.entries(result.weaponKills))this.data.weaponXP[id]=(this.data.weaponXP[id]??0)+n*100;return this.persist();}
}
