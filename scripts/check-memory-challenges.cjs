// Run against a local game server and a separate Chrome with --remote-debugging-port=9223.
// Requires Node.js 22+; uses its built-in WebSocket and no npm dependencies.
const assert = require('node:assert/strict');
const { setTimeout: delay } = require('node:timers/promises');
const fs = require('node:fs');

const chrome = `http://127.0.0.1:${process.env.MEMORY_CHROME_PORT || 9223}`;
const gameUrl = process.env.MEMORY_GAME_URL || 'http://127.0.0.1:8765/';
const defaults = { maze: { enabled: true, size: 4, length: 7 }, shape: { enabled: true, size: 4, cells: 5 }, different: { enabled: true, size: 3, count: 2 }, wiring: { enabled: false }, countries:{enabled:false} };

(async () => {
  const target = await fetch(`${chrome}/json/new?about:blank`, { method: 'PUT' }).then(response => response.json());
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0;
  const pending = new Map(), errors = [], checks = [];
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const next = ++id; pending.set(next, { resolve, reject }); socket.send(JSON.stringify({ id: next, method, params }));
  });
  socket.onmessage = event => {
    const data = JSON.parse(event.data);
    if (data.id) {
      const task = pending.get(data.id); pending.delete(data.id);
      if (data.error) task.reject(data.error); else task.resolve(data.result);
    } else if (data.method === 'Runtime.exceptionThrown') errors.push(data.params.exceptionDetails);
    else if (data.method === 'Fetch.requestPaused') {
      send('Fetch.failRequest', { requestId: data.params.requestId, errorReason: 'InternetDisconnected' });
    }
  };
  const evaluate = async expression => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    return response.result.value;
  };
  const waitFor = async (expression, timeout = 10000) => {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      try { if (await evaluate(expression)) return; }
      catch (error) {
        // Reloads can briefly replace the page's execution context.
        if (error.code !== -32000 || !/context|not attached to an active page/i.test(error.message)) throw error;
      }
      await delay(40);
    }
    throw Error(`Timed out: ${expression}`);
  };
  const pass = name => { checks.push(name); console.log(`PASS ${checks.length}: ${name}`); };
  const enter = async () => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await delay(40);
  };
  const config = value => evaluate(`MemoryChallenges.saveConfig(${JSON.stringify({...value,wiring:value.wiring || {enabled:false},countries:value.countries || {enabled:false}})})`);
  const start = async (index = 0) => {
    await evaluate(`closeSplashScreen();closeSplashLoading();closeStageIntro();resetGame();startStage(${index},{skipIntro:true,skipFlashWarningPrompt:true});successAnimationEnabled=false;`);
    await waitFor('phase === "show" && document.querySelectorAll(".memory-challenge").length === Object.values(MemoryChallenges.getConfig()).filter(c=>c.enabled).length');
  };
  const plans = () => evaluate(`JSON.parse(JSON.stringify([...document.querySelectorAll('.memory-challenge')].map(panel=>{
    const key=panel.dataset.challenge, cells=[...panel.querySelectorAll('.memory-cell')];
    let solution;
    if(key==='countries'){
      const catalog=CountryChallenge.getCountries();
      return {key,solution:[...panel.querySelectorAll('.country-prompt li')].map(item=>catalog.find(country=>country.name===item.textContent).code)};
    }
    if(key==='wiring') {
      const colors=[...panel.querySelectorAll('[data-wire-side=left]')].map(button=>button.style.getPropertyValue('--wire-color'));
      const destinations=[...panel.querySelectorAll('[data-wire-side=right]')].map(button=>parseFloat(button.style.top)*3);
      solution=colors.map(color=>{
        const path=[...panel.querySelectorAll('.wiring-paths path')].find(path=>path.getAttribute('stroke')===color);
        const end=Number(path.getAttribute('d').trim().split(/\\s+/).at(-1));
        return destinations.findIndex(value=>Math.abs(value-end)<0.001);
      });
      return {key,solution};
    }
    if(key==='maze') solution=cells.filter(c=>c.classList.contains('is-target')).sort((a,b)=>Number(a.textContent)-Number(b.textContent)).map(c=>Number(c.dataset.cell));
    else if(key==='shape') solution=cells.filter(c=>c.classList.contains('is-target')).map(c=>Number(c.dataset.cell));
    else {const values=cells.map(c=>c.innerHTML), counts={};values.forEach(v=>counts[v]=(counts[v]||0)+1);const common=Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];solution=values.flatMap((v,i)=>v!==common?[i]:[])}
    return {key,size:Math.sqrt(cells.length),solution};
  })))`);
  const point = async (key, cell, scroll = true) => {
    if (scroll) await evaluate(`document.querySelector('[data-challenge="${key}"] .memory-grid').scrollIntoView({block:'center',behavior:'instant'})`);
    return evaluate(`(()=>{const r=document.querySelector('[data-challenge="${key}"] [data-cell="${cell}"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  };
  const mouse = (type, p, down = false) => send('Input.dispatchMouseEvent', { type, ...p, button: type === 'mouseMoved' ? 'none' : 'left', buttons: down ? 1 : 0, clickCount: type === 'mouseMoved' ? 0 : 1 });
  const draw = async (key, cells) => {
    if (!cells.length) return;
    const first = await point(key, cells[0]);
    await mouse('mouseMoved', first); await mouse('mousePressed', first, true);
    await delay(20);
    for (const cell of cells.slice(1)) {
      await mouse('mouseMoved', await point(key, cell, false), true);
      await delay(20);
    }
    await mouse('mouseReleased', await point(key, cells[cells.length - 1], false));
  };
  const choose = async (key, cells) => {
    for (const cell of cells) { const p = await point(key, cell); await mouse('mouseMoved', p); await mouse('mousePressed', p, true); await mouse('mouseReleased', p); }
  };
  const wirePoint = (side,index) => evaluate(`(()=>{const r=document.querySelector('[data-wire-side="${side}"][data-wire-index="${index}"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  const wireClick = async (side,index) => {
    const p=await wirePoint(side,index);
    await mouse('mouseMoved',p);await mouse('mousePressed',p,true);await mouse('mouseReleased',p);
  };
  const connect = async (wire,destination) => {await wireClick('left',wire);await wireClick('right',destination);};
  const wireDrag = async (wire,destination,finish=true) => {
    const start=await wirePoint('left',wire),end=typeof destination==='number'?await wirePoint('right',destination):destination;
    await mouse('mouseMoved',start);await mouse('mousePressed',start,true);
    await mouse('mouseMoved',{x:(start.x+end.x)/2,y:(start.y+end.y)/2},true);await delay(20);
    assert.equal(await evaluate('document.querySelectorAll(".wiring-preview").length'),1);
    await mouse('mouseMoved',end,true);await delay(20);
    if(typeof destination==='number'){
      assert.equal(await evaluate(`document.querySelector('[data-wire-side="right"][data-wire-index="${destination}"]').classList.contains('is-drop-target')`),true);
      const previewEnd=await evaluate(`document.querySelector('.wiring-preview').getAttribute('d').trim().split(/\\s+/).slice(-2).map(Number)`);
      const expectedY=await evaluate(`parseFloat(document.querySelector('[data-wire-side="right"][data-wire-index="${destination}"]').style.top)*3`);
      assert.ok(Math.abs(previewEnd[0]-282)<0.001&&Math.abs(previewEnd[1]-expectedY)<0.001,JSON.stringify(previewEnd));
    }
    if(finish)await mouse('mouseReleased',end);
    return end;
  };
  const solve = async (captured, override = {}) => {
    for (const plan of captured) {
      const cells = override[plan.key] || plan.solution;
      if (plan.key === 'wiring') {for(let i=0;i<cells.length;i++)await connect(i,cells[i]);}
      else if (plan.key === 'maze') await draw(plan.key, cells); else await choose(plan.key, cells);
    }
  };
  const fillCards = (wrong = false) => evaluate(`document.querySelectorAll('#inputGrid input').forEach(input=>{const index=Number(input.dataset.index);const item=roundItems[swapMap?swapMap[index]:index];input.value=${wrong ? "'not-the-answer'" : 'String(item.answer ?? item.label)'}})`);
  const submit = async () => {
    await evaluate('checkAnswers()');
    const failedEntry=await evaluate(`document.body.classList.contains('stage-fail') && phase==='result' ? {
      opacity:getComputedStyle(gameFooterContent).opacity,
      visibility:getComputedStyle(gameFooterContent).visibility,
      transition:getComputedStyle(gameFooterContent).transitionDuration,
      entrance:[...document.querySelectorAll('#gameFooter .game-hud,#resultsPanel,#gameFooter .actions')].some(node=>getComputedStyle(node).animationName.includes('resultControlsEnter'))
    } : null`);
    if(failedEntry)assert.deepEqual(failedEntry,{opacity:'0',visibility:'hidden',transition:'0s',entrance:false});
    await evaluate(`Promise.all(document.getAnimations().filter(animation=>animation.animationName==='resultControlsEnter').map(animation=>animation.finished.catch(()=>{}))).then(()=>true)`);
  };

  try {
    await send('Runtime.enable'); await send('Page.enable');
    await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
    // Keep browser tests local: cloud writes and remote font requests are unnecessary.
    await send('Fetch.enable', { patterns: [{ urlPattern: '*www.gstatic.com/firebasejs/*' }, { urlPattern: '*fonts.googleapis.com/*' }] });
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    const initialization = await send('Page.addScriptToEvaluateOnNewDocument', { source: `
      localStorage.clear();
      localStorage.setItem('flashRecallContentResetVersion','2026.04.0-stage-reset-2');
      localStorage.setItem('flashRecallPlayerName','Test Player');localStorage.setItem('flashRecallPlayerNamePrompted','1');
      localStorage.setItem('flashRecallSplashSeen','1');localStorage.setItem('flashRecallStage1RecallLockUsed','1');
      localStorage.setItem('flashRecallAutoStartStagePreview','0');localStorage.setItem('flashRecallAutoAdvanceNext','0');localStorage.setItem('flashRecallAutoRetry','0');
    ` });
    await send('Page.navigate', { url: gameUrl });
    await send('Page.bringToFront');
    await waitFor('typeof startRound === "function" && window.MemoryChallenges && !document.body.classList.contains("loading-overlay")');
    await evaluate('closeSplashScreen();closeSplashLoading();document.getElementById("stagesOpen").click();successAnimationEnabled=false');
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('.mode-grid button')].map(button=>button.textContent.trim())`),['Levels','Sandbox','Amino Acids']);
    assert.equal(await evaluate('document.body.dataset.view'),'stages');
    assert.equal(await evaluate('MemoryChallenges.getConfig().wiring.enabled'),true);
    assert.equal(await evaluate('document.querySelectorAll("[data-memory-config^=wiring]").length'),4);
    await config(defaults);
    await start();
    await waitFor('phase === "show" && document.querySelectorAll(".memory-challenge").length === 3');
    pass('The menu offers Levels, Sandbox, and Amino Acids; levels retain combined rounds');
    assert.equal(await evaluate('roundItems.length > 0 && document.querySelectorAll(".memory-challenge").length === 3'), true);
    assert.equal(await evaluate('[...document.querySelectorAll(".memory-cell")].every(c=>c.disabled)'), true);
    pass('Cards and all three challenges appear simultaneously, with reveal inputs locked');

    assert.equal(await evaluate(`[
      ...document.querySelectorAll('.memory-workspace h2, .memory-challenge__footer, .memory-maze-step'),
      document.getElementById('memoryRoundControls'), document.getElementById('hudCluster'), document.getElementById('streakPill')
    ].every(element => element.getClientRects().length === 0)`), true);
    assert.equal(await evaluate(`document.querySelector('.memory-maze-route polyline').getAttribute('points').split(' ').length`), 7);
    pass('Memorization hides interface text and shows an ordered visual maze route');

    const capture = await plans();
    assert.deepEqual(capture.map(p => p.solution.length), [7, 5, 2]);
    await enter(); await waitFor('phase === "recall"');
    assert.equal(await evaluate('document.querySelectorAll(".memory-grid .is-target, .memory-grid svg").length'), 0);
    assert.equal(await evaluate('[...document.querySelectorAll(".memory-cell")].every(c=>!c.disabled)'), true);
    assert.equal(await evaluate('[...document.querySelectorAll(".memory-cell")].some(c=>/step|filled|triangle|square|circle/.test(c.getAttribute("aria-label")))'), false);
    pass('One real Enter key clears every original grid and starts all answer interfaces together');
    assert.equal(await evaluate(`[...document.querySelectorAll('.memory-challenge__footer')].every(element => element.getClientRects().length > 0)`), true);
    assert.equal(await evaluate(`[...document.querySelectorAll('.memory-challenge h2, #memoryRoundControls')].every(element => element.getClientRects().length === 0)`), true);
    pass('Answer phase shows selection feedback without puzzle titles or a submit button');


    if (process.env.MEMORY_DEBUG) await evaluate(`window.__pointerEvents=[];['pointerdown','pointermove','pointerup','lostpointercapture','click'].forEach(type=>document.addEventListener(type,e=>{if(e.target.closest?.('.memory-grid'))window.__pointerEvents.push({type,id:e.pointerId,buttons:e.buttons,detail:e.detail,cell:e.target.dataset.cell,selected:document.querySelectorAll('[data-challenge=maze] .is-selected').length})},true))`);
    await solve(capture); await fillCards();
    if (process.env.MEMORY_DEBUG) console.log(JSON.stringify(await evaluate('({phase,events:window.__pointerEvents,selected:[...document.querySelectorAll("[data-challenge=maze] .is-selected")].map(c=>c.dataset.cell),active:document.activeElement.outerHTML.slice(0,100)})')));
    assert.equal(await evaluate('document.querySelectorAll("[data-challenge=maze] .is-selected").length'), 7);
    await submit();
    assert.equal(await evaluate('window.__lastAllCorrect && phase === "show" && round === 2'), true);
    pass('Real pointer capture and drag reconstruct the ordered maze; original hidden solutions survive recall');

    for (let i = 0; i < 2; i++) { const solution = await plans(); await enter(); await solve(solution); await fillCards(); await submit(); }
    assert.equal(await evaluate('stageState.completed && phase === "result" && window.__lastMemoryChallengeResults.every(r=>r.correct)'), true);
    assert.equal(await evaluate('Object.values(JSON.parse(localStorage.getItem("flashRecallStageProgress_B")).completed).some(Boolean)'), true);
    assert.equal(await evaluate('[...document.querySelectorAll(".memory-cell")].every(c=>c.disabled)'), true);
    pass('All four tasks must pass all three rounds before stage completion and saved progress');

    await start(); await enter(); await fillCards(); await submit();
    assert.equal(await evaluate('stageState.failed && window.__lastEntries.every(e=>e.correct) && window.__lastMemoryChallengeResults.every(r=>!r.correct)'), true);
    pass('Correct cards alone fail when additional challenge answers are missing');

    await start(); let solution = await plans(); await enter(); await solve(solution); await fillCards(true); await submit();
    assert.equal(await evaluate('stageState.failed && window.__lastMemoryChallengeResults.every(r=>r.correct) && window.__lastEntries.some(e=>!e.correct)'), true);
    pass('Correct additional challenges cannot mask an incorrect card answer');

    await start(); solution = await plans(); await enter();
    await solve(solution, { maze: solution[0].solution.slice().reverse() }); await fillCards(); await submit();
    assert.equal(await evaluate('window.__lastMemoryChallengeResults.filter(r=>!r.correct).map(r=>r.key).join()'), 'maze');
    pass('Maze evaluation rejects the same cells traced in the wrong order');

    await start(); solution = await plans(); await enter();
    const shape = solution.find(p => p.key === 'shape');
    const extraShape = Array.from({ length: shape.size ** 2 }, (_, i) => i).find(i => !shape.solution.includes(i));
    await solve(solution, { shape: [...shape.solution.slice(1), extraShape] }); await fillCards(); await submit();
    assert.equal(await evaluate('window.__lastMemoryChallengeResults.filter(r=>!r.correct).map(r=>r.key).join()'), 'shape');
    pass('Vanishing Shapes requires exact positions, rejecting translated or extra cells');

    await start(); solution = await plans(); await enter();
    const different = solution.find(p => p.key === 'different');
    const extra = Array.from({ length: different.size ** 2 }, (_, i) => i).find(i => !different.solution.includes(i));
    await solve(solution, { different: [...different.solution, extra] }); await fillCards(); await submit();
    assert.equal(await evaluate('window.__lastMemoryChallengeResults.filter(r=>!r.correct).map(r=>r.key).join()'), 'different');
    pass('Find the Different Shape rejects false-positive selections independently');

    await evaluate('document.getElementById("stageRetryButton").click()');
    assert.equal(await evaluate('phase === "show" && document.querySelectorAll(".memory-grid .is-selected").length === 0 && document.querySelectorAll(".memory-challenge").length === 3'), true);
    pass('Retry resets every input and generates a complete synchronized round');

    await start(); solution = await plans(); await enter();
    const maze = solution[0];
    await draw('maze', maze.solution.slice(0, 3)); await draw('maze', maze.solution.slice(0, 3).reverse());
    assert.equal(await evaluate('document.querySelectorAll("[data-challenge=maze] .is-selected").length'), 1);
    await evaluate('document.querySelector("[data-challenge=maze] .memory-clear").click()');
    const first = await point('maze', maze.solution[0]);
    await mouse('mousePressed', first, true); await mouse('mouseReleased', { x: 5, y: 5 });
    await mouse('mouseMoved', await point('maze', maze.solution[1]));
    assert.equal(await evaluate('document.querySelectorAll("[data-challenge=maze] .is-selected").length'), 1);
    pass('Drag backtracking, Clear, and releasing outside the grid preserve correct selection state');

    await start(); await evaluate('setTimer(0.05,"Reveal",beginRecallPhase)'); await waitFor('phase === "recall"');
    assert.equal(await evaluate('document.querySelectorAll(".memory-grid .is-target, .memory-grid svg").length'), 0);
    await evaluate('setTimer(0.05,"Recall",checkAnswers)'); await waitFor('phase === "result"');
    assert.equal(await evaluate('stageState.failed && window.__lastMemoryChallengeResults.length === 3'), true);
    pass('Reveal and recall timer expiry synchronize concealment, grading, and input locking');

    await config({ maze: { enabled: false }, shape: { enabled: false }, different: { enabled: false } });
    await start(); assert.equal(await evaluate('document.querySelectorAll(".memory-challenge").length'), 0);
    await enter(); await fillCards(); await submit();
    assert.equal(await evaluate('window.__lastAllCorrect && round === 2 && phase === "show"'), true);
    pass('Disabling the extras preserves the original card-only round and progression');

    await config(defaults); await start(); await evaluate('clearInterval(timerId)');
    for (let size = 3; size <= 8; size++) {
      await evaluate(`MemoryChallenges.start({maze:{size:${size},length:${size * size}},shape:{size:${size},cells:${size * size - 1}},different:{size:${size},count:${Math.floor((size * size - 1) / 2)}}})`);
      const generated = await plans();
      const path = generated[0].solution;
      assert.equal(path.length, size * size); assert.equal(new Set(path).size, path.length);
      for (let i = 1; i < path.length; i++) assert.equal(Math.abs(Math.floor(path[i] / size) - Math.floor(path[i - 1] / size)) + Math.abs(path[i] % size - path[i - 1] % size), 1);
      assert.equal(generated[1].solution.length, size * size - 1);
      assert.equal(generated[2].solution.length, Math.floor((size * size - 1) / 2));
    }
    pass('Every supported grid size generates valid full-length paths, shapes, and minority differences');

    const normalized = await config({ maze: { size: 2, length: 999 }, shape: { size: 99, cells: 999 }, different: { size: 3, count: 999 } });
    assert.deepEqual([normalized.maze.size, normalized.maze.length, normalized.shape.size, normalized.shape.cells, normalized.different.count], [3, 9, 8, 63, 4]);
    pass('Configuration safely clamps grid sizes, path lengths, shape sizes, and difference counts');

    await config(defaults); await start();
    await evaluate(`document.querySelector('[data-memory-config="maze.size"]').value=5;document.querySelector('[data-memory-config="maze.size"]').dispatchEvent(new Event('change',{bubbles:true}))`);
    assert.equal((await plans())[0].size, 4);
    await start(); assert.equal((await plans())[0].size, 5);
    pass('Settings changes preserve the active solution and apply to the next round only');

    await config(defaults); await start();
    const sequence = await evaluate('stagesConfig.findIndex(s=>s.stageType === "sequence")');
    if (sequence >= 0) { await start(sequence); await enter(); await waitFor('phase === "recall"'); }
    assert.equal(await evaluate('document.querySelectorAll(".memory-grid .is-target, .memory-grid svg").length'), 0);
    pass('Enter transitions sequence stages and the extra challenges together');

    const flash = await evaluate('stagesConfig.findIndex(s=>s.stageType === "flash")');
    assert.ok(flash >= 0);
    await start(flash); await enter(); await waitFor('phase === "recall"');
    assert.equal(await evaluate('document.querySelectorAll(".memory-grid .is-target, .memory-grid svg").length'), 0);
    pass('Enter synchronizes flash stages without leaving any extra solution visible');

    await start(); await enter();
    await evaluate('document.querySelector("[data-challenge=shape] .memory-cell").focus()');
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
    assert.equal(await evaluate('document.querySelectorAll("[data-challenge=shape] .is-selected").length'), 1);
    assert.equal(await evaluate('phase'), 'recall');
    pass('Keyboard Space selects a cell without submitting the round');

    await evaluate(`resetGame();modeSelect.value='practice';updateModeUI();document.querySelectorAll('#practiceModal .checkboxes input').forEach(input=>input.checked=input.value==='numbers');practiceSwap.checked=true;if(practiceSwapChance)practiceSwapChance.value='1';cardCountInput.value='2';startRound()`);
    await enter();
    assert.equal(await evaluate('document.querySelectorAll(".memory-grid .is-target, .memory-grid svg").length'), 0);
    assert.equal(await evaluate('document.querySelector(".memory-cell").disabled'), false);
    assert.equal(await evaluate('swapMap === null && !swapTimeoutId'), true);
    pass('Scattered rounds retain original horizontal answer order even when the legacy swap option is saved');

    await config(defaults); await start();
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await delay(150);
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), true);
    assert.equal(await evaluate('[...document.querySelectorAll(".memory-grid")].every(grid=>grid.getBoundingClientRect().width <= innerWidth)'), true);
    pass('Narrow screens keep every scattered grid accessible without horizontal page overflow');

    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await start();
    await delay(450);
    const bounds = await evaluate('[...document.querySelectorAll(".memory-challenge")].map(panel=>{const r=panel.getBoundingClientRect();return {top:r.top,bottom:r.bottom}})');
    assert.ok(bounds.every(rect => rect.top >= 0 && rect.bottom <= 900), JSON.stringify(bounds));
    if (process.env.MEMORY_SCREENSHOT) {
      const screen = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(process.env.MEMORY_SCREENSHOT, Buffer.from(screen.data, 'base64'));
    }
    pass('Desktop layout presents cards and all three challenge grids in the same viewport');

    // Read visual content and screen geometry, independently of the grading array.
    const deskGeometry = () => evaluate(`(()=>{
      const desk=document.getElementById('memoryWorkspace').getBoundingClientRect();
      const nodes=[...document.querySelectorAll('#cardGrid > .card, .memory-challenge')];
      const boxes=nodes.map(node=>{const r=node.getBoundingClientRect();return {x:r.x-desk.x,y:r.y-desk.y,width:r.width,height:r.height}});
      const outside=boxes.some(r=>r.x < -1 || r.y < -1 || r.x+r.width > desk.width+1 || r.y+r.height > desk.height+1);
      const overlap=boxes.some((a,i)=>boxes.slice(i+1).some(b=>a.x < b.x+b.width-1 && a.x+a.width > b.x+1 && a.y < b.y+b.height-1 && a.y+a.height > b.y+1));
      return {boxes,outside,overlap,overflow:document.documentElement.scrollWidth>innerWidth+1};
    })()`);
    const visualCards = () => evaluate(`(()=>{
      const cards=[...document.querySelectorAll('#cardGrid > .card')].map(card=>{
        const r=card.getBoundingClientRect();return {value:card.textContent.trim(),x:r.x,y:r.y};
      }).sort((a,b)=>a.x-b.x);
      const ordered=[];
      while(cards.length){
        const first=cards[0].x, group=[];
        while(cards.length && cards[0].x-first<=6) group.push(cards.shift());
        ordered.push(...group.sort((a,b)=>a.y-b.y));
      }
      return ordered;
    })()`);
    const practiceFive = () => evaluate(`resetGame();closeStageIntro();document.body.dataset.view='home';stagesScreen.setAttribute('aria-hidden','true');modeSelect.value='practice';updateModeUI();
      document.querySelectorAll('#practiceModal .checkboxes input').forEach(input=>input.checked=input.value==='numbers');
      practiceSwap.checked=false;cardCountInput.value='5';startRound();successAnimationEnabled=false;`);
    await config(defaults); await practiceFive();
    let geometry=await deskGeometry();
    assert.equal(geometry.outside || geometry.overlap || geometry.overflow,false,JSON.stringify(geometry));
    assert.equal(await evaluate(`[document.querySelector('main'),document.querySelector('.stage.panel'),...document.querySelectorAll('.memory-challenge')].every(node=>parseFloat(getComputedStyle(node).borderTopWidth)===0)`),true);
    pass('Five scattered cards and all puzzles fit without overlap or enclosing panels');

    const originalGeometry=geometry.boxes;
    await evaluate('renderCards(true);MemoryChallenges.setPhase("show")');
    assert.deepEqual((await deskGeometry()).boxes,originalGeometry);
    pass('Re-rendering preserves every stored memorization position');
    const cardAngles=await evaluate(`[...document.querySelectorAll('#cardGrid > .card')].map(card=>getComputedStyle(card).rotate)`);
    assert.ok(cardAngles.every(angle=>Math.abs(parseFloat(angle))<=4)&&cardAngles.some(angle=>Math.abs(parseFloat(angle))>0.1));


    let visual=await visualCards();
    assert.deepEqual(visual.map(card=>card.value),await evaluate('roundItems.map(item=>String(item.answer ?? item.label))'));
    assert.ok(new Set(visual.map(card=>Math.round(card.y/20))).size>1);
    pass('Scattered card grading follows horizontal coordinates despite differing vertical positions');
    const capturedSolutions=await plans();
    const cardsBefore=await evaluate(`[...document.querySelectorAll('#cardGrid > .card')].map(card=>{const r=card.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}})`);
    const gridBefore=await evaluate(`[...document.querySelectorAll('.memory-grid')].map(grid=>{const r=grid.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}})`);
    await enter();
    const gridAfter=await evaluate(`[...document.querySelectorAll('.memory-grid')].map(grid=>{const r=grid.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}})`);
    assert.deepEqual(gridAfter,gridBefore);
    assert.equal(await evaluate(`[...document.querySelectorAll('#inputGrid input')].every((input,i,inputs)=>i===0||input.getBoundingClientRect().left>inputs[i-1].getBoundingClientRect().left)`),true);
    const inputsAfter=await evaluate(`[...document.querySelectorAll('#inputGrid input')].map(input=>{const r=input.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}})`);
    assert.deepEqual(inputsAfter,cardsBefore);
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('#inputGrid > .input-slot')].map(card=>getComputedStyle(card).rotate)`),cardAngles);
    pass('Every answer box replaces its original card exactly while puzzles retain their positions');
    await evaluate(`document.querySelectorAll('#inputGrid input').forEach((input,i)=>input.value=${JSON.stringify(visual.map(card=>card.value))}[i])`);
    await solve(capturedSolutions); await submit();
    assert.equal(await evaluate('window.__lastAllCorrect'),true);
    pass('Answers captured from the scattered screen pass the real grader in visual order');

    const reviewBounds = selector => evaluate(`(()=>{
      const desk=document.getElementById('memoryWorkspace').getBoundingClientRect();
      return [...document.querySelectorAll('${selector}')].map(node=>{
        const r=node.getBoundingClientRect();return {x:r.x-desk.x,y:r.y-desk.y,width:r.width,height:r.height};
      });
    })()`);
    const reviewCardPositions=await reviewBounds('#cardGrid > .card');
    const reviewPuzzlePositions=await reviewBounds('.memory-grid');
    await enter(); await fillCards(true); await submit();
    assert.equal(await evaluate('phase'), 'result');
    assert.deepEqual(await reviewBounds('#inputGrid input'),reviewCardPositions);
    const reviewedPuzzles=await reviewBounds('.memory-grid');
    assert.ok(reviewedPuzzles.every((box,index)=>Object.keys(box).every(key=>Math.abs(box[key]-reviewPuzzlePositions[index][key])<0.1)));
    assert.equal(await evaluate(`[...document.querySelectorAll('.input-correct-inline')].every(node=>{
      const r=node.getBoundingClientRect(),p=node.parentElement.getBoundingClientRect();
      return r.left>=p.left && r.right<=p.right && r.top>=p.top && r.bottom<=p.bottom;
    })`),true);
    assert.equal(await evaluate('document.querySelectorAll(".input-correct-inline").length'),5);
    if(process.env.MEMORY_REVIEW_SCREENSHOT){
      const screen=await send('Page.captureScreenshot',{format:'png'});
      fs.writeFileSync(process.env.MEMORY_REVIEW_SCREENSHOT,Buffer.from(screen.data,'base64'));
    }
    pass('Solution review keeps every card answer and puzzle at its original position with corrections inside each card');

    await evaluate('document.activeElement.blur()');
    await mouse('mouseMoved',{x:640,y:50});await waitFor("getComputedStyle(gameFooterContent).visibility === 'hidden'");
    const overlayLayout=await evaluate(`(()=>{const field=document.getElementById('memoryField').getBoundingClientRect(),frame=document.getElementById('viewportFrame').getBoundingClientRect();return {bottom:field.bottom,height:field.height,frameBottom:frame.bottom,frameHeight:frame.height,transform:document.getElementById('memoryWorkspace').style.transform}})()`);
    assert.ok(Math.abs(overlayLayout.bottom-overlayLayout.frameBottom)<1 && overlayLayout.height>overlayLayout.frameHeight-30,JSON.stringify(overlayLayout));
    assert.equal(await evaluate('getComputedStyle(gameFooterContent).visibility'), 'hidden');
    assert.equal(await evaluate('gameFooterContent.inert'),true);
    await mouse('mouseMoved',{x:640,y:880});await waitFor("getComputedStyle(gameFooterContent).opacity === '1'");
    assert.equal(await evaluate('getComputedStyle(gameFooterContent).opacity'),'1',JSON.stringify(await evaluate(`({state:document.body.dataset.state,classes:gameFooter.className,body:document.body.className,bounds:gameFooter.getBoundingClientRect().toJSON(),pointerTarget:document.elementFromPoint(640,880)?.outerHTML.slice(0,150)})`)));
    assert.equal(await evaluate('getComputedStyle(gameFooter).backdropFilter'),'none');
    assert.equal(await evaluate('getComputedStyle(gameFooterContent).backdropFilter'),'none');
    const blurBounds=await evaluate(`[...document.querySelectorAll('#gameFooter .game-hud,#gameFooter .stage-fail-bar__text,#gameFooter .stage-fail-actions')].map(node=>{const r=node.getBoundingClientRect();return {width:r.width,height:r.height,blur:getComputedStyle(node).backdropFilter}})`);
    assert.equal(blurBounds.length,3);
    assert.ok(blurBounds.every(group=>group.blur==='blur(4px)'&&group.width<300&&group.height<100),JSON.stringify(blurBounds));
    assert.equal(await evaluate('gameFooterContent.inert'),false);
    assert.equal(await evaluate('document.getElementById("memoryWorkspace").style.transform'),overlayLayout.transform);
    assert.equal(await evaluate('document.getElementById("memoryField").getBoundingClientRect().bottom'),overlayLayout.bottom);
    const retryPoint=await evaluate(`(()=>{const r=document.getElementById('practiceRetryButton').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await mouse('mouseMoved',retryPoint);await delay(40);
    assert.equal(await evaluate('gameFooter.classList.contains("controls-open")'),true);
    assert.equal(await evaluate(`document.elementFromPoint(${retryPoint.x},${retryPoint.y}).closest('button').id`),'practiceRetryButton');
    await mouse('mouseMoved',{x:640,y:50});await waitFor("getComputedStyle(gameFooterContent).visibility === 'hidden'");
    assert.equal(await evaluate('getComputedStyle(gameFooterContent).visibility'),'hidden');
    assert.equal(await evaluate('getComputedStyle(gameFooter).backdropFilter'),'none');
    pass('Failed-screen hover fades controls with blur confined to three small text/button groups; the full-width footer never blurs');

    await evaluate('document.getElementById("controlsHandle").focus()');await delay(320);
    assert.equal(await evaluate('gameFooter.classList.contains("controls-open")'),true);
    await enter();assert.equal(await evaluate('phase'),'result');
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    assert.equal(await evaluate('gameFooterContent.contains(document.activeElement)'),true);
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    await delay(320);
    assert.equal(await evaluate('gameFooterContent.inert'),true);
    await send('Emulation.setTouchEmulationEnabled',{enabled:true});
    const handlePoint=await evaluate(`(()=>{const r=document.getElementById('controlsHandle').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    const tapHandle=async()=>{
      await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[handlePoint]});
      await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(320);
    };
    await tapHandle();assert.equal(await evaluate('gameFooterContent.inert'),false);
    await tapHandle();assert.equal(await evaluate('gameFooterContent.inert'),true);
    await send('Emulation.setTouchEmulationEnabled',{enabled:false});
    await evaluate('document.activeElement.blur()');
    await mouse('mouseMoved',{x:640,y:50});
    await mouse('mouseMoved',{x:640,y:880});await waitFor("getComputedStyle(gameFooterContent).opacity === '1'");
    await mouse('mouseMoved',retryPoint);await mouse('mousePressed',retryPoint,true);await mouse('mouseReleased',retryPoint);
    await waitFor('phase === "show"');
    assert.equal(await evaluate('gameFooterContent.inert'),false);
    await mouse('mouseMoved',{x:640,y:50});
    await waitFor("getComputedStyle(gameFooterContent).opacity === '1'");
    assert.equal(await evaluate('getComputedStyle(document.getElementById("controlsHandle")).display'),'none');
    assert.equal(await evaluate('getComputedStyle(document.querySelector("#gameFooter .game-hud")).backdropFilter'),'none');
    pass('The discoverable control handle supports keyboard focus, Escape, touch toggling, and a real hover-to-retry click');


    const winSandboxRound = async () => {
      const answers=await plans();await enter();await solve(answers);await fillCards();await submit();
      assert.equal(await evaluate('window.__lastAllCorrect'),true);
    };
    await practiceFive();
    await winSandboxRound();await winSandboxRound();
    assert.equal(await evaluate('streak'),2);
    await enter();await fillCards(true);await submit();
    assert.deepEqual(await evaluate('({live:streak,saved:sandboxResultStreak,text:streakPill.textContent})'),{live:0,saved:2,text:'STREAK 2'});
    await evaluate('updateScore();updateScore()');
    assert.equal(await evaluate('streakPill.textContent'),'STREAK 2');
    assert.equal(await evaluate(`(document.getElementById('gameFooterContent').textContent.match(/streak/gi)||[]).length`),1);
    pass('Sandbox failure displays the two earned wins after resetting the live streak, without duplicate text');

    await evaluate('document.getElementById("practiceRetryButton").click()');
    await waitFor('phase === "show"');
    assert.deepEqual(await evaluate('({live:streak,saved:sandboxResultStreak,text:streakPill.textContent})'),{live:0,saved:null,text:'STREAK 0'});
    pass('Restart clears the result streak and begins a new streak at zero');

    await winSandboxRound();await enter();
    await evaluate('setTimer(0.01,"Recall",()=>checkAnswers())');
    await waitFor('phase === "result"');
    assert.deepEqual(await evaluate('({live:streak,text:streakPill.textContent})'),{live:0,text:'STREAK 1'});
    pass('Recall timeout also preserves the earned Sandbox streak on the fail screen');

    await evaluate('document.getElementById("practiceRetryButton").click()');
    await waitFor('phase === "show"');await winSandboxRound();
    await evaluate('platformerState.required=true;platformerState.completed=false;beginRecallPhase()');
    assert.deepEqual(await evaluate('({phase,live:streak,text:streakPill.textContent})'),{phase:'result',live:0,text:'STREAK 1'});
    await evaluate('resetGame()');
    assert.deepEqual(await evaluate('({live:streak,saved:sandboxResultStreak})'),{live:0,saved:null});
    pass('Platformer failure preserves the result streak; leaving Sandbox clears the saved result');

    await practiceFive();
    await evaluate(`roundItems.forEach((item,index)=>{
      const label=['pink','purple','counterclockwise','a long color label','supercalifragilisticexpialidocious'][index];
      Object.assign(item,{category:'words',label,textLabel:label,answer:label,textColorHex:'#111'});
    });renderCards(true)`);
    const assertSingleLineCards = async selector => {
      const report=await evaluate(`[...document.querySelectorAll('${selector}')].map(label=>{
        const range=document.createRange();range.selectNodeContents(label);
        const card=label.closest('.card')||label.parentElement;
        const style=getComputedStyle(card);
        const available=card.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
        return {text:label.textContent,lines:range.getClientRects().length,width:label.scrollWidth,available,whiteSpace:getComputedStyle(label).whiteSpace};
      })`);
      assert.ok(report.length>0);
      assert.ok(report.every(label=>label.lines===1 && label.width<=label.available+1 && label.whiteSpace==='nowrap'),JSON.stringify(report));
    };
    await assertSingleLineCards('#cardGrid .card-value');
    assert.equal(await evaluate(`[...document.querySelectorAll('#cardGrid > .card')].every(card=>{const style=getComputedStyle(card);return style.width==='120px'&&style.height==='120px'})`),true);
    await evaluate('document.fonts.dispatchEvent(new Event("loadingdone"))');
    await assertSingleLineCards('#cardGrid .card-value');
    await enter();await fillCards(true);await submit();
    await assertSingleLineCards('#cardGrid .card-value');
    await assertSingleLineCards('.input-correct-inline');
    pass('Short and long card labels, multiword labels, and corrections stay on one line without clipping, including after font loading');

    assert.equal(await evaluate('dataSets.aminoAcids.length'),20);
    const aminoValidation=await evaluate(`dataSets.aminoAcids.map((entry,index)=>{
      const item={...entry,category:'aminoAcids'};
      const forms=[entry.oneLetterCode,entry.threeLetterCode,entry.label,...entry.nameAliases];
      return {name:entry.label,valid:forms.every(form=>isCorrectAnswer(item,form)&&isCorrectAnswer(item,'  '+form.toLowerCase()+'  ')),
        rejectsWrong:!isCorrectAnswer(item,dataSets.aminoAcids[(index+1)%20].oneLetterCode)&&!isCorrectAnswer(item,'')};
    })`);
    assert.ok(aminoValidation.every(entry=>entry.valid&&entry.rejectsWrong),JSON.stringify(aminoValidation));
    assert.equal(await evaluate(`isCorrectAnswer({...dataSets.aminoAcids.find(item=>item.label==='Lysine'),category:'aminoAcids'},'L')`),false);
    assert.equal(await evaluate(`isCorrectAnswer({...dataSets.aminoAcids.find(item=>item.label==='Arginine'),category:'aminoAcids'},'A')`),false);
    pass('All 20 amino acids accept standard one-letter codes, three-letter codes, and names while rejecting incorrect initials');

    const aminoImages=await evaluate(`Promise.all(dataSets.aminoAcids.map(entry=>new Promise(resolve=>{
      const img=new Image();const timeout=setTimeout(()=>resolve(false),5000);
      img.onload=()=>{clearTimeout(timeout);resolve(img.naturalWidth>0)};img.onerror=()=>{clearTimeout(timeout);resolve(false)};img.src=entry.image;
    })))`);
    assert.ok(aminoImages.every(Boolean));
    await evaluate(`resetGame();closeStageIntro();document.body.dataset.view='home';modeSelect.value='aminoAcids';updateModeUI();
      aminoCardCountInput.value='5';startRound();successAnimationEnabled=false;`);
    assert.equal(await evaluate('roundItems.every(item=>item.category === "aminoAcids")'),true);
    assert.equal(await evaluate('document.querySelectorAll("#cardGrid .amino-acid-image").length'),5);
    assert.equal(await evaluate('document.querySelectorAll("#cardGrid .card-value").length'),0);
    await waitFor(`[...document.querySelectorAll('#cardGrid img')].every(img=>img.complete&&img.naturalWidth>0)`);
    await evaluate('window.__aminoOriginalItems=roundItems.map(item=>({...item}))');
    for(let offset=0;offset<20;offset+=5){
      await evaluate(`roundItems.forEach((item,index)=>Object.assign(item,dataSets.aminoAcids[${offset}+index]));renderCards(true)`);
      await waitFor(`[...document.querySelectorAll('#cardGrid img')].every(img=>img.complete&&img.naturalWidth>0)`);
      assert.equal(await evaluate(`[...document.querySelectorAll('#cardGrid .amino-acid-image')].every(img=>{
        const image=img.getBoundingClientRect(),card=img.parentElement.getBoundingClientRect();
        return image.left>=card.left && image.top>=card.top && image.right<=card.right && image.bottom<=card.bottom && getComputedStyle(img).objectFit==='contain';
      })`),true);
    }
    await evaluate('roundItems.forEach((item,index)=>Object.assign(item,window.__aminoOriginalItems[index]));delete window.__aminoOriginalItems;renderCards(true)');
    await waitFor(`[...document.querySelectorAll('#cardGrid img')].every(img=>img.complete&&img.naturalWidth>0)`);
    if(process.env.MEMORY_AMINO_SCREENSHOT){
      const screen=await send('Page.captureScreenshot',{format:'png'});
      fs.writeFileSync(process.env.MEMORY_AMINO_SCREENSHOT,Buffer.from(screen.data,'base64'));
    }
    assert.equal(await evaluate(`[...document.querySelectorAll('#cardGrid > .card')].every(card=>{const style=getComputedStyle(card);return style.width==='200px'&&style.height==='200px'})`),true);
    pass('The dedicated Amino Acids mode displays all 20 structure-only PNGs inside larger 200px square cards');
    for(const form of ['oneLetterCode','threeLetterCode','label']){
      await evaluate(`aminoAnswerFormatInputs.forEach(input=>input.checked=input.value==='${form}');startRound({advanceRound:false});`);
      const answers=await plans();await enter();
      assert.equal(await evaluate('document.querySelectorAll("#cardGrid .amino-acid-image").length'),0);
      if(form==='label'){
        await evaluate(`{const field=inputGrid.querySelector('input[data-index="0"]');field.focus();field.value=roundItems[0].label+'e';field.dispatchEvent(new Event('input',{bubbles:true}));}`);
        assert.equal(await evaluate(`inputGrid.querySelector('input[data-index="0"]').value`),await evaluate("roundItems[0].label+'e'"));
        assert.equal(await evaluate('document.getElementById("aminoSuggestion-0").hidden'),false);
        await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
        await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
        assert.equal(await evaluate('document.activeElement.dataset.index'),'1');
        assert.equal(await evaluate(`inputGrid.querySelector('input[data-index="0"]').value`),await evaluate('roundItems[0].label'));
      }
      await solve(answers);
      await evaluate(`document.querySelectorAll('#inputGrid input').forEach(input=>input.value=roundItems[Number(input.dataset.index)]['${form}'])`);
      await submit();assert.equal(await evaluate('window.__lastAllCorrect'),true);
    }
    assert.equal(await evaluate('streak'),3);
    pass('Real amino acid rounds grade one-letter, three-letter, and full-name answers correctly without exposing structures during recall');

    const aminoModifiers=await evaluate(`(()=>{
      const lysine={...dataSets.aminoAcids.find(item=>item.label==='Lysine'),category:'aminoAcids'};
      const asparagine={...dataSets.aminoAcids.find(item=>item.label==='Asparagine'),category:'aminoAcids'};
      const color={...lysine,answer:'Red',recallHint:'Background color'};
      const previous={...lysine,answer:'Asparagine',answerCategory:'aminoAcids',recallHint:'Previous card'};
      const steps=[lysine,asparagine];
      const sequence={...lysine,sequenceSteps:steps,answer:steps.map(buildSequenceInitial).join('')};
      return {color:isCorrectAnswer(color,'r')&&!isCorrectAnswer(color,'K'),
        previous:isCorrectAnswer(previous,'N')&&isCorrectAnswer(previous,'Asn')&&!isCorrectAnswer(previous,'K'),
        sequence:isCorrectAnswer(sequence,'KN')&&isCorrectAnswer(sequence,'LysAsn')&&isCorrectAnswer(sequence,'LysineAsparagine')};
    })()`);
    assert.deepEqual(aminoModifiers,{color:true,previous:true,sequence:true});
    await enter();await fillCards(true);await submit();
    assert.equal(await evaluate('document.querySelectorAll("#cardGrid .amino-acid-image").length'),5);
    assert.equal(await evaluate(`[...document.querySelectorAll('.input-correct-inline')].every((node,index)=>{
      const item=roundItems[index];return node.textContent==='Correct: '+item[item.aminoAnswerFormat];
    })`),true);
    await assertSingleLineCards('.input-correct-inline');
    assert.equal(await evaluate(`(()=>{
      const lysine={...dataSets.aminoAcids.find(item=>item.label==='Lysine'),category:'aminoAcids'};
      return buildExpectedLabel({...lysine,answer:'Asparagine',answerCategory:'aminoAcids',recallHint:'Previous card'}).displayAnswer==='Asparagine / N / Asn'
        && !buildExpectedLabel({...lysine,answer:'Red',recallHint:'Background color'}).displayAnswer;
    })()`),true);
    pass('Amino acid answers respect modifier prompts and review restores structures with the correct full names');

    await config({maze:{enabled:false},shape:{enabled:false},different:{enabled:false}});
    for(const [width,height] of [[1280,900],[1024,768]]){
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
      await delay(100);
      for(let iteration=0;iteration<12;iteration++){
        await evaluate(`resetGame();closeStageIntro();document.body.dataset.view='home';modeSelect.value='aminoAcids';updateModeUI();
          aminoCardCountInput.value='4';startRound();successAnimationEnabled=false;`);
        await delay(30);
        assert.equal(await evaluate(`[...document.querySelectorAll('#cardGrid > .card')].length===4 && [...document.querySelectorAll('#cardGrid > .card')].every(card=>{
          const style=getComputedStyle(card),workspace=document.getElementById('memoryWorkspace');return style.width==='200px'&&style.height==='200px'&&Math.abs(workspace.getBoundingClientRect().width/workspace.offsetWidth-1)<0.001;
        })`),true,JSON.stringify({width,height,iteration}));
        const cardOnlyGeometry=await deskGeometry();
        assert.equal(cardOnlyGeometry.outside||cardOnlyGeometry.overlap||cardOnlyGeometry.overflow,false,JSON.stringify(cardOnlyGeometry));
      }
    }
    const fullSizePositions=await evaluate(`[...document.querySelectorAll('#cardGrid > .card')].map(card=>{const r=card.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})`);
    await enter();
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('#inputGrid > .input-slot')].map(card=>{const r=card.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})`),fullSizePositions);
    await fillCards(true);await submit();
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('#inputGrid > .input-slot')].map(card=>{const r=card.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})`),fullSizePositions);
    pass('Twenty-four card-only layouts keep four tilted amino acid cards at full 200px size with no overlap, including answer and review frames');
    await config(defaults);
    await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
    await delay(100);

    await practiceFive();
    await evaluate(`roundItems.forEach((item,index)=>{if(index%2===0)Object.assign(item,dataSets.aminoAcids[index],{category:'aminoAcids'})});
      roundItems=ScatterLayout.begin(roundItems,MemoryChallenges.getConfig());renderCards(true);`);
    const mixedOrder=await evaluate('roundItems.map(item=>item.label)');
    for(const [width,height] of [[1280,900],[800,600],[390,844],[320,568],[1920,1080]]){
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
      await delay(100);
      const mixedGeometry=await deskGeometry();
      assert.equal(mixedGeometry.outside||mixedGeometry.overlap||mixedGeometry.overflow,false,JSON.stringify({width,height,...mixedGeometry}));
      assert.equal(await evaluate(`[...document.querySelectorAll('#cardGrid > .card')].every((card,index)=>{
        const side=roundItems[index].category==='aminoAcids'?'200px':'120px',style=getComputedStyle(card);
        return style.width===side&&style.height===side;
      })`),true);
      assert.deepEqual(await evaluate('roundItems.map(item=>item.label)'),mixedOrder);
    }
    await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
    await delay(100);
    const mixedPositions=await evaluate(`[...document.querySelectorAll('#cardGrid > .card')].map(card=>['--scatter-x','--scatter-y','--scatter-card-width','--scatter-card-height'].map(prop=>card.style.getPropertyValue(prop)))`);
    await enter();
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('#inputGrid > .input-slot')].map(card=>['--scatter-x','--scatter-y','--scatter-card-width','--scatter-card-height'].map(prop=>card.style.getPropertyValue(prop)))`),mixedPositions);
    await fillCards(true);await submit();
    assert.equal(await evaluate(`[...document.querySelectorAll('#cardGrid .amino-acid-image')].every(img=>getComputedStyle(img).maxHeight==='112px')`),true);
    pass('Mixed card sizes remain collision-free across five viewport sizes, preserve answer positions, and enlarge structures during review');

    const layouts=new Set();
    for(let iteration=0;iteration<12;iteration++){
      await practiceFive(); geometry=await deskGeometry();
      assert.equal(geometry.outside||geometry.overlap||geometry.overflow,false,JSON.stringify({iteration,...geometry}));
      assert.equal(await evaluate(`[...document.querySelectorAll('#cardGrid > .card')].every(card=>{
        const style=getComputedStyle(card);return parseFloat(style.width)===120 && parseFloat(style.height)===120;
      })`),true);
      const cardPositions = (await visualCards()).map(card => card.x).sort((a, b) => a - b);
      const deskScale = await evaluate('document.getElementById("memoryWorkspace").getBoundingClientRect().width / document.getElementById("memoryWorkspace").offsetWidth');
      assert.ok(cardPositions.every((x, index) => index === 0 || x - cardPositions[index - 1] >= 47.9 * deskScale), JSON.stringify(cardPositions));
      layouts.add(JSON.stringify(geometry.boxes));
    }
    assert.equal(layouts.size,12);
    pass('Twelve successive rounds retain fixed 120px square cards in distinct collision-free layouts with 48px horizontal separation');

    visual=await visualCards();
    for(const [width,height] of [[800,600],[390,844],[320,568],[1920,1080]]){
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
      await delay(100);
      geometry=await deskGeometry();
      assert.equal(geometry.outside||geometry.overlap||geometry.overflow,false,JSON.stringify({width,height,...geometry}));
      assert.deepEqual((await visualCards()).map(card=>card.value),visual.map(card=>card.value));
    }
    pass('Window resizing reflows the desk without collisions, clipping, or changing card answer order');
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    await delay(100); await enter();
    await choose('shape',[0]);
    assert.equal(await evaluate('document.querySelectorAll("[data-challenge=shape] .is-selected").length'),1);
    assert.equal(await evaluate('document.querySelector(".memory-cell").disabled'),false);
    pass('Fitted and rotated puzzles remain interactive on narrow screens');

    await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
    await practiceFive();
    if(process.env.MEMORY_SCREENSHOT){
      const screen=await send('Page.captureScreenshot',{format:'png'});
      fs.writeFileSync(process.env.MEMORY_SCREENSHOT,Buffer.from(screen.data,'base64'));
    }
    await evaluate('resetGame()');
    assert.equal(await evaluate('document.body.classList.contains("scattered-round")'),false);
    pass('Leaving a round clears desk sizing and restores menu layout');

    const assertViewport = async (label, selector) => {
      await delay(180);
      const report = await evaluate(`(()=>{
        const nodes=[...document.querySelectorAll(${JSON.stringify(selector)})];
        const outside=nodes.flatMap(node=>{
          const r=node.getBoundingClientRect();
          if(!r.width||!r.height||getComputedStyle(node).visibility==='hidden')return [];
          return r.left < -0.5||r.top < -0.5||r.right > innerWidth+0.5||r.bottom > innerHeight+0.5
            ? [{node:node.id||node.className,x:r.x,y:r.y,width:r.width,height:r.height}]:[];
        });
        window.scrollTo(1000,1000);
        return {outside,x:scrollX,y:scrollY,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,width:innerWidth,height:innerHeight};
      })()`);
      assert.deepEqual(report.outside,[],label+': '+JSON.stringify(report));
      assert.equal(report.x+report.y,0,label+': document scrolls');
      assert.ok(report.scrollWidth<=report.width+1 && report.scrollHeight<=report.height+1,label+': '+JSON.stringify(report));
    };
    const assertCentered = async (label, titleSelector='.title') => {
      await delay(650);
      const center=await evaluate(`(()=>{
        const m=document.querySelector('main').getBoundingClientRect();
        const t=document.querySelector(${JSON.stringify(titleSelector)}).getBoundingClientRect();
        return {mainX:m.x+m.width/2-innerWidth/2,mainY:m.y+m.height/2-innerHeight/2,titleX:t.x+t.width/2-innerWidth/2};
      })()`);
      assert.ok(Object.values(center).every(offset=>Math.abs(offset)<1),label+': '+JSON.stringify(center));
    };
    const gameElements='.memory-cell, #cardGrid>.card, #inputGrid input, #resultsPanel button, .actions button, #timerBar, #resultsPanel .stage-star, #resultsPanel .star-time, #resultsPanel .stage-complete__header, #resultsPanel .leaderboard-row > span, #hudCluster .pill, #streakPill';
    for(const [width,height] of [[1280,900],[1366,768],[800,600],[390,844],[320,568],[844,390]]){
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
      await evaluate(`resetGame();closeSplashLoading();closeStageIntro();document.body.dataset.view='home'`);
      await assertViewport('Home '+width+'x'+height,'#stagesOpen,#practiceStart,.quick-actions button');
      await assertCentered('Home title '+width+'x'+height);
      await evaluate(`document.body.dataset.view='splash';document.getElementById('splashScreen').hidden=false`);
      await assertCentered('Splash title '+width+'x'+height,'.splash-title');
      await assertViewport('Splash '+width+'x'+height,'.splash-title,.splash-message');
      await evaluate(`closeSplashScreen();document.body.dataset.view='home'`);
      await evaluate('document.getElementById("stagesOpen").click()');
      await assertViewport('Levels '+width+'x'+height,'.stage-card,#stagesBack,#stagesPrev,#stagesNext');
      await evaluate('document.getElementById("stagesBack").click()');
      await assertCentered('Return from levels '+width+'x'+height);
      await practiceFive();
      await assertViewport('Memorization '+width+'x'+height,gameElements);
      assert.equal(await evaluate('gameFooterContent.inert'),false);
      assert.equal(await evaluate('getComputedStyle(gameFooterContent).visibility'),'visible');
      assert.equal(await evaluate('getComputedStyle(document.getElementById("controlsHandle")).display'),'none');
      assert.equal(await evaluate('document.getElementById("audioToggle")'),null);
      const timer=await evaluate(`(()=>{const a=document.getElementById('timerBar').getBoundingClientRect(),b=document.getElementById('memoryField').getBoundingClientRect();return {gap:b.top-a.bottom,left:a.left-b.left,width:a.width-b.width}})()`);
      assert.ok(timer.gap>=0 && timer.gap<=9 && Math.abs(timer.left)<1 && Math.abs(timer.width)<1,JSON.stringify(timer));
      await enter();
      await assertViewport('Answer '+width+'x'+height,gameElements);
      assert.equal(await evaluate('getComputedStyle(streakPill).display'),'none');
      assert.equal(await evaluate('gameFooterContent.inert'),false);
      await fillCards(true);await submit();
      await mouse('mouseMoved',{x:width/2,y:height-18});await waitFor("getComputedStyle(gameFooterContent).opacity === '1'");
      await assertViewport('Review '+width+'x'+height,gameElements);
      assert.equal(await evaluate(`[...document.querySelectorAll('.actions button')].every(button=>button.getBoundingClientRect().top>innerHeight*0.65)`),true);
      await evaluate('document.getElementById("practiceBackButton").click()');
      await assertCentered('Return from gameplay '+width+'x'+height);
      if(process.env.MEMORY_VIEWPORT_SCREENSHOTS){
        const screen=await send('Page.captureScreenshot',{format:'png'});
        fs.writeFileSync('/tmp/memory-title-'+width+'.png',Buffer.from(screen.data,'base64'));
      }
      if(width===390){
        await config({maze:{enabled:true,size:8,length:64},shape:{enabled:true,size:8,cells:63},different:{enabled:true,size:8,count:31}});
        await practiceFive();await evaluate("cardCountInput.value='10';startRound()");
        await assertViewport('Largest Sandbox '+width+'x'+height,gameElements);
        await enter();await assertViewport('Largest Sandbox answers '+width+'x'+height,gameElements);
        await config(defaults);
      }
      await start();
      await evaluate('clearInterval(timerId);timerId=null;showStageComplete(12,3,getStageConfig(0));setPhase("Complete","result")');
      await mouse('mouseMoved',{x:width/2,y:height-18});await waitFor("getComputedStyle(gameFooterContent).opacity === '1'");
      await assertViewport('Complete '+width+'x'+height,gameElements);
      await mouse('mouseMoved',{x:width/2,y:30});
      assert.equal(await evaluate('gameFooterContent.inert'),false);
      assert.equal(await evaluate('getComputedStyle(gameFooterContent).visibility'),'visible');
      assert.equal(await evaluate('getComputedStyle(document.getElementById("controlsHandle")).display'),'none');
      assert.equal(await evaluate(`[...document.querySelectorAll('.stage-complete__actions button')].every(button=>button.getBoundingClientRect().top>innerHeight*0.65)`),true);
      await evaluate(`document.getElementById('stageClearLeaderboardList').innerHTML=Array.from({length:8},(_,i)=>'<div class=leaderboard-row><span>'+i+'</span><span>Test Player</span><span>12.00s</span></div>').join('')`);
      await assertViewport('Populated complete '+width+'x'+height,gameElements);
      if(process.env.MEMORY_VIEWPORT_SCREENSHOTS){
        const screen=await send('Page.captureScreenshot',{format:'png'});
        fs.writeFileSync('/tmp/memory-complete-'+width+'.png',Buffer.from(screen.data,'base64'));
      }
    }
    pass('Centering pass 1: home title and menu center horizontally and vertically at all six viewport sizes');
    pass('Centering pass 2: splash title centers and fits at all six viewport sizes');
    pass('Centering pass 3: returning from Levels restores the centered menu');
    pass('Centering pass 4: returning from failed gameplay restores the centered menu');
    pass('All six screen sizes fit home, levels, reveal, answers, review, and completion without scrolling or off-screen controls');
    pass('Timer aligns with the puzzle area, result actions stay at the bottom, and the mute button is absent');
    await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});

    await config({...defaults,wiring:{enabled:true,wires:4,destinations:5,complexity:3}});
    await practiceFive();
    assert.equal(await evaluate('document.querySelectorAll(".memory-challenge").length'),4);
    assert.equal(await evaluate('document.querySelectorAll("[data-wire-side=left]").length'),4);
    assert.equal(await evaluate('document.querySelectorAll("[data-wire-side=right]").length'),5);
    assert.equal(await evaluate('[...document.querySelectorAll(".wire-endpoint")].every(button=>button.disabled)'),true);
    const wiringPlans=await plans(),wireSolution=wiringPlans.find(plan=>plan.key==='wiring').solution;
    assert.equal(new Set(wireSolution).size,4);assert.ok(wireSolution.every(index=>index>=0&&index<5));
    const revealedPaths=await evaluate('[...document.querySelectorAll(".wiring-paths path")].map(path=>path.outerHTML)');
    if(process.env.MEMORY_WIRING_SCREENSHOT){const screen=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(process.env.MEMORY_WIRING_SCREENSHOT,Buffer.from(screen.data,'base64'));}
    const wireGeometry=await deskGeometry();
    assert.equal(wireGeometry.outside||wireGeometry.overlap||wireGeometry.overflow,false,JSON.stringify(wireGeometry));
    await enter();
    assert.equal(await evaluate('document.querySelectorAll(".wiring-paths path").length'),0);
    assert.equal(await evaluate('[...document.querySelectorAll(".wire-endpoint")].every(button=>!button.disabled)'),true);
    assert.equal(await evaluate('[...document.querySelectorAll("[data-wire-side=right]")].every(button=>button.style.getPropertyValue("--wire-color")==="#fff")'),true);
    assert.equal(await evaluate('document.querySelectorAll(".memory-grid .is-target, .memory-maze-route").length'),0);
    await wireDrag(0,wireSolution[0]);
    assert.equal(await evaluate('document.querySelectorAll(".wiring-preview").length'),0);
    assert.equal(await evaluate('document.querySelectorAll(".wire-endpoint--left.is-connected").length'),1);
    const committedPath=await evaluate('document.querySelector(".wiring-paths").innerHTML');
    await wireDrag(0,{x:5,y:5});
    assert.equal(await evaluate('document.querySelector(".wiring-paths").innerHTML'),committedPath);
    await wireDrag(1,wireSolution[0]);
    assert.equal(await evaluate(`document.querySelector('[data-wire-side="left"][data-wire-index="0"]').classList.contains('is-connected')`),false);
    await evaluate('document.querySelector("[data-challenge=wiring] .memory-clear").click()');
    await send('Emulation.setTouchEmulationEnabled',{enabled:true});
    const touchStart=await wirePoint('left',2),touchEnd=await wirePoint('right',wireSolution[2]);
    for(const cancel of [true,false]){
      await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touchStart]});
      await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[touchEnd]});await delay(20);
      assert.equal(await evaluate('document.querySelectorAll(".wiring-preview").length'),1);
      await send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});
      assert.equal(await evaluate('document.querySelectorAll(".wiring-preview").length'),0);
      assert.equal(await evaluate('document.querySelectorAll(".wire-endpoint--left.is-connected").length'),cancel?0:1);
    }
    await send('Emulation.setTouchEmulationEnabled',{enabled:false});
    await evaluate('document.querySelector("[data-challenge=wiring] .memory-clear").click()');
    pass('Mouse and touch drags preview wires, snap to sockets, reassign occupied sockets, and preserve prior answers on invalid or canceled drops');
    await connect(0,wireSolution[0]);await connect(1,wireSolution[0]);
    assert.equal(await evaluate(`document.querySelector('[data-wire-side=left][data-wire-index="0"]').classList.contains('is-connected')`),false);
    assert.equal(await evaluate('document.querySelectorAll(".wiring-paths path").length'),2);
    await evaluate('document.querySelector("[data-challenge=wiring] .memory-clear").click()');
    assert.equal(await evaluate('document.querySelectorAll(".wiring-paths path,.wire-endpoint.is-connected").length'),0);
    await evaluate('document.body.classList.add("pause-active")');
    await connect(0,wireSolution[0]);
    assert.equal(await evaluate('document.querySelectorAll(".wiring-paths path").length'),0);
    await evaluate('document.body.classList.remove("pause-active")');
    await evaluate('MemoryChallenges.setPhase("recall",{interactive:false})');
    assert.equal(await evaluate('[...document.querySelectorAll(".wire-endpoint")].every(button=>button.disabled)'),true);
    await evaluate('MemoryChallenges.setPhase("recall",{interactive:true})');
    await solve(wiringPlans);await fillCards();
    const unusedDestination=[0,1,2,3,4].find(index=>!wireSolution.includes(index));
    await connect(0,unusedDestination);
    const interruptedEnd=await wireDrag(1,{x:640,y:100},false);
    await submit();await mouse('mouseReleased',interruptedEnd);
    assert.equal(await evaluate('document.querySelectorAll(".wiring-preview").length'),0);
    const wiringGrade=await evaluate('window.__lastMemoryChallengeResults.find(result=>result.key==="wiring")');
    assert.equal(await evaluate('window.__lastAllCorrect'),false);
    assert.equal(wiringGrade.correct,false);assert.equal(wiringGrade.correctCount,3);assert.equal(wiringGrade.total,4);
    assert.deepEqual(wiringGrade.connections.map(connection=>connection.expected),wireSolution);
    assert.equal(wiringGrade.connections.filter(connection=>connection.correct).length,3);
    assert.equal(await evaluate('document.querySelector("[data-challenge=wiring] .memory-challenge__status").textContent'),'3 / 4 correct');
    assert.equal(await evaluate('document.querySelectorAll(".wire-endpoint--left.is-correct").length'),3);
    assert.equal(await evaluate('document.querySelectorAll(".wire-endpoint--left.is-incorrect").length'),1);
    assert.equal(await evaluate('[...document.querySelectorAll(".wire-endpoint")].every(button=>button.disabled)'),true);
    assert.deepEqual((await evaluate('MemoryChallenges.evaluate().find(result=>result.key==="wiring")')),wiringGrade);
    const restoredPaths=await evaluate('[...document.querySelectorAll(".wiring-paths path")].slice(0,8).map(path=>path.outerHTML)');
    assert.deepEqual(restoredPaths,revealedPaths);
    pass('Wiring runs beside cards and all three grids, hides solutions on Enter, supports remapping/Clear/pause, and grades each connection independently');

    await practiceFive();
    const allFour=await plans();await enter();await solve(allFour);await fillCards();
    const fullGrade=await evaluate('MemoryChallenges.evaluate()');
    assert.equal(fullGrade.length,4);assert.equal(fullGrade.find(result=>result.key==='wiring').correctCount,4);
    await submit();assert.equal(await evaluate('window.__lastAllCorrect && phase==="show"'),true);
    pass('Solving cards and all four memory challenges advances the original round flow');

    const wireClamps=await config({...defaults,wiring:{enabled:true,wires:999,destinations:1,complexity:99}});
    assert.deepEqual(wireClamps.wiring,{enabled:true,wires:8,destinations:8,complexity:4});
    await config({...defaults,wiring:{enabled:true,wires:8,destinations:10,complexity:4}});
    await practiceFive();
    for(const [width,height] of [[1280,900],[800,600],[390,844],[320,568]]){
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});await delay(100);
      const wireFit=await deskGeometry();assert.equal(wireFit.outside||wireFit.overlap||wireFit.overflow,false,JSON.stringify({width,height,...wireFit}));
      await assertViewport('Eight-wire gameplay '+width+'x'+height,'.wire-endpoint,.memory-cell,#cardGrid>.card');
    }
    const largestWiring=await plans();await enter();await wireDrag(7,largestWiring.find(plan=>plan.key==='wiring').solution[7]);await solve(largestWiring);await fillCards();await submit();
    assert.equal(await evaluate('window.__lastAllCorrect'),true);
    await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});await delay(100);
    await evaluate(`document.querySelector('[data-memory-config="wiring.wires"]').value=3;document.querySelector('[data-memory-config="wiring.wires"]').dispatchEvent(new Event("change",{bubbles:true}))`);
    assert.equal(await evaluate('MemoryChallenges.getConfig().wiring.wires'),3);
    assert.equal(await evaluate('document.querySelectorAll(".wire-endpoint--left").length'),8);
    pass('Wiring difficulty clamps safely, eight wires and ten sockets remain playable on narrow screens, and settings apply next round');

    await config({ ...defaults, maze: { enabled: false, size: 5, length: 9 }, wiring:{enabled:true,wires:3,destinations:6,complexity:2} });
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: initialization.identifier });
    await evaluate('window.__beforeReload = true');
    await send('Page.reload');
    await waitFor('!window.__beforeReload && typeof startRound === "function" && window.MemoryChallenges && !document.body.classList.contains("loading-overlay")');
    assert.deepEqual(await evaluate('MemoryChallenges.getConfig().maze'), { enabled: false, size: 5, length: 9 });
    assert.deepEqual(await evaluate('MemoryChallenges.getConfig().wiring'),{enabled:true,wires:3,destinations:6,complexity:2});
    pass('Challenge options, including wiring difficulty, persist across reloads');
    await evaluate(`closeSplashScreen();closeSplashLoading();document.body.dataset.view='home'`);
    await assertCentered('Reloaded title screen');
    pass('Centering pass 5: reloading restores the centered title screen');
    await evaluate('closeSplashScreen();closeSplashLoading();document.getElementById("stagesOpen").click()');
    assert.equal(await evaluate('document.body.dataset.view'), 'stages');
    assert.equal(await evaluate('stagesConfig.every((_,i)=>isStageUnlocked(i))'), true);
    pass('Levels retains access to every unlocked stage');
    assert.equal(errors.length, 0, JSON.stringify(errors));
    pass('No uncaught browser errors across all integration checks');
    console.log(`\n${checks.length} memory challenge checks passed.`);
  } catch (error) {
    if (process.env.MEMORY_SCREENSHOT) {
      const screen = await send('Page.captureScreenshot', { format: 'png' }).catch(() => null);
      if (screen) fs.writeFileSync(process.env.MEMORY_SCREENSHOT, Buffer.from(screen.data, 'base64'));
    }
    throw error;
  } finally {
    socket.close();
    await fetch(`${chrome}/json/close/${target.id}`);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
