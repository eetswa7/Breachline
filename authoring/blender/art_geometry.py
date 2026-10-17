"""Original manufactured, architectural and organic assets authored in Blender."""
import bpy
import math
from mathutils import Vector, Matrix


def rectangular_profile(rings):
    """Chamfered, tapered cross sections. Ring tuples are (Y, half X, half Z)."""
    verts=[];tris=[]
    for y,rx,rz in rings:
        for x,z in ((-.72,-1),(.72,-1),(1,-.72),(1,.72),(.72,1),(-.72,1),(-1,.72),(-1,-.72)):
            verts.append(Vector((x*rx,y,z*rz)))
    for r in range(len(rings)-1):
        for i in range(8):
            a=r*8+i;b=r*8+(i+1)%8;c=b+8;d=a+8
            tris.extend(((a,d,c),(a,c,b)))
    for r,top in ((0,False),(len(rings)-1,True)):
        centre=len(verts);verts.append(Vector((0,rings[r][0],0)))
        for i in range(8):
            a=r*8+i;b=r*8+(i+1)%8;tris.append((centre,b,a) if top else (centre,a,b))
    return verts,tris


def hero_part(p, base, weapon=None):
    """Production hero forms retain the exported component and joint matrices."""
    from hero_models import weapon_component
    return weapon_component(p, base, weapon)


