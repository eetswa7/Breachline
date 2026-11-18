import {addZipline} from './traversal.js?v=106';

// Authored combat spaces. Windows are holes in the collision walls, and raised
// routes use the same walkable stairs as the ground navigation grid.
function combatRoom(a,x,z,w,d,h=4.3,surface='plaster',hall=false){
 const door=3.8,window=2.4,sill=1.02,lintel=2.35;
 const wall=(axis,edge,span)=>{
  const along=axis==='x'?'z':'x',centre=along==='x'?x:z,wing=span/2-door/2;
  const box=(at,y,width,height)=>axis==='x'?a.box(edge,y,at,.4,height,width,surface,{aperture:true}):a.box(at,y,edge,width,height,.4,surface,{aperture:true});
  box(centre,h-(h-2.65)/2,door,h-2.65);
  for(const sign of [-1,1]){
   const mid=centre+sign*(span/4+door/4),pier=(wing-window)/2;
   for(const side of [-1,1])box(mid+side*(window/2+pier/2),h/2,pier,h);
   box(mid,sill/2,window,sill);box(mid,lintel+(h-lintel)/2,window,h-lintel);
   const xx=axis==='x'?edge:mid,zz=axis==='z'?edge:mid;
   a.detail(xx,sill+.015,zz,axis==='x'?.57:window+.2,.06,axis==='z'?.57:window+.2,'limestone');
   a.detail(xx,lintel+.025,zz,axis==='x'?.47:window+.16,.10,axis==='z'?.47:window+.16,'steel');
  }
 };
 for(const edge of [x-w/2,x+w/2])wall('x',edge,d);
 for(const edge of [z-d/2,z+d/2])wall('z',edge,w);
 a.box(x,h+.15,z,w+.6,.3,d+.6,surface,{roof:true,room:true});
 a.detail(x,.022,z,w-.45,.035,d-.45,'tiles');
 if(hall){
  // Two overhead service runs light the turbine banks and frame the central aisle.
  for(const dx of [-9,9])for(const dz of [-6.5,0,6.5]){
   a.detail(x+dx,h-1.13,z+dz,1.9,.10,.46,'white',{
    emissive:1.65,lightIntensity:92,lightColor:0xe4ecff
   });
  }
 }else{
  for(const dz of [-d*.25,d*.25])a.detail(x,h-.23,z+dz,.45,.09,1.5,'white',{emissive:1.15});
 }
 // Interior cover keeps the door-to-door firing lane from crossing the whole room.
 for(const sign of [-1,1]){
  a.box(x+sign*w*.28,.49,z-sign*d*.24,2.3,.98,1.2,'wood',{shellThickness:.035});
  a.detail(x+sign*w*.28,1.01,z-sign*d*.24,2.45,.08,1.3,'dark');
 }
}

function car(a,x,z,finish='blue'){
 a.box(x,.58,z,1.85,1.16,4.6,finish,{mesh:'bevel',shellThickness:.004});
 a.detail(x,1.26,z-.1,1.64,.48,2.1,'glass',{mesh:'bevel'});
 a.detail(x,1.51,z-.1,1.7,.11,2.14,finish,{mesh:'bevel'});
 for(const side of [-1,1])for(const axle of [-1.47,1.47]){
  a.detail(x+side*.93,.35,z+axle,.59,.23,.59,'rubber',{mesh:'cylinder',roll:Math.PI/2});
  a.detail(x+side*1.055,.35,z+axle,.33,.035,.33,'steel',{mesh:'cylinder',roll:Math.PI/2});
 }
 for(const side of [-1,1]){
  a.detail(x+side*.60,.72,z-2.32,.42,.18,.035,'white');
  a.detail(x+side*.62,.76,z+2.32,.36,.15,.035,'orange');
 }
}

function bridge(a,x,z,w,d,height){
 a.box(x,height-.18,z,w,.36,d,'concrete',{roof:true,catwalk:true});
 for(const side of [-1,1]){
  a.box(x+side*(w/2-2),height/2-.15,z,.8,height-.3,.8,'concrete');
  a.detail(x+side*(w/2-.16),height+.52,z,.14,1.04,d-.3,'steel');
  a.detail(x+side*(w/2-.16),height+1.03,z,.20,.07,d-.3,'white');
 }
 a.accessSteps(x,z-d/2,4,height,1);a.accessSteps(x,z+d/2,4,height,-1);
 a.detail(x,height+.028,z,w-.3,.04,d-.3,'asphalt');
 for(const offset of [-w*.25,w*.25])a.box(x+offset,height+.43,z+.65,2.2,.86,.8,'concrete');
}

