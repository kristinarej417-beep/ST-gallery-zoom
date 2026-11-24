(() => {
  const THUMB = '.nGY2GThumbnail';
  const ROOT = '#dragGallery, #gallery';
  let ov = null, img = null, counter = null, list = [], idx = 0;
  let s = 1, tx = 0, ty = 0;

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

  function apply(anim) {
    if (!ov) return;
    const W = ov.clientWidth, H = ov.clientHeight;
    if (s <= 1.01) { s = 1; tx = 0; ty = 0; }
    else {
      tx = Math.min(0, Math.max(W - W * s, tx));
      ty = Math.min(0, Math.max(H - H * s, ty));
    }
    img.style.transition = anim ? 'transform .2s' : 'none';
    img.style.transform = `translate(${tx}px,${ty}px) scale(${s})`;
  }

  function zoomAt(px, py, ns) {
    ns = Math.min(8, Math.max(1, ns));
    tx = px - (px - tx) * ns / s;
    ty = py - (py - ty) * ns / s;
    s = ns;
  }

  function load() {
    s = 1; tx = 0; ty = 0;
    img.src = list[idx].url;
    if (counter) counter.textContent = `${idx + 1} / ${list.length}`;
    apply(false);
  }

  function go(d) {
    const n = idx + d;
    if (n < 0 || n >= list.length) return;
    idx = n; load();
  }

  function close() {
    if (ov) { ov.remove(); ov = null; }
  }

  function open(thumb) {
    close();
    const root = thumb.closest(ROOT);
    list = [...root.querySelectorAll(THUMB)]
      .map(t => ({ t, url: urlOf(t) })).filter(x => x.url);
    idx = Math.max(0, list.findIndex(x => x.t === thumb));

    ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.95);touch-action:none;user-select:none;-webkit-user-select:none;overflow:hidden';

    img = document.createElement('img');
    img.draggable = false;
    img.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;object-fit:contain;transform-origin:0 0;pointer-events:none;-webkit-user-drag:none;will-change:transform';
    ov.appendChild(img);

    const mkBtn = (txt, css, fn) => {
      const b = document.createElement('div');
      b.className = 'stt-btn';
      b.textContent = txt;
      b.style.cssText = 'position:absolute;width:44px;height:44px;border-radius:50%;background:rgba(0,0,0,.55);color:#fff;font-size:22px;display:flex;align-items:center;justify-content:center;cursor:pointer;' + css;
      b.addEventListener('click', e => { e.stopPropagation(); fn(); });
      ov.appendChild(b);
    };
    mkBtn('✕', 'top:calc(env(safe-area-inset-top,0px) + 12px);right:12px', close);
    if (list.length > 1) {
      mkBtn('‹', 'left:8px;top:50%;margin-top:-22px', () => go(-1));
      mkBtn('›', 'right:8px;top:50%;margin-top:-22px', () => go(1));
      counter = document.createElement('div');
      counter.style.cssText = 'position:absolute;bottom:14px;left:50%;transform:translateX(-50%);color:#fff;font-size:14px;background:rgba(0,0,0,.55);padding:3px 10px;border-radius:12px;pointer-events:none';
      ov.appendChild(counter);
    } else counter = null;

    const pts = new Map();
    let pinch = null, tapStart = null, lastTap = 0;

    ov.addEventListener('pointerdown', e => {
      if (e.target.closest('.stt-btn')) return;
      ov.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) {
        tapStart = { x: e.clientX, y: e.clientY, t: Date.now(), moved: false };
      } else if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s, cx: (mx - tx) / s, cy: (my - ty) / s };
        tapStart = null;
      }
    });

    ov.addEventListener('pointermove', e => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      if (pts.size === 1) {
        if (s > 1) { tx += e.clientX - p.x; ty += e.clientY - p.y; }
        p.x = e.clientX; p.y = e.clientY;
        if (tapStart && Math.hypot(p.x - tapStart.x, p.y - tapStart.y) > 10) tapStart.moved = true;
      } else if (pts.size === 2 && pinch) {
        p.x = e.clientX; p.y = e.clientY;
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        s = Math.min(8, Math.max(1, pinch.s * d / pinch.d));
        tx = mx - pinch.cx * s;
        ty = my - pinch.cy * s;
      }
      apply(false);
    });

    ov.addEventListener('pointerup', e => {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (pts.size === 0 && tapStart) {
        const dx = e.clientX - tapStart.x, dy = e.clientY - tapStart.y;
        if (!tapStart.moved && Date.now() - tapStart.t < 300) {
          if (Date.now() - lastTap < 300) {
            if (s > 1) { s = 1; tx = 0; ty = 0; }
            else zoomAt(e.clientX, e.clientY, 2.5);
            lastTap = 0;
          } else lastTap = Date.now();
        } else if (s === 1 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          go(dx < 0 ? 1 : -1);
        }
        tapStart = null;
      }
      apply(true);
    });

    ov.addEventListener('pointercancel', e => {
      pts.delete(e.pointerId); pinch = null; tapStart = null; apply(true);
    });

    ov.addEventListener('wheel', e => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, s * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
      apply(false);
    }, { passive: false });

    document.body.appendChild(ov);
    load();
  }

  // Перехватываем нажатия на миниатюры, чтобы не открывался штатный просмотрщик
  ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'click']
    .forEach(type => window.addEventListener(type, e => {
      const th = e.target.closest && e.target.closest(THUMB);
      if (!th || !th.closest(ROOT) || !urlOf(th)) return;
      e.stopImmediatePropagation();
      if (type === 'click') { e.preventDefault(); open(th); }
    }, true));

  document.addEventListener('keydown', e => {
    if (!ov) return;
    if (['Escape', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.stopImmediatePropagation();
      if (e.key === 'Escape') close();
      else go(e.key === 'ArrowLeft' ? -1 : 1);
    }
  }, true);
})();
