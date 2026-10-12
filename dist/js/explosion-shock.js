import * as THREE from '../vendor/three.module.min.js';

// A short pressure front and lifted dust rim, drawn in the explosion's world
// plane. The annulus covers only its rim: no framebuffer copy, fullscreen quad,
// extra render target, texture or lighting pass.
export const SHOCK_LIMITS = Object.freeze({capacity:6,segments:48,lifetime:.52,
  low:2,medium:4,high:6,ultra:6});

export const shockVertex = `
attribute vec3 instancePosition;
attribute float instanceRadius;
attribute float instanceAge;
attribute float instanceSeed;
attribute float instanceGround;
varying vec2 vShockUv;
varying float vShockAge;
varying float vShockSeed;
varying float vShockGround;
void main(){
  vShockUv=uv;vShockAge=instanceAge;vShockSeed=instanceSeed;
  vShockGround=instanceGround;
  float angle=uv.x*6.28318530718;
  float age=instanceAge;
  float radius=.16+instanceRadius*(1.0-pow(1.0-age,2.0));
  float width=.15+.40*age;
  // A small irregularity breaks the perfect graphic circle without changing
  // its physical centre or using additional particles.
  float irregular=1.0+.019*sin(angle*9.0+instanceSeed*29.0)
    +.012*cos(angle*17.0+instanceSeed*43.0);
  float edgeRadius=max(.025,radius-width*(1.0-uv.y))*irregular;
  float lift=sin(uv.y*3.14159265359)*(.04+.22*age)*instanceGround;
  vec3 world=instancePosition+vec3(cos(angle)*edgeRadius,lift,sin(angle)*edgeRadius);
  gl_Position=projectionMatrix*viewMatrix*vec4(world,1.0);
}`;

export const shockFragment = `
varying vec2 vShockUv;
varying float vShockAge;
varying float vShockSeed;
varying float vShockGround;
void main(){
  float angle=vShockUv.x*6.28318530718;
  float radial=vShockUv.y;
  float grain=.58+.22*sin(angle*19.0+vShockSeed*31.0)
    +.20*sin(angle*31.0-radial*9.0+vShockSeed*57.0);
  float dust=sin(radial*3.14159265359)*max(.0,grain)*vShockGround;
  float front=(1.0-smoothstep(.045,.13,abs(radial-.84)))
    *(1.0-smoothstep(.10,.48,vShockAge));
  float onset=smoothstep(.0,.07,vShockAge);
  float fade=pow(1.0-vShockAge,1.65)*onset;
  float alpha=(dust*.40+front*.30)*fade;
  if(alpha<.012)discard;
  vec3 color=mix(vec3(.43,.39,.31),vec3(.86,.83,.74),front*.70);
  gl_FragColor=vec4(color,alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function ringGeometry(){
  const geometry=new THREE.InstancedBufferGeometry(),segments=SHOCK_LIMITS.segments;
  const positions=new Float32Array((segments+1)*6),uvs=new Float32Array((segments+1)*4),indices=new Uint16Array(segments*6);
  for(let i=0;i<=segments;i++){
    const angle=i/segments*Math.PI*2;
    for(let edge=0;edge<2;edge++){
      const vertex=i*2+edge;
      positions.set([Math.cos(angle),0,Math.sin(angle)],vertex*3);
      uvs.set([i/segments,edge],vertex*2);
    }
    if(i<segments){const v=i*2;indices.set([v,v+1,v+2,v+2,v+1,v+3],i*6);}
  }
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2));
  geometry.setIndex(new THREE.BufferAttribute(indices,1));geometry.instanceCount=0;
  return geometry;
}

export class ExplosionShockSystem {
  constructor(scene){
    this.scene=scene;this.cursor=0;this.disposed=false;
    this.entries=Array.from({length:SHOCK_LIMITS.capacity},()=>({life:0,x:0,y:0,z:0,radius:0,seed:0,ground:1}));
    const geometry=ringGeometry();this.attributes={};
    for(const [name,size] of [['instancePosition',3],['instanceRadius',1],['instanceAge',1],['instanceSeed',1],['instanceGround',1]]){
      const attribute=new THREE.InstancedBufferAttribute(new Float32Array(SHOCK_LIMITS.capacity*size),size);
      attribute.setUsage(THREE.DynamicDrawUsage);geometry.setAttribute(name,attribute);this.attributes[name]=attribute;
    }
    this.attributeList=Object.values(this.attributes);
    const material=new THREE.ShaderMaterial({vertexShader:shockVertex,fragmentShader:shockFragment,
      transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide,forceSinglePass:true,
      toneMapped:true,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2});
    this.mesh=new THREE.Mesh(geometry,material);this.mesh.frustumCulled=false;this.mesh.renderOrder=2;
    // Keep the empty mesh in shader warmup. An instance count of zero produces
    // no draw and does not upload changing attributes while the pool is idle.
    scene.add(this.mesh);
  }

  add(position,radius=8,groundY=position?.y??0){
    if(this.disposed||![position?.x,position?.y,position?.z].every(Number.isFinite))return false;
    const e=this.entries[this.cursor++%this.entries.length];
    e.life=SHOCK_LIMITS.lifetime;e.x=position.x;e.z=position.z;
    groundY=Number.isFinite(groundY)?groundY:position.y;
    const nearGround=position.y>=groundY-.12&&position.y-groundY<.8;
    e.y=nearGround?groundY+.028:position.y;
    e.ground=nearGround?1:0;
    e.radius=Math.max(2,Math.min(9,Number.isFinite(radius)?radius*.78:6.24));
    e.seed=(this.cursor*.61803398875)%1;
    return true;
  }

  update(dt,quality='medium',eye=null){
    if(this.disposed)return 0;
    dt=Number.isFinite(dt)?Math.max(0,dt):0;
    for(const e of this.entries)if(e.life>0)e.life=Math.max(0,e.life-dt);
    const limit=SHOCK_LIMITS[quality]??SHOCK_LIMITS.medium;
    const range=quality==='low'?28:quality==='medium'?42:60;
    let count=0;
    // Prefer recent fronts when a burst exceeds the selected quality budget.
    for(let offset=1;offset<=this.entries.length&&count<limit;offset++){
      const e=this.entries[((this.cursor-offset)%this.entries.length+this.entries.length)%this.entries.length];
      if(e.life<=0)continue;
      if(eye&&Math.hypot(e.x-eye.x,e.y-eye.y,e.z-eye.z)>range+e.radius)continue;
      this.attributes.instancePosition.setXYZ(count,e.x,e.y,e.z);
      this.attributes.instanceRadius.setX(count,e.radius);
      this.attributes.instanceAge.setX(count,1-e.life/SHOCK_LIMITS.lifetime);
      this.attributes.instanceSeed.setX(count,e.seed);
      this.attributes.instanceGround.setX(count,e.ground);count++;
    }
    this.mesh.geometry.instanceCount=count;
    if(count)for(const attribute of this.attributeList){
      attribute.clearUpdateRanges();attribute.addUpdateRange(0,count*attribute.itemSize);attribute.needsUpdate=true;
    }
    return count;
  }

  clear(){for(const e of this.entries)e.life=0;this.cursor=0;this.mesh.geometry.instanceCount=0;}

  dispose(){
    if(this.disposed)return;this.clear();this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();this.mesh.material.dispose();this.disposed=true;
  }
}
