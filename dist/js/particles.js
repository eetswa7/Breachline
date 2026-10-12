export const billboardVertex = `
attribute vec3 instancePosition;
attribute vec3 instanceTint;
attribute vec2 instanceSize;
attribute float instanceAlpha;
attribute float instanceKind;
varying vec2 vUv; varying vec3 vTint; varying float vAlpha; varying float vKind;
varying float vSpin;
void main() {
  vUv=uv; vTint=instanceTint; vAlpha=instanceAlpha; vKind=floor(instanceKind);
  vSpin=fract(instanceKind)*6.28318530718;
  vec4 centre=modelViewMatrix*vec4(instancePosition,1.0);
  vec2 local=position.xy*instanceSize;
  if(vKind==8.0){
    // World-horizontal blast front: perspective and depth testing keep it
    // attached to the explosion instead of becoming a screen-space halo.
    centre+=viewMatrix*vec4(local.x,0.0,local.y,0.0);
  }else if(vKind==5.0){
    // Rain follows gravity in view space, including when the player looks up.
    vec2 fall=(viewMatrix*vec4(.08,-1.0,0.0,0.0)).xy;
    fall=length(fall)>.03?normalize(fall):vec2(0.0,-1.0);
    centre.xy+=vec2(-fall.y,fall.x)*local.x+fall*local.y;
  }else if(vKind>0.5&&vKind<4.5){
    float c=cos(vSpin),s=sin(vSpin);
    centre.xy+=mat2(c,s,-s,c)*local;
  }else centre.xy+=local;
  gl_Position=projectionMatrix*centre;
}`;
export const billboardFragment = `
uniform sampler2D uBreachEffects;
varying vec2 vUv; varying vec3 vTint; varying float vAlpha; varying float vKind;
varying float vSpin;
void main(){
  vec2 p=vUv*2.0-1.0; float radius=length(p);
  bool spark=vKind>1.5&&vKind<2.5;
  bool casing=vKind>2.5&&vKind<3.5;
  bool chip=vKind>.5&&vKind<1.5;
  bool shard=vKind>3.5&&vKind<4.5;
  bool rain=vKind>4.5&&vKind<5.5;
  bool snow=vKind>5.5&&vKind<6.5;
  bool mote=vKind>6.5&&vKind<7.5;
  bool blast=vKind>7.5&&vKind<8.5;
  bool smoke=vKind<.5;
  float shape;vec3 c=vTint;
  if(blast){
    float edge=max(.016,fwidth(radius));
    shape=smoothstep(.64-edge,.81,radius)*(1.0-smoothstep(.85,1.0+edge,radius));
    // Break the front into soft dust patches without an extra texture tap.
    shape*=.65+.35*sin(p.x*17.0+p.y*11.0)*sin(p.y*19.0-p.x*9.0);
  }else if(rain){
    shape=(1.0-smoothstep(.08,.78,abs(p.x)))*(1.0-smoothstep(.5,1.0,abs(p.y)));
    c*=.75+.25*(1.0-p.y);
  }else if(snow||mote){
    shape=1.0-smoothstep(snow?.13:.0,1.0,radius);
  }else{
    vec2 sampleUv=vUv;
    if(smoke){
      if(radius>1.0)discard;
      float cs=cos(vSpin),sn=sin(vSpin);
      sampleUv=mat2(cs,sn,-sn,cs)*p*.5+.5;
    }
    // Keep filtering within a tile instead of leaking its neighbour's colour.
    vec4 stamp=texture2D(uBreachEffects,clamp(sampleUv,vec2(.004),vec2(.996))*.5+vec2(spark?.5:0.0,.5));
    shape=stamp.a;c*=stamp.rgb;
    if(smoke){
      // The authored density texture shades a soft cloud volume; rotation breaks
      // the identical stamps without another sample, draw or particle layer.
      shape=pow(max(0.0,shape),.72)*(1.0-smoothstep(.83,1.0,radius));
      float volume=sqrt(max(0.0,1.0-radius*radius));
      c*=.72+.28*clamp(volume*.65-p.y*.35+.25,0.0,1.0);
    }
  }
  if(chip||shard){
    float edge=min(.70-abs(p.x+.21*p.y),.69-abs(p.y-.18*p.x));
    edge=min(edge,.79-(p.x*.64+p.y*.77));
    shape=smoothstep(0.0,max(.035,fwidth(edge)),edge);
  }
  if(casing)shape=smoothstep(.0,.09,min(.83-abs(p.x),.72-abs(p.y)));
  float a=shape*vAlpha;
  if(a<.012)discard;
  if(chip||shard)c=vTint*(.58+.42*vUv.y);
  if(casing)c=vTint*(.62+.58*pow(max(0.0,1.0-abs(p.y+.14)),8.0));
  if(spark)c=mix(vTint,vec3(2.8,2.2,1.3),pow(max(0.0,1.0-radius),4.0));
  gl_FragColor=vec4(c,a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// Sparse motes reuse the existing effect draw and only appear by an interior lamp.
export function ambientDust(renderer,count,time){
  const lamp=renderer.nearestLights?.[0];
  if(!lamp||!renderer.weaponLampVisible||!['high','ultra'].includes(renderer.quality)||!renderer.arena?.indoors(renderer.eye))return count;
  const total=renderer.quality==='ultra'?10:6;
  for(let i=0;i<total;i++){
    const phase=i*2.399+time*.11,y=lamp.y-.3-((i*.618+time*.035)%1)*1.8;
    count=renderer.writeBillboard(count,lamp.x+Math.sin(phase)*.8,y,lamp.z+Math.cos(phase*.9)*.8,.012,.012,.7,.59,.4,.28,7);
  }
  return count;
}

// Frostline carries wind-driven snow; Iron Quarry carries dry, low grit.
// Samples stay close to the view so both render paths can share one small,
// deterministic weather field without adding textures or draw passes.
export function weatherParticles(renderer,time=0,pool=null){
  const particles=pool?.active??[];particles.length=0;
  const id=renderer.arena?.info?.id;
  const rain=renderer.arena?.info?.weather==='rain';
  if(id!==8&&id!==9&&id!==12&&!rain)return particles;
  const quality=renderer.quality??'medium',total=rain?(quality==='ultra'?36:quality==='high'?28:quality==='low'?10:18):quality==='ultra'?18:quality==='high'?14:quality==='low'?5:9;
  const eye=renderer.eye??{x:0,y:2,z:0},yaw=Number.isFinite(renderer.weatherYaw)?renderer.weatherYaw:0;
  const pitch=Math.max(-.8,Math.min(.8,Number.isFinite(renderer.weatherPitch)?renderer.weatherPitch:0));
  const sy=Math.sin(yaw),cy=Math.cos(yaw),sp=Math.sin(pitch),cp=Math.cos(pitch),snow=id===8;
  for(let i=0;i<total;i++){
    const depth=5+(i*.61803398875%1)*13;
    const falling=i*.75487766625-time*(rain?1.1:snow?.24:.055),vertical=(falling-Math.floor(falling)-.5)*depth*(rain?.82:snow?.72:.42);
    const wind=(i*.569840291%1-.5)*depth*(snow?.035:.15)+Math.sin(time*(snow?.23:.4)+i*1.7)*depth*(snow?.018:.035);
    const horizontal=(i*.41421356237%1-.5)*depth*1.18+wind;
    const p=pool?.slots[i]??{color:[0,0,0]};
    p.x=eye.x+sy*cp*depth+cy*horizontal-sy*sp*vertical;
    p.y=eye.y+sp*depth+cp*vertical;
    p.z=eye.z-cy*cp*depth+sy*horizontal+cy*sp*vertical;
    p.sizeX=rain?.009:snow?.021:.014;p.sizeY=rain?.31:snow?.085:.031;p.sizeZ=.018;
    p.color[0]=rain?.58:snow?.78:.50;p.color[1]=rain?.74:snow?.87:.34;p.color[2]=rain?.8:snow?.94:.23;
    p.alpha=rain?.25:snow?.34:.18;p.kind=rain?5:snow?6:7;p.yaw=rain?-.12:snow?Math.atan2(wind,-.55):0;
    if(renderer.arena?.indoors?.(p))continue;
    particles.push(p);
  }
  return particles;
}
