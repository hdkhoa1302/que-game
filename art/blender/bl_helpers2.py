# Mở rộng bl_helpers: bề mặt mềm (smooth + sharp theo góc), thân hull, tán cây gồ ghề, lá cong, bake AO vào màu đỉnh.
exec(open('/private/tmp/claude-501/-Users-dangkhoahuynh-workplace-green/74cf7ad4-82b0-4bff-abab-5ac56d20dbe5/scratchpad/bl_helpers.py').read())
import random
from mathutils.bvhtree import BVHTree

def smooth_by_angle(bm, deg=40):
    lim = math.radians(deg)
    for e in bm.edges:
        if len(e.link_faces) == 2: e.smooth = e.calc_face_angle(0) < lim
        else: e.smooth = False
    for f in bm.faces: f.smooth = True

class S(B):
    """B có thêm: hull, tán lá gồ ghề, lá cong, làm mềm theo góc."""
    def __init__(self, name, smooth=0):
        super().__init__(name); self.smooth = smooth
    def lumpy(self, c, loc, r, sub=2, amp=0.18, seed=1, squash=1.0, c2=None):
        rr = random.Random(seed); n = len(self.bm.faces)
        bmesh.ops.create_icosphere(self.bm, subdivisions=sub, radius=1.0, matrix=Matrix.Translation(Vector(loc)))
        self.bm.faces.ensure_lookup_table(); new = self.bm.faces[n:]
        vs = {v for f in new for v in f.verts}; base = {v: (v.co - Vector(loc)).normalized() for v in vs}
        k = {v: 1 + rr.uniform(-amp, amp) for v in vs}
        for v in vs: v.co = Vector(loc) + base[v] * r * k[v]; v.co.z = loc[2] + (v.co.z - loc[2]) * squash
        i = self._idx(c); j = self._idx(c2) if c2 else i
        for f in new: f.material_index = j if (c2 and sum(v.co.z for v in f.verts) / len(f.verts) > loc[2] + r * squash * 0.35) else i
        return self
    def ribbon(self, c, base, ang, length, width, bend, seg=7, lift=0.35, thick=0.012):
        """lá dải cong: xuất phát từ base, hướng ang (độ) trong mặt phẳng XY, vồng lên rồi rủ xuống"""
        dx, dy = math.cos(math.radians(ang)), math.sin(math.radians(ang)); px, py = -dy, dx
        rows = []
        for i in range(seg + 1):
            t = i / seg; d = t * length; z = base[2] + math.sin(t * math.pi * 0.9) * lift * length - t * t * bend * length
            w = width * (1 - t) ** 0.7 * 0.5
            c0 = Vector((base[0] + dx * d, base[1] + dy * d, z)); rows.append((c0 - Vector((px, py, 0)) * w, c0 + Vector((0, 0, 0.012 * width * 4)), c0 + Vector((px, py, 0)) * w))
        n = len(self.bm.faces)
        vv = [[self.bm.verts.new(p) for p in r] for r in rows]
        v2 = [[self.bm.verts.new(p - Vector((0, 0, 0.006))) for p in r] for r in rows]  # bản sao lệch nhẹ làm mặt sau
        for i in range(seg):
            for a, b in ((0, 1), (1, 2)):
                self.bm.faces.new((vv[i][a], vv[i + 1][a], vv[i + 1][b], vv[i][b]))
                self.bm.faces.new((v2[i][b], v2[i + 1][b], v2[i + 1][a], v2[i][a]))
        self._fin(n, c); return self
    def hull(self, c_out, c_in, c_rim, L, W, D, lift, n_len=16, n_arc=8, thick=0.05, p=1.7, plank=0.93):
        outer, inner = [], []
        for i in range(n_len + 1):
            t = i / n_len; wx = (t - 0.5) * L; s = abs(2 * t - 1)
            w = W * max(0.0, 1 - s ** p) ** 0.6; d = D * (1 - 0.55 * s ** 2) ; lz = lift * s ** 3
            ro, ri = [], []
            for j in range(n_arc + 1):
                a = -math.pi / 2 + math.pi * j / n_arc
                ro.append(self.bm.verts.new((wx, w * math.sin(a), d * (1 - math.cos(a)) - d + lz + D * 0.0)))
                ri.append(self.bm.verts.new((wx, (w - thick) * math.sin(a), (d - thick) * (1 - math.cos(a)) - d + thick + lz + 0.0)))
            outer.append(ro); inner.append(ri)
        n0 = len(self.bm.faces)
        for i in range(n_len):
            for j in range(n_arc):
                self.bm.faces.new((outer[i][j], outer[i][j + 1], outer[i + 1][j + 1], outer[i + 1][j]))
        self._fin(n0, c_out)
        n1 = len(self.bm.faces)
        for i in range(n_len):
            for j in range(n_arc):
                self.bm.faces.new((inner[i][j], inner[i + 1][j], inner[i + 1][j + 1], inner[i][j + 1]))
        self._fin(n1, c_in)
        n2 = len(self.bm.faces)
        for i in range(n_len):
            for j in (0, n_arc):
                self.bm.faces.new((outer[i][j], outer[i + 1][j], inner[i + 1][j], inner[i][j]))
        self._fin(n2, c_rim)
        bmesh.ops.remove_doubles(self.bm, verts=self.bm.verts, dist=0.0008)
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        self.plank = plank; return self
    def done(self, at=(0, 0, 0)):
        if self.smooth: smooth_by_angle(self.bm, self.smooth)
        ob = super().done(at); ob['smooth'] = self.smooth; return ob

