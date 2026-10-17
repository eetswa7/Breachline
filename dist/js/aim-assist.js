import {angleDelta,clamp,lerp} from './math.js?v=71';
import {opticMagnification} from './aim.js?v=71';

// Touch friction only: callers scale the thumb delta. No angle, aim direction,
// recoil or trigger state is changed. Visibility queries are cached at 12.5 Hz.
export function updateAimAssist(state,game,dt,enabled=true){
 if(state.game!==game){state.game=game;state.clock=0;state.gain=1;state.target=1;}
 if(!enabled||game.player.dead||game.player.weapon.def.kind==='MELEE'){
  state.clock=0;state.gain=state.target=1;return 1;
 }
 dt=clamp(dt,0,.08);if(dt===0)return state.gain;
 state.clock-=dt;
 if(state.clock<=0){
  state.clock=.08;state.target=1;
  const player=game.player,eye=game.eye(player),cone=.028/Math.sqrt(lerp(1,opticMagnification(player.weapon),player.ads));
  for(const actor of game.actors){
   if(actor.dead||!game.rules.enemies(player,actor))continue;
   const dx=actor.x-eye.x,dz=actor.z-eye.z,range=Math.hypot(dx,dz);
   if(range<2||range>55)continue;
   const yaw=Math.abs(angleDelta(player.yaw,Math.atan2(dx,-dz)));
   if(yaw>cone+.28/range)continue;
   let visible;
   for(const [y,width,height]of [[actor.y+actor.height-.16,.18,.165],[actor.y+actor.height*.57,.275,actor.height*.26]]){
    const pitch=Math.abs(player.pitch-Math.atan2(y-eye.y,range));
    const error=Math.hypot(Math.max(0,yaw-width/range),Math.max(0,pitch-height/range))/cone;
    if(error>=1)continue;
    visible??=game.canSee(player,actor);if(!visible)break;
    if(!game.arena.visible(eye,{x:actor.x,y,z:actor.z}))continue;
    const falloff=error*error*(3-2*error);state.target=Math.min(state.target,.55+.45*falloff);
   }
  }
 }
 state.gain=lerp(state.gain,state.target,1-Math.exp(-dt*18));return state.gain;
}
