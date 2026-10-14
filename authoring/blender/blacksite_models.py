"""Original site-specific turbine-hall architecture and loading apron.

The hall roof is deliberately visible from the player-height approach. Broad
cladding, a gable, inset ventilation and a weathered loading surface establish
the building's construction; existing openings and collision stay untouched.
"""
import math
from mathutils import Vector
from mathutils.geometry import tessellate_polygon


def author_blacksite(api, helpers):
    model = helpers['model']; box = helpers['box']
    from environment_models import extrusion as raw_extrusion
    def extrusion(points, front, back):
        # Mirrored roof outlines reverse winding. Normalize before extruding
        # so both visible slopes keep outward normals and shadow correctly.
        area=sum(x0*y1-x1*y0 for (x0,y0),(x1,y1) in zip(points,points[1:]+points[:1]))
        return raw_extrusion(points if area>0 else list(reversed(points)), front, back)
    pale = (.82, .85, .80); zinc = (.47, .54, .55)
    trim = (.32, .40, .41); shadow = (.12, .17, .17)

    # A front/rear gable, two continuous roof slopes and an actual inset louvre
    # bank. All detail remains inside the unit envelope. Runtime scales this
    # to 34.9 x 2.15 x 23.2 m, entirely above the authoritative flat hall roof.
    roof = []; far = []
    for sign in (-1, 1):
        points = [(0, .468), (sign*.496, -.436), (sign*.496, -.479), (0, .425)]
        slope = (extrusion(points, -.497, .497), (0, 0, 0), (1, 1, 1), zinc, (.73, .42))
        roof.append(slope); far.append(slope)
        roof.append(box((sign*.491, -.452, 0), (.018, .065, .999), trim, (.70, .41)))
        # Standing seams follow the roof slope rather than float over it.
        for i in range(1, 9):
            x = sign*i*.054
            y = .468-abs(x)*1.822
            rib = (extrusion([(x-.0018, y+.012), (x+.0018, y+.012),
                              (x+.0018, y-.005), (x-.0018, y-.005)], -.497, .497),
                   (0, 0, 0), (1, 1, 1), (.55, .61, .61), (.68, .45))
            roof.append(rib)
    roof.append(box((0, .480, 0), (.024, .035, .999), (.59, .64, .64), (.64, .50)))
    far.append(roof[-1])
    for sign in (-1, 1):
        # Individual folded end sheets retain material variation without many
        # renderer instances. The central opening is real recessed topology.
        front, back = sign*.481, sign*.492
        if front > back: front, back = back, front
        for left, right in ((-.49, -.17), (.17, .49)):
            points = [(left, -.47), (right, -.47),
                      (right, .435-abs(right)*1.822), (left, .435-abs(left)*1.822)]
            panel = (extrusion(points, front, back), (0, 0, 0), (1, 1, 1), pale, (.86, .13))
            roof.append(panel); far.append(panel)
        for points in ([(-.17, -.47), (.17, -.47), (.17, -.33), (-.17, -.33)],
                       [(-.17, -.025), (.17, -.025), (.17, .125), (0, .435), (-.17, .125)]):
            panel = (extrusion(points, front, back), (0, 0, 0), (1, 1, 1), pale, (.85, .12))
            roof.append(panel); far.append(panel)
        roof.append(box((0, -.175, sign*.473), (.338, .305, .016), shadow, (.96, 0)))
        for x in (-.17, .17):
            roof.append(box((x, -.177, sign*.493), (.009, .325, .013), trim, (.69, .40)))
        for y in (-.32, -.025):
            roof.append(box((0, y, sign*.494), (.35, .013, .013), trim, (.68, .42)))
        for row in range(8):
            roof.append(box((0, -.302+row*.037, sign*.490), (.333, .020, .017), (.38, .46, .45), (.83, .24)))
        far.append(box((0, -.177, sign*.492), (.35, .325, .015), (.32, .40, .39), (.88, .13)))
        # Continuous weathered lower fascia meets the original concrete shell.
        roof.append(box((0, -.485, sign*.491), (.999, .030, .018), trim, (.82, .32)))
        far.append(roof[-1])
    model('blacksite_hall_roof', roof, far)

    # Coherent industrial upper wall treatment. Twelve wide folded sheets,
    # recessed joints and a dark lower drip edge replace the repeated precast
    # blocks above the windows. Colours are authored paint reflectance; the
    # metal PBR bake contributes restrained wear, not a second dark albedo.
    cladding = [box((0, 0, .18), (.998, .985, .55), shadow, (.96, 0))]
    cladding_far = []
    for i in range(12):
        x = -.455+i*.0827
        age = (0, .023, .009, .036, .016, .005, .029, .010, .020, .041, .012, .025)[i]
        colour = tuple(c-age for c in pale)
        panel = box((x, 0, -.095), (.0808, .970, .73), colour, (.84+age, .16))
        cladding.append(panel); cladding_far.append(panel)
        # A visibly broad formed sheet with two folds, not thin ruler stripes.
        for offset in (-.022, .022):
            cladding.append(box((x+offset, .0, -.475), (.0028, .965, .041), tuple(c-.05 for c in colour), (.82, .19)))
        cladding.append(box((x, -.391, -.466), (.0808, .173, .028), tuple(c-.09-age for c in colour), (.95, .05)))
    for y in (-.486, .486):
        band = box((0, y, -.454), (.999, .025, .080), trim, (.80, .32))
        cladding.append(band); cladding_far.append(band)
    model('blacksite_hall_cladding', cladding, cladding_far)

    # The hall is a designed, thick-walled construction rather than thirty-six
    # independent copies of the precast kit. Author in metres, then normalise
    # once for the runtime's exact wall transforms. Front is the yard face;
    # back is the factory interior. Every piece stays inside the old collider.
    def metric_box(position, size, colour, physical, dimensions, centre_y):
        position = (position[0]/dimensions[0],
                    (position[1]-centre_y)/dimensions[1],
                    position[2]/dimensions[2])
        size = tuple(value/dimensions[i] for i, value in enumerate(size))
        return box(position, size, colour, physical)

    for suffix, width, window_at in (('long',34.0,9.45), ('short',22.0,6.45)):
        dimensions = (width, 6.0, .4)
        near = []; distant = []
        def panel(x0, x1, y0, y1, z0, z1, colour, physical=(.9,0), detail=False):
            if x1-x0 < .0001 or y1-y0 < .0001: return
            piece = metric_box(((x0+x1)*.5,(y0+y1)*.5,(z0+z1)*.5),
                (x1-x0,y1-y0,z1-z0),colour,physical,dimensions,3.0)
            near.append(piece)
            if not detail: distant.append(piece)

        # Four full-height wings, two open window bays and an open loading
        # door. Their ranges come directly from combatRoom's authoritative
        # construction, including the 1.02/2.35 m window and 2.65 m door heads.
        wings = [(-width/2,-window_at-1.2),(-window_at+1.2,-1.9),
                 (1.9,window_at-1.2),(window_at+1.2,width/2)]
        ranges = [(left,right,0,6) for left,right in wings]
        ranges += [(side*window_at-1.2,side*window_at+1.2,0,1.02) for side in (-1,1)]
        ranges += [(side*window_at-1.2,side*window_at+1.2,2.35,6) for side in (-1,1)]
        ranges += [(-1.9,1.9,2.65,6)]
        for index,(left,right,bottom,top) in enumerate(ranges):
            # A solid, continuous core backs the recessed joints; no daylight
            # crack or new firing slit can open between individual panels.
            panel(left,right,bottom,top,-.145,.145,(.64,.67,.63),(.96,0))
            # Large low-contrast poured panels replace synchronized mottling.
            # Seams are actual shallow topology, not ruler lines on an atlas.
            cuts = sorted(set([bottom,top]+[y for y in (.34,1.04,3.18) if bottom<y<top]))
            count=max(1,math.ceil((right-left)/2.8))
            for bay in range(count):
                a=left+(right-left)*bay/count; b=left+(right-left)*(bay+1)/count
                seam_left=.004 if bay else 0; seam_right=.004 if bay<count-1 else 0
                for low,high in zip(cuts,cuts[1:]):
                    age=((index*3+bay*5)%7)*.006
                    exterior=(.72-age,.75-age,.71-age) if high<=.35 else (.89-age,.90-age,.85-age)
                    panel(a+seam_left,b-seam_right,low,high,-.188,-.145,exterior,detail=True)
                    # A durable blue-green dado, warm off-white upper walls
                    # and a dark plinth establish a readable interior hierarchy.
                    interior=(.29,.38,.36) if high<=.35 else (.46,.60,.57) if high<=1.05 else (.91-age*.5,.92-age*.5,.86-age*.5)
                    panel(a+seam_left,b-seam_right,low,high,.145,.188,interior,(.85,0),True)
            # The distant silhouette retains the same complete wall/openings
            # and broad paint bands, dropping the individual panel seams.
            for low,high in zip(cuts,cuts[1:]):
                exterior=(.70,.73,.69) if high<=.35 else (.87,.88,.83)
                interior=(.29,.38,.36) if high<=.35 else (.46,.60,.57) if high<=1.05 else (.90,.91,.85)
                for z0,z1,colour in ((-.188,-.145,exterior),(.145,.188,interior)):
                    distant.append(metric_box(((left+right)*.5,(low+high)*.5,(z0+z1)*.5),
                        (right-left,high-low,z1-z0),colour,(.88,0),dimensions,3.0))
            # The plinth and stripe stop at the physical edges of each opening.
            if bottom<.34:
                panel(left,right,.09,min(.24,top),.188,.195,(.25,.32,.31),(.83,.02))
            if bottom<1.04 and top>1.04:
                panel(left,right,1.04,min(1.10,top),.188,.193,(.70,.62,.39),(.77,.04))

        # Broad structural columns sit wholly on the four solid wall wings.
        # A continuous overhead ledger is above the tallest loading aperture.
        for left,right in wings:
            middle=(left+right)*.5
            panel(middle-.11,middle+.11,0,6,.10,.2,(.38,.46,.44),(.67,.22))
            panel(middle-.18,middle+.18,.04,.28,.075,.2,(.49,.55,.50),(.87,.04))
            # The exterior buttress reads as a cast construction joint; its
            # profile is bounded by existing solid-wall width and thickness.
            panel(middle-.095,middle+.095,.34,3.18,-.2,-.11,(.74,.78,.73),(.9,0))
        panel(-width/2,width/2,3.01,3.19,.115,.2,(.38,.46,.44),(.66,.25))
        panel(-width/2,width/2,5.82,6,.095,.2,(.39,.47,.45),(.65,.26))
        model('blacksite_hall_wall_'+suffix,near,distant)

    # One compact, merged structural roof replaces the black slab and seven
    # separately instanced service/truss pieces. Deep I sections and triangular
    # end haunches visibly carry the span. All geometry stays above 4.90 m.
    ceiling_dimensions=(34.6,1.4,22.6); ceiling=[]; ceiling_far=[]
    def overhead(position,size,colour,physical=(.76,.12),detail=False):
        piece=metric_box(position,size,colour,physical,ceiling_dimensions,5.6)
        ceiling.append(piece)
        if not detail: ceiling_far.append(piece)
    overhead((0,6.15,0),(34.6,.3,22.6),(.82,.85,.80),(.9,.02))
    # Wide soffit trays make the ceiling legible between structural members.
    for x in (-12.8,-6.4,0,6.4,12.8):
        overhead((x,5.975,0),(6.31,.045,21.5),(.88,.89,.83),(.87,.04))
    beam=(.40,.48,.47)
    for z in (-6.3,0,6.3):
        overhead((0,5.55,z),(33.6,.10,.43),beam,(.65,.28))
        overhead((0,5.91,z),(33.6,.09,.43),beam,(.65,.28))
        overhead((0,5.73,z),(33.6,.29,.065),(.50,.57,.55),(.70,.22))
        # Sloped knee plates form real silhouette changes beneath each beam,
        # rather than more thin rods suspended from an unsupported ceiling.
        for side in (-1,1):
            points=[(side*16.8,4.91),(side*14.5,5.49),(side*16.8,5.49)]
            geometry=extrusion(points,z-.15,z+.15)
            vertices=[Vector((q.x/34.6,(q.y-5.6)/1.4,q.z/22.6)) for q in geometry[0]]
            piece=((vertices,geometry[1]),(0,0,0),(1,1,1),beam,(.70,.22))
            ceiling.append(piece);ceiling_far.append(piece)
    for x in (-15.6,15.6):
        overhead((x,5.04,0),(.42,.12,21.55),(.43,.51,.49),(.66,.25))
        overhead((x,5.40,0),(.42,.09,21.55),(.43,.51,.49),(.66,.25))
        overhead((x,5.22,0),(.075,.26,21.55),(.51,.59,.55),(.71,.19))
        # Cable containment remains recognizable, with its costly repeated
        # rungs dropped from the distant mesh before the structural forms.
        overhead((x*.91,5.72,0),(.52,.065,20.8),(.57,.61,.55),(.75,.18))
        for side in (-1,1):
            overhead((x*.91+side*.25,5.80,0),(.025,.16,20.8),(.57,.61,.55),(.74,.20))
        for z in (-8,-4,0,4,8):
            overhead((x*.91,5.84,z),(.52,.035,.06),(.35,.41,.39),(.77,.16),True)
    model('blacksite_hall_ceiling',ceiling,ceiling_far)

    def ground_mesh(name, approach=False):
        """Poured slabs and feathered tyre sweeps in a single native batch."""
        vertices = []; triangles = []; colours = []; physical = []

        def patch(points, y, tint):
            start = len(vertices)
            polygon = [Vector((x, y, z)) for x, z in points]
            vertices.extend(polygon)
            per_vertex = tint if isinstance(tint[0], tuple) else [tint]*len(points)
            colours.extend(per_vertex); physical.extend([(.96, 0)]*len(points))
            lookup = {(p.x, p.z): i for i, p in enumerate(polygon)}
            for tri in tessellate_polygon([polygon]):
                ids = [q if isinstance(q, int) else lookup[(q.x, q.z)] for q in tri]
                a, b, c = ids
                if (polygon[b]-polygon[a]).cross(polygon[c]-polygon[a]).y < 0: b, c = c, b
                triangles.append((start+a, start+b, start+c))

        # Thin irregular perimeter exposes the original asphalt at damaged
        # corners. The joint gaps are backed by the dark mortar bed below.
        outline = [(-.496,-.496),(-.27,-.496),(-.265,-.489),(.26,-.489),(.266,-.497),
                   (.496,-.497),(.496,.20),(.488,.216),(.495,.49),(.18,.496),
                   (.167,.487),(-.29,.494),(-.496,.479)]
        patch(outline, 0, (.54,.57,.53))
        columns, rows = (3, 5) if approach else (6, 2)
        for row in range(rows):
            for column in range(columns):
                x0 = -.487+column*.974/columns; x1 = x0+.974/columns-.0018
                z0 = -.481+row*.962/rows; z1 = z0+.962/rows-.0018
                age = ((column*7+row*3)%9)*.004
                colour = (.95-age, .965-age, .929-age)
                patch([(x0,z0),(x1,z0),(x1,z1),(x0,z1)], .10, colour)
        # Two hand-shaped access sweeps: one arriving nearly straight, the
        # second turns in from the yard. Four rows feather each edge using
        # vertex reflectance, with no transparent decal or extra texture read.
        for side in (-1, 1):
            for segment in range(20):
                t0 = segment/20; t1 = (segment+1)/20
                def centre(t):
                    if approach: return side*.115+side*.055*(1-t)**2, -.48+t*.95
                    return (side*(.12+.30*(1-t)**2) if side<0 else .12+.22*(1-t)**3), -.48+t*.92
                x0,z0 = centre(t0); x1,z1 = centre(t1)
                width = .016 if approach else .008
                light = (.936,.951,.915)
                dark = (.71,.735,.705) if segment%4!=0 else (.80,.818,.784)
                for left,right,ca,cb in ((-width,-width*.48,light,dark),
                                         (-width*.48,width*.48,dark,dark),
                                         (width*.48,width,dark,light)):
                    patch([(x0+left,z0),(x1+left,z1),(x1+right,z1),(x0+right,z0)],
                          .20, (ca,ca,cb,cb))
        # Limited large cracks with chipped aggregate margins, chosen in the
        # actual loading path rather than scattered decorative rubble.
        crack = [(-.39,.20),(-.24,.182),(-.145,.212),(-.05,.20),(.065,.232)]
        for (x0,z0),(x1,z1) in zip(crack,crack[1:]):
            patch([(x0,z0-.001),(x1,z1-.001),(x1,z1+.001),(x0,z0+.001)], .30, (.45,.47,.43))
        for level in ('near', 'far'):
            api['object_mesh'](name+'__'+level, vertices, triangles, colours, physical=physical)

    ground_mesh('blacksite_service_apron')
    ground_mesh('blacksite_service_approach', True)
    return ['blacksite_hall_roof','blacksite_hall_cladding','blacksite_hall_wall_long',
            'blacksite_hall_wall_short','blacksite_hall_ceiling',
            'blacksite_service_apron','blacksite_service_approach']
