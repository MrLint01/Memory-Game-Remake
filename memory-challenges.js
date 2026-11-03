(() => {
  'use strict';

  const storageKey = 'flashRecallMemoryChallenges_v1';
  const defaults = {
    maze: { enabled: true, size: 4, length: 7 },
    shape: { enabled: true, size: 4, cells: 5 },
    different: { enabled: true, size: 3, count: 2 },
    wiring: { enabled: true, wires: 4, destinations: 4, complexity: 2 },
    countries: { enabled: true, count: 3, difficulty: 1 }
  };
  const titles = { maze: 'Memory Maze', shape: 'Vanishing Shapes', different: 'Find the Different Shape', wiring: 'Wiring', countries: 'Countries' };
  const container = document.getElementById('memoryChallenges');
  const controls = document.getElementById('memoryRoundControls');
  const cardStatus = document.getElementById('memoryCardsStatus');
  let records = [];
  let currentPhase = 'idle';
  let interactive = false;
  let evaluated = false;
  let savedConfig;
  try { savedConfig = JSON.parse(localStorage.getItem(storageKey)); } catch {}

  const integer = (value, fallback, min, max) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.round(number))) : fallback;
  };
  function normalizeConfig(raw = {}) {
    const result = {};
    for (const key of Object.keys(defaults)) {
      const source = raw && raw[key] && typeof raw[key] === 'object' ? raw[key] : {};
      if (key === 'countries') {
        result[key] = { enabled: source.enabled !== false, count: integer(source.count, 3, 1, 12), difficulty: integer(source.difficulty, 1, 1, 3) };
        continue;
      }
      if (key === 'wiring') {
        const wires = integer(source.wires, defaults.wiring.wires, 2, 8);
        result[key] = { enabled: source.enabled !== false, wires,
          destinations: integer(source.destinations, Math.max(wires, defaults.wiring.destinations), wires, 10),
          complexity: integer(source.complexity, defaults.wiring.complexity, 1, 4) };
        continue;
      }
      const size = integer(source.size, defaults[key].size, 3, 8);
      result[key] = { enabled: source.enabled !== false, size };
      if (key === 'maze') result[key].length = integer(source.length, defaults.maze.length, 2, size * size);
      if (key === 'shape') result[key].cells = integer(source.cells, defaults.shape.cells, 1, size * size - 1);
      if (key === 'different') result[key].count = integer(source.count, defaults.different.count, 1, Math.floor((size * size - 1) / 2));
    }
    return result;
  }
  savedConfig = normalizeConfig(savedConfig);
  function getConfig(overrides) {
    const combined = {};
    for (const key of Object.keys(defaults)) combined[key] = { ...savedConfig[key], ...(overrides && overrides[key]) };
    return normalizeConfig(combined);
  }
  function saveConfig(raw) {
    savedConfig = normalizeConfig(raw);
    try { localStorage.setItem(storageKey, JSON.stringify(savedConfig)); } catch {}
    return getConfig();
  }
  function shuffle(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  function neighbors(cell, size) {
    const row = Math.floor(cell / size), column = cell % size;
    return [row > 0 ? cell - size : -1, row < size - 1 ? cell + size : -1,
      column > 0 ? cell - 1 : -1, column < size - 1 ? cell + 1 : -1].filter(value => value >= 0);
  }
  function generatePath(size, length) {
    const path = [Math.floor(Math.random() * size * size)];
    const visited = new Set(path);
    let budget = 10000;
    const extend = () => {
      if (path.length === length) return true;
      if (--budget <= 0) return false;
      for (const next of shuffle(neighbors(path[path.length - 1], size))) {
        if (visited.has(next)) continue;
        visited.add(next); path.push(next);
        if (extend()) return true;
        path.pop(); visited.delete(next);
      }
      return false;
    };
    if (extend()) return path;
    // A transformed snake guarantees a valid path even at the largest setting.
    const snake = [];
    const rotation = Math.floor(Math.random() * 4), flip = Math.random() < 0.5;
    for (let row = 0; row < size; row++) {
      for (let i = 0; i < size; i++) {
        let r = row, c = row % 2 ? size - 1 - i : i;
        if (flip) c = size - 1 - c;
        for (let turn = 0; turn < rotation; turn++) [r, c] = [c, size - 1 - r];
        snake.push(r * size + c);
      }
    }
    const offset = Math.floor(Math.random() * (snake.length - length + 1));
    return snake.slice(offset, offset + length);
  }
  function generateShape(size, count) {
    const cells = new Set([Math.floor(Math.random() * size * size)]);
    while (cells.size < count) {
      const frontier = [...new Set([...cells].flatMap(cell => neighbors(cell, size)))].filter(cell => !cells.has(cell));
      cells.add(frontier[Math.floor(Math.random() * frontier.length)]);
    }
    return [...cells];
  }
  function generateRecord(key, config) {
    const record = { key, config, selected: [], result: null };
    if (key === 'countries') Object.assign(record, window.CountryChallenge.generate(config));
    if (key === 'wiring') Object.assign(record, window.WiringChallenge.generate(config));
    if (key === 'maze') record.solution = generatePath(config.size, config.length);
    if (key === 'shape') record.solution = generateShape(config.size, config.cells);
    if (key === 'different') {
      const indices = Array.from({ length: config.size ** 2 }, (_, index) => index);
      record.solution = shuffle(indices).slice(0, config.count);
      record.base = Math.floor(Math.random() * 3);
      record.variant = (record.base + 1 + Math.floor(Math.random() * 2)) % 3;
    }
    return record;
  }
  function canInteract() {
    return currentPhase === 'recall' && interactive && !evaluated && !document.body.classList.contains('pause-active');
  }
  function updateSelection(record, cell, paint) {
    if (!canInteract()) return;
    if (record.key === 'maze') {
      const existing = record.selected.indexOf(cell);
      if (existing >= 0) record.selected = record.selected.slice(0, existing + 1);
      else if (!record.selected.length || neighbors(record.selected[record.selected.length - 1], record.config.size).includes(cell)) record.selected.push(cell);
      else {
        record.status.textContent = 'Use neighboring cells. Clear to start again.';
        return;
      }
    } else {
      const selected = new Set(record.selected);
      if (paint) selected.add(cell); else selected.delete(cell);
      record.selected = [...selected];
    }
    paintSelection(record);
  }
  function paintSelection(record) {
    for (const button of record.grid.children) {
      const index = Number(button.dataset.cell);
      const order = record.selected.indexOf(index);
      button.classList.toggle('is-selected', order >= 0);
      button.setAttribute('aria-pressed', String(order >= 0));
      if (record.key === 'maze') button.textContent = order < 0 ? '' : String(order + 1);
    }
    record.status.textContent = `${record.selected.length} ${record.key === 'maze' ? 'steps' : 'cells'} selected`;
  }
  function bindGrid(record) {
    const grid = record.grid;
    let pointerId = null, paint = true, previousPoint = null;
    const hit = (x, y) => {
      const button = document.elementFromPoint(x, y)?.closest('[data-cell]');
      if (button && button.parentElement === grid) updateSelection(record, Number(button.dataset.cell), paint);
    };
    grid.addEventListener('pointerdown', event => {
      const cell = event.target.closest('[data-cell]');
      if (!canInteract() || !cell || cell.parentElement !== grid || (event.pointerType === 'mouse' && event.button !== 0)) return;
      event.preventDefault();
      pointerId = event.pointerId;
      paint = !record.selected.includes(Number(cell.dataset.cell));
      previousPoint = { x: event.clientX, y: event.clientY };
      grid.setPointerCapture(pointerId);
      cell.focus({ preventScroll: true });
      updateSelection(record, Number(cell.dataset.cell), paint);
    });
    grid.addEventListener('pointermove', event => {
      if (pointerId !== event.pointerId || !canInteract()) return;
      if (event.buttons === 0) { release(); return; }
      const distance = Math.hypot(event.clientX - previousPoint.x, event.clientY - previousPoint.y);
      const step = Math.max(2, grid.clientWidth / record.config.size / 3);
      const samples = Math.max(1, Math.ceil(distance / step));
      for (let i = 1; i <= samples; i++) {
        const ratio = i / samples;
        hit(previousPoint.x + (event.clientX - previousPoint.x) * ratio, previousPoint.y + (event.clientY - previousPoint.y) * ratio);
      }
      previousPoint = { x: event.clientX, y: event.clientY };
    });
    const release = () => { pointerId = null; previousPoint = null; };
    grid.addEventListener('pointerup', release);
    grid.addEventListener('pointercancel', release);
    grid.addEventListener('lostpointercapture', event => {
      // Some browsers drop capture while the button is still held. Keep the
      // in-grid drag alive until release or cancellation instead of truncating it.
      if (event.buttons === 0) release();
    });
    grid.addEventListener('keydown', event => {
      const cell = event.target.closest('[data-cell]');
      if (!canInteract() || !cell) return;
      const index = Number(cell.dataset.cell);
      if (event.key === ' ') {
        event.preventDefault(); event.stopPropagation();
        updateSelection(record, index, !record.selected.includes(index));
      }
      const deltas = { ArrowUp: -record.config.size, ArrowDown: record.config.size, ArrowLeft: -1, ArrowRight: 1 };
      const next = index + deltas[event.key];
      if (Object.prototype.hasOwnProperty.call(deltas, event.key)) {
        event.preventDefault(); event.stopPropagation();
        if (neighbors(index, record.config.size).includes(next)) grid.children[next].focus();
      }
    });
    // Support assistive-technology activation without toggling pointer clicks twice.
    grid.addEventListener('click', event => {
      const cell = event.target.closest('[data-cell]');
      if (event.detail === 0 && cell && canInteract()) updateSelection(record, Number(cell.dataset.cell), !record.selected.includes(Number(cell.dataset.cell)));
    });
  }
  function icon(kind) {
    const shapes = ['<path d="M20 5 L36 34 H4 Z"/>', '<rect x="7" y="7" width="26" height="26"/>', '<circle cx="20" cy="20" r="14"/>'];
    return `<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">${shapes[kind]}</svg>`;
  }
  function render() {
    if (!container) return;
    container.replaceChildren();
    container.hidden = !records.length || currentPhase === 'idle';
    document.body.classList.toggle('has-memory-challenges', records.length > 0 && currentPhase !== 'idle');
    controls.hidden = currentPhase !== 'show';
    controls.querySelector('button').textContent = currentPhase === 'show' ? 'Answer all · Enter' : 'Submit all · Enter';
    controls.querySelector('button').disabled = currentPhase === 'recall' && !canInteract();
    const reveal = currentPhase === 'show';
    const review = currentPhase === 'result';
    for (const record of records) {
      const panel = document.createElement('section');
      panel.className = 'memory-challenge'; panel.dataset.challenge = record.key;
      const heading = document.createElement('h2'); heading.id = `memoryHeading-${record.key}`; heading.textContent = titles[record.key];
      const wiringStatus = () => `${record.selected.filter(destination => destination >= 0).length} / ${record.config.wires} connected`;
      const grid = record.key === 'countries' ? window.CountryChallenge.mount(record, {
        reveal, review, canInteract
      }) : record.key === 'wiring' ? window.WiringChallenge.mount(record, {
        reveal, review, canInteract, onChange: () => { record.status.textContent = wiringStatus(); }
      }) : document.createElement('div');
      grid.classList.add('memory-grid');
      if (record.key !== 'wiring' && record.key !== 'countries') grid.style.setProperty('--grid-size', record.config.size);
      grid.setAttribute('role', 'group'); grid.setAttribute('aria-labelledby', heading.id);
      record.grid = grid;
      for (let index = 0; record.key !== 'wiring' && record.key !== 'countries' && index < record.config.size ** 2; index++) {
        const cell = document.createElement('button'); cell.type = 'button'; cell.className = 'memory-cell'; cell.dataset.cell = index;
        cell.setAttribute('aria-label', `Row ${Math.floor(index / record.config.size) + 1}, column ${index % record.config.size + 1}`);
        cell.disabled = !canInteract();
        if (reveal) {
          const step = record.solution.indexOf(index);
          const coordinates = cell.getAttribute('aria-label');
          if (record.key === 'different') {
            const kind = step >= 0 ? record.variant : record.base;
            cell.innerHTML = icon(kind);
            cell.setAttribute('aria-label', `${coordinates}, ${['triangle', 'square', 'circle'][kind]}`);
          }
          else if (step >= 0) {
            cell.classList.add('is-target');
            cell.setAttribute('aria-label', `${coordinates}, ${record.key === 'maze' ? `step ${step + 1}` : 'filled'}`);
            if (record.key === 'maze') {
              const number = document.createElement('span'); number.className = 'memory-maze-step'; number.textContent = String(step + 1); cell.appendChild(number);
            }
          }
        } else {
          const step = record.selected.indexOf(index);
          cell.setAttribute('aria-pressed', String(step >= 0));
          cell.classList.toggle('is-selected', step >= 0);
          if (record.key === 'maze' && step >= 0) cell.textContent = String(step + 1);
          if (review && record.result) {
            cell.classList.toggle('is-missed', record.solution.includes(index) && step < 0);
            cell.classList.toggle('is-extra', !record.solution.includes(index) && step >= 0);
          }
        }
        grid.appendChild(cell);
      }
      if (reveal && record.key === 'maze') {
        // A continuous route and distinct endpoints convey order without labels.
        const ns = 'http://www.w3.org/2000/svg';
        const route = document.createElementNS(ns, 'svg');
        route.classList.add('memory-maze-route');
        route.setAttribute('viewBox', `0 0 ${record.config.size * 100} ${record.config.size * 100}`);
        route.setAttribute('aria-hidden', 'true');
        const points = record.solution.map(index => [
          (index % record.config.size + 0.5) * 100,
          (Math.floor(index / record.config.size) + 0.5) * 100
        ]);
        const line = document.createElementNS(ns, 'polyline');
        line.setAttribute('points', points.map(point => point.join(',')).join(' '));
        route.appendChild(line);
        const start = document.createElementNS(ns, 'circle');
        start.setAttribute('cx', points[0][0]); start.setAttribute('cy', points[0][1]); start.setAttribute('r', '14');
        const end = document.createElementNS(ns, 'rect');
        end.setAttribute('x', points.at(-1)[0] - 14); end.setAttribute('y', points.at(-1)[1] - 14);
        end.setAttribute('width', '28'); end.setAttribute('height', '28');
        route.append(start, end); grid.appendChild(route);
      }
      if (record.key === 'countries') {
        grid.removeAttribute('aria-labelledby'); grid.setAttribute('aria-label', titles.countries);
        panel.appendChild(grid); container.appendChild(panel);
        continue;
      }
      const footer = document.createElement('div'); footer.className = 'memory-challenge__footer';
      const status = document.createElement('span'); status.className = 'memory-challenge__status'; status.setAttribute('role', 'status');
      record.status = status;
      status.textContent = review ? record.result ? record.result.correct ? 'Correct' : 'Incorrect' : 'Not submitted'
        : reveal ? 'Memorize' : interactive ? `${record.selected.length} cells selected` : 'Waiting for cards…';
      if (record.key === 'wiring') status.textContent = review && record.result
        ? `${record.result.correctCount} / ${record.result.total} correct`
        : reveal ? 'Memorize' : interactive ? wiringStatus() : 'Waiting for cards…';
      const clear = document.createElement('button'); clear.type = 'button'; clear.className = 'memory-clear'; clear.textContent = 'Clear'; clear.disabled = !canInteract();
      clear.addEventListener('click', () => {
        if (!canInteract()) return;
        if (record.key === 'wiring') { window.WiringChallenge.reset(record); render(); }
        else { record.selected = []; paintSelection(record); }
      });
      footer.append(status, clear); panel.append(heading, grid, footer); container.appendChild(panel);
      if (record.key !== 'wiring' && record.key !== 'countries') bindGrid(record);
    }
    if (window.ScatterLayout) window.ScatterLayout.refresh();
  }
  function start(overrides, { reuse = false } = {}) {
    const config = getConfig(overrides);
    if (!reuse || !records.length) records = Object.entries(config).filter(([, value]) => value.enabled).map(([key, value]) => generateRecord(key, value));
    records.forEach(record => {
      if (record.key === 'wiring') window.WiringChallenge.reset(record);
      else record.selected = [];
      record.result = null;
    });
    evaluated = false; interactive = false; currentPhase = 'show';
    if (cardStatus) cardStatus.textContent = '';
    render();
  }
  function setPhase(next, options = {}) {
    if (next === 'idle') { reset(); return; }
    currentPhase = next; interactive = next === 'recall' && options.interactive !== false;
    render();
  }
  function evaluate() {
    if (!evaluated) {
      for (const record of records) {
        if (record.key === 'countries') {
          record.result = { key: record.key, title: titles[record.key], ...window.CountryChallenge.grade(record) };
          continue;
        }
        if (record.key === 'wiring') {
          record.result = { key: record.key, title: titles[record.key], ...window.WiringChallenge.grade(record) };
          continue;
        }
        const correct = record.selected.length === record.solution.length && (record.key === 'maze'
          ? record.solution.every((cell, index) => record.selected[index] === cell)
          : record.solution.every(cell => record.selected.includes(cell)));
        record.result = { key: record.key, title: titles[record.key], correct, selected: record.selected.length, required: record.solution.length };
      }
      evaluated = true; interactive = false;
      render();
    }
    return records.map(record => ({ ...record.result }));
  }
  function reset() {
    records = []; currentPhase = 'idle'; evaluated = false; interactive = false;
    if (cardStatus) cardStatus.textContent = '';
    render();
  }
  function mountSettings() {
    const parent = document.querySelector('#settingsModal [data-settings-pane="general"]');
    if (!parent) return;
    const fieldset = document.createElement('fieldset'); fieldset.className = 'memory-config';
    fieldset.innerHTML = '<legend>Extra memory challenges</legend>';
    for (const key of Object.keys(defaults)) {
      const row = document.createElement('div'); row.className = 'memory-config__row'; row.dataset.challenge = key;
      const enabledLabel = document.createElement('label');
      const enabled = document.createElement('input'); enabled.type = 'checkbox'; enabled.checked = savedConfig[key].enabled; enabled.dataset.memoryConfig = `${key}.enabled`;
      enabledLabel.append(enabled, ` ${titles[key]}`); row.appendChild(enabledLabel);
      const quantity = key === 'maze' ? 'length' : key === 'shape' ? 'cells' : 'count';
      const fields = key === 'countries' ? [['count', 'Countries'], ['difficulty', 'Map difficulty (1–3)']]
        : key === 'wiring' ? [['wires', 'Wires'], ['destinations', 'Destinations'], ['complexity', 'Path complexity']]
        : [['size', 'Grid size'], [quantity, key === 'maze' ? 'Path steps' : key === 'shape' ? 'Filled cells' : 'Differences']];
      for (const [name, title] of fields) {
        const label = document.createElement('label'); label.textContent = title;
        const input = document.createElement('input'); input.type = 'number'; input.step = '1';
        if (key === 'countries') {
          input.min = '1'; input.max = name === 'count' ? '12' : '3';
        } else if (key === 'wiring') {
          input.min = name === 'wires' ? '2' : name === 'destinations' ? String(savedConfig.wiring.wires) : '1';
          input.max = name === 'wires' ? '8' : name === 'destinations' ? '10' : '4';
        } else {
          input.min = name === 'size' ? '3' : key === 'maze' ? '2' : '1';
          input.max = name === 'size' ? '8' : String(key === 'maze' ? savedConfig[key].size ** 2 : key === 'shape' ? savedConfig[key].size ** 2 - 1 : Math.floor((savedConfig[key].size ** 2 - 1) / 2));
        }
        input.value = savedConfig[key][name]; input.dataset.memoryConfig = `${key}.${name}`; label.appendChild(input); row.appendChild(label);
      }
      fieldset.appendChild(row);
    }
    fieldset.addEventListener('change', () => {
      const raw = getConfig();
      fieldset.querySelectorAll('[data-memory-config]').forEach(input => {
        const [key, name] = input.dataset.memoryConfig.split('.'); raw[key][name] = name === 'enabled' ? input.checked : input.value;
      });
      const normalized = saveConfig(raw);
      fieldset.querySelectorAll('[data-memory-config]').forEach(input => {
        const [key, name] = input.dataset.memoryConfig.split('.');
        if (name === 'enabled') input.checked = normalized[key][name];
        else {
          input.value = normalized[key][name];
          if (key === 'countries') {
            input.max = name === 'count' ? '12' : '3';
          } else if (key === 'wiring') {
            if (name === 'destinations') input.min = String(normalized.wiring.wires);
          } else if (name !== 'size') input.max = String(key === 'maze' ? normalized[key].size ** 2 : key === 'shape' ? normalized[key].size ** 2 - 1 : Math.floor((normalized[key].size ** 2 - 1) / 2));
        }
      });
    });
    parent.appendChild(fieldset);
  }
  controls.querySelector('button').addEventListener('click', () => {
    if (currentPhase === 'show') skipRevealNow();
    else if (canInteract()) checkAnswers();
  });
  window.MemoryChallenges = { getConfig, saveConfig, start, setPhase, evaluate, reset,
    hasEnabled: key => key ? records.some(record => record.key === key) : records.length > 0,
    setCardResult(correct) { if (cardStatus) cardStatus.textContent = correct ? 'Cards correct' : 'Cards incorrect'; }
  };
  mountSettings();
})();