def _fib(n):
    out = []
    for i in range(n):
        z = (i + 0.5) / n; r = math.sqrt(max(0, 1 - z * z)); a = i * 2.399963
        out.append(Vector((r * math.cos(a), r * math.sin(a), z)))
    return out
_DIRS = _fib(18)

def export2(objs, path, ground=(), ao_dist=1.1, ao_str=0.62, grad=0.16):
    """Xuất tam giác + màu đỉnh đã bake AO + (nếu mềm) pháp tuyến. Trục Blender Z-up -> Three Y-up."""
    dg = bpy.context.evaluated_depsgraph_get(); out = {}; report = {}
    for ob in objs:
        ev = ob.evaluated_get(dg); me = ev.to_mesh(); me.calc_loop_triangles()
        mats = ob['mats'].split(','); smooth = ob.get('smooth', 0)
        verts = [v.co.copy() for v in me.vertices]; polys = [tuple(t.vertices) for t in me.loop_triangles]
        zmin = min(v.z for v in verts); zmax = max(v.z for v in verts); span = max(zmax - zmin, 1e-4)
        extra = []
        if ob.name in ground:
            g = 40.0; i0 = len(verts); verts += [Vector((-g, -g, 0)), Vector((g, -g, 0)), Vector((g, g, 0)), Vector((-g, g, 0))]; polys += [(i0, i0 + 1, i0 + 2), (i0, i0 + 2, i0 + 3)]
        bvh = BVHTree.FromPolygons(verts, polys, epsilon=0.0)
        nv = len(me.vertices); ao = [1.0] * nv
        for vi in range(nv):
            v = me.vertices[vi]; n = v.normal.normalized() if v.normal.length > 0 else Vector((0, 0, 1))
            tx = n.cross(Vector((0, 0, 1)) if abs(n.z) < 0.9 else Vector((1, 0, 0))).normalized(); ty = n.cross(tx)
            hit = 0
            for d in _DIRS:
                w = tx * d.x + ty * d.y + n * d.z
                if bvh.ray_cast(v.co + n * 0.015, w, ao_dist)[0] is not None: hit += 1
            ao[vi] = 1.0 - ao_str * hit / len(_DIRS)
        pos, col, nor = [], [], []
        for t in me.loop_triangles:
            poly = me.polygons[t.polygon_index]; base = PAL[mats[min(poly.material_index, len(mats) - 1)]]
            br, bg, bb = (base >> 16) & 255, (base >> 8) & 255, base & 255
            for k, vi in enumerate(t.vertices):
                p = verts[vi]; h = (p.z - zmin) / span; f = ao[vi] * (1 - grad / 2 + grad * h)
                col.append((min(255, int(br * f)) << 16) | (min(255, int(bg * f)) << 8) | min(255, int(bb * f)))
                pos += [round(p.x, 3), round(p.z, 3), round(-p.y, 3)]
                if smooth:
                    cn = me.corner_normals[t.loops[k]].vector if poly.use_smooth else t.normal
                    nor += [int(round(cn.x * 127)), int(round(cn.z * 127)), int(round(-cn.y * 127))]
        out[ob.name] = {'p': pos, 'v': col}
        if smooth: out[ob.name]['n'] = nor
        report[ob.name] = len(col) // 3
        ev.to_mesh_clear()
    with open(path, 'w') as f: json.dump(out, f, separators=(',', ':'))
    return report
