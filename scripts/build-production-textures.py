"""Export bounded WebP fallbacks and real mipmapped ASTC GPU textures.

Blender owns the imagery. This step splits bakes, creates mip levels and performs
transport/GPU compression only. No runtime procedural normal-map generation.
"""
from pathlib import Path
from PIL import Image
import concurrent.futures
import json, math, struct, subprocess, tempfile, hashlib, os, sys
from io import BytesIO

root=Path('dist/assets/production');root.mkdir(parents=True,exist_ok=True)
bakes=Path('dist/assets/blender');temporary=Path(tempfile.mkdtemp(prefix='breachline-astc-'))
reuse_materials='--reuse-materials' in sys.argv
previous=json.loads((root/'manifest.json').read_text()) if reuse_materials else {}
source_hashes={name:hashlib.sha256((bakes/(name+'.png')).read_bytes()).hexdigest()
               for name in ('surfaces-albedo','surfaces-normal','surfaces-orm','weapons-albedo','weapons-normal','weapons-orm')}
if reuse_materials and previous.get('materialBakeSha256') and previous['materialBakeSha256']!=source_hashes:
    raise RuntimeError('Material bakes changed: rebuild ASTC textures with astcenc instead of reusing them')
part_records={record['path']:record for record in previous.get('files',[])}

def original_parts(stem):
    names=sorted(name for name in part_records if name.startswith(stem+'.part') and name.endswith('.bin'))
    if not names:raise RuntimeError('Missing committed material container: '+stem)
    blocks=[]
    for name in names:
        data=(root/name).read_bytes();record=part_records[name]
        if len(data)!=record['bytes'] or hashlib.sha256(data).hexdigest()!=record['sha256']:
            raise RuntimeError('Material container integrity failed: '+name)
        blocks.append(data)
    return b''.join(blocks)
jobs=[]
for bank,columns,count in [('surfaces',4,16),('weapons',2,4)]:
    atlases={suffix:Image.open(bakes/(bank+'-'+suffix+'.png')).convert('RGBA') for suffix in ('albedo','normal','orm')}
    for index in range(count):
        for suffix in atlases:
            image=atlases[suffix];edge=image.width//columns;x=index%columns*edge;y=index//columns*edge
            tile=image.crop((x,y,x+edge,y+edge))
            resolution=1024 if bank=='surfaces' else 2048 if index==0 else 1024
            tile=tile.resize((resolution,resolution),Image.Resampling.LANCZOS)
            jobs.append((bank,index,suffix,tile))

def encode(job):
    bank,index,suffix,tile=job;name=f'{bank}-{index}-{suffix}'
    fallback=tile.resize((512 if bank=='surfaces' else 1024 if index==0 else 512,)*2,Image.Resampling.LANCZOS)
    destination=root/(name+'.webp');staging=destination.with_suffix('.webp.tmp')
    fallback.save(staging,format='WEBP',quality=94,method=6,lossless=suffix=='orm')
    with staging.open('rb') as file:os.fsync(file.fileno())
    with Image.open(staging) as check:check.load()
    if reuse_materials:
        # The original revision predates source-bake hashes. In that case the
        # newly generated fallback must decode to the exact original pixels;
        # lossy similarity is insufficient. Later builds also verify full-size
        # native PNG hashes above. Any changed input rejects this reuse path.
        original=Image.open(BytesIO(original_parts(name+'-webp'))).convert('RGBA')
        current=Image.open(staging).convert('RGBA')
        if current.size!=original.size or current.tobytes()!=original.tobytes():
            raise RuntimeError('Material pixels changed; ASTC reuse rejected: '+name)
        gpu=original_parts(name+'-astc')
        if gpu[:4]!=b'BTX1':raise RuntimeError('Invalid original ASTC material: '+name)
        (root/(name+'.btex')).write_bytes(gpu)
    staging.replace(destination)
    block=4 if suffix=='normal' else 6 if suffix=='albedo' else 8
    # Compressed WebGL uploads cannot flip Y. Match ordinary image textures
    # before encoding every mip, rather than changing metric UVs at runtime.
    tile=tile.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    mipmaps=[];size=tile.width
    if '--fallback-only' in sys.argv or reuse_materials:
        container=(root/(name+'.btex')).read_bytes();magic,width,height,saved_block,count,_=struct.unpack('<4sHHBBH',container[:12])
        if magic!=b'BTX1' or width!=tile.width or height!=width or saved_block!=block:raise RuntimeError('Stale ASTC texture')
        return {'name':name,'width':width,'block':block,'mips':count,'astcBytes':len(container),'fallbackBytes':destination.stat().st_size,'sha256':hashlib.sha256(container).hexdigest()}
    while True:
        source=temporary/(name+f'-{size}.png');target=temporary/(name+f'-{size}.astc')
        tile.save(source)
        cmd=['astcenc','-cs' if suffix=='albedo' else '-cl',str(source),str(target),f'{block}x{block}','-medium','-j','2','-silent']
        # Normal maps keep XY and Z explicitly. Swizzling here would need a
        # different shader decode and corrupt Safari's standard PBR normal path.
        subprocess.run(cmd,check=True,stdout=subprocess.DEVNULL)
        payload=target.read_bytes()
        if len(payload)!=16+math.ceil(size/block)**2*16:raise RuntimeError('Invalid ASTC mip')
        mipmaps.append(payload[16:])
        if size==1:break
        size=max(1,size//2);tile=tile.resize((size,size),Image.Resampling.LANCZOS)
    width=job[3].width
    container=struct.pack('<4sHHBBH',b'BTX1',width,width,block,len(mipmaps),0)
    container+=b''.join(struct.pack('<I',len(m)) for m in mipmaps)+b''.join(mipmaps)
    staging=root/(name+'.btex.tmp');staging.write_bytes(container);staging.replace(root/(name+'.btex'))
    return {'name':name,'width':width,'block':block,'mips':len(mipmaps),'astcBytes':len(container),'fallbackBytes':(root/(name+'.webp')).stat().st_size,'sha256':hashlib.sha256(container).hexdigest()}

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    records=list(pool.map(encode,jobs))
for p in sorted(bakes.glob('lightmap-*.png')):
    staging=root/(p.stem+'.webp.tmp');Image.open(p).save(staging,format='WEBP',lossless=True,exact=True,method=6)
    with Image.open(staging) as check:check.load()
    staging.replace(root/(p.stem+'.webp'))
(root/'manifest.json').write_text(json.dumps({'schema':1,'source':'Blender Cycles native bakes',
    'materialBakeSha256':source_hashes,'materialEncoding':'byte-exact retained ASTC; validated fallback pixels' if reuse_materials else 'fresh ASTC',
    'textures':records,'astcGpuBytes':sum(r['astcBytes'] for r in records),'fallbackDownloadBytes':sum(r['fallbackBytes'] for r in records),'lightmaps':16,'lightmapEncoding':'linear RGBM range 6'},indent=2)+'\n')
print('Production texture compression complete',len(records),flush=True)
