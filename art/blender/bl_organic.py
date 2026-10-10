import os
_DIR = os.path.dirname(os.path.abspath(__file__)) if '__file__' in globals() and not __file__.startswith('<') else os.path.join(os.getcwd(), 'art/blender')
exec(open(os.path.join(_DIR, 'bl_helpers2.py')).read())
import math as _m
def drop(*names):
    for n in names:
        o = bpy.data.objects.get(n)
        if o: bpy.data.objects.remove(o, do_unlink=True)
drop('trau', 'ban', 'dua_nuoc', 'luc_binh', 'player_body', 'player_leg', 'lua_xanh', 'lua_chin', 'xuong')
V2 = []
oy = 30
# ---------- Trâu: thân mềm ----------
b = S('trau', 55)
b.ball('trau', (0, 0.05, 0.86), (0.52, 1.0, 0.5), 14, 9)
b.ball('trau', (0, -0.55, 0.98), (0.5, 0.55, 0.5), 12, 8)
b.ball('trau', (0, 0.55, 0.9), (0.5, 0.5, 0.48), 12, 8)
b.ball('trau', (0, -0.92, 1.0), (0.3, 0.38, 0.3), 12, 8)
b.ball('trau_toi', (0, -1.18, 0.92), (0.27, 0.34, 0.26), 12, 8)
b.ball('mui', (0, -1.5, 0.82), (0.21, 0.17, 0.17), 10, 6)
for s in (-1, 1):
    for k in range(6):
        t = k / 5; x = s * (0.24 + 0.46 * t); z = 1.14 + 0.32 * _m.sin(t * 1.9) - 0.1 * t * t; y = -1.1 - 0.06 * t
        b.cyl('sung', (x, y, z), 0.075 * (1 - t) + 0.02, 0.07 * (1 - t) + 0.015, 0.2, 6, (0, s * (75 - 50 * t), 0))
    b.ball('trau', (s * 0.27, -1.08, 1.05), (0.07, 0.15, 0.06), 6, 4)
    for y in (-0.62, 0.62):
        b.cyl('trau', (s * 0.27, y, 0.5), 0.12, 0.085, 0.8, 8); b.cyl('trau_toi', (s * 0.27, y, 0.07), 0.09, 0.1, 0.14, 8)
b.cyl('trau', (0, 1.05, 0.9), 0.045, 0.025, 0.8, 6, (-28, 0, 0)); b.ball('trau_toi', (0, 1.28, 0.56), (0.07, 0.07, 0.12), 6, 4)
V2.append(b.done((0, oy, 0)))
# ---------- Cây bần ----------
b = S('ban', 60)
for k in range(7):
    t = k / 6; b.cyl('go_cu', (0.1 * _m.sin(t * 2.2), 0.06 * t, 0.15 + t * 2.0), 0.34 * (1 - t) + 0.12, 0.34 * (1 - t) + 0.08, 0.5, 8, (6 * _m.sin(t * 3), 6 * _m.cos(t * 2), 0))
for i in range(11):
    a = i / 11 * _m.pi * 2; r = 0.5 + 0.22 * (i % 2); b.cone('go_toi', (_m.cos(a) * r, _m.sin(a) * r, 0.24), 0.045, 0.55 + 0.2 * (i % 3), 5, (-_m.sin(a) * 6, _m.cos(a) * 6, 0))
for i in range(4):
    a = i * 1.57 + 0.4; b.cyl('go_cu', (_m.cos(a) * 0.45, _m.sin(a) * 0.45, 2.3), 0.09, 0.14, 1.2, 6, (-_m.sin(a) * 38, _m.cos(a) * 38, 0))
for i, (px, py, pz, pr) in enumerate([(0, 0, 3.2, 1.15), (0.85, 0.3, 2.85, 0.85), (-0.8, -0.35, 2.95, 0.9), (0.15, -0.9, 2.8, 0.75), (-0.5, 0.8, 2.9, 0.8), (0.1, 0.1, 3.75, 0.7)]):
    b.lumpy('la_xanh', (px, py, pz), pr, 2, 0.16, 10 + i, 0.72, 'la_non')
V2.append(b.done((4, oy, 0)))
# ---------- Dừa nước ----------
b = S('dua_nuoc', 70)
rr = random.Random(4)
for i in range(11):
    a = i / 11 * 360 + rr.uniform(-8, 8); b.ribbon('la_xanh' if i % 3 else 'la_dua', (0, 0, 0.3), a, 1.9 + rr.uniform(-0.25, 0.3), 0.2, 0.55, 7, 0.4)
