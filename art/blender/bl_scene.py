# Dựng cảnh làng miền Tây chất lượng cao từ bộ mô hình có sẵn (Z lên, mặt trước -Y)
import bpy, bmesh, math, random
from mathutils import Vector, Euler

SRC = {o.name: o for o in bpy.data.objects if o.type == 'MESH' and 'mats' in o}
for o in SRC.values(): o.hide_render = True; o.hide_viewport = True
rnd = random.Random(7)
coll = bpy.data.collections.get('Canh') or bpy.data.collections.new('Canh')
if coll.name not in bpy.context.scene.collection.children: bpy.context.scene.collection.children.link(coll)
for o in list(coll.objects): bpy.data.objects.remove(o, do_unlink=True)

def put(name, x, y, z=0.0, rot=0.0, s=1.0):
    o = SRC[name].copy(); o.name = name + '_c'; coll.objects.link(o)
    o.hide_render = False; o.hide_viewport = False
    o.location = (x, y, z); o.rotation_euler = (0, 0, math.radians(rot)); o.scale = (s, s, s)
    return o

# ---------- Vật liệu có vân ----------
def principled(m):
    return next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')

def textured(matname, kind, scale=5.0, strength=0.4, dark=0.55):
    m = bpy.data.materials.get('mt_' + matname)
    if not m: return
    nt = m.node_tree; b = principled(m); base = Vector(b.inputs['Base Color'].default_value[:])
    for n in list(nt.nodes):
        if n.name.startswith('x_'): nt.nodes.remove(n)
    tc = nt.nodes.new('ShaderNodeTexCoord'); tc.name = 'x_tc'
    mp = nt.nodes.new('ShaderNodeMapping'); mp.name = 'x_mp'; mp.inputs['Scale'].default_value = (scale, scale, scale)
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
    if kind == 'brick':
        t = nt.nodes.new('ShaderNodeTexBrick'); t.inputs['Mortar Size'].default_value = 0.03; t.inputs['Brick Width'].default_value = 0.5; t.inputs['Row Height'].default_value = 0.25
        t.inputs['Color1'].default_value = (base.x, base.y, base.z, 1); t.inputs['Color2'].default_value = (base.x * dark, base.y * dark, base.z * dark, 1); t.inputs['Mortar'].default_value = (base.x * .4, base.y * .4, base.z * .4, 1)
        col, fac = t.outputs['Color'], t.outputs['Fac']
    else:
        if kind == 'bands':
            t = nt.nodes.new('ShaderNodeTexWave'); t.wave_type = 'BANDS'; t.inputs['Distortion'].default_value = 6; t.inputs['Detail'].default_value = 3; t.inputs['Scale'].default_value = 1.0
        else:
            t = nt.nodes.new('ShaderNodeTexNoise'); t.inputs['Detail'].default_value = 8; t.inputs['Scale'].default_value = 1.0
        t.name = 'x_t'
        nt.links.new(mp.outputs['Vector'], t.inputs['Vector'])
        ramp = nt.nodes.new('ShaderNodeValToRGB'); ramp.name = 'x_r'
        ramp.color_ramp.elements[0].color = (base.x * dark, base.y * dark, base.z * dark, 1); ramp.color_ramp.elements[1].color = (base.x, base.y, base.z, 1)
        nt.links.new(t.outputs['Fac'], ramp.inputs['Fac']); col, fac = ramp.outputs['Color'], t.outputs['Fac']
    if kind == 'brick': nt.links.new(mp.outputs['Vector'], t.inputs['Vector'])
    t.name = 'x_t'
    nt.links.new(col, b.inputs['Base Color'])
    bm = nt.nodes.new('ShaderNodeBump'); bm.name = 'x_b'; bm.inputs['Strength'].default_value = strength; bm.inputs['Distance'].default_value = 0.03
    nt.links.new(fac, bm.inputs['Height']); nt.links.new(bm.outputs['Normal'], b.inputs['Normal'])

