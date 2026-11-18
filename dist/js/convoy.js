import {distance} from './math.js?v=101';

const SPEED = 2.4;
export class Convoy {
 constructor(arena,nav){
  const sites=arena.objectives.map(site=>nav.nodes[nav.nearest(site)]??site);
  const approach=nav.path(sites[0],sites[1]);
  this.route=nav.lastReached?[sites[0],...approach,...nav.path(sites[1],sites[2])]:[sites[0],...nav.path(sites[0],sites[2])];
  this.segments=[0];
  for(let i=1;i<this.route.length;i++)this.segments.push(this.segments[i-1]+distance(this.route[i-1],this.route[i]));
  this.length=this.segments.at(-1);
  this.checkpoint=this.segments[Math.floor(this.route.length/2)];
  this.results=[];
  this.reset();
 }
 reset(){
  this.position={...this.route[0]};
  this.progress=0;this.segment=0;this.elapsed=0;this.contested=false;this.escorting=false;this.checkpointReached=false;
 }
 move(dt,engine,attacking){
  const position=this.position,eyes=[0,0];
  for(const actor of engine.actors){
   if(actor.dead||distance(actor,position)>=5||Math.abs(actor.y-position.y)>=2||
      !engine.arena.visible(engine.eye(actor),{x:position.x,y:position.y+.65,z:position.z}))continue;
   eyes[actor.team]++;
  }
  this.contested=eyes[0]>0&&eyes[1]>0;
  this.escorting=eyes[attacking]>0;
  this.elapsed+=dt;
  if(this.contested||!this.escorting||!this.length)return;
  this.progress=Math.min(this.length,this.progress+dt*SPEED*(eyes[attacking]>1?1.25:1));
  while(this.segment<this.route.length-2&&this.segments[this.segment+1]<this.progress)this.segment++;
  const a=this.route[this.segment],b=this.route[this.segment+1];
  const t=(this.progress-this.segments[this.segment])/(this.segments[this.segment+1]-this.segments[this.segment]||1);
  Object.assign(position,{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
 }
}
