"""Original Blender assets. Run via npm run assets:blender (Blender 4.0+).

Game coordinates are metres, Y up, forward -Z. Blender coordinates are X,-Z,Y.
The glTF exporter restores game axes. Collision and animation belong to the game.
"""
import bpy
import json
import math
import sys
import hashlib
from pathlib import Path
from collections import defaultdict
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

# Distribution builds can embed Python while a cloud shell supplies a different
# stdlib path. Add the matching system extension directory only when it exists.
extension_dir = Path('/usr/lib') / f'python{sys.version_info.major}.{sys.version_info.minor}' / 'lib-dynload'
if extension_dir.exists():
    sys.path.append(str(extension_dir))
system_modules = Path('/usr/lib/python3/dist-packages')
if system_modules.exists():
    sys.path.append(str(system_modules))

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'dist/assets/blender'
SOURCE = Path(__file__).parent
OUT.mkdir(parents=True, exist_ok=True)
INPUT = json.loads((SOURCE / 'rig-input.json').read_text())
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 1
scene.cycles.use_denoising = False
scene.render.bake.margin = 0
scene.view_settings.view_transform = 'Standard'
library = bpy.data.collections.new('Runtime meshes (metres)')
scene.collection.children.link(library)
preview = bpy.data.collections.new('Asset gallery')
scene.collection.children.link(preview)
mesh_assets = {}
manifest = {'schema': 1, 'generator': 'Blender ' + bpy.app.version_string,
            'units': 'metres', 'up': 'Y', 'forward': '-Z',
            'ao': '8 deterministic hemisphere rays, 0.18 m radius for weapons',
            'meshes': {}, 'weapons': {}, 'files': []}
conversion = Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))


def linear(c):
    return c/12.92 if c <= .04045 else ((c+.055)/1.055)**2.4


def evaluated_geometry(obj):
    mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    mesh.calc_loop_triangles()
    verts = [v.co.copy() for v in mesh.vertices]
    tris = [tuple(t.vertices) for t in mesh.loop_triangles]
    bpy.data.meshes.remove(mesh)
    bpy.data.objects.remove(obj, do_unlink=True)
    return verts, tris


def bevel_box(width=.035, segments=2):
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = bpy.context.object
    if hasattr(obj.data,'use_auto_smooth'):obj.data.use_auto_smooth = True
    mod = obj.modifiers.new('Manufactured bevel', 'BEVEL')
    mod.width = width
    mod.segments = segments
    mod.affect = 'EDGES'
    mod.harden_normals = True
    mod = obj.modifiers.new('Weighted face normals', 'WEIGHTED_NORMAL')
    mod.keep_sharp = True
    return evaluated_geometry(obj)


def lathe(rings, sides=16, phase=0, folds=0):
    # Ring profiles are in game Y-up coordinates. All closed meshes wind outward.
    verts = []
    for ri,(y,rx,rz) in enumerate(rings):
        for i in range(sides):
            a=i*math.tau/sides+phase
            f=1+folds*math.sin(i*2.3+ri*1.9)*math.sin(math.pi*ri/(len(rings)-1))
            verts.append(Vector((math.cos(a)*rx*f,y,math.sin(a)*rz*f)))
    tris=[]
    for r in range(len(rings)-1):
        for i in range(sides):
            a=r*sides+i;b=r*sides+(i+1)%sides;c=b+sides;d=a+sides
            tris.extend(((a,d,c),(a,c,b)))
    for r,top in ((0,False),(len(rings)-1,True)):
        centre=len(verts);verts.append(Vector((0,rings[r][0],0)))
        for i in range(sides):
            a=r*sides+i;b=r*sides+(i+1)%sides
            tris.append((centre,b,a) if top else (centre,a,b))
    return verts,tris


def sphere(segments=16, rings=10):
    profile=[(-.5*math.cos(r*math.pi/rings),max(.001,.5*math.sin(r*math.pi/rings)),
              max(.001,.5*math.sin(r*math.pi/rings))) for r in range(rings+1)]
    return lathe(profile,segments)


def tube(sides=20):
    verts=[];tris=[]
    for radius,y in ((.5,-.5),(.5,.5),(.38,-.5),(.38,.5)):
        for i in range(sides):
            a=i*math.tau/sides;verts.append(Vector((math.cos(a)*radius,y,math.sin(a)*radius)))
    for i in range(sides):
        j=(i+1)%sides
        for a,b,c,d in ((i,i+sides,j+sides,j),(i+2*sides,j+2*sides,j+3*sides,i+3*sides),
                         (i,j,j+2*sides,i+2*sides),(i+sides,i+3*sides,j+3*sides,j+sides)):
            tris.extend(((a,b,c),(a,c,d)))
    return verts,tris


BASE = {}
# Native Blender modifier evaluation creates the edge topology, not shader fakes.
for key,w,s in [('box',.035,2),('world',.006,1),('soft',.09,2),('flat',.001,1)]:
    v,t=bevel_box(w,s)
    BASE[key]=([conversion.inverted() @ p for p in v],t)
