# Kế Hoạch Triển Khai: Vẽ Lại Mô Hình Blender & Định Vị Không Gian Miền Tây Sông Nước

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vẽ lại tinh xảo các mô hình 3D trong Blender mang đậm bản sắc Nam Bộ (xuồng ba lá, cây bần rễ thở, ghe chợ cây bẹo & mắt ghe, nhà lá chằm, bàn thiên), xác định vị trí không gian chuẩn xác trên bản đồ sông rạch, và tích hợp cơ chế gameplay sinh hoạt miệt vườn.
**Architecture:** Dùng Low-poly Stylized nướng màu đỉnh (Vertex Colors) + AO từ Blender xuất ra Three.js BufferGeometry. Tách bạch các module dữ liệu (`data.js`), địa lý (`objs.js`), mô phỏng (`sim.js`), mô hình Three.js (`models.js`) và giao diện (`main.js`, `game.js`), đảm bảo mọi file không vượt quá 400 dòng code.
**Tech Stack:** Blender 5.2 Python API (`bpy`), Three.js, Vite, Vanilla JavaScript ES Modules.

---

## Bản Đồ Định Vị Không Gian Bản Địa (Mekong Spatial Layout)

```
               [BẮC: Sông Mê Kông chảy từ Đông Bắc (34, -26)]
                            \
                             \  [Lục bình trôi RS[i]]
                              \
  [TÂY: Bờ Rạch / Bưng Bền]    \    [ĐÔNG: Cánh Đồng Bờ Đông]
  - Rạch bùn LAKE (-23, 3)      \    - Chòi ruộng choi (15.5, 2.5)
  - Cây bần cổ thụ ban (-20, 2)  \   - Đàn trâu trau (18.5, 1.5)
  - Dừa nước dua_nuoc (-22, 5)    \  - 4 thửa ruộng PADDY (17..30, 3..12)
                                   \
   [KHU DÂN CƯ BỜ TÂY]              \
   - Nhà lá nha1/2/3 (-5.2, -5.2)    |  [Cầu khỉ cau_khi (5.1, -1.2)]
   - Bàn Thiên ban_thien (-3.8, -3.8)|====== (Bắc ngang sông) ======
   - Lu nước sành lu (-2.6, -3.2)    |
   - Bàn thợ bench (-0.2, -3.2)      |  [Bến tre ben_tre (2.6, -1.2)]
   - Cái võng vong (-7.2, -2.5)      |  - Xuồng ba lá xuong (3.6, -1.0)
   - Vườn rau BEDS (-6..-1.2, 1.2..3)|
   - Giàn bầu gian_bau (-7.5, 2.2)   |  [Ghe chợ nổi ghe_cho (9.5, 4.0)]
   - Chuồng gà vịt COOP (-0.6, 8.4)  |  - Neo đậu giờ Nước Lớn
   - Sạp chợ làng stall (4.2, 6.2)   /
                                    /
         [NAM: Sông chảy ra biển Đông (44, 26)]
```

---

## Danh Mục Công Việc Triển Khai

### Task 1: Vẽ lại Xuồng Ba Lá (`xuong`) chuẩn kỹ thuật đóng vỏ ghe Nam Bộ
**Files:** Modify: `art/blender/bl_organic.py`, Output: `art/mekong.blend`

- [ ] **Step 1: Viết kịch bản Python dựng Xuồng Ba Lá chuẩn kết cấu 3 be**
Cấu trúc: 1 tấm be đáy lòng máng uốn cong vểnh 2 đầu + 2 tấm be mạn cánh én vút nhọn ở mũi + 3 thanh cong xuồng chữ U + dầm chèo gỗ gác ngang.
```python
# Cập nhật make_xuong() trong bl_organic.py
b = S('xuong', 55)
for k in range(9):
    t = (k - 4) / 4.0; w = 0.44 * (1.0 - 0.45 * t * t); z = 0.05 + 0.16 * (t * t); y = t * 1.6
    b.box('go_cu', (0, y, z), (w, 0.42, 0.035), (t * 8, 0, 0))
for s in (-1, 1):
    for k in range(9):
        t = (k - 4) / 4.0; x = s * (0.24 + 0.12 * (1.0 - t * t)); y = t * 1.6; z = 0.18 + 0.18 * (t * t)
        b.box('go_nau', (x, y, z), (0.03, 0.42, 0.28), (t * 8, s * 22, 0))
for y in (-0.8, 0, 0.8): b.box('go_toi', (0, y, 0.1), (0.42, 0.06, 0.06))
b.box('go_sang', (0, -0.7, 0.24), (0.48, 0.22, 0.03))
b.cyl('go_nau', (0.35, -0.2, 0.45), 0.02, 0.02, 1.4, 5, (25, 0, -35))
b.box('go_sang', (0.7, 0.35, 0.18), (0.12, 0.35, 0.02), (25, 0, -35))
```
- [ ] **Step 2: Chạy kiểm thử lệnh dựng trong Blender**
Run: `/Applications/Blender.app/Contents/MacOS/Blender -b ./art/mekong.blend --python art/blender/bl_organic.py`
Expected: Exit code 0, tạo thành công mesh `xuong`.
- [ ] **Step 3: Commit code vẽ lại xuồng ba lá**
Run: `git add art/blender/ && git commit -m "art: redraw authentic southern Vietnamese xuong ba la model"`

