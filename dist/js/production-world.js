// Presentation is built from the authoritative Arena. No art operation adds a
// collider, changes a firing aperture, or moves an objective/navigation route.
const industrialTag=/INDUSTRIAL|REFINERY|DOCKYARD|RAIL|TROPICAL/;
const texturedMetal=new Set(['roof_truss','switchgear','vent','light_fixture','cooling_stack','cable_tray','pipe_rack','rooftop_hvac','duct_run','loading_shutter','drain_channel','blacksite_hall_roof','blacksite_hall_cladding']);

/** Recover the actual holes in a room wall at a requested height. Matching the
 * collider segments matters: Blacksite's open windows must never become glass,
 * and a facade kit must not narrow an existing doorway. */
export function wallOpenings(arena,roof,axis,sign,height=.7){
 const normal=axis==='z'?'z':'x',along=axis==='z'?'x':'z';
 const span=(axis==='z'?roof.w:roof.d)-.6,depth=(axis==='z'?roof.d:roof.w)-.6;
 const edge=roof[normal]+sign*depth/2,centre=roof[along];
 const segments=arena.blocks.filter(p=>!p.roof&&!p.ground&&!p.destroyed&&
  (axis==='z'?p.d:p.w)<=.7&&Math.abs(p[normal]-edge)<.05&&
  p.y-p.h/2<height&&p.y+p.h/2>height&&
  Math.abs(p[along]-centre)<span/2+.05).map(p=>{
   const width=axis==='z'?p.w:p.d;
   return [Math.max(-span/2,p[along]-centre-width/2),Math.min(span/2,p[along]-centre+width/2)];
  }).sort((a,b)=>a[0]-b[0]);
 if(!segments.length)return [];
 let end=-span/2;const openings=[];
 for(const [left,right]of segments){
  if(left-end>.35)openings.push({axis,sign,edge,at:centre+(end+left)/2,width:left-end});
  end=Math.max(end,right);
 }
 if(span/2-end>.35)openings.push({axis,sign,edge,at:centre+(end+span/2)/2,width:span/2-end});
 return openings;
}

