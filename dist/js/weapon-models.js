// Original, metre-scaled view models. Forward is -Z; optics share aim.js heights.
// Only weapon construction allocates. Animation modifies cached parts in place.
import {magazineExchangeEligible,magazineExchangeSample,sampleMagazineExchange} from './reload-components.js?v=71';
const C={steel:[.27,.30,.32],edge:[.42,.45,.46],black:[.115,.13,.14],polymer:[.16,.175,.17],tan:[.48,.39,.27],olive:[.28,.32,.22],wood:[.48,.29,.145],rubber:[.043,.048,.044],glove:[.36,.38,.30],sleeve:[.23,.28,.22],brass:[.66,.44,.16],red:[.55,.055,.025]};
const finish=(color=C.black,metal=.72,rough=.39,tile=-1)=>({color,metal,rough,tile,...(tile===9?{finishTile:2}:tile===-1&&metal>.45?{finishTile:0}:{})});
const METAL=finish(),EDGE=finish(C.edge,.88,.28),POLY={...finish(C.polymer,0,.7),finishTile:3},RUBBER=finish(C.rubber,0,.87),WOOD=finish(C.wood,0,.71,10),TAN={...finish(C.tan,.08,.63),finishTile:1},OLIVE={...finish(C.olive,.08,.64),finishTile:1},BRASS={...finish(C.brass,.92,.31),finishTile:undefined},GLOVE=finish(C.glove,0,.94,9),SLEEVE=finish(C.sleeve,0,.98,9);
const OPTIC_GLASS={...finish([.055,.105,.14],.12,.11),surface:'glass'};
const PROFILES=[
 {barrel:-.604,grip:.103,support:-.293,width:.088,mag:.017,stock:.278},
 {barrel:-.668,grip:.109,support:-.302,width:.105,mag:-.01,stock:.298},
 {barrel:-.472,grip:-.078,support:-.272,width:.10,mag:.151,stock:.265},
 {barrel:-.346,grip:.052,support:-.157,width:.078,mag:.052,stock:.241},
 {barrel:-.429,grip:.078,support:-.209,width:.11,mag:.035,stock:.229},
 {barrel:-.741,grip:.10,support:-.333,width:.096,stock:.322},
 {barrel:-.678,grip:.096,support:-.299,width:.102,mag:.002,stock:.286},
 {barrel:-.908,grip:.122,support:-.33,width:.094,mag:-.028,stock:.354},
 {barrel:-.734,grip:.115,support:-.329,width:.097,mag:-.006,stock:.317},
 {barrel:-.746,grip:.14,support:-.359,width:.14,mag:-.036,stock:.304},
 {barrel:-.183,grip:.045,support:.025,width:.071,mag:.045},
 {barrel:-.251,grip:.053,support:.03,width:.086,mag:.053},
 {barrel:-.312,grip:.035,support:0,width:.046},
 {barrel:-.592,grip:.10,support:-.27,width:.092,mag:.0,stock:.285},
 {barrel:-.365,grip:.08,support:-.19,width:.10,mag:.025,stock:.225},
 {barrel:-.723,grip:.116,support:-.349,width:.102,mag:-.015,stock:.322},
 {barrel:-.574,grip:.095,support:-.259,width:.09,mag:.012,stock:.285},
 {barrel:-.301,grip:.04,support:-.139,width:.082,mag:.043,stock:.226},
 {barrel:-.704,grip:.104,support:-.305,width:.109,stock:.314},
 {barrel:-.964,grip:.121,support:-.347,width:.105,mag:-.021,stock:.362},
 {barrel:-.687,grip:.118,support:-.31,width:.125,mag:-.054,stock:.297},
 {barrel:-.381,grip:.059,support:-.197,width:.084,mag:.052,stock:.243},
 {barrel:-.342,grip:.065,support:.034,width:.09,mag:.018},
 {barrel:-.231,grip:.047,support:.027,width:.078,mag:.049},
 {barrel:-.612,grip:-.035,support:-.285,width:.11,mag:.146,stock:.266},
 {barrel:-.403,grip:.061,support:-.222,width:.093,mag:-.205,stock:.23},
 {barrel:-.571,grip:-.051,support:-.297,width:.12,mag:.14,stock:.285},
 {barrel:-.881,grip:.132,support:-.379,width:.151,mag:-.066,stock:.338},
 {barrel:-.789,grip:.106,support:-.324,width:.086,mag:-.035,stock:.334},
 {barrel:-.214,grip:.041,support:.022,width:.076,mag:.041}
];

function builder(w){
 const parts=[],profile=PROFILES[w.def.id]??PROFILES[0];
 let receiverBack=-Infinity,receiverFront=Infinity;
 const box=(x,y,z,a,b,c,mat=METAL,tag='',extra={})=>{
  const q={x,y,z,w:a,h:b,d:c,surface:'dark',mesh:'bevel',yaw:0,pitch:0,roll:0,...mat,...extra};
  if(tag)q.tag=tag;parts.push(q);return q;
 };
 const cyl=(x,y,z,r,len,mat=METAL,tag='',extra={})=>box(x,y,z,r,len,r,mat,tag,{mesh:'cylinder',pitch:Math.PI/2,...extra});
 const tube=(x,y,z,r,len,mat=METAL,tag='',extra={})=>cyl(x,y,z,r,len,mat,tag,{mesh:'tube',...extra});
 const pin=(x,y,z,r=.008)=>cyl(x,y,z,r,.003,EDGE,'',{pitch:0,roll:Math.PI/2});
 const rail=(start,end,y=.092,width=.068)=>{box(0,y-.006,(start+end)/2,width,.014,Math.abs(end-start),METAL);for(let z=start;z>end;z-=.022)box(0,y+.005,z,width+.008,.012,.01,EDGE,'',{mesh:'cube'});};
 const ribs=(x,y,z,n,step,ww,hh,dd,mat=RUBBER,tag='')=>{for(let i=0;i<n;i++)box(x,y,z-i*step,ww,hh,dd,mat,tag,{mesh:'cube'});};
 const vents=(width,start,n,step=.039,height=.028)=>{for(const side of [-1,1])for(let i=0;i<n;i++)box(side*width,.046,start-i*step,.0025,height,.023,RUBBER);};
 const receiver=(z,len,width=.09,mat=METAL)=>{receiverBack=Math.max(receiverBack,z+len/2);receiverFront=Math.min(receiverFront,z-len/2);box(0,.034,z,width,.092,len,mat);box(0,-.023,z+.018,width*.9,.044,len*.88,mat);box(width*.51,.041,z-.014,.002,.026,.083,RUBBER);box(width*.53,.037,z-.002,.004,.013,.063,EDGE,'bolt');for(const pz of [z-len*.32,z+len*.29])for(const s of [-1,1])pin(s*width*.51,-.006,pz);};
 const grip=(z=.103,mat=POLY,pitch=-.18,height=.168)=>{box(0,-.104,z,.061,height,.079,mat,'',{pitch});box(0,-.19,z-.014,.069,.014,.081,RUBBER);for(const s of [-1,1])for(let i=0;i<4;i++)box(s*.031,-.068-i*.029,z-i*.004,.002,.012,.05,RUBBER,'',{pitch});box(0,-.085,z-.076,.06,.013,.096,METAL);box(0,-.056,z-.119,.06,.064,.012,METAL);box(0,-.055,z-.063,.009,.042,.012,EDGE,'',{pitch:.33});};
 const magazine=(z,height=.215,width=.067,depth=.093,mat=POLY,curve=.1)=>{box(0,-.091-height*.24,z,width,height*.66,depth,mat,'magazine',{pitch:-curve});box(0,-.091-height*.73,z-height*.06,width,height*.43,depth,mat,'magazine',{pitch:-curve*1.7});box(0,-.098-height*.94,z-height*.12,width+.009,.014,depth+.013,RUBBER,'magazine');for(const s of [-1,1])for(let i=0;i<3;i++)box(s*(width*.5+.001),-.111-i*height*.21,z-.012,width*.03,.04,depth*.68,EDGE,'magazine',{pitch:-curve});};
 const stock=(z,mat=POLY,type='telescopic')=>{
  // Stock centres previously left a visible air gap behind the receiver.
  // Extend existing structural pieces into its rear face, preserving their
  // indices, finish, tags and every gameplay/hand/optic transform.
  const front=Number.isFinite(receiverBack)?receiverBack-.004:z-.143;
  if(type==='telescopic'){
   const rear=z+.031;cyl(0,.026,(front+rear)/2,.035,rear-front,EDGE);
   box(0,.006,z+.032,.069,.075,.16,mat);box(0,-.035,z+.079,.074,.128,.072,mat);box(0,-.048,z+.121,.083,.161,.021,RUBBER);box(0,-.043,z-.011,.026,.033,.067,RUBBER);
  }else if(type==='solid'){
   const rear=z+.055;box(0,-.009,(front+rear)/2,.072,.079,rear-front,mat,'',{pitch:-.09});
   box(0,-.036,z+.082,.082,.14,.13,mat);box(0,-.043,z+.154,.087,.158,.018,RUBBER);
  }else{
   const rear=z+.105,span=rear-front;
   box(0,.027,(front+rear)/2,.037,.026,span,mat);
   const frontY=-.032,rearY=-.062;box(0,(frontY+rearY)/2,(front+rear)/2,.037,.026,Math.hypot(span,rearY-frontY),mat,'',{pitch:Math.atan2(frontY-rearY,span)});
   box(0,-.024,z+.103,.073,.153,.026,RUBBER);box(0,.053,z+.025,.071,.032,.13,mat);
  }
 };
 const barrel=(start,end=profile.barrel,r=.025)=>{
  // The barrel continues through the hollow fore-end into the receiver. Its
  // original forward tip remains fixed for sights, suppressors and ballistics.
  const rear=Number.isFinite(receiverFront)?Math.max(start,receiverFront+.004):start;
  cyl(0,.06,(rear+end)/2,r,Math.abs(end-rear),EDGE);
 };
 const bipod=z=>{for(const s of [-1,1]){box(s*.057,-.008,z,.019,.026,.22,EDGE,'',{yaw:s*.045});box(s*.057,-.013,z-.117,.029,.022,.043,RUBBER);}cyl(0,-.006,z+.10,.085,.027,METAL,'',{pitch:0});};
 const controls=(width,z=.09)=>{box(-width*.53,-.008,z,.005,.014,.03,EDGE,'',{roll:-.4});box(width*.61,.051,z-.083,.026,.018,.022,METAL,'bolt');box(-width*.56,.004,z-.06,.009,.027,.014,EDGE);};
 return {parts,profile,box,cyl,tube,pin,rail,ribs,vents,receiver,grip,magazine,stock,barrel,bipod,controls};
}

