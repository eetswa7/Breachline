// Classic Nuketown layout rebuilt with Breachline's shared Blender geometry.
// North: turquoise house. South: yellow house. West: pink cul-de-sac house.
const PAINT={green:[.19,.72,.55],yellow:[1,.73,.24],pink:[.86,.51,.58]};
const DETAIL={mesh:'bevel',tile:-1};

function wall(a,axis,x,z,span,y,height,openings,color,face=1){
 const thick=.26,draw=(at,centre,w,h)=>{
  if(w<=.01||h<=.01)return;
  const b=axis==='z'?a.box(x+at,centre,z,w,h,thick,'plaster',{color,tile:-1,aperture:true,house:true}):a.box(x,centre,z+at,thick,h,w,'plaster',{color,tile:-1,aperture:true,house:true});
  if(w>1.7&&h>1.3)for(let sy=centre-h/2+.30;sy<centre+h/2-.1;sy+=.45)a.detail(axis==='z'?x+at:x+face*.15,sy,axis==='x'?z+at:z+face*.15,axis==='z'?w:.04,.032,axis==='x'?w:.04,'plaster',{color:color.map(v=>v*.82),tile:-1});
  return b;
 };
 let edge=-span/2;
 for(const p of openings.sort((a,b)=>a.at-b.at)){
  draw((edge+p.at-p.width/2)/2,y+height/2,p.at-p.width/2-edge,height);
  draw(p.at,y+p.bottom/2,p.width,p.bottom);
  draw(p.at,y+(p.top+height)/2,p.width,height-p.top);
  const xx=axis==='z'?x+p.at:x,zz=axis==='x'?z+p.at:z;
  if(p.bottom>0){
   a.detail(xx,y+p.bottom-.035,zz,axis==='z'?p.width+.22:.38,.11,axis==='x'?p.width+.22:.38,'white',DETAIL);
   for(const side of [-1,1])a.detail(axis==='z'?xx+side*(p.width/2+.05):xx,y+(p.bottom+p.top)/2,axis==='x'?zz+side*(p.width/2+.05):zz,axis==='z'?.11:.33,p.top-p.bottom+.18,axis==='x'?.11:.33,'white',DETAIL);
  }
  a.detail(xx,y+p.top+.04,zz,axis==='z'?p.width+.2:.33,.10,axis==='x'?p.width+.2:.33,'white',DETAIL);
  edge=p.at+p.width/2;
 }
 draw((edge+span/2)/2,y+height/2,span/2-edge,height);
}

function roof(a,x,z,w,d,y){
 a.box(x,y-.1,z,w+.4,.2,d+.4,'dark',{roof:true,room:true,house:true});
 for(const side of [-1,1])a.detail(x+side*w*.25,y+.6,z,w*.54,.16,d+.85,'asphalt',{roll:-side*.24,color:[.30,.32,.31],roofTrim:true});
 a.detail(x,y+1.25,z,.18,.10,d+.85,'white',DETAIL);
 for(const side of [-1,1])for(let i=0;i<7;i++){const yy=.12+i*.17;a.detail(x,y+yy,z+side*(d/2+.10),w*(1-yy/1.35),.19,.14,'white',DETAIL);}
}

function fence(a,x,z,w,d,height=1.75){
 const span=String(Math.max(w,d)).replace('.','_'),axis=w>d?'x':'z';
 a.box(x,height/2,z,w,height,d,'wood',{shellThickness:.04,fence:true,spawnScreen:height>=1.7,
  blenderKind:`house_privacy_fence_${span}_${axis}`});
 a.detail(x,height+.02,z,w+.05,.08,d+.05,'white',DETAIL);
 const length=Math.max(w,d),count=Math.ceil(length/2.5);
 for(let i=0;i<=count;i++)a.detail(x+(w>d?(i/count-.5)*w:0),height*.5,z+(d>w?(i/count-.5)*d:0),.12,height+.15,.12,'white',DETAIL);
}

