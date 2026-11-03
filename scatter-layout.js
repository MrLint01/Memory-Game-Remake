(() => {
  'use strict';

  const workspace = document.getElementById('memoryWorkspace');
  const field = document.getElementById('memoryField');
  const cardPanel = workspace.querySelector('.memory-cards-panel');
  let state = null;
  let resizeFrame = 0;
  const cardItems = new WeakMap();
  const gap = 18;
  const minimumCardXSpacing = 48;
  // Tilted edges can extend up to half the packing gap past the card's left.
  const cardXSpacing = minimumCardXSpacing + gap / 2;
  const cardSide = 120;
  const categoryCardSides = { aminoAcids: 200 };
  const isCountryCard = item => item.id.startsWith('country-name-');
  const isCard = item => item.id.startsWith('card-') || isCountryCard(item);
  // Country names and their answer map are never visible together. They can
  // share space while every other task keeps its position through the round.
  const alternateCountryViews = (a, b) => a.id === 'countries' && isCountryCard(b)
    || b.id === 'countries' && isCountryCard(a);

  function randomSource(seed) {
    return () => {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
      value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }
  const intersects = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  // Group near-equal x positions before sorting each group from top to bottom.
  // Anchoring groups to the first x keeps the comparison transitive and makes
  // ordering independent of the workspace's offset on the page.
  function horizontalOrder(slots) {
    const sorted = slots.slice().sort((a, b) => a.x - b.x);
    const ordered = [];
    for (let index = 0; index < sorted.length;) {
      const first = sorted[index].x;
      const group = [];
      while (index < sorted.length && sorted[index].x - first <= 6) group.push(sorted[index++]);
      ordered.push(...group.sort((a, b) => a.y - b.y));
    }
    return ordered;
  }

  function dimensions(scaled = false) {
    if (!scaled && !Object.values(state.config).some(config => config.enabled)) {
      return { width: field.clientWidth, height: field.clientHeight };
    }
    const width = Math.max(760, field.clientWidth);
    const widthScale = Math.min(1, field.clientWidth / width);
    return { width, height: Math.max(300, field.clientHeight / Math.max(0.1, widthScale)) };
  }

  function placeCards(width, height, random) {
    const sides = state.items.map(item => categoryCardSides[item.category] || cardSide);
    // Pack into staggered columns inside the real viewport before randomizing
    // the spare space. Random placement must never enlarge a card-only desk.
    const best = Array(sides.length + 1).fill(Infinity);
    const previous = [];
    best[0] = 0;
    for (let end = 1; end <= sides.length; end++) {
      let columnHeight = 0;
      for (let start = end - 1; start >= 0; start--) {
        columnHeight += sides[start] + gap;
        if (columnHeight > height) break;
        const columnWidth = Math.max(...sides.slice(start, end).map((side, row) => side + row * cardXSpacing)) + gap;
        if (best[start] + columnWidth < best[end]) {
          best[end] = best[start] + columnWidth;
          previous[end] = { start, end, width: columnWidth, height: columnHeight };
        }
      }
    }
    if (best[sides.length] > width) return null;
    const columns = [];
    for (let end = sides.length; end > 0;) {
      const column = previous[end];
      columns.unshift(column);
      end = column.start;
    }
    const weights = columns.map(() => random());
    weights.push(random());
    const totalWeight = weights.reduce((sum, value) => sum + value, 0) || 1;
    const spareWidth = width - best[sides.length];
    const placed = [];
    let x = 0;
    columns.forEach((column, index) => {
      x += spareWidth * weights[index] / totalWeight;
      const spaces = Array.from({ length: column.end - column.start + 1 }, () => random());
      const totalSpace = spaces.reduce((sum, value) => sum + value, 0) || 1;
      let y = 0;
      for (let item = column.start; item < column.end; item++) {
        const row = item - column.start;
        y += (height - column.height) * spaces[row] / totalSpace;
        placed.push({ id: `card-${item}`, x: x + row * cardXSpacing, y,
          width: sides[item] + gap, height: sides[item] + gap, angle: state.cardAngles.get(state.items[item]) });
        y += sides[item] + gap;
      }
      x += column.width;
    });
    return { placed, height };
  }

  function place(width, availableHeight) {
    const random = randomSource(state.seed);
    const compact = width < 600;
    const cardSizes = state.items.map(item => categoryCardSides[item.category] || cardSide);
    // Use the largest card for horizontal bounds; each collision box retains
    // its own category's dimensions, including after a viewport resize.
    const cardWidth = Math.max(cardSide, ...cardSizes);
    const cardSpan = Math.max(0, width - cardWidth - gap);
    const cardSpacing = state.items.length > 1
      ? Math.min(cardXSpacing, cardSpan / (state.items.length - 1) * 0.85) : 0;
    // Reserve distinct horizontal positions before sampling heights. This also
    // prevents vertically distant cards from appearing almost directly aligned.
    const horizontalSlack = cardSpan - cardSpacing * (state.items.length - 1);
    const cardXs = state.items.map(() => random() * horizontalSlack).sort((a, b) => a - b)
      .map((offset, index) => offset + index * cardSpacing);
    // At ±4°, both 120px and 200px cards stay inside their existing 18px
    // packing gap, so rotation cannot create collisions or clip the corners.
    const objects = cardSizes.map((side, index) => ({ id: `card-${index}`, width: side, height: side, angle: state.cardAngles.get(state.items[index]) }));
    if (state.config.countries?.enabled) {
      for (let index = 0; index < state.config.countries.count; index++) {
        objects.push({ id: `country-name-${index}`, width: cardSide, height: cardSide, angle: (random() - 0.5) * 8 });
      }
    }
    for (const [key, config] of Object.entries(state.config)) {
      if (!config.enabled) continue;
      const baseSize = key === 'countries' ? 480 : key === 'wiring' ? Math.max(240, config.wires * 34) : config.size * 27;
      const gridSize = Math.min(width - 64, Math.max(baseSize, (compact ? 158 : 180) + random() * 45));
      const angle = key === 'countries' ? 0 : (random() - 0.5) * 8;
      const radians = Math.abs(angle) * Math.PI / 180;
      const envelope = gridSize * (Math.cos(radians) + Math.sin(radians));
      // Reserve review text space from the start so results never resize the
      // map or spill into another task when they appear.
      objects.push({ id: key, width: envelope, height: key === 'countries' ? gridSize * 1398 / 2754 + 96 : envelope + 82, angle, gridSize });
    }
    const objectArea = item => (item.width + gap) * (item.height + gap);
    const area = objects.filter(item => item.id !== 'countries' && !isCountryCard(item)).reduce((total, item) => total + objectArea(item), 0)
      + Math.max(0, objects.filter(isCountryCard).reduce((total, item) => total + objectArea(item), 0),
        ...objects.filter(item => item.id === 'countries').map(objectArea));
    let height = Math.max(availableHeight, Math.max(...objects.map(item => item.height + gap)), area / width / 0.53);
    let placed;
    // Bounded rejection sampling grows the logical desk until pieces fit.
    // The completed desk is then scaled to the visible puzzle area.
    for (let growth = 0; ; growth++) {
      for (let attempt = 0; attempt < 24; attempt++) {
        placed = [];
        const queue = objects.map(item => ({ ...item, priority: item.width * item.height * (0.8 + random() * 0.4) }))
          .sort((a, b) => b.priority - a.priority);
        for (const item of queue) {
          let candidate;
          for (let trial = 0; trial < 350; trial++) {
            const box = {
              ...item, width: item.width + gap, height: item.height + gap,
              x: item.id.startsWith('card-') ? cardXs[Number(item.id.slice(5))]
                : random() * Math.max(0, width - item.width - gap),
              y: random() * Math.max(0, height - item.height - gap)
            };
            const alignedPuzzle = width >= 600 && !isCard(item) && placed.some(other =>
              !isCard(other) && Math.abs(box.y - other.y) < 54);
            if (!alignedPuzzle && !placed.some(other => !alternateCountryViews(box, other) && intersects(box, other))) { candidate = box; break; }
          }
          if (!candidate) break;
          placed.push(candidate);
        }
        if (placed.length === objects.length) return { placed, height: Math.ceil(height) };
      }
      height *= 1.18;
      if (growth >= 10) {
        // A finite, staggered fallback for unusually large Sandbox rounds.
        let y = gap;
        placed = objects.map(item => ({ ...item, priority: random() })).sort((a, b) => a.priority - b.priority).map(item => {
          const x = item.id.startsWith('card-') ? cardXs[Number(item.id.slice(5))]
            : random() * Math.max(0, width - item.width - gap);
          const box = { ...item, x, y, width: item.width + gap, height: item.height + gap };
          y += box.height + random() * 28;
          return box;
        });
        return { placed, height: Math.ceil(y) };
      }
    }
  }

  function layout(first = false) {
    let { width, height } = dimensions();
    let packed = !Object.values(state.config).some(config => config.enabled)
      ? placeCards(width, height, randomSource(state.seed)) : null;
    if (!packed) {
      // Only genuinely over-capacity rounds need the fitted workspace.
      ({ width, height } = dimensions(true));
      packed = place(width, height);
    }
    const slots = horizontalOrder(packed.placed.filter(item => item.id.startsWith('card-')));
    if (first) state.items = slots.map(slot => state.items[Number(slot.id.slice(5))]);
    state.cards = slots;
    state.countryCards = packed.placed.filter(isCountryCard);
    state.puzzles = packed.placed.filter(item => !isCard(item));
    state.width = width;
    state.fieldHeight = packed.height;
    refresh();
  }

  function fitCardText(card) {
    const label = card.querySelector('.card-value, :scope.hidden-card > span, .input-correct-inline');
    if (!label || !card.isConnected || !card.clientWidth) return;
    label.style.fontSize = '';
    const style = getComputedStyle(card);
    const available = Math.min(
      card.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 4,
      label.classList.contains('input-correct-inline') ? label.clientWidth : Infinity
    );
    if (card.classList.contains('country-card')) {
      const availableHeight = card.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - 4;
      // Keep whole words together, then reduce the font only if the wrapped
      // name is too wide or too tall for its fixed square.
      for (let attempt = 0; available > 0 && availableHeight > 0 && attempt < 60; attempt++) {
        if (label.scrollWidth <= available && label.scrollHeight <= availableHeight) break;
        label.style.fontSize = `${parseFloat(getComputedStyle(label).fontSize) * 0.9}px`;
      }
      return;
    }
    for (let attempt = 0; available > 0 && attempt < 4; attempt++) {
      const width = label.scrollWidth;
      if (width <= available) break;
      const size = parseFloat(getComputedStyle(label).fontSize);
      label.style.fontSize = `${Math.max(0.5, size * available / width - 0.1)}px`;
    }
  }

  function positionCard(card, item) {
    cardItems.set(card, item);
    card.dataset.cardCategory = item?.category || '';
    if (!state) return;
    const index = state.items.indexOf(item);
    const slot = state.cards[index];
    if (!slot) return;
    card.style.setProperty('--scatter-x', `${slot.x + gap / 2}px`);
    card.style.setProperty('--scatter-y', `${slot.y + gap / 2}px`);
    card.style.setProperty('--scatter-card-width', `${slot.width - gap}px`);
    card.style.setProperty('--scatter-card-height', `${slot.height - gap}px`);
    card.style.setProperty('--scatter-card-angle', `${slot.angle}deg`);
    fitCardText(card);
  }

  function refresh() {
    if (!state) return;
    workspace.style.height = `${state.fieldHeight}px`;
    workspace.style.width = `${state.width}px`;
    const scale = Math.min(1, field.clientWidth / state.width, field.clientHeight / state.fieldHeight);
    workspace.style.transform = `scale(${Math.max(0.01, scale)})`;
    workspace.style.left = `${Math.max(0, (field.clientWidth - state.width * scale) / 2)}px`;
    workspace.style.top = `${Math.max(0, (field.clientHeight - state.fieldHeight * scale) / 2)}px`;
    for (const slot of state.puzzles) {
      const panel = workspace.querySelector(`[data-challenge="${slot.id}"]`);
      if (!panel) continue;
      panel.style.left = `${slot.x + gap / 2}px`;
      panel.style.top = `${slot.y + gap / 2}px`;
      panel.style.width = `${slot.width - gap}px`;
      panel.style.height = `${slot.height - gap}px`;
      panel.style.setProperty('--scatter-grid-size', `${slot.gridSize}px`);
      panel.style.setProperty('--scatter-angle', `${slot.angle}deg`);
    }
    for (const slot of state.countryCards) {
      const card = workspace.querySelector(`[data-country-index="${slot.id.slice(13)}"]`);
      if (!card) continue;
      card.style.left = `${slot.x + gap / 2}px`;
      card.style.top = `${slot.y + gap / 2}px`;
      card.style.width = `${cardSide}px`;
      card.style.height = `${cardSide}px`;
      card.style.rotate = `${slot.angle}deg`;
      fitCardText(card);
    }
    cardPanel.style.top = `${state.fieldHeight}px`;
    cardPanel.style.setProperty('--answer-count', state.items.length);
    document.querySelectorAll('#cardGrid > .card').forEach(card => {
      positionCard(card, cardItems.get(card) || state.items[Number(card.dataset.index)]);
    });
    document.querySelectorAll('#inputGrid .input-slot').forEach(slot => {
      positionCard(slot, state.items[Number(slot.querySelector('input').dataset.index)]);
    });
  }

  function reset() {
    state = null;
    document.body.classList.remove('scattered-round');
    workspace.style.height = '';
    workspace.style.width = '';
    workspace.style.transform = '';
    workspace.style.left = '';
    workspace.style.top = '';
    cardPanel.style.top = '';
  }

  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => { if (state) layout(); });
  });
  new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => { if (state) layout(); });
  }).observe(field);
  if (document.fonts) document.fonts.addEventListener('loadingdone', refresh);
  window.ScatterLayout = {
    begin(items, config) {
      reset();
      document.body.classList.add('scattered-round');
      state = { seed: Math.floor(Math.random() * 0xFFFFFFFF), items: items.slice(), config };
      const random = randomSource(state.seed ^ 0x4A38B091);
      state.cardAngles = new Map(items.map(item => [item, (random() - 0.5) * 8]));
      layout(true);
      return state.items.slice();
    },
    positionCard, fitCardText, refresh, reset,
    isActive: () => Boolean(state)
  };
})();
