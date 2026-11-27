(() => {
  // Как у аватарки: обычный слой ниже панелей ST (настройки, расширения и т.д.),
  // поэтому окно видно только на странице чата. Если оно прячется под самой галереей, увеличьте Z (но не выше 2999)
  const Z = 1000;
  const THUMB = '.nGY2GThumbnail';
  const ROOT = '#dragGallery, #gallery, .nGY2Gallery';
  const WAIT_MS = 700;   // сколько ждём реакцию штатного кода на нажатие
  const DEBUG = false;   // true включает отладочные окна
  const dbg = m => { if (DEBUG) alert('Gallery Zoom: ' + m); };

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
    win.style.cssText =
      'position:fixed;margin:0;padding:0;' +
      `left:${innerWidth - w0 - 12}px;top:90px;width:${w0}px;height:auto;opacity:0;` +
      `z-index:${Z};touch-action:none;user-select:none;-webkit-user-select:none;` +
      'border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,.5)';

    const img = document.createElement('img');
    img.draggable = false;
    img.style.cssText = 'display:block;width:100%;height:auto;border-radius:10px;pointer-events:none;-webkit-user-drag:none';
    // Когда размер картинки известен, ставим окно внизу чата, прямо над полем ввода
    const place = () => {
      if (!win) return;
      const ratio = (img.naturalHeight / img.naturalWidth) || 1;
      const form = document.getElementById('form_sheld');
      const bottom = (form ? form.getBoundingClientRect().top : innerHeight - 100) - 10;
      const w = Math.min(w0, (innerHeight * 0.5) / ratio);
      const h = w * ratio;
      win.style.width = w + 'px';
      win.style.left = (innerWidth - w - 12) + 'px';
      win.style.top = Math.max(0, bottom - h) + 'px';
      win.style.opacity = '1';
    };
    img.onload = place;
    img.onerror = () => { if (win) win.style.opacity = '1'; };
    img.src = src;

    const btn = document.createElement('div');
    btn.textContent = '✕';
    btn.style.cssText = 'position:absolute;top:6px;right:6px;width:28px;height:28px;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;font-size:16px;display:flex;align-items:center;justify-content:center;cursor:pointer';
    btn.style.transition = 'opacity .3s';
    btn.addEventListener('pointerdown', e => e.stopPropagation());
    btn.addEventListener('pointerup', e => { e.stopPropagation(); close(); });

    // Крестик исчезает после 3 секунд бездействия и возвращается при касании окна
    let hideT = null;
    const showBtn = () => {
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
      clearTimeout(hideT);
      hideT = setTimeout(() => {
        btn.style.opacity = '0';
        btn.style.pointerEvents = 'none';
      }, 3000);
    };

    win.append(img, btn);
    document.body.appendChild(win);
    showBtn();

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
      showBtn();
      win.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) { startDist = dist(); startW = win.offsetWidth; }
    });

    win.addEventListener('pointermove', e => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      showBtn();
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
      showBtn();
      resize(win.offsetWidth * (e.deltaY < 0 ? 1.1 : 0.9));
    }, { passive: false });
  }

  // ---- Перехват штатного просмотра без таймеров ----
  // Нажатия НЕ блокируются: штатный код сам решает, что делать.
  //  - режим удаления: он показывает окно подтверждения (dialog), мы ничего не делаем;
  //  - обычный режим: он открывает свою картинку, мы её прячем и показываем наше окно.

  const thumbOf = e => {
    const th = e.target.closest && e.target.closest(THUMB);
    return th && th.closest(ROOT) ? th : null;
  };

  const isOurs = n => win && (n === win || win.contains(n));

  const isPopup = n =>
    n.tagName === 'DIALOG' || n.classList.contains('popup') || !!n.querySelector('dialog, .popup');

  // Окно штатного просмотра: новый элемент с картинкой прямо в body (или в #movingDivs)
  const isViewer = (n, parent) => {
    if (n.id === 'toast-container' || n.classList.contains('toast')) return false;
    if (parent !== document.body && parent.id !== 'movingDivs') return false;
    return n.tagName === 'IMG' || !!n.querySelector('img');
  };

  function watchTap(url) {
    let finished = false;
    const stray = [];
    const finish = (showOurs, why) => {
      if (finished) return;
      finished = true;
      obs.disconnect();
      clearTimeout(timer);
      dbg(why);
      if (showOurs) { stray.forEach(n => n.remove()); open(url); }
      else stray.forEach(n => n.style.removeProperty('display'));
    };
    const obs = new MutationObserver(muts => {
      for (const m of muts) {
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1 || isOurs(n)) continue;
          if (isPopup(n)) { finish(false, 'штатный код показал окно подтверждения (режим удаления)'); return; }
          if (isViewer(n, m.target)) {
            n.style.setProperty('display', 'none', 'important');
            stray.push(n);
            finish(true, 'штатный просмотр спрятан: ' + n.tagName + (n.id ? '#' + n.id : ''));
            return;
          }
        }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    const timer = setTimeout(() => finish(true, 'штатный просмотр не найден, открыто по таймауту'), WAIT_MS);
  }

  let down = null;
  window.addEventListener('pointerdown', e => {
    down = thumbOf(e) ? { x: e.clientX, y: e.clientY } : null;
  }, true);

  window.addEventListener('pointerup', e => {
    const th = thumbOf(e);
    const d = down; down = null;
    if (!th || !d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10) return;
    const url = urlOf(th);
    if (url) watchTap(url);
  }, true);

  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
})();
