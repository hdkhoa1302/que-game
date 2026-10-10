import os, math
from mathutils import Vector
_DIR = os.path.dirname(os.path.abspath(__file__)) if '__file__' in globals() and not __file__.startswith('<') else os.path.join(os.getcwd(), 'art/blender')
exec(open(os.path.join(_DIR, 'bl_helpers2.py')).read())

PAL_EXTRA = {
    'tre_gia': 0x7f8f3a, 'tre_dot': 0x56622a, 'tre_non': 0xa9c24f,
    'men_xanh': 0x2f7a5a, 'dua_qua': 0x5a3318, 'den': 0x1e1e22
}
for k, v in PAL_EXTRA.items():
    if k not in PAL: PAL[k] = v

def finish_object(builder, name, loc=(0, 0, 0)):
    if builder.smooth:
        smooth_by_angle(builder.bm, builder.smooth)
    me = bpy.data.meshes.new(name)
    builder.bm.to_mesh(me)
    builder.bm.free()
    for c in builder.mats:
        me.materials.append(mat(c))
    for p in me.polygons:
        p.use_smooth = bool(builder.smooth)

    ob = bpy.data.objects.get(name)
    if ob:
        old_mesh = ob.data
        ob.data = me
        ob['mats'] = ','.join(builder.mats)
        ob['smooth'] = builder.smooth
        copy_ob = bpy.data.objects.get(name + '_c')
        if copy_ob:
            copy_ob.data = me
            copy_ob['mats'] = ','.join(builder.mats)
        if old_mesh and old_mesh != me and old_mesh.users == 0:
            bpy.data.meshes.remove(old_mesh)
    else:
        ob = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(ob)
        ob.location = loc
        ob['mats'] = ','.join(builder.mats)
        ob['smooth'] = builder.smooth
    return ob

def make_ban_thien():
    b = S('ban_thien', 0)
    b.box('xi_mang', (0, 0, 0.04), (0.28, 0.28, 0.08))
    b.box('xi_mang', (0, 0, 0.09), (0.20, 0.20, 0.04))
    b.cyl('xi_mang', (0, 0, 0.58), 0.065, 0.06, 0.98, 8)
    b.cyl('xi_mang', (0, 0, 1.08), 0.09, 0.065, 0.06, 8)

    b.box('xi_mang', (0, 0, 1.12), (0.42, 0.42, 0.04))
    b.box('xi_mang', (0, 0.20, 1.145), (0.42, 0.02, 0.02))
    b.box('xi_mang', (0, -0.20, 1.145), (0.42, 0.02, 0.02))
    b.box('xi_mang', (0.20, 0, 1.145), (0.02, 0.38, 0.02))
    b.box('xi_mang', (-0.20, 0, 1.145), (0.02, 0.38, 0.02))

    b.cyl('cua_xanh', (0, 0.03, 1.15), 0.048, 0.048, 0.02, 8)
    b.cyl('cua_xanh', (0, 0.03, 1.20), 0.065, 0.055, 0.08, 8)
    b.cyl('cua_xanh', (0, 0.03, 1.245), 0.07, 0.065, 0.015, 8)
    b.cyl('rom_toi', (0, 0.03, 1.24), 0.06, 0.06, 0.01, 8)

    b.cyl('do', (0, 0.03, 1.30), 0.004, 0.003, 0.12, 4)
    b.cyl('do', (0.015, 0.04, 1.29), 0.0035, 0.003, 0.11, 4, (6, 4, 0))
    b.cyl('do', (-0.015, 0.02, 1.29), 0.0035, 0.003, 0.11, 4, (-5, -3, 0))

    for dx in (-0.09, 0.0, 0.09):
        b.cyl('trang', (dx, -0.10, 1.16), 0.018, 0.024, 0.04, 6)
        b.cyl('nuoc', (dx, -0.10, 1.175), 0.015, 0.015, 0.01, 6)

    b.cyl('cua_xanh', (0.13, 0.13, 1.19), 0.032, 0.025, 0.10, 6)
    b.ball('vang', (0.13, 0.13, 1.25), (0.035, 0.035, 0.035), 5, 4)
    return finish_object(b, 'ban_thien', (20, 0, 0))

