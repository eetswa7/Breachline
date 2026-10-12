// Reproducible, isolated listening reel from the exact shipped AAC takes.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {AUDIO_BANK,AUDIO_PARTS} from '../dist/js/audio-files.js';
const work='work/audio-release61-preview',output='docs/audio-release61',rate=44100;
await mkdir(work,{recursive:true});await mkdir(output,{recursive:true});
const bank=Buffer.concat(await Promise.all(AUDIO_PARTS.map(p=>readFile('dist/assets/'+p))));
const keys=['ricochetMetal','ricochetStone','penetrationMetal','penetrationStone','penetrationWood','penetrationGlass','casingHard','casingMetal','casingWood','casingSoft','casingWater'];
const chunks=[],cues=[],gap=Buffer.alloc(Math.round(rate*.35)*2);let samples=0;
for(const key of keys)for(const record of AUDIO_BANK.sounds[key]){
 const input=work+'/take.m4a';await writeFile(input,bank.subarray(record.offset,record.offset+record.bytes));
 const pcm=execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-i',input,'-f','s16le','-ac','1','-ar',String(rate),'pipe:1']);
 cues.push({key,variant:record.variant,startSeconds:samples/rate,durationSeconds:pcm.length/2/rate});
 chunks.push(pcm,gap);samples+=(pcm.length+gap.length)/2;
}
await writeFile(work+'/preview.pcm',Buffer.concat(chunks));
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','s16le','-ar',String(rate),'-ac','1','-i',work+'/preview.pcm','-c:a','aac','-b:a','160k','-movflags','+faststart',output+'/ballistic-foley-preview.m4a']);
await writeFile(output+'/ballistic-foley-preview.json',JSON.stringify({kind:'isolated_original_runtime_take_listening_reel',subjective_listening_review:false,sampleRate:rate,durationSeconds:samples/rate,description:'Four shipped takes of every new family, at unity gain with 350 ms gaps; gameplay applies distance, room, occlusion and lower foley gains.',cues},null,2)+'\n');
console.log('Wrote',cues.length,'preview takes,',samples/rate,'seconds');
