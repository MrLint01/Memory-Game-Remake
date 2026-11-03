const dataSets = {
        numbers: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
        colors: [
          { label: "Red", color: "#ef4444" },
          { label: "Blue", color: "#3b82f6" },
          { label: "Yellow", color: "#facc15" },
          { label: "Green", color: "#22c55e" },
          { label: "Orange", color: "#f97316" },
          { label: "Pink", color: "#ec4899" },
          { label: "Brown", color: "#8b5e34" },
          { label: "Purple", color: "#8b5cf6" }
        ],
        letters: [
          "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
          "K", "L", "M", "N", "P", "Q", "R", "S", "T",
          "U", "V", "W", "X", "Y", "Z"
        ],
        greekLetters: [
          { label: "Alpha", symbol: "α" },
          { label: "Beta", symbol: "β" },
          { label: "Gamma", symbol: "γ" },
          { label: "Delta", symbol: "δ" },
          { label: "Epsilon", symbol: "ε" },
          { label: "Zeta", symbol: "ζ" },
          { label: "Eta", symbol: "η" },
          { label: "Theta", symbol: "θ" },
          { label: "Iota", symbol: "ι" },
          { label: "Kappa", symbol: "κ" },
          { label: "Lambda", symbol: "λ" },
          { label: "Mu", symbol: "μ" },
          { label: "Nu", symbol: "ν" },
          { label: "Xi", symbol: "ξ" },
          { label: "Omicron", symbol: "ο" },
          { label: "Pi", symbol: "π" },
          { label: "Rho", symbol: "ρ" },
          { label: "Sigma", symbol: "σ" },
          { label: "Tau", symbol: "τ" },
          { label: "Upsilon", symbol: "υ" },
          { label: "Phi", symbol: "φ" },
          { label: "Chi", symbol: "χ" },
          { label: "Psi", symbol: "ψ" },
          { label: "Omega", symbol: "ω" }
        ],
        shapes: [
          { label: "Circle", shape: "circle" },
          { label: "Square", shape: "square" },
          { label: "Triangle", shape: "triangle" }
        ],
        directions: [
          { label: "Up", symbol: "↑" },
          { label: "Right", symbol: "→" },
          { label: "Left", symbol: "←" },
          { label: "Down", symbol: "↓" }
        ],
        diagonal: [
          { label: "NE" },
          { label: "NW" },
          { label: "SE" },
          { label: "SW" }
        ],
        aminoAcids: [
          // Side-chain groups follow Campbell Biology, Fig. 5.14 (cellular pH).
          // https://www.pearson.com/content/dam/one-dot-com/one-dot-com/us/en/higher-ed/en/custom-product/urry-campbell-biology-11e/pdf/urry11e-ch5.pdf#page=12
          ["Alanine", "A", "Ala", "Nonpolar"],
          ["Arginine", "R", "Arg", "Basic"],
          ["Asparagine", "N", "Asn", "Polar"],
          ["Aspartic acid", "D", "Asp", "Acidic"],
          ["Cysteine", "C", "Cys", "Polar"],
          ["Glutamine", "Q", "Gln", "Polar"],
          ["Glutamic acid", "E", "Glu", "Acidic"],
          ["Glycine", "G", "Gly", "Nonpolar"],
          ["Histidine", "H", "His", "Basic"],
          ["Isoleucine", "I", "Ile", "Nonpolar"],
          ["Leucine", "L", "Leu", "Nonpolar"],
          ["Lysine", "K", "Lys", "Basic"],
          ["Methionine", "M", "Met", "Nonpolar"],
          ["Phenylalanine", "F", "Phe", "Nonpolar"],
          ["Proline", "P", "Pro", "Nonpolar"],
          ["Serine", "S", "Ser", "Polar"],
          ["Threonine", "T", "Thr", "Polar"],
          ["Tryptophan", "W", "Trp", "Nonpolar"],
          ["Tyrosine", "Y", "Tyr", "Polar"],
          ["Valine", "V", "Val", "Nonpolar"]
        ].map(([label, oneLetterCode, threeLetterCode, sideChainType]) => ({
          label, oneLetterCode, threeLetterCode, sideChainType,
          image: `amino_acids/structures/${label.toLowerCase().replace(/ /g, "-")}.png`,
          nameAliases: label === "Aspartic acid" ? ["Aspartate"] : label === "Glutamic acid" ? ["Glutamate"] : []
        })),
        fruits: [
          { label: "Apple", image: "imgs/apple.png" },
          { label: "Banana", image: "imgs/banana.png" },
          { label: "Grape", image: "imgs/grape.png" },
          { label: "Strawberry", image: "imgs/strawberry.png" },
          { label: "Watermelon", image: "imgs/watermelon.png" }
        ]
      };
      const backgroundColors = [
        { label: "Red", color: "#ef4444" },
        { label: "Blue", color: "#3b82f6" },
        { label: "Green", color: "#22c55e" },
        { label: "Orange", color: "#f97316" },
        { label: "Pink", color: "#ec4899" },
        { label: "Brown", color: "#8b5e34" },
        { label: "Purple", color: "#8b5cf6" }
      ];
