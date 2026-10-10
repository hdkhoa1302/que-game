import os
_DIR = os.path.dirname(os.path.abspath(__file__)) if '__file__' in globals() and not __file__.startswith('<') else os.path.join(os.getcwd(), 'art/blender')
exec(open(os.path.join(_DIR, 'bl_helpers2.py')).read())
import math as _m
if 'den' not in PAL: PAL['den'] = 0x1e1e22
def drop(*names):
    for n in names:
        o = bpy.data.objects.get(n)
        if o: bpy.data.objects.remove(o, do_unlink=True)
drop('trau', 'ban', 'dua_nuoc', 'luc_binh', 'player_body', 'player_leg', 'lua_xanh', 'lua_chin', 'xuong', 'ghe_cho')
V2 = []
oy = 30
# ---------- Trâu: thân mềm ----------
b = S('trau', 55)
b.ball('trau', (0, 0.08, 0.84), (0.58, 0.98, 0.56), 14, 9)
b.ball('bun', (0, 0.05, 0.65), (0.52, 0.88, 0.28), 12, 7)
b.ball('trau', (0, -0.46, 1.05), (0.46, 0.45, 0.38), 12, 8)
b.ball('trau', (0, 0.12, 1.02), (0.36, 0.65, 0.25), 10, 6)
b.ball('trau', (0, 0.62, 0.92), (0.52, 0.48, 0.46), 12, 8)
b.ball('trau', (0, -0.88, 0.98), (0.34, 0.42, 0.36), 12, 8)
b.ball('trau_toi', (0, -1.22, 0.94), (0.28, 0.35, 0.28), 12, 8)
b.ball('mui', (0, -1.54, 0.84), (0.23, 0.20, 0.18), 10, 6)
b.ball('trau_toi', (-0.07, -1.60, 0.83), (0.035, 0.035, 0.035), 6, 4)
b.ball('trau_toi', (0.07, -1.60, 0.83), (0.035, 0.035, 0.035), 6, 4)

N_sung = 8
for s in (-1, 1):
    b.ball('den', (s * 0.22, -1.25, 0.97), (0.03, 0.03, 0.03), 6, 4)
    b.ball('trau', (s * 0.34, -1.06, 0.98), (0.11, 0.06, 0.045), 6, 4)
    pts = []
    for k in range(N_sung):
        t = k / (N_sung - 1)
        x = s * (0.22 + 0.54 * _m.sin(t * 1.57) - 0.05 * (t ** 2))
        y = -1.18 + 0.62 * (t ** 1.35)
        z = 1.10 + 0.28 * _m.sin(t * 2.1) + 0.05 * t
        pts.append(Vector((x, y, z)))
    for k in range(N_sung - 1):
        p1, p2 = pts[k], pts[k + 1]
        diff = p2 - p1
        mid = (p1 + p2) * 0.5
        rot = [_m.degrees(a) for a in diff.to_track_quat('Z', 'Y').to_euler('XYZ')]
        t1, t2 = k / (N_sung - 1), (k + 1) / (N_sung - 1)
        r1 = 0.082 * (1 - 0.72 * t1) + 0.015
        r2 = 0.082 * (1 - 0.72 * t2) + 0.015
        b.cyl('sung', mid, r1, r2, diff.length * 1.05, 7, rot)
    b.cone('sung', pts[-1] + (pts[-1] - pts[-2]).normalized() * 0.04, 0.02, 0.08, 5, rot)
    for y in (-0.58, 0.60):
        b.cyl('trau', (s * 0.28, y, 0.66), 0.14, 0.11, 0.44, 8)
        b.cyl('bun', (s * 0.28, y, 0.30), 0.11, 0.09, 0.38, 8)
        b.cyl('trau_toi', (s * 0.28, y, 0.06), 0.095, 0.105, 0.12, 8)

b.cyl('tre', (0, -1.55, 0.81), 0.016, 0.016, 0.26, 6, (0, 90, 0))
b.ball('go_nau', (0.13, -1.55, 0.81), (0.03, 0.03, 0.03), 5, 4)
for s in (-1, 1):
    b.cyl('tre', (s * 0.15, -1.42, 0.88), 0.013, 0.013, 0.30, 5, (-22, s * 24, 0))
    b.cyl('tre', (s * 0.23, -1.22, 1.02), 0.013, 0.013, 0.34, 5, (-32, s * 16, 0))
b.cyl('tre', (0.12, -1.50, 0.60), 0.014, 0.014, 0.42, 5, (18, 0, -8))
b.cyl('tre', (0.10, -1.38, 0.32), 0.013, 0.013, 0.38, 5, (-15, 0, -12))
b.cyl('trau', (0, 1.05, 0.88), 0.045, 0.025, 0.75, 6, (-24, 0, 0))
b.ball('trau_toi', (0, 1.25, 0.52), (0.07, 0.07, 0.14), 6, 4)
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
# ---------- Ghe chợ nổi ----------
b = S('ghe_cho', 45)
bm = b.bm
N = 16
pts_bo, pts_bi = [], []
pts_to, pts_ti = [], []
for i in range(N + 1):
    t = (i - N / 2) / (N / 2)
    y = t * 2.05
    z_floor = 0.03 + 0.18 * (t * t)
    s_t = max(0.0, 1.0 - t * t)
    w_bot = 0.36 * (s_t ** 0.70)
    w_top = 0.58 * (s_t ** 0.55)
    z_rim = z_floor + 0.34 * (1.0 - 0.18 * (t * t))
    th = 0.025
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

