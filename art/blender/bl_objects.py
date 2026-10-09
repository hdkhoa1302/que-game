# Vật thể khai thác (cây, đá, cỏ, sinh vật ven sông): dựng chi tiết theo đặc điểm thật, bake AO. Chạy: blender -b --python bl_objects.py
# Gốc mỗi mô hình ở (0,0,0), mặt đất z=0. Mỗi tên o_<kind> khớp OBJ trong src/data.js; dua_nuoc là dừa nước.
import os, sys
exec(open('/private/tmp/claude-501/-Users-dangkhoahuynh-workplace-green/74cf7ad4-82b0-4bff-abab-5ac56d20dbe5/scratchpad/bl_helpers2.py').read())
import math as _m
PAL.update({'tre_non': 0xa9c24f, 'tre_gia': 0x7f8f3a, 'tre_dot': 0x56622a, 'set': 0xb8744a, 'set_toi': 0x8a5a3a, 'lau_hoa': 0xe9e4d4,
            'cuoi': 0x9a9a92, 'reu': 0x6f8f45, 'oc_vo': 0xd9c79a, 'oc_toi': 0x6b5a3a, 'dien_hoa': 0xf6c823, 'dua_qua': 0x6a4a22,
            'dua_than': 0x8a6a44, 'qua_do': 0xd8332a})
OUT = os.environ.get('OBJ_OUT', '/tmp/objs.json')
clear_all()
V = Vector
R = lambda seed: random.Random(seed)

def d3(th, a):
    th, a = _m.radians(th), _m.radians(a)
    return V((_m.sin(th) * _m.cos(a), _m.sin(th) * _m.sin(a), _m.cos(th)))

def chain(b, col, base, a, tilts, lens, r0, r1, seg=5, node=None, nr=1.3):
    """thân nhiều đoạn, mỗi đoạn nghiêng thêm; node = vòng đốt. Trả về điểm đầu ngọn."""
    p, n = V(base), len(tilts)
    for i, (th, L) in enumerate(zip(tilts, lens)):
        d = d3(th, a); ra = r0 + (r1 - r0) * i / n; rb = r0 + (r1 - r0) * (i + 1) / n
        b.cyl(col, p + d * (L / 2), ra, rb, L, seg, (0, th, a)); p = p + d * L
        if node and i < n - 1: b.cyl(node, p, rb * nr, rb * nr, 0.035, seg, (0, th, a))
    return p

def frond(b, col, base, a, L, rise, droop, width, seg=5, serr=0.6):
    """lá kép dạng dải: ra xa L, vươn lên rise, cong rủ droop; mép răng cưa (lá chét) bằng xen kẽ bề rộng."""
    dx, dy = _m.cos(_m.radians(a)), _m.sin(_m.radians(a)); px, py = -dy, dx
    rows = []
    for i in range(seg + 1):
        t = i / seg; o = L * t; z = base[2] + rise * t - droop * t * t
        w = width * (1 - t) ** 0.55 * (1 if i % 2 == 0 else serr) * 0.5
        c = V((base[0] + dx * o, base[1] + dy * o, z)); rows.append((c - V((px, py, 0)) * w, c + V((0, 0, 0.01)), c + V((px, py, 0)) * w))
    n = len(b.bm.faces)
    vv = [[b.bm.verts.new(p) for p in r] for r in rows]; v2 = [[b.bm.verts.new(p - V((0, 0, 0.008))) for p in r] for r in rows]
    for i in range(seg):
        for u, v in ((0, 1), (1, 2)):
            b.bm.faces.new((vv[i][u], vv[i + 1][u], vv[i + 1][v], vv[i][v]))
            b.bm.faces.new((v2[i][v], v2[i + 1][v], v2[i + 1][u], v2[i][u]))
    b._fin(n, col); return b

M = []
def put(b, name_x):
    ob = b.done((name_x, 0, 0)); M.append(ob); return ob