function pistolMagazine(b,y,z,width,height,depth,bodyWidth,bodyDepth){
 const {box}=b,top=-.056,bottom=y+height*.5-.004,bodyY=(top+bottom)*.5;
 // Keep the established floorplate as the native joint. The complete stamped
 // body and mouth now leave the grip with it, rather than extracting a plate.
 box(0,y,z,width,height,depth,RUBBER,'magazine',{pistolMagazine:'baseplate'});
 const bodyZ=b.profile.grip-.003;
 box(0,bodyY,bodyZ,bodyWidth,top-bottom,bodyDepth,METAL,'magazine',{pistolMagazine:'body'});
 for(const side of [-1,1])box(side*bodyWidth*.39,top+.002,bodyZ-.007,bodyWidth*.16,.010,bodyDepth*.80,EDGE,'magazine',{pistolMagazine:'lip'});
 box(0,top-.003,bodyZ-.006,bodyWidth*.60,.004,bodyDepth*.58,POLY,'magazine',{pistolMagazine:'follower'});
}

function kestrel(b){
 const {box,receiver,barrel,grip,magazine,stock,rail,vents,controls}=b;
 receiver(-.035,.265,.088);box(0,.029,-.289,.086,.109,.277,POLY);box(0,-.037,-.278,.058,.024,.25,METAL);
 vents(.044,-.191,6);rail(.072,-.407);barrel(-.418);grip();magazine(.017,.215);stock(.278);controls(.088);
 box(-.049,.03,-.105,.012,.021,.04,EDGE);box(.049,.025,-.106,.009,.015,.035,EDGE);
}
function bastion(b){
 const {box,receiver,barrel,grip,magazine,stock,rail,vents,cyl,controls}=b;
 receiver(-.038,.305,.105,finish(C.steel,.86,.34));box(0,.031,-.309,.096,.099,.248,WOOD);box(0,.084,-.309,.081,.027,.227,METAL);
 vents(.049,-.241,5,.035,.019);rail(.083,-.20,.098);barrel(-.426,undefined,.031);cyl(0,.092,-.497,.021,.105,METAL);
 grip(.109,WOOD);magazine(-.01,.232,.073,.12,finish(C.steel,.73,.42),.27);stock(.298,WOOD,'solid');controls(.105);
 box(-.06,.019,.083,.018,.038,.041,EDGE);box(0,.074,.073,.06,.013,.142,METAL);
}
function raptor(b){
 const {box,receiver,barrel,grip,magazine,rail,vents,controls}=b;
 receiver(.025,.398,.10,OLIVE);box(0,.028,-.246,.099,.109,.178,OLIVE);box(0,.013,.226,.112,.141,.054,OLIVE);box(0,.005,.26,.12,.162,.02,RUBBER);
 box(0,.081,.128,.084,.024,.218,POLY);rail(.047,-.312);vents(.05,-.205,3);barrel(-.333);grip(-.078);magazine(.151,.215,.069,.097,POLY,.075);controls(.1,-.061);
 box(0,-.061,-.241,.07,.033,.16,POLY);box(.055,.046,.103,.014,.033,.114,METAL);box(-.057,.047,.098,.007,.021,.066,RUBBER);
}
function vesper(b){
 const {box,receiver,barrel,grip,magazine,rail,ribs,cyl,controls}=b;
 receiver(-.064,.231,.078);box(0,.022,-.185,.088,.10,.104,POLY);ribs(0,.02,-.162,5,.018,.092,.088,.008,RUBBER);
 barrel(-.229,undefined,.024);grip(.052,POLY,-.105,.184);magazine(.047,.261,.048,.057,METAL,.025);rail(.02,-.206,.096,.058);controls(.078,.032);
 for(const s of [-1,1]){cyl(s*.043,.024,.164,.012,.235,EDGE);box(s*.038,-.031,.282,.014,.129,.016,METAL);}
 box(0,-.044,.286,.086,.026,.026,RUBBER);box(0,.069,-.07,.052,.022,.083,METAL,'bolt');box(-.043,.043,-.068,.013,.019,.046,EDGE,'bolt');
}
function lynx(b){
 const {box,barrel,grip,rail,cyl,vents}=b;
 box(0,.025,-.026,.112,.115,.40,OLIVE);box(0,-.021,.206,.103,.165,.073,OLIVE);box(0,-.027,.25,.108,.173,.019,RUBBER);
 // A long top-loading magazine and open thumbhole are this PDW's silhouette.
 box(0,.083,-.046,.101,.029,.315,finish([.31,.28,.19],.05,.46),'magazine');
 for(let i=0;i<8;i++)cyl(.006,.088,.071-i*.032,.015,.064,BRASS,'magazine',{pitch:0,roll:Math.PI/2});
 box(0,.102,-.073,.108,.01,.39,METAL); // Keep the shared iron sight ray open too.
 box(0,-.107,.162,.059,.022,.151,OLIVE);grip(.078,OLIVE,-.08,.163);box(0,-.069,-.201,.065,.097,.086,OLIVE);
 box(0,.023,-.249,.102,.097,.089,OLIVE);vents(.052,-.214,3,.025,.018);barrel(-.292);
 // Side rails deliberately leave the optical centre unobstructed.
 for(const s of [-1,1]){box(s*.061,.063,-.075,.017,.018,.27,METAL);box(s*.06,.036,-.19,.023,.024,.041,EDGE,'bolt');}
}
function breach(b){
 const {box,receiver,barrel,grip,stock,cyl,ribs}=b;
 receiver(-.027,.298,.096);barrel(-.166,undefined,.035);cyl(0,.009,-.439,.03,.475,EDGE);
 cyl(0,.008,-.321,.088,.169,WOOD,'pump');ribs(0,.008,-.253,10,.015,.092,.084,.009,RUBBER,'pump');
 grip(.10,WOOD,-.29,.17);stock(.322,WOOD,'solid');
 for(let i=0;i<5;i++){cyl(-.064,.024,.064-i*.034,.024,.059,finish(C.red,.03,.44));cyl(-.064,-.009,.064-i*.034,.025,.01,BRASS);}
 box(.052,.032,-.071,.006,.029,.082,RUBBER);box(.057,.029,-.083,.012,.018,.059,EDGE,'bolt');
 // The next shell only exists visually while the loading hand approaches the port.
 cyl(-.059,-.161,.004,.025,.067,finish(C.red,.03,.44),'loadShell',{hidden:true});
 cyl(-.059,-.161,.044,.026,.012,BRASS,'loadShell',{hidden:true});
}
function tempest(b){
 const {box,receiver,barrel,grip,magazine,stock,rail,vents,cyl,controls}=b;
 receiver(-.031,.292,.102,TAN);box(0,.019,-.31,.101,.116,.263,POLY);vents(.052,-.227,6,.034,.036);
 rail(.073,-.438);barrel(-.443,undefined,.036);cyl(0,.008,-.487,.032,.11,METAL);
 grip(.096);magazine(.002,.225,.083,.141,POLY,.16);stock(.286,TAN);controls(.102);
 box(0,-.052,-.323,.046,.025,.208,EDGE);box(.061,.044,-.036,.03,.024,.065,EDGE,'bolt');
}
function longbow(b){
 const {box,receiver,barrel,grip,magazine,stock,rail,cyl,bipod}=b;
 receiver(-.044,.319,.094,finish(C.steel,.83,.32));box(0,-.022,-.325,.087,.075,.31,TAN);
 barrel(-.48,undefined,.039);for(const s of [-1,1])box(s*.019,.055,-.667,.003,.009,.291,RUBBER);box(0,.08,-.646,.011,.003,.263,RUBBER);
 rail(.10,-.239);grip(.122,TAN,-.14,.17);magazine(-.028,.135,.069,.103,METAL,.025);stock(.354,TAN,'skeleton');bipod(-.467);
 box(0,.067,.318,.083,.047,.17,TAN);box(.061,.052,.074,.047,.015,.014,EDGE,'bolt');
 box(.082,.028,.074,.017,.065,.017,EDGE,'bolt',{roll:-.32});cyl(.094,-.004,.074,.032,.025,RUBBER,'bolt',{pitch:0});
 box(0,-.014,-.268,.093,.013,.337,POLY);
}
function warden(b){
 const {box,receiver,barrel,grip,magazine,stock,rail,vents,controls,cyl}=b;
 receiver(-.036,.295,.097,TAN);box(0,.027,-.348,.094,.106,.307,TAN);vents(.048,-.228,7,.038,.035);
 rail(.092,-.497);barrel(-.508,undefined,.031);cyl(0,.08,-.565,.031,.058,METAL);
 grip(.115);magazine(-.006,.166,.073,.103,finish(C.steel,.8,.43),.035);stock(.317,TAN,'skeleton');controls(.097);
 box(0,.068,.275,.081,.036,.171,POLY);box(-.057,.024,.06,.009,.047,.055,EDGE);
}
function atlas(b){
 const {box,receiver,barrel,grip,stock,rail,vents,cyl,bipod}=b;
 receiver(-.032,.35,.14,OLIVE);box(0,.079,-.015,.128,.033,.316,METAL,'lid');
 box(0,.006,-.373,.111,.108,.281,POLY);vents(.057,-.279,6,.037,.026);barrel(-.513,undefined,.043);
 rail(.102,-.208,.09,.082);grip(.14);stock(.304,OLIVE,'solid');bipod(-.59);
 box(-.035,-.127,-.065,.177,.18,.166,finish([.29,.32,.22],.05,.92,9),'magazine');box(-.035,-.031,-.065,.187,.02,.176,METAL,'magazine');
 // Linked rounds run sideways into the feed tray, below the optical line.
 for(let i=0;i<7;i++){const x=-.083-i*.021;cyl(x,.032,-.026,.014,.064,BRASS,'belt');box(x,.023,-.027,.019,.012,.015,METAL,'belt');}
 box(.088,.028,-.086,.045,.019,.026,EDGE,'bolt');
 box(.092,.078,-.35,.018,.096,.025,METAL);box(.092,.12,-.405,.025,.018,.136,POLY);box(.092,.078,-.46,.018,.088,.025,METAL);
}
function sable(b){
 const {box,cyl,grip,magazine,ribs}=b;
 box(0,.021,-.023,.071,.082,.238,METAL,'slide');box(0,-.029,-.008,.067,.05,.211,POLY);
 box(0,.048,-.058,.068,.023,.144,finish(C.steel,.8,.31),'slide');box(.037,.045,-.018,.002,.02,.048,RUBBER,'slide');
 for(const s of [-1,1])for(let i=0;i<6;i++)box(s*.036,.026,.069-i*.01,.002,.034,.005,RUBBER,'slide');
 cyl(0,.03,-.106,.017,.147,EDGE);grip(.045,POLY,-.18,.171);pistolMagazine(b,-.195,.028,.072,.014,.085,.040,.039);
 box(-.04,-.012,.013,.012,.008,.035,EDGE);box(0,-.059,-.098,.045,.013,.089,METAL);
}
function dire(b){
 const {box,cyl,grip}=b;
 box(0,.032,-.055,.086,.099,.30,finish(C.steel,.92,.25),'slide');box(0,.076,-.091,.055,.027,.205,METAL,'slide');
 box(0,-.03,-.032,.082,.053,.229,TAN);cyl(0,.03,-.166,.03,.164,EDGE);
 box(.045,.049,-.019,.003,.028,.064,RUBBER,'slide');for(const s of [-1,1])for(let i=0;i<5;i++)box(s*.044,.03,.084-i*.013,.004,.049,.006,RUBBER,'slide');
 grip(.053,POLY,-.15,.184);pistolMagazine(b,-.205,.032,.081,.019,.094,.043,.043);
 box(0,.04,.112,.031,.037,.022,EDGE,'hammer',{pitch:-.29});box(-.047,-.013,.047,.012,.014,.038,EDGE);
}
function blade(b){
 const {box,pin}=b;
 box(0,.015,-.13,.016,.062,.254,EDGE);box(.007,.016,-.165,.007,.043,.24,finish([.61,.65,.67],.98,.22));
 box(0,.015,-.269,.014,.047,.051,EDGE);box(0,.013,-.302,.011,.024,.031,EDGE,'',{pitch:-.15});
 box(0,.012,.05,.05,.065,.17,POLY);box(0,.015,-.039,.104,.022,.02,METAL);box(0,.011,.138,.055,.071,.014,EDGE);
 for(const z of [.013,.061,.109]){pin(.026,.014,z);pin(-.026,.014,z);}for(let i=0;i<5;i++)box(0,.014,.012+i*.025,.054,.067,.009,RUBBER);
}
function harrow(b){
 const {box,receiver,barrel,grip,magazine,stock,rail,vents,controls}=b;
 receiver(-.025,.28,.092,TAN);box(0,.025,-.29,.095,.098,.25,METAL);vents(.049,-.21,5,.037,.035);
 rail(.08,-.40);barrel(-.418);grip(.10,POLY);magazine(0,.21,.068,.091,POLY,.07);stock(.285,TAN,'skeleton');controls(.092);
 for(const side of [-1,1])box(side*.05,-.012,-.275,.018,.029,.16,POLY);
 box(-.051,.006,.069,.006,.014,.042,EDGE);box(-.052,.018,.044,.004,.006,.007,BRASS);
}
function marten(b){
 const {box,receiver,barrel,grip,magazine,stock,rail,vents,controls}=b;
 receiver(-.013,.266,.10,POLY);box(0,.033,-.205,.102,.105,.119,POLY);vents(.053,-.177,3,.031,.032);
 rail(.095,-.248,.10);barrel(-.272,undefined,.028);grip(.08,POLY);magazine(.025,.255,.06,.083,METAL,.015);stock(.225,METAL,'skeleton');controls(.10);
 box(0,-.075,-.185,.047,.094,.079,POLY);for(const side of [-1,1])box(side*.053,.026,-.042,.005,.024,.092,RUBBER);
}
function mako(b){
 const {box,receiver,barrel,grip,magazine,stock,rail,vents,controls,cyl}=b;
 receiver(-.04,.315,.101,finish(C.steel,.86,.31));box(0,.036,-.345,.094,.105,.283,TAN);vents(.047,-.256,5,.036,.026);
 rail(.096,-.265,.098,.074);barrel(-.56,-.723,.031);cyl(0,.073,-.574,.027,.057,METAL);
 grip(.116,POLY,-.13,.17);magazine(-.015,.19,.075,.108,finish(C.steel,.8,.4),.02);stock(.322,TAN,'skeleton');controls(.101);
 box(0,.083,.177,.07,.033,.145,POLY);box(.055,.026,.063,.009,.043,.055,EDGE);box(-.052,.027,.03,.008,.04,.042,RUBBER);
}
function peregrine(b){
 const {box,receiver,barrel,grip,magazine,stock,rail,vents,controls}=b;
 receiver(-.021,.275,.09,OLIVE);box(0,.036,-.274,.093,.096,.234,OLIVE);
 rail(.086,-.383,.094);vents(.047,-.203,5,.034,.025);barrel(-.395);
 grip(.095);magazine(.012,.194,.068,.101,TAN,.025);stock(.285,POLY,'skeleton');controls(.09);
 for(const side of [-1,1]){box(side*.048,-.014,-.263,.016,.034,.19,RUBBER);box(side*.048,.046,-.27,.009,.018,.12,EDGE);}
 box(-.052,.001,.072,.007,.015,.048,EDGE);box(0,.078,.228,.072,.036,.094,OLIVE);
}
function osprey(b){
 const {box,receiver,barrel,grip,magazine,stock,rail,ribs,controls}=b;
 receiver(-.036,.23,.082,POLY);box(0,.022,-.158,.083,.096,.111,TAN);
 ribs(0,.017,-.138,5,.016,.091,.087,.008,RUBBER);rail(.049,-.211,.086,.06);
 barrel(-.214);grip(.04);magazine(.043,.286,.046,.079,METAL,.055);stock(.226,METAL,'skeleton');controls(.082,.042);
 box(0,-.108,-.163,.039,.12,.045,POLY);box(.05,.011,.071,.019,.032,.033,EDGE,'bolt');
}
function bison(b){
 const {box,cyl,receiver,barrel,grip,stock,ribs,rail}=b;
 receiver(-.025,.286,.109,TAN);barrel(-.164,undefined,.037);
 for(const side of [-1,1])cyl(side*.034,.004,-.392,.029,.458,EDGE);
 box(0,-.012,-.309,.11,.086,.162,OLIVE,'pump');ribs(0,-.012,-.245,8,.018,.12,.079,.009,RUBBER,'pump');
 rail(.085,-.185,.098);grip(.104,POLY,-.22,.177);stock(.314,OLIVE,'solid');
 box(-.065,.039,-.071,.018,.022,.058,EDGE,'bolt');box(0,-.062,-.024,.079,.022,.069,METAL);
 cyl(-.07,-.16,.01,.026,.068,finish(C.red,.03,.44),'loadShell',{hidden:true});
 cyl(-.07,-.16,.051,.028,.011,BRASS,'loadShell',{hidden:true});
}
function talon(b){
 const {box,cyl,receiver,barrel,grip,magazine,stock,rail,bipod}=b;
 receiver(-.049,.345,.105,finish(C.steel,.9,.28));box(0,-.015,-.349,.10,.072,.338,OLIVE);
 barrel(-.52,undefined,.046);for(const side of [-1,1])for(const y of [.041,.076])box(side*.025,y,-.704,.006,.008,.36,RUBBER);
 rail(.105,-.232,.106);grip(.121,OLIVE,-.13,.176);magazine(-.021,.155,.08,.112,METAL,.02);stock(.362,OLIVE,'skeleton');bipod(-.508);
 box(0,.076,.285,.086,.051,.183,TAN);box(.07,.05,.068,.052,.016,.015,EDGE,'bolt');
 box(.09,.018,.068,.017,.075,.017,EDGE,'bolt',{roll:-.3});cyl(.105,-.02,.068,.034,.028,RUBBER,'bolt',{pitch:0});
}
function rampart(b){
 const {box,cyl,receiver,barrel,grip,stock,rail,vents,bipod,controls}=b;
 receiver(-.035,.319,.125,TAN);box(0,.024,-.327,.106,.115,.257,OLIVE);
 vents(.055,-.22,6,.035,.036);rail(.091,-.43,.101);barrel(-.463,undefined,.033);
 grip(.118,POLY);stock(.297,POLY);controls(.125);bipod(-.45);
 cyl(0,-.184,-.054,.231,.119,METAL,'magazine');cyl(0,-.184,-.119,.19,.012,POLY,'magazine');
 box(0,-.084,-.048,.073,.103,.106,METAL,'magazine');
 for(const side of [-1,1])box(side*.065,.02,-.029,.008,.025,.088,RUBBER);
}
function spectre(b){
 const {box,receiver,barrel,grip,magazine,stock,rail,ribs,controls}=b;
 receiver(-.04,.242,.084,METAL);box(0,.025,-.194,.086,.103,.137,POLY);
 ribs(0,.022,-.16,6,.017,.096,.092,.009,RUBBER);rail(.08,-.224,.087,.062);
 barrel(-.262,undefined,.028);grip(.059);magazine(.052,.247,.049,.066,POLY,.045);stock(.243,METAL,'skeleton');controls(.084,.051);
 box(-.054,.033,-.175,.027,.016,.038,EDGE,'bolt');box(0,.077,.169,.071,.036,.080,POLY);
}
function krait(b){
 const {box,cyl,tube,grip}=b;
 // Continuous revolver frame supports the hammer, grip shoulder and top rib.
 box(0,.020,-.029,.084,.091,.261,METAL);box(0,.06375,-.158,.067,.0515,.228,EDGE);
 cyl(0,.026,-.232,.031,.22,METAL);box(0,-.006,-.238,.061,.032,.202,TAN);
 cyl(0,.021,-.018,.107,.104,METAL,'cylinder');
 for(let i=0;i<6;i++){const a=i*Math.PI/3;tube(Math.cos(a)*.035,.021+Math.sin(a)*.035,-.075,.02,.012,RUBBER,'cylinder');}
 grip(.065,WOOD,-.21,.18);box(0,-.202,.032,.079,.019,.091,EDGE);
 box(.053,.011,-.016,.014,.017,.071,METAL,'cylinder');box(0,.068,.084,.025,.032,.021,EDGE,'hammer',{pitch:-.3});
 box(-.048,.01,.05,.012,.013,.024,EDGE);
}
function swift(b){
 const {box,cyl,grip}=b;
 box(0,.025,-.025,.078,.087,.259,TAN,'slide');box(0,-.029,-.008,.075,.052,.232,POLY);
 box(0,.071,-.081,.06,.025,.196,METAL,'slide');cyl(0,.032,-.151,.021,.181,EDGE);
 for(const side of [-1,1])for(let i=0;i<6;i++)box(side*.04,.03,.074-i*.014,.003,.046,.005,RUBBER,'slide');
 grip(.047,POLY,-.16,.186);pistolMagazine(b,-.213,.035,.081,.038,.09,.039,.038);
 box(.044,.011,.032,.007,.016,.04,EDGE);box(0,-.064,-.087,.046,.015,.092,METAL);
}
function storm(b){
 const {box,receiver,barrel,grip,magazine,rail,vents,controls}=b;
 receiver(.038,.416,.11,TAN);box(0,.028,-.292,.109,.116,.264,POLY);
 box(0,-.002,.267,.118,.17,.05,TAN);box(0,-.017,.296,.123,.177,.021,RUBBER);
 rail(.161,-.423,.104);vents(.055,-.207,6,.032,.037);barrel(-.442,undefined,.033);
 grip(-.035,POLY,-.13,.177);magazine(.146,.211,.077,.102,TAN,.06);controls(.11,-.032);
 for(const side of [-1,1])box(side*.061,.02,.085,.008,.029,.099,RUBBER);
 box(0,-.059,-.31,.052,.037,.15,POLY);
}
function needle(b){
 const {box,cyl,receiver,barrel,grip,stock,rail,vents,controls}=b;
 receiver(-.025,.252,.093,OLIVE);box(0,.029,-.238,.094,.092,.177,METAL);
 cyl(0,-.068,-.211,.082,.33,OLIVE,'magazine');
 for(let i=0;i<8;i++)cyl(0,-.068,-.066-i*.039,.085,.007,RUBBER,'magazine');
 rail(.064,-.291,.089,.065);vents(.049,-.201,4,.026,.024);barrel(-.325);
 grip(.061,POLY,-.13,.173);stock(.23,METAL,'skeleton');controls(.093,.049);
 box(-.055,.042,-.05,.018,.021,.049,EDGE,'bolt');
}
function jackal(b){
 const {box,cyl,receiver,barrel,grip,rail,vents,controls}=b;
 receiver(.016,.436,.12,TAN);box(0,.016,-.294,.119,.115,.207,OLIVE);
 rail(.173,-.407,.108,.085);vents(.061,-.239,4,.033,.04);barrel(-.413,undefined,.039);
 grip(-.051,POLY,-.14,.18);cyl(0,-.177,.14,.215,.14,OLIVE,'magazine');
 box(0,-.061,.142,.086,.11,.111,METAL,'magazine');
 box(0,.012,.27875,.123,.169,.0975,TAN);box(0,-.015,.33,.129,.18,.02,RUBBER);controls(.12,-.049);
 box(0,-.08,-.287,.065,.06,.179,POLY);
}
function sentinel(b){
 const {box,cyl,receiver,barrel,grip,stock,rail,bipod,vents}=b;
 receiver(-.042,.36,.151,finish(C.steel,.82,.43));box(0,.079,-.033,.146,.038,.329,OLIVE,'lid');
 box(0,.016,-.39,.119,.12,.321,POLY);vents(.062,-.27,7,.038,.028);barrel(-.564,undefined,.045);
 rail(.09,-.247,.105,.091);grip(.132,POLY,-.18,.178);stock(.338,WOOD,'solid');bipod(-.655);
 box(-.048,-.141,-.066,.194,.204,.184,OLIVE,'magazine');
 for(let i=0;i<9;i++){const x=-.093-i*.022;cyl(x,.025,-.044,.017,.079,BRASS,'belt');box(x,.016,-.05,.021,.013,.019,METAL,'belt');}
 box(.096,.037,-.04,.046,.02,.029,EDGE,'bolt');cyl(0,.087,-.664,.027,.113,METAL);
}
function heron(b){
 const {box,cyl,receiver,barrel,grip,magazine,stock,rail}=b;
 receiver(-.037,.289,.086,finish(C.steel,.9,.32));box(0,-.025,-.326,.084,.073,.307,WOOD);
 cyl(0,.036,-.406,.065,.261,WOOD);barrel(-.548,undefined,.032);cyl(0,.079,-.614,.025,.10,METAL);
 grip(.106,WOOD,-.24,.174);magazine(-.035,.14,.068,.094,METAL,.04);stock(.334,WOOD,'solid');rail(.084,-.211,.094,.062);
 box(.054,.039,.041,.036,.019,.019,EDGE,'bolt');box(0,.04575,.253,.079,.0495,.16,WOOD);
}
function paladin(b){
 const {box,cyl,grip}=b;
 box(0,.022,-.039,.076,.085,.269,METAL,'slide');box(0,-.029,-.02,.073,.054,.235,OLIVE);
 cyl(0,.032,-.135,.022,.154,EDGE);grip(.041,OLIVE,-.17,.176);
 for(const side of [-1,1])for(let i=0;i<7;i++)box(side*.04,.022,.071-i*.011,.003,.043,.006,RUBBER,'slide');
 pistolMagazine(b,-.201,.029,.079,.019,.089,.037,.039);box(-.044,-.012,.018,.01,.011,.039,EDGE);
 box(0,.067,-.116,.056,.014,.116,POLY,'slide');
}
const BUILDERS=[kestrel,bastion,raptor,vesper,lynx,breach,tempest,longbow,warden,atlas,sable,dire,blade,harrow,marten,mako,peregrine,osprey,bison,talon,rampart,spectre,krait,swift,storm,needle,jackal,sentinel,heron,paladin];

