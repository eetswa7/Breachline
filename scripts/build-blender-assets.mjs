import {spawnSync} from 'node:child_process';
const run=(command,args)=>{const result=spawnSync(command,args,{stdio:'inherit'});if(result.status!==0)process.exit(result.status??1);};
run(process.execPath,['scripts/export-blender-input.mjs']);
run(process.env.BLENDER_BIN??'blender',['--background','--factory-startup','--python-exit-code','1','--python','authoring/blender/build_assets.py',...(process.argv.includes('--reuse-bakes')?['--','--reuse-bakes',...(process.argv.includes('--reuse-lightmaps')?['--reuse-lightmaps']:[]),...process.argv.filter(arg=>arg.startsWith('--rebake-maps='))]:[])]);
run(process.env.BLENDER_BIN??'blender',['--background','authoring/blender/breachline-assets.blend','--python-exit-code','1','--python','authoring/blender/restore_bakes.py']);
run(process.execPath,['scripts/pack-blender-assets.mjs']);
// --reuse-bakes restores byte-exact native material pixels. Preserve the
// committed ASTC payload only after source hashes / fallback pixels match;
// geometry iterations still encode every fresh Cycles lighting map below.
run(process.env.PYTHON_BIN??'python3',['scripts/build-production-textures.py',...(process.argv.includes('--reuse-bakes')?['--reuse-materials']:[])]);
run(process.execPath,['scripts/pack-production-assets.mjs']);
