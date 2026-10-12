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
    return ['blacksite_hall_roof','blacksite_hall_cladding','blacksite_service_apron','blacksite_service_approach']
