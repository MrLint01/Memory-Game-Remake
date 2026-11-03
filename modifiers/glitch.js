      /*
       * Modifier: Glitching reveal.
       * Flickers cards on/off during reveal.
       */
      let glitchFlashTimer = null;
      let glitchStaticTimer = null;
      function setGlitchActive(active) {
        document.querySelectorAll(".card").forEach((card) => {
          if (active) {
            card.classList.add("active");
          } else {
            card.classList.remove("active");
          }
        });
      }

      function setGlitchStatic(active) {
        document.querySelectorAll(".card").forEach((card) => {
          if (active) {
            card.classList.add("glitch-static");
          } else {
            card.classList.remove("glitch-static");
          }
        });
      }

      function setGlitchDim(active) {
        document.querySelectorAll(".card").forEach((card) => {
          if (active) {
            card.classList.add("glitch-dim");
          } else {
            card.classList.remove("glitch-dim");
          }
        });
      }

      function setGlitchMode(enabled) {
        document.querySelectorAll(".card").forEach((card) => {
          if (enabled) {
            card.classList.add("glitch", "glitch-tv");
          } else {
            card.classList.remove("glitch", "glitch-static", "glitch-dim", "glitch-tv", "active");
          }
        });
      }

      function startGlitching() {
        stopGlitching();
        if (!getChallengeOptions(round).enableGlitch) return;
        setGlitchMode(true);
        const minGap = 20;
        const maxGap = 60;
        const longPauseChance = 0.28;
        const minLongPause = 500;
        const maxLongPause = 1300;
        const blackoutChance = 0.9;
        const staticChance = 0.6;
        const dimChance = 0.4;
        const minFlash = 120;
        const maxFlash = 260;
        const minStatic = 90;
        const maxStatic = 260;
        const scheduleNext = () => {
          const pause = minGap + Math.random() * (maxGap - minGap);
          const longBlackout = Math.random() < longPauseChance;
          const longDuration = longBlackout
            ? minLongPause + Math.random() * (maxLongPause - minLongPause)
            : 0;
          glitchTimer = window.setTimeout(() => {
            if (longBlackout) {
              setGlitchActive(true);
              setGlitchStatic(false);
              setGlitchDim(false);
              glitchFlashTimer = window.setTimeout(() => {
                setGlitchActive(false);
                glitchFlashTimer = null;
                scheduleNext();
              }, longDuration);
              return;
            }
            const roll = Math.random();
            const blackout = roll < blackoutChance;
            const staticOn = !blackout && roll < blackoutChance + staticChance;
            const dimOn = !blackout && !staticOn && roll < blackoutChance + staticChance + dimChance;
            if (!blackout && !staticOn && !dimOn) {
              setGlitchDim(true);
              glitchFlashTimer = window.setTimeout(() => {
                setGlitchDim(false);
                glitchFlashTimer = null;
              }, minFlash);
              scheduleNext();
              return;
            }
            setGlitchActive(blackout);
            setGlitchStatic(staticOn);
            setGlitchDim(dimOn);
            if (blackout || dimOn) {
              const flashDuration = minFlash + Math.random() * (maxFlash - minFlash);
              glitchFlashTimer = window.setTimeout(() => {
                setGlitchActive(false);
                setGlitchDim(false);
                glitchFlashTimer = null;
              }, flashDuration);
            }
            if (staticOn) {
              const staticDuration = minStatic + Math.random() * (maxStatic - minStatic);
              glitchStaticTimer = window.setTimeout(() => {
                setGlitchStatic(false);
                glitchStaticTimer = null;
              }, staticDuration);
            }
            scheduleNext();
          }, pause);
        };
        scheduleNext();
      }

      function stopGlitching() {
        if (glitchTimer) {
          clearTimeout(glitchTimer);
          glitchTimer = null;
        }
        if (glitchFlashTimer) {
          clearTimeout(glitchFlashTimer);
          glitchFlashTimer = null;
        }
        if (glitchStaticTimer) {
          clearTimeout(glitchStaticTimer);
          glitchStaticTimer = null;
        }
        setGlitchMode(false);
      }