BASE['sphere']=sphere(12,8)
BASE['cylinder']=lathe([(-.5,.48,.48),(-.48,.5,.5),(.48,.5,.5),(.5,.48,.48)],16)
BASE['tube']=tube()


def assemble(pieces):
    verts=[];tris=[];colors=[]
    for geom,position,scale,color in pieces:
        v,t=geom;start=len(verts)
        for p in v: verts.append(Vector((p.x*scale[0]+position[0],p.y*scale[1]+position[1],p.z*scale[2]+position[2])))
        tris.extend(tuple(i+start for i in tri) for tri in t)
        colors.extend([tuple(linear(c) for c in color)]*len(v))
    return verts,tris,colors


def cavity(verts,tris,radius=.32):
    bvh=BVHTree.FromPolygons(verts,tris,all_triangles=True)
    normals=[Vector((0,0,0)) for _ in verts]
    for a,b,c in tris:
        n=(verts[b]-verts[a]).cross(verts[c]-verts[a])
        for i in (a,b,c): normals[i]+=n
    values=[]
    for p,n in zip(verts,normals):
        if n.length<1e-8: values.append(1);continue
        n.normalize();t=n.cross(Vector((0,1,0)) if abs(n.y)<.9 else Vector((1,0,0))).normalized();b=n.cross(t)
        occluded=0
        for i in range(8):
            z=(i+.5)/8;a=i*2.3999632297;r=math.sqrt(1-z*z)
            direction=(t*math.cos(a)*r+b*math.sin(a)*r+n*z).normalized()
            hit,_,_,d=bvh.ray_cast(p+n*.00008,direction,radius)
            if hit is not None: occluded+=(1-d/radius)*z
        values.append(max(.42,1-occluded*.16))
    return values


def object_mesh(name,verts,tris,colors=None,bake=True,radius=.32,physical=None):
    previous=mesh_assets.get(name)
    if previous:
        old_mesh=previous.data;bpy.data.objects.remove(previous,do_unlink=True)
        if old_mesh.users==0:bpy.data.meshes.remove(old_mesh)
    occlusion=cavity(verts,tris,radius) if bake else [1]*len(verts)
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata([conversion@p for p in verts],[],tris)
    mesh.update()
    if hasattr(mesh,'use_auto_smooth'):
        mesh.use_auto_smooth = True
        mesh.auto_smooth_angle = .5
    # Hard topology retains face normals. Rounded/folded assets are smoothed below.
    uv=mesh.uv_layers.new(name='UVMap')
    color=mesh.color_attributes.new(name='BakedColourAO',type='FLOAT_COLOR',domain='CORNER')
    mesh.color_attributes.active_color=color
    if physical:mesh.uv_layers.new(name='BreachMaterial')
    # CustomData allocation invalidates previously held RNA layer references.
    # Reacquire after adding all layers so UV writes cannot corrupt vertex colour.
    uv=mesh.uv_layers['UVMap'];color=mesh.color_attributes['BakedColourAO']
    mesh.uv_layers.active=uv;uv.active_render=True
    rm=mesh.uv_layers.get('BreachMaterial')
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            vi=mesh.loops[li].vertex_index;p=verts[vi]
            n=conversion.inverted().to_3x3()@poly.normal
            axis=max(range(3),key=lambda i:abs(n[i]))
            coord=(p.z,p.y) if axis==0 else (p.x,p.z) if axis==1 else (p.x,p.y)
            uv.data[li].uv=(coord[0]+.5,coord[1]+.5)
            c=colors[vi] if colors else (1,1,1)
            color.data[li].color=(*[x*occlusion[vi] for x in c],1)
            if rm:rm.data[li].uv=(physical[vi][0],1-physical[vi][1]) # glTF flips UV V.
    obj=bpy.data.objects.new(name,mesh);library.objects.link(obj)
    obj['blender_asset']=True;obj['units']='metres';obj['baked_ao']=bake
    mesh_assets[name]=obj
    manifest['meshes'][name]={'triangles':len(tris),'vertices':len(verts),'vertexMaterial':bool(physical)}
    return obj


def register(name,near,far=None,smooth=False):
    for level,geometry in (('near',near),('far',far or near)):
        obj=object_mesh(name+'__'+level,*geometry)
        if smooth:
            for p in obj.data.polygons:p.use_smooth=True
    return name


def pieces_model(name,pieces,far=None):
    register(name,assemble(pieces),assemble(far) if far else None)