function furniture(a,x,z,front,upper=false){
 const y=upper?3:0;
 if(upper){
  a.box(x-2,y+.3,z+.8,2,.6,3.4,'wood',{shellThickness:.025,blenderKind:'house_bed_plinth'});
  a.detail(x-2,y+.66,z+.8,2,.13,3.4,'fabric',{color:[.88,.71,.61],mesh:'bevel'});
  a.detail(x-2,y+.79,z+front*.1,1.6,.18,.6,'white',{mesh:'bevel'});
  a.box(x+1.6,y+.43,z+front*2.9,1.4,.86,.7,'wood',{shellThickness:.025,
   blenderKind:front>0?'house_storage_cabinet':'house_storage_cabinet_back'});
  a.detail(x+1.6,y+.91,z+front*2.9,1.6,.08,.8,'dark',DETAIL);
  return;
 }
 a.box(x-1.65,.42,z+front*2,2.3,.84,1.05,'fabric',{mesh:'bevel',shellThickness:.025,color:[.54,.37,.30]});
 a.detail(x-1.65,.91,z+front*2.4,2.3,.75,.22,'fabric',{mesh:'bevel',color:[.54,.37,.30]});
 a.box(x-1.55,.24,z,.95,.48,.8,'wood',{shellThickness:.025,
  blenderKind:front>0?'house_storage_cabinet':'house_storage_cabinet_back'});
 a.box(x-3.5,.5,z-front*2.75,1.25,1,1.6,'white',{shellThickness:.025,
  blenderKind:front>0?'house_storage_cabinet_back':'house_storage_cabinet'});
 a.detail(x-3.5,1.04,z-front*2.75,1.3,.08,1.7,'dark',DETAIL);
 a.detail(x-3.5,1.02,z-front*3.25,.65,.035,.42,'steel',DETAIL);
}