# ---- cây gỗ (cây ăn trái/ bóng mát): thân sần, rễ nổi, tán gồ ghề ----
b = S('o_tree', 55); rr = R(1)
chain(b, 'go_cu', (0, 0, 0), 20, [0, 5, -7], [0.8, 0.7, 0.6], 0.22, 0.11, 6)
for k in range(4):
    a = k * 90 + 25; d = d3(112, a); b.cone('go_toi', V((_m.cos(_m.radians(a)) * 0.17, _m.sin(_m.radians(a)) * 0.17, 0.2)) + d * 0.16, 0.1, 0.34, 5, (0, 112, a))
b.cyl('go_cu', (0.3, 0.1, 1.9), 0.07, 0.09, 0.9, 5, (0, 38, 20)); b.cyl('go_cu', (-0.3, -0.1, 1.85), 0.06, 0.08, 0.8, 5, (0, -40, 20))
for i, (x, y, z, r) in enumerate([(0, 0, 2.95, 1.1), (0.85, 0.25, 2.5, 0.8), (-0.8, -0.3, 2.6, 0.85), (0.1, -0.85, 2.4, 0.65), (-0.3, 0.75, 2.75, 0.7), (0.15, 0.1, 3.55, 0.65)][:5]):
    b.lumpy('la_xanh', (x, y, z), r, 2, 0.2, 10 + i, 0.78, 'la_non')
put(b, 0)

# ---- dừa (cây dừa): thân cong, đốt vòng, tán lá kép rủ, buồng dừa ----
b = S('o_palm', 60); rr = R(2)
top = chain(b, 'dua_than', (0, 0, 0), 200, [2, 6, 10, 14, 18], [0.5] * 5, 0.14, 0.08, 6, 'go_toi', 1.2)
b.cone('dua_than', (0.0, 0.0, 0.1), 0.19, 0.3, 6)
for i in range(7):
    a = i * 51 + rr.uniform(-10, 10); frond(b, 'la_xanh' if i % 2 else 'la_dua', top, a, 1.9 + rr.uniform(-0.2, 0.25), 0.7 + rr.uniform(0, 0.3), 1.5 + rr.uniform(0, 0.3), 0.5, 6, 0.6)
for k in range(3): b.cone('la_non', top + V((_m.cos(k * 2.1) * 0.05, _m.sin(k * 2.1) * 0.05, 0.02)), 0.06, 0.65, 4, (_m.degrees(_m.sin(k * 2.1)) * 0.25, _m.degrees(-_m.cos(k * 2.1)) * 0.25, 0))
for k in range(4): b.ball('dua_qua', top + V((_m.cos(k * 1.57 + 0.5) * 0.17, _m.sin(k * 1.57 + 0.5) * 0.17, -0.18)), (0.1, 0.1, 0.11), 6, 4)
frond(b, 'la_dua_kho', top, 120, 1.3, 0.1, 1.5, 0.3, 4, 0.6)
put(b, 5)

# ---- bụi tre lớn: nhiều thân cong ngả ra ngoài, đốt, lá rủ ở ngọn, lá rụng quanh gốc ----
b = S('o_bamboo', 0); rr = R(3)
b.cyl('rom_toi', (0, 0, 0.012), 0.78, 0.78, 0.025, 9)
for i in range(7):
    a = i * 51 + rr.uniform(-12, 12); r = 0.1 + rr.random() * 0.14; base = (_m.cos(_m.radians(a)) * r, _m.sin(_m.radians(a)) * r, 0)
    t0 = 3 + rr.random() * 3
    top = chain(b, 'tre_non' if i % 3 == 0 else 'tre_gia', base, a, [t0, t0 + 5 + rr.random() * 3, t0 + 11 + rr.random() * 5], [1.1, 1.1 + rr.random() * 0.3, 0.95], 0.062, 0.034, 5, 'tre_dot', 1.45)
    for j in range(3):
        aj = a + j * 120 + rr.uniform(-20, 20); d = d3(98 + rr.uniform(-8, 8), aj)
        b.cone('la_dua' if j % 2 else 'la_xanh', top + d * 0.38, 0.15, 0.85, 3, (0, 98, aj))
    b.cone('la_non', top + V((0, 0, 0.18)), 0.09, 0.38, 3)
