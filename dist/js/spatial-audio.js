// Web Audio uses the game's right-handed world: +Y up, yaw zero toward -Z.
// Positive pitch looks up. The head-up vector pitches with the camera so
// elevation stays correct when looking above/below an emitting surface.
export function listenerFrame(player,eye){
 const yaw=Number.isFinite(player.yaw)?player.yaw:0,pitch=Number.isFinite(player.pitch)?player.pitch:0;
 const sy=Math.sin(yaw),cy=Math.cos(yaw),sp=Math.sin(pitch),cp=Math.cos(pitch);
 return {position:eye,forward:{x:sy*cp,y:sp,z:-cy*cp},up:{x:-sy*sp,y:cp,z:cy*sp}};
}
const finitePosition=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z);
function parameters(node,names,values,time){
 if(!names.every(name=>node[name]&&('value' in node[name]||typeof node[name].setValueAtTime==='function')))return false;
 // Live listener poses do not need an automation timeline. Intrinsic value
 // writes keep long matches from accumulating scheduled pose events.
 for(let i=0;i<names.length;i++){const param=node[names[i]];if('value' in param)param.value=values[i];else param.setValueAtTime(values[i],time);}
 return true;
}
function position(node,p,time){
 if(parameters(node,['positionX','positionY','positionZ'],[p.x,p.y,p.z],time))return true;
 if(node.setPosition){node.setPosition(p.x,p.y,p.z);return true;}return false;
}
// Older Safari exposes the legacy setters; a missing/unsupported listener
// leaves the caller on its existing stereo path instead of losing the cue.
export function updateSpatialListener(context,frame){
 const listener=context?.listener;if(!listener||!finitePosition(frame?.position))return false;
 const f=frame.forward,u=frame.up,time=context.currentTime??0;
 try{
  if(!position(listener,frame.position,time))return false;
  if(parameters(listener,['forwardX','forwardY','forwardZ','upX','upY','upZ'],[f.x,f.y,f.z,u.x,u.y,u.z],time))return true;
  if(listener.setOrientation){listener.setOrientation(f.x,f.y,f.z,u.x,u.y,u.z);return true;}
 }catch{}return false;
}
export function createWorldPanner(context,p){
 if(!context?.createPanner||!finitePosition(p))return null;
 let node;
 try{
  node=context.createPanner();node.panningModel='HRTF';
  if(node.panningModel!=='HRTF')throw Error('Native HRTF is unavailable');
  // The existing game gain law is the only distance attenuation. Native HRTF
  // adds interaural timing/spectral direction, never another rolloff or cone.
  node.distanceModel='inverse';node.refDistance=1;node.maxDistance=10000;node.rolloffFactor=0;
  node.coneInnerAngle=360;node.coneOuterAngle=360;node.coneOuterGain=1;
  if(position(node,p,context.currentTime??0))return node;
 }catch{}
 try{node?.disconnect();}catch{}return null;
}
