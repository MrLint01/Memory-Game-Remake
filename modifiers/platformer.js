      /*
       * Modifier: Platformer recall.
       * Runs a mini platformer during reveal.
       */
      function getPlatformerLayout() {
        return generatePlatforms();
      }

      function resetPlatformer() {
        platformerState.completed = false;
        platformerState.failed = false;
        platformerState.player = { x: 20, y: 0, w: 16, h: 20, vx: 0, vy: 0 };
        platformerState.keys = { left: false, right: false, jump: false };
        const layout = getPlatformerLayout();
        platformerState.platforms = layout.platforms;
        platformerState.pits = layout.pits;
        const groundY = platformerCanvas.height - 20;
        platformerState.player.y = groundY - platformerState.player.h;
        platformerState.start = { x: platformerState.player.x, y: platformerState.player.y };
        platformerState.goal = {
          x: platformerCanvas.width - 28,
          y: groundY - 20,
          w: 12,
          h: 20
        };
      }

      function generatePlatforms() {
        const platforms = [];
        const pits = [];
        const groundY = platformerCanvas.height - 20;
        const pitCount = 1 + Math.floor(Math.random() * 2);
        let attempts = 0;
        while (pits.length < pitCount && attempts < 30) {
          attempts += 1;
          const width = 30 + Math.floor(Math.random() * 30);
          const x = 120 + Math.floor(Math.random() * (platformerCanvas.width - 220));
          const nextPit = { x, y: groundY, w: width, h: 20 };
          const overlaps = pits.some((pit) => {
            const padding = 24;
            return (
              nextPit.x < pit.x + pit.w + padding &&
              nextPit.x + nextPit.w + padding > pit.x
            );
          });
          if (!overlaps) {
            pits.push(nextPit);
          }
        }
        pits.sort((a, b) => a.x - b.x);
        let cursor = 0;
        pits.forEach((pit) => {
          if (pit.x > cursor) {
            platforms.push({ x: cursor, y: groundY, w: pit.x - cursor, h: 20, isGround: true });
          }
          cursor = pit.x + pit.w;
        });
        if (cursor < platformerCanvas.width) {
          platforms.push({
            x: cursor,
            y: groundY,
            w: platformerCanvas.width - cursor,
            h: 20,
            isGround: true
          });
        }
        let x = 80;
        const stepCount = 4 + Math.floor(Math.random() * 2);
        for (let i = 0; i < stepCount; i += 1) {
          const width = 80 + Math.floor(Math.random() * 60);
          const y = groundY - (40 + Math.floor(Math.random() * 80));
          platforms.push({ x, y, w: width, h: 10 });
          x += 120 + Math.floor(Math.random() * 80);
        }
        return { platforms, pits };
      }

      function resetPlayerToStart() {
        const player = platformerState.player;
        player.x = platformerState.start.x;
        player.y = platformerState.start.y;
        player.vx = 0;
        player.vy = 0;
      }

      function updatePlatformer() {
        if (!platformerState.enabled || platformerState.completed) return;
        const player = platformerState.player;
        const speed = 2.6;
        if (platformerState.keys.left) player.vx = -speed;
        else if (platformerState.keys.right) player.vx = speed;
        else player.vx = 0;

        const onGround = isPlayerOnGround();
        if (platformerState.keys.jump && onGround) {
          player.vy = -8.5;
        }
        platformerState.keys.jump = false;

        player.vy += 0.45;
        player.x += player.vx;
        player.y += player.vy;

        if (player.x < 0) player.x = 0;
        if (player.x + player.w > platformerCanvas.width) {
          player.x = platformerCanvas.width - player.w;
        }
        if (player.y + player.h > platformerCanvas.height) {
          resetPlayerToStart();
        }

        platformerState.platforms.forEach((platform) => {
          if (
            player.vy >= 0 &&
            player.x + player.w > platform.x &&
            player.x < platform.x + platform.w &&
            player.y + player.h >= platform.y &&
            player.y + player.h <= platform.y + platform.h + 6
          ) {
            player.y = platform.y - player.h;
            player.vy = 0;
          }
        });

        if (checkGoalHit()) {
          platformerState.completed = true;
        }
      }

      function isPlayerOnGround() {
        const player = platformerState.player;
        return platformerState.platforms.some((platform) => {
          return (
            player.x + player.w > platform.x &&
            player.x < platform.x + platform.w &&
            Math.abs(player.y + player.h - platform.y) <= 1
          );
        });
      }

      function checkGoalHit() {
        const player = platformerState.player;
        const goal = platformerState.goal;
        return (
          player.x < goal.x + goal.w &&
          player.x + player.w > goal.x &&
          player.y < goal.y + goal.h &&
          player.y + player.h > goal.y
        );
      }

      function drawPlatformer() {
        if (!platformerState.enabled) return;
        platformerCtx.clearRect(0, 0, platformerCanvas.width, platformerCanvas.height);
        platformerCtx.fillStyle = "#e5e7eb";
        platformerCtx.fillRect(0, 0, platformerCanvas.width, platformerCanvas.height);

        platformerCtx.fillStyle = "#111827";
        platformerState.platforms.forEach((platform) => {
          if (platform.isGround) {
            platformerCtx.fillRect(platform.x, platform.y, platform.w, platform.h);
          }
        });
        platformerState.platforms.forEach((platform) => {
          if (!platform.isGround) {
            platformerCtx.fillRect(platform.x, platform.y, platform.w, platform.h);
          }
        });
        platformerCtx.fillStyle = "#e5e7eb";
        platformerState.pits.forEach((pit) => {
          platformerCtx.fillRect(pit.x, pit.y, pit.w, pit.h);
        });

        platformerCtx.fillStyle = "#34d399";
        const goal = platformerState.goal;
        platformerCtx.fillRect(goal.x, goal.y, goal.w, goal.h);

        platformerCtx.fillStyle = "#ffffff";
        const player = platformerState.player;
        platformerCtx.fillRect(player.x, player.y, player.w, player.h);
      }

      function updatePlatformerVisibility(active) {
        platformerState.enabled = active;
        if (active) {
          document.body.classList.add("platformer-active");
          resetPlatformer();
        } else {
          document.body.classList.remove("platformer-active");
        }
      }

      function isPlatformerControlActive() {
        if (!platformerState.enabled) return false;
        return phase === "show";
      }

      function isPlatformerLoopActive() {
        if (!platformerState.enabled) return false;
        return phase === "show";
      }

      function platformerLoop() {
        if (isPlatformerLoopActive() && !(pauseModal && pauseModal.classList.contains("show"))) {
          updatePlatformer();
          drawPlatformer();
        }
        requestAnimationFrame(platformerLoop);
      }

      function focusFirstInput() {
        const firstInput = inputGrid.querySelector("input");
        if (firstInput) {
          firstInput.focus();
        }
      }
