(() => {
  const defaults = {
    appearance: {
      theme: "classic",
      colorVision: "standard",
      layout: "classic",
      themes: ["classic"],
      colorVisionModes: ["standard", "protanopia", "deuteranopia", "tritanopia", "monochromacy"],
      layouts: ["classic"]
    },
    controls: {
      successAnimation: true,
      flashCountdown: false,
      autoAdvanceNext: true,
      autoRetry: true,
      autoStartStagePreview: true,
      enterToNext: false,
      flashWarningEnabled: true,
      leaderboardsEnabled: true
    },
    audio: {
      master: 100,
      music: 80,
      effects: 80
    },
    keybinds: {
      retry: "r",
      stageNext: "enter",
      stageQuit: "q",
      practiceHome: "h",
      practiceSettings: "s",
      fullscreen: "f"
    },
    playerName: {
      value: ""
    }
  };

  window.FLASH_RECALL_SETTINGS_DEFAULTS = defaults;
  window.getFlashRecallSettingsDefaults = function getFlashRecallSettingsDefaults() {
    return JSON.parse(JSON.stringify(defaults));
  };
})();