for y_pos in (-1.3, -0.65, 0.0, 0.65, 1.3):
    t = y_pos / 2.05; s_t = max(0.0, 1.0 - t * t)
    zb = 0.03 + 0.18 * (t * t) + 0.025
    wb = max(0.1, 0.36 * (s_t ** 0.70) * 2 - 0.04)
    b.box('go_toi', (0, y_pos, zb + 0.02), (wb, 0.05, 0.04))

b.box('go_sang', (0, 1.55, 0.36), (0.62, 0.55, 0.025))
b.box('go_sang', (0, -1.55, 0.34), (0.62, 0.55, 0.025))

Ny, Na = 6, 8
grid_o, grid_i = [], []
for iy in range(Ny + 1):
    ym = -0.75 + 1.2 * (iy / Ny)
    ro, ri = [], []
    for ja in range(Na + 1):
        ang = _m.pi * ja / Na
        x = -0.56 * _m.cos(ang)
        z = 0.40 + 0.52 * _m.sin(ang)
        ro.append(bm.verts.new((x, ym, z)))
        ri.append(bm.verts.new((x * 0.98, ym, z - 0.015)))
    grid_o.append(ro); grid_i.append(ri)

n_roof = len(bm.faces)
for iy in range(Ny):
    for ja in range(Na):
        bm.faces.new((grid_o[iy][ja], grid_o[iy+1][ja], grid_o[iy+1][ja+1], grid_o[iy][ja+1]))
        bm.faces.new((grid_i[iy][ja+1], grid_i[iy+1][ja+1], grid_i[iy+1][ja], grid_i[iy][ja]))
b._fin(n_roof, 'la_dua_kho')

for s in (-1, 1):
    for ym in (-0.72, 0.42):
        b.cyl('tre', (s * 0.54, ym, 0.42), 0.025, 0.025, 0.45, 6)
b.cyl('tre', (0, -0.15, 0.93), 0.022, 0.022, 1.24, 6, (90, 0, 0))

# Cây bẹo
b.cyl('tre', (0, 1.62, 1.48), 0.032, 0.020, 2.3, 6, (-5, 0, 0))
b.cyl('tre', (0, 1.72, 2.48), 0.012, 0.012, 0.42, 5, (0, 90, 0))
b.ball('vang', (0, 1.70, 2.36), (0.10, 0.14, 0.10), 6, 4)
b.cone('la_xanh', (0, 1.70, 2.50), 0.05, 0.10, 4)
b.ball('do', (0.14, 1.72, 2.24), (0.11, 0.13, 0.11), 6, 5)
b.cyl('tre', (0.14, 1.72, 2.38), 0.007, 0.007, 0.16, 4)
b.ball('cam', (-0.14, 1.72, 2.26), (0.09, 0.09, 0.09), 6, 4)
b.cyl('tre', (-0.14, 1.72, 2.39), 0.007, 0.007, 0.15, 4)

# Cặp mắt ghe
for s in (-1, 1):
    b.ball('do', (s * 0.46, 1.62, 0.42), (0.024, 0.10, 0.07), 6, 4)
    b.ball('trang', (s * 0.475, 1.63, 0.42), (0.018, 0.075, 0.05), 6, 4)
    b.ball('den', (s * 0.485, 1.65, 0.42), (0.014, 0.035, 0.035), 6, 4)

# Nông sản khoang trước
b.cyl('tre', (-0.22, 0.88, 0.24), 0.19, 0.15, 0.22, 7)
b.ball('vang', (-0.22, 0.88, 0.35), (0.17, 0.17, 0.11), 7, 5)
for dx, dy in [(-0.27, 0.84), (-0.17, 0.92), (-0.23, 0.94)]:
    b.ball('vang', (dx, dy, 0.41), (0.055, 0.07, 0.055), 5, 4)

b.cyl('tre', (0.24, 0.95, 0.24), 0.19, 0.15, 0.22, 7)
b.ball('do', (0.24, 0.95, 0.35), (0.17, 0.17, 0.11), 7, 5)
for dx, dy in [(0.18, 0.90), (0.29, 0.98), (0.22, 1.02)]:
    b.ball('do', (dx, dy, 0.41), (0.065, 0.075, 0.065), 5, 4)

for dx, dy, dz in [(-0.07, 0.62, 0.20), (0.09, 0.64, 0.20), (0.0, 0.70, 0.30), (0.08, 0.54, 0.20)]:
    b.ball('la_xanh', (dx, dy, dz), (0.09, 0.09, 0.09), 6, 4)

for dx, dy, dz in [(-0.18, 1.25, 0.26), (0.18, 1.28, 0.26), (0.0, 1.32, 0.28)]:
    b.ball('cam', (dx, dy, dz), (0.10, 0.10, 0.08), 6, 4)
    b.cyl('la_xanh', (dx, dy, dz + 0.07), 0.014, 0.014, 0.04, 4)

# Khoang sau & dầm chèo
b.ball('rom_toi', (0.15, -1.15, 0.26), (0.19, 0.23, 0.15), 7, 5)
b.ball('bun', (-0.17, -1.10, 0.25), (0.17, 0.21, 0.14), 7, 5)
p1 = Vector((-0.18, -1.35, 0.32)); p2 = Vector((0.68, -0.45, 0.26))
vo = (p2 - p1).normalized()
ro = [_m.degrees(a) for a in vo.to_track_quat('Z', 'Y').to_euler('XYZ')]
b.cyl('go_nau', p1 + vo * 0.7, 0.018, 0.018, 1.4, 6, ro)
b.box('go_sang', p1 + vo * 1.55, (0.12, 0.02, 0.38), ro)

V2.append(b.done((28, oy, 0)))
if bpy.data.filepath:
    bpy.ops.wm.save_mainfile()
print([(o.name, len(o.data.polygons)) for o in V2])

