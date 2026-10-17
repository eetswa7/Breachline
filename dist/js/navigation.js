import {distance} from './math.js?v=71';
// A small layered navigation grid includes room floors and reachable stairs/terraces.
// Connectivity is baked once per match; A* runs at most once per bot per second.
export class Navigation {
 constructor(arena){
  this.arena=arena;this.step=arena.info.navigationStep??1.25;this.size=arena.info.size;this.n=Math.ceil(this.size*2/this.step);this.cells=Array.from({length:this.n*this.n},()=>[]);this.nodes=[];
  for(let iz=1;iz<this.n-1;iz++)for(let ix=1;ix<this.n-1;ix++){
   const x=-this.size+(ix+.5)*this.step,z=-this.size+(iz+.5)*this.step,levels=[0];
   for(const b of arena.nearby({x,y:0,z})){let top=b.y+b.h/2;if(top>.1&&top<=4.8&&Math.abs(x-b.x)<b.w/2&&Math.abs(z-b.z)<b.d/2)levels.push(top);}
   for(const y of [...new Set(levels)])if(!arena.collides({x,y:y+.04,z},.34,1.75)){const id=this.nodes.length;this.nodes.push({x,y,z,id,ix,iz,links:[]});this.cells[iz*this.n+ix].push(id);}
  }
  for(const node of this.nodes)for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
   const ix=node.ix+dx,iz=node.iz+dz;if(ix<0||ix>=this.n||iz<0||iz>=this.n)continue;
   for(const id of this.cells[iz*this.n+ix]){let to=this.nodes[id];if(Math.abs(to.y-node.y)>.36)continue;
    if(dx&&dz&&(arena.collides({x:node.x,y:Math.max(node.y,to.y)+.05,z:to.z},.34,1.75)||arena.collides({x:to.x,y:Math.max(node.y,to.y)+.05,z:node.z},.34,1.75)))continue;
    if(this.walkable(node,to))node.links.push(id);
   }
  }
  this.g=new Float32Array(this.nodes.length);this.previous=new Int32Array(this.nodes.length);this.closed=new Uint32Array(this.nodes.length);this.seen=new Uint32Array(this.nodes.length);this.searchId=0;
  this.heapIds=new Int32Array(Math.max(64,this.nodes.length*2));this.heapScores=new Float64Array(this.heapIds.length);this.heapSize=0;
 }
 // Sweep a standing capsule along each edge, including intermediate step heights.
 walkable(from,to){
  const length=Math.hypot(to.x-from.x,to.z-from.z),steps=Math.max(1,Math.ceil(length/.25));
  let y=from.y;const p={x:from.x,y,z:from.z};
  for(let i=1;i<=steps;i++){const t=i/steps;p.x=from.x+(to.x-from.x)*t;p.z=from.z+(to.z-from.z)*t;
   const floor=this.arena.floorAt(p,y+.36);if(floor<y-.37)return false;y=floor;p.y=y+.04;
   if(this.arena.collides(p,.34,1.75))return false;
  }
  return Math.abs(y-to.y)<.12;
 }
 nearest(p){let best=-1,cost=Infinity,ix=Math.floor((p.x+this.size)/this.step),iz=Math.floor((p.z+this.size)/this.step);for(let r=0;r<=5;r++){
  for(let z=Math.max(0,iz-r);z<=Math.min(this.n-1,iz+r);z++)for(let x=Math.max(0,ix-r);x<=Math.min(this.n-1,ix+r);x++)for(const id of this.cells[z*this.n+x]){const n=this.nodes[id],d=distance(p,n)+Math.abs(n.y-p.y)*3;if(d<cost){cost=d;best=id;}}
  // An occupied cell may offer only a roof node even while clear ground is one
  // cell away. Keep expanding until the best height-aware candidate is closer
  // than every unseen cell's horizontal lower bound.
  if(best>=0&&cost<(r+.5)*this.step)break;
 }return best;}
 pushNode(id,score){
  if(this.heapSize===this.heapIds.length){const ids=new Int32Array(this.heapSize*2),scores=new Float64Array(ids.length);ids.set(this.heapIds);scores.set(this.heapScores);this.heapIds=ids;this.heapScores=scores;}
  let i=this.heapSize++;
  while(i){const p=(i-1)>>1;if(this.heapScores[p]<=score)break;this.heapIds[i]=this.heapIds[p];this.heapScores[i]=this.heapScores[p];i=p;}
  this.heapIds[i]=id;this.heapScores[i]=score;
 }
 popNode(){
  const id=this.heapIds[0],size=--this.heapSize,lastId=this.heapIds[size],lastScore=this.heapScores[size];let i=0;
  while(i*2+1<size){let child=i*2+1;if(child+1<size&&this.heapScores[child+1]<this.heapScores[child])child++;if(this.heapScores[child]>=lastScore)break;this.heapIds[i]=this.heapIds[child];this.heapScores[i]=this.heapScores[child];i=child;}
  if(size){this.heapIds[i]=lastId;this.heapScores[i]=lastScore;}return id;
 }
 path(from,to){
  const start=this.nearest(from),goal=this.nearest(to);if(start<0||goal<0)return[];
  let search=this.searchId=(this.searchId+1)>>>0;if(!search){this.closed.fill(0);this.seen.fill(0);search=this.searchId=1;}
  this.heapSize=0;this.g[start]=0;this.previous[start]=-1;this.seen[start]=search;
  this.pushNode(start,0);let reached=start,best=distance(from,to),count=0;
  while(this.heapSize&&count<5000){const id=this.popNode();if(this.closed[id]===search)continue;count++;this.closed[id]=search;const n=this.nodes[id],h=distance(n,this.nodes[goal]);if(h<best){best=h;reached=id;}if(id===goal){reached=id;break;}
    for(const next of n.links){if(this.closed[next]===search)continue;let t=this.g[id]+distance(n,this.nodes[next])+Math.abs(n.y-this.nodes[next].y);if(this.seen[next]!==search||t<this.g[next]){this.seen[next]=search;this.g[next]=t;this.previous[next]=id;const q=this.nodes[next],end=this.nodes[goal];this.pushNode(next,t+distance(q,end)*1.15+Math.abs(q.y-end.y));}}
  }
  this.lastExpanded=count;this.lastReached=reached===goal;
  const path=[];for(let id=reached;id!==start&&id!==-1;id=this.previous[id])path.push(this.nodes[id]);return path.reverse();
 }
}
