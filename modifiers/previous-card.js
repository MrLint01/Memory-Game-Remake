      /*
       * Modifier: Previous card recall.
       * Stores previous round items so the next round can prompt them.
       */
      (() => {
        let previousRoundItems = null;

        window.setPreviousRoundItems = function setPreviousRoundItems(items) {
          if (!Array.isArray(items) || items.length === 0) {
            previousRoundItems = null;
            return;
          }
          previousRoundItems = items.map((item) => ({ ...item }));
        };

        window.getPreviousRoundItems = function getPreviousRoundItems() {
          return Array.isArray(previousRoundItems) ? previousRoundItems : null;
        };

        window.clearPreviousRoundItems = function clearPreviousRoundItems() {
          previousRoundItems = null;
        };
      })();
