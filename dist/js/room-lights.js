import * as THREE from '../vendor/three.module.min.js';

// Three unshadowed bulbs share room bounds. This stops through-wall highlights
// without point-light shadow cubes. Door spill and object shadows remain baked
// approximations in the indirect field, not per-pixel visibility tests.
export class RoomLights {
  constructor(){
    this.bounds={value:Array.from({length:3},()=>new THREE.Vector4(0,0,1e6,1e6))};
    this.ceiling={value:new Float32Array([1e6,1e6,1e6])};
  }
  assign(index,arena,lamp){
    const roof=lamp&&arena.blocks.find(b=>b.roof&&b.room&&!b.destroyed&&
      Math.abs(lamp.x-b.x)<b.w/2&&Math.abs(lamp.z-b.z)<b.d/2&&lamp.y<b.y);
    // room() roofs overhang the wall centre by 0.3 m; wall thickness is 0.4 m.
    if(roof){this.bounds.value[index].set(roof.x,roof.z,roof.w/2-.5,roof.d/2-.5);this.ceiling.value[index]=roof.y-roof.h/2;}
    else{this.bounds.value[index].set(0,0,1e6,1e6);this.ceiling.value[index]=1e6;}
  }
  patch(shader,position='vBreachLightPosition'){
    shader.uniforms.uBreachRoomBounds=this.bounds;shader.uniforms.uBreachRoomCeiling=this.ceiling;
    // The lighting and ground material paths each supply a world position.
    shader.fragmentShader=`uniform vec4 uBreachRoomBounds[3];
      uniform float uBreachRoomCeiling[3];
      float breachRoomLight(vec3 p,vec4 bounds,float ceiling){
        vec2 edge=abs(p.xz-bounds.xy)-bounds.zw;
        vec2 walls=1.0-smoothstep(vec2(.06),vec2(.30),edge);
        return walls.x*walls.y*(1.0-smoothstep(ceiling+.03,ceiling+.12,p.y));
      }
    `+shader.fragmentShader;
    const lights=THREE.ShaderChunk.lights_fragment_begin.replace(
      'getPointLightInfo( pointLight, geometryPosition, directLight );',
      `getPointLightInfo( pointLight, geometryPosition, directLight );
       directLight.color*=breachRoomLight(${position},uBreachRoomBounds[i],uBreachRoomCeiling[i]);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>',lights);
  }
}
