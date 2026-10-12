import test from 'node:test';
import assert from 'node:assert/strict';
import {TouchInput,CONTROL_LAYOUT} from '../dist/js/input.js';
import {DEFAULT_SETTINGS,SaveStore} from '../dist/js/save.js';

const classes=()=>({add(){},remove(){},toggle(){}});
function fixture(width=844,height=390){
 const buttons=Object.fromEntries(Object.keys(CONTROL_LAYOUT).map(key=>[key,{dataset:{action:key},style:{},classList:classes()}]));
 const knob={style:{}},stick={style:{}};
 const layer={style:{setProperty(){}},classList:classes(),addEventListener(){},setPointerCapture(){},getBoundingClientRect:()=>({left:0,top:0,width,height}),querySelector(q){return q==='#stick'?stick:q==='#stick-knob'?knob:buttons[q.match(/"(.+)"/)[1]];},querySelectorAll(){return[];}};
 globalThis.window={addEventListener(){}};globalThis.document={addEventListener(){},pointerLockElement:null};Object.defineProperty(globalThis,'navigator',{value:{getGamepads:()=>[]},configurable:true});
 const input=new TouchInput({},layer,{...DEFAULT_SETTINGS,layout:{}});input.active=true;
 const ev=(id,x,y,action)=>({pointerId:id,pointerType:'touch',clientX:x,clientY:y,preventDefault(){},target:{closest:()=>buttons[action]??null}});
 return{input,ev,buttons};
}
test('simultaneous move, look and fire are tracked independently',()=>{const{input,ev}=fixture();input.pointerDown(ev(1,90,260));input.pointerMove(ev(1,90,210));input.pointerDown(ev(2,600,160));input.pointerMove(ev(2,630,145));input.pointerDown(ev(3,740,200,'fire'));const f=input.sample(1/60);assert(f.mz>.9);assert(f.lx>0);assert(f.ly>0);assert(f.fire);assert(f.firePressed);input.pointerUp(ev(3,740,200,'fire'));assert(input.sample(1/60).mz>.9);});
test('quick fire taps survive release before the next animation frame',()=>{const{input,ev}=fixture();input.pointerDown(ev(1,700,200,'fire'));input.pointerUp(ev(1,700,200,'fire'));const f=input.sample(1/60);assert(f.fire&&f.firePressed);assert(!input.sample(1/60).fire);});
test('the inspect touch target is visible in both layouts and quick taps produce one action',()=>{
 const{input,ev,buttons}=fixture();for(const profile of ['simple','advanced']){input.settings.controlProfile=profile;input.layout();assert.equal(buttons.inspect.hidden,false);input.pointerDown(ev(7,260,110,'inspect'));input.pointerUp(ev(7,260,110,'inspect'));assert(input.sample(.016).inspect);assert(!input.sample(.016).inspect);}
 input.pointerDown(ev(8,260,110,'inspect'));input.pointerUp(ev(8,260,110,'inspect'),true);assert(!input.sample(.016).inspect);
 input.pointerDown(ev(9,260,110,'inspect'));input.reset();assert(!input.sample(.016).inspect);
});
test('I inspects once per keyboard press without stealing the existing reload binding',()=>{
 const callbacks={},{input}=fixture();globalThis.window.addEventListener=(type,fn)=>{(callbacks[type]??=[]).push(fn);};const tracked=new TouchInput({},input.layer,{...DEFAULT_SETTINGS,layout:{}});tracked.active=true;
 const key=(code,repeat=false)=>({code,repeat,target:{matches:()=>false},preventDefault(){}});
 callbacks.keydown[0](key('KeyI'));assert(tracked.sample(.016).inspect);callbacks.keydown[0](key('KeyI',true));assert(!tracked.sample(.016).inspect);
 callbacks.keydown[0](key('KeyR'));const f=tracked.sample(.016);assert(f.reload&&!f.inspect);
});
test('dragging the fire button aims while holding fire',()=>{const{input,ev}=fixture();input.pointerDown(ev(1,700,200,'fire'));input.pointerMove(ev(1,745,175,'fire'));const f=input.sample(1/60);assert(f.fire&&f.lx>0&&f.ly>0);});
test('ADS supports both tap and hold without a stuck state',()=>{const{input,ev}=fixture();input.pointerDown(ev(1,670,120,'ads'));input.pointerUp(ev(1,670,120,'ads'));assert(input.sample(.016).ads);input.pointerDown(ev(2,670,120,'ads'));input.pointerUp(ev(2,670,120,'ads'));assert(!input.sample(.016).ads);input.settings.adsMode='hold';input.pointerDown(ev(3,670,120,'ads'));assert(input.sample(.016).ads);input.pointerUp(ev(3,670,120,'ads'));assert(!input.sample(.016).ads);});
test('cancel/reset releases all input after an interruption',()=>{const{input,ev}=fixture();input.pointerDown(ev(1,90,260));input.pointerMove(ev(1,90,190));input.pointerDown(ev(2,700,200,'fire'));input.reset();const f=input.sample(.016);assert.equal(f.mz,0);assert.equal(f.lx,0);assert(!f.fire&&!f.ads);assert.equal(input.pointers.size,0);});
test('touch layout clamps dragged buttons and mirrors left-handed positions',()=>{for(const [width,height]of [[667,375],[844,390],[932,430]]){const{input,ev,buttons}=fixture(width,height);input.editing=true;input.pointerDown(ev(1,width*.9,height*.5,'fire'));input.pointerMove(ev(1,width*2,height*2,'fire'));assert.equal(input.settings.layout.fire.x,.945);assert.equal(input.settings.layout.fire.y,.91);input.settings.leftHanded=true;input.layout();const centre=parseFloat(buttons.fire.style.left)/100*width;assert(centre>=parseFloat(buttons.fire.style.width)/2+7.9);}});
test('saved loadouts, settings and progression round-trip',()=>{let data='';const storage={getItem:()=>data,setItem:(k,v)=>data=v},s=new SaveStore(storage);s.data.loadout.primary=3;s.data.settings.leftHanded=true;s.finish({xp:750,win:true,kills:4,deaths:1,streak:3,weaponKills:{3:4}});const loaded=new SaveStore(storage);assert.equal(loaded.data.loadout.primary,3);assert(loaded.data.settings.leftHanded);assert.equal(loaded.data.xp,750);assert.equal(loaded.data.weaponXP[3],400);assert.equal(loaded.level,2);});
test('corrupt saves and quota failures do not stop gameplay',()=>{const bad=new SaveStore({getItem:()=>'{bad',setItem(){throw Error('quota');}});assert.equal(bad.data.loadout.primary,0);assert(!bad.persist());const malformed=new SaveStore({getItem:()=>JSON.stringify({version:1,loadout:{primary:999,secondary:-9},settings:{sensitivity:900,fov:-20}})});assert.equal(malformed.data.loadout.primary,9);assert.equal(malformed.data.loadout.secondary,10);assert.equal(malformed.data.settings.fov,65);});