def make_cau_khi():
    b = S('cau_khi', 0)
    N = 10
    L = 4.8
    pts_bridge = []
    for i in range(N + 1):
        t = i / N
        x = t * L
        u = (x - L * 0.5) / (L * 0.5)
        z = 0.36 - 0.07 * (1.0 - u * u)
        y = 0.02 * math.sin(u * math.pi)
        pts_bridge.append(Vector((x, y, z)))

    for i in range(N):
        p1, p2 = pts_bridge[i], pts_bridge[i + 1]
        diff = p2 - p1
        mid = (p1 + p2) * 0.5
        rot = [math.degrees(a) for a in diff.to_track_quat('Z', 'Y').to_euler('XYZ')]
        col = 'tre' if i % 2 == 0 else 'go_cu'
        b.cyl(col, mid, 0.052, 0.048, diff.length * 1.02, 6, rot)
        b.cyl('tre_dot', p2, 0.056, 0.056, 0.025, 6, rot)

    for x_p in (1.0, 2.4, 3.8):
        u = (x_p - L * 0.5) / (L * 0.5)
        zb = 0.36 - 0.07 * (1.0 - u * u)

        p1_a, p2_a = Vector((x_p - 0.02, -0.34, -0.32)), Vector((x_p + 0.02, 0.32, zb + 0.24))
        diff_a = p2_a - p1_a
        rot_a = [math.degrees(a) for a in diff_a.to_track_quat('Z', 'Y').to_euler('XYZ')]
        b.cyl('tre_gia', (p1_a + p2_a) * 0.5, 0.038, 0.034, diff_a.length * 1.02, 5, rot_a)

        p1_b, p2_b = Vector((x_p + 0.02, 0.34, -0.32)), Vector((x_p - 0.02, -0.32, zb + 0.24))
        diff_b = p2_b - p1_b
        rot_b = [math.degrees(a) for a in diff_b.to_track_quat('Z', 'Y').to_euler('XYZ')]
        b.cyl('tre', (p1_b + p2_b) * 0.5, 0.038, 0.034, diff_b.length * 1.02, 5, rot_b)

        b.cyl('tre', (x_p, 0.0, zb - 0.04), 0.025, 0.025, 0.54, 5, (0, 90, 0))
        b.box('go_toi', (x_p, 0.0, zb - 0.03), (0.07, 0.08, 0.06))

    pts_rail = []
    for i in range(N + 1):
        t = i / N
        x = 0.05 + t * (L - 0.1)
        u = (x - L * 0.5) / (L * 0.5)
        z = 1.05 - 0.07 * (1.0 - u * u)
        y = 0.38 + 0.03 * math.sin(u * math.pi)
        pts_rail.append(Vector((x, y, z)))

    for i in range(N):
        p1, p2 = pts_rail[i], pts_rail[i + 1]
        diff = p2 - p1
        mid = (p1 + p2) * 0.5
        rot = [math.degrees(a) for a in diff.to_track_quat('Z', 'Y').to_euler('XYZ')]
        b.cyl('tre', mid, 0.022, 0.020, diff.length * 1.02, 5, rot)

    for i, x_s in enumerate((0.2, 0.9, 1.7, 2.4, 3.1, 3.8, 4.6)):
        u = (x_s - L * 0.5) / (L * 0.5)
        z_rail = 1.05 - 0.07 * (1.0 - u * u)
        y_rail = 0.38 + 0.03 * math.sin(u * math.pi)
        p_top = Vector((x_s, y_rail, z_rail))
        p_bot = Vector((x_s + (0.04 if i % 2 == 0 else -0.04), 0.28, -0.15))
        diff_s = p_top - p_bot
        rot_s = [math.degrees(a) for a in diff_s.to_track_quat('Z', 'Y').to_euler('XYZ')]
        b.cyl('tre' if i % 2 == 0 else 'tre_xanh', (p_top + p_bot) * 0.5, 0.026, 0.020, diff_s.length * 1.02, 5, rot_s)
        b.box('go_toi', p_top, (0.05, 0.05, 0.05))

    return finish_object(b, 'cau_khi', (0, 12, 0))