put(b, 10)

# ---- đá: ba tảng gồ ghề có rêu phía trên ----
b = S('o_rock', 40)
b.lumpy('xam', (0, 0, 0.36), 0.55, 2, 0.22, 21, 0.72, 'reu'); b.lumpy('xam_toi', (0.52, 0.12, 0.2), 0.32, 2, 0.2, 22, 0.7)
b.lumpy('xam', (-0.42, -0.28, 0.17), 0.28, 2, 0.22, 23, 0.68, 'reu'); b.lumpy('cuoi', (0.2, -0.5, 0.08), 0.15, 1, 0.2, 24, 0.7)
put(b, 15)

# ---- cỏ rơm: bụi lá dài cong, bông hạt ----
b = S('o_grass', 0); rr = R(5)
for i in range(16):
    a = i * 22.5 + rr.uniform(-6, 6); r = 0.05 + rr.random() * 0.12; th = 14 + rr.random() * 16; d = d3(th, a); h = 0.7 + rr.random() * 0.35
    base = V((_m.cos(_m.radians(a)) * r, _m.sin(_m.radians(a)) * r, 0))
    b.cone('rom' if i % 3 else 'rom_toi', base + d * (h / 2), 0.045, h, 3, (0, th, a))
for i in range(4):
    a = i * 90 + 30; d = d3(18, a); b.cone('vang', V((_m.cos(_m.radians(a)) * 0.1, _m.sin(_m.radians(a)) * 0.1, 0)) + d * 0.88, 0.04, 0.2, 3, (0, 18, a))
put(b, 20)

# ---- lau sậy: thân mảnh cao, bông lau trắng, lá dài ----
b = S('o_reed', 0); rr = R(6)
for i in range(8):
    a = i * 45 + rr.uniform(-10, 10); r = 0.04 + rr.random() * 0.14; th = 3 + rr.random() * 7; d = d3(th, a); h = 1.5 + rr.random() * 0.7
    base = V((_m.cos(_m.radians(a)) * r, _m.sin(_m.radians(a)) * r, 0)); tip = base + d * h
    b.cyl('tre_xanh', base + d * (h / 2), 0.03, 0.017, h, 4, (0, th, a)); b.cone('lau_hoa', tip + d * 0.1, 0.075, 0.42, 4, (0, th, a))
for i in range(3): frond(b, 'la_xanh', (0, 0, 0.02), i * 120 + 20, 0.95, 0.45, 0.6, 0.12, 3, 0.8)
put(b, 25)

# ---- đất sét: gò ướt, hố đào nhỏ có nước ----
b = S('o_clay', 40)
b.lumpy('set', (0, 0, 0.1), 0.8, 2, 0.14, 31, 0.26); b.lumpy('set_toi', (0.35, 0.12, 0.13), 0.36, 2, 0.16, 32, 0.45); b.lumpy('set', (-0.38, -0.22, 0.1), 0.3, 2, 0.16, 33, 0.4)
b.cyl('nuoc', (-0.08, 0.3, 0.2), 0.2, 0.2, 0.02, 7)
put(b, 30)

# ---- ốc bươu: ba con, vỏ xoắn ----
b = S('o_snail', 30)
for i, (x, y, a) in enumerate([(0, 0, 20), (0.28, 0.15, 200), (-0.2, 0.22, 110)]):
    c, s = _m.cos(_m.radians(a)), _m.sin(_m.radians(a)); sc = 1 - 0.18 * i
    b.ball('oc_toi', (x + c * 0.1, y + s * 0.1, 0.04), (0.1 * sc, 0.07 * sc, 0.045 * sc), 5, 3)
    b.ball('oc_vo', (x - c * 0.03, y - s * 0.03, 0.1 * sc), (0.095 * sc, 0.095 * sc, 0.09 * sc), 5, 3)
    b.cone('oc_toi', (x - c * 0.03, y - s * 0.03, 0.17 * sc), 0.06 * sc, 0.1 * sc, 5)