function house(a,x,z,front,kind){
 const w=10,d=10,paint=PAINT[kind],rear=-front,garageSide=-front;
 // White weatherboard corners and two genuine floors with open windows.
 for(const level of [0,3]){
  wall(a,'z',x,z+front*d/2,w,level,3,level?[{at:0,width:3.4,bottom:.78,top:2.55}]:[{at:-1.8,width:2.2,bottom:0,top:2.6},{at:2,width:2.2,bottom:.9,top:2.3}],paint,front);
  wall(a,'z',x,z+rear*d/2,w,level,3,[{at:0,width:2.2,bottom:0,top:2.6}],paint,rear);
  for(const side of [-1,1])wall(a,'x',x+side*w/2,z,d,level,3,[{at:side*1.5,width:2,bottom:.95,top:2.3}],paint,side);
 }
 for(const side of [-1,1])for(const end of [-1,1])a.detail(x+side*(w/2+.025),3,z+end*(d/2+.025),.19,6,.19,'white',DETAIL);
 for(const y of [1.3,3,4.45])for(const end of [-1,1])a.detail(x,y,z+end*(d/2+.15),w,.12,.045,'white',DETAIL);
 // Stairwell strip remains open, with a landing flush with its final tread.
 const stairX=x+3.5,stairs=a.accessSteps(stairX,z+front*4.55,2.15,3,front),landingStart=stairs.last+front*stairs.run/2,landingEnd=z+front*5;
 a.box(x-1.35,2.88,z,7.3,.24,9.8,'wood',{houseFloor:true,room:true});
 a.box(stairX,2.88,(landingStart+landingEnd)/2,2.7,.24,Math.abs(landingEnd-landingStart)+.04,'wood',{houseFloor:true,room:true});
 a.detail(x-1.35,3.014,z,7.15,.025,9.6,'tiles',{color:[.92,.83,.73]});
 // Interior wall stops direct spawn-to-spawn fire through both doors.
 a.box(x-2.75,1.4,z,4.3,2.8,.21,'plaster',{color:[.9,.86,.75],house:true});
 furniture(a,x,z,front);furniture(a,x,z,front,true);roof(a,x,z,w,d,6.1);
 a.box(x-3.4,6.5,z+rear*1.7,1,2.2,.85,'stone',{chimney:true});
 // Front porch and the familiar rear balcony, pergola and exterior stairs.
 a.detail(x,.034,z+front*6.4,7,.05,2.7,'concrete');
 a.detail(x-1.8,2.95,z+front*5.6,3.4,.14,1.6,'white');
 for(const side of [-1,1])a.detail(x-1.8+side*1.48,1.47,z+front*6.1,.11,2.94,.11,'white',DETAIL);
 a.box(x,2.88,z+rear*6.45,6.5,.24,2.9,'wood',{houseFloor:true,balcony:true});
 a.accessSteps(x+2.1,z+rear*7.9,2.1,3,front);
 for(const xx of [x-3.1,x+3.1]){
  a.detail(xx,2.6,z+rear*7.65,.13,5.2,.13,'wood',DETAIL);
  a.detail(xx,4.7,z+rear*5.3,.13,3.4,.13,'wood',DETAIL);
  a.detail(xx,3.52,z+rear*6.4,.085,1.05,2.8,'wood',DETAIL);
 }
 a.detail(x-1.3,3.52,z+rear*7.8,3.7,1.05,.085,'wood',DETAIL);
 for(let i=-3;i<=3;i++)a.detail(x+i*.9,5.28,z+rear*6.4,.075,.1,3.1,'wood',DETAIL);
 // Attached garage has open front and back doors and a pass into the side yard.
 const gx=x+garageSide*8.6,gz=z+front*1.3,gw=7.1,gd=7.4;
 wall(a,'z',gx,gz+front*gd/2,gw,0,2.85,[{at:0,width:4.4,bottom:0,top:2.65}],[.91,.91,.85],front);
 wall(a,'z',gx,gz+rear*gd/2,gw,0,2.85,[{at:0,width:2.2,bottom:0,top:2.55}],[.91,.91,.85],rear);
 for(const side of [-1,1])wall(a,'x',gx+side*gw/2,gz,gd,0,2.85,[{at:0,width:2.1,bottom:0,top:2.55}],[.91,.91,.85],side);
 roof(a,gx,gz,gw,gd,2.95);a.detail(gx,.025,gz,gw-.3,.04,gd-.3,'concrete');
 a.detail(gx,1.6,gz+rear*3.2,2.5,.12,.4,'wood');
 a.detail(gx,1.1,gz+rear*3.2,2.4,.75,.2,'steel');
 a.houseRooms??=[];a.houseRooms.push({kind,x,y:0,z,upper:{x,y:3,z:z+front*2.2},balcony:{x:x-1,y:3,z:z+rear*6.4}});
}

