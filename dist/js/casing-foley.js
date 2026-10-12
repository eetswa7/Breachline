// Cosmetic cases never use the gameplay random stream or collide with actors.
// The same bounded positions drive rendering and actual landing audio.
export const CASING_CAPACITY=48;
const materialFamily=s=>['steel','dark','blue','rust','brass'].includes(s)?'Metal':s==='wood'?'Wood':s==='water'?'Water':['grass','moss','dirt','sand','snow','gravel','fabric'].includes(s)?'Soft':'Hard';

export function casingSurface(arena,position,floorSurface){
 let selected=floorSurface,top=-Infinity;
 for(const entry of arena.visualFloorCells?.get(`${Math.floor(position.x/8)}/${Math.floor(position.z/8)}`)??[]){
  const p=entry.part;if(p.destroyed||p.pitch||p.roll)continue;
  const y=p.mesh==='surface'?p.y:p.y+p.h*.5;
  const c=Math.cos(p.yaw??0),s=Math.sin(p.yaw??0),x=position.x-p.x,z=position.z-p.z;
  if(Math.abs(y-position.y)>.10||y<top||Math.abs(c*x-s*z)>p.w*.5||Math.abs(s*x+c*z)>p.d*.5)continue;
  selected=p.surface;top=y;
 }
 return materialFamily(selected??arena.info?.groundSurface??'concrete');
}

export function ejectCasing(game,actor,weapon,origin){
 const d=weapon.def;
 // Revolvers keep fired cases in their cylinder. Pump/bolt actions eject later.
 if(d.kind==='MELEE'||d.revolver)return;
 const list=game.casings,own=actor.id===game.player.id;
 if(!own&&Math.hypot(actor.x-game.player.x,actor.z-game.player.z)>22)return;
 if(list.length>=CASING_CAPACITY){
  if(!own)return;
  const ambient=list.findIndex(c=>c.source!==game.player.id);list.splice(ambient<0?0:ambient,1);
 }
 const phase=(weapon.shotSerial??weapon.shotIndex??0)*1.73+actor.id*2.11;
 const rightX=Math.cos(actor.yaw),rightZ=Math.sin(actor.yaw),speed=1.65+Math.sin(phase)*.22;
 list.push({x:origin.x+rightX*.23,y:origin.y-.15,z:origin.z+rightZ*.23,
  vx:rightX*speed+actor.vx*.28,vy:1.15+Math.cos(phase)*.12,vz:rightZ*speed+actor.vz*.28,
  source:actor.id,weapon:d.id,shell:d.kind==='SHOTGUN',delay:d.shellReload?.24:d.kind==='SNIPER'?.30:0,
  life:2.1,landed:false});
}

export function updateCasings(game,dt){
 const list=game.casings;
 for(let i=list.length-1;i>=0;i--){
  const c=list[i];c.life-=dt;if(c.life<=0){list.splice(i,1);continue;}
  if(c.delay>0){c.delay=Math.max(0,c.delay-dt);continue;}
  if(c.landed)continue;
  const oldY=c.y;c.vy-=9.8*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;c.z+=c.vz*dt;
  let floor=0,surface=game.arena.info?.groundSurface;
  // Exact footprints avoid the actor collision radius snapping a case onto a
  // nearby deck. Existing collision geometry supplies the top of raised floors.
  for(const b of game.arena.nearby?.(c)??game.arena.blocks??[]){
   if(b.destroyed)continue;const y=b.y+b.h*.5;
   if(y<=oldY+.001&&y>=floor&&Math.abs(c.x-b.x)<=b.w*.5&&Math.abs(c.z-b.z)<=b.d*.5){floor=y;surface=b.surface;}
  }
  if(c.vy<0&&c.y<=floor+.012){
   c.y=floor+.012;c.landed=true;c.life=Math.min(c.life,.36);
   const position={x:c.x,y:floor,z:c.z};
   game.emit('casing',{position,source:c.source,weapon:c.weapon,shell:c.shell,surface:casingSurface(game.arena,position,surface),value:Math.min(1,-c.vy/7)});
  }
 }
}
