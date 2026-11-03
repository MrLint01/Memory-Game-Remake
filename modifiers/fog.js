      /*
       * Modifier: Fog reveal.
       * Renders a fog overlay and clears it based on cursor movement.
       */
      function resizeFog() {
        if (!fogCanvas) return;
        fogCanvas.width = window.innerWidth;
        fogCanvas.height = window.innerHeight;
      }

      let fogRegenTimer = null;

      function drawFog(options = {}) {
        if (!fogCtx || !fogCanvas) return;
        const clear = options.clear !== false;
        const alpha = Number.isFinite(options.alpha) ? options.alpha : 1;
        fogCtx.globalCompositeOperation = "source-over";
        if (clear) {
          fogCtx.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
        }
        fogCtx.globalAlpha = alpha;
        const fogCount = Math.round((fogCanvas.width * fogCanvas.height) / 40000);
        for (let i = 0; i < fogCount; i += 1) {
          const x = Math.random() * fogCanvas.width;
          const y = Math.random() * fogCanvas.height;
          const radius = 120 + Math.random() * 220;
          const gradient = fogCtx.createRadialGradient(x, y, radius * 0.2, x, y, radius);
          gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
          gradient.addColorStop(1, "rgba(255, 255, 255, 0.25)");
          fogCtx.fillStyle = gradient;
          fogCtx.beginPath();
          fogCtx.arc(x, y, radius, 0, Math.PI * 2);
          fogCtx.fill();
        }
        fogCtx.globalAlpha = 1;
      }

      function scheduleFogRegen() {
        if (fogRegenTimer) {
          window.clearInterval(fogRegenTimer);
        }
        fogRegenTimer = window.setInterval(() => {
          if (!fogActive) return;
          drawFog({ clear: false, alpha: 0.06 });
        }, 120);
      }

      function startFog() {
        if (!fogCanvas) return;
        fogActive = true;
        fogCanvas.style.zIndex = "5";
        fogCanvas.style.display = "block";
        resizeFog();
        drawFog();
        fogLastMove = { x: null, y: null, t: 0 };
        scheduleFogRegen();
      }

      function stopFog() {
        fogActive = false;
        if (fogRegenTimer) {
          window.clearInterval(fogRegenTimer);
          fogRegenTimer = null;
        }
        if (fogCanvas) {
          fogCanvas.style.display = "none";
        }
      }

      function clearFogAt(x, y, speed, lastX, lastY) {
        if (!fogCtx || !fogCanvas) return;
        const strength = Math.min(1, speed / 1.1);
        const width = 14 + strength * 36;
        fogCtx.globalCompositeOperation = "destination-out";
        fogCtx.lineCap = "round";
        fogCtx.lineJoin = "round";
        fogCtx.lineWidth = width;
        fogCtx.beginPath();
        if (lastX !== null && lastY !== null) {
          fogCtx.moveTo(lastX, lastY);
        } else {
          fogCtx.moveTo(x, y);
        }
        fogCtx.lineTo(x, y);
        fogCtx.stroke();
        fogCtx.beginPath();
        fogCtx.arc(x, y, width * 0.6, 0, Math.PI * 2);
        fogCtx.fill();
        fogCtx.globalCompositeOperation = "source-over";
      }
