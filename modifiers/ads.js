      /*
       * Modifier: Pop-up ads during reveal.
       * Manages ad timing, placement, display, and interaction lockouts.
       */
      let adStackIndex = 0;
      function showAd(options = {}) {
        const { reuseSnapshot = false } = options;
        if (!adEnabled) return;
        if (pauseModal && pauseModal.classList.contains("show")) return;
        if (phase !== "show") return;
        if (!interruptModal) return;
        if (document.activeElement && document.activeElement.blur) {
          document.activeElement.blur();
        }
        setModalState(interruptModal, true);
        interruptModal.style.display = "block";
        let targetCard = interruptCard;
        if (adActive && interruptCard) {
          targetCard = interruptCard.cloneNode(true);
          const closeBtn = targetCard.querySelector(".interrupt-close");
          if (closeBtn) {
            closeBtn.removeAttribute("id");
          }
          targetCard.dataset.adInstance = String(Date.now() + Math.random());
          interruptModal.appendChild(targetCard);
        }
        if (targetCard) {
          targetCard.style.display = "grid";
          adStackIndex += 1;
          targetCard.style.zIndex = String(50 + adStackIndex);
          positionAd(targetCard, reuseSnapshot);
        }
        adActive = true;
        adShownThisRound = true;
      }

      function hideAd(card = null) {
        if (!interruptModal) return;
        if (card && card !== interruptCard) {
          card.remove();
        } else if (card === interruptCard) {
          interruptCard.style.display = "none";
        }
        if (!card) {
          const cards = interruptModal.querySelectorAll(".interrupt-card");
          cards.forEach((node) => {
            if (node !== interruptCard) {
              node.remove();
            }
          });
          if (interruptCard) {
            interruptCard.style.display = "none";
          }
          setModalState(interruptModal, false);
          interruptModal.style.display = "none";
          adActive = false;
          adStackIndex = 0;
          return;
        }
        const remaining = interruptModal.querySelectorAll(".interrupt-card");
        const hasVisible = Array.from(remaining).some((node) => node.style.display !== "none");
        if (!hasVisible) {
          setModalState(interruptModal, false);
          interruptModal.style.display = "none";
          adActive = false;
          adStackIndex = 0;
        }
      }

      function setAdInteractive(enabled) {
        if (!interruptModal) return;
        if (interruptClose) {
          interruptClose.disabled = !enabled;
        }
        interruptModal.style.pointerEvents = enabled ? "auto" : "none";
      }

      let adIntervalId = null;
      function clearAdTimer() {
        if (adTimer) {
          clearTimeout(adTimer);
          adTimer = null;
        }
        if (adIntervalId) {
          clearInterval(adIntervalId);
          adIntervalId = null;
        }
      }

      function positionAd(card, reuseSnapshot) {
        if (!interruptModal || !card || !cardGrid) return;
        if (reuseSnapshot && card === interruptCard && adSnapshot) {
          card.style.width = `${adSnapshot.w}px`;
          card.style.minHeight = `${adSnapshot.h}px`;
          card.style.left = `${adSnapshot.left}px`;
          card.style.top = `${adSnapshot.top}px`;
          return;
        }
        const sizeOptions = [
          { w: 240, h: 140 },
          { w: 280, h: 160 },
          { w: 320, h: 180 },
          { w: 360, h: 200 }
        ];
        const chosenSize = sizeOptions[Math.floor(Math.random() * sizeOptions.length)];
        card.style.width = `${chosenSize.w}px`;
        card.style.minHeight = `${chosenSize.h}px`;
        const gridRect = cardGrid.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        const overflow = 24;
        const safePadding = 8;
        let minLeft = gridRect.left - overflow;
        let maxLeft = gridRect.right - cardRect.width + overflow;
        let minTop = gridRect.top - overflow;
        let maxTop = gridRect.bottom - cardRect.height + overflow;
        const maxLeftBound = window.innerWidth - cardRect.width - safePadding;
        const maxTopBound = window.innerHeight - cardRect.height - safePadding;
        minLeft = Math.max(minLeft, safePadding);
        maxLeft = Math.min(maxLeft, maxLeftBound);
        minTop = Math.max(minTop, safePadding);
        maxTop = Math.min(maxTop, maxTopBound);
        const left = minLeft + Math.random() * Math.max(0, maxLeft - minLeft);
        const top = minTop + Math.random() * Math.max(0, maxTop - minTop);
        card.style.left = `${left}px`;
        card.style.top = `${top}px`;
        card.style.position = "absolute";
        adSnapshot = {
          left,
          top,
          w: chosenSize.w,
          h: chosenSize.h
        };
      }

      function scheduleAd(revealSeconds) {
        clearAdTimer();
        if (!adEnabled) return;
        const minIntervalMs = 800;
        const maxIntervalMs = 1200;
        const firstDelayMs = Math.max(0, Math.min(300, revealSeconds * 1000));
        adTimer = setTimeout(() => {
          requestAnimationFrame(() => {
            showAd();
          });
          const scheduleNext = () => {
            const nextDelay = minIntervalMs + Math.random() * (maxIntervalMs - minIntervalMs);
            adIntervalId = setTimeout(() => {
              requestAnimationFrame(() => {
                showAd();
              });
              scheduleNext();
            }, nextDelay);
          };
          scheduleNext();
        }, firstDelayMs);
      }
