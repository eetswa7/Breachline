import * as THREE from '../vendor/three.module.min.js';
import {PRODUCTION_ASSETS} from './production-files.js?v=71';
import {textureBytes} from './graphics-profiler.js?v=71';

// Upload work follows byte cost, since six large uncompressed normal maps are
// far more expensive than six small ASTC maps. The loading overlay remains
// responsive; all uploads finish before the caller enables gameplay.
export async function stageTextureUploads(renderer,textures,{budgetBytes=4*1048576,yieldFrame=()=>new Promise(resolve=>setTimeout(resolve,0))}={}){
 if(!renderer.initTexture)return {uploadedBytes:0,batches:0};
 let batchBytes=0,uploadedBytes=0,batches=0;
 for(const texture of new Set(textures)){
  const bytes=textureBytes([texture]);
  if(batchBytes&&batchBytes+bytes>budgetBytes){await yieldFrame();batchBytes=0;}
  if(!batchBytes)batches++;
  renderer.initTexture(texture);batchBytes+=bytes;uploadedBytes+=bytes;
 }
 return {uploadedBytes,batches};
}

// A small, strictly checked container for native ASTC blocks. Safari gets the
// authored mip chain without expanding normal maps into JavaScript RGBA arrays.
export function decodeASTC(buffer){
 const bytes=new Uint8Array(buffer),view=new DataView(buffer);
 if(bytes.length<12||String.fromCharCode(...bytes.subarray(0,4))!=='BTX1')throw Error('Invalid production texture');
 const width=view.getUint16(4,true),height=view.getUint16(6,true),block=view.getUint8(8),count=view.getUint8(9);
 if(![4,6,8].includes(block)||width!==height||width<1||width>2048||(width&(width-1))||count!==Math.floor(Math.log2(width))+1||bytes.length<12+count*4)throw Error('Invalid ASTC dimensions');
 const mipmaps=[];let offset=12+count*4,size=width;
 for(let i=0;i<count;i++){
  const length=view.getUint32(12+i*4,true),expected=Math.ceil(size/block)**2*16;
  if(length!==expected||offset+length>bytes.length)throw Error('Truncated ASTC mip chain');
  mipmaps.push({data:bytes.subarray(offset,offset+length),width:size,height:size});offset+=length;size=Math.max(1,size>>1);
 }
 if(offset!==bytes.length)throw Error('Unexpected ASTC texture data');
 return {width,height,block,mipmaps};
}

export async function loadProductionTextures(renderer){
 const compressed=!!renderer.getContext().getExtension('WEBGL_compressed_texture_astc');
 const anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy()),textures=[],stats={compressed,downloadBytes:0};
 // Bound simultaneous image decodes and requests. A large art download must
 // not create a corresponding burst of decoded images or GPU uploads.
 const queue=[];let active=0;
 const run=fn=>new Promise((resolve,reject)=>{queue.push({fn,resolve,reject});pump();});
 function pump(){while(active<4&&queue.length){const task=queue.shift();active++;Promise.resolve().then(task.fn).then(task.resolve,task.reject).finally(()=>{active--;pump();});}}
 async function bytes(files){
  const chunks=[];for(const file of files){const response=await fetch(new URL('../assets/'+file,import.meta.url));if(!response.ok)throw Error('Could not load '+file);const data=new Uint8Array(await response.arrayBuffer());chunks.push(data);stats.downloadBytes+=data.byteLength;}
  if(chunks.length===1)return chunks[0];
  const result=new Uint8Array(chunks.reduce((n,a)=>n+a.length,0));let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}return result;
 }
 async function imageTexture(files){
  const data=await bytes(files),url=URL.createObjectURL(new Blob([data],{type:'image/webp'}));
  try{const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Could not decode production image'));img.src=url;});return new THREE.Texture(image);}
  finally{URL.revokeObjectURL(url);}
 }
 async function map(spec,colour){
  let texture;
  if(compressed){const decoded=decodeASTC((await bytes(spec.astc)).buffer),formats={4:THREE.RGBA_ASTC_4x4_Format,6:THREE.RGBA_ASTC_6x6_Format,8:THREE.RGBA_ASTC_8x8_Format};
   texture=new THREE.CompressedTexture(decoded.mipmaps,decoded.width,decoded.height,formats[decoded.block],THREE.UnsignedByteType);texture.generateMipmaps=false;
  }else texture=await imageTexture(spec.webp);
  texture.colorSpace=colour?THREE.SRGBColorSpace:THREE.NoColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=anisotropy;
  texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;textures.push(texture);return texture;
 }
 async function bank(entries){return Promise.all(entries.map(entry=>run(async()=>({map:await map(entry.albedo,true),normal:await map(entry.normal,false),roughness:await map(entry.orm,false),baked:true}))));}
 const [surfaces,weapons,lightmaps]=await Promise.all([bank(PRODUCTION_ASSETS.surfaces),bank(PRODUCTION_ASSETS.weapons),Promise.all(PRODUCTION_ASSETS.lightmaps.map(files=>run(async()=>{
  const texture=await imageTexture(files);texture.colorSpace=THREE.NoColorSpace;texture.generateMipmaps=false;
  texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;textures.push(texture);return texture;
 })))]);
 return {surfaces,weapons,lightmaps,textures,stats};
}
