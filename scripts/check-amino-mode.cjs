// Use the local server and isolated Chrome profile described in README.md.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { setTimeout: delay } = require('node:timers/promises');
const chrome = `http://127.0.0.1:${process.env.MEMORY_CHROME_PORT || 9223}`;
const gameUrl = process.env.MEMORY_GAME_URL || 'http://127.0.0.1:8765/';

(async () => {
  const target = await fetch(`${chrome}/json/new?about:blank`, { method: 'PUT' }).then(r => r.json());
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0, checks = 0;
  const pending = new Map(), errors = [];
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  socket.onmessage = event => {
    const data = JSON.parse(event.data);
    if (data.id) {
      const task = pending.get(data.id); pending.delete(data.id);
      if (data.error) task.reject(data.error); else task.resolve(data.result);
    } else if (data.method === 'Runtime.exceptionThrown') errors.push(data.params.exceptionDetails);
    else if (data.method === 'Fetch.requestPaused') send('Fetch.failRequest', { requestId: data.params.requestId, errorReason: 'InternetDisconnected' });
  };
  const evaluate = async expression => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    return response.result.value;
  };
  const waitFor = async expression => {
    for (let attempt = 0; attempt < 250; attempt++) {
      if (await evaluate(expression)) return;
      await delay(40);
    }
    throw Error(`Timed out: ${expression}`);
  };
  const key = async (key, code = key, shift = false) => {
    const params = { key, code, modifiers: shift ? 8 : 0, windowsVirtualKeyCode: key === 'Enter' ? 13 : key === 'Tab' ? 9 : key === 'Escape' ? 27 : key.toUpperCase().charCodeAt(0) };
    await send('Input.dispatchKeyEvent', { type: 'keyDown', ...params });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', ...params });
    await delay(60);
  };
  const click = async selector => {
    const point = await evaluate(`(() => { const node = document.querySelector(${JSON.stringify(selector)}); node.scrollIntoView({block:'center'}); const r=node.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', buttons: 1, clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', buttons: 0, clickCount: 1 });
    await delay(80);
  };
  const pass = name => console.log(`PASS ${++checks}: ${name}`);
  const home = async () => {
    await evaluate(`resetGame();closeSplashScreen();closeSplashLoading();closeStageIntro();document.body.dataset.view='home';`);
    await delay(300);
  };
  const failRound = async () => {
    await evaluate('skipRevealNow(); recallSubmitLockUntil=0;');
    await evaluate(`document.querySelectorAll('#inputGrid input').forEach(input=>input.value='wrong');checkAnswers();`);
    await waitFor(`phase==='result' && document.body.classList.contains('stage-fail')`);
  };

  try {
    await send('Runtime.enable'); await send('Page.enable');
    await send('Fetch.enable', { patterns: [{ urlPattern: '*www.gstatic.com/firebasejs/*' }, { urlPattern: '*fonts.googleapis.com/*' }] });
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    const init = await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.clear();localStorage.setItem('flashRecallContentResetVersion','2026.04.0-stage-reset-2');localStorage.setItem('flashRecallPlayerName','Test Player');localStorage.setItem('flashRecallPlayerNamePrompted','1');localStorage.setItem('flashRecallSplashSeen','1');sessionStorage.setItem('flashRecallSkipInitialLoading','1');` });
    await send('Page.navigate', { url: gameUrl });
    await waitFor(`typeof openAminoAcidsModal==='function' && typeof startRound==='function' && typeof keybinds!=='undefined' && !document.body.classList.contains('loading-overlay')`);
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: init.identifier });
    await home();
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('.mode-card strong')].map(node=>node.textContent)`), ['Levels', 'Sandbox', 'Amino Acids']);
    assert.equal(await evaluate(`document.querySelector('#practiceModal input[value="aminoAcids"]')===null`), true);
    await click('#aminoAcidsStart');
    assert.equal(await evaluate(`aminoAcidsModal.classList.contains('show') && document.activeElement===aminoRevealInput`), true);
    assert.deepEqual(await evaluate(`aminoAnswerFormatInputs.map(input=>input.value)`), ['label','threeLetterCode','oneLetterCode','sideChainType']);
    assert.deepEqual(await evaluate(`getSelectedAminoAnswerFormats()`),['label']);
    await click('#aminoAnswerFormats input[value="oneLetterCode"] + .icon-tile');
    assert.deepEqual(await evaluate(`getSelectedAminoAnswerFormats()`),['label','oneLetterCode']);
    await click('#aminoAnswerFormats input[value="label"] + .icon-tile');
    assert.deepEqual(await evaluate(`getSelectedAminoAnswerFormats()`),['oneLetterCode']);
    await evaluate(`aminoAnswerFormatInputs[0].focus()`); await key(' ','Space');
    assert.deepEqual(await evaluate(`getSelectedAminoAnswerFormats()`),['label','oneLetterCode']);
    await click('#aminoAnswerFormats input[value="oneLetterCode"] + .icon-tile');
    pass('Format tiles toggle independently by click and Space, matching the Sandbox modifier controls');
    await evaluate(`aminoRevealInput.focus()`);
    pass('Home button opens dedicated settings; Amino Acids is separate from the Sandbox picker');

    await key('Tab', 'Tab', true);
    assert.equal(await evaluate(`document.activeElement.id`), 'aminoAcidsConfirm');
    await key('Tab');
    assert.equal(await evaluate(`document.activeElement.id`), 'aminoRevealTime');
    await key('Escape');
    await waitFor(`!aminoAcidsModal.classList.contains('show')`);
    assert.equal(await evaluate(`document.activeElement.id`), 'aminoAcidsStart');
    pass('Keyboard focus stays in the popup; Escape returns focus to the home button');

    await click('#aminoAcidsStart');
    await evaluate(`aminoCardCountInput.value='21';`);
    await key('Enter');
    assert.equal(await evaluate(`phase==='idle' && aminoAcidsModal.classList.contains('show')`), true);
    await evaluate(`aminoCardCountInput.value='3';aminoAnswerFormatInputs.forEach(input=>input.checked=false);`);
    await click('#aminoAcidsConfirm');
    assert.equal(await evaluate(`phase==='idle' && !aminoAnswerFormatError.hidden && document.activeElement===aminoAnswerFormatInputs[0]`),true);
    await click('#aminoAnswerFormats input[value="label"] + .icon-tile');
    assert.equal(await evaluate(`aminoAnswerFormatError.hidden`),true);
    pass('Starting with no formats is blocked with an accessible error; selecting a tile clears it');
    await evaluate(`aminoRevealInput.focus()`);
    await evaluate(`aminoCardCountInput.value='3';aminoRevealInput.value='12';aminoRecallInput.value='15';aminoAnswerFormatInputs.forEach(input=>input.checked=input.value==='threeLetterCode');
      document.querySelector('#practiceModal input[value="numbers"]').checked=true;
      practiceGlitch.checked=true;practiceFog.checked=true;practiceMathOps.checked=true;practicePlatformer.checked=true;practiceSwap.checked=true;
      window.__sandboxBefore=JSON.stringify([...practiceModal.querySelectorAll('input')].map(input=>[input.id,input.value,input.checked]));
      window.__extrasBefore=JSON.stringify(MemoryChallenges.getConfig());successAnimationEnabled=false;`);
    await key('Enter');
    await waitFor(`phase==='show' && gameMode==='aminoAcids'`);
    assert.equal(await evaluate(`roundItems.length===3 && roundItems.every(item=>item.category==='aminoAcids' && !item.specialType && !item.recallHint)`), true);
    assert.equal(await evaluate(`!MemoryChallenges.hasEnabled() && !isPlatformerEnabled() && !isFogEnabled() && !isSwapEnabled() && !getChallengeOptions(round).enableGlitch && getCurrentModifierKeys().length===0`), true);
    assert.deepEqual(await evaluate(`[getRevealSeconds(),getRecallSeconds()]`), [12, 15]);
    assert.equal(await evaluate(`JSON.stringify(MemoryChallenges.getConfig())===window.__extrasBefore && JSON.stringify([...practiceModal.querySelectorAll('input')].map(input=>[input.id,input.value,input.checked]))===window.__sandboxBefore`), true);
    pass('Enter starts amino-only rounds with independent timing, no modifiers or puzzles, and preserved Sandbox settings');

    await key('Enter');
    await waitFor(`phase==='recall'`);
    await evaluate(`recallSubmitLockUntil=0;document.querySelectorAll('#inputGrid input').forEach(input=>input.value=roundItems[Number(input.dataset.index)].threeLetterCode);document.activeElement.blur();`);
    await key('Enter');
    await waitFor(`phase==='show' && round===2`);
    assert.equal(await evaluate(`gameMode==='aminoAcids' && streak===1 && !MemoryChallenges.hasEnabled()`), true);
    await failRound();
    assert.equal(await evaluate(`document.getElementById('practiceSettingsButton').getAttribute('aria-label')`), 'Amino Acids settings');
    await key('s', 'KeyS');
    assert.equal(await evaluate(`aminoAcidsModal.classList.contains('show') && !practiceModal.classList.contains('show')`), true);
    await key('Escape'); await delay(300);
    await key('r', 'KeyR');
    await waitFor(`phase==='show'`);
    assert.equal(await evaluate(`gameMode==='aminoAcids' && roundItems.length===3`), true);
    await failRound(); await key('h', 'KeyH');
    await waitFor(`phase==='idle' && document.body.dataset.view==='home'`);
    pass('Correct answers advance; failure, settings, retry, and Home shortcuts retain the correct mode');

    await evaluate('window.__aminoBeforeReload=true');
    await send('Page.reload');
    await waitFor(`!window.__aminoBeforeReload && typeof openAminoAcidsModal==='function' && typeof resetGame==='function' && !document.body.classList.contains('loading-overlay')`);
    await home(); await click('#aminoAcidsStart');
    assert.deepEqual(await evaluate(`[aminoRevealInput.value,aminoRecallInput.value,aminoCardCountInput.value,getSelectedAminoAnswerFormats()]`), ['12','15','3',['threeLetterCode']]);
    pass('Amino Acids settings persist across reloads');

    for (const [width,height] of [[390,844],[320,568],[844,390]]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width<600 });
      await delay(200);
      const layout = await evaluate(`(() => { const r=aminoAcidsForm.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight,scrollWidth:aminoAcidsForm.scrollWidth,clientWidth:aminoAcidsForm.clientWidth}; })()`);
      assert.ok(layout.left>=-1 && layout.right<=layout.width+1 && layout.top>=-1 && layout.bottom<=layout.height+1 && layout.scrollWidth<=layout.clientWidth+1,JSON.stringify(layout));
    }
    await send('Emulation.setDeviceMetricsOverride', { width:1280,height:900,deviceScaleFactor:1,mobile:false });
    await delay(200);
    if (process.env.MEMORY_SCREENSHOT) {
      const shot=await send('Page.captureScreenshot',{format:'png'});
      fs.writeFileSync(process.env.MEMORY_SCREENSHOT,Buffer.from(shot.data,'base64'));
    }
    pass('Setup fits desktop, narrow mobile, and landscape viewports');

    for (const [format,label] of [['label','Full name'],['threeLetterCode','Three-letter code'],['oneLetterCode','One-letter code'],['sideChainType','Type']]) {
      await evaluate(`aminoCardCountInput.value='1';aminoAnswerFormatInputs.forEach(input=>input.checked=input.value===${JSON.stringify(format)});successAnimationEnabled=false;`);
      await click('#aminoAcidsConfirm');
      await waitFor(`phase==='show'`);
      assert.equal(await evaluate(`getComputedStyle(document.querySelector('.amino-answer-label')).display`),'none');
      await key('Enter');
      assert.equal(await evaluate(`document.querySelector('.amino-answer-label').textContent`),label);
      assert.equal(await evaluate(`getComputedStyle(document.querySelector('.amino-answer-label')).display`),'block');
      assert.equal(await evaluate(`document.querySelector('#inputGrid input').getAttribute('aria-label')`),`Card 1: ${label}`);
      const grading = await evaluate(`dataSets.aminoAcids.every((entry,index)=>{
        const item={...entry,category:'aminoAcids',aminoAnswerFormat:${JSON.stringify(format)}};
        return isCorrectAnswer(item,' '+entry[${JSON.stringify(format)}].toLowerCase()+' ')
          && !isCorrectAnswer(item,${JSON.stringify(format)}==='sideChainType' ? ['Nonpolar','Polar','Acidic','Basic'].find(type=>type!==entry.sideChainType) : dataSets.aminoAcids[(index+1)%20][${JSON.stringify(format)}])
          && ['label','threeLetterCode','oneLetterCode','sideChainType'].filter(key=>key!==${JSON.stringify(format)}).every(key=>!isCorrectAnswer(item,entry[key]));
      })`);
      assert.equal(grading,true,format);
      await evaluate(`{const input=inputGrid.querySelector('input');input.value='lyisne';input.dispatchEvent(new Event('input',{bubbles:true}));}`);
      assert.equal(await evaluate(`document.getElementById('aminoSuggestion-0').hidden`),format!=='label');
      await evaluate(`aminoAnswerFormatInputs.forEach(input=>input.checked=input.value===${JSON.stringify(format==='label'?'oneLetterCode':'label')})`);
      assert.equal(await evaluate(`isCorrectAnswer(roundItems[0],roundItems[0][${JSON.stringify(format)}])`),true);
      await evaluate(`aminoAnswerFormatInputs.forEach(input=>input.checked=input.value===${JSON.stringify(format)});inputGrid.querySelector('input').value=roundItems[0][${JSON.stringify(format)}];recallSubmitLockUntil=0;checkAnswers();`);
      await waitFor(`phase==='show'`);
      await key('Enter');
      await evaluate(`inputGrid.querySelector('input').value=roundItems[0][${JSON.stringify(format==='label'?'oneLetterCode':'label')}];recallSubmitLockUntil=0;checkAnswers();`);
      await waitFor(`phase==='result'`);
      assert.equal(await evaluate(`document.querySelector('.input-correct-inline').textContent==='Correct: '+roundItems[0][${JSON.stringify(format)}]`),true);
      await key('s','KeyS');
      pass(`${label} prompts, strict grading for all 20 amino acids, suggestions, and correction text match the chosen format`);
    }

    const classifications=await evaluate(`(() => {
      const groups={Nonpolar:'GAVLIMFWP',Polar:'STCYNQ',Acidic:'DE',Basic:'KRH'};
      const aliases={Nonpolar:['nonpolar','non-polar','non polar','hydrophobic'],Polar:['polar','polar uncharged','uncharged polar'],Acidic:['acidic','acid','negative','negatively charged'],Basic:['basic','base','positive','positively charged']};
      return dataSets.aminoAcids.length===20 && dataSets.aminoAcids.every(entry=> {
        const expected=Object.keys(groups).find(type=>groups[type].includes(entry.oneLetterCode));
        const item={...entry,category:'aminoAcids',aminoAnswerFormat:'sideChainType'};
        return entry.sideChainType===expected
          && aliases[expected].every(answer=>isCorrectAnswer(item,answer.toUpperCase()))
          && ['Nonpolar','Polar','Acidic','Basic'].filter(type=>type!==expected).every(answer=>!isCorrectAnswer(item,answer))
          && !isCorrectAnswer({...entry,category:'aminoAcids'},expected);
      });
    })()`);
    assert.equal(classifications,true);
    pass('All 20 structures have the expected side-chain type; aliases work and other categories are rejected');

    const allFormats=['label','threeLetterCode','oneLetterCode','sideChainType'];
    const combinations=Array.from({length:15},(_,index)=>allFormats.filter((format,bit)=>(index+1)&(1<<bit))).filter(formats=>formats.length>1);
    for (const formats of combinations) {
      await evaluate(`aminoCardCountInput.value='20';aminoAnswerFormatInputs.forEach(input=>input.checked=${JSON.stringify(formats)}.includes(input.value));`);
      await click('#aminoAcidsConfirm');
      const seen = await evaluate(`(() => {
        const originalRandom=Math.random;let seed=123456;const seen=new Set();
        Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
        try {
          for(let trial=0;trial<6;trial++) {
            startRound({advanceRound:false});
            roundItems.forEach(item=>seen.add(item.aminoAnswerFormat));
          }
          return [...seen].sort();
        } finally { Math.random=originalRandom; }
      })()`);
      assert.deepEqual(seen,formats.slice().sort());
      const before=await evaluate(`roundItems.map(item=>item.aminoAnswerFormat)`);
      await key('Enter');
      assert.deepEqual(await evaluate(`roundItems.map(item=>item.aminoAnswerFormat)`),before);
      assert.equal(await evaluate(`roundItems.every((item,index)=>{
        const input=inputGrid.querySelector('input[data-index="'+index+'"]');
        const other=['label','threeLetterCode','oneLetterCode'].find(format=>format!==item.aminoAnswerFormat);
        return input.parentElement.querySelector('.amino-answer-label').textContent===getAminoAcidAnswerFormatLabel(item)
          && isCorrectAnswer(item,item[item.aminoAnswerFormat]) && !isCorrectAnswer(item,item[other]);
      })`),true);
      await evaluate(`aminoAnswerFormatInputs.forEach(input=>input.checked=false);`);
      assert.deepEqual(await evaluate(`roundItems.map(item=>item.aminoAnswerFormat)`),before);
      await evaluate(`aminoAnswerFormatInputs.forEach(input=>input.checked=${JSON.stringify(formats)}.includes(input.value));recallSubmitLockUntil=0;inputGrid.querySelectorAll('input').forEach(input=>{const item=roundItems[Number(input.dataset.index)];input.value=item[item.aminoAnswerFormat];});checkAnswers();`);
      await waitFor(`phase==='show'`);
      assert.equal(await evaluate(`window.__lastAllCorrect`),true);
      await failRound(); await key('s','KeyS');
    }
    pass('Every combination of formats generates random prompts per card, excludes unselected formats, and grades mixed rounds correctly');

    await evaluate(`aminoAnswerFormatInputs.forEach(input=>input.checked=['label','oneLetterCode'].includes(input.value));`);
    await click('#aminoAcidsConfirm'); await home();
    await evaluate('window.__aminoBeforeReload=true'); await send('Page.reload');
    await waitFor(`!window.__aminoBeforeReload && typeof openAminoAcidsModal==='function' && !document.body.classList.contains('loading-overlay')`);
    await home(); await click('#aminoAcidsStart');
    assert.deepEqual(await evaluate(`getSelectedAminoAnswerFormats()`),['label','oneLetterCode']);
    await evaluate(`successAnimationEnabled=false`);
    pass('Multiple selected formats persist across reloads');

    await evaluate(`aminoCardCountInput.value='20';`); await click('#aminoAcidsConfirm');
    await waitFor(`phase==='show'`);
    assert.equal(await evaluate(`roundItems.length===20 && new Set(roundItems.map(item=>item.label)).size===20`), true);
    await failRound(); await key('s','KeyS');
    await evaluate(`aminoCardCountInput.value='1'`); await key('Enter');
    await waitFor(`phase==='show' && roundItems.length===1`);
    const previous=await evaluate(`roundItems[0].label`);
    await failRound(); await key('r','KeyR');
    assert.notEqual(await evaluate(`roundItems[0].label`),previous);
    pass('All 20 structures are available; single-card retries exclude the preceding amino acid');

    await home();
    await click('#practiceStart');
    await evaluate(`document.querySelector('#practiceModal input[value="numbers"]').checked=true;`);
    await click('#practiceConfirm');
    await waitFor(`phase==='show' && gameMode==='practice'`);
    assert.equal(await evaluate(`roundItems.every(item=>item.category==='numbers') && MemoryChallenges.hasEnabled()`), true);
    await evaluate(`resetGame();closePracticeModal();startStage(0,{skipIntro:true,skipFlashWarningPrompt:true});`);
    await waitFor(`phase==='show' && gameMode==='stages'`);
    assert.equal(await evaluate(`MemoryChallenges.hasEnabled()`),true);
    assert.deepEqual(errors, []);
    pass('Sandbox and Levels retain their card types and enabled extra challenges, with no runtime errors');
    await evaluate(`localStorage.setItem(AMINO_SETTINGS_KEY,JSON.stringify({revealSeconds:12,recallSeconds:15,cards:3,answerFormat:'oneLetterCode'}));window.__aminoBeforeReload=true;`);
    await send('Page.reload');
    await waitFor(`!window.__aminoBeforeReload && typeof openAminoAcidsModal==='function' && !document.body.classList.contains('loading-overlay')`);
    assert.deepEqual(await evaluate(`getSelectedAminoAnswerFormats()`),['oneLetterCode']);
    pass('The previous single-format saved setting migrates to the matching selected tile');
    console.log(`${checks} Amino Acids mode integration checks passed.`);
  } catch (error) {
    const shot=await send('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync('/tmp/flash-recall-amino-failure.png',Buffer.from(shot.data,'base64'));
    console.error('Browser state:', await evaluate(`({view:document.body.dataset.view,state:document.body.dataset.state,focus:document.activeElement.id,modal:aminoAcidsModal.className,errors:document.getElementById('gameLoadError')?.textContent})`));
    console.error('Runtime errors:', errors);
    throw error;
  } finally {
    await send('Page.close').catch(()=>{});
    socket.close();
  }
})().catch(error => { console.error(error); process.exitCode=1; });
