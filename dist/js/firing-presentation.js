// Cosmetic fire samples use the simulation's shot age. Sampling cannot advance
// the weapon, spend ammunition, change aiming or allocate renderer resources.
const profiles={
 RIFLE:[.16,.043,.060,.36,.52,.28],
 SMG:[.16,.036,.052,.28,.45,.24],
 SHOTGUN:[.23,.045,.070,.42,.72,.28],
 SNIPER:[.16,.045,.065,.40,.68,.24],
 MARKSMAN:[.16,.043,.060,.36,.58,.26],
 LMG:[.16,.043,.065,.40,.60,.28],
 PISTOL:[.10,.034,.045,.26,.36,.20]
};
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};

// One existing sprite and one existing unshadowed light. The changing shape
// stays inside the previous flash's area and 45 ms maximum lifetime. Use the
// monotonic shot serial so isolated shots do not repeat their first-shot stamp.
export function muzzleFlash(w,menu=false,out={}){
 const p=profiles[w.def.kind],age=w.sinceShot;
 const visible=!!p&&!menu&&!w.suppressed&&w.barrel!==1&&Number.isFinite(age)&&age>=0&&age<p[1];
 out.visible=visible;out.opacity=0;out.light=0;out.width=0;out.height=0;out.rotation=0;
 if(!visible)return out;
 const serial=w.shotSerial??w.shotIndex??0,phase=((serial*.61803398875+w.def.id*.137)%1+1)%1;
 const expansion=.60+.40*smooth(age/.009),fade=1-smooth((age-.006)/(p[1]-.006));
 const size=p[0]*(.88+.12*phase)*expansion;
 out.width=size*(.72+.10*phase);out.height=size*(1.10+.10*(1-phase));
 out.opacity=fade;out.light=.9*fade;out.rotation=serial*2.39996322973+w.def.id*.41+age*5;
 return out;
}

// The existing single gas puff per player shot retains its pool, atlas and
// opacity. Family-sized jets separate a pistol's short vent from rifle/shotgun
// gas. Suppressors keep their existing flame suppression and a slower gas vent.
export function muzzleGas(w,out={}){
 const p=profiles[w.def.kind];
 out.size=p?.[2]??0;out.life=p?.[3]??0;out.forward=p?.[4]??0;out.lift=p?.[5]??0;
 if(w.suppressed||w.barrel===1){out.size*=.8;out.forward*=.55;out.lift*=.8;}
 return out;
}
