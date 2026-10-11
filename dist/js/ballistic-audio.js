import {boxInterval} from './ballistics.js?v=61';

const METAL=new Set(['steel','dark','blue','rust','brass']);
const STONE=new Set(['concrete','stone','limestone','tiles','asphalt','plaster']);
export const impactMaterial=surface=>METAL.has(surface)?'Metal':surface==='wood'?'Wood':surface==='glass'?'Glass':surface==='water'?'Water':'Stone';

// Read-only cues describe the existing collision result. A glancing terminal
// contact can shed a fragment; this never reflects a bullet or changes damage.
export function ballisticContactAudio(contact,dir,source){
 const {block,position,penetrated}=contact;
 if(!block||!position)return null;
 if(penetrated){
  const interval=boxInterval(position,dir,block);
  if(!interval||!Number.isFinite(interval.exit)||interval.exit<=0)return null;
  return {type:'penetration',source,surface:block.surface,position:{...position},
   exitPosition:{x:position.x+dir.x*interval.exit,y:position.y+dir.y*interval.exit,z:position.z+dir.z*interval.exit},thickness:contact.thickness};
 }
 if(!METAL.has(block.surface)&&!STONE.has(block.surface))return null;
 // Collision uses axis-aligned boxes. Select that same entry face, including
 // corner ties, rather than a normal from the rotated decorative mesh.
 let axis=null,entry=-Infinity;
 for(const k of ['x','y','z']){
  if(Math.abs(dir[k])<1e-8)continue;
  const half=block[k==='x'?'w':k==='y'?'h':'d']*.5;
  const near=(block[k]-Math.sign(dir[k])*half-position[k])/dir[k];
  if(near>entry){entry=near;axis=k;}
 }
 const length=Math.hypot(dir.x,dir.y,dir.z),incidence=axis&&length?Math.abs(dir[axis])/length:1;
 if(incidence>.3||incidence<1e-5)return null;
 return {type:'ricochet',source,surface:block.surface,position:{...position},incidence};
}