test('simple controls combine aim and fire with one finger',()=>{const{input,ev}=fixture();input.pointerDown(ev(1,710,245,'fire'));input.pointerMove(ev(1,740,230,'fire'));const f=input.sample(.016);assert(f.fire&&f.ads&&f.repeatFire);assert(f.lx>0);input.pointerUp(ev(1,740,230,'fire'));const released=input.sample(.016);assert(!released.fire&&!released.ads);});
test('holding ADS allows the same thumb to aim',()=>{const{input,ev}=fixture();input.settings.adsMode='hold';input.pointerDown(ev(1,730,150,'ads'));input.pointerMove(ev(1,700,170,'ads'));const f=input.sample(.016);assert(f.ads&&f.lx<0&&f.ly<0);});
test('tap jumps and holding the same button changes stance once',()=>{const{input,ev}=fixture();input.pointerDown(ev(1,600,310,'jump'));input.pointerUp(ev(1,600,310,'jump'));assert(input.sample(.016).jump);input.pointerDown(ev(2,600,310,'jump'));input.sample(.2);assert(input.sample(.15).crouch);assert(!input.sample(.5).crouch);input.pointerUp(ev(2,600,310,'jump'));assert(!input.sample(.016).jump);input.crouched=true;input.pointerDown(ev(3,600,310,'jump'));input.pointerUp(ev(3,600,310,'jump'));assert(input.sample(.016).crouch);});
test('cancelled trigger and ADS touches do not leave active input',()=>{const{input,ev}=fixture();input.pointerDown(ev(1,730,150,'ads'));input.pointerUp(ev(1,730,150,'ads'),true);assert(!input.sample(.016).ads);input.pointerDown(ev(2,710,245,'fire'));input.pointerUp(ev(2,710,245,'fire'),true);assert(!input.sample(.016).fire);});
test('large controls remain inside the smallest landscape safe area',()=>{const {input,buttons}=fixture(667,375);input.settings.buttonScale=1.4;input.settings.layout={fire:{x:.99,y:.99}};input.layout();const b=buttons.fire,x=parseFloat(b.style.left)*6.67,y=parseFloat(b.style.top)*3.75,r=parseFloat(b.style.width)/2;assert(x+r<=667-7.9&&y+r<=375-7.9);});
test('a controller with missing axes cannot inject NaN into aiming',()=>{const{input}=fixture();Object.defineProperty(globalThis,'navigator',{value:{getGamepads:()=>[{connected:true,axes:[0,0],buttons:[]}]},configurable:true});const f=input.sample(.016);assert(Number.isFinite(f.lx)&&Number.isFinite(f.ly));});

