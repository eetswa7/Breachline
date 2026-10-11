// Standard Gamepad mapping, including DualSense over iOS Bluetooth.
// Poll once per displayed frame; no extra background timer or Bluetooth permission.
export class ControllerInput {
 constructor(settings){this.settings=settings;this.buttons=new Uint8Array(17);this.edges=new Uint8Array(17);this.sticks=new Float32Array(4);this.index=null;this.id='';this.connected=false;this.lost=false;this.armed=false;}
 suspend(){this.armed=false;this.sticks.fill(0);}
 poll(provider=()=>navigator.getGamepads?.()){
  let pads;try{pads=provider()??[];}catch{pads=[];}
  let pad=null;
  for(let i=0;i<pads.length;i++){const p=pads[i];if(p?.connected&&p.mapping==='standard'&&(pad===null||p.index===this.index))pad=p;if(pad?.index===this.index)break;}
  this.lost=this.connected&&!pad;this.connected=!!pad;this.edges.fill(0);this.sticks.fill(0);
  if(!pad){this.index=null;this.id='';this.buttons.fill(0);this.armed=false;return;}
  if(pad.index!==this.index||pad.id!==this.id){this.index=pad.index;this.id=pad.id;this.buttons.fill(0);this.armed=false;}
  let held=false;
  for(let i=0;i<17;i++){const b=pad.buttons[i],down=!!b?.pressed||(Number.isFinite(b?.value)&&b.value>((i===6||i===7) ? .15 : .5));this.edges[i]=down&&!this.buttons[i]?1:0;this.buttons[i]=down?1:0;if(i!==9&&down)held=true;}
  const dead=Math.max(.05,Math.min(.35,this.settings.controllerDeadzone??.14));
  for(let pair=0;pair<4;pair+=2){const x=Number.isFinite(pad.axes[pair])?pad.axes[pair]:0,y=Number.isFinite(pad.axes[pair+1])?pad.axes[pair+1]:0,m=Math.hypot(x,y);if(m>dead){const scale=Math.min(1,(m-dead)/(1-dead))/m;this.sticks[pair]=x*scale;this.sticks[pair+1]=y*scale;held=true;}}
  if(!held)this.armed=true;
 }
 apply(f,dt,scopeScale=1,context=false){
  if(!this.connected||!this.armed)return;
  const b=this.buttons,e=this.edges,s=this.sticks;f.mx+=s[0];f.mz-=s[1];f.ads||=!!b[6];
  const gain=(this.settings.controllerSensitivity??1)*(f.ads?(this.settings.controllerADSSensitivity??.55)*scopeScale:1),time=Math.max(0,Math.min(.08,dt)),curve=Math.hypot(s[2],s[3])**.35;
  f.lx+=s[2]*curve*time*2.8*gain;f.ly-=s[3]*curve*time*2.4*gain*(this.settings.controllerInvertY?-1:1);
  f.fire||=!!b[7];f.firePressed||=!!e[7];f.sprint||=!!b[10];f.interact||=!!b[2]&&context;
  f.jump||=!!e[0];f.crouch||=!!e[1];f.reload||=!!e[2]&&!context;f.swap||=!!e[3];f.grenade||=!!e[4];f.melee||=!!(e[5]||e[11]);f.inspect||=!!e[13];
 }
}
