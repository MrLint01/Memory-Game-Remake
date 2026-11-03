      /*
       * Modifier: Card swap at recall.
       * Picks a pair to swap and animates their positions.
       */
      function pickSwapPair(count) {
        if (count < 2) return null;
        const pairs = [];
        for (let i = 0; i < count - 1; i += 1) {
          for (let j = i + 1; j < count; j += 1) {
            pairs.push([i, j]);
          }
        }
        const pick = Math.floor(Math.random() * pairs.length);
        return pairs[pick];
      }

      function animateSwap(firstIndex, secondIndex, duration = swapAnimationDuration) {
        const cards = Array.from(cardGrid.children);
        const first = cards[firstIndex];
        const second = cards[secondIndex];
        if (!first || !second) return;
        const firstRect = first.getBoundingClientRect();
        const secondRect = second.getBoundingClientRect();
        cards.forEach((card, idx) => {
          card.style.order = idx;
        });
        first.style.order = secondIndex;
        second.style.order = firstIndex;
        cardGrid.offsetHeight;
        const firstRectAfter = first.getBoundingClientRect();
        const secondRectAfter = second.getBoundingClientRect();
        const dx1 = firstRect.left - firstRectAfter.left;
        const dy1 = firstRect.top - firstRectAfter.top;
        const dx2 = secondRect.left - secondRectAfter.left;
        const dy2 = secondRect.top - secondRectAfter.top;
        const arc = Math.max(18, Math.min(48, Math.abs(dx1) * 0.35));
        first.style.setProperty("--swap-x", `${dx1}px`);
        first.style.setProperty("--swap-y", `${dy1}px`);
        first.style.setProperty("--swap-arc", `${arc}px`);
        first.style.setProperty("--swap-duration", `${duration}ms`);
        second.style.setProperty("--swap-x", `${dx2}px`);
        second.style.setProperty("--swap-y", `${dy2}px`);
        second.style.setProperty("--swap-arc", `${arc}px`);
        second.style.setProperty("--swap-duration", `${duration}ms`);
        first.classList.add("swap-arc-up");
        second.classList.add("swap-arc-down");
        swapCleanup = () => {
          first.classList.remove("swap-arc-up");
          second.classList.remove("swap-arc-down");
          first.style.removeProperty("--swap-x");
          first.style.removeProperty("--swap-y");
          first.style.removeProperty("--swap-arc");
          first.style.removeProperty("--swap-duration");
          second.style.removeProperty("--swap-x");
          second.style.removeProperty("--swap-y");
          second.style.removeProperty("--swap-arc");
          second.style.removeProperty("--swap-duration");
        };
      }
