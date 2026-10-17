"""Editable, metre-scaled architectural and industrial production models.

The silhouettes, reveals and mechanical construction are native mesh topology.
Every shared object fits its simulation's unit envelope; openings in visual
facades do not replace the gameplay collision. Near/far versions retain the
large forms and remove fittings before sacrificing the structure.
"""
import math
from mathutils import Vector, Matrix
from mathutils.geometry import tessellate_polygon


def extrusion(points, front, back):
    """Extrude an authored XY outline along Z, including concave chipped edges."""
    polygon = [Vector((x, y, 0)) for x, y in points]
    vertices = [Vector((q.x, q.y, z)) for z in (front, back) for q in polygon]
    n = len(polygon)
    indices = {(q.x, q.y): i for i, q in enumerate(polygon)}
    triangles = []
    for tri in tessellate_polygon([polygon]):
        a, b, c = [q if isinstance(q, int) else indices[(q.x, q.y)] for q in tri]
        triangles.extend(((a, c, b), (a+n, b+n, c+n)))
    for i in range(n):
        j = (i+1) % n
        triangles.extend(((i, j, j+n), (i, j+n, i+n)))
    return vertices, triangles


def rotate_piece(piece, angle, axis='Y'):
    geometry, position, scale, color, physical = piece
    rotation = Matrix.Rotation(angle, 3, axis)
    # Bake scale before rotation: exchanging dimensions alone distorts detailed
    # shapes when the X/Z extents differ.
    vertices = [rotation @ Vector((q.x*scale[0], q.y*scale[1], q.z*scale[2]))
                for q in geometry[0]]
    return ((vertices, geometry[1]), rotation @ Vector(position), (1,1,1), color, physical)


