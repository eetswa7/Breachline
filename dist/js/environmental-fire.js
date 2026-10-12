import * as THREE from '../vendor/three.module.min.js';

// Fuel barrels already belong to the authored map and explode in the engine.
// This pool provides only their visible aftermath; it adds no gameplay hazard,
// emitter to ordinary grenades, light, texture, shadow or screen-space pass.
export const FIRE_LIMITS=Object.freeze({capacity:6,lifetime:12,fadeSeconds:3,
  low:Object.freeze({fires:2,flames:2,smoke:1,range:26}),
  medium:Object.freeze({fires:4,flames:3,smoke:1,range:38}),
  high:Object.freeze({fires:6,flames:4,smoke:2,range:55}),
  ultra:Object.freeze({fires:6,flames:4,smoke:2,range:55})});
const MAX_QUADS=FIRE_LIMITS.capacity*(FIRE_LIMITS.high.flames+FIRE_LIMITS.high.smoke);

export const fireVertex=`
attribute vec3 instancePosition;
attribute vec2 instanceSize;
attribute float instanceAge;
attribute float instanceSeed;
attribute float instanceAlpha;
attribute float instanceKind;
varying vec2 vFireUv;
varying float vFireAge;
varying float vFireSeed;
varying float vFireAlpha;
varying float vFireKind;
void main(){
  vFireUv=uv;vFireAge=instanceAge;vFireSeed=instanceSeed;
  vFireAlpha=instanceAlpha;vFireKind=instanceKind;
  // Face the view around world Y, retaining an upright flame when the player
  // looks down. This does not turn the flame into a camera-facing round puff.
  vec3 right=vec3(viewMatrix[0][0],0.0,viewMatrix[2][0]);
  right=length(right)>.01?normalize(right):vec3(1.0,0.0,0.0);
  float bend=instanceKind<.5?.11*sin(instanceAge*5.0+instanceSeed*23.0)*uv.y*uv.y:0.0;
  vec3 world=instancePosition+right*(position.x*instanceSize.x+bend)
    +vec3(0.0,position.y*instanceSize.y,0.0);
  gl_Position=projectionMatrix*viewMatrix*vec4(world,1.0);
}`;