WHITE=(1,1,1);DARK=(.56,.56,.56);EDGE=(.88,.88,.88)
register('architecture',BASE['world'],BASE['flat'])
register('hard',BASE['box'],BASE['world'])
register('soft',BASE['soft'],BASE['box'])
register('sphere',BASE['sphere'],sphere(10,6),True)
register('cylinder',BASE['cylinder'],lathe([(-.5,.5,.5),(.5,.5,.5)],10),True)
register('tube',BASE['tube'],tube(12))
register('surface',([Vector((-.5,0,.5)),Vector((.5,0,.5)),Vector((.5,0,-.5)),Vector((-.5,0,-.5))],[(0,1,2),(0,2,3)]))
register('torso',lathe([(-.5,.33,.35),(-.33,.38,.42),(-.12,.44,.46),(.16,.48,.5),(.39,.49,.42),(.5,.35,.28)],16,folds=.045),
         lathe([(-.5,.33,.35),(.12,.48,.5),(.4,.49,.4),(.5,.35,.28)],10),True)
register('limb',lathe([(-.5,.32,.34),(-.37,.40,.39),(-.25,.43,.42),(0,.5,.5),(.26,.48,.43),(.38,.44,.44),(.5,.42,.38)],12,folds=.05),
         lathe([(-.5,.32,.34),(0,.5,.5),(.5,.42,.38)],8),True)
boot=[(BASE['soft'],(0,.02,.02),(.83,.94,.60),WHITE),
      (BASE['soft'],(0,-.20,-.08),(.95,.58,.83),WHITE),
      (BASE['box'],(0,-.40,0),(1,.2,1),DARK),
      (BASE['soft'],(0,-.13,-.29),(.82,.45,.38),WHITE)]
for y in (-.05,.09,.23):boot.append((BASE['flat'],(0,y,-.298),(.58,.055,.027),DARK))
pieces_model('boot',boot,boot[:3])
vest=[(BASE['soft'],(0,0,.04),(.99,.99,.72),WHITE),
      (BASE['box'],(0,.05,-.37),(.78,.75,.2),EDGE)]
for x in (-.31,0,.31):
    vest.append((BASE['soft'],(x,-.23,-.40),(.28,.38,.18),WHITE))
    vest.append((BASE['flat'],(x,-.1,-.493),(.25,.038,.014),DARK))
for y in (.24,.10,-.04):vest.append((BASE['flat'],(0,y,-.479),(.82,.022,.025),DARK))
pieces_model('vest',vest,vest[:2])
pack=[(BASE['soft'],(0,0,.08),(1,1,.76),WHITE),(BASE['soft'],(0,-.17,-.36),(.75,.45,.22),EDGE)]
for x in (-.3,.3):pack.append((BASE['flat'],(x,0,-.485),(.05,.82,.024),DARK))
pieces_model('pack',pack,pack[:2])
head=[(sphere(18,12),(0,.025,.04),(.84,.95,.80),WHITE),
      (BASE['soft'],(0,-.26,-.16),(.60,.37,.55),WHITE),
      (BASE['soft'],(0,.01,-.35),(.18,.31,.25),EDGE)]
for x in (-.40,.40):head.append((BASE['sphere'],(x,0,.04),(.19,.32,.22),WHITE))
pieces_model('head',head,head[:2])
helmet=lathe([(-.5,.49,.48),(-.29,.5,.5),(.03,.47,.47),(.24,.37,.36),(.43,.18,.18),(.5,.025,.025)],18)
register('helmet',helmet,lathe([(-.5,.49,.48),(-.12,.49,.5),(.34,.31,.30),(.5,.025,.025)],10),True)
glove=[(BASE['soft'],(0,-.02,.08),(.88,.8,.58),WHITE)]
for i in range(4):glove.append((BASE['soft'],(-.31+i*.205,.04,-.27),(.18,.84,.44),WHITE))
glove.append((BASE['sphere'],(.39,-.12,.01),(.21,.48,.45),EDGE))
pieces_model('glove',glove,glove[:1])
crate=[(BASE['world'],(0,0,0),(.94,.94,.94),WHITE)]
for axis in (0,2):
    for side in (-1,1):
        for y in (-.34,0,.34):
            pos=[0,y,0];pos[axis]=side*.483;size=[.99,.09,.035];size[axis]=.035;size[2-axis]=.99
            crate.append((BASE['world'],pos,size,EDGE))
        for k in (-.33,.33):
            pos=[0,0,0];pos[axis]=side*.483;pos[2-axis]=k;size=[.075,.95,.075];size[axis]=.035
            crate.append((BASE['world'],pos,size,DARK))
pieces_model('crate',crate,crate[:1])
for longitudinal in ('x','z'):
    container=[(BASE['world'],(0,0,0),(.97,.97,.97),WHITE)]
    axis=0 if longitudinal=='x' else 2;sideaxis=2-axis
    for side in (-1,1):
        for i in range(13):
            pos=[0,0,0];pos[axis]=-.46+i*.077;pos[sideaxis]=side*.491
            scale=[.018,.93,.018];scale[sideaxis]=.018
            container.append((BASE['world'],pos,scale,EDGE))
    for y in (-.479,.479):container.append((BASE['world'],(0,y,0),(1,.042,1),DARK))
    pieces_model('cargo_'+longitudinal,container,container[:1])