for n in ('la_dua', 'la_dua_kho', 'rom', 'rom_toi'): textured(n, 'bands', 55, 0.6, 0.55)
for n in ('go_nau', 'go_toi', 'go_sang', 'go_cu'): textured(n, 'bands', 9, 0.35, 0.6)
for n in ('tre', 'tre_xanh'): textured(n, 'bands', 14, 0.25, 0.75)
textured('ngoi_do', 'brick', 3.2, 0.7, 0.8); textured('ngoi_do_toi', 'brick', 3.2, 0.7, 0.8)
for n in ('tuong_vang', 'tuong_kem', 'tuong_la', 'xi_mang', 'dat', 'bun'): textured(n, 'noise', 14, 0.25, 0.8)
for n in ('la_xanh', 'luc_binh', 'la_non', 'lua_xanh', 'lua_chin'): textured(n, 'noise', 22, 0.2, 0.78)
for n in ('trau', 'trau_toi'): textured(n, 'noise', 30, 0.3, 0.7)
for m in bpy.data.materials:
    if m.name.startswith('mt_') and m.use_nodes:
        b = principled(m); b.inputs['Roughness'].default_value = 0.72
        for k in ('Specular IOR Level', 'Specular'):
            if k in b.inputs: b.inputs[k].default_value = 0.25
b = principled(bpy.data.materials['mt_trau']); b.inputs['Roughness'].default_value = 0.45

# nước + đất + cỏ
def disc(name, r, z, matc, rough, segs=64, ell=(1, 1)):
    bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=True, segments=segs, radius=r, matrix=__import__('mathutils').Matrix.Diagonal((ell[0], ell[1], 1, 1)))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); coll.objects.link(ob); ob.location = (0, 0, z)
    m = bpy.data.materials.new('v_' + name); m.use_nodes = True; bs = principled(m); bs.inputs['Base Color'].default_value = matc; bs.inputs['Roughness'].default_value = rough
    me.materials.append(m); return ob, m
