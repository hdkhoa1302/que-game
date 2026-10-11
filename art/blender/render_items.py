import bpy, math, os
from mathutils import Vector

ITEMS = [
    'xuong', 'ghe_cho', 'trau', 'ban', 'dua_nuoc',
    'ban_thien', 'cau_khi', 'ben_tre', 'nha1',
    'gian_bau', 'vong', 'choi', 'luc_binh'
]

OUT_DIR = os.path.abspath('art/preview/items')
os.makedirs(OUT_DIR, exist_ok=True)

sc = bpy.context.scene
sc.render.resolution_x = 800
sc.render.resolution_y = 600
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGBA'
sc.render.film_transparent = True

# Dùng EEVEE để render cực nhanh và nét
try:
    sc.render.engine = 'BLENDER_EEVEE_NEXT'
except Exception:
    sc.render.engine = 'BLENDER_EEVEE'

# Camera
cam_data = bpy.data.cameras.new('RenderCam')
cam_data.lens = 50
cam_obj = bpy.data.objects.new('RenderCam', cam_data)
sc.collection.objects.link(cam_obj)
sc.camera = cam_obj

# Đèn Sun & Rim light
light_data = bpy.data.lights.new('KeySun', 'SUN')
light_data.energy = 4.0
light_data.color = (1.0, 0.95, 0.88)
light_obj = bpy.data.objects.new('KeySun', light_data)
sc.collection.objects.link(light_obj)
light_obj.rotation_euler = (math.radians(55), math.radians(15), math.radians(45))

fill_data = bpy.data.lights.new('FillSun', 'SUN')
fill_data.energy = 1.8
fill_data.color = (0.75, 0.85, 1.0)
fill_obj = bpy.data.objects.new('FillSun', fill_data)
sc.collection.objects.link(fill_obj)
fill_obj.rotation_euler = (math.radians(35), math.radians(-30), math.radians(-135))

# Ẩn tất cả objects trong scene trước
all_objs = list(bpy.data.objects)
for o in all_objs:
    if o not in (cam_obj, light_obj, fill_obj):
        o.hide_render = True
        o.hide_viewport = True

def get_bbox_center_and_size(ob):
    mw = ob.matrix_world
    bbox = [mw @ Vector(b) for b in ob.bound_box]
    cen = sum(bbox, Vector((0, 0, 0))) / 8.0
    size = max((max(v[i] for v in bbox) - min(v[i] for v in bbox)) for i in range(3))
    return cen, max(size, 0.5)

rendered = []
for name in ITEMS:
    ob = bpy.data.objects.get(name)
    if not ob:
        print(f"Bỏ qua: không tìm thấy {name}")
        continue

    ob.hide_render = False
    ob.hide_viewport = False

    cen, size = get_bbox_center_and_size(ob)
    dist = size * 2.2

    # Đặt camera góc chéo 3/4 nhìn xuống
    cam_pos = cen + Vector((dist * 0.75, -dist * 1.1, dist * 0.7))
    cam_obj.location = cam_pos

    # Hướng camera vào tâm object
    direction = cen - cam_pos
    rot_quat = direction.to_track_quat('-Z', 'Y')
    cam_obj.rotation_euler = rot_quat.to_euler()

    out_path = os.path.join(OUT_DIR, f"{name}.png")
    sc.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    rendered.append(out_path)
    print(f"Đã render: {name} -> {out_path}")

    ob.hide_render = True
    ob.hide_viewport = True

print(f"Render hoàn tất {len(rendered)} ảnh vào {OUT_DIR}")
