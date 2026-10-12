"""Original hero modelling: manufactured weapons, anatomical cloth and equipment.

All geometry is authored in the original unit component envelope. The production
builder applies the unchanged rig matrices afterwards. Native negative-space
machining, continuous profiles and sewn garment construction carry the image;
small separate detail meshes are merged into the existing material groups.
"""
import bpy
import math
from mathutils import Vector, Matrix


_component_cache = {}


def _extrude_outline(outline, widths, axis=0):
    """Extrude an ordered planar contour; Blender triangulates the end faces."""
    vertices=[]
    for width in widths:
        for a,b in outline:
            vertices.append(Vector((width,a,b) if axis==0 else (a,width,b)))
    count=len(outline);faces=[tuple(range(count-1,-1,-1)),tuple(range(count,count*2))]
    for i in range(count):
        j=(i+1)%count;faces.append((i,j,j+count,i+count))
    mesh=bpy.data.meshes.new('Hero contour / editable extrusion')
    mesh.from_pydata(vertices,[],faces);mesh.update();mesh.calc_loop_triangles()
    geometry=([p.co.copy() for p in mesh.vertices],[tuple(p.vertices) for p in mesh.loop_triangles])
    bpy.data.meshes.remove(mesh)
    return geometry


def _profile(rings, sides=12, axis=1):
    vertices=[];triangles=[]
    for position,rx,rz,cx,cz in rings:
        for i in range(sides):
            a=math.tau*i/sides
            q=Vector((cx+math.cos(a)*rx,position,cz+math.sin(a)*rz))
            vertices.append(q if axis==1 else Vector((q.x,-q.z,q.y)))
    for row in range(len(rings)-1):
        for i in range(sides):
            a=row*sides+i;b=row*sides+(i+1)%sides
            triangles.extend(((a,a+sides,b+sides),(a,b+sides,b)))
    for row,upper in ((0,False),(len(rings)-1,True)):
        q=Vector((rings[row][3],rings[row][0],rings[row][4]));centre=len(vertices)
        vertices.append(q if axis==1 else Vector((q.x,-q.z,q.y)))
        for i in range(sides):
            a=row*sides+i;b=row*sides+(i+1)%sides
            triangles.append((centre,b,a) if upper else (centre,a,b))
    return vertices,triangles


def _chamfer_profile(rings, axis=2):
    perimeter=((-1,-.70),(-.70,-1),(.70,-1),(1,-.70),(1,.68),(.72,1),(-.72,1),(-1,.68))
    vertices=[];triangles=[]
    for z,rx,ry,cy in rings:
        for x,y in perimeter:vertices.append(Vector((x*rx,y*ry+cy,z)))
    for row in range(len(rings)-1):
        for i in range(8):
            a=row*8+i;b=row*8+(i+1)%8;triangles.extend(((a,b,b+8),(a,b+8,a+8)))
    for row,front in ((0,True),(len(rings)-1,False)):
        centre=len(vertices);vertices.append(Vector((0,rings[row][3],rings[row][0])))
        for i in range(8):
            a=row*8+i;b=row*8+(i+1)%8
            triangles.append((centre,b,a) if front else (centre,a,b))
    if axis==1:vertices=[Vector((q.x,q.z,-q.y)) for q in vertices]
    return vertices,triangles


def _section_profile(rings, perimeter):
    """Loft a manufactured section, including a stepped/concave forging.

    End caps are native polygons rather than centre fans: the latter fill in
    the shoulder's negative space when a section is not convex.
    """
    vertices=[];faces=[];count=len(perimeter)
    for z,rx,ry,cy in rings:
        vertices.extend(Vector((x*rx,y*ry+cy,z)) for x,y in perimeter)
    faces.extend((tuple(range(count-1,-1,-1)),tuple(range((len(rings)-1)*count,len(rings)*count))))
    for row in range(len(rings)-1):
        for i in range(count):
            a=row*count+i;b=row*count+(i+1)%count
            faces.append((a,b,b+count,a+count))
    mesh=bpy.data.meshes.new('Hero / editable formed section')
    mesh.from_pydata(vertices,[],faces);mesh.update();mesh.calc_loop_triangles()
    result=([q.co.copy() for q in mesh.vertices],[tuple(q.vertices) for q in mesh.loop_triangles])
    bpy.data.meshes.remove(mesh)
    return result


def _weapon_role(p,weapon=None):
    """Classify the unchanged rig envelope once for geometry and finishes."""
    tag=p.get('tag','');kind=(weapon or {}).get('kind','')
    width,height,depth=p['w'],p['h'],p['d']
    if p.get('mesh') in ('sphere','tube'):return None
    if p.get('mesh')=='cylinder':
        if tag=='magazine' and width>.12:return 'drum'
        if tag=='pump' and width>.055:return 'pump'
        if height>width*3 and width>.024:return 'barrel'
        return None
    if tag=='magazine' and height>.055 and width>.035 and depth>.04:return 'magazine'
    if tag=='slide' and width>.055 and height>.055 and depth>.15:return 'slide'
    if width>.039 and height>.12 and depth<.13 and p['y']<-.05 and abs(p['x'])<.02:return 'grip'
    if abs(p['x'])<.02 and width>.055 and .030<height<.057 and depth>.15 and -.05<p['y']<0 and p['z']<.12:return 'lower_receiver'
    if abs(p['x'])<.02 and width>.055 and height>.057 and depth>.13:
        return 'handguard' if p['z']<-.13 else 'stock' if p['z']>.14 else 'receiver'
    if abs(p['x'])<.02 and p['z']>.17 and width>.05 and height>.10 and depth>.065:return 'stock'
    if kind=='MELEE' and depth>.1 and width<.03 and height>.035:return 'blade'
    return None


