import {updateWeaponClearance} from './weapon-clearance.js?v=71';
import {animateWeaponParts} from './weapon-models.js?v=71';
import {muzzleFlash} from './firing-presentation.js?v=71';
import {identityFor} from './combat-identity.js?v=71';
import {identity,lookAt,multiply,compose,direction,clamp,lerp,distance} from './math.js?v=71';
import {weaponModel,actorModel,part,material,makeCube,makeCylinder,makeSphere} from './geometry.js?v=71';
import {roundedBox,tube,leafCard,rockMesh,ridgeMesh,ridgeTint,coniferMesh,coniferTint,strataRockMesh,strataTint} from './meshes.js?v=71';
import {aimFov,verticalFov,scopeVisible,weaponPose,movementFov} from './aim.js?v=71';
import {loadImages} from './textures.js?v=71';
import {weatherParticles} from './particles.js?v=71';
import {operatorTorso,operatorLimb} from './operator-meshes.js?v=71';
import {actorDeathProgress} from './actor-pose.js?v=71';

const corners=[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,.5,-.5],[-.5,.5,-.5],[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]];
const faces=[[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]];
const normals=[[0,0,-1],[0,0,1],[-1,0,0],[1,0,0],[0,1,0],[0,-1,0]];
const luminance=c=>c[0]*.299+c[1]*.587+c[2]*.114;

/** Textured software fallback. Primary phones use the WebGL2 renderer; this
 * path shares geometry, materials, scope rules and the complete simulation. */
