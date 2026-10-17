import {rayBox} from './math.js?v=71';

// Static world broadphase. The narrowphase remains the exact gameplay AABB test.
// Ground is tested once; walls, stairs and props are visited along the ray only.
export class RayGrid {
 constructor(blocks,size,cellSize=4){
  this.blocks=blocks;this.count=blocks.length;this.cellSize=cellSize;
  this.ground=[];this.marks=new Uint32Array(blocks.length);this.serial=0;
  let minX=-size,minZ=-size,maxX=size,maxZ=size;
  for(let i=0;i<blocks.length;i++){
   const b=blocks[i];if(b.ground){this.ground.push(i);continue;}
   minX=Math.min(minX,b.x-b.w/2);minZ=Math.min(minZ,b.z-b.d/2);
   maxX=Math.max(maxX,b.x+b.w/2);maxZ=Math.max(maxZ,b.z+b.d/2);
  }
  this.minX=minX-.001;this.minZ=minZ-.001;
  this.width=Math.ceil((maxX-this.minX)/cellSize)+1;
  this.height=Math.ceil((maxZ-this.minZ)/cellSize)+1;
  this.maxX=this.minX+this.width*cellSize;this.maxZ=this.minZ+this.height*cellSize;
  this.cells=Array.from({length:this.width*this.height},()=>[]);
  for(let i=0;i<blocks.length;i++){
   const b=blocks[i];if(b.ground)continue;
   const x0=Math.floor((b.x-b.w/2-this.minX)/cellSize),x1=Math.floor((b.x+b.w/2-this.minX)/cellSize);
   const z0=Math.floor((b.z-b.d/2-this.minZ)/cellSize),z1=Math.floor((b.z+b.d/2-this.minZ)/cellSize);
   for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)this.cells[z*this.width+x].push(i);
  }
 }
 trace(o,d,limit,ignore=null){
  let t=limit,block=null,best=this.count;this.tested=0;
  const test=index=>{
   const b=this.blocks[index];if(b.destroyed||b===ignore)return;
   this.tested++;const hit=rayBox(o,d,b,t);
   // Equal-distance overlaps keep the same ordering as a full array scan.
   if(hit!==null&&(hit<t||block&&hit===t&&index<best)){t=hit;block=b;best=index;}
  };
  for(const index of this.ground)test(index);
  let enter=0,exit=t;
  for(const [origin,delta,min,max]of [[o.x,d.x,this.minX,this.maxX],[o.z,d.z,this.minZ,this.maxZ]]){
   if(Math.abs(delta)<1e-8){if(origin<min||origin>max)return{t,block};}
   else{const a=(min-origin)/delta,b=(max-origin)/delta;enter=Math.max(enter,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));}
  }
  if(enter>exit)return{t,block};
  const cell=this.cellSize,sx=Math.sign(d.x),sz=Math.sign(d.z);
  let x=Math.min(this.width-1,Math.max(0,Math.floor((o.x+d.x*(enter+1e-8)-this.minX)/cell)));
  let z=Math.min(this.height-1,Math.max(0,Math.floor((o.z+d.z*(enter+1e-8)-this.minZ)/cell)));
  const stepX=Math.abs(d.x)>=1e-8?cell/Math.abs(d.x):Infinity,stepZ=Math.abs(d.z)>=1e-8?cell/Math.abs(d.z):Infinity;
  let nextX=Number.isFinite(stepX)?(this.minX+(x+(sx>0?1:0))*cell-o.x)/d.x:Infinity;
  let nextZ=Number.isFinite(stepZ)?(this.minZ+(z+(sz>0?1:0))*cell-o.z)/d.z:Infinity;
  this.serial=(this.serial+1)>>>0;if(!this.serial){this.marks.fill(0);this.serial=1;}
  for(let remaining=this.width+this.height+2;remaining>0;remaining--){
   for(const index of this.cells[z*this.width+x])if(this.marks[index]!==this.serial){this.marks[index]=this.serial;test(index);}
   const boundary=Math.min(nextX,nextZ);
   if(t<boundary-1e-8||boundary>exit||!Number.isFinite(boundary))break;
   // Visit the neighbouring cells at corners too. This preserves exact grazing hits.
   if(nextX<=nextZ){x+=sx;nextX+=stepX;}else{z+=sz;nextZ+=stepZ;}
   if(x<0||z<0||x>=this.width||z>=this.height)break;
  }
  return{t,block};
 }
}
