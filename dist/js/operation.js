const BLACKSITE_STAGES = [
 [
  {id:'rail',name:'Seize the railhead',map:6,mode:'frontline',supply:8,pressure:0,reward:'+8 allied reinforcements in later battles'},
  {id:'relay',name:'Cut the command relay',map:3,mode:'domination',supply:0,pressure:8,reward:'8 fewer enemy reinforcements in later battles'}
 ],
 [
  {id:'port',name:'Secure the supply docks',map:4,mode:'hardpoint',supply:12,pressure:0,reward:'+12 allied reinforcements in the siege'},
  {id:'quarry',name:'Break the reserve force',map:9,mode:'confirmed',supply:0,pressure:12,reward:'12 fewer enemy reinforcements in the siege'}
 ],
 [
  {id:'siege',name:'Take Blacksite',map:14,mode:'frontline',supply:0,pressure:0,reward:'Breach the vault and extract the data core'}
 ]
];

const FLOODGATE_STAGES=[
 [
  {id:'heat',name:'Recover the reserve stores',map:12,mode:'hardpoint',supply:10,pressure:0,reward:'+10 allied reinforcements in later battles'},
  {id:'frost',name:'Disrupt the northern relay',map:8,mode:'domination',supply:0,pressure:10,reward:'10 fewer enemy reinforcements in later battles'}
 ],
 [
  {id:'ridge',name:'Open the mountain corridor',map:5,mode:'frontline',supply:16,pressure:0,reward:'+16 allied reinforcements at Floodgate'},
  {id:'freight',name:'Break the freight reserve',map:6,mode:'confirmed',supply:0,pressure:14,reward:'14 fewer enemy reinforcements at Floodgate'}
 ],
 [
  {id:'evacuation',name:'Evacuate through Floodgate',map:16,mode:'convoy',supply:0,pressure:0,reward:'Escort the evacuation drone to the far yard',
   evacuation:true,time:180,roster:[6,9],baseTickets:[24,34]}
 ]
];

export const CAMPAIGNS={
 blacksite:{name:'Blacksite Siege',victory:'Blacksite taken',stages:BLACKSITE_STAGES,
  description:'Win two battles to prepare for the siege, then breach Blacksite and extract its data core.'},
 floodgate:{name:'Floodgate Evacuation',victory:'Evacuation complete',stages:FLOODGATE_STAGES,
  description:'Open a route through the mountains, then escort the evacuation drone across Floodgate before the deadline.'}
};
export const campaignFor=id=>Object.hasOwn(CAMPAIGNS,id)?CAMPAIGNS[id]:CAMPAIGNS.blacksite;

export function restoreOperation(saved) {
 if(!saved||!['recruit','regular','veteran'].includes(saved.difficulty))return null;
 const campaign=Object.hasOwn(CAMPAIGNS,saved.campaign)?saved.campaign:'blacksite';
 const operation={campaign,difficulty:saved.difficulty,stage:0,reserves:3,supply:0,pressure:0,status:'active',log:[]};
 for(const entry of Array.isArray(saved.log)?saved.log.slice(0,5):[]){
  if(!recordBattle(operation,entry?.id,entry?.outcome))break;
 }
 return operation;
}

function recordBattle(operation,id,outcome) {
 if(operation.status!=='active'||!['win','draw','loss'].includes(outcome))return false;
 const stages=campaignFor(operation.campaign).stages;
 const mission=stages[operation.stage]?.find(candidate=>candidate.id===id);
 if(!mission)return false;
 operation.log.push({id,outcome});
 if(outcome==='win'){
  operation.stage++;
  operation.supply+=mission.supply;
  operation.pressure+=mission.pressure;
  if(operation.stage===stages.length)operation.status='won';
 }else if(--operation.reserves===0)operation.status='lost';
 return true;
}

export function operationBattle(operation,id) {
 if(operation?.status!=='active')return null;
 const stages=campaignFor(operation.campaign).stages;
 const mission=stages[operation.stage]?.find(candidate=>candidate.id===id);
 if(!mission)return null;
 const base=mission.baseTickets??(id==='siege'?[32,44]:[18,22]);
 return {...mission,campaign:operation.campaign,difficulty:operation.difficulty,attempt:operation.log.length,
  tickets:[base[0]+operation.supply,Math.max(6,base[1]-operation.pressure)]};
}

export function finishOperationBattle(operation,result) {
 const battle=operationBattle(operation,result.operation?.id);
 if(!battle||battle.attempt!==result.operation.attempt||battle.map!==result.map||battle.mode!==result.mode)return false;
 return recordBattle(operation,battle.id,result.draw?'draw':result.win?'win':'loss');
}
