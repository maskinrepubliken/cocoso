# Trana (Grus grus) as a 3dicons-style soft 3D icon, built and rendered in
# Blender from Python so the model is reproducible and adjustable.
#
#   blender -b -P docs/design/trana/trana.py -- --out out.png --size 2048 \
#       --samples 192 --blend docs/design/trana/trana.blend
#
# Coordinate system: the bird faces +X, +Y is the bird's left, +Z is up.
# The camera sits on the -Y side (bird's right), a little in front and above.
#
# Construction, all seam-free:
#   body + neck + head  one chain of skin vertices with varying radius,
#                       Skin modifier + Subdivision Surface, then vertex
#                       colours computed along the spine (grey body, lighter
#                       chest, black upper neck + head, white nape stripe,
#                       red crown).
#   wings               one quad grid per wing with the crane planform and
#                       a scalloped trailing edge that forms the primaries,
#                       Solidify (tapered via vertex group) + Subdivision.
#   tail                a small drooping fan built the same way, dark.
#   legs                skin chains with a knee and three toes.
#   beak, eyes          a long cone and two small spheres pushed into the head.

import math
import sys

import bpy
import bmesh
from mathutils import Matrix, Vector


# ---------------------------------------------------------------- arguments

def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    opts = {"out": "/tmp/trana.png", "size": 1024, "samples": 64,
            "blend": "", "device": "auto"}
    i = 0
    while i < len(argv):
        key = argv[i].lstrip("-")
        opts[key] = argv[i + 1]
        i += 2
    opts["size"] = int(opts["size"])
    opts["samples"] = int(opts["samples"])
    return opts


# ---------------------------------------------------------------- helpers