function addOptic(b,w){
 const {box,tube,cyl}=b,id=w.def.id;
 if(id===12)return;
 const short=w.def.kind==='PISTOL',y=short?.03:.06;
 const core=b.parts.slice();
 const supportTop=(z,depth,x=0)=>{
  let top=-Infinity;
  for(const q of core){
   if(q.hidden||/^(magazine|hammer|cylinder|belt|loadShell)$/.test(q.tag??'')||Math.abs(q.x-x)>q.w*.5+.001)continue;
   const c=Math.abs(Math.cos(q.pitch??0)),s=Math.abs(Math.sin(q.pitch??0));
   const dz=(s*q.h+c*q.d)*.5,dy=(c*q.h+s*q.d)*.5;
   if(q.z+dz<z-depth*.5||q.z-dz>z+depth*.5)continue;
   top=Math.max(top,q.y+dy);
  }
  return Number.isFinite(top)?top:y+.025;
 };
 const mount=(z,width,top,height,depth,mat=METAL,x=0)=>{
  // Seat below the authored receiver's chamfer rather than only its box bound.
  const bottom=Math.min(top-height,supportTop(z,depth,x)-.012);
  return box(x,(top+bottom)/2,z,width,top-bottom,depth,mat);
 };
 if([3,5,6].includes(w.optic)||w.def.kind==='SNIPER'||id===7){
  for(const z of [-.074,.067]){
   // The compact Vesper receiver needs a longer rear mounting foot.
   mount(z,.046,.1515,.047,id===3&&z>0?.065:.031);tube(0,.188,z,.079,.026,METAL);
  }
  tube(0,.188,-.007,.07,.242,METAL);tube(0,.188,-.153,.09,.069,METAL);tube(0,.188,.13,.086,.044,RUBBER);
  for(const z of [-.171,.137])tube(0,.188,z,.094,.01,EDGE);
  // The scope fills with coated optical glass in hip view. Magnified ADS renders
  // the world through the separate scope view, so this disc never masks a target.
  cyl(0,.188,-.185,.066,.002,OPTIC_GLASS);
  cyl(0,.188,.153,.061,.002,OPTIC_GLASS);
  for(const z of [-.199,-.191,.159])tube(0,.188,z,.078,.003,EDGE);
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4;
   box(Math.cos(a)*.04,.188+Math.sin(a)*.04,-.202,.004,.004,.003,EDGE,'',{roll:a});
  }
  cyl(0,.24,-.025,.035,.027,RUBBER,'',{pitch:0});cyl(.048,.188,-.025,.031,.031,RUBBER,'',{pitch:0,roll:Math.PI/2});
 }else if([1,2,4].includes(w.optic)){
  const prism=w.optic===2,wide=w.optic===4?.115:prism?.10:.082,z=short?-.013:.017;
  mount(z,wide+.008,.133,.026,prism?.07:.045);
  // One manufactured open housing has a rounded crown, recessed optical
  // aperture and physical wall thickness. The .169 sight ray remains clear.
  // A tube is also an open, aligned fallback in the compatibility renderer.
  box(0,.173,z,wide+.016,prism?.061:.034,.084,METAL,'',{mesh:'tube',pitch:Math.PI/2,blenderKind:'optic_hood'});
  box(wide*.61,.14,z,.019,.02,.033,RUBBER);
  for(const side of [-1,1]){
   box(side*(wide*.51),.127,z+.002,.009,.011,.024,EDGE);
   cyl(side*(wide*.60),.15,z+.002,.012,.011,EDGE,'',{pitch:0,roll:Math.PI/2});
  }
 }else{
  const front=(id===4?-.228:b.profile.barrel+.046),rear=short?.073:id===4?.116:.082;
  // Open-notch rear, fine front post: the exact .119 ray remains unobstructed.
  mount(front,.03,.1085,.027,.023);box(0,.111,front,.007,.013,.012,EDGE);
  for(const s of [-1,1])box(s*.022,.11775,rear,.012,.0335,.025,METAL);
  mount(rear,.055,.104,.016,.033);
  if(short)for(const s of [-1,1])box(s*.021,.125,rear+.014,.004,.004,.002,finish([.8,.86,.73],0,.4));
 }
}
function addMuzzle(b,w){
 if(w.def.id===12)return;
 const {box,tube}=b,z=b.profile.barrel,y=w.def.kind==='PISTOL'?.03:.06,short=w.def.kind==='PISTOL';
 if(w.barrel===1){tube(0,y,z-.063,short?.047:.059,.16,METAL);for(const dz of [-.133,.003])tube(0,y,z+dz,short?.05:.063,.013,EDGE);}
 else if(w.barrel===2||w.barrel===5){tube(0,y,z-.018,short?.036:.047,.066,EDGE);for(const s of [-1,1])for(let i=0;i<3;i++)box(s*(short?.019:.024),y,z+.001-i*.018,.002,.015,.009,RUBBER);}
 else if(w.barrel===3){tube(0,y,z-.065,.034,.16,METAL);tube(0,y,z-.146,.043,.025,EDGE);}
 else if(w.barrel===6){tube(0,y,z-.04,.049,.10,METAL);tube(0,y,z-.089,.055,.017,EDGE);}
 else{tube(0,y,z,short?.032:w.def.kind==='SHOTGUN'?.045:.043,short?.014:.032,METAL);if(!short)for(const s of [-1,1])box(s*.022,y,z-.004,.002,.019,.014,RUBBER);}
}
function addAttachments(b,w){
 if(w.def.kind==='MELEE')return;
 if(w.def.kind==='PISTOL'){
  if(w.def.revolver)return;
  const {box,cyl,tube}=b,plate=b.parts.find(q=>q.pistolMagazine==='baseplate');
  if(!plate)return;
  const bottom=plate.y-plate.h*.5,z=plate.z,width=plate.w*.78,depth=plate.d*.81;
  // Accessories add below the unchanged native core. Resizing individual core
  // members would stretch the entire welded native group around its joint.
  if(w.magazine===3){
   const y=bottom-.083,drumZ=z+.009,diameter=w.def.id===11?.133:.123;
   box(0,bottom-.025,z,width,.054,depth,METAL,'magazine');
   box(0,bottom-.010,z,width+.008,.014,depth+.006,POLY,'magazine');
   cyl(0,y,drumZ,diameter,.076,POLY,'magazine',{pitch:0,roll:Math.PI/2});
   for(const side of [-1,1])cyl(side*.040,y,drumZ,diameter*.95,.008,METAL,'magazine',{pitch:0,roll:Math.PI/2});
   tube(.046,y,drumZ,diameter*.72,.006,EDGE,'magazine',{pitch:0,roll:Math.PI/2});
   cyl(.049,y,drumZ,.029,.010,RUBBER,'magazine',{pitch:0,roll:Math.PI/2});
  }else if(w.magazine===2||w.grip===4){
   const length=w.def.id===11?.065:.056;
   box(0,bottom-length*.5+.002,z,width,length,depth,METAL,'magazine');
   box(0,bottom-.006,z,width+.008,.012,depth+.007,POLY,'magazine');
   box(0,bottom-length+.003,z,width+.010,.011,depth+.010,RUBBER,'magazine');
  }else if(w.magazine===1){
   box(0,bottom-.004,z,width,.012,depth,RUBBER,'magazine');
   tube(0,bottom-.020,z,.041,.012,RUBBER,'magazine',{pitch:Math.PI/2});
  }
  return;
 }
 const {box,cyl}=b,z=b.profile.support,width=b.profile.width;
 if(w.grip===1||w.grip===5||w.grip===8){box(0,-.109,z,.039,w.grip===8?.075:.15,.052,POLY,'',{pitch:w.grip===5?.55:0});box(0,-.181,z,.043,.016,.057,RUBBER);}
 if(w.grip===2){box(width*.66,.015,z,.035,.035,.088,METAL);cyl(width*.66,.015,z-.046,.021,.009,RUBBER);}
 if(w.grip===6){box(0,.032,b.profile.grip+.16,.068,.051,.09,RUBBER);}
 if(w.grip===7)for(const side of [-1,1])box(side*.075,-.12,z-.04,.017,.23,.018,METAL,'',{roll:side*-.5});
 if(w.grip===4||w.magazine===2){for(const q of b.parts)if(q.tag==='magazine'&&q.y<-.11){q.y-=.033;q.h*=1.12;}}
 if(w.magazine===1)box(width*.6,-.165,b.profile.grip-.045,.009,.055,.07,RUBBER,'magazine');
 if(w.magazine===3){cyl(0,-.20,b.profile.grip-.065,.16,.085,METAL,'magazine',{roll:Math.PI/2});}
}
function addHands(b,w){
 const {box}=b,id=w.def.id,pr=b.profile,z=pr.grip,short=w.def.kind==='PISTOL';
 const palm=(x,y,z,s=.98,tag='hand',roll=0)=>{
  box(x,y,z,.071*s,.091*s,.075*s,GLOVE,tag,{mesh:'sphere',roll});
  for(let i=0;i<4;i++){
   const fx=x-.029*s+i*.018*s;
   box(fx,y-.03*s,z-.025*s,.018*s,.045*s,.045*s,RUBBER,tag,{mesh:'sphere',pitch:.3,roll});
   box(fx,y+.023*s,z-.017*s,.015*s,.007*s,.021*s,GLOVE,tag,{mesh:'cube',roll});
  }
  box(x+.039*s,y+.005*s,z-.032*s,.026*s,.064*s,.031*s,GLOVE,tag,{mesh:'sphere',roll:-.4});
  box(x+.002*s,y+.024*s,z+.024*s,.06*s,.02*s,.051*s,RUBBER,tag,{mesh:'bevel'});
 };
 palm(.027,-.112,z+.008,1,'rightHand',-.13);
 box(.071,-.196,z+.131,.1,.105,.222,SLEEVE,'rightHand',{pitch:-.31,roll:-.20});box(.047,-.166,z+.054,.098,.028,.092,RUBBER,'rightHand',{pitch:-.26});
 box(.071,-.179,z+.096,.101,.013,.015,GLOVE,'rightHand',{pitch:-.31,roll:-.20});
 if(id===12)return;
 if(short){palm(-.026,-.115,z+.016,1.03,'supportHand',.14);box(-.076,-.198,z+.127,.1,.102,.214,SLEEVE,'supportHand',{pitch:-.3,roll:.2});}
 else{
  const supportY=w.grip===1?-.124:-.057,tag=w.def.shellReload||id===5?'pumpHand':'supportHand';
  palm(-.031,supportY,pr.support+.013,1,tag,.24);
  box(-.088,supportY-.105,pr.support+.088,.102,.236,.108,SLEEVE,tag,{roll:-.37,pitch:-.33});box(-.058,supportY-.044,pr.support+.051,.104,.031,.102,RUBBER,tag,{roll:-.3});
  box(-.061,supportY-.081,pr.support+.071,.105,.014,.018,GLOVE,tag,{roll:-.3});
 }
}
export function weaponModel(w,options){
 const b=builder(w);(BUILDERS[w.def.id]??kestrel)(b);const coreCount=b.parts.length;addOptic(b,w);addMuzzle(b,w);addAttachments(b,w);addHands(b,w);
 const p=b.parts;p.coreCount=coreCount;p.weaponId=w.def.id;p.muzzle=muzzlePosition(w);p.animated=[];
 // Only opted-in first-person rigs get a replacement. Default actor templates,
 // Blender exports, core joints and the established hand order stay unchanged.
 if(options?.reloadExchange&&magazineExchangeEligible(w)){
  const sourceToReplacement=new Map(),count=p.length;
  for(let i=0;i<count;i++)if(p[i].tag==='magazine'){
   sourceToReplacement.set(i,p.length);
   p.push({...p[i],tag:'replacementMagazine',hidden:true,reloadReplacement:true,reloadNativeCore:i<coreCount,reloadSourceIndex:i});
  }
  if(sourceToReplacement.size)p.reloadExchange={sourceToReplacement,sample:magazineExchangeSample(),sourceContact:{},replacementContact:{}};
 }
 // Give textured finishes the same small material palette on every weapon.
 for(const q of p)if(q.finishTile!==undefined)q.finishTile=Math.round(q.finishTile);
 for(let i=0;i<p.length;i++){const q=p[i];if(q.tag){q.baseX=q.x;q.baseY=q.y;q.baseZ=q.z;q.baseYaw=q.yaw;q.basePitch=q.pitch;q.baseRoll=q.roll;p.animated.push(i);}}
 p.reloadRig=reloadRig(p);
 if(p.reloadExchange){
  const exchange=p.reloadExchange;
  exchange.replacement=movingGroup(p,'replacementMagazine');
  exchange.sourceContactIndex=p.reloadRig.pistolMagazine>=0?p.reloadRig.pistolMagazine:p.reloadRig.magazine.anchor;
  exchange.replacementContactIndex=exchange.sourceToReplacement.get(exchange.sourceContactIndex);
 }
 return p;
}
export function muzzlePosition(w){
 const profile=PROFILES[w.def.id]??PROFILES[0];
 return {x:0,y:w.def.kind==='PISTOL'?.03:.06,z:profile.barrel-(w.barrel===1?.146:w.barrel===3?.16:w.barrel===6?.10:w.barrel===2||w.barrel===5?.052:.02)};
}
function smooth(a,b,t){t=Math.max(0,Math.min(1,(t-a)/(b-a)));return t*t*(3-2*t);}