put(b, 35)

# ---- bụi quả dại: bụi gồ ghề, quả đỏ ----
b = S('o_berry', 50); rr = R(8)
b.lumpy('la_xanh', (0, 0, 0.38), 0.55, 2, 0.22, 41, 0.75, 'la_non'); b.lumpy('la_xanh', (0.42, 0.1, 0.27), 0.34, 1, 0.2, 42, 0.8); b.lumpy('la_xanh', (-0.36, -0.12, 0.25), 0.32, 1, 0.2, 43, 0.8)
for i in range(8):
    u = rr.uniform(0, 6.283); w = rr.uniform(0.25, 0.95); rxy = 0.62 * (1 - w * w) ** 0.5
    b.ball('qua_do', (_m.cos(u) * rxy, _m.sin(u) * rxy * 0.9, 0.38 + 0.45 * w), (0.06, 0.06, 0.06), 5, 3)
put(b, 40)

# ---- điên điển: thân mảnh, lá kép nhỏ, chùm hoa vàng ----
b = S('o_dien', 0); rr = R(9)
for i in range(5):
    a = i * 72 + rr.uniform(-15, 15); r = 0.04 + rr.random() * 0.14; th = 4 + rr.random() * 9; d = d3(th, a); h = 0.95 + rr.random() * 0.4
    base = V((_m.cos(_m.radians(a)) * r, _m.sin(_m.radians(a)) * r, 0)); tip = base + d * h
    b.cyl('la_xanh', base + d * (h / 2), 0.022, 0.014, h, 4, (0, th, a))
    for k in range(2): b.cone('la_non', base + d * (h * (0.35 + 0.25 * k)) + V((_m.cos(_m.radians(a + 90)) * 0.07, _m.sin(_m.radians(a + 90)) * 0.07, 0)), 0.07, 0.34, 3, (0, 80, a + 90 + 180 * k))
    for k in range(2):
        o = V((_m.cos(k * 2.1 + a) * 0.07, _m.sin(k * 2.1 + a) * 0.07, -0.07 * k))
        b.ball('dien_hoa', tip + o, (0.085, 0.085, 0.075), 5, 3)
put(b, 45)

# ---- bông súng: lá tròn nổi, hoa hồng nhiều cánh ----
b = S('o_lily', 30)
for i, (x, y, r) in enumerate([(0.1, 0, 0.36), (-0.4, 0.3, 0.3), (0.38, -0.34, 0.27)]): b.cyl('luc_binh' if i % 2 == 0 else 'la_xanh', (x, y, 0.03), r, r, 0.03, 10)
for k in range(8):
    a = k * 45; d = d3(38, a); b.cone('sen_hong' if k % 2 else 'sen_trang', V((_m.cos(_m.radians(a)) * 0.04, _m.sin(_m.radians(a)) * 0.04, 0.05)) + d * 0.12 + V((0.1, 0, 0)), 0.065, 0.24, 4, (0, 38, a))
b.ball('vang', (0.1, 0, 0.12), (0.045, 0.045, 0.04), 5, 3)
put(b, 50)

# ---- cành khô: cành chính có chạc, lá khô ----
b = S('o_branch', 0)
b.cyl('go_nau', (0, 0, 0.07), 0.05, 0.03, 1.05, 5, (0, 90, 8)); b.cyl('go_toi', (0.18, 0.1, 0.1), 0.03, 0.015, 0.5, 4, (0, 90, 48)); b.cyl('go_toi', (-0.2, -0.08, 0.1), 0.028, 0.014, 0.42, 4, (0, 90, -35))
b.cyl('go_nau', (0.4, 0.06, 0.1), 0.02, 0.01, 0.3, 4, (0, 90, 40)); b.cone('la_dua_kho', (0.45, 0.2, 0.08), 0.07, 0.2, 3, (0, 90, 90)); b.cone('la_dua_kho', (-0.35, -0.26, 0.07), 0.06, 0.18, 3, (0, 90, -70))
put(b, 55)

