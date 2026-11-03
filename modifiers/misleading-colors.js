      /*
       * Modifier: Misleading color text.
       * Picks an incorrect color label to display.
       */
      function pickMisleadingLabel(actualLabel, excludeLabels = null) {
        const options = dataSets.colors
          .map((color) => color.label)
          .filter((label) => label.toLowerCase() !== actualLabel.toLowerCase());
        if (excludeLabels && excludeLabels.size) {
          const filtered = options.filter((label) => !excludeLabels.has(label));
          if (filtered.length) {
            return filtered[Math.floor(Math.random() * filtered.length)];
          }
        }
        return options[Math.floor(Math.random() * options.length)];
      }
