// Render-only occlusion. One closed wall must cover the entire actor envelope;
// disconnected ray hits never count as coverage of an opening.
// The authored wall retains its closed (1, 1, .82) structural core at both LODs.
const WALL_CORE = [.94, .94, .76];
const EPSILON = .00001;

export function actorEnvelopeRadius(actor){return actor.dead ? 2.5 : 2;}

// All eight vertices are behind the same face and project inside its rectangle.
// Perspective projection of that convex box is then contained by the rectangle.
export function wallOccludesBox(wall,eye,minX,minY,minZ,maxX,maxY,maxZ){
 const axis=wall.axis,origin=axis==='x'?eye.x:eye.z;
 const low=axis==='x'?wall.minX:wall.minZ,high=axis==='x'?wall.maxX:wall.maxZ;
 // A camera beside/inside the wall never uses it as an occluder.
 const side=origin<low-.5?-1:origin>high+.5?1:0;
 if(!side)return false;
 const plane=side<0?low:high;
 const nearest=side<0?(axis==='x'?minX:minZ):(axis==='x'?maxX:maxZ);
 if(side<0?nearest<=plane+EPSILON:nearest>=plane-EPSILON)return false;
 for(let corner=0;corner<8;corner++){
  const x=corner&1?maxX:minX,y=corner&2?maxY:minY,z=corner&4?maxZ:minZ;
  const endpoint=axis==='x'?x:z,t=(plane-origin)/(endpoint-origin);
  const along=axis==='x'?eye.z+(z-eye.z)*t:eye.x+(x-eye.x)*t;
  const vertical=eye.y+(y-eye.y)*t;
  const alongLow=axis==='x'?wall.minZ:wall.minX,alongHigh=axis==='x'?wall.maxZ:wall.maxX;
  if(along<=alongLow+EPSILON||along>=alongHigh-EPSILON||vertical<=wall.minY+EPSILON||vertical>=wall.maxY-EPSILON)return false;
 }
 return true;
}

export class SolidWallOcclusion {
 constructor(batches){
  this.walls=[];const seen=new Set();
  for(const batch of batches){
   // Only this known closed native mesh is trusted. Facades, cargo, vehicles,
   // barriers, fences, glazing and reveal/door frames can contain real holes.
   if(batch.geometry.name!=='wall__near'&&batch.geometry.name!=='wall__far')continue;
   const material=batch.material;
   if(!material||material.transparent||material.opacity<1||material.alphaTest>0||material.wireframe)continue;
   for(const p of batch.userData.parts??[]){
    if(seen.has(p))continue;seen.add(p);
    if(p.invisible||p.breakable||p.fence||p.ground||p.roof||p.renderMicroDetail||p.blenderWind||p.yaw||p.pitch||p.roll||p.surface==='glass'||p.surface==='water')continue;
    const hw=p.w*WALL_CORE[0]/2,hh=p.h*WALL_CORE[1]/2,hd=p.d*WALL_CORE[2]/2;
    if(![p.x,p.y,p.z,hw,hh,hd].every(Number.isFinite)||Math.min(hw,hh,hd)<=0)continue;
    this.walls.push({part:p,axis:p.w<p.d?'x':'z',minX:p.x-hw,maxX:p.x+hw,
     minY:p.y-hh,maxY:p.y+hh,minZ:p.z-hd,maxZ:p.z+hd});
   }
  }
 }
 hidden(actor,eye){
  const radius=actorEnvelopeRadius(actor),x=actor.x,y=actor.y+.9,z=actor.z;
  for(const wall of this.walls){
   if(wall.part.destroyed||wall.part.invisible)continue;
   if(wallOccludesBox(wall,eye,x-radius,y-radius,z-radius,x+radius,y+radius,z+radius))return true;
  }
  return false;
 }
}

// Keep the original buffers on every shadow-refresh frame. Hidden operators
// can cast sunlight onto a visible floor; camera occlusion cannot remove that.
export function shadowUpdatePending(renderer,dt,hz){
 const shadow=renderer.renderer?.shadowMap;
 if(!shadow?.enabled)return false;
 if(shadow.autoUpdate||shadow.needsUpdate||renderer.sun?.shadow.needsUpdate)return true;
 return !!hz&&(renderer.shadowClock??1)+dt>=1/hz;
}