function wheels(a,x,z,length){
 for(const side of [-1,1])for(const axle of [-length*.31,length*.31]){
  a.detail(x+axle,.55,z+side*1.38,.86,.28,.86,'rubber',{mesh:'cylinder',pitch:Math.PI/2});
  a.detail(x+axle,.55,z+side*1.55,.42,.05,.42,'steel',{mesh:'cylinder',pitch:Math.PI/2});
 }
}
function bus(a){
 const x=-3.8,z=-2.6,length=10.4,yellow=[1,.72,.15];
 a.box(x,1.55,z,length,3.1,2.7,'plaster',{color:yellow,tile:-1,schoolBus:true,mesh:'bevel',rough:.52,metal:.22});
 for(const side of [-1,1]){
  for(let i=-4;i<=4;i++)a.detail(x+i,2.12,z+side*1.365,.72,.92,.055,'glass',DETAIL);
  for(const y of [.93,1.08,1.25])a.detail(x,y,z+side*1.38,length-.2,.045,.025,'dark');
 }
 a.detail(x,3.14,z,length-.15,.13,2.6,'plaster',{color:yellow,tile:-1,mesh:'bevel'});
 for(const end of [-1,1]){a.detail(x+end*5.23,2.08,z,.055,1.15,2.15,'glass');a.detail(x+end*5.28,.7,z,.08,.22,2.55,'steel');}
 wheels(a,x,z,length);
}
function truck(a){
 const x=5,z=2.35,w=6.5,d=2.9;
 a.box(x,.3,z,w,.6,d,'wood',{truckFloor:true,openTruck:true});
 for(const side of [-1,1])a.box(x,1.95,z+side*1.45,w,2.7,.16,'plaster',{tile:-1,openTruck:true,rough:.58,metal:.2});
 a.box(x,3.35,z,w+.1,.16,d+.12,'white',{tile:-1,roof:true,room:true,openTruck:true});
 for(const side of [-1,1])a.detail(x,2.55,z+side*1.54,w-.5,.65,.045,'rust',{color:[1.8,.45,.3]});
 a.box(x+w/2+.13,1.95,z,.25,2.7,d,'rust',{tile:-1,openTruck:true,color:[.65,.12,.08]});
 const rear=x-w/2;
 for(let i=0;i<3;i++)a.box(rear-(2.5-i)*.75,(i+1)*.1,z,.76,(i+1)*.2,2.35,'steel',{stair:true});
 a.box(x+4.65,.92,z,2.75,1.84,2.65,'rust',{tile:-1,color:[.65,.12,.08],movingTruck:true,mesh:'bevel'});
 a.detail(x+4.4,2.1,z,2.05,.72,2.4,'glass',DETAIL);
 a.detail(x+4.4,2.51,z,2.15,.12,2.48,'rust',DETAIL);
 a.detail(x+6.1,.84,z,.08,.23,2.5,'steel');wheels(a,x+2,z,9.8);
 a.truckInterior={x,y:.6,z};
}
function car(a,x,z){
 a.box(x,.62,z,4.5,1.24,1.85,'blue',{mesh:'bevel',shellThickness:.005,culdesacCar:true});
 a.detail(x,1.4,z,2.2,.46,1.65,'glass',{mesh:'bevel'});a.detail(x,1.67,z,2.3,.1,1.72,'white');
 for(const side of [-1,1])for(const xx of [-1.4,1.4])a.detail(x+xx,.35,z+side*.92,.61,.19,.61,'rubber',{mesh:'cylinder',pitch:Math.PI/2});
}
function mannequin(a,x,z,yaw=0){
 const color=[.73,.53,.38];
 a.detail(x,.93,z,.34,.57,.2,'skin',{mesh:'bevel',color,yaw});
 a.detail(x,1.39,z,.22,.27,.23,'skin',{mesh:'sphere',color,yaw});
 for(const side of [-1,1]){a.detail(x+side*.115,.43,z,.095,.73,.12,'skin',{mesh:'bevel',color,yaw});a.detail(x+side*.235,.91,z,.09,.58,.11,'skin',{mesh:'bevel',color,yaw,roll:side*.09});}
}