export const fireFragment=`
varying vec2 vFireUv;
varying float vFireAge;
varying float vFireSeed;
varying float vFireAlpha;
varying float vFireKind;
void main(){
  vec2 uv=vFireUv;
  float alpha;vec3 color;
  if(vFireKind<.5){
    float y=uv.y;
    float curl=.18*sin(y*8.0-vFireAge*6.0+vFireSeed*31.0)*y
      +.07*sin(y*19.0-vFireAge*9.0+vFireSeed*43.0)*(y+.2);
    float x=uv.x*2.0-1.0+curl;
    float width=pow(max(.0,1.0-y),.77)*(.72+.12*sin(y*12.0-vFireAge*7.0+vFireSeed*19.0));
    float edge=width-abs(x);
    float shape=smoothstep(.0,.11,edge)*smoothstep(.0,.065,y);
    // Rising, irregular tongues share the silhouette rather than spawning
    // bright circles. A cooler orange rim encloses a pale lower hot core.
    float tongues=.78+.22*sin(x*13.0+y*17.0-vFireAge*10.0+vFireSeed*61.0);
    float heat=clamp(edge/max(.05,width),.0,1.0);
    heat=pow(heat,1.2)*(1.0-y*.85);
    color=mix(vec3(1.35,.12,.008),vec3(3.0,1.75,.43),heat);
    alpha=shape*tongues*vFireAlpha;
  }else{
    vec2 p=(uv-.5)*2.0;
    p.x+=.16*sin(p.y*4.0+vFireSeed*17.0);
    float radius=length(p);
    float density=.65+.20*sin(p.x*7.0+p.y*5.0+vFireSeed*23.0)
      +.15*sin(p.x*13.0-p.y*9.0-vFireAge*.7);
    alpha=(1.0-smoothstep(.12,1.0,radius))*max(.0,density)*vFireAlpha;
    color=vec3(.23,.235,.23)*(.82+.18*uv.y);
  }
  if(alpha<.008)discard;
  gl_FragColor=vec4(color,alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class EnvironmentalFireSystem {
  constructor(scene){
    this.scene=scene;this.cursor=0;this.disposed=false;
    this.entries=Array.from({length:FIRE_LIMITS.capacity},()=>({life:0,x:0,y:0,z:0,seed:0}));
    const geometry=new THREE.InstancedBufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array([-.5,0,0,.5,0,0,-.5,1,0,.5,1,0]),3));
    geometry.setAttribute('uv',new THREE.BufferAttribute(new Float32Array([0,0,1,0,0,1,1,1]),2));
    geometry.setIndex([0,1,2,2,1,3]);geometry.instanceCount=0;this.attributes={};
    for(const [name,size] of [['instancePosition',3],['instanceSize',2],['instanceAge',1],['instanceSeed',1],['instanceAlpha',1],['instanceKind',1]]){
      const attribute=new THREE.InstancedBufferAttribute(new Float32Array(MAX_QUADS*size),size);
      attribute.setUsage(THREE.DynamicDrawUsage);geometry.setAttribute(name,attribute);this.attributes[name]=attribute;
    }
    this.attributeList=Object.values(this.attributes);
    const material=new THREE.ShaderMaterial({vertexShader:fireVertex,fragmentShader:fireFragment,
      transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide,forceSinglePass:true,toneMapped:true});
    this.mesh=new THREE.Mesh(geometry,material);this.mesh.frustumCulled=false;this.mesh.renderOrder=3;
    // Zero instances add no draw, while remaining available to shader warmup.
    scene.add(this.mesh);
  }

  add(position,groundY=0){
    if(this.disposed||![position?.x,position?.y,position?.z].every(Number.isFinite))return false;
    const e=this.entries[this.cursor++%this.entries.length];
    e.life=FIRE_LIMITS.lifetime;e.x=position.x;e.z=position.z;
    e.y=(Number.isFinite(groundY)?groundY:0)+.035;
    e.seed=(this.cursor*.61803398875)%1;return true;
  }

  write(index,x,y,z,width,height,age,seed,alpha,kind){
    const a=this.attributes;
    a.instancePosition.setXYZ(index,x,y,z);a.instanceSize.setXY(index,width,height);
    a.instanceAge.setX(index,age);a.instanceSeed.setX(index,seed);
    a.instanceAlpha.setX(index,alpha);a.instanceKind.setX(index,kind);return index+1;
  }

  update(dt,quality='medium',eye=null){
    if(this.disposed)return 0;
    dt=Number.isFinite(dt)?Math.max(0,dt):0;
    for(const e of this.entries)if(e.life>0)e.life=Math.max(0,e.life-dt);
    const budget=FIRE_LIMITS[quality]??FIRE_LIMITS.medium;
    let count=0,fires=0;
    for(let offset=1;offset<=this.entries.length&&fires<budget.fires;offset++){
      const e=this.entries[((this.cursor-offset)%this.entries.length+this.entries.length)%this.entries.length];
      if(e.life<=0)continue;
      if(eye&&Math.hypot(e.x-eye.x,e.y-eye.y,e.z-eye.z)>budget.range)continue;
      fires++;
      const age=FIRE_LIMITS.lifetime-e.life;
      const fade=Math.min(1,age/.16)*Math.min(1,e.life/FIRE_LIMITS.fadeSeconds);
      for(let i=0;i<budget.flames;i++){
        const seed=(e.seed+i*.381966)%1,angle=i*2.399+e.seed*6.28;
        const spread=i===0?0:.12+i*.018;
        const flicker=.88+.07*Math.sin(age*13+seed*37)+.05*Math.sin(age*23+seed*17);
        const height=(i===0?1.45:1.0+seed*.42)*flicker;
        count=this.write(count,e.x+Math.cos(angle)*spread,e.y,e.z+Math.sin(angle)*spread,
          i===0?.70:.48,height,age,seed,fade*(i===0?.86:.68),0);
      }
      for(let i=0;i<budget.smoke;i++){
        const seed=(e.seed+i*.53)%1,phase=(age*.19+i*.53+e.seed*.3)%1;
        const smokeFade=Math.sin(phase*Math.PI)*Math.min(1,age/.8);
        count=this.write(count,e.x+phase*.38+Math.sin(age*.45+seed*23)*.12,
          e.y+.65+phase*1.9,e.z+phase*.16,.55+phase*.65,.85+phase*.60,
          age,seed,fade*smokeFade*.17,1);
      }
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
