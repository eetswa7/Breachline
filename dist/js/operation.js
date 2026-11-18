export const OPERATION_STAGES = [
 [
  {id:'rail',name:'Seize the railhead',map:6,mode:'frontline',supply:8,pressure:0,reward:'+8 allied reinforcements in later battles'},
  {id:'relay',name:'Cut the command relay',map:3,mode:'domination',supply:0,pressure:8,reward:'8 fewer enemy reinforcements in later battles'}
 ],
 [
  {id:'port',name:'Secure the supply docks',map:4,mode:'hardpoint',supply:12,pressure:0,reward:'+12 allied reinforcements in the siege'},
  {id:'quarry',name:'Break the reserve force',map:9,mode:'confirmed',supply:0,pressure:12,reward:'12 fewer enemy reinforcements in the siege'}
 ],
 [
  {id:'siege',name:'Take Blacksite',map:14,mode:'frontline',supply:0,pressure:0,reward:'Win the operation'}
 ]
];

export function restoreOperation(saved) {
 if(!saved||!['recruit','regular','veteran'].includes(saved.difficulty))return null;
 const operation={difficulty:saved.difficulty,stage:0,reserves:3,supply:0,pressure:0,status:'active',log:[]};
 for(const entry of Array.isArray(saved.log)?saved.log.slice(0,5):[]){
  if(!recordBattle(operation,entry?.id,entry?.outcome))break;
 }
 return operation;
}

function recordBattle(operation,id,outcome) {
 if(operation.status!=='active'||!['win','draw','loss'].includes(outcome))return false;
 const mission=OPERATION_STAGES[operation.stage]?.find(candidate=>candidate.id===id);
 if(!mission)return false;
 operation.log.push({id,outcome});
 if(outcome==='win'){
  operation.stage++;
  operation.supply+=mission.supply;
  operation.pressure+=mission.pressure;
  if(operation.stage===OPERATION_STAGES.length)operation.status='won';
 }else if(--operation.reserves===0)operation.status='lost';
 return true;
}

export function operationBattle(operation,id) {
 if(operation?.status!=='active')return null;
 const mission=OPERATION_STAGES[operation.stage]?.find(candidate=>candidate.id===id);
 if(!mission)return null;
 return {...mission,difficulty:operation.difficulty,attempt:operation.log.length,
  tickets:[(id==='siege'?32:18)+operation.supply,Math.max(6,(id==='siege'?44:22)-operation.pressure)]};
}

export function finishOperationBattle(operation,result) {
 const battle=operationBattle(operation,result.operation?.id);
 if(!battle||battle.attempt!==result.operation.attempt||battle.map!==result.map||battle.mode!==result.mode)return false;
 return recordBattle(operation,battle.id,result.draw?'draw':result.win?'win':'loss');
}