def srgb_to_linear(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hexcol(h):
    h = h.lstrip("#")
    return tuple(srgb_to_linear(int(h[i:i + 2], 16)) for i in (0, 2, 4))


def mix(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def smoothstep(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def new_object(name, mesh):
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def shade_smooth(mesh):
    mesh.polygons.foreach_set("use_smooth", [True] * len(mesh.polygons))


def clay_material(name, color=None, use_attr=False, roughness=0.55,
                  specular=0.25, subsurface=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Specular IOR Level"].default_value = specular
    if subsurface:
        bsdf.inputs["Subsurface Weight"].default_value = subsurface
        bsdf.inputs["Subsurface Radius"].default_value = (0.08, 0.06, 0.05)
    if use_attr:
        attr = nodes.new("ShaderNodeAttribute")
        attr.attribute_name = "Col"
        links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
        if subsurface:
            links.new(attr.outputs["Color"], bsdf.inputs["Subsurface Radius"]) if False else None
    elif color is not None:
        bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    return mat


def set_vertex_colors(mesh, colors):
    attr = mesh.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    for i, c in enumerate(colors):
        attr.data[i].color = (*c, 1.0)


def evaluate_to_mesh(obj, name):
    """Apply all modifiers and return a fresh object holding the result."""
    deps = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(deps)
    mesh = bpy.data.meshes.new_from_object(ev)
    mesh.name = name
    new = new_object(name, mesh)
    new.matrix_world = obj.matrix_world.copy()
    bpy.data.objects.remove(obj)
    shade_smooth(mesh)
    return new


# ---------------------------------------------------------------- skin chains

def skin_chain(name, points, radii, branches=(), branch_smooth=0.6,
               subdiv=3):
    """Points: list of (x, y, z). radii: per point. branches: list of
    (parent_index, [(point, radius), ...]) chains hanging off a point."""
    mesh = bpy.data.meshes.new(name)
    verts = [Vector(p) for p in points]
    edges = [(i, i + 1) for i in range(len(points) - 1)]
    rads = list(radii)
    for parent, chain in branches:
        prev = parent
        for p, r in chain:
            verts.append(Vector(p))
            rads.append(r)
            edges.append((prev, len(verts) - 1))
            prev = len(verts) - 1
    mesh.from_pydata(verts, edges, [])
    obj = new_object(name, mesh)
    skin = obj.modifiers.new("Skin", "SKIN")
    skin.use_smooth_shade = True
    skin.branch_smoothing = branch_smooth
    for i, r in enumerate(rads):
        sv = mesh.skin_vertices[0].data[i]
        sv.radius = (r, r)
        sv.use_root = i == 0
    sub = obj.modifiers.new("Subdivision", "SUBSURF")
    sub.levels = subdiv
    sub.render_levels = subdiv
    return obj


# ---------------------------------------------------------------- the bird

# Spine of the body, tail end first, up through the chest, the S of the
# neck, and the head. Radii give the volume; the skin modifier blends them.
SPINE = [
    ((-0.52, 0, -0.01), 0.08),    # tail root
    ((-0.40, 0, 0.01), 0.16),
    ((-0.22, 0, 0.05), 0.22),
    ((-0.02, 0, 0.09), 0.245),    # belly / back
    ((0.16, 0, 0.14), 0.23),      # chest
    ((0.30, 0, 0.24), 0.175),     # chest top
    ((0.38, 0, 0.38), 0.115),     # neck base
    ((0.42, 0, 0.53), 0.095),
    ((0.41, 0, 0.68), 0.088),
    ((0.37, 0, 0.84), 0.085),     # S: back
    ((0.38, 0, 0.98), 0.085),
    ((0.46, 0, 1.10), 0.088),
    ((0.57, 0, 1.20), 0.098),     # head back
    ((0.66, 0, 1.26), 0.105),     # head
    ((0.74, 0, 1.305), 0.080),    # head front, into the beak
    ((0.79, 0, 1.335), 0.045),
]

HEAD = Vector((0.66, 0, 1.26))
BEAK_DIR = Vector((math.cos(math.radians(32)), 0, math.sin(math.radians(32))))

COL_BODY = hexcol("#C6BDAE")
COL_BODY_LIGHT = hexcol("#DED6CA")
COL_BODY_DARK = hexcol("#B5AC9D")
COL_BLACK = hexcol("#262527")
COL_FEATHER = hexcol("#2B2A2A")
COL_WHITE = hexcol("#F2EFEA")
COL_RED = hexcol("#C8302A")
COL_BEAK = hexcol("#7D7A5A")
COL_LEG = hexcol("#2E2D2D")


def spine_param(p):
    """Project p onto the spine polyline. Returns (fraction 0..1 tail→head,
    projected point, radius there)."""
    pts = [Vector(s[0]) for s in SPINE]
    rad = [s[1] for s in SPINE]
    lengths = [0.0]
    for a, b in zip(pts, pts[1:]):
        lengths.append(lengths[-1] + (b - a).length)
    total = lengths[-1]
    best = None
    for i, (a, b) in enumerate(zip(pts, pts[1:])):
        ab = b - a
        t = max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared))
        q = a + ab * t
        d = (p - q).length
        if best is None or d < best[0]:
            u = (lengths[i] + ab.length * t) / total
            r = rad[i] + (rad[i + 1] - rad[i]) * t
            best = (d, u, q, r)
    return best[1], best[2], best[3]


def body_color(p):
    u, q, r = spine_param(p)
    off = p - q
    d = off.normalized() if off.length > 1e-6 else Vector((0, 0, 1))

    # Grey plumage, a little lighter on the chest and belly, darker on the back
    front = smoothstep(-0.2, 0.8, d.x * 0.6 - d.z * 0.8)
    col = mix(COL_BODY, COL_BODY_LIGHT, front * smoothstep(0.45, 0.2, u) * 1.0)
    back = smoothstep(0.3, 1.0, d.z) * smoothstep(0.35, 0.15, u)
    col = mix(col, COL_BODY_DARK, back * 0.6)

    # Black upper neck and head
    black = smoothstep(0.80, 0.90, q.z)
    col = mix(col, COL_BLACK, black)

    # White stripe from behind the eye down the nape
    behind = smoothstep(0.15, 0.55, -d.x - d.z * 0.35)
    band = smoothstep(0.88, 0.96, q.z) * smoothstep(1.30, 1.22, q.z)
    stripe = black * behind * band * smoothstep(0.7, 0.35, abs(d.z))
    col = mix(col, COL_WHITE, stripe)

    # Red crown on top of the head
    local = p - HEAD
    crown = smoothstep(0.14, 0.095, (local - Vector((0.02, 0, 0.0))).length) \
        * smoothstep(0.35, 0.65, d.z) * smoothstep(1.28, 1.31, p.z)
    col = mix(col, COL_RED, crown)
    return col


def build_body():
    pts = [s[0] for s in SPINE]
    rad = [s[1] for s in SPINE]
    obj = skin_chain("BodySkin", pts, rad, subdiv=3)
    obj = evaluate_to_mesh(obj, "Body")
    mesh = obj.data
    cols = [body_color(v.co) for v in mesh.vertices]
    set_vertex_colors(mesh, cols)
    obj.data.materials.append(
        clay_material("Plumage", use_attr=True, roughness=0.6, specular=0.2,
                      subsurface=0.05))
    return obj


def build_beak():
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=24,
                          radius1=0.052, radius2=0.006, depth=0.38)
    mesh = bpy.data.meshes.new("Beak")
    bm.to_mesh(mesh)
    bm.free()
    shade_smooth(mesh)
    obj = new_object("Beak", mesh)
    base = Vector((0.74, 0, 1.305))
    centre = base + BEAK_DIR * 0.15
    obj.matrix_world = Matrix.Translation(centre) @ \
        BEAK_DIR.to_track_quat("Z", "Y").to_matrix().to_4x4()
    sub = obj.modifiers.new("Subdivision", "SUBSURF")
    sub.levels = 2
    sub.render_levels = 2
    obj.data.materials.append(
        clay_material("Beak", COL_BEAK, roughness=0.5, specular=0.3))
    return obj


def build_eyes():
    objs = []
    mat = clay_material("Eye", hexcol("#1A1612"), roughness=0.25, specular=0.6)
    for side in (1, -1):
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=16, radius=0.024)
        mesh = bpy.data.meshes.new("Eye")
        bm.to_mesh(mesh)
        bm.free()
        shade_smooth(mesh)
        obj = new_object("Eye", mesh)
        obj.location = HEAD + Vector((0.04, side * 0.094, 0.014))
        obj.data.materials.append(mat)
        objs.append(obj)
    return objs


