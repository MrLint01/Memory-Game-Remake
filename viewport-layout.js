(() => {
  'use strict';
  const frame = document.getElementById('viewportFrame');
  const main = frame.querySelector('main');
  const footer = document.getElementById('gameFooter');
  const footerContent = document.getElementById('gameFooterContent');
  const handle = document.getElementById('controlsHandle');
  let pending = 0;
  let touchOpen = false;
  let failedScreen = false;

  const isFailedScreen = () => document.body.classList.contains('scattered-round') &&
    document.body.classList.contains('stage-fail') && document.body.dataset.state === 'result';

  function setOpen(open) {
    const failed = isFailedScreen();
    if (failed !== failedScreen) {
      footer.classList.remove('controls-ready');
      failedScreen = failed;
    }
    open = open || !failed;
    if (failed && open) footer.classList.add('controls-ready');
    footer.classList.toggle('controls-open', open);
    handle.setAttribute('aria-expanded', String(open));
    handle.setAttribute('aria-label', open ? 'Hide game controls' : 'Show game controls');
    // Closed controls cannot accidentally intercept clicks or keyboard focus.
    footerContent.inert = !open;
  }
  handle.addEventListener('click', event => {
    if (event.pointerType === 'mouse') { setOpen(true); return; }
    touchOpen = !touchOpen;
    setOpen(touchOpen);
  });
  handle.addEventListener('focus', () => setOpen(true));
  footer.addEventListener('keydown', event => {
    // Let focused buttons use their native activation rather than submitting
    // the round through the game's global Enter shortcut.
    if ((event.key === 'Enter' || event.key === ' ') && event.target.closest('button')) {
      event.stopPropagation();
    }
  });
  document.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || !isFailedScreen()) return;
    if (event.buttons) return;
    const bounds = footer.getBoundingClientRect();
    const bottomRegion = event.clientY >= bounds.bottom - 72;
    const withinOverlay = footer.classList.contains('controls-open') && event.clientY >= bounds.top;
    const keyboardFocus = footer.contains(document.activeElement) && document.activeElement.matches(':focus-visible');
    setOpen(bottomRegion || withinOverlay || keyboardFocus);
  });
  document.documentElement.addEventListener('pointerleave', () => {
    if (!touchOpen && !document.activeElement.matches(':focus-visible')) setOpen(false);
  });
  document.addEventListener('pointerdown', event => {
    if (!footer.contains(event.target)) { touchOpen = false; setOpen(false); }
  });
  footer.addEventListener('focusout', () => {
    requestAnimationFrame(() => {
      if (!footer.contains(document.activeElement) && !touchOpen) setOpen(false);
    });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && isFailedScreen() && footer.classList.contains('controls-open')) {
      touchOpen = false;
      if (footer.contains(document.activeElement)) document.activeElement.blur();
      setOpen(false);
    }
  });

  function fit() {
    const active = document.body.classList.contains('scattered-round');
    if (active) {
      main.style.transform = '';
      const width = Math.max(360, Math.min(900, footer.clientWidth));
      footerContent.style.width = `${width}px`;
      const height = Math.max(1, footerContent.scrollHeight);
      const budget = Math.max(1, frame.clientHeight * 0.48 - 32);
      const scale = Math.min(1, footer.clientWidth / width, budget / height);
      footer.style.height = `${Math.max(72, height * scale + 40)}px`;
      footerContent.style.transform = `translateX(-50%) scale(${scale})`;
    } else {
      const scale = Math.min(1, frame.clientWidth / Math.max(main.offsetWidth, main.scrollWidth), frame.clientHeight / Math.max(main.offsetHeight, main.scrollHeight));
      main.style.transform = `translate(-50%, -50%) scale(${scale})`;
    }
  }
  const schedule = () => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(fit);
  };
  const observer = new ResizeObserver(schedule);
  [frame, main, footer, footerContent].forEach(node => observer.observe(node));
  new MutationObserver(() => {
    touchOpen = false;
    setOpen(false);
    schedule();
  }).observe(document.body, { attributes: true, attributeFilter: ['class', 'data-state', 'data-view'] });
  window.addEventListener('resize', schedule);
  setOpen(false);
  schedule();
})();
