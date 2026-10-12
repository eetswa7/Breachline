"""Actual offline Cycles direct + indirect diffuse lightmaps for all battlegrounds.

RGBM retains linear HDR radiance in an ordinary RGBA image. The player never
needs Cycles, an external lighting service or a screen-space GI render pass.
"""
import bpy
import math
import struct
import zlib
import numpy as np
from mathutils import Vector


def bake_levels(scene,out,levels,preview,maps,selected_maps=None):
    preview.hide_render=True
    old_samples=scene.cycles.samples;scene.cycles.samples=32
    scene.cycles.max_bounces=4;scene.cycles.diffuse_bounces=3
    scene.render.bake.use_pass_direct=True;scene.render.bake.use_pass_indirect=True
    scene.render.bake.use_pass_color=False;scene.render.bake.margin=0
    scene.world.use_nodes=True;background=scene.world.node_tree.nodes.get('Background')
    # Normal maps and material bakes stay packed separately in the source.
    white=bpy.data.materials.new('GI bake / unit diffuse reflectance');white.use_nodes=True
    bsdf=white.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=(1,1,1,1)
    bsdf.inputs['Roughness'].default_value=1
    target=white.node_tree.nodes.new('ShaderNodeTexImage');white.node_tree.nodes.active=target
    lights=bpy.data.collections.new('Offline lighting rigs');scene.collection.children.link(lights)
    sun_data=bpy.data.lights.new('Baked sunlight','SUN');sun_data.angle=.11
    sun=bpy.data.objects.new('Baked sunlight',sun_data);lights.objects.link(sun)
    for info,collection in zip(maps,levels.children):
        if selected_maps is not None and info['id'] not in selected_maps:continue
        size=info['size'];collection.hide_viewport=False;collection.hide_render=False
        overcast=info['weather'] in ('overcast','rain')
        background.inputs['Color'].default_value=(*info['sky'],1)
        background.inputs['Strength'].default_value=.66 if overcast else .52
        sun_data.energy=1.45 if overcast else 2.8
        sun_data.color=(.83,.9,1) if overcast else (1,.93,.81)
        direction=Vector((info['sun'][0],-info['sun'][2],info['sun'][1]))
        sun.rotation_euler=(-direction).to_track_quat('-Z','Y').to_euler()
        local_lights=[]
        for p in info.get('parts',[]):
            if p.get('material',{}).get('emissive',0)<=.5 or p['surface']!='white':continue
            m=p['matrix'];y=m[13]
            if y<2:continue
            data=bpy.data.lights.new('Baked ceiling area','AREA');data.energy=145
            data.shape='RECTANGLE';data.size=max(.45,abs(m[0]));data.size_y=max(.6,abs(m[10]))
            data.color=(1,.88,.69)
            lamp=bpy.data.objects.new('Baked ceiling area',data);lights.objects.link(lamp)
            lamp.location=(m[12],-m[14],y-.13);local_lights.append(lamp)
        mesh=bpy.data.meshes.new('GI capture / '+info['name'])
        mesh.from_pydata([(-size,size,.105),(size,size,.105),(size,-size,.105),(-size,-size,.105)],[],[(0,3,2,1)])
        mesh.uv_layers.new(name='LightmapUV')
        uv=[(0,0),(1,0),(1,1),(0,1)]
        for loop in mesh.loops:mesh.uv_layers[0].data[loop.index].uv=uv[loop.vertex_index]
        floor=bpy.data.objects.new('GI capture / '+info['name'],mesh);scene.collection.objects.link(floor)
        mesh.materials.append(white)
        image=bpy.data.images.new('GI capture '+str(info['id']),width=512,height=512,alpha=True,float_buffer=True)
        image.colorspace_settings.name='Non-Color';image.use_fake_user=True;target.image=image
        bpy.ops.object.select_all(action='DESELECT');floor.select_set(True);bpy.context.view_layer.objects.active=floor
        # Destructibles use the existing live contact/shadow path, so their
        # silhouettes never become permanent dark marks in the static bake.
        excluded=[]
        for obj in collection.objects:
            if obj.get('breakable',False):obj.hide_render=True;excluded.append(obj)
        bpy.ops.object.bake(type='DIFFUSE')
        pixels=np.empty(512*512*4,dtype=np.float32);image.pixels.foreach_get(pixels);pixels=pixels.reshape((-1,4))
        rgb=np.maximum(0,pixels[:,:3]);mult=np.maximum(1/255,np.ceil(np.clip(rgb.max(axis=1)/6,0,1)*255)/255)
        pixels[:,:3]=np.clip(rgb/(mult[:,None]*6),0,1);pixels[:,3]=mult
        # Alpha is a fourth data channel, not opacity. Blender's ordinary RGBA
        # writer unpremultiplies it, which destroys RGBM chroma and radiance.
        # Write exact channel-packed pixels, then pack that PNG into the source.
        rgba=np.round(np.clip(pixels,0,1)*255).astype(np.uint8).reshape((512,512,4))[::-1]
        def chunk(kind,data):return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
        png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',512,512,8,6,0,0,0))
        png+=chunk(b'IDAT',zlib.compress(b''.join(b'\0'+row.tobytes() for row in rgba),9))+chunk(b'IEND',b'')
        path=out/('lightmap-'+str(info['id'])+'.png');temporary=path.with_suffix('.png.tmp');temporary.write_bytes(png);temporary.replace(path)
        encoded=bpy.data.images.load(str(path),check_existing=False);encoded.name='lightmap-'+str(info['id'])
        encoded.alpha_mode='CHANNEL_PACKED';encoded.colorspace_settings.name='Non-Color';encoded.use_fake_user=True;encoded.pack()
        encoded['encoding']='linear RGBM, range 6';encoded['cycles_samples']=32;target.image=encoded
        bpy.data.images.remove(image)
        floor.hide_render=True;floor.hide_set(True)
        collection.hide_render=True;collection.hide_viewport=True
        for obj in excluded:obj.hide_render=False
        for lamp in local_lights:
            data=lamp.data;bpy.data.objects.remove(lamp,do_unlink=True);bpy.data.lights.remove(data)
        print('BAKED_CYCLES_GI',info['name'],flush=True)
    lights.hide_render=True;scene.cycles.samples=old_samples;preview.hide_render=False
    scene['lighting_bakes']='16 actual Cycles diffuse direct + indirect RGBM lightmaps, 512 px, 32 samples, 3 diffuse bounces'