def wing_grid(span, root_chord, n_span=96, n_chord=14, fingers=6,
              finger_depth=0.80, droop=0.0, camber=0.05, arch=0.0, color=True):
    """A wing in local space: root at the origin, span along +Y, leading
    edge towards +X, upper side +Z. Returns (verts, faces, weights, colors).

    Planform of a crane wing: broad and rounded, the leading edge sweeps
    gently back, the chord narrows past the wrist (s ~ 0.6) and the hand ends
    in fanned, pointed primaries made by scalloping the trailing edge."""
    verts, weights, colors = [], [], []
    for i in range(n_span + 1):
        s = i / n_span
        hand = smoothstep(0.55, 1.0, s)
        shoulder = 1.0 - 0.45 * max(0.0, 1.0 - s / 0.12) ** 2   # rounded root
        le = root_chord * 0.40 * shoulder + 0.10 * span * math.sin(math.pi * s) ** 1.5 \
            - 0.06 * span * s - 0.26 * span * hand ** 1.6
        chord = root_chord * (1.0 - 0.10 * s) * (1.0 - 0.50 * hand ** 1.4)
        # Primaries: the trailing edge is scalloped between finger centre
        # lines, so each finger is part of the same surface. The middle
        # fingers are longest, so the tips describe a fan.
        fs = smoothstep(0.56, 0.70, s)
        phase = ((s - 0.56) / 0.44) * fingers
        tri = abs((phase % 1.0) * 2 - 1)            # 1 on finger centre lines
        notch = smoothstep(0.0, 1.0, 1 - tri) * finger_depth * fs * (0.35 + 0.65 * s)
        chord *= (1.0 - notch)
        chord *= 0.3 + 0.7 * smoothstep(1.0, 0.985, s)   # pinch the very tip
        te = le - chord
        for j in range(n_chord + 1):
            u = j / n_chord
            x = te + chord * u
            y = span * s
            z = -camber * 4 * u * (1 - u) * (1 - 0.4 * s) \
                - droop * max(0.0, s - 0.55) ** 2 * 4.0 - arch * s * s
            verts.append(Vector((x, y, z)))
            weights.append((1 - s) ** 1.2 * (0.3 + 0.7 * (1 - abs(2 * u - 1))))
            if color:
                black = smoothstep(0.60, 0.80, s) * smoothstep(0.75, 0.20, u) \
                    + smoothstep(0.80, 0.92, s)
                black = min(1.0, black)
                c = mix(mix(COL_BODY, COL_BODY_DARK, 0.35 * (1 - u)), COL_FEATHER, black)
                colors.append(c)
    faces = []
    for i in range(n_span):
        for j in range(n_chord):
            a = i * (n_chord + 1) + j
            faces.append((a, a + 1, a + n_chord + 2, a + n_chord + 1))
    return verts, faces, weights, colors