def _machining(geometry,p,cuts=(),radius=.0011,segments=2):
    """Boolean and bevel in metres; normalised bevels distort skinny receivers."""
    dimensions=Vector((p['w'],p['h'],p['d']))
    vertices,triangles=geometry;mesh=bpy.data.meshes.new('Hero / pre-machined mesh')
    mesh.from_pydata([tuple(q[i]*dimensions[i] for i in range(3)) for q in vertices],[],triangles)
    mesh.update();obj=bpy.data.objects.new('Hero / manufacturing operations',mesh)
    bpy.context.scene.collection.objects.link(obj)
    # Recalculate before native booleans. The contour authoring direction may
    # differ between slide, cloth and transverse receiver construction.
    import bmesh
    bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
    for i,(position,size) in enumerate(cuts):
        bpy.ops.mesh.primitive_cube_add(size=1)
        cutter=bpy.context.object;cutter.location=tuple(position[j]*dimensions[j] for j in range(3))
        cutter.scale=tuple(size[j]*dimensions[j] for j in range(3))
        bpy.context.view_layer.objects.active=cutter
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        bevel=cutter.modifiers.new('Slot cutter edge radius','BEVEL');bevel.width=min(.0009,min(cutter.dimensions)*.17);bevel.segments=2
        bpy.context.view_layer.objects.active=obj
        boolean=obj.modifiers.new('Machined cavity '+str(i),'BOOLEAN');boolean.operation='DIFFERENCE';boolean.solver='EXACT';boolean.object=cutter
        bpy.ops.object.modifier_apply(modifier=boolean.name)
        cutter_mesh=cutter.data;bpy.data.objects.remove(cutter,do_unlink=True)
        if cutter_mesh.users==0:bpy.data.meshes.remove(cutter_mesh)
    bevel=obj.modifiers.new('Physical edge highlight','BEVEL');bevel.width=min(radius,min(dimensions)*.055)
    bevel.segments=segments;bevel.limit_method='ANGLE';bevel.angle_limit=.48;bevel.use_clamp_overlap=True
    evaluated=bpy.data.meshes.new_from_object(obj.evaluated_get(bpy.context.evaluated_depsgraph_get()));evaluated.calc_loop_triangles()
    result=([Vector(tuple(q.co[i]/dimensions[i] for i in range(3))) for q in evaluated.vertices],
            [tuple(q.vertices) for q in evaluated.loop_triangles])
    bpy.data.meshes.remove(evaluated);bpy.data.objects.remove(obj,do_unlink=True)
    if mesh.users==0:bpy.data.meshes.remove(mesh)
    return result