def make_ben_tre():
    b = S('ben_tre', 0)
    for y in (-0.42, 0.0, 0.42):
        b.cyl('go_cu', (1.7, y, 0.25), 0.045, 0.045, 2.9, 6, (0, 90, 0))

    for x in (0.4, 1.3, 2.2, 3.1):
        b.cyl('tre', (x, 0.0, 0.28), 0.035, 0.035, 1.14, 6, (90, 0, 0))
        for y in (-0.48, 0.48):
            b.cyl('go_cu', (x, y, 0.01), 0.048, 0.042, 0.78, 6)

    N_slats = 22
    for i in range(N_slats):
        t = i / (N_slats - 1)
        x = 0.32 + t * 2.76
        col = 'tre' if i % 2 == 0 else 'tre_gia'
        b.cyl(col, (x, 0.0, 0.33), 0.028, 0.028, 1.10, 6, (90, 0, 0))

    for s in (-1, 1):
        b.cyl('tre', (1.7, s * 0.52, 0.36), 0.024, 0.024, 2.85, 6, (0, 90, 0))

    b.cyl('go_cu', (3.25, 0.46, 0.29), 0.042, 0.036, 1.34, 6)
    b.cyl('rom_toi', (3.25, 0.46, 0.62), 0.058, 0.058, 0.08, 7)

    b.cyl('go_cu', (3.42, -0.40, -0.08), 0.032, 0.028, 0.48, 5)
    b.cyl('go_cu', (3.42, 0.12, -0.08), 0.032, 0.028, 0.48, 5)
    for j in range(4):
        yj = -0.38 + j * 0.16
        b.cyl('tre', (3.32, yj, 0.10), 0.024, 0.024, 0.42, 5, (0, 90, 0))

    b.cyl('go_toi', (2.75, -0.30, 0.38), 0.055, 0.035, 0.06, 7)
    b.cyl('tre', (2.60, -0.32, 0.38), 0.008, 0.007, 0.30, 5, (0, 8, 80))

    return finish_object(b, 'ben_tre', (8, 16, 0))