# ---- đá cuội: năm viên tròn nhẵn ----
b = S('o_pebble', 45)
for i, (x, y, r, c) in enumerate([(0, 0, 0.15, 'cuoi'), (0.24, 0.1, 0.11, 'xam'), (-0.18, 0.17, 0.1, 'xam_toi'), (0.06, -0.22, 0.09, 'cuoi'), (-0.25, -0.12, 0.07, 'xam')]):
    b.lumpy(c, (x, y, r * 0.55), r, 1, 0.12, 50 + i, 0.65)
put(b, 60)

# ---- cỏ dại: túm lá, vài hoa trắng ----
b = S('o_weed', 0); rr = R(11)
for i in range(8):
    a = i * 45 + rr.uniform(-8, 8); th = 18 + rr.random() * 22; d = d3(th, a); h = 0.38 + rr.random() * 0.2; r = 0.04 + rr.random() * 0.06
    b.cone('la_xanh' if i % 2 else 'la_non', V((_m.cos(_m.radians(a)) * r, _m.sin(_m.radians(a)) * r, 0)) + d * (h / 2), 0.05, h, 3, (0, th, a))
for i in range(2): b.ball('trang', (_m.cos(i * 3.4) * 0.13, _m.sin(i * 3.4) * 0.13, 0.4 + i * 0.07), (0.035, 0.035, 0.03), 4, 3)
put(b, 65)

# ---- dừa nước: bụi lá kép dựng đứng, cuống cong, buồng quả tròn sát gốc ----
b = S('dua_nuoc', 60); rr = R(4)
for i in range(8):
    a = i * 45 + rr.uniform(-8, 8); frond(b, 'la_xanh' if i % 3 else 'la_dua', (_m.cos(_m.radians(a)) * 0.12, _m.sin(_m.radians(a)) * 0.12, 0.1), a, 0.9 + rr.uniform(0, 0.5), 2.0 + rr.uniform(-0.1, 0.5), 0.55 + rr.uniform(0, 0.4), 0.3, 5, 0.55)
b.ball('go_nau', (0, 0, 0.16), (0.25, 0.25, 0.2), 8, 5); b.ball('dua_qua', (0.1, 0.05, 0.4), (0.22, 0.22, 0.22), 8, 5)
for k in range(5): b.cone('rom_toi', (_m.cos(k * 0.785) * 0.2 + 0.1, _m.sin(k * 0.785) * 0.2 + 0.05, 0.42), 0.035, 0.1, 3)
put(b, 70)

report = export2(M, OUT, ground={o.name for o in M})
print('TRIS', report, sum(report.values()))
if os.environ.get('LINEUP'):
    import bpy
    sc = bpy.context.scene
    for i, o in enumerate(M): o.location = (i % 8 * 3.4, -(i // 8) * 4.2, 0)
    cx, cy = 3.4 * 3.5, -2.1
    bpy.ops.mesh.primitive_plane_add(size=120, location=(cx, cy, 0)); g = bpy.context.object; gm = bpy.data.materials.new('g'); gm.use_nodes = True
    next(n for n in gm.node_tree.nodes if n.type == 'BSDF_PRINCIPLED').inputs['Base Color'].default_value = (0.2, 0.34, 0.14, 1); g.data.materials.append(gm)
    bpy.ops.object.light_add(type='SUN', location=(0, -10, 20), rotation=(_m.radians(50), 0, _m.radians(30))); bpy.context.object.data.energy = 3.2
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND').inputs['Color'].default_value = (0.75, 0.88, 0.98, 1)
    bpy.ops.object.camera_add(location=(cx, cy - 30, 24), rotation=(_m.radians(52), 0, 0)); cam = bpy.context.object; cam.data.type = 'ORTHO'; cam.data.ortho_scale = 29; sc.camera = cam
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 24; sc.render.resolution_x = 1800; sc.render.resolution_y = 800
    sc.render.filepath = os.environ['LINEUP']; bpy.ops.render.render(write_still=True)