drum=[(BASE['cylinder'],(0,0,0),(.96,.96,.96),WHITE)]
for y in (-.465,-.24,.24,.465):drum.append((BASE['cylinder'],(0,y,0),(1,.048,1),EDGE))
drum.append((BASE['cylinder'],(.18,.483,.04),(.14,.034,.14),DARK))
pieces_model('drum',drum,drum[:1])
rock_v,rock_t=sphere(14,8)
for i,p in enumerate(rock_v):
    p*=.86+.1*math.sin(p.x*13+p.z*9)+.07*math.cos(p.y*17-p.x*7)
register('rock',(rock_v,rock_t),sphere(8,5))
strata=lathe([(-.5,.35,.36),(-.36,.49,.43),(-.26,.45,.47),(-.15,.5,.5),(.04,.42,.47),(.16,.44,.44),(.28,.31,.34),(.5,.18,.19)],12,folds=.055)
register('strata',strata,lathe([(-.5,.4,.4),(-.1,.5,.5),(.24,.35,.4),(.5,.18,.18)],8))
conifer=lathe([(-.5,.35,.35),(-.37,.5,.5),(-.24,.25,.25),(-.22,.42,.42),(-.04,.17,.17),(0,.33,.33),(.18,.11,.11),(.23,.24,.24),(.45,.04,.04),(.5,.002,.002)],12,phase=.12,folds=.1)
conifer_far=lathe([(-.5,.5,.5),(-.18,.26,.26),(-.15,.4,.4),(.13,.13,.13),(.15,.23,.23),(.5,.001,.001)],8)
def crown_colour(geometry):
    v,t=geometry
    return v,t,[tuple(linear(c) for c in (.24+(p.y+.5)*.09,.31+(p.y+.5)*.13,.19+(p.y+.5)*.07)) for p in v]
register('conifer',crown_colour(conifer),crown_colour(conifer_far))
for level,segments in (('near',4),('far',1)):
    verts=[];tris=[]
    for i in range(segments+1):
        y=-.5+i/segments;z=math.sin(i/segments*math.pi)*.07
        verts.extend((Vector((-.5,y,z)),Vector((.5,y,z))))
    for i in range(segments):tris.extend(((i*2,i*2+1,i*2+3),(i*2,i*2+3,i*2+2)))
    obj=object_mesh('leaf__'+level,verts,tris,bake=False)
    for loop in obj.data.loops:
        p=verts[loop.vertex_index];obj.data.uv_layers.active.data[loop.index].uv=(p.x+.5,p.y+.5)


def group_signature(p):
    return p.get('tag','static')

def manufactured_vertex(v,p,key):
    if key not in ('box','flat'):return v
    width=.035 if key=='box' else .001
    dims=(p['w'],p['h'],p['d']);radius=min(.0018,min(dims)*.08)
    return Vector([(math.copysign(d*.5-radius,x)+(x-math.copysign(.5-width,x))*radius/width)/d for x,d in zip(v,dims)])

sys.path.insert(0,str(SOURCE))
from art_geometry import author_shared,hero_part
manifest['props']=author_shared(globals())
from production_assets import author_production
manifest['props']+=author_production(globals())
from hero_models import author_heroes
manifest['props']+=author_heroes(globals())
manifest['artRevision']=5
manifest['authorship']='Original Blender mesh authoring and native Cycles colour/normal/physical bakes'


