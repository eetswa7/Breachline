// Only moving magazine contacts have attachment voices. Fixed optics, muzzle
// devices and grips do not produce invented installation/adjustment events.
export const ATTACHMENT_FOLEY_FAMILIES=['Fast','Extended','Drum'];
export const ATTACHMENT_FOLEY_ACTIONS=['Extract','Move','Seat'];

export function attachmentFoleyCue(event,def){
 if(!def||['PISTOL','MELEE'].includes(def.kind)||def.shellReload||def.revolver)return null;
 if(!['magazine','topMagazine','beltBox'].includes(event.component))return null;
 const action={extract:'Extract',handling:'Move',insert:'Move',seat:'Seat'}[event.cue];
 if(!action)return null;
 // Match the visible drum/extended/fast geometry, including the retained old
 // handling-slot magazine. The drum wins when both selections are present.
 const family=event.magazine===3?'Drum':event.magazine===2||event.handling===4?'Extended':event.magazine===1?'Fast':null;
 return family?{key:'attachment'+family+action,region:[0,1]}:null;
}

// Compact original startup voices remain available while AAC takes decode.
// These are short individual contact/rub recordings, never a reload bed.
export function buildAttachmentFoley(context){
 const buffers=new Map(),rate=context.sampleRate;
 for(let family=0;family<ATTACHMENT_FOLEY_FAMILIES.length;family++)for(let action=0;action<ATTACHMENT_FOLEY_ACTIONS.length;action++){
  const key='attachment'+ATTACHMENT_FOLEY_FAMILIES[family]+ATTACHMENT_FOLEY_ACTIONS[action],buffer=context.createBuffer(1,Math.ceil(rate*.058),rate),data=buffer.getChannelData(0);
  let seed=(42793+family*1301+action*997)>>>0,low=0;
  const hz=[1950,1080,650][family],weight=[.12,.17,.21][family];
  for(let i=0;i<data.length;i++){
   const t=i/rate;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;const n=(seed>>>0)/2147483648-1;low+=.15*(n-low);
   const front=action===1?0:(low*1.8+(n-low)*.25+Math.sin(t*hz*6.283185)*.05)*Math.exp(-t*(action===2?115:155))*weight;
   const rub=(low*.22+(n-low)*.016)*Math.exp(-t*72)*(1-Math.exp(-t*900))*(action===2?.25:1);
   data[i]=Math.tanh(front+rub)*Math.min(1,(data.length-i)/Math.max(1,rate*.012));
  }
  buffers.set(key,buffer);
 }
 return buffers;
}
