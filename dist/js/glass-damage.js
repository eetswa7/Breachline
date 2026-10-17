import * as THREE from '../vendor/three.module.min.js';
import {collectGlassPanels,GlassPanelIndex} from './glass-panels.js?v=71';

export const GLASS_DAMAGE_BUDGET={panels:24,stampsPerPanel:2,maxRadius:.58};

// Progressive visual damage retains the original intact pane and collision.
// One opaque alpha-tested batch, at most 48 small quads, no texture/pass/shadow.
export class GlassDamageSystem {
 constructor(scene,capacity=GLASS_DAMAGE_BUDGET.panels){
  this.scene=scene;this.capacity=capacity;this.states=new Map();this.serial=0;this.dirty=false;this.panels=[];this.index=new GlassPanelIndex([]);
  const material=new THREE.MeshBasicMaterial({color:0xc6d7da,alphaTest:.28,alphaToCoverage:true,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,toneMapped:false});
  material.onBeforeCompile=shader=>{
   shader.vertexShader='attribute vec4 glassClip; attribute vec2 glassShape; varying vec2 vGlassUv; varying vec4 vGlassClip; varying vec2 vGlassShape;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvGlassUv=uv;vGlassClip=glassClip;vGlassShape=glassShape;');
   shader.fragmentShader='varying vec2 vGlassUv; varying vec4 vGlassClip; varying vec2 vGlassShape;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>',`
    if(vGlassUv.x<vGlassClip.x||vGlassUv.x>vGlassClip.y||vGlassUv.y<vGlassClip.z||vGlassUv.y>vGlassClip.w)discard;
    vec2 p=(vGlassUv-.5)*2.0;float r=length(p),angle=atan(p.y,p.x+.00001),seed=vGlassShape.y;
    float endRadius=.68+.13*sin(angle*3.0+seed)+.09*cos(angle*7.0-seed);
    float taper=1.0-smoothstep(endRadius-.14,endRadius,r);
    float ray=abs(sin(angle*5.0+seed+.09*sin(r*13.0+seed)))*r;
    float mainCrack=(1.0-smoothstep(.005,.015,ray))*taper;
    float branch=abs(sin(angle*9.0-seed+r*4.0))*.13;
    float branchCrack=(1.0-smoothstep(.003,.009,branch))*smoothstep(.18,.3,r)*(1.0-smoothstep(.42,.68,r));
    float rim=abs(r-(.23+.035*sin(angle*7.0+seed)));
    float ring=(1.0-smoothstep(.005,.014,rim))*(.35+.65*smoothstep(1.0,4.0,vGlassShape.x));
    float chip=(1.0-smoothstep(.035,.075,r))*(.65+.35*sin(angle*7.0+seed));
    float crack=max(max(mainCrack,branchCrack*.78),max(ring*.8,chip));
    diffuseColor.a*=crack;diffuseColor.rgb*=.57+.43*smoothstep(.004,.013,ray);
    #include <alphatest_fragment>`);
  };
  material.customProgramCacheKey=()=> 'progressive-glass-fracture-v1';
  const geometry=new THREE.PlaneGeometry(1,1),count=capacity*GLASS_DAMAGE_BUDGET.stampsPerPanel;
  this.clips=new THREE.InstancedBufferAttribute(new Float32Array(count*4),4);this.shapes=new THREE.InstancedBufferAttribute(new Float32Array(count*2),2);
  this.clips.setUsage(THREE.DynamicDrawUsage);this.shapes.setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('glassClip',this.clips);geometry.setAttribute('glassShape',this.shapes);
  this.mesh=new THREE.InstancedMesh(geometry,material,count);this.mesh.count=0;this.mesh.frustumCulled=false;this.mesh.renderOrder=2;this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(this.mesh);
  this.matrix=new THREE.Matrix4();
 }
 setPanels(parts,geometryFor){this.clear();this.panels=collectGlassPanels(parts,geometryFor);this.index=new GlassPanelIndex(this.panels);}
 shot(event){
  const start=event.position,end=event.end;
  if(!start||!end||![start.x,start.y,start.z,end.x,end.y,end.z].every(Number.isFinite))return [];
  // Direct contacts follow the actual segment. Inset native facade contacts
  // additionally require the exact authoritative stopped collider as owner.
  const contacts=this.index.trace(start,end,event.stoppedBlock);
  for(const hit of contacts.slice(0,4))this.damage(hit);
  return contacts;
 }
 damage(hit){
  const {panel,u,v}=hit;if(panel.part.destroyed||panel.part.invisible)return;
  let state=this.states.get(panel);
  if(!state){
   if(this.states.size>=this.capacity){let oldest;for(const entry of this.states.values())if(!oldest||entry.serial<oldest.serial)oldest=entry;this.states.delete(oldest.panel);}
   state={panel,hits:0,marks:[],serial:0};this.states.set(panel,state);
  }
  state.hits=Math.min(6,state.hits+1);state.serial=++this.serial;
  if(state.marks.length<GLASS_DAMAGE_BUDGET.stampsPerPanel&&!state.marks.some(m=>(m.u-u)**2+(m.v-v)**2<.012)){state.marks.push({u,v,seed:(this.serial*.61803398875%1)*Math.PI*2});}
  this.dirty=true;
 }
 update(){
  for(const [panel]of this.states)if(panel.part.destroyed||panel.part.invisible){this.states.delete(panel);this.dirty=true;}
  if(!this.dirty)return;
  let count=0;
  for(const state of this.states.values()){
   const panel=state.panel,radius=Math.min(GLASS_DAMAGE_BUDGET.maxRadius,.14+state.hits*.065),diameter=radius*2;
   for(const mark of state.marks){
    const centre=panel.centre.clone().addScaledVector(panel.u,mark.u).addScaledVector(panel.v,mark.v).addScaledVector(panel.normal,.0025);
    this.matrix.makeBasis(panel.u,panel.v,panel.normal).scale(new THREE.Vector3(diameter,diameter,1)).setPosition(centre);this.mesh.setMatrixAt(count,this.matrix);
    this.clips.setXYZW(count,(-panel.width/2-mark.u)/diameter+.5,(panel.width/2-mark.u)/diameter+.5,(-panel.height/2-mark.v)/diameter+.5,(panel.height/2-mark.v)/diameter+.5);
    this.shapes.setXY(count,state.hits,mark.seed);count++;
   }
  }
  this.mesh.count=count;
  if(count){this.mesh.instanceMatrix.clearUpdateRanges();this.mesh.instanceMatrix.addUpdateRange(0,count*16);this.mesh.instanceMatrix.needsUpdate=true;
   for(const attribute of [this.clips,this.shapes]){attribute.clearUpdateRanges();attribute.addUpdateRange(0,count*attribute.itemSize);attribute.needsUpdate=true;}
  }
  this.dirty=false;
 }
 clear(){this.states.clear();this.mesh.count=0;this.dirty=false;this.serial=0;}
 dispose(){this.scene.remove(this.mesh);this.mesh.geometry.dispose();this.mesh.material.dispose();this.mesh.dispose();}
}
