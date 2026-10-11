import * as THREE from 'three';

export const setupInput = ({ canvas, camera, joy, getAz, setAz, getZoom, setZoom, onTap }) => {
  const el = document.querySelector('#joy'), knob = el.firstElementChild;
  let jId = null;
  const setJoy = (e) => {
    const r = el.getBoundingClientRect(), R = 38;
    let x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
    const l = Math.hypot(x, y);
    if (l > R) { x = (x / l) * R; y = (y / l) * R; }
    knob.style.transform = `translate(${x}px,${y}px)`;
    joy.x = x / R; joy.y = y / R;
  };
  const endJoy = () => { jId = null; joy.x = joy.y = 0; knob.style.transform = ''; };
  el.addEventListener('pointerdown', (e) => { jId = e.pointerId; el.setPointerCapture(jId); setJoy(e); e.stopPropagation(); });
  el.addEventListener('pointermove', (e) => { if (e.pointerId === jId) setJoy(e); });
  el.addEventListener('pointerup', endJoy);
  el.addEventListener('pointercancel', endJoy);

  const ptrs = new Map();
  let moved = 0, pinch0 = 0, zoom0 = 1;
  const pdist = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved = 0;
    if (ptrs.size === 2) { pinch0 = pdist(); zoom0 = getZoom(); moved = 99; }
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = ptrs.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size === 1) {
      moved += Math.abs(dx) + Math.abs(dy);
      if (moved > 12) setAz(getAz() - dx * 0.008);
    } else if (ptrs.size === 2) {
      setZoom(THREE.MathUtils.clamp((zoom0 * pinch0) / pdist(), 0.55, 1.35));
    }
  });
  const endPtr = (e) => ptrs.delete(e.pointerId);
  canvas.addEventListener('pointercancel', endPtr);
  canvas.addEventListener('wheel', (e) => {
    setZoom(THREE.MathUtils.clamp(getZoom() * (1 + e.deltaY * 0.001), 0.55, 1.35));
  }, { passive: true });
  canvas.addEventListener('pointerup', (e) => {
    const tap = ptrs.size === 1 && moved <= 12;
    endPtr(e);
    if (tap) onTap(e);
  });
};
