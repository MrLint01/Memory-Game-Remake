      /*
       * Modifier: Background color recall.
       * Chooses a background color for non-color cards.
       */
      function pickBackgroundColor() {
        const choice = backgroundColors[Math.floor(Math.random() * backgroundColors.length)];
        if (typeof window.getAccessibleColorEntry === "function") {
          return window.getAccessibleColorEntry(choice.label, choice.color);
        }
        return choice;
      }