def mesh_object(name, verts, faces, weights=None, colors=None, thickness=0.055,
                min_thick=0.15, subdiv=3):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    shade_smooth(mesh)
    obj = new_object(name, mesh)
    if colors:
        set_vertex_colors(mesh, colors)
    if weights:
        vg = obj.vertex_groups.new(name="thick")
        for i, w in enumerate(weights):
            vg.add([i], w, "REPLACE")
    sol = obj.modifiers.new("Solidify", "SOLIDIFY")
    sol.thickness = thickness
    sol.offset = 0.0
    sol.use_even_offset = True
    if weights:
        sol.vertex_group = "thick"
        sol.thickness_vertex_group = min_thick
    sub = obj.modifiers.new("Subdivision", "SUBSURF")
    sub.levels = min(2, subdiv)
    sub.render_levels = subdiv
    return obj


def wing_matrix(origin, span_dir, normal_hint, mirrored):
    """Place a wing built in local space (span +Y, leading edge +X, top +Z)
    so that its span points along span_dir and its top faces normal_hint."""
    sp = Vector(span_dir).normalized()
    n = Vector(normal_hint)
    n = (n - sp * n.dot(sp)).normalized()
    c = n.cross(sp) if mirrored else sp.cross(n)
    m = Matrix.Identity(4)
    for row in range(3):
        m[row][0] = c[row]
        m[row][1] = sp[row]
        m[row][2] = n[row]
        m[row][3] = origin[row]
    return m


def build_wings():
    mat = clay_material("Wing", use_attr=True, roughness=0.6, specular=0.2,
                        subsurface=0.03)
    span = 1.20
    root_chord = 0.56

    # Far wing (bird's left, +Y): lifted high and back, primaries fanned.
    v, f, w, c = wing_grid(span, root_chord, droop=-0.08, camber=0.06)
    far = mesh_object("WingFar", v, f, w, c)
    far.matrix_world = wing_matrix((0.06, 0.04, 0.22), (-0.35, 0.30, 0.90),
                                   (-0.25, -0.90, 0.10), mirrored=False)
    far.data.materials.append(mat)

    # Near wing (bird's right, -Y): spread forward and down towards the
    # viewer, so its upper side shows.
    v, f, w, c = wing_grid(span, root_chord, droop=0.10, camber=0.06, arch=0.12)
    near = mesh_object("WingNear", v, f, w, c)
    near.matrix_world = wing_matrix((0.06, 0.00, 0.10), (0.74, -0.28, -0.58),
                                    (-0.15, -0.80, 0.55), mirrored=True)
    near.data.materials.append(mat)
    return [far, near]