def weapon_component(p,base,weapon=None):
    tag=p.get('tag','');kind=(weapon or {}).get('kind','');identity=(weapon or {}).get('id',0)
    width,height,depth=p['w'],p['h'],p['d'];metal=p.get('metal',0)
    wood=p.get('tile')==10;role=_weapon_role(p,weapon)
    # Primitive overlays from the original rig represented holes with black
    # rectangles and magazine/grip moulding with thick attached plates. Native
    # manufacturing now owns those surfaces; keep their member indices while
    # omitting the covered geometry, so animation/collision contracts survive.
    thin_side=abs(p['x'])>.02 and width<.006
    if p.get('mesh') not in ('cylinder','tube','sphere') and thin_side:
        if tag=='magazine' and height>.014 and depth>.025:return ([],[])
        if not tag and max(p.get('color',(1,1,1)))<.085 and height>.008 and depth>.014:return ([],[])
    if p.get('mesh')=='sphere':return base['sphere']
    if p.get('mesh')=='tube':return base['tube']
    if p.get('mesh')=='cylinder' and not role:return base['cylinder']
    if not role:return None
    cache_key=(role,identity if role in ('receiver','handguard','stock','magazine') else kind,wood,
               round(width,5),round(height,5),round(depth,5),round(p.get('z',0),4),round(p.get('y',0),4))
    if cache_key in _component_cache:return _component_cache[cache_key]
    cuts=[];radius=.0012;segments=2
    if role=='receiver':
        # Purposeful shell construction replaces the same octagonal wedge on
        # every gun. Forgings have a raised spine, stepped shoulder and fuller
        # lower body; rolled-sheet and cylindrical actions keep their own mass.
        stamped=kind=='LMG' or (kind=='RIFLE' and identity==1)
        if kind in ('SHOTGUN','SNIPER'):
            perimeter=tuple((math.cos(a),max(-.81,math.sin(a))) for a in [math.tau*i/16 for i in range(16)])
            rings=[(-.5,.39,.45,0),(-.43,.49,.49,0),(-.25,.49,.49,0),(.30,.49,.49,0),(.43,.455,.47,0),(.5,.37,.43,0)]
        elif stamped:
            perimeter=((-1,-.74),(-.74,-1),(.74,-1),(1,-.74),(1,.70),(.82,.94),(.57,1),(-.57,1),(-.82,.94),(-1,.70))
            rings=[(-.5,.39,.45,0),(-.46,.49,.49,0),(-.32,.49,.50,0),(.33,.49,.50,0),(.45,.46,.49,0),(.5,.405,.455,0)]
        elif kind=='SMG':
            perimeter=((-1,-.62),(-.74,-1),(.74,-1),(1,-.62),(1,.36),(.82,.82),(.45,1),(-.45,1),(-.82,.82),(-1,.36))
            rings=[(-.5,.36,.40,0),(-.42,.475,.49,0),(-.25,.475,.50,0),(.26,.475,.50,0),(.40,.43,.48,0),(.5,.33,.40,0)]
        else:
            perimeter=((-.67,-.94),(.67,-.94),(.98,-.57),(.98,.15),(.87,.31),(.87,.70),(.54,1),(-.54,1),(-.87,.70),(-.87,.31),(-.98,.15),(-.98,-.57))
            rings=[(-.5,.39,.455,0),(-.435,.49,.49,0),(-.29,.50,.50,0),(.255,.50,.50,0),(.385,.47,.49,0),(.5,.395,.44,0)]
        geometry=_section_profile(rings,perimeter)
        # Right ejection recess and opposite bolt release seat remain behind
        # the independently animated bolt already present in the game rig.
        cuts=[((.491,.14,-.09),(.16,.29,.34)),((-.491,-.075,.22),(.10,.17,.13))]
        if kind in ('RIFLE','LMG','MARKSMAN'):cuts.append(((0,.48,-.09),(.27,.07,.65)))
        # Broad shallow machining is actual inset metal, not painted rectangles
        # or a forest of attached screws. A land remains under the moving bolt.
        cuts.extend((((-.494,-.15,-.065),(.105,.27,.66)),
                     ((.494,-.275,.055),(.080,.15,.62))))
        radius=.00105
    elif role=='lower_receiver':
        # The rear grip heel, undercut and flared forward magazine well form a
        # single lower shell instead of a rectangular slab beneath the upper.
        outline=[(.49,-.5),(.49,.5),(.27,.5),(.10,.38),(-.34,.31),(-.47,.18),(-.47,-.19),(-.32,-.29),(-.32,-.43),(-.10,-.5)]
        geometry=_extrude_outline(outline,(-.47,.47))
        cuts=[((0,-.45,.065),(.66,.25,.28))]+[((sign*.476,-.035,-.075),(.090,.31,.61)) for sign in (-1,1)]
        radius=.0009
    elif role=='handguard':
        geometry=_chamfer_profile([(-.5,.395,.38,0),(-.465,.47,.46,0),(-.38,.49,.49,0),(.38,.49,.49,0),(.46,.465,.46,0),(.5,.40,.37,0)])
        if not wood:
            # Hollow front mouth reveals real wall thickness and the existing
            # barrel inside. Staggered slots go completely through the sides.
            cuts.append(((0,0,-.12),(.69,.61,.88)))
            slot_count=min(5,max(3,int(depth/.056)))
            for row in (0,1):
                for i in range(slot_count):
                    z=-.36+i*.72/(slot_count-1)+(row*.017 if i<slot_count-1 else 0)
                    cuts.append(((0,-.17+row*.33,z),(1.10,.11,.085 if slot_count>3 else .105)))
            radius=.0008;segments=1
        else:
            # Carved wood has a rounded belly, rear hand stop and shallow
            # longitudinal relief rather than an industrial perforated cage.
            cuts=[((sign*.48,-.05,0),(.055,.25,.76)) for sign in (-1,1)]
            radius=.0018
    elif role=='slide':
        geometry=_chamfer_profile([(-.5,.365,.36,-.02),(-.45,.48,.49,0),(.37,.48,.49,0),(.5,.39,.37,0)])
        cuts=[((.49,.18,-.07),(.13,.36,.27))]
        for side in (-1,1):
            for i in range(5):cuts.append(((side*.484,-.02,.13+i*.058),(.058,.64,.022)))
        radius=.00065;segments=1
    elif role=='magazine':
        # The source curved magazine comprises two overlapping sections. Their
        # mating faces must keep the full stamped width, rather than giving
        # each half a tapered collar which reads as a detached second magazine.
        rings=[(-.5,.495,.495,0),(-.40,.495,.495,0),(-.12,.495,.495,0),(.32,.495,.495,0),(.5,.495,.495,0)]
        source=(weapon or {}).get('parts',[])
        magazines=[q for q in source if q.get('tag')=='magazine' and q.get('mesh') not in ('cylinder','tube') and q['h']>.055 and q['w']>.035 and q['d']>.04]
        upper=max(magazines,key=lambda q:q['y']+q['h']*.5,default=None)
        if upper is p:
            supports=[q for q in source if not q.get('tag') and abs(q['x'])<.02 and q['d']>.13 and q['h']>.03 and q['y']>-.06 and q['z']-q['d']*.5<=p['z']<=q['z']+q['d']*.5]
            if supports:
                bottom=min(q['y']-q['h']*.5 for q in supports)
                feed_top=max(.5,(bottom+.004-p['y'])/height)
                if feed_top>.51:
                    # Insert the existing upper section into the lower receiver;
                    # its anchor and reload travel remain exactly unchanged.
                    rings.extend(((max(.505,feed_top-.025),.475,.475,0),(feed_top,.465,.475,0)))
        geometry=_chamfer_profile(rings,axis=1)
        for side in (-1,1):
            for z in (-.24,0,.24):cuts.append(((side*.491,-.065,z),(.052,.62,.08)))
        radius=.0006;segments=1
    elif role=='grip':
        # Palm swell, beavertail shoulder, finger rake and heel. The original
        # attachment pitch retains each weapon's particular ergonomic angle.
        geometry=_profile([(-.5,.34,.40,0,.045),(-.43,.44,.45,0,.015),(-.23,.48,.48,0,0),(.02,.45,.475,0,0),(.25,.40,.43,0,-.015),(.41,.37,.395,0,-.035),(.5,.33,.37,0,-.07)],16)
        if not wood:
            for y in (-.31,-.10,.11):cuts.append(((0,y,-.49),(.69,.055,.066)))
        radius=.00065;segments=1
    elif role=='stock':
        # Narrow forward collar, swept cheek comb and a full-height butt now
        # produce an ergonomic silhouette. The rear envelope and source pitch
        # stay fixed, so the existing butt pad and buffer contacts still join.
        if wood:
            perimeter=tuple((math.cos(a),math.sin(a)) for a in [math.tau*i/16 for i in range(16)])
            rings=[(-.5,.31,.28,.14),(-.34,.375,.34,.11),(-.10,.46,.43,.04),(.22,.485,.485,0),(.44,.45,.46,-.01),(.5,.405,.425,-.01)]
        else:
            perimeter=((-1,-.67),(-.69,-1),(.69,-1),(1,-.67),(1,.55),(.66,1),(-.66,1),(-1,.55))
            rings=[(-.5,.28,.285,.15),(-.34,.33,.30,.17),(-.12,.45,.39,.095),(.18,.49,.49,0),(.42,.46,.49,0),(.5,.405,.425,-.01)]
        geometry=_section_profile(rings,perimeter)
        if not wood and depth>.12 and height>=.070:
            cuts=[((0,-.155,-.055),(1.1,.31,.38))]
        for side in (-1,1):cuts.append(((side*.483,.15,.16),(.11,.25,.38)))
        radius=.0012
    elif role in ('barrel','pump','drum'):
        sides=24 if role=='drum' else 20
        if role=='barrel':rings=[(-.5,.42,.42,0,0),(-.47,.47,.47,0,0),(-.40,.465,.465,0,0),(.39,.465,.465,0,0),(.44,.50,.50,0,0),(.49,.50,.50,0,0),(.5,.42,.42,0,0)]
        else:rings=[(-.5,.36,.36,0,0),(-.44,.46,.46,0,0),(-.31,.5,.5,0,0),(.31,.5,.5,0,0),(.44,.46,.46,0,0),(.5,.36,.36,0,0)]
        geometry=_profile(rings,sides);radius=.00045;segments=1
    else:
        geometry=_extrude_outline([(-.43,.5),(-.50,.26),(-.43,-.35),(-.12,-.5),(.05,-.37),(.16,.1),(.35,.33),(.33,.5)],(-.10,.10))
        radius=.0002;segments=1
    result=_machining(geometry,p,cuts,radius,segments)
    _component_cache[cache_key]=result
    return result


