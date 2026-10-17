import {clamp,lerp,direction} from './math.js?v=71';

// Three short static-grid rays, sampled at most 12.5 times a second. This is
// presentation only: bullets, view angles and ADS projection remain unchanged.
export function updateWeaponClearance(state,arena,actor,dt){
 if(dt<=0)return state.value??0;
 if(actor.dead||!arena?.trace){state.value=0;actor.weaponObstruction=0;return 0;}
 state.clock=(state.clock??0)-dt;
 if(state.clock<=0){
  state.clock=.08;const dir=direction(actor.yaw,actor.pitch),rightX=Math.cos(actor.yaw),rightZ=Math.sin(actor.yaw);
  let nearest=1;
  for(const side of [-.12,0,.12]){
   const hit=arena.trace({x:actor.x+rightX*side,y:actor.y+actor.height-.29,z:actor.z+rightZ*side},dir,1);
   if(hit.block)nearest=Math.min(nearest,hit.t);
  }
  state.target=clamp((.8-nearest)/.65,0,1);
 }
 state.value=lerp(state.value??0,state.target??0,1-Math.exp(-Math.min(dt,.05)*15));
 actor.weaponObstruction=state.value;return state.value;
}
