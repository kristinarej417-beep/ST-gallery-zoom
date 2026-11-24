alert('Gallery Zoom: скрипт загружен');

window.addEventListener('pointerup', e => {
  const chain = [];
  let el = e.target;
  for (let i = 0; el && i < 6; i++, el = el.parentElement) {
    const cls = typeof el.className === 'string' && el.className.trim()
      ? '.' + el.className.trim().split(/\s+/).join('.') : '';
    chain.push(el.tagName + (el.id ? '#' + el.id : '') + cls);
  }
  alert(chain.join('\n'));
}, true);
