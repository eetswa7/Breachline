import {BAKED_FILES} from './blender-files.js?v=71';
export const TEXTURE_FILES=Object.values(BAKED_FILES).flat();
export async function loadImages(keys){
 const baked=await Promise.all(Object.entries(BAKED_FILES).filter(([key])=>!keys||keys.includes(key)).map(async([key,files])=>{
  const segments=await Promise.all(files.map(async file=>{const r=await fetch(new URL(`../assets/${file}`,import.meta.url));if(!r.ok)throw Error(`Could not load ${file}`);return r.arrayBuffer();}));
  const url=URL.createObjectURL(new Blob(segments,{type:'image/webp'}));
  try{return [key,await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error(`Could not decode Blender ${key}`));image.src=url;})];}
  finally{URL.revokeObjectURL(url);}
 }));
 return Object.fromEntries(baked);
}
