import {addZipline} from './traversal.js?v=101';

export function buildFloodgate(arena) {
  const box = (...args) => arena.box(...args);
  const detail = (...args) => arena.detail(...args);
  arena.objectives = [
    {name:'A',x:-29,y:0,z:-5},
    {name:'B',x:0,y:0,z:0},
    {name:'C',x:29,y:0,z:5}
  ];

  // The intake hall leaves the east and west ends open for the central route.
  box(0,6.2,0,28,.4,15,'steel',{roof:true,room:true});
  for (const side of [-1,1]) {
    const z=side*7.5;
    for (const x of [-10,0,10]) box(x,3,z,.52,6,.58,'concrete');
    box(0,4.9,z,28,2.2,.4,'blue');
    detail(0,5.95,z,28,.14,.5,'orange');
    for (const x of [-7,7]) {
      box(x,.78,z,4,1.56,.55,'concrete');
      detail(x,1.59,z,4,.05,.58,'steel');
    }

  }

  for (const x of [-10,-5,0,5,10]) {
    detail(x,5.72,0,.26,.45,14.5,'steel');
    detail(x,5.46,0,.9,.065,2.1,'white',{emissive:.75});
  }

  // Two rotor cages make the central hall a dogleg without sealing the deck.
  for (const [x,z] of [[-9,3],[9,-3]]) {
    box(x,1.25,z,3.6,2.5,2.65,'blue');
    detail(x,2.72,z,3.55,.45,2.45,'steel',{mesh:'bevel'});
    for (const offset of [-1.5,-.75,0,.75,1.5]) {
      detail(x+offset,2.98,z,.12,.14,2.4,'orange');
      detail(x+offset,1.55,z+1.34,.18,.65,.045,'dark');
    }
    for (const side of [-1,1]) detail(x+side*1.94,.5,z,.55,1,1.9,'steel',{mesh:'cylinder'});
  }

  // Each gate bridges a full partition. The outer lanes stay open.
  for(const [name,x,z] of [['Gantry gate',-5,-11],['Spillway gate',5,11]]){
    const left=x-2,right=x+2;
    box((-15+left)/2,2.55,z,left+15,5.1,.55,'concrete');
    box((15+right)/2,2.55,z,15-right,5.1,.55,'concrete');
    for(const edge of [left,right]){
      detail(edge,2.55,z,.17,5.1,.72,'orange');
      detail(edge,5.2,z,.52,.19,.74,'steel');
    }
    const barrier=box(x,2.55,z,4,5.1,.55,'steel',{invisible:true,routeGate:true});
    const panels=[-1,1].map(side=>({x:x-2.5,y:0,z:z+side*1}));
    for(const panel of panels)detail(panel.x,.58,panel.z,.29,1.16,.3,'steel',{mesh:'bevel'});
    arena.doors.push({name,barrier,panels,lift:0,opening:false});
  }

  // A walkable service gantry links the outer yards above the north flank.
  box(0,2.23,-17,26.4,.34,5.4,'steel',{catwalk:true});
  for (const x of [-11,-4,4,11]) {
    box(x,1,-19.35,.36,2,.48,'concrete');
    detail(x,2,-16.95,.3,.42,4.9,'orange');
  }
  for (const side of [-1,1]) {
    for (let step=0;step<8;step++) {
      const height=(step+1)*.3;
      box(side*(19.2-step*.8),height/2,-17,.805,height,4,'steel',{stair:true});
    }
  }
  for (const z of [-19.55,-14.45]) for(const x of [-9,0,9]) {
    detail(x,2.95,z,7.4,.08,.085,'orange');
    for(const offset of [-3.65,0,3.65])detail(x+offset,2.7,z,.08,.55,.085,'steel');
  }

  for(const side of [-1,1]){
    addZipline(arena,{x:side*11,y:2.4,z:-14.55},{x:side*31,y:0,z:-5});
  }

  // A fenced spillway separates the southern path from its outer gallery.
  for (const x of [-10,10]) {
    detail(x,.025,18,16,.022,5,'water',{mesh:'surface',surfaceLayer:2});
    for(const z of [15.4,20.6]){
      box(x,.44,z,16,.88,.42,'concrete');
      detail(x,.91,z,16,.07,.48,'blue');
    }
    box(x+Math.sign(x)*8,.44,18,.42,.88,5.4,'concrete');
  }
  detail(0,.027,18,3.8,.04,5.7,'steel');
  for (const x of [-2,2]) box(x,.5,18,.16,1,5.3,'orange');
  arena.room(-26,17,8,10,3.2,'blue',true,true);
  arena.room(25,-23,8,10,3.2,'concrete',true,true);
  arena.room(-26,-25,9,8,3.2,'concrete',true,true);
  arena.room(26,23,9,8,3.2,'blue',true,true);

  for (const [x,z,turn] of [[-22,-3,true],[22,3,true],[-6,-25,false],[7,-26,false],[-19,8,false],[18,10,false],[-9,28,true],[9,29,true]])arena.barrier(x,z,turn);
  for (const [x,z,turn] of [[-36,13,true],[36,-13,true],[-13,27,false],[15,-28,false]])arena.container(x,z,turn,'blue');
  for (const [x,z] of [[-25,5],[25,-6],[-20,-23],[19,24],[-3,10],[3,-10]])arena.crate(x,z,1);
  for (const z of [-31,31]) for (const x of [-18,-6,6,18]) {
    detail(x,.025,z,2,.04,.16,'white');
    detail(x,.025,z+1.1,2,.04,.16,'white');
  }
}