# nền cỏ
g, gm = disc('co', 60, 0, (0.18, 0.4, 0.1, 1), 0.9, 96)
nt = gm.node_tree; bs = principled(gm); tc = nt.nodes.new('ShaderNodeTexCoord'); n1 = nt.nodes.new('ShaderNodeTexNoise'); n1.inputs['Scale'].default_value = 0.35; n1.inputs['Detail'].default_value = 6
n2 = nt.nodes.new('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = 40; n2.inputs['Detail'].default_value = 10
rp = nt.nodes.new('ShaderNodeValToRGB'); rp.color_ramp.elements[0].color = (0.12, 0.3, 0.06, 1); rp.color_ramp.elements[1].color = (0.4, 0.55, 0.14, 1)
nt.links.new(tc.outputs['Object'], n1.inputs['Vector']); nt.links.new(tc.outputs['Object'], n2.inputs['Vector']); nt.links.new(n1.outputs['Fac'], rp.inputs['Fac']); nt.links.new(rp.outputs['Color'], bs.inputs['Base Color'])
bmp = nt.nodes.new('ShaderNodeBump'); bmp.inputs['Strength'].default_value = 0.5; bmp.inputs['Distance'].default_value = 0.05; nt.links.new(n2.outputs['Fac'], bmp.inputs['Height']); nt.links.new(bmp.outputs['Normal'], bs.inputs['Normal'])
# ao
mud, _ = disc('bun_ao', 8.4, 0.02, (0.33, 0.24, 0.14, 1), 0.95, 64, (1.0, 0.8))
wat, wm = disc('nuoc_ao', 7.6, 0.06, (0.06, 0.22, 0.28, 1), 0.04, 64, (1.0, 0.8))
for o in (mud, wat): o.location = (7, 7, o.location.z)
nt = wm.node_tree; bs = principled(wm); bs.inputs['Base Color'].default_value = (0.08, 0.3, 0.34, 1)
for k in ('Specular IOR Level', 'Specular'):
    if k in bs.inputs: bs.inputs[k].default_value = 0.9
tc = nt.nodes.new('ShaderNodeTexCoord'); wv = nt.nodes.new('ShaderNodeTexNoise'); wv.inputs['Scale'].default_value = 3.0; wv.inputs['Detail'].default_value = 4; wv.inputs['Roughness'].default_value = 0.6
nt.links.new(tc.outputs['Object'], wv.inputs['Vector']); bm2 = nt.nodes.new('ShaderNodeBump'); bm2.inputs['Strength'].default_value = 0.08; bm2.inputs['Distance'].default_value = 0.05
nt.links.new(wv.outputs['Fac'], bm2.inputs['Height']); nt.links.new(bm2.outputs['Normal'], bs.inputs['Normal'])

# ---------- Bố cục ----------
put('nha2', -7, 4, 0, 25, 1.25)
put('quay_cho', -2.2, -3.2, 0, -12, 1.15)
put('vong', -10.5, -1.6, 0, 70)
put('gian_bau', -12.2, 3.2, 0, 90, 1.1)
put('player_body', -4.6, -1.6, 0.4, 40); [put('player_leg', -4.6 + dx * 0.0, -1.6, 0.4, 40) for dx in (0,)]
put('ben_tre', 0.6, 5.5, 0, 0, 1.2)
put('xuong', 3.4, 11.2, 0.1, -25, 1.3)
put('ghe_cho', 11.5, 4.0, 0.1, 8, 1.35)
for x, y, r, s in [(5, 9, 10, 1.4), (8, 11, 80, 1.2), (12, 10.5, 30, 1.5), (3, 7.2, 40, 1.0), (10, 6.5, 120, 1.3), (6.5, 4.6, 0, 1.1)]: put('luc_binh', x, y, 0.07, r, s)
for i, (x, y) in enumerate([(-0.6, 9.5), (0.2, 12), (15.2, 6.5), (16, 9.5), (4.5, 15.5), (11, 15.2), (13.5, 12.8), (-1.5, 5.2)]): put('dua_nuoc', x, y, 0, rnd.uniform(0, 360), rnd.uniform(1.1, 1.5))
for x, y in [(15.5, 12.5), (7, 17.5), (-2.5, 14.5), (17.5, 2.2)]: put('ban', x, y, 0, rnd.uniform(0, 360), rnd.uniform(1.3, 1.7))
put('trau', -14, -5, 0, 35, 1.25); put('choi', 18, -6.5, 0, -30, 1.3)
for gx in range(14):
    for gy in range(7):
        put('lua_xanh', 8 + gx * 0.85 + rnd.uniform(-.15, .15), -13 + gy * 0.85 + rnd.uniform(-.15, .15), 0, rnd.uniform(0, 360), rnd.uniform(1.4, 1.9))

# bevel cho mọi vật (trừ lúa) để cạnh bắt sáng
for o in coll.objects:
    if o.type == 'MESH' and 'mats' in o and not o.name.startswith('lua'):
        mod = o.modifiers.new('bv', 'BEVEL'); mod.width = 0.018; mod.segments = 2; mod.limit_method = 'ANGLE'
print('objects', len(coll.objects))

# ---------- Trời, nắng, máy ảnh ----------
sc = bpy.context.scene
w = sc.world or bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True
nt = w.node_tree; nt.nodes.clear()
sky = nt.nodes.new('ShaderNodeTexSky')
for t in ('MULTIPLE_SCATTERING', 'NISHITA', 'SINGLE_SCATTERING'):
    try: sky.sky_type = t; break
    except Exception: pass
sky.sun_elevation = math.radians(18); sky.sun_rotation = math.radians(210)
for k, v in (('air_density', 1.2), ('aerosol_density', 1.5), ('dust_density', 2.0)):
    try: setattr(sky, k, v)
    except Exception: pass
bg = nt.nodes.new('ShaderNodeBackground'); bg.inputs['Strength'].default_value = 1.0; out = nt.nodes.new('ShaderNodeOutputWorld')
nt.links.new(sky.outputs['Color'], bg.inputs['Color']); nt.links.new(bg.outputs['Background'], out.inputs['Surface'])
for l in [o for o in bpy.data.objects if o.type == 'LIGHT']: bpy.data.objects.remove(l, do_unlink=True)
ld = bpy.data.lights.new('Sun', 'SUN'); ld.energy = 5.0; ld.angle = math.radians(1.2); ld.color = (1.0, 0.86, 0.68)
sun = bpy.data.objects.new('Sun', ld); bpy.context.scene.collection.objects.link(sun)
sun.rotation_euler = (math.radians(68), 0, math.radians(215))
print('ok')
