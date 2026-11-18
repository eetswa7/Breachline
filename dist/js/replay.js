const ANALOG = ['mx','mz','lx','ly'];
const BUTTONS = ['fire','firePressed','ads','sprint','jump','crouch','reload','swap','inspect','grenade','interact','melee','repeatFire','autoReload','light','ability'];
const MAX_TICKS = 60 * 60 * 45;

export class MatchRecording {
 constructor(config,seed,operation){
  this.config={...config,loadout:{...config.loadout}};
  this.seed=seed;
  this.operation=operation;
  this.runs=[];
  this.actions=[];
  this.ticks=0;
  this.valid=true;
 }
 addInput(input){
  if(!this.valid)return;
  if(this.ticks>=MAX_TICKS){this.valid=false;return;}
  const analog=ANALOG.map(key=>input[key]??0);
  const flags=BUTTONS.reduce((mask,key,index)=>input[key]?mask|(1<<index):mask,0);
  const previous=this.runs.at(-1);
  if(previous?.flags===flags&&analog.every((value,index)=>value===previous.analog[index]))previous.count++;
  else this.runs.push({analog,flags,count:1});
  this.ticks++;
 }
 addAction(type,value){
  if(this.valid)this.actions.push({tick:this.ticks,type,value});
 }
}

export class ReplayCursor {
 constructor(recording){
  this.recording=recording;
  this.tick=0;
  this.run=0;
  this.offset=0;
  this.action=0;
  this.input={};
 }
 step(game){
  const run=this.recording.runs[this.run];
  if(!run)return false;
  while(this.recording.actions[this.action]?.tick===this.tick){
   const {type,value}=this.recording.actions[this.action++];
   if(type==='order')game.issueSquadOrder(value);
   else if(type==='support')game.chooseSurvivalSupport(value);
  }
  for(const [index,key] of ANALOG.entries())this.input[key]=run.analog[index];
  for(const [index,key] of BUTTONS.entries())this.input[key]=!!(run.flags&(1<<index));
  game.update(1/60,this.input);
  this.tick++;
  if(++this.offset===run.count){this.offset=0;this.run++;}
  return true;
 }
}