test('native iOS touch release clears a lost joystick while the other thumb keeps firing',()=>{
 const {input,ev}=fixture();input.pointerDown(ev(8,90,260));input.syncTouches({type:'touchstart',touches:[{identifier:0,clientX:90,clientY:260}]});input.pointerMove(ev(8,40,260));
 input.pointerDown(ev(12,700,240,'fire'));input.syncTouches({type:'touchstart',touches:[{identifier:0,clientX:40,clientY:260},{identifier:1,clientX:700,clientY:240}]});assert(input.sample(.016).mx<-.9);
 input.syncTouches({type:'touchend',touches:[{identifier:1,clientX:700,clientY:240}]});const f=input.sample(.016);assert.equal(f.mx,0);assert(f.fire);assert.equal(input.stickID,null);
 input.syncTouches({type:'touchend',touches:[]});assert(!input.sample(.016).fire);
});
test('failed pointer capture and reused iOS pointer IDs cannot latch movement',()=>{
 const {input,ev}=fixture();input.layer.setPointerCapture=()=>{throw new Error('Capture lost');};assert.doesNotThrow(()=>input.pointerDown(ev(1,90,260)));input.pointerMove(ev(1,30,260));assert(input.sample(.016).mx<-.9);
 input.pointerDown(ev(1,700,230,'fire'));const f=input.sample(.016);assert.equal(f.mx,0);assert(f.fire);input.pointerUp(ev(1,700,230));assert.equal(input.pointers.size,0);
});
test('stationary held sticks remain active while tiny thumb drift stays in the dead zone',()=>{
 const {input,ev}=fixture();input.pointerDown(ev(1,90,260));input.pointerMove(ev(1,88,261));assert.equal(input.sample(.016).mx,0);input.pointerMove(ev(1,30,260));for(let i=0;i<600;i++)assert(input.sample(.016).mx<-.9);input.pointerUp(ev(1,30,260));assert.equal(input.sample(.016).mx,0);
});
test('orphaned joystick ownership and cancelled native touches return to neutral',()=>{
 const {input,ev}=fixture();input.pointerDown(ev(1,90,260));input.pointerMove(ev(1,30,260));input.pointers.delete(1);assert.equal(input.sample(.016).mx,0);
 input.pointerDown(ev(2,700,230,'fire'));input.syncTouches({type:'touchcancel',touches:[]});assert(!input.sample(.016).fire);
});
test('window-level release listeners handle a contact ending outside the control layer',()=>{
 const callbacks={};const {input,ev}=fixture();globalThis.window.addEventListener=(type,fn)=>{(callbacks[type]??=[]).push(fn);};const tracked=new TouchInput({},input.layer,{...DEFAULT_SETTINGS,layout:{}});tracked.active=true;
 tracked.pointerDown(ev(5,90,260));tracked.pointerMove(ev(5,30,260));assert(tracked.sample(.016).mx<-.9);for(const fn of callbacks.pointerup)fn(ev(5,-10,260));assert.equal(tracked.sample(.016).mx,0);
 tracked.pointerDown(ev(6,90,260));tracked.pointerMove(ev(6,30,260));for(const fn of callbacks.pagehide)fn({});assert.equal(tracked.sample(.016).mx,0);
});

