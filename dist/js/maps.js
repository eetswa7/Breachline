import {rng,rayBox,distance,clamp} from './math.js?v=71';
import {dressWorld} from './world-detail.js?v=71';
import {RayGrid} from './ray-grid.js?v=71';
import {buildDistrict,buildBlacksite} from './battlegrounds.js?v=71';
import {buildNuketown} from './nuketown.js?v=71';
export const MAPS=[
 {id:0,name:'OLD QUARTER',location:'Coastal city',size:32,weather:'sun',tag:'URBAN',description:'Market alleys, a central plaza and elevated terraces.',sky:[.47,.65,.76],fog:[.59,.66,.65],sun:[-.5,.8,.35]},
 {id:1,name:'FOUNDRY',location:'Industrial district',size:35,weather:'overcast',tag:'INDUSTRIAL',description:'Four loading entrances connect the machinery hall to covered freight lanes.',sky:[.27,.38,.48],fog:[.35,.43,.46],sun:[-.6,.7,-.3]},
 {id:2,name:'DUSTLINE',location:'Arid forward base',size:36,weather:'sun',tag:'DESERT',description:'A fortified compound, firing lanes and a radar outpost.',sky:[.54,.66,.72],fog:[.74,.69,.56],sun:[.4,.85,.3]},
 {id:3,name:'RELAY',location:'Mountain listening station',size:44,weather:'sun',tag:'MIXED',description:'An operations centre, service tunnels and open approaches.',sky:[.36,.54,.68],fog:[.5,.61,.61],sun:[-.5,.8,-.4]},
 {id:4,name:'BREAKWATER',location:'Maritime repair terminal',size:39,weather:'sun',tag:'DOCKYARD',description:'A dry-dock crossing, raised service walks and a cargo warehouse.',sky:[.49,.64,.72],fog:[.58,.67,.69],sun:[-.7,.72,.22]},
 {id:5,name:'CITADEL',location:'Upland communications fortress',size:40,weather:'overcast',tag:'HIGHLANDS',description:'A four-way courtyard, covered approaches and a radar overlook.',sky:[.36,.49,.59],fog:[.47,.56,.58],sun:[.35,.81,-.46]},
 {id:6,name:'SWITCHYARD',location:'Rail freight interchange',size:38,weather:'overcast',tag:'RAIL TERMINAL',description:'Offset freight cars, a four-door depot and raised signal platform.',sky:[.38,.49,.58],fog:[.5,.56,.59],sun:[-.58,.75,.3]},
 {id:7,name:'CANOPY',location:'Forest research outpost',size:42,weather:'sun',tag:'FOREST BASE',description:'Interconnected cabins, a sheltered courtyard and an observation deck.',sky:[.4,.57,.66],fog:[.5,.62,.58],sun:[.55,.82,-.35]},
 {id:8,name:'FROSTLINE',location:'Alpine border station',size:42,weather:'overcast',tag:'ALPINE',description:'A snowbound listening post, radio beacon and split-level patrol routes.',sky:[.52,.64,.73],fog:[.68,.74,.78],sun:[-.48,.83,.24]},
 {id:9,name:'IRON QUARRY',location:'Red Mesa extraction site',size:40,weather:'sun',tag:'QUARRY',description:'An abandoned stoneworks threaded by conveyors, drill shelters and broken lanes.',sky:[.57,.65,.68],fog:[.71,.68,.58],sun:[.55,.79,-.18]},
 {id:10,name:'SKYBRIDGE',location:'Civic transit interchange',size:40,weather:'sun',tag:'TRANSIT',description:'A raised concourse, glass-fronted station halls and sheltered service routes.',sky:[.48,.65,.77],fog:[.61,.70,.73],sun:[-.62,.72,.32]},
 {id:11,name:'MONSOON',location:'Tropical logistics terminal',size:42,weather:'rain',tag:'TROPICAL',description:'Rain-soaked freight lanes wrap a four-door depot and jungle maintenance huts.',sky:[.31,.43,.48],fog:[.41,.53,.54],sun:[.24,.9,-.32]},
 {id:12,name:'EMBERWORKS',location:'Copper processing district',size:41,weather:'sun',tag:'REFINERY',description:'Twin processing halls, tank farms and an accessible pipe-service catwalk.',sky:[.62,.57,.47],fog:[.72,.61,.48],sun:[-.71,.48,.51]},
 {id:13,teamSize:20,name:'CROSSFIRE DISTRICT',location:'Coastal financial quarter',size:60,weather:'sun',tag:'CITY',groundSurface:'asphalt',colliderBudget:260,decorBudget:1500,description:'A 120 m city district with open-window interiors, traffic cover and a 3.6 m overpass.',sky:[.48,.63,.74],fog:[.62,.68,.70],sun:[-.65,.75,.25]},
 {id:14,teamSize:20,name:'BLACKSITE',location:'Restricted power station',size:58,weather:'overcast',tag:'INDUSTRIAL',groundSurface:'asphalt',colliderBudget:230,decorBudget:1200,description:'A 116 m facility with a generator hall, four bunkers, raised service routes and cargo flanks.',sky:[.29,.40,.51],fog:[.40,.48,.53],sun:[.45,.76,-.3]},
 {id:15,name:'NUKETOWN',location:'Nevada test neighbourhood',size:32,navigationStep:.75,ridgeTemplate:2,authoredDressing:true,groundSurface:'grass',colliderBudget:340,decorBudget:1400,weather:'sun',tag:'CLASSIC',description:'Classic Nuketown recreation: twin two-storey houses, garages, rear balconies, a school bus and an open moving truck.',sky:[.53,.69,.81],fog:[.68,.72,.68],sun:[-.45,.85,.34]}
];
export const SURFACES={concrete:{color:[.45,.47,.45],rough:.92,metal:0,pattern:1},sand:{color:[.61,.51,.35],rough:1,metal:0,pattern:1},stone:{color:[.68,.61,.48],rough:.94,metal:0,pattern:2},steel:{color:[.22,.3,.31],rough:.55,metal:.7,pattern:3},rust:{color:[.39,.2,.13],rough:.88,metal:.08,pattern:3},wood:{color:[.39,.28,.16],rough:.9,metal:0,pattern:4},dark:{color:[.075,.095,.105],rough:.6,metal:.5,pattern:0},white:{color:[.78,.79,.7],rough:.88,metal:0,pattern:1},blue:{color:[.12,.29,.37],rough:.66,metal:.05,pattern:3},orange:{color:[.79,.32,.08],rough:.7,metal:.2,pattern:0},glass:{color:[.11,.24,.29],rough:.18,metal:.65,pattern:0},green:{color:[.2,.29,.18],rough:.88,metal:0,pattern:1}};
const surfaceTexture={concrete:0,sand:6,stone:1,steel:8,rust:11,wood:10,dark:8,white:0,blue:8,orange:-1,glass:-1,green:9};
for(const [name,tile]of Object.entries(surfaceTexture))SURFACES[name].tile=tile;
Object.assign(SURFACES,{
 water:{color:[.075,.22,.28],rough:.28,metal:0,tile:-1},
 plaster:{color:[.94,.92,.84],rough:.94,metal:0,tile:1},limestone:{color:[.95,.9,.8],rough:.95,metal:0,tile:2},
 asphalt:{color:[.82,.87,.89],rough:.92,metal:0,tile:4},dirt:{color:[.95,.89,.77],rough:1,metal:0,tile:5},gravel:{color:[.9,.9,.85],rough:1,metal:0,tile:7},
 fabric:{color:[.8,.82,.71],rough:.98,metal:0,tile:9},rubber:{color:[.035,.044,.039],rough:.85,metal:0,tile:-1},skin:{color:[.41,.28,.19],rough:.82,metal:0,tile:-1},
 bark:{color:[.47,.38,.28],rough:1,metal:0,tile:15},rock:{color:[.86,.88,.82],rough:1,metal:0,tile:15},grass:{color:[.8,.89,.65],rough:1,metal:0,tile:13},moss:{color:[.8,.9,.67],rough:1,metal:0,tile:12},tiles:{color:[.9,.81,.70],rough:.85,metal:0,tile:14},snow:{color:[.78,.86,.91],rough:.92,metal:0,tile:1},brass:{color:[.55,.37,.12],rough:.33,metal:.9,tile:-1}
});
export class Arena {
 constructor(id=0){this.info=MAPS[Number.isFinite(id)?clamp(Math.floor(id),0,MAPS.length-1):0];this.blocks=[];this.decor=[];this.cover=[];this.doors=[];this.breakables=[];this.spawns=[];this.objectives=[];this.random=rng(771+this.info.id*511);this.build();dressWorld(this);this.bakeCollision();}
 box(x,y,z,w,h,d,surface='concrete',extra={}){const b={x,y,z,w,h,d,surface,...extra};this.blocks.push(b);this.collisionCells=null;if(h>.7&&h<2.3)this.cover.push({x:x+w/2+1,z,y:0},{x:x-w/2-1,z,y:0},{x,y:0,z:z+d/2+1},{x,y:0,z:z-d/2-1});return b;}
 detail(x,y,z,w,h,d,surface='dark',extra={}){const b={x,y,z,w,h,d,surface,...extra};this.decor.push(b);return b;}
 crate(x,z,stack=1){for(let i=0;i<stack;i++){this.box(x,i*1.18+.59,z,1.25,1.18,1.25,'wood',{shellThickness:.035});for(const dx of [-.43,.43])this.detail(x+dx,i*1.18+.6,z,.075,1.2,1.28,'steel');}}
 barrier(x,z,turn=false){this.box(x,.65,z,turn?.8:3.1,1.3,turn?3.1:.8,'concrete');this.detail(x,1.31,z,turn?.8:3.1,.04,turn?3.1:.8,'orange');}
 container(x,z,turn=false,surface='blue'){this.box(x,1.45,z,turn?2.6:6,2.9,turn?6:2.6,surface,{shellThickness:.004});for(let i=-2;i<=2;i++)this.detail(x+(turn?0:i),1.48,z+(turn?i:0),turn?2.65:.065,2.78,turn?.065:2.65,'steel');this.detail(x,2.94,z,turn?2.65:6.05,.1,turn?6.05:2.65,'dark');}
 room(x,z,w,d,height=4,surface='stone',roof=true,sideDoors=false){
  for(const xx of [x-w/2,x+w/2]){
   if(sideDoors){for(const sign of [-1,1])this.box(xx,height/2,z+sign*(d/4+.8),.4,height,d/2-1.6,surface);this.box(xx,height-.5,z,.4,1,3.2,surface);}
   else this.box(xx,height/2,z,.4,height,d,surface);
  }
  for(const zz of [z-d/2,z+d/2]){this.box(x-w/4-.65,height/2,zz,w/2-1.3,height,.4,surface);this.box(x+w/4+.65,height/2,zz,w/2-1.3,height,.4,surface);this.box(x,height-.5,zz,2.6,1,.4,surface);}
  if(roof)this.box(x,height+.15,z,w+.6,.3,d+.6,surface,{roof:true,room:true});
  this.detail(x,.015,z,w-.4,.03,d-.4,'concrete');
  for(const xx of [x-w/2+.22,x+w/2-.22]){if(sideDoors)continue;this.detail(xx,2.25,z,.06,1.4,2,'glass');this.detail(xx,2.25,z,.07,.06,2.1,'dark');}
  this.detail(x,height-.25,z,.7,.08,1.5,'white',{emissive:.9});
 }
 stairs(x,z,width=2.6,height=2.4,dir=1){for(let i=0;i<8;i++){const h=height*(i+1)/8;this.box(x,h/2,z+dir*i*.48,width,h,.49,'concrete',{stair:true});}}
 building(x,z,w,d,h=7,surface='stone'){this.box(x,h/2,z,w,h,d,surface);this.detail(x,h+.15,z,w+.45,.3,d+.45,'white');for(let y=2;y<h-.5;y+=2.2)for(let xx=x-w/2+1.2;xx<x+w/2-.6;xx+=2){for(const zz of [z-d/2-.015,z+d/2+.015]){this.detail(xx,y,zz,.8,1.1,.06,'glass');this.detail(xx,y-.62,zz,1,.1,.14,'white');}}this.detail(x+.5,h+.55,z,1.5,.8,1.2,'steel');}
 build(){
  const id=this.info.id,s=this.info.size;
  this.box(0,-.2,0,s*2,.4,s*2,this.info.groundSurface??(id===2?'sand':id===0?'dirt':id===3||id===5||id===7?'grass':id===4||id===10||id===11?'asphalt':id===8?'snow':id===9||id===12?'gravel':'concrete'),{ground:true});
  for(const sign of [-1,1]){this.box(sign*s,id===4&&sign===1?.65:1.4,0,.8,id===4&&sign===1?1.3:2.8,s*2,id===4?'concrete':'plaster');this.box(0,1.4,sign*s,s*2,2.8,.8,'plaster');}
  this.spawns=[{x:-s+5,y:0,z:-s+5,team:0},{x:-s+9,y:0,z:-s+5,team:0},{x:-s+5,y:0,z:-s+9,team:0},{x:-s+10,y:0,z:-s+10,team:0},{x:s-5,y:0,z:s-5,team:1},{x:s-9,y:0,z:s-5,team:1},{x:s-5,y:0,z:s-9,team:1},{x:s-10,y:0,z:s-10,team:1},{x:-s+5,y:0,z:s-5,team:0},{x:s-5,y:0,z:-s+5,team:1}];
  if(this.info.teamSize>4)for(const team of [0,1])for(const [dx,dz]of [[5,13],[13,5],[5,18],[18,5]]){const sign=team?1:-1;this.spawns.push({x:sign*(s-dx),y:0,z:sign*(s-dz),team});}
  this.objectives=[{name:'A',x:-s*.5,y:0,z:s*.28},{name:'B',x:0,y:0,z:0},{name:'C',x:s*.5,y:0,z:-s*.28}];
  if(id===0){
   for(const [x,z,w,d,h] of [[-16,-12,9,9,9],[15,13,10,9,8],[-14,15,8,8,7],[16,-15,9,7,9],[-29,5,5,13,11],[28,-2,5,13,10]])this.building(x,z,w,d,h);
   this.room(-4,-19,8,7,3.2,'stone');this.room(5,20,8,7,3.2,'stone');
   this.box(-4,2.25,6,6,.35,6,'stone');this.stairs(-4,0,2.8,2.4,1);
   this.detail(-4,2.95,8.95,6,.9,.12,'steel');
   this.box(0,.4,0,4,.8,4,'stone');this.detail(0,1.3,0,.8,1.8,.8,'white',{mesh:'cylinder'});
   for(const [x,z] of [[-9,-2],[8,4],[5,-11],[-8,23],[22,5]])this.barrier(x,z);
   for(const [x,z] of [[-20,6],[11,-4],[-7,-7],[8,13]])this.crate(x,z,2);
   for(const z of [-7,8]){this.detail(-23,2.7,z,4,.08,2.8,'green');for(const x of [-24.8,-21.2])this.detail(x,1.35,z,.09,2.7,.09,'wood');}
  }else if(id===1){
   this.room(0,0,26,23,6,'steel',true,true);
   for(const x of [-8,7])for(const z of [-6,5]){this.box(x,1.3,z,3,2.6,4,'dark');this.detail(x,2.75,z,2.7,.3,3.6,'rust');this.detail(x-1.53,1.6,z,.08,.8,1,'orange');}
   for(const x of [-12,12])for(const z of [-10,0,10])this.detail(x,3,z,.28,6,.28,'orange');
   this.container(-24,-6,true);this.container(24,6,true,'rust');this.container(-20,16);this.container(20,-17,false,'rust');
   this.stairs(-20,0,2.5,2.9,1);this.box(-20,2.75,7,7,.3,5,'steel');
   for(const [x,z] of [[-5,-20],[7,20],[21,-5],[-23,8]])this.barrier(x,z);
   for(const [x,z] of [[-5,-6],[5,5],[-22,-17],[22,18]])this.crate(x,z,2);
   this.objectives=[{name:'A',x:-23,y:0,z:4},{name:'B',x:0,y:0,z:0},{name:'C',x:23,y:0,z:-4}];
  }else if(id===2){
   this.room(-17,-11,12,11,3.5,'stone');this.room(16,12,12,11,3.5,'stone');this.room(17,-14,9,10,3.2,'stone');this.room(-17,15,9,10,3.2,'stone');
   for(const [x,z,t] of [[-5,-9,false],[5,9,false],[-6,15,true],[6,-16,true],[-24,4,false],[25,-3,false]])this.barrier(x,z,t);
   this.container(0,-24,false,'green');this.container(0,25,false,'rust');
   this.box(0,.65,0,2.8,1.3,2.8,'sand');this.detail(0,3.2,0,.18,5,.18,'steel');this.detail(0,5.6,0,3,.12,1.8,'white',{pitch:.45});
   for(const [x,z] of [[-9,-3],[11,3],[-28,19],[28,-18]])this.crate(x,z,2);
   this.stairs(17,-22,2.8,3.6,1);
  }else if(id===3){
   this.room(0,0,17,23,4.4,'concrete',true,true);this.room(-23,-16,12,9,3.4,'steel');this.room(23,16,12,9,3.4,'steel');
   this.room(-24,15,10,14,3.8,'stone');this.room(24,-16,10,14,3.8,'stone');
   for(const [x,z] of [[-14,-2],[15,3],[-6,-23],[6,23],[-32,-2],[32,0]])this.barrier(x,z);
   this.container(-5,31,false,'green');this.container(4,-31);
   this.stairs(0,-16,2.8,2.4,1);this.box(0,2.25,-6,7,.3,6,'steel');
   for(const x of [-5,5])for(const z of [-5,5]){this.box(x,1.1,z,1.2,2.2,2.7,'dark');this.detail(x,1.5,z-1.37,.7,.8,.05,'glass');}
   for(const [x,z] of [[-16,25],[15,-25],[-32,27],[33,-28]])this.crate(x,z,2);
   this.objectives=[{name:'A',x:-24,y:0,z:0},{name:'B',x:0,y:0,z:3},{name:'C',x:24,y:0,z:0}];
  }
  // Shallow access stairs keep each navigation-grid transition below the step limit.
  if(id===4)this.buildBreakwater();
  if(id===5)this.buildCitadel();
  if(id===6)this.buildSwitchyard();
  if(id===7)this.buildCanopy();
  if(id===8)this.buildFrostline();
  if(id===9)this.buildIronQuarry();
  if(id===10)this.buildSkybridge();
  if(id===11)this.buildMonsoon();
  if(id===12)this.buildEmberworks();
  if(id===13)buildDistrict(this);
  if(id===14)buildBlacksite(this);
  if(id===15){buildNuketown(this);return;}
  this.improveFlow();
  // Set dressing stays separate from collision; small breakables have their own hit state.
  for(let i=0;i<26;i++){let x=(this.random()-.5)*(s*2-5),z=(this.random()-.5)*(s*2-5);if(this.collides({x,y:0,z},.6,1.9))continue;this.detail(x,.012,z,.06+this.random()*.22,.025,.1+this.random()*.15,'dark',{yaw:this.random()*6.28});}
  
  for(const [x,z] of [[-10,10],[10,-10],[-21,-22],[21,22]])if(!this.collides({x,y:0,z},.6,1.9)){const b=this.box(x,.65,z,.8,1.3,.8,'rust',{mesh:'cylinder',breakable:true,hp:45});this.breakables.push(b);}
 }
 improveFlow(){
  // Staggered perimeter screens break the boundary-to-boundary camping lanes.
  // Each screen is freestanding, with room to leave around either end.
  const s=this.info.size,e=s-9,offset=s*.28,material=this.info.id===2?'stone':this.info.id===5?'limestone':'concrete';
  const screens=[];
  for(const sign of [-1,1])for(const side of [-1,1]){
   screens.push({x:sign*e,z:side*offset,w:.7,d:4.2});
   screens.push({x:side*offset,z:sign*e,w:4.2,d:.7});
  }
  for(const p of screens){
   if(this.blocks.some(b=>!b.ground&&Math.abs(p.x-b.x)<(p.w+b.w)/2+2&&Math.abs(p.z-b.z)<(p.d+b.d)/2+2))continue;
   if(this.objectives.some(q=>Math.hypot(p.x-q.x,p.z-q.z)<6)||this.spawns.some(q=>Math.hypot(p.x-q.x,p.z-q.z)<3))continue;
   this.box(p.x,.99,p.z,p.w,1.98,p.d,material,{spawnScreen:true});
   this.detail(p.x,2,p.z,p.w+.08,.055,p.d+.08,'dark');
   const dx=p.w>p.d?1.25:0,dz=p.d>p.w?1.25:0;
   for(const sign of [-1,1])this.detail(p.x+dx*sign,.12,p.z+dz*sign,p.w>p.d?.3:1.1,.24,p.d>p.w?.3:1.1,'dark');
  }
 }
 accessSteps(x,edge,width,height,dir=1){
  // Landings align with the baked 1.25 m navigation cells; short dense treads can
  // otherwise leave the bot's collision radius straddling two different heights.
  const run=this.info.navigationStep??1.25,origin=-this.info.size+run/2,count=Math.ceil(height/.3),rise=height/count;
  const last=origin+(dir>0?Math.floor((edge-.36-origin)/run):Math.ceil((edge+.36-origin)/run))*run;
  for(let i=0;i<count;i++){
   const h=(i+1)*rise,centre=last-dir*(count-1-i)*run;
   const start=centre-dir*(run/2+.01),end=i===count-1?edge+dir*.05:centre+dir*(run/2+.01);
   this.box(x,h/2,(start+end)/2,width,h,Math.abs(end-start),'concrete',{stair:true});
  }
  return {last,run};
 }
 buildBreakwater(){
  // Three routes: the west cargo hall, the central slip and the east container lanes.
  this.room(-21,-7,14,18,5.3,'steel');
  this.room(23,20,10,10,3.5,'concrete');
  for(const [x,z,turn,material] of [[-23,21,false,'blue'],[-20,-25,false,'rust'],[23,-7,true,'blue'],[29,5,true,'rust'],[16,-24,false,'green'],[12,25,true,'blue']])this.container(x,z,turn,material);
  for(const x of [-7,7]){
   this.box(x,.54,0,3.4,1.08,20,'concrete',{dock:true});
   this.accessSteps(x,-10,3.2,1.08,1);this.accessSteps(x,10,3.2,1.08,-1);
   this.detail(x,1.09,0,3.24,.035,19.8,'steel',{color:[.61,.66,.65]});
   for(const z of [-7.5,-2.5,2.5,7.5])this.detail(x,1.13,z,3.18,.055,.12,'orange');
  }
  // A travelling gantry frames the central combat space without closing the floor.
  for(const x of [-10.3,10.3])for(const z of [-11.5,11.5]){
   this.box(x,3.8,z,.55,7.6,.55,'rust');
   this.detail(x,7.6,z,1,.4,1,'dark');
  }
  for(const z of [-11.5,11.5])this.detail(0,7.8,z,22,.65,.65,'orange');
  for(const x of [-10.3,10.3])this.detail(x,7.55,0,.42,.4,24,'steel');
  this.detail(1.5,7.05,-11.5,2,1,.95,'steel');
  this.detail(1.5,5.5,-11.5,.05,2.1,.05,'dark',{mesh:'cylinder'});
  this.detail(1.5,4.4,-11.5,.35,.3,.35,'dark',{mesh:'tube'});
  // Low keel supports alternate sides so the slip offers usable cover and crossfire.
  for(const [x,z]of [[-1.7,-6],[1.7,6]])this.box(x,.58,z,2.3,1.16,2.1,'wood');
  for(const [x,z,t]of [[-30,-21,false],[-29,11,true],[30,-21,false],[20,8,false],[-12,27,false],[-13,-17,true],[27,30,false]])this.barrier(x,z,t);
  for(const [x,z]of [[-25,-11],[-17,-3],[-31,2],[18,16],[28,-16],[-12,19]])this.crate(x,z,2);
  this.objectives=[{name:'A',x:-21,y:0,z:7},{name:'B',x:0,y:0,z:0},{name:'C',x:22,y:0,z:-16}];
 }
 buildCitadel(){
  // Four open arches connect the courtyard to independent covered approach routes.
  for(const sign of [-1,1])for(const offset of [-6.5,6.5]){
   this.box(offset,1.9,sign*10,7,3.8,.55,'limestone');
   this.box(sign*10,1.9,offset,.55,3.8,7,'limestone');
  }
  for(const sign of [-1,1]){
   this.box(0,3.45,sign*10,6,.7,.65,'limestone');
   this.box(sign*10,3.45,0,.65,.7,6,'limestone');
   this.box(sign*8.6,4.0,0,3.4,.3,20.6,'concrete',{roof:true});
   this.box(0,4.0,sign*8.6,14,.3,3.4,'concrete',{roof:true});
  }
  this.room(0,-21,12,10,3.2,'concrete');
  this.room(-22,19,11,12,3.7,'stone');this.room(23,19,12,12,3.9,'concrete');
  this.building(-23,-21,10,11,7.4,'limestone');
  this.box(24,.54,-16,8,1.08,10,'concrete',{overlook:true});
  this.accessSteps(24,-11,3.1,1.08,-1);
  // Equipment is offset on the overlook; its southern edge remains a firing position.
  this.box(26,1.77,-18,2.2,1.38,2.6,'dark');
  this.detail(26,4.1,-18,.28,3.3,.28,'steel',{mesh:'cylinder'});
  this.detail(26,5.6,-18,4.2,.34,3.6,'white',{mesh:'sphere',pitch:.65});
  this.detail(26,5.9,-17.2,.055,1.6,.055,'steel',{pitch:.65});
  for(const [x,z,w,d]of [[-4,-4,2.5,2.4],[4,4,2.5,2.4],[-23,1,3.1,1.3],[23,2,1.3,3.1]])this.box(x,.63,z,w,1.26,d,'limestone');
  for(const [x,z,t]of [[-31,-8,true],[-16,-30,false],[14,-31,false],[32,3,true],[-13,28,false],[12,29,false],[-30,29,false],[30,-27,false]])this.barrier(x,z,t);
  for(const [x,z]of [[-25,17],[20,22],[-16,3],[16,-3],[-2,-23]])this.crate(x,z,2);
  this.objectives=[{name:'A',x:-20,y:0,z:0},{name:'B',x:0,y:0,z:0},{name:'C',x:20,y:0,z:0}];
 }
 buildSwitchyard(){
  // Offset rolling stock leaves crossovers through all three lanes.
  this.room(-22,0,12,20,4.5,'steel',true,true);
  this.room(23,22,11,9,3.5,'concrete',true,true);
  for(const [x,z,c]of [[-5,-19,'blue'],[6,-3,'rust'],[-5,15,'green'],[20,-19,'blue']]){
   this.box(x,1.35,z,3.1,2.7,10,c);this.detail(x,2.75,z,3.2,.12,10.1,'steel');
   for(const dz of [-3.3,3.3])for(const side of [-1,1])this.detail(x+side*1.56,.43,z+dz,.19,.75,.75,'dark',{mesh:'cylinder',roll:Math.PI/2});
   for(let dz=-4;dz<=4;dz+=1.3)this.detail(x,1.55,z+dz,3.14,2.1,.06,'steel');
  }
  for(const x of [-5,6,20]){for(const dx of [-.8,.8])this.detail(x+dx,.032,0,.07,.06,61,'steel');for(let z=-30;z<=30;z+=1.5)this.detail(x,.015,z,2.2,.025,.22,'wood');}
  this.box(23,.54,3,7,1.08,9,'concrete');this.accessSteps(23,-1.5,3,1.08,1);this.accessSteps(23,7.5,3,1.08,-1);
  this.detail(25,2.75,3,.22,3.4,.22,'steel',{mesh:'cylinder'});this.detail(25,4.4,3,.6,.9,.35,'dark');this.detail(24.99,4.58,2.81,.25,.25,.04,'orange',{emissive:.4});
  for(const [x,z,t]of [[-15,-18,true],[-15,18,true],[9,-27,false],[11,23,false],[29,-4,true],[-27,-26,false],[-25,25,false]])this.barrier(x,z,t);
  for(const [x,z]of [[-24,-5],[-20,5],[14,12],[14,-12],[-11,5]])this.crate(x,z,2);
  this.objectives=[{name:'A',x:-22,y:0,z:0},{name:'B',x:0,y:0,z:0},{name:'C',x:23,y:0,z:22}];
 }
 buildCanopy(){
  // Cabins have four exits. A central courtyard is reached without a single choke.
  this.room(-22,-15,12,11,3.6,'plaster',true,true);this.room(22,15,12,11,3.6,'plaster',true,true);
  this.room(-22,17,11,13,3.4,'wood',true,true);this.room(23,-18,12,10,3.8,'concrete',true,true);
  for(const sign of [-1,1]){
   this.box(sign*9,1.25,-4,.65,2.5,11,'stone');this.box(sign*9,1.25,10,.65,2.5,5,'stone');
   this.detail(sign*9,2.53,-4,.8,.08,11.1,'moss');
  }
  this.box(0,.54,-21,8,1.08,8,'concrete');this.accessSteps(0,-17,3,1.08,-1);
  for(const x of [-3.7,3.7])this.detail(x,2.9,-21,.18,3.64,.18,'steel');this.detail(0,4.8,-21,8.5,.18,8.5,'green');
  this.box(2,1.7,-23,2,1.24,1.6,'steel');
  for(const [x,z,t]of [[-13,-4,true],[14,4,true],[-9,25,false],[10,-30,false],[-31,2,true],[31,-1,true],[-27,-29,false],[28,29,false]])this.barrier(x,z,t);
  this.container(0,27,false,'green');for(const [x,z]of [[-18,-14],[19,14],[-17,19],[22,-19],[-4,5],[4,-5]])this.crate(x,z,2);
  this.objectives=[{name:'A',x:-22,y:0,z:1},{name:'B',x:0,y:0,z:0},{name:'C',x:23,y:0,z:-1}];
 }
 buildFrostline(){
  // A radio station and patrol cabins frame three broad, snow-cleared routes.
  this.room(-23,-16,12,12,3.7,'concrete',true,true);this.room(23,16,12,12,3.7,'concrete',true,true);
  this.room(-22,18,10,9,3.2,'steel');this.room(22,-18,10,9,3.2,'steel',true,true);
  for(const [x,z,t]of [[-11,-8,false],[11,8,false],[-9,12,true],[9,-12,true],[-29,8,true],[29,-8,true]])this.barrier(x,z,t);
  this.container(-8,25,false,'white');this.container(8,-25,false,'green');
  this.box(0,.52,0,3.2,1.04,3.2,'steel');
  this.detail(0,2.2,0,.2,2.3,.2,'steel',{mesh:'cylinder'});
  this.detail(0,3.5,0,2.2,.16,1.7,'white',{mesh:'sphere',color:[.77,.84,.87]});
  this.detail(0,4.2,0,4.8,.08,.08,'orange');
  for(const [x,z]of [[-18,10],[18,-10],[-30,-25],[30,25]])this.crate(x,z,2);
  this.objectives=[{name:'A',x:-24,y:0,z:0},{name:'B',x:5,y:0,z:0},{name:'C',x:24,y:0,z:0}];
 }
 buildIronQuarry(){
  // Stone crushers and loading shelters leave two broad flanks around the pit floor.
  this.room(-22,-17,13,12,4.1,'stone',true,true);this.room(22,17,13,12,4.1,'steel');
  this.room(-21,18,10,9,3.3,'concrete');this.room(21,-18,10,9,3.3,'concrete',true,true);
  for(const [x,z,turn,surface]of [[-9,-24,false,'rust'],[9,24,false,'orange'],[-25,6,true,'steel'],[25,-6,true,'rust']])this.container(x,z,turn,surface);
  for(const [x,z,t]of [[-10,-8,false],[10,8,false],[-8,13,true],[8,-13,true],[-29,-7,true],[29,7,true],[-14,27,false],[14,-27,false]])this.barrier(x,z,t);
  // The crusher apron stays low so both bots and players can cross the centre.
  this.box(0,.42,0,9,.84,9,'concrete');
  for(const x of [-5.8,5.8]){
   this.box(x,2.3,0,.42,4.6,1.2,'steel');
   this.detail(x,4.7,0,.7,.25,1.4,'orange');
  }
  this.detail(0,3.7,0,11,.45,.65,'steel',{mesh:'bevel'});
  this.detail(0,3.25,0,2.1,.12,2.1,'orange');
  for(const [x,z]of [[-19,-2],[18,3],[-31,23],[31,-23],[-14,20],[14,-20]])this.crate(x,z,2);
  this.objectives=[{name:'A',x:-24,y:0,z:0},{name:'B',x:5.2,y:0,z:0},{name:'C',x:24,y:0,z:0}];
 }
 buildSkybridge(){
  this.room(-23,-16,13,13,4.8,'plaster',true,true);this.room(23,16,13,13,4.8,'plaster',true,true);
  this.room(-23,17,11,12,3.6,'concrete',true,true);this.room(23,-18,11,12,3.6,'concrete',true,true);
  // Four wide flights serve a raised concourse, with two lower side lanes.
  this.box(0,.54,0,12,1.08,12,'concrete',{concourse:true});
  for(const x of [-3,3]){this.accessSteps(x,-6,3.6,1.08,1);this.accessSteps(x,6,3.6,1.08,-1);}
  for(const x of [-5.8,5.8]){
   for(const z of [-4.5,0,4.5])this.detail(x,2.48,z,.19,2.8,.19,'steel');
   this.detail(x,3.93,0,.35,.18,13,'steel');
  }
  this.detail(0,4.09,0,12.5,.14,13,'glass');
  for(const z of [-4,0,4])this.detail(0,4.18,z,12.5,.08,.10,'steel');
  for(const [x,z,t]of [[-12,-9,true],[12,9,true],[-11,16,false],[11,-16,false],[-28,1,true],[28,-1,true],[-15,-28,false],[15,28,false]])this.barrier(x,z,t);
  for(const [x,z]of [[-20,-13],[20,13],[-17,24],[17,-24]])this.crate(x,z);
  for(const sign of [-1,1]){
   this.detail(sign*23,4.5,sign*16,10,.3,1.6,'dark');
   this.detail(sign*23,4.49,sign*16-.83,8,.16,.03,'white',{emissive:.65,color:[.28,.78,.84]});
  }
  this.objectives=[{name:'A',x:-23,y:0,z:0},{name:'B',x:0,y:1.08,z:0},{name:'C',x:23,y:0,z:0}];
 }
 buildMonsoon(){
  this.room(0,0,20,24,5.4,'steel',true,true);
  this.room(-24,-21,12,10,3.5,'wood',true,true);this.room(24,21,12,10,3.5,'wood',true,true);
  this.room(-25,22,10,11,3.2,'concrete');this.room(25,-22,10,11,3.2,'concrete',true,true);
  for(const [x,z,t,c]of [[-23,-3,true,'blue'],[23,3,true,'rust'],[-8,-28,false,'green'],[8,28,false,'blue']])this.container(x,z,t,c);
  for(const [x,z,t]of [[-6,-6,true],[6,6,true],[-15,13,false],[15,-13,false],[-32,-10,true],[32,10,true],[-16,-31,false],[16,31,false]])this.barrier(x,z,t);
  for(const [x,z]of [[-6,5],[6,-5],[-21,-19],[21,19],[-29,20],[29,-20]])this.crate(x,z,2);
  for(const x of [-8,8]){
   this.box(x,1.05,0,1.5,2.1,2.7,'dark');this.detail(x,2.14,0,1.6,.07,2.8,'steel');
   this.detail(x,1.4,-1.37,.82,.5,.045,'glass');
  }
  this.detail(0,6.5,0,1.6,1.8,1.6,'steel',{mesh:'cylinder'});
  this.detail(0,7.7,0,.1,1,.1,'steel');this.detail(0,8.22,0,.42,.09,.42,'orange',{emissive:.8});
  this.objectives=[{name:'A',x:-23,y:0,z:9},{name:'B',x:0,y:0,z:0},{name:'C',x:23,y:0,z:-9}];
 }
 buildEmberworks(){
  this.room(-21,-17,13,12,5,'rust',true,true);this.room(21,17,13,12,5,'steel',true,true);
  this.room(-22,19,11,10,3.5,'concrete');this.room(22,-19,11,10,3.5,'concrete',true,true);
  for(const [x,z]of [[-7,-10],[7,10],[-28,2],[28,-2]]){
   this.box(x,1.8,z,2.9,3.6,2.9,'rust',{mesh:'cylinder'});
   for(const y of [.28,2.75,3.5])this.detail(x,y,z,3.02,.13,3.02,'steel',{mesh:'cylinder'});
   this.detail(x,3.9,z,2.9,.28,2.9,'steel',{mesh:'sphere'});
  }
  // The pipe span frames crossfire without adding collision in the central lane.
  for(const x of [-11,11])this.box(x,2.4,0,.55,4.8,.55,'steel');
  for(const z of [-.6,.6])this.detail(0,4.8,z,.55,22,.55,'rust',{mesh:'cylinder',roll:Math.PI/2});
  this.box(0,.54,-23,9,1.08,9,'steel',{catwalk:true});
  this.accessSteps(0,-18.5,3.4,1.08,-1);
  for(const x of [-4.1,4.1])for(const z of [-26,-23,-20])this.detail(x,1.6,z,.06,1.05,.06,'orange');
  for(const x of [-4.1,4.1])this.detail(x,2.15,-23,.065,.07,7,'steel');
  this.detail(0,1.12,-23,8.6,.045,8.6,'dark');
  for(const [x,z,t]of [[-14,-2,true],[14,2,true],[-9,21,false],[9,-30,false],[-31,-16,false],[31,16,false],[-15,30,false],[15,-30,false]])this.barrier(x,z,t);
  for(const [x,z]of [[-16,-15],[16,15],[-17,19],[17,-19],[-3,7],[3,-7]])this.crate(x,z,2);
  this.objectives=[{name:'A',x:-22,y:0,z:0},{name:'B',x:0,y:0,z:0},{name:'C',x:22,y:0,z:0}];
 }
 bakeCollision(){
  this.rayGrid=new RayGrid(this.blocks,this.info.size);
  // Expand by the largest gameplay capsule. Point queries then touch one bucket.
  this.collisionBlocks=this.blocks;this.collisionCount=this.blocks.length;
  const n=Math.ceil(this.info.size*2/4)+2;this.collisionSize=n;
  this.collisionCells=Array.from({length:n*n},()=>[]);
  for(const b of this.blocks){if(b.ground)continue;
   const x0=Math.max(0,Math.floor((b.x-b.w/2-1+this.info.size)/4)),x1=Math.min(n-1,Math.floor((b.x+b.w/2+1+this.info.size)/4));
   const z0=Math.max(0,Math.floor((b.z-b.d/2-1+this.info.size)/4)),z1=Math.min(n-1,Math.floor((b.z+b.d/2+1+this.info.size)/4));
   for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)this.collisionCells[z*n+x].push(b);
  }
 }
 nearby(p,r=.32){
  if(!this.collisionCells||this.collisionBlocks!==this.blocks||this.collisionCount!==this.blocks.length||r>1)return this.blocks;
  const x=Math.floor((p.x+this.info.size)/4),z=Math.floor((p.z+this.info.size)/4),n=this.collisionSize;
  return x>=0&&z>=0&&x<n&&z<n?this.collisionCells[z*n+x]:this.blocks;
 }
 collides(p,r=.32,h=1.75){for(const b of this.nearby(p,r)){if(b.ground||b.destroyed)continue;if(Math.abs(p.x-b.x)<b.w/2+r&&Math.abs(p.z-b.z)<b.d/2+r&&p.y+h>b.y-b.h/2+.03&&p.y<b.y+b.h/2-.03)return true;}return false;}
 floorAt(p,maxY=p.y+.34){let floor=0;for(const b of this.nearby(p)){if(b.destroyed)continue;const top=b.y+b.h/2;if(top<=maxY+.001&&top>floor&&Math.abs(p.x-b.x)<b.w/2+.32&&Math.abs(p.z-b.z)<b.d/2+.32)floor=top;}return floor;}
 trace(o,d,limit=160,ignore=null){
  if(this.rayGrid?.blocks===this.blocks&&this.rayGrid.count===this.blocks.length&&this.collisionCells)return this.rayGrid.trace(o,d,limit,ignore);
  let t=limit,block=null;for(const b of this.blocks){if(b.destroyed||b===ignore)continue;const n=rayBox(o,d,b,t);if(n!==null&&n<t){t=n;block=b;}}return{t,block};
 }
 visible(a,b){const len=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);if(len<.01)return true;return this.trace(a,{x:(b.x-a.x)/len,y:(b.y-a.y)/len,z:(b.z-a.z)/len},len).t>=len-.12;}
 indoors(p){for(const b of this.nearby(p))if(!b.destroyed&&b.roof&&Math.abs(p.x-b.x)<b.w/2&&Math.abs(p.z-b.z)<b.d/2&&p.y<b.y)return true;return false;}
}