def build_tail():
    """Short dark drooping plume behind the body, built as a small fan."""
    verts, faces, weights, colors = [], [], [], []
    n_a, n_r = 40, 8
    a0, a1 = math.radians(-26), math.radians(26)
    fingers = 5
    for i in range(n_a + 1):
        t = i / n_a
        ang = a0 + (a1 - a0) * t
        tri = abs(((t * fingers) % 1.0) * 2 - 1)
        rmax = 0.46 - 0.08 * (1 - tri) ** 1.5 - 0.06 * abs(2 * t - 1) ** 2
        for j in range(n_r + 1):
            u = j / n_r
            r = rmax * u
            x = -r * math.cos(ang)
            y = r * math.sin(ang)
            z = 0.0
            verts.append(Vector((x, y, z)))
            weights.append((1 - u) ** 1.2)
            colors.append(mix(COL_BODY_DARK, COL_FEATHER, smoothstep(0.15, 0.5, u)))
    for i in range(n_a):
        for j in range(n_r):
            a = i * (n_r + 1) + j
            faces.append((a, a + 1, a + n_r + 2, a + n_r + 1))
    obj = mesh_object("Tail", verts, faces, weights, colors, thickness=0.12,
                      min_thick=0.2)
    obj.matrix_world = Matrix.Translation(Vector((-0.38, 0, 0.04))) @ \
        Matrix.Rotation(math.radians(-30), 4, "Y") @ \
        Matrix.Rotation(math.radians(90), 4, "X")
    obj.data.materials.append(
        clay_material("Tail", use_attr=True, roughness=0.6, specular=0.2))
    return obj


def build_legs():
    mat = clay_material("Leg", COL_LEG, roughness=0.55, specular=0.2)
    objs = []
    for side in (1, -1):
        dx = 0.06 if side < 0 else -0.04   # near leg a touch forward
        hip = (-0.12 + dx * 0.3, side * 0.10, -0.02)
        thigh = (-0.22 + dx, side * 0.12, -0.18)
        knee = (-0.35 + dx * 1.6, side * 0.13, -0.36)
        foot = (-0.56 + dx * 2.2, side * 0.14, -0.66)
        kx, ky, kz = knee
        above = ((thigh[0] + kx) / 2, (thigh[1] + ky) / 2, (thigh[2] + kz) / 2)
        below = (kx + (foot[0] - kx) * 0.25, ky + (foot[1] - ky) * 0.25,
                 kz + (foot[2] - kz) * 0.25)
        pts = [hip, thigh, above, knee, below, foot]
        rad = [0.09, 0.058, 0.040, 0.046, 0.036, 0.035]
        toes = []
        leg_dir = (Vector(foot) - Vector(knee)).normalized()
        for ang, ln in ((-30, 0.15), (0, 0.19), (30, 0.15)):
            d = Matrix.Rotation(math.radians(ang), 3, "Y") @ leg_dir
            tip = Vector(foot) + d * ln + Vector((0, side * 0.012 * abs(ang) / 30, 0))
            toes.append((5, [((tip.x, tip.y, tip.z), 0.027)]))
        obj = skin_chain("Leg", pts, rad, branches=toes, branch_smooth=0.4, subdiv=3)
        obj.data.materials.append(mat)
        objs.append(obj)
    return objs


# ---------------------------------------------------------------- camera & light

