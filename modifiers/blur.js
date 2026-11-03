      /*
       * Modifier: Blur reveal.
       * Uses a blur overlay with a clear "spotlight" following the cursor.
       */
      const blurOverlay = document.getElementById("fogBlur");
      const blurHasBackdrop =
        blurOverlay &&
        ((window.CSS &&
          (CSS.supports("backdrop-filter", "blur(2px)") || CSS.supports("-webkit-backdrop-filter", "blur(2px)"))) ||
          false);

      function resizeBlur() {
        // No-op for blur overlay
      }

      function drawBlur() {
        // No-op for blur overlay
      }

      function startBlur() {
        if (!blurOverlay) return;
        blurActive = true;
        blurOverlay.style.display = "block";
        blurOverlay.style.opacity = "1";
        blurLastMove = { x: null, y: null, t: 0 };
      }

      function stopBlur() {
        blurActive = false;
        if (blurOverlay) {
          blurOverlay.style.display = "none";
          blurOverlay.style.opacity = "0";
        }
      }

      function clearBlurAt(x, y, speed) {
        if (!blurOverlay) return;
        const size = 140 + Math.min(80, speed * 30);
        const outer = size + 80;
        blurOverlay.style.webkitMaskImage = `radial-gradient(circle at ${x}px ${y}px, transparent 0, transparent ${size}px, black ${outer}px)`;
        blurOverlay.style.maskImage = `radial-gradient(circle at ${x}px ${y}px, transparent 0, transparent ${size}px, black ${outer}px)`;
      }
