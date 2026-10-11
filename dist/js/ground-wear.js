// Authored Blacksite surface finishing. The shipped native two-triangle surface
// and its metre-scaled concrete/asphalt PBR maps retain their original detail.
// Coordinates are in metres, matching production-world's construction slabs.
// No extra samplers, transparent layers, render targets or per-frame work.
export function patchGroundWear(shader,part){
 const kind=part.productionGroundWear;
 if(!kind)return;
 shader.fragmentShader=`
float breachWearHash(vec2 p){
 vec3 h=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));
 h+=dot(h,h.yzx+33.33);return fract((h.x+h.y)*h.z);
}
float breachWearNoise(vec2 p){
 vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
 return mix(mix(breachWearHash(i),breachWearHash(i+vec2(1,0)),f.x),
  mix(breachWearHash(i+vec2(0,1)),breachWearHash(i+vec2(1,1)),f.x),f.y);
}
float breachWearLine(vec2 p,vec2 a,vec2 b){
 vec2 d=b-a,q=p-a-d*clamp(dot(p-a,d)/dot(d,d),0.0,1.0);return dot(q,q);
}
`+shader.fragmentShader;
 const concrete=kind==='apron'||kind==='approach'||kind==='concrete';
 const paint=kind==='paint';
 // The two service approaches carry an asymmetric vehicle turn into the hall.
 // Broken bands retain the underlying PBR detail instead of covering it with
 // an opaque flat decal; tread and fade scales stay readable at player height.
 const finish=`
 vec2 wearPos=vBreachSurface.xz;
 float wearZ=abs(wearPos.y);
 float broadWear=breachWearNoise(wearPos*.19+vec2(6.7,14.2));
 // Fine breakup reuses the albedo fetch already owned by the PBR material.
 // Only the broad dirt distribution evaluates interpolated value noise.
 float grainWear=.5;
 #ifdef USE_MAP
 grainWear=clamp(dot(sampledDiffuseColor.rgb,vec3(.28,.58,.14))*2.1,0.0,1.0);
 #endif
 float tireCentre=-3.9+6.2*smoothstep(17.0,33.0,wearZ);
 float tireDistance=abs(abs(wearPos.x-tireCentre)-.86);
 float tireFade=smoothstep(11.8,14.0,wearZ)*(1.0-smoothstep(31.0,35.0,wearZ));
 float tireBand=(1.0-smoothstep(.12,.25,tireDistance))*tireFade;
 float tireBroken=smoothstep(.12,.52,grainWear)*(.65+.35*smoothstep(.17,.48,fract(wearZ*3.6+wearPos.x*.7)));
 ${paint?`
  // Worn paint reveals the existing concrete albedo already sampled above.
  float paintCoverage=smoothstep(.24,.47,grainWear)*(.67+.33*broadWear);
  #ifdef USE_MAP
  diffuseColor.rgb=mix(sampledDiffuseColor.rgb*.70,diffuseColor.rgb,paintCoverage);
  #endif
 `:concrete?`
  float crack=min(breachWearLine(wearPos,vec2(-12.8,18.9),vec2(-12.35,18.0)),
   breachWearLine(wearPos,vec2(-12.35,18.0),vec2(-11.95,17.4)));
  crack=min(crack,breachWearLine(wearPos,vec2(-11.95,17.4),vec2(-12.2,16.7)));
  crack=min(crack,breachWearLine(wearPos,vec2(-12.35,18.0),vec2(-11.55,18.2)));
  vec2 mirroredWear=vec2(wearPos.x,wearZ);
  crack=min(crack,breachWearLine(mirroredWear,vec2(2.5,26.7),vec2(3.6,25.8)));
  crack=min(crack,breachWearLine(mirroredWear,vec2(3.6,25.8),vec2(3.45,25.0)));
  crack=min(crack,breachWearLine(mirroredWear,vec2(3.45,25.0),vec2(4.1,24.4)));
  float crackInk=(1.0-smoothstep(.000081,.000676,crack))*(.65+.35*grainWear);
  float crackDust=1.0-smoothstep(.001225,.04,crack);
  ${kind==='apron'?`
   vec2 slab=mod(vec2(wearPos.x+17.0,wearZ-12.1),vec2(8.5,4.1));
   float jointDistance=min(min(slab.x,8.5-slab.x),min(slab.y,4.1-slab.y));
  `:kind==='approach'?`
   float approachJoint=mod(wearZ-20.3,5.85);
   float jointDistance=min(approachJoint,5.85-approachJoint);
  `:`float jointDistance=1.0;`}
  float jointGrime=(1.0-smoothstep(.014,.115,jointDistance))*(.45+.55*broadWear);
  // Wide, interrupted dirt wash settles at slab edges and along the drains.
  float hallEdge=1.0-smoothstep(.15,.85,abs(wearZ-12.1));
  float apronEdge=1.0-smoothstep(.08,.78,abs(abs(wearPos.x)-16.95));
  float edgeSilt=max(hallEdge,apronEdge)*smoothstep(.22,.62,broadWear)*.16;
  diffuseColor.rgb*=.97+broadWear*.09;
  diffuseColor.rgb*=1.0-tireBand*tireBroken*.27-jointGrime*.26-crackInk*.49;
  diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.72,.68,.60),edgeSilt+crackDust*.07);
 `:kind==='asphalt'?`
  // Age and repair variation sit beneath traffic stains. Long road wear is
  // deliberately broad; the native asphalt map keeps its aggregate grain.
  float apronBoundary=min(abs(abs(wearPos.x)-17.0),abs(wearZ-20.3));
  float shoulder=(1.0-smoothstep(.05,.80,apronBoundary))*(.4+.6*broadWear);
  vec2 oilA=(wearPos-vec2(23.3,4.1))/vec2(1.35,2.1),oilB=(wearPos-vec2(-22.5,-6.8))/vec2(1.8,1.0);
  float oil=max(1.0-smoothstep(.0,1.0,dot(oilA,oilA)),1.0-smoothstep(.0,1.0,dot(oilB,oilB)));
  diffuseColor.rgb*=.91+.17*broadWear;
  diffuseColor.rgb*=1.0-tireBand*tireBroken*.21-oil*grainWear*.24;
  diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.11,1.065,.95),shoulder*.3);
 `:`
  // Compacted wheel paths and dusty margins temper uniform gravel shoulders.
  diffuseColor.rgb*=.86+.21*broadWear;
 `}
 `;
 shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\n${finish}`);
 // Existing packed roughness is preserved. A bounded traffic polish is only
 // added where the authored tyre route actually reaches this horizontal finish.
 shader.fragmentShader=shader.fragmentShader.replace('#include <metalnessmap_fragment>',`#include <metalnessmap_fragment>
  roughnessFactor=clamp(roughnessFactor-tireBand*tireFade*.055,.54,1.0);
 `);
}