---

### Task 2: Tinh chỉnh Ghe Chợ Nổi (`ghe_cho`) và Con Trâu (`trau`)
**Files:** Modify: `art/blender/bl_organic.py`

- [ ] **Step 1: Bổ sung Cây Bẹo và Cặp Mắt Ghe cho `ghe_cho`**
Thêm cọc tre cao 2.2m dựng ở mũi ghe treo chùm chuối, dưa hấu; vẽ 2 mắt ghe hình elip viền đỏ ở hai bên mũi.
```python
b.cyl('tre', (0, 1.3, 1.2), 0.03, 0.035, 2.3, 6, (-5, 0, 0))
b.ball('vang', (0, 1.25, 2.1), (0.12, 0.16, 0.12), 6)
for s in (-1, 1):
    b.ball('trang', (s * 0.48, 1.45, 0.45), (0.02, 0.08, 0.06), 6)
    b.ball('den', (s * 0.49, 1.48, 0.45), (0.015, 0.04, 0.04), 6)
```
- [ ] **Step 2: Nâng cấp hình khối cơ bắp và da bùn cho Con Trâu (`trau`)**
Chuyển khối thân liền mạch, cặp sừng dẹt cánh ná uốn cong mềm mại về sau lưng, chân phủ lớp bùn khô.
- [ ] **Step 3: Chạy render kiểm tra mô hình trâu và ghe**
Run: `/Applications/Blender.app/Contents/MacOS/Blender -b ./art/mekong.blend --python-expr "import bpy; assert 'ghe_cho' in bpy.data.objects and 'trau' in bpy.data.objects; print('OK')"`
Expected: Output `OK`.
- [ ] **Step 4: Commit**
Run: `git add art/blender/ && git commit -m "art: add cay beo, mat ghe to ghe_cho and refine trau model"`

---

### Task 3: Tinh chỉnh Cây Bần (`ban`) và Dừa Nước (`dua_nuoc`)
**Files:** Modify: `art/blender/bl_organic.py`

- [ ] **Step 1: Dựng Rừng Rễ Thở cọc búp măng cho Cây Bần**
Tạo chùm 25-30 cọc rễ thở nhọn hoắt chọc ngược từ lớp bùn quanh gốc bần, thân bần uốn nghiêng chồm ra mé nước, các đĩa tán lá mỏng xếp tầng rủ tha thướt.
```python
for i in range(28):
    a = (i / 28.0) * 6.283; r = 0.6 + 0.8 * ((i * 7) % 5) / 4.0; h = 0.25 + 0.2 * ((i * 3) % 4) / 3.0
    b.cone('go_cu', (math.cos(a) * r, math.sin(a) * r, h / 2), 0.035, h, 5)
```
- [ ] **Step 2: Dựng tàu lá Dừa Nước uốn lượn chữ S và quài dừa nước gai tròn**
Tàu dừa nước xòe từ gốc bùn, vươn cao rồi cong oằn ngọn xuống mặt nước theo trọng lực; buồng dừa nước hình cầu gai nách lá.
- [ ] **Step 3: Xuất mesh và kiểm tra số đa giác**
Run: `/Applications/Blender.app/Contents/MacOS/Blender -b ./art/mekong.blend --python art/blender/bl_organic.py`
Expected: Polygons của `ban` và `dua_nuoc` < 1200 polys mỗi vật thể.
- [ ] **Step 4: Commit**
Run: `git add art/blender/ && git commit -m "art: add pneumatophore roots to ban tree and realistic fronds to dua nuoc"`

