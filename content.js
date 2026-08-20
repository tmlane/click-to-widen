(() => {
  if (window.__ctwLoaded) return;
  window.__ctwLoaded = true;

  const STYLE_ID = 'ctw-injected-styles';
  const STYLES = `
    :root { --ctw-strength: 0.65; }
    .ctw-hover { outline: 2px solid #ff3b30 !important; outline-offset: 2px !important; cursor: pointer !important; }
    .ctw-spotlight-hole {
      position: fixed !important;
      z-index: 2147483647 !important;
      pointer-events: none !important;
      background: transparent !important;
      box-shadow: 0 0 0 100vmax rgba(0, 0, 0, var(--ctw-strength)) !important;
      border-radius: 4px !important;
      transition: top 0.08s ease-out, left 0.08s ease-out, width 0.08s ease-out, height 0.08s ease-out, box-shadow 0.15s ease;
    }
  `;

  let activated = false;
  let currentMode = 'widen';
  let currentStrength = 0.65;
  let hoverEl = null;
  const transformed = new Map();

  function applyStrength(v) {
    currentStrength = Math.max(0, Math.min(1, Number(v) || 0.65));
    document.documentElement.style.setProperty('--ctw-strength', String(currentStrength));
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = STYLES;
    document.documentElement.appendChild(style);
  }

  function removeStyles() {
    document.getElementById(STYLE_ID)?.remove();
  }

  function clearHover() {
    if (hoverEl) {
      hoverEl.classList.remove('ctw-hover');
      hoverEl = null;
    }
  }

  function applyWiden(el) {
    const prior = {
      position: el.style.position,
      width: el.style.width,
      zIndex: el.style.zIndex,
      backgroundColor: el.style.backgroundColor,
      left: el.style.left,
      marginLeft: el.style.marginLeft,
    };
    const leftOffset = el.getBoundingClientRect().left;
    el.style.width = '98vw';
    el.style.position = 'relative';
    el.style.zIndex = '9999';
    if (!el.style.backgroundColor) el.style.backgroundColor = 'white';
    el.style.left = `-${leftOffset}px`;
    el.style.marginLeft = '.5vw';
    transformed.set(el, {
      mode: 'widen',
      restore: () => Object.assign(el.style, prior),
      reapply: () => {
        const off = el.getBoundingClientRect().left - parseFloat(el.style.left || '0');
        el.style.left = `-${off}px`;
      },
    });
  }

  function applySpotlight(el) {
    const hole = document.createElement('div');
    hole.className = 'ctw-spotlight-hole';
    document.body.appendChild(hole);

    const update = () => {
      const r = el.getBoundingClientRect();
      hole.style.top = r.top + 'px';
      hole.style.left = r.left + 'px';
      hole.style.width = r.width + 'px';
      hole.style.height = r.height + 'px';
    };
    update();

    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);

    transformed.set(el, {
      mode: 'spotlight',
      restore: () => {
        window.removeEventListener('scroll', update, true);
        window.removeEventListener('resize', update);
        hole.remove();
      },
      reapply: update,
    });
  }

  function toggleElement(el) {
    const entry = transformed.get(el);
    if (entry) {
      entry.restore();
      transformed.delete(el);
      return;
    }
    if (currentMode === 'spotlight') applySpotlight(el);
    else applyWiden(el);
  }

  function restoreAll() {
    for (const { restore } of transformed.values()) {
      try { restore(); } catch {}
    }
    transformed.clear();
  }

  const onMouseOver = (e) => {
    if (!activated) return;
    if (hoverEl === e.target) return;
    clearHover();
    hoverEl = e.target;
    hoverEl.classList.add('ctw-hover');
  };

  const onMouseOut = (e) => {
    if (!activated) return;
    if (e.target === hoverEl) {
      hoverEl.classList.remove('ctw-hover');
      hoverEl = null;
    }
  };

  const onClick = (e) => {
    if (!activated) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    const target = e.target;
    clearHover();
    toggleElement(target);
  };

  const onKeyDown = (e) => {
    if (!activated) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      deactivate();
    }
  };

  const onResize = () => {
    for (const [el, entry] of transformed) {
      if (entry.mode === 'widen') {
        entry.restore();
        transformed.delete(el);
        applyWiden(el);
      }
    }
  };

  function attach() {
    document.addEventListener('mouseover', onMouseOver, true);
    document.addEventListener('mouseout', onMouseOut, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('resize', onResize);
  }

  function detach() {
    document.removeEventListener('mouseover', onMouseOver, true);
    document.removeEventListener('mouseout', onMouseOut, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('resize', onResize);
  }

  function activate(mode, strength) {
    currentMode = mode === 'spotlight' ? 'spotlight' : 'widen';
    if (strength != null) applyStrength(strength);
    if (activated) return;
    activated = true;
    injectStyles();
    applyStrength(currentStrength);
    attach();
    chrome.runtime.sendMessage({ action: 'stateChanged', activated: true });
  }

  function deactivate() {
    if (!activated) return;
    activated = false;
    detach();
    clearHover();
    restoreAll();
    removeStyles();
    chrome.runtime.sendMessage({ action: 'stateChanged', activated: false });
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.action === 'activate') {
      activate(message.mode, message.strength);
      sendResponse({ ok: true, activated, mode: currentMode, strength: currentStrength });
    } else if (message?.action === 'deactivate') {
      deactivate();
      sendResponse({ ok: true, activated: false, mode: currentMode, strength: currentStrength });
    } else if (message?.action === 'updateSettings') {
      if (message.mode) currentMode = message.mode === 'spotlight' ? 'spotlight' : 'widen';
      if (message.strength != null) applyStrength(message.strength);
      sendResponse({ ok: true, activated, mode: currentMode, strength: currentStrength });
    } else if (message?.action === 'getState') {
      sendResponse({ activated, mode: currentMode, strength: currentStrength });
    }
    return true;
  });
})();