def make_nha1():
    b = S('nha1', 0)
    b.box('dat', (0, -0.15, 0.06), (3.9, 3.2, 0.12))
    b.box('go_cu', (0, -1.2, 0.09), (3.6, 1.0, 0.06))

    for x in (-1.6, 0.0, 1.6):
        b.cyl('go_cu', (x, -1.6, 0.85), 0.06, 0.055, 1.65, 6)
        b.cyl('go_cu', (x, -0.65, 1.05), 0.065, 0.06, 2.05, 6)
        b.cyl('go_cu', (x, 1.25, 1.05), 0.065, 0.06, 2.05, 6)

    for x in (-1.6, 1.6):
        b.cyl('go_cu', (x, 0.30, 1.35), 0.065, 0.06, 2.65, 6)

    b.cyl('tre', (0, -1.6, 1.65), 0.04, 0.04, 3.4, 6, (0, 90, 0))
    b.cyl('tre', (0, -0.65, 2.05), 0.04, 0.04, 3.4, 6, (0, 90, 0))
    b.cyl('tre', (0, 1.25, 2.05), 0.04, 0.04, 3.4, 6, (0, 90, 0))

    b.box('la_dua_kho', (0, 1.25, 1.05), (3.2, 0.04, 1.85))
    for z in (0.5, 1.1, 1.7):
        b.box('tre', (0, 1.27, z), (3.25, 0.025, 0.035))
    for x in (-1.2, -0.6, 0.0, 0.6, 1.2):
        b.box('tre', (x, 1.27, 1.05), (0.035, 0.025, 1.85))

    for s in (-1, 1):
        b.box('la_dua_kho', (s * 1.6, 0.30, 1.05), (0.04, 1.9, 1.85))
        for z in (0.6, 1.4):
            b.box('tre', (s * 1.62, 0.30, z), (0.025, 1.9, 0.035))
        for y in (-0.3, 0.3, 0.9):
            b.box('tre', (s * 1.62, y, 1.05), (0.025, 0.035, 1.85))

    b.box('tre', (1.64, 0.30, 1.10), (0.03, 0.55, 0.60))
    b.box('la_dua_kho', (1.68, 0.30, 1.35), (0.03, 0.50, 0.40), (0, -25, 0))
    b.cyl('tre', (1.68, 0.30, 1.15), 0.012, 0.012, 0.45, 4, (0, -35, 0))

    b.box('la_dua_kho', (-1.05, -0.65, 1.05), (1.1, 0.04, 1.85))
    b.box('la_dua_kho', (1.05, -0.65, 1.05), (1.1, 0.04, 1.85))
    for z in (0.5, 1.1, 1.7):
        b.box('tre', (-1.05, -0.67, z), (1.15, 0.025, 0.035))
        b.box('tre', (1.05, -0.67, z), (1.15, 0.025, 0.035))
    b.box('go_toi', (-0.48, -0.65, 1.0), (0.06, 0.06, 1.8))
    b.box('go_toi', (0.48, -0.65, 1.0), (0.06, 0.06, 1.8))
    b.box('go_toi', (0.0, -0.65, 1.88), (1.02, 0.06, 0.06))

    # Mái trước 3 tầng lớp xếp chồng (stepped layers)
    b.box('la_dua_kho', (0, -0.05, 2.485), (3.9, 0.80, 0.055), (29, 0, 0))
    b.box('la_dua', (0, -0.40, 2.29), (3.95, 0.08, 0.04), (29, 0, 0))

    b.box('la_dua_kho', (0, -0.71, 2.125), (4.0, 0.88, 0.06), (29, 0, 0))
    b.box('la_dua', (0, -1.10, 1.91), (4.05, 0.09, 0.045), (29, 0, 0))

    b.box('la_dua_kho', (0, -1.42, 1.74), (4.1, 0.90, 0.065), (29, 0, 0))
    b.box('rom_toi', (0, -1.82, 1.52), (4.15, 0.10, 0.04), (29, 0, 0))

    # Mái sau 2 tầng lớp xếp chồng
    b.box('la_dua_kho', (0, 0.60, 2.49), (3.9, 0.70, 0.055), (-33, 0, 0))
    b.box('la_dua', (0, 0.92, 2.30), (3.95, 0.08, 0.04), (-33, 0, 0))

    b.box('la_dua_kho', (0, 1.15, 2.13), (4.0, 0.80, 0.06), (-33, 0, 0))
    b.box('rom_toi', (0, 1.52, 1.90), (4.05, 0.10, 0.04), (-33, 0, 0))

    # Đỉnh nóc có nẹp tre và rơm phủ sống nóc
    b.cyl('tre', (0, 0.30, 2.70), 0.035, 0.035, 4.1, 8, (0, 90, 0))
    b.box('rom', (0, 0.30, 2.72), (4.15, 0.38, 0.065))
    b.box('rom_toi', (0, 0.30, 2.74), (4.18, 0.22, 0.04))

    # Chõng tre dưới hiên
    b.box('go_cu', (-0.9, -1.2, 0.22), (0.9, 0.5, 0.18))
    for xi in (-1.3, -1.1, -0.9, -0.7, -0.5):
        b.cyl('tre', (xi, -1.2, 0.32), 0.018, 0.018, 0.52, 5, (90, 0, 0))

    return finish_object(b, 'nha1', (0, 0, 0))

if __name__ == '__main__':
    o_bt = make_ban_thien()
    o_ck = make_cau_khi()
    o_dock = make_ben_tre()
    o_h = make_nha1()
    print('BUILD DONE:', [(o.name, len(o.data.polygons)) for o in (o_bt, o_ck, o_dock, o_h)])
    if bpy.data.filepath:
        bpy.ops.wm.save_mainfile()
        print('SAVED:', bpy.data.filepath)
