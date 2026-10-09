# Mô hình Blender (miền Tây)

- `bl_helpers.py`: bảng màu PAL và bộ dựng khối nguyên thủy (`B`).
- `bl_helpers2.py`: bề mặt mềm (`S`: hull, tán lá gồ ghề, lá cong), bake AO và xuất `export2` ra `public/models/mekong2.json`.
- `bl_organic.py`: dựng lại các món hữu cơ (trâu, bần, dừa nước, lục bình, nhân vật, lúa).
- `bl_scene.py`: dựng cảnh làng chất lượng cao để render ảnh minh họa (Cycles).
- Các script `exec(open(...))` dùng đường dẫn tuyệt đối của máy tác giả; đổi lại khi chạy chỗ khác.
- `../mekong.blend`, `../mekong.glb`: nguồn và bản glTF.

- Bản xuất cho game chỉ giữ các mô hình còn dùng: nhà ×3, nhân vật, dừa nước, cây bần, cầu khỉ, quầy chợ, bến tre, lúa. Trâu, giàn bầu, võng, chòi, xuồng, ghe chợ nổi, lục bình đã bỏ khỏi game (không có tác dụng); script dựng vẫn còn trong `bl_organic.py` và `mekong.blend`.

- `bl_objects.py`: vật thể khai thác (cây, dừa, bụi tre lớn, đá, cỏ, lau sậy, đất sét, ốc, bụi quả, điên điển, bông súng, cành, cuội, cỏ dại, dừa nước), tên `o_<loại>`; `bl_player.py`: nhân vật. Chạy `blender -b --python <file>` rồi gộp JSON xuất ra vào `public/models/mekong2.json`.
- Bố cục: cây/tre/đá mọc thành cụm, cành khô cạnh cây/bụi, đá cuội cạnh đá, dừa nước/lau sậy/bần/ốc/súng/điên điển/sét dọc mép sông (xem `ZONES`, `WATER_MIX`, `OBJ_NEAR` trong `src/data.js`).
