      function setTimer(seconds, label, onComplete, totalSeconds = seconds) {
        clearInterval(timerId);
        const endTime = performance.now() + seconds * 1000;
        timerState = { endTime, seconds, totalSeconds, label, onComplete };
        function tick() {
          const remaining = Math.max(0, timerState.endTime - performance.now());
          const display = `${Math.ceil(remaining / 1000)}s`;
          if (timerFill) {
            const progress = totalSeconds ? remaining / (totalSeconds * 1000) : 0;
            timerFill.style.width = `${Math.max(0, Math.min(1, progress)) * 100}%`;
          }
          if (remaining <= 0) {
            clearInterval(timerId);
            timerId = null;
            timerState = null;
            onComplete();
          }
        }
        tick();
        timerId = setInterval(tick, 100);
      }

      function startStageStopwatch() {
        if (!stageTimerHud) return;
        if (stageTimerId) {
          clearInterval(stageTimerId);
        }
        stageTimerId = setInterval(() => {
          const startTime = stageState.startTime || performance.now();
          const elapsedMs = performance.now() - startTime;
          const elapsedSeconds = elapsedMs / 1000;
          stageState.elapsedSeconds = elapsedSeconds;
          stageTimerHud.textContent = `Time ${elapsedSeconds.toFixed(2)}`;
        }, 50);
      }

      function stopStageStopwatch() {
        if (stageTimerId) {
          clearInterval(stageTimerId);
          stageTimerId = null;
        }
      }

      const effectAudioClips = {
        correct: createEffectAudio("audio/correct.wav"),
        wrong: createEffectAudio("audio/funny-fail.wav"),
        button: createEffectAudio("audio/button-click.wav"),
        levelComplete: createEffectAudio("audio/level-completed.wav"),
        achievement: createEffectAudio("audio/acheivement.mp3")
      };
      let effectsAudioUnlocked = false;
      let pendingEffectAudio = null;
      let pendingEffectAudioListenerAttached = false;

      function createEffectAudio(src) {
        if (typeof Audio === "undefined") return null;
        const audio = new Audio(src);
        audio.preload = "auto";
        audio.addEventListener("error", () => {
          window.__lastAudioError = audio.error || new Error(`Failed to load ${audio.src}`);
        });
        return audio;
      }

      function getEffectMixVolume() {
        if (typeof window.getAudioMix === "function") {
          const mix = window.getAudioMix() || {};
          const master = Number.isFinite(mix.master) ? mix.master : 1;
          const effects = Number.isFinite(mix.effects) ? mix.effects : 1;
          return Math.max(0, Math.min(1, master)) * Math.max(0, Math.min(1, effects));
        }
        return 1;
      }

      function unlockEffectAudio() {
        if (effectsAudioUnlocked) return;
        effectsAudioUnlocked = true;
        Object.values(effectAudioClips).forEach((audio) => {
          if (!audio) return;
          try {
            audio.muted = true;
            audio.volume = 0;
            const playResult = audio.play();
            if (playResult && typeof playResult.then === "function") {
              playResult
                .then(() => {
                  audio.pause();
                  audio.currentTime = 0;
                  audio.muted = false;
                })
                .catch(() => {
                  audio.muted = false;
                });
            } else {
              audio.pause();
              audio.currentTime = 0;
              audio.muted = false;
            }
          } catch (error) {
            audio.muted = false;
          }
        });
      }

      function playEffectAudio(audio) {
        if (!audio) return;
        const volume = getEffectMixVolume();
        if (volume <= 0) return;
        try {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
          audio.volume = volume;
          const playResult = audio.play();
          if (playResult && typeof playResult.catch === "function") {
            playResult.catch((error) => {
              window.__lastAudioError = error;
              pendingEffectAudio = audio;
              queuePendingEffectAudio();
            });
          }
        } catch (error) {
          window.__lastAudioError = error;
          pendingEffectAudio = audio;
          queuePendingEffectAudio();
        }
      }

      function playRoundCorrectSound() {
        playEffectAudio(effectAudioClips.correct);
      }
      function playRoundWrongSound() {
        playEffectAudio(effectAudioClips.wrong);
      }
      function playButtonClickSound() {
        playEffectAudio(effectAudioClips.button);
      }
      function playLevelCompletedSound() {
        playEffectAudio(effectAudioClips.levelComplete);
      }
      function playAchievementSound() {
        playEffectAudio(effectAudioClips.achievement);
      }

      const sharePreviewModal = document.getElementById("sharePreviewModal");
      const sharePreviewImage = document.getElementById("sharePreviewImage");
      const sharePreviewStatus = document.getElementById("sharePreviewStatus");
      const sharePreviewCopy = document.getElementById("sharePreviewCopy");
      const sharePreviewDownload = document.getElementById("sharePreviewDownload");
      const sharePreviewClose = document.getElementById("sharePreviewClose");
      let currentStageResultShareData = null;
      let stageResultShareBusy = false;
      let currentStageSharePreviewBlob = null;
      let currentStageSharePreviewUrl = "";
      let currentStageSharePreviewFileName = "";
      let currentStageSharePreviewKey = "";
      function getStageSharePlayerName() {
        if (typeof window.getPlayerName === "function") {
          const direct = String(window.getPlayerName() || "").trim();
          if (direct) return direct;
        }
        if (typeof window.getLeaderboardDisplayName === "function") {
          const fallback = String(window.getLeaderboardDisplayName() || "").trim();
          if (fallback) return fallback;
        }
        return "A player";
      }

      function getStageShareUrl() {
        try {
          const current = new URL(window.location.href);
          const path = `${current.origin}${current.pathname}`.replace(/\/+$/, "");
          return path || current.href;
        } catch (error) {
          return String(window.location.href || "");
        }
      }

      function getStageShareUrlDisplay(url) {
        try {
          const current = new URL(url);
          const compactPath = current.pathname === "/" ? "" : current.pathname.replace(/\/+$/, "");
          return `${current.host}${compactPath}`;
        } catch (error) {
          return String(url || "");
        }
      }

      function formatStageShareTime(seconds) {
        const value = Number(seconds);
        return Number.isFinite(value) ? `${value.toFixed(2)}s` : "--";
      }

      function buildStageSharePreviewKey(payload = currentStageResultShareData) {
        if (!payload) return "";
        return [
          payload.stageId || "",
          payload.stageVersion || "",
          Number(payload.elapsedSeconds || 0).toFixed(3),
          Number(payload.stars || 0),
          getStageSharePlayerName()
        ].join("|");
      }

      function setStageSharePreviewStatus(message = "", isError = false) {
        if (!sharePreviewStatus) return;
        sharePreviewStatus.textContent = message;
        sharePreviewStatus.classList.toggle("is-error", Boolean(isError && message));
      }

      function revokeStageSharePreviewUrl() {
        if (!currentStageSharePreviewUrl) return;
        URL.revokeObjectURL(currentStageSharePreviewUrl);
        currentStageSharePreviewUrl = "";
      }

      function clearStageSharePreview() {
        revokeStageSharePreviewUrl();
        currentStageSharePreviewBlob = null;
        currentStageSharePreviewFileName = "";
        currentStageSharePreviewKey = "";
        if (sharePreviewImage) {
          sharePreviewImage.removeAttribute("src");
        }
        setStageSharePreviewStatus("");
      }

      function isStageSharePreviewOpen() {
        return Boolean(sharePreviewModal && sharePreviewModal.classList.contains("show"));
      }

      function closeStageSharePreviewModal() {
        if (!sharePreviewModal) return;
        sharePreviewModal.classList.remove("show");
        sharePreviewModal.setAttribute("aria-hidden", "true");
        clearStageSharePreview();
        setStageSharePreviewStatus("");
      }

      function openStageSharePreviewModal() {
        if (!sharePreviewModal) return false;
        sharePreviewModal.classList.add("show");
        sharePreviewModal.setAttribute("aria-hidden", "false");
        return true;
      }

      function canCopyStageSharePreviewImage() {
        return Boolean(
          currentStageSharePreviewBlob &&
          typeof ClipboardItem !== "undefined" &&
          typeof navigator !== "undefined" &&
          navigator.clipboard &&
          typeof navigator.clipboard.write === "function"
        );
      }

      function syncStageSharePreviewActions() {
        if (sharePreviewCopy) {
          sharePreviewCopy.disabled = !canCopyStageSharePreviewImage();
        }
        if (sharePreviewDownload) {
          sharePreviewDownload.disabled = !currentStageSharePreviewBlob;
        }
      }

      function setStageSharePreviewBlob(blob, fileName, previewKey) {
        if (!blob) return;
        revokeStageSharePreviewUrl();
        currentStageSharePreviewBlob = blob;
        currentStageSharePreviewFileName = fileName || "flash-recall-level.png";
        currentStageSharePreviewKey = previewKey || "";
        currentStageSharePreviewUrl = URL.createObjectURL(blob);
        if (sharePreviewImage) {
          sharePreviewImage.src = currentStageSharePreviewUrl;
        }
        syncStageSharePreviewActions();
      }

      function unlockStageShareAchievement() {
        if (typeof window.syncAchievementsFromLocal !== "function") return;
        window.syncAchievementsFromLocal({
          sharedLeaderboard: true
        }).catch((error) => {
          console.warn("Failed to unlock share achievement", error);
        });
      }

      async function copyStageSharePreviewToClipboard() {
        if (!currentStageSharePreviewBlob) {
          setStageSharePreviewStatus("Create a preview first.", true);
          return false;
        }
        if (!canCopyStageSharePreviewImage()) {
          setStageSharePreviewStatus("Image copy is not supported in this browser.", true);
          return false;
        }
        try {
          const item = new ClipboardItem({
            [currentStageSharePreviewBlob.type || "image/png"]: currentStageSharePreviewBlob
          });
          await navigator.clipboard.write([item]);
          setStageSharePreviewStatus("Share image copied.");
          unlockStageShareAchievement();
          return true;
        } catch (error) {
          console.warn("Failed to copy share image", error);
          setStageSharePreviewStatus("Couldn't copy the share image.", true);
          return false;
        }
      }

      function downloadStageSharePreview() {
        if (!currentStageSharePreviewBlob) {
          setStageSharePreviewStatus("Create a preview first.", true);
          return false;
        }
        downloadStageResultShareBlob(
          currentStageSharePreviewBlob,
          currentStageSharePreviewFileName || "flash-recall-level.png"
        );
        setStageSharePreviewStatus("Share image downloaded.");
        unlockStageShareAchievement();
        return true;
      }

      function truncateStageShareText(value, maxLength = 28) {
        const text = String(value || "").trim();
        if (text.length <= maxLength) return text;
        return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
      }

      function wrapStageShareText(ctx, text, maxWidth, maxLines = Infinity) {
        const tokens = String(text || "").split(/\s+/).filter(Boolean);
        if (!tokens.length) return [""];
        const lines = [];
        let current = "";
        tokens.forEach((token) => {
          const candidate = current ? `${current} ${token}` : token;
          if (current && ctx.measureText(candidate).width > maxWidth) {
            lines.push(current);
            current = token;
            return;
          }
          current = candidate;
        });
        if (current) {
          lines.push(current);
        }
        if (lines.length <= maxLines) {
          return lines;
        }
        const clipped = lines.slice(0, maxLines);
        const lastIndex = maxLines - 1;
        while (clipped[lastIndex] && ctx.measureText(`${clipped[lastIndex]}…`).width > maxWidth) {
          clipped[lastIndex] = clipped[lastIndex].slice(0, -1).trim();
        }
        clipped[lastIndex] = `${clipped[lastIndex]}…`;
        return clipped;
      }

      function drawWrappedStageShareText(ctx, text, x, y, maxWidth, lineHeight, maxLines = Infinity) {
        const lines = wrapStageShareText(ctx, text, maxWidth, maxLines);
        lines.forEach((line, index) => {
          ctx.fillText(line, x, y + index * lineHeight);
        });
        return lines.length;
      }

      function roundedStageShareRectPath(ctx, x, y, width, height, radius) {
        const nextRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
        ctx.beginPath();
        ctx.moveTo(x + nextRadius, y);
        ctx.lineTo(x + width - nextRadius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + nextRadius);
        ctx.lineTo(x + width, y + height - nextRadius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - nextRadius, y + height);
        ctx.lineTo(x + nextRadius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - nextRadius);
        ctx.lineTo(x, y + nextRadius);
        ctx.quadraticCurveTo(x, y, x + nextRadius, y);
        ctx.closePath();
      }

      function fillStageShareRoundRect(ctx, x, y, width, height, radius, fillStyle) {
        ctx.save();
        roundedStageShareRectPath(ctx, x, y, width, height, radius);
        ctx.fillStyle = fillStyle;
        ctx.fill();
        ctx.restore();
      }

      function strokeStageShareRoundRect(ctx, x, y, width, height, radius, strokeStyle, lineWidth = 1) {
        ctx.save();
        roundedStageShareRectPath(ctx, x, y, width, height, radius);
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
        ctx.restore();
      }

      function drawStageSharePill(ctx, x, y, text, options = {}) {
        const paddingX = Number.isFinite(options.paddingX) ? options.paddingX : 18;
        const paddingY = Number.isFinite(options.paddingY) ? options.paddingY : 10;
        const radius = Number.isFinite(options.radius) ? options.radius : 999;
        ctx.save();
        ctx.font = options.font || '700 24px "Space Grotesk", "Trebuchet MS", sans-serif';
        const width = ctx.measureText(text).width + paddingX * 2;
        const height = (Number.isFinite(options.height) ? options.height : 42);
        fillStageShareRoundRect(
          ctx,
          x,
          y,
          width,
          height,
          radius,
          options.fill || "rgba(255, 255, 255, 0.18)"
        );
        if (options.stroke) {
          strokeStageShareRoundRect(ctx, x, y, width, height, radius, options.stroke, options.lineWidth || 1.5);
        }
        ctx.fillStyle = options.color || "#ffffff";
        ctx.textBaseline = "middle";
        ctx.fillText(text, x + paddingX, y + height / 2 + 1);
        ctx.restore();
        return { width, height };
      }

      function drawStageShareStars(ctx, x, y, stars, size = 34) {
        {
          const earnedStars = Math.max(0, Math.floor(Number(stars) || 0));
          ctx.save();
          ctx.font = `700 ${size}px "Trebuchet MS", sans-serif`;
          ctx.textBaseline = "middle";
          for (let index = 0; index < earnedStars; index += 1) {
            const isSecret = index === 3;
            ctx.fillStyle = isSecret ? "#93C5FD" : "#FDB022";
            ctx.shadowColor = isSecret ? "rgba(147, 197, 253, 0.75)" : "rgba(49, 22, 1, 0.45)";
            ctx.shadowBlur = isSecret ? 12 : 6;
            ctx.fillText("\u2726", x + index * (size + 12), y);
          }
          ctx.restore();
          return;
        }
        ctx.save();
        ctx.font = `700 ${size}px "Trebuchet MS", sans-serif`;
        ctx.textBaseline = "middle";
        for (let index = 0; index < total; index += 1) {
          const filled = index < stars;
          ctx.fillStyle = filled ? "#f5b942" : "rgba(255, 255, 255, 0.28)";
          ctx.fillText("★", x + index * (size + 10), y);
        }
        ctx.restore();
      }

      function createStageShareRandom(seed = 1) {
        let value = Math.floor(Number(seed) || 1) % 2147483647;
        if (value <= 0) value += 2147483646;
        return () => {
          value = value * 16807 % 2147483647;
          return (value - 1) / 2147483646;
        };
      }

      function collectRenderedStageShareLeaderboardRows() {
        const listEl = document.getElementById("stageClearLeaderboardList");
        if (!listEl) return [];
        return Array.from(listEl.querySelectorAll(".leaderboard-row"))
          .filter((row) => !row.classList.contains("leaderboard-row--empty"))
          .map((row) => {
            const spans = row.querySelectorAll("span");
            if (spans.length < 3) return null;
            const rank = String(spans[0].textContent || "").trim();
            const name = String(spans[1].textContent || "").trim();
            const time = String(spans[2].textContent || "").trim();
            if (!rank || rank === "#" || !name || name === "Player") return null;
            return {
              rank,
              name,
              time,
              isPlayer: row.classList.contains("leaderboard-row--me")
                || row.classList.contains("leaderboard-row--me-top")
            };
          })
          .filter(Boolean);
      }

      function buildStageShareLeaderboardRowsFromResult(result, payload) {
        const localPlayerId = typeof window.getLeaderboardPlayerId === "function"
          ? window.getLeaderboardPlayerId()
          : "";
        const localName = getStageSharePlayerName();
        const currentTimeMs = Math.round(Number(payload.elapsedSeconds || 0) * 1000);
        const currentRunRank = result && Number.isFinite(Number(result.currentRunRank))
          ? Math.max(1, Number(result.currentRunRank))
          : null;
        const rows = [];
        const top = result && Array.isArray(result.top) ? result.top : [];
        const insertCurrentRunInTop = Boolean(currentRunRank && currentRunRank <= 5);
        const otherEntries = top
          .filter((entry) => !(entry && entry.player_id && entry.player_id === localPlayerId))
          .slice(0, insertCurrentRunInTop ? 4 : 5);

        otherEntries.forEach((entry, index) => {
          const bestTimeMs = Number(entry && entry.best_time_ms);
          const displayRank = insertCurrentRunInTop && index + 1 >= currentRunRank
            ? index + 2
            : index + 1;
          const resolvedName = String(entry && entry.player_name ? entry.player_name : `Player ${displayRank}`);
          rows.push({
            rank: String(displayRank),
            name: truncateStageShareText(resolvedName, 20),
            time: Number.isFinite(bestTimeMs) ? `${(bestTimeMs / 1000).toFixed(2)}s` : "--",
            isPlayer: false
          });
        });

        const playerRow = {
          rank: currentRunRank ? String(currentRunRank) : "YOU",
          name: truncateStageShareText(localName, 20),
          time: Number.isFinite(currentTimeMs) ? `${(currentTimeMs / 1000).toFixed(2)}s` : "--",
          isPlayer: true
        };

        if (insertCurrentRunInTop) {
          rows.splice(currentRunRank - 1, 0, playerRow);
        } else {
          rows.push(playerRow);
        }

        return rows.slice(0, 6);
      }

      async function getStageShareLeaderboardRows(payload) {
        if (typeof window.fetchStageLeaderboard === "function") {
          try {
            const result = await window.fetchStageLeaderboard(
              payload.stageId,
              payload.stageVersion,
              6,
              Math.round(Number(payload.elapsedSeconds || 0) * 1000)
            );
            const fetchedRows = buildStageShareLeaderboardRowsFromResult(result, payload);
            if (fetchedRows.length) {
              return fetchedRows;
            }
          } catch (error) {
            console.warn("Failed to fetch leaderboard for share image", error);
          }
        }
        const renderedRows = collectRenderedStageShareLeaderboardRows()
          .filter((row) => !row.isPlayer)
          .slice(0, 5);
        if (renderedRows.length) {
          return renderedRows.concat([{
            rank: "YOU",
            name: truncateStageShareText(getStageSharePlayerName(), 20),
            time: formatStageShareTime(payload.elapsedSeconds),
            isPlayer: true
          }]).slice(0, 6);
        }
        return [{
          rank: "YOU",
          name: truncateStageShareText(getStageSharePlayerName(), 20),
          time: formatStageShareTime(payload.elapsedSeconds),
          isPlayer: true
        }];
      }

      function drawStageShareSnapshotCards(ctx, x, y, width, height, payload) {
        const seed = (Number(payload.stageIndex) + 1) * 997 + Math.round(Number(payload.elapsedSeconds || 0) * 100);
        const random = createStageShareRandom(seed);
        const labels = [
          `L${Number(payload.stageIndex) + 1}`,
          truncateStageShareText(payload.stageType || "flash", 8).toUpperCase(),
          `${payload.stars}★`,
          "GO!",
          truncateStageShareText(payload.stageName || "Stage", 7).toUpperCase(),
          truncateStageShareText(getStageSharePlayerName(), 7).toUpperCase()
        ];
        const palette = [
          "#f97316",
          "#22c55e",
          "#38bdf8",
          "#f43f5e",
          "#facc15",
          "#c084fc",
          "#fb7185",
          "#2dd4bf"
        ];
        const columns = 2;
        const rows = 3;
        const gap = 16;
        const cardWidth = (width - gap * (columns - 1)) / columns;
        const cardHeight = (height - gap * (rows - 1)) / rows;
        let labelIndex = 0;
        for (let row = 0; row < rows; row += 1) {
          for (let column = 0; column < columns; column += 1) {
            const cardX = x + column * (cardWidth + gap);
            const cardY = y + row * (cardHeight + gap);
            const hueColor = palette[Math.floor(random() * palette.length) % palette.length];
            fillStageShareRoundRect(ctx, cardX, cardY, cardWidth, cardHeight, 18, hueColor);
            strokeStageShareRoundRect(ctx, cardX, cardY, cardWidth, cardHeight, 18, "rgba(255, 255, 255, 0.28)", 3);
            ctx.save();
            ctx.fillStyle = "rgba(15, 23, 42, 0.16)";
            for (let stripe = 0; stripe < 5; stripe += 1) {
              const stripeY = cardY + 10 + stripe * 18;
              ctx.fillRect(cardX + 10, stripeY, cardWidth - 20, 8);
            }
            ctx.fillStyle = "#ffffff";
            ctx.font = '700 32px "Anton", "Trebuchet MS", sans-serif';
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(labels[labelIndex], cardX + cardWidth / 2, cardY + cardHeight / 2 + 6);
            ctx.restore();
            labelIndex += 1;
          }
        }
      }

      async function buildStageResultShareCanvas(payload) {
        {
          const playerName = getStageSharePlayerName();
          const leaderboardRows = await getStageShareLeaderboardRows(payload);

          const canvas = document.createElement("canvas");
          canvas.width = 1200;
          canvas.height = 1328;
          const ctx = canvas.getContext("2d");
          const stageNumber = Number(payload.stageIndex) + 1;
          const levelLabel = `LEVEL ${stageNumber}`;
          const caption = `Check out the time ${playerName} got in Flash Recall!`;
          const footerCta = "Come play the game yourself to beat their time!";
          const photoX = 140;
          const photoY = 270;
          const photoWidth = 920;
          const photoHeight = 790;
          const cardFrameX = 86;
          const cardFrameY = 72;
          const cardFrameWidth = 1028;
          const cardFrameHeight = 1200;

          const backdropRadius = 42;
          fillStageShareRoundRect(ctx, 0, 0, canvas.width, canvas.height, backdropRadius, "#eadfc8");
          ctx.save();
          roundedStageShareRectPath(ctx, 0, 0, canvas.width, canvas.height, backdropRadius);
          ctx.clip();
          for (let index = 0; index < 18; index += 1) {
            ctx.fillStyle = `rgba(255, 255, 255, ${index % 2 === 0 ? 0.08 : 0.04})`;
            ctx.fillRect(index * 80, 0, 2, canvas.height);
          }
          ctx.restore();

          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(-0.018);
          ctx.translate(-canvas.width / 2, -canvas.height / 2);

          ctx.save();
          ctx.shadowColor = "rgba(60, 37, 14, 0.24)";
          ctx.shadowBlur = 52;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 26;
          fillStageShareRoundRect(ctx, cardFrameX, cardFrameY, cardFrameWidth, cardFrameHeight, 22, "#fffdf7");
          ctx.restore();

          fillStageShareRoundRect(ctx, cardFrameX, cardFrameY, cardFrameWidth, cardFrameHeight, 22, "#fffdf8");
          strokeStageShareRoundRect(ctx, cardFrameX, cardFrameY, cardFrameWidth, cardFrameHeight, 22, "rgba(15, 23, 42, 0.08)", 2);

          ctx.fillStyle = "#12243d";
          ctx.font = '700 46px "Space Grotesk", "Trebuchet MS", sans-serif';
          ctx.textBaseline = "top";
          drawWrappedStageShareText(ctx, caption, 130, 128, 930, 54, 2);

          const photoGradient = ctx.createLinearGradient(photoX, photoY, photoX + photoWidth, photoY + photoHeight);
          photoGradient.addColorStop(0, "#17314b");
          photoGradient.addColorStop(0.52, "#1f6c72");
          photoGradient.addColorStop(1, "#f97316");
          fillStageShareRoundRect(ctx, photoX, photoY, photoWidth, photoHeight, 14, photoGradient);
          strokeStageShareRoundRect(ctx, photoX, photoY, photoWidth, photoHeight, 14, "rgba(255, 255, 255, 0.35)", 2);

          const glow = ctx.createRadialGradient(photoX + 220, photoY + 170, 40, photoX + 220, photoY + 170, 340);
          glow.addColorStop(0, "rgba(255,255,255,0.28)");
          glow.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = glow;
          ctx.fillRect(photoX, photoY, photoWidth, photoHeight);

          const confettiRandom = createStageShareRandom(stageNumber * 41 + Math.round(Number(payload.elapsedSeconds || 0) * 100));
          for (let index = 0; index < 42; index += 1) {
            const dotX = photoX + confettiRandom() * photoWidth;
            const dotY = photoY + confettiRandom() * photoHeight;
            const dotSize = 3 + confettiRandom() * 7;
            const hue = 190 + Math.floor(confettiRandom() * 170);
            ctx.fillStyle = `hsla(${hue}, 90%, 78%, 0.38)`;
            ctx.beginPath();
            ctx.arc(dotX, dotY, dotSize / 2, 0, Math.PI * 2);
            ctx.fill();
          }

          const levelPill = drawStageSharePill(ctx, 176, 304, levelLabel, {
            fill: "rgba(15, 23, 42, 0.68)",
            stroke: "rgba(255, 255, 255, 0.18)",
            color: "#ffffff",
            font: '700 20px "Space Grotesk", "Trebuchet MS", sans-serif',
            paddingX: 16,
            height: 34
          });
          drawStageShareStars(ctx, 176 + levelPill.width + 54, 322, Number(payload.stars) || 0, 34);

          fillStageShareRoundRect(ctx, 176, 362, 848, 660, 28, "rgba(255, 251, 245, 0.94)");
          strokeStageShareRoundRect(ctx, 176, 362, 848, 660, 28, "rgba(15, 23, 42, 0.12)", 2);
          ctx.fillStyle = "#10233c";
          ctx.font = '700 34px "Space Grotesk", "Trebuchet MS", sans-serif';
          ctx.fillText("Leaderboard", 216, 410);
          const rowX = 208;
          const rowWidth = 784;
          const rankColumnWidth = 96;
          const timeColumnWidth = 180;
          const nameColumnWidth = rowWidth - rankColumnWidth - timeColumnWidth;
          const rankCenterX = rowX + rankColumnWidth / 2;
          const nameCenterX = rowX + rankColumnWidth + nameColumnWidth / 2;
          const timeCenterX = rowX + rankColumnWidth + nameColumnWidth + timeColumnWidth / 2;

          ctx.fillStyle = "rgba(16, 35, 60, 0.68)";
          ctx.font = '700 16px "Space Grotesk", "Trebuchet MS", sans-serif';
          ctx.textBaseline = "middle";
          ctx.textAlign = "center";
          ctx.fillText("#", rankCenterX, 478);
          ctx.fillText("PLAYER", nameCenterX, 478);
          ctx.fillText("TIME", timeCenterX, 478);

          const renderedRows = leaderboardRows.length ? leaderboardRows : [{
            rank: "YOU",
            name: truncateStageShareText(playerName, 20),
            time: formatStageShareTime(payload.elapsedSeconds),
            isPlayer: true
          }];
          renderedRows.slice(0, 6).forEach((row, index) => {
            const rowY = 510 + index * 76;
            const rowCenterY = rowY + 29;
            const isPlayer = Boolean(row.isPlayer);
            fillStageShareRoundRect(
              ctx,
              rowX,
              rowY,
              rowWidth,
              58,
              18,
              isPlayer ? "#10233c" : index % 2 === 0 ? "rgba(16, 35, 60, 0.04)" : "rgba(16, 35, 60, 0.09)"
            );
            ctx.fillStyle = isPlayer ? "#f9fafb" : "#10233c";
            ctx.font = '700 21px "Space Grotesk", "Trebuchet MS", sans-serif';
            ctx.textAlign = "center";
            ctx.fillText(String(row.rank || "-"), rankCenterX, rowCenterY);
            ctx.font = '700 20px "Space Grotesk", "Trebuchet MS", sans-serif';
            ctx.fillText(truncateStageShareText(row.name || "Player", 24), nameCenterX, rowCenterY);
            ctx.fillText(String(row.time || "--"), timeCenterX, rowCenterY);
          });
          ctx.textAlign = "left";
          ctx.textBaseline = "top";

          ctx.fillStyle = "#10233c";
          ctx.font = '700 34px "Space Grotesk", "Trebuchet MS", sans-serif';
          drawWrappedStageShareText(ctx, footerCta, 168, 1128, 620, 42, 2);

          ctx.restore();
          return canvas;
        }
        const playerName = getStageSharePlayerName();
        const shareUrl = getStageShareUrl();
        const urlDisplay = getStageShareUrlDisplay(shareUrl);
        const leaderboardRows = await getStageShareLeaderboardRows(payload);
        const canvas = document.createElement("canvas");
        canvas.width = 1200;
        canvas.height = 1500;
        const ctx = canvas.getContext("2d");
        const stageNumber = Number(payload.stageIndex) + 1;
        const stageTitle = `Level ${stageNumber}${payload.stageName ? `: ${payload.stageName}` : ""}`;
        const caption = `Check out the time ${playerName} got on ${stageTitle} in Flash Recall.`;
        const footerCta = `Come play the game yourself to beat their time.`;
        const photoX = 140;
        const photoY = 270;
        const photoWidth = 920;
        const photoHeight = 790;
        const cardFrameX = 86;
        const cardFrameY = 72;
        const cardFrameWidth = 1028;
        const cardFrameHeight = 1356;
        const titleChipText = truncateStageShareText(stageTitle, 28).toUpperCase();

        ctx.fillStyle = "#eadfc8";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (let index = 0; index < 18; index += 1) {
          ctx.fillStyle = `rgba(255, 255, 255, ${index % 2 === 0 ? 0.08 : 0.04})`;
          ctx.fillRect(index * 80, 0, 2, canvas.height);
        }

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(-0.018);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);

        ctx.save();
        ctx.shadowColor = "rgba(60, 37, 14, 0.24)";
        ctx.shadowBlur = 52;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 26;
        fillStageShareRoundRect(ctx, cardFrameX, cardFrameY, cardFrameWidth, cardFrameHeight, 22, "#fffdf7");
        ctx.restore();

        fillStageShareRoundRect(ctx, cardFrameX, cardFrameY, cardFrameWidth, cardFrameHeight, 22, "#fffdf8");
        strokeStageShareRoundRect(ctx, cardFrameX, cardFrameY, cardFrameWidth, cardFrameHeight, 22, "rgba(15, 23, 42, 0.08)", 2);

        ctx.fillStyle = "#12243d";
        ctx.font = '700 46px "Space Grotesk", "Trebuchet MS", sans-serif';
        ctx.textBaseline = "top";
        drawWrappedStageShareText(ctx, caption, 130, 128, 860, 54, 3);

        ctx.font = '700 18px "Space Grotesk", "Trebuchet MS", sans-serif';
        drawStageSharePill(ctx, 926, 118, "FLASH RECALL", {
          fill: "#12243d",
          color: "#fffdf8",
          font: '700 18px "Space Grotesk", "Trebuchet MS", sans-serif',
          paddingX: 18,
          height: 36
        });

        const photoGradient = ctx.createLinearGradient(photoX, photoY, photoX + photoWidth, photoY + photoHeight);
        photoGradient.addColorStop(0, "#17314b");
        photoGradient.addColorStop(0.45, "#1f6c72");
        photoGradient.addColorStop(1, "#f97316");
        fillStageShareRoundRect(ctx, photoX, photoY, photoWidth, photoHeight, 14, photoGradient);
        strokeStageShareRoundRect(ctx, photoX, photoY, photoWidth, photoHeight, 14, "rgba(255, 255, 255, 0.35)", 2);

        const glow = ctx.createRadialGradient(photoX + 200, photoY + 150, 40, photoX + 200, photoY + 150, 340);
        glow.addColorStop(0, "rgba(255,255,255,0.28)");
        glow.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(photoX, photoY, photoWidth, photoHeight);

        const confettiRandom = createStageShareRandom(stageNumber * 41 + Math.round(Number(payload.elapsedSeconds || 0) * 100));
        for (let index = 0; index < 42; index += 1) {
          const dotX = photoX + confettiRandom() * photoWidth;
          const dotY = photoY + confettiRandom() * photoHeight;
          const dotSize = 3 + confettiRandom() * 7;
          const hue = 190 + Math.floor(confettiRandom() * 170);
          ctx.fillStyle = `hsla(${hue}, 90%, 78%, 0.38)`;
          ctx.beginPath();
          ctx.arc(dotX, dotY, dotSize / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        drawStageSharePill(ctx, 176, 304, titleChipText, {
          fill: "rgba(15, 23, 42, 0.64)",
          stroke: "rgba(255, 255, 255, 0.18)",
          color: "#ffffff",
          font: '700 20px "Space Grotesk", "Trebuchet MS", sans-serif',
          paddingX: 16,
          height: 34
        });
        drawStageSharePill(ctx, 176, 348, formatStageShareTime(payload.elapsedSeconds), {
          fill: "rgba(255, 255, 255, 0.18)",
          color: "#ffffff",
          font: '700 30px "Anton", "Trebuchet MS", sans-serif',
          paddingX: 18,
          height: 48
        });
        drawStageShareStars(ctx, 178, 430, Number(payload.stars) || 0, 4, 34);

        fillStageShareRoundRect(ctx, 176, 470, 474, 470, 26, "rgba(10, 17, 32, 0.68)");
        strokeStageShareRoundRect(ctx, 176, 470, 474, 470, 26, "rgba(255, 255, 255, 0.2)", 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.86)";
        ctx.font = '700 22px "Space Grotesk", "Trebuchet MS", sans-serif';
        ctx.fillText("SNAPSHOT", 206, 514);
        drawStageShareSnapshotCards(ctx, 206, 548, 414, 330, payload);
        ctx.fillStyle = "rgba(255, 255, 255, 0.74)";
        ctx.font = '600 20px "Space Grotesk", "Trebuchet MS", sans-serif';
        ctx.fillText("Beat this run in your next attempt.", 206, 912);

        fillStageShareRoundRect(ctx, 694, 334, 322, 580, 24, "rgba(255, 251, 245, 0.92)");
        strokeStageShareRoundRect(ctx, 694, 334, 322, 580, 24, "rgba(15, 23, 42, 0.12)", 2);
        ctx.fillStyle = "#10233c";
        ctx.font = '700 28px "Space Grotesk", "Trebuchet MS", sans-serif';
        ctx.fillText("Leaderboard", 726, 382);
        ctx.font = '600 17px "Space Grotesk", "Trebuchet MS", sans-serif';
        ctx.fillStyle = "rgba(16, 35, 60, 0.66)";
        ctx.fillText("Best times", 726, 410);

        const renderedRows = leaderboardRows.length ? leaderboardRows : [{
          rank: "YOU",
          name: truncateStageShareText(playerName, 20),
          time: formatStageShareTime(payload.elapsedSeconds),
          isPlayer: true
        }];
        renderedRows.slice(0, 6).forEach((row, index) => {
          const rowY = 446 + index * 78;
          const isPlayer = Boolean(row.isPlayer);
          fillStageShareRoundRect(
            ctx,
            716,
            rowY,
            278,
            58,
            18,
            isPlayer ? "#10233c" : index % 2 === 0 ? "rgba(16, 35, 60, 0.04)" : "rgba(16, 35, 60, 0.09)"
          );
          ctx.fillStyle = isPlayer ? "#f9fafb" : "#10233c";
          ctx.font = '700 21px "Space Grotesk", "Trebuchet MS", sans-serif';
          ctx.fillText(String(row.rank || "-"), 738, rowY + 36);
          ctx.font = '700 20px "Space Grotesk", "Trebuchet MS", sans-serif';
          ctx.fillText(truncateStageShareText(row.name || "Player", 16), 790, rowY + 36);
          ctx.textAlign = "right";
          ctx.fillText(String(row.time || "--"), 972, rowY + 36);
          ctx.textAlign = "left";
        });

        fillStageShareRoundRect(ctx, 168, 1128, 180, 92, 18, "#10233c");
        fillStageShareRoundRect(ctx, 368, 1128, 210, 92, 18, "#f97316");
        fillStageShareRoundRect(ctx, 598, 1128, 238, 92, 18, "#f5b942");
        fillStageShareRoundRect(ctx, 856, 1128, 196, 92, 18, "#1f6c72");

        ctx.textBaseline = "top";
        ctx.fillStyle = "#ffffff";
        ctx.font = '700 18px "Space Grotesk", "Trebuchet MS", sans-serif';
        ctx.fillText("LEVEL", 194, 1152);
        ctx.font = '700 34px "Anton", "Trebuchet MS", sans-serif';
        ctx.fillText(String(stageNumber), 194, 1178);

        ctx.font = '700 18px "Space Grotesk", "Trebuchet MS", sans-serif';
        ctx.fillText("TIME", 394, 1152);
        ctx.font = '700 34px "Anton", "Trebuchet MS", sans-serif';
        ctx.fillText(formatStageShareTime(payload.elapsedSeconds), 394, 1178);

        ctx.fillStyle = "#10233c";
        ctx.font = '700 18px "Space Grotesk", "Trebuchet MS", sans-serif';
        ctx.fillText("STARS", 624, 1152);
        ctx.font = '700 34px "Anton", "Trebuchet MS", sans-serif';
        ctx.fillText(`${Number(payload.stars) || 0}/4`, 624, 1178);

        ctx.fillStyle = "#ffffff";
        ctx.font = '700 18px "Space Grotesk", "Trebuchet MS", sans-serif';
        ctx.fillText("PLAYER", 882, 1152);
        ctx.font = '700 28px "Anton", "Trebuchet MS", sans-serif';
        ctx.fillText(truncateStageShareText(playerName.toUpperCase(), 11), 882, 1180);

        ctx.fillStyle = "#10233c";
        ctx.font = '700 30px "Space Grotesk", "Trebuchet MS", sans-serif';
        drawWrappedStageShareText(ctx, footerCta, 168, 1274, 830, 38, 2);
        ctx.fillStyle = "rgba(16, 35, 60, 0.76)";
        ctx.font = '600 22px "Space Grotesk", "Trebuchet MS", sans-serif';
        drawWrappedStageShareText(ctx, urlDisplay, 168, 1354, 860, 30, 2);

        ctx.restore();
        return canvas;
      }

      function stageResultCanvasToBlob(canvas) {
        return new Promise((resolve) => {
          if (!canvas || typeof canvas.toBlob !== "function") {
            resolve(null);
            return;
          }
          canvas.toBlob((blob) => {
            resolve(blob || null);
          }, "image/png");
        });
      }

      function downloadStageResultShareBlob(blob, fileName) {
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => {
          URL.revokeObjectURL(objectUrl);
        }, 2000);
      }

      async function shareCurrentStageResultCard() {
        if (stageResultShareBusy || !currentStageResultShareData) {
          return false;
        }
        if (sharePreviewModal && currentStageSharePreviewBlob) {
          const previewKey = buildStageSharePreviewKey();
          if (previewKey && previewKey === currentStageSharePreviewKey) {
            syncStageSharePreviewActions();
            setStageSharePreviewStatus("");
            return openStageSharePreviewModal();
          }
        }
        stageResultShareBusy = true;
        const shareButton = document.getElementById("stageShareButton");
        const previousLabel = shareButton ? shareButton.getAttribute("aria-label") : "";
        if (shareButton) {
          shareButton.disabled = true;
          shareButton.dataset.busy = "true";
          shareButton.setAttribute("aria-label", "Preparing share image");
        }
        try {
          if (document.fonts && document.fonts.ready) {
            await document.fonts.ready.catch(() => {});
          }
          const canvas = await buildStageResultShareCanvas(currentStageResultShareData);
          const blob = await stageResultCanvasToBlob(canvas);
          if (!blob) {
            throw new Error("Could not create share image blob.");
          }
          const stageNumber = Number(currentStageResultShareData.stageIndex) + 1;
          const fileName = `flash-recall-level-${stageNumber}.png`;
          const previewKey = buildStageSharePreviewKey(currentStageResultShareData);
          if (sharePreviewModal) {
            setStageSharePreviewBlob(blob, fileName, previewKey);
            setStageSharePreviewStatus("");
            if (!canCopyStageSharePreviewImage()) {
              setStageSharePreviewStatus("Use Download if image copy is not supported here.");
            }
            return openStageSharePreviewModal();
          }
          downloadStageResultShareBlob(blob, fileName);
          return true;
        } catch (error) {
          console.warn("Failed to create share image", error);
          setStageSharePreviewStatus("Couldn't create the share image.", true);
          return false;
        } finally {
          if (shareButton) {
            shareButton.disabled = false;
            delete shareButton.dataset.busy;
            if (previousLabel) {
              shareButton.setAttribute("aria-label", previousLabel);
            } else {
              shareButton.removeAttribute("aria-label");
            }
          }
          stageResultShareBusy = false;
        }
      }

      function getEffectAudioState(audio) {
        if (!audio) {
          return {
            available: false
          };
        }
        return {
          available: true,
          src: audio.currentSrc || audio.src,
          readyState: audio.readyState,
          networkState: audio.networkState,
          paused: audio.paused,
          muted: audio.muted,
          volume: audio.volume,
          error: audio.error
            ? { code: audio.error.code, message: audio.error.message || null }
            : null
        };
      }

      window.playCorrectSound = playRoundCorrectSound;
      window.getCorrectSoundState = () => getEffectAudioState(effectAudioClips.correct);
      window.playWrongSound = playRoundWrongSound;
      window.getWrongSoundState = () => getEffectAudioState(effectAudioClips.wrong);
      window.playAchievementSound = playAchievementSound;
      window.getAchievementSoundState = () => getEffectAudioState(effectAudioClips.achievement);
      window.shareCurrentStageResultCard = shareCurrentStageResultCard;
      window.getCurrentStageResultShareData = () => currentStageResultShareData
        ? { ...currentStageResultShareData }
        : null;
      window.closeStageSharePreviewModal = closeStageSharePreviewModal;
      window.clearStageSharePreview = clearStageSharePreview;

      if (sharePreviewClose && sharePreviewModal) {
        sharePreviewClose.addEventListener("click", closeStageSharePreviewModal);
      }
      if (sharePreviewModal) {
        sharePreviewModal.addEventListener("click", (event) => {
          if (event.target === sharePreviewModal) {
            closeStageSharePreviewModal();
          }
        });
      }
      if (sharePreviewCopy) {
        sharePreviewCopy.addEventListener("click", () => {
          copyStageSharePreviewToClipboard();
        });
      }
      if (sharePreviewDownload) {
        sharePreviewDownload.addEventListener("click", () => {
          downloadStageSharePreview();
        });
      }
      document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape" || !isStageSharePreviewOpen()) return;
        event.preventDefault();
        closeStageSharePreviewModal();
      });

      function queuePendingEffectAudio() {
        if (pendingEffectAudioListenerAttached) return;
        pendingEffectAudioListenerAttached = true;
        const handler = () => {
          pendingEffectAudioListenerAttached = false;
          const audio = pendingEffectAudio;
          pendingEffectAudio = null;
          if (!audio) return;
          try {
            audio.pause();
            audio.currentTime = 0;
            audio.muted = false;
            audio.volume = getEffectMixVolume();
            const playResult = audio.play();
            if (playResult && typeof playResult.catch === "function") {
              playResult.catch((error) => {
                window.__lastAudioError = error;
              });
            }
          } catch (error) {
            window.__lastAudioError = error;
          }
        };
        document.addEventListener("pointerdown", handler, { capture: true, once: true });
        document.addEventListener("keydown", handler, { capture: true, once: true });
      }

      document.addEventListener("pointerdown", unlockEffectAudio, { capture: true, once: true });
      document.addEventListener("keydown", unlockEffectAudio, { capture: true, once: true });
      function shouldPlayButtonClick(event) {
        if (!event) return false;
        if (event.pointerType && event.pointerType !== "mouse") return false;
        const rawTarget = event.target instanceof Element ? event.target : null;

        const target = event.target && event.target.closest
          ? event.target.closest("button, [role=\"button\"]")
          : null;
        if (!target) return false;
        if (target.disabled || target.getAttribute("aria-disabled") === "true") return false;
        return true;
      }
      document.addEventListener(
        "pointerdown",
        (event) => {
          if (!shouldPlayButtonClick(event)) return;
          playButtonClickSound();
        },
        { capture: true }
      );

      function setModalState(modal, open) {
        if (!modal) return;
        if (open) {
          modal.removeAttribute("aria-hidden");
          modal.removeAttribute("inert");
          modal.removeAttribute("hidden");
          if (modal.__closeTimer) {
            clearTimeout(modal.__closeTimer);
            modal.__closeTimer = null;
          }
          if (modal.dataset.closing === "true") {
            delete modal.dataset.closing;
          }
          if (modal.classList.contains("closing")) {
            modal.classList.remove("closing");
          }
          if (!modal.classList.contains("show")) {
            // Ensure transitions fire after un-hiding.
            modal.classList.remove("show");
            void modal.offsetWidth;
            modal.classList.add("show");
          }
        } else {
          if (document.activeElement && modal.contains(document.activeElement)) {
            document.activeElement.blur();
          }
          modal.setAttribute("aria-hidden", "true");
          modal.setAttribute("inert", "");
          if (modal.hasAttribute("hidden") || modal.dataset.closing === "true") {
            return;
          }
          modal.dataset.closing = "true";
          modal.classList.add("closing");
          const finishClose = () => {
            if (modal.dataset.closing !== "true") return;
            delete modal.dataset.closing;
            modal.classList.remove("closing");
            modal.classList.remove("show");
            modal.setAttribute("hidden", "");
            modal.removeEventListener("transitionend", onCloseEnd);
            if (modal.__closeTimer) {
              clearTimeout(modal.__closeTimer);
              modal.__closeTimer = null;
            }
          };
          const onCloseEnd = (event) => {
            if (event.target !== modal) return;
            finishClose();
          };
          modal.addEventListener("transitionend", onCloseEnd);
          modal.__closeTimer = setTimeout(finishClose, 260);
        }
      }

      function openPauseModal() {
        if (phase === "idle") {
          return;
        }
        pausedState = {
          phase,
          phaseText: phase,
          timer: null,
          adWasActive: false,
          fogWasActive: false,
          blurWasActive: false,
          adSnapshot: null,
          glitchWasActive: false,
          swapRemaining: null,
          stagePauseStart: null
        };
        if (gameMode === "stages" && stageState.active) {
          pausedState.stagePauseStart = performance.now();
          stopStageStopwatch();
        }
        if (timerState) {
          const remainingMs = Math.max(0, timerState.endTime - performance.now());
          pausedState.timer = {
            remainingMs,
            label: timerState.label,
            onComplete: timerState.onComplete,
            totalSeconds: timerState.totalSeconds
          };
        }
        if (adActive) {
          pausedState.adWasActive = true;
          pausedState.adSnapshot = adSnapshot ? { ...adSnapshot } : null;
          setAdInteractive(false);
        }
        if (fogActive) {
          pausedState.fogWasActive = true;
          stopFog();
        }
        if (blurActive) {
          pausedState.blurWasActive = true;
          stopBlur();
        }
        if (phase === "show" && getChallengeOptions(round).enableGlitch) {
          pausedState.glitchWasActive = true;
          stopGlitching();
        }
        if (swapTimeoutId && swapStartTime) {
          const elapsed = performance.now() - swapStartTime;
          swapRemaining = Math.max(0, (swapRemaining ?? 0) - elapsed);
          pausedState.swapRemaining = swapRemaining;
          clearTimeout(swapTimeoutId);
          swapTimeoutId = null;
          swapStartTime = null;
          if (swapStagePauseStart) {
            swapStagePauseAccumulated += performance.now() - swapStagePauseStart;
            swapStagePauseStart = null;
          }
        }
        if (successAnimationActive) {
          pauseSuccessAnimation();
        }
        clearAdTimer();
        if (timerId) {
          clearInterval(timerId);
          timerId = null;
        }
        timerState = null;
        setModalState(pauseModal, true);
        document.body.classList.add("pause-active");
      }

      function closePauseModal() {
        setModalState(pauseModal, false);
        document.body.classList.remove("pause-active");
        setAdInteractive(true);
      }

      function resumeFromPause() {
        if (!pausedState || !pausedState.phase) return;
        if (pausedState.stagePauseStart && typeof stageState.startTime === "number") {
          const pauseDuration = performance.now() - pausedState.stagePauseStart;
          stageState.startTime += pauseDuration;
        }
        const remainingSeconds =
          pausedState.timer && pausedState.timer.remainingMs > 0
            ? pausedState.timer.remainingMs / 1000
            : null;
        if (pausedState.phase === "show") {
          setPhase(pausedState.phaseText, pausedState.phase);
        } else if (pausedState.phase === "recall") {
          if (pausedState.swapRemaining && swapStartRecall) {
            setPhase("Swapping...", "recall");
          } else {
            setPhase("Type what you saw", "recall");
          }
        }
        if (remainingSeconds !== null && !(pausedState.swapRemaining && swapStartRecall)) {
          setTimer(
            remainingSeconds,
            pausedState.timer.label,
            pausedState.timer.onComplete,
            pausedState.timer.totalSeconds
          );
        } else if (
          pausedState.phase === "recall" &&
          !swapTimeoutId &&
          !(pausedState.swapRemaining && swapStartRecall)
        ) {
          setTimer(getRecallSeconds(), "Recall", () => {
            checkAnswers();
          });
        }
        restorePausedEffects(remainingSeconds);
        if (gameMode === "stages" && stageState.active) {
          if (pausedState.swapRemaining && swapStartRecall) {
            swapStagePauseStart = performance.now();
          } else if (successAnimationActive) {
            resumeSuccessAnimation();
          } else {
            startStageStopwatch();
          }
        }
        pausedState = null;
      }

      function restorePausedEffects(remainingSeconds) {
        if (!pausedState) return;
        if (phase === "show") {
          if (pausedState.adWasActive) {
            if (pausedState.adSnapshot) {
              adSnapshot = { ...pausedState.adSnapshot };
            }
            setAdInteractive(true);
            if (!adActive) {
              showAd({ reuseSnapshot: true });
            }
          } else if (adEnabled && !adShownThisRound && typeof remainingSeconds === "number") {
            scheduleAd(Math.max(0.1, remainingSeconds));
          }
          if (pausedState.fogWasActive) {
            startFog();
          }
          if (pausedState.blurWasActive) {
            startBlur();
          }
          if (pausedState.glitchWasActive) {
            startGlitching();
          }
        }
        if (pausedState.swapRemaining && swapStartRecall) {
          const resumeRecall = swapStartRecall;
          swapRemaining = pausedState.swapRemaining;
          swapStartTime = performance.now();
          swapTimeoutId = setTimeout(() => {
            swapTimeoutId = null;
            swapStartTime = null;
            swapRemaining = null;
            swapStartRecall = null;
            if (swapCleanup) {
              swapCleanup();
              swapCleanup = null;
            }
            resumeRecall();
          }, swapRemaining);
        }
      }

      function buildExpectedLabel(item) {
        if ((item.answerCategory || item.category) === "aminoAcids" &&
            !item.sequenceSteps?.length &&
            item.recallHint !== "Background color" && item.recallHint !== "Text color") {
          const answer = item.answer ?? item.label;
          const aminoAcid = dataSets.aminoAcids.find(entry => normalize(entry.label) === normalize(answer));
          if (aminoAcid) {
            return {
              label: item.aminoAnswerFormat ? getAminoAcidAnswerFormatLabel(item) : item.recallHint || formatCategoryLabel(item.category),
              answer,
              displayAnswer: item.aminoAnswerFormat ? aminoAcid[item.aminoAnswerFormat] : `${aminoAcid.label} / ${aminoAcid.oneLetterCode} / ${aminoAcid.threeLetterCode}`
            };
          }
        }
        if (item && item.specialType === "cat") {
          return {
            label: "Cat",
            answer: "cat"
          };
        }
        if (item.category === "numbers" && item.recallHint) {
          return {
            label: item.recallHint,
            answer: item.answer
          };
        }
        if (item.category === "colors") {
          const target = item.recallHint || "Color";
          return {
            label: target,
            answer: item.answer
          };
        }
        if (item.recallHint) {
          return {
            label: item.recallHint,
            answer: item.answer ?? item.label
          };
        }
        return {
          label: formatCategoryLabel(item.category),
          answer: item.answer ?? item.label
        };
      }

      function showReviewFailure(entries, mode, swapOrder = null) {
        if (isFreePlayMode(mode)) sandboxResultStreak = streak;
        if (typeof window.clearTabKeyHint === "function") {
          window.clearTabKeyHint();
        }
        if (typeof window.clearFirstLetterHint === "function") {
          window.clearFirstLetterHint();
        }
        if (window.tabTutorialActive) { 
          tabTutorialActive = false;
          if (tabTutorialDisabledInputs.length) {
            tabTutorialDisabledInputs.forEach((field) => {
              field.disabled = false;
            });
            tabTutorialDisabledInputs = [];
          }
        }
        stopFog();
        stopBlur();
        stopGlitching();
        document.body.classList.add("stage-fail");
        const originalItems = roundItems;
        const useSwapOrder =
          Array.isArray(swapOrder) && swapOrder.length === roundItems.length && swapOrder.every(Number.isInteger);
        if (useSwapOrder) {
          roundItems = swapOrder.map((idx) => originalItems[idx]);
        }
        renderCards(true);
        startSequenceModifier(roundItems);
        if (promptGrid) {
          promptGrid.innerHTML = "";
          entries.forEach((entry) => {
            const prompt = document.createElement("div");
            prompt.className = "card hidden-card hint";
            const hintHtml = String(entry.expected.label || "")
              .replace(/↻/g, '<span class="rotation-icon">↻</span>')
              .replace(/↺/g, '<span class="rotation-icon">↺</span>');
            prompt.innerHTML = `
              <small>Card ${entry.displayIndex}</small>
              <span>${hintHtml}</span>
            `;
            promptGrid.appendChild(prompt);
          });
        }
        renderInputs();
        roundItems = originalItems;
        inputGrid.querySelectorAll("input").forEach((input) => {
          const index = Number(input.dataset.index);
          const entry = entries[index];
          if (!entry) return;
          const displayValue =
            Object.prototype.hasOwnProperty.call(entry, "raw") && entry.raw !== "" ? entry.raw : entry.actual;
          const baseValue = displayValue ? displayValue : "—";
          input.value = baseValue;
          input.disabled = true;
          input.classList.toggle("answer-correct", entry.correct);
          input.classList.toggle("answer-wrong", !entry.correct);
          const wrapper = input.parentElement;
          if (wrapper && !entry.correct) {
            wrapper.classList.add("has-correct-inline");
            const correct = document.createElement("span");
            correct.className = "input-correct-inline";
            correct.textContent = `Correct: ${entry.expected.displayAnswer ?? entry.expected.answer}`;
            wrapper.appendChild(correct);
          }
        });
        const stageNumber = Number.isFinite(stageState.index) ? stageState.index + 1 : 1;
        const retryActionKey =
          typeof window.getActionKeyLabel === "function" ? window.getActionKeyLabel("retry") : "R";
        const retryKey = retryActionKey;
        const menuKey =
          typeof window.getActionKeyLabel === "function" ? window.getActionKeyLabel("stageQuit") : "Q";
        const practiceHomeKey =
          typeof window.getActionKeyLabel === "function" ? window.getActionKeyLabel("practiceHome") : "H";
        const practiceSettingsKey =
          typeof window.getActionKeyLabel === "function" ? window.getActionKeyLabel("practiceSettings") : "S";
        const title = mode === "stages" ? `Stage ${stageNumber} Failed` : "Round Failed";
        const buttons =
          mode === "stages"
            ? `<button id="stageMenuButton" class="secondary icon-button" type="button" aria-label="Menu (${menuKey})">
                 <img class="action-icon" src="imgs/menu_button.png" alt="" />
                 <span class="action-key-hint" aria-hidden="true">(${menuKey})</span>
               </button>
               <div class="stage-retry-wrap">
                 <div class="stage-retry-timer" aria-hidden="true">
                   <span class="stage-retry-timer__fill"></span>
                 </div>
                 <button id="stageRetryButton" class="secondary icon-button button-entice" type="button" aria-label="Retry (${retryKey})">
                   <img class="action-icon" src="imgs/retry_button.png" alt="" />
                   <span class="action-countdown" aria-live="polite"></span>
                   <span class="action-key-hint" aria-hidden="true">(${retryKey})</span>
                 </button>
               </div>`
            : `<button id="practiceSettingsButton" class="secondary icon-button" type="button" aria-label="${gameMode === 'aminoAcids' ? 'Amino Acids' : 'Sandbox'} settings">
                 <img class="action-icon" src="imgs/settings_button.png" alt="" />
                 <span class="action-key-hint" aria-hidden="true">(${practiceSettingsKey})</span>
               </button>
               <button id="practiceBackButton" class="secondary icon-button" type="button" aria-label="Home (${practiceHomeKey})">
                 <img class="action-icon" src="imgs/home_button.png" alt="" />
                 <span class="action-key-hint" aria-hidden="true">(${practiceHomeKey})</span>
               </button>
               <button id="practiceRetryButton" class="secondary icon-button" type="button" aria-label="Restart (${retryKey})">
                 <img class="action-icon" src="imgs/retry_button.png" alt="" />
                 <span class="action-key-hint" aria-hidden="true">(${retryKey})</span>
               </button>`;
        const actions = document.querySelector(".stage .actions");
        if (actions) {
          actions.innerHTML = `<div class="stage-fail-actions">${buttons}</div>`;
        }
        resultsPanel.innerHTML = `
          <div class="stage-fail-bar">
            <div class="stage-fail-bar__text">
              <strong>${title}</strong>
            </div>
          </div>
        `;
        resultsPanel.classList.add("show");

        if (mode === "stages") {
          const autoRetryDelayMs = 4500;
          if (autoRetryTimerId) {
            clearTimeout(autoRetryTimerId);
            autoRetryTimerId = null;
          }
          const retryTimer = document.querySelector(".stage-retry-timer");
          const retryTimerFill = retryTimer
            ? retryTimer.querySelector(".stage-retry-timer__fill")
            : null;
          const startAutoRetry = () => {
            const autoRetryEnabledNow = typeof autoRetryEnabled === "undefined"
              ? true
              : autoRetryEnabled;
            if (!autoRetryEnabledNow) {
              if (retryTimer) {
                retryTimer.classList.add("is-disabled");
              }
              return;
            }
            if (retryTimer) {
              retryTimer.classList.remove("is-running", "is-canceled", "is-disabled", "is-waiting");
            }
            if (retryTimerFill) {
              retryTimerFill.style.removeProperty("transition");
              retryTimerFill.style.removeProperty("transition-duration");
              retryTimerFill.style.removeProperty("transform");
              retryTimerFill.style.transitionDuration = `${autoRetryDelayMs}ms`;
            }
            requestAnimationFrame(() => {
              if (retryTimer) {
                retryTimer.classList.add("is-running");
              }
            });
            autoRetryTimerId = window.setTimeout(() => {
              autoRetryTimerId = null;
              const retryBtn = document.getElementById("stageRetryButton");
              if (retryBtn) {
                retryBtn.click();
              }
            }, autoRetryDelayMs);
          };
          const cancelAutoRetryFromResults = () => {
            if (autoRetryTimerId) {
              clearTimeout(autoRetryTimerId);
              autoRetryTimerId = null;
            }
            if (retryTimer) {
              retryTimer.classList.remove("is-running", "is-waiting");
              retryTimer.classList.add("is-canceled");
            }
            if (retryTimerFill) {
              retryTimerFill.style.transition = "none";
              retryTimerFill.style.transform = "scaleX(0)";
              void retryTimerFill.offsetWidth;
            }
          };
          window.cancelAutoRetryFromResults = cancelAutoRetryFromResults;
          startAutoRetry();
        }
      }

      function getStageStars(elapsedSeconds, stage) {
        const targets = window.getStageStarTargets ? window.getStageStarTargets(stage) : null;
        if (!targets) return 0;
        if (Number.isFinite(targets.platinum) && elapsedSeconds <= targets.platinum) return 4;
        if (elapsedSeconds <= targets.gold) return 3;
        if (elapsedSeconds <= targets.silver) return 2;
        if (elapsedSeconds <= targets.bronze) return 1;
        return 0;
      }

      function saveStageStars(stage, stars, elapsedSeconds) {
        if (!stage || !window.stageStars) {
          return {
            hadBest: false,
            isFirstClear: false,
            isNewBest: false,
            isNewScore: false
          };
        }
        const key = window.getStageStarsKey
          ? window.getStageStarsKey(stage, stageState.index)
          : (stage.id ? String(stage.id) : String(stageState.index + 1));
        let hadBest = false;
        let isNewScore = false;
        const wasCompletedBefore = Boolean(window.stageCompleted && window.stageCompleted[key]);

        // Save stars (keep the highest)
        const hasEntry = Object.prototype.hasOwnProperty.call(window.stageStars, key);
        const current = hasEntry ? Number(window.stageStars[key]) : null;
        if (!hasEntry || stars > current) {
          window.stageStars[key] = stars;
          isNewScore = true;
        }

        // Mark as completed (regardless of stars)
        if (!window.stageCompleted) {
          window.stageCompleted = {};
        }
        window.stageCompleted[key] = true;

        // Call the global save function if it exists
        if (window.saveStageProgress) {
          window.saveStageProgress();
        }

        if (Number.isFinite(elapsedSeconds)) {
          if (!window.stageBestTimes) {
            window.stageBestTimes = {};
          }
          const bestKey = window.getStageBestTimeKey
            ? window.getStageBestTimeKey(stage, stageState.index)
            : key;
          const currentBest = Number(window.stageBestTimes[bestKey]);
          hadBest = Number.isFinite(currentBest);
          const isNewBest = !Number.isFinite(currentBest) || elapsedSeconds < currentBest;
          if (!Number.isFinite(currentBest) || elapsedSeconds < currentBest) {
            window.stageBestTimes[bestKey] = elapsedSeconds;
          }
          if (window.saveStageProgress) {
            window.saveStageProgress();
          }
          return {
            hadBest,
            isFirstClear: !wasCompletedBefore,
            isNewBest,
            isNewScore
          };
        }
        return {
          hadBest,
          isFirstClear: !wasCompletedBefore,
          isNewBest: false,
          isNewScore
        };
      }

      function buildResultConfettiMarkup(count = 42) {
        const palette = ["#111111", "#555555", "#999999", "#cccccc"];
        const burstAnchors = [8, 20, 34, 50, 66, 80, 92];
        const pieces = Array.from({ length: count }, (_, index) => {
          const anchor = burstAnchors[index % burstAnchors.length];
          const left = Math.max(-4, Math.min(104, anchor + (Math.random() * 12 - 6)));
          const startY = Math.round(-24 + Math.random() * 40);
          const vx = Math.round((Math.random() * 2 - 1) * (90 + Math.random() * 90));
          const vy = Math.round(-(60 + Math.random() * 150));
          const gravity = Math.round(220 + Math.random() * 190);
          const delay = Math.round(Math.random() * 320);
          const duration = 1900 + Math.round(Math.random() * 950);
          const rotateStart = Math.round(Math.random() * 180 - 90);
          const spin = Math.round((Math.random() < 0.5 ? -1 : 1) * (220 + Math.random() * 560));
          const size = 6 + Math.floor(Math.random() * 8);
          const opacity = (0.82 + Math.random() * 0.18).toFixed(2);
          const color = palette[Math.floor(Math.random() * palette.length)];
          const ballisticY = (t) => Math.round(startY + vy * t + gravity * t * t);
          const ballisticX = (t) => Math.round(vx * t);
          const spinAt = (t) => Math.round(rotateStart + spin * t);
          return `<span class="stage-complete__confetti-piece" style="--confetti-left:${left}%;--confetti-delay:${delay}ms;--confetti-duration:${duration}ms;--confetti-width:${size}px;--confetti-height:${size}px;--confetti-opacity:${opacity};--confetti-color:${color};--confetti-x0:0px;--confetti-y0:${startY}px;--confetti-x25:${ballisticX(0.25)}px;--confetti-y25:${ballisticY(0.25)}px;--confetti-x50:${ballisticX(0.5)}px;--confetti-y50:${ballisticY(0.5)}px;--confetti-x75:${ballisticX(0.75)}px;--confetti-y75:${ballisticY(0.75)}px;--confetti-x100:${ballisticX(1)}px;--confetti-y100:${ballisticY(1)}px;--confetti-r0:${rotateStart}deg;--confetti-r25:${spinAt(0.25)}deg;--confetti-r50:${spinAt(0.5)}deg;--confetti-r75:${spinAt(0.75)}deg;--confetti-r100:${spinAt(1)}deg;"></span>`;
        }).join("");
        return `<div class="stage-complete__confetti" aria-hidden="true">${pieces}</div>`;
      }

      function showStageComplete(elapsedSeconds, stars, stage, options = {}) {
        if (typeof window.clearTabKeyHint === "function") {
          window.clearTabKeyHint();
        }
        if (typeof window.clearFirstLetterHint === "function") {
          window.clearFirstLetterHint();
        }
        const adaptiveMessage = typeof window.consumeAdaptiveGroupAMessage === "function"
          ? window.consumeAdaptiveGroupAMessage()
          : "";
        stopFog();
        stopBlur();
        stopGlitching();
        stopStageStopwatch();
        document.body.classList.remove("stage-fail");
        cardGrid.innerHTML = "";
        inputGrid.innerHTML = "";
        const actions = document.querySelector(".stage .actions");
        if (actions) {
          actions.innerHTML = "";
        }
        const stageName = stage && stage.name ? stage.name : `Stage ${stageState.index + 1}`;
        const stageId = stage && stage.id ? String(stage.id) : String(stageState.index + 1);
        const stageVersion = window.getStageVersion ? window.getStageVersion(stage) : 1;
        // Get star times from stages-data
        const starTimes = stage && stage.starTimes ? stage.starTimes : {};
        bronzeTime = starTimes.bronze || null;
        silverTime = starTimes.silver || null;
        goldTime = starTimes.gold || null;
        platinumTime = starTimes.platinum || null;

        bronzeLabel = bronzeTime ? `<div class="star-time bronze">${bronzeTime}s</div>` : "";
        silverLabel = silverTime ? `<div class="star-time silver">${silverTime}s</div>` : "";
        goldLabel = goldTime ? `<div class="star-time gold">${goldTime}s</div>` : "";
        platinumLabel = platinumTime ? `<div class="star-time platinum">${platinumTime}s</div>` : "";

        const retryActionKey =
          typeof window.getActionKeyLabel === "function" ? window.getActionKeyLabel("retry") : "R";
        const stageQuitKey =
          typeof window.getActionKeyLabel === "function" ? window.getActionKeyLabel("stageQuit") : "Q";
        const stageNextKey =
          typeof window.getActionKeyLabel === "function" ? window.getActionKeyLabel("stageNext") : "N";
        const retryKey = retryActionKey;
        const starGap = stars < 4 ? "1rem" : "0.65rem";
        const stages = Array.isArray(window.stagesConfig) ? window.stagesConfig : [];
        const hasNextStage = Boolean(stages[stageState.index + 1]);
        const nextStage = hasNextStage && typeof window.getStageConfig === "function"
          ? window.getStageConfig(stageState.index + 1)
          : stages[stageState.index + 1] || null;
        const isFinalStage = !hasNextStage;

        const showCelebration = true;

        resultsPanel.innerHTML = `
          <div class="stage-complete${showCelebration ? " stage-complete--celebration" : ""}${isFinalStage ? " stage-complete--final" : ""}">
            ${showCelebration ? buildResultConfettiMarkup() : ""}
            ${adaptiveMessage ? `
              <div class="adaptive-stage-message" id="adaptiveStageMessage" role="status" aria-live="polite">
                <button
                  type="button"
                  class="adaptive-stage-message__dismiss"
                  id="adaptiveStageMessageDismiss"
                  aria-label="Dismiss adaptive difficulty message"
                >&times;</button>
                <div class="adaptive-stage-message__text">${adaptiveMessage}</div>
              </div>
            ` : ""}
            <div class="stage-complete__left-column">
              <div class="stage-complete__header">
                <strong>${stageName} complete!</strong>
                <div class="stage-meta">Time: ${elapsedSeconds.toFixed(2)}s <span class="stage-meta--best" id="stageCompleteBestTime"></span></div>
              </div>
              <div class="stage-complete__stars" aria-label="Stage stars" data-stars="${stars}" style="gap: ${starGap};">
                <div class="star-column">
                  <span class="stage-star${stars >= 1 ? " is-filled" : ""}">✦</span>
                  ${bronzeLabel}
                </div>
                <div class="star-column">
                  <span class="stage-star${stars >= 2 ? " is-filled" : ""}">✦</span>
                  ${silverLabel}
                </div>
                <div class="star-column">
                  <span class="stage-star${stars >= 3 ? " is-filled" : ""}">✦</span>
                  ${goldLabel}
                  </div>
                ${stars >= 4 ? `
                  <div class="star-column">
                    <span class="stage-star is-filled is-secret">✦</span>
                    ${platinumLabel}
                  </div>
                  ` : ""}
              </div>
              <div class="stage-complete__bar-track">
                <div class="stage-complete__bar-fill" data-stars="${stars}"></div>
              </div>

            </div>
            <div class="stage-complete__right-column">
              <div class="leaderboard-panel" id="stageClearLeaderboard" data-stage-index="${stageState.index}">
                <div class="leaderboard-panel__title">Leaderboard</div>
                <div class="leaderboard-list" id="stageClearLeaderboardList">
                  <div class="leaderboard-row">
                    <span>#</span>
                    <span>Player</span>
                    <span>Time</span>
                  </div>
                  <div class="leaderboard-row leaderboard-row--empty" id="stageClearLeaderboardEmpty">No data yet</div>
                </div>
              </div>
              <div class="stage-complete__actions">
                <button id="stageMenuButton" class="secondary icon-button" type="button" aria-label="Menu (${stageQuitKey})">
                  <img class="action-icon" src="imgs/menu_button.png" alt="" />
                  <span class="action-key-hint" aria-hidden="true">(${stageQuitKey})</span>
                </button>
                <button id="stageRetryButton" class="secondary icon-button" type="button" aria-label="Retry (${retryKey})">
                  <img class="action-icon" src="imgs/retry_button.png" alt="" />
                  <span class="action-countdown" aria-live="polite"></span>
                  <span class="action-key-hint" aria-hidden="true">(${retryKey})</span>
                </button>
                <button id="stageShareButton" class="secondary icon-button" type="button" aria-label="Share result image">
                  <img class="action-icon" src="imgs/icons/export-share-icon.svg" alt="" />
                </button>
                <div class="stage-next-wrap">
                  <div class="stage-next-timer" aria-hidden="true">
                    <span class="stage-next-timer__fill"></span>
                  </div>
                  <button id="stageNextButton" class="secondary icon-button button-entice" type="button" aria-label="Next (${stageNextKey})">
                    <img class="action-icon" src="imgs/next_button.png" alt="" />
                    <span class="action-key-hint" aria-hidden="true">(${stageNextKey})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
        resultsPanel.classList.add("show");
        clearStageSharePreview();
        currentStageResultShareData = {
          stageIndex: stageState.index,
          stageId,
          stageVersion,
          stageName,
          stageType: stage && stage.stageType ? String(stage.stageType) : "",
          elapsedSeconds,
          stars
        };

        if (typeof window.maybePromptPlayerName === "function") {
          window.maybePromptPlayerName();
        }

        let onAdaptiveMessageDismiss = null;
        const adaptiveMessageEl = document.getElementById("adaptiveStageMessage");
        if (adaptiveMessageEl) {
          const dismissAdaptiveMessage = () => {
            if (adaptiveMessageEl.dataset.dismissed === "true") return;
            adaptiveMessageEl.dataset.dismissed = "true";
            adaptiveMessageEl.classList.add("is-hiding");
            window.setTimeout(() => {
              adaptiveMessageEl.remove();
              if (typeof onAdaptiveMessageDismiss === "function") {
                onAdaptiveMessageDismiss();
                onAdaptiveMessageDismiss = null;
              }
            }, 220);
          };
          const adaptiveDismissButton = document.getElementById("adaptiveStageMessageDismiss");
          if (adaptiveDismissButton) {
            adaptiveDismissButton.addEventListener("click", dismissAdaptiveMessage);
          }
          window.setTimeout(dismissAdaptiveMessage, 7000);
        }

        const autoAdvanceDelayMs = 4500;
        if (autoAdvanceNextTimerId) {
          clearTimeout(autoAdvanceNextTimerId);
          autoAdvanceNextTimerId = null;
        }
        const nextTimer = document.querySelector("#resultsPanel .stage-next-timer");
        const nextTimerFill = nextTimer
          ? nextTimer.querySelector(".stage-next-timer__fill")
          : null;
        const startAutoAdvanceNext = () => {
          if (!hasNextStage) {
            if (nextTimer) {
              nextTimer.classList.add("is-disabled");
              nextTimer.classList.remove("is-running");
              nextTimer.classList.remove("is-canceled");
              nextTimer.classList.remove("is-waiting");
            }
            return;
          }
          const autoAdvanceEnabledNow = typeof autoAdvanceNextEnabled === "undefined"
            ? true
            : autoAdvanceNextEnabled;
          if (!autoAdvanceEnabledNow) {
            if (nextTimer) {
              nextTimer.classList.add("is-disabled");
            }
            return;
          }
          if (nextTimer) {
            nextTimer.classList.remove("is-running");
            nextTimer.classList.remove("is-canceled");
            nextTimer.classList.remove("is-disabled");
            nextTimer.classList.remove("is-waiting");
          }
          if (nextTimerFill) {
            nextTimerFill.style.removeProperty("transition");
            nextTimerFill.style.removeProperty("transition-duration");
            nextTimerFill.style.removeProperty("transform");
            nextTimerFill.style.transitionDuration = `${autoAdvanceDelayMs}ms`;
          }
          requestAnimationFrame(() => {
            if (nextTimer) {
              nextTimer.classList.add("is-running");
            }
          });
          if (typeof window.trackAutoplayEvent === "function") {
            window.trackAutoplayEvent("result_auto_advance_scheduled", {
              autoplay_mode: "auto",
              level_number: stageState.index + 2,
              stage_type: nextStage && nextStage.stageType ? String(nextStage.stageType).toLowerCase() : null
            });
          }
          autoAdvanceNextTimerId = window.setTimeout(() => {
            autoAdvanceNextTimerId = null;
            const nextBtn = document.getElementById("stageNextButton");
            if (nextBtn && stages[stageState.index + 1]) {
              if (typeof window.trackAutoplayEvent === "function") {
                window.trackAutoplayEvent("result_auto_advance_triggered", {
                  autoplay_mode: "auto",
                  level_number: stageState.index + 2,
                  stage_type: nextStage && nextStage.stageType ? String(nextStage.stageType).toLowerCase() : null
                }, { immediate: true });
              }
              if (typeof window.setStageIntroOpenSource === "function") {
                window.setStageIntroOpenSource("result_autoplay");
              }
              hideAutoAdvanceNextFromResults();
              if (typeof window.setStageIntroAnimationMode === "function") {
                window.setStageIntroAnimationMode("auto");
              }
              startStage(stageState.index + 1, { skipIntro: false, originEl: null });
            }
          }, autoAdvanceDelayMs);
        };
        const cancelAutoAdvanceNextFromResults = () => {
          if (autoAdvanceNextTimerId) {
            clearTimeout(autoAdvanceNextTimerId);
            autoAdvanceNextTimerId = null;
          }
          if (nextTimer) {
            if (!hasNextStage) {
              nextTimer.classList.add("is-disabled");
              nextTimer.classList.remove("is-running");
              nextTimer.classList.remove("is-canceled");
              nextTimer.classList.remove("is-waiting");
              return;
            }
            nextTimer.classList.remove("is-running");
            nextTimer.classList.remove("is-canceled");
            nextTimer.classList.add("is-waiting");
          }
          if (nextTimerFill) {
            nextTimerFill.style.removeProperty("transition");
            nextTimerFill.style.removeProperty("transition-duration");
            nextTimerFill.style.removeProperty("transform");
          }
        };
        const hideAutoAdvanceNextFromResults = () => {
          if (autoAdvanceNextTimerId) {
            clearTimeout(autoAdvanceNextTimerId);
            autoAdvanceNextTimerId = null;
          }
          if (nextTimer) {
            nextTimer.classList.remove("is-running");
            nextTimer.classList.remove("is-waiting");
            nextTimer.classList.remove("is-canceled");
            nextTimer.classList.add("is-disabled");
          }
          if (nextTimerFill) {
            nextTimerFill.style.transition = "none";
            nextTimerFill.style.transform = "scaleX(0)";
            void nextTimerFill.offsetWidth;
            nextTimerFill.style.removeProperty("transition");
            nextTimerFill.style.removeProperty("transition-duration");
          }
        };
        window.startAutoAdvanceNextFromResults = startAutoAdvanceNext;
        window.cancelAutoAdvanceNextFromResults = cancelAutoAdvanceNextFromResults;
        window.hideAutoAdvanceNextFromResults = hideAutoAdvanceNextFromResults;
        const autoAdvanceEnabled = typeof autoAdvanceNextEnabled === "undefined"
          ? true
          : autoAdvanceNextEnabled;
        if (nextTimer) {
          nextTimer.classList.toggle("is-disabled", !autoAdvanceEnabled || !hasNextStage);
          if (!autoAdvanceEnabled || !hasNextStage) {
            nextTimer.classList.remove("is-waiting");
          }
        }
        const beginAutoAdvanceFlow = () => {
          if (!(autoAdvanceEnabled && hasNextStage)) return;
          const shouldDeferForName = typeof window.shouldPromptForPlayerName === "function"
            ? window.shouldPromptForPlayerName()
            : false;
          const deferred = typeof window.deferAutoAdvanceNext === "function"
            ? window.deferAutoAdvanceNext(startAutoAdvanceNext, shouldDeferForName)
            : false;
          if (deferred) {
            if (nextTimer) {
              nextTimer.classList.add("is-waiting");
            }
            if (nextTimerFill) {
              nextTimerFill.style.removeProperty("transition");
              nextTimerFill.style.removeProperty("transition-duration");
              nextTimerFill.style.removeProperty("transform");
            }
          } else {
            startAutoAdvanceNext();
          }
        };
        if (adaptiveMessageEl) {
          if (nextTimer) {
            nextTimer.classList.remove("is-running");
            nextTimer.classList.remove("is-canceled");
            nextTimer.classList.remove("is-disabled");
            nextTimer.classList.add("is-waiting");
          }
          if (nextTimerFill) {
            nextTimerFill.style.removeProperty("transition");
            nextTimerFill.style.removeProperty("transition-duration");
            nextTimerFill.style.removeProperty("transform");
          }
          onAdaptiveMessageDismiss = beginAutoAdvanceFlow;
        } else {
          beginAutoAdvanceFlow();
        }

        // Trigger bar fill animation after a short delay so the browser paints width:0 first

        const barFills = document.querySelectorAll("#resultsPanel .stage-complete__bar-fill");

        barFills.forEach(barFill => {
          const stars = parseInt(barFill.dataset.stars, 10) || 0;

          // set the final width based on stars
          // Set final width based on stars and how close to the next star threshold the time was
          let targetWidth = 0;
          let bronzeFill = 30;
          let silverFill = 50;
          let goldFill = 71;

          let nextTargetFill = bronzeFill;
          let timeDiffBetweenTargets = null;
          let timeFromPreviousTarget = null;

          if (stars === 1) {
            targetWidth = bronzeFill;
            nextTargetFill = silverFill;
            timeDiffBetweenTargets = bronzeTime - silverTime;
            timeFromPreviousTarget = bronzeTime - elapsedSeconds;
          }
          else if (stars === 2) {
            targetWidth = silverFill;
            nextTargetFill = goldFill;
            timeDiffBetweenTargets = silverTime - goldTime;
            timeFromPreviousTarget = silverTime - elapsedSeconds;
          }
          else if (stars >= 3) {
            targetWidth = 100;
          }

          if (timeDiffBetweenTargets && timeFromPreviousTarget && Number.isFinite(elapsedSeconds)) {
            const fillPercentDiff = nextTargetFill - targetWidth;
            // Make the fill difference between current and target into a percentage, add this to targetWidth
            const fillAdditionalPercent = timeFromPreviousTarget / timeDiffBetweenTargets * fillPercentDiff;
            console.log({ timeFromPreviousTarget, timeDiffBetweenTargets, fillPercentDiff, fillAdditionalPercent });
            targetWidth += fillAdditionalPercent;
          }

          if (stars === 0) {
            targetWidth = 5;
            distanceToBronze = elapsedSeconds - bronzeTime;
            if (distanceToBronze < 10) {
              // For times close to bronze, show a hint of the bronze fill
              targetWidth += bronzeFill / 10 * (10 - distanceToBronze);
              targetWidth = Math.min(targetWidth, bronzeFill - 0.5);
            }
          }

          barFill.style.width = "0";
          barFill.offsetWidth; // force browser to register width:0
            // Trigger transition
          setTimeout(() => {
            barFill.style.width = targetWidth + "%";
          }, 20); // small delay ensures browser painted initial width
        });

        const bestEl = document.getElementById("stageCompleteBestTime");
        if (bestEl && options.showBest) {
          const bestKey = window.getStageBestTimeKey
            ? window.getStageBestTimeKey(stage, stageState.index)
            : (stage && stage.id ? String(stage.id) : String(stageState.index + 1));
          const bestSeconds = Number(window.stageBestTimes && window.stageBestTimes[bestKey]);
          bestEl.textContent = Number.isFinite(bestSeconds)
            ? `(Best: ${bestSeconds.toFixed(2)}s)`
            : "";
        } else if (bestEl) {
          bestEl.textContent = "";
        }

        if (typeof window.renderStageLeaderboard === "function") {
          window.renderStageLeaderboard(stage, stageState.index, "stageClearLeaderboardList", "stageClearLeaderboardEmpty");
        }
        // const stageId = stage?.id || (stageState.index + 1);
        // const stageVersion = stage?.stageVersion || stage?.levelVersion || 1;

        // if (typeof window.fetchStageLeaderboard === 'function') {
        //   window.fetchStageLeaderboard(stageId, stageVersion, 10)
        //     .then(result => {
        //       if (!result || !result.top) return;

        //       const timeMetaEl = document.querySelector('.stage-complete__header .stage-meta');
        //       if (!timeMetaEl) return;

        //       const currentPlayerId = window.getLeaderboardPlayerId ? window.getLeaderboardPlayerId() : null;
        //       const playerTimeMs = Math.round(elapsedSeconds * 1000);

        //       // Calculate rank from leaderboard data
        //       let rank = null;
        //       let totalPlayers = result.top.length;

        //       // Check if player is in top list
        //       const playerInTop = result.top.findIndex(entry => entry.player_id === currentPlayerId);
        //       if (playerInTop !== -1) {
        //         rank = playerInTop + 1;
        //       } else if (result.me) {
        //         // Player not in top list but has a score
        //         // Count how many in top list are faster
        //         const fasterCount = result.top.filter(entry => entry.best_time_ms < playerTimeMs).length;
        //         rank = fasterCount + 1;
        //         totalPlayers = result.top.length + 1; // Approximate (at least this many)
        //       }

        //       if (!rank || totalPlayers < 2) return;

        //       const percentBeaten = Math.round(((totalPlayers - rank) / (totalPlayers - 1)) * 100);
        //       const playersSlowerThan = totalPlayers - rank;

        //       const rankEl = document.createElement('div');
        //       rankEl.className = 'stage-meta stage-rank-message';

        //       if (rank === 1) {
        //         rankEl.innerHTML = `<span class="rank-first">#1 out of ${totalPlayers}+ players!</span>`;
        //       } else if (percentBeaten >= 80) {
        //         rankEl.innerHTML = `<span class="rank-top">Top ${100 - percentBeaten}%! Better than ${playersSlowerThan}+ players</span>`;
        //       } else {
        //         rankEl.innerHTML = `<span class="rank-above-average">Better than ${percentBeaten}% of top players</span>`;
        //       }

        //       timeMetaEl.parentNode.appendChild(rankEl);
        //     })
        //     .catch(error => {
        //       console.error('Error displaying rank:', error);
        //     });
        // }

      }

      function refreshResultAutoActionCountdown() {
        if (typeof window.refreshResultAutoActionCountdown === "function") {
          window.refreshResultAutoActionCountdown();
        }
      }

      function lockInputs(locked) {
        inputGrid.querySelectorAll("input").forEach((input) => {
          input.disabled = locked;
        });
      }

      function getDefaultStatsPayload() {
        return {
          totalSeconds: 0,
          totalCards: 0,
          totalLevelAttempts: 0,
          totalLevelSuccesses: 0,
          failedLevelCount: 0,
          sandboxPlayed: false,
          sandboxCompletedCount: 0,
          flashCompletedCount: 0,
          tutorialCompletedCount: 0,
          challengeCompletedCount: 0,
          cardTypeCounts: {},
          modifierVariantCounts: {}
        };
      }

      function normalizeStatsCounterMap(source) {
        const normalized = {};
        const input = source && typeof source === "object" ? source : {};
        Object.keys(input).forEach((key) => {
          const value = Math.max(0, Math.floor(Number(input[key]) || 0));
          if (value > 0) {
            normalized[key] = value;
          }
        });
        return normalized;
      }

      function mergeStatsCounterMaps(target, source) {
        const next = normalizeStatsCounterMap(target);
        const incoming = normalizeStatsCounterMap(source);
        Object.keys(incoming).forEach((key) => {
          next[key] = (Number(next[key]) || 0) + incoming[key];
        });
        return next;
      }

      function ensureSessionStatsObject() {
        if (!window.flashRecallSessionStats || typeof window.flashRecallSessionStats !== "object") {
          window.flashRecallSessionStats = getDefaultStatsPayload();
          return;
        }
        window.flashRecallSessionStats.totalSeconds = Number(window.flashRecallSessionStats.totalSeconds) || 0;
        window.flashRecallSessionStats.totalCards = Number(window.flashRecallSessionStats.totalCards) || 0;
        window.flashRecallSessionStats.totalLevelAttempts = Number(window.flashRecallSessionStats.totalLevelAttempts) || 0;
        window.flashRecallSessionStats.totalLevelSuccesses = Number(window.flashRecallSessionStats.totalLevelSuccesses) || 0;
        window.flashRecallSessionStats.failedLevelCount = Number(window.flashRecallSessionStats.failedLevelCount) || 0;
        window.flashRecallSessionStats.sandboxPlayed = Boolean(window.flashRecallSessionStats.sandboxPlayed);
        window.flashRecallSessionStats.sandboxCompletedCount = Number(window.flashRecallSessionStats.sandboxCompletedCount) || 0;
        window.flashRecallSessionStats.flashCompletedCount = Number(window.flashRecallSessionStats.flashCompletedCount) || 0;
        window.flashRecallSessionStats.tutorialCompletedCount = Number(window.flashRecallSessionStats.tutorialCompletedCount) || 0;
        window.flashRecallSessionStats.challengeCompletedCount = Number(window.flashRecallSessionStats.challengeCompletedCount) || 0;
        window.flashRecallSessionStats.cardTypeCounts = normalizeStatsCounterMap(window.flashRecallSessionStats.cardTypeCounts);
        window.flashRecallSessionStats.modifierVariantCounts = normalizeStatsCounterMap(window.flashRecallSessionStats.modifierVariantCounts);
      }

      function loadStoredStatsPayload() {
        const payload = getDefaultStatsPayload();
        try {
          const statsKey = typeof window.getStatsStorageKey === "function"
            ? window.getStatsStorageKey()
            : "flashRecallStats";
          const raw = window.localStorage.getItem(statsKey);
          if (!raw) return payload;
          const parsed = JSON.parse(raw);
          if (!parsed || typeof parsed !== "object") return payload;
          payload.totalSeconds = Number(parsed.totalSeconds) || 0;
          payload.totalCards = Number(parsed.totalCards) || 0;
          payload.totalLevelAttempts = Number(parsed.totalLevelAttempts) || 0;
          payload.totalLevelSuccesses = Number(parsed.totalLevelSuccesses) || 0;
          payload.failedLevelCount = Number(parsed.failedLevelCount) || 0;
          payload.sandboxPlayed = Boolean(parsed.sandboxPlayed);
          payload.sandboxCompletedCount = Number(parsed.sandboxCompletedCount) || 0;
          payload.flashCompletedCount = Number(parsed.flashCompletedCount) || 0;
          payload.tutorialCompletedCount = Number(parsed.tutorialCompletedCount) || 0;
          payload.challengeCompletedCount = Number(parsed.challengeCompletedCount) || 0;
          payload.cardTypeCounts = normalizeStatsCounterMap(parsed.cardTypeCounts);
          payload.modifierVariantCounts = normalizeStatsCounterMap(parsed.modifierVariantCounts);
          return payload;
        } catch (error) {
          return getDefaultStatsPayload();
        }
      }

      function saveStoredStatsPayload(payload) {
        try {
          const statsKey = typeof window.getStatsStorageKey === "function"
            ? window.getStatsStorageKey()
            : "flashRecallStats";
          window.localStorage.setItem(statsKey, JSON.stringify(payload));
        } catch (error) {
          // ignore storage errors
        }
      }

      function recordRoundStats(seconds, cardCount) {
        if (!Number.isFinite(seconds) || !Number.isFinite(cardCount) || cardCount <= 0) return;
        ensureSessionStatsObject();
        window.flashRecallSessionStats.totalSeconds += seconds;
        window.flashRecallSessionStats.totalCards += cardCount;
        const payload = loadStoredStatsPayload();
        payload.totalSeconds += seconds;
        payload.totalCards += cardCount;
        saveStoredStatsPayload(payload);
      }

      function recordCorrectCardAchievementProgress(entries, roundModifierKeys = []) {
        const safeEntries = Array.isArray(entries) ? entries : [];
        const roundModifiers = Array.isArray(roundModifierKeys) ? roundModifierKeys : [];
        const correctEntries = safeEntries.filter((entry) => entry && entry.correct);
        if (!correctEntries.length) return;
        const snapshot = {
          cardTypeCounts: {},
          modifierVariantCounts: {}
        };
        const perRoundModifiers = new Set(["swapCards", "platformer", "glitch", "fog", "blur", "ads"]);
        correctEntries.forEach((entry) => {
          if (entry.category) {
            snapshot.cardTypeCounts[entry.category] = (Number(snapshot.cardTypeCounts[entry.category]) || 0) + 1;
          }
          const entryModifiers = Array.isArray(entry.achievementModifiers) ? entry.achievementModifiers : [];
          entryModifiers.forEach((modifierKey) => {
            snapshot.modifierVariantCounts[modifierKey] = (Number(snapshot.modifierVariantCounts[modifierKey]) || 0) + 1;
          });
          roundModifiers.forEach((modifierKey) => {
            if (!perRoundModifiers.has(modifierKey)) return;
            snapshot.modifierVariantCounts[modifierKey] = (Number(snapshot.modifierVariantCounts[modifierKey]) || 0) + 1;
          });
        });
        ensureSessionStatsObject();
        const payload = loadStoredStatsPayload();
        window.flashRecallSessionStats.cardTypeCounts = mergeStatsCounterMaps(
          window.flashRecallSessionStats.cardTypeCounts,
          snapshot.cardTypeCounts
        );
        window.flashRecallSessionStats.modifierVariantCounts = mergeStatsCounterMaps(
          window.flashRecallSessionStats.modifierVariantCounts,
          snapshot.modifierVariantCounts
        );
        payload.cardTypeCounts = mergeStatsCounterMaps(payload.cardTypeCounts, snapshot.cardTypeCounts);
        payload.modifierVariantCounts = mergeStatsCounterMaps(payload.modifierVariantCounts, snapshot.modifierVariantCounts);
        saveStoredStatsPayload(payload);
      }

      function recordSandboxPlayedStat() {
        ensureSessionStatsObject();
        if (window.flashRecallSessionStats.sandboxPlayed) {
          return;
        }
        window.flashRecallSessionStats.sandboxPlayed = true;
        const payload = loadStoredStatsPayload();
        if (!payload.sandboxPlayed) {
          payload.sandboxPlayed = true;
          saveStoredStatsPayload(payload);
        }
      }

      function recordSandboxCompletionStat() {
        ensureSessionStatsObject();
        window.flashRecallSessionStats.sandboxCompletedCount += 1;
        const payload = loadStoredStatsPayload();
        payload.sandboxCompletedCount = (Number(payload.sandboxCompletedCount) || 0) + 1;
        saveStoredStatsPayload(payload);
      }

      function recordFlashCompletionStat() {
        ensureSessionStatsObject();
        window.flashRecallSessionStats.flashCompletedCount += 1;
        const payload = loadStoredStatsPayload();
        payload.flashCompletedCount = (Number(payload.flashCompletedCount) || 0) + 1;
        saveStoredStatsPayload(payload);
      }

      function recordTutorialCompletionStat() {
        ensureSessionStatsObject();
        window.flashRecallSessionStats.tutorialCompletedCount += 1;
        const payload = loadStoredStatsPayload();
        payload.tutorialCompletedCount = (Number(payload.tutorialCompletedCount) || 0) + 1;
        saveStoredStatsPayload(payload);
      }

      function recordChallengeCompletionStat() {
        ensureSessionStatsObject();
        window.flashRecallSessionStats.challengeCompletedCount += 1;
        const payload = loadStoredStatsPayload();
        payload.challengeCompletedCount = (Number(payload.challengeCompletedCount) || 0) + 1;
        saveStoredStatsPayload(payload);
      }

      function recordLevelAttemptStats(success, options = {}) {
        ensureSessionStatsObject();
        window.flashRecallSessionStats.totalLevelAttempts += 1;
        if (success) {
          window.flashRecallSessionStats.totalLevelSuccesses += 1;
        } else if (options.countFailure !== false) {
          window.flashRecallSessionStats.failedLevelCount += 1;
        }
        const payload = loadStoredStatsPayload();
        payload.totalLevelAttempts += 1;
        if (success) {
          payload.totalLevelSuccesses += 1;
        } else if (options.countFailure !== false) {
          payload.failedLevelCount += 1;
        }
        saveStoredStatsPayload(payload);
      }
      window.recordLevelAttemptStats = recordLevelAttemptStats;
      window.recordSandboxPlayedStat = recordSandboxPlayedStat;

      let answerCheckPending = false;
      async function checkAnswers() {
        if (phase !== "recall" || answerCheckPending) return;
        answerCheckPending = true;
        try {
        if (swapTimeoutId) {
          clearTimeout(swapTimeoutId);
          swapTimeoutId = null;
          swapStartTime = null;
          swapRemaining = null;
          swapStartRecall = null;
        }
        clearInterval(timerId);
        timerId = null;
        const platformerRequired = platformerState.required;
        const roundTimeSpent = (performance.now() - roundStartTime) / 1000;
        recordRoundStats(roundTimeSpent, roundItems.length);
        const activeRoundModifiers =
          typeof window.getCurrentModifierKeys === "function" ? window.getCurrentModifierKeys() : [];
        const entries = roundItems.map((item, index) => {
          const mappedIndex = swapMap ? swapMap[index] : index;
          const expectedItem = roundItems[mappedIndex];
          const input = inputGrid.querySelector(`input[data-index="${index}"]`);
          const raw = input ? input.value : "";
          const actual = normalize(raw);
          return {
            displayIndex: mappedIndex + 1,
            swappedWith: swapMap && mappedIndex !== index ? index + 1 : null,
            expected: buildExpectedLabel(expectedItem),
            actual,
            raw,
            correct: isCorrectAnswer(expectedItem, raw),
            category: expectedItem.category,
            answer: expectedItem.label || expectedItem,
            achievementModifiers: Array.isArray(expectedItem.achievementModifiers)
              ? expectedItem.achievementModifiers.slice()
              : []
          };
        });
        recordCorrectCardAchievementProgress(entries, activeRoundModifiers);
        const challengeResults = window.MemoryChallenges ? window.MemoryChallenges.evaluate() : [];
        window.__lastMemoryChallengeResults = challengeResults;
        if (window.MemoryChallenges) window.MemoryChallenges.setCardResult(entries.every(entry => entry.correct));
        lockInputs(true);
        if (isFreePlayMode() && typeof window.syncAchievementsFromLocal === "function") {
          window.syncAchievementsFromLocal({ usedModifiers: activeRoundModifiers });
        }
        window.__lastEntries = entries;
        const allCorrect =
          (!platformerRequired || (platformerState.completed && !platformerState.failed)) &&
          entries.every((entry) => entry.correct) && challengeResults.every(result => result.correct);
        window.__lastAllCorrect = allCorrect;
        updatePlatformerVisibility(false);
        if (allCorrect) {
          playRoundCorrectSound();
          const flowToken = roundFlowToken;
          await playSuccessAnimation();
          if (flowToken !== roundFlowToken) {
            return;
          }
          if (gameMode === "stages") {
            const stage = window.getStageConfig ? window.getStageConfig(stageState.index) : null;
            const stageRounds = stage && stage.rounds ? stage.rounds : 1;
            if (round >= stageRounds) {
              stageState.completed = true;
              stageState.failed = false;
              if (stage && stage.id === 1) {
                markStage1RecallLockSeen();
              }
              const elapsedSeconds = Number.isFinite(stageState.elapsedSeconds)
                ? stageState.elapsedSeconds
                : (performance.now() - (stageState.startTime || performance.now())) / 1000;
              stageState.elapsedMs = elapsedSeconds * 1000;
              const stars = getStageStars(elapsedSeconds, stage);
          stageState.lastStars = stars;
          const saveResult = saveStageStars(stage, stars, elapsedSeconds);
          if (typeof window.updateStageLeaderboard === "function") {
            const stageId = stage && stage.id ? String(stage.id) : String(stageState.index + 1);
            const stageVersion = window.getStageVersion ? window.getStageVersion(stage) : 1;
            const name = typeof window.getPlayerName === "function" ? window.getPlayerName() : "";
            const leaderboardWrite = window.updateStageLeaderboard(stageId, stageVersion, elapsedSeconds, name);
            if (leaderboardWrite && typeof leaderboardWrite.then === "function") {
              leaderboardWrite.then(() => {
                if (typeof window.renderStageLeaderboard === "function") {
                  window.renderStageLeaderboard(stage, stageState.index, "stageClearLeaderboardList", "stageClearLeaderboardEmpty");
                }
              });
            }
          }
              // Analytics: Track level session
              recordLevelAttemptStats(true);
              if (typeof window.registerAdaptiveSuccessForStage === "function") {
                window.registerAdaptiveSuccessForStage(stageState.index);
              }
              const stageType = String(stage && stage.stageType ? stage.stageType : "").toLowerCase();
              if (stageType === "flash") {
                recordFlashCompletionStat();
              } else if (stageType === "tutorial") {
                recordTutorialCompletionStat();
              } else if (stageType === "challenge") {
                recordChallengeCompletionStat();
              }
              if (typeof trackLevelSession === 'function') {
                const activeContext = typeof window.getActiveLevelContext === "function"
                  ? window.getActiveLevelContext()
                  : null;
                trackLevelSession(stageState.index, true, stars, elapsedSeconds, entries, "level_end", activeContext || {});
              }
              playLevelCompletedSound();
              if (typeof window.setBackgroundMusicMode === "function") {
                window.setBackgroundMusicMode("off");
              }
              if (typeof window.scheduleMenuMusicFadeIn === "function") {
                window.scheduleMenuMusicFadeIn(3000);
              }
              lastCompletedLevel = stageState.index + 1;
              lockInputs(true);
              renderCards(true);
              showStageComplete(elapsedSeconds, stars, stage, {
                showBest: Boolean(saveResult && saveResult.hadBest),
                isFirstClear: Boolean(saveResult && saveResult.isFirstClear),
                isNewBest: Boolean(saveResult && saveResult.isNewBest),
                isNewScore: Boolean(saveResult && saveResult.isNewScore)
              });
              if (submitBtn) {
                submitBtn.disabled = true;
              }
              if (nextBtn) {
                nextBtn.disabled = false;
                nextBtn.textContent = "Back to stages";
              }
              setPhase("Stage complete", "result");
              refreshResultAutoActionCountdown();
              updateScore();
              return;
            }
            // Track the current successful round before moving to next
            const roundTimeSpent = (performance.now() - roundStartTime) / 1000;
            if (typeof trackRoundCompletion === 'function') {
              trackRoundCompletion(round, true, roundTimeSpent, {
                mode: gameMode,
                level_number: stageState.index + 1
              });
            }
            if (typeof window.setPreviousRoundItems === "function") {
              const ordered = swapMap ? swapMap.map((idx) => roundItems[idx]) : roundItems;
              window.setPreviousRoundItems(ordered);
            }
            startRound();
            return;
          }
          if (gameMode === "practice") {
            recordSandboxCompletionStat();
            if (typeof window.syncAchievementsFromLocal === "function") {
              window.syncAchievementsFromLocal();
            }
          }
          streak += 1;
          updateScore();
          if (typeof window.setPreviousRoundItems === "function") {
            const ordered = swapMap ? swapMap.map((idx) => roundItems[idx]) : roundItems;
            window.setPreviousRoundItems(ordered);
          }
          startRound();
          return;
        }
        playRoundWrongSound();
        if (gameMode === "stages") {
          if (typeof window.setBackgroundMusicMode === "function") {
            window.setBackgroundMusicMode("off");
          }
          const stage = window.getStageConfig ? window.getStageConfig(stageState.index) : null;
          lockInputs(true);
          const swapOrder = swapMap ? swapMap.slice() : null;
          swapActive = false;
          swapPair = null;
          swapMap = null;
          if (swapCleanup) {
            swapCleanup();
            swapCleanup = null;
          }
          showReviewFailure(entries, "stages", swapOrder);
          if (submitBtn) {
            submitBtn.disabled = true;
          }
          if (nextBtn) {
            nextBtn.disabled = false;
            nextBtn.textContent = "Retry stage";
          }
          if (typeof trackRoundCompletion === "function") {
            trackRoundCompletion(round, false, roundTimeSpent, {
              mode: gameMode,
              level_number: stageState.index + 1
            });
          }
          stageState.failed = true;
          stageState.completed = false;
          stageState.active = false;
          if (stage && stage.id === 1) {
            markStage1RecallLockSeen();
          }
          stopStageStopwatch();
          streak = 0;
          // Analytics: Track level failure
          const failedElapsedSeconds = Number.isFinite(stageState.elapsedSeconds)
            ? stageState.elapsedSeconds
            : (performance.now() - (stageState.startTime || performance.now())) / 1000;
          recordLevelAttemptStats(false);
          if (typeof window.registerAdaptiveFailureForStage === "function") {
            window.registerAdaptiveFailureForStage(stageState.index);
          }
          if (typeof trackLevelSession === 'function') {
            const activeContext = typeof window.getActiveLevelContext === "function"
              ? window.getActiveLevelContext()
              : null;
            trackLevelSession(stageState.index, false, 0, failedElapsedSeconds, entries, "level_end", activeContext || {});
          }
          setPhase("Round complete", "result");
          refreshResultAutoActionCountdown();
          updateScore();
          return;
        }
        if (isFreePlayMode()) {
          if (typeof window.setBackgroundMusicMode === "function") {
            window.setBackgroundMusicMode("off");
          }
          if (typeof trackRoundCompletion === "function") {
            trackRoundCompletion(round, false, roundTimeSpent, {
              mode: gameMode
            });
          }
          lockInputs(true);
          const swapOrder = swapMap ? swapMap.slice() : null;
          swapActive = false;
          swapPair = null;
          swapMap = null;
          if (swapCleanup) {
            swapCleanup();
            swapCleanup = null;
          }
          showReviewFailure(entries, gameMode, swapOrder);
          if (submitBtn) {
            submitBtn.disabled = true;
          }
          if (nextBtn) {
            nextBtn.disabled = true;
          }
          streak = 0;
          setPhase("Round complete", "result");
          refreshResultAutoActionCountdown();
          updateScore();
          return;
        }
        if (typeof window.setBackgroundMusicMode === "function") {
          window.setBackgroundMusicMode("off");
        }
        lockInputs(true);
        swapActive = false;
        swapPair = null;
        swapMap = null;
        if (swapCleanup) {
          swapCleanup();
          swapCleanup = null;
        }
        renderCards(true);
        if (submitBtn) {
          submitBtn.disabled = true;
        }
        if (nextBtn) {
          nextBtn.disabled = false;
        }
        if (nextBtn) {
          if (gameMode === "stages") {
            nextBtn.textContent = "Retry stage";
          } else {
            nextBtn.textContent = "Next round";
          }
        }
        streak = 0;
        setPhase("Round complete", "result");
        refreshResultAutoActionCountdown();
        updateScore();
        } finally {
          answerCheckPending = false;
        }
      }

      function beginRecallPhase() {
        if (phase !== "show") return;
        clearInterval(timerId);
        timerId = null;
        sequenceRevealActive = false;
        clearAdTimer();
        if (swapTimeoutId) {
          clearTimeout(swapTimeoutId);
          swapTimeoutId = null;
          swapStartTime = null;
          swapRemaining = null;
          swapStartRecall = null;
        }
        if (swapCleanup) {
          swapCleanup();
          swapCleanup = null;
        }
        if (adEnabled && !adShownThisRound) {
          pendingSkipAfterAd = true;
          showAd();
          return;
        }
        hideAd();
        stopFog();
        stopBlur();
        stopSequenceModifier();
        stopGlitching();
        if (platformerState.required && !platformerState.completed) {
          platformerState.failed = true;
          playRoundWrongSound();
          if (typeof window.setBackgroundMusicMode === "function") {
            window.setBackgroundMusicMode("off");
          }
          lockInputs(true);
          renderCards(true);
          if (submitBtn) {
            submitBtn.disabled = true;
          }
          if (nextBtn) {
            nextBtn.disabled = false;
            if (gameMode === "stages") {
              nextBtn.textContent = "Retry stage";
            } else {
              nextBtn.textContent = "Next round";
            }
          }
          if (gameMode === "stages") {
            const stage = window.getStageConfig ? window.getStageConfig(stageState.index) : null;
            const entries = roundItems.map((item) => ({
              expected: buildExpectedLabel(item),
              actual: "",
              correct: false
            }));
            stageState.failed = true;
            stageState.completed = false;
            stageState.active = false;
            if (stage && stage.id === 1) {
              markStage1RecallLockSeen();
            }
            streak = 0;
            stopStageStopwatch();
            const failedElapsedSeconds = Number.isFinite(stageState.elapsedSeconds)
              ? stageState.elapsedSeconds
              : (performance.now() - (stageState.startTime || performance.now())) / 1000;
            recordLevelAttemptStats(false);
            if (typeof window.registerAdaptiveFailureForStage === "function") {
              window.registerAdaptiveFailureForStage(stageState.index);
            }
            if (typeof trackLevelSession === "function") {
              const activeContext = typeof window.getActiveLevelContext === "function"
                ? window.getActiveLevelContext()
                : null;
              trackLevelSession(stageState.index, false, 0, failedElapsedSeconds, entries, "level_end", activeContext || {});
            }
            showReviewFailure(entries, "stages");
          } else {
            const entries = roundItems.map((item) => ({
              expected: buildExpectedLabel(item),
              actual: "",
              correct: false
            }));
            showReviewFailure(entries, gameMode);
            streak = 0;
          }
          setPhase("Round complete", "result");
          refreshResultAutoActionCountdown();
          updateScore();
          updatePlatformerVisibility(false);
          return;
        }
        updatePlatformerVisibility(false);
        swapActive = false;
        swapPair = null;
        swapMap = null;
        // Spatial rounds always answer in their original memorization order.
        const fixedSpatialOrder = window.ScatterLayout && window.ScatterLayout.isActive();
        if (swapEnabled && roundItems.length > 1 && !fixedSpatialOrder && Math.random() < swapChance) {
          swapPair = pickSwapPair(roundItems.length);
          if (swapPair) {
            swapMap = roundItems.map((_, idx) => idx);
            swapMap[swapPair[0]] = swapPair[1];
            swapMap[swapPair[1]] = swapPair[0];
            swapActive = true;
          }
        }
        if (swapActive && typeof window.applyPreviousCardSwap === "function") {
          window.applyPreviousCardSwap(swapMap);
        }
        if (timerFill) {
          timerFill.style.width = "100%";
        }
        renderCards(false);
        if (swapActive) {
          setPhase("Swapping...", "recall");
        }
        const startRecall = () => {
          lockInputs(false);
          const recallSubmitDelayMs = 0;
          const isStage1 =
            gameMode === "stages" &&
            typeof window.getStageConfig === "function" &&
            (window.getStageConfig(stageState.index) || {}).id === 1;
          const recallLockSeen = hasStage1RecallLockSeen();
          const shouldApplySubmitLock = isStage1 && !recallLockSeen;
          if (shouldApplySubmitLock) {
            recallSubmitLockUntil = performance.now() + recallSubmitDelayMs;
            if (submitBtn) {
              submitBtn.disabled = true;
              setTimeout(() => {
                if (phase === "recall" && submitBtn) {
                  submitBtn.disabled = false;
                }
              }, recallSubmitDelayMs);
            }
          } else {
            recallSubmitLockUntil = 0;
            if (submitBtn) {
              submitBtn.disabled = false;
            }
          }
          setPhase("Type what you saw", "recall");
          focusFirstInput();
          setTimer(getRecallSeconds(), "Recall", () => {
            checkAnswers();
          });
        };
        renderInputs();
        lockInputs(true);
        if (swapActive && swapPair) {
          animateSwap(swapPair[0], swapPair[1]);
          swapStartRecall = startRecall;
          swapRemaining = swapAnimationDuration + 200;
          swapStartTime = performance.now();
          if (gameMode === "stages" && stageState.active) {
            stopStageStopwatch();
            swapStagePauseStart = swapStartTime;
            swapStagePauseAccumulated = 0;
          }
          swapTimeoutId = setTimeout(() => {
            swapTimeoutId = null;
            swapStartTime = null;
            swapRemaining = null;
            swapStartRecall = null;
            if (gameMode === "stages" && stageState.active && typeof stageState.startTime === "number") {
              const swapElapsed = swapStagePauseStart
                ? performance.now() - swapStagePauseStart
                : 0;
              stageState.startTime += swapStagePauseAccumulated + swapElapsed;
              swapStagePauseStart = null;
              swapStagePauseAccumulated = 0;
              startStageStopwatch();
            }
            if (swapCleanup) {
              swapCleanup();
              swapCleanup = null;
            }
            startRecall();
          }, swapRemaining);
          return;
        }
        swapStartRecall = null;
        swapCleanup = null;
        startRecall();
      }

      const STAGE1_RECALL_LOCK_KEY = "flashRecallStage1RecallLockUsed";
      function hasStage1RecallLockSeen() {
        try {
          if (window.localStorage.getItem(STAGE1_RECALL_LOCK_KEY) === "1") {
            stage1RecallSubmitLockUsed = true;
            return true;
          }
        } catch {
          // ignore storage errors
        }
        stage1RecallSubmitLockUsed = false;
        return false;
      }

      function markStage1RecallLockSeen() {
        if (stage1RecallSubmitLockUsed) return;
        stage1RecallSubmitLockUsed = true;
        try {
          window.localStorage.setItem(STAGE1_RECALL_LOCK_KEY, "1");
        } catch {
          // ignore storage errors
        }
      }

      function isSequenceStage() {
        if (gameMode !== "stages") return false;
        const stage = window.getStageConfig ? window.getStageConfig(stageState.index) : null;
        return Boolean(stage && String(stage.stageType).toLowerCase() === "sequence");
      }

      function renderSequenceCard(index) {
        if (!Array.isArray(roundItems) || !roundItems.length) {
          cardGrid.innerHTML = "";
          return;
        }
        const originalItems = roundItems;
        const item = originalItems[index] || originalItems[0];
        roundItems = [item];
        renderCards(true);
        roundItems = originalItems;
      }

      function advanceSequenceReveal() {
        if (!sequenceRevealActive) return;
        sequenceRevealIndex += 1;
        if (sequenceRevealIndex >= roundItems.length) {
          sequenceRevealActive = false;
          beginRecallPhase();
          return;
        }
        renderSequenceCard(sequenceRevealIndex);
        setTimer(sequenceRevealSeconds, "Reveal", advanceSequenceReveal);
      }

      function startSequenceReveal(revealSeconds) {
        sequenceRevealActive = true;
        sequenceRevealIndex = 0;
        sequenceRevealSeconds = revealSeconds;
        renderSequenceCard(sequenceRevealIndex);
        setTimer(sequenceRevealSeconds, "Reveal", advanceSequenceReveal);
      }

      function startRound(options = {}) {
        const { reuseItems = false, advanceRound = true } = options;
        sandboxResultStreak = null;
        if (typeof window.clearTabKeyHint === "function") {
          window.clearTabKeyHint();
        }
        if (typeof window.clearFirstLetterHint === "function") {
          window.clearFirstLetterHint();
        }
        if (typeof window.setBackgroundMusicMode === "function") {
          window.setBackgroundMusicMode("level");
        }
        if (typeof window.beginRareEventGracePeriod === "function") {
          window.beginRareEventGracePeriod();
        }
        document.body.classList.remove("stage-fail");
        if (gameMode === "stages" && !options.__flashOverride) {
          const stage = window.getStageConfig ? window.getStageConfig(stageState.index) : null;
          if (stage && String(stage.stageType).toLowerCase() === "flash" && typeof window.startFlashRound === "function") {
            window.startFlashRound();
            return;
          }
        }
        if (gameMode === "stages") {
          const stage = window.getStageConfig ? window.getStageConfig(stageState.index) : null;
          if (!stage) {
            setPhase("No stages configured", "idle");
            return;
          }
          if (!stageState.active) {
            stageState.active = true;
            stageState.startTime = performance.now();
            stageState.completed = false;
            stageState.failed = false;
            if (typeof window.resetStageRoundOverridePlan === "function") {
              window.resetStageRoundOverridePlan();
            }
            startStageStopwatch();
            stageState.attempts = (stageState.attempts || 1) + 1;
            if (typeof trackLevelStart === "function") {
              trackLevelStart(stageState.index, {
                mode: gameMode,
                attempt_number: stageState.attempts,
                stage_name: stage && stage.name ? stage.name : null
              });
            }

          }
          const stageRounds = stage.rounds || 1;
          if (advanceRound && round >= stageRounds) {
            return;
          }
        }
        const nextRound = advanceRound ? round + 1 : round;
        const categories = getActiveCategories(nextRound);
        if (!categories.length) {
          setPhase("Select at least one card type", "idle");
          return;
        }
        if (advanceRound) {
          round += 1;
        }
        roundStartTime = performance.now();
        updateScore();
        resetBoard();
        if (window.ScatterLayout) window.ScatterLayout.reset();
        if (!reuseItems) {
          roundItems = pickItems();
          if (gameMode === "aminoAcids") {
            const formats = getSelectedAminoAnswerFormats();
            roundItems.forEach(item => {
              item.aminoAnswerFormat = formats[Math.floor(Math.random() * formats.length)] || "label";
            });
          }
          roundItemsBase = roundItems.map((item) => ({ ...item }));
        } else {
          roundItems = roundItemsBase.map((item) => ({ ...item }));
        }
        if (advanceRound && gameMode === "stages") {
          const stage = window.getStageConfig ? window.getStageConfig(stageState.index) : null;
          if (stage && (stage.noRepeatAcrossRounds || stage.noRepeatABAPatterns)) {
            priorRoundItems = lastRoundItems;
            priorRoundStageId = lastRoundStageId;
            lastRoundItems = roundItems.map((item) => ({
              category: item.category,
              label: item.label
            }));
            lastRoundStageId = stage.id;
          } else {
            lastRoundItems = null;
            lastRoundStageId = null;
            priorRoundItems = null;
            priorRoundStageId = null;
          }
        }
        const sequenceStage = isSequenceStage();
        renderInputs();
        lockInputs(true);
        if (submitBtn) {
          submitBtn.disabled = true;
        }
        if (nextBtn) {
          nextBtn.disabled = true;
        }
        resultsPanel.classList.remove("show");
        closeStageSharePreviewModal();
        clearStageSharePreview();
        currentStageResultShareData = null;
        window.__lastMemoryChallengeResults = [];
        // Amino Acids has card-only rounds, independent of the shared extras.
        const stage = gameMode === "stages" && window.getStageConfig ? window.getStageConfig(stageState.index) : null;
        const memoryChallengeOverrides = gameMode === "aminoAcids"
          ? Object.fromEntries(Object.keys(window.MemoryChallenges.getConfig()).map(key => [key, { enabled: false }]))
          : stage && stage.memoryChallenges;
        if (window.MemoryChallenges) {
          window.MemoryChallenges.start(memoryChallengeOverrides, { reuse: reuseItems });
        }
        setPhase("Memorize the cards", "show");
        if (window.ScatterLayout) {
          renderCards(true);
          roundItems = window.ScatterLayout.begin(roundItems, window.MemoryChallenges.getConfig(memoryChallengeOverrides));
          roundItemsBase = roundItems.map(item => ({ ...item }));
          renderCards(true);
          renderInputs();
          lockInputs(true);
        }
        platformerState.required = isPlatformerEnabled();
        adEnabled = isAdEnabled();
        fogEnabled = isFogEnabled();
        blurEnabled = isBlurEnabled();
        swapEnabled = isSwapEnabled();
        swapChance = getSwapChance();
        adShownThisRound = false;
        pendingSkipAfterAd = false;
        swapActive = false;
        swapPair = null;
        swapMap = null;
        adSnapshot = null;
        hideAd();
        adActive = false;
        updatePlatformerVisibility(platformerState.required);
        startGlitching();
        if (fogEnabled) {
          startFog();
        } else {
          stopFog();
        }
        if (blurEnabled) {
          startBlur();
        } else {
          stopBlur();
        }
        const revealSeconds = getRevealSeconds();
        if (sequenceStage) {
          startSequenceReveal(revealSeconds);
          return;
        }
        renderCards(true);
        startSequenceModifier();
        scheduleAd(revealSeconds);
        setTimer(revealSeconds, "Reveal", () => {
          beginRecallPhase();
        });
      }
