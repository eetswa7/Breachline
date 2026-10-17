import * as THREE from '../vendor/three.module.min.js';
import {compose} from './math.js?v=71';
import {boxInterval} from './ballistics.js?v=71';

// Native facades sit just inside their retained broad gameplay collider. Only
// its own glazing may receive a cosmetic contact behind an authoritative stop.
export const GLASS_INSET_LIMITS=Object.freeze({fraction:.08,metres:1.2,tolerance:.003});

// Glazing is often embedded in a native facade rather than a glass collider.
// Recover only flat, blue, smooth dielectric faces from the visible mesh. The
// rectangles are presentation data: they never enter Arena collision/trace.
const nativeFaces=new WeakMap();
function glazingFaces(geometry){
 if(nativeFaces.has(geometry))return nativeFaces.get(geometry);
 const position=geometry.getAttribute('position'),normal=geometry.getAttribute('normal'),colour=geometry.getAttribute('color'),physical=geometry.getAttribute('breachMaterial'),index=geometry.index;
 const groups=new Map();
 if(position&&normal&&colour&&physical&&index)for(let i=0;i<index.count;i+=3){
  const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)];
  if(!ids.every(j=>physical.getX(j)<.23&&physical.getY(j)<.12&&colour.getY(j)>colour.getX(j)*1.12&&colour.getZ(j)>colour.getY(j)*1.05))continue;
  const n=[normal.getX(ids[0]),normal.getY(ids[0]),normal.getZ(ids[0])],axis=n.findIndex(v=>Math.abs(v)>.995);
  if(axis<0)continue;
  const sign=Math.sign(n[axis]),along=[0,1,2].filter(j=>j!==axis),points=ids.map(j=>[position.getX(j),position.getY(j),position.getZ(j)]),plane=points[0][axis];
  if(!points.every(q=>Math.abs(q[axis]-plane)<.0001))continue;
  const rect={axis,sign,plane,u:along[0],v:along[1],minU:Math.min(...points.map(q=>q[along[0]])),maxU:Math.max(...points.map(q=>q[along[0]])),minV:Math.min(...points.map(q=>q[along[1]])),maxV:Math.max(...points.map(q=>q[along[1]]))};
  const key=`${axis}/${sign}/${Math.round(plane*10000)}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(rect);
 }
 const faces=[];
 for(const rectangles of groups.values()){
  // Joined GLB meshes duplicate seam vertices. Merge coplanar triangle bounds,
  // retaining separate windows instead of one facade-sized damage rectangle.
  const merged=[];
  for(const rect of rectangles){let at=rect;
   for(let i=merged.length-1;i>=0;i--){const other=merged[i];
    if(at.minU<=other.maxU+.0001&&at.maxU>=other.minU-.0001&&at.minV<=other.maxV+.0001&&at.maxV>=other.minV-.0001){at={...at,minU:Math.min(at.minU,other.minU),maxU:Math.max(at.maxU,other.maxU),minV:Math.min(at.minV,other.minV),maxV:Math.max(at.maxV,other.maxV)};merged.splice(i,1);}
   }
   merged.push(at);
  }
  faces.push(...merged);
 }
 nativeFaces.set(geometry,faces);return faces;
}

function primitiveFaces(p){
 const dimensions=[p.w,p.h,p.d],axis=dimensions.indexOf(Math.min(...dimensions)),along=[0,1,2].filter(j=>j!==axis);
 if(dimensions[axis]>.2||dimensions[along[0]]<.15||dimensions[along[1]]<.15)return [];
 return [-1,1].map(sign=>({axis,sign,plane:sign*.5,u:along[0],v:along[1],minU:-.5,maxU:.5,minV:-.5,maxV:.5}));
}

export function collectGlassPanels(parts,geometryFor){
 const panels=[],raw=new Float32Array(16),matrix=new THREE.Matrix4(),normalMatrix=new THREE.Matrix3();
 for(const part of parts){
  if(part.destroyed||part.invisible)continue;
  const geometry=geometryFor?.(part),native=geometry?glazingFaces(geometry):[],faces=native.length?native:part.surface==='glass'?primitiveFaces(part):[];
  if(!faces.length)continue;
  compose(raw,part.x,part.y,part.z,part.w,part.h,part.d,part.yaw??0,part.pitch??0,part.roll??0);matrix.fromArray(raw);normalMatrix.getNormalMatrix(matrix);
  for(const face of faces){
   const middle=[0,0,0];middle[face.axis]=face.plane;middle[face.u]=(face.minU+face.maxU)/2;middle[face.v]=(face.minV+face.maxV)/2;
   const centre=new THREE.Vector3(...middle).applyMatrix4(matrix),u=new THREE.Vector3().setComponent(face.u,1).transformDirection(matrix),v=new THREE.Vector3().setComponent(face.v,1).transformDirection(matrix),normal=new THREE.Vector3().setComponent(face.axis,face.sign).applyMatrix3(normalMatrix).normalize();
   const width=(face.maxU-face.minU)*new THREE.Vector3().setComponent(face.u,1).applyMatrix3(new THREE.Matrix3().setFromMatrix4(matrix)).length(),height=(face.maxV-face.minV)*new THREE.Vector3().setComponent(face.v,1).applyMatrix3(new THREE.Matrix3().setFromMatrix4(matrix)).length();
   // Thin bevel/edge faces are not windows. Ignore them after world scaling.
   if(Math.min(width,height)<.12)continue;
   const bounds=new THREE.Box3();for(const a of [-1,1])for(const b of [-1,1])bounds.expandByPoint(centre.clone().addScaledVector(u,width*a/2).addScaledVector(v,height*b/2));
   panels.push({part,centre,u,v,normal,width,height,bounds});
  }
 }
 return panels;
}

export function intersectGlassPanel(panel,start,end,maxT=1){
 if(panel.part.destroyed||panel.part.invisible)return null;
 const dx=end.x-start.x,dy=end.y-start.y,dz=end.z-start.z,denom=dx*panel.normal.x+dy*panel.normal.y+dz*panel.normal.z;
 // Record the entry face only; one shot must not count both sides of a pane.
 if(denom>=-1e-6)return null;
 const x=panel.centre.x-start.x,y=panel.centre.y-start.y,z=panel.centre.z-start.z,t=(x*panel.normal.x+y*panel.normal.y+z*panel.normal.z)/denom;
 if(t<0||t>maxT)return null;
 const px=start.x+dx*t-panel.centre.x,py=start.y+dy*t-panel.centre.y,pz=start.z+dz*t-panel.centre.z,u=px*panel.u.x+py*panel.u.y+pz*panel.u.z,v=px*panel.v.x+py*panel.v.y+pz*panel.v.z;
 return Math.abs(u)<=panel.width/2&&Math.abs(v)<=panel.height/2?{panel,t,u,v}:null;
}

// Eight metre X/Z cells bound work in 20 vs 20 matches. Traversing the actual
// segment avoids testing every window on every facade for each rendered shot.
export class GlassPanelIndex {
 constructor(panels,cellSize=8){this.panels=panels;this.cellSize=cellSize;this.cells=new Map();this.byOwner=new Map();
  for(const panel of panels){const minX=Math.floor((panel.bounds.min.x-.002)/cellSize),maxX=Math.floor((panel.bounds.max.x+.002)/cellSize),minZ=Math.floor((panel.bounds.min.z-.002)/cellSize),maxZ=Math.floor((panel.bounds.max.z+.002)/cellSize);
   for(let x=minX;x<=maxX;x++)for(let z=minZ;z<=maxZ;z++){const key=`${x}/${z}`;if(!this.cells.has(key))this.cells.set(key,[]);this.cells.get(key).push(panel);}
   // Render wrappers inherit the exact collider, including destruction state.
   // A matching position or dimensions never establish ownership.
   for(let owner=panel.part;owner&&owner!==Object.prototype;owner=Object.getPrototypeOf(owner)){
    if(!this.byOwner.has(owner))this.byOwner.set(owner,[]);this.byOwner.get(owner).push(panel);
   }
  }
 }
 trace(start,end,stoppedBlock=null){
  const found=new Set(),size=this.cellSize,dx=end.x-start.x,dz=end.z-start.z,sx=Math.sign(dx),sz=Math.sign(dz);let x=Math.floor(start.x/size),z=Math.floor(start.z/size);
  const endX=Math.floor(end.x/size),endZ=Math.floor(end.z/size),stepX=dx?size/Math.abs(dx):Infinity,stepZ=dz?size/Math.abs(dz):Infinity;
  let nextX=dx?((sx>0?(x+1)*size:x*size)-start.x)/dx:Infinity,nextZ=dz?((sz>0?(z+1)*size:z*size)-start.z)/dz:Infinity;
  for(let step=0;step<128;step++){
   for(const panel of this.cells.get(`${x}/${z}`)??[])found.add(panel);
   if(x===endX&&z===endZ)break;
   if(nextX<nextZ){x+=sx;nextX+=stepX;}else{z+=sz;nextZ+=stepZ;}
  }
  const hits=[...found].map(panel=>intersectGlassPanel(panel,start,end)).filter(Boolean);
  if(stoppedBlock)this.addInsetContacts(hits,start,end,stoppedBlock);
  return hits.sort((a,b)=>a.t-b.t);
 }
 addInsetContacts(hits,start,end,block){
  const candidates=this.byOwner.get(block),{tolerance,fraction,metres}=GLASS_INSET_LIMITS;
  if(!candidates||block.destroyed||block.invisible||![block.x,block.y,block.z,block.w,block.h,block.d].every(Number.isFinite)||Math.min(block.w,block.h,block.d)<=0)return;
  const dx=end.x-start.x,dy=end.y-start.y,dz=end.z-start.z,length=Math.hypot(dx,dy,dz);
  if(length<tolerance)return;
  const dir={x:dx/length,y:dy/length,z:dz/length},interval=boxInterval(start,dir,block);
  // A target hit, penetrated layer or guessed collider must not create a new
  // segment. The original endpoint must be this collider's real entry face.
  if(!interval||Math.abs(interval.entry-length)>tolerance)return;
  let faceAxis='x',faceSign=1,error=Infinity;
  for(const axis of ['x','y','z']){const half=block[axis==='x'?'w':axis==='y'?'h':'d']/2,offset=end[axis]-block[axis],distance=Math.abs(Math.abs(offset)-half);
   if(distance<error){error=distance;faceAxis=axis;faceSign=Math.sign(offset);}
  }
  if(error>tolerance)return;
  const existing=new Set(hits.map(hit=>hit.panel));
  for(const panel of candidates){
   if(existing.has(panel)||panel.normal[faceAxis]*faceSign<.995)continue;
   const normal=panel.normal,depth=Math.abs(normal.x)*block.w+Math.abs(normal.y)*block.h+Math.abs(normal.z)*block.d;
   const inset=normal.x*block.x+normal.y*block.y+normal.z*block.z+depth/2-normal.dot(panel.centre);
   if(inset<0||inset>Math.min(metres,depth*fraction))continue;
   const hit=intersectGlassPanel(panel,start,end,(interval.exit+tolerance)/length);
   if(hit&&hit.t>1){hit.cosmeticInset=true;hits.push(hit);}
  }
 }
}
