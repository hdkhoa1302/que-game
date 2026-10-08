# Mô hình Blender (miền Tây)

- `bl_helpers.py`: bảng màu PAL và bộ dựng khối nguyên thủy (`B`).
- `bl_helpers2.py`: bề mặt mềm (`S`: hull, tán lá gồ ghề, lá cong), bake AO và xuất `export2` ra `public/models/mekong2.json`.
- `bl_organic.py`: dựng lại các món hữu cơ (trâu, bần, dừa nước, lục bình, nhân vật, lúa).
- `bl_scene.py`: dựng cảnh làng chất lượng cao để render ảnh minh họa (Cycles).
- Các script `exec(open(...))` dùng đường dẫn tuyệt đối của máy tác giả; đổi lại khi chạy chỗ khác.
- `../mekong.blend`, `../mekong.glb`: nguồn và bản glTF.

- Bản xuất cho game chỉ giữ các mô hình còn dùng: nhà ×3, nhân vật, dừa nước, cây bần, cầu khỉ, quầy chợ, bến tre, lúa. Trâu, giàn bầu, võng, chòi, xuồng, ghe chợ nổi, lục bình đã bỏ khỏi game (không có tác dụng); script dựng vẫn còn trong `bl_organic.py` và `mekong.blend`.
