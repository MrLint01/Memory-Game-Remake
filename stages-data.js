(() => {
  const stagesConfig = [
    {
  "id": 1,
  "version": 11,
  "name": "Stage 1",
  "stageType": "tutorial",
  "rounds": 3,
  "cards": 1,
  "noRepeatAcrossRounds": true,
  "tabTutorialEnabled": false,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "numbers",
    "letters",
    "shapes"
  ],
  "firstLetterHintMessage": "FIRST LETTER\n(Triangle -> T, Circle -> C, Square -> S)",
  "firstLetterHintRounds": [
    3
  ],
  "cardCounts": {},
  "roundOverrides": {
    "1": {
      "cards": {
        "total": 1,
        "counts": {
          "numbers": 1
        }
      }
    },
    "2": {
      "cards": {
        "total": 1,
        "counts": {
          "letters": 1
        }
      }
    },
    "3": {
      "cards": {
        "total": 1,
        "counts": {
          "shapes": 1
        }
      }
    }
  },
  "modifiers": {},
  "starTimes": {
    "platinum": 1.5,
    "gold": 3,
    "silver": 10,
    "bronze": 20
  },
  "instructions": window.stageInstructions ? window.stageInstructions[1] || [] : []
},
    {
  "id": 2,
  "version": 11,
  "name": "Stage 2",
  "stageType": "tutorial",
  "rounds": 3,
  "cards": 1,
  "noRepeatAcrossRounds": true,
  "tabTutorialEnabled": false,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "directions",
    "colors",
    "diagonal"
  ],
  "firstLetterHintByRound": {
    "1": "FIRST LETTER (Right -> R, Left -> L, Up -> U, Down -> D) \nArrow keys (↑,↓,←,→). Cardinal directions (N,E,S,W)",
    "2": "FIRST LETTER (Red -> R, Green -> G, Blue -> B, Yellow -> Y,...)"
  },
  "cardCounts": {},
  "roundOverrides": {
    "1": {
      "cards": {
        "total": 1,
        "counts": {
          "directions": 1
        }
      }
    },
    "2": {
      "cards": {
        "total": 1,
        "counts": {
          "colors": 1
        }
      }
    },
    "3": {
      "cards": {
        "total": 1,
        "counts": {
          "diagonal": 1
        }
      }
    }
  },
  "modifiers": {},
  "starTimes": {
    "platinum": 1.5,
    "gold": 3,
    "silver": 10,
    "bronze": 20
  },
  "instructions": window.stageInstructions ? window.stageInstructions[2] || [] : []
},
    {
  "id": 3,
  "version": 11,
  "name": "Stage 3",
  "stageType": "tutorial",
  "rounds": 2,
  "cards": 2,
  "noRepeatAcrossRounds": true,
  "tabTutorialEnabled": true,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "numbers",
    "letters"
  ],
  "cardCounts": {},
  "roundOverrides": {
    "1": {
      "cards": {
        "total": 2,
        "counts": {
          "numbers": 1,
          "letters": 1
        }
      }
    },
    "2": {
      "cards": {
        "total": 2,
        "counts": {
          "numbers": 1,
          "letters": 1
        }
      }
    }
  },
  "modifiers": {},
  "starTimes": {
    "platinum": 2,
    "gold": 3,
    "silver": 10,
    "bronze": 20
  },
  "instructions": window.stageInstructions ? window.stageInstructions[3] || [] : []
},
    {
  "id": 4,
  "version": 11,
  "name": "Stage 4",
  "stageType": "memory",
  "rounds": 2,
  "cards": 3,
  "noRepeatAcrossRounds": true,
  "tabTutorialEnabled": true,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "numbers",
    "letters",
    "shapes",
    "directions",
    "colors",
    "diagonal"
  ],
  "cardCounts": {},
  "roundCategoryGuarantee": [
    "numbers",
    "letters",
    "shapes",
    "directions",
    "colors",
    "diagonal"
  ],
  "modifiers": {},
  "starTimes": {
    "platinum": 3,
    "gold": 4,
    "silver": 10,
    "bronze": 20
  },
  "instructions": window.stageInstructions ? window.stageInstructions[4] || [] : []
},
    {
  "id": 5,
  "version": 11,
  "name": "Stage 5",
  "stageType": "flash",
  "rounds": 3,
  "cards": 1,
  "noRepeatAcrossRounds": true,
  "revealSeconds": 0.1,
  "recallSeconds": 20,
  "categories": [
    "numbers"
  ],
  "firstLetterHintEnabled": false,
  "modifiers": {},
  "starTimes": {
    "platinum": 2,
    "gold": 3,
    "silver": 6,
    "bronze": 10
  },
  "instructions": window.stageInstructions ? window.stageInstructions[5] || [] : []
},
    {
  "id": 6,
  "version": 11,
  "name": "Stage 6",
  "stageType": "challenge",
  "rounds": 1,
  "cards": 4,
  "noRepeatAcrossRounds": true,
  "tabTutorialEnabled": true,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "numbers",
    "letters",
    "shapes",
    "directions",
    "colors",
    "diagonal"
  ],
  "cardCounts": {},
  "roundCategoryGuarantee": [
    "numbers",
    "letters",
    "shapes",
    "directions",
    "colors",
    "diagonal"
  ],
  "modifiers": {},
  "starTimes": {
    "platinum": 3.5,
    "gold": 4,
    "silver": 10,
    "bronze": 20
  },
  "instructions": window.stageInstructions ? window.stageInstructions[6] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 7,
  "version": 11,
  "name": "Stage 7",
  "stageType": "sequence",
  "rounds": 2,
  "cards": 3,
  "noRepeatAcrossRounds": true,
  "revealSeconds": 0.2,
  "recallSeconds": 20,
  "categories": [
    "numbers"
  ],
  "cardCounts": {},
  "modifiers": {},
  "starTimes": {
    "platinum": 4,
    "gold": 5,
    "silver": 8,
    "bronze": 12
  },
  "instructions": window.stageInstructions ? window.stageInstructions[7] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 8,
  "version": 10,
  "name": "Stage 8",
  "stageType": "tutorial",
  "rounds": 3,
  "cards": 1,
  "noRepeatAcrossRounds": true,
  "uniqueCardTypesPerRound": true,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "numbers"
  ],
  "cardCounts": {},
  "modifiers": {
    "mathOps": true,
    "mathChance": 1
  },
  "starTimes": {
    "platinum": 3,
    "gold": 4,
    "silver": 8,
    "bronze": 12
  },
  "instructions": window.stageInstructions ? window.stageInstructions[8] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 9,
  "version": 10,
  "name": "Stage 9",
  "stageType": "memory",
  "rounds": 2,
  "cards": 2,
  "noRepeatAcrossRounds": true,
  "noDuplicateAnswerInitialsPerRound": true,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "numbers"
  ],
  "cardCounts": {},
  "modifiers": {
    "mathOps": true,
    "mathChance": 1,
    "mathMaxCount": 3
  },
  "starTimes": {
    "platinum": 4,
    "gold": 5,
    "silver": 8,
    "bronze": 12
  },
  "instructions": window.stageInstructions ? window.stageInstructions[9] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 10,
  "version": 10,
  "name": "Stage 10",
  "stageType": "flash",
  "rounds": 3,
  "cards": 1,
  "noRepeatAcrossRounds": true,
  "uniqueCardTypesPerRound": true,
  "revealSeconds": 0.1,
  "recallSeconds": 30,
  "categories": [
    "numbers"
  ],
  "cardCounts": {},
  "modifiers": {
    "mathOps": true,
    "mathChance": 1
  },
  "starTimes": {
    "platinum": 2.5,
    "gold": 3.5,
    "silver": 7,
    "bronze": 10
  },
  "instructions": window.stageInstructions ? window.stageInstructions[10] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 11,
  "version": 10,
  "name": "Stage 11",
  "stageType": "tutorial",
  "rounds": 3,
  "cards": 1,
  "noRepeatBackgroundAcrossRounds": true,
  "uniqueCardTypesPerRound": true,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "numbers",
    "letters",
    "shapes"
  ],
  "cardCounts": {},
  "roundCategoryGuarantee": [
    "numbers",
    "letters",
    "shapes"
  ],
  "roundOverrides": {
    "1": {
      "prompts": {
        "background": {
          "min": 1,
          "max": 1
        }
      }
    },
    "2": {
      "prompts": {
        "background": {
          "min": 1,
          "max": 1
        }
      }
    },
    "3": {
      "prompts": {
        "background": {
          "min": 1,
          "max": 1
        }
      }
    }
  },
  "modifiers": {
    "backgroundColor": true,
    "backgroundColorChance": 1,
    "backgroundPromptChance": 1
  },
  "starTimes": {
    "platinum": 2,
    "gold": 3,
    "silver": 5,
    "bronze": 10
  },
  "instructions": window.stageInstructions ? window.stageInstructions[11] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 12,
  "version": 10,
  "name": "Stage 12",
  "stageType": "challenge",
  "rounds": 2,
  "cards": 2,
  "uniqueCardTypesPerRound": true,
  "noRepeatBackgroundAcrossRounds": true,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "numbers",
    "letters",
    "directions",
    "shapes"
  ],
  "cardCounts": {},
  "roundCategoryGuarantee": [
    "numbers",
    "letters",
    "directions",
    "shapes"
  ],
  "modifiers": {
    "backgroundColor": true,
    "backgroundColorChance": 1,
    "backgroundPromptChance": 1,
    "backgroundPromptMinCount": 1,
    "backgroundPromptMaxCount": 1,
    "backgroundColorMinCount": 2,
    "backgroundColorMaxCount": 2
  },
  "starTimes": {
    "platinum": 2.5,
    "gold": 3,
    "silver": 8,
    "bronze": 10
  },
  "instructions": window.stageInstructions ? window.stageInstructions[12] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 13,
  "version": 10,
  "name": "Stage 13",
  "stageType": "flash",
  "rounds": 3,
  "cards": 1,
  "noRepeatAcrossRounds": true,
  "revealSeconds": 0.1,
  "recallSeconds": 30,
  "categories": [
    "numbers",
    "letters",
    "directions"
  ],
  "cardCounts": {},
  "roundOverridePool": [
    {
      "prompts": {
        "background": {
          "min": 1,
          "max": 1
        }
      }
    },
    {
      "prompts": {
        "background": {
          "min": 0,
          "max": 0
        }
      }
    },
    null
  ],
  "modifiers": {
    "backgroundColor": true,
    "backgroundColorChance": 1
  },
  "starTimes": {
    "platinum": 2.5,
    "gold": 3.5,
    "silver": 8,
    "bronze": 15
  },
  "instructions": window.stageInstructions ? window.stageInstructions[13] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 14,
  "version": 10,
  "name": "Stage 14",
  "stageType": "challenge",
  "rounds": 1,
  "cards": 3,
  "noRepeatAcrossRounds": true,
  "uniqueCardTypesPerRound": true,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "numbers",
    "letters",
    "directions",
    "shapes",
    "colors"
  ],
  "cardCounts": {
    "numbers": 1
  },
  "modifiers": {
    "mathOps": true,
    "mathChance": 1,
    "mathMinCount": 1,
    "mathMaxCount": 1,
    "backgroundColor": true,
    "backgroundColorChance": 1,
    "backgroundColorUniqueLabelsPerRound": true,
    "backgroundPromptMinCount": 1
  },
  "starTimes": {
    "platinum": 7,
    "gold": 10,
    "silver": 20,
    "bronze": 25
  },
  "instructions": window.stageInstructions ? window.stageInstructions[14] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 15,
  "version": 10,
  "name": "Stage 15",
  "stageType": "tutorial",
  "rounds": 3,
  "cards": 1,
  "noRepeatAcrossRounds": true,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "colors"
  ],
  "cardCounts": {},
  "roundOverridePool": [
    {
      "prompts": {
        "background": {
          "min": 1,
          "max": 1
        }
      }
    },
    {
      "prompts": {
        "background": {
          "min": 0,
          "max": 0
        }
      }
    },
    null
  ],
  "modifiers": {
    "misleadColors": true,
    "misleadChance": 1,
    "backgroundColor": true,
    "backgroundColorChance": 1
  },
  "starTimes": {
    "platinum": 2.5,
    "gold": 3.5,
    "silver": 8,
    "bronze": 15
  },
  "instructions": window.stageInstructions ? window.stageInstructions[15] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 16,
  "version": 10,
  "name": "Stage 16",
  "stageType": "memory",
  "rounds": 1,
  "cards": 3,
  "noRepeatAcrossRounds": true,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "colors"
  ],
  "cardCounts": {},
  "modifiers": {
    "misleadColors": true,
    "misleadChance": 1,
    "textLabelUniquePerRound": true,
    "backgroundColor": true,
    "backgroundColorChance": 1,
    "backgroundPromptMinCount": 1,
    "backgroundPromptMaxCount": 2
  },
  "starTimes": {
    "platinum": 3.5,
    "gold": 4.5,
    "silver": 11,
    "bronze": 20
  },
  "instructions": window.stageInstructions ? window.stageInstructions[16] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 17,
  "version": 10,
  "name": "Stage 17",
  "stageType": "flash",
  "rounds": 3,
  "cards": 1,
  "noRepeatAcrossRounds": true,
  "revealSeconds": 0.1,
  "recallSeconds": 30,
  "categories": [
    "colors"
  ],
  "cardCounts": {},
  "roundOverridePool": [
    {
      "prompts": {
        "background": {
          "min": 1,
          "max": 1
        }
      }
    },
    {
      "prompts": {
        "background": {
          "min": 0,
          "max": 0
        }
      }
    },
    null
  ],
  "modifiers": {
    "misleadColors": true,
    "misleadChance": 1,
    "backgroundColor": true,
    "backgroundColorChance": 1
  },
  "starTimes": {
    "platinum": 2.5,
    "gold": 3.5,
    "silver": 8,
    "bronze": 15
  },
  "instructions": window.stageInstructions ? window.stageInstructions[17] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 18,
  "version": 10,
  "name": "Stage 18",
  "stageType": "sequence",
  "rounds": 2,
  "cards": 3,
  "revealSeconds": 0.2,
  "recallSeconds": 20,
  "categories": [
    "numbers"
  ],
  "modifiers": {},
  "starTimes": {
    "platinum": 1.5,
    "gold": 2,
    "silver": 4,
    "bronze": 8
  },
  "instructions": window.stageInstructions ? window.stageInstructions[18] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 19,
  "version": 10,
  "name": "Stage 19",
  "stageType": "tutorial",
  "rounds": 3,
  "cards": 2,
  "noRepeatAcrossRounds": true,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "diagonal"
  ],
  "cardCounts": {},
  "modifiers": {},
  "starTimes": {
    "platinum": 4,
    "gold": 5,
    "silver": 8,
    "bronze": 12
  },
  "instructions": window.stageInstructions ? window.stageInstructions[19] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 20,
  "version": 10,
  "name": "Stage 20",
  "stageType": "challenge",
  "rounds": 1,
  "cards": 3,
  "uniqueCardTypesPerRound": true,
  "noRepeatAcrossRounds": true,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "numbers",
    "letters",
    "shapes",
    "colors",
    "diagonal"
  ],
  "cardCounts": {
    "diagonal": 1,
    "numbers": 1
  },
  "modifiers": {
    "backgroundColor": true,
    "backgroundColorChance": 1,
    "backgroundColorMinCount": 2,
    "backgroundColorMaxCount": 2,
    "backgroundPromptMinCount": 1,
    "backgroundPromptMaxCount": 1,
    "mathOps": true,
    "mathChance": 1,
    "mathMinCount": 1,
    "mathMaxCount": 1
  },
  "starTimes": {
    "platinum": 6,
    "gold": 7,
    "silver": 10,
    "bronze": 16
  },
  "instructions": window.stageInstructions ? window.stageInstructions[20] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 21,
  "version": 10,
  "name": "Stage 21",
  "stageType": "sequence",
  "rounds": 1,
  "cards": 4,
  "revealSeconds": 0.2,
  "recallSeconds": 20,
  "categories": [
    "numbers"
  ],
  "modifiers": {},
  "starTimes": {
    "platinum": 1.5,
    "gold": 2,
    "silver": 4,
    "bronze": 8
  },
  "instructions": window.stageInstructions ? window.stageInstructions[21] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 22,
  "version": 10,
  "name": "Stage 22",
  "stageType": "tutorial",
  "rounds": 3,
  "cards": 2,
  "noRepeatAcrossRounds": true,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "numbers"
  ],
  "cardCounts": {},
  "modifiers": {
    "textColor": true,
    "textColorChance": 1,
    "textPromptMinCount": 1,
    "textPromptMaxCount": 1,
    "textColorUniqueLabelsPerRound": true
  },
  "starTimes": {
    "platinum": 5,
    "gold": 6,
    "silver": 7,
    "bronze": 10
  },
  "instructions": window.stageInstructions ? window.stageInstructions[22] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 23,
  "version": 10,
  "name": "Stage 23",
  "stageType": "memory",
  "rounds": 3,
  "cards": 2,
  "noRepeatAcrossRounds": true,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "colors"
  ],
  "cardCounts": {},
  "modifiers": {
    "textColor": true,
    "textColorChance": 1,
    "textPromptMinCount": 1,
    "textPromptMaxCount": 1,
    "misleadColors": true,
    "misleadChance": 1,
    "misleadUniqueLabelsPerRound": true,
    "textLabelUniquePerRound": true,
    "textColorUniqueLabelsPerRound": true,
    "textColorAvoidCardBackground": true
  },
  "starTimes": {
    "platinum": 7,
    "gold": 8,
    "silver": 12,
    "bronze": 16
  },
  "instructions": window.stageInstructions ? window.stageInstructions[23] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 24,
  "version": 10,
  "name": "Stage 24",
  "stageType": "memory",
  "rounds": 3,
  "cards": 1,
  "noRepeatAcrossRounds": true,
  "noRepeatAnswerInitialsAcrossRounds": true,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "colors"
  ],
  "cardCounts": {},
  "roundOverridePool": [
    {
      "prompts": {
        "background": {
          "min": 1,
          "max": 1
        },
        "textColor": {
          "min": 0,
          "max": 0
        }
      }
    },
    {
      "prompts": {
        "background": {
          "min": 0,
          "max": 0
        },
        "textColor": {
          "min": 1,
          "max": 1
        }
      }
    },
    {
      "prompts": {
        "background": {
          "min": 0,
          "max": 0
        },
        "textColor": {
          "min": 0,
          "max": 0
        }
      }
    }
  ],
  "modifiers": {
    "backgroundColor": true,
    "backgroundColorChance": 1,
    "misleadColors": true,
    "misleadChance": 1,
    "misleadUniqueLabelsPerRound": true,
    "textColor": true,
    "textColorChance": 1,
    "textColorUniqueLabelsPerRound": true,
    "textColorAvoidCardBackground": true
  },
  "starTimes": {
    "platinum": 4,
    "gold": 5,
    "silver": 6,
    "bronze": 10
  },
  "instructions": window.stageInstructions ? window.stageInstructions[24] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 25,
  "version": 10,
  "name": "Stage 25",
  "stageType": "challenge",
  "rounds": 1,
  "cards": 3,
  "noRepeatAcrossRounds": true,
  "noDuplicateAnswerInitialsPerRound": true,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "colors"
  ],
  "cardCounts": {},
  "roundOverrides": {
    "1": {
      "prompts": {
        "background": {
          "min": 1,
          "max": 1
        },
        "textColor": {
          "min": 1,
          "max": 1
        }
      }
    }
  },
  "modifiers": {
    "backgroundColor": true,
    "backgroundColorChance": 1,
    "misleadColors": true,
    "misleadChance": 1,
    "misleadUniqueLabelsPerRound": true,
    "textColor": true,
    "textColorChance": 1,
    "textColorUniqueLabelsPerRound": true,
    "textColorAvoidCardBackground": true,
    "textColorNoAdjacent": true
  },
  "starTimes": {
    "platinum": 4,
    "gold": 5,
    "silver": 8,
    "bronze": 12
  },
  "instructions": window.stageInstructions ? window.stageInstructions[25] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 26,
  "version": 10,
  "name": "Stage 26",
  "stageType": "tutorial",
  "rounds": 3,
  "cards": 1,
  "noRepeatAcrossRounds": true,
  "noRepeatAnswerInitialsAcrossRounds": true,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "directions"
  ],
  "cardCounts": {},
  "modifiers": {
    "rotate": true,
    "rotateUniqueDegreesPerRound": true,
    "rotateNoRepeatPromptsAcrossRounds": true
  },
  "starTimes": {
    "platinum": 3,
    "gold": 4,
    "silver": 6,
    "bronze": 10
  },
  "instructions": window.stageInstructions ? window.stageInstructions[26] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 27,
  "version": 10,
  "name": "Stage 27",
  "stageType": "memory",
  "rounds": 2,
  "cards": 2,
  "noRepeatAcrossRounds": true,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "directions",
    "diagonal"
  ],
  "cardCounts": {},
  "modifiers": {
    "rotate": true,
    "rotateUniqueDegreesPerRound": true,
    "rotateNoRepeatPromptsAcrossRounds": true
  },
  "starTimes": {
    "platinum": 6,
    "gold": 7,
    "silver": 10,
    "bronze": 12
  },
  "instructions": window.stageInstructions ? window.stageInstructions[27] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 28,
  "version": 10,
  "name": "Stage 28",
  "stageType": "memory",
  "rounds": 1,
  "cards": 3,
  "noRepeatAcrossRounds": true,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "directions",
    "diagonal"
  ],
  "cardCounts": {},
  "modifiers": {
    "rotate": true,
    "rotateUniqueDegreesPerRound": true
  },
  "starTimes": {
    "platinum": 6,
    "gold": 7,
    "silver": 10,
    "bronze": 12
  },
  "instructions": window.stageInstructions ? window.stageInstructions[28] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 29,
  "version": 10,
  "name": "Stage 29",
  "stageType": "challenge",
  "rounds": 1,
  "cards": 4,
  "noRepeatAcrossRounds": true,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "numbers",
    "directions",
    "colors",
    "diagonal"
  ],
  "cardCounts": {
    "numbers": 1,
    "directions": 1,
    "colors": 1
  },
  "modifiers": {
    "mathOps": true,
    "mathMinCount": 1,
    "mathMaxCount": 1,
    "backgroundColor": true,
    "backgroundPromptMinCount": 1,
    "backgroundPromptMaxCount": 1,
    "misleadColors": true,
    "rotate": true,
    "rotateMinCount": 1,
    "rotateMaxCount": 1
  },
  "starTimes": {
    "platinum": 2,
    "gold": 3,
    "silver": 8,
    "bronze": 20
  },
  "instructions": window.stageInstructions ? window.stageInstructions[29] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 30,
  "version": 10,
  "name": "Stage 30",
  "stageType": "flash",
  "rounds": 3,
  "cards": 1,
  "noRepeatAcrossRounds": true,
  "revealSeconds": 0.1,
  "recallSeconds": 30,
  "categories": [
    "diagonal"
  ],
  "cardCounts": {},
  "roundOverridePool": [
    {
      "prompts": {
        "background": {
          "min": 1,
          "max": 1
        }
      }
    },
    {
      "prompts": {
        "rotate": {
          "min": 1,
          "max": 1
        }
      }
    },
    null
  ],
  "modifiers": {
    "backgroundColor": true,
    "backgroundColorChance": 1,
    "rotate": true
  },
  "starTimes": {
    "platinum": 2.5,
    "gold": 3,
    "silver": 6,
    "bronze": 10
  },
  "instructions": window.stageInstructions ? window.stageInstructions[30] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 31,
  "version": 10,
  "name": "Stage 31",
  "stageType": "tutorial",
  "rounds": 3,
  "cards": 3,
  "noRepeatAcrossRounds": true,
  "uniqueCardTypesPerRound": true,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "numbers",
    "letters",
    "directions",
    "shapes",
    "colors",
    "diagonal"
  ],
  "cardCounts": {},
  "modifiers": {
    "glitch": true
  },
  "starTimes": {
    "platinum": 4,
    "gold": 5,
    "silver": 8,
    "bronze": 12
  },
  "instructions": window.stageInstructions ? window.stageInstructions[31] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 32,
  "version": 10,
  "name": "Stage 32",
  "stageType": "challenge",
  "rounds": 1,
  "cards": 3,
  "noRepeatAcrossRounds": true,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "directions",
    "diagonal"
  ],
  "cardCounts": {},
  "modifiers": {
    "backgroundColor": true,
    "backgroundColorChance": 1,
    "backgroundPromptMinCount": 1,
    "backgroundPromptMaxCount": 1,
    "rotate": true,
    "rotateMinCount": 1,
    "rotateMaxCount": 1,
    "glitch": true
  },
  "starTimes": {
    "platinum": 2,
    "gold": 3,
    "silver": 8,
    "bronze": 20
  },
  "instructions": window.stageInstructions ? window.stageInstructions[32] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 33,
  "version": 10,
  "name": "Stage 33",
  "stageType": "challenge",
  "rounds": 1,
  "cards": 3,
  "noRepeatAcrossRounds": true,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "colors"
  ],
  "cardCounts": {},
  "roundOverrides": {
    "1": {
      "prompts": {
        "background": {
          "min": 1,
          "max": 1
        },
        "textColor": {
          "min": 1,
          "max": 1
        }
      }
    }
  },
  "modifiers": {
    "backgroundColor": true,
    "backgroundColorChance": 1,
    "misleadColors": true,
    "misleadChance": 1,
    "textLabelUniquePerRound": true,
    "textColor": true,
    "textColorChance": 1,
    "textColorUniqueLabelsPerRound": true,
    "textColorAvoidCardBackground": true,
    "glitch": true
  },
  "starTimes": {
    "platinum": 4,
    "gold": 5,
    "silver": 8,
    "bronze": 12
  },
  "instructions": window.stageInstructions ? window.stageInstructions[33] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 34,
  "version": 10,
  "name": "Stage 34",
  "stageType": "tutorial",
  "rounds": 1,
  "cards": 3,
  "noRepeatAcrossRounds": true,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "numbers",
    "letters"
  ],
  "cardCounts": {},
  "modifiers": {
    "swapCards": true
  },
  "starTimes": {
    "platinum": 2.5,
    "gold": 3.5,
    "silver": 6,
    "bronze": 10
  },
  "instructions": window.stageInstructions ? window.stageInstructions[34] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 35,
  "version": 10,
  "name": "Stage 35",
  "stageType": "sequence",
  "rounds": 2,
  "cards": 3,
  "revealSeconds": 0.2,
  "recallSeconds": 20,
  "categories": [
    "numbers",
    "letters"
  ],
  "cardCounts": {
    "numbers": 1,
    "letters": 1
  },
  "modifiers": {},
  "starTimes": {
    "platinum": 4,
    "gold": 5,
    "silver": 9,
    "bronze": 12
  },
  "instructions": window.stageInstructions ? window.stageInstructions[35] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 36,
  "version": 10,
  "name": "Stage 36",
  "stageType": "challenge",
  "rounds": 1,
  "cards": 3,
  "noRepeatAcrossRounds": true,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "colors"
  ],
  "cardCounts": {},
  "modifiers": {
    "backgroundColor": true,
    "backgroundColorChance": 1,
    "misleadColors": true,
    "misleadChance": 1,
    "textLabelUniquePerRound": true,
    "textColor": true,
    "textColorChance": 1,
    "textColorUniqueLabelsPerRound": true,
    "textColorAvoidCardBackground": true,
    "glitch": true,
    "swapCards": true,
    "backgroundPromptMinCount": 1,
    "backgroundPromptMaxCount": 1,
    "textPromptMinCount": 1,
    "textPromptMaxCount": 1
  },
  "starTimes": {
    "platinum": 4.5,
    "gold": 6,
    "silver": 10,
    "bronze": 14
  },
  "instructions": window.stageInstructions ? window.stageInstructions[36] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 37,
  "version": 10,
  "name": "Stage 37",
  "stageType": "tutorial",
  "rounds": 1,
  "cards": 4,
  "noRepeatAcrossRounds": true,
  "uniqueCardTypesPerRound": true,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "numbers",
    "letters",
    "directions",
    "shapes",
    "colors",
    "diagonal"
  ],
  "cardCounts": {},
  "modifiers": {
    "fog": true
  },
  "starTimes": {
    "platinum": 2.5,
    "gold": 3,
    "silver": 8,
    "bronze": 12
  },
  "instructions": window.stageInstructions ? window.stageInstructions[37] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 38,
  "version": 10,
  "name": "Stage 38",
  "stageType": "challenge",
  "rounds": 1,
  "cards": 3,
  "noRepeatAcrossRounds": true,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "numbers"
  ],
  "cardCounts": {},
  "modifiers": {
    "mathOps": true,
    "mathMinCount": 1,
    "mathMaxCount": 1,
    "textColor": true,
    "textColorChance": 1,
    "textColorUniqueLabelsPerRound": true,
    "textColorAvoidCardBackground": true,
    "textPromptMinCount": 1,
    "textPromptMaxCount": 1,
    "swapCards": true,
    "fog": true
  },
  "starTimes": {
    "platinum": 6,
    "gold": 7,
    "silver": 10,
    "bronze": 16
  },
  "instructions": window.stageInstructions ? window.stageInstructions[38] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 39,
  "version": 10,
  "name": "Stage 39",
  "stageType": "flash",
  "rounds": 3,
  "cards": 1,
  "noRepeatAcrossRounds": true,
  "noRepeatAnswerInitialsAcrossRounds": true,
  "revealSeconds": 0.1,
  "recallSeconds": 30,
  "categories": [
    "colors"
  ],
  "cardCounts": {},
  "roundOverridePool": [
    {
      "prompts": {
        "background": {
          "min": 1,
          "max": 1
        },
        "textColor": {
          "min": 0,
          "max": 0
        }
      }
    },
    {
      "prompts": {
        "background": {
          "min": 0,
          "max": 0
        },
        "textColor": {
          "min": 1,
          "max": 1
        }
      }
    },
    {
      "prompts": {
        "background": {
          "min": 0,
          "max": 0
        },
        "textColor": {
          "min": 0,
          "max": 0
        }
      }
    }
  ],
  "modifiers": {
    "backgroundColor": true,
    "backgroundColorChance": 1,
    "misleadColors": true,
    "misleadChance": 1,
    "textColor": true,
    "textColorChance": 1,
    "textColorAvoidCardBackground": true
  },
  "starTimes": {
    "platinum": 2,
    "gold": 3,
    "silver": 8,
    "bronze": 20
  },
  "instructions": window.stageInstructions ? window.stageInstructions[39] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 40,
  "version": 10,
  "name": "Stage 40",
  "stageType": "tutorial",
  "rounds": 1,
  "cards": 3,
  "noRepeatAcrossRounds": true,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "numbers",
    "letters"
  ],
  "cardCounts": {
    "numbers": 1,
    "letters": 1
  },
  "modifiers": {
    "textColor": true,
    "textColorChance": 1,
    "textPromptMinCount": 2,
    "textPromptMaxCount": 2,
    "ads": true
  },
  "starTimes": {
    "platinum": 2,
    "gold": 3,
    "silver": 8,
    "bronze": 20
  },
  "instructions": window.stageInstructions ? window.stageInstructions[40] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 41,
  "version": 10,
  "name": "Stage 41",
  "stageType": "challenge",
  "rounds": 1,
  "cards": 4,
  "noRepeatAcrossRounds": true,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "numbers",
    "letters",
    "directions",
    "diagonal"
  ],
  "cardCounts": {
    "directions": 1,
    "numbers": 1,
    "letters": 1
  },
  "modifiers": {
    "backgroundColor": true,
    "backgroundColorChance": 1,
    "backgroundColorUniqueLabelsPerRound": true,
    "backgroundPromptMinCount": 1,
    "backgroundPromptMaxCount": 1,
    "glitch": true,
    "ads": true,
    "rotate": true,
    "rotateMinCount": 1,
    "rotateMaxCount": 1
  },
  "starTimes": {
    "platinum": 8,
    "gold": 10,
    "silver": 15,
    "bronze": 20
  },
  "instructions": window.stageInstructions ? window.stageInstructions[41] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 42,
  "version": 10,
  "name": "Stage 42",
  "stageType": "tutorial",
  "rounds": 3,
  "cards": 1,
  "noRepeatAcrossRounds": true,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "numbers"
  ],
  "cardCounts": {},
  "modifiers": {
    "mathOpsPlus": true,
    "mathChance": 1,
    "mathMinCount": 1,
    "mathMaxCount": 1
  },
  "starTimes": {
    "platinum": 3,
    "gold": 4,
    "silver": 8,
    "bronze": 12
  },
  "instructions": window.stageInstructions ? window.stageInstructions[42] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 43,
  "version": 10,
  "name": "Stage 43",
  "stageType": "challenge",
  "rounds": 1,
  "cards": 3,
  "noRepeatAcrossRounds": true,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "numbers"
  ],
  "cardCounts": {},
  "modifiers": {
    "mathChance": 1,
    "mathOpsPlus": true,
    "swapCards": true,
    "mathMinCount": 3,
    "mathMaxCount": 3
  },
  "starTimes": {
    "platinum": 4,
    "gold": 3,
    "silver": 8,
    "bronze": 20
  },
  "instructions": window.stageInstructions ? window.stageInstructions[43] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 44,
  "version": 10,
  "name": "Stage 44",
  "stageType": "flash",
  "rounds": 3,
  "cards": 2,
  "noRepeatAcrossRounds": true,
  "revealSeconds": 0.1,
  "recallSeconds": 30,
  "categories": [
    "numbers"
  ],
  "cardCounts": {},
  "modifiers": {},
  "starTimes": {
    "platinum": 3,
    "gold": 4,
    "silver": 8,
    "bronze": 12
  },
  "instructions": window.stageInstructions ? window.stageInstructions[44] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 45,
  "version": 10,
  "name": "Stage 45",
  "stageType": "challenge",
  "rounds": 1,
  "cards": 3,
  "noRepeatAcrossRounds": true,
  "uniqueCardTypesPerRound": true,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "letters",
    "directions",
    "numbers"
  ],
  "cardCounts": {},
  "modifiers": {
    "rotate": true,
    "rotateMinCount": 1,
    "rotateMaxCount": 1,
    "swapCards": true,
    "fog": true,
    "ads": true
  },
  "starTimes": {
    "platinum": 5,
    "gold": 6,
    "silver": 10,
    "bronze": 16
  },
  "instructions": window.stageInstructions ? window.stageInstructions[45] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 46,
  "version": 10,
  "name": "Stage 46",
  "stageType": "flash",
  "rounds": 3,
  "cards": 2,
  "noRepeatAcrossRounds": true,
  "revealSeconds": 0.1,
  "recallSeconds": 30,
  "categories": [
    "numbers"
  ],
  "cardCounts": {},
  "modifiers": {
    "backgroundColor": true,
    "backgroundColorChance": 1,
    "backgroundPromptMinCount": 1,
    "backgroundPromptMaxCount": 1
  },
  "starTimes": {
    "platinum": 2,
    "gold": 3,
    "silver": 8,
    "bronze": 20
  },
  "instructions": window.stageInstructions ? window.stageInstructions[46] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 47,
  "version": 10,
  "name": "Stage 47",
  "stageType": "tutorial",
  "rounds": 2,
  "cards": 1,
  "noRepeatAcrossRounds": true,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "numbers"
  ],
  "cardCounts": {},
  "modifiers": {
    "previousCard": true,
    "previousCardChance": 1
  },
  "starTimes": {
    "platinum": 0.8,
    "gold": 2,
    "silver": 4,
    "bronze": 8
  },
  "instructions": window.stageInstructions ? window.stageInstructions[47] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 48,
  "version": 10,
  "name": "Stage 48",
  "stageType": "tutorial",
  "rounds": 3,
  "cards": 1,
  "noRepeatAcrossRounds": true,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "numbers"
  ],
  "cardCounts": {},
  "modifiers": {
    "previousCard": true,
    "previousCardChance": 1
  },
  "starTimes": {
    "platinum": 2,
    "gold": 3,
    "silver": 5,
    "bronze": 8
  },
  "instructions": window.stageInstructions ? window.stageInstructions[48] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 49,
  "version": 10,
  "name": "Stage 49",
  "stageType": "memory",
  "rounds": 2,
  "cards": 3,
  "noRepeatAcrossRounds": true,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "numbers",
    "letters",
    "directions",
    "shapes",
    "colors",
    "diagonal"
  ],
  "cardCounts": {},
  "roundOverrides": {
    "2": {
      "prompts": {
        "previousCard": {
          "min": 2,
          "max": 2
        }
      }
    }
  },
  "modifiers": {
    "previousCard": true,
    "previousCardChance": 1
  },
  "starTimes": {
    "platinum": 5,
    "gold": 6,
    "silver": 10,
    "bronze": 14
  },
  "instructions": window.stageInstructions ? window.stageInstructions[49] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 50,
  "version": 10,
  "name": "Stage 50",
  "stageType": "challenge",
  "rounds": 3,
  "cards": 2,
  "noRepeatAcrossRounds": true,
  "revealSeconds": 10,
  "recallSeconds": 30,
  "categories": [
    "numbers"
  ],
  "cardCounts": {},
  "modifiers": {
    "previousCard": true,
    "previousCardChance": 1,
    "previousPromptMinCount": 1,
    "previousPromptMaxCount": 1,
    "swapCards": true,
    "swapChance": 1
  },
  "starTimes": {
    "platinum": 8,
    "gold": 10,
    "silver": 14,
    "bronze": 18
  },
  "instructions": window.stageInstructions ? window.stageInstructions[50] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 51,
  "version": 10,
  "name": "Stage 51",
  "stageType": "sequence",
  "rounds": 1,
  "cards": 3,
  "revealSeconds": 0.2,
  "recallSeconds": 20,
  "categories": [
    "numbers",
    "directions",
    "shapes"
  ],
  "cardCounts": {
    "numbers": 1,
    "directions": 1,
    "shapes": 1
  },
  "modifiers": {
    "rotate": true,
    "rotateMinCount": 1,
    "rotateMaxCount": 1
  },
  "starTimes": {
    "platinum": 3,
    "gold": 4,
    "silver": 8,
    "bronze": 12
  },
  "instructions": window.stageInstructions ? window.stageInstructions[51] || [] : [],
  "firstLetterHintEnabled": false
},
    {
  "id": 52,
  "version": 10,
  "name": "Stage 52",
  "stageType": "tutorial",
  "rounds": 3,
  "cards": 1,
  "noRepeatAcrossRounds": true,
  "revealSeconds": 8,
  "recallSeconds": 20,
  "categories": [
    "directions",
    "diagonal"
  ],
  "cardCounts": {},
  "modifiers": {
    "rotatePlus": true,
    "rotatePlusMinCount": 1,
    "rotatePlusMaxCount": 1,
    "rotateNoRepeatPromptsAcrossRounds": true
  },
  "starTimes": {
    "platinum": 8,
    "gold": 12,
    "silver": 16,
    "bronze": 20
  },
  "instructions": window.stageInstructions ? window.stageInstructions[52] || [] : [],
  "firstLetterHintEnabled": false
}
  ];
  window.stagesConfig = stagesConfig;
})();