def machined_edges(p,geometry,segments=1):
    """Native bevels in metres, independent of the component's aspect ratio."""
    dims=Vector((p['w'],p['h'],p['d']));v,t=geometry
    mesh=bpy.data.meshes.new('Manufactured part / physical blank')
    mesh.from_pydata([tuple(q[i]*dims[i] for i in range(3)) for q in v],[],t);mesh.update()
    obj=bpy.data.objects.new('Manufactured part / edge machining',mesh)
    bpy.context.scene.collection.objects.link(obj)
    bevel=obj.modifiers.new('Physical edge radius','BEVEL')
    bevel.width=min(.0009,min(dims)*.045);bevel.segments=segments
    bevel.limit_method='ANGLE';bevel.angle_limit=.52;bevel.use_clamp_overlap=True
    evaluated=bpy.data.meshes.new_from_object(obj.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    evaluated.calc_loop_triangles()
    result=([Vector(tuple(q.co[i]/dims[i] for i in range(3))) for q in evaluated.vertices],
            [tuple(q.vertices) for q in evaluated.loop_triangles])
    bpy.data.meshes.remove(evaluated);bpy.data.objects.remove(obj,do_unlink=True)
    if mesh.users==0:bpy.data.meshes.remove(mesh)
    return result


def author_shared(api):
    B=api['BASE'];register=api['register'];assemble=api['assemble'];lathe=api['lathe'];sphere=api['sphere']
    object_mesh=api['object_mesh'];WHITE=(1,1,1);DARK=(.43,.43,.43);EDGE=(.82,.82,.82)
    def prop(name,pieces,far=None):
        for level,items in (('near',pieces),('far',far or pieces)):
            g=assemble([p[:4] for p in items]);rm=[]
            for p in items:rm.extend([p[4] if len(p)>4 else (.78,.05)]*len(p[0][0]))
            object_mesh(name+'__'+level,*g,physical=rm)
    def box(pos,scale,color=WHITE,rm=(.78,.05),soft=False):return (B['soft'] if soft else B['world'],pos,scale,color,rm)
    def cylinder(pos,scale,color=WHITE,rm=(.51,.65)):return (B['cylinder'],pos,scale,color,rm)

    # Detailed architecture keeps a conservative unit envelope for collision.
    barrier=[box((0,-.22,0),(1,.56,1)),box((0,.12,0),(.99,.25,.62)),box((0,.39,0),(.98,.23,.38))]
    for x in (-.36,.36):barrier.append(box((x,.405,0),(.065,.028,.34),DARK))
    prop('barrier_x',barrier,barrier[:3])
    rotated=[(g,(-p[2],p[1],p[0]),(s[2],s[1],s[0]),c,rm) for g,p,s,c,rm in barrier];prop('barrier_z',rotated,rotated[:3])
    wall=[box((0,0,0),(.986,.99,.982)),box((0,.48,0),(1,.035,1)),box((0,-.465,0),(1,.07,1),EDGE)]
    prop('wall',wall,wall[:1])
    column=[cylinder((0,0,0),(.74,.89,.74),WHITE,(.89,0)),box((0,-.455,0),(1,.09,1)),box((0,.455,0),(.96,.09,.96))]
    prop('column',column,column[:1])
    panel=[box((0,0,0),(.975,.975,.94)),box((0,0,-.482),(.91,.90,.035),EDGE)]
    for y in (-.31,-.15,.01,.17,.33):panel.append(box((0,y,-.493),(.84,.024,.012),DARK))
    prop('vent',panel,panel[:2])
    hvac=[box((0,-.02,0),(.96,.88,.95),(.55,.58,.56),(.72,.48)),box((0,.44,0),(1,.10,1),(.34,.37,.35),(.51,.65))]
    for x in (-.24,.24):
        hvac.append(cylinder((x,.505,0),(.38,.035,.38),(.12,.13,.12),(.63,.25)))
        for z in (-.25,-.125,0,.125,.25):hvac.append(box((x,.515,z),(.39,.018,.012),(.44,.47,.43),(.55,.7)))
    for z in (-.36,-.18,0,.18,.36):hvac.append(box((0,-.06,z),(.985,.028,.013),DARK))
    prop('hvac',hvac,hvac[:4])
    for style in ('urban','industrial','desert'):
        pieces=[box((0,0,0),(.996,.99,.996),WHITE,(.94,0)),box((0,-.48,0),(1,.04,1),(.61,.61,.59),(.93,0)),box((0,.482,0),(1,.035,1),(.9,.9,.86),(.87,0))]
        for side in (-1,1):
            for y in (-.30,-.04,.23):
                # Recessed dark glazing, reveals, lintels and thin balcony lips.
                for x in (-.31,0,.31):
                    pieces.append(box((x,y,side*.499),(.145,.125,.004),(.12,.18,.20),(.20,.04)))
                    pieces.append(box((x,y+.071,side*.498),(.176,.016,.022),EDGE,(.88,0)))
                    pieces.append(box((x,y-.073,side*.501),(.182,.016,.027),(.68,.67,.61),(.82,0)))
                    pieces.append(box((x,y,side*.504),(.008,.125,.009),(.33,.34,.31),(.65,.2)))
            pieces.append(box((side*.465,0,0),(.023,.95,1),EDGE,(.88,0)))
        if style=='industrial':
            for x in (-.40,-.20,0,.20,.40):pieces.append(box((x,0,-.502),(.009,.92,.011),(.53,.55,.54),(.70,.45)))
        else:
            pieces.append(box((0,-.395,-.500),(.14,.20,.014),(.19,.14,.075),(.83,0)))
            pieces.append(box((0,-.275,-.508),(.21,.018,.058),(.56,.49,.39),(.9,0)))
        prop('building_'+style,pieces,pieces[:3]+[p for p in pieces[3:] if p[1][1] in (-.30,-.04,.23) and p[2][0]>.1])

    # Purpose-built clutter reads as objects at human scale, not stacked cubes.
    pallet=[]
    for x in (-.38,0,.38):pallet.append(box((x,-.25,0),(.16,.42,.96),(.47,.34,.20),(.9,0)))
    for z in (-.42,-.21,0,.21,.42):pallet.append(box((0,.24,z),(1,.12,.14),(.62,.46,.28),(.86,0)))
    prop('pallet',pallet,pallet[:3]+pallet[3::2])
    sandbags=[]
    for row in range(3):
        for i in range(3 if row<2 else 2):
            x=-.32+i*.32+(row%2)*.08
            sandbags.append(box((x,-.34+row*.32,0),(.34,.31,.93),(.63,.55,.38),(.97,0),True))
    prop('sandbags',sandbags,sandbags[:3]+sandbags[3::2])
    case=[box((0,0,0),(.94,.94,.96),(.30,.34,.26),(.72,.03),True)]
    for x in (-.39,.39):case.append(box((x,0,0),(.085,1,1),(.15,.17,.13),(.77,.05)))
    for z in (-.485,.485):
        case.append(box((0,-.10,z),(.39,.14,.032),(.15,.16,.13),(.66,.15)))
        for x in (-.28,.28):case.append(box((x,.18,z),(.055,.13,.029),(.49,.51,.44),(.5,.7)))
    prop('equipment_case',case,case[:3])
    generator=[box((0,-.05,0),(.90,.82,.82),(.46,.48,.38),(.75,.1),True),box((0,-.445,0),(1,.11,1),(.16,.18,.16),(.64,.4))]
    for y in (-.25,-.08,.09,.26):generator.append(box((0,y,-.425),(.74,.025,.033),(.13,.15,.12),(.66,.2)))
    for x in (-.39,.39):generator.append(cylinder((x,.44,0),(.06,.17,.06),(.25,.27,.22),(.55,.7)))
    generator.append(box((.29,.10,-.436),(.10,.17,.032),(.11,.19,.18),(.25,0)))
    prop('generator',generator,generator[:2])
    binpieces=[box((0,-.01,0),(.86,.91,.83),(.20,.26,.23),(.8,.03),True),box((0,.46,0),(.96,.06,.94),(.12,.16,.14),(.76,0)),box((0,.30,-.443),(.57,.16,.024),(.09,.10,.08),(.91,0))]
    prop('street_bin',binpieces)
    # Derelict utility vehicle, with glass, arches, sills and treaded wheels.
    van=[box((0,-.11,0),(.87,.40,.97),(.37,.39,.34),(.67,.34),True),box((0,.215,-.025),(.78,.50,.73),(.47,.49,.43),(.7,.25),True),box((0,.14,-.415),(.75,.19,.15),(.25,.28,.25),(.60,.5))]
    van.extend([box((0,.24,-.398),(.70,.24,.018),(.11,.19,.22),(.19,0)),box((0,-.25,-.501),(.97,.10,.035),(.16,.18,.16),(.51,.65)),box((0,-.25,.491),(.97,.10,.035),(.18,.20,.17),(.56,.6))])
    wheel=sphere(16,8)
    for x in (-.46,.46):
        for z in (-.32,.32):
            van.append((wheel,(x,-.29,z),(.15,.36,.24),(.075,.085,.073),(.95,0)))
            van.append((B['sphere'],(x*1.07,-.29,z),(.026,.19,.15),(.38,.40,.35),(.43,.75)))
        van.append(box((x*.86,.255,-.06),(.016,.20,.52),(.12,.18,.19),(.22,0)))
        van.append(box((x*.91,-.08,-.06),(.011,.015,.42),(.27,.29,.25),(.51,.6)))
    for x in (-.27,.27):van.append(box((x,-.11,-.497),(.16,.085,.012),(.74,.72,.53),(.21,.03)))
    prop('utility_van',van,van[:6]+[p for p in van[6:] if p[0] is wheel])

    # Operators have shaped shoulders, cloth folds, boots, seams and equipment.
    register('torso',lathe([(-.5,.35,.34),(-.39,.38,.37),(-.17,.42,.43),(.03,.47,.47),(.23,.50,.43),(.38,.45,.37),(.5,.30,.27)],20,folds=.055),lathe([(-.5,.35,.34),(.16,.5,.46),(.5,.30,.27)],10),True)
    register('limb',lathe([(-.5,.33,.34),(-.45,.35,.36),(-.29,.47,.44),(-.12,.46,.48),(.04,.5,.46),(.23,.46,.43),(.39,.45,.41),(.5,.39,.36)],16,folds=.085),lathe([(-.5,.33,.34),(0,.5,.46),(.5,.39,.36)],8),True)
    boot=[box((0,.045,.02),(.78,.89,.57),WHITE,soft=True),box((0,-.20,-.07),(.94,.54,.82),WHITE,soft=True),box((0,-.405,0),(1,.19,1),DARK),box((0,-.12,-.30),(.84,.39,.39),EDGE,soft=True)]
    for y in (-.055,.075,.205):boot.append(box((0,y,-.475),(.57,.034,.018),DARK))
    for z in (-.32,-.12,.10,.32):boot.append(box((0,-.491,z),(.89,.02,.046),DARK))
    prop('boot',boot,boot[:4])
    vest=[box((0,.01,.03),(.90,.96,.72),WHITE,(.92,0),True),box((0,.10,-.31),(.83,.76,.22),EDGE,(.82,0),True)]
    for x in (-.31,0,.31):
        vest.append(box((x,-.22,-.39),(.285,.40,.19),WHITE,(.92,0),True))
        vest.append(box((x,-.08,-.496),(.24,.052,.024),DARK,(.88,0)))
    for x in (-.31,.31):vest.append(box((x,.33,-.19),(.11,.32,.32),EDGE,(.9,0),True))
    for y in (.24,.10,-.04):vest.append(box((0,y,-.447),(.80,.021,.024),DARK,(.93,0)))
    prop('vest',vest,vest[:5])
    pack=[box((0,.02,.08),(.90,.96,.74),WHITE,(.94,0),True),box((0,-.22,-.31),(.79,.43,.26),EDGE,(.91,0),True)]
    for x in (-.31,.31):pack.append(box((x,0,-.467),(.062,.88,.018),DARK,(.9,0)))
    prop('pack',pack,pack[:2])
    # A sculpted head profile and independent nose/jaw/ears keep helmeted faces
    # legible without introducing a skeleton or changing hit volumes.
    head=[(lathe([(-.5,.18,.19),(-.38,.32,.33),(-.19,.39,.39),(.04,.44,.41),(.26,.44,.39),(.44,.35,.31),(.5,.19,.17)],20),(0,0,.055),(.90,1,.95),WHITE,(.8,0))]
    head.extend([box((0,-.03,-.36),(.13,.28,.18),EDGE,(.72,0),True),box((0,-.32,-.22),(.47,.19,.25),WHITE,(.84,0),True)])
    for x in (-.43,.43):head.append((sphere(10,6),(x,-.02,.025),(.13,.27,.17),WHITE,(.84,0)))
    prop('head',head,head[:3])
    helmet=lathe([(-.5,.48,.47),(-.30,.5,.5),(-.11,.50,.49),(.13,.43,.42),(.34,.30,.29),(.48,.10,.10),(.5,.002,.002)],24)
    hp=[(helmet,(0,0,0),(1,1,1),WHITE,(.73,.05))]
    for x in (-.43,.43):hp.append(box((x,-.13,-.055),(.13,.44,.35),DARK,(.64,.14)))
    hp.append(box((0,-.25,-.47),(.21,.32,.045),EDGE,(.49,.6)))
    prop('helmet',hp,[(lathe([(-.5,.49,.47),(-.1,.5,.49),(.34,.30,.29),(.5,.002,.002)],12),(0,0,0),(1,1,1),WHITE,(.75,0))])
    # The existing first-person finger rig remains responsible for grip poses.
    register('palm',lathe([(-.5,.28,.30),(-.31,.45,.42),(.01,.50,.46),(.31,.46,.5),(.5,.33,.39)],18,folds=.025),sphere(10,6),True)
    register('finger',lathe([(-.5,.28,.26),(-.37,.43,.40),(-.13,.45,.45),(.13,.5,.48),(.33,.44,.41),(.5,.26,.24)],12),sphere(8,5),True)
    sleeve=lathe([(-.5,.40,.38),(-.42,.44,.42),(-.22,.50,.46),(-.02,.47,.50),(.17,.50,.47),(.34,.45,.43),(.5,.36,.36)],18,folds=.10)
    rot=Matrix.Rotation(math.pi/2,3,'X')
    register('sleeve_z',([rot@v for v in sleeve[0]],sleeve[1]),sphere(10,6),True)
    # Complete, opaque leaf geometry avoids the large crossed-card silhouettes
    # and overlapping transparent canopy layers of the previous world kit.
    def crown(kind,far=False):
        vertices=[];triangles=[];colours=[]
        def leaf(a,b,width,tint):
            direction=b-a;side=direction.cross(Vector((0,1,0)))
            if side.length<.0001:side=Vector((1,0,0))
            side.normalize();mid=a.lerp(b,.53)+Vector((0,.009,0));i=len(vertices)
            vertices.extend((a,mid+side*width,b,mid-side*width));triangles.extend(((i,i+1,i+2),(i,i+2,i+3)))
            colours.extend([tuple(api['linear'](c) for c in tint)]*4)
        if kind=='palm':
            def pinna(a,b,width,tint):
                # A tapered blade rolls around a raised longitudinal ridge.
                # The near belly has four broad facets, rather than a planar
                # diamond. Its distant fold keeps the same blade endpoints.
                side=(b-a).cross(Vector((0,1,0)))
                if side.length<.0001:side=Vector((1,0,0))
                side.normalize();i=len(vertices)
                if far:
                    middle=a.lerp(b,.49)+Vector((0,-.012,0))
                    vertices.extend((a,middle+side*width,b,middle-side*width))
                    triangles.extend(((i,i+1,i+2),(i,i+2,i+3)))
                    colours.extend([tuple(api['linear'](c) for c in tint)]*4)
                else:
                    ridge=a.lerp(b,.49)+Vector((0,.022,0))
                    edge=ridge-Vector((0,.018,0))
                    vertices.extend((a,edge+side*width,ridge,edge-side*width,b))
                    triangles.extend(((i,i+1,i+2),(i,i+2,i+3),
                                      (i+2,i+1,i+4),(i+2,i+4,i+3)))
                    colours.extend([tuple(api['linear'](c) for c in tint)]*5)

            # Lower drooping, middle spreading and upper rising whorls give
            # the crown a volume from player height. Every rachis begins at
            # the original .22 m local root and follows the pinnae's actual
            # curve, so the leaflets no longer float above a straight midrib.
            # The unchanged unit envelope retains the original trunk/instance
            # transforms, opaque material, wind and instanced near/far routing.
            pairs=7 if far else 10;segments=3 if far else 5
            tiers=((3 if far else 4,.43,.015,.40,.11),
                   (3 if far else 5,.46,.11,.31,.61),
                   (2 if far else 3,.29,.22,.065,1.02))
            for tier,(arms,radius,arch,droop,phase) in enumerate(tiers):
                for arm in range(arms):
                    angle=arm/arms*math.tau+phase+.11*math.sin(arm*2.3+tier)
                    out=Vector((math.sin(angle),0,math.cos(angle)))
                    cross=Vector((out.z,0,-out.x))
                    reach=radius*(.92+.07*math.sin(arm*1.73+tier+.4))
                    sweep=.018*math.sin(arm*1.31+tier)

                    def rachis(t):
                        return out*(t*reach)+cross*(sweep*t*t)+Vector((0,
                            .22+arch*math.sin(t*math.pi*.72)-droop*t*t,0))

                    # Tapered connected ribbon, with segments shared between
                    # the attached blades. The broad curve survives far LOD.
                    knots=[rachis(j/segments) for j in range(segments+1)]
                    start=len(vertices)
                    for j,point in enumerate(knots):
                        t=j/segments;width=.007*(1-.85*t)
                        vertices.extend((point-cross*width,point+cross*width))
                        colours.extend([tuple(api['linear'](c) for c in (.36,.40,.17))]*2)
                    for j in range(segments):
                        a=start+j*2
                        triangles.extend(((a,a+2,a+3),(a,a+3,a+1)))
                    for j in range(pairs):
                        t=(j+.7)/(pairs+.8);section=min(segments-1,int(t*segments))
                        a=knots[section].lerp(knots[section+1],t*segments-section)
                        span=(.083 if tier<2 else .069)*(math.sin(t*math.pi)**.65)
                        width=(.021 if far else .014)+.006*math.sin(t*math.pi)
                        tint=(.29+tier*.017+(arm%3)*.008,.37+tier*.027,.15+tier*.015)
                        for sign in (-1,1):
                            b=a+cross*(span*sign)+out*(.025+.018*t)+Vector((0,-.020-.028*t,0))
                            pinna(a,b,width,tint)
            for arm in range(4):
                angle=arm/4*math.tau
                pinna(Vector((0,.22,0)),Vector((math.sin(angle)*.14,.48,math.cos(angle)*.14)),
                      .040 if far else .032,(.37,.46,.20))
        elif kind=='conifer':
            levels=5 if far else 8;arms=6 if far else 9;pairs=4 if far else 7
            for row in range(levels):
                height=-.47+row/levels*.91;radius=(.52-height)*.46
                for arm in range(arms):
                    angle=arm/arms*math.tau+row*.77;out=Vector((math.sin(angle),0,math.cos(angle)));cross=Vector((out.z,0,-out.x))
                    for j in range(pairs):
                        t=(j+1)/pairs;a=out*(t*radius)+Vector((0,height-.07*t,0))
                        for sign in (-1,1):
                            b=a+out*.07+cross*(.047*(1-t*.6)*sign)+Vector((0,.015,0))
                            snow=max(0,(height-.03)*1.6);base=(.17,.25,.13)
                            tint=tuple(base[i]*(1-snow)+(.82,.88,.84)[i]*snow for i in range(3));leaf(a,b,.033 if far else .024,tint)
        else:
            branches=12 if far else 28;leaves=4 if far else 8
            for branch in range(branches):
                angle=branch*2.399963;h=-.24+(branch*.618%1)*.55;radius=.18+.22*(branch*.414%1)
                center=Vector((math.sin(angle)*radius,h,math.cos(angle)*radius))
                for j in range(leaves):
                    a=center+Vector((math.sin(j*2.39)*.055,math.cos(j*1.81)*.04,math.cos(j*2.39)*.055))
                    b=a+Vector((math.sin(angle+j*.8)*.13,.028,math.cos(angle+j*.8)*.13))
                    leaf(a,b,.060 if far else .043,(.19+(j%3)*.025,.29+(j%3)*.02,.12))
        return vertices,triangles,colours
    register('palm_crown',crown('palm'),crown('palm',True))
    register('tree_crown',crown('broadleaf'),crown('broadleaf',True))
    register('conifer',crown('conifer'),crown('conifer',True))
    # Explicit Blender billboard mesh is shared by particles, decals and sprites.
    v=[Vector((-.5,-.5,0)),Vector((.5,-.5,0)),Vector((.5,.5,0)),Vector((-.5,.5,0))]
    register('billboard',(v,[(0,1,2),(0,2,3)]))
    for level in ('near','far'):
        o=api['mesh_assets']['billboard__'+level]
        for li,coord in zip(o.data.polygons[0].loop_indices,((0,0),(1,0),(1,1))):o.data.uv_layers.active.data[li].uv=coord
        for li,coord in zip(o.data.polygons[1].loop_indices,((0,0),(1,1),(0,1))):o.data.uv_layers.active.data[li].uv=coord
    return ['pallet','sandbags','equipment_case','generator','street_bin','utility_van','hvac']