# Build complete weapon cores, preserving movable component names. Each group is
# welded for a single indexed draw and inherits the exact existing joint matrix.
hand_shape_cache={}
for weapon in INPUT['weapons']:
    record={'name':weapon['name'],'coreCount':weapon['coreCount'],'handCount':len(weapon.get('hands',[]))}
    for section,source_parts in (('groups',weapon['parts']),('hands',weapon.get('hands',[]))):
      groups=defaultdict(list)
      for p in source_parts:groups[group_signature(p)].append(p)
      definitions=[]
      for gi,(signature,parts) in enumerate(groups.items()):
        anchor=parts[0];anchor_matrix=Matrix([anchor['matrix'][i:i+4] for i in range(0,16,4)]).transposed()
        inverse=anchor_matrix.inverted()
        vertices=[];triangles=[];colours=[];physical=[]
        for p in parts:
            authored_hand_colors=None;authored_hand_physical=None
            key='cylinder' if p.get('mesh')=='cylinder' else 'tube' if p.get('mesh')=='tube' else 'sphere' if p.get('mesh')=='sphere' else 'flat' if p.get('mesh')=='cube' else 'box'
            designed=hero_part(p,BASE,weapon)
            if section=='hands':
                hand_kind=('sleeve_z' if p['d']>p['h'] else 'forearm') if p.get('tile')==9 and max(p['d'],p['h'])>.15 else 'palm' if p.get('mesh')=='sphere' and p['w']>.055 and p['h']>.06 and p['d']>.055 else 'finger' if p.get('mesh')=='sphere' and p['w']<.035 else None
                if hand_kind:
                    mesh=mesh_assets[hand_kind+'__near'].data;mesh.calc_loop_triangles()
                    designed=([conversion.inverted()@v.co for v in mesh.vertices],[tuple(t.vertices) for t in mesh.loop_triangles])
                    # Preserve the modelled cuff, stitch and palm materials in
                    # the welded moving hand, rather than repainting it grey.
                    layer=mesh.color_attributes.get('BakedColourAO');rm=mesh.uv_layers.get('BreachMaterial')
                    if layer:
                        authored_hand_colors=[None]*len(mesh.vertices)
                        authored_hand_physical=[(.85,0)]*len(mesh.vertices)
                        for loop in mesh.loops:
                            authored_hand_colors[loop.vertex_index]=tuple(layer.data[loop.index].color[:3])
                            if rm:
                                q=rm.data[loop.index].uv
                                authored_hand_physical[loop.vertex_index]=(q.x,1-q.y)
            v,t=designed or BASE[key];matrix=Matrix([p['matrix'][i:i+4] for i in range(0,16,4)]).transposed()
            start=len(vertices);vertices.extend(matrix@(q if designed else manufactured_vertex(q,p,key)) for q in v)
            triangles.extend(tuple(i+start for i in tri) for tri in t)
            colour=p.get('color',(.2,.2,.2))
            if section=='groups':
                colour=tuple(max(.32 if p.get('metal',0)>.45 else .25,x) for x in colour)
            else:
                colour=tuple(.07+.93*x for x in colour)
            tint=tuple(linear(x) for x in colour)
            colours.extend([tuple(x*y for x,y in zip(c,tint)) for c in authored_hand_colors] if authored_hand_colors else [tint]*len(v))
            coated=p.get('metal',0)>.45 and max(p.get('color',(1,1,1)))<.21
            physical.extend(authored_hand_physical or [(p.get('rough',.6),.24 if coated else p.get('metal',0))]*len(v))
        ao=cavity(vertices,triangles,.18)
        local=[inverse@p for p in vertices]
        colours=[tuple(x*ao[i] for x in c) for i,c in enumerate(colours)]
        name=f"weapon_{weapon['id']}_{section}_{gi}"
        if section=='hands':
            # Identical poses share GPU/source geometry across the arsenal.
            # Quantisation is below 0.01 mm at the real hand scale.
            signature=hashlib.sha256(json.dumps([[tuple(round(v,4) for v in p) for p in local],triangles,[tuple(round(v,3) for v in c) for c in colours],physical]).encode()).hexdigest()
            if signature in hand_shape_cache:name=hand_shape_cache[signature]
            else:
                obj=object_mesh(name,local,triangles,colours,bake=False,physical=physical)
                for poly in obj.data.polygons:poly.use_smooth=True
                hand_shape_cache[signature]=name
        else:
            obj=object_mesh(name,local,triangles,colours,bake=False,physical=physical)
            for poly in obj.data.polygons:poly.use_smooth=True
            normals=obj.modifiers.new('Machined surface normals','WEIGHTED_NORMAL')
            normals.mode='FACE_AREA_WITH_ANGLE';normals.keep_sharp=True;normals.weight=50
        # Welded vertices share indexed buffers; glTF splits only true UV/normal seams.
        definitions.append({'mesh':name,'anchor':anchor['index'],'tag':signature,
                            'finishTile':0,'rough':.5,'metal':.5,'tile':-1,
                            'vertexMaterial':True,'members':[p['index'] for p in parts]})
      record[section]=definitions
    manifest['weapons'][str(weapon['id'])]=record
    print(f"Authored {weapon['name']}: {len(record['groups'])} weapon and {len(record['hands'])} hand groups",flush=True)


def terrain(map_info,segments,steps):
    size=map_info['size'];id=map_info['id'];inner=math.sqrt(2)*size+5
    verts=[];tris=[];colours=[]
    for row in range(steps+1):
        t=row/steps
        for i in range(segments+1):
            a=i/segments*math.tau
            base=18 if id==8 else 14 if id in (3,5) else 12 if id==9 else 10 if id==2 else 11
            crest=base+2.8*math.sin(a*3+id*.7)+1.7*math.sin(a*7-id*.37)+.9*math.sin(a*13+id)
            r=inner+t*66+(math.sin(a*5+id*.4)*3.5+math.sin(a*11-id*.6)*2)*math.sin(math.pi*t)
            profile=math.sin(math.pi*t)**1.7
            erosion=(math.sin(a*29+t*15)+.55*math.sin(a*57-t*24))*1.2*profile
            y=-2.2+(crest+2.2)*profile+erosion
            verts.append(Vector((math.sin(a)*r,y,math.cos(a)*r)))
            snow=max(0,min(1,(y-9)/9)) if id==8 else 0
            dry=id in (2,9)
            c=(.59,.47,.33) if dry else (.45,.52,.47)
            c=tuple(v*(.93+.08*math.sin(a*19+t*9)) for v in c)
            c=tuple(c[j]*(1-snow)+(.90,.95,.98)[j]*snow for j in range(3))
            colours.append(tuple(linear(v) for v in c))
    for row in range(steps):
        for i in range(segments):
            a=row*(segments+1)+i;b=a+segments+1;c=b+1;d=a+1
            tris.extend(((a,b,c),(a,c,d)))
    return verts,tris,colours