export function buildNuketown(a){
 a.blocks=a.blocks.filter(b=>b.ground);a.cover=[];a.decor=[];a.foliage=[];
 a.detail(0,-.04,0,170,.035,170,'sand',{landscape:true});
 // A fenced play space surrounds the street circle, houses and rear gardens.
 for(const side of [-1,1]){fence(a,0,side*30.5,51,.2,2.1);fence(a,side*25.5,0,.2,61,2.1);}
 a.detail(0,.014,0,49,.024,13,'asphalt',{color:[.42,.45,.43]});
 a.detail(-2,.028,0,24,.026,20,'asphalt',{mesh:'cylinder',color:[.42,.45,.43]});
 for(const z of [-8,8])a.detail(0,.04,z,44,.05,1.2,'concrete');
 for(const z of [-12,12])for(const x of [-14,14])a.detail(x,.05,z,7,.065,7,'concrete');
 for(const side of [-1,1]){
  a.detail(side*12,.022,side*24,25,.03,12,'grass',{color:[.67,.9,.39]});
  fence(a,side*20.5,side*20.5,.19,18);
  fence(a,side*12.2,side*8.6,8.8,.18,1.12);
 }
 house(a,4,-14,1,'green');house(a,-4,14,-1,'yellow');bus(a);truck(a);car(a,-18.5,-1);
 // Pink house closes the cul-de-sac; distant houses remain outside the fences.
 a.building(-31,0,9,15,4,'plaster');
 for(const p of a.blocks)if(p.x===-31)p.color=PAINT.pink;
 for(const [x,z]of [[-32,-24],[-33,24],[36,-19],[36,18],[43,-2]]){a.building(x,z,10,11,4.1,'plaster');roof(a,x,z,10,11,4.2);}
 for(const [x,z]of [[-16,-27],[16,27]]){
  a.box(x,1.1,z,4.4,2.2,3.2,'wood',{gardenShed:true});roof(a,x,z,4.4,3.2,2.3);
  a.box(x,1.05,z-3.1,4.2,2.1,.14,'wood',{fence:true,blenderKind:'house_privacy_fence_4_2_x'});
 }
 for(const [x,z]of [[-14,23],[14,-23]]){
  for(const side of [-1,1])a.detail(x+side*2,1.15,z,.14,2.3,.14,'white',DETAIL);
  a.detail(x,2.45,z,4.3,.16,2.8,'white');a.box(x,.45,z,2.3,.9,1.1,'wood',{shellThickness:.035});
 }
 // Low garden hedges and familiar mannequins leave all combat lanes clear.
 for(const side of [-1,1])for(const x of [-22,22])for(let z=12;z<=26;z+=3){
  a.detail(x,.7,side*z,1.2,1.4,2.7,'green',{mesh:'bevel',color:[.61,.82,.46]});
  for(let i=0;i<2;i++)a.foliage.push({x,y:.8,z:side*z,w:1.5,h:1.5,d:1,surface:'green',mesh:'leaf',leaf:0,yaw:i*Math.PI/2,color:[.6,.8,.42]});
 }
 for(const [x,z,yaw]of [[-11,-23,0],[11,23,3.1],[-17,5,1.6],[16,-6,-1.6]])mannequin(a,x,z,yaw);
 // Sign, mailboxes, telephone poles and the east street blockade.
 for(const x of [-12,-10])a.detail(x,1.05,7,.12,2.1,.12,'wood',DETAIL);
 a.detail(-11,1.84,7,2.7,.78,.13,'white',DETAIL);a.detail(-11,1.86,6.925,2.35,.54,.025,'green');
 for(const side of [-1,1]){a.detail(side*14,1.0,side*8.3,.08,2,.08,'wood');a.detail(side*14,1.65,side*8.3,.48,.32,.6,'white',{mesh:'bevel'});}
 for(const x of [-23,24]){a.detail(x,3.65,-7,.16,7.3,.16,'wood');a.detail(x,7.1,-7,.15,.15,3.2,'wood');}
 for(const z of [-4,0,4])a.box(23,.6,z,1.2,1.2,2.7,'concrete',{streetBlockade:true});
 a.detail(0,0,0,1,1,1,'rock',{mesh:'ridge',landscape:true});
 for(let i=0;i<14;i++){const angle=i/14*Math.PI*2,r=42;a.detail(Math.sin(angle)*r,.3,Math.cos(angle)*r,3.8,1.9,4.2,'rock',{mesh:'rock',landscape:true});}
 a.spawns=[];for(const team of [0,1]){const sign=team?1:-1;for(const x of [-11,-7,0,10])a.spawns.push({x:team?-x:x,y:0,z:sign*27,team});a.spawns.push({x:-19,y:0,z:sign*16,team});}
 a.objectives=[{name:'A',x:0,y:0,z:-22},{name:'B',x:-1,y:0,z:.1},{name:'C',x:0,y:0,z:22}];
 a.flagBases=[{team:0,x:0,y:0,z:-27},{team:1,x:0,y:0,z:27}];
}
