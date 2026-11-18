import * as THREE from '../vendor/three.module.min.js';
import {weatherLighting} from './weather-lighting.js?v=103';

// HDR radiance combines each map's atmosphere with authored cloud shading. One
// PMREM per map load, never a cubemap capture during combat. 128 px cube faces.
export function environmentRadiance(info,width=512,height=256,clouds=null){
  const pixels=new Uint16Array(width*height*4),sun=new THREE.Vector3(...info.sun).normalize();
  const sky=new THREE.Color().setRGB(...info.sky,THREE.SRGBColorSpace),fog=new THREE.Color().setRGB(...info.fog,THREE.SRGBColorSpace);
  const weather=weatherLighting(info),azimuth=Math.atan2(sun.z,sun.x);
  const solarColor=new THREE.Color(weather.sunColor).toArray();
  const skyChannels=[sky.r,sky.g,sky.b],fogChannels=[fog.r,fog.g,fog.b];
  // Longitude and cloud addressing stay identical along a column. Precompute
  // them once; avoid six trigonometric calls and temporary RGB arrays per pixel.
  const longitudes=Array.from({length:width},(_,x)=>{
    const longitude=((x+.5)/width-.5)*Math.PI*2;
    return {cos:Math.cos(longitude),sin:Math.sin(longitude),cloudUV:((longitude-azimuth)/(Math.PI*2)+1.5+(weather.cloudOffset??0))%1};
  }),cloudRGB=[0,0,0];
  for(let y=0;y<height;y++){
   const latitude=((y+.5)/height-.5)*Math.PI,dy=Math.sin(latitude),radial=Math.cos(latitude);
   const horizon=Math.pow(1-Math.abs(dy),3),ground=dy<0,elevation=latitude/(Math.PI/2),cloudY=Math.min(1,Math.max(0,elevation*weather.cloudStretch));
   for(let x=0;x<width;x++){
    const column=longitudes[x],dx=radial*column.cos,dz=radial*column.sin;
    const dot=dx*sun.x+dy*sun.y+dz*sun.z,solar=Math.exp((dot-1)*weather.solarFocus)*weather.solarPower;
    const corona=Math.exp((dot-1)*12)*weather.coronaPower;
    const i=(y*width+x)*4;
    const cloud=clouds&&dy>0?sampleCloud(clouds,column.cloudUV,cloudY):0;
    const photographed=clouds?.rgba&&dy>0?sampleCloudColor(clouds,column.cloudUV,cloudY,cloudRGB):null;
    const brightness=photographed?(photographed[0]*.2126+photographed[1]*.7152+photographed[2]*.0722)/255:.72;
    const cloudShade=Math.max(.20,Math.min(1,Math.pow(brightness,1.45)*1.1));
    const cover=Math.min(1,weather.cloudBase+cloud*weather.cloudWeight)*(1-Math.max(0,elevation)**9);
    for(let c=0;c<3;c++){
      let base=ground?fogChannels[c]*.24:skyChannels[c]*(1-horizon*.55)+fogChannels[c]*horizon*.75;
      if(!ground){
        const cloudRadiance=(cloudShade*weather.cloudLight+horizon*.06)*weather.cloudTint[c];
        base=base*(1-cover)+cloudRadiance*cover+(solar*(1-cover*.91)+corona*(1+cover*.35))*solarColor[c];
      }
      pixels[i+c]=THREE.DataUtils.toHalfFloat(base);
    }pixels[i+3]=THREE.DataUtils.toHalfFloat(1);
   }
  }return {pixels,width,height};
}
export class EnvironmentProbes {
  constructor(renderer,clouds=null){this.clouds=clouds;this.sky=null;this.generator=new THREE.PMREMGenerator(renderer);this.target=null;this.interior=null;}
  setArena(info){
    const {pixels,width,height}=environmentRadiance(info,512,256,this.clouds);
    const texture=new THREE.DataTexture(pixels,width,height,THREE.RGBAFormat,THREE.HalfFloatType);
    texture.minFilter=texture.magFilter=THREE.LinearFilter;
    texture.mapping=THREE.EquirectangularReflectionMapping;texture.colorSpace=THREE.LinearSRGBColorSpace;texture.needsUpdate=true;
    const target=this.generator.fromEquirectangular(texture);this.sky?.dispose();this.sky=texture;this.target?.dispose();this.target=target;
    // All rooms share this authored probe. Reuse it across map transitions.
    if(this.interior)return target;
    const room=interiorRadiance();
    const source=new THREE.DataTexture(room.pixels,room.width,room.height,THREE.RGBAFormat,THREE.HalfFloatType);
    source.mapping=THREE.EquirectangularReflectionMapping;source.needsUpdate=true;
    this.interior?.dispose();this.interior=this.generator.fromEquirectangular(source);source.dispose();
    return target;
  }
  dispose(){this.sky?.dispose();this.interior?.dispose();this.target?.dispose();this.generator.dispose();}
}

