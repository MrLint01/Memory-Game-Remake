(() => {
  'use strict';
  const palette = [
    ['red', '#d32f2f'], ['blue', '#1565c0'], ['green', '#26843b'], ['orange', '#df7500'],
    ['purple', '#7b39ad'], ['cyan', '#008c9e'], ['pink', '#d03986'], ['brown', '#795333']
  ];
  const shuffle = values => {
    const copy = values.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const y = (index, count) => 26 + index * 248 / Math.max(1, count - 1);
  const ns = 'http://www.w3.org/2000/svg';
  function pathData(points) {
    return points.slice(1).reduce((path, point, index) => {
      const previous = points[index], middle = (previous[0] + point[0]) / 2;
      return `${path} C ${middle} ${previous[1]}, ${middle} ${point[1]}, ${point[0]} ${point[1]}`;
    }, `M ${points[0].join(' ')}`);
  }
  function reset(record) {
    record.selected = Array(record.config.wires).fill(-1);
    record.activeWire = null;
  }
  function generate(config) {
    const solution = shuffle(Array.from({ length: config.destinations }, (_, index) => index)).slice(0, config.wires);
    // A crossing is guaranteed even if a shuffled mapping happens to be ordered.
    if (solution.every((value, index) => !index || value > solution[index - 1])) [solution[0], solution[1]] = [solution[1], solution[0]];
    const colors = shuffle(palette).slice(0, config.wires);
    const leftYs = Array.from({ length: config.wires }, (_, index) => y(index, config.wires) + (Math.random() - 0.5) * 8);
    const rightYs = Array.from({ length: config.destinations }, (_, index) => y(index, config.destinations) + (Math.random() - 0.5) * 8);
    const paths = solution.map((destination, index) => [[18, leftYs[index]]]);
    for (let column = 1; column <= config.complexity + 1; column++) {
      const rows = shuffle(Array.from({ length: config.wires }, (_, index) => index));
      paths.forEach((points, index) => points.push([
        18 + column * 264 / (config.complexity + 2),
        y(rows[index], config.wires) + (Math.random() - 0.5) * 10
      ]));
    }
    paths.forEach((points, index) => points.push([282, rightYs[solution[index]]]));
    const record = { solution, colors, paths, leftYs, rightYs };
    reset(Object.assign(record, { config }));
    return record;
  }
  function grade(record) {
    const connections = record.solution.map((expected, wire) => ({
      wire, expected, selected: record.selected[wire], correct: record.selected[wire] === expected
    }));
    const correctCount = connections.filter(connection => connection.correct).length;
    return { correct: correctCount === record.config.wires, correctCount, total: record.config.wires,
      selected: record.selected.filter(destination => destination >= 0).length,
      required: record.config.wires, connections };
  }
  function mount(record, { reveal, review, canInteract, onChange }) {
    const board = document.createElement('div');
    board.className = 'memory-grid wiring-board';
    const svg = document.createElementNS(ns, 'svg');
    svg.classList.add('wiring-paths'); svg.setAttribute('viewBox', '0 0 300 300');
    svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    board.appendChild(svg);
    const left = [], right = [];
    let drag = null;
    const connect = (wire, destination) => {
      const previous = record.selected.indexOf(destination);
      if (previous >= 0) record.selected[previous] = -1;
      record.selected[wire] = destination;
    };
    const draw = (points, color, wrong = false) => {
      // White edging keeps crossing colors distinct without adding junctions.
      const edge = document.createElementNS(ns, 'path'); edge.setAttribute('d', pathData(points));
      edge.setAttribute('stroke', '#fff'); edge.setAttribute('stroke-width', '7');
      const wire = document.createElementNS(ns, 'path'); wire.setAttribute('d', pathData(points));
      wire.setAttribute('stroke', color); wire.setAttribute('stroke-width', '3.5');
      if (wrong) { wire.setAttribute('stroke-dasharray', '5 5'); wire.setAttribute('opacity', '0.5'); }
      svg.append(edge, wire);
      return wire;
    };
    const update = () => {
      svg.replaceChildren();
      if (reveal || review) record.paths.forEach((points, index) => draw(points, record.colors[index][1]));
      if (!reveal) record.selected.forEach((destination, index) => {
        if (drag?.moved && drag.wire === index) return;
        if (destination < 0 || (review && record.solution[index] === destination)) return;
        draw([[18, record.leftYs[index]], [282, record.rightYs[destination]]],
          review ? '#555' : record.colors[index][1], review);
      });
      if (drag?.moved) {
        draw([[18, record.leftYs[drag.wire]], drag.point], record.colors[drag.wire][1]).classList.add('wiring-preview');
      }
      left.forEach((button, index) => {
        button.disabled = !canInteract();
        button.classList.toggle('is-active', record.activeWire === index && !review);
        button.classList.toggle('is-connected', record.selected[index] >= 0);
        button.classList.toggle('is-correct', review && record.selected[index] === record.solution[index]);
        button.classList.toggle('is-incorrect', review && record.selected[index] !== record.solution[index]);
        button.setAttribute('aria-pressed', String(record.activeWire === index));
        button.setAttribute('aria-label', `${record.colors[index][0]} wire${record.selected[index] >= 0 ? `, selected destination ${record.selected[index] + 1}` : ''}${review ? record.selected[index] === record.solution[index] ? ', correct' : ', incorrect' : ''}`);
      });
      right.forEach((button, index) => {
        button.disabled = !canInteract();
        const selected = record.selected.indexOf(index);
        button.classList.toggle('is-connected', !reveal && selected >= 0);
        button.classList.toggle('is-drop-target', drag?.moved && drag.target === index);
        button.style.setProperty('--wire-color', !reveal && selected >= 0 ? record.colors[selected][1] : '#fff');
        button.setAttribute('aria-label', `Destination ${index + 1}${!reveal && selected >= 0 ? `, selected for ${record.colors[selected][0]} wire` : ''}`);
      });
    };
    const endpoint = (side, index) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = `wire-endpoint wire-endpoint--${side}`;
      button.dataset.wireSide = side; button.dataset.wireIndex = index;
      button.style.left = `${(side === 'left' ? 18 : 282) / 3}%`;
      button.style.top = `${(side === 'left' ? record.leftYs[index] : record.rightYs[index]) / 3}%`;
      // Space selects endpoints; Enter remains the shared phase/submit key.
      button.addEventListener('keydown', event => {
        if (event.key === ' ') { event.preventDefault(); event.stopPropagation(); button.click(); }
      });
      button.addEventListener('click', () => {
        if (!canInteract()) return;
        if (side === 'left') record.activeWire = index;
        else if (record.activeWire !== null) {
          connect(record.activeWire, index);
        }
        update(); onChange();
      });
      board.appendChild(button);
      return button;
    };
    for (let index = 0; index < record.config.wires; index++) {
      const button = endpoint('left', index);
      button.style.setProperty('--wire-color', record.colors[index][1]); left.push(button);
    }
    for (let index = 0; index < record.config.destinations; index++) right.push(endpoint('right', index));
    const destinationAt = (x, y) => {
      let target = null, closest = Infinity;
      right.forEach((button, index) => {
        const bounds = button.getBoundingClientRect();
        const distance = Math.hypot(x - bounds.x - bounds.width / 2, y - bounds.y - bounds.height / 2);
        if (distance <= Math.max(12, bounds.width / 2 + 4) && distance < closest) {
          target = index; closest = distance;
        }
      });
      return target;
    };
    const finishDrag = (event, commit = false) => {
      if (!drag || drag.id !== event.pointerId) return;
      const current = drag;
      const target = destinationAt(event.clientX, event.clientY);
      if (commit && current.moved && board.isConnected && canInteract() && target !== null) connect(current.wire, target);
      drag = null;
      current.events.abort();
      board.classList.remove('is-dragging');
      if (board.hasPointerCapture(current.id)) board.releasePointerCapture(current.id);
      if (board.isConnected) { update(); onChange(); }
    };
    board.addEventListener('pointerdown', event => {
      const button = event.target.closest('[data-wire-side="left"]');
      if (!canInteract() || drag || !button || !board.contains(button) || (event.pointerType === 'mouse' && event.button !== 0)) return;
      event.preventDefault();
      const wire = Number(button.dataset.wireIndex);
      record.activeWire = wire;
      drag = { id: event.pointerId, wire, x: event.clientX, y: event.clientY,
        moved: false, target: null, point: [18, record.leftYs[wire]], events: new AbortController() };
      button.focus({ preventScroll: true });
      board.setPointerCapture(event.pointerId);
      const options = { signal: drag.events.signal };
      // Keep the drag alive outside the board even if a browser drops capture.
      document.addEventListener('pointermove', moveDrag, options);
      document.addEventListener('pointerup', event => finishDrag(event, true), options);
      document.addEventListener('pointercancel', event => finishDrag(event), options);
      update(); onChange();
    });
    const moveDrag = event => {
      if (!drag || drag.id !== event.pointerId) return;
      if (!board.isConnected || !canInteract() || (event.pointerType === 'mouse' && !event.buttons)) { finishDrag(event); return; }
      drag.moved ||= Math.hypot(event.clientX - drag.x, event.clientY - drag.y) >= 4;
      if (!drag.moved) return;
      // Invert the SVG's actual screen matrix so previews follow the pointer
      // correctly even on a tilted board inside a scaled workspace.
      const matrix = svg.getScreenCTM();
      if (!matrix) { finishDrag(event); return; }
      const cursor = svg.createSVGPoint(); cursor.x = event.clientX; cursor.y = event.clientY;
      const point = cursor.matrixTransform(matrix.inverse());
      drag.target = destinationAt(event.clientX, event.clientY);
      drag.point = drag.target === null ? [Math.max(0, Math.min(300, point.x)), Math.max(0, Math.min(300, point.y))]
        : [282, record.rightYs[drag.target]];
      board.classList.add('is-dragging');
      update();
    };
    update();
    return board;
  }
  window.WiringChallenge = { generate, reset, grade, mount };
})();
