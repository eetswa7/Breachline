import * as THREE from '../vendor/three.module.min.js';
import {clamp} from './math.js?v=71';

// Small ground-plan light field, baked once per map. This is an approximation
// of indirect light, not a GI solver. R sky access, G warm bounce, B roof height,
// A ground contact. Height-aware decoding keeps roofs and raised routes lit.
export function bakeLightField(arena,resolution=64,options={}){
  const size=arena.info.size,data=options.data??new Uint8Array(resolution*resolution*4);
  const {contacts,roofs,lamps}=options.context??lightingInputs(arena);
  const start=options.startCell??(options.startRow??0)*resolution;
  const end=Math.min(resolution*resolution,start+(options.cellCount??(options.rowCount??resolution)*resolution));
  for(let cell=start;cell<end;cell++){
    const z=Math.floor(cell/resolution),x=cell%resolution;
    const px=((x+.5)/resolution*2-1)*size,pz=((z+.5)/resolution*2-1)*size;
    const roof=roofs.find(b=>Math.abs(px-b.x)<b.w/2&&Math.abs(pz-b.z)<b.d/2);
    let contact=1,edge=0,bounce=0,portal=0;
    for(const b of contacts){
      const dx=Math.max(0,Math.abs(px-b.x)-b.w/2),dz=Math.max(0,Math.abs(pz-b.z)-b.d/2);
      if(dx>=3||dz>=3)continue;
      const d=Math.sqrt(dx*dx+dz*dz);
      if(d<1.7)contact=Math.min(contact,.72+.28*clamp(d/1.7,0,1));
      if(d<3)edge=Math.max(edge,(1-d/3)*Math.min(.22,b.h*.04));
    }
    if(roof){
      // Doorway daylight falls with distance into a room. Four visibility rays
      // per covered texel, only during baking, add no fragment texture samples.
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const reach=dx?roof.w/2-dx*(px-roof.x):roof.d/2-dz*(pz-roof.z);
        const target={x:px+dx*(reach+1),y:1.6,z:pz+dz*(reach+1)};
        if(arena.visible?.({x:px,y:1.2,z:pz},target)!==false)portal+=1/(1+reach*.4);
      }
      for(const p of lamps){const d2=(p.x-px)**2+(p.z-pz)**2+(p.y-1.2)**2;
        if(d2>90)continue;
        if(arena.visible?.({x:px,y:1.2,z:pz},{x:p.x,y:p.y-.15,z:p.z})===false)continue;
        bounce+=.32/(1+d2*.11);
      }
    }
    const i=(z*resolution+x)*4;
    data[i]=Math.round(255*(roof?Math.min(.68,.22+portal*.16):1-edge));data[i+1]=Math.round(255*Math.min(.55,bounce));
    data[i+2]=Math.round(255*(roof?Math.min(16,roof.y-roof.h/2)/16:0));data[i+3]=Math.round(255*contact);
  }
  return {data,resolution,size};
}

function lightingInputs(arena){
 const blocks=arena.blocks.filter(b=>!b.ground&&!b.destroyed&&!b.invisible);
 return {contacts:blocks.filter(b=>!b.roof&&b.y-b.h/2<=.3&&b.h>=.5),roofs:blocks.filter(b=>b.roof),lamps:arena.decor.filter(p=>p.emissive>.5&&p.y>1&&p.surface==='white')};
}