---

### Task 4: Nâng cấp Nhà Lá (`nha1`), Cầu Khỉ (`cau_khi`), Bến Tre (`ben_tre`) & Dựng Bàn Thiên (`ban_thien`)
**Files:** Modify: `art/blender/bl_objects.py`, `art/blender/bl_scene.py`

- [ ] **Step 1: Dựng Bàn Thờ Thông Thiên (Bàn Thiên)**
Cột trụ cao 1.1m dựng trước sân, mặt bàn vuông 0.42m, bát nhang gốm men xanh và 3 chén nước con.
```python
b = B('ban_thien')
b.cyl('xi_mang', (0, 0, 0.55), 0.06, 0.07, 1.1, 7)
b.box('xi_mang', (0, 0, 1.12), (0.42, 0.42, 0.04))
b.cyl('men_xanh', (0, 0, 1.2), 0.06, 0.05, 0.1, 8)
for dx in (-0.08, 0, 0.08): b.cyl('trang', (dx, 0.12, 1.16), 0.02, 0.015, 0.04, 6)
```
- [ ] **Step 2: Nâng cấp mái lá dừa chằm 3 tầng cho `nha1` và cầu khỉ cọc chéo chữ X**
Thân cầu khỉ võng nhẹ 6cm theo đường cong tự nhiên, cọc trụ chữ X ghim vào bùn, một bên tay vịn gập ghềnh.
- [ ] **Step 3: Chạy script dựng và kiểm tra đối tượng**
Run: `/Applications/Blender.app/Contents/MacOS/Blender -b ./art/mekong.blend --python art/blender/bl_objects.py`
Expected: Tạo thành công các object với đầy đủ vertex color.
- [ ] **Step 4: Commit**
Run: `git add art/blender/ && git commit -m "art: add ban_thien and refine southern house, monkey bridge, bamboo dock"`

---

### Task 5: Xuất toàn bộ Model ra `public/models/mekong2.json`
**Files:** Modify: `art/blender/bl_helpers2.py`, Output: `public/models/mekong2.json`

- [ ] **Step 1: Cập nhật danh sách export trong Blender**
Bổ sung các key: `xuong`, `ghe_cho`, `trau`, `gian_bau`, `vong`, `choi`, `luc_binh`, `ban_thien` vào `export2()`.
- [ ] **Step 2: Chạy lệnh nướng AO (36 tia) và ghi file JSON**
Run: `/Applications/Blender.app/Contents/MacOS/Blender -b ./art/mekong.blend --python-expr "from bl_helpers2 import export2; export2('public/models/mekong2.json')"`
Expected: File sinh mới với dung lượng hợp lý (< 1.6MB).
- [ ] **Step 3: Kiểm tra tính toàn vẹn của JSON bằng Node.js**
Run: `node -e "const d = require('./public/models/mekong2.json'); ['xuong','ghe_cho','trau','ban_thien'].forEach(k => console.assert(d[k], 'Missing ' + k)); console.log('JSON Valid!')"`
Expected: In ra `JSON Valid!`.
- [ ] **Step 4: Commit**
Run: `git add public/models/mekong2.json && git commit -m "art: export refreshed mekong models to mekong2.json"`

---

### Task 6: Đổi Bảng Màu Nước Phù Sa Mê Kông và Điều Chỉnh Chân Trời
**Files:** Modify: `src/main.js:72-85`

- [ ] **Step 1: Cập nhật Canvas Texture nước sông Mê Kông cuộn đỏ phù sa**
Thay màu xanh `#58b2dc` bằng gradient phù sa: nền `#8e5932`, vân lượn `#b07448` và bọt ngà `#cfaf88`. Đổi `emissive` thành `0x241408`.
- [ ] **Step 2: Xóa bỏ các khối đồi nhấp nhô chân trời không hợp địa hình châu thổ**
Thay thế 26 khối cầu đồi núi bằng rặng cây xa mờ mịt chân trời.
- [ ] **Step 3: Kiểm tra bằng test script hoặc chạy thử Vite build**
Run: `npm run build`
Expected: Build thành công không có lỗi syntax.
- [ ] **Step 4: Commit**
Run: `git add src/main.js && git commit -m "style: switch to alluvial red Mekong river water palette"`

---