export function buildDistrict(a){
 a.detail(0,.014,0,118,.025,118,'asphalt');
 for(const x of [-22,22])a.detail(x,.044,0,10,.035,116,'asphalt',{color:[.55,.60,.63]});
 a.detail(0,.054,0,116,.045,14,'asphalt',{color:[.55,.60,.63]});
 for(const z of [-37,37])a.detail(0,.065,z,116,.025,7,'tiles');
 for(const x of [-22,22])for(let z=-52;z<=52;z+=7)a.detail(x,.071,z,.18,.025,3,'white');
 for(const x of [-21,21])for(const z of [-22,22])combatRoom(a,x,z,14,18,4.3,x*z>0?'plaster':'limestone');
 for(const [x,z,w,d,h]of [[-43,-33,10,13,14],[43,33,10,13,15],[-43,29,10,14,11],[43,-29,10,14,12],[0,-46,15,9,10],[0,46,15,9,12]])a.building(x,z,w,d,h,'plaster');
 bridge(a,0,0,26,8,3.6);
 for(const [x,z,color]of [[-35,-7,'blue'],[35,8,'rust'],[-35,39,'green'],[35,-39,'white']])car(a,x,z,color);
 for(const [x,z,t]of [[-10,-27,true],[10,27,true],[-39,9,false],[39,-9,false],[-7,33,false],[7,-33,false],[-49,-12,true],[49,12,true]])a.barrier(x,z,t);
 for(const x of [-21,21])for(const z of [-22,22]){
  a.detail(x,4.82,z-5,6,.24,2.3,'dark');
  for(const dx of [-2.6,2.6])a.detail(x+dx,5.38,z-5,.06,1.2,.06,'steel');
  a.detail(x,6.01,z-5,5.8,.15,.16,x<0?'blue':'orange');
  a.detail(x+5.5,.3,z+7,1,.6,1,'rock',{mesh:'rock'});
 }
 // Objective footprints remain clear, including the upper concourse.
 a.objectives=[{name:'A',x:-26,y:0,z:0},{name:'B',x:0,y:3.6,z:0},{name:'C',x:26,y:0,z:0}];
 a.flagBases=[{team:0,x:-43,y:0,z:0},{team:1,x:43,y:0,z:0}];
}

export function buildBlacksite(a){
 a.detail(0,.014,0,114,.025,114,'asphalt');
 combatRoom(a,0,0,34,22,6,'steel',true);
 for(const x of [-31,31])for(const z of [-28,28])a.room(x,z,12,15,4.1,'concrete',true,true);
 for(const x of [-10,10])for(const z of [-5,5]){
  a.box(x,1.15,z,3.2,2.3,3.6,'dark',{mesh:'bevel',turbineBay:true});
  a.detail(x,2.45,z,3.1,.3,3.5,'rust',{mesh:'bevel'});
  for(const y of [.7,1.4,2.1])a.detail(x-1.63,y,z,.05,.09,2.2,'orange');
 }
 for(const x of [-31,31]){
  bridge(a,x,0,10,10,1.5);
  for(const z of [-17,17])a.container(x,z,true,x<0?'blue':'rust');
  for(const z of [-5,5])a.detail(x,5.1,z,.3,23,.3,'steel',{mesh:'cylinder',roll:Math.PI/2});
 }
 for(const [x,z,turn,style]of [[-46,-25,true,'green'],[46,25,true,'rust'],[-18,42,false,'blue'],[18,-42,false,'blue'],[-43,32,false,'rust'],[43,-32,false,'green']])a.container(x,z,turn,style);
 for(const [x,z,t]of [[-20,7,true],[20,-7,true],[-7,-27,false],[7,27,false],[-9,41,true],[9,-41,true],[-45,-4,false],[45,4,false]])a.barrier(x,z,t);
 for(const x of [-45,45])for(const z of [-42,42]){
  a.box(x,2.8,z,5.2,5.6,5.2,'concrete');
  a.detail(x,5.74,z,6,.25,6,'steel');
  a.detail(x,6.3,z,5.2,1.0,5.2,'glass');
  a.detail(x,6.93,z,6,.25,6,'steel');
  a.detail(x,8,z,.08,2,.08,'steel');
 }
 for(const z of [-40,40]){
  a.detail(0,7.5,z,.35,25,.35,'steel',{mesh:'cylinder',roll:Math.PI/2});
  for(const x of [-12,12])a.detail(x,3.7,z,.3,7.4,.3,'orange');
 }
 a.objectives=[{name:'A',x:-31,y:1.5,z:0},{name:'B',x:0,y:0,z:0},{name:'C',x:31,y:1.5,z:0}];
 for(const side of [-1,1])addZipline(a,{x:side*35.7,y:1.5,z:0},{x:side*50,y:0,z:-side*5});
 a.flagBases=[{team:0,x:-44,y:0,z:14},{team:1,x:44,y:0,z:-14}];
}
