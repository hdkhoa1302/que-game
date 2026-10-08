# Mô hình Blender (miền Tây)

- `bl_helpers.py`: bảng màu PAL và bộ dựng khối nguyên thủy (`B`).
- `bl_helpers2.py`: bề mặt mềm (`S`: hull, tán lá gồ ghề, lá cong), bake AO và xuất `export2` ra `public/models/mekong2.json`.
- `bl_organic.py`: dựng lại các món hữu cơ (trâu, bần, dừa nước, lục bình, nhân vật, lúa).
- `bl_scene.py`: dựng cảnh làng chất lượng cao để render ảnh minh họa (Cycles).
- Các script `exec(open(...))` dùng đường dẫn tuyệt đối của máy tác giả; đổi lại khi chạy chỗ khác.
- `../mekong.blend`, `../mekong.glb`: nguồn và bản glTF.
