(() => {
  const includes = Array.from(document.querySelectorAll('[data-include]'));
  const loadTimeoutMs = 15000;

  const injectIncludes = async () => {
    await Promise.all(
      includes.map(async (el) => {
        const src = el.getAttribute('data-include');
        if (!src) return;
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), loadTimeoutMs);
        try {
          const res = await fetch(src, { cache: 'no-cache', signal: controller.signal });
          if (!res.ok) {
            throw new Error(`Failed to load ${src}: ${res.status}`);
          }
          const html = await res.text();
          el.outerHTML = html;
        } finally {
          window.clearTimeout(timeout);
        }
      })
    );
  };

  const loadScript = (src) =>
    new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const cacheBust = Date.now();
      script.src = src.includes('?') ? `${src}&v=${cacheBust}` : `${src}?v=${cacheBust}`;
      script.defer = true;
      const finish = (error) => {
        window.clearTimeout(timeout);
        window.removeEventListener('error', onRuntimeError);
        script.onload = null;
        script.onerror = null;
        if (error) {
          script.remove();
          reject(error);
        } else {
          resolve();
        }
      };
      const onRuntimeError = (event) => {
        if (event.filename === script.src) {
          finish(event.error || new Error(`Failed to initialize ${src}`));
        }
      };
      const timeout = window.setTimeout(
        () => finish(new Error(`Timed out loading ${src}`)), loadTimeoutMs
      );
      window.addEventListener('error', onRuntimeError);
      script.onload = () => finish();
      script.onerror = () => finish(new Error(`Failed to load ${src}`));
      document.body.appendChild(script);
    });

  const showLoadingError = (error) => {
    console.error(error);
    document.body.classList.remove('loading-overlay', 'initial-loading');
    document.body.dataset.view = 'load-error';
    const loading = document.getElementById('splashLoading');
    if (loading) loading.setAttribute('aria-hidden', 'true');
    const panel = document.createElement('section');
    panel.id = 'gameLoadError';
    panel.setAttribute('role', 'alert');
    panel.style.cssText = 'position:fixed;inset:0;z-index:100000;display:grid;place-content:center;gap:1rem;padding:2rem;text-align:center;background:var(--paper,#111827);color:var(--ink,#fff)';
    const heading = document.createElement('h1');
    heading.textContent = "The game couldn't finish loading.";
    const message = document.createElement('p');
    message.textContent = 'Check your connection and reload to try again.';
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = 'Reload game';
    retry.addEventListener('click', () => window.location.reload());
    panel.append(heading, message, retry);
    document.body.appendChild(panel);
    retry.focus();
  };

  const scriptList = [
    'settings-defaults.js',
    'credits-data.js',
    'data.js',
    'stages-instructions.js',
    'stages-data.js',
    'stages-mode.js',
    'app-core.js',
    'modifiers/background-color.js',
    'modifiers/text-color.js',
    'modifiers/previous-card.js',
    'modifiers/misleading-colors.js',
    'modifiers/math-ops.js',
    'modifiers/glitch.js',
    'modifiers/fog.js',
    'modifiers/blur.js',
    'modifiers/ads.js',
    'modifiers/swap.js',
    'modifiers/platformer.js',
    'app-game.js',
    'wiring-challenge.js',
    'country-challenge.js',
    'memory-challenges.js',
    'scatter-layout.js',
    'viewport-layout.js',
    'app-events.js'
  ];

  (async () => {
    try {
      await injectIncludes();
      for (const src of scriptList) {
        await loadScript(src);
        if (src === 'country-challenge.js') await window.CountryChallenge.ready;
      }
    } catch (error) {
      showLoadingError(error);
    }
  })();
})();
