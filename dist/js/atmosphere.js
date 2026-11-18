// Height haze and forward sun scattering in the existing fog stage. No extra
// framebuffer, texture sample or full-screen draw; hero weapons remain clear.
export function patchAtmosphere(shader,sun,haze,hazeColor){
 shader.uniforms.uBreachHazeSun=sun;shader.uniforms.uBreachHaze=haze;shader.uniforms.uBreachHazeColor=hazeColor;
 shader.vertexShader='varying vec3 vBreachHazeWorld; varying float vBreachHazeDensity;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
  vec4 breachHazeWorld=vec4(transformed,1.0);
  #ifdef USE_INSTANCING
  breachHazeWorld=instanceMatrix*breachHazeWorld;
  #endif
  vBreachHazeWorld=(modelMatrix*breachHazeWorld).xyz;
  // Integrate height density per vertex; the interpolated field stays smooth
  // across tall facades without several exponentials per shaded pixel.
  float breachStart=clamp(cameraPosition.y,0.0,100.0);
  float breachEnd=clamp(vBreachHazeWorld.y,0.0,100.0);
  float breachDelta=(breachStart-breachEnd)*.075;
  float breachIntegral=abs(breachDelta)<.01?1.0+breachDelta*.5:(exp(breachDelta)-1.0)/breachDelta;
  vBreachHazeDensity=exp(-breachStart*.075)*breachIntegral;`);
 shader.fragmentShader='varying vec3 vBreachHazeWorld; varying float vBreachHazeDensity; uniform vec3 uBreachHazeSun; uniform float uBreachHaze; uniform vec3 uBreachHazeColor;\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>',`
  #ifdef USE_FOG
   #ifdef FOG_EXP2
   float fogFactor=1.0-exp(-fogDensity*fogDensity*vFogDepth*vFogDepth);
   #else
   float fogFactor=smoothstep(fogNear,fogFar,vFogDepth);
   #endif
   float breachDistance=smoothstep(18.0,120.0,vFogDepth);
   float breachOpticalDepth=uBreachHaze*vBreachHazeDensity*max(0.0,vFogDepth-18.0)*.009;
   float breachVeil=breachOpticalDepth/(1.0+breachOpticalDepth);
   vec3 breachRay=normalize(vBreachHazeWorld-cameraPosition);
   float breachScatter=pow(max(0.0,dot(breachRay,uBreachHazeSun)),8.0)*breachDistance;
   vec3 breachHazeColor=mix(fogColor,uBreachHazeColor,breachScatter*.22);
   gl_FragColor.rgb=mix(gl_FragColor.rgb,breachHazeColor,clamp(fogFactor+breachVeil*(1.0-fogFactor),0.0,1.0));
  #endif`);
}