// Native meshes weld each tag around its first member. Keep the fallback pieces
// under that same rigid transform, including fingers and the complete sleeve.
// Joint references and neutral rotations are cached only when constructing a rig.
function movingGroup(parts,tag){
 const members=[];let anchor=-1;
 for(let i=0;i<parts.length;i++)if(parts[i].tag===tag){
  const q=parts[i],cy=Math.cos(q.baseYaw),sy=Math.sin(q.baseYaw),cp=Math.cos(q.basePitch),sp=Math.sin(q.basePitch),cr=Math.cos(q.baseRoll),sr=Math.sin(q.baseRoll);
  if(anchor<0)anchor=i;
  members.push({index:i,rotation:[cy*cr+sy*sp*sr,-cy*sr+sy*sp*cr,sy*cp,cp*sr,cp*cr,-sp,-sy*cr+cy*sp*sr,sy*sr+cy*sp*cr,cy*cp]});
 }
 return anchor<0?null:{anchor,members};
}
function reloadRig(parts){
 const hand=movingGroup(parts,parts.some(q=>q.tag==='pumpHand')?'pumpHand':'supportHand');
 const magazine=movingGroup(parts,'magazine'),shell=movingGroup(parts,'loadShell'),cylinder=movingGroup(parts,'cylinder'),bolt=movingGroup(parts,'bolt'),slide=movingGroup(parts,'slide');
 let action=-1,largest=0,pistolMagazine=-1;
 for(let i=0;i<parts.length;i++)if(parts[i].tag==='magazine'&&parts[i].pistolMagazine==='body')pistolMagazine=i;
 const actionTag=slide?'slide':'bolt';
 for(let i=0;i<parts.length;i++)if(parts[i].tag===actionTag){const q=parts[i],volume=q.w*q.h*q.d;if(volume>largest){largest=volume;action=i;}}
 return {hand,magazine,shell,cylinder,bolt,slide,action,pistolMagazine,lid:parts.findIndex(q=>q.tag==='lid'),belt:parts.findIndex(q=>q.tag==='belt'),contact:{x:0,y:0,z:0,roll:0,weight:0,phase:0,operation:'ready'}};
}
function moveRigid(parts,group,x,y,z,roll=0){
 if(!group)return;
 const anchor=parts[group.anchor],c=Math.cos(roll),s=Math.sin(roll);
 for(const member of group.members){
  const q=parts[member.index],dx=q.baseX-anchor.baseX,dy=q.baseY-anchor.baseY;
  q.x=x+c*dx-s*dy;q.y=y+s*dx+c*dy;q.z=z+q.baseZ-anchor.baseZ;
  if(!roll){q.yaw=q.baseYaw;q.pitch=q.basePitch;q.roll=q.baseRoll;continue;}
  const b=member.rotation,r02=c*b[2]-s*b[5],r10=s*b[0]+c*b[3],r11=s*b[1]+c*b[4],r12=s*b[2]+c*b[5];
  q.pitch=Math.asin(Math.max(-1,Math.min(1,-r12)));
  if(Math.abs(r12)<.9999999){q.yaw=Math.atan2(r02,b[8]);q.roll=Math.atan2(r10,r11);}
  else{q.yaw=Math.atan2(-b[6],c*b[0]-s*b[3]);q.roll=0;}
 }
}
function magazineContact(parts,index,group,pose,top,out){
 const q=parts[index],anchor=parts[group.anchor],pistol=q.pistolMagazine==='body';
 const ox=-q.w*.5-.009,oy=pistol?-q.h*.25:top?.026:-Math.min(.030,q.h*.14),oz=top?.025:.014,c=Math.cos(pose.roll),s=Math.sin(pose.roll);
 const dx=q.baseX-anchor.baseX+ox,dy=q.baseY-anchor.baseY+oy;
 out.x=anchor.baseX+pose.x+c*dx-s*dy;out.y=anchor.baseY+pose.y+s*dx+c*dy;out.z=q.baseZ+pose.z+oz;
}
function poseMagazineGroup(parts,group,pose){
 const anchor=parts[group.anchor];moveRigid(parts,group,anchor.baseX+pose.x,anchor.baseY+pose.y,anchor.baseZ+pose.z,pose.roll);
 for(const member of group.members)parts[member.index].hidden=pose.hidden;
}
function reloadHand(parts,w,r,reloading,magRoll){
 const rig=parts.reloadRig,contact=rig.contact;if(!rig.hand)return;
 const hand=parts[rig.hand.anchor];contact.phase=r;contact.weight=0;contact.operation='ready';
 contact.x=hand.baseX;contact.y=hand.baseY;contact.z=hand.baseZ;contact.roll=0;
 if(!reloading)return;
 const shell=w.def.shellReload,empty=w.reloadStartedEmpty!==false;
 const reach=smooth(.015,.16,r)*(1-smooth(empty&&!shell&&!w.def.revolver?.94:.78,.995,r));
 let x=hand.baseX,y=hand.baseY,z=hand.baseZ,roll=0,operation='reach';
 if(rig.shell){
  const q=parts[rig.shell.anchor];x=q.x-.023;y=q.y-.017;z=q.z+.014;roll=-.26;operation='shell';
 }else if(rig.cylinder&&w.def.revolver){
  const q=parts[rig.cylinder.anchor];x=q.x-.03;y=q.y+.004;z=q.z+.065;roll=.35;operation='cylinder';
 }else if(rig.magazine){
  const exchange=parts.reloadExchange,top=w.def.id===4;
  if(exchange?.sample.active){
   const sample=exchange.sample,from=exchange.sourceContact,to=exchange.replacementContact,blend=sample.handBlend;
   magazineContact(parts,exchange.sourceContactIndex,rig.magazine,sample.sourceHand,top,from);
   magazineContact(parts,exchange.replacementContactIndex,exchange.replacement,sample.replacement,top,to);
   x=from.x+(to.x-from.x)*blend;y=from.y+(to.y-from.y)*blend;z=from.z+(to.z-from.z)*blend;
   roll=-.35+sample.sourceHand.roll+(sample.replacement.roll-sample.sourceHand.roll)*blend;operation=blend>.5?'replacementMagazine':'magazine';
  }else{
   const pistol=rig.pistolMagazine>=0,q=parts[pistol?rig.pistolMagazine:rig.magazine.anchor];
   const ox=-q.w*.5-.009,oy=pistol?-q.h*.25:top?.026:-Math.min(.030,q.h*.14),oz=top?.025:.014,c=Math.cos(magRoll),s=Math.sin(magRoll);
   x=q.x+c*ox-s*oy;y=q.y+s*ox+c*oy;z=q.z+oz;roll=-.35+magRoll;operation='magazine';
  }
 }
 // Open the feed cover before taking the belt box, then close it after seating.
 if(rig.lid>=0){
  const lid=parts[rig.lid],open=(1-smooth(.20,.29,r)),close=smooth(.68,.75,r)*(1-smooth(.79,.84,r)),cover=Math.max(open,close);
  x+=(lid.x-lid.w*.5-.011-x)*cover;y+=(lid.y+.024-y)*cover;z+=(lid.z+.045-z)*cover;roll+=(.18-roll)*cover;
  if(cover>.5)operation='lid';
 }
 // A tactical reload leaves the closed action alone. Empty reloads finish at
 // the selected charging handle or pistol slide, rather than in free space.
 if(empty&&!shell&&!w.def.revolver&&rig.action>=0){
  const q=parts[rig.action],rack=smooth(.76,.84,r),pistol=!!rig.slide;
  const ax=q.x+(pistol?-.042:q.x<0?-.026:.026),ay=q.y+(pistol?.026:.007),az=q.z+.014;
  x+=(ax-x)*rack;y+=(ay-y)*rack;z+=(az-z)*rack;roll+=((pistol?-.6:-.8)-roll)*rack;
  if(rack>.5)operation=pistol?'slide':'bolt';
 }
 contact.x=x;contact.y=y;contact.z=z;contact.roll=roll;contact.weight=reach;contact.operation=operation;
 moveRigid(parts,rig.hand,hand.baseX+(x-hand.baseX)*reach,hand.baseY+(y-hand.baseY)*reach,hand.baseZ+(z-hand.baseZ)*reach,roll*reach);
}
export function animateWeaponParts(parts,w,p,time,menu=false){
 const rig=parts.reloadRig,exchange=parts.reloadExchange;
 const reloading=w.reloadLeft>0,r=reloading?Math.max(0,Math.min(1,1-w.reloadLeft/w.reloadTime)):0;
 const shot=Math.max(0,w.sinceShot),slide=Math.max(0,1-shot/.075),boltOpen=smooth(.08,.18,shot)*(1-smooth(.42,.6,shot));
 const pump=smooth(.075,.22,shot)*(1-smooth(.38,.56,shot));
 const covered=rig.lid>=0,magDrop=reloading?smooth(covered?.29:.18,covered?.43:.34,r)*(1-smooth(.58,.74,r)):0;
 const leftReach=reloading?smooth(.08,.24,r)*(1-smooth(.74,.9,r)):0;
 const boltReload=reloading&&w.reloadStartedEmpty!==false?smooth(.82,.88,r)*(1-smooth(.9,.98,r)):0;
 const lid=reloading?smooth(.08,.24,r)*(1-smooth(.77,.93,r)):0;
 const emptySlide=w.ammo===0?(reloading?1-smooth(.90,.96,r):1):0;
 for(const index of parts.animated){const q=parts[index];q.x=q.baseX;q.y=q.baseY;q.z=q.baseZ;q.yaw=q.baseYaw;q.pitch=q.basePitch;q.roll=q.baseRoll;
  switch(q.tag){
   case 'slide':q.z+=Math.max(slide,emptySlide)*.035;break;
   case 'bolt':q.z+=(w.def.kind==='SNIPER'||w.def.id===7?boltOpen*.068:slide*.026)+boltReload*.04;if(w.def.kind==='SNIPER'||w.def.id===7)q.roll-=(boltOpen+boltReload)*.68;break;
   case 'pump':case 'pumpHand':q.z+=pump*.079;break;
   case 'magazine':
    if(exchange){q.hidden=false;break;}
    if(w.def.id===4){q.y+=magDrop*.155;q.x-=magDrop*.07;q.roll+=magDrop*.16;}
    else{q.y-=magDrop*(w.def.id===9?.23:.29);q.x-=magDrop*.045;q.z+=magDrop*.035;q.roll-=magDrop*.22;}
    break;
   case 'replacementMagazine':q.hidden=true;break;
   case 'belt':q.y-=lid*.07;q.x-=magDrop*.09;break;
   case 'lid':{const angle=lid*1.10;q.pitch-=angle;q.y+=Math.sin(angle)*.145;q.z+=.145*(1-Math.cos(angle));break;}
   case 'loadShell':q.hidden=!reloading||r<.08||r>.78;break;
   case 'hammer':q.pitch-=slide*.5;break;
   case 'cylinder':q.roll+=((w.capacity??6)-(w.ammo??6))*Math.PI/3;q.x-=leftReach*.07;q.y-=leftReach*.012;break;
  }
 }
 const magRoll=magDrop*(w.def.id===4?.16:-.22);
 if(exchange){
  const sample=sampleMagazineExchange(w,r,reloading&&!menu,exchange.sample);
  if(sample.active){poseMagazineGroup(parts,rig.magazine,sample.source);poseMagazineGroup(parts,exchange.replacement,sample.replacement);}
 }else if(rig.magazine&&magDrop){const q=parts[rig.magazine.anchor];moveRigid(parts,rig.magazine,q.x,q.y,q.z,magRoll);}
 // Cycled actions use the same tag pivot in the native and compatibility paths.
 if(rig.bolt&&(boltOpen||boltReload)&&(w.def.kind==='SNIPER'||w.def.id===7)){const q=parts[rig.bolt.anchor];moveRigid(parts,rig.bolt,q.x,q.y,q.z,-(boltOpen+boltReload)*.68);}
 if(rig.shell&&reloading){
  const q=parts[rig.shell.anchor],retrieve=1-smooth(.16,.38,r),feed=smooth(.40,.68,r);
  moveRigid(parts,rig.shell,q.baseX-.045*retrieve-q.baseX*feed,q.baseY-.085*retrieve+.068*feed,q.baseZ+.08*retrieve-.031*feed);
 }
 if(rig.cylinder){
  const q=parts[rig.cylinder.anchor],open=reloading?smooth(.10,.26,r)*(1-smooth(.74,.89,r)):0,turn=((w.capacity??6)-(w.ammo??6))*Math.PI/3;
  if(open||turn)moveRigid(parts,rig.cylinder,q.baseX-open*.09,q.baseY-open*.012,q.baseZ+open*.008,turn);
 }
 reloadHand(parts,w,r,reloading&&!menu,magRoll);
 return parts;
}