export class LightingField {
  constructor(){this.texture={value:null};this.size={value:32};this.enabled={value:0};}
  setArena(arena){
    this.pending=null;const field=bakeLightField(arena);this.texture.value?.dispose();
    const t=new THREE.DataTexture(field.data,field.resolution,field.resolution,THREE.RGBAFormat);
    t.minFilter=t.magFilter=THREE.LinearFilter;t.generateMipmaps=false;t.needsUpdate=true;
    this.texture.value=t;this.size.value=field.size;this.enabled.value=1;this.field=field;
  }
  sample(point,faceNormal=null){
    const f=this.field;if(!f)return 1;
    // Sample the side of a wall that the face actually sees. The coarse roof
    // footprint includes wall thickness and overhang, so sampling the wall's
    // centre falsely gives both its exterior and interior the room's darkness.
    const offset=faceNormal?1.2*(1-Math.abs(faceNormal.y)):0;
    const x=clamp(((point.x+(faceNormal?.x??0)*offset)/(f.size*2)+.5)*f.resolution-.5,0,f.resolution-1);
    const z=clamp(((point.z+(faceNormal?.z??0)*offset)/(f.size*2)+.5)*f.resolution-.5,0,f.resolution-1);
    const x0=Math.floor(x),z0=Math.floor(z),fx=x-x0,fz=z-z0;
    const at=(xx,zz)=>{const i=(zz*f.resolution+xx)*4,roof=f.data[i+2]/255*16;
      const t=roof>.03?clamp((point.y-roof+.2)/.65,0,1):0,above=t*t*(3-2*t);
      return f.data[i]/255*(1-above)+above;};
    const a=at(x0,z0)*(1-fx)+at(Math.min(x0+1,f.resolution-1),z0)*fx;
    const b=at(x0,Math.min(z0+1,f.resolution-1))*(1-fx)+at(Math.min(x0+1,f.resolution-1),Math.min(z0+1,f.resolution-1))*fx;
    return a*(1-fz)+b*fz;
  }
  patch(shader,wallFaces=false){
    shader.uniforms.uBreachField=this.texture;shader.uniforms.uBreachFieldSize=this.size;shader.uniforms.uBreachFieldEnabled=this.enabled;
    shader.vertexShader='varying vec3 vBreachLightPosition;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      #ifdef USE_INSTANCING
      vBreachLightPosition=(modelMatrix*instanceMatrix*vec4(position,1.0)).xyz;
      #else
      vBreachLightPosition=(modelMatrix*vec4(position,1.0)).xyz;
      #endif`);
    shader.fragmentShader='varying vec3 vBreachLightPosition; uniform sampler2D uBreachField; uniform float uBreachFieldSize; uniform float uBreachFieldEnabled;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>',`#include <aomap_fragment>
      ${wallFaces?`vec3 fieldFaceNormal=inverseTransformDirection(nonPerturbedNormal,viewMatrix);
      vec3 fieldPosition=vBreachLightPosition+fieldFaceNormal*(1.2*(1.0-abs(fieldFaceNormal.y)));`:'vec3 fieldPosition=vBreachLightPosition;'}
      vec4 field=texture2D(uBreachField,clamp(fieldPosition.xz/(2.0*uBreachFieldSize)+.5,0.0,1.0));
      float roofHeight=field.b*16.0;
      float hasRoof=step(.03,roofHeight);
      float aboveRoof=hasRoof*smoothstep(roofHeight-.2,roofHeight+.45,vBreachLightPosition.y);
      float sky=mix(field.r,1.0,aboveRoof);
      float contact=mix(field.a,1.0,smoothstep(0.0,1.4,vBreachLightPosition.y));
      reflectedLight.indirectDiffuse*=mix(1.0,sky*contact,uBreachFieldEnabled);
      reflectedLight.indirectSpecular*=mix(1.0,mix(.55,1.0,sky),uBreachFieldEnabled);
      reflectedLight.indirectDiffuse+=diffuseColor.rgb*(1.0-metalnessFactor)*vec3(1.0,.72,.42)*field.g*hasRoof*(1.0-aboveRoof)*uBreachFieldEnabled;
    `);
  }
  // Keep the last complete field live until the replacement is ready. Explosions
  // otherwise cause a full 64-row bake inside a single gameplay frame.
  // Check a 0.65 ms soft budget every 16 texels; never process over 128 texels.
  invalidate(arena){this.pending={arena,cell:0,context:lightingInputs(arena),data:new Uint8Array(64*64*4)};}
  update(){
    const p=this.pending;if(!p)return;
    const deadline=performance.now()+.65,limit=Math.min(4096,p.cell+128);
    do{bakeLightField(p.arena,64,{data:p.data,startCell:p.cell,cellCount:16,context:p.context});p.cell+=16;}
    while(p.cell<limit&&performance.now()<deadline);
    if(p.cell>=4096){this.texture.value.image.data=p.data;this.texture.value.needsUpdate=true;this.field.data=p.data;this.pending=null;}
  }
  dispose(){this.pending=null;this.texture.value?.dispose();}
}
