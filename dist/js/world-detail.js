import {prepareGroundSurfaces} from './surface-placement.js?v=71';
import {rng} from './math.js?v=71';

/** Visual dressing is separate from navigation and damage collision. Large
 * trunks get simple collision boxes; leaves, pebbles and trim stay inexpensive. */
export function dressWorld(arena){
 if(arena.info.authoredDressing){prepareGroundSurfaces(arena);return;}
 const random=rng(46190+arena.info.id*113),id=arena.info.id,s=arena.info.size;
 arena.foliage=[];const add=(...args)=>arena.detail(...args);
 const card=(x,y,z,w,h,leaf,yaw=0,pitch=0,roll=0,color=[.9,.95,.8])=>arena.foliage.push({x,y,z,w,h,d:1,surface:'green',mesh:'leaf',leaf,yaw,pitch,roll,color});
 const plant=(x,z,size=1,kind=0,y=0,color,variation=random)=>{for(let i=0;i<3;i++)card(x,y+size*.48,z,size*(kind===2?1:1.2),size,kind,i*Math.PI/3+variation()*.3,0,0,color);};
 const palm=(x,z,h=7)=>{
  const bend=(random()-.5)*.8;
  for(let j=0;j<5;j++)add(x+bend*j*.2,h*(j+.5)/5,z,.29-j*.025,h/5+.12,.29-j*.025,'bark',{mesh:'cylinder',roll:-bend*.07});
  add(x+bend,h-.10,z,.75,.58,.72,'bark',{mesh:'sphere'});
  for(let j=0;j<9;j++){
   const angle=j/9*Math.PI*2;card(x+bend+Math.sin(angle)*1.22,h-.43,z+Math.cos(angle)*1.22,1.6,3.5,1,angle,-1.05,(random()-.5)*.17);
  }
 };
 const tree=(x,z,h=5)=>{
  add(x,h*.3,z,.3,h*.6,.3,'bark',{mesh:'cylinder'});
  for(let j=0;j<5;j++){const a=j*2.4;plant(x+Math.cos(a)*.7,z+Math.sin(a)*.7,h*.72,0,h*.3+(j%2)*.6);}
 };
 const conifer=(x,z,h=7)=>{
  add(x,h*.38,z,.24,h*.76,.24,'bark',{mesh:'cylinder'});
  add(x,h*.57,z,h*.65,h*.86,h*.65,'green',{mesh:'conifer',color:[1,1,1],rough:1});
 };
 const free=(x,z,margin=1)=>!arena.collides({x,y:.02,z},margin,2)&&arena.spawns.every(p=>Math.hypot(p.x-x,p.z-z)>3.2)&&arena.objectives.every(p=>Math.hypot(p.x-x,p.z-z)>4.2);
 // Break up the ground with roads, shoulders and shallow drainage strips.
 if(id>=13){
  // Expanded maps author their street and facility floors with the architecture.
 }else if(id===0||id===3||id===5||id===7||id===8||id===9||id===10||id===12){
  for(const x of [-s*.66,s*.66])add(x,.011,0,4.3,.012,s*2-2,'asphalt');
  for(const z of [-s*.63,s*.63])add(0,.013,z,s*2-2,.012,3.7,'asphalt');
  for(const x of [-s*.66-2.3,s*.66+2.3])add(x,.07,0,.24,.14,s*2-2,'concrete',{mesh:'bevel'});
 }else if(id===1||id===11){
  add(0,.011,0,s*2-1,.014,s*2-1,'asphalt');add(0,.028,0,25,.015,22,'concrete');
  for(const x of [-24,24])for(let z=-25;z<27;z+=4)add(x,.023,z,.12,.01,2,'white',{color:[.84,.72,.3]});
 }else if(id===4){
  add(0,.012,0,s*2-1,.014,s*2-1,'asphalt');
  add(0,.027,0,11,.016,33,'concrete');
  for(const x of [-32,32])for(let z=-30;z<=30;z+=5)add(x,.026,z,.15,.012,2.6,'white',{color:[.87,.74,.33]});
  for(const x of [-8.82,8.82])add(x,.035,0,.19,.06,22,'dark');
 }else{
  add(0,.012,0,5,.014,s*2-1,'dirt');add(0,.014,0,s*2-1,.012,4.5,'dirt');
 }
 // Facade trim, exposed foundations, shutters, air conditioning and roof equipment.
 const buildings=arena.blocks.filter(b=>!b.ground&&b.h>5&&b.w>4&&b.d>4);
 for(const b of buildings){
  add(b.x,.20,b.z,b.w+.09,.4,b.d+.09,'concrete');
  add(b.x,b.h-.10,b.z,b.w+.2,.15,b.d+.2,'plaster');
  if(id>=13){
   // Large-city facade bands provide structure across storeys without hundreds
   // of tiny shutter components. Windows and sills are already in the building.
   for(const side of [-1,1]){
    const z=b.z+side*(b.d/2+.06);
    for(let y=1.1;y<b.h;y+=2.2)add(b.x,y,z,b.w,.16,.16,'limestone');
    add(b.x+b.w*.4,b.h*.47,z,.11,b.h*.94,.13,'rust',{mesh:'cylinder'});
   }
   add(b.x-b.w*.24,b.h+.5,b.z,1.5,1,1.5,'steel',{mesh:'cylinder'});
   continue;
  }
  for(const side of [-1,1]){
   const z=b.z+side*(b.d/2+.04);
   for(let y=2;y<b.h-.5;y+=2.2)for(let x=b.x-b.w/2+1.2;x<b.x+b.w/2-.6;x+=2){
    for(const dx of [-.46,.46])add(x+dx,y,z,.09,1.2,.17,'wood');
    add(x,y+.59,z,1,.10,.17,'plaster');add(x,y,z,.038,1.05,.09,'dark');
    add(x-.7,y,z,.28,1.16,.07,'blue',{color:[.45,.57,.53]});add(x+.7,y,z,.28,1.16,.07,'blue',{color:[.45,.57,.53]});
   }
   add(b.x+b.w*.39,b.h*.47,z,.10,b.h*.94,.12,'rust',{mesh:'cylinder'});
  }
  add(b.x-b.w*.24,b.h+.5,b.z,1.5,1,1.5,'steel',{mesh:'cylinder',color:[.74,.78,.75]});
  for(let i=0;i<5;i++)add(b.x+.5,b.h+.78,b.z-.5+i*.18,1.35,.06,.05,'rubber');
  add(b.x+b.w*.3,b.h+1.5,b.z-.5,.032,2.3,.032,'steel');
  for(let i=0;i<3;i++)add(b.x+b.w*.3,b.h+1.8-i*.23,b.z-.5,1.3-i*.2,.026,.026,'steel');
 }
 for(const roof of arena.blocks.filter(b=>b.roof)){
  if(!roof.room)add(roof.x,.026,roof.z,roof.w-.6,.018,roof.d-.6,'concrete');
  for(const z of [roof.z-roof.d/2,roof.z+roof.d/2])add(roof.x,roof.y+.2,z,roof.w,.16,.13,'rust');
  if(roof.room)add(roof.x,roof.y+.39,roof.z,1.1,.48,.8,'steel',{mesh:'bevel'});
 }
 // Small street infrastructure gives human scale without blocking the lanes.
 for(const [x,z]of [[-s+2,-7],[s-2,9],[-7,s-2],[8,-s+2]]){
  add(x,2.7,z,.11,5.4,.11,'steel',{mesh:'cylinder'});add(x+.55,5.36,z,1.1,.10,.12,'steel');add(x+1,5.29,z,.40,.12,.26,'dark',{mesh:'bevel'});add(x+1,5.22,z,.3,.025,.2,'white',{emissive:.5});
 }
 const paved=arena.decor.filter(p=>p.y<.1&&p.h<.08&&['asphalt','concrete','tiles'].includes(p.surface)&&p.w>1&&p.d>1);
 // Low growth stays below the sightline and is kept away from objectives.
 for(let i=0;i<(id===1||id===4||id===6?70:220);i++){
  const x=(random()-.5)*(s*2-3),z=(random()-.5)*(s*2-3);if(!free(x,z,.4)||arena.indoors({x,y:.05,z})||paved.some(p=>Math.abs(x-p.x)<p.w/2-.1&&Math.abs(z-p.z)<p.d/2-.1))continue;
  const nearWall=arena.blocks.some(b=>!b.ground&&Math.abs(x-b.x)<b.w/2+2.4&&Math.abs(z-b.z)<b.d/2+2.4);
  if(!nearWall&&random()>.14)continue;
  const size=.18+random()*.38;plant(x,z,size,2);
  if(random()>.6)add(x+.3,.09,z-.1,.25+random()*.35,.18,.28,'rock',{mesh:'rock',yaw:random()*6.28});
 }
 if(id===2||id===9){
  // Atlas grass clusters thicken the dusty perimeter without hiding routes.
  // Existing foliage batching and tier-dependent instance counts bound the cost.
  const grassRandom=rng(90071+id*733);let planted=0;
  for(let i=0;i<190&&planted<55;i++){
   const x=(grassRandom()-.5)*(s*2-6),z=(grassRandom()-.5)*(s*2-6);
   if(Math.max(Math.abs(x),Math.abs(z))<s*.52||!free(x,z,.45)||arena.indoors({x,y:.05,z}))continue;
   if(paved.some(p=>Math.abs(x-p.x)<p.w/2+.25&&Math.abs(z-p.z)<p.d/2+.25))continue;
   const size=.4+grassRandom()*.45,tint=id===2?[.95,.88,.69]:[.86,.82,.68];
   plant(x,z,size,2,0,tint,grassRandom);planted++;
  }
 }
 const treeSpots=[[-s+3,-s*.45],[-s*.4,-s+3],[s*.42,s-3],[s-3,s*.4],[-s+3,s*.55],[s-3,-s*.6]];
 if(id!==1&&id!==4&&id!==6)for(const [x,z]of treeSpots)if(free(x,z,.65)){
  arena.box(x,.8,z,.42,1.6,.42,'bark',{invisible:true});
  if(id===8)conifer(x,z,5+random()*2);
  else if(id===3||id===5||id===7||id===9)tree(x,z,5+random()*2);else palm(x,z,5.5+random()*2.5);
  plant(x+.8,z,.65,3);
 }
 // A low-poly textured ridgeline has a continuous silhouette and fewer
 // triangles than the old thirty separate rock spheres. Trees sit at its foot.
 if(id!==4){
  const surface=id===2?'limestone':id===8?'snow':'rock';
  add(0,0,0,1,1,1,surface,{mesh:'ridge',color:[1,1,1],landscape:true});
  for(let i=0;i<30;i++){
   const angle=i/30*Math.PI*2,radius=s+6+random()*2,x=Math.sin(angle)*radius,z=Math.cos(angle)*radius;
   if(id!==1&&i%2===0){if(id===8)conifer(x,z,7+random()*4);else if(id===3||id===5||id===7||id===9)tree(x,z,7+random()*4);else palm(x,z,7+random()*3);}
   if(i%2)plant(x,z,3+random()*2,0);
  }
 }
 if(id===2||id===9){
  // Sandstone and quarry scree sit beyond the collision wall, in front of the
  // continuous ridge. These share one instanced mesh and the existing rock tile.
  for(let i=0;i<24;i++){
   const angle=(i+random()*.28)/24*Math.PI*2,radius=s+13+random()*10;
   const x=Math.sin(angle)*radius,z=Math.cos(angle)*radius,span=4+random()*5.5,height=2.8+random()*4.2;
   add(x,height*.36-.45,z,span,height,span*(.75+random()*.4),id===2?'limestone':'rock',{
    mesh:'strata',landscape:true,yaw:angle+random()*.5,color:id===2?[.86,.72,.54]:[.77,.55,.39]
   });
  }
 }
 if(id===4){
  // Water, a moored repair vessel and shore cranes establish a recognisable harbour.
  // These distant shapes remain outside the playable collision boundary.
  add(s+53,-1.21,0,106,.01,230,'water',{mesh:'surface'});
  add(s+14,.65,3,12,4.4,39,'blue',{mesh:'bevel',color:[.22,.31,.34]});
  add(s+14,2.9,3,11.5,.18,37,'steel');
  add(s+14,4.8,-10,9,3.6,9,'white',{mesh:'bevel'});
  add(s+14,7,-11,7,.75,6,'glass');add(s+14,9.3,-11,.16,4,.16,'steel');
  for(const z of [1,7,13])add(s+14,3.65,z,8,1.4,4,'rust',{mesh:'bevel'});
  for(const z of [-30,30]){
   const x=s+8;add(x,7,z,1.1,14,1.1,'orange');add(x-4,14,z,11,.55,.7,'orange');
   add(x-8,10.5,z,.045,6,.045,'dark',{mesh:'cylinder'});
   add(x+2,11.6,z,3,3,2.6,'steel',{mesh:'bevel'});
  }
  for(let z=-30;z<=30;z+=8){
   add(s-2,.28,z,.48,.56,.48,'dark',{mesh:'cylinder'});
   add(s-2,.54,z,.74,.14,.74,'steel',{mesh:'cylinder'});
   add(s-2,.038,z,1.1,.06,1.1,'concrete');
  }
  for(const x of [-7,7])for(let z=-9;z<=9;z+=3){
   add(x-1.45,1.55,z,.055,.9,.055,'steel');
   add(x-1.45,2,z,.055,.06,2.7,'orange');
   add(x+.9,1.13,z,.65,.045,1,'dark');
   for(let k=0;k<4;k++)add(x+.9,1.16,z-.36+k*.24,.61,.022,.07,'steel');
  }
  for(const x of [-27.8,-14.2])for(const z of [-13,-7,-1]){
   add(x,3,z,.15,4.6,.20,'white');
   add(x,4.9,z,.18,.12,1.8,'white',{emissive:.45});
  }
  add(-21,5.74,-7,8,.18,5,'glass');
  for(const z of [-9.5,-7,-4.5])add(-21,5.86,z,8.1,.08,.085,'steel');
 }
 if(id===10){
  for(const x of [-23,23])for(const z of [-16,16]){
   if(x*z<0)continue;
   for(const side of [-1,1])for(const offset of [-4.5,4.5]){
    add(x+side*6.78,2.4,z+offset,.035,2.4,2.2,'glass');
    add(x+side*6.8,2.4,z+offset-1.13,.05,2.6,.07,'steel');
   }
  }
  for(const sign of [-1,1])for(let i=0;i<4;i++){
   const x=sign*15,z=-12+i*8;
   add(x,.48,z,1.9,.95,.58,'dark',{mesh:'bevel'});add(x,.98,z,1.92,.055,.6,'steel');
   add(x,1.42,z+.22,1.92,.68,.075,'wood',{mesh:'bevel'});
  }
 }
 if(id===11){
  // Small reflective puddles reuse the water material and existing instance pass.
  for(const [x,z,w,d]of [[-16,-7,3.4,1.8],[16,7,2.8,1.9],[-17,24,2.7,1.4],[17,-24,3.2,1.3],[-6,-19,2.9,1.7],[6,19,2.6,1.6]])
   if(!arena.indoors({x,y:.05,z}))add(x,.041,z,w,.012,d,'water',{mesh:'surface',surfaceLayer:2,color:[.14,.22,.23],rough:.19});
  for(const p of [...arena.blocks,...arena.decor])if(['asphalt','steel','concrete'].includes(p.surface)&&!arena.indoors({x:p.x,y:p.y+p.h/2+.04,z:p.z}))p.wet=true;
  for(const [x,z]of [[-33,-4],[33,5],[-10,33],[10,-33]])if(free(x,z,.8)){
   palm(x,z,6.5);plant(x+1,z,.9,3);
  }
 }
 if(id===12){
  for(const [x,z]of [[-7,-10],[7,10],[-28,2],[28,-2]]){
   add(x+.45,3.3,z,.13,1.4,.13,'steel',{mesh:'cylinder'});
   add(x,3.69,z,2.1,.06,2.1,'dark',{mesh:'tube'});
   for(let i=0;i<5;i++)add(x-.85+i*.43,3.73,z, .09,.07,2.5,'orange');
  }
  for(const sign of [-1,1]){
   const x=sign*21,z=sign*17;
   add(x,7.8,z,.8,5.6,.8,'rust',{mesh:'cylinder'});add(x,10.62,z,.9,.12,.9,'steel',{mesh:'tube'});
   add(x+1.1,5.4,z,2.2,.4,2.1,'steel',{mesh:'bevel'});
  }
 }
 if(id===5){
  add(0,.026,0,19,.025,19,'limestone',{color:[.64,.67,.65]});
  add(0,.047,0,5,.018,18,'concrete');add(0,.049,0,18,.018,5,'concrete');
  for(const x of [-6.3,6.3])for(const z of [-6.3,6.3]){
   add(x,.12,z,2.3,.22,2.3,'moss');plant(x,z,.52,3);
  }
  for(const sign of [-1,1]){
   for(const offset of [-9,-3.1,3.1,9]){
    add(offset,1.85,sign*10.37,.18,3.7,.22,'concrete');
    add(sign*10.37,1.85,offset,.22,3.7,.18,'concrete');
   }
   add(0,3.3,sign*10.38,2.3,.16,.2,'dark');
   add(0,3.15,sign*10.4,1.8,.055,.10,'white',{emissive:.65});
   add(sign*10.38,3.3,0,.2,.16,2.3,'dark');
   add(sign*10.4,3.15,0,.10,.055,1.8,'white',{emissive:.65});
  }
  for(const x of [-4.8,4.8])for(const z of [-24,-21,-18]){
   add(x,1.4,z,1.2,2.8,1.4,'steel',{mesh:'bevel'});
   add(x,1.9,z-.73,.75,.6,.045,'glass');
   for(let j=0;j<3;j++)add(x-.24+j*.21,2.27,z-.76,.07,.04,.018,'white',{color:[.36,.7,.57],emissive:.55});
  }
  add(-23,9.8,-21,.22,4.8,.22,'steel');
  for(let i=0;i<4;i++)add(-23,10.8-i*.55,-21,2.5-i*.35,.08,.08,'steel');
  add(-23,12.3,-21,.16,.2,.16,'orange',{emissive:1});
  for(const x of [20.3,27.7])for(const z of [-19,-16,-13]){
   add(x,1.65,z,.065,1.14,.065,'steel');
   add(x,2.22,z,.065,.065,2.9,'steel');
  }
 }
 if(id===8){
  // Wind-packed snowbanks and lit route markers give the listening post a colder silhouette.
  for(const [x,z]of [[-34,-27],[-32,25],[33,-24],[35,28],[-7,-34],[8,34]]){
   add(x,.28,z,5.2,.55,4.2,'snow',{mesh:'rock',yaw:random()*6.28,color:[.82,.89,.93]});
   add(x,.62,z,2.8,.22,2.4,'white',{mesh:'rock',yaw:random()*6.28,color:[.92,.96,.98]});
  }
  for(const x of [-16,16])for(const z of [-31,31]){
   add(x,1.8,z,.12,3.6,.12,'steel',{mesh:'cylinder'});
   add(x,3.65,z,.32,.22,.32,'orange',{mesh:'sphere',emissive:.55});
  }
 }
 if(id===9){
  // Paired conveyor trestles point from the quarry shelves toward the crusher.
  for(const sign of [-1,1]){
   const x=sign*19;
   add(x,5.4,0,.5,.5,32,'steel',{mesh:'bevel',pitch:sign*.08});
   for(const z of [-13,0,13]){
    add(x,2.7,z,.32,5.4,.32,'rust',{mesh:'bevel'});
    add(x+sign*1.2,4.8,z,.10,4,.10,'steel',{mesh:'cylinder',roll:.4});
   }
   add(x,5.78,0,.72,.16,32,'dark');
  }
  for(const x of [-30,30])for(const z of [-25,25])add(x,.4,z,4.2,.8,3.4,'rock',{mesh:'rock',yaw:random()*6.28,color:[.73,.48,.31]});
 }
 // Light rubble, low planters and sandbags are chamfered to catch the sunlight.
 for(const b of arena.blocks){if(b.h>.7&&b.h<1.5&&!b.ground&&!b.stair&&!b.dock&&!b.overlook&&b.w>2){b.mesh='bevel';for(let i=0;i<Math.floor(b.w);i++)add(b.x-b.w/2+.6+i,b.y+b.h/2+.10,b.z,.82,.23,.54,'fabric',{mesh:'bevel',color:[.88,.8,.60]});}}
 prepareGroundSurfaces(arena);
}