for map_info in INPUT.get('maps',[]):
    if map_info['id']==4:continue # Maritime terminal retains its open sea horizon.
    register('ridge_'+str(map_info['id']),terrain(map_info,128,8),terrain(map_info,64,4),True)


def shader_math(nodes,links,op,a,b):
    node=nodes.new('ShaderNodeMath');node.operation=op
    if hasattr(a,'node'):links.new(a,node.inputs[0])
    else:node.inputs[0].default_value=a
    if hasattr(b,'node'):links.new(b,node.inputs[1])
    else:node.inputs[1].default_value=b
    return node.outputs[0]


def bake_details(name,columns,hero=False):
    resolution=1024
    mesh=bpy.data.meshes.new(name+'_bake_grid')
    vertices=[];faces=[]
    for tile in range(columns*columns):
        x=tile%columns;y=tile//columns;start=len(vertices)
        vertices.extend(((x*2,y*2,0),(x*2+1,y*2,0),(x*2+1,y*2+1,0),(x*2,y*2+1,0)))
        faces.append((start,start+1,start+2,start+3))
    mesh.from_pydata(vertices,[],faces);mesh.update()
    local=mesh.uv_layers.new(name='MaterialUV');bake=mesh.uv_layers.new(name='BakeUV')
    local=mesh.uv_layers['MaterialUV'];bake=mesh.uv_layers['BakeUV']
    mesh.uv_layers.active=bake;bake.active_render=True
    for tile,poly in enumerate(mesh.polygons):
        for li,uv in zip(poly.loop_indices,((0,0),(1,0),(1,1),(0,1))):
            local.data[li].uv=uv
            bake.data[li].uv=((tile%columns+uv[0])/columns,(columns-1-tile//columns+uv[1])/columns)
        poly.material_index=tile
    obj=bpy.data.objects.new(name+'_baking',mesh);scene.collection.objects.link(obj)
    normal_image=bpy.data.images.new(name+'-normal',width=resolution,height=resolution,alpha=False)
    orm_image=bpy.data.images.new(name+'-orm',width=resolution,height=resolution,alpha=False)
    for image in (normal_image,orm_image):image.colorspace_settings.name='Non-Color'
    definitions=[]
    for tile in range(columns*columns):
        mat=bpy.data.materials.new(f'{name} / tile {tile}');mat.use_nodes=True;mesh.materials.append(mat)
        n=mat.node_tree.nodes;l=mat.node_tree.links;n.clear()
        uv=n.new('ShaderNodeUVMap');uv.uv_map='MaterialUV'
        mapping=n.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY';mapping.inputs[1].default_value=(1,1,1)
        l.new(uv.outputs[0],mapping.inputs[0])
        noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=150 if hero else 65;noise.inputs['Detail'].default_value=2.5
        l.new(mapping.outputs[0],noise.inputs['Vector'])
        grain=n.new('ShaderNodeTexNoise');grain.inputs['Scale'].default_value=12;grain.inputs['Detail'].default_value=3
        l.new(uv.outputs[0],grain.inputs['Vector'])
        height=shader_math(n,l,'ADD',shader_math(n,l,'MULTIPLY',noise.outputs['Fac'],.17),shader_math(n,l,'MULTIPLY',grain.outputs['Fac'],.09))
        if (not hero and tile in (8,11)) or (hero and tile==0):
            mapping.inputs[1].default_value=(.18,9,1)
        if (not hero and tile==10) or (hero and tile==1):
            wave=n.new('ShaderNodeTexWave');wave.wave_type='BANDS';wave.bands_direction='X';wave.inputs['Scale'].default_value=28;wave.inputs['Distortion'].default_value=5
            l.new(uv.outputs[0],wave.inputs['Vector']);height=shader_math(n,l,'MULTIPLY',wave.outputs['Color'],.08)
        if (not hero and tile==9) or (hero and tile in (2,3)):
            # Separate warp/weft frequencies prevent the old noisy rock-like cloth.
            checker=n.new('ShaderNodeTexChecker');checker.inputs['Scale'].default_value=135
            l.new(uv.outputs[0],checker.inputs['Vector']);height=shader_math(n,l,'MULTIPLY',checker.outputs['Fac'],.035)
        bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.24 if hero else .48;bump.inputs['Distance'].default_value=.012 if hero else .026
        l.new(height,bump.inputs['Height'])
        principled=n.new('ShaderNodeBsdfPrincipled');l.new(bump.outputs['Normal'],principled.inputs['Normal'])
        principled.inputs['Roughness'].default_value=.6;principled.inputs['Base Color'].default_value=(.3,.3,.3,1)
        output=n.new('ShaderNodeOutputMaterial');l.new(principled.outputs['BSDF'],output.inputs['Surface'])
        target=n.new('ShaderNodeTexImage');target.image=normal_image;n.active=target
        red=shader_math(n,l,'ADD',shader_math(n,l,'MULTIPLY',grain.outputs['Fac'],.10),.90)
        green=shader_math(n,l,'ADD',shader_math(n,l,'MULTIPLY',noise.outputs['Fac'],.22),.64)
        blue=shader_math(n,l,'ADD',shader_math(n,l,'MULTIPLY',grain.outputs['Fac'],.16),.84)
        pack=n.new('ShaderNodeCombineXYZ');l.new(red,pack.inputs[0]);l.new(green,pack.inputs[1]);l.new(blue,pack.inputs[2])
        emit=n.new('ShaderNodeEmission');l.new(pack.outputs[0],emit.inputs['Color'])
        definitions.append((n,l,target,output,emit))
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    scene.render.bake.use_clear=True
    bpy.ops.object.bake(type='NORMAL')
    for n,l,target,output,emit in definitions:
        target.image=orm_image;n.active=target
        l.new(emit.outputs[0],output.inputs['Surface'])
    bpy.ops.object.bake(type='EMIT')
    for image in (normal_image,orm_image):
        image.filepath_raw=str(OUT/(image.name+'.png'));image.file_format='PNG';image.save();image.pack();image.use_fake_user=True
        if max(image.pixels[:4096])==0:raise RuntimeError('Empty Blender bake: '+image.name)
    obj.hide_render=True;obj.hide_set(True)


from materials import bake_atlas,bake_auxiliary
rebake_argument=next((arg for arg in sys.argv if arg.startswith('--rebake-maps=')),None)
rebake_maps=set(int(value) for value in rebake_argument.split('=',1)[1].split(',')) if rebake_argument else None
if rebake_maps and (not rebake_maps.issubset(set(range(16))) or '--reuse-lightmaps' in sys.argv or '--reuse-bakes' not in sys.argv):
    raise RuntimeError('Selective GI requires valid map ids and cannot reuse those lightmaps')
if '--reuse-bakes' in sys.argv:
    # Geometry iteration restores the exact previously baked pixels and their
    # editable shader graphs from our native source, without rebaking imagery.
    previous=SOURCE/'breachline-assets.blend'
    if not previous.exists():raise RuntimeError('Restore the native source before using --reuse-bakes')
    baked_names=['surfaces-albedo','surfaces-normal','surfaces-orm',
                 'weapons-albedo','weapons-normal','weapons-orm','foliage','sky','effects']
    if '--reuse-lightmaps' in sys.argv:baked_names += ['lightmap-'+str(i) for i in range(16)]
    elif rebake_maps:baked_names += ['lightmap-'+str(i) for i in range(16) if i not in rebake_maps]
    with bpy.data.libraries.load(str(previous),link=False) as (source,target):
        if not all(n in source.images for n in baked_names):raise RuntimeError('Incomplete cached native bakes')
        target.images=baked_names.copy()
        target.objects=[n for n in source.objects if n.endswith(' / baking')]
    for obj in target.objects:
        scene.collection.objects.link(obj);obj.hide_render=True;obj.hide_set(True)
    for name in baked_names:
        image=bpy.data.images[name]
        if not image.packed_file:raise RuntimeError('Cached bake is not packed: '+name)
        data=bytes(image.packed_file.data)
        if data[:8]!=b'\x89PNG\r\n\x1a\n':raise RuntimeError('Cached bake is not PNG: '+name)
        (OUT/(name+'.png')).write_bytes(data);image.use_fake_user=True
    print('REUSED_NATIVE_BAKES: nine exact packed images and editable shader graphs',flush=True)
else:
    bake_atlas(scene,OUT,'surfaces',4)
    bake_atlas(scene,OUT,'weapons',2,True)
    bake_auxiliary(scene,OUT,'foliage',2,'foliage')
    bake_auxiliary(scene,OUT,'sky',1,'clouds')
    bake_auxiliary(scene,OUT,'effects',2,'effects')

bpy.ops.object.select_all(action='DESELECT')
for obj in mesh_assets.values():obj.select_set(True)
bpy.context.view_layer.objects.active=next(iter(mesh_assets.values()))
glb=OUT/'breachline-library.glb'
export_options=dict(filepath=str(glb),export_format='GLB',use_selection=True,
                    export_yup=True,export_apply=True,export_materials='NONE',
                    export_normals=True,export_texcoords=True,
                    export_extras=True,export_animations=False)
export_properties=bpy.ops.export_scene.gltf.get_rna_type().properties
if 'export_vertex_color' in export_properties:
    export_options.update(export_vertex_color='ACTIVE',export_active_vertex_color_when_no_material=True)
else:export_options['export_colors']=True
bpy.ops.export_scene.gltf(**export_options)

# Source materials display baked colour and physical response inside Blender.
for physical in (False,True):
    material=bpy.data.materials.new('Weapon physical vertex material' if physical else 'Kit baked colour and AO')
    material.use_nodes=True;n=material.node_tree.nodes;l=material.node_tree.links
    bsdf=n.get('Principled BSDF');attribute=n.new('ShaderNodeVertexColor');attribute.layer_name='BakedColourAO'
    l.new(attribute.outputs['Color'],bsdf.inputs['Base Color']);bsdf.inputs['Roughness'].default_value=.72
    if physical:
        uv=n.new('ShaderNodeUVMap');uv.uv_map='BreachMaterial';separate=n.new('ShaderNodeSeparateXYZ');l.new(uv.outputs[0],separate.inputs[0])
        l.new(separate.outputs[0],bsdf.inputs['Roughness'])
        invert=n.new('ShaderNodeMath');invert.operation='SUBTRACT';invert.inputs[0].default_value=1;l.new(separate.outputs[1],invert.inputs[1]);l.new(invert.outputs[0],bsdf.inputs['Metallic'])
    for name,obj in mesh_assets.items():
        if bool(obj.data.uv_layers.get('BreachMaterial'))==physical:obj.data.materials.append(material)

# A gallery makes the editable source useful immediately when opened in Blender.
for i,(name,obj) in enumerate(mesh_assets.items()):
    obj.hide_set(True);obj.hide_render=True
    if name.startswith('weapon_'):continue
    if name.endswith('__far'):continue
    copy=bpy.data.objects.new(name+' / preview',obj.data);preview.objects.link(copy)
    copy.location=(i%12*1.4,i//12*1.4,0)
    if name.startswith('ridge_'):copy.scale=(.007,.007,.007)
for weapon in INPUT['weapons']:
    collection=bpy.data.collections.new(f"Weapon {weapon['id']:02d} / {weapon['name']}");preview.children.link(collection)
    offset=Vector((weapon['id']%6*1.5,weapon['id']//6*1.3-8,0))
    for group in manifest['weapons'][str(weapon['id'])]['groups']:
        original=mesh_assets[group['mesh']];copy=bpy.data.objects.new(group['tag'],original.data);collection.objects.link(copy)
        anchor=weapon['parts'][group['anchor']]
        transform=Matrix([anchor['matrix'][i:i+4] for i in range(0,16,4)]).transposed()
        copy.matrix_world=conversion@transform@conversion.inverted();copy.location+=offset
        copy['animated_tag']=group['tag'];copy['rig_anchor']=group['anchor']
scene['pipeline']='BREACHLINE Blender -> GLB -> indexed instanced WebGL2'
scene['gameplay']='Rig transforms and collision are owned by Release 48 simulation'
scene['regenerate']='npm run assets:blender'
scene['normal_maps']='Cycles tangent-normal bake from independent surface height graphs'
scene['source_texture_license']='Original BREACHLINE textures'
levels=bpy.data.collections.new('Complete levels / metres');scene.collection.children.link(levels)
from level_materials import LevelMaterials
level_materials=LevelMaterials()
for info in INPUT['maps']:
    collection=bpy.data.collections.new(f"Map {info['id']:02d} / {info['name']}");levels.children.link(collection)
    collection['map_id']=info['id'];collection['collision']='Original simulation, unchanged';collection['sun']=info['sun']
    for i,p in enumerate(info.get('parts',[])):
        original=mesh_assets.get(p['kind']+'__near')
        if not original:raise RuntimeError('Missing full-level Blender asset: '+p['kind'])
        obj=bpy.data.objects.new(f"{p['surface']} / {i:04d}",original.data);collection.objects.link(obj)
        transform=Matrix([p['matrix'][j:j+4] for j in range(0,16,4)]).transposed()
        obj.matrix_world=conversion@transform@conversion.inverted()
        obj.color=(*([1,1,1] if p['authoredColour'] else p['material']['color']),1)
        level_materials.assign(obj,p)
        obj['surface']=p['surface'];obj['texture_tile']=p['material']['pattern']-1;obj['breakable']=p.get('breakable',False)
    collection.hide_viewport=True;collection.hide_render=True
scene['levels']='All 16 complete level assemblies are in Complete levels / metres. Enable one collection to inspect it.'
from bake_lighting import bake_levels
if '--reuse-lightmaps' in sys.argv:
    scene['lighting_bakes']='Cached Cycles RGBM bakes, 512 px, 32 samples; geometry-only hero iteration'
else:bake_levels(scene,OUT,levels,preview,INPUT['maps'],rebake_maps)
scene.world.color=(.22,.22,.22)
source_path=SOURCE/'breachline-assets.blend'
source_staging=SOURCE/'breachline-assets.staging.blend'
# Appending cached bake graphs keeps their library open until Blender exits.
# Save to a separate file, then replace atomically after a successful save.
bpy.ops.wm.save_as_mainfile(filepath=str(source_staging),compress=True)
source_staging.replace(source_path)
for file in sorted(OUT.iterdir()):
    if file.suffix in ('.glb','.png'):
        manifest['files'].append({'path':file.name,'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f"BLENDER_EXPORT_OK: {len(mesh_assets)} meshes; {glb.stat().st_size} bytes GLB",flush=True)
