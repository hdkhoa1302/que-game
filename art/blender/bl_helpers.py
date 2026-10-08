# Helpers dựng mô hình low-poly miền Tây trong Blender (Z lên, mặt trước hướng -Y).
import bpy, bmesh, math, json
from mathutils import Matrix, Vector

PAL = {
    # gỗ, tre, lá
    'go_nau': 0x8a5a35, 'go_toi': 0x5a3b22, 'go_sang': 0xc89a60, 'go_cu': 0x6b4a36,
    'tre': 0xb8a050, 'tre_xanh': 0x9bb04a, 'la_dua': 0x7a9a3a, 'la_dua_kho': 0xb59a58, 'la_xanh': 0x3f8a35, 'la_non': 0x6fcf55,
    'rom': 0xd9b45a, 'rom_toi': 0xb08a3a,
    # tường, ngói
    'tuong_vang': 0xefe0b8, 'tuong_kem': 0xf7ecd0, 'tuong_la': 0xc9b48a, 'ngoi_do': 0xb8452f, 'ngoi_do_toi': 0x8f3322, 'xi_mang': 0xb9b4a8,
    'cua_xanh': 0x2f7a5a, 'cua_nau': 0x5a3b22, 'kinh': 0x9ad4e8,
    # vải, người
    'da': 0xf1c9a0, 'ao_den': 0x2b2b30, 'ao_nau': 0x6a4a32, 'khan_ran_do': 0xc83a2a, 'khan_ran_trang': 0xf2ece0, 'non_la': 0xe8d9a0, 'quan_nau': 0x4a3a2a,
    # nước, đất
    'nuoc': 0x4aa8d8, 'bun': 0x8a6a45, 'dat': 0x7a5a38, 'sen_hong': 0xf3a6c0, 'sen_trang': 0xf9d0e0, 'luc_binh': 0x5fae45, 'luc_binh_hoa': 0xb487f0,
    # vật nuôi
    'trau': 0x4a4a52, 'trau_toi': 0x2f2f36, 'sung': 0xe8e0c8, 'mui': 0x6a5a5a,
    # khác
    'lua_xanh': 0x7fcf5a, 'lua_chin': 0xe8c24a, 'do': 0xd8433a, 'vang': 0xf6d23f, 'xam': 0x9a9a92, 'xam_toi': 0x5a5a60, 'trang': 0xffffff, 'cam': 0xf08a24, 'sat': 0x6a6a70,
}

def _lin(c):
    c /= 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def mat(name):
    m = bpy.data.materials.get('mt_' + name)
    if m: return m
    m = bpy.data.materials.new('mt_' + name); m.use_nodes = True
    h = PAL[name]; r, g, b = (h >> 16) & 255, (h >> 8) & 255, h & 255
    bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (_lin(r), _lin(g), _lin(b), 1)
    bsdf.inputs['Roughness'].default_value = 0.9
    return m

class B:
    """Bộ dựng một đối tượng từ nhiều khối nguyên thủy, mỗi khối một màu bảng PAL."""
    def __init__(self, name):
        self.name = name; self.bm = bmesh.new(); self.mats = []
    def _idx(self, c):
        if c not in self.mats: self.mats.append(c)
        return self.mats.index(c)
    def _fin(self, n, c):
        self.bm.faces.ensure_lookup_table(); i = self._idx(c)
        for f in self.bm.faces[n:]: f.material_index = i
    def _m(self, loc, rot, sc):
        return Matrix.LocRotScale(Vector(loc), __import__('mathutils').Euler([math.radians(a) for a in rot], 'XYZ'), Vector(sc))
    def box(self, c, loc, size, rot=(0, 0, 0)):
        n = len(self.bm.faces); bmesh.ops.create_cube(self.bm, size=1.0, matrix=self._m(loc, rot, size)); self._fin(n, c); return self
    def cyl(self, c, loc, r1, r2, h, seg=8, rot=(0, 0, 0)):
        n = len(self.bm.faces); bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r1, radius2=r2, depth=h, matrix=self._m(loc, rot, (1, 1, 1))); self._fin(n, c); return self
    def cone(self, c, loc, r, h, seg=6, rot=(0, 0, 0)):
        return self.cyl(c, loc, r, 0.0, h, seg, rot)
    def ball(self, c, loc, size, seg=6, rings=4):
        n = len(self.bm.faces)
        try: bmesh.ops.create_uvsphere(self.bm, u_segments=seg, v_segments=rings, radius=1.0, matrix=self._m(loc, (0, 0, 0), size))
        except TypeError: bmesh.ops.create_uvsphere(self.bm, u_segments=seg, v_segments=rings, diameter=1.0, matrix=self._m(loc, (0, 0, 0), [s * 2 for s in size]))
        self._fin(n, c); return self
    def done(self, at=(0, 0, 0)):
        me = bpy.data.meshes.new(self.name); self.bm.to_mesh(me); self.bm.free()
        for c in self.mats: me.materials.append(mat(c))
        for p in me.polygons: p.use_smooth = False
        ob = bpy.data.objects.new(self.name, me); bpy.context.scene.collection.objects.link(ob)
        ob.location = at; ob['mats'] = ','.join(self.mats)
        return ob

def export_json(objs, path):
    out = {}
    for ob in objs:
        me = ob.data; mats = ob['mats'].split(',')
        me.calc_loop_triangles()
        pos, col = [], []
        for t in me.loop_triangles:
            c = PAL[mats[me.polygons[t.polygon_index].material_index]]
            col.append(c)
            for vi in t.vertices:
                v = me.vertices[vi].co + Vector((0, 0, 0))
                pos += [round(v.x, 3), round(v.z, 3), round(-v.y, 3)]  # Blender (x,y,z) -> Three (x,z,-y)
        out[ob.name] = {'p': pos, 'c': col}
    with open(path, 'w') as f: json.dump(out, f, separators=(',', ':'))
    return {k: len(v['c']) for k, v in out.items()}

def clear_all():
    for ob in list(bpy.data.objects): bpy.data.objects.remove(ob, do_unlink=True)
    for me in list(bpy.data.meshes): bpy.data.meshes.remove(me)
