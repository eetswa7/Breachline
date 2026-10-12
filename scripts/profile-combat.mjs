import {performance} from 'node:perf_hooks';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(process.argv[2]??'.');
const {Game}=await import(pathToFileURL(resolve(root,'dist/js/engine.js')));
const median=values=>values.slice().sort((a,b)=>a-b)[Math.floor(values.length/2)];
const results=[];
for(const map of [13,14]){
 const runs=[];
 for(let run=0;run<5;run++){
  const game=new Game({mode:'tdm',map},{seed:441});game.rules.mode={...game.rules.mode,limit:10000};
  for(let i=0;i<300;i++){game.update(1/60);game.events.length=0;}
  let paths=0,expansions=0,shots=0;const path=game.nav.path.bind(game.nav);
  game.nav.path=(...args)=>{paths++;const out=path(...args);expansions+=game.nav.lastExpanded;return out;};
  const start=performance.now();
  for(let i=0;i<2400;i++){game.update(1/60);for(const event of game.events)shots+=event.type==='shot';game.events.length=0;}
  const milliseconds=performance.now()-start;runs.push(milliseconds);
  if(run===4)results.push({map:game.arena.info.name,actors:game.actors.length,steps:2400,medianMilliseconds:median(runs),runs,paths,expansions,shots});
 }
}
console.log(JSON.stringify({environment:'Node simulation CPU only, fixed seeds and full map rosters; not iPhone FPS',results},null,2));
