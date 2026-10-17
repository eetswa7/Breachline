// Turn only thin, ground-level decorative finishes into receiving planes.
// Physics keeps the original blocks. Important raised paths and steps stay 3D.
export function prepareGroundSurfaces(arena){
 for(const p of arena.decor){
  if(p.mesh||p.pitch||p.roll||p.y<0||p.y>.08||p.h>.06||p.w<.04||p.d<.04)continue;
  // Rail heads, sleepers and metal fittings need their shallow 3D silhouette.
  if(!['asphalt','concrete','dirt','white','limestone'].includes(p.surface))continue;
  p.y+=p.h*.5;p.mesh='surface';p.surfaceLayer=p.y<.023?1:p.y<.04?2:3;
 }
 // Cache the handful of thin horizontal finishes in spatial buckets. Contact
 // shadows and ground impacts follow the visible finish without changing physics.
 arena.visualFloorCells=new Map();
 for(const p of arena.decor){
  // Shallow ground puddles receive contacts and impacts on their visible top.
  // Open water below the walkable ground never raises a ground query.
  if((p.surface==='water'&&p.y<0)||p.pitch||p.roll||p.h>.08||p.w<.04||p.d<.04||(p.mesh&&p.mesh!=='surface'))continue;
  const c=Math.cos(p.yaw??0),s=Math.sin(p.yaw??0),w=(Math.abs(c)*p.w+Math.abs(s)*p.d)/2,d=(Math.abs(s)*p.w+Math.abs(c)*p.d)/2;
  const floor={part:p,c,s,top:p.mesh==='surface'?p.y:p.y+p.h/2};
  for(let x=Math.floor((p.x-w)/8);x<=Math.floor((p.x+w)/8);x++)for(let z=Math.floor((p.z-d)/8);z<=Math.floor((p.z+d)/8);z++){
   const key=`${x}/${z}`;if(!arena.visualFloorCells.has(key))arena.visualFloorCells.set(key,[]);arena.visualFloorCells.get(key).push(floor);
  }
 }
}

export function visualGroundHeight(arena,x,z,base=0){
 let height=base;
 for(const f of arena?.visualFloorCells?.get(`${Math.floor(x/8)}/${Math.floor(z/8)}`)??[]){
  if(f.part.destroyed||f.top<=height||f.top>base+.12)continue;
  const dx=x-f.part.x,dz=z-f.part.z;
  if(Math.abs(f.c*dx-f.s*dz)<=f.part.w/2&&Math.abs(f.s*dx+f.c*dz)<=f.part.d/2)height=f.top;
 }
 return height;
}

const NO_SURFACES=[];
// Cosmetic hard particles cross horizontal tops at their own point footprint.
// Re-query support while sliding, so edges and destroyed floors release them.
// The existing collision bucket's 1 m margin covers the short swept travel;
// nearby falls back to the retained block list for travel exceeding that bound.
export function debrisGroundHeight(arena,p,oldX,oldY,oldZ){
 const dx=p.x-oldX,dz=p.z-oldZ,drop=oldY-p.y,minY=p.y-.025-.000001,maxY=oldY-.025+.000001;
 let height=0;
 for(const b of arena?.nearby?.(p,Math.max(Math.abs(dx),Math.abs(dz)))??arena?.blocks??NO_SURFACES){
  const top=b.y+b.h*.5;if(b.destroyed||top<=height||top<minY||top>maxY)continue;
  const t=drop>.000001?Math.max(0,Math.min(1,(oldY-.025-top)/drop)):1,x=oldX+dx*t,z=oldZ+dz*t;
  if(Math.abs(x-b.x)<=b.w*.5&&Math.abs(z-b.z)<=b.d*.5)height=top;
 }
 // A short diagonal can cross two cell boundaries. Visit its swept rectangle
 // (at most four 8 m buckets at current particle speeds and frame-step limits).
 const cells=arena?.visualFloorCells;
 if(cells)for(let z=Math.floor(Math.min(oldZ,p.z)/8);z<=Math.floor(Math.max(oldZ,p.z)/8);z++)for(let x=Math.floor(Math.min(oldX,p.x)/8);x<=Math.floor(Math.max(oldX,p.x)/8);x++){
  for(const f of cells.get(`${x}/${z}`)??NO_SURFACES){
   if(f.part.destroyed||f.top<=height||f.top<minY||f.top>maxY)continue;
   const t=drop>.000001?Math.max(0,Math.min(1,(oldY-.025-f.top)/drop)):1,px=oldX+dx*t-f.part.x,pz=oldZ+dz*t-f.part.z;
   if(Math.abs(f.c*px-f.s*pz)<=f.part.w*.5&&Math.abs(f.s*px+f.c*pz)<=f.part.d*.5)height=f.top;
  }
 }
 return height;
}