export function productionWorld(arena,parts){
 const id=arena.info.id,size=arena.info.size,industrial=industrialTag.test(arena.info.tag);
 const visual=(p,extra)=>Object.assign(Object.create(p),{blenderPrepared:null,...extra});
 const result=parts.map(p=>{
  const ground=!!(p.ground||!p.roof&&p.h<.10&&p.y<.30&&p.w>1.5&&p.d>1.5&&p.surface!=='water');
  const epoxy=ground&&(industrial||id===14)&&(p.tile===14||p.surface==='tiles');
  return visual(p,{productionGround:ground,...(epoxy?{surface:'concrete',tile:0,color:[.91,.94,.91],productionEpoxy:true,rough:.72}:{})});
 });
 // Authored material diversity is inside each merged native mesh. Identical
 // pieces share one draw batch; colour variants remain per-instance attributes.
 const add=(x,y,z,w,h,d,kind,extra={},source)=>{
  const p={x,y,z,w,h,d,surface:'steel',tile:texturedMetal.has(kind)?8:-1,blenderKind:kind,blenderColour:true,
   productionArt:true,productionRole:kind,...extra};
  const part=source?Object.assign(Object.create(source),p):p;
  result.push(part);return part;
 };
 const floor=(x,z,w,d,surface='concrete',extra={},source)=>add(x,.036,z,w,.006,d,'surface',{
  mesh:'surface',surface,tile:surface==='concrete'?0:surface==='gravel'?7:4,
  blenderColour:false,color:[.95,.96,.94],productionGround:true,surfaceLayer:3,
  rough:.92,...extra},source);
 const frame=(hole,bottom,clearance,kind,source)=>{
  const width=hole.width/.80,height=clearance/(kind==='aperture_frame'?.76:.88);
  const y=kind==='aperture_frame'?bottom+clearance/2:bottom+height/2;
  const x=hole.axis==='z'?hole.at:hole.edge,z=hole.axis==='z'?hole.edge:hole.at;
  const yaw=hole.axis==='z'?(hole.sign>0?Math.PI:0):(hole.sign>0?-Math.PI/2:Math.PI/2);
  const surface=industrial||['steel','dark','concrete'].includes(source.surface)?'concrete':source.surface;
  const tile=surface==='limestone'?2:['stone','plaster'].includes(surface)?1:0;
  return add(x,y,z,width,height,.43,kind,{yaw,surface,tile,blenderColour:false,
   color:[.96,.98,.96],rough:.9,metal:0,productionOpening:{
   x:hole.axis==='z'?hole.at:hole.edge,z:hole.axis==='z'?hole.edge:hole.at,
   axis:hole.axis,width:hole.width,bottom,top:bottom+clearance
  }},source);
 };
 const rooms=arena.info.authoredDressing?[]:arena.blocks.filter(p=>p.roof&&p.room&&!p.destroyed&&p.w>5&&p.d>5);
 for(const roof of rooms){
  const ceiling=roof.y-roof.h/2,w=roof.w-.6,d=roof.d-.6;
  const mainHall=ceiling>4.4&&(industrial||id===3||id===14);
  // Concrete shoulders and recessed drainage establish the construction's
  // footprint. They are centimetre-level finishes, never decorative cover.
  for(const sign of [-1,1]){
   floor(roof.x,roof.z+sign*(d/2+.75),w+2.0,1.1,'concrete',{},roof);
   floor(roof.x+sign*(w/2+.75),roof.z,1.1,d,'concrete',{},roof);
   if(industrial||id===14)add(roof.x,.042,roof.z+sign*(d/2+1.32),w+.4,.024,.22,'drain_channel',{},roof);
  }
  // The native U-shaped entry assembly overlaps the SOLID wall wings. Its
  // empty centre is sized from the exact existing opening and free clearance.
  for(const axis of ['x','z'])for(const sign of [-1,1]){
   for(const hole of wallOpenings(arena,roof,axis,sign)){
    const centre={x:hole.axis==='z'?hole.at:hole.edge,z:hole.axis==='z'?hole.edge:hole.at};
    const lintel=arena.blocks.filter(p=>!p.roof&&!p.ground&&
     Math.abs(p.x-centre.x)<.06&&Math.abs(p.z-centre.z)<.06&&p.y-p.h/2>.5)
     .sort((a,b)=>(a.y-a.h/2)-(b.y-b.h/2))[0];
    if(!lintel||hole.width>5.2)continue;
    const clearance=lintel.y-lintel.h/2;
    if(clearance<2.0)continue;
    frame(hole,0,clearance,'doorway_surround',roof);
   }
  }
  // Combat-room windows remain unglazed. The four-sided bolted reveal frames
  // the real sill-to-lintel gap; it carries no pane or collision proxy.
  const aperture=arena.blocks.some(p=>p.aperture&&!p.house&&
   Math.abs(p.x-roof.x)<w/2+.3&&Math.abs(p.z-roof.z)<d/2+.3);
  if(aperture)for(const axis of ['x','z'])for(const sign of [-1,1]){
   for(const hole of wallOpenings(arena,roof,axis,sign,1.4)){
    if(wallOpenings(arena,roof,axis,sign).some(p=>Math.abs(p.at-hole.at)<.1))continue;
    if(hole.width>3.0)continue;
    const x=axis==='z'?hole.at:hole.edge,z=axis==='z'?hole.edge:hole.at;
    const pieces=arena.blocks.filter(p=>!p.roof&&Math.abs(p.x-x)<.06&&Math.abs(p.z-z)<.06);
    const sill=pieces.filter(p=>p.y+p.h/2<1.4).sort((a,b)=>(b.y+b.h/2)-(a.y+a.h/2))[0];
    const lintel=pieces.filter(p=>p.y-p.h/2>1.4).sort((a,b)=>(a.y-a.h/2)-(b.y-b.h/2))[0];
    if(sill&&lintel)frame(hole,sill.y+sill.h/2,lintel.y-lintel.h/2-sill.y-sill.h/2,'aperture_frame',roof);
   }
  }
  if(mainHall){
   const span=Math.max(4,w-.8),depth=Math.max(4,d-.8);
   for(const fraction of [-.30,0,.30])add(roof.x,ceiling-.48,roof.z+depth*fraction,span,.83,.22,'roof_truss',{},roof);
   // Visible industrial service systems frame the ceiling rather than adding
   // floor clutter. Even the lowest component remains above head clearance.
   for(const sign of [-1,1]){
    add(roof.x+sign*(w/2-1),ceiling-.85,roof.z,d-1,.25,.62,'cable_tray',{yaw:Math.PI/2},roof);
    add(roof.x,ceiling-.94,roof.z+sign*(d/2-1.05),w-2,.52,.72,'pipe_rack',{},roof);
   }
  }
  // Mechanical roof units sit over walls/roofs and have modelled fan shrouds,
  // coils and duct connections. No placeholder tower is placed in a lane.
  if(industrial||id===3||id===8||id===10||id===14){
   if(mainHall){
    // Near the roof edge, these change the silhouette from real player-height
    // approach cameras. Units buried at the middle of a flat roof are hidden.
    for(const sign of [-1,1]){
     // Blacksite's units stand on the new roof slopes with a short supported
     // duct connection. Other halls keep their original flat-roof mounts.
     const support=id===14?.73:0;
     add(roof.x+sign*w*.34,roof.y+roof.h/2+.72+support,roof.z+d/2-1.8,3.0,1.44,2.0,'rooftop_hvac',{},roof);
     add(roof.x+sign*w*.34,roof.y+roof.h/2+.23+support,roof.z+d/2-3.45,1.05,.46,2.0,'duct_run',{yaw:Math.PI/2},roof);
    }
   }else add(roof.x-w*.25,roof.y+roof.h/2+.47,roof.z+d*.22,2.25,.94,1.55,'rooftop_hvac',{},roof);
  }
  // A service cabinet is mounted only on a verified solid wall wing. This
  // avoids the previous placement across a room's window or doorway.
  const wall=arena.blocks.find(p=>!p.roof&&!p.ground&&p.h>2.4&&p.w>2.5&&p.d<.7&&
   Math.abs(p.z-(roof.z+d/2))<.05&&Math.abs(p.x-roof.x)<w/2);
  if(wall&&(industrial||id===14))add(wall.x,1.63,wall.z-wall.d/2-.10,1.15,1.08,.19,'switchgear',{},wall);
 }
 for(const lamp of arena.decor.filter(p=>p.surface==='white'&&p.emissive>.5&&p.y>2.5))
  add(lamp.x,lamp.y+.035,lamp.z,Math.max(.38,lamp.w+.14),.14,Math.max(.48,lamp.d+.14),'light_fixture',{},lamp);
 // Detailed landmarks beyond the arena preserve the playable footprint while
 // giving the skyline an industrial scale and a clear identity.
 if(industrial){
  for(const [x,z,h]of [[-size-9,-size*.45,24+id%4*3],[size+12,size*.4,18+id%3*4]])
   add(x,h*.5,z,3.4,h,3.4,'cooling_stack',{landscape:true});
 }
 if(id===14){
  const hall=arena.blocks.find(p=>p.roof&&p.room&&p.x===0&&p.z===0);
  if(hall){
   // A purpose-built turbine-hall silhouette replaces the generic flat slab.
   // The gable is visible from player height. Its entire envelope stays above
   // the old roof; broad facade bands start above every firing aperture.
   add(0,7.375,0,34.9,2.15,23.2,'blacksite_hall_roof',{productionRole:'turbine_hall_roof'},hall);
   for(const axis of ['x','z'])for(const sign of [-1,1]){
    const along=axis==='z'?34.28:22.16,edge=axis==='z'?11.135:17.135;
    add(axis==='z'?0:sign*edge,4.60,axis==='z'?sign*edge:0,along,2.80,.19,
     'blacksite_hall_cladding',{productionRole:'turbine_hall_cladding',
      yaw:axis==='z'?(sign>0?Math.PI:0):(sign>0?-Math.PI/2:Math.PI/2)},hall);
   }
  }
  // Restricted facility service yards: broad coherent material areas make the
  // hall, elevated routes and container flanks read as one designed location.
  for(const sign of [-1,1]){
   floor(sign*23,0,6.4,24,'concrete');
   floor(sign*43,sign*30,17,18,'gravel',{color:[.74,.77,.72]});
   // A poured service forecourt and connected approach replace the uniform
   // asphalt foreground with a physically useful construction footprint. The
   // finish stays below the original contact-shadow/impact receiving height.
   floor(0,sign*16.2,34,8.2,'concrete',{y:.029,blenderKind:'blacksite_service_apron',
    blenderColour:true,yaw:sign>0?Math.PI:0,productionRole:'service_apron'});
   floor(0,sign*26.1,13.5,11.8,'concrete',{y:.029,blenderKind:'blacksite_service_approach',
    blenderColour:true,yaw:sign>0?Math.PI:0,productionRole:'service_approach'});
   for(const x of [-9.5,9.5])floor(x,sign*16.8,.14,5.8,'concrete',{
    y:.0305,surfaceLayer:4,color:[.74,.65,.38],productionRole:'painted_service_lane'});
   floor(0,sign*19.6,19.1,.14,'concrete',{
    y:.0305,surfaceLayer:4,color:[.74,.65,.38],productionRole:'painted_service_lane'});
   for(const x of [-10,10])add(x,4.35,sign*11.24,2.35,.72,.23,'vent',{yaw:sign<0?0:Math.PI});
   add(0,4.48,sign*11.245,3.25,.78,.10,'site_sign_14',{yaw:sign<0?Math.PI:0});
   // Closed maintenance bays are ON the solid upper hall facade. Their bases
   // sit above the open windows and cannot obstruct the window sightline.
   for(const x of [-13.75,13.75])add(x,3.72,sign*11.23,1.9,1.65,.13,'loading_shutter',{yaw:sign>0?Math.PI:0});
  }
  for(const x of [-10,10])for(const z of [-5,5]){
   const generator=arena.blocks.find(p=>p.x===x&&p.z===z&&p.surface==='dark'&&p.h===2.3);
   if(!generator)continue;
   floor(x,z,3.6,4.0,'concrete',{productionEpoxy:true},generator);
   add(x,2.30,z,3.05,.42,.6,'pipe_rack',{},generator);
  }
  // Distant switchyard architecture gives the perimeter real industrial mass;
  // it stays outside the original boundary wall and does not act as cover.
  for(const sign of [-1,1]){
   add(sign*(size+11),5.1,sign*9,12,10.2,23,'building_industrial',{surface:'concrete',tile:0,landscape:true,blenderColour:false,color:[.82,.88,.85]});
   add(sign*25,4.4,sign*(size+8),25,8.8,10,'building_industrial',{surface:'concrete',tile:0,landscape:true,blenderColour:false,color:[.79,.85,.82]});
  }
 }else{
  const wall=arena.blocks.find(p=>!p.roof&&p.h>3&&p.w>5&&p.d<.65);
  if(wall)add(wall.x,Math.min(wall.y+wall.h*.3,3.7),wall.z+wall.d*.5+.04,Math.min(2.4,wall.w*.7),.57,.07,'site_sign_'+id,{},wall);
 }
 return result;
}