b.ball('go_nau', (0, 0, 0.16), (0.2, 0.2, 0.2), 8, 5); b.ball('rom_toi', (0.12, 0.08, 0.34), (0.13, 0.13, 0.13), 7, 4)
V2.append(b.done((8, oy, 0)))
# ---------- Lục bình ----------
b = S('luc_binh', 60)
rr = random.Random(5)
for i in range(6):
    x, y = rr.uniform(-0.5, 0.5), rr.uniform(-0.4, 0.4)
    b.cyl('luc_binh', (x, y, 0.02), 0.22, 0.2, 0.035, 10)
    b.ball('la_non', (x, y, 0.14), (0.11, 0.11, 0.17), 8, 5)
    for k in range(5): b.ribbon('luc_binh', (x, y, 0.1), k * 72 + i * 20, 0.34, 0.16, 0.2, 4, 0.3)
    if i % 2 == 0:
        for k in range(5): b.cone('luc_binh_hoa', (x + _m.cos(k * 1.26) * 0.06, y + _m.sin(k * 1.26) * 0.06, 0.4), 0.055, 0.22, 6, (-_m.sin(k * 1.26) * 18, _m.cos(k * 1.26) * 18, 0))
V2.append(b.done((12, oy, 0)))
# ---------- Nhân vật ----------
b = S('player_body', 50)
b.cyl('ao_den', (0, 0, 0.62), 0.16, 0.22, 0.48, 10); b.cyl('ao_den', (0, 0, 0.42), 0.22, 0.2, 0.1, 10)
for s in (-1, 1):
    b.cyl('ao_den', (s * 0.25, 0, 0.66), 0.06, 0.05, 0.34, 7, (0, s * 14, 0)); b.ball('da', (s * 0.3, 0, 0.47), (0.055, 0.055, 0.055), 7, 5)
b.ball('da', (0, 0, 0.99), (0.17, 0.17, 0.18), 12, 8)
for i in range(16):
    a = _m.radians(i * 22.5); c = 'khan_ran_do' if i % 2 == 0 else 'khan_ran_trang'
    b.box(c, (_m.cos(a) * 0.14, _m.sin(a) * 0.115, 0.83), (0.1, 0.07, 0.09), (0, 0, _m.degrees(a)))
b.box('khan_ran_do', (0.07, -0.13, 0.7), (0.1, 0.04, 0.2), (8, 0, 0)); b.box('khan_ran_trang', (0.07, -0.135, 0.58), (0.1, 0.035, 0.1))
b.cyl('non_la', (0, 0, 1.19), 0.0, 0.44, 0.24, 18); b.cyl('rom_toi', (0, 0, 1.08), 0.45, 0.45, 0.025, 18); b.cyl('do', (0, -0.05, 0.92), 0.012, 0.012, 0.12, 4)
V2.append(b.done((16, oy, 0)))
b = S('player_leg', 50)
b.cyl('quan_nau', (0, 0, -0.2), 0.075, 0.062, 0.4, 8); b.box('da', (0, -0.03, -0.42), (0.13, 0.22, 0.06))
V2.append(b.done((17, oy, 0)))
# ---------- Lúa ----------
for name in ('lua_xanh', 'lua_chin'):
    b = S(name, 60); rr = random.Random(8)
    for i in range(9): b.ribbon(name, (0, 0, 0.0), i * 40 + rr.uniform(-10, 10), 0.62 + rr.uniform(-0.1, 0.15), 0.07, 0.7 if name == 'lua_xanh' else 1.0, 4, 0.55)
    if name == 'lua_chin':
        for i in range(5):
            a = i * 72 + 20; b.ball('vang', (_m.cos(_m.radians(a)) * 0.18, _m.sin(_m.radians(a)) * 0.18, 0.5), (0.035, 0.035, 0.1), 5, 3)
    V2.append(b.done((20 + (1 if name == 'lua_chin' else 0), oy, 0)))
