import test from 'node:test';
import assert from 'node:assert/strict';
import {SaveStore,MATCH_HISTORY_LIMIT,matchRecord} from '../dist/js/save.js';
import {Game} from '../dist/js/engine.js';
import {Interface} from '../dist/js/ui.js';
const result=(overrides={})=>({mode:'tdm',map:15,difficulty:'veteran',win:true,draw:false,kills:8,deaths:2,headshots:3,accuracy:42,xp:1325,streak:4,time:125.9,weaponKills:{0:8},...overrides});
const memory=()=>{let data='';return {getItem:()=>data,setItem:(key,value)=>data=value};};
test('completed match metadata and career history survive a reload in newest-first order',()=>{
 const storage=memory(),s=new SaveStore(storage);for(let i=0;i<15;i++)s.finish(result({kills:i,win:i%2===0,draw:i===13}));
 const loaded=new SaveStore(storage);assert.equal(loaded.data.matchHistory.length,MATCH_HISTORY_LIMIT);assert.equal(loaded.data.matchHistory[0].kills,14);assert.equal(loaded.data.matchHistory[1].outcome,'draw');assert.equal(loaded.data.matchHistory.at(-1).kills,3);assert.equal(loaded.data.matchHistory[0].map,15);assert.equal(loaded.data.matchHistory[0].difficulty,'veteran');assert.equal(loaded.data.matchHistory[0].time,125);assert.equal(loaded.data.matches,15);assert.equal(loaded.data.weaponXP[0],12000);
});
test('legacy progression is preserved without inventing historical results',()=>{
 const s=new SaveStore({getItem:()=>JSON.stringify({version:1,xp:900,matches:3,wins:1,kills:6,deaths:5,settings:{},loadout:{}})});assert.deepEqual(s.data.matchHistory,[]);assert.equal(s.data.xp,900);assert.equal(s.data.matches,3);s.finish(result());assert.equal(s.data.matches,4);assert.equal(s.data.matchHistory.length,1);
});
test('malformed historical records are bounded or discarded without losing the career',()=>{
 const good={...matchRecord(result(),1000),kills:-1,accuracy:999,time:Infinity,completedAt:Infinity,difficulty:'<script>'};
 const s=new SaveStore({getItem:()=>JSON.stringify({version:1,xp:900,matchHistory:[null,{...good,map:999},{...good,mode:'<script>'},{...good,outcome:'oops'},good]})});assert.equal(s.data.xp,900);assert.equal(s.data.matchHistory.length,1);const r=s.data.matchHistory[0];assert.equal(r.kills,0);assert.equal(r.accuracy,100);assert.equal(r.time,0);assert.equal(r.completedAt,null);assert.equal(r.difficulty,'regular');assert.equal(matchRecord(result({map:1.2})),null);
});
test('history remains usable in memory when storage is unavailable',()=>{const s=new SaveStore({getItem:()=>null,setItem(){throw Error('quota');}});assert.equal(s.finish(result()),false);assert.equal(s.data.matchHistory.length,1);assert.equal(s.data.matches,1);assert(s.error);});
test('game result reports actual rules and map for team, solo and draw outcomes',()=>{
 for(const mode of ['tdm','hill','gun','elimination']){const g=new Game({mode,map:15,difficulty:'recruit'},{seed:33});g.time=92;g.player.kills=3;g.rules.finish(g.rules.mode.teams?g.player.team:g.player.id);let r=g.result();assert.equal(r.mode,mode);assert.equal(r.map,15);assert.equal(r.time,92);assert.equal(r.difficulty,'recruit');assert.equal(matchRecord(r).outcome,'win');g.rules.finish(-1);assert.equal(matchRecord(g.result()).outcome,'draw');}
});
test('career renders the saved records and an honest empty state',()=>{
 const elements=Object.fromEntries(['recent-form','match-history-list'].map(id=>[id,{}]));globalThis.document={getElementById:id=>elements[id]};const store=new SaveStore(memory()),ui={store};Interface.prototype.renderMatchHistory.call(ui);assert.match(elements['recent-form'].textContent,/Complete a match/);assert.equal(elements['match-history-list'].innerHTML,'');store.finish(result());Interface.prototype.renderMatchHistory.call(ui);assert.match(elements['recent-form'].textContent,/1 recent match · 1 victory · 4.00 K\/D/);assert.match(elements['match-history-list'].innerHTML,/NUKETOWN/i);assert.match(elements['match-history-list'].innerHTML,/2:05/);assert.match(elements['match-history-list'].innerHTML,/42%/);
});
