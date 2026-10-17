import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';

test('build provenance uses committed game source and labels dirty code without inventing a commit',async()=>{
 const dir=await mkdtemp(tmpdir()+'/breachline-provenance-'),script=resolve('scripts/benchmark-build.mjs');
 const run=(bin,args)=>execFileSync(bin,args,{cwd:dir,encoding:'utf8'});
 try{
  await mkdir(dir+'/dist/js',{recursive:true});await writeFile(dir+'/dist/js/boot.js',"const RELEASE='57';\n");
  run('git',['init','-q']);run('git',['add','dist']);run('git',['-c','user.name=Synthetic Test','-c','user.email=test@example.invalid','commit','-qm','Synthetic source fixture']);const source=run('git',['rev-parse','HEAD']).trim();
  const manifest=async()=>JSON.parse(/Object\.freeze\((\{[^\n]+\})\)/.exec(await readFile(dir+'/dist/js/benchmark-build.js','utf8'))[1]);
  run(process.execPath,[script]);let build=await manifest();assert.equal(build.commit,source);assert.equal(build.commit_resolution,'source_commit');const fingerprint=build.content_sha256;
  run(process.execPath,[script]);assert.equal((await manifest()).content_sha256,fingerprint);
  await writeFile(dir+'/dist/js/boot.js',"const RELEASE='58';\n");run(process.execPath,[script]);build=await manifest();assert.equal(build.commit,null);assert.equal(build.source_commit,source);assert.equal(build.commit_resolution,'content_fingerprint');assert.notEqual(build.content_sha256,fingerprint);
 }finally{await rm(dir,{recursive:true,force:true});}
});
