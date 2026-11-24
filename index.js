(() => {
  const THUMB = '.nGY2GThumbnail';
  const ROOT = '#dragGallery, #gallery, .nGY2Gallery';
  let win = null;

  function urlOf(th) {
    const im = th.querySelector('img');
    let u = im && (im.currentSrc || im.src || im.dataset.src);
    if (!u) {
      for (const el of [th, ...th.querySelectorAll('*')]) {
        const m = /url\(["']?(.*?)["']?\)/.exec(getComputedStyle(el).backgroundImage);
        if (m) { u = m[1]; break; }
      }
    }
    return u || null;
  }

  function close() {
    if (win) { win.remove(); win = null; }
  }

  function open(src) {
    close();
    const w0 = Math.min(Math.round(innerWidth * 0.7), 360);
    win = document.createElement('div');
    // popover="manual" кладёт окно в top layer: оно поверх панели галереи,
    // но остальной интерфейс остаётся активным (в отличие от модального <dialog>)
    win.setAttribute('popover', 'manual');
    win.style.cssText =
      'position:fixed;inset:auto;margin:0;padding:0;border:0;overflow:visible;background:transparent;' +
      `left:${innerWidth - w0 - 12}px;top:90px;width:${w0}px;height:auto;` +
      'z-index:2147483000;touch-action:none;user-select:none;-webkit-user-select:none;' +
      'border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,.5)';

    const img = document.createElement('img');
    img.draggable = false;
    img.style.cssText = 'display:block;width:100%;height:auto;border-radius:10px;pointer-events:none;-webkit-user-drag:none';
    img.src = src;

    const btn = document.createElement('div');
    btn.textContent = '✕';
    btn.style.cssText = 'position:absolute;top:6px;right:6px;width:28px;height:28px;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;font-size:16px;display:flex;align-items:center;justify-content:center;cursor:pointer';
    btn.addEventListener('pointerdown', e => e.stopPropagation());
    btn.addEventListener('pointerup', e => { e.stopPropagation(); close(); });

    win.append(img, btn);
    document.body.appendChild(win);
    try { win.showPopover(); } catch (e) { /* старый браузер: останется обычный z-index */ }

    // не даём окну забирать фокус у поля ввода
    win.addEventListener('mousedown', e => e.preventDefault());
    win.addEventListener('touchstart', e => e.preventDefault(), { passive: false });

    const pts = new Map();
    let startDist = 0, startW = 0;
    const dist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
    const num = v => parseFloat(v) || 0;

    function resize(newW) {
      const w = win.offsetWidth, h = win.offsetHeight;
      newW = Math.min(innerWidth * 3, Math.max(80, newW));
      const cx = num(win.style.left) + w / 2;
      const cy = num(win.style.top) + h / 2;
      const newH = h * newW / w;
      win.style.width = newW + 'px';
      win.style.left = (cx - newW / 2) + 'px';
      win.style.top = (cy - newH / 2) + 'px';
    }

    function clamp() {
      const w = win.offsetWidth;
      const l = Math.min(innerWidth - 60, Math.max(60 - w, num(win.style.left)));
      const t = Math.min(innerHeight - 60, Math.max(0, num(win.style.top)));
      win.style.left = l + 'px';
      win.style.top = t + 'px';
    }

    win.addEventListener('pointerdown', e => {
      win.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) { startDist = dist(); startW = win.offsetWidth; }
    });

    win.addEventListener('pointermove', e => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      if (pts.size === 1) {
        win.style.left = (num(win.style.left) + e.clientX - p.x) + 'px';
        win.style.top = (num(win.style.top) + e.clientY - p.y) + 'px';
        p.x = e.clientX; p.y = e.clientY;
        clamp();
      } else if (pts.size === 2) {
        p.x = e.clientX; p.y = e.clientY;
        resize(startW * dist() / startDist);
      }
    });

    const up = e => { pts.delete(e.pointerId); };
    win.addEventListener('pointerup', up);
    win.addEventListener('pointercancel', up);

    win.addEventListener('wheel', e => {
      e.preventDefault();
      resize(win.offsetWidth * (e.deltaY < 0 ? 1.1 : 0.9));
    }, { passive: false });
  }

  // Перехватываем нажатия на миниатюры, чтобы не открывался штатный просмотрщик
  let down = null;
  const thumbOf = e => {
    const th = e.target.closest && e.target.closest(THUMB);
    return th && th.closest(ROOT) ? th : null;
  };

  ['mousedown', 'mouseup', 'touchstart', 'touchend', 'click'].forEach(type =>
    window.addEventListener(type, e => {
      if (!thumbOf(e)) return;
      e.stopImmediatePropagation();
      if (type === 'click') e.preventDefault();
    }, true));

  window.addEventListener('pointerdown', e => {
    if (!thumbOf(e)) return;
    down = { x: e.clientX, y: e.clientY };
    e.stopImmediatePropagation();
  }, true);

  window.addEventListener('pointerup', e => {
    const th = thumbOf(e);
    if (!th) return;
    e.stopImmediatePropagation();
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10) { down = null; return; }
    down = null;
    try {
      const u = urlOf(th);
      if (u) open(u);
    } catch (err) {
      alert('Gallery Zoom ошибка: ' + err.message);
    }
  }, true);

  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
})();