test('array-like native TouchLists work without a JavaScript iterator',()=>{
 const {input,ev}=fixture();input.pointerDown(ev(5,90,260));const touches={0:{identifier:44,clientX:90,clientY:260},length:1};assert.doesNotThrow(()=>input.syncTouches({type:'touchstart',touches}));input.pointerMove(ev(5,20,260));assert(input.sample(.016).mx<-.9);input.syncTouches({type:'touchend',touches:{length:0}});assert.equal(input.sample(.016).mx,0);
});

test('coalesced touch samples preserve accelerated aim and never double-count the endpoint',()=>{
 for(const acceleration of [false,true]){
  const a=fixture(),b=fixture();a.input.settings.aimAcceleration=b.input.settings.aimAcceleration=acceleration;
  for(const f of [a,b]){f.input.pointerDown(f.ev(1,90,260));f.input.pointerMove(f.ev(1,90,210));f.input.pointerDown(f.ev(2,700,230,'fire'));}
  const points=[[714,222],[745,205],[739,213],[760,198]];
  for(const [x,y]of points)a.input.pointerMove(a.ev(2,x,y,'fire'));
  const event=b.ev(2,760,198,'fire');event.getCoalescedEvents=()=>points.map(([clientX,clientY])=>({clientX,clientY}));b.input.pointerMove(event);
  const fa=a.input.sample(1/60),fb=b.input.sample(1/60);assert(Math.abs(fa.lx-fb.lx)<1e-12);assert(Math.abs(fa.ly-fb.ly)<1e-12);
  assert(fb.fire&&fb.ads&&fb.mz>.9);assert.equal(b.input.sample(1/60).lx,0);
  b.input.pointerUp(b.ev(2,760,198,'fire'),true);const released=b.input.sample(1/60);assert(!released.fire&&released.mz>.9);
 }
});
test('invalid coalesced hardware samples cannot inject non-finite aim',()=>{
 const f=fixture();f.input.pointerDown(f.ev(2,700,230,'fire'));const event=f.ev(2,720,210,'fire');
 event.getCoalescedEvents=()=>[{clientX:NaN,clientY:0},{clientX:710,clientY:220},{clientX:Infinity,clientY:1}];f.input.pointerMove(event);
 const frame=f.input.sample(1/60);assert(Number.isFinite(frame.lx)&&Number.isFinite(frame.ly));assert(frame.lx>0&&frame.ly>0);
});

test('touch aim friction scales thumb deltas while mouse and gyroscope keep their sensitivity',()=>{
 const a=fixture(),b=fixture();a.input.aimAssistGain=.55;
 for(const f of [a,b]){f.input.pointerDown(f.ev(2,600,170));f.input.pointerMove(f.ev(2,620,160));}
 const slow=a.input.sample(.016),raw=b.input.sample(.016);assert(Math.abs(slow.lx/raw.lx-.55)<1e-12);assert(Math.abs(slow.ly/raw.ly-.55)<1e-12);
 a.input.addLook(20,-10);a.input.gyro.x=.03;a.input.gyro.y=.02;const mixed=a.input.sample(.016);
 assert(Math.abs(mixed.lx-(raw.lx+.03))<1e-12);assert(Math.abs(mixed.ly-(raw.ly+.02))<1e-12);
 a.input.settings.aimAssist=false;a.input.pointerMove(a.ev(2,640,150));assert(Math.abs(a.input.sample(.016).lx-raw.lx)<1e-12);
 a.input.reset();assert.equal(a.input.aimAssistGain,1);
});

test('the aim slowdown preference persists and older saves receive the default',()=>{
 let data='';const storage={getItem:()=>data,setItem:(k,v)=>data=v},s=new SaveStore(storage);s.data.settings.aimAssist=false;s.persist();
 assert.equal(new SaveStore(storage).data.settings.aimAssist,false);
 assert.equal(new SaveStore({getItem:()=>JSON.stringify({version:1,controlRevision:2,settings:{}})}).data.settings.aimAssist,true);
});