def weapon_finish(p,geometry,weapon=None):
    """Put finish boundaries on real machined faces, not interpolated noise.

    The broad inset panels, cut walls and sub-millimetre bevel ribbons have
    distinct physical response. Split only vertices shared across that material
    boundary so a bright edge cannot interpolate over the entire receiver.
    Triangle count and animation envelopes remain unchanged.
    """
    vertices,triangles=geometry;role=_weapon_role(p,weapon)
    coated=p.get('metal',0)>.45 and max(p.get('color',(1,1,1)))<.21
    rough=p.get('rough',.6);metal=.24 if coated else p.get('metal',0)
    if role not in ('receiver','lower_receiver','handguard','slide','magazine','stock','grip'):
        return vertices,triangles,[(1,1,1)]*len(vertices),[(rough,metal)]*len(vertices)
    wood=p.get('tile')==10
    dimensions=Vector((p['w'],p['h'],p['d']))
    palette={
        'shell':((1,1,1),(rough,metal)),
        'panel':((.79,.81,.82),(min(1,rough+.075),metal)),
        'cavity':((.66,.68,.69),(min(1,rough+.06),metal)),
        'spine':((.94,.96,.98),(max(.1,rough-.035),metal)),
        'rim':((1.25,1.27,1.29),(max(.1,rough-.095),min(1,metal+.23 if coated else metal))),
    }
    remap={};out_v=[];out_t=[];colours=[];physical=[]
    for tri in triangles:
        q=[vertices[i] for i in tri]
        real=[Vector(tuple(v[i]*dimensions[i] for i in range(3))) for v in q]
        cross=(real[1]-real[0]).cross(real[2]-real[0])
        normal=cross.normalized() if cross.length_squared>1e-20 else Vector((1,0,0))
        centre=(q[0]+q[1]+q[2])/3
        longest=max((real[1]-real[0]).length,(real[2]-real[1]).length,(real[0]-real[2]).length,1e-8)
        altitude=cross.length/longest
        category='shell'
        side=abs(normal.x)>.965
        if role=='receiver':
            if side and .39<abs(centre.x)<.466 and -.305<centre.y<-.008 and -.41<centre.z<.40:category='panel'
            elif side and abs(centre.x)<.43 and .0<centre.y<.31 and -.29<centre.z<.13:category='cavity'
            elif centre.y>.355:category='spine'
        elif role=='lower_receiver':
            if side and .38<abs(centre.x)<.452 and -.22<centre.y<.15 and -.41<centre.z<.30:category='panel'
            elif centre.y<-.31 and abs(centre.x)<.36 and -.13<centre.z<.24:category='cavity'
        elif role=='stock':
            if side and .38<abs(centre.x)<.45 and .015<centre.y<.31 and -.045<centre.z<.36:category='panel'
            elif abs(centre.x)<.40 and -.34<centre.y<.025 and -.27<centre.z<.17:category='cavity'
            elif centre.y>.31:category='spine'
        elif role=='handguard':
            if not wood and abs(centre.x)<.365 and abs(centre.y)<.325:category='cavity'
        elif role=='magazine':
            if side and .43<abs(centre.x)<.479:category='panel'
        elif role=='slide':
            if side and abs(centre.x)<.475:category='panel'
            if side and abs(centre.x)<.44 and centre.z<.10:category='cavity'
        elif role=='grip' and not wood:
            if abs(normal.z)>.94 and centre.z<-.45:category='panel'
        # Genuine narrow bevel facets receive restrained rubbed finish. Broad
        # sloping shoulders stay coated; this is not an outline over the gun.
        if not wood and p.get('metal',0)>.45 and max(abs(v) for v in normal)<.975 and altitude<.0018:
            category='rim'
        colour,rm=palette[category]
        if wood and category in ('panel','cavity'):
            colour=(.91,.89,.85);rm=(min(1,rough+.025),0)
        mapped=[]
        for index in tri:
            key=(index,category)
            if key not in remap:
                remap[key]=len(out_v);out_v.append(vertices[index]);colours.append(colour);physical.append(rm)
            mapped.append(remap[key])
        out_t.append(tuple(mapped))
    return out_v,out_t,colours,physical


