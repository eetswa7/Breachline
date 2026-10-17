// Render-only assembly of the Blender kit. The simulation's arena objects,
// collision, objectives and navigation stay authoritative.
import {productionWorld} from './production-world.js?v=71';
export function blenderWorld(arena){
 const visual=(p,options)=>Object.assign(Object.create(p),{blenderPrepared:null,...options});
 const buildings=arena.blocks.filter(p=>!p.ground&&!p.roof&&p.h>5&&p.w>4&&p.d>4);
 const nearBuilding=p=>buildings.some(b=>Math.abs(p.x-b.x)<b.w*.55&&Math.abs(p.z-b.z)<b.d*.55&&p.y<b.y+b.h*.5+.08);
 const generators=arena.blocks.filter(p=>p.surface==='dark'&&p.w>1&&p.d>1&&p.h>.8&&p.h<3.1);
 const cars=arena.blocks.filter(p=>(p.culdesacCar||p.shellThickness>0&&p.shellThickness<.01&&p.h<1.4)&&Math.min(p.w,p.d)>1.5);
 const cargo=arena.blocks.filter(p=>p.shellThickness>0&&p.shellThickness<.01&&p.h>2&&Math.max(p.w,p.d)>4);
 const generatorTrim=p=>generators.some(b=>Math.abs(p.x-b.x)<b.w/2+.12&&Math.abs(p.z-b.z)<b.d/2+.12&&
  p.y>b.y-b.h/2&&p.y<b.y+b.h/2+.36&&p.h<.65&&['orange','rust','glass','steel','dark'].includes(p.surface));
 const cargoTrim=p=>cargo.some(b=>Math.abs(p.x-b.x)<b.w/2+.12&&Math.abs(p.z-b.z)<b.d/2+.12&&
  p.y>b.y-b.h/2&&p.y<b.y+b.h/2+.15&&['steel','dark'].includes(p.surface)&&
  (Math.min(p.w,p.d)<.15||p.h<.15));
 const carTrim=p=>cars.some(b=>Math.abs(p.x-b.x)<b.w/2+.22&&Math.abs(p.z-b.z)<b.d/2+.22&&p.y<1.8);
 const palmTops=arena.decor.filter(p=>p.surface==='bark'&&p.mesh==='sphere'&&p.w>.7&&p.y>4);
 const broadTrunks=arena.decor.filter(p=>p.surface==='bark'&&p.mesh==='cylinder'&&p.h>2&&p.h<6&&p.w===.3);
 const parts=[];
 for(const p of arena.blocks){
  if(p.invisible||p.destroyed)continue;
  // Cars previously inherited the cargo-container selector because both use
  // thin metal shells. The new complete vehicle replaces body/glass/wheel
  // primitives and retains the exact authoritative collision reference.
  if(cars.includes(p)){
   const alongX=p.w>p.d,top=p.culdesacCar?1.72:1.565;
   parts.push(visual(p,{x:p.x,y:top/2,z:p.z,w:Math.min(p.w,p.d),h:top,d:Math.max(p.w,p.d),
    yaw:alongX?Math.PI/2:0,blenderKind:'vehicle_sedan',blenderColour:true,tile:8}));continue;
  }
  if(generators.includes(p)){parts.push(visual(p,{blenderKind:'generator',blenderColour:true,tile:8}));continue;}
  // Large painted building envelopes must not inherit the black machined
  // steel finish used by barrels and machinery. Keep the collider reference.
  if(!p.ground&&!p.roof&&p.h>.65&&Math.max(p.w,p.d)>1.1&&['steel','dark'].includes(p.surface)&&
   (p.h>2&&Math.max(p.w,p.d)>2.2||Math.min(p.w,p.d)<.7)){
   parts.push(visual(p,{surface:'concrete',tile:0,color:[.96,.98,.96],rough:.86,metal:.04,productionPaint:true,...(p.w>4&&p.d>4&&p.h>5?{blenderKind:'building_industrial'}:{})}));continue;
  }
  // Broad piers and window sills are part of the same authored construction
  // kit as tall wall wings, rather than a mix of flat primitive boxes. The
  // stone/plaster/concrete PBR material still provides metre-scaled texture.
  // Low lintel bands already sit behind the authored portal's dimensional
  // header. Their aggregate detail is redundant above the player's sightline;
  // retain the PBR finish and chamfered silhouette without tie-rod fittings.
  const portalHeader=p.aperture&&!p.house&&p.h<2&&p.y-p.h/2>2.4;
  if(!portalHeader&&!p.ground&&!p.roof&&!p.stair&&!p.fence&&!p.breakable&&p.h>.65&&Math.min(p.w,p.d)<.7&&Math.max(p.w,p.d)>2&&
   ['plaster','stone','limestone','concrete'].includes(p.surface)){
   parts.push(visual(p,{blenderKind:'wall',...(p.house?{tile:1,color:(p.color??[.9,.86,.75]).map(v=>.46+v*.54),rough:.88}:{})}));continue;
  }
  parts.push(p);
 }
 for(const p of arena.decor){
  // Four legacy service-bridge rods had no supports and extended 6.5 m past
  // each side of the 10 m catwalk. Remove that decorative floating geometry;
  // the bridge itself and every authoritative collider remain unchanged.
  if(arena.info.id===14&&p.surface==='steel'&&p.mesh==='cylinder'&&p.roll===Math.PI/2&&p.y===5.1&&p.h===23&&p.w===.3&&p.d===.3)continue;
  // Blacksite's two supported crane spans were single cylindrical rods.
  // Native open-web trusses retain the same centres and clear overhead paths;
  // vertical columns keep the original 0.30 m footprint after unit scaling.
  if(arena.info.id===14&&p.surface==='steel'&&p.mesh==='cylinder'&&p.roll===Math.PI/2&&p.y>=5&&p.h>=20&&p.w<.4&&p.d<.4){
   parts.push(visual(p,{w:p.h,h:p.y>7?.72:.54,d:p.d/.18,roll:0,
    blenderKind:'roof_truss',blenderColour:true,tile:8,productionCrane:true}));continue;
  }
  if(arena.info.id===14&&p.surface==='orange'&&p.h===7.4&&p.w===.3&&p.d===.3){
   parts.push(visual(p,{w:p.h,h:.30,d:p.d/.18,roll:Math.PI/2,surface:'steel',
    blenderKind:'roof_truss',blenderColour:true,tile:8,productionCrane:true}));continue;
  }
  // The native facade includes glazing, reveals, bands and foundations. Avoid
  // submitting the old window/trim components over the same baked geometry.
  if(nearBuilding(p)&&(['glass','blue','wood'].includes(p.surface)||p.w<.12||p.h<.21))continue;
  // The new native machinery/container/vehicle owns these visible details.
  // Do not draw the legacy lid, corrugation bars or floating mechanical trim
  // a second time on top of its baked geometry and PBR finish.
  if(generatorTrim(p)||cargoTrim(p)||carTrim(p))continue;
  // Generic pillow-shaped sandbags on every concrete barrier obscured the
  // tapered Jersey silhouette. These were art-only details, never cover.
  if(p.surface==='fabric'&&p.h===.23&&p.w===.82&&p.d===.54)continue;
  if(p.surface==='glass'&&p.h>.6&&Math.min(p.w,p.d)<.1&&Math.max(p.w,p.d)>.7){
   const alongX=p.w>p.d;
   parts.push(visual(p,{w:Math.max(p.w,p.d)+.13,h:p.h+.16,d:.17,
    yaw:alongX?0:Math.PI/2,blenderKind:'blast_window',blenderColour:true,surface:'steel',tile:8}));continue;
  }
  if(p.surface==='steel'&&p.w>1&&p.d>.7&&p.h>.4&&p.h<1.1&&p.y>3){
   // Production room assemblies place full roof units and connected ducts.
   // Solid-building roofs retain the replacement at the old unit's position.
   if(arena.blocks.some(b=>b.roof&&b.room&&!b.house&&Math.abs(b.x-p.x)<.05&&Math.abs(b.z-p.z)<.05))continue;
   parts.push(visual(p,{blenderKind:'rooftop_hvac',blenderColour:true,tile:8}));continue;
  }
  if(p.mesh==='conifer'){parts.push(visual(p,{blenderWind:true,tile:-1}));continue;}
  parts.push(p);
 }
 for(const p of arena.foliage??[]){
  if(palmTops.some(t=>p.leaf===1&&p.h>2&&Math.hypot(p.x-t.x,p.z-t.z)<2))continue;
  if(broadTrunks.some(t=>p.leaf===0&&p.h>2&&Math.hypot(p.x-t.x,p.z-t.z)<1.8))continue;
  parts.push(p);
 }
 for(const p of palmTops)parts.push({x:p.x,y:p.y-.46,z:p.z,w:6,h:2,d:6,surface:'green',tile:-1,blenderKind:'palm_crown',blenderWind:true,color:[1,1,1],landscape:p.y>8});
 for(const p of broadTrunks)parts.push({x:p.x,y:p.y+p.h*.72,z:p.z,w:p.h*1.7,h:p.h*1.1,d:p.h*1.7,surface:'green',tile:-1,blenderKind:'tree_crown',blenderWind:true,color:[1,1,1],landscape:p.y>4});
 // These objects dress the inaccessible perimeter, so their visual silhouettes
 // never introduce invisible combat cover or obstruct a playable lane.
 const s=arena.info.size,id=arena.info.id;
 if(id!==6&&id!==8){
  for(const sign of [-1,1]){
   parts.push({x:sign*(s+3.9),y:.9,z:sign*s*.35,w:2.1,h:1.8,d:4.7,yaw:sign*.28,surface:'dark',tile:8,blenderKind:'utility_van',blenderColour:true});
   parts.push({x:sign*(s+2),y:.1,z:sign*s*.35-3.4,w:1.2,h:.2,d:1.2,surface:'wood',tile:10,blenderKind:'pallet',blenderColour:true});
  }
 }
 return productionWorld(arena,parts);
}
