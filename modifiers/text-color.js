      /*
       * Modifier: Text color recall.
       * Chooses a text color for eligible cards.
       */
      function pickTextColor(usedLabels, avoidHex) {
        const list = Array.isArray(backgroundColors) ? backgroundColors : [];
        if (!list.length) return null;
        const normalizeColor = (value) => String(value || "").trim().toLowerCase();
        const avoidValue = normalizeColor(avoidHex);
        let pool = list;
        if (usedLabels && usedLabels.size) {
          const filtered = list.filter((entry) => {
            if (!entry || !entry.label) return false;
            return !usedLabels.has(String(entry.label).toLowerCase());
          });
          if (filtered.length) {
            pool = filtered;
          }
        }
        if (avoidValue) {
          const filtered = pool.filter((entry) => {
            if (!entry) return false;
            const resolved = typeof window.getAccessibleColorEntry === "function"
              ? window.getAccessibleColorEntry(entry.label, entry.color)
              : entry;
            return normalizeColor(resolved.color) !== avoidValue;
          });
          if (filtered.length) {
            pool = filtered;
          }
        }
        const choice = pool[Math.floor(Math.random() * pool.length)];
        if (typeof window.getAccessibleColorEntry === "function") {
          return window.getAccessibleColorEntry(choice.label, choice.color);
        }
        return choice;
      }
