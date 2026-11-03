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
        if (error.code !== -32000 || !/context|not attached to an active page|target navigated or closed/i.test(error.message)) throw error;
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
    const catalog = await evaluate('CountryChallenge.getCountries()');
    assert.equal(catalog.length,193);
    assert.equal(new Set(catalog.map(country=>country.code)).size,193);
    for(const code of ['MO','HK','TW','PS','VA','GL','PR','CK','NU']) assert.equal(catalog.some(country=>country.code===code),false,code);
    assert.equal(catalog.find(country=>country.code==='BO').name,'Bolivia');
    assert.equal(catalog.find(country=>country.code==='VE').name,'Venezuela');
    const deskGeometry = () => evaluate(`(()=>{
      const desk=document.getElementById('memoryWorkspace').getBoundingClientRect();
      const nodes=[...document.querySelectorAll('#cardGrid > .card, .memory-challenge, .country-card')].filter(node=>getComputedStyle(node).display!=='contents');
      const boxes=nodes.map(node=>{const r=node.getBoundingClientRect();return {x:r.x-desk.x,y:r.y-desk.y,width:r.width,height:r.height}});
      const outside=boxes.some(r=>r.x < -1 || r.y < -1 || r.x+r.width > desk.width+1 || r.y+r.height > desk.height+1);
      const overlap=boxes.some((a,i)=>boxes.slice(i+1).some(b=>a.x < b.x+b.width-1 && a.x+a.width > b.x+1 && a.y < b.y+b.height-1 && a.y+a.height > b.y+1));
      return {boxes,outside,overlap,overflow:document.documentElement.scrollWidth>innerWidth+1};
    })()`);
    const practiceFive = () => evaluate(`resetGame();closeStageIntro();document.body.dataset.view='home';stagesScreen.setAttribute('aria-hidden','true');modeSelect.value='practice';updateModeUI();
      document.querySelectorAll('#practiceModal .checkboxes input').forEach(input=>input.checked=input.value==='numbers');
      practiceSwap.checked=false;cardCountInput.value='5';startRound();successAnimationEnabled=false;`);
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
    assert.equal(new Set(catalog.map(country=>country.code)).size,catalog.length);
    assert.ok(catalog.every(country=>/^[A-Z]{2}$/.test(country.code)&&country.name&&country.area>0));
    assert.equal(await evaluate('MemoryChallenges.getConfig().countries.enabled'),true);
    const allConfig={...defaults,wiring:{enabled:true,wires:4,destinations:4,complexity:2},countries:{enabled:true,count:3,difficulty:1}};
    await config(allConfig);
    const knownRound=async()=>{
      await evaluate(`window.__countryGenerate=CountryChallenge.generate;CountryChallenge.generate=config=>({...window.__countryGenerate(config),solution:['JP','CA','BR']})`);
      await practiceFive();
      await evaluate('CountryChallenge.generate=window.__countryGenerate');
    };
    const wheel=async deltaY=>{
      const center=await evaluate(`(()=>{const r=document.querySelector('.country-map-viewport').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
      await send('Input.dispatchMouseEvent',{type:'mouseWheel',...center,deltaX:0,deltaY});await delay(30);
    };
    const resetView=async()=>{for(let step=0;step<12;step++)await wheel(100);};
    const countryPoint=async(code,part=0)=>{
      const result=await evaluate(`(()=>{
        const view=document.querySelector('.country-map-viewport').getBoundingClientRect();
        const shapes=[...document.querySelectorAll('.country-map-svg [data-country="${code}"]')].sort((a,b)=>{const x=a.getBBox(),y=b.getBBox();return y.width*y.height-x.width*x.height}).slice(${part});
        for(const shape of shapes){const box=shape.getBBox(),matrix=shape.getScreenCTM(),svg=shape.ownerSVGElement;
          for(let row=1;row<20;row++)for(let column=1;column<20;column++){
            const local=svg.createSVGPoint();local.x=box.x+box.width*column/20;local.y=box.y+box.height*row/20;
            if(!shape.isPointInFill(local))continue;const screen=local.matrixTransform(matrix);
            if(screen.x<=view.left+1||screen.x>=view.right-1||screen.y<=view.top+1||screen.y>=view.bottom-1)continue;
            const hit=document.elementFromPoint(screen.x,screen.y)?.closest('[data-country]');
            if(hit?.dataset.country==='${code}')return {x:screen.x,y:screen.y};
          }
        }return null;
      })()`);
      assert.ok(result,'No visible hit point for '+code);return result;
    };
    const selectCountry=async(code,part=0)=>{
      const p=await countryPoint(code,part);await mouse('mouseMoved',p);await mouse('mousePressed',p,true);await mouse('mouseReleased',p);return p;
    };
    const selected=()=>evaluate(`Array.from(new Set([...document.querySelectorAll('.is-country-selected')].map(shape=>shape.dataset.country))).sort()`);
    const viewBox=()=>evaluate(`document.querySelector('.country-map-svg').getAttribute('viewBox').split(' ').map(Number)`);
    await knownRound();
    assert.equal(await evaluate('document.querySelectorAll(".memory-challenge").length'),5);
    assert.deepEqual(await evaluate('[...document.querySelectorAll(".country-prompt li")].map(item=>item.textContent)'),['Japan','Canada','Brazil']);
    const countryCards = () => evaluate(`[...document.querySelectorAll('.country-card')].map(card=>({x:card.style.left,y:card.style.top,angle:card.style.rotate,width:card.offsetWidth,height:card.offsetHeight,fits:card.querySelector('.card-value').scrollWidth<=card.clientWidth-24}))`);
    const firstCountryCards=await countryCards();
    assert.equal(firstCountryCards.length,3);
    assert.equal(firstCountryCards.every(card=>card.width===120&&card.height===120&&card.fits&&Math.abs(parseFloat(card.angle))<=4),true);
    assert.equal(new Set(firstCountryCards.map(card=>card.x+','+card.y)).size,3);
    await delay(100);assert.deepEqual(await countryCards(),firstCountryCards);
    assert.equal(await evaluate('document.querySelectorAll(".country-map-svg").length'),0);
    let geometry=await deskGeometry();assert.equal(geometry.outside||geometry.overlap||geometry.overflow,false,JSON.stringify(geometry));
    if(process.env.MEMORY_COUNTRY_SCREENSHOTS){const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('/tmp/memory-country-reveal.png',Buffer.from(shot.data,'base64'));}
    const targets=await plans();
    await enter();await waitFor('phase === "recall"');
    assert.equal(await evaluate('document.querySelectorAll(".country-prompt").length'),0);
    assert.equal(await evaluate('document.querySelectorAll(".country-card").length'),0);
    assert.equal(await evaluate('document.querySelectorAll(".country-map-svg [data-country=MO], .country-map-svg [data-country=HK], .country-map-svg [data-country=TW], .country-map-svg [data-country=PS], .country-map-svg [data-country=VA]").length'),0);
    assert.equal(await evaluate('document.querySelectorAll(".country-map-svg").length'),1);
    assert.deepEqual(await selected(),[]);
    const geometryPreserved=await evaluate(`(async()=>{
      const source=new DOMParser().parseFromString(await (await fetch('country_quiz/BlankMap-World.svg')).text(),'image/svg+xml');
      const original=new Set([...source.querySelectorAll('path')].map(shape=>shape.getAttribute('d')));
      return [...document.querySelectorAll('.country-map-svg path')].every(shape=>original.has(shape.getAttribute('d')));
    })()`);assert.equal(geometryPreserved,true);
    const assertMapOnly = async()=>{
      assert.equal(await evaluate('document.querySelectorAll("[data-challenge=countries] button,[data-challenge=countries] h2,[data-challenge=countries] .memory-challenge__footer,.country-selection-list,.country-map-tools,.country-review-list").length'),0);
      assert.equal(await evaluate('document.querySelector("[data-challenge=countries]").textContent.trim()'),'');
    };
    await assertMapOnly();
    assert.equal(await evaluate('document.querySelectorAll(".is-country-missed,.is-country-extra,.country-result-row").length'),0);
    pass('Countries reveal as separate stable tilted square cards, then disappear for the interactive map without target highlighting');

    await selectCountry('JP');
    assert.deepEqual(await selected(),['JP']);
    assert.equal(await evaluate(`[...document.querySelectorAll('[data-country="JP"]')].every(shape=>shape.classList.contains('is-country-selected'))`),true);
    assert.ok(await evaluate('document.querySelectorAll("[data-country=JP]").length')>2);
    await selectCountry('JP',1);assert.deepEqual(await selected(),[]);
    await selectCountry('JP');
    await selectCountry('JP');assert.deepEqual(await selected(),[]);
    await assertMapOnly();
    pass('Clicking any Japanese island toggles all Japan outlines without duplicates or a selected-country list');

    for(let step=0;step<5;step++)await wheel(-100);
    const beforePan=await viewBox();
    const center=await evaluate(`(()=>{const r=document.querySelector('.country-map-viewport').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await mouse('mouseMoved',center);await mouse('mousePressed',center,true);
    await mouse('mouseMoved',{x:center.x+45,y:center.y+20},true);await mouse('mouseReleased',{x:center.x+45,y:center.y+20});
    assert.notDeepEqual(await viewBox(),beforePan);assert.deepEqual(await selected(),[]);
    await selectCountry('CD');assert.deepEqual(await selected(),['CD']);
    await selectCountry('CD');assert.deepEqual(await selected(),[]);
    await resetView();
    await send('Emulation.setTouchEmulationEnabled',{enabled:true});
    const touchJapan=await countryPoint('JP');
    await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touchJapan]});
    await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await waitFor('document.querySelector("[data-country=JP].is-country-selected")');
    assert.deepEqual(await selected(),['JP']);
    await send('Emulation.setTouchEmulationEnabled',{enabled:false});
    await selectCountry('JP');assert.deepEqual(await selected(),[]);
    const japan=await countryPoint('JP');
    await send('Input.dispatchMouseEvent',{type:'mouseWheel',...japan,deltaX:0,deltaY:-100});
    await waitFor('document.querySelector(".country-map-svg").getAttribute("viewBox").split(" ")[2]<2754');
    await selectCountry('JP');assert.deepEqual(await selected(),['JP']);
    await resetView();await selectCountry('CA');await selectCountry('AR');
    assert.deepEqual(await selected(),['AR','CA','JP']);
    assert.equal(await evaluate('phase'),'recall');
    if(process.env.MEMORY_COUNTRY_SCREENSHOTS){const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('/tmp/memory-country-answer.png',Buffer.from(shot.data,'base64'));}
    pass('Wheel zoom, panning, and touch work without map controls; dragging never selects countries or submits');

    await solve(targets.filter(plan=>plan.key!=='countries'));await fillCards();
    const mapGeometry=()=>evaluate(`(()=>{const map=document.querySelector('.country-map-svg');const r=map.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,view:map.getAttribute('viewBox')}})()`);
    const mapBeforeReview=await mapGeometry();
    await enter();
    await waitFor('phase === "result"');
    assert.deepEqual(await mapGeometry(),mapBeforeReview,'Showing review text must not move, resize, or zoom the map');
    const result=await evaluate('window.__lastMemoryChallengeResults.find(result=>result.key==="countries")');
    assert.equal(result.correct,false);assert.equal(result.correctCount,2);
    assert.deepEqual(result.correctIds.slice().sort(),['CA','JP']);assert.deepEqual(result.missedIds,['BR']);assert.deepEqual(result.incorrectIds,['AR']);
    assert.equal(await evaluate('document.querySelectorAll("[data-country=BR].is-country-missed").length>0'),true);
    assert.equal(await evaluate('document.querySelectorAll("[data-country=AR].is-country-extra").length>0'),true);
    const reviewRows = await evaluate('[...document.querySelectorAll(".country-result-row")].map(row=>row.textContent)');
    assert.equal(reviewRows.length,3);
    assert.ok(reviewRows[0].includes('Japan')&&reviewRows[0].includes('Canada'));
    assert.equal(reviewRows[1],'Missed: Brazil');
    assert.equal(reviewRows[2],'Incorrect: Argentina');
    assert.equal(await evaluate('document.querySelectorAll("[data-challenge=countries] button,.country-map-tools").length'),0);
    await assertViewport('Country review list','.country-board,.country-review-list');
    assert.deepEqual(await evaluate('MemoryChallenges.evaluate().find(result=>result.key==="countries")'),result);
    await selectCountry('JP');assert.deepEqual(await selected(),['AR','CA','JP']);
    const reviewView=await viewBox();
    await wheel(-100);
    await waitFor(`document.querySelector('.country-map-svg').getAttribute('viewBox') !== ${JSON.stringify(reviewView.join(' '))}`);
    assert.ok((await viewBox())[2]<reviewView[2],'Review map must zoom with the wheel');
    if(process.env.MEMORY_COUNTRY_SCREENSHOTS){const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('/tmp/memory-country-review.png',Buffer.from(shot.data,'base64'));}
    pass('Enter grades every country once, lists correct/missed/incorrect names only in review, and locks result selections');

    await knownRound();const successTargets=await plans();await enter();
    await selectCountry('BR');await selectCountry('JP');await selectCountry('CA');
    await solve(successTargets.filter(plan=>plan.key!=='countries'));await fillCards();
    await evaluate('enterToNextEnabled=true;inputGrid.querySelector("input").focus()');
    await enter();await waitFor('phase === "show" && window.__lastAllCorrect === true');
    assert.equal(await evaluate('streak'),1);
    pass('Selecting countries in any order alongside correct cards and puzzles advances the original round using Enter');

    const generated=await evaluate(`(()=>{
      for(let difficulty=1;difficulty<=3;difficulty++)for(let count=1;count<=12;count++)for(let round=0;round<10;round++){
        const record=CountryChallenge.generate({difficulty,count});
        if(record.solution.length!==count||new Set(record.solution).size!==count)return false;
        record.selected=record.solution.slice().reverse();if(!CountryChallenge.grade(record).correct)return false;
        record.selected.pop();if(CountryChallenge.grade(record).correct||CountryChallenge.grade(record).missedIds.length!==1)return false;
      }return true;
    })()`);assert.equal(generated,true);
    const normalized=await config({...allConfig,countries:{enabled:true,count:999,difficulty:0}});
    assert.deepEqual(normalized.countries,{enabled:true,count:12,difficulty:1});
    await config({...allConfig,countries:{enabled:true,count:12,difficulty:3}});
    await evaluate(`window.__countryGenerate=CountryChallenge.generate;CountryChallenge.generate=config=>({...window.__countryGenerate(config),solution:CountryChallenge.getCountries().sort((a,b)=>b.name.length-a.name.length).slice(0,12).map(country=>country.code)})`);
    await practiceFive();await evaluate('CountryChallenge.generate=window.__countryGenerate');
    assert.equal(await evaluate('document.querySelectorAll(".country-prompt li").length'),12);
    for(const [width,height] of [[1280,900],[800,600],[390,844],[320,568]]){
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
      await assertViewport('Country reveal '+width+'x'+height,'.country-prompt li,#cardGrid>.card,.memory-grid');
      geometry=await deskGeometry();assert.equal(geometry.outside||geometry.overlap||geometry.overflow,false,JSON.stringify(geometry));
      assert.equal((await countryCards()).every(card=>card.width===120&&card.height===120&&card.fits),true);
    }
    await enter();
    await assertViewport('Small-screen map','.country-board');
    // Many selections remain visual only, without adding text or controls.
    await evaluate(`document.querySelectorAll('.country-map-svg [data-country][tabindex="0"]').forEach((shape,index)=>{if(index<60)shape.dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true}))})`);
    assert.equal((await selected()).length,60);
    await assertMapOnly();
    await assertViewport('Many selected countries','.country-board');
    pass('360 country configurations generate unique targets; twelve cards and sixty map selections fit small screens without scrolling or extra UI');

    await config({...allConfig,countries:{enabled:true,count:5,difficulty:2}});
    await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:initialization.identifier});
    await evaluate('window.__beforeReload=true');await send('Page.reload');
    await waitFor('!window.__beforeReload && typeof startRound === "function" && window.CountryChallenge && !document.body.classList.contains("loading-overlay")');
    assert.deepEqual(await evaluate('MemoryChallenges.getConfig().countries'),{enabled:true,count:5,difficulty:2});
    assert.equal(errors.length,0,JSON.stringify(errors));
    pass('Country settings persist through reload and no uncaught browser errors occur');
    console.log(`${checks.length} country integration checks passed.`);
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