export function orientWeaponEnvironment(scene,camera){
  // r180 negates environment Euler components when building its sampling matrix.
  // Encode the camera's world rotation so sampling stays fixed in the world.
  scene.environmentRotation.setFromRotationMatrix(camera.matrixWorld,'XYZ');
  scene.environmentRotation.x*=-1;scene.environmentRotation.y*=-1;scene.environmentRotation.z*=-1;
}

// Shared soft ceiling / wall / floor probe. No combat-time scene capture and
// no second fragment sampler. One 64 px-face PMREM for interior hero lighting.
export function interiorRadiance(width=256,height=128){
 const pixels=new Uint16Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const dy=Math.sin(((y+.5)/height-.5)*Math.PI),a=((x+.5)/width-.5)*Math.PI*2;
  const panel=Math.pow(Math.max(0,dy),12)*Math.pow(Math.max(0,Math.cos(a*2)),10)*3.2;
  const base=dy<0?.065:.18+dy*.15;
  const i=(y*width+x)*4;
  for(let c=0;c<3;c++)pixels[i+c]=THREE.DataUtils.toHalfFloat(base*[1,.94,.84][c]+panel*[1,.82,.62][c]);
  pixels[i+3]=THREE.DataUtils.toHalfFloat(1);
 }return {pixels,width,height};
}
export function roomProbeSelected(wasInside,sky){return wasInside?sky<.62:sky<.46;}

// Retain cloud structure and luminance from the original sky image without
// importing its fixed mountain horizon or baked sun into every map.
export function cloudMask(image){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=192;
 const c=canvas.getContext('2d',{willReadFrequently:true});
 c.drawImage(image,0,0,image.width,image.height*.69,0,0,canvas.width,canvas.height);
 const rgba=c.getImageData(0,0,canvas.width,canvas.height).data,data=new Float32Array(canvas.width*canvas.height);
 for(let i=0;i<data.length;i++){const r=rgba[i*4],g=rgba[i*4+1],b=rgba[i*4+2];
  data[i]=Math.max(0,Math.min(1,(Math.min(r,g,b)/Math.max(1,r,g,b)-.5)*2))*Math.min(1,(r+g+b)/480);
 }
 return {data,rgba,width:canvas.width,height:canvas.height};
}
export function sampleCloudColor(mask,u,elevation,result=[0,0,0]){
 const x=(1-Math.abs(u*2-1))*(mask.width-1),y=(1-elevation)*(mask.height-1),ix=Math.floor(x),iy=Math.floor(y);
 const fx=x-ix,fy=y-iy,at=(a,b,c)=>mask.rgba[(Math.min(mask.height-1,Math.max(0,b))*mask.width+Math.min(mask.width-1,Math.max(0,a)))*4+c];
 for(let c=0;c<3;c++)result[c]=(at(ix,iy,c)*(1-fx)+at(ix+1,iy,c)*fx)*(1-fy)+(at(ix,iy+1,c)*(1-fx)+at(ix+1,iy+1,c)*fx)*fy;
 return result;
}
export function sampleCloud(mask,u,elevation){
 // Mirror at the wrap seam and zenith, avoiding texture seams and pole pinching.
 const x=(1-Math.abs(u*2-1))*(mask.width-1),y=(1-elevation)*(mask.height-1),ix=Math.floor(x),iy=Math.floor(y);
 const fx=x-ix,fy=y-iy,at=(a,b)=>mask.data[Math.min(mask.height-1,Math.max(0,b))*mask.width+Math.min(mask.width-1,Math.max(0,a))];
 const value=(at(ix,iy)*(1-fx)+at(ix+1,iy)*fx)*(1-fy)+(at(ix,iy+1)*(1-fx)+at(ix+1,iy+1)*fx)*fy;
 return value*(1-elevation**8);
}