def author_environment(api, helpers):
    model = helpers['model']; box = helpers['box']; rod = helpers['rod']
    tube = helpers['tube']; profile = helpers['profile']; B = api['BASE']
    lathe = api['lathe']; sphere = api['sphere']
    steel=(.56,.61,.60); concrete=(.88,.88,.82); dark=(.20,.23,.22)
    black=(.105,.12,.12); rust=(.47,.31,.19); glass=(.24,.36,.40)
    names=[]

    def publish(name, near, far=None, smooth=False):
        model(name,near,far,smooth);names.append(name)

    def outline(points, front, back, color=concrete, rm=(.91,0)):
        return (extrusion(points,front,back),(0,0,0),(1,1,1),color,rm)

    def ring(center, size, color=steel, rm=(.49,.62), thickness=.014):
        x,y,z=center;w,h,d=size
        return [box((x-w*.5+thickness*.5,y,z),(thickness,h,d),color,rm),
                box((x+w*.5-thickness*.5,y,z),(thickness,h,d),color,rm),
                box((x,y-h*.5+thickness*.5,z),(w-thickness*2,thickness,d),color,rm),
                box((x,y+h*.5-thickness*.5,z),(w-thickness*2,thickness,d),color,rm)]

    def fastener(position, normal_axis='Z', radius=.009):
        # Recessed six-sided heads read as hardware under glancing sunlight.
        g=lathe([(-.5,.43,.43),(-.27,.5,.5),(.5,.5,.5)],6)
        rotation=Matrix.Rotation(math.pi/2,3,'X') if normal_axis=='Z' else Matrix.Rotation(math.pi/2,3,'Z')
        g=([rotation@q for q in g[0]],g[1])
        return (g,position,(radius*2,radius*2,radius),(.40,.43,.42),(.36,.82))

    # A real casting: four deep panels with a jagged spalled edge, plinth,
    # recessed expansion joints and tie-rod cups. Large hierarchy replaces
    # the dense ruler-like lines of the old solid slab.
    wall=[]
    for col in range(2):
        for row in range(2):
            x0=-.485+col*.488;y0=-.443+row*.447
            x1=x0+.475;y1=y0+.435
            points=[(x0,y0),(x1,y0),(x1,y1),(x0,y1)]
            if col==0 and row==0:
                points=[(x0+.054,y0),(x1,y0),(x1,y1),(x0,y1),
                        (x0,y0+.088),(x0+.018,y0+.059),(x0+.024,y0+.021)]
            wall.append(outline(points,-.46,.46,(.96-row*.018,.965-row*.018,.93-row*.015)))
    # Expansion joints are deep grooves in an opaque structural casting.
    # They must never become slits through a solid simulation wall, exposing
    # sky or leaking exterior light into the authored interior.
    wall.append(box((0,0,0),(1,1,.82),(.58,.61,.55),(.96,0)))
    wall_far=wall[:]
    for sign in (-1,1):
        for x in (-.465,.465):
            wall.append(box((x,0,sign*.476),(.027,.92,.028),(.73,.77,.72),(.86,.04)))
        plinth=box((0,-.470,sign*.480),(.984,.059,.038),(.68,.71,.64),(.96,0))
        coping=box((0,.472,sign*.479),(.986,.047,.035),(.78,.80,.75),(.87,0))
        wall.extend((plinth,coping));wall_far.extend((plinth,coping))
        for x in (-.365,-.125,.13,.365):
            for y in (-.325,.33):
                wall.append((sphere(8,4),(x,y,sign*.463),(.022,.022,.003),(.48,.49,.44),(.98,0)))
        # Exposed aggregate and bent reinforcement remain inside the silhouette.
        wall.append(outline([(-.483,-.443),(-.432,-.443),(-.461,-.403),(-.48,-.36)],sign*.459,sign*.466,(.49,.50,.44)))
        wall.append(rod((-.477,-.43,sign*.466),(-.453,-.369,sign*.466),.004,rust,(.88,.18)))
    publish('wall',wall,wall_far)

    # Facades are thick perimeter shells with genuine recessed apertures,
    # slabs, piers, window frames and internal shadow boxes. No opaque unit
    # cube lies immediately behind the glazing.
    for style in ('urban','industrial','desert'):
        plaster=(.93,.91,.84) if style=='desert' else (.88,.91,.89)
        frame=(.40,.43,.39) if style=='desert' else steel
        pieces=[];far=[]
        # Floor plates inside the shell provide believable window parallax.
        for y in (-.47,-.15,.17,.485):
            pieces.append(box((0,y,0),(.98,.027,.98),(.67,.69,.63),(.92,0)))
        pieces.append(box((0,0,0),(.12,.96,.12),dark,(.96,0)))
        for side in range(4):
            facade=[]
            rotation=side*math.pi/2
            if style=='industrial':
                # Factory concrete base, structural piers and tall clerestory.
                facade.append(box((0,-.35,-.463),(.95,.24,.069),(.70,.73,.68),(.95,0)))
                facade.append(box((0,.035,-.459),(.95,.50,.076),(.91,.95,.93),(.66,.23)))
                for x in (-.464,-.155,.155,.464):
                    facade.append(box((x,0,-.474),(.048,.98,.045),frame,(.57,.45)))
                facade.append(box((0,.29,-.466),(.94,.026,.060),frame,(.54,.48)))
                facade.append(box((0,.447,-.471),(.96,.038,.054),frame,(.57,.48)))
                for column in range(3):
                    x=-.307+column*.307
                    facade.extend(ring((x,.365,-.465),(.272,.124,.065),frame,(.47,.65),.009))
                    facade.append(box((x,.365,-.435),(.25,.105,.008),glass,(.16,.05)))
                    facade.append(box((x,.365,-.477),(.008,.110,.018),frame,(.45,.7)))
                # Folded vertical steel sheeting with wide formed ridges.
                for i in range(12):
                    x=-.433+i*.079
                    facade.append(outline([(x-.006,-.205),(x+.006,-.205),(x+.006,.27),(x-.006,.27)],-.488,-.471,(.71,.77,.75),(.56,.38)))
            else:
                window_w=.212 if style=='urban' else .17
                window_h=.188 if style=='urban' else .193
                # Horizontal masonry between floor apertures.
                for y,h in ((-.424,.091),(-.137,.082),(.16,.080),(.44,.069)):
                    facade.append(box((0,y,-.458),(.94,h,.079),plaster,(.92,0)))
                for col in range(4):
                    x=-.462+col*.308
                    facade.append(box((x,0,-.458),(.074,.90,.079),plaster,(.92,0)))
                for row in range(3):
                    y=-.286+row*.292
                    for col in range(3):
                        x=-.311+col*.312
                        facade.extend(ring((x,y,-.459),(window_w+.036,window_h+.034,.078),plaster,(.88,0),.018))
                        facade.extend(ring((x,y,-.444),(window_w,window_h,.016),frame,(.46,.40),.007))
                        facade.append(box((x,y,-.425),(window_w-.02,window_h-.02,.008),
                                          (.19+col*.025,.29+row*.018,.32+col*.022),(.17,.02)))
                        facade.append(box((x,y,-.395),(window_w-.016,window_h-.018,.028),black,(.96,0)))
                        facade.append(box((x,y,-.455),(.006,window_h-.016,.014),frame,(.47,.44)))
                        facade.append(box((x,y-window_h*.5-.018,-.477),(window_w+.064,.018,.044),(.69,.72,.65),(.87,0)))
                        if style=='desert':
                            for sign in (-1,1):
                                facade.append(box((x+sign*(window_w*.5+.014),y,-.486),(.019,window_h*.92,.019),(.41,.40,.29),(.88,0)))
                if style=='urban':
                    # Recessed centre balcony, cast slab and vertical balusters.
                    facade.append(box((0,-.113,-.479),(.265,.023,.037),(.61,.64,.61),(.89,0)))
                    facade.append(rod((-.129,-.108,-.492),(-.129,-.036,-.492),.0035,frame))
                    facade.append(rod((.129,-.108,-.492),(.129,-.036,-.492),.0035,frame))
                    facade.append(rod((-.129,-.036,-.492),(.129,-.036,-.492),.0035,frame))
                    for x in (-.083,-.028,.028,.083):
                        facade.append(rod((x,-.107,-.492),(x,-.037,-.492),.0025,frame))
            # Every elevation shares coping and a physically supported cornice.
            facade.append(box((0,.478,-.467),(.98,.042,.060),(.71,.75,.70),(.85,.07)))
            for x in (-.478,.478):
                facade.append(box((x,0,-.459),(.027,.95,.078),(.70,.75,.71),(.87,.05)))
            facade.append(rod((.452,-.445,-.492),(.452,.446,-.492),.006,frame,(.64,.45)))
            rotated=[rotate_piece(p,rotation) for p in facade]
            pieces+=rotated
            # Far version keeps every actual opening and shadow box; remove
            # only mullions, narrow steel ridges, fittings and rail balusters.
            if style=='industrial':
                far_facade=facade[:8]
                for column in range(3):
                    x=-.307+column*.307
                    far_facade.append(box((x,.365,-.449),(.272,.124,.025),glass,(.18,.04)))
            else:
                far_facade=facade[:8]
                for row in range(3):
                    y=-.286+row*.292
                    for col in range(3):
                        x=-.311+col*.312
                        far_facade.append(box((x,y,-.437),(window_w+.018,window_h+.018,.038),glass,(.18,.03)))
            far_facade+=facade[-4:-1]
            far += [rotate_piece(p,rotation) for p in far_facade]
        far=pieces[:5]+far
        publish('building_'+style,pieces,far)

    # Tapered Jersey casting with sloped foot, lifting eyes and reinforcement.
    g=profile([(-.5,.50,.50),(-.46,.50,.50),(-.23,.50,.42),(.02,.50,.25),(.45,.49,.17),(.50,.47,.16)],axis=1)
    barrier=[(g,(0,0,0),(1,1,1),(1,1,.96),(.96,0))]
    for x in (-.31,.31):
        barrier.append(tube((x,.484,0),(.045,.025,.045),dark,(.68,.31)))
    for sign in (-1,1):
        for x in (-.405,.405):barrier.append(box((x,-.335,sign*.454),(.015,.18,.006),(.62,.64,.56),(.98,0)))
        barrier.append(outline([(-.485,-.45),(-.405,-.45),(-.441,-.384),(-.48,-.39)],sign*.455,sign*.462,(.61,.60,.53)))
    publish('barrier_x',barrier,barrier[:1])
    publish('barrier_z',[rotate_piece(p,math.pi/2) for p in barrier],[rotate_piece(p,math.pi/2) for p in barrier[:1]])

    # Board-built shipping chest. Four recessed plank panels sit inside actual
    # corner posts and rails; a braced shell and three bearers replace the old
    # solid cube with decorative strips. Every part stays inside the same unit
    # envelope, including the broad top and the bottom of the supporting feet.
    # The opaque inner lining backs the damaged plank edges: seams must never
    # suggest a firing aperture through the simulation's solid wooden cover.
    shipping=[];shipping_far=[]
    timber=(.94,.91,.83);frame_timber=(.87,.84,.75)
    lining=(.63,.60,.52);wood_rm=(.92,0)
    shipping_flat=box((0,0,0),(.01,.01,.01))[0]

    def shipping_box(position,size,color=timber,distant=False):
        return (shipping_flat if distant else box(position,size,color,wood_rm)[0],
                position,size,color,wood_rm)

    # Open fork approaches under the floor are structural, rather than small
    # surface grooves. Far LOD keeps all three feet and the supported deck.
    for x in (-.35,0,.35):
        shipping.append(shipping_box((x,-.455,0),(.18,.09,.94),frame_timber))
        shipping_far.append(shipping_box((x,-.455,0),(.18,.09,.94),frame_timber,True))
    shipping.append(shipping_box((0,-.389,0),(.90,.042,.90),timber,True))
    shipping_far.append(shipping_box((0,-.389,0),(.90,.042,.90),timber,True))
    for x in (-.45,.45):
        for z in (-.45,.45):
            shipping.append(shipping_box((x,.0475,z),(.10,.905,.10),frame_timber))
            shipping_far.append(shipping_box((x,.0475,z),(.10,.905,.10),frame_timber,True))

    for side in range(4):
        face=[];face_far=[]
        face.append(shipping_box((0,.018,-.4115),(.84,.80,.025),lining,True))
        # The distant face is a closed inset panel; genuine large frame and
        # diagonal construction survive, while individual damaged seams drop.
        face_far.append(shipping_box((0,.018,-.438),(.82,.80,.034),timber,True))
        for row in range(4):
            bottom=-.356+row*.182;top=bottom+.169
            left=-.405;right=.405
            chip=.024 if (row+side)%3==0 else .009
            points=[(left+.008,bottom),(right-chip,bottom),
                    (right,bottom+chip),(right,top-.010),
                    (right-.010,top),(left+.006,top),(left,top-.015),
                    (left,bottom+.012)]
            tint=tuple(value*(.96+((row+side*2)%4)*.017) for value in timber)
            face.append(outline(points,-.455,-.420,tint,wood_rm))
        for y,height in ((-.349,.112),(.441,.118)):
            face.append(shipping_box((0,y,-.458),(.80,height,.084),frame_timber))
            face_far.append(shipping_box((0,y,-.458),(.80,height,.084),frame_timber,True))
        # Wide diagonal boards bear against the horizontal frame. They are
        # deliberately legible from room-scale views, without nails or decals.
        brace=[(-.400,-.292),(-.297,-.292),(.400,.294),(.400,.382),
               (.297,.382),(-.400,-.204)]
        if side%2:
            brace=[(-x,y) for x,y in reversed(brace)]
        brace_piece=outline(brace,-.495,-.451,(.91,.88,.79),wood_rm)
        face.append(brace_piece);face_far.append(brace_piece)
        shipping.extend(rotate_piece(piece,side*math.pi/2) for piece in face)
        shipping_far.extend(rotate_piece(piece,side*math.pi/2) for piece in face_far)

    # A closed boarded lid supports existing stacked crates at the original
    # height. It remains behind the upper rails rather than becoming a flange
    # outside the collision envelope.
    shipping.append(shipping_box((0,.443,0),(.90,.010,.90),lining,True))
    for i in range(4):
        shipping.append(shipping_box((-.3375+i*.225,.461,0),(.219,.044,.90),
                                     tuple(value*(.97+i*.012) for value in timber),True))
    shipping_far.append(shipping_box((0,.461,0),(.90,.044,.90),timber,True))
    publish('shipping_crate',shipping,shipping_far)

    # Nuketown's furniture and privacy fences retain their original solid
    # gameplay owners. Their broad construction must describe domestic objects
    # instead of inheriting the shipping-cover/crate selector. All bases have
    # closed plinths, and all board joints have opaque backing inside the AABB.
    house_flat=box((0,0,0),(.01,.01,.01))[0]
    house_wood=(.96,.94,.88);house_frame=(.86,.83,.76)
    house_rm=(.91,0)

    def house_box(position,size,color=house_wood,distant=False):
        return (house_flat if distant else box(position,size,color,house_rm)[0],
                position,size,color,house_rm)

    # A platform bed has a continuous floor plinth, closed framed side/end
    # panels and a full supporting deck. Existing mattress and pillow remain
    # separate at their unchanged positions above this original owner volume.
    bed=[house_box((0,.10,0),(.92,.80,.92)),
         house_box((0,-.40,0),(1,.20,1),house_frame),
         house_box((0,.465,0),(.98,.07,.98))]
    bed_far=[house_box((0,.10,0),(.92,.80,.92),house_wood,True),
             house_box((0,-.40,0),(1,.20,1),house_frame,True),
             house_box((0,.465,0),(.98,.07,.98),house_wood,True)]
    for x in (-.455,.455):
        for z in (-.455,.455):
            bed.append(house_box((x,.065,z),(.09,.73,.09),house_frame))
    for side in range(4):
        inset=house_box((0,.06,-.473),(.79,.58,.026),(.93,.90,.83),True)
        bed.append(rotate_piece(inset,side*math.pi/2))
        bed_far.append(rotate_piece(inset,side*math.pi/2))
    publish('house_bed_plinth',bed,bed_far)

    # The low storage table, dresser and kitchen base share framed cabinet
    # construction. The caller retains its existing wood or painted finish.
    # Door/drawer joints and recessed pulls terminate against the closed carcass
    # rather than creating dark openings beneath a tabletop or through cover.
    cabinet=[house_box((0,.015,0),(.92,.85,.91)),
             house_box((0,-.435,0),(.98,.13,.98),house_frame),
             house_box((0,.45,0),(1,.10,1))]
    cabinet_far=[house_box((0,.015,0),(.92,.85,.91),house_wood,True),
                 house_box((0,-.435,0),(.98,.13,.98),house_frame,True),
                 house_box((0,.45,0),(1,.10,1),house_wood,True)]
    for x in (-.455,.455):
        cabinet.append(house_box((x,.01,-.465),(.09,.78,.07),house_frame))
    for x in (-.205,.205):
        door=house_box((x,-.075,-.473),(.392,.53,.034),(.94,.92,.85),True)
        cabinet.append(door);cabinet_far.append(door)
        cabinet.append(house_box((x,.151,-.491),(.27,.027,.018),(.56,.54,.48),True))
    cabinet.append(house_box((0,.299,-.473),(.80,.184,.034),(.94,.92,.85),True))
    cabinet.append(house_box((0,.323,-.491),(.40,.027,.018),(.56,.54,.48),True))
    cabinet_far.append(house_box((0,.299,-.473),(.80,.184,.034),(.94,.92,.85),True))
    for sign in (-1,1):
        cabinet.append(house_box((sign*.471,.015,0),(.026,.71,.75),(.93,.90,.83),True))
    publish('house_storage_cabinet',cabinet,cabinet_far)
    # A reversed native variant faces the second house's room without adding
    # a rotation to its authoritative gameplay owner.
    publish('house_storage_cabinet_back',[rotate_piece(piece,math.pi) for piece in cabinet],
            [rotate_piece(piece,math.pi) for piece in cabinet_far])

    # Long privacy runs need real board pitch: stretching one unit crate over
    # 61 metres produces metre-wide timber strips. These five existing spans
    # share a single construction recipe, with about 20 cm vertical boards and
    # two supported rear rails. The solid lining fills every visible seam;
    # there is no apparent firing aperture through an authoritative fence box.
    for length,axis in ((51,'x'),(61,'z'),(18,'z'),(8.8,'x'),(4.2,'x')):
        count=math.ceil(length/.20)
        fence=[house_box((0,0,0),(1,1,.68),(.66,.63,.56),True)]
        fence_far=[house_box((0,0,0),(1,1,.94),house_wood,True)]
        for i in range(count):
            tint=tuple(value*(.95+(i%5)*.012) for value in house_wood)
            fence.append(house_box(((i+.5)/count-.5,0,0),(.94/count,1,.94),tint,True))
        for y in (-.27,.27):
            rail=house_box((0,y,.47),(1,.065,.06),house_frame,True)
            fence.append(rail);fence_far.append(rail)
        if axis=='z':
            fence=[rotate_piece(piece,math.pi/2) for piece in fence]
            fence_far=[rotate_piece(piece,math.pi/2) for piece in fence_far]
        publish('house_privacy_fence_'+str(length).replace('.','_')+'_'+axis,fence,fence_far)

    # ISO freight container: continuous pressed trapezoidal sides, open door
    # hardware, roof seams and corner castings instead of ridges on a cube.
    for axis in ('x','z'):
        cargo=[box((0,-.472,0),(.98,.049,.95),dark,(.64,.47)),
               box((0,.475,0),(.98,.039,.97),(.78,.82,.78),(.61,.37))]
        for sign in (-1,1):
            for i in range(16):
                x=-.461+i*.0614
                # Single formed section has four bends and no hidden cube.
                outline_points=[(x-.029,-.447),(x+.029,-.447),(x+.029,.447),(x-.029,.447)]
                g=extrusion(outline_points,-.46,.46)
                verts=[Vector((q.x,q.y,sign*(.471+(.012 if abs(q.x-x)<.012 else 0)))) for q in g[0][:4]]
                # Sheet face with folded sides, authored explicitly along Y.
                section=[(x-.030,.459),(x-.017,.459),(x-.010,.479),(x+.010,.479),(x+.017,.459),(x+.030,.459)]
                v=[Vector((sx,y,sign*sz)) for y in (-.448,.448) for sx,sz in section]
                t=[]
                for j in range(5):
                    a=j;b=j+1;t.extend(((a,b,b+6),(a,b+6,a+6)))
                if sign<0:t=[(a,c,b) for a,b,c in t]
                cargo.append(((v,t),(0,0,0),(1,1,1),(.93,.96,.91),(.58,.39)))
            for x in (-.475,.475):cargo.append(box((x,0,sign*.474),(.04,.95,.048),steel,(.55,.54)))
            for y in (-.461,.461):cargo.append(box((0,y,sign*.472),(.96,.035,.038),steel,(.55,.54)))
        for end in (-1,1):
            endpieces=[]
            for z in (-.239,.239):
                endpieces.append(box((end*.473,0,z),(.037,.895,.453),(.84,.88,.84),(.58,.40)))
                endpieces.append(rod((end*.495,-.402,z),(end*.495,.402,z),.009,steel))
                for y in (-.302,.276):
                    endpieces.append(box((end*.487,y,z),(.022,.045,.07),steel,(.43,.72)))
                    endpieces.append(rod((end*.495,y,z-.032),(end*.495,y,z+.036),.004,dark))
                for y in (-.31,.04,.34):endpieces.append(box((end*.492,y,z+(.218 if z<0 else -.218)),(.010,.037,.036),steel,(.45,.7)))
            cargo+=endpieces
        for x in (-.47,.47):
            for z in (-.47,.47):
                for y in (-.468,.468):
                    cargo.append(box((x,y,z),(.06,.063,.06),(.40,.46,.43),(.54,.74)))
        if axis=='z':cargo=[rotate_piece(p,math.pi/2) for p in cargo]
        # Simplified sheeting retains broad folds via an unbroken backing.
        far=[box((0,0,0),(.95,.94,.94),(.91,.95,.90),(.60,.4)),*cargo[-8:]]
        publish('cargo_'+axis,cargo,far)

    # Open-skid inline-three diesel set. The radiator, exposed engine and
    # stepped alternator share a Z-axis driveline, with a tank below and a
    # supported exhaust above. Empty space around the engine is intentional:
    # broad side panels must not turn the machinery back into an opaque crate.
    generator=[];generator_far=[]
    engine_paint=(.49,.59,.50);alternator_paint=(.36,.43,.39)
    generator_flat=box((0,0,0),(.01,.01,.01))[0]

    def generator_far_box(position, size, color, rm):
        return (generator_flat,position,size,color,rm)

    def generator_part(piece, distant=True):
        generator.append(piece)
        if distant:
            # Tiny bevels have no useful silhouette at the far transition.
            generator_far.append((generator_flat,*piece[1:]) if piece[0] is B['world'] else piece)

    def generator_cylinder(rings, sides, position, scale, color, rm, axis='Z'):
        g=lathe(rings,sides)
        if axis!='Y':
            rotation=Matrix.Rotation(math.pi/2,3,'X') if axis=='Z' else Matrix.Rotation(-math.pi/2,3,'Z')
            g=([rotation@q for q in g[0]],g[1])
        return (g,position,scale,color,rm)

    def generator_pipe(a, b, radius, color=steel, rm=(.47,.65), sides=8):
        # Hoses and pipes need only eight sides; the shared rod's four-ring
        # cylinder is reserved for larger objects elsewhere in the kit.
        a=Vector(a);b=Vector(b);direction=b-a
        rotation=Vector((0,1,0)).rotation_difference(direction.normalized())
        g=lathe([(-.5,1,1),(.5,1,1)],sides)
        vertices=[rotation@Vector((q.x*radius,q.y*direction.length,q.z*radius))+(a+b)*.5 for q in g[0]]
        return ((vertices,g[1]),(0,0,0),(1,1,1),color,rm)

    # Folded channel rails and crossmembers carry the shallow fuel tank. The
    # flange/web construction leaves genuine light underneath the open skid.
    for x in (-.412,.412):
        generator_part(box((x,-.442,0),(.026,.106,.98),dark,(.64,.59)),False)
        for y in (-.485,-.399):
            generator_part(box((x,y,0),(.11,.020,.98),dark,(.64,.59)),False)
        generator_far.append(generator_far_box((x,-.442,0),(.11,.106,.98),dark,(.64,.59)))
    for z in (-.405,.405):
        generator_part(box((0,-.436,z),(.91,.075,.030),dark,(.64,.59)))
    generator_part(box((0,-.365,.005),(.68,.080,.85),(.30,.36,.32),(.66,.40)))
    generator_part(box((0,-.319,.005),(.65,.012,.82),(.43,.49,.42),(.62,.39)),False)
    for x in (-.215,.215):
        for z in (-.18,.205):
            generator_part(box((x,-.301,z),(.12,.028,.10),steel,(.51,.62)),False)
            generator_part(box((x,-.276,z),(.085,.027,.072),black,(.88,.02)),False)
        generator_far.append(generator_far_box((x,-.296,.0125),(.085,.067,.457),black,(.88,.02)))
    generator_part(generator_cylinder([(-.5,.5,.5),(.5,.5,.5)],10,(-.284,-.302,-.29),(.065,.035,.065),dark,(.57,.42),'Y'),False)

    # Sump, shouldered block and three separate rocker covers expose the
    # mechanical hierarchy. The sump meets the mounts rather than floating
    # above the tank, and the rear bellhousing meets the alternator flange.
    sump=profile([(-.5,.34,.40),(-.28,.45,.48),(.5,.50,.50)],axis=1)
    generator.append((sump,(0,-.204,-.073),(.38,.15,.37),dark,(.73,.24)))
    generator_far.append((profile([(-.5,.38,.43),(.5,.5,.5)],axis=1),(0,-.204,-.073),(.38,.15,.37),dark,(.73,.24)))
    block=profile([(-.5,.43,.39),(-.40,.5,.47),(.39,.5,.47),(.5,.43,.40)],axis=2)
    generator.append((block,(0,-.035,-.073),(.46,.32,.44),engine_paint,(.71,.29)))
    generator_far.append((profile([(-.5,.5,.47),(.5,.5,.47)],axis=2),(0,-.035,-.073),(.46,.32,.44),engine_paint,(.71,.29)))
    generator_part(box((0,.126,-.073),(.44,.028,.44),(.36,.43,.36),(.66,.35)),False)
    rocker=profile([(-.5,.39,.35),(-.33,.5,.5),(.36,.5,.5),(.5,.39,.35)],axis=2)
    for z in (-.213,-.073,.067):
        generator.append((rocker,(0,.196,z),(.405,.13,.126),engine_paint,(.62,.38)))
    generator_far.append((profile([(-.5,.46,.5),(.5,.46,.5)],axis=2),(0,.196,-.073),(.405,.13,.406),engine_paint,(.62,.38)))
    for sign in (-1,1):
        generator_part(box((sign*.233,-.033,-.073),(.019,.14,.29),(.40,.48,.40),(.70,.31)),False)
        for z in (-.18,.035):
            generator_part(fastener((sign*.246,-.033,z),'X',.010),False)
    # Injection pump and its three bent steel delivery lines live on the
    # service side; there is no unseen bank of internal engine components.
    generator_part(box((.276,-.015,-.079),(.071,.095,.272),dark,(.57,.43)),False)
    for z in (-.213,-.073,.067):
        generator_part(generator_pipe((.29,.035,z),(.29,.165,z),.0045),False)
        generator_part(generator_pipe((.29,.165,z),(.16,.249,z),.0045),False)

    # A single stepped shell describes the alternator's drive flange, barrel
    # and smaller rear cover. Fins are only on its exposed outer quadrants.
    alternator_rings=[(-.5,.43,.43),(-.44,.5,.5),(-.30,.5,.5),(-.24,.44,.44),(.34,.44,.44),(.40,.35,.35),(.5,.33,.33)]
    generator.append(generator_cylinder(alternator_rings,16,(0,-.025,.307),(.59,.54,.346),alternator_paint,(.51,.60)))
    generator_far.append(generator_cylinder([(-.5,.5,.5),(-.28,.44,.44),(.34,.44,.44),(.5,.33,.33)],10,(0,-.025,.307),(.59,.54,.346),alternator_paint,(.51,.60)))
    for sign in (-1,1):
        for y in (-.105,-.035,.035):
            generator_part(box((sign*.263,y,.313),(.019,.022,.18),(.46,.53,.47),(.48,.63)),False)
    terminal=profile([(-.5,.46,.42),(-.40,.5,.5),(.5,.5,.5)],axis=2)
    generator.append((terminal,(0,.245,.312),(.28,.13,.205),(.52,.60,.53),(.60,.35)))
    generator_far.append(generator_far_box((0,.245,.312),(.28,.13,.205),(.52,.60,.53),(.60,.35)))
    generator_part(box((0,.315,.312),(.29,.012,.214),steel,(.49,.61)),False)
    generator_part(box((.147,.247,.315),(.012,.077,.125),dark,(.26,.08)),False)

    # The cooling pack is a separate upright frame with a recessed opaque
    # core, cap and rear fan shroud. The guard sits in front of actual fins;
    # no alpha plane or unbroken cube fills the surrounding engine bay.
    for x in (-.354,.354):
        generator_part(box((x,.004,-.406),(.030,.682,.138),steel,(.55,.58)))
    for y in (-.29,.321):
        generator_part(box((0,y,-.406),(.708,.052,.15),(.42,.49,.43),(.61,.43)))
    generator_part(box((0,.017,-.406),(.66,.55,.030),black,(.83,.13)))
    for y in (-.218,-.158,-.098,-.038,.022,.082,.142,.202,.262):
        generator_part(box((0,y,-.437),(.639,.012,.016),(.33,.39,.36),(.58,.50)),False)
    for x in (-.25,-.125,0,.125,.25):
        generator_part(box((x,.017,-.480),(.012,.565,.018),steel,(.51,.62)),False)
    for y in (-.263,.017,.295):
        generator_part(box((0,y,-.480),(.666,.018,.018),steel,(.51,.62)),False)
    generator_part(generator_cylinder([(-.5,.5,.5),(.5,.5,.5)],12,(0,.020,-.330),(.51,.51,.04),dark,(.69,.31)),False)
    generator_part(generator_cylinder([(-.5,.5,.5),(.5,.5,.5)],8,(.21,.361,-.405),(.065,.028,.065),steel,(.43,.69),'Y'),False)
    generator_part(generator_pipe((-.18,.253,-.337),(-.18,.253,-.227),.021,black,(.83,.04)),False)
    generator_part(generator_pipe((-.18,.253,-.227),(-.13,.185,-.195),.021,black,(.83,.04)),False)

    # The opposite service side carries a canister air cleaner. A short duct
    # enters the head; the warm exhaust rises from the other side into a
    # silencer and turned outlet. Both remain silhouette forms at distance.
    generator.append(generator_cylinder([(-.5,.37,.37),(-.40,.5,.5),(.39,.5,.5),(.5,.39,.39)],12,(-.285,.194,-.085),(.15,.15,.255),dark,(.63,.26)))
    generator_far.append(generator_cylinder([(-.5,.5,.5),(.5,.5,.5)],8,(-.285,.194,-.085),(.15,.15,.255),dark,(.63,.26)))
    generator_part(generator_pipe((-.285,.194,.045),(-.16,.194,.045),.024,black,(.86,.03)),False)
    generator.append(generator_pipe((.20,.115,-.005),(.25,.225,-.005),.021,dark,(.63,.56)))
    generator_far.append(generator_pipe((.20,.115,-.005),(.25,.225,-.005),.021,dark,(.63,.56),6))
    generator.append(generator_cylinder([(-.5,.34,.34),(-.37,.5,.5),(.37,.5,.5),(.5,.34,.34)],12,(.25,.322,-.005),(.102,.202,.102),steel,(.57,.67),'Y'))
    generator_far.append(generator_cylinder([(-.5,.5,.5),(.5,.5,.5)],8,(.25,.322,-.005),(.102,.202,.102),steel,(.57,.67),'Y'))
    for a,b in (((.25,.419,-.005),(.25,.476,-.005)),((.25,.476,-.005),(.25,.476,.074))):
        generator.append(generator_pipe(a,b,.021,dark,(.66,.57)))
        generator_far.append(generator_pipe(a,b,.021,dark,(.66,.57),6))
    generator_part(box((.25,.322,-.065),(.027,.10,.020),dark,(.66,.51)),False)
    publish('generator',generator,generator_far)

    # Recessed wall grilles, switchgear and luminaires expose cavities without
    # putting transparent surfaces in the world batches.
    vent=[box((0,0,.26),(.94,.91,.38),black,(.91,.10))]
    vent+=ring((0,0,-.34),(.99,.98,.28),steel,(.53,.49),.045)
    for i in range(9):vent.append(box((0,-.39+i*.097,-.365),(.87,.040,.18),(.47,.54,.50),(.57,.42)))
    publish('vent',vent,vent[:5]+vent[5::2])
    switchgear=[box((0,0,.045),(.90,.94,.87),(.59,.67,.64),(.60,.34)),
                box((0,0,-.416),(.83,.86,.032),(.76,.81,.75),(.53,.38))]
    switchgear+=ring((0,0,-.441),(.86,.89,.023),(.38,.44,.40),(.60,.48),.018)
    for x in (-.215,.215):
        switchgear.append(box((x,.15,-.456),(.218,.215,.025),dark,(.20,.01)))
        switchgear.append(box((x,.15,-.472),(.174,.171,.008),(.27,.47,.41),(.17,.02)))
        for y in (-.10,-.24):switchgear.append((sphere(10,5),(x,y,-.466),(.048,.048,.026),(.35,.47,.29),(.34,.18)))
    switchgear.append(box((.33,-.045,-.470),(.036,.125,.028),steel,(.34,.81)))
    for y in (-.34,.34):switchgear.append(box((-.438,y,-.372),(.035,.06,.11),steel,(.40,.72)))
    publish('switchgear',switchgear,switchgear[:8])
    publish('utility_cabinet',switchgear,switchgear[:8])
    fixture=[box((0,.15,0),(.96,.64,.85),steel,(.48,.60)),
             box((0,-.22,0),(.79,.10,.69),(.96,.96,.85),(.38,0))]
    for x in (-.42,.42):fixture.append(box((x,-.24,0),(.029,.20,.77),dark,(.48,.56)))
    for z in (-.23,0,.23):fixture.append(box((0,-.278,z),(.85,.034,.023),steel,(.44,.64)))
    publish('light_fixture',fixture,fixture[:4])

    # Riveted Pratt roof truss: open structural web and real flange profiles.
    truss=[]
    for y in (-.438,.438):
        truss.extend([box((0,y,0),(1,.045,.18),steel,(.52,.54)),
                      box((0,y,0),(1,.10,.024),(.48,.54,.52),(.57,.45))])
    for i in range(6):
        x=-.475+i*.158
        truss.append(rod((x,-.405,0),(x,.405,0),.015,steel))
        truss.append(rod((x,-.405,0),(min(.475,x+.158),.405,0),.018,steel))
    publish('roof_truss',truss,truss[:4]+truss[5::2])

    # Armoured service door and constructional portal. A real gap is retained
    # through doorway_surround; surface placement need not block an entry.
    portal=[box((-.45,0,0),(.1,1,.96),(.95,.97,.94),(.90,.02)),
            box((.45,0,0),(.1,1,.96),(.95,.97,.94),(.90,.02)),
            box((0,.44,0),(.8,.12,.96),(.95,.97,.94),(.90,.02))]
    for name in ('doorway_surround','door_portal'):publish(name,portal,portal)
    aperture=[box((-.45,0,0),(.1,1,.88),(.95,.97,.94),(.90,.02)),
              box((.45,0,0),(.1,1,.88),(.95,.97,.94),(.90,.02)),
              box((0,-.44,0),(.8,.12,.88),(.95,.97,.94),(.90,.02)),
              box((0,.44,0),(.8,.12,.88),(.95,.97,.94),(.90,.02))]
    for x in (-.45,.45):
        for y in (-.40,.40):aperture.append(fastener((x,y,-.448),radius=.013))
    publish('aperture_frame',aperture,aperture[:4])
    door=[box((0,0,.04),(.97,.97,.82),(.42,.49,.46),(.56,.51))]
    door+=ring((0,0,-.403),(.91,.91,.11),(.27,.33,.31),(.49,.62),.033)
    door.append(box((0,.247,-.427),(.43,.244,.058),black,(.16,.03)))
    door.append(box((0,.247,-.465),(.35,.168,.014),glass,(.13,.04)))
    for y in (-.30,0,.30):door.append(box((-.465,y,-.22),(.045,.078,.41),steel,(.42,.72)))
    door.append(rod((.325,-.08,-.457),(.325,.07,-.457),.013,steel))
    door.append(box((.325,-.005,-.456),(.048,.21,.023),dark,(.56,.53)))
    publish('security_door',door,door[:7])

    shutter=[box((0,0,.39),(.98,.98,.14),black,(.83,.12))]
    shutter+=ring((0,0,-.25),(1,1,.49),steel,(.56,.49),.045)
    for i in range(15):
        y=-.42+i*.060
        shutter.append(box((0,y,-.31),(.9,.055,.10),(.64,.69,.65),(.54,.51)))
        shutter.append(box((0,y-.024,-.366),(.87,.009,.014),(.40,.47,.43),(.59,.37)))
    publish('loading_shutter',shutter,shutter[:5]+shutter[5::2])
    window=[box((0,0,.34),(.94,.94,.22),black,(.88,0))]
    window+=ring((0,0,-.18),(1,1,.64),(.75,.79,.73),(.87,.05),.088)
    window+=ring((0,0,-.32),(.82,.82,.17),steel,(.45,.65),.026)
    window.append(box((0,0,-.245),(.757,.758,.012),glass,(.13,.04)))
    for x in (-.135,.135):window.append(box((x,0,-.413),(.018,.77,.059),steel,(.45,.65)))
    window.append(box((0,0,-.413),(.77,.018,.059),steel,(.45,.65)))
    for name in ('blast_window','window_reveal'):publish(name,window,window[:10])

    # Open cable support and insulated pipe racks. Small rails remain geometric
    # but their numerous fixings disappear in the far mesh.
    tray=[box((0,-.36,0),(1,.06,.88),steel,(.61,.51))]
    for z in (-.445,.445):tray.append(box((0,-.035,z),(1,.68,.054),steel,(.61,.51)))
    for z in (-.235,0,.235):tray.append(rod((-.48,-.245,z),(.48,-.245,z),.025,dark,(.82,.13)))
    for i in range(7):tray.append(box((-.45+i*.15,-.415,0),(.024,.11,.95),(.40,.46,.43),(.58,.64)))
    publish('cable_tray',tray,tray[:6])
    rack=[]
    for x in (-.40,.40):
        rack.append(box((x,0,.24),(.08,.94,.09),steel,(.52,.63)))
        rack.append(box((x,-.443,.06),(.20,.10,.75),dark,(.70,.45)))
    for y in (-.27,0,.28):
        rack.append(rod((-.492,y,-.075),(.492,y,-.075),.105,steel,(.51,.60)))
        for x in (-.40,.40):rack.append(box((x,y,-.09),(.05,.245,.26),(.35,.42,.40),(.58,.61)))
    publish('pipe_rack',rack,rack[:7])
    duct=[box((0,0,0),(1,.83,.83),(.74,.78,.76),(.57,.45))]
    for x in (-.45,0,.45):
        duct.append(box((x,0,0),(.030,.95,.95),steel,(.45,.68)))
        for y in (-.417,.417):duct.append(box((x,y,0),(.070,.027,.92),(.36,.42,.39),(.57,.57)))
    publish('duct_run',duct,duct[:4])
    drain=[box((0,-.13,0),(1,.73,1),dark,(.92,.17))]
    for z in (-.46,.46):drain.append(box((0,.38,z),(1,.10,.08),steel,(.64,.57)))
    for i in range(12):drain.append(box((-.454+i*.0825,.42,0),(.032,.10,.84),(.49,.53,.50),(.69,.58)))
    publish('drain_channel',drain,drain[:3]+drain[3::2])

    # HVAC has axial fan blades under steel grille, intake louvers and service
    # handles. Raised fans are genuine native parts rather than drawn circles.
    hvac=[box((0,-.048,0),(.94,.80,.91),(.76,.81,.75),(.61,.43)),
          box((0,-.453,0),(.97,.086,.96),dark,(.70,.49)),
          box((0,.372,0),(.99,.055,.99),steel,(.51,.62))]
    for x in (-.237,.237):
        hvac.append((lathe([(-.5,.47,.47),(.5,.47,.47)],20),(x,.415,0),(.43,.033,.66),black,(.72,.35)))
        hvac.append(tube((x,.441,0),(.44,.04,.68),steel,(.47,.68)))
        for i in range(6):
            angle=i*math.tau/6
            blade=box((0,0,0),(.046,.017,.214),(.47,.54,.5),(.54,.62))
            blade=rotate_piece(blade,angle)
            hvac.append((blade[0],(x+math.sin(angle)*.045,.43,math.cos(angle)*.065),blade[2],blade[3],blade[4]))
        for z in (-.20,-.1,0,.1,.2):hvac.append(box((x,.475,z),(.36,.012,.014),steel,(.45,.69)))
    for sign in (-1,1):
        for i in range(8):hvac.append(box((0,-.30+i*.076,sign*.462),(.81,.029,.022),(.39,.46,.42),(.61,.43)))
    publish('rooftop_hvac',hvac,hvac[:5]+hvac[5:7])
    publish('cooling_fan',hvac,hvac[:5]+hvac[5:7])
    publish('hvac',hvac,hvac[:5]+hvac[5:7])

    # Debris uses irregular triangulated slabs, broken aggregate and exposed
    # reinforcing steel. Deliberately few large fragments provide readable
    # damage instead of distributing hundreds of generic pebbles.
    rubble=[]
    fragments=[([(-.42,-.42),(-.12,-.47),(-.08,-.30),(-.30,-.21),(-.45,-.28)],-.26,.13),
               ([(.05,-.29),(.40,-.37),(.45,-.16),(.27,.05),(.11,-.06)],-.34,.08),
               ([(-.19,.03),(.08,-.02),(.30,.27),(-.03,.38),(-.23,.22)],-.28,-.01),
               ([(-.46,.17),(-.28,.06),(-.12,.25),(-.36,.47)],-.37,-.12)]
    rot=Matrix.Rotation(math.pi/2,3,'X')
    for i,(points,a,b) in enumerate(fragments):
        g=extrusion(points,a,b);g=([rot@q for q in g[0]],g[1])
        rubble.append((g,(0,0,0),(1,1,1),(.77+i*.025,.75+i*.024,.66+i*.025),(.98,0)))
    for a,b in (((-.31,-.10,-.16),(.24,.19,.23)),((-.10,.14,.31),(.35,.24,.08))):
        rubble.append(rod(a,b,.009,rust,(.85,.23)))
    publish('rubble_cluster',rubble,rubble[:4])

    stairs=[]
    for i in range(8):
        height=(i+1)/8
        stairs.append(box((0,-.5+height*.5,-.5+(i+.5)/8),(.95,height,.123),(.75,.79,.73),(.89,.03)))
        stairs.append(box((0,-.5+height-.008,-.5+(i+.08)/8),(.95,.016,.02),(.51,.57,.52),(.72,.19)))
    publish('stair_flight',stairs,stairs[::2])

    # Automotive shell is constructed from profiled bonnet, raked glazing,
    # tapered body panels, open wheel wells, segmented tyres and hub hardware.
    # Correct wheel orientation and separate sill/bonnet shapes are essential
    # to keep the vehicle from reading as a soft cube.
    van=[];wheels=[]
    chassis=profile([(-.5,.36,.085),(-.445,.43,.11),(.41,.43,.11),(.48,.37,.09)],axis=2)
    van.append((chassis,(0,-.228,0),(1,.8,1),dark,(.55,.60)))
    bonnet=profile([(-.5,.39,.07),(-.37,.43,.10),(.5,.43,.12)],axis=2)
    van.append((bonnet,(0,-.066,-.342),(1,1,.307),(.74,.76,.67),(.53,.40)))
    roof=profile([(-.5,.358,.016),(-.36,.39,.03),(.38,.40,.03),(.5,.366,.024)],axis=2)
    van.append((roof,(0,.426,.073),(1,1,.70),(.76,.79,.71),(.56,.34)))
    # Raked windscreen: authored quadrilateral has depth, not upright glazing.
    windshield=extrusion([(-.354,.064),(.354,.064),(.332,.398),(-.332,.398)],-.005,.005)
    glass_v=[Vector((q.x,q.y,-.339+q.y*.17+q.z)) for q in windshield[0]]
    van.append(((glass_v,windshield[1]),(0,0,0),(1,1,1),(.19,.31,.33),(.14,.03)))
    for sign in (-1,1):
        # The upper body is narrow; the cargo lower side is a continuous panel
        # with native chamfered corners and an access seam.
        van.append(box((sign*.409,-.074,.149),(.055,.279,.529),(.73,.78,.69),(.59,.32)))
        van.append(box((sign*.391,.263,.199),(.052,.30,.43),(.74,.79,.70),(.59,.32)))
        van.append(box((sign*.391,.257,-.065),(.027,.279,.276),(.20,.31,.33),(.15,.02)))
        for z in (-.208,.09,.411):
            van.append(box((sign*.405,.255,z),(.033,.347,.023),(.66,.72,.63),(.54,.39)))
        van.append(box((sign*.43,-.019,-.061),(.017,.018,.296),(.36,.43,.37),(.54,.42)))
        van.append(box((sign*.438,.06,.035),(.024,.024,.064),steel,(.36,.81)))
        # Mirrors use a slender stalk and a profiled housing.
        van.append(rod((sign*.414,.201,-.163),(sign*.477,.214,-.178),.008,black))
        van.append(box((sign*.477,.218,-.18),(.038,.083,.094),dark,(.52,.37),True))
        for z in (-.318,.306):
            # Wheel axis is X. Tread strips are actual segmented geometry.
            tyre=lathe([(-.5,.34,.34),(-.36,.47,.47),(-.18,.5,.5),(.18,.5,.5),(.36,.47,.47),(.5,.34,.34)],20)
            rot=Matrix.Rotation(math.pi/2,3,'Z');tyre=([rot@q for q in tyre[0]],tyre[1])
            van.append((tyre,(sign*.43,-.303,z),(.13,.334,.248),(.14,.16,.14),(.96,0)))
            hub=lathe([(-.5,.48,.48),(.26,.49,.49),(.5,.27,.27)],16)
            hub=([rot@q for q in hub[0]],hub[1])
            van.append((hub,(sign*.487,-.303,z),(.014,.186,.139),steel,(.39,.85)))
            for i in range(5):
                a=i*math.tau/5
                van.append((sphere(6,3),(sign*.495,-.303+math.sin(a)*.049,z+math.cos(a)*.037),(.008,.011,.011),(.39,.44,.40),(.35,.83)))
            # Large shaped quarter fender rises above the tyre and terminates
            # before the sill, so the wheel well remains visibly open.
            fender=[]
            for i in range(8):
                a=.08+i/7*(math.pi-.16)
                fender.append(Vector((sign*.455,-.303+math.sin(a)*.193,z+math.cos(a)*.139)))
                fender.append(Vector((sign*.442,-.303+math.sin(a)*.220,z+math.cos(a)*.164)))
            tris=[]
            for i in range(7):tris.extend(((i*2,i*2+1,i*2+3),(i*2,i*2+3,i*2+2)))
            if sign<0:tris=[(a,c,b) for a,b,c in tris]
            van.append(((fender,tris),(0,0,0),(1,1,1),(.54,.61,.52),(.61,.25)))
            wheels.extend(van[-8:])
    for z in (-.476,.476):van.append(box((0,-.23,z),(.92,.082,.045),dark,(.49,.61)))
    van.append(box((0,-.081,-.487),(.45,.122,.023),black,(.48,.45)))
    for i in range(4):van.append(box((0,-.12+i*.029,-.494),(.414,.011,.01),steel,(.45,.65)))
    for x in (-.304,.304):
        van.append(box((x,-.061,-.493),(.143,.077,.013),(.85,.84,.68),(.22,.08)))
        van.append(box((x,-.095,.482),(.056,.163,.017),(.46,.16,.10),(.25,.01)))
    van.append(box((0,.102,.455),(.74,.566,.056),(.65,.72,.62),(.57,.33)))
    van.append(box((0,.233,.489),(.65,.20,.012),(.20,.31,.31),(.16,.02)))
    van.append(box((0,.023,.487),(.011,.36,.009),dark,(.65,.30)))
    far=[q for q in van if max(q[2])>.1 and q not in wheels]
    far += [q for q in wheels if max(q[2])>.1]
    publish('utility_van',van,far)

    # Civilian saloon uses the same properly constructed running gear, with
    # its own three-box body, sloped passenger cell and tapered bonnet/boot.
    sedan=[van[0]]
    lower=profile([(-.5,.35,.075),(-.41,.44,.13),(-.23,.45,.15),
                   (.25,.45,.15),(.43,.43,.12),(.5,.34,.08)],axis=2)
    sedan.append((lower,(0,-.155,0),(1,1,.98),(.66,.70,.67),(.52,.43)))
    sedan.append(box((0,-.265,0),(.76,.11,.87),dark,(.64,.42)))
    for sign in (-1,1):
        glazing=extrusion([(-.216,.08),(-.105,.397),(.183,.397),(.291,.082)],sign*.361,sign*.374)
        g=([Vector((q.z,q.y,q.x)) for q in glazing[0]],[(a,c,b) for a,b,c in glazing[1]])
        if sign<0:g=(g[0],[(a,c,b) for a,b,c in g[1]])
        sedan.append((g,(0,0,0),(1,1,1),(.18,.29,.31),(.15,.03)))
        sedan.append(rod((sign*.365,.08,-.216),(sign*.353,.404,-.105),.013,steel))
        sedan.append(rod((sign*.354,.404,.183),(sign*.365,.082,.291),.013,steel))
        sedan.append(rod((sign*.370,.072,.04),(sign*.361,.411,.04),.011,dark))
        sedan.append(rod((sign*.377,.064,-.223),(sign*.377,.064,.298),.009,steel))
        sedan.append(box((sign*.448,-.105,.023),(.012,.16,.006),(.36,.42,.39),(.56,.35)))
        for z in (-.096,.181):sedan.append(box((sign*.452,-.067,z),(.013,.018,.056),steel,(.39,.79)))
        sedan.append(rod((sign*.380,.155,-.185),(sign*.457,.156,-.212),.009,dark))
        sedan.append(box((sign*.467,.163,-.212),(.045,.069,.071),dark,(.50,.37),True))
    sedan.append(box((0,.417,.044),(.735,.049,.310),(.68,.73,.69),(.53,.43),True))
    for rear in (False,True):
        g=extrusion([(-.347,.087),(.347,.087),(.329,.393),(-.329,.393)],-.006,.006)
        v=[Vector((q.x,q.y,(.294-(q.y-.087)*.35 if rear else -.227+(q.y-.087)*.385)+q.z)) for q in g[0]]
        if rear:g=(v,[(a,c,b) for a,b,c in g[1]])
        else:g=(v,g[1])
        sedan.append((g,(0,0,0),(1,1,1),(.18,.30,.32),(.14,.03)))
    sedan+=wheels
    for z in (-.480,.480):sedan.append(box((0,-.197,z),(.88,.073,.034),dark,(.49,.53)))
    sedan.append(box((0,-.096,-.486),(.426,.115,.014),black,(.47,.51)))
    for x in (-.295,.295):
        sedan.append(box((x,-.060,-.484),(.18,.074,.021),(.86,.85,.72),(.20,.10)))
        sedan.append(box((x,-.078,.483),(.162,.064,.018),(.48,.17,.13),(.21,.03)))
    sedan_far=[q for q in sedan if q not in wheels and max(q[2])>.1]
    sedan_far += [q for q in wheels if max(q[2])>.1]
    publish('vehicle_sedan',sedan,sedan_far)
    from blacksite_models import author_blacksite
    names += author_blacksite(api, helpers)
    return names