export class CompatibilityRenderer {
 constructor(canvas,settings){
  this.canvas=canvas;this.settings=settings;this.ctx=canvas.getContext('2d',{alpha:false});if(!this.ctx)throw new Error('The browser could not create a drawing surface.');
  this.compatibility=true;this.quality='compatibility';this.fps=30;this.renderScale=.8;this.lost=false;this.drawCalls=0;this.frameAverage=16.7;this.lastRender=0;this.frames=0;this.fpsAge=0;
  this.matrix=identity();this.parent=identity();this.combined=identity();this.view=identity();this.weaponView=identity();this.eye={x:0,y:2,z:0};this.target={x:0,y:2,z:-1};this.weaponKey='';this.weaponParts=[];this.world=[];this.textures=[];this.leaves=[];this.patterns=[];
  this.meshes={cylinder:makeCylinder(6),tube:tube(8),leaf:leafCard(),conifer:coniferMesh(),strata:strataRockMesh(5),operatorTorso:operatorTorso(6),operatorLimb:operatorLimb(6)};
  this.ready=loadImages().then(images=>{this.images=images;this.extract(images.surfaces,4,this.textures);this.extract(images.leaves,2,this.leaves,true);this.patterns=this.textures.map(t=>this.ctx.createPattern(t,'repeat'));});
 }
 chooseQuality(){return 'compatibility';}
 extract(image,columns,out,alpha=false){
  for(let i=0;i<columns*columns;i++){
   const c=document.createElement('canvas');c.width=c.height=alpha?256:192;const ctx=c.getContext('2d',{willReadFrequently:alpha});ctx.drawImage(image,i%columns*image.width/columns,Math.floor(i/columns)*image.height/columns,image.width/columns,image.height/columns,0,0,c.width,c.height);
   if(alpha){const data=ctx.getImageData(0,0,c.width,c.height);for(let i=0;i<data.data.length;i+=4)data.data[i+3]=data.data[i+3]<148?0:255;ctx.putImageData(data,0,0);}out.push(c);
  }
 }
 setArena(arena){this.arena=arena;this.weaponClearanceState={};this.meshes.ridge=arena.info.id===4?null:ridgeMesh(arena.info.size,arena.info.id);this.buildWorld();}
 box(p,parent=null){
  compose(this.matrix,p.x,p.y,p.z,p.w,p.h,p.d,p.yaw??0,p.pitch??0,p.roll??0);let m=this.matrix;if(parent){multiply(this.combined,parent,this.matrix);m=this.combined;}
  const transform=c=>({x:m[0]*c[0]+m[4]*c[1]+m[8]*c[2]+m[12],y:m[1]*c[0]+m[5]*c[1]+m[9]*c[2]+m[13],z:m[2]*c[0]+m[6]*c[1]+m[10]*c[2]+m[14]});
  const normal=n=>{let x=m[0]*n[0]/p.w+m[4]*n[1]/p.h+m[8]*n[2]/p.d,y=m[1]*n[0]/p.w+m[5]*n[1]/p.h+m[9]*n[2]/p.d,z=m[2]*n[0]/p.w+m[6]*n[1]/p.h+m[10]*n[2]/p.d,l=Math.hypot(x,y,z)||1;return{x:x/l,y:y/l,z:z/l};};
  const mat=material(p),sun=this.arena.info.sun,polygons=[],leaf=p.leaf!==undefined;
  const push=(points,n,uvs,tint)=>{
   const light=.38+Math.max(0,n.x*sun[0]+n.y*sun[1]+n.z*sun[2])*.67+(mat.emissive||0)*.25;
   const tile=mat.pattern>0?mat.pattern-1:-1,scale=parent?9:.42;
   const u=uvs??points.map(q=>Math.abs(n.y)>.65?[q.x*scale,q.z*scale]:Math.abs(n.x)>Math.abs(n.z)?[q.z*scale,q.y*scale]:[q.x*scale,q.y*scale]);
   const centre={x:0,y:0,z:0};for(const q of points){centre.x+=q.x/points.length;centre.y+=q.y/points.length;centre.z+=q.z/points.length;}let radius=0;for(const q of points)radius=Math.max(radius,Math.hypot(q.x-centre.x,q.y-centre.y,q.z-centre.z));const base=tint??(p.mesh==='ridge'?ridgeTint(centre.y,this.arena.info.id):mat.color);polygons.push({centre,radius,points,normal:n,color:base.map(v=>clamp(Math.pow(v*light,.65)*255,0,255)),ground:p.ground,landscape:p.landscape,tile,leaf:p.leaf,uvs:u,shade:light});
  };
  // Large architectural surfaces remain quads; visible curved details use shared meshes.
  const mesh=this.meshes[p.mesh];
  if(mesh){for(let i=0;i<mesh.length;i+=24){const points=[0,8,16].map(o=>transform([mesh[i+o],mesh[i+o+1],mesh[i+o+2]])),n=normal([(mesh[i+3]+mesh[i+11]+mesh[i+19])/3,(mesh[i+4]+mesh[i+12]+mesh[i+20])/3,(mesh[i+5]+mesh[i+13]+mesh[i+21])/3]);const height=(mesh[i+1]+mesh[i+9]+mesh[i+17])/3,tint=p.mesh==='conifer'?coniferTint(height):p.mesh==='strata'?strataTint(height).map((v,j)=>v*mat.color[j]):null;push(points,n,leaf?[0,8,16].map(o=>[mesh[i+o+6],mesh[i+o+7]]):null,tint);}}
  else{const points=corners.map(transform);for(let i=0;i<faces.length;i++)push(faces[i].map(i=>points[i]),normal(normals[i]));}
  return polygons;
 }
 buildWorld(){
  this.world=[];let distantStones=0;
  for(const p of [...this.arena.blocks,...this.arena.decor]){
   if(p.destroyed||p.invisible)continue;
   if(p.mesh==='strata'&&distantStones++%2)continue;
   if(p.ground){const size=8;for(let x=-p.w/2;x<p.w/2;x+=size)for(let z=-p.d/2;z<p.d/2;z+=size)this.world.push(...this.box({...p,x:p.x+x+size/2,z:p.z+z+size/2,w:size,d:size}).filter(q=>q.normal.y>.5));}
   else if(Math.max(p.w,p.h,p.d)>.35)this.world.push(...this.box(p));
  }
  for(const [i,p]of (this.arena.foliage??[]).entries())if(i%3!==2)this.world.push(...this.box(p));
 }
 events(events){if(events.some(e=>e.type==='explosion'))this.buildWorld();}
 textureTriangle(points,uvs,source,pattern){
  const c=this.ctx,sw=source.width,sh=source.height,[a,b,d]=points,[u,v,w]=uvs.map(q=>[q[0]*sw,q[1]*sh]);
  const det=(v[0]-u[0])*(w[1]-u[1])-(w[0]-u[0])*(v[1]-u[1]);if(Math.abs(det)<.00001)return;
  const A=((b.x-a.x)*(w[1]-u[1])-(d.x-a.x)*(v[1]-u[1]))/det,B=((b.y-a.y)*(w[1]-u[1])-(d.y-a.y)*(v[1]-u[1]))/det;
  const C=((d.x-a.x)*(v[0]-u[0])-(b.x-a.x)*(w[0]-u[0]))/det,D=((d.y-a.y)*(v[0]-u[0])-(b.y-a.y)*(w[0]-u[0]))/det;
  const mid={x:(a.x+b.x+d.x)/3,y:(a.y+b.y+d.y)/3},expanded=[a,b,d].map(p=>{const dx=p.x-mid.x,dy=p.y-mid.y,l=Math.hypot(dx,dy)||1;return {x:p.x+dx/l*.45,y:p.y+dy/l*.45};});c.save();c.beginPath();c.moveTo(expanded[0].x,expanded[0].y);c.lineTo(expanded[1].x,expanded[1].y);c.lineTo(expanded[2].x,expanded[2].y);c.closePath();c.clip();c.setTransform(A,B,C,D,a.x-A*u[0]-C*u[1],a.y-B*u[0]-D*u[1]);
  if(pattern){c.fillStyle=pattern;const minX=Math.min(u[0],v[0],w[0])-1,minY=Math.min(u[1],v[1],w[1])-1;c.fillRect(minX,minY,Math.max(u[0],v[0],w[0])-minX+1,Math.max(u[1],v[1],w[1])-minY+1);}else c.drawImage(source,0,0);c.restore();
 }
 paint(polygons,view=this.view,weapon=false){
  const c=this.ctx,w=this.canvas.width,h=this.canvas.height,scale=h/(2*Math.tan(this.fov/2)),draw=[];
  for(const poly of polygons){
   const first=poly.points[0];if(!weapon&&!poly.ground&&!poly.landscape&&Math.hypot(first.x-this.eye.x,first.z-this.eye.z)>65)continue;const eye=weapon?{x:0,y:0,z:0}:this.eye,dot=poly.normal.x*(eye.x-first.x)+poly.normal.y*(eye.y-first.y)+poly.normal.z*(eye.z-first.z);
   if(poly.leaf===undefined&&dot<-.001)continue;
   const q=poly.centre,r=poly.radius,cx=view[0]*q.x+view[4]*q.y+view[8]*q.z+view[12],cy=view[1]*q.x+view[5]*q.y+view[9]*q.z+view[13],cz=-(view[2]*q.x+view[6]*q.y+view[10]*q.z+view[14]),tan=Math.tan(this.fov/2);if(cz+r<.06||Math.abs(cx)>(cz+r)*tan*w/h+r||Math.abs(cy)>(cz+r)*tan+r)continue;
   let points=poly.points.map((p,i)=>({x:view[0]*p.x+view[4]*p.y+view[8]*p.z+view[12],y:view[1]*p.x+view[5]*p.y+view[9]*p.z+view[13],z:-(view[2]*p.x+view[6]*p.y+view[10]*p.z+view[14]),u:poly.uvs[i][0],v:poly.uvs[i][1]}));
   const clipped=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],ai=a.z>.06,bi=b.z>.06;if(ai)clipped.push(a);if(ai!==bi){const t=(.06-a.z)/(b.z-a.z);clipped.push({x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t),z:.06,u:lerp(a.u,b.u,t),v:lerp(a.v,b.v,t)});}}
   if(clipped.length<3)continue;let sx=[],sy=[],depth=0;for(const p of clipped){sx.push(w/2+p.x/p.z*scale);sy.push(h/2-p.y/p.z*scale);depth+=p.z;}
   if(Math.max(...sx)<0||Math.min(...sx)>w||Math.max(...sy)<0||Math.min(...sy)>h)continue;
   depth/=clipped.length;const area=(Math.min(w,Math.max(...sx))-Math.max(0,Math.min(...sx)))*(Math.min(h,Math.max(...sy))-Math.max(0,Math.min(...sy)));if(area<(poly.leaf!==undefined?24:1.5))continue;
   const fog=weapon?0:1-Math.exp(-depth*.0048),rgb=poly.color.map((v,i)=>Math.round(lerp(v,this.arena.info.fog[i]*255,fog)));
   draw.push({sx,sy,depth:poly.ground?500+depth:depth,color:`rgb(${rgb.join(',')})`,poly,clipped,area,fog});
  }
  draw.sort((a,b)=>b.depth-a.depth);
  const path=p=>{c.beginPath();c.moveTo(p.sx[0],p.sy[0]);for(let i=1;i<p.sx.length;i++)c.lineTo(p.sx[i],p.sy[i]);c.closePath();};
  for(const p of draw){
   const leaf=p.poly.leaf!==undefined,source=leaf?this.leaves[p.poly.leaf]:this.textures[p.poly.tile];
   if(!leaf){path(p);c.fillStyle=p.color;c.fill();}
   if(source&&(leaf||p.area>(weapon?90:200))){
    for(let i=1;i<p.sx.length-1;i++){const ids=[0,i,i+1];this.textureTriangle(ids.map(i=>({x:p.sx[i],y:p.sy[i]})),ids.map(i=>[p.clipped[i].u,p.clipped[i].v]),source,leaf?null:this.patterns[p.poly.tile]);}
    if(!leaf){path(p);c.fillStyle=`rgba(10,17,15,${clamp(1-p.poly.shade,0,.65)})`;c.fill();if(p.fog>.04){path(p);c.fillStyle=`rgba(${this.arena.info.fog.map(v=>Math.round(v*255)).join(',')},${p.fog})`;c.fill();}}
   }
  }
  this.drawCalls+=draw.length;
 }
 sky(yaw,pitch){
  const c=this.ctx,w=this.canvas.width,h=this.canvas.height,img=this.images?.horizon;if(!img){c.fillStyle='#718b9b';c.fillRect(0,0,w,h);return;}
  const sw=img.width*.27,sh=img.height*.49,u=Math.abs(((yaw/(Math.PI*2))%1+1)%1*2-1),x=u*(img.width-sw),y=clamp(img.height*.74-sh*.5-pitch*img.height*.6,0,img.height-sh);c.drawImage(img,x,y,sw,sh,0,0,w,h);
 }
 render(game,dt,menu,elapsed=dt){
  if(!this.images)return;this.fpsAge+=elapsed;this.lastRender+=dt;if(this.lastRender<1/30)return;this.lastRender=0;this.frames++;if(this.fpsAge>.7){this.fps=Math.round(this.frames/this.fpsAge);this.frames=0;this.fpsAge=0;}
  const width=Math.max(2,Math.round(this.canvas.clientWidth*this.renderScale)),height=Math.max(2,Math.round(this.canvas.clientHeight*this.renderScale));if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;this.patterns=this.textures.map(t=>this.ctx.createPattern(t,'repeat'));}
  const c=this.ctx,p=game.player;let yaw=p.yaw,pitch=p.pitch;this.fov=aimFov(movementFov(this.movementFovState??(this.movementFovState={}),p,this.settings.fov??80,game.paused?0:dt,this.settings.motion!==false),p.weapon,p.ads);
  if(menu){this.eye={x:15,y:6.5,z:25};this.target={x:-4,y:2,z:-8};this.fov=65*Math.PI/180;yaw=Math.atan2(this.target.x-this.eye.x,-(this.target.z-this.eye.z));pitch=-.12;}else{this.eye=game.eye(p);this.eye.y-=p.dead?1.2:0;const d=direction(p.yaw,p.pitch);this.target={x:this.eye.x+d.x,y:this.eye.y+d.y,z:this.eye.z+d.z};this.fov=verticalFov(this.fov,width/height);}
  this.weatherYaw=yaw;this.weatherPitch=pitch;this.worldFov=this.fov;lookAt(this.view,this.eye,this.target);this.sky(yaw,pitch);this.drawCalls=0;
  const polygons=this.world.slice();for(const a of game.actors)if(a.id!==0&&distance(a,p)<55){if(a.dead&&actorDeathProgress(a,game.time)>=1)continue;compose(this.parent,a.x,a.y,a.z,1,1,1,-a.yaw);for(const q of actorModel(a,game.time,identityFor(a,p,game.rules)))if(!q.hidden)polygons.push(...this.box(q,this.parent));}
  if(['domination','sabotage','hardpoint','hill','frontline'].includes(game.rules.mode.id))for(let i=0;i<game.rules.points.length;i++){if(['hardpoint','hill','frontline'].includes(game.rules.mode.id)&&i!==game.rules.activePoint||game.rules.mode.id==='sabotage'&&i===1)continue;const point=game.rules.points[i];polygons.push(...this.box(part(point.x,point.y+1,point.z,.05,2,.05,'steel')),...this.box(part(point.x+.4,point.y+1.7,point.z,.8,.5,.06,'green',{color:point.owner===(game.rules.mode.teams?p.team:p.id)?[.10,.72,.91]:point.owner>=0?[.94,.16,.11]:[.8,.85,.4]})));}
  if(game.rules.mode.id==='ctf')for(const flag of game.rules.flags){const carrier=flag.carrier===null?null:game.actors.find(a=>a.id===flag.carrier&&!a.dead),x=carrier?carrier.x+Math.cos(carrier.yaw)*.28:flag.x,z=carrier?carrier.z+Math.sin(carrier.yaw)*.28:flag.z,y=carrier?carrier.y+.65:flag.y,yaw=(carrier?.yaw??0)+Math.sin(game.time*4+flag.team*2)*.13,color=flag.team===p.team?[.10,.72,.91]:[.94,.16,.11];polygons.push(...this.box(part(x,y+.88,z,.075,1.76,.075,'steel',{mesh:'cylinder'})),...this.box(part(x+.31*Math.cos(yaw),y+1.43,z+.31*Math.sin(yaw),.68,.43,.045,'fabric',{yaw,color})),...this.box(part(x+.31*Math.cos(yaw),y+1.43,z+.31*Math.sin(yaw),.10,.43,.06,'white',{yaw,color:[.9,.92,.88]})));}
  for(const tag of game.rules.tags??[])polygons.push(...this.box(part(tag.x,tag.y+.55+Math.sin(game.time*3+tag.id)*.07,tag.z,.25,.35,.06,'white',{yaw:game.time,color:tag.team===p.team?[.10,.72,.91]:[.94,.16,.11]})));
  for(const g of game.grenades)polygons.push(...this.box(part(g.x,g.y,g.z,.16,.16,.16,'green')));
  for(const w of weatherParticles(this,game.time??0))polygons.push(...this.box(part(w.x,w.y,w.z,w.sizeX,w.sizeY,w.sizeZ,w.kind?'white':'stone',{yaw:w.yaw,color:w.color})));
  this.paint(polygons);
  for(const smoke of game.smokes){const from=this.eye,d=Math.hypot(smoke.x-from.x,smoke.z-from.z);if(d<7){c.fillStyle=`rgba(118,128,128,${clamp((7-d)/7,0,.8)*Math.min(1,smoke.age)})`;c.fillRect(0,0,width,height);}}
  if(!p.dead&&(menu||!scopeVisible(p))){
   const weapon=p.weapon,key=[weapon.def.id,weapon.optic,weapon.barrel,weapon.grip,weapon.magazine,weapon.ammunition].join('/');if(key!==this.weaponKey){this.weaponKey=key;this.weaponParts=weaponModel(weapon,{reloadExchange:true});}animateWeaponParts(this.weaponParts,weapon,p,game.time,menu);
   if(menu)p.weaponObstruction=0;else updateWeaponClearance(this.weaponClearanceState??(this.weaponClearanceState={}),this.arena,p,game.paused?0:dt);const pose=weaponPose(p,game.time,this.settings.motion!==false,menu);compose(this.parent,pose.x,pose.y,pose.z,pose.scale,pose.scale,pose.scale,pose.yaw,pose.pitch,pose.roll);
   const parts=[];for(const q of this.weaponParts)if(!q.hidden)parts.push(...this.box(q,this.parent));const flash=muzzleFlash(weapon,menu,this.muzzleFlashState??(this.muzzleFlashState={}));if(flash.visible){const muzzle=this.weaponParts.muzzle;parts.push(...this.box(part(muzzle.x,muzzle.y,muzzle.z,flash.width,flash.height,.19*flash.opacity,'orange',{emissive:4*flash.opacity}),this.parent));}this.fov=65*Math.PI/180;this.paint(parts,this.weaponView,true);
  }
  return true;
 }
 project(point){const m=this.view,x=point.x,y=point.y,z=point.z,depth=-(m[2]*x+m[6]*y+m[10]*z+m[14]);if(depth<.06)return null;const f=1/Math.tan((this.worldFov??this.fov)/2),aspect=this.canvas.width/this.canvas.height;return{x:.5+(m[0]*x+m[4]*y+m[8]*z+m[12])/depth*f/aspect*.5,y:.5-(m[1]*x+m[5]*y+m[9]*z+m[13])/depth*f*.5};}

}
