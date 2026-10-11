import bpy, os, json
_DIR = os.path.dirname(os.path.abspath(__file__)) if '__file__' in globals() else os.path.join(os.getcwd(), 'art/blender')
exec(open(os.path.join(_DIR, 'bl_helpers2.py')).read())

KEYS = [
    'nha1', 'nha2', 'nha3', 'cau_khi', 'ben_tre', 'quay_cho', 'choi', 'gian_bau', 'vong', 'ban_thien',
    'player_body', 'player_leg', 'xuong', 'ghe_cho', 'trau', 'dua_nuoc', 'ban', 'lua_xanh', 'lua_chin', 'luc_binh'
]
ground_set = {'nha1', 'nha2', 'nha3', 'cau_khi', 'ben_tre', 'quay_cho', 'choi', 'ban_thien', 'ban', 'dua_nuoc', 'trau'}
objs = [bpy.data.objects[k] for k in KEYS if k in bpy.data.objects]

tmp_blend_path = '/tmp/blend_models.json'
report = export2(objs, tmp_blend_path, ground=ground_set, ao_dist=1.2, ao_str=0.62)
print("Exported from blend:", report)
