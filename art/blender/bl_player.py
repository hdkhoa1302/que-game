# Nhân vật: nón lá + áo bà ba + quần lụa đen, chân đất. Chạy: blender -b --python bl_player.py
import os, sys
exec(open('/private/tmp/claude-501/-Users-dangkhoahuynh-workplace-green/74cf7ad4-82b0-4bff-abab-5ac56d20dbe5/scratchpad/bl_helpers2.py').read())
import math as _m
PAL.update({'non_la': 0xf6e9b4, 'non_soc': 0xc9a85a, 'ba_ba': 0x2a2b31, 'ba_ba_toi': 0x4a4c56, 'quan_den': 0xe9e2cf, 'nut': 0xf4efe0, 'toc': 0x1c1a1a})
OUT = os.environ.get('PLAYER_OUT', '/tmp/player.json')
clear_all()
# ---- thân (gốc ở eo, chân gắn tại z=0.4, mặt trước hướng -Y) ----
b = S('player_body', 50)
# áo bà ba: thân dài qua hông, loe nhẹ ở vạt
b.cyl('ba_ba', (0, 0, 0.6), 0.225, 0.165, 0.5, 12)
b.cyl('ba_ba_toi', (0, 0, 0.37), 0.235, 0.235, 0.03, 12)               # viền vạt áo
b.box('ba_ba_toi', (0, -0.005, 0.6), (0.012, 0.36, 0.5), (0, 0, 0))    # nẹp áo giữa (mỏng, nằm trong thân)
# hàng nút trước ngực (khuy bà ba)
for i in range(5):
    b.ball('nut', (0, -0.19 + 0.0 * i, 0.77 - i * 0.09), (0.03, 0.03, 0.03), 6, 4)
# túi áo hai bên vạt
for s in (-1, 1):
    b.box('ba_ba_toi', (s * 0.11, -0.2, 0.46), (0.1, 0.03, 0.1), (0, 0, 0))
# cổ áo tròn đứng
b.cyl('ba_ba_toi', (0, 0, 0.855), 0.1, 0.085, 0.06, 10)
# tay áo dài rộng, buông xuống, kết thúc bằng bàn tay
for s in (-1, 1):
    b.cyl('ba_ba', (s * 0.29, 0, 0.64), 0.075, 0.062, 0.36, 8, (0, s * 14, 0))
    b.cyl('ba_ba_toi', (s * 0.325, 0, 0.465), 0.066, 0.066, 0.03, 8, (0, s * 14, 0))   # lơ tay
    b.ball('da', (s * 0.335, 0, 0.43), (0.055, 0.055, 0.055), 7, 5)
# đầu, mắt, tóc
b.ball('da', (0, 0, 0.99), (0.17, 0.17, 0.18), 12, 8)
for s in (-1, 1): b.ball('toc', (s * 0.065, -0.155, 1.0), (0.022, 0.018, 0.03), 5, 4)
b.ball('toc', (0, 0.07, 1.02), (0.175, 0.12, 0.15), 10, 6)              # tóc sau gáy
# khăn rằn vắt cổ
for i in range(12):
    a = _m.radians(i * 30)
    b.box('khan_ran_do' if i % 2 == 0 else 'khan_ran_trang', (_m.cos(a) * 0.115, _m.sin(a) * 0.1, 0.835), (0.085, 0.05, 0.05), (0, 0, _m.degrees(a)))
# nón lá: chóp cao nhọn đỉnh, vành rộng, sọc nan xen kẽ
R0, H0, Z0 = 0.46, 0.38, 1.04
for k in range(4):
    t0, t1 = k / 4, (k + 1) / 4
    b.cyl('non_la' if k % 2 == 0 else 'non_soc', (0, 0, Z0 + H0 * (t0 + t1) / 2), R0 * (1 - t0), R0 * (1 - t1), H0 / 4, 24)
b.cyl('non_soc', (0, 0, Z0 - 0.005), R0 + 0.01, R0 + 0.01, 0.02, 24)
b.ball('non_soc', (0, 0, Z0 + H0), (0.035, 0.035, 0.035), 6, 4)
for s in (-1, 1): b.box('sen_hong', (s * 0.15, -0.06, 0.93), (0.02, 0.02, 0.22), (0, 0, 0))   # quai nón
body = b.done((0, 0, 0))
# ---- chân: ống quần lụa đen rộng, chân đất (gốc ở hông) ----
b = S('player_leg', 50)
b.cyl('quan_den', (0, 0, -0.17), 0.085, 0.105, 0.34, 8)
b.box('da', (0, -0.035, -0.4), (0.13, 0.22, 0.07))
leg = b.done((2, 0, 0))
print(export2([body, leg], OUT))