# ---------- Xuồng ba lá ----------
b = S('xuong', 45)
bm = b.bm
N = 14
pts_bo, pts_bi = [], []
pts_to, pts_ti = [], []
for i in range(N + 1):
    t = (i - N / 2) / (N / 2)
    y = t * 1.65
    z_floor = 0.04 + 0.20 * (t * t)
    s_t = 1.0 - t * t
    w_bot = 0.22 * (s_t ** 0.85)
    w_top = 0.36 * (s_t ** 0.70)
    z_rim = z_floor + 0.22 * (1.0 - 0.22 * (t * t))
    th = 0.018
    pts_bo.append((Vector((-w_bot, y, z_floor)), Vector((w_bot, y, z_floor))))
    pts_bi.append((Vector((-max(0.0, w_bot - th * 0.7), y, z_floor + th)), Vector((max(0.0, w_bot - th * 0.7), y, z_floor + th))))
    pts_to.append((Vector((-w_top, y, z_rim)), Vector((w_top, y, z_rim))))
    pts_ti.append((Vector((-max(0.0, w_top - th), y, z_rim)), Vector((max(0.0, w_top - th), y, z_rim))))

v_bo = [(bm.verts.new(p[0]), bm.verts.new(p[1])) for p in pts_bo]
v_bi = [(bm.verts.new(p[0]), bm.verts.new(p[1])) for p in pts_bi]
v_to = [(bm.verts.new(p[0]), bm.verts.new(p[1])) for p in pts_to]
v_ti = [(bm.verts.new(p[0]), bm.verts.new(p[1])) for p in pts_ti]

n_bot = len(bm.faces)
for i in range(N):
    bm.faces.new((v_bo[i][0], v_bo[i][1], v_bo[i+1][1], v_bo[i+1][0]))
    bm.faces.new((v_bi[i+1][0], v_bi[i+1][1], v_bi[i][1], v_bi[i][0]))
b._fin(n_bot, 'go_cu')

n_man = len(bm.faces)
for i in range(N):
    bm.faces.new((v_to[i][0], v_bo[i][0], v_bo[i+1][0], v_to[i+1][0]))
    bm.faces.new((v_ti[i+1][0], v_bi[i+1][0], v_bi[i][0], v_ti[i][0]))
    bm.faces.new((v_bo[i][1], v_to[i][1], v_to[i+1][1], v_bo[i+1][1]))
    bm.faces.new((v_bi[i][1], v_bi[i+1][1], v_ti[i+1][1], v_ti[i][1]))
    bm.faces.new((v_to[i+1][0], v_ti[i+1][0], v_ti[i][0], v_to[i][0]))
    bm.faces.new((v_to[i][1], v_ti[i][1], v_ti[i+1][1], v_to[i+1][1]))
b._fin(n_man, 'go_nau')

bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.005)

for y_pos in (-0.75, 0.0, 0.75):
    t = y_pos / 1.65; s_t = 1.0 - t * t
    zb = 0.04 + 0.20 * (t * t) + 0.018
    wb = 0.22 * (s_t ** 0.85) * 2 - 0.035
    wt = 0.36 * (s_t ** 0.70) * 2 - 0.05
    zr = zb + 0.20 * (1.0 - 0.22 * (t * t))
    b.box('go_toi', (0, y_pos, zb + 0.015), (wb, 0.045, 0.03))
    for s in (-1, 1):
        x_mid = s * (wb * 0.25 + wt * 0.25)
        z_mid = zb + (zr - zb) * 0.5
        h_arm = zr - zb
        ang_y = s * _m.degrees(_m.atan2((wt - wb) * 0.5, h_arm))
        b.box('go_toi', (x_mid, y_pos, z_mid), (0.03, 0.045, h_arm), (0, ang_y, 0))

b.box('go_sang', (0, -0.65, 0.21), (0.44, 0.22, 0.025))

p1 = Vector((-0.18, -0.65, 0.25))
p2 = Vector((0.55, 0.45, 0.22))
v_oar = (p2 - p1).normalized()
rot_e = [_m.degrees(a) for a in v_oar.to_track_quat('Z', 'Y').to_euler('XYZ')]
shaft_len = 1.15
shaft_center = p1 + v_oar * (shaft_len * 0.5)
b.cyl('go_nau', shaft_center, 0.016, 0.016, shaft_len, 6, rot_e)
blade_len = 0.36
blade_center = p1 + v_oar * (shaft_len + blade_len * 0.45)
b.box('go_sang', blade_center, (0.11, 0.02, blade_len), rot_e)

V2.append(b.done((24, oy, 0)))
if bpy.data.filepath:
    bpy.ops.wm.save_mainfile()
print([(o.name, len(o.data.polygons)) for o in V2])