def author_heroes(api):
    """Editable operator/hand/optic masters with silhouette-preserving LODs."""
    B=api['BASE'];lathe=api['lathe'];sphere=api['sphere'];register=api['register']
    object_mesh=api['object_mesh'];assemble=api['assemble']
    white=(1,1,1);fabric=(.79,.81,.74);dark=(.35,.38,.32);edge=(.65,.68,.59)
    def model(name,items,far=None,smooth=False):
        for level,pieces in (('near',items),('far',far or items)):
            v,t,c=assemble([p[:4] for p in pieces]);physical=[]
            for p in pieces:physical.extend([p[4] if len(p)>4 else (.88,0)]*len(p[0][0]))
            obj=object_mesh(name+'__'+level,v,t,c,physical=physical)
            if smooth:
                for polygon in obj.data.polygons:polygon.use_smooth=True
            # Area-weighted manufactured normals flatten broad cloth panels and
            # knuckles. Organic surfaces retain their continuous smooth normals;
            # only hard manufactured masters receive the face weighting modifier.
            if not smooth:
                normals=obj.modifiers.new('Hero machined normals','WEIGHTED_NORMAL');normals.keep_sharp=True
    def soft(pos,size,color=white,rm=(.94,0)):
        return B['soft'],pos,size,color,rm
    def strip(pos,size,color=edge,rm=(.86,.03)):
        return B['box'],pos,size,color,rm
    def rounded(pos,size,color=white,rm=(.90,0)):
        return sphere(12,6),pos,size,color,rm
    def front_plate(outline,sections):
        # Convex X/Y contours give kneepads and goggles a shaped front without
        # the old sphere or a rectangular visor. Z sections crown the surface.
        vertices=[];triangles=[];count=len(outline)
        for z,scale in sections:
            vertices.extend(Vector((x*scale,y*scale,z)) for x,y in outline)
        for row in range(len(sections)-1):
            for i in range(count):
                a=row*count+i;b=row*count+(i+1)%count
                triangles.extend(((a,b,b+count),(a,b+count,a+count)))
        for row,front in ((0,True),(len(sections)-1,False)):
            centre=len(vertices);vertices.append(Vector((0,0,sections[row][0])))
            for i in range(count):
                a=row*count+i;b=row*count+(i+1)%count
                triangles.append((centre,b,a) if front else (centre,a,b))
        return vertices,triangles
    def seam(start,end,r=.006,color=dark):
        a,b=Vector(start),Vector(end);direction=b-a
        rotation=Vector((0,1,0)).rotation_difference(direction.normalized())
        # A stitched cord is a few pixels across in gameplay. Eight radial
        # sides retain that silhouette with one quarter of the former geometry.
        cord=lathe([(-.5,.5,.5),(.5,.5,.5)],8)
        g=([rotation@Vector((q.x*r,q.y*direction.length,q.z*r))+(a+b)*.5 for q in cord[0]],cord[1])
        return g,(0,0,0),(1,1,1),color,(.96,0)

    def cuff_shell(rings,sides=24):
        # Sewn oval cuff with a real open mouth and rolled outer lip. Keeping
        # inner/outer surfaces connected avoids a flat slab across the wrist.
        v=[];t=[];count=len(rings)
        for inner in (False,True):
            for y,rx,rz in rings:
                for i in range(sides):
                    a=math.tau*i/sides
                    v.append(Vector((math.cos(a)*rx*(.85 if inner else 1),y,math.sin(a)*rz*(.84 if inner else 1))))
        for inner in (False,True):
            offset=count*sides if inner else 0
            for row in range(count-1):
                for i in range(sides):
                    a=offset+row*sides+i;b=offset+row*sides+(i+1)%sides
                    faces=((a,a+sides,b+sides),(a,b+sides,b))
                    t.extend(tuple(reversed(face)) if inner else face for face in faces)
        for row,reverse in ((0,True),(count-1,False)):
            for i in range(sides):
                a=row*sides+i;b=row*sides+(i+1)%sides;ai=a+count*sides;bi=b+count*sides
                faces=((a,ai,bi),(a,bi,b))
                t.extend(tuple(reversed(face)) if reverse else face for face in faces)
        return v,t

    def cloth(rings,sides=24,wrinkle=.025,centre=-.24,frequency=34):
        v,t=lathe(rings,sides)
        for q in v:
            angle=math.atan2(q.z,q.x)
            compression=math.exp(-((q.y-centre)*5.6)**2)+.40*math.exp(-((q.y-.40)*9)**2)
            crease=math.sin(q.y*frequency+math.sin(angle*2)*1.7)+.28*math.sin(q.y*67-angle*3)
            radial=1+wrinkle*crease*compression
            q.x*=radial;q.z*=radial
            # Compression creases run around the joint, while a shallow sewn
            # seam follows the outer arm/leg rather than random surface noise.
            q.x*=1-.013*math.exp(-((angle-.1)*9)**2)
        return v,t
    limb_rings=[(-.5,.325,.335),(-.44,.36,.36),(-.34,.425,.415),(-.23,.45,.43),(-.10,.47,.445),(.08,.49,.45),(.22,.47,.43),(.35,.435,.405),(.44,.405,.385),(.5,.365,.35)]
    near=cloth(limb_rings,24,.063);far=cloth([limb_rings[i] for i in (0,2,4,6,8,9)],12,.023)
    register('limb',near,far,True)
    # Each anatomical segment has its own mass distribution. The shoulder,
    # biceps, calf and ankle no longer share the same capsule, and compression
    # folds collect at the actual elbow/knee rather than along the whole limb.
    anatomy={
        'thigh':[(-.54,.39,.405),(-.43,.40,.405),(-.28,.435,.43),(-.10,.475,.47),(.10,.50,.49),(.28,.51,.49),(.42,.48,.46),(.54,.43,.405)],
        'shin':[(-.54,.30,.34),(-.40,.32,.36),(-.25,.355,.41),(-.08,.43,.47),(.13,.485,.49),(.29,.48,.47),(.41,.435,.415),(.54,.405,.405)],
        'upperarm':[(-.55,.39,.405),(-.39,.385,.405),(-.23,.42,.445),(-.05,.475,.48),(.14,.515,.495),(.30,.515,.48),(.43,.495,.46),(.55,.48,.45)],
        'forearm':[(-.54,.285,.315),(-.43,.31,.34),(-.31,.35,.38),(-.13,.415,.43),(.05,.48,.46),(.21,.5,.48),(.38,.465,.445),(.55,.42,.425)]
    }
    for name,rings in anatomy.items():
        surface=cloth(rings,24,.055,-.35 if name in ('thigh','upperarm') else .36)
        far=cloth([rings[i] for i in (0,2,4,6,7)],10,.018)
        pieces=[(surface,(0,0,0),(1,1,1),white,(.96,0))]
        if name=='forearm':
            cuff=lathe([(-.55,.285,.315),(-.49,.33,.355),(-.41,.33,.355),(-.365,.305,.33)],16)
            pieces.append((cuff,(0,0,0),(1,1,1),dark,(.90,0)))
            pieces.append(rounded((.12,-.445,-.295),(.31,.060,.044),edge))
        if name=='thigh':
            for side in (-1,1):
                pieces.append(soft((side*.445,.035,.025),(.135,.375,.56),fabric))
                pieces.append(soft((side*.47,.205,.015),(.15,.085,.58),edge))
                pieces.append(seam((side*.518,-.125,-.225),(side*.518,.14,-.225),.006))
                pieces.append(seam((side*.518,-.125,.27),(side*.518,.14,.27),.006))
        if name=='shin':
            cuff=lathe([(-.55,.31,.345),(-.48,.34,.38),(-.41,.34,.38),(-.37,.315,.355)],16)
            pieces.append((cuff,(0,0,0),(1,1,1),fabric,(.97,0)))
        for side in (-1,1):
            pieces.append(seam((side*.40,-.34,.18),(side*.465,.30,.19),.0055,edge))
        model(name,pieces,[(far,(0,0,0),(1,1,1),white,(.96,0))]+pieces[1:2],True)
    torso_rings=[(-.535,.385,.36),(-.42,.39,.41),(-.28,.40,.44),(-.11,.455,.47),(.06,.49,.455),(.22,.515,.43),(.35,.475,.385),(.45,.38,.30),(.54,.265,.245)]
    torso=[(cloth(torso_rings,28,.047,-.35),(0,0,0),(1,1,1),white,(.97,0))]
    collar=lathe([(.395,.245,.245),(.48,.29,.285),(.535,.27,.26),(.565,.24,.235)],20)
    torso.append((collar,(0,0,0),(1,1,1),fabric,(.96,0)))
    model('torso',torso,[(lathe([torso_rings[i] for i in (0,2,4,6,8)],12),(0,0,0),(1,1,1),white,(.97,0))]+torso[1:],True)

    # Leather ankle, swept toe box and separate heel follow the unchanged foot
    # rig; the former stack of bevelled blocks made every boot a square plinth.
    sole=_chamfer_profile([(-.52,.24,.055,-.415),(-.46,.40,.067,-.418),(-.26,.47,.068,-.42),(.08,.43,.065,-.42),(.32,.36,.073,-.407),(.47,.285,.071,-.398)])
    vamp=_chamfer_profile([(-.51,.21,.04,-.23),(-.44,.375,.09,-.235),(-.25,.43,.125,-.21),(-.02,.43,.15,-.18),(.20,.35,.17,-.155),(.40,.28,.13,-.16),(.47,.20,.055,-.21)])
    ankle=cloth([(-.31,.35,.31),(-.18,.365,.325),(.01,.32,.285),(.20,.305,.255),(.40,.295,.245),(.54,.285,.235)],24,.025,-.10)
    boots=[(sole,(0,0,0),(1,1,1),dark,(.96,0)),(vamp,(0,0,0),(1,1,1),white,(.89,0)),(ankle,(0,0,.145),(1,1,1),fabric,(.94,0))]
    for y,z in ((-.065,-.205),(.025,-.155),(.115,-.115),(.205,-.095)):
        boots.append(seam((-.19,y,z),(.19,y+.027,z-.012),.014,dark))
        for side in (-1,1):boots.append(soft((side*.235,y,z),(.045,.052,.047),edge,(.71,.05)))
    for side in (-1,1):boots.append(seam((side*.34,-.21,-.27),(side*.30,.40,.13),.008,edge))
    for z in (-.36,-.18,.0,.19,.36):boots.append(strip((0,-.486,z),(.72,.025,.055),edge,(.96,0)))
    model('boot',boots,boots[:3],True)

    pad_outline=[(-.28,.49),(-.46,.27),(-.445,-.18),(-.29,-.47),(.29,-.47),(.445,-.18),(.46,.27),(.28,.49)]
    pads=[(front_plate(pad_outline,[(-.49,.78),(-.39,.98),(.21,1),(.42,.88)]),(0,0,0),(1,1,1),dark,(.84,.015))]
    pads.append(soft((0,0,.48),(.94,1.10,.45),white,(.98,0)))
    for y in (-.29,.29):
        pads.append(strip((0,y,.40),(1.06,.11,.15),fabric,(.97,0)))
        pads.append(seam((-.30,y,-.415),(.30,y,-.415),.009,edge))
    model('kneepad',pads,pads[:2],True)
    # Asymmetric flattened metacarpals, a continuous thenar swell and crowned
    # sewn knuckle pads replace the sphere plus squared plates. These profiles
    # stay inside the original palm/finger contact envelopes and moving groups.
    palm_rings=[(-.5,.27,.245,.045,.035),(-.42,.35,.28,.035,.028),
                (-.27,.43,.305,.012,.015),(-.05,.47,.32,-.012,0),
                (.15,.48,.31,-.020,-.015),(.29,.435,.28,-.035,-.03),
                (.43,.35,.245,-.045,-.038),(.5,.26,.20,-.04,-.035)]
    palm=_profile(palm_rings,24)
    p=[(palm,(0,0,.035),(1,1,1),white,(.94,0))]
    for x,y in ((-.31,.16),(-.105,.23),(.105,.22),(.295,.13)):
        p.append(rounded((x,y,-.28),(.185,.245,.085),edge,(.79,0)))
        p.append(seam((x-.070,y-.1,-.310),(x+.070,y-.1,-.310),.0055))
    thenar=_profile([(-.5,.24,.24,.03,.04),(-.32,.44,.39,.025,0),
                     (-.03,.49,.43,0,0),(.26,.38,.34,-.035,-.025),(.5,.15,.14,-.05,-.04)],16)
    p.append((thenar,(.265,-.175,.10),(.39,.49,.42),fabric,(.91,0)))
    p.append(rounded((0,-.405,-.205),(.47,.065,.095),dark,(.86,0)))
    p.append(seam((-.32,-.28,-.255),(-.375,.25,-.24),.007))
    p.append(seam((.33,-.28,-.24),(.37,.23,-.235),.007))
    model('palm',p,p[:1]+p[-4:-3],True)
    fingers=_profile([(-.5,.22,.22,0,.075),(-.43,.34,.28,-.012,.035),
                      (-.27,.40,.33,-.012,-.045),(-.05,.445,.355,.008,-.09),
                      (.16,.42,.36,.01,-.048),(.35,.34,.28,0,.018),
                      (.46,.25,.21,0,.03),(.5,.15,.145,0,.028)],14)
    f=[(fingers,(0,0,0),(1,1,1),white,(.89,0)),
       rounded((0,-.045,-.38),(.58,.30,.085),fabric,(.94,0))]
    for y in (-.18,.19):f.append(seam((-.23,y,-.34),(.23,y,-.34),.012,dark))
    model('finger',f,f[:1],True)
    thumb=_profile([(-.5,.20,.22,.045,.06),(-.38,.34,.34,.035,.005),
                    (-.17,.43,.39,.015,-.065),(.08,.435,.36,-.025,-.065),
                    (.28,.35,.285,-.06,-.03),(.44,.23,.19,-.07,.015),
                    (.5,.135,.13,-.07,.025)],16)
    thumbs=[(thumb,(0,0,0),(1,1,1),white,(.92,0)),
            rounded((-.025,.05,-.34),(.59,.37,.075),edge,(.83,0))]
    model('thumb',thumbs,thumbs[:1],True)
    cuff=cuff_shell([(-.5,.385,.38),(-.405,.475,.46),(-.29,.49,.475),
                     (.29,.49,.475),(.43,.43,.425),(.5,.375,.37)],20)
    cuff_pieces=[(cuff,(0,0,0),(1,1,1),white,(.89,0)),
                 rounded((.11,.06,-.46),(.50,.52,.085),fabric,(.83,0))]
    model('cuff',cuff_pieces,cuff_pieces[:1],True)
    # The small original rubber back strap also receives a crowned surface;
    # broad sleeve cuffs use the open oval master above.
    model('glove_band',[rounded((0,0,0),(.98,.90,.98),white,(.86,0))],smooth=True)
    # Wrist cuff and authored cloth buckling replace a smooth elongated oval.
    sleeve_rings=[(-.5,.34,.335),(-.46,.355,.35),(-.40,.40,.385),(-.29,.445,.42),(-.17,.47,.455),(-.045,.495,.46),(.10,.49,.455),(.24,.47,.445),(.38,.445,.405),(.5,.40,.365)]
    sleeve=cloth(sleeve_rings,28,.052,-.33,25)
    rot=Matrix.Rotation(math.pi/2,3,'X')
    s=[(sleeve,(0,0,0),(1,1,1),white,(.97,0)),
       (lathe([(-.5,.365,.365),(-.47,.405,.405),(-.42,.405,.405),(-.385,.37,.37)],24),(0,0,0),(1,1,1),dark,(.90,0)),
       rounded((.27,-.43,-.285),(.29,.065,.065),edge)]
    s.append(seam((-.40,-.28,-.20),(-.385,.43,-.19),.006))
    s.append(seam((.395,-.25,.17),(.395,.44,.14),.006))
    rotated=[(([rot@v for v in q[0][0]],q[0][1]),rot@Vector(q[1]),(q[2][0],q[2][2],q[2][1]),q[3],q[4]) for q in s]
    model('sleeve_z',rotated,rotated[:2],True)
    # The support-hand source envelope reaches the wrist at positive Y. The
    # actor forearm master reaches it at negative Y; using that actor master
    # here put the cuff at the elbow and made the wrist the widest arm section.
    # Reverse the authored sleeve only, retaining the exact source transform.
    mirrored=[(([Vector((v.x,-v.y,v.z)) for v in q[0][0]],
                 [tuple(reversed(t)) for t in q[0][1]]),
                Vector((q[1][0],-q[1][1],q[1][2])),q[2],q[3],q[4]) for q in s]
    model('sleeve_y',mirrored,mirrored[:2],True)
    # The actor hand envelope contains a complete posed mitten silhouette.
    g=[(palm,(0,.01,.03),(.83,.87,.77),white,(.94,0))]
    for i,x in enumerate((-.30,-.10,.10,.29)):
        g.append((fingers,(x,-.29,-.13),(.20,.45,.31),edge,(.92,0)))
        g.append(rounded((x,.07,-.31),(.17,.18,.07),dark))
    g.append((thumb,(.365,-.08,-.12),(.23,.49,.26),edge,(.91,0)))
    model('glove',g,g[:1]+g[-1:],True)

    # Armour cut follows clavicles and ribs, with shoulder straps, layered
    # plate pockets and stitched pouches, rather than a single soft cube.
    vest_outline=[(-.42,-.34),(-.50,-.23),(-.50,.28),(-.35,.45),(-.17,.48),(.17,.48),(.35,.45),(.50,.28),(.50,-.23),(.42,-.34)]
    # Outline above is X/Y; use Y-axis extrusion then rotate into a breastplate.
    vest_blank=_extrude_outline([(x,y) for x,y in vest_outline],(-.32,.30),axis=1)
    r=Matrix.Rotation(-math.pi/2,3,'X');vest_blank=([r@q for q in vest_blank[0]],vest_blank[1])
    v=[(vest_blank,(0,0,.09),(.91,.94,.90),white,(.93,0))]
    v.append(soft((0,.08,-.315),(.77,.70,.18),fabric))
    for side in (-1,1):
        v.append(soft((side*.32,.38,-.05),(.135,.25,.38),edge))
        v.append(strip((side*.33,.39,-.24),(.15,.11,.045),dark,(.65,.08)))
        v.append(soft((side*.405,-.07,.005),(.115,.43,.62),fabric))
    for x in (-.285,0,.285):
        v.append(soft((x,-.255,-.385),(.26,.345,.20),white))
        v.append(strip((x,-.13,-.486),(.235,.032,.018),dark))
        v.append(seam((x-.11,-.405,-.482),(x+.11,-.405,-.482),.005))
    for y in (.275,.17,.065):
        for x in (-.24,0,.24):v.append(strip((x,y,-.407),(.207,.022,.015),edge))
    v.append(strip((0,.365,-.414),(.275,.065,.014),dark))
    model('vest',v,v[:2]+v[8:14],True)

    # Cranial/mandible volume is an anatomical closed surface. Balaclava and
    # goggles in the established body rig still provide faction readability.
    head=lathe([(-.5,.18,.22),(-.43,.255,.30),(-.31,.33,.375),(-.17,.375,.415),(-.025,.415,.435),(.13,.42,.42),(.29,.395,.365),(.43,.295,.28),(.5,.14,.13)],28)
    h=[(head,(0,0,.03),(.94,1,.94),white,(.76,0))]
    h.append(soft((0,-.09,-.376),(.105,.235,.135),(.96,.89,.79),(.71,0)))
    h.append(soft((0,-.32,-.292),(.34,.17,.13),white,(.80,0)))
    for side in (-1,1):h.append((sphere(12,8),(side*.405,-.035,.02),(.11,.255,.16),(.92,.85,.73),(.78,0)))
    model('head',h,h[:3],True)

    # The lower-face rig slot becomes sewn fabric around the jaw and neck.
    # Its local offset wraps behind the face while retaining the original slot.
    mask=cloth([(-.60,.285,.33),(-.43,.31,.355),(-.25,.365,.39),(-.02,.435,.43),(.20,.48,.455),(.40,.48,.43),(.56,.445,.395)],28,.027,-.35)
    masks=[(mask,(0,0,.34),(1,1,1),white,(.98,0))]
    masks.append(seam((-.34,-.28,.01),(-.39,.29,-.015),.006,edge))
    masks.append(seam((.34,-.28,.01),(.39,.29,-.015),.006,edge))
    for y in (-.10,.02,.14):masks.append(strip((0,y,-.10),(.24,.014,.012),dark,(.99,0)))
    model('balaclava',masks,masks[:1],True)

    # Two smoked lenses, a nose bridge and straps read as goggles at combat
    # distance. They replace the broad blue reflective rectangle over the face.
    lens_outline=[(-.46,-.18),(-.30,-.38),(.20,-.41),(.40,-.30),(.46,.18),(.29,.43),(-.30,.43),(-.46,.23)]
    frame=front_plate(lens_outline,[(-.48,.86),(-.36,1),(.31,1),(.52,.92)])
    lens=front_plate(lens_outline,[(-.535,.80),(-.505,.84),(-.40,.84)])
    goggles=[]
    for side in (-1,1):
        goggles.append((frame,(side*.245,0,0),(.465,.94,1),edge,(.79,0)))
        goggles.append((lens,(side*.245,0,0),(.465,.94,1),(.24,.29,.245),(.27,.025)))
        goggles.append(soft((side*.37,0,1.16),(.085,.31,2.05),dark,(.95,0)))
        goggles.append(strip((side*.454,-.015,.01),(.035,.24,.035),dark,(.96,0)))
    goggles.append(soft((0,-.04,-.015),(.085,.22,.32),edge,(.87,0)))
    model('goggles',goggles,goggles[:2]+goggles[4:6]+goggles[-1:],True)

    helmet=lathe([(-.5,.445,.46),(-.41,.485,.49),(-.24,.5,.5),(-.06,.48,.47),(.13,.41,.40),(.31,.29,.28),(.44,.14,.13),(.5,.015,.015)],32)
    hp=[(helmet,(0,0,0),(1,1,1),white,(.83,.04))]
    for side in (-1,1):
        hp.append(soft((side*.415,-.275,.035),(.14,.17,.41),dark,(.63,.09)))
        for z in (-.11,.025,.16):hp.append(strip((side*.484,-.26,z),(.026,.045,.049),edge,(.53,.24)))
        hp.append(soft((side*.32,.03,.03),(.17,.18,.32),fabric))
    hp.append(strip((0,-.28,-.46),(.215,.23,.05),edge,(.51,.48)))
    hp.append(strip((0,-.26,-.49),(.115,.11,.025),dark,(.44,.57)))
    model('helmet',hp,hp[:1]+hp[-2:],True)

    # Open optical housing. Coordinates are transverse X/Z, extruded along Y;
    # runtime rotates it around X exactly like the existing tube optic.
    outer=[(-.5,.50),(-.5,-.25),(-.38,-.47),(-.22,-.5),(.22,-.5),(.38,-.47),(.5,-.25),(.5,.50)]
    inner=[(-.37,.32),(-.37,-.20),(-.28,-.34),(-.17,-.36),(.17,-.36),(.28,-.34),(.37,-.20),(.37,.32)]
    vertices=[];faces=[]
    for y,contour in ((-.5,outer),(.5,outer),(-.5,inner),(.5,inner)):
        vertices.extend(Vector((x,y,z)) for x,z in contour)
    for i in range(8):
        j=(i+1)%8
        for a,b,c,d in ((i,j,j+8,i+8),(i+16,i+24,j+24,j+16),(i,j,j+16,i+16),(i+8,i+24,j+24,j+8)):
            faces.extend(((a,b,c),(a,c,d)))
    dummy={'w':.096,'h':.034,'d':.084}
    hood=_machining((vertices,faces),dummy,(),.0007,2)
    model('optic_hood',[(hood,(0,0,0),(1,1,1),white,(.38,.25))])
    return ['kneepad','balaclava','goggles']