### Task 7: Thiết Lập Hệ Tọa Độ và Đặt 7 Item Biểu Trưng Vào Thế Giới Game
**Files:** Modify: `src/models.js`, `src/main.js`

- [ ] **Step 1: Thêm hàm tạo mesh trong `src/models.js`**
Khai báo các hàm nạp từ Blender:
`boatB`, `traderB`, `buffaloB`, `arborB`, `hammockB`, `hutB`, `altarB`.
- [ ] **Step 2: Đặt các item vào đúng tọa độ trong `src/main.js`**
Tọa độ: Bàn thiên `(-3.8, -3.8)`, Võng `(-7.2, -2.5)`, Giàn bầu `(-7.5, 2.2)`, Xuồng `(3.6, -1.0)`, Ghe chợ `(9.5, 4.0)`, Chòi `(15.5, 2.5)`, Trâu `(18.5, 1.5)`. Thêm interaction hitboxes.
- [ ] **Step 3: Kiểm tra rendering và hit boxes**
Run: `node -e "require('./src/models.js')"`
Expected: Nạp mô hình không lỗi.
- [ ] **Step 4: Commit**
Run: `git add src/models.js src/main.js && git commit -m "feat: position authentic Mekong items and hitboxes in world"`

---

### Task 8: Tích Hợp Cơ Chế Gameplay Cho Xuồng Ba Lá và Ghe Chợ Nổi
**Files:** Modify: `src/data.js`, `src/game.js`

- [ ] **Step 1: Bổ sung hành động Chèo Xuồng sang sông / Thăm lờ**
Chèo nhanh sang bờ Đông; thăm lờ cá nước sâu giữa dòng (thu cá lóc, cá chép to).
- [ ] **Step 2: Bổ sung Thương Lái Ghe Chợ Nổi**
Giờ Nước Lớn (`sod >= 2 && sod <= 4`), ghe chợ cập bến. Chạm vào ghe mở menu bán nông sản giá thưởng (+25%) và mua giống cây lạ.
- [ ] **Step 3: Viết test xác nhận logic thương lái**
Run: `node test.js`
Expected: Logic giá và con nước hoạt động chính xác.
- [ ] **Step 4: Commit**
Run: `git add src/data.js src/game.js && git commit -m "feat: implement boat navigation and floating market trader mechanics"`

---

### Task 9: Tích Hợp Cơ Chế Gameplay Cho Cái Võng, Giàn Bầu, Trâu & Chòi Ruộng
**Files:** Modify: `src/data.js`, `src/game.js`, `src/sim.js`

- [ ] **Step 1: Cơ chế Nằm Võng trưa hồi sức & Giàn Bầu hái quả**
Chạm vào `vong` tua nhanh trưa nắng gắt (`sod = 2..4`), hồi phục thể lực. Chạm `gian_bau` định kỳ hái bầu nấu canh giải nhiệt.
- [ ] **Step 2: Cơ chế Dắt Trâu cày ải & Chòi Ruộng bờ đông**
Trâu cày ruộng mùa mưa x2 sản lượng lúa. Chòi ruộng chứa hòm đồ tre phụ trợ khi khai thác rừng dừa tre.
- [ ] **Step 3: Kiểm tra rule file size (< 400 dòng code mỗi file)**
Run: `wc -l src/data.js src/game.js src/sim.js src/main.js src/models.js`
Expected: Mọi file đều < 400 dòng code.
- [ ] **Step 4: Commit**
Run: `git add src/data.js src/game.js src/sim.js && git commit -m "feat: implement hammock resting, arbor harvesting, and buffalo plowing"`

---

### Task 10: Kiểm Thử Toàn Diện và Tối Ưu Hóa
**Files:** Test: Toàn bộ hệ thống WebGL, UI và vòng lặp gameplay.

- [ ] **Step 1: Chạy build kiểm tra bundle và lỗi lint**
Run: `npm run build`
Expected: Build ra thư mục `dist/` thành công.
- [ ] **Step 2: Chạy kiểm thử tự động**
Run: `node test.js`
Expected: Tất cả test suite pass 100%.
- [ ] **Step 3: Commit hoàn tất kế hoạch**
Run: `git commit --allow-empty -m "chore: complete mekong asset redesign and spatial placement plan"`

---
*Kế hoạch tuân thủ chuẩn `writing-plans` và nguyên tắc file dưới 400 dòng code.*