def build_camera(scene, objects, roll_deg=-5.0, elev_deg=12.0, azim_deg=16.0,
                 focal=55.0, margin=0.40):
    cam_data = bpy.data.cameras.new("Camera")
    cam_data.lens = focal
    cam_data.sensor_fit = "AUTO"
    cam = new_object("Camera", cam_data)
    scene.camera = cam

    az, el = math.radians(azim_deg), math.radians(elev_deg)
    direction = Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el),
                        math.sin(el)))
    target = Vector((0.1, 0, 0.45))
    dist = 5.0

    deps = bpy.context.evaluated_depsgraph_get()
    corners = []
    for obj in objects:
        ev = obj.evaluated_get(deps)
        mw = obj.matrix_world
        for v in ev.data.vertices:
            corners.append(mw @ v.co)

    from bpy_extras.object_utils import world_to_camera_view
    for _ in range(6):
        cam.location = target + direction * dist
        quat = direction.to_track_quat("Z", "Y")
        roll = Matrix.Rotation(math.radians(roll_deg), 4, "Z")
        cam.matrix_world = Matrix.Translation(cam.location) @ \
            quat.to_matrix().to_4x4() @ roll
        bpy.context.view_layer.update()
        xs, ys = [], []
        for c in corners:
            p = world_to_camera_view(scene, cam, c)
            xs.append(p.x)
            ys.append(p.y)
        cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
        print("fit: dist %.2f x %.2f..%.2f y %.2f..%.2f" % (dist, min(xs), max(xs), min(ys), max(ys)))
        extent = max(max(xs) - min(xs), max(ys) - min(ys)) / 2
        dist *= extent / margin
        # Shift the frame so the silhouette is centred.
        cam_data.shift_x += (cx - 0.5) * 0.0  # keep: recentre via target instead
        right = cam.matrix_world.to_3x3() @ Vector((1, 0, 0))
        up = cam.matrix_world.to_3x3() @ Vector((0, 1, 0))
        half_w = dist * math.tan(0.5 * 2 * math.atan(cam_data.sensor_width / (2 * focal)))
        target += right * (cx - 0.5) * 2 * half_w + up * (cy - 0.5) * 2 * half_w
    return cam


def build_lights(scene):
    def area(name, loc, target, energy, color, size):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.color = color
        data.size = size
        data.shape = "DISK"
        obj = new_object(name, data)
        obj.location = Vector(loc)
        d = (Vector(target) - obj.location).normalized()
        obj.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        return obj

    t = (0.1, 0, 0.45)
    area("Key", (2.2, -3.2, 3.6), t, 720, (1.0, 0.93, 0.84), 3.5)
    area("Fill", (3.5, 2.6, 1.2), t, 260, (0.86, 0.91, 1.0), 4.0)
    area("Rim", (-3.5, 1.8, 2.6), t, 500, (1.0, 0.90, 0.78), 2.5)
    area("Under", (0.5, -2.0, -3.0), t, 90, (0.95, 0.95, 1.0), 4.0)

    world = bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (0.9, 0.9, 0.92, 1.0)
    bg.inputs["Strength"].default_value = 0.35


def setup_render(scene, opts):
    scene.render.engine = "CYCLES"
    scene.cycles.samples = opts["samples"]
    scene.cycles.use_denoising = True
    scene.cycles.denoiser = "OPENIMAGEDENOISE"
    scene.cycles.use_adaptive_sampling = True
    scene.render.film_transparent = True
    scene.render.resolution_x = opts["size"]
    scene.render.resolution_y = opts["size"]
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.filepath = opts["out"]
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = -0.12
    scene.view_settings.gamma = 1.0

    if opts["device"] in ("auto", "gpu"):
        try:
            prefs = bpy.context.preferences.addons["cycles"].preferences
            prefs.compute_device_type = "METAL"
            prefs.get_devices()
            for d in prefs.devices:
                d.use = True
            scene.cycles.device = "GPU"
            print("Cycles: using Metal GPU")
        except Exception as exc:  # noqa: BLE001
            print("Cycles: GPU not available, using CPU:", exc)
            scene.cycles.device = "CPU"
    else:
        scene.cycles.device = "CPU"


# ---------------------------------------------------------------- main

def main():
    opts = parse_args()
    clear_scene()
    scene = bpy.context.scene

    objects = []
    objects.append(build_body())
    objects.append(build_beak())
    objects += build_eyes()
    objects += build_wings()
    objects.append(build_tail())
    objects += build_legs()

    build_lights(scene)
    setup_render(scene, opts)
    build_camera(scene, objects)

    if opts["blend"]:
        bpy.ops.wm.save_as_mainfile(filepath=opts["blend"])
    bpy.ops.render.render(write_still=True)
    print("Wrote", opts["out"])


if __name__ == "__main__":
    main()
