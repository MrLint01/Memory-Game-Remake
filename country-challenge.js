(() => {
  'use strict';
  const width = 2754, height = 1398;
  // The 193 UN member states, using the supplied map's ISO alpha-2 IDs.
  // Source: https://www.un.org/en/about-us/member-states
  // Territories and non-member observers are intentionally excluded.
  const memberCodes = new Set(`
    AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI
    CV KH CM CA CF TD CL CN CO KM CG CD CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE
    SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HU IS IN ID IR IQ IE IL IT JM
    JP JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MG MW MY MV ML MT MH MR MU MX
    FM MD MC MN ME MA MZ MM NA NR NP NL NZ NI NE NG MK NO OM PK PW PA PG PY PE PH PL PT
    QA RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA SS ES LK SD SR SE CH
    SY TJ TZ TH TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VE VN YE ZM ZW
  `.trim().split(/\s+/));
  const commonNames = {
    BO: 'Bolivia', CD: 'Democratic Republic of the Congo', CG: 'Republic of the Congo',
    CI: 'Côte d’Ivoire', CV: 'Cabo Verde', CZ: 'Czechia', FM: 'Micronesia', IR: 'Iran',
    KP: 'North Korea', KR: 'South Korea', LA: 'Laos', MD: 'Moldova', MH: 'Marshall Islands',
    MK: 'North Macedonia', MV: 'Maldives', RU: 'Russia', SC: 'Seychelles', SY: 'Syria',
    TR: 'Türkiye', TZ: 'Tanzania', US: 'United States', VE: 'Venezuela', VN: 'Vietnam'
  };
  let template;
  let countries = [];
  const names = new Map();
  const shuffle = list => {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  async function load() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('country_quiz/BlankMap-World.svg', { signal: controller.signal });
      if (!response.ok) throw new Error(`World map could not load (${response.status}).`);
      const documentSvg = new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
      if (documentSvg.querySelector('parsererror')) throw new Error('World map SVG is invalid.');
      template = document.importNode(documentSvg.documentElement, true);
      // The supplied asset contains optional invisible political overlays and
      // locator circles. Only actual, visible geographic outlines are selectable.
      template.querySelectorAll('style,script,foreignObject,.limitxx,.unxx,.noxx,.circlexx,.subxx').forEach(node => node.remove());
      const owners = new Map();
      template.querySelectorAll('[id]').forEach(node => {
        const match = /^([a-z]{2})-?$/.exec(node.id);
        const title = [...node.children].find(child => child.localName === 'title');
        if (match && !match[1].startsWith('x') && match[1] !== 'aq' && title) {
          const code = match[1].toUpperCase();
          owners.set(node, code);
          if (memberCodes.has(code)) names.set(code, commonNames[code] || title.textContent.trim());
        }
      });
      template.querySelectorAll('path').forEach(shape => {
        let owner = shape;
        while (owner && !owners.has(owner)) owner = owner.parentElement;
        if (owner && memberCodes.has(owners.get(owner)) && shape.closest('.landxx')) shape.dataset.country = owners.get(owner);
        shape.style.fill = shape.id === 'ocean' ? '#fff' : '#d5d5d5';
        shape.style.stroke = '#fff';
        shape.style.strokeWidth = '0.55';
        shape.setAttribute('vector-effect', 'non-scaling-stroke');
        if (!shape.dataset.country) shape.style.pointerEvents = 'none';
      });
      template.querySelectorAll('[id]').forEach(node => { node.id = `country-map-${node.id}`; });
      template.querySelectorAll('title').forEach(node => node.remove());
      template.setAttribute('viewBox', `0 0 ${width} ${height}`);
      template.removeAttribute('width'); template.removeAttribute('height');
      template.classList.add('country-map-svg');
      // Rank prompt pools by their drawn selectable area, using this asset's
      // geometry rather than introducing another geographic dataset.
      template.style.cssText = 'position:fixed;width:2754px;height:1398px;visibility:hidden;pointer-events:none;';
      document.body.appendChild(template);
      const area = new Map();
      template.querySelectorAll('[data-country]').forEach(shape => {
        const box = shape.getBBox();
        area.set(shape.dataset.country, (area.get(shape.dataset.country) || 0) + box.width * box.height);
      });
      template.remove(); template.removeAttribute('style');
      countries = [...area].map(([code, area]) => ({ code, name: names.get(code), area })).sort((a, b) => b.area - a.area);
      if (memberCodes.size !== 193 || countries.length !== 193) throw new Error('World map must contain all 193 UN member states.');
    } finally { clearTimeout(timeout); }
  }
  function generate(config) {
    const pool = countries.slice(0, config.difficulty === 1 ? 70 : config.difficulty === 2 ? 140 : countries.length);
    return { solution: shuffle(pool).slice(0, config.count).map(country => country.code),
      selected: [], mapView: { zoom: 1, x: 0, y: 0 } };
  }
  function grade(record) {
    const selected = new Set(record.selected), target = new Set(record.solution);
    const correctIds = record.selected.filter(code => target.has(code));
    const missedIds = record.solution.filter(code => !selected.has(code));
    const incorrectIds = record.selected.filter(code => !target.has(code));
    return { correct: !missedIds.length && !incorrectIds.length, correctCount: correctIds.length,
      selected: selected.size, required: target.size, correctIds, missedIds, incorrectIds };
  }
  function mount(record, { reveal, review, canInteract }) {
    const board = document.createElement('div'); board.className = 'memory-grid country-board';
    if (reveal) {
      const list = document.createElement('ul'); list.className = 'country-prompt';
      record.solution.forEach((code, index) => {
        const item = document.createElement('li');
        item.className = 'card country-card';
        item.dataset.countryIndex = index;
        const label = document.createElement('span'); label.className = 'card-value';
        names.get(code).split(/\s+/).forEach((word, wordIndex) => {
          if (wordIndex) label.appendChild(document.createTextNode(' '));
          const part = document.createElement('span'); part.className = 'country-word'; part.textContent = word;
          label.appendChild(part);
        });
        item.appendChild(label); list.appendChild(item);
      });
      board.appendChild(list); return board;
    }
    const viewport = document.createElement('div'); viewport.className = 'country-map-viewport';
    viewport.tabIndex = 0;
    viewport.setAttribute('role', 'group');
    viewport.setAttribute('aria-label', 'World map. Scroll or use plus and minus to zoom, drag to pan, and press 0 to reset the view.');
    const svg = template.cloneNode(true); viewport.appendChild(svg);
    svg.setAttribute('role', 'group'); svg.setAttribute('aria-label', 'World map. Select countries; zoom or drag to pan.');
    const view = record.mapView;
    const shapes = [...svg.querySelectorAll('[data-country]')];
    const first = new Set();
    shapes.forEach(shape => {
      shape.setAttribute('role', 'button'); shape.setAttribute('aria-label', names.get(shape.dataset.country));
      shape.setAttribute('tabindex', !first.has(shape.dataset.country) && canInteract() ? '0' : '-1');
      first.add(shape.dataset.country);
    });
    const applyView = () => {
      const w = width / view.zoom, h = height / view.zoom;
      view.x = Math.max(0, Math.min(width - w, view.x));
      view.y = Math.max(0, Math.min(height - h, view.y));
      svg.setAttribute('viewBox', `${view.x} ${view.y} ${w} ${h}`);
      viewport.classList.toggle('is-zoomed', view.zoom > 1);
    };
    const svgPoint = (x, y, inverse = svg.getScreenCTM()?.inverse()) => {
      if (!inverse) return null;
      const point = svg.createSVGPoint(); point.x = x; point.y = y;
      return point.matrixTransform(inverse);
    };
    const zoom = (factor, anchor) => {
      const old = view.zoom;
      const point = anchor || { x: view.x + width / old / 2, y: view.y + height / old / 2 };
      view.zoom = Math.max(1, Math.min(512, old * factor));
      view.x = point.x - (point.x - view.x) * old / view.zoom;
      view.y = point.y - (point.y - view.y) * old / view.zoom;
      applyView();
    };
    const update = () => {
      const selected = new Set(record.selected);
      const missed = new Set(review ? record.result?.missedIds : []);
      const extra = new Set(review ? record.result?.incorrectIds : []);
      shapes.forEach(shape => {
        const code = shape.dataset.country;
        shape.classList.toggle('is-country-selected', selected.has(code));
        shape.classList.toggle('is-country-missed', missed.has(code));
        shape.classList.toggle('is-country-extra', extra.has(code));
        shape.style.fill = selected.has(code) ? extra.has(code) ? '#777' : '#111' : missed.has(code) ? '#aaa' : '#d5d5d5';
        shape.style.stroke = missed.has(code) || extra.has(code) ? '#111' : '#fff';
        shape.style.strokeDasharray = missed.has(code) || extra.has(code) ? '2 2' : '';
        shape.setAttribute('aria-pressed', String(selected.has(code)));
        shape.setAttribute('aria-disabled', String(!canInteract()));
      });
    };
    const toggle = code => {
      if (!canInteract() || !names.has(code)) return;
      record.selected = record.selected.includes(code) ? record.selected.filter(item => item !== code) : [...record.selected, code];
      update();
    };
    // Map navigation remains available after grading; only changing answers
    // is locked. Keep these keys local so they cannot alter card inputs.
    viewport.addEventListener('keydown', event => {
      if (!['+', '=', '-', '0'].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      if (event.key === '0') {
        Object.assign(view, { zoom: 1, x: 0, y: 0 }); applyView();
      } else zoom(event.key === '-' ? 1 / 1.2 : 1.2);
    });
    let gesture = null;
    viewport.addEventListener('pointerdown', event => {
      if (gesture || event.button !== 0) return;
      event.preventDefault();
      viewport.focus({ preventScroll: true });
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, viewX: view.x, viewY: view.y,
        inverse: svg.getScreenCTM()?.inverse(), dragged: false, code: event.target.closest('[data-country]')?.dataset.country };
      viewport.setPointerCapture(event.pointerId);
    });
    viewport.addEventListener('pointermove', event => {
      if (!gesture || gesture.id !== event.pointerId) return;
      gesture.dragged ||= Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 5;
      if (!gesture.dragged || view.zoom === 1) return;
      const from = svgPoint(gesture.x, gesture.y, gesture.inverse), to = svgPoint(event.clientX, event.clientY, gesture.inverse);
      if (from && to) { view.x = gesture.viewX + from.x - to.x; view.y = gesture.viewY + from.y - to.y; applyView(); }
    });
    const endGesture = (event, commit) => {
      if (!gesture || gesture.id !== event.pointerId) return;
      const previous = gesture; gesture = null;
      if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
      const code = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-country]')?.dataset.country;
      if (commit && !previous.dragged && code && code === previous.code) toggle(code);
    };
    viewport.addEventListener('pointerup', event => endGesture(event, true));
    viewport.addEventListener('pointercancel', event => endGesture(event, false));
    viewport.addEventListener('lostpointercapture', event => endGesture(event, false));
    viewport.addEventListener('wheel', event => {
      event.preventDefault();
      // Trackpad events can be only a fraction of a wheel notch. Scale with
      // their distance instead of applying a full zoom step to every event.
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1;
      const distance = Math.max(-100, Math.min(100, event.deltaY * unit));
      zoom(Math.exp(-distance * 0.001), svgPoint(event.clientX, event.clientY));
    }, { passive: false });
    svg.addEventListener('keydown', event => {
      const code = event.target.closest('[data-country]')?.dataset.country;
      if (event.key === ' ' && code) { event.preventDefault(); event.stopPropagation(); toggle(code); }
    });
    svg.addEventListener('click', event => {
      if (event.detail === 0) toggle(event.target.closest('[data-country]')?.dataset.country);
    });
    board.appendChild(viewport);
    if (review && record.result) {
      const results = document.createElement('div'); results.className = 'country-review-list';
      results.setAttribute('aria-label', 'Country results');
      for (const [label, ids] of [
        ['Correct', record.result.correctIds],
        ['Missed', record.result.missedIds],
        ['Incorrect', record.result.incorrectIds]
      ]) {
        const row = document.createElement('p'); row.className = 'country-result-row';
        row.textContent = `${label}: ${ids.map(code => names.get(code)).join(', ') || '—'}`;
        results.appendChild(row);
      }
      board.appendChild(results);
    }
    applyView(); update();
    return board;
  }
  window.CountryChallenge = { ready: load(), generate, grade, mount,
    getCountries: () => countries.map(country => ({ ...country })) };
})();
