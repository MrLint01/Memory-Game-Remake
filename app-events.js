      function getRevealSeconds() {
        if (gameMode === "aminoAcids") return Number(aminoRevealInput.value) || 20;
        const base = Number(revealInput.value) || 5;
        if (gameMode === "stages") {
          const stage = window.getStageConfig ? window.getStageConfig(stageState.index) : null;
          if (stage && Number(stage.revealSeconds)) {
            const stageRevealSeconds = Number(stage.revealSeconds);
            if (
              typeof window.getAdaptiveRevealMultiplier === "function" &&
              Number.isFinite(stageState.index) &&
              stageState.index >= 2
            ) {
              return Math.max(0.1, stageRevealSeconds * window.getAdaptiveRevealMultiplier());
            }
            return stageRevealSeconds;
          }
        }
        return base;
      }

      function getRecallSeconds() {
        if (gameMode === "aminoAcids") return Number(aminoRecallInput.value) || 20;
        const base = Number(recallInput.value) || 5;
        if (gameMode === "stages") {
          const stage = window.getStageConfig ? window.getStageConfig(stageState.index) : null;
          if (stage && Number(stage.recallSeconds)) {
            return Number(stage.recallSeconds);
          }
        }
        return base;
      }

      const PLAYER_NAME_KEY = "flashRecallPlayerName";
      const PLAYER_NAME_PROMPT_KEY = "flashRecallPlayerNamePrompted";
      const APPEARANCE_THEME_KEY = "flashRecallAppearanceTheme";
      const APPEARANCE_COLOR_VISION_KEY = "flashRecallAppearanceColorVision";
      const APPEARANCE_LAYOUT_KEY = "flashRecallAppearanceLayout";
      const KEYBINDS_STORAGE_KEY = "flashRecallKeybinds";
      const AUDIO_MASTER_KEY = "flashRecallAudioMasterVolume";
      const AUDIO_MUSIC_KEY = "flashRecallAudioMusicVolume";
      const AUDIO_EFFECTS_KEY = "flashRecallAudioEffectsVolume";
      const AUDIO_MIGRATION_KEY = "flashRecallAudioDefaults2026a";
      const AUDIO_MUTE_KEY = "flashRecallAudioMuted";
      const AUDIO_MASTER_BEFORE_MUTE_KEY = "flashRecallAudioMasterBeforeMute";
      const FLASH_WARNING_KEY = "flashRecallFlashWarning";

      const LEADERBOARDS_ENABLED_STORAGE_KEY = "flashRecallLeaderboardsEnabled";
      const SPLASH_SEEN_KEY = "flashRecallSplashSeen";
      const ADAPTIVE_PROFILE_KEY = "flashRecallAdaptiveProfile";
      const settingsDefaults = typeof window.getFlashRecallSettingsDefaults === "function"
        ? window.getFlashRecallSettingsDefaults()
        : (window.FLASH_RECALL_SETTINGS_DEFAULTS || {});
      const fallbackAppearance = {
        theme: "classic",
        colorVision: "standard",
        layout: "classic",
        themes: ["classic"],
        colorVisionModes: ["standard", "protanopia", "deuteranopia", "tritanopia", "monochromacy"],
        layouts: ["classic"]
      };
      const defaultAppearance = {
        ...fallbackAppearance,
        ...(settingsDefaults.appearance || {})
      };
      const appearanceOptions = {
        themes: Array.isArray(defaultAppearance.themes) && defaultAppearance.themes.length
          ? defaultAppearance.themes
          : fallbackAppearance.themes,
        colorVisionModes: Array.isArray(defaultAppearance.colorVisionModes) && defaultAppearance.colorVisionModes.length
          ? defaultAppearance.colorVisionModes
          : fallbackAppearance.colorVisionModes,
        layouts: Array.isArray(defaultAppearance.layouts) && defaultAppearance.layouts.length
          ? defaultAppearance.layouts
          : fallbackAppearance.layouts,

      };
      const defaultKeybinds = {
        retry: "r",
        stageNext: "enter",
        stageQuit: "q",
        practiceHome: "h",
        practiceSettings: "s",
        fullscreen: "f",
        ...(settingsDefaults.keybinds || {})
      };
      const defaultControlSettings = {
        successAnimation: true,
        flashCountdown: false,
        autoAdvanceNext: true,
        enterToNext: true,
        flashWarningEnabled: true,
        ...(settingsDefaults.controls || {})
      };
      const defaultAudioSettings = {
        master: 50,
        music: 100,
        effects: 100,
        ...(settingsDefaults.audio || {})
      };
      let audioSettings = { ...defaultAudioSettings };
      let audioMuted = false;
      let audioMasterBeforeMute = null;
      let keybinds = { ...defaultKeybinds };
      let activeRebindAction = null;
      let stageIntroPendingIndex = null;
      let flashWarningEnabled = true;
      let flashCountdownEnabled = defaultControlSettings.flashCountdown;
      let enterToNextEnabled = true;
      let leaderboardsEnabled = true;
      const keybindButtons = {
        retry: keybindRetry,
        stageNext: keybindStageNext,
        stageQuit: keybindStageQuit,
        practiceHome: keybindPracticeHome,
        practiceSettings: keybindPracticeSettings,
        fullscreen: keybindFullscreen
      };

      function normalizeKey(rawKey) {
        if (!rawKey) return "";
        const key = String(rawKey);
        if (key === " ") return "space";
        if (key.length === 1) return key.toLowerCase();
        return key.toLowerCase();
      }

      function getKeyLabel(key) {
        const value = normalizeKey(key);
        if (!value) return "";
        const map = {
          escape: "Esc",
          enter: "Enter",
          tab: "Tab",
          "arrowleft": "Left",
          "arrowright": "Right",
          "arrowup": "Up",
          "arrowdown": "Down",
          space: "Space"
        };
        return map[value] || value.toUpperCase();
      }

      function isBindableKey(key) {
        const value = normalizeKey(key);
        if (!value) return false;
        if (value.length === 1) return /[a-z0-9]/.test(value);
        return [
          "enter",
          "space",
          "arrowleft",
          "arrowright",
          "arrowup",
          "arrowdown"
        ].includes(value);
      }

      function isTextEntryTarget(target) {
        if (!target) return false;
        if (target.isContentEditable) return true;
        const tag = String(target.tagName || "").toUpperCase();
        return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      }

      function loadKeybinds() {
        try {
          const raw = window.localStorage.getItem(KEYBINDS_STORAGE_KEY);
          if (!raw) {
            keybinds = { ...defaultKeybinds };
            return;
          }
          const parsed = JSON.parse(raw);
          const next = { ...defaultKeybinds };
          Object.keys(defaultKeybinds).forEach((action) => {
            const candidate = normalizeKey(parsed && parsed[action]);
            if (candidate) {
              next[action] = candidate;
            }
          });
          keybinds = next;
        } catch {
          keybinds = { ...defaultKeybinds };
        }
      }

      function saveKeybinds() {
        try {
          window.localStorage.setItem(KEYBINDS_STORAGE_KEY, JSON.stringify(keybinds));
        } catch {
          // ignore storage errors
        }
      }

      function setKeybindStatus(message) {
        if (!keybindStatus) return;
        keybindStatus.textContent = message || "";
      }

      function refreshKeybindButtons() {
        Object.entries(keybindButtons).forEach(([action, button]) => {
          if (!button) return;
          const isEditing = activeRebindAction === action;
          button.textContent = isEditing ? "Press key..." : getKeyLabel(keybinds[action]);
          button.classList.toggle("is-listening", isEditing);
        });
      }

      function refreshActionKeyHints() {
        const get = (action, fallback) => getKeyLabel(keybinds[action] || fallback);
        const setHint = (selector, action, fallback) => {
          const button = document.querySelector(selector);
          if (!button) return;
          const label = get(action, fallback);
          const hint = button.querySelector(".action-key-hint");
          if (hint) hint.textContent = `(${label})`;
        };
        setHint("#stageMenuButton", "stageQuit", "q");
        setHint("#stageNextButton", "stageNext", "n");
        setHint("#stageRetryButton", "retry", "r");
        setHint("#practiceRetryButton", "retry", "r");
        setHint("#practiceBackButton", "practiceHome", "h");
        setHint("#practiceSettingsButton", "practiceSettings", "s");
      }

      function keybindMatches(event, action) {
        const pressed = normalizeKey(event.key);
        const expected = normalizeKey(keybinds[action] || defaultKeybinds[action]);
        return pressed && expected && pressed === expected;
      }

      function isConfirmKey(event) {
        if (!event) return false;
        return event.key === "Enter" || event.code === "Enter" || event.code === "NumpadEnter";
      }

      window.getActionKeyLabel = function getActionKeyLabel(action) {
        if (!action) return "";
        return getKeyLabel(keybinds[action] || defaultKeybinds[action] || "");
      };

      function isKnownAppearanceTheme(theme) {
        return appearanceOptions.themes.includes(theme);
      }

      function applyAppearance(theme, layout, colorVision) {
        const nextTheme = "classic";
        const colorVisionModes = Array.isArray(appearanceOptions.colorVisionModes)
          ? appearanceOptions.colorVisionModes
          : ["standard"];
        const nextColorVision = colorVisionModes.includes(colorVision)
          ? colorVision
          : colorVisionModes.includes(defaultAppearance.colorVision)
            ? defaultAppearance.colorVision
            : colorVisionModes[0];
        const nextLayout = "classic";
        document.body.dataset.theme = nextTheme;
        try {
          window.localStorage.setItem(APPEARANCE_THEME_KEY, nextTheme);
        } catch {}

        delete document.body.dataset.font;
        document.body.dataset.colorVision = nextColorVision;
        document.body.dataset.layout = nextLayout;
        window.FLASH_RECALL_APPEARANCE_READY = true;

        if (appearanceColorVision) appearanceColorVision.value = nextColorVision;
        if (appearanceLayout) appearanceLayout.value = nextLayout;
        if (typeof window.refreshRenderedCardsForAppearance === "function") {
          window.refreshRenderedCardsForAppearance();
        }
      }

      function getStoredAppearance() {
        const savedTheme = window.localStorage.getItem(APPEARANCE_THEME_KEY);
        const savedColorVision = window.localStorage.getItem(APPEARANCE_COLOR_VISION_KEY);
        const savedLayout = "classic";
        const fallbackTheme = appearanceOptions.themes.includes(defaultAppearance.theme)
          ? defaultAppearance.theme
          : appearanceOptions.themes[0];
        const colorVisionModes = Array.isArray(appearanceOptions.colorVisionModes)
          ? appearanceOptions.colorVisionModes
          : ["standard"];
        const fallbackColorVision = colorVisionModes.includes(defaultAppearance.colorVision)
          ? defaultAppearance.colorVision
          : colorVisionModes[0];
        const fallbackLayout = appearanceOptions.layouts.includes(defaultAppearance.layout)
          ? defaultAppearance.layout
          : appearanceOptions.layouts[0];
        return {
          theme: isKnownAppearanceTheme(savedTheme) ? savedTheme : fallbackTheme,
          colorVision: colorVisionModes.includes(savedColorVision) ? savedColorVision : fallbackColorVision,
          layout: appearanceOptions.layouts.includes(savedLayout) ? savedLayout : fallbackLayout
        };
      }

      function normalizeAudioVolume(value, fallbackValue) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return fallbackValue;
        return Math.max(0, Math.min(100, Math.round(numeric)));
      }

      function getStoredAudioSettings() {
        let savedMaster = null;
        let savedMusic = null;
        let savedEffects = null;
        try {
          savedMaster = window.localStorage.getItem(AUDIO_MASTER_KEY);
          savedMusic = window.localStorage.getItem(AUDIO_MUSIC_KEY);
          savedEffects = window.localStorage.getItem(AUDIO_EFFECTS_KEY);
        } catch {
          // ignore storage errors
        }
        return {
          master: normalizeAudioVolume(savedMaster, normalizeAudioVolume(defaultAudioSettings.master, 100)),
          music: normalizeAudioVolume(savedMusic, normalizeAudioVolume(defaultAudioSettings.music, 80)),
          effects: normalizeAudioVolume(savedEffects, normalizeAudioVolume(defaultAudioSettings.effects, 80))
        };
      }

      function getStoredAudioMuteState() {
        try {
          return window.localStorage.getItem(AUDIO_MUTE_KEY) === "1";
        } catch {
          return false;
        }
      }

      function getStoredAudioMasterBeforeMute() {
        try {
          return normalizeAudioVolume(
            window.localStorage.getItem(AUDIO_MASTER_BEFORE_MUTE_KEY),
            normalizeAudioVolume(defaultAudioSettings.master, 50)
          );
        } catch {
          return normalizeAudioVolume(defaultAudioSettings.master, 50);
        }
      }

      function migrateAudioDefaultsIfNeeded() {
        try {
          if (window.localStorage.getItem(AUDIO_MIGRATION_KEY) === "1") return;
          const savedMaster = window.localStorage.getItem(AUDIO_MASTER_KEY);
          const savedMusic = window.localStorage.getItem(AUDIO_MUSIC_KEY);
          const savedEffects = window.localStorage.getItem(AUDIO_EFFECTS_KEY);
          const allPresent = savedMaster !== null && savedMusic !== null && savedEffects !== null;
          const allZero = savedMaster === "0" && savedMusic === "0" && savedEffects === "0";
          if (allPresent && allZero) {
            window.localStorage.setItem(AUDIO_MASTER_KEY, String(defaultAudioSettings.master));
            window.localStorage.setItem(AUDIO_MUSIC_KEY, String(defaultAudioSettings.music));
            window.localStorage.setItem(AUDIO_EFFECTS_KEY, String(defaultAudioSettings.effects));
          }
          window.localStorage.setItem(AUDIO_MIGRATION_KEY, "1");
        } catch {
          // ignore storage errors
        }
      }

      function setAudioSliderValue(labelEl, value) {
        if (!labelEl) return;
        labelEl.textContent = `${value}%`;
      }

      function emitAudioSettingsChanged() {
        const normalized = {
          master: audioSettings.master / 100,
          music: audioSettings.music / 100,
          effects: audioSettings.effects / 100
        };
        window.flashRecallAudioSettings = { ...normalized };
        window.dispatchEvent(
          new CustomEvent("audio-settings-changed", {
            detail: { ...normalized }
          })
        );
      }

      function applyAudioSettings(nextSettings, persist = false) {
        audioSettings = {
          master: normalizeAudioVolume(nextSettings.master, normalizeAudioVolume(defaultAudioSettings.master, 100)),
          music: normalizeAudioVolume(nextSettings.music, normalizeAudioVolume(defaultAudioSettings.music, 80)),
          effects: normalizeAudioVolume(nextSettings.effects, normalizeAudioVolume(defaultAudioSettings.effects, 80))
        };
        if (audioMasterVolume) audioMasterVolume.value = String(audioSettings.master);
        if (audioMusicVolume) audioMusicVolume.value = String(audioSettings.music);
        if (audioEffectsVolume) audioEffectsVolume.value = String(audioSettings.effects);
        setAudioSliderValue(audioMasterValue, audioSettings.master);
        setAudioSliderValue(audioMusicValue, audioSettings.music);
        setAudioSliderValue(audioEffectsValue, audioSettings.effects);

        if (audioSettings.master > 0) {
          audioMasterBeforeMute = audioSettings.master;
          try {
            window.localStorage.setItem(AUDIO_MASTER_BEFORE_MUTE_KEY, String(audioMasterBeforeMute));
          } catch {
            // ignore storage errors
          }
        }
        const nextMuted = audioSettings.master <= 0;
        if (nextMuted !== audioMuted) {
          audioMuted = nextMuted;
          try {
            window.localStorage.setItem(AUDIO_MUTE_KEY, audioMuted ? "1" : "0");
          } catch {
            // ignore storage errors
          }
        }
        updateAudioToggleUI();

        if (persist) {
          try {
            window.localStorage.setItem(AUDIO_MASTER_KEY, String(audioSettings.master));
            window.localStorage.setItem(AUDIO_MUSIC_KEY, String(audioSettings.music));
            window.localStorage.setItem(AUDIO_EFFECTS_KEY, String(audioSettings.effects));
          } catch {
            // ignore storage errors
          }
        }
        emitAudioSettingsChanged();
        applyMusicVolume();
      }

      const audioToggle = document.getElementById("audioToggle");
      const audioToggleIcon = document.getElementById("audioToggleIcon");
      const AUDIO_ICON_MUTED = "imgs/mute.png";
      const AUDIO_ICON_UNMUTED = "imgs/unmute.png";

      function updateAudioToggleUI() {
        if (!audioToggle || !audioToggleIcon) return;
        audioToggleIcon.src = audioMuted ? AUDIO_ICON_MUTED : AUDIO_ICON_UNMUTED;
        audioToggle.setAttribute("aria-label", audioMuted ? "Unmute audio" : "Mute audio");
        audioToggle.dataset.muted = audioMuted ? "true" : "false";
      }

      function setAudioMuted(nextMuted) {
        const targetMuted = Boolean(nextMuted);
        if (targetMuted === audioMuted) return;
        if (targetMuted) {
          if (audioSettings.master > 0) {
            audioMasterBeforeMute = audioSettings.master;
            try {
              window.localStorage.setItem(AUDIO_MASTER_BEFORE_MUTE_KEY, String(audioMasterBeforeMute));
            } catch {
              // ignore storage errors
            }
          }
          applyAudioSettings({ ...audioSettings, master: 0 }, true);
          return;
        }
        const restoredMaster = audioMasterBeforeMute || getStoredAudioMasterBeforeMute();
        const nextMaster = Math.max(1, normalizeAudioVolume(restoredMaster, defaultAudioSettings.master));
        applyAudioSettings({ ...audioSettings, master: nextMaster }, true);
      }

      window.getAudioMix = function getAudioMix() {
        return {
          master: audioSettings.master / 100,
          music: audioSettings.music / 100,
          effects: audioSettings.effects / 100
        };
      };
      const menuMusic = createMusicAudio("audio/stage-background-music.mp3", { loop: true });
      const levelMusic = createMusicAudio("audio/regular-groovy-background.wav", { loop: true });
      const MENU_MUSIC_START_DELAY_MS = 3000;
      const MENU_MUSIC_FADE_IN_MS = 5000;
      const MENU_MUSIC_LOOP_FADE_OUT_MS = 2600;
      const MENU_MUSIC_LOOP_FADE_IN_MS = 5200;
      let activeMusicMode = null;
      let pendingMusicRequest = null;
      let pendingMusicListenerAttached = false;
      let scheduledMenuMusicTimer = null;

      function createMusicAudio(src, options = {}) {
        if (typeof Audio === "undefined") return null;
        const audio = new Audio(src);
        audio.preload = "auto";
        audio.loop = options.loop !== false;
        audio.__fadeFrameId = 0;
        audio.__fadeFactor = 1;
        audio.addEventListener("error", () => {
          window.__lastAudioError = audio.error || new Error(`Failed to load ${audio.src}`);
        });
        return audio;
      }

      function getMusicMixVolume() {
        if (typeof window.getAudioMix === "function") {
          const mix = window.getAudioMix() || {};
          const master = Number.isFinite(mix.master) ? mix.master : 1;
          const music = Number.isFinite(mix.music) ? mix.music : 1;
          return Math.max(0, Math.min(1, master)) * Math.max(0, Math.min(1, music));
        }
        return 1;
      }

      function clampMusicVolume(value) {
        return Math.max(0, Math.min(1, value));
      }

      function cancelMusicFade(audio) {
        if (!audio || !audio.__fadeFrameId) return;
        window.cancelAnimationFrame(audio.__fadeFrameId);
        audio.__fadeFrameId = 0;
      }

      function applySingleMusicVolume(audio) {
        if (!audio) return;
        const mixVolume = getMusicMixVolume();
        const factor = Number.isFinite(audio.__fadeFactor) ? audio.__fadeFactor : 1;
        const loopFactor = Number.isFinite(audio.__loopFadeFactor) ? audio.__loopFadeFactor : 1;
        audio.volume = clampMusicVolume(mixVolume * factor * loopFactor);
        audio.muted = mixVolume <= 0;
        if (mixVolume <= 0 && !audio.paused) {
          audio.pause();
        }
      }

      function startMusicFadeIn(audio, durationMs = MENU_MUSIC_FADE_IN_MS) {
        if (!audio) return;
        cancelMusicFade(audio);
        audio.__fadeFactor = 0;
        applySingleMusicVolume(audio);
        const startTime = performance.now();
        const step = (now) => {
          if (!audio || audio.paused) {
            if (audio) audio.__fadeFrameId = 0;
            return;
          }
          const progress = durationMs <= 0
            ? 1
            : Math.min(1, (now - startTime) / durationMs);
          audio.__fadeFactor = progress;
          applySingleMusicVolume(audio);
          if (progress >= 1) {
            audio.__fadeFactor = 1;
            audio.__fadeFrameId = 0;
            return;
          }
          audio.__fadeFrameId = window.requestAnimationFrame(step);
        };
        audio.__fadeFrameId = window.requestAnimationFrame(step);
      }

      function resetMenuLoopFadeState(audio) {
        if (!audio) return;
        audio.__loopFadeFactor = 1;
        audio.__loopLastTime = 0;
        audio.__loopFadeInId = 0;
        audio.__loopFadeInActive = false;
        audio.__loopFadeInStart = 0;
      }

      function stopMenuMusicLoopMonitor(audio) {
        if (!audio || !audio.__loopMonitorId) return;
        window.cancelAnimationFrame(audio.__loopMonitorId);
        audio.__loopMonitorId = 0;
      }

      function updateMenuMusicLoopFade(audio, now) {
        if (!audio || audio.paused) return;
        const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
        if (!(duration > 0)) return;
        const fadeOutSec = Math.max(0.1, MENU_MUSIC_LOOP_FADE_OUT_MS / 1000);
        const fadeInMs = Math.max(100, MENU_MUSIC_LOOP_FADE_IN_MS);
        const current = audio.currentTime;
        const last = Number.isFinite(audio.__loopLastTime) ? audio.__loopLastTime : 0;
        audio.__loopLastTime = current;
        const loopWrap = (last > Math.max(0, duration - 0.35) && current < 0.35)
          || (current + 0.25 < last);
        if (loopWrap) {
          audio.__loopFadeInStart = now;
          audio.__loopFadeInActive = true;
          audio.__loopFadeFactor = 0;
          applySingleMusicVolume(audio);
        }
        const remaining = duration - current;
        if (audio.__loopFadeInActive) {
          const elapsed = Math.max(0, now - (audio.__loopFadeInStart || now));
          const progress = fadeInMs <= 0 ? 1 : Math.min(1, elapsed / fadeInMs);
          const eased = Math.pow(progress, 1.6);
          audio.__loopFadeFactor = eased;
          applySingleMusicVolume(audio);
          if (progress >= 1) {
            audio.__loopFadeFactor = 1;
            audio.__loopFadeInActive = false;
          }
          return;
        }
        if (remaining <= fadeOutSec) {
          const nextFactor = Math.max(0, Math.min(1, Math.pow(remaining / fadeOutSec, 1.15)));
          audio.__loopFadeFactor = nextFactor;
          applySingleMusicVolume(audio);
        } else if (audio.__loopFadeFactor !== 1) {
          audio.__loopFadeFactor = 1;
          applySingleMusicVolume(audio);
        }
      }

      function startMenuMusicLoopMonitor(audio) {
        if (!audio || audio.__loopMonitorId) return;
        const step = (now) => {
          if (!audio || audio.paused) {
            audio.__loopMonitorId = 0;
            return;
          }
          updateMenuMusicLoopFade(audio, now);
          audio.__loopMonitorId = window.requestAnimationFrame(step);
        };
        audio.__loopMonitorId = window.requestAnimationFrame(step);
      }

      function getEffectsMixVolume() {
        if (typeof window.getAudioMix === "function") {
          const mix = window.getAudioMix() || {};
          const master = Number.isFinite(mix.master) ? mix.master : 1;
          const effects = Number.isFinite(mix.effects) ? mix.effects : 1;
          return Math.max(0, Math.min(1, master)) * Math.max(0, Math.min(1, effects));
        }
        return 1;
      }

      function applyMusicVolume() {
        [menuMusic, levelMusic].forEach((audio) => {
          applySingleMusicVolume(audio);
        });
        if (getMusicMixVolume() > 0 && activeMusicMode) {
          setBackgroundMusicMode(activeMusicMode);
        }
      }

      function stopMusic(audio) {
        if (!audio) return;
        cancelMusicFade(audio);
        audio.__fadeFactor = 1;
        if (audio === menuMusic) {
          stopMenuMusicLoopMonitor(audio);
        }
        audio.pause();
        audio.currentTime = 0;
      }

      function queuePendingMusic(audio, options = {}) {
        pendingMusicRequest = { audio, options };
        if (pendingMusicListenerAttached) return;
        pendingMusicListenerAttached = true;
        const handler = () => {
          pendingMusicListenerAttached = false;
          const nextRequest = pendingMusicRequest;
          pendingMusicRequest = null;
          if (!(nextRequest && nextRequest.audio)) return;
          playMusic(nextRequest.audio, nextRequest.options);
        };
        document.addEventListener("pointerdown", handler, { capture: true, once: true });
        document.addEventListener("keydown", handler, { capture: true, once: true });
      }

      function clearScheduledMenuMusicFadeIn() {
        if (!scheduledMenuMusicTimer) return;
        window.clearTimeout(scheduledMenuMusicTimer);
        scheduledMenuMusicTimer = null;
      }

      function scheduleMenuMusicFadeIn(delayMs = 0) {
        const delay = Math.max(0, Number(delayMs) || 0);
        clearScheduledMenuMusicFadeIn();
        if (delay <= 0) {
          setBackgroundMusicMode("menu");
          return;
        }
        scheduledMenuMusicTimer = window.setTimeout(() => {
          scheduledMenuMusicTimer = null;
          setBackgroundMusicMode("menu");
        }, delay);
      }

      function playMusic(audio, options = {}) {
        if (!audio) return;
        const volume = getMusicMixVolume();
        if (volume <= 0) return;
        const fadeIn = Boolean(options.fadeIn);
        const shouldRestartFade = fadeIn && audio.paused;
        if (!audio.paused) {
          if (!fadeIn) {
            cancelMusicFade(audio);
            audio.__fadeFactor = 1;
            applySingleMusicVolume(audio);
          }
          if (audio === menuMusic) {
            startMenuMusicLoopMonitor(audio);
          }
          return;
        }
        audio.muted = false;
        cancelMusicFade(audio);
        audio.__fadeFactor = shouldRestartFade ? 0 : 1;
        applySingleMusicVolume(audio);
        try {
          const playResult = audio.play();
          if (playResult && typeof playResult.catch === "function") {
            if (shouldRestartFade && typeof playResult.then === "function") {
              playResult.then(() => {
                startMusicFadeIn(audio);
              }).catch((error) => {
                window.__lastAudioError = error;
                queuePendingMusic(audio, options);
              });
              return;
            }
            playResult.catch((error) => {
              window.__lastAudioError = error;
              queuePendingMusic(audio, options);
            });
          }
          if (shouldRestartFade) {
            startMusicFadeIn(audio);
          }
          if (audio === menuMusic) {
            startMenuMusicLoopMonitor(audio);
          }
        } catch (error) {
          window.__lastAudioError = error;
          queuePendingMusic(audio, options);
        }
      }

      function setBackgroundMusicMode(mode) {
        clearScheduledMenuMusicFadeIn();
        if (mode === activeMusicMode) {
          if (mode === "menu") playMusic(menuMusic, { fadeIn: true });
          if (mode === "level") playMusic(levelMusic);
          return;
        }
        activeMusicMode = mode;
        if (mode === "menu") {
          stopMusic(levelMusic);
          playMusic(menuMusic, { fadeIn: true });
          return;
        }
        if (mode === "level") {
          stopMusic(menuMusic);
          playMusic(levelMusic);
          return;
        }
        stopMusic(menuMusic);
        stopMusic(levelMusic);
      }

      window.setBackgroundMusicMode = setBackgroundMusicMode;
      window.scheduleMenuMusicFadeIn = scheduleMenuMusicFadeIn;
      window.clearScheduledMenuMusicFadeIn = clearScheduledMenuMusicFadeIn;
      window.__menuMusic = menuMusic;
      window.getMenuMusicState = () => {
        if (!menuMusic) return { available: false };
        return {
          available: true,
          src: menuMusic.currentSrc || menuMusic.src,
          paused: menuMusic.paused,
          loop: menuMusic.loop,
          currentTime: menuMusic.currentTime,
          duration: menuMusic.duration,
          volume: menuMusic.volume,
          fadeFactor: menuMusic.__fadeFactor,
          loopFadeFactor: menuMusic.__loopFadeFactor,
          loopFadeInActive: Boolean(menuMusic.__loopFadeInActive),
          loopMonitorActive: Boolean(menuMusic.__loopMonitorId)
        };
      };
      window.jumpMenuMusicToEnd = (seconds = 2) => {
        if (!menuMusic || !Number.isFinite(menuMusic.duration)) return false;
        const offset = Math.max(0.2, Number(seconds) || 2);
        menuMusic.currentTime = Math.max(0, menuMusic.duration - offset);
        return true;
      };
      resetMenuLoopFadeState(menuMusic);
      if (menuMusic) {
        menuMusic.addEventListener("play", () => {
          startMenuMusicLoopMonitor(menuMusic);
        });
        menuMusic.addEventListener("ended", () => {
          if (activeMusicMode !== "menu") return;
          scheduleMenuMusicFadeIn(MENU_MUSIC_START_DELAY_MS);
        });
      }
      let splashReturnToHome = false;
      let pendingSplashReveal = false;
      let resetLoadingActive = false;

      function normalizePlayerName(raw) {
        if (raw === null || raw === undefined) return "";
        return String(raw).replace(/\s+/g, " ").trim().slice(0, 16);
      }

      function getPlayerName() {
        try {
          return normalizePlayerName(window.localStorage.getItem(PLAYER_NAME_KEY) || "");
        } catch {
          return "";
        }
      }

      function setPlayerName(name) {
        const normalized = normalizePlayerName(name);
        try {
          if (!normalized) {
            window.localStorage.removeItem(PLAYER_NAME_KEY);
            window.localStorage.removeItem(PLAYER_NAME_PROMPT_KEY);
          } else {
            window.localStorage.setItem(PLAYER_NAME_KEY, normalized);
          }
        } catch {
          // ignore storage errors
        }
        if (normalized && typeof window.syncAchievementsFromLocal === "function") {
          window.syncAchievementsFromLocal({ playerName: normalized });
        }
        return normalized;
      }

      function updateLeaderboardNameForExistingTimes(newName) {
        const resolvedName = normalizePlayerName(newName)
          || (typeof window.getLeaderboardDisplayName === "function"
            ? normalizePlayerName(window.getLeaderboardDisplayName())
            : "");
        if (!resolvedName) return Promise.resolve();
        if (typeof window.updateStageLeaderboard !== "function") return Promise.resolve();
        const bestTimes = window.stageBestTimes || {};
        const entries = Object.entries(bestTimes);
        if (!entries.length) return Promise.resolve();
        const updates = [];
        entries.forEach(([key, value]) => {
          const match = String(key).match(/^(\\d+)_v(\\d+)$/);
          if (!match) return;
          const stageId = match[1];
          const stageVersion = Number(match[2]) || 1;
          const timeSeconds = Number(value);
          if (!Number.isFinite(timeSeconds)) return;
          updates.push(window.updateStageLeaderboard(stageId, stageVersion, timeSeconds, resolvedName));
        });
        return Promise.all(updates).catch((error) => {
          console.warn("Failed to update leaderboard names", error);
        });
      }

      function getAutoGeneratedPlayerNamePreview() {
        if (typeof window.getAutoGeneratedPlayerName === "function") {
          const generated = normalizePlayerName(window.getAutoGeneratedPlayerName());
          if (generated) return generated;
        }
        if (typeof window.getLeaderboardDisplayName === "function") {
          const fallback = normalizePlayerName(window.getLeaderboardDisplayName());
          if (fallback) return fallback;
        }
        return "Player";
      }

      function getRandomAutoGeneratedPlayerNameValue() {
        if (typeof window.getRandomAutoGeneratedPlayerName === "function") {
          const generated = normalizePlayerName(window.getRandomAutoGeneratedPlayerName());
          if (generated) return generated;
        }
        return getAutoGeneratedPlayerNamePreview();
      }

      function isPlayerNamePreviewActive(inputEl) {
        return Boolean(inputEl && inputEl.dataset.playerNamePreview === "1");
      }

      function clearPlayerNamePreviewState(inputEl) {
        if (!inputEl || !isPlayerNamePreviewActive(inputEl)) return false;
        inputEl.value = "";
        inputEl.dataset.playerNamePreview = "0";
        inputEl.classList.remove("player-name-input--preview");
        return true;
      }

      function setPlayerNamePreviewState(inputEl, previewValue = "") {
        if (!inputEl) return;
        inputEl.value = previewValue;
        inputEl.dataset.playerNamePreview = "1";
        inputEl.classList.add("player-name-input--preview");
      }

      function updatePlayerNameSaveState() {
        if (!playerNameSave) return;
        const normalized = normalizePlayerName(playerNameInput ? playerNameInput.value : "");
        playerNameSave.disabled = !normalized || isPlayerNamePreviewActive(playerNameInput);
      }

      function primePlayerNameInput(inputEl, explicitValue = "") {
        if (!inputEl) return;
        const normalized = normalizePlayerName(explicitValue);
        if (normalized) {
          inputEl.value = normalized;
          inputEl.dataset.playerNamePreview = "0";
          inputEl.classList.remove("player-name-input--preview");
          return;
        }
        setPlayerNamePreviewState(inputEl, getAutoGeneratedPlayerNamePreview());
      }

      function restorePlayerNamePreviewState(inputEl) {
        if (!inputEl) return;
        const normalized = normalizePlayerName(inputEl.value);
        if (normalized) {
          inputEl.dataset.playerNamePreview = "0";
          inputEl.classList.remove("player-name-input--preview");
        } else if (getPlayerName()) {
          inputEl.value = "";
          inputEl.dataset.playerNamePreview = "0";
          inputEl.classList.remove("player-name-input--preview");
        } else {
          setPlayerNamePreviewState(inputEl, getAutoGeneratedPlayerNamePreview());
        }
        if (inputEl === playerNameInput) {
          updatePlayerNameSaveState();
        }
      }

      function preparePlayerNameInputForEditing(inputEl) {
        const changed = clearPlayerNamePreviewState(inputEl);
        if (changed && inputEl === playerNameInput) {
          updatePlayerNameSaveState();
        }
        return changed;
      }

      function applyRandomizedPlayerNameToInput(inputEl) {
        if (!inputEl) return "";
        const randomName = getRandomAutoGeneratedPlayerNameValue();
        inputEl.value = randomName;
        inputEl.dataset.playerNamePreview = "0";
        inputEl.classList.remove("player-name-input--preview");
        if (inputEl === playerNameInput) {
          updatePlayerNameSaveState();
        }
        return randomName;
      }

      function shouldTreatAsNameEntryKey(event) {
        if (!event || event.ctrlKey || event.metaKey || event.altKey) return false;
        if (event.key === "Backspace" || event.key === "Delete") return true;
        return typeof event.key === "string" && event.key.length === 1;
      }

      function updatePlayerNameInputs(value) {
        primePlayerNameInput(playerNameInput, value);
        primePlayerNameInput(playerNameSetting, value);
        updatePlayerNameSaveState();
      }

      function getPreferredPlayerDisplayName(preferredName = "") {
        const direct = normalizePlayerName(preferredName);
        if (direct) return direct;
        const local = getPlayerName();
        if (local) return local;
        if (typeof window.getLeaderboardDisplayName === "function") {
          const fallback = normalizePlayerName(window.getLeaderboardDisplayName());
          if (fallback) return fallback;
        }
        return "Player";
      }

      function syncVisiblePlayerName(displayName = "") {
        const resolvedName = getPreferredPlayerDisplayName(displayName);
        if (typeof window.updateVisibleLeaderboardName === "function") {
          window.updateVisibleLeaderboardName(resolvedName);
        }
        updateLeaderboardNameForExistingTimes(resolvedName).finally(() => {
          if (typeof window.refreshVisibleLeaderboards === "function") {
            window.setTimeout(() => window.refreshVisibleLeaderboards(), 800);
          }
        });
      }

      function commitPlayerName(rawValue = "") {
        const previousName = getPlayerName();
        const nextRawValue = normalizePlayerName(rawValue);
        const normalized = nextRawValue || previousName ? setPlayerName(rawValue) : "";
        const resolvedName = getPreferredPlayerDisplayName(normalized);
        if (!normalized && typeof window.syncAchievementsFromLocal === "function") {
          window.syncAchievementsFromLocal({ playerName: resolvedName });
        }
        updatePlayerNameInputs(normalized);
        updatePlayerNameSettingVisibility();
        syncVisiblePlayerName(resolvedName);
        return normalized;
      }

      function commitPlayerNameFromSettingsInput() {
        if (!playerNameSetting) return "";
        return commitPlayerName(
          isPlayerNamePreviewActive(playerNameSetting) ? "" : playerNameSetting.value
        );
      }

      function showContentResetNoticeIfNeeded() {
        if (typeof window.consumeContentResetNotice !== "function") return;
        const notice = window.consumeContentResetNotice();
        if (!notice) return;
        const modal = document.getElementById("contentResetModal");
        const titleEl = document.getElementById("contentResetTitle");
        if (!modal) return;
        const playerName = getPreferredPlayerDisplayName(notice && notice.playerName ? notice.playerName : "");
        if (titleEl) {
          titleEl.textContent = `Hey ${playerName}!`;
        }
        logUiInteraction("content_reset_notice_open", {
          area: "content_reset_modal",
          action: "open"
        });
        clearSplashAutoStart();
        setModalState(modal, true);
      }

      function closePlayerNameModal() {
        setModalState(playerNameModal, false);
        clearPlayerNameDelay();
        playerNameModalOpening = false;
        flushDeferredAutoAdvanceNext();
        if (
          typeof window.startAutoAdvanceNextFromResults === "function" &&
          typeof autoAdvanceNextEnabled !== "undefined" &&
          autoAdvanceNextEnabled &&
          !autoAdvanceNextTimerId &&
          document.body &&
          document.body.dataset.state === "result"
        ) {
          window.startAutoAdvanceNextFromResults();
        }
      }

      function openPlayerNameModal() {
        clearResultAutoActionCountdown();
        playerNameModalOpening = true;
        window.setTimeout(() => {
          playerNameModalOpening = false;
        }, 450);
        if (typeof window.cancelAutoAdvanceNextFromResults === "function") {
          window.cancelAutoAdvanceNextFromResults();
        }
        if (
          typeof window.deferAutoAdvanceNext === "function" &&
          typeof window.startAutoAdvanceNextFromResults === "function"
        ) {
          window.deferAutoAdvanceNext(window.startAutoAdvanceNextFromResults);
        }
        setModalState(playerNameModal, true);
        const name = getPlayerName();
        updatePlayerNameInputs(name);
        if (playerNameInput) {
          playerNameInput.focus();
          if (!isPlayerNamePreviewActive(playerNameInput) && playerNameInput.value) {
            playerNameInput.select();
          }
        }
      }

      function shouldPromptForPlayerName() {
        if (!playerNameModal) return false;
        if (getPlayerName()) return false;
        try {
          return window.localStorage.getItem(PLAYER_NAME_PROMPT_KEY) !== "1";
        } catch {
          return true;
        }
      }

      function shouldShowPlayerNameSetting() {
        return true;
      }

      function updatePlayerNameSettingVisibility() {
        const row = document.getElementById("playerNameSettingRow");
        if (!row) return;
        if (shouldShowPlayerNameSetting()) row.removeAttribute("hidden");
      }

      function getTelemetrySettingsSnapshot() {
        return {
          theme_id: String(document.body && document.body.dataset ? document.body.dataset.theme || "" : ""),
          color_vision_mode: String(document.body && document.body.dataset ? document.body.dataset.colorVision || "" : ""),
          layout_mode: String(document.body && document.body.dataset ? document.body.dataset.layout || "" : "classic"),
          fullscreen_enabled: Boolean(document.fullscreenElement),
          success_animation_enabled: Boolean(successAnimationEnabled),
          flash_countdown_enabled: Boolean(flashCountdownEnabled),
          auto_advance_next_enabled: Boolean(autoAdvanceNextEnabled),
          auto_retry_enabled: Boolean(autoRetryEnabled),
          auto_start_stage_preview_enabled: Boolean(stageIntroAutoStartEnabled),
          enter_to_next_enabled: Boolean(enterToNextEnabled),
          flash_warning_enabled: Boolean(flashWarningEnabled),
          leaderboards_enabled: Boolean(leaderboardsEnabled),
          keybind_retry: keybinds.retry || defaultKeybinds.retry,
          keybind_stage_next: keybinds.stageNext || defaultKeybinds.stageNext,
          keybind_stage_quit: keybinds.stageQuit || defaultKeybinds.stageQuit,
          keybind_practice_home: keybinds.practiceHome || defaultKeybinds.practiceHome,
          keybind_practice_settings: keybinds.practiceSettings || defaultKeybinds.practiceSettings,
          keybind_fullscreen: keybinds.fullscreen || defaultKeybinds.fullscreen
        };
      }

      function getTelemetryUiContext() {
        const activeContext = typeof window.getActiveLevelContext === "function"
          ? window.getActiveLevelContext()
          : null;
        const hasStageIndex = stageState && Number.isFinite(stageState.index);
        const view = String(document.body && document.body.dataset ? document.body.dataset.view || "" : "");
        const state = String(document.body && document.body.dataset ? document.body.dataset.state || phase || "" : phase || "");
        const isReferenceOpen = Boolean(referenceModal && referenceModal.classList.contains("show"));
        const isStagePreviewOpen = Boolean(stageIntroModal && stageIntroModal.classList.contains("show"));
        const isStageLeaderboardOpen = Boolean(leaderboardModal && leaderboardModal.classList.contains("show"));
        const isSettingsOpen = Boolean(settingsModal && settingsModal.classList.contains("show"));
        const isCreditsOpen = Boolean(creditsModal && creditsModal.classList.contains("show"));
        const isStatsOpen = Boolean(statsModal && statsModal.classList.contains("show"));
        const isAchievementsOpen = Boolean(achievementsModal && achievementsModal.classList.contains("show"));
        const isStatsLeaderboardOpen = Boolean(statsLeaderboardModal && statsLeaderboardModal.classList.contains("show"));
        let quitBucket = "elsewhere";
        if (view === "splash") {
          quitBucket = "before_first_level_countdown";
        } else if (flashCountdownActive && !activeContext) {
          quitBucket = "first_level_countdown";
        } else if (isStagePreviewOpen) {
          quitBucket = "stage_preview";
        } else if (isStageLeaderboardOpen) {
          quitBucket = "stage_leaderboard";
        } else if (isSettingsOpen) {
          quitBucket = "settings";
        } else if (isCreditsOpen) {
          quitBucket = "credits";
        } else if (isStatsLeaderboardOpen) {
          quitBucket = "stats_leaderboard";
        } else if (isStatsOpen) {
          quitBucket = "stats";
        } else if (isAchievementsOpen) {
          quitBucket = "achievements";
        } else if (isReferenceOpen) {
          quitBucket = "reference";
        } else if (activeContext && Number(activeContext.level_number) === 1) {
          quitBucket = "first_level";
        } else if (activeContext) {
          quitBucket = "later_level";
        } else if (view === "home") {
          quitBucket = "home_menu";
        } else if (view === "stages") {
          quitBucket = "stage_select";
        } else if (view === "loading") {
          quitBucket = "loading";
        }
        return {
          ui_view: view || null,
          ui_state: state || null,
          quit_bucket: quitBucket,
          current_level_number: hasStageIndex ? stageState.index + 1 : null,
          current_stage_failed: hasStageIndex ? Boolean(stageState.failed) : null,
          current_stage_completed: hasStageIndex ? Boolean(stageState.completed) : null,
          flash_countdown_active: Boolean(flashCountdownActive),
          reference_modal_open: isReferenceOpen,
          stage_preview_open: isStagePreviewOpen,
          stage_leaderboard_open: isStageLeaderboardOpen,
          settings_modal_open: isSettingsOpen,
          credits_modal_open: isCreditsOpen,
          stats_modal_open: isStatsOpen,
          achievements_modal_open: isAchievementsOpen,
          stats_leaderboard_modal_open: isStatsLeaderboardOpen,
          ...activeContext
        };
      }

      function logUiInteraction(target, metadata = {}, options = {}) {
        if (typeof window.trackUiInteraction === "function") {
          window.trackUiInteraction(target, metadata, options);
        }
      }

      function logSettingChange(settingName, value, metadata = {}, options = {}) {
        if (typeof window.trackSettingsChange === "function") {
          window.trackSettingsChange(settingName, value, metadata, options);
        }
      }

      function logSettingsSnapshot(source, metadata = {}, options = {}) {
        if (typeof window.trackSettingsSnapshot === "function") {
          window.trackSettingsSnapshot(getTelemetrySettingsSnapshot(), { source, ...metadata }, options);
        }
      }

      function logAutoplayEvent(target, metadata = {}, options = {}) {
        if (typeof window.trackAutoplayEvent === "function") {
          window.trackAutoplayEvent(target, metadata, options);
        }
      }

      window.getTelemetrySettingsSnapshot = getTelemetrySettingsSnapshot;
      window.getTelemetryUiContext = getTelemetryUiContext;

      function setSettingsTab(tabName) {
        if (!settingsModal) return;
        const tabButtons = settingsModal.querySelectorAll("[data-settings-tab]");
        const tabPanes = settingsModal.querySelectorAll("[data-settings-pane]");

        tabButtons.forEach((button) => {
          const isActive = button.getAttribute("data-settings-tab") === tabName;
          button.classList.toggle("is-active", isActive);
          button.setAttribute("aria-selected", isActive ? "true" : "false");
        });
        tabPanes.forEach((pane) => {
          const isActive = pane.getAttribute("data-settings-pane") === tabName;
          pane.classList.toggle("is-active", isActive);
          if (isActive) {
            pane.removeAttribute("hidden");
          } else {
            pane.setAttribute("hidden", "");
          }
        });

      }

      function markPlayerNamePrompted() {
        try {
          window.localStorage.setItem(PLAYER_NAME_PROMPT_KEY, "1");
        } catch {
          // ignore
        }
      }

      function shouldShowSplashScreen() {
        try {
          return window.localStorage.getItem(SPLASH_SEEN_KEY) !== "1";
        } catch {
          return true;
        }
      }

      function markSplashSeen() {
        try {
          window.localStorage.setItem(SPLASH_SEEN_KEY, "1");
        } catch {
          // ignore
        }
      }

      function getDefaultAdaptiveProfile() {
        return {
          group: null,
          failureOnFirstTwo: false,
          groupAMessageShown: false
        };
      }

      function loadAdaptiveProfile() {
        try {
          const raw = window.localStorage.getItem(ADAPTIVE_PROFILE_KEY);
          if (!raw) return getDefaultAdaptiveProfile();
          const parsed = JSON.parse(raw);
          if (!parsed || typeof parsed !== "object") return getDefaultAdaptiveProfile();
          return {
            group: parsed.group === "A" || parsed.group === "B" ? parsed.group : null,
            failureOnFirstTwo: Boolean(parsed.failureOnFirstTwo),
            groupAMessageShown: Boolean(parsed.groupAMessageShown)
          };
        } catch {
          return getDefaultAdaptiveProfile();
        }
      }

      function saveAdaptiveProfile(profile) {
        try {
          window.localStorage.setItem(ADAPTIVE_PROFILE_KEY, JSON.stringify(profile));
        } catch {
          // ignore
        }
      }

      let adaptiveProfile = loadAdaptiveProfile();
      let pendingAdaptiveGroupAMessage = false;

      function updateAdaptiveProfile(mutator) {
        const next = {
          ...getDefaultAdaptiveProfile(),
          ...adaptiveProfile
        };
        if (typeof mutator === "function") {
          mutator(next);
        }
        adaptiveProfile = next;
        saveAdaptiveProfile(adaptiveProfile);
        return adaptiveProfile;
      }

      window.getAdaptiveProfileSnapshot = function getAdaptiveProfileSnapshot() {
        return {
          ...adaptiveProfile,
          group: adaptiveProfile.group === "A" || adaptiveProfile.group === "B"
            ? adaptiveProfile.group
            : "undecided"
        };
      };

      function queueAdaptiveGroupAMessage() {
        updateAdaptiveProfile((profile) => {
          profile.groupAMessageShown = true;
        });
        pendingAdaptiveGroupAMessage = true;
      }

      function registerAdaptiveFailureForStage(stageIndex) {
        if (!Number.isFinite(stageIndex) || stageIndex > 1) return;
        if (adaptiveProfile.group) return;
        updateAdaptiveProfile((profile) => {
          profile.failureOnFirstTwo = true;
          profile.group = "B";
        });
        if (typeof window.trackAdaptiveGroupStatus === "function") {
          window.trackAdaptiveGroupStatus("B", {
            source: "early_stage_failure",
            stage_index: stageIndex,
            level_number: stageIndex + 1
          });
        }
      }

      function registerAdaptiveSuccessForStage(stageIndex) {
        if (!Number.isFinite(stageIndex) || stageIndex !== 1) return;
        if (adaptiveProfile.group === "B") return;
        if (adaptiveProfile.group === "A") {
          if (!adaptiveProfile.groupAMessageShown) {
            queueAdaptiveGroupAMessage();
          }
          return;
        }
        updateAdaptiveProfile((profile) => {
          if (!profile.failureOnFirstTwo) {
            profile.group = "A";
          }
        });
        if (adaptiveProfile.group === "A" && typeof window.trackAdaptiveGroupStatus === "function") {
          window.trackAdaptiveGroupStatus("A", {
            source: "cleared_first_two_levels",
            stage_index: stageIndex,
            level_number: stageIndex + 1
          });
        }
        if (adaptiveProfile.group === "A" && !adaptiveProfile.groupAMessageShown) {
          queueAdaptiveGroupAMessage();
        }
      }

      window.getAdaptiveRevealMultiplier = function getAdaptiveRevealMultiplier() {
        return adaptiveProfile.group === "A" ? 0.5 : 1;
      };
      window.consumeAdaptiveGroupAMessage = function consumeAdaptiveGroupAMessage() {
        if (!pendingAdaptiveGroupAMessage) return "";
        pendingAdaptiveGroupAMessage = false;
        return "Congrats, looks like you are a natural! We've decided to up the difficulty to give you a challenge. Watch out for the reveal time on future levels!";
      };
      window.registerAdaptiveFailureForStage = registerAdaptiveFailureForStage;
      window.registerAdaptiveSuccessForStage = registerAdaptiveSuccessForStage;

      let splashStartListener = null;
      let splashAutoStartTimer = null;
      let splashAutoStartInterval = null;
      let splashAutoStartDismissed = false;
      let splashStartInProgress = false;
      let splashAnyKeyProgress = 0;
      let splashAnyKeyAwaitingEnter = false;
      const SPLASH_AUTO_START_MS = 3000;
      const SPLASH_ANY_KEY_SEQUENCE = "any key";

      function appendLeaderboardDataRow(rows, entry, rank, localName, formatter, rowClassNames = []) {
        if (!entry) return;
        const row = document.createElement("div");
        row.className = "leaderboard-row leaderboard-row--data";
        rowClassNames.forEach((className) => {
          if (className) row.classList.add(className);
        });
        if (rank <= 3) {
          row.classList.add(`leaderboard-row--rank-${rank}`);
        }
        const isMe =
          entry.player_id && window.getLeaderboardPlayerId && entry.player_id === window.getLeaderboardPlayerId();
        if (isMe) {
          row.classList.add(rank <= 4 ? "leaderboard-row--me-top" : "leaderboard-row--me");
        }
        const rawName = isMe && localName ? localName : (entry.player_name || `Player ${entry.player_id || "?"}`);
        row.dataset.playerId = entry.player_id || "";
        row.innerHTML = formatter(rank, rawName, entry);
        rows.push(row);
      }

      function buildLeaderboardPlaceholderRow() {
        const row = document.createElement("div");
        row.className = "leaderboard-row leaderboard-row--context";
        row.innerHTML = `<span>-</span><span class="leaderboard-name">-</span><span>-</span>`;
        return row;
      }

      function updateSplashAutoStartLabel(remainingMs = SPLASH_AUTO_START_MS) {
        if (!splashAutoStartMessage) return;
        const safeMs = Math.max(0, Number(remainingMs) || 0);
        const seconds = (safeMs / 1000).toFixed(1);
        splashAutoStartMessage.textContent = `Starting in ${seconds}`;
      }

      function clearSplashAutoStart() {
        if (splashAutoStartTimer) {
          window.clearTimeout(splashAutoStartTimer);
          splashAutoStartTimer = null;
        }
        if (splashAutoStartInterval) {
          window.clearInterval(splashAutoStartInterval);
          splashAutoStartInterval = null;
        }
        if (splashAutoStartMessage) {
          splashAutoStartMessage.setAttribute("hidden", "");
        }
      }

      function resetSplashAnyKeySequence() {
        splashAnyKeyProgress = 0;
        splashAnyKeyAwaitingEnter = false;
      }

      function getSplashSequenceKey(event) {
        if (!event || typeof event.key !== "string") return "";
        if (event.key === " ") return " ";
        if (event.key === "Spacebar") return " ";
        return event.key.length === 1 ? event.key.toLowerCase() : "";
      }

      function scheduleSplashAutoStart() {
        clearSplashAutoStart();
        if (document.body.classList.contains("loading-overlay")) return;
        if (document.body.dataset.view !== "splash") return;
        if (splashReturnToHome) return;
        if (splashAutoStartDismissed) return;
        if (!shouldShowSplashScreen()) return;
        const startedAt = Date.now();
        if (splashAutoStartMessage) {
          updateSplashAutoStartLabel(SPLASH_AUTO_START_MS);
          splashAutoStartMessage.removeAttribute("hidden");
        }
        splashAutoStartInterval = window.setInterval(() => {
          const elapsedMs = Date.now() - startedAt;
          const remainingMs = SPLASH_AUTO_START_MS - elapsedMs;
          if (remainingMs <= 0) {
            updateSplashAutoStartLabel(0);
            return;
          }
          updateSplashAutoStartLabel(remainingMs);
        }, 100);
        splashAutoStartTimer = window.setTimeout(() => {
          splashAutoStartTimer = null;
          if (splashAutoStartInterval) {
            window.clearInterval(splashAutoStartInterval);
            splashAutoStartInterval = null;
          }
          if (document.body.classList.contains("loading-overlay")) return;
          if (document.body.dataset.view !== "splash") return;
          if (splashReturnToHome) return;
          if (!shouldShowSplashScreen()) return;
          logAutoplayEvent("splash_start", {
            autoplay_mode: "auto",
            trigger_source: "splash_timer"
          }, { immediate: true });
          startFromSplash("auto", { trigger_source: "splash_timer" });
        }, SPLASH_AUTO_START_MS);
      }

      function attachSplashStartListeners() {
        if (splashStartListener) {
          return;
        }
        splashStartListener = (event) => {
          if (document.body.classList.contains("loading-overlay") || document.body.dataset.view === "loading") return;
          if (document.body.dataset.view !== "splash") return;
          if (document.querySelector('.modal.show:not([aria-hidden="true"])')) return;

          if (event.type === "pointerdown") {
            window.removeEventListener("keydown", splashStartListener);
            window.removeEventListener("pointerdown", splashStartListener);
            splashStartListener = null;
            resetSplashAnyKeySequence();
            logAutoplayEvent("splash_start", {
              autoplay_mode: "manual",
              trigger_source: "pointerdown"
            }, { immediate: true });
            startFromSplash("manual", { trigger_source: "pointerdown" });
            return;
          }
          const key = getSplashSequenceKey(event);
          if (splashAnyKeyAwaitingEnter) {
            if (event.key === "Enter") {
              window.removeEventListener("keydown", splashStartListener);
              window.removeEventListener("pointerdown", splashStartListener);
              splashStartListener = null;
              resetSplashAnyKeySequence();
              if (typeof window.syncAchievementsFromLocal === "function") {
                window.syncAchievementsFromLocal({ anyKeySecret: true });
              }
              logAutoplayEvent("splash_start", {
                autoplay_mode: "manual",
                trigger_source: "any_key_enter"
              }, { immediate: true });
              startFromSplash("manual", { trigger_source: "any_key_enter" });
            }
            return;
          }
          if (key) {
            const expected = SPLASH_ANY_KEY_SEQUENCE.charAt(splashAnyKeyProgress);
            if (key === expected) {
              splashAnyKeyProgress += 1;
              clearSplashAutoStart();
              if (splashAnyKeyProgress >= SPLASH_ANY_KEY_SEQUENCE.length) {
                splashAnyKeyAwaitingEnter = true;
              }
              return;
            }
            if (splashAnyKeyProgress > 0) {
              window.removeEventListener("keydown", splashStartListener);
              window.removeEventListener("pointerdown", splashStartListener);
              splashStartListener = null;
              resetSplashAnyKeySequence();
              logAutoplayEvent("splash_start", {
                autoplay_mode: "manual",
                trigger_source: "keyboard_interrupt"
              }, { immediate: true });
              startFromSplash("manual", { trigger_source: "keyboard_interrupt" });
              return;
            }
          }
          window.removeEventListener("keydown", splashStartListener);
          window.removeEventListener("pointerdown", splashStartListener);
          splashStartListener = null;
          resetSplashAnyKeySequence();
          logAutoplayEvent("splash_start", {
            autoplay_mode: "manual",
            trigger_source: "keyboard"
          }, { immediate: true });
          startFromSplash("manual", { trigger_source: "keyboard" });
        };
        window.addEventListener("keydown", splashStartListener);
        window.addEventListener("pointerdown", splashStartListener);
      }

      let playerNamePromptDelayActive = false;
      let playerNamePromptDelayTimer = null;
      let playerNameModalOpening = false;

      let pendingAutoAdvanceNextStart = null;
      window.deferAutoAdvanceNext = function deferAutoAdvanceNext(startFn, force = false) {
        if (typeof startFn !== "function") return false;
        if (force) {
          pendingAutoAdvanceNextStart = startFn;
          return true;
        }
        if (
          playerNamePromptDelayActive ||
          playerNameModalOpening ||
          (playerNameModal && playerNameModal.classList.contains("show"))
        ) {
          pendingAutoAdvanceNextStart = startFn;
          return true;
        }
        return false;
      };
      window.clearDeferredAutoAdvanceNext = function clearDeferredAutoAdvanceNext() {
        pendingAutoAdvanceNextStart = null;
      };

      function flushDeferredAutoAdvanceNext() {
        if (!pendingAutoAdvanceNextStart) return;
        if (
          playerNamePromptDelayActive ||
          playerNameModalOpening ||
          (playerNameModal && playerNameModal.classList.contains("show"))
        ) {
          return;
        }
        const startFn = pendingAutoAdvanceNextStart;
        pendingAutoAdvanceNextStart = null;
        startFn();
      }

      function setResultInteractionsEnabled(enabled) {
        const value = enabled ? "" : "none";
        if (resultsPanel) {
          resultsPanel.style.pointerEvents = value;
        }
        if (actions) {
          actions.style.pointerEvents = value;
        }
      }

      function clearPlayerNameDelay() {
        if (playerNamePromptDelayTimer) {
          window.clearTimeout(playerNamePromptDelayTimer);
          playerNamePromptDelayTimer = null;
        }
        playerNamePromptDelayActive = false;
        setResultInteractionsEnabled(true);
      }

      window.getPlayerName = getPlayerName;
      window.setPlayerName = setPlayerName;
      window.shouldPromptForPlayerName = shouldPromptForPlayerName;
      window.maybePromptPlayerName = function maybePromptPlayerName() {
        if (!shouldPromptForPlayerName()) return;
        playerNamePromptDelayActive = true;
        setResultInteractionsEnabled(false);
        if (typeof window.cancelAutoAdvanceNextFromResults === "function") {
          window.cancelAutoAdvanceNextFromResults();
        }
        if (
          typeof window.deferAutoAdvanceNext === "function" &&
          typeof window.startAutoAdvanceNextFromResults === "function"
        ) {
          window.deferAutoAdvanceNext(window.startAutoAdvanceNextFromResults);
        }
        playerNamePromptDelayTimer = window.setTimeout(() => {
          playerNamePromptDelayTimer = null;
          try {
            if (!shouldPromptForPlayerName()) return;
            openPlayerNameModal();
          } finally {
            clearPlayerNameDelay();
          }
        }, 1200);
      };

      function resetGame() {
        if (window.ScatterLayout) window.ScatterLayout.reset();
        if (window.MemoryChallenges) window.MemoryChallenges.reset();
        if (typeof window.pauseRareEventGracePeriod === "function") {
          window.pauseRareEventGracePeriod();
        }
        bumpRoundFlowToken();

        if (successAnimationActive) {
          cancelSuccessAnimation();
        }
        clearFlashCountdown();
        clearResultAutoActionCountdown();
        if (typeof window.clearPreviousRoundItems === "function") {
          window.clearPreviousRoundItems();
        }
        clearInterval(timerId);
        timerId = null;
        if (stageTimerId) {
          clearInterval(stageTimerId);
          stageTimerId = null;
        }
        document.body.classList.remove("stage-fail");
        if (swapTimeoutId) {
          clearTimeout(swapTimeoutId);
          swapTimeoutId = null;
          swapStartTime = null;
          swapRemaining = null;
          swapStartRecall = null;
          swapCleanup = null;
        }
        pausedState = null;
        timerState = null;
        updatePlatformerVisibility(false);
        stopFog();
        stopGlitching();
        stopSequenceModifier();
        clearAdTimer();
        hideAd();
        round = 0;
        streak = 0;
        sandboxResultStreak = null;
        roundItems = [];
        roundItemsBase = [];
        lastRoundItems = null;
        lastRoundStageId = null;
        updateScore();
        if (timerFill) {
          timerFill.style.width = "100%";
        }
        if (stageTimerHud) {
          stageTimerHud.textContent = "Time 0.00";
        }
        setPhase("Waiting to start", "idle");
        resetBoard();
        if (submitBtn) {
          submitBtn.disabled = true;
        }
        if (nextBtn) {
          nextBtn.disabled = true;
          nextBtn.textContent = "Next round";
        }
      }

      function resetForRetryRound() {
        if (typeof window.pauseRareEventGracePeriod === "function") {
          window.pauseRareEventGracePeriod();
        }
        bumpRoundFlowToken();
        if (successAnimationActive) {
          cancelSuccessAnimation();
        }
        clearFlashCountdown();
        clearResultAutoActionCountdown();
        if (typeof window.clearPreviousRoundItems === "function") {
          window.clearPreviousRoundItems();
        }
        clearInterval(timerId);
        timerId = null;
        document.body.classList.remove("stage-fail");
        if (swapTimeoutId) {
          clearTimeout(swapTimeoutId);
          swapTimeoutId = null;
          swapStartTime = null;
          swapRemaining = null;
          swapStartRecall = null;
          swapCleanup = null;
        }
        pausedState = null;
        timerState = null;
        updatePlatformerVisibility(false);
        stopFog();
        stopGlitching();
        stopSequenceModifier();
        clearAdTimer();
        hideAd();
        if (timerFill) {
          timerFill.style.width = "100%";
        }
        if (submitBtn) {
          submitBtn.disabled = true;
        }
        if (nextBtn) {
          nextBtn.disabled = true;
          nextBtn.textContent = "Next round";
        }
      }

      const AMINO_SETTINGS_KEY = "flashRecallAminoAcidsSettings_v1";
      const aminoSettingsInputs = {
        revealSeconds: aminoRevealInput,
        recallSeconds: aminoRecallInput,
        cards: aminoCardCountInput
      };
      try {
        const saved = JSON.parse(localStorage.getItem(AMINO_SETTINGS_KEY));
        for (const [key, input] of Object.entries(aminoSettingsInputs)) {
          const value = saved && saved[key];
          if (Number.isFinite(value)) input.value = clamp(Math.round(value), Number(input.min), Number(input.max));
        }
        const savedFormats = saved && (Array.isArray(saved.answerFormats) ? saved.answerFormats : [saved.answerFormat]);
        if (savedFormats && aminoAnswerFormatInputs.some(input => savedFormats.includes(input.value))) {
          aminoAnswerFormatInputs.forEach(input => { input.checked = savedFormats.includes(input.value); });
        }
      } catch {}
      let aminoModalTrigger = null;
      function openAminoAcidsModal() {
        aminoModalTrigger = document.activeElement;
        setModalState(aminoAcidsModal, true);
        aminoRevealInput.focus();
      }
      function closeAminoAcidsModal(restoreFocus = true) {
        setModalState(aminoAcidsModal, false);
        if (restoreFocus && aminoModalTrigger && aminoModalTrigger.isConnected) aminoModalTrigger.focus();
      }
      aminoAcidsStart.addEventListener("click", () => {
        logUiInteraction("amino_acids_open", { area: "home_menu", action: "open" });
        openAminoAcidsModal();
      });
      aminoAcidsCancel.addEventListener("click", () => closeAminoAcidsModal());
      aminoAcidsModal.addEventListener("click", event => {
        if (event.target === aminoAcidsModal) closeAminoAcidsModal();
      });
      aminoAnswerFormatInputs.forEach(input => input.addEventListener("change", () => {
        if (getSelectedAminoAnswerFormats().length) aminoAnswerFormatError.hidden = true;
      }));
      aminoAcidsForm.addEventListener("submit", event => {
        event.preventDefault();
        const answerFormats = getSelectedAminoAnswerFormats();
        if (!answerFormats.length) {
          aminoAnswerFormatError.hidden = false;
          aminoAnswerFormatInputs[0].focus();
          return;
        }
        const settings = Object.fromEntries(Object.entries(aminoSettingsInputs).map(([key, input]) => [key, Number(input.value)]));
        settings.answerFormats = answerFormats;
        try { localStorage.setItem(AMINO_SETTINGS_KEY, JSON.stringify(settings)); } catch {}
        resetStageProgress();
        modeSelect.value = "aminoAcids";
        updateModeUI();
        resetGame();
        closeAminoAcidsModal(false);
        logUiInteraction("amino_acids_start", { area: "amino_acids_settings", action: "start", ...settings });
        startRound();
      });

      function openPracticeModal() {
        setModalState(practiceModal, true);

        updateCategoryControls();

      }

      function closePracticeModal() {
        setModalState(practiceModal, false);
      }

      function updatePracticeAvailability() {
        if (practiceStart) practiceStart.disabled = false;
      }

      function formatStageModifiers(modifiers) {
        const entries = [
          { key: "mathOps", label: "Math ops" },
          { key: "mathOpsPlus", label: "Math ops+" },
          { key: "misleadColors", label: "Misleading colors" },
          { key: "backgroundColor", label: "Background color" },
          { key: "textColor", label: "Text color" },
          { key: "previousCard", label: "Previous card" },
          { key: "rotate", label: "Rotate" },
          { key: "rotatePlus", label: "Rotate+" },
          { key: "swapCards", label: "Card swap" },
          { key: "platformer", label: "Platformer" },
          { key: "glitch", label: "Glitch" },
          { key: "fog", label: "Fog" },
          { key: "blur", label: "Blur" },
          { key: "ads", label: "Ads" }
        ];
        const enabled = entries.filter((entry) => modifiers && modifiers[entry.key]).map((entry) => entry.label);
        return enabled.length ? enabled.join(", ") : "None";
      }

      stageIntroPendingIndex = null;
      let stageIntroOriginEl = null;
      let stageIntroAnimationMode = null;
      let stageIntroOpenSource = "stage_card";
      let stageIntroStartSource = "manual";
      window.setStageIntroAnimationMode = function setStageIntroAnimationMode(mode) {
        stageIntroAnimationMode = mode;
      };
      window.setStageIntroOpenSource = function setStageIntroOpenSource(source) {
        stageIntroOpenSource = source || "stage_card";
      };
      let flashStagePendingIndex = null;
      let flashCountdownTimers = [];
      let flashCountdownActive = false;
      flashWarningEnabled = true;
      let tabTutorialShownRound = null;
      window.tabTutorialActive = false;
      let tabTutorialDisabledInputs = [];
      let tabTutorialHintEl = null;
      let tabTutorialHintTimeout = null;
      const isTabTutorialEnabledForStage = (stage) => stage && stage.tabTutorialEnabled === true;
      let firstLetterHintCooldown = 0;
      let firstLetterHintEl = null;
      let firstLetterHintTimeout = null;
      const legacyFirstLetterHintMessages = {
        5: "FIRST LETTER\n(Triangle -> T, Circle -> C, Square -> S)",
        6: "FIRST LETTER\n(Right -> R, Left -> L, Up -> U, ...)",
        7: "FIRST LETTER\n(White -> W, Red -> R, Blue -> B, ...)"
      };
      const getFirstLetterHintMessage = (stage, roundIndex) => {
        if (!stage) return "";
        if (stage.firstLetterHintEnabled === false) return "";
        if (stage.firstLetterHintByRound && typeof stage.firstLetterHintByRound === "object") {
          const roundMessage = stage.firstLetterHintByRound[roundIndex];
          if (typeof roundMessage === "string" && roundMessage.trim()) {
            return roundMessage;
          }
          if (roundIndex in stage.firstLetterHintByRound) {
            return "";
          }
        }
        if (Array.isArray(stage.firstLetterHintRounds) && stage.firstLetterHintRounds.length) {
          if (!stage.firstLetterHintRounds.includes(roundIndex)) {
            return "";
          }
        }
        if (typeof stage.firstLetterHintMessage === "string" && stage.firstLetterHintMessage.trim()) {
          return stage.firstLetterHintMessage;
        }
        if (stage.legacyFirstLetterHintEnabled === true) {
          return legacyFirstLetterHintMessages[stage.id] || "";
        }
        return "";
      };
      let stageListAnimTimeout = null;
      let stageListStarTimeout = null;
      let stageListBobTimeout = null;

      let resultFinalStageMessageTimer = null;
      let resultFinalStageFlyTimer = null;
      let stageListAnimActive = false;
      let stageListMouseListenerAttached = false;
      let stageListSkipListener = null;
      flashCountdownEnabled = defaultControlSettings.flashCountdown;
      enterToNextEnabled = true;
      if (leaderboardsEnabledToggle) {
        const storageKey = LEADERBOARDS_ENABLED_STORAGE_KEY;
        const saved = window.localStorage.getItem(storageKey);
        if (saved !== null) {
          leaderboardsEnabledToggle.checked = saved === "1";
        } else {
          leaderboardsEnabledToggle.checked = Boolean(defaultControlSettings.leaderboardsEnabled);
        }
        leaderboardsEnabled = leaderboardsEnabledToggle.checked;
        leaderboardsEnabledToggle.addEventListener("change", () => {
          leaderboardsEnabled = leaderboardsEnabledToggle.checked;
          window.localStorage.setItem(storageKey, leaderboardsEnabled ? "1" : "0");
          logSettingChange("leaderboards_enabled", leaderboardsEnabled, {
            setting_category: "controls"
          });
          logSettingsSnapshot("setting_change", {
            setting_name: "leaderboards_enabled"
          });
          if (typeof window.refreshVisibleLeaderboards === "function") {
            window.refreshVisibleLeaderboards();
          }
        });
      } else {
        leaderboardsEnabled = Boolean(defaultControlSettings.leaderboardsEnabled);
      }
      let stageStarShineInterval = null;
      let resultAutoActionTimers = [];
      const RESULT_AUTO_ACTION_SECONDS = 3;

      function applyStageIntroOrigin(originEl) {
        if (!stageIntroModal || !stageIntroCard) return;
        stageIntroCard.classList.remove("intro-animate");
        stageIntroCard.style.removeProperty("--intro-from-x");
        stageIntroCard.style.removeProperty("--intro-from-y");
        stageIntroCard.style.removeProperty("--intro-from-scale");
        if (!originEl) {
          return;
        }
        const originRect = originEl.getBoundingClientRect();
        requestAnimationFrame(() => {
          if (!stageIntroModal.classList.contains("show")) return;
          const modalRect = stageIntroCard.getBoundingClientRect();
          if (!modalRect.width || !modalRect.height) return;
          const originCenterX = originRect.left + originRect.width / 2;
          const originCenterY = originRect.top + originRect.height / 2;
          const modalCenterX = modalRect.left + modalRect.width / 2;
          const modalCenterY = modalRect.top + modalRect.height / 2;
          const dx = originCenterX - modalCenterX;
          const dy = originCenterY - modalCenterY;
          const scale = Math.min(originRect.width / modalRect.width, originRect.height / modalRect.height, 1);
          stageIntroCard.style.setProperty("--intro-from-x", `${dx}px`);
          stageIntroCard.style.setProperty("--intro-from-y", `${dy}px`);
          stageIntroCard.style.setProperty("--intro-from-scale", `${Math.max(0.6, scale)}`);
          stageIntroCard.classList.remove("intro-animate", "intro-soft", "intro-auto");
          void stageIntroCard.offsetWidth;
          stageIntroCard.classList.add("intro-animate");
        });
      }

      function closeStageIntro() {
        stageIntroPendingIndex = null;
        stageIntroOriginEl = null;
        if (stageIntroCard) {
          stageIntroCard.classList.remove("intro-animate", "intro-soft", "intro-auto");
          stageIntroCard.style.removeProperty("--intro-from-x");
          stageIntroCard.style.removeProperty("--intro-from-y");
          stageIntroCard.style.removeProperty("--intro-from-scale");
        }
        syncStageIntroPreviewNavigation(null);
        clearStageIntroAutoStart();
        setModalState(stageIntroModal, false);
      }

      function clearFlashCountdown() {
        flashCountdownActive = false;
        flashCountdownTimers.forEach((timerId) => clearTimeout(timerId));
        flashCountdownTimers = [];
        if (flashCountdown) {
          flashCountdown.classList.remove("show");
          flashCountdown.setAttribute("aria-hidden", "true");
        }
        document.body.classList.remove("flash-countdown-active");
      }

function runFlashCountdown(onComplete) {
        if (flashCountdownActive) {
          return;
        }
        if (!flashCountdownEnabled) {
          if (typeof onComplete === "function") onComplete();
          return;
        }
        if (!flashCountdown) {
          if (typeof onComplete === "function") onComplete();
          return;
        }
        clearFlashCountdown();
        flashCountdownActive = true;
        document.body.classList.add("flash-countdown-active");
        const label = flashCountdown.querySelector(".flash-countdown__num");
        const steps = ["3", "2", "1"];
        const durationMs = 1000;
        const stepInterval = durationMs / steps.length;
        const countdownStart = performance.now();
        if (gameMode === "stages" && stageState && stageState.active) {
          stopStageStopwatch();
        }
        flashCountdown.classList.add("show");
        flashCountdown.removeAttribute("aria-hidden");
        steps.forEach((value, index) => {
          const timerId = window.setTimeout(() => {
            if (label) {
              label.textContent = value;
            }
          }, Math.floor(index * stepInterval));
          flashCountdownTimers.push(timerId);
        });
        const finishId = window.setTimeout(() => {
          flashCountdownActive = false;
          clearFlashCountdown();
          if (gameMode === "stages" && stageState && typeof stageState.startTime === "number") {
            stageState.startTime += performance.now() - countdownStart;
            if (!document.body.classList.contains("pause-active")) {
              startStageStopwatch();
            }
          }
          if (typeof onComplete === "function") onComplete();
        }, durationMs);
        flashCountdownTimers.push(finishId);
      }

      function startFlashRound() {
        runFlashCountdown(() => {
          startRound({ advanceRound: true, __flashOverride: true });
        });
      }

      window.startFlashRound = startFlashRound;

      function clearResultAutoActionCountdown() {
        resultAutoActionTimers.forEach((timerId) => clearTimeout(timerId));
        resultAutoActionTimers = [];
        document
          .querySelectorAll("#stageRetryButton")
          .forEach((button) => {
            if (!button) return;
            button.classList.remove("is-auto-target");
            const badge = button.querySelector(".action-countdown");
            if (badge) {
              badge.textContent = "";
            }
          });
      }

      function getResultAutoActionButton(kind) {
        if (kind === "retry") {
          return document.getElementById("stageRetryButton");
        }
        return null;
      }

      function setResultAutoActionBadge(kind, remainingSeconds) {
        const button = getResultAutoActionButton(kind);
        if (!button) return;
        const badge = button.querySelector(".action-countdown");
        if (!badge) return;
        const actionLabel = kind === "retry" ? "Retry" : "Next";
        button.classList.add("is-auto-target");
        badge.textContent = `${actionLabel} in ${remainingSeconds}`;
      }

      function runResultAutoAction(kind) {
        clearResultAutoActionCountdown();
        if (phase !== "result" || gameMode !== "stages") return;
        if (kind === "retry") {
          startStage(stageState.index, { skipIntro: true });
        }
      }

      function startResultAutoActionCountdown(kind, seconds = RESULT_AUTO_ACTION_SECONDS) {
        const button = getResultAutoActionButton(kind);
        if (!button) return;
        clearResultAutoActionCountdown();
        for (let remaining = seconds; remaining >= 1; remaining -= 1) {
          const timerId = window.setTimeout(() => {
            setResultAutoActionBadge(kind, remaining);
          }, (seconds - remaining) * 1000);
          resultAutoActionTimers.push(timerId);
        }
        const finishId = window.setTimeout(() => {
          runResultAutoAction(kind);
        }, seconds * 1000);
        resultAutoActionTimers.push(finishId);
      }

      function refreshResultAutoActionCountdown() {
        clearResultAutoActionCountdown();
        if (phase !== "result" || gameMode !== "stages") return;
        if (playerNamePromptDelayActive || playerNameModalOpening) return;
        if (playerNameModal && playerNameModal.classList.contains("show")) return;
      }

      window.clearResultAutoActionCountdown = clearResultAutoActionCountdown;
      window.refreshResultAutoActionCountdown = refreshResultAutoActionCountdown;

      function openFlashStagePrompt(index) {
        if (!flashWarningEnabled) {
          return;
        }
        flashStagePendingIndex = index;
        setModalState(flashStageModal, true);
      }

      function closeFlashStagePrompt() {
        flashStagePendingIndex = null;
        setModalState(flashStageModal, false);
      }

      function clearStageIntroAutoStart() {
        if (stageIntroAutoStartTimerId) {
          clearTimeout(stageIntroAutoStartTimerId);
          stageIntroAutoStartTimerId = null;
        }
        if (stageIntroCard) {
          stageIntroCard.classList.remove("intro-auto");
        }
        const timer = document.querySelector("#stageIntroModal .stage-intro-start-timer");
        if (timer) {
          timer.classList.remove("is-running");
          timer.classList.remove("is-canceled");
        }
        const fill = timer ? timer.querySelector(".stage-intro-start-timer__fill") : null;
        if (fill) {
          fill.style.removeProperty("transition");
          fill.style.removeProperty("transition-duration");
          fill.style.removeProperty("transform");
        }
      }

      function cancelStageIntroAutoStartBar(reason = null) {
        if (stageIntroAutoStartTimerId && reason) {
          logAutoplayEvent("stage_preview_autostart_cancelled", {
            autoplay_mode: "manual",
            cancel_source: reason,
            level_number: Number.isFinite(stageIntroPendingIndex) ? stageIntroPendingIndex + 1 : null
          }, { immediate: true });
        }
        if (stageIntroAutoStartTimerId) {
          clearTimeout(stageIntroAutoStartTimerId);
          stageIntroAutoStartTimerId = null;
        }
        const timer = document.querySelector("#stageIntroModal .stage-intro-start-timer");
        const fill = timer ? timer.querySelector(".stage-intro-start-timer__fill") : null;
        if (timer) {
          timer.classList.remove("is-running");
          timer.classList.add("is-canceled");
        }
        if (fill) {
          fill.style.transition = "none";
          fill.style.transform = "scaleX(0)";
          void fill.offsetWidth;
        }
      }

      function cancelStageNextAutoAdvanceBar() {
        const timer = document.querySelector("#resultsPanel .stage-next-timer");
        const fill = timer ? timer.querySelector(".stage-next-timer__fill") : null;
        if (timer) {
          timer.classList.remove("is-running");
          timer.classList.remove("is-waiting");
          timer.classList.add("is-canceled");
          timer.classList.add("is-disabled");
        }
        if (fill) {
          fill.style.transition = "none";
          fill.style.transform = "scaleX(0)";
          void fill.offsetWidth;
        }
      }

      function cancelStageRetryAutoAdvanceBar() {
        const timer = document.querySelector(".stage-retry-timer");
        const fill = timer ? timer.querySelector(".stage-retry-timer__fill") : null;
        if (timer) {
          timer.classList.remove("is-running");
          timer.classList.remove("is-waiting");
          timer.classList.add("is-canceled");
          timer.classList.add("is-disabled");
        }
        if (fill) {
          fill.style.transition = "none";
          fill.style.transform = "scaleX(0)";
          void fill.offsetWidth;
        }
      }

      function hideStageNextAutoAdvanceBar() {
        const timer = document.querySelector("#resultsPanel .stage-next-timer");
        const fill = timer ? timer.querySelector(".stage-next-timer__fill") : null;
        if (timer) {
          timer.classList.remove("is-running");
          timer.classList.remove("is-waiting");
          timer.classList.remove("is-canceled");
          timer.classList.add("is-disabled");
        }
        if (fill) {
          fill.style.transition = "none";
          fill.style.transform = "scaleX(0)";
          void fill.offsetWidth;
          fill.style.removeProperty("transition");
          fill.style.removeProperty("transition-duration");
        }
      }

      function openStageIntro(index, originEl = null) {
        if (!stageIntroModal || !stageIntroTitle || !stageIntroList) return false;
        const stage = window.getStageConfig ? window.getStageConfig(index) : null;
        if (!stage) return false;
        if (!window.__stageIntroWarmed && stageIntroModal) {
          window.__stageIntroWarmed = true;
          stageIntroModal.style.visibility = "hidden";
          stageIntroModal.style.display = "grid";
          stageIntroModal.offsetHeight;
          stageIntroModal.style.display = "";
          stageIntroModal.style.visibility = "";
        }
        const stageName = stage.name ? String(stage.name) : `Stage ${index + 1}`;
        stageIntroTitle.textContent = stageName;
        if (stageIntroStars) {
          stageIntroStars.innerHTML = "";
          const stageKey = window.getStageStarsKey
            ? window.getStageStarsKey(stage, index)
            : (stage && stage.id ? String(stage.id) : String(index + 1));
          const starsEarned = window.stageStars && window.stageStars[stageKey] ? window.stageStars[stageKey] : 0;
          [1, 2, 3].forEach((value) => {
            const star = document.createElement("span");
            star.className = `stage-star${starsEarned >= value ? " is-filled" : ""}`;
            star.textContent = "\u2726";
            stageIntroStars.appendChild(star);
          });
          if (starsEarned >= 4) {
            const secret = document.createElement("span");
            secret.className = "stage-star is-filled is-secret";
            secret.textContent = "\u2726";
            stageIntroStars.appendChild(secret);
          }
        }
        if (stageIntroBest) {
          const bestKey = window.getStageBestTimeKey
            ? window.getStageBestTimeKey(stage, index)
            : (stage && stage.id ? String(stage.id) : String(index + 1));
          const bestSeconds = Number(window.stageBestTimes && window.stageBestTimes[bestKey]);
          stageIntroBest.textContent = Number.isFinite(bestSeconds)
            ? `Best: ${bestSeconds.toFixed(2)}s`
            : "Best: \u2014";
        }
        if (stageIntroSubtitle) {
          const rounds = stage.rounds || 1;
          const cards = window.getStageCardCount ? window.getStageCardCount(stage) : stage.cards || 1;
          const revealSeconds = Number(stage.revealSeconds) || Number(revealInput.value) || 5;
          const recallSeconds = Number(stage.recallSeconds) || Number(recallInput.value) || 5;
          stageIntroSubtitle.innerHTML = "";
          const chips = [
            { label: "Rounds", value: rounds },
            { label: "Cards", value: cards },
            { label: "Reveal", value: `${revealSeconds}s` },
            { label: "Recall", value: `${recallSeconds}s` }
          ];
          chips.forEach((chip) => {
            const pill = document.createElement("span");
            pill.className = "stage-intro-chip";
            pill.textContent = chip.label;
            pill.dataset.value = chip.value;
            stageIntroSubtitle.appendChild(pill);
          });
        }
        if (stageIntroGoals) {
          stageIntroGoals.innerHTML = "";
        }
        stageIntroList.innerHTML = "";
        const categories = window.getStageCategories ? window.getStageCategories(stage) : stage.categories || [];
        const modifiers = window.getStageModifiers ? window.getStageModifiers(stage) : stage.modifiers || {};
        const glitchSvg =
          '<svg class="glitch-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true">' +
          '<rect class="glitch-card-fill" x="6" y="6" width="52" height="52" rx="8" fill="#ffffff" stroke="#111111" stroke-width="3"/>' +
          '<text x="32" y="42" text-anchor="middle" font-family="\'Arial Black\', sans-serif" font-size="28" fill="#111">7</text>' +
          "</svg>";
        const cardIconMap = {
          numbers: { label: "Numbers", src: "imgs/icons/card-numbers.svg" },
          colors: { label: "Colors", src: "imgs/icons/card-colors.svg" },
          letters: { label: "Letters", src: "imgs/icons/card-letters.svg" },
          greekLetters: { label: "Greek letters", src: "imgs/icons/card-greekletters.svg" },
          directions: { label: "Directions", src: "imgs/icons/card-directions.svg" },
          diagonal: { label: "Diagonal", src: "imgs/icons/card-diagonal.svg" },
          shapes: { label: "Shapes", src: "imgs/icons/card-shapes.svg" },
          fruits: { label: "Fruits", src: "imgs/apple.png" },
          aminoAcids: { label: "Amino Acids", src: "amino_acids/structures/alanine.png" }
        };
        const modifierIconMap = {
          mathOps: { label: "Math ops", src: "imgs/icons/mod-mathops.svg" },
          mathOpsPlus: { label: "Math ops+", src: "imgs/icons/mod-mathopsplus.svg" },
          misleadColors: { label: "Mislead", src: "imgs/icons/mod-misleadcolors.svg" },
          backgroundColor: { label: "Background", src: "imgs/icons/mod-backgroundcolor.svg" },
          textColor: { label: "Text color", src: "imgs/icons/mod-textcolor.svg" },
          previousCard: { label: "Previous", src: "imgs/icons/mod-previouscard.svg" },
          rotate: { label: "Rotate", src: "imgs/icons/mod-rotate.svg" },
          rotatePlus: { label: "Rotate+", src: "imgs/icons/mod-rotateplus.svg" },
          sequence: { label: "Sequence", src: "imgs/icons/mod-sequence.svg" },
          swapCards: { label: "Swap", src: "imgs/icons/mod-swapcards.svg" },
          platformer: { label: "Platformer", src: "imgs/icons/mod-platformer.svg" },
          glitch: { label: "Glitch", inlineSvg: glitchSvg },
          fog: { label: "Fog", src: "imgs/icons/mod-fog.svg" },
          blur: { label: "Blur", src: "imgs/icons/mod-blur.svg" },
          ads: { label: "Ads", src: "imgs/icons/mod-ads.svg" }
        };
        const renderIconSection = (title, items) => {
          const section = document.createElement("div");
          section.className = "stage-intro-section-block";
          const heading = document.createElement("div");
          heading.className = "stage-intro-section";
          heading.textContent = title;
          const grid = document.createElement("div");
          grid.className = "stage-intro-icon-grid";
          items.forEach((item) => {
            const tile = document.createElement("div");
            tile.className = "stage-intro-icon";
            let visual;
            if (item.inlineSvg) {
              const wrapper = document.createElement("span");
              wrapper.innerHTML = item.inlineSvg;
              visual = wrapper.firstElementChild;
            } else {
              const img = document.createElement("img");
              img.src = item.src;
              img.alt = item.label;
              img.loading = "lazy";
              if (item.className) {
                img.classList.add(item.className);
              }
              visual = img;
            }
            const label = document.createElement("span");
            label.textContent = item.label;
            tile.appendChild(visual);
            tile.appendChild(label);
            grid.appendChild(tile);
          });
          section.appendChild(heading);
          section.appendChild(grid);
          stageIntroList.appendChild(section);
        };
        const categoryKeys = categories.length ? categories : ["numbers"];
        const cardItems = categoryKeys
          .map((key) => cardIconMap[key])
          .filter(Boolean);
        renderIconSection("Card Types", cardItems);
        const modifierItems = Object.keys(modifierIconMap)
          .filter((key) => modifiers && modifiers[key])
          .map((key) => modifierIconMap[key]);
        if (modifierItems.length) {
          renderIconSection("Modifiers", modifierItems);
        }
        stageIntroPendingIndex = index;

        syncStageIntroPreviewNavigation(index);
        if (leaderboardOpen) {
          leaderboardOpen.dataset.stageIndex = String(index);
        }
        stageIntroOriginEl = originEl;
        setModalState(stageIntroModal, true);
        if (stageIntroCard) {
          stageIntroCard.classList.remove("intro-animate", "intro-soft", "intro-auto");
        }
        clearStageIntroAutoStart();
        const animateMode = stageIntroAnimationMode;
        stageIntroAnimationMode = null;
        const previewSource = stageIntroOpenSource || (animateMode === "auto" ? "result_autoplay" : "stage_card");
        logAutoplayEvent("stage_preview_open", {
          autoplay_mode: animateMode === "auto" ? "auto" : "manual",
          preview_source: previewSource,
          level_number: index + 1,
          stage_type: stage && stage.stageType ? String(stage.stageType).toLowerCase() : null
        });
        stageIntroStartSource = "manual";
        if (animateMode === "auto" && stageIntroAutoStartEnabled) {
          if (stageIntroCard) {
            void stageIntroCard.offsetWidth;
            stageIntroCard.classList.add("intro-soft", "intro-auto");
          }
          const autoDelayMs = 3000;
          const timer = document.querySelector("#stageIntroModal .stage-intro-start-timer");
          const fill = timer ? timer.querySelector(".stage-intro-start-timer__fill") : null;
          if (fill) {
            fill.style.transitionDuration = `${autoDelayMs}ms`;
          }
          if (timer) {
            timer.classList.remove("is-running");
            timer.classList.remove("is-canceled");
            requestAnimationFrame(() => {
              timer.classList.add("is-running");
            });
          }
          stageIntroAutoStartTimerId = window.setTimeout(() => {
            stageIntroAutoStartTimerId = null;
            if (stageIntroModal && stageIntroModal.classList.contains("show")) {
              if (stageIntroStart) {
                stageIntroStartSource = "auto_preview_timer";
                stageIntroStart.click();
              }
            }
          }, autoDelayMs);
        } else if (animateMode === "soft") {
          if (stageIntroCard) {
            void stageIntroCard.offsetWidth;
            stageIntroCard.classList.add("intro-soft");
          }
        } else {
          applyStageIntroOrigin(stageIntroOriginEl);
        }
        stageIntroOpenSource = "stage_card";
        return true;
      }

      function hasAnyStageCompletion(stage, index) {
        if (!window.stageCompleted) return false;
        const stageId = stage && stage.id ? String(stage.id) : String(index + 1);
        const currentKey = window.getStageStarsKey
          ? window.getStageStarsKey(stage, index)
          : stageId;
        if (window.stageCompleted[currentKey]) return true;
        const prefix = `${stageId}_v`;
        return Object.keys(window.stageCompleted).some(
          (key) => key.startsWith(prefix) && window.stageCompleted[key]
        );
      }

      function isStageUnlocked(stageIndex) {
        const stages = Array.isArray(window.stagesConfig) ? window.stagesConfig : [];
        return Number.isInteger(stageIndex) && stageIndex >= 0 && stageIndex < stages.length;
      }

      function getSuggestedStageIndex() {
        const stages = Array.isArray(window.stagesConfig) ? window.stagesConfig : [];
        const next = stages.findIndex((stage, index) => !hasAnyStageCompletion(stage, index));
        return next >= 0 ? next : stages.length - 1;
      }

      function getAdjacentUnlockedStageIndex(currentIndex, direction) {
        if (!Number.isFinite(currentIndex)) return null;
        const step = Number(direction) < 0 ? -1 : 1;
        const stages = Array.isArray(window.stagesConfig) ? window.stagesConfig : [];
        for (let nextIndex = currentIndex + step; nextIndex >= 0 && nextIndex < stages.length; nextIndex += step) {
          if (isStageUnlocked(nextIndex)) {
            return nextIndex;
          }
        }
        return null;
      }

      function syncStageIntroPreviewNavigation(stageIndex = stageIntroPendingIndex) {
        const prevButton = document.getElementById("stageIntroPrev");
        const nextButton = document.getElementById("stageIntroNext");
        if (!(prevButton && nextButton)) return;
        const prevIndex = Number.isFinite(stageIndex) ? getAdjacentUnlockedStageIndex(stageIndex, -1) : null;
        const nextIndex = Number.isFinite(stageIndex) ? getAdjacentUnlockedStageIndex(stageIndex, 1) : null;
        prevButton.disabled = !Number.isFinite(prevIndex);
        nextButton.disabled = !Number.isFinite(nextIndex);
        prevButton.dataset.stageIndex = Number.isFinite(prevIndex) ? String(prevIndex) : "";
        nextButton.dataset.stageIndex = Number.isFinite(nextIndex) ? String(nextIndex) : "";
      }

      function navigateStageIntroPreview(direction, source = "button") {
        if (!(stageIntroModal && stageIntroModal.classList.contains("show"))) return false;
        if (leaderboardModal && leaderboardModal.classList.contains("show")) return false;
        const nextIndex = getAdjacentUnlockedStageIndex(stageIntroPendingIndex, direction);
        if (!Number.isFinite(nextIndex)) return false;
        if (stageIntroCard && stageIntroCard.classList.contains("intro-auto")) {
          cancelStageIntroAutoStartBar(source === "keyboard" ? "stage_preview_arrow_key" : "stage_preview_arrow_button");
        }
        if (typeof window.setStageIntroOpenSource === "function") {
          window.setStageIntroOpenSource(source === "keyboard" ? "preview_arrow_key" : "preview_arrow_button");
        }
        if (typeof window.setStageIntroAnimationMode === "function") {
          window.setStageIntroAnimationMode("soft");
        }
        logUiInteraction("stage_preview_navigate", {
          area: "stage_preview",
          action: "navigate",
          navigation_source: source,
          level_number: nextIndex + 1
        });
        openStageIntro(nextIndex, null);
        return true;
      }

      function renderStageList(animate = false) {
        if (!stageList) return;

        if (!window.stageNewSeen) {
          window.stageNewSeen = {};
        }
        stageListAnimActive = false;
        stageListMouseListenerAttached = false;
        if (stageListSkipListener) {
          window.removeEventListener("mousemove", stageListSkipListener);
          stageListSkipListener = null;
        }
        if (stageListAnimTimeout) {
          clearTimeout(stageListAnimTimeout);
          stageListAnimTimeout = null;
        }
        if (stageListStarTimeout) {
          clearTimeout(stageListStarTimeout);
          stageListStarTimeout = null;
        }
        if (stageListBobTimeout) {
          clearTimeout(stageListBobTimeout);
          stageListBobTimeout = null;
        }
        stageList.querySelectorAll(".stage-card--bob").forEach((card) => {
          card.classList.remove("stage-card--bob");
        });
        const stages = Array.isArray(window.stagesConfig) ? window.stagesConfig : [];
        const pageSize = 20;
        const totalPages = Math.max(1, Math.ceil(stages.length / pageSize));
        stageState.page = Math.max(0, Math.min(stageState.page || 0, totalPages - 1));
        const stagesTotal = document.getElementById("stagesTotal");
        const stagesProgress = document.getElementById("stagesProgress");
        if (stagesTotal || stagesProgress) {
          const totalStars = stages.reduce((sum, stage, index) => {
            const stageKey = window.getStageStarsKey
              ? window.getStageStarsKey(stage, index)
              : (stage && stage.id ? String(stage.id) : String(index + 1));
            return sum + (window.stageStars && window.stageStars[stageKey] ? window.stageStars[stageKey] : 0);
          }, 0);
          const completedCount = stages.reduce((sum, stage, index) => {
            const stageKey = window.getStageStarsKey
              ? window.getStageStarsKey(stage, index)
              : (stage && stage.id ? String(stage.id) : String(index + 1));
            return sum + (window.stageCompleted && window.stageCompleted[stageKey] ? 1 : 0);
          }, 0);
          if (stagesTotal) {
            stagesTotal.innerHTML = `<span class="stage-total__stars">\u2726</span><span class="stage-total__count">${totalStars}</span>`;
          }
          if (stagesProgress) {
            stagesProgress.innerHTML = `<span class="stage-progress__label stage-progress__label--check">\u2713</span><span class="stage-progress__count">${completedCount}/${stages.length}</span>`;
          }
        }
        if (!stages.length) {
          stageList.innerHTML = "<div class=\"stage-meta\">No stages configured yet.</div>";
          return;
        }
        const pageStart = stageState.page * pageSize;
        const pageStages = stages.slice(pageStart, pageStart + pageSize);
        const suggestedStageIndex = getSuggestedStageIndex();
        stageList.classList.add("stage-list--hidden");
        stageList.innerHTML = pageStages
          .map((stage, offset) => {
            const index = pageStart + offset;
            const stageKey = window.getStageStarsKey
              ? window.getStageStarsKey(stage, index)
              : (stage && stage.id ? String(stage.id) : String(index + 1));
            const completionKey = window.getStageStarsKey
              ? window.getStageStarsKey(stage, index)
              : (stage && stage.id ? String(stage.id) : String(index + 1));
            const stars = window.stageStars && window.stageStars[stageKey] ? window.stageStars[stageKey] : 0;
            const bestKey = window.getStageBestTimeKey
              ? window.getStageBestTimeKey(stage, index)
              : stageKey;
            const bestTimeSeconds = Number(
              window.stageBestTimes && window.stageBestTimes[bestKey]
            );
            const isCompleted = window.stageCompleted && window.stageCompleted[completionKey];
            const stageType = stage && stage.stageType ? String(stage.stageType).toLowerCase() : "";
            const stageTypeIcon =
              stageType === "flash"
                ? { src: "imgs/flash_icon.png", label: "Flash level" }
                : stageType === "tutorial"
                  ? { src: "imgs/tutorial_icon.png", label: "Tutorial level" }
                  : stageType === "challenge"
                    ? { src: "imgs/icons/challenge-icon.svg", label: "Challenge level" }
                    : stageType === "sequence"
                      ? { src: "imgs/icons/sequence-icon.svg", label: "Sequence level" }
                  : null;

            const starsMarkup = [1, 2, 3]
              .map((value) => {
                const filled = stars >= value ? " is-filled" : "";
                return `<span class="stage-star${filled}">\u2726</span>`;
              })
              .join("");
            const secretStarMarkup = stars >= 4 ? `<span class="stage-star is-filled is-secret">\u2726</span>` : "";

            const name = stage && stage.id ? String(stage.id) : String(index + 1);
            const isCurrentStage = index === suggestedStageIndex;
            const stageTypeClass = stageType ? ` stage-card--${stageType}` : "";
            const currentClass = isCurrentStage ? " stage-card--current" : "";
            const attempted = isCompleted || stars > 0 || Number.isFinite(bestTimeSeconds);
            const showProgress = attempted;
            const unattempted = !attempted;
            const isNew = unattempted && index !== 0 && !window.stageNewSeen[stageKey];
            const newLabel = isNew ? `<div class="stage-meta stage-new">New</div>` : "";
            const placeholderStars =
              `<div class="stage-meta stage-stars stage-meta--placeholder" aria-hidden="true">` +
              `<span class="stage-star">\u2726</span><span class="stage-star">\u2726</span><span class="stage-star">\u2726</span>` +
              `</div>`;
            const placeholderBest = `<div class="stage-meta stage-best stage-meta--placeholder" aria-hidden="true"></div>`;

            if (unattempted) {
              window.stageNewSeen[stageKey] = true;
            }

            return `
              <button class="stage-card stage-card--clickable${stageTypeClass}${currentClass}" type="button" data-stage-index="${index}" data-anim-index="${offset}" data-anim-state="pending" data-stage-type="${stageType}">
                <strong>${name}</strong>
                ${newLabel}
                ${
                  showProgress
                    ? `<div class="stage-meta stage-stars">${starsMarkup}${secretStarMarkup}</div>`
                    : unattempted
                      ? `<div class="stage-meta stage-stars">${starsMarkup}</div>`
                      : placeholderStars
                }
                ${placeholderBest}

                ${stageTypeIcon ? `<img class="stage-type-icon" src="${stageTypeIcon.src}" alt="${stageTypeIcon.label}" />` : ""}
              </button>
            `;
          })
          .join("");
        if (stagesFooter) {
          stagesFooter.textContent =
            totalPages > 1 ? `Page ${stageState.page + 1} / ${totalPages}` : "";
        }
        if (stagesNext) {
          stagesNext.style.display = totalPages > 1 ? "inline-flex" : "none";
        }
        if (stagesPrev) {
          stagesPrev.style.display = totalPages > 1 ? "inline-flex" : "none";
        }
        if (animate) {
          stageList.classList.add("stage-list--hidden");
          stageListAnimActive = true;
          const headerDelayMs = 280;
          stageListSkipListener = () => {
            if (!stageListAnimActive || !stageList) return;
            if (stageListAnimTimeout) {
              clearTimeout(stageListAnimTimeout);
              stageListAnimTimeout = null;
            }
            if (stageListStarTimeout) {
              clearTimeout(stageListStarTimeout);
              stageListStarTimeout = null;
            }
            stageListAnimActive = false;
            stageListMouseListenerAttached = false;
            stageList.classList.remove("stage-list--hidden");
            const pendingCards = Array.from(
              stageList.querySelectorAll('.stage-card[data-anim-state="pending"]')
            );
            pendingCards.forEach((card) => {
              card.dataset.animState = "done";
              card.classList.remove("stage-card--animate");
              card.classList.remove("stage-card--fadein");
            });
            void stageList.offsetWidth;
            pendingCards.forEach((card) => {
              card.classList.add("stage-card--fadein");
            });
            const pendingCount = pendingCards.length;
            const fadeDelay = 240;
            stageListBobTimeout = window.setTimeout(() => {
              stageListBobTimeout = null;
              const currentCard = stageList.querySelector(".stage-card--current");
              if (currentCard) {
                currentCard.classList.add("stage-card--bob");
              }
            }, pendingCount ? fadeDelay + 220 : 0);
            stageListStarTimeout = window.setTimeout(() => {
              stageList
                .querySelectorAll(".stage-stars")
                .forEach((stars) => {
                  stars.classList.remove("stage-stars--shine");
                  void stars.offsetWidth;
                  stars.classList.add("stage-stars--shine");
                });
            }, pendingCount ? fadeDelay : 0);
            if (stageListSkipListener) {
              window.removeEventListener("mousemove", stageListSkipListener);
              stageListSkipListener = null;
            }
          };
          if (!stageListMouseListenerAttached) {
            stageListMouseListenerAttached = true;
            window.addEventListener("mousemove", stageListSkipListener);
          }
          requestAnimationFrame(() => {
            stageListAnimTimeout = window.setTimeout(() => {
              stageList.classList.remove("stage-list--hidden");
              stageList.querySelectorAll(".stage-card").forEach((card, idx) => {
                const animIndex = Number(card.dataset.animIndex);
                const delay = Number.isFinite(animIndex) ? animIndex : idx;
                card.style.setProperty("--stage-anim-delay", `${delay * 100}ms`);
                card.dataset.animState = "pending";
                card.classList.remove("stage-card--animate");
                void card.offsetWidth;
                card.classList.add("stage-card--animate");
                const onStart = (event) => {
                  if (event.animationName !== "stageCardPop") return;
                  card.dataset.animState = "animating";
                  card.removeEventListener("animationstart", onStart);
                };
                const onEnd = (event) => {
                  if (event.animationName !== "stageCardPop") return;
                  card.dataset.animState = "done";
                  card.removeEventListener("animationend", onEnd);
                };
                card.addEventListener("animationstart", onStart);
                card.addEventListener("animationend", onEnd);
              });
              const cards = stageList.querySelectorAll(".stage-card");
              const maxIndex = Math.max(0, cards.length - 1);
              const totalDelay = headerDelayMs + maxIndex * 100;
              stageListBobTimeout = window.setTimeout(() => {
                stageListBobTimeout = null;
                const currentCard = stageList.querySelector(".stage-card--current");
                if (currentCard) {
                  currentCard.classList.add("stage-card--bob");
                }
              }, totalDelay + 420);
              stageListStarTimeout = window.setTimeout(() => {
                stageListAnimActive = false;
                stageList
                  .querySelectorAll(".stage-stars")
                  .forEach((stars) => {
                    stars.classList.remove("stage-stars--shine");
                    void stars.offsetWidth;
                    stars.classList.add("stage-stars--shine");
                  });
                if (stageListSkipListener) {
                  window.removeEventListener("mousemove", stageListSkipListener);
                  stageListSkipListener = null;
                }
              }, totalDelay);
            }, headerDelayMs);
          });
        } else {
          stageListMouseListenerAttached = false;
          if (stageListSkipListener) {
            window.removeEventListener("mousemove", stageListSkipListener);
            stageListSkipListener = null;
          }
          stageList.classList.remove("stage-list--hidden");
          stageList.querySelectorAll(".stage-card").forEach((card) => {
            card.classList.remove("stage-card--animate");
            card.classList.remove("stage-card--fadein");
            card.dataset.animState = "done";
            card.style.removeProperty("--stage-anim-delay");
          });
          stageList.querySelectorAll(".stage-stars").forEach((stars) => {
            stars.classList.remove("stage-stars--shine");
          });
          const currentCard = stageList.querySelector(".stage-card--current");
          if (currentCard) {
            currentCard.classList.add("stage-card--bob");
          }
        }
      }

      let stagesScaleFrame = null;
      function scheduleStagesScale() {
        if (!stagesScreen) return;
        if (stagesScaleFrame) {
          cancelAnimationFrame(stagesScaleFrame);
        }
        stagesScaleFrame = requestAnimationFrame(() => {
          stagesScaleFrame = null;
          updateStagesScale();
        });
      }

      function updateStagesScale() {
        if (!stagesScreen) return;
        if (document.body.dataset.view !== "stages") {
          return;
        }
        stagesScreen.style.setProperty("--stages-scale", "1");
        const bodyStyles = getComputedStyle(document.body);
        const padX = parseFloat(bodyStyles.paddingLeft) + parseFloat(bodyStyles.paddingRight);
        const padY = parseFloat(bodyStyles.paddingTop) + parseFloat(bodyStyles.paddingBottom);
        const availableWidth = Math.max(320, window.innerWidth - padX);
        const availableHeight = Math.max(320, window.innerHeight - padY);
        const rect = stagesScreen.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const scale = Math.min(1, availableWidth / rect.width, availableHeight / rect.height);
        stagesScreen.style.setProperty("--stages-scale", scale.toFixed(3));
      }

      function startStarShineLoop() {
        if (stageStarShineInterval) { 
          clearInterval(stageStarShineInterval);
        }
        stageStarShineInterval = setInterval(() => {
          if (document.body.dataset.view !== "stages") return;
          const starsElements = document.querySelectorAll(".stage-list .stage-stars");
          starsElements.forEach((stars) => {
            stars.classList.remove("stage-stars--shine");
            void stars.offsetWidth;
            stars.classList.add("stage-stars--shine");
          });
        }, 5000);
      }

      function openStagesScreen(animate = false) {
        clearResultAutoActionCountdown();
        if (stagesScreen) {
          stagesScreen.classList.remove("stages-anim");
          if (animate) {
            void stagesScreen.offsetWidth;
            stagesScreen.classList.add("stages-anim");
          }
        }
        renderStageList(animate);
        if (stagesScreen) {
          stagesScreen.removeAttribute("aria-hidden");
        }
        document.body.dataset.view = "stages";

        startStarShineLoop();
        scheduleMenuMusicFadeIn();
      }

      function closeStagesScreen(animateHome = true) {
        if (stageStarShineInterval) {
          clearInterval(stageStarShineInterval);
          stageStarShineInterval = null;
        }
        clearResultAutoActionCountdown();
        if (stagesScreen) {
          stagesScreen.setAttribute("aria-hidden", "true");
        }
        document.body.dataset.view = "home";

        scheduleMenuMusicFadeIn();
        clearFirstLetterHint();
        clearFlashCountdown();

        if (animateHome) {
          document.body.classList.remove("home-anim");
          void document.body.offsetWidth;
          document.body.classList.add("home-anim");
        } else {
          document.body.classList.remove("home-anim");
        }
        updatePracticeAvailability();
      }

      function openSplashScreen() {
        clearSplashAutoStart();
        resetSplashAnyKeySequence();
        splashAutoStartDismissed = false;
        clearScheduledMenuMusicFadeIn();
        setBackgroundMusicMode("off");
        if (splashScreen) {
          if (document.body.classList.contains("loading-overlay")) {
            pendingSplashReveal = true;
            splashScreen.setAttribute("aria-hidden", "true");
          } else {
            splashScreen.removeAttribute("hidden");
            splashScreen.removeAttribute("aria-hidden");
          }
        }
        if (mainHeader) {
          mainHeader.setAttribute("aria-hidden", "true");
          mainHeader.style.display = "none";
        }
        document.body.dataset.view = "splash";

        scheduleSplashAutoStart();
      }

      function closeSplashScreen(options = {}) {
        const resumeMenuMusic = options.resumeMenuMusic !== false;
        clearSplashAutoStart();
        resetSplashAnyKeySequence();

        if (splashScreen) {
          splashScreen.setAttribute("aria-hidden", "true");
          splashScreen.setAttribute("hidden", "");
        }
        if (mainHeader) {
          mainHeader.removeAttribute("aria-hidden");
          mainHeader.style.display = "";
        }
        if (document.body.dataset.view === "splash") {
          document.body.dataset.view = "home";
        }

        if (resumeMenuMusic) {
          scheduleMenuMusicFadeIn();
        } else {
          clearScheduledMenuMusicFadeIn();
          setBackgroundMusicMode("off");
        }
      }

      function waitForGameFonts() {
        if (!document.fonts || !document.fonts.ready) return Promise.resolve();
        return new Promise((resolve) => {
          const timeout = window.setTimeout(resolve, 1500);
          Promise.resolve(document.fonts.ready).catch(() => {}).finally(() => {
            window.clearTimeout(timeout);
            resolve();
          });
        });
      }

      function openSplashLoading(message = null) {

        document.body.classList.add("loading-overlay");
        document.body.classList.remove("home-anim");
        if (splashLoading) {
          const textEl = splashLoading.querySelector(".splash-loading__text");
          if (textEl) {
            const nextMessage = message || (resetLoadingActive ? "Resetting..." : "Loading...");
            textEl.textContent = nextMessage;
          }
          splashLoading.removeAttribute("aria-hidden");
        }
        if (mainHeader) {
          mainHeader.setAttribute("aria-hidden", "true");
          mainHeader.style.display = "none";
        }
        document.body.dataset.view = "loading";
      }

      function closeSplashLoading(skipViewReset = false, keepHeaderHidden = false) {
        document.body.classList.remove("loading-overlay");
        if (document.body.classList.contains("initial-loading")) {
          document.body.classList.remove("initial-loading");
        }
        if (splashLoading) {
          splashLoading.setAttribute("aria-hidden", "true");
        }
        if (pendingSplashReveal && splashScreen) {
          splashScreen.removeAttribute("hidden");
          splashScreen.removeAttribute("aria-hidden");
          pendingSplashReveal = false;
        }
        if (document.body.dataset.view === "splash") {

        }
        scheduleSplashAutoStart();
        if (!keepHeaderHidden && mainHeader) {
          mainHeader.removeAttribute("aria-hidden", "true");
          mainHeader.style.display = "";
        }
        if (!skipViewReset && document.body.dataset.view === "loading") {
          document.body.dataset.view = "home";
          if (document.body.dataset.state === "idle") {

          }
        }
      }

      function triggerHomeFadeIn() {

        document.body.classList.remove("home-anim");
        void document.body.offsetWidth;
        document.body.classList.add("home-anim");
      }

      function showSplashAfterLoading() {
        openSplashScreen();
        attachSplashStartListeners();
        window.requestAnimationFrame(() => {
          closeSplashLoading(true, true);
          document.body.classList.remove("resetting");
          resetConfirmYes.disabled = false;
          resetLoadingActive = false;
        });
      }

      function startStage(index, options = {}) {
        const {
          skipIntro = false,
          originEl = null,
          deferStartRound = false,
          skipFlashWarningPrompt = false
        } = options;

        tabTutorialShownRound = null;
        tabTutorialActive = false;
        firstLetterHintCooldown = 0;
        clearTabKeyHint();
        clearFirstLetterHint();
        clearFlashCountdown();
        clearResultAutoActionCountdown();
        const stage = window.getStageConfig ? window.getStageConfig(index) : null;
        const isFlashStage = stage && String(stage.stageType).toLowerCase() === "flash";
        if (isFlashStage && flashWarningEnabled && !skipFlashWarningPrompt && skipIntro) {
          openFlashStagePrompt(index);
          return;
        }
        if (!skipIntro && openStageIntro(index, originEl)) {
          return;
        }
        if (stage && typeof window.ensureStageLeaderboardSessionCache === "function") {
          const stageId = stage.id ? String(stage.id) : String(index + 1);
          const stageVersion = window.getStageVersion ? window.getStageVersion(stage) : 1;
          window.ensureStageLeaderboardSessionCache(stageId, stageVersion).catch((error) => {
            console.warn("Stage leaderboard prefetch failed", error);
          });
        }
        stageState.active = false;
        stageState.index = index;
        stageState.startTime = performance.now();
        stageState.elapsedMs = 0;
        stageState.completed = false;
        stageState.failed = false;
        stageState.lastStars = 0;
        modeSelect.value = "stages";
        updateModeUI();
        resetGame();
        closeStagesScreen(false);
        setBackgroundMusicMode("level");
        if (deferStartRound) {
          setPhase("Get ready", "show");
          return;
        }
        startRound({ advanceRound: true });
      }

      async function startFromSplash(startMode = "manual", telemetry = {}) {
        if (splashStartInProgress) {
          return;
        }
        splashStartInProgress = true;
        clearSplashAutoStart();
        const isFirstPlay = shouldShowSplashScreen();
        const shouldCountdownToFirstStage = isFirstPlay && !splashReturnToHome;
        if (splashReturnToHome) {
          splashReturnToHome = false;
          closeSplashScreen();
          markSplashSeen();
          document.body.dataset.view = "home";
          if (mainHeader) {
            mainHeader.removeAttribute("aria-hidden");
            mainHeader.style.display = "";
          }
          triggerHomeFadeIn();
          splashStartInProgress = false;
          return;
        }
        closeSplashScreen({
          resumeMenuMusic: !shouldCountdownToFirstStage
        });
        markSplashSeen();
        openSplashLoading();
        const minimumDelay = new Promise((resolve) => {
          window.setTimeout(resolve, 750);
        });
        const fontsReady = waitForGameFonts();
        await Promise.all([minimumDelay, fontsReady]).catch(() => {});
        closeSplashLoading();
        if (shouldCountdownToFirstStage) {
          runFlashCountdown(() => {
            startStage(0, { skipIntro: true });
          });
          logAutoplayEvent("first_level_countdown", {
            autoplay_mode: startMode,
            ...telemetry
          });
          splashStartInProgress = false;
          return;
        }
        document.body.dataset.view = "home";
        triggerHomeFadeIn();
        splashStartInProgress = false;
      }

      practiceStart.addEventListener("click", () => {
        logUiInteraction("practice_start", {
          area: "home_menu",
          action: "click"
        });
        openPracticeModal();
      });

      if (referenceOpen) {
        referenceOpen.addEventListener("click", () => {
          logUiInteraction("reference_open", {
            area: "home_menu",
            action: "open"
          });
          setModalState(referenceModal, true);
        });
      }

      if (referenceClose) {
        referenceClose.addEventListener("click", () => {
          logUiInteraction("reference_close", {
            area: "reference_modal",
            action: "close",
            close_source: "button"
          });
          setModalState(referenceModal, false);
        });
      }

      if (referenceModal) {
        referenceModal.addEventListener("click", (event) => {
          if (event.target === referenceModal) {
            logUiInteraction("reference_close", {
              area: "reference_modal",
              action: "close",
              close_source: "backdrop"
            });
            setModalState(referenceModal, false);
          }
        });
      }
      if (stageIntroClose && stageIntroModal) {
        stageIntroClose.addEventListener("click", () => {
          logUiInteraction("stage_preview_close", {
            area: "stage_preview",
            action: "close",
            close_source: "button",
            level_number: Number.isFinite(stageIntroPendingIndex) ? stageIntroPendingIndex + 1 : null
          });
          closeStageIntro();
        });
      }
      const stageIntroPrev = document.getElementById("stageIntroPrev");
      const stageIntroNext = document.getElementById("stageIntroNext");
      if (stageIntroPrev) {
        stageIntroPrev.addEventListener("click", () => {
          navigateStageIntroPreview(-1, "button");
        });
      }
      if (stageIntroNext) {
        stageIntroNext.addEventListener("click", () => {
          navigateStageIntroPreview(1, "button");
        });
      }
      if (leaderboardOpen && leaderboardModal) {
        leaderboardOpen.addEventListener("click", async () => {
          logUiInteraction("stage_leaderboard_open", {
            area: "stage_preview",
            action: "open",
            level_number: Number.isFinite(stageIntroPendingIndex) ? stageIntroPendingIndex + 1 : null
          });
          setModalState(leaderboardModal, true);
          if (typeof window.syncLocalBestTimesOnce === "function") {
            try {
              await window.syncLocalBestTimesOnce(false);
            } catch (error) {
              console.warn("Leaderboard sync failed", error);
            }
          }
          if (typeof window.renderStageLeaderboard === "function") {
            const rawIndex = leaderboardOpen.dataset.stageIndex ?? stageIntroPendingIndex;
            const index = Number.isFinite(Number(rawIndex)) ? Number(rawIndex) : stageIntroPendingIndex;
            const stage = Number.isFinite(index) && window.getStageConfig ? window.getStageConfig(index) : null;
            if (stage) {
              window.renderStageLeaderboard(stage, index, "leaderboardModalList", "leaderboardModalEmpty");
            }
          }
        });
      }
      if (leaderboardClose && leaderboardModal) {
        leaderboardClose.addEventListener("click", () => {
          logUiInteraction("stage_leaderboard_close", {
            area: "stage_leaderboard_modal",
            action: "close",
            close_source: "button"
          });
          setModalState(leaderboardModal, false);
        });
      }
      if (leaderboardModal) {
        leaderboardModal.addEventListener("click", (event) => {
          if (event.target === leaderboardModal) {
            logUiInteraction("stage_leaderboard_close", {
              area: "stage_leaderboard_modal",
              action: "close",
              close_source: "backdrop"
            });
            setModalState(leaderboardModal, false);
          }
        });
      }

      window.renderStageLeaderboard = async function renderStageLeaderboard(stage, index, listId, emptyId) {
        const listEl = document.getElementById(listId);
        const emptyEl = document.getElementById(emptyId);
        if (!listEl) return;
        const truncateLeaderboardName = (value) => {
          const text = value ? String(value) : "";
          return text.length > 16 ? text.slice(0, 16) : text;
        };
        const stageId = stage && stage.id ? String(stage.id) : String(index + 1);
        const stageVersion = window.getStageVersion ? window.getStageVersion(stage) : 1;
        listEl.dataset.stageId = stageId;
        listEl.dataset.stageVersion = String(stageVersion);
        const retryCount = Number(listEl.dataset.lbRetryCount || 0);
        const snapshot = typeof window.getLoggingDebugSnapshot === "function"
          ? window.getLoggingDebugSnapshot()
          : null;
        const headerRow = document.createElement("div");
        headerRow.className = "leaderboard-row";
        headerRow.innerHTML = "<span>#</span><span>Player</span><span>Time</span>";
        const loadingRow = document.createElement("div");
        loadingRow.className = "leaderboard-row leaderboard-row--empty";
        loadingRow.textContent = "Loading...";
        listEl.replaceChildren(headerRow, loadingRow);
        const comparisonTimeMs = gameMode === "stages" && stageState.index === index
          && Number.isFinite(stageState.elapsedSeconds)
          ? Math.round(stageState.elapsedSeconds * 1000)
          : null;
        const leaderboardReady = typeof window.getLeaderboardReady === "function"
          ? window.getLeaderboardReady()
          : true;
        if (typeof window.fetchStageLeaderboard !== "function" || (snapshot && !snapshot.ready && !leaderboardReady)) {
          if (retryCount < 5) {
            listEl.dataset.lbRetryCount = String(retryCount + 1);
            window.setTimeout(() => {
              window.renderStageLeaderboard(stage, index, listId, emptyId);
            }, 600);
          } else if (emptyEl) {
            loadingRow.textContent = "No data yet";
          }

          return;
        }
        listEl.dataset.lbRetryCount = "0";
        try {
          const result = await window.fetchStageLeaderboard(stageId, stageVersion, 5, comparisonTimeMs);
          const top = result && Array.isArray(result.top) ? result.top : [];
          const me = result ? result.me : null;
          const fetchedMeRank = result ? result.meRank : null;
          const topRows = [];
          const localName = getPreferredPlayerDisplayName();
          let meEntry = null;
          let meRank = Number.isFinite(fetchedMeRank) ? fetchedMeRank : null;
          const bestKey = window.getStageBestTimeKey
            ? window.getStageBestTimeKey(stage, index)
            : stageId;
          const localBestSeconds = Number(window.stageBestTimes && window.stageBestTimes[bestKey]);
          const localBestMs = Number.isFinite(localBestSeconds) ? Math.round(localBestSeconds * 1000) : null;
          (Array.isArray(top) ? top : []).forEach((entry, idx) => {
            if (entry.player_id && window.getLeaderboardPlayerId && entry.player_id === window.getLeaderboardPlayerId()) {
              meEntry = entry;
              meRank = idx + 1;
            }
            const time = Number(entry.best_time_ms);
            const timeText = Number.isFinite(time) ? `${(time / 1000).toFixed(2)}s` : "\u2014";
            appendLeaderboardDataRow(topRows, entry, idx + 1, localName, (rank, rawName) => {
              const name = truncateLeaderboardName(rawName);
              return `<span>${rank}</span><span class="leaderboard-name" title="${rawName}">${name}</span><span>${timeText}</span>`;
            });
          });
          const meIsInTop = Boolean(meEntry) || (Number.isFinite(meRank) && meRank > 0 && meRank <= top.length);
          let playerRow = null;
          if (meIsInTop) {
            playerRow = buildLeaderboardPlaceholderRow();
          } else if (me) {
            const time = Number(me.best_time_ms);
            const timeText = Number.isFinite(time) ? `${(time / 1000).toFixed(2)}s` : "\u2014";
            const rankText = meRank ? String(meRank) : "\u2014";
            const rows = [];
            appendLeaderboardDataRow(rows, me, Number(rankText) || 0, localName, (resolvedRank, rawName) => {
              const name = truncateLeaderboardName(rawName);
              return `<span>${resolvedRank || rankText}</span><span class="leaderboard-name" title="${rawName}">${name}</span><span>${timeText}</span>`;
            }, ["leaderboard-row--context"]);
            playerRow = rows[0] || null;
          } else {
            const row = document.createElement("div");
            row.className = "leaderboard-row leaderboard-row--me leaderboard-row--context";
            row.dataset.playerId = window.getLeaderboardPlayerId ? window.getLeaderboardPlayerId() : "";
            const name = truncateLeaderboardName(localName || "You");
            const timeText = Number.isFinite(localBestMs) ? `${(localBestMs / 1000).toFixed(2)}s` : "-";
            row.innerHTML = `<span>${meRank || "-"}</span><span class="leaderboard-name" title="${localName || "You"}">${name}</span><span>${timeText}</span>`;
            playerRow = row;
          }
          const rows = topRows.slice();
          if (topRows.length && playerRow) {
            const dividerRow = document.createElement("div");
            dividerRow.className = "leaderboard-divider";
            dividerRow.setAttribute("aria-hidden", "true");
            rows.push(dividerRow);
          }
          if (playerRow) {
            rows.push(playerRow);
          }
          if (rows.length) {
            listEl.replaceChildren(headerRow, ...rows);
          } else {
            const baseMessage = result && result.errorMessage ? result.errorMessage : "No data yet";
            loadingRow.textContent = baseMessage;
            listEl.replaceChildren(headerRow, loadingRow);
          }
          if (result && result.errorCode) {
            const statusRow = document.createElement("div");
            statusRow.className = "leaderboard-row leaderboard-row--empty";
            const budgetStatus =
              typeof window.getLeaderboardReadBudgetStatus === "function"
                ? window.getLeaderboardReadBudgetStatus()
                : null;
            if (result.errorCode === "read_budget_exceeded" && budgetStatus) {
              statusRow.textContent = `Leaderboard reads capped (${budgetStatus.totalReads}/${budgetStatus.limit}).`;
            } else {
              statusRow.textContent = result.errorMessage || "Leaderboard unavailable.";
            }
            listEl.appendChild(statusRow);
          }

        } catch (error) {
          console.warn("Failed to render leaderboard", error);
          loadingRow.textContent = "Leaderboard failed to load. Please try again later.";
          listEl.replaceChildren(headerRow, loadingRow);

        }
      };

      window.refreshVisibleLeaderboards = function refreshVisibleLeaderboards() {
        const stageList = document.getElementById("stageClearLeaderboardList");
        if (stageList && stageList.dataset.stageId) {
          const stage = window.getStageConfig
            ? window.getStageConfig(Number(stageList.dataset.stageId) - 1)
            : null;
          if (stage) {
            window.renderStageLeaderboard(stage, Number(stageList.dataset.stageId) - 1, "stageClearLeaderboardList", "stageClearLeaderboardEmpty");
          }
        }
        const modalList = document.getElementById("leaderboardModalList");
        if (modalList && leaderboardModal && leaderboardModal.classList.contains("show")) {
          const index = stageIntroPendingIndex;
          const stage = Number.isFinite(index) && window.getStageConfig ? window.getStageConfig(index) : null;
          if (stage) {
            window.renderStageLeaderboard(stage, index, "leaderboardModalList", "leaderboardModalEmpty");
          }
        }
      };

      window.updateVisibleLeaderboardName = function updateVisibleLeaderboardName(newName) {
        const playerId = window.getLeaderboardPlayerId ? window.getLeaderboardPlayerId() : "";
        const resolvedName = getPreferredPlayerDisplayName(newName);
        if (!playerId || !resolvedName) return;
        document.querySelectorAll(".leaderboard-row[data-player-id]").forEach((row) => {
          if (row.dataset.playerId === playerId) {
            const nameEl = row.querySelector(".leaderboard-name");
            if (nameEl) {
              nameEl.textContent = resolvedName;
              nameEl.setAttribute("title", resolvedName);
            }
          }
        });
      };

      const CREDITS_LIKES_STORAGE_KEY = "flashRecallCreditsLikes";

      function getStoredCreditsLikes() {
        try {
          const raw = window.localStorage.getItem(CREDITS_LIKES_STORAGE_KEY);
          if (!raw) return {};
          const parsed = JSON.parse(raw);
          return parsed && typeof parsed === "object" ? parsed : {};
        } catch {
          return {};
        }
      }

      function saveStoredCreditsLikes(likesByKey) {
        try {
          window.localStorage.setItem(CREDITS_LIKES_STORAGE_KEY, JSON.stringify(likesByKey || {}));
        } catch {
          // ignore storage errors
        }
      }

      function buildCreditsEntryKey(section, entry, index) {
        const directId = entry && entry.id ? String(entry.id) : "";
        if (directId) return `${section}:${directId}`;
        const fallback = entry && (entry.title || entry.name || entry.creator)
          ? String(entry.title || entry.name || entry.creator)
          : String(index);
        return `${section}:${fallback.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      }

      function getCreditsLikeState(entryKey, baseLikes = 0) {
        const stored = getStoredCreditsLikes();
        const liked = stored[entryKey] === 1;
        return {
          liked,
          count: Math.max(0, Number(baseLikes) || 0) + (liked ? 1 : 0)
        };
      }

      function toggleCreditsLike(entryKey) {
        const stored = getStoredCreditsLikes();
        if (stored[entryKey] === 1) {
          delete stored[entryKey];
        } else {
          stored[entryKey] = 1;
        }
        saveStoredCreditsLikes(stored);
      }

      function appendCreditsLikeRow(card, entryKey, baseLikes = 0) {
        const likeState = getCreditsLikeState(entryKey, baseLikes);
        const actions = document.createElement("div");
        actions.className = "credits-entry__actions";

        const button = document.createElement("button");
        button.type = "button";
        button.className = "credits-like-button";
        button.dataset.creditsLike = entryKey;
        button.setAttribute("aria-pressed", likeState.liked ? "true" : "false");
        button.setAttribute("aria-label", likeState.liked ? "Unlike this entry" : "Like this entry");
        if (likeState.liked) {
          button.classList.add("is-liked");
        }
        button.innerHTML = `<span class="credits-like-button__heart" aria-hidden="true">♥</span><span class="credits-like-button__count">${likeState.count}</span>`;
        actions.appendChild(button);
        card.appendChild(actions);
      }

      function renderCreditsSection(container, headingText, entries, sectionName, emptyText) {
        const section = document.createElement("section");
        section.className = "credits-section";

        if (headingText) {
          const heading = document.createElement("h4");
          heading.className = "credits-section__title";
          heading.textContent = headingText;
          section.appendChild(heading);
        }

        const list = document.createElement("div");
        list.className = "credits-section__list";
        section.appendChild(list);

        const safeEntries = Array.isArray(entries) ? entries : [];
        safeEntries.forEach((entry, index) => {
          if (!entry || typeof entry !== "object") return;
          const card = document.createElement("article");
          card.className = "credits-entry";

          const title = document.createElement("h5");
          title.className = "credits-entry__title";
          title.textContent = sectionName === "contributors"
            ? (entry.name ? String(entry.name) : "Unnamed contributor")
            : (entry.title ? String(entry.title) : "Untitled");
          card.appendChild(title);

          if (sectionName === "contributors" && entry.role) {
            const role = document.createElement("p");
            role.className = "credits-entry__meta";
            role.textContent = String(entry.role);
            card.appendChild(role);
          }

          if (sectionName !== "contributors" && entry.creator) {
            const creator = document.createElement("p");
            creator.className = "credits-entry__meta";
            creator.textContent = `By ${String(entry.creator)}`;
            card.appendChild(creator);
          }

          const hasSourceLink = sectionName === "contributors"
            ? (entry.linkLabel || entry.linkUrl)
            : (entry.sourceName || entry.sourceUrl);
          if (hasSourceLink) {
            const source = document.createElement("p");
            source.className = "credits-entry__meta";
            const linkUrl = sectionName === "contributors" ? entry.linkUrl : entry.sourceUrl;
            const linkLabel = sectionName === "contributors"
              ? (entry.linkLabel || entry.linkUrl)
              : (entry.sourceName || entry.sourceUrl);
            if (linkUrl) {
              const link = document.createElement("a");
              link.href = String(linkUrl);
              link.textContent = String(linkLabel);
              link.target = "_blank";
              link.rel = "noreferrer noopener";
              source.appendChild(link);
            } else {
              source.textContent = String(linkLabel);
            }
            card.appendChild(source);
          }

          if (sectionName !== "contributors" && entry.license) {
            const license = document.createElement("p");
            license.className = "credits-entry__meta";
            license.textContent = `License: ${String(entry.license)}`;
            card.appendChild(license);
          }

          if (entry.notes) {
            const notes = document.createElement("p");
            notes.className = "credits-entry__notes";
            notes.textContent = String(entry.notes);
            card.appendChild(notes);
          }

          appendCreditsLikeRow(card, buildCreditsEntryKey(sectionName, entry, index), entry.likes);
          list.appendChild(card);
        });

        if (!list.children.length) {
          const empty = document.createElement("div");
          empty.className = "leaderboard-row leaderboard-row--empty";
          empty.textContent = emptyText;
          list.appendChild(empty);
        }

        container.appendChild(section);
      }

      function renderCreditsModal() {
        if (!creditsList || !creditsEmpty) return;
        const attributions = Array.isArray(window.creditsAttributions) ? window.creditsAttributions : [];
        const contributors = Array.isArray(window.creditsContributors) ? window.creditsContributors : [];
        creditsList.replaceChildren();
        if (!attributions.length && !contributors.length) {
          creditsEmpty.hidden = false;
          return;
        }
        creditsEmpty.hidden = true;
        const intro = document.createElement("p");
        intro.className = "modal-note credits-note";
        intro.textContent = "Thank you for everyone who contributed to this project. It would not have been possible without you!";
        creditsList.appendChild(intro);

        renderCreditsSection(creditsList, "", attributions, "attributions", "No attributions added yet.");
        renderCreditsSection(creditsList, "Contributors", contributors, "contributors", "No contributors added yet.");
        if (!creditsList.children.length) {
          creditsEmpty.hidden = false;
        }
      }

      if (creditsOpen && creditsModal) {
        creditsOpen.addEventListener("click", () => {
          logUiInteraction("credits_open", {
            area: "home_menu",
            action: "open"
          });
          renderCreditsModal();
          setModalState(creditsModal, true);
        });
      }

      if (creditsClose && creditsModal) {
        creditsClose.addEventListener("click", () => {
          logUiInteraction("credits_close", {
            area: "credits_modal",
            action: "close",
            close_source: "button"
          });
          setModalState(creditsModal, false);
        });
      }

      if (creditsModal) {
        creditsModal.addEventListener("click", (event) => {
          const likeButton = event.target.closest("[data-credits-like]");
          if (likeButton) {
            toggleCreditsLike(String(likeButton.dataset.creditsLike || ""));
            renderCreditsModal();
            return;
          }
          if (event.target === creditsModal) {
            logUiInteraction("credits_close", {
              area: "credits_modal",
              action: "close",
              close_source: "backdrop"
            });
            setModalState(creditsModal, false);
          }
        });
      }
      if (stageIntroStart && stageIntroModal) {
        stageIntroStart.addEventListener("click", async () => {
          const index = stageIntroPendingIndex;
          const stage = Number.isFinite(index) && window.getStageConfig ? window.getStageConfig(index) : null;
          logAutoplayEvent("stage_preview_start", {
            autoplay_mode: stageIntroStartSource === "auto_preview_timer" ? "auto" : "manual",
            preview_start_source: stageIntroStartSource,
            level_number: Number.isFinite(index) ? index + 1 : null,
            stage_type: stage && stage.stageType ? String(stage.stageType).toLowerCase() : null
          }, { immediate: true });
          stageIntroStartSource = "manual";
          clearStageIntroAutoStart();
          if (leaderboardModal) {
            setModalState(leaderboardModal, false);
          }
          if (!Number.isFinite(index)) return;
          if (stage && String(stage.stageType).toLowerCase() === "flash") {
            if (flashWarningEnabled) {
              openFlashStagePrompt(index);
              return;
            }
            closeStageIntro();
            openSplashLoading("Loading...");
            const minimumDelay = new Promise((resolve) => {
              window.setTimeout(resolve, 750);
            });
            const fontsReady = waitForGameFonts();
            await Promise.all([minimumDelay, fontsReady]).catch(() => {});
            closeSplashLoading();
            startStage(index, { skipIntro: true, deferStartRound: true });
            startFlashRound();
            return;
          }
          closeStageIntro();
          openSplashLoading("Loading...");
          const minimumDelay = new Promise((resolve) => {
            window.setTimeout(resolve, 750);
          });
          const fontsReady = waitForGameFonts();
          await Promise.all([minimumDelay, fontsReady]).catch(() => {});
          closeSplashLoading();
          startStage(index, { skipIntro: true });
        });
      }
      if (stageIntroModal) {
        stageIntroModal.addEventListener("pointerdown", () => {
          if (stageIntroCard && stageIntroCard.classList.contains("intro-auto")) {
            cancelStageIntroAutoStartBar("stage_preview_pointerdown");
          }
        });
        stageIntroModal.addEventListener("click", (event) => {
          if (stageIntroCard && stageIntroCard.classList.contains("intro-auto")) {
            cancelStageIntroAutoStartBar("stage_preview_click");
          }
          if (event.target === stageIntroModal) {
            logUiInteraction("stage_preview_close", {
              area: "stage_preview",
              action: "close",
              close_source: "backdrop",
              level_number: Number.isFinite(stageIntroPendingIndex) ? stageIntroPendingIndex + 1 : null
            });
            closeStageIntro();
          }
        });
      }
      if (!window.__stageIntroArrowKeyListener) {
        window.__stageIntroArrowKeyListener = true;
        document.addEventListener("keydown", (event) => {
          if (!(stageIntroModal && stageIntroModal.classList.contains("show"))) return;
          if (leaderboardModal && leaderboardModal.classList.contains("show")) return;
          if (isTextEntryTarget(event.target)) return;
          if (event.key === "ArrowLeft") {
            if (navigateStageIntroPreview(-1, "keyboard")) {
              event.preventDefault();
            }
          } else if (event.key === "ArrowRight") {
            if (navigateStageIntroPreview(1, "keyboard")) {
              event.preventDefault();
            }
          }
        });
      }
      if (!window.__stageIntroAutoCancelListener) {
        window.__stageIntroAutoCancelListener = true;
        document.addEventListener("pointerdown", () => {
          if (
            stageIntroModal &&
            stageIntroModal.classList.contains("show") &&
            stageIntroCard &&
            stageIntroCard.classList.contains("intro-auto")
          ) {
            cancelStageIntroAutoStartBar("document_pointerdown");
          }
        }, { capture: true });
      }
      if (!window.__stageNextAutoCancelListener) {
        window.__stageNextAutoCancelListener = true;
        document.addEventListener("pointerdown", () => {
          if (document.body && document.body.dataset.state === "result" && autoAdvanceNextTimerId) {
            logAutoplayEvent("result_auto_advance_cancelled", {
              autoplay_mode: "manual",
              cancel_source: "pointerdown",
              level_number: Number.isFinite(stageState && stageState.index) ? stageState.index + 2 : null
            }, { immediate: true });
            clearTimeout(autoAdvanceNextTimerId);
            autoAdvanceNextTimerId = null;
            cancelStageNextAutoAdvanceBar();
          }
        }, { capture: true });
      }
      if (flashStageStart) {
        flashStageStart.addEventListener("click", async () => {
          const index = flashStagePendingIndex;
          closeFlashStagePrompt();
          if (stageIntroModal && stageIntroModal.classList.contains("show")) {
            closeStageIntro();
          }
          if (Number.isFinite(index)) {
            openSplashLoading("Loading...");
            const minimumDelay = new Promise((resolve) => {
              window.setTimeout(resolve, 750);
            });
            const fontsReady = waitForGameFonts();
            await Promise.all([minimumDelay, fontsReady]).catch(() => {});
            closeSplashLoading();
            startStage(index, {
              skipIntro: true,
              deferStartRound: true,
              skipFlashWarningPrompt: true
            });
            startFlashRound();
          }
        });
      }
      function setFlashWarningEnabled(enabled, persist = true) {
        flashWarningEnabled = Boolean(enabled);
        if (flashStageSkip) {
          flashStageSkip.checked = !flashWarningEnabled;
        }
        if (photosensitivityWarningToggle) {
          photosensitivityWarningToggle.checked = flashWarningEnabled;
        }
        if (persist) {
          try {
            window.localStorage.setItem(FLASH_WARNING_KEY, flashWarningEnabled ? "1" : "0");
          } catch {
            // ignore storage errors
          }
        }
      }

      {
        const saved = window.localStorage.getItem(FLASH_WARNING_KEY);
        if (saved !== null) {
          setFlashWarningEnabled(saved === "1", false);
        } else {
          setFlashWarningEnabled(Boolean(defaultControlSettings.flashWarningEnabled), false);
        }
      }

      if (flashStageSkip) {
        flashStageSkip.addEventListener("change", () => {
          setFlashWarningEnabled(!flashStageSkip.checked, true);
        });
      }
      if (photosensitivityWarningToggle) {
        photosensitivityWarningToggle.addEventListener("change", () => {
          setFlashWarningEnabled(photosensitivityWarningToggle.checked, true);
          logSettingChange("flash_warning_enabled", photosensitivityWarningToggle.checked, {
            setting_category: "controls"
          });
          logSettingsSnapshot("setting_change", {
            setting_name: "flash_warning_enabled"
          });
        });
      }

      if (flashStageModal) {
        flashStageModal.addEventListener("click", (event) => {
          if (event.target === flashStageModal) {
            closeFlashStagePrompt();
          }
        });
      }
      async function toggleFullscreen() {
        try {
          if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
          } else {
            await document.exitFullscreen();
          }
        } catch (error) {
          console.warn("Fullscreen toggle failed", error);
        }
      }

      if (fullscreenToggle) {
        fullscreenToggle.addEventListener("click", async () => {
          logUiInteraction("fullscreen_toggle", {
            area: "home_header",
            action: "click"
          });
          await toggleFullscreen();
        });
      }

      if (mainMenuTitle) {
        mainMenuTitle.addEventListener("click", () => {
          logUiInteraction("main_menu_title", {
            area: "home_menu",
            action: "click"
          });
          splashReturnToHome = !shouldShowSplashScreen();
          openSplashScreen();
          attachSplashStartListeners();
        });
      }

      if (shouldShowSplashScreen()) {
        splashReturnToHome = false;
        openSplashScreen();
        attachSplashStartListeners();
      } else {
        splashReturnToHome = false;
        openSplashScreen();
        attachSplashStartListeners();
      }

      if (document.body.classList.contains("loading-overlay")) {
        const initialLoadingDelayMs = 1000;
        const minimumDelay = new Promise((resolve) => {
          window.setTimeout(resolve, initialLoadingDelayMs);
        });
        const fontsReady = waitForGameFonts();
        Promise.all([minimumDelay, fontsReady]).finally(() => {
          closeSplashLoading(true, true);
        });
      }

      if (stagesOpen) {
        stagesOpen.addEventListener("click", () => {
          logUiInteraction("stages_open", {
            area: "home_menu",
            action: "click"
          });
          openStagesScreen(true);
        });
      }

      if (stagesBack) {
        stagesBack.addEventListener("click", () => {
          logUiInteraction("stages_back", {
            area: "stage_select",
            action: "click"
          });
          closeStagesScreen();
        });
      }
      if (stagesPrev) {
        stagesPrev.addEventListener("click", () => {
          logUiInteraction("stages_page_prev", {
            area: "stage_select",
            action: "click"
          });
          const stages = Array.isArray(window.stagesConfig) ? window.stagesConfig : [];
          const pageSize = 20;
          const totalPages = Math.max(1, Math.ceil(stages.length / pageSize));
          stageState.page = (stageState.page - 1 + totalPages) % totalPages;
          renderStageList(false);
        });
      }
      if (stagesNext) {
        stagesNext.addEventListener("click", () => {
          logUiInteraction("stages_page_next", {
            area: "stage_select",
            action: "click"
          });
          const stages = Array.isArray(window.stagesConfig) ? window.stagesConfig : [];
          const pageSize = 20;
          const totalPages = Math.max(1, Math.ceil(stages.length / pageSize));
          stageState.page = (stageState.page + 1) % totalPages;
          renderStageList(false);
        });
      }

      if (stageList) {
        stageList.addEventListener("click", (event) => {
          const button = event.target.closest(".stage-card");
          if (!button) return;
          const index = Number(button.dataset.stageIndex);
          if (!Number.isFinite(index)) return;
          logUiInteraction("stage_card_open", {
            area: "stage_select",
            action: "click",
            level_number: index + 1,
            stage_status: "available"
          });

          // Ignore invalid stage indices.
          if (!isStageUnlocked(index)) {
            return;
          }
          if (typeof window.setStageIntroOpenSource === "function") {
            window.setStageIntroOpenSource("stage_card");
          }
          startStage(index, { originEl: button });
        });
      }

      if (inputGrid) {
        inputGrid.addEventListener("keydown", (event) => {
          if (event.key !== "Tab") return;
          if (tabTutorialActive) return;
          if (phase !== "recall") return;
          const inputs = Array.from(inputGrid.querySelectorAll('input[data-index]'));
          if (!inputs.length) return;
          const activeIndex = inputs.indexOf(document.activeElement);
          if (activeIndex === -1) return;
          event.preventDefault();
          const dir = event.shiftKey ? -1 : 1;
          const nextIndex = (activeIndex + dir + inputs.length) % inputs.length;
          inputs[nextIndex].focus();
        });
        inputGrid.addEventListener("input", (event) => {
          if (gameMode !== "stages" || phase !== "recall") return;
          const stage = window.getStageConfig ? window.getStageConfig(stageState.index) : null;
          if (!stage) return;
          const hintMessage = getFirstLetterHintMessage(stage, round);
          if (tabTutorialActive && !hintMessage) return;
          if (isTabTutorialEnabledForStage(stage) && !enterToNextEnabled) {
            if (tabTutorialShownRound !== round) {
              const input = event.target && event.target.closest('input[data-index="0"]');
              if (input && input.value) {
                tabTutorialShownRound = round;
                tabTutorialActive = true;
                tabTutorialDisabledInputs = [];
              }
            }
          }
          if (!hintMessage) return;
          const targetInput = event.target && event.target.closest('input[data-index]');
          if (!targetInput) return;
          const rawValue = targetInput.value ? String(targetInput.value) : "";
          const trimmed = rawValue.trim();
          if (trimmed.length <= 1) return;
          const firstCharMatch = trimmed.match(/[a-z0-9]/i);
          const firstChar = firstCharMatch ? firstCharMatch[0] : trimmed.charAt(0);
          targetInput.value = firstChar;
          targetInput.dispatchEvent(new Event("input", { bubbles: true }));
          const now = performance.now();
          if (now - firstLetterHintCooldown > 300) {
            firstLetterHintCooldown = now;
            showFirstLetterHint(hintMessage);
          }
        });
        inputGrid.addEventListener("pointerdown", (event) => {
          if (!tabTutorialActive) return;
          const targetInput = event.target.closest("input[data-index]");
          if (!targetInput) return;
          const idx = Number(targetInput.dataset.index);
          if (Number.isFinite(idx) && idx > 0) {
            showTabKeyHint();
            tabTutorialActive = false;
          }
        });
        inputGrid.addEventListener("focusin", (event) => {
          if (!tabTutorialActive) return;
          const targetInput = event.target.closest("input[data-index]");
          if (!targetInput) return;
          const idx = Number(targetInput.dataset.index);
          if (Number.isFinite(idx) && idx > 0) {
            showTabKeyHint();
            tabTutorialActive = false;
          }
        });
      }

      document.querySelectorAll("#practiceModal .checkboxes input").forEach((input) => {
        input.addEventListener("pointerdown", (event) => {
          dragSelecting = true;
          dragTargetState = !input.checked;
          input.checked = dragTargetState;
          event.preventDefault();
        });
        input.addEventListener("pointerenter", () => {
          if (!dragSelecting || dragTargetState === null) return;
          input.checked = dragTargetState;
        });
      });

      document.addEventListener("pointerup", () => {
        dragSelecting = false;
        dragTargetState = null;
      });

      practiceCancel.addEventListener("click", () => {
        closePracticeModal();
      });

      if (practiceDeselectAll) {
        practiceDeselectAll.addEventListener("click", () => {
          document
            .querySelectorAll("#practiceModal .control-group .checkboxes input[type=\"checkbox\"]")
            .forEach((input) => {
              input.checked = false;
            });
        });
      }
      if (practiceSelectAll) {
        practiceSelectAll.addEventListener("click", () => {
          document
            .querySelectorAll("#practiceModal .control-group .checkboxes input[type=\"checkbox\"]")
            .forEach((input) => {
              input.checked = true;
            });
        });
      }
      if (settingsOpen && settingsModal) {
        settingsOpen.addEventListener("click", () => {
          logUiInteraction("settings_open", {
            area: "home_menu",
            action: "open"
          });
          updatePlayerNameInputs(getPlayerName());
          updatePlayerNameSettingVisibility();
          activeRebindAction = null;
          refreshKeybindButtons();
          setKeybindStatus("");
          setSettingsTab("general");
          setModalState(settingsModal, true);
        });
      }
      if (settingsClose && settingsModal) {
        settingsClose.addEventListener("click", () => {
          logUiInteraction("settings_close", {
            area: "settings_modal",
            action: "close"
          });
          activeRebindAction = null;
          refreshKeybindButtons();
          setKeybindStatus("");
          commitPlayerNameFromSettingsInput();
          setModalState(settingsModal, false);
        });
      }
      if (settingsModal) {
        settingsModal.querySelectorAll("[data-settings-tab]").forEach((button) => {
          button.addEventListener("click", () => {
            const tabName = button.getAttribute("data-settings-tab");
            if (!tabName) return;
            logUiInteraction("settings_tab_view", {
              area: "settings_modal",
              action: "view",
              settings_tab: tabName
            });
            setSettingsTab(tabName);
          });
        });
        settingsModal.addEventListener("click", (event) => {
          if (event.target === settingsModal) {
            logUiInteraction("settings_close", {
              area: "settings_modal",
              action: "close",
              close_source: "backdrop"
            });
            activeRebindAction = null;
            refreshKeybindButtons();
            setKeybindStatus("");
            commitPlayerNameFromSettingsInput();
            setModalState(settingsModal, false);
          }
        });
      }
      if (playerNameModal) {
        playerNameModal.addEventListener("click", (event) => {
          if (event.target === playerNameModal) {
            markPlayerNamePrompted();
            closePlayerNameModal();
          }
        });
      }
      if (playerNameInput) {
        playerNameInput.addEventListener("pointerdown", (event) => {
          if (!isPlayerNamePreviewActive(playerNameInput)) return;
          event.preventDefault();
          preparePlayerNameInputForEditing(playerNameInput);
          playerNameInput.focus();
        });
        playerNameInput.addEventListener("input", () => {
          if (isPlayerNamePreviewActive(playerNameInput)) {
            clearPlayerNamePreviewState(playerNameInput);
          }
          updatePlayerNameSaveState();
        });
        playerNameInput.addEventListener("keydown", (event) => {
          if (isPlayerNamePreviewActive(playerNameInput) && shouldTreatAsNameEntryKey(event)) {
            if (event.key === "Backspace" || event.key === "Delete") {
              event.preventDefault();
            }
            preparePlayerNameInputForEditing(playerNameInput);
          }
          if (event.key !== "Enter") return;
          event.preventDefault();
          if (playerNameSave && !playerNameSave.disabled) {
            playerNameSave.click();
          } else if (playerNameSkip) {
            playerNameSkip.click();
          } else {
            markPlayerNamePrompted();
            closePlayerNameModal();
          }
        });
        playerNameInput.addEventListener("blur", () => {
          restorePlayerNamePreviewState(playerNameInput);
        });
      }
      if (playerNameSave) {
        playerNameSave.addEventListener("click", () => {
          const normalized = commitPlayerName(
            isPlayerNamePreviewActive(playerNameInput) ? "" : (playerNameInput ? playerNameInput.value : "")
          );
          if (!normalized) return;
          markPlayerNamePrompted();
          closePlayerNameModal();
        });
      }
      if (playerNameSkip) {
        playerNameSkip.addEventListener("click", () => {
          markPlayerNamePrompted();
          updatePlayerNameInputs(getPlayerName());
          updatePlayerNameSettingVisibility();
          closePlayerNameModal();
        });
      }
      if (playerNameRandomize) {
        playerNameRandomize.addEventListener("click", () => {
          const randomName = applyRandomizedPlayerNameToInput(playerNameInput);
          if (!randomName || !playerNameInput) return;
          playerNameInput.focus();
          playerNameInput.select();
        });
      }
      if (playerNameSetting) {
        updatePlayerNameInputs(getPlayerName());
        playerNameSetting.addEventListener("pointerdown", (event) => {
          if (!isPlayerNamePreviewActive(playerNameSetting)) return;
          event.preventDefault();
          preparePlayerNameInputForEditing(playerNameSetting);
          playerNameSetting.focus();
        });
        playerNameSetting.addEventListener("input", () => {
          if (isPlayerNamePreviewActive(playerNameSetting)) {
            clearPlayerNamePreviewState(playerNameSetting);
          }
        });
        playerNameSetting.addEventListener("blur", () => {
          restorePlayerNamePreviewState(playerNameSetting);
        });
        playerNameSetting.addEventListener("keydown", (event) => {
          if (isPlayerNamePreviewActive(playerNameSetting) && shouldTreatAsNameEntryKey(event)) {
            if (event.key === "Backspace" || event.key === "Delete") {
              event.preventDefault();
            }
            preparePlayerNameInputForEditing(playerNameSetting);
          }
          if (event.key === "Enter") {
            playerNameSetting.blur();
          }
        });
      }
      if (playerNameRandomizeSetting) {
        playerNameRandomizeSetting.addEventListener("click", () => {
          const randomName = applyRandomizedPlayerNameToInput(playerNameSetting);
          if (!randomName || !playerNameSetting) return;
          playerNameSetting.focus();
          playerNameSetting.select();
        });
      }
      const debugResetProgress = document.getElementById("debugResetProgress");
      const resetConfirmRow = document.getElementById("resetConfirmRow");
      const resetConfirmYes = document.getElementById("resetConfirmYes");
      const resetConfirmNo = document.getElementById("resetConfirmNo");
      const resetConfirmAnchor = resetConfirmRow ? resetConfirmRow.closest(".confirm-anchor") : null;
      const hideResetConfirmRow = () => {
        if (resetConfirmRow) {
          resetConfirmRow.setAttribute("hidden", "");
        }
      };
      if (debugResetProgress) {
        debugResetProgress.addEventListener("click", () => {
          if (!resetConfirmRow) return;
          if (resetConfirmRow.hasAttribute("hidden")) {
            resetConfirmRow.removeAttribute("hidden");
          } else {
            resetConfirmRow.setAttribute("hidden", "");
          }
        });
      }
      if (resetConfirmNo) {
        resetConfirmNo.addEventListener("click", () => {
          hideResetConfirmRow();
        });
        resetConfirmNo.addEventListener("keydown", (event) => {
          event.preventDefault();
        });
      }
      if (resetConfirmYes) {
        resetConfirmYes.addEventListener("click", async (event) => {
          event.preventDefault();
          event.stopPropagation();
          document.body.classList.add("loading-overlay");
          if (splashLoading) {
            splashLoading.removeAttribute("aria-hidden");
          }
          resetConfirmYes.disabled = true;
          hideResetConfirmRow();
          document.body.classList.add("resetting");
          document.body.dataset.view = "loading";
          resetLoadingActive = true;
          if (settingsModal) {
            commitPlayerNameFromSettingsInput();
            setModalState(settingsModal, false);
          }
          openSplashLoading("Resetting...");
          if (splashLoading) {
            const textEl = splashLoading.querySelector(".splash-loading__text");
            if (textEl) {
              textEl.textContent = "Resetting...";
            }
          }
          document.body.classList.remove("home-anim");
          await new Promise((resolve) => window.requestAnimationFrame(resolve));
          await new Promise((resolve) => window.setTimeout(resolve, 1000));
          try {
            const bestTimesSnapshot = window.stageBestTimes ? { ...window.stageBestTimes } : {};
          window.stageStars = {};
          window.stageBestTimes = {};
          window.stageCompleted = {};
          window.stageNewSeen = {};
          window.flashRecallSessionStats = {
            totalSeconds: 0,
            totalCards: 0,
            totalLevelAttempts: 0,
            totalLevelSuccesses: 0,
            failedLevelCount: 0,
            sandboxPlayed: false,
            sandboxCompletedCount: 0,
            flashCompletedCount: 0,
            tutorialCompletedCount: 0,
            challengeCompletedCount: 0,
            cardTypeCounts: {},
            modifierVariantCounts: {}
          };
          const statsKey = typeof window.getStatsStorageKey === "function"
            ? window.getStatsStorageKey()
            : "flashRecallStats";
          const legacyStatsKey = "flashRecallStats";
          window.localStorage.removeItem(statsKey);
          window.localStorage.removeItem(legacyStatsKey);
          const progressKey = typeof window.getStageProgressStorageKey === "function"
            ? window.getStageProgressStorageKey()
            : "flashRecallStageProgress";
          const legacyProgressKey = "flashRecallStageProgress";
          window.localStorage.removeItem(progressKey);
          window.localStorage.removeItem(legacyProgressKey);
          window.localStorage.removeItem(FLASH_WARNING_KEY);

          window.localStorage.removeItem("flashRecallSandboxUnlocks");
          window.localStorage.removeItem("flashRecallPlayerName");
          window.localStorage.removeItem("flashRecallPlayerNamePrompted");
          window.localStorage.removeItem(APPEARANCE_THEME_KEY);
          window.localStorage.removeItem(APPEARANCE_COLOR_VISION_KEY);
          window.localStorage.removeItem(APPEARANCE_LAYOUT_KEY);
          window.localStorage.removeItem(KEYBINDS_STORAGE_KEY);
          window.localStorage.removeItem("flashRecallSuccessAnimation");
          window.localStorage.removeItem("flashRecallFlashCountdown");
          window.localStorage.removeItem("flashRecallAutoAdvanceNext");
          window.localStorage.removeItem("flashRecallAutoRetry");
          window.localStorage.removeItem("flashRecallEnterToNext");
          window.localStorage.removeItem("flashRecallStage1RecallLockUsed");

          window.localStorage.removeItem(LEADERBOARDS_ENABLED_STORAGE_KEY);
          window.localStorage.removeItem(ADAPTIVE_PROFILE_KEY);
          window.localStorage.removeItem(AUDIO_MASTER_KEY);
          window.localStorage.removeItem(AUDIO_MUSIC_KEY);
          window.localStorage.removeItem(AUDIO_EFFECTS_KEY);
          window.localStorage.removeItem("flashRecallABVariant");

          const resetTheme = appearanceOptions.themes.includes(defaultAppearance.theme)
            ? defaultAppearance.theme
            : appearanceOptions.themes[0];
          const colorVisionModes = Array.isArray(appearanceOptions.colorVisionModes)
            ? appearanceOptions.colorVisionModes
            : ["standard"];
          const resetColorVision = colorVisionModes.includes(defaultAppearance.colorVision)
            ? defaultAppearance.colorVision
            : colorVisionModes[0];
          const resetLayout = appearanceOptions.layouts.includes(defaultAppearance.layout)
            ? defaultAppearance.layout
            : appearanceOptions.layouts[0];
          applyAppearance(
            resetTheme,
            resetLayout,
            resetColorVision
          );
          if (appearanceColorVision) {
            appearanceColorVision.value = resetColorVision;
          }
          if (successAnimationToggle) {
            successAnimationToggle.checked = Boolean(defaultControlSettings.successAnimation);
            setSuccessAnimationEnabled(successAnimationToggle.checked);
          }
          if (flashCountdownToggle) {
            flashCountdownToggle.checked = Boolean(defaultControlSettings.flashCountdown);
            flashCountdownEnabled = flashCountdownToggle.checked;
          }
          if (autoAdvanceNextToggle) {
            autoAdvanceNextToggle.checked = Boolean(defaultControlSettings.autoAdvanceNext);
            autoAdvanceNextEnabled = autoAdvanceNextToggle.checked;
            if (!autoAdvanceNextEnabled && autoAdvanceNextTimerId) {
              clearTimeout(autoAdvanceNextTimerId);
              autoAdvanceNextTimerId = null;
              cancelStageNextAutoAdvanceBar();
            }
          }
          if (autoRetryToggle) {
            autoRetryToggle.checked = Boolean(defaultControlSettings.autoRetry);
            autoRetryEnabled = autoRetryToggle.checked;
            if (!autoRetryEnabled && autoRetryTimerId) {
              clearTimeout(autoRetryTimerId);
              autoRetryTimerId = null;
              cancelStageRetryAutoAdvanceBar();
            }
          }
          if (autoStartStagePreviewToggle) {
            autoStartStagePreviewToggle.checked = Boolean(defaultControlSettings.autoStartStagePreview);
            stageIntroAutoStartEnabled = autoStartStagePreviewToggle.checked;
            if (!stageIntroAutoStartEnabled) {
              clearStageIntroAutoStart();
            }
          }
          if (enterToNextToggle) {
            enterToNextToggle.checked = Boolean(defaultControlSettings.enterToNext);
            enterToNextEnabled = enterToNextToggle.checked;
          }
          if (photosensitivityWarningToggle) {
            setFlashWarningEnabled(Boolean(defaultControlSettings.flashWarningEnabled), false);
          }

          if (leaderboardsEnabledToggle) {
            leaderboardsEnabledToggle.checked = Boolean(defaultControlSettings.leaderboardsEnabled);
            leaderboardsEnabled = leaderboardsEnabledToggle.checked;
          }
          applyAudioSettings(defaultAudioSettings, true);
          keybinds = { ...defaultKeybinds };
          activeRebindAction = null;
          refreshKeybindButtons();
          refreshActionKeyHints();
          window.localStorage.removeItem(SPLASH_SEEN_KEY);
          updatePlayerNameInputs("");
          updatePlayerNameSettingVisibility();
          if (typeof window.saveStageProgress === "function") {
            window.saveStageProgress();
          }
          if (typeof window.deactivateLocalLeaderboardEntries === "function") {
            window.deactivateLocalLeaderboardEntries(bestTimesSnapshot).catch(() => {});
          }
          if (typeof window.rotateLeaderboardPlayerId === "function") {
            try {
              sessionStorage.setItem("flashRecallSkipInitialLoading", "1");
            } catch (error) {}
            window.rotateLeaderboardPlayerId();
            window.setTimeout(() => {
              window.location.reload();
            }, 50);
            return;
          }

          if (stagesScreen && document.body.dataset.view === "stages") {
            renderStageList(false);
          }
          if (practiceModal && practiceModal.classList.contains("show")) {
            updateCategoryControls();

          }
          await new Promise((resolve) => {
            window.setTimeout(resolve, 750);
          });
          showSplashAfterLoading();
          resetLoadingActive = false;
          } finally {
          }
        });
        resetConfirmYes.addEventListener("keydown", (event) => {
          event.preventDefault();
        });
      }
      if (settingsModal) {
        settingsModal.addEventListener("click", (event) => {
          if (event.target === settingsModal) {
            hideResetConfirmRow();
          }
        });
      }
      if (settingsClose) {
        settingsClose.addEventListener("click", () => {
          hideResetConfirmRow();
        });
      }
      document.addEventListener("click", (event) => {
        if (!resetConfirmRow || resetConfirmRow.hasAttribute("hidden")) return;
        if (resetConfirmAnchor && resetConfirmAnchor.contains(event.target)) return;
        hideResetConfirmRow();
      });
      async function renderStatsMetricLeaderboard(metric, listId, emptyId, valueLabel) {
        const listEl = document.getElementById(listId);
        const emptyEl = document.getElementById(emptyId);
        if (!listEl) return;
        const getLocalProgress = async () => {
          const stages = Array.isArray(window.stagesConfig) ? window.stagesConfig : [];
          const stagesCleared = stages.reduce((sum, stage, index) => {
            const stageKey = window.getStageStarsKey
              ? window.getStageStarsKey(stage, index)
              : (stage && stage.id ? String(stage.id) : String(index + 1));
            return sum + (window.stageCompleted && window.stageCompleted[stageKey] ? 1 : 0);
          }, 0);
          const starsEarned = stages.reduce((sum, stage, index) => {
            const stageKey = window.getStageStarsKey
              ? window.getStageStarsKey(stage, index)
              : (stage && stage.id ? String(stage.id) : String(index + 1));
            return sum + (window.stageStars && window.stageStars[stageKey] ? window.stageStars[stageKey] : 0);
          }, 0);
          let achievementsUnlocked = 0;
          if (typeof window.fetchAchievementOverview === "function") {
            try {
              const achievementOverview = await window.fetchAchievementOverview({ refresh: false });
              achievementsUnlocked = Number(achievementOverview && achievementOverview.unlockedCount) || 0;
            } catch (error) {}
          }
          return { stagesCleared, starsEarned, achievementsUnlocked };
        };
        const headerRow = document.createElement("div");
        headerRow.className = "leaderboard-row";
        headerRow.innerHTML = `<span>#</span><span>Player</span><span>${valueLabel}</span>`;
        const loadingRow = document.createElement("div");
        loadingRow.className = "leaderboard-row leaderboard-row--empty";
        loadingRow.textContent = "Loading...";
        listEl.replaceChildren(headerRow, loadingRow);

        if (typeof window.fetchProgressLeaderboard !== "function") {
          loadingRow.textContent = "Leaderboard unavailable.";
          listEl.replaceChildren(headerRow, loadingRow);
          return;
        }
        const localProgress = await getLocalProgress();
        if (typeof window.updateProgressLeaderboardSnapshot === "function") {
          const name = typeof window.getPlayerName === "function" ? window.getPlayerName() : "";
          window.updateProgressLeaderboardSnapshot(
            localProgress.stagesCleared,
            localProgress.starsEarned,
            name,
            localProgress.achievementsUnlocked
          );
        }
        const localValue = metric === "stages_cleared"
          ? localProgress.stagesCleared
          : metric === "achievements_unlocked"
            ? localProgress.achievementsUnlocked
            : localProgress.starsEarned;
        try {
          let result = null;
          let attempts = 0;
          do {
            result = await window.fetchProgressLeaderboard(metric, 5, { refreshIfStale: true });
            if (result && result.errorCode !== "not_ready") break;
            attempts += 1;
            if (attempts <= 5) {
              await new Promise((resolve) => window.setTimeout(resolve, 350));
            }
          } while (attempts <= 5);
          const top = result && Array.isArray(result.top) ? result.top : [];
          const me = result ? result.me : null;
          const meRank = result && Number.isFinite(result.meRank) ? result.meRank : null;
          const localName = getPreferredPlayerDisplayName();
          const topRows = [];
          const mePlayerId = window.getLeaderboardPlayerId ? window.getLeaderboardPlayerId() : "";
          let meInTop = false;
          top.forEach((entry, idx) => {
            const value = Number(entry[metric]) || 0;
            const isMe = entry.player_id && mePlayerId && entry.player_id === mePlayerId;
            if (isMe) meInTop = true;
            appendLeaderboardDataRow(topRows, entry, idx + 1, localName, (rank, rawName) => {
              return `<span>${rank}</span><span class="leaderboard-name" title="${rawName}">${rawName}</span><span>${value}</span>`;
            });
          });
          let playerRow = null;
          if (meInTop || (Number.isFinite(meRank) && meRank > 0 && meRank <= top.length)) {
            playerRow = buildLeaderboardPlaceholderRow();
          } else if (me) {
            const value = Number(me[metric]);
            const safeValue = Number.isFinite(value) ? value : localValue;
            const rankText = meRank ? String(meRank) : "\u2014";
            const rows = [];
            appendLeaderboardDataRow(rows, me, Number(rankText) || 0, localName, (resolvedRank, rawName) => {
              return `<span>${resolvedRank || rankText}</span><span class="leaderboard-name" title="${rawName}">${rawName}</span><span>${safeValue}</span>`;
            }, ["leaderboard-row--context"]);
            playerRow = rows[0] || null;
          } else {
            const meRow = document.createElement("div");
            meRow.className = "leaderboard-row leaderboard-row--me leaderboard-row--context";
            meRow.dataset.playerId = mePlayerId;
            const name = localName || "You";
            meRow.innerHTML = `<span>${meRank || "-"}</span><span class="leaderboard-name">${name}</span><span>${localValue}</span>`;
            playerRow = meRow;
          }
          const rows = topRows.slice();
          if (topRows.length && playerRow) {
            const dividerRow = document.createElement("div");
            dividerRow.className = "leaderboard-divider";
            dividerRow.setAttribute("aria-hidden", "true");
            rows.push(dividerRow);
          }
          if (playerRow) {
            rows.push(playerRow);
          }
          listEl.replaceChildren(headerRow, ...rows);
          if (result && result.errorCode) {
            const statusRow = document.createElement("div");
            statusRow.className = "leaderboard-row leaderboard-row--empty";
            statusRow.textContent = result.errorMessage || "Leaderboard unavailable.";
            listEl.appendChild(statusRow);
          }
        } catch (error) {
          console.warn("Failed to render stats leaderboard", error);
          const detail =
            error && error.message ? String(error.message) : "";
          loadingRow.textContent = detail || (emptyEl ? emptyEl.textContent || "Leaderboard unavailable." : "Leaderboard unavailable.");
          listEl.replaceChildren(headerRow, loadingRow);
        }
      }
      const statsLeaderboardTabs = {
        stars_earned: { title: "Stars leaderboard", valueLabel: "Stars" },
        stages_cleared: { title: "Stages cleared leaderboard", valueLabel: "Stages" },
        achievements_unlocked: { title: "Achievements leaderboard", valueLabel: "Achievements" }
      };
      let activeStatsLeaderboardTab = "stars_earned";
      const REVEAL_SECRET_ACHIEVEMENTS = false;

      function maskAchievementText(text) {
        return String(text || "").replace(/[^\s]/g, "?");
      }

      function escapeAchievementHtml(value) {
        return String(value || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
      }

      function getAchievementDisplayItem(item) {
        if (!item) return item;
        if (!REVEAL_SECRET_ACHIEVEMENTS) return item;
        if (!item.secret || item.unlocked) return item;
        return { ...item, unlocked: true, __secretRevealed: true };
      }

      function buildAchievementIconMarkup(item) {
        const displayItem = getAchievementDisplayItem(item);
        const isSecretLocked = displayItem && displayItem.secret && !displayItem.unlocked;
        if (isSecretLocked) {
          return '<span class="achievement-icon__text">?</span>';
        }
        const badgeMarkup = displayItem && displayItem.iconBadge
          ? `<span class="achievement-icon__badge">${escapeAchievementHtml(displayItem.iconBadge)}</span>`
          : "";
        if (displayItem && displayItem.iconSrc) {
          return `
            <span class="achievement-icon__art">
              <img class="achievement-icon__img" src="${displayItem.iconSrc}" alt="" />
              ${badgeMarkup}
            </span>
          `;
        }
        const text = displayItem && displayItem.iconText ? String(displayItem.iconText) : "?";
        return `
          <span class="achievement-icon__art">
            <span class="achievement-icon__text">${text}</span>
            ${badgeMarkup}
          </span>
        `;
      }

      function getAchievementDisplayTitle(item) {
        const displayItem = getAchievementDisplayItem(item);
        if (displayItem && displayItem.secret && !displayItem.unlocked) {
          return maskAchievementText(displayItem.title);
        }
        return String(displayItem && displayItem.title ? displayItem.title : "");
      }

      function openAchievementInfoModal(item, totalPlayers) {
        const modal = window.achievementInfoModal;
        const card = window.achievementInfoCard;
        const icon = window.achievementInfoIcon;
        const titleEl = window.achievementInfoTitle;
        const descriptionEl = window.achievementInfoDescription;
        const metaEl = window.achievementInfoMeta;
        if (!(modal && card && icon && titleEl && descriptionEl && metaEl && item)) return;
        const displayItem = getAchievementDisplayItem(item);
        const isSecretLocked = displayItem.secret && !displayItem.unlocked;
        const title = getAchievementDisplayTitle(displayItem);
        const description = isSecretLocked ? maskAchievementText(displayItem.description) : displayItem.description;
        const percentText = displayItem.unlocked
          ? `${Math.max(0, Number(displayItem.percentUnlocked) || 0)}% of players`
          : "";
        const playersText = displayItem.unlocked && Number(totalPlayers) > 0
          ? `${Math.max(0, Number(totalPlayers) || 0)} tracked players`
          : "";
        card.style.setProperty("--achievement-accent", displayItem.difficultyColor || "var(--accent)");
        card.classList.toggle("is-locked", !displayItem.unlocked);
        icon.innerHTML = buildAchievementIconMarkup(displayItem);
        titleEl.textContent = title;
        descriptionEl.textContent = description;
        metaEl.innerHTML = "";
        [percentText, playersText].filter(Boolean).forEach((value) => {
          const chip = document.createElement("span");
          chip.textContent = value;
          metaEl.appendChild(chip);
        });
        setModalState(modal, true);
      }

      function showAchievementUnlockToast(item) {
        if (!achievementToastStack || !item) return;
        const toast = document.createElement("div");
        toast.className = "achievement-toast";
        toast.style.setProperty("--achievement-accent", item.difficultyColor || "var(--accent)");
        toast.innerHTML = `
          <div class="achievement-toast__icon">${buildAchievementIconMarkup({ ...item, unlocked: true })}</div>
          <div class="achievement-toast__copy">
            <div class="achievement-toast__eyebrow">Achievement unlocked</div>
            <strong class="achievement-toast__title">${escapeAchievementHtml(item.title)}</strong>
            <div class="achievement-toast__description">${escapeAchievementHtml(item.description)}</div>
          </div>
          <button class="achievement-toast__close" type="button" aria-label="Dismiss achievement notification">&times;</button>
        `;
        const dismiss = () => {
          if (toast.dataset.dismissed === "true") return;
          toast.dataset.dismissed = "true";
          if (toast.dataset.timerId) {
            clearTimeout(Number(toast.dataset.timerId));
          }
          toast.classList.remove("show");
          window.setTimeout(() => {
            toast.remove();
          }, 220);
        };
        const closeButton = toast.querySelector(".achievement-toast__close");
        if (closeButton) {
          closeButton.addEventListener("click", dismiss);
        }
        achievementToastStack.appendChild(toast);
        window.requestAnimationFrame(() => {
          toast.classList.add("show");
        });
        toast.dataset.timerId = String(window.setTimeout(dismiss, 5200));
      }

      const shownAchievementToastIds = new Set();
      const ACHIEVEMENT_SOUND_COOLDOWN_MS = 1800;
      let lastAchievementSoundAt = 0;

      function flushAchievementUnlockToasts(items = []) {
        const queuedItems = Array.isArray(window.flashRecallPendingAchievementUnlocks)
          ? window.flashRecallPendingAchievementUnlocks.splice(0)
          : [];
        const combined = [...queuedItems, ...(Array.isArray(items) ? items : [])];
        let shownCount = 0;
        combined.forEach((item) => {
          const id = item && item.id ? String(item.id) : "";
          if (!id || shownAchievementToastIds.has(id)) return;
          shownAchievementToastIds.add(id);
          showAchievementUnlockToast(item);
          shownCount += 1;
        });
        if (shownCount > 0 && typeof window.playAchievementSound === "function") {
          const now = Date.now();
          if (now - lastAchievementSoundAt >= ACHIEVEMENT_SOUND_COOLDOWN_MS) {
            lastAchievementSoundAt = now;
            window.playAchievementSound();
          }
        }
      }

      function renderAchievementsOverviewLegacy(result) {
        if (!achievementsList) return;
        const summaryText = achievementsSummary;
        const items = result && Array.isArray(result.items) ? result.items : [];
        const unlockedCount = result ? Number(result.unlockedCount) || 0 : 0;
        const totalCount = result ? Number(result.totalCount) || items.length : items.length;
        const totalPlayers = result ? Number(result.totalPlayers) || 0 : 0;
        if (summaryText) {
          const baseText = `${unlockedCount}/${totalCount} unlocked`;
          summaryText.textContent = totalPlayers > 0
            ? `${baseText} • Based on ${totalPlayers} players`
            : baseText;
        }
        achievementsList.innerHTML = "";

        if (!items.length) {
          const emptyRow = document.createElement("div");
          emptyRow.className = "achievement-row achievement-row--empty";
          emptyRow.textContent = (result && result.errorMessage) || "No achievements available.";
          achievementsList.appendChild(emptyRow);
          return;
        }

        items
          .map((item, index) => ({ item, index }))
          .sort((left, right) => {
            const leftItem = getAchievementDisplayItem(left.item);
            const rightItem = getAchievementDisplayItem(right.item);
            const unlockedDelta = Number(Boolean(rightItem.unlocked)) - Number(Boolean(leftItem.unlocked));
            if (unlockedDelta !== 0) return unlockedDelta;
            const difficultyDelta =
              (Number(leftItem.difficultyScore) || 0) - (Number(rightItem.difficultyScore) || 0);
            if (difficultyDelta !== 0) return difficultyDelta;
            return left.index - right.index;
          })
          .forEach(({ item }) => {
          const displayItem = getAchievementDisplayItem(item);
          const isSecretLocked = displayItem.secret && !displayItem.unlocked;
          const row = document.createElement("div");
          row.className = `achievement-row${displayItem.unlocked ? " is-unlocked" : " is-locked"}${isSecretLocked ? " is-secret-locked" : ""}`;
          const description = isSecretLocked ? maskAchievementText(displayItem.description) : displayItem.description;
          const percentText = displayItem.unlocked
            ? `${Math.max(0, Number(displayItem.percentUnlocked) || 0)}% of players`
            : "";
          row.innerHTML = `
            <div class="achievement-icon">${buildAchievementIconMarkup(displayItem)}</div>
            <div class="achievement-copy">
              <div class="achievement-title-row">
                <strong class="achievement-title">${displayItem.title}</strong>
              </div>
              <div class="achievement-description">${description}</div>
            </div>
            <div class="achievement-percent">${percentText}</div>
          `;
          achievementsList.appendChild(row);
        });
      }

      function renderAchievementsOverview(result) {
        if (!achievementsList) return;
        const summaryText = achievementsSummary;
        const items = result && Array.isArray(result.items) ? result.items : [];
        const unlockedCount = result ? Number(result.unlockedCount) || 0 : 0;
        const totalCount = result ? Number(result.totalCount) || items.length : items.length;
        const totalPlayers = result ? Number(result.totalPlayers) || 0 : 0;
        if (summaryText) {
          const baseText = `${unlockedCount}/${totalCount} achievements unlocked`;
          summaryText.textContent = totalPlayers > 0
            ? `${baseText} | ${totalPlayers} tracked players`
            : baseText;
        }
        achievementsList.innerHTML = "";

        if (!items.length) {
          const emptyRow = document.createElement("div");
          emptyRow.className = "achievement-tile achievement-tile--empty";
          emptyRow.textContent = (result && result.errorMessage) || "No achievements available.";
          achievementsList.appendChild(emptyRow);
          return;
        }

        const sortedItems = items
          .map((item, index) => ({ item, index }))
          .sort((left, right) => {
            const leftItem = getAchievementDisplayItem(left.item);
            const rightItem = getAchievementDisplayItem(right.item);
            const unlockedDelta = Number(Boolean(rightItem.unlocked)) - Number(Boolean(leftItem.unlocked));
            if (unlockedDelta !== 0) return unlockedDelta;
            const difficultyDelta =
              (Number(leftItem.difficultyScore) || 0) - (Number(rightItem.difficultyScore) || 0);
            if (difficultyDelta !== 0) return difficultyDelta;
            return left.index - right.index;
          })
          .map(({ item }) => getAchievementDisplayItem(item));

        sortedItems.forEach((item) => {
          const isSecretLocked = item.secret && !item.unlocked;
          const tile = document.createElement("button");
          tile.type = "button";
          tile.className = `achievement-tile${item.unlocked ? " is-unlocked" : " is-locked"}${isSecretLocked ? " is-secret-locked" : ""}`;
          tile.style.setProperty("--achievement-accent", item.difficultyColor || "var(--accent)");
          tile.setAttribute("aria-pressed", "false");
          tile.innerHTML = `
            <div class="achievement-tile__icon">${buildAchievementIconMarkup(item)}</div>
            <strong class="achievement-tile__title">${escapeAchievementHtml(getAchievementDisplayTitle(item))}</strong>
          `;
          tile.addEventListener("click", () => {
            logUiInteraction("achievement_detail_open", {
              area: "achievements_modal",
              action: "open",
              achievement_id: item.id || null,
              achievement_unlocked: Boolean(item.unlocked)
            });
            openAchievementInfoModal(item, totalPlayers);
          });
          achievementsList.appendChild(tile);
        });
      }

      function getAchievementOverviewFallbackResult(errorMessage) {
        const catalog = typeof window.getAchievementCatalog === "function"
          ? window.getAchievementCatalog()
          : [];
        return {
          items: catalog.map((item) => ({ ...item, unlocked: false })),
          unlockedCount: 0,
          totalCount: catalog.length,
          totalPlayers: 0,
          errorMessage: errorMessage || ""
        };
      }

      async function openAchievementsModal() {
        if (!achievementsModal || !achievementsList) return;
        logUiInteraction("achievements_open", {
          area: "home_menu",
          action: "open"
        });
        if (achievementsSummary) {
          achievementsSummary.textContent = "Loading achievements...";
        }
        achievementsList.innerHTML = "";
        const loadingRow = document.createElement("div");
        loadingRow.className = "achievement-tile achievement-tile--empty";
        loadingRow.textContent = "Loading...";
        achievementsList.appendChild(loadingRow);
        setModalState(achievementsModal, true);

        if (typeof window.fetchAchievementOverview !== "function") {
          renderAchievementsOverview(getAchievementOverviewFallbackResult("Achievements are unavailable."));
          return;
        }

        try {
          const result = await window.fetchAchievementOverview({ refresh: true });
          renderAchievementsOverview(result);
        } catch (error) {
          renderAchievementsOverview(getAchievementOverviewFallbackResult("Could not load achievements right now."));
        }
      }

      async function openStatsLeaderboard(metric = activeStatsLeaderboardTab) {
        if (!statsLeaderboardModal) return;
        const nextTab = statsLeaderboardTabs[metric] ? metric : "stars_earned";
        logUiInteraction("stats_leaderboard_view", {
          area: "stats_leaderboard_modal",
          action: "view",
          leaderboard_metric: nextTab
        });
        activeStatsLeaderboardTab = nextTab;
        if (statsLeaderboardTitle) {
          statsLeaderboardTitle.textContent = statsLeaderboardTabs[nextTab].title;
        }
        [statsLeaderboardTabStars, statsLeaderboardTabStages, statsLeaderboardTabAchievements].forEach((button) => {
          if (!button) return;
          const isActive = button.getAttribute("data-stats-leaderboard-tab") === nextTab;
          button.classList.toggle("is-active", isActive);
          button.setAttribute("aria-selected", isActive ? "true" : "false");
        });
        setModalState(statsLeaderboardModal, true);
        await renderStatsMetricLeaderboard(
          nextTab,
          "statsLeaderboardModalList",
          "statsLeaderboardModalEmpty",
          statsLeaderboardTabs[nextTab].valueLabel
        );
      }
      if (statsOpen && statsModal) {
        statsOpen.addEventListener("click", async () => {
          logUiInteraction("stats_open", {
            area: "home_menu",
            action: "open"
          });
          const stages = Array.isArray(window.stagesConfig) ? window.stagesConfig : [];
          const stagesClearedEl = document.getElementById("statsStagesCleared");
          const stagesTotalEl = document.getElementById("statsStagesTotal");
          const starsEarnedEl = document.getElementById("statsStarsEarned");
          const achievementsUnlockedEl = document.getElementById("statsAchievementsUnlocked");
          const achievementsTotalEl = document.getElementById("statsAchievementsTotal");
          const avgPerCardEl = document.getElementById("statsAvgPerCard");
          const avgBestPerCardEl = document.getElementById("statsAvgBestPerCard");
          const totalTimeSpentEl = document.getElementById("statsTotalTimeSpent");
          const levelAttemptsEl = document.getElementById("statsLevelAttempts");
          const levelSuccessRateEl = document.getElementById("statsLevelSuccessRate");
          if (stagesClearedEl || stagesTotalEl || starsEarnedEl) {
            const totalStages = stages.length;
            const stagesCleared = stages.reduce((sum, stage, index) => {
              const stageKey = window.getStageStarsKey
                ? window.getStageStarsKey(stage, index)
                : (stage && stage.id ? String(stage.id) : String(index + 1));
              return sum + (window.stageCompleted && window.stageCompleted[stageKey] ? 1 : 0);
            }, 0);
            const starsEarned = stages.reduce((sum, stage, index) => {
              const stageKey = window.getStageStarsKey
                ? window.getStageStarsKey(stage, index)
                : (stage && stage.id ? String(stage.id) : String(index + 1));
              return sum + (window.stageStars && window.stageStars[stageKey] ? window.stageStars[stageKey] : 0);
            }, 0);
            if (stagesClearedEl) stagesClearedEl.textContent = String(stagesCleared);
            if (stagesTotalEl) stagesTotalEl.textContent = String(totalStages);
            if (starsEarnedEl) starsEarnedEl.textContent = String(starsEarned);
            if (typeof window.updateProgressLeaderboardSnapshot === "function") {
              const name = typeof window.getPlayerName === "function" ? window.getPlayerName() : "";
              window.updateProgressLeaderboardSnapshot(stagesCleared, starsEarned, name);
            }
          }

          if (achievementsUnlockedEl || achievementsTotalEl) {
            let unlockedValue = 0;
            let totalValue = typeof window.getAchievementCatalog === "function"
              ? window.getAchievementCatalog().length
              : 0;
            if (typeof window.fetchAchievementOverview === "function") {
              try {
                const achievementOverview = await window.fetchAchievementOverview({ refresh: false });
                unlockedValue = Number(achievementOverview && achievementOverview.unlockedCount) || 0;
                totalValue = Number(achievementOverview && achievementOverview.totalCount) || totalValue;
                if (typeof window.updateProgressLeaderboardSnapshot === "function") {
                  const name = typeof window.getPlayerName === "function" ? window.getPlayerName() : "";
                  const stagesCleared = Number(stagesClearedEl && stagesClearedEl.textContent) || 0;
                  const starsEarned = Number(starsEarnedEl && starsEarnedEl.textContent) || 0;
                  window.updateProgressLeaderboardSnapshot(stagesCleared, starsEarned, name, unlockedValue);
                }
              } catch (error) {}
            }
            if (achievementsUnlockedEl) achievementsUnlockedEl.textContent = String(unlockedValue);
            if (achievementsTotalEl) achievementsTotalEl.textContent = String(totalValue);
          }

          const key = typeof window.getStatsStorageKey === "function"
            ? window.getStatsStorageKey()
            : "flashRecallStats";
          let avgText = "-";
          let trackedTotalSeconds = 0;
          let totalLevelAttempts = 0;
          let totalLevelSuccesses = 0;
          const formatDuration = (seconds) => {
            const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
            const hours = Math.floor(safeSeconds / 3600);
            const minutes = Math.floor((safeSeconds % 3600) / 60);
            const secs = safeSeconds % 60;
            if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
            if (minutes > 0) return `${minutes}m ${secs}s`;
            return `${secs}s`;
          };
          try {
            const rawStats = window.localStorage.getItem(key);
            if (rawStats) {
              const parsed = JSON.parse(rawStats);
              const totalSeconds = Number(parsed && parsed.totalSeconds) || 0;
              const totalCards = Number(parsed && parsed.totalCards) || 0;
              trackedTotalSeconds = totalSeconds;
              totalLevelAttempts = Number(parsed && parsed.totalLevelAttempts) || 0;
              totalLevelSuccesses = Number(parsed && parsed.totalLevelSuccesses) || 0;
              if (totalCards > 0) {
                const avg = totalSeconds / totalCards;
                avgText = `${avg.toFixed(2)}s`;
              }
            }
          } catch (error) {
            avgText = "-";
          }
          if (avgText === "-" || totalLevelAttempts <= 0 || trackedTotalSeconds <= 0) {
            const sessionStats = window.flashRecallSessionStats;
            const totalSeconds = Number(sessionStats && sessionStats.totalSeconds) || 0;
            const totalCards = Number(sessionStats && sessionStats.totalCards) || 0;
            if (avgText === "-" && totalCards > 0) {
              avgText = `${(totalSeconds / totalCards).toFixed(2)}s`;
            }
            if (trackedTotalSeconds <= 0 && totalSeconds > 0) {
              trackedTotalSeconds = totalSeconds;
            }
            if (totalLevelAttempts <= 0) {
              totalLevelAttempts = Number(sessionStats && sessionStats.totalLevelAttempts) || 0;
              totalLevelSuccesses = Number(sessionStats && sessionStats.totalLevelSuccesses) || 0;
            }
          }
          if (avgPerCardEl) {
            avgPerCardEl.textContent = avgText;
          }
          if (totalTimeSpentEl) {
            totalTimeSpentEl.textContent = trackedTotalSeconds > 0 ? formatDuration(trackedTotalSeconds) : "-";
          }
          if (levelAttemptsEl) {
            levelAttemptsEl.textContent = String(Math.max(0, totalLevelAttempts));
          }
          if (levelSuccessRateEl) {
            if (totalLevelAttempts > 0) {
              const clampedSuccesses = Math.max(0, Math.min(totalLevelAttempts, totalLevelSuccesses));
              const rate = (clampedSuccesses / totalLevelAttempts) * 100;
              levelSuccessRateEl.textContent = `${rate.toFixed(1)}%`;
            } else {
              levelSuccessRateEl.textContent = "-";
            }
          }

          if (avgBestPerCardEl) {
            const stages = Array.isArray(window.stagesConfig) ? window.stagesConfig : [];
            const totals = stages.reduce(
              (acc, stage, index) => {
                const stageKey = stage && stage.id ? String(stage.id) : String(index + 1);
                const bestKey = window.getStageBestTimeKey
                  ? window.getStageBestTimeKey(stage, index)
                  : stageKey;
                const bestSeconds = Number(window.stageBestTimes && window.stageBestTimes[bestKey]);
                if (!Number.isFinite(bestSeconds)) return acc;
                const rounds = Number(stage.rounds) || 1;
                const cards = window.getStageCardCount ? window.getStageCardCount(stage) : stage.cards || 1;
                const totalCards = Math.max(1, rounds * (Number(cards) || 1));
                acc.seconds += bestSeconds;
                acc.cards += totalCards;
                return acc;
              },
              { seconds: 0, cards: 0 }
            );
            if (totals.cards > 0) {
              avgBestPerCardEl.textContent = `${(totals.seconds / totals.cards).toFixed(2)}s`;
            } else {
              avgBestPerCardEl.textContent = "\u2014";
            }
          }
          setModalState(statsModal, true);
        });
      }
      if (achievementsOpen && achievementsModal) {
        achievementsOpen.addEventListener("click", () => {
          openAchievementsModal();
        });
      }
      if (statsLeaderboardOpen) {
        statsLeaderboardOpen.addEventListener("click", () => {
          logUiInteraction("stats_leaderboard_open", {
            area: "stats_modal",
            action: "open",
            leaderboard_metric: activeStatsLeaderboardTab
          });
          openStatsLeaderboard(activeStatsLeaderboardTab);
        });
      }
      [statsLeaderboardTabStars, statsLeaderboardTabStages, statsLeaderboardTabAchievements].forEach((button) => {
        if (!button) return;
        button.addEventListener("click", () => {
          const tab = button.getAttribute("data-stats-leaderboard-tab");
          if (!tab) return;
          logUiInteraction("stats_leaderboard_tab_view", {
            area: "stats_leaderboard_modal",
            action: "view",
            leaderboard_metric: tab
          });
          openStatsLeaderboard(tab);
        });
      });
      if (statsLeaderboardModal) {
        statsLeaderboardModal.addEventListener("keydown", (event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          const order = ["stars_earned", "stages_cleared", "achievements_unlocked"];
          const idx = order.indexOf(activeStatsLeaderboardTab);
          const nextIdx = event.key === "ArrowRight"
            ? (idx + 1) % order.length
            : (idx - 1 + order.length) % order.length;
          event.preventDefault();
          openStatsLeaderboard(order[nextIdx]);
        });
      }
      if (statsClose && statsModal) {
        statsClose.addEventListener("click", () => {
          logUiInteraction("stats_close", {
            area: "stats_modal",
            action: "close",
            close_source: "button"
          });
          setModalState(statsModal, false);
        });
      }
      if (achievementsClose && achievementsModal) {
        achievementsClose.addEventListener("click", () => {
          logUiInteraction("achievements_close", {
            area: "achievements_modal",
            action: "close",
            close_source: "button"
          });
          setModalState(achievementsModal, false);
          if (window.achievementInfoModal) {
            setModalState(window.achievementInfoModal, false);
          }
        });
      }
      if (statsModal) {
        statsModal.addEventListener("click", (event) => {
          if (event.target === statsModal) {
            logUiInteraction("stats_close", {
              area: "stats_modal",
              action: "close",
              close_source: "backdrop"
            });
            setModalState(statsModal, false);
          }
        });
      }
      if (achievementsModal) {
        achievementsModal.addEventListener("click", (event) => {
          if (event.target === achievementsModal) {
            logUiInteraction("achievements_close", {
              area: "achievements_modal",
              action: "close",
              close_source: "backdrop"
            });
            setModalState(achievementsModal, false);
            if (window.achievementInfoModal) {
              setModalState(window.achievementInfoModal, false);
            }
          }
        });
      }
      if (window.achievementInfoClose && window.achievementInfoModal) {
        window.achievementInfoClose.addEventListener("click", () => {
          logUiInteraction("achievement_detail_close", {
            area: "achievement_detail_modal",
            action: "close",
            close_source: "button"
          });
          setModalState(window.achievementInfoModal, false);
        });
      }
      if (window.achievementInfoModal) {
        window.achievementInfoModal.addEventListener("click", (event) => {
          if (event.target === window.achievementInfoModal) {
            logUiInteraction("achievement_detail_close", {
              area: "achievement_detail_modal",
              action: "close",
              close_source: "backdrop"
            });
            setModalState(window.achievementInfoModal, false);
          }
        });
      }
      window.addEventListener("flashrecall:achievements-unlocked", (event) => {
        const items = event && event.detail && Array.isArray(event.detail.items) ? event.detail.items : [];
        flushAchievementUnlockToasts(items);
      });
      window.flashRecallAchievementNotificationsReady = true;
      flushAchievementUnlockToasts();
      if (statsLeaderboardClose && statsLeaderboardModal) {
        statsLeaderboardClose.addEventListener("click", () => {
          logUiInteraction("stats_leaderboard_close", {
            area: "stats_leaderboard_modal",
            action: "close",
            close_source: "button"
          });
          setModalState(statsLeaderboardModal, false);
        });
      }
      if (statsLeaderboardModal) {
        statsLeaderboardModal.addEventListener("click", (event) => {
          if (event.target === statsLeaderboardModal) {
            logUiInteraction("stats_leaderboard_close", {
              area: "stats_leaderboard_modal",
              action: "close",
              close_source: "backdrop"
            });
            setModalState(statsLeaderboardModal, false);
          }
        });
      }

      const contentResetModal = document.getElementById("contentResetModal");
      const contentResetClose = document.getElementById("contentResetClose");
      const contentResetAcknowledge = document.getElementById("contentResetAcknowledge");

      const closeContentResetNotice = (source) => {
        if (!contentResetModal) return;
        logUiInteraction("content_reset_notice_close", {
          area: "content_reset_modal",
          action: "close",
          close_source: source || "unknown"
        });
        setModalState(contentResetModal, false);
        if (document.body && document.body.dataset.view === "splash") {
          scheduleSplashAutoStart();
        }
      };
      if (contentResetClose && contentResetModal) {
        contentResetClose.addEventListener("click", () => {
          closeContentResetNotice("button");
        });
      }
      if (contentResetAcknowledge && contentResetModal) {
        contentResetAcknowledge.addEventListener("click", () => {
          closeContentResetNotice("acknowledge");
        });
      }
      if (contentResetModal) {
        contentResetModal.addEventListener("click", (event) => {
          if (event.target === contentResetModal) {
            closeContentResetNotice("backdrop");
          }
        });
      }

      practiceConfirm.addEventListener("click", () => {
        const selectedTypes = Array.from(
          practiceModal.querySelectorAll(".control-group .checkboxes input[type=\"checkbox\"][value]")
        ).filter((input) => input.checked);
        const activePracticeModifiers = [];
        if (!selectedTypes.length) {
          const error = document.getElementById("practiceTypeError");
          if (error) {
            error.hidden = false;
            error.classList.remove("show");
            void error.offsetWidth;
            error.classList.add("show");
            if (error.dataset.hideTimer) {
              clearTimeout(Number(error.dataset.hideTimer));
            }
            const timerId = window.setTimeout(() => {
              hidePracticeError(error);
            }, 3000);
            error.dataset.hideTimer = String(timerId);
          }
          return;
        }
        const error = document.getElementById("practiceTypeError");
        if (error) {
          hidePracticeError(error);
        }
        modeSelect.value = "practice";
        updateModeUI();
        resetGame();
        closePracticeModal();
        if (practiceMathOps && practiceMathOps.checked) activePracticeModifiers.push("mathOps");
        if (practiceMathOpsPlus && practiceMathOpsPlus.checked) activePracticeModifiers.push("mathOpsPlus");
        if (practiceMisleadColors && practiceMisleadColors.checked) activePracticeModifiers.push("misleadColors");
        if (practiceBackgroundColor && practiceBackgroundColor.checked) activePracticeModifiers.push("backgroundColor");
        if (practiceTextColor && practiceTextColor.checked) activePracticeModifiers.push("textColor");
        if (practicePreviousCard && practicePreviousCard.checked) activePracticeModifiers.push("previousCard");
        if (practiceRotate && practiceRotate.checked) activePracticeModifiers.push("rotate");
        if (practiceRotatePlus && practiceRotatePlus.checked) activePracticeModifiers.push("rotatePlus");
        if (practiceSwap && practiceSwap.checked) activePracticeModifiers.push("swapCards");
        if (practicePlatformer && practicePlatformer.checked) activePracticeModifiers.push("platformer");
        if (practiceGlitch && practiceGlitch.checked) activePracticeModifiers.push("glitch");
        if (practiceFog && practiceFog.checked) activePracticeModifiers.push("fog");
        if (practiceBlur && practiceBlur.checked) activePracticeModifiers.push("blur");
        if (practiceAds && practiceAds.checked) activePracticeModifiers.push("ads");
        if (typeof window.recordSandboxPlayedStat === "function") {
          window.recordSandboxPlayedStat();
        }
        if (typeof window.syncAchievementsFromLocal === "function") {
          window.syncAchievementsFromLocal({
            sandboxPlayed: true,
            usedModifiers: activePracticeModifiers
          });
        }
        startRound();
      });

      practiceModal.addEventListener("click", (event) => {
        if (event.target === practiceModal) {
          closePracticeModal();
        }
      });

      function hidePracticeError(error, resetText = "") {
        if (!error) return;
        error.classList.remove("show");
        if (error.dataset.hideTimer) {
          clearTimeout(Number(error.dataset.hideTimer));
        }
        const fadeId = window.setTimeout(() => {
          error.hidden = true;
          if (resetText) {
            error.textContent = resetText;
          }
          error.dataset.hideTimer = "";
        }, 260);
        error.dataset.hideTimer = String(fadeId);
      }

      if (practiceModal) {
        practiceModal.addEventListener("change", async (event) => {
          const target = event.target;
          if (!(target && target.matches("input[type=\"checkbox\"]"))) return;
          const error = document.getElementById("practiceTypeError");
          if (!error) return;
          const anyChecked = Array.from(
            practiceModal.querySelectorAll(".control-group .checkboxes input[type=\"checkbox\"][value]")
          ).some((input) => input.checked);
          if (anyChecked) {
            hidePracticeError(error);
          }
        });
      }

      interruptModal.addEventListener("click", (event) => {
        const closeButton = event.target.closest(".interrupt-close");
        if (!closeButton) return;
        const card = closeButton.closest(".interrupt-card");
        hideAd(card || null);
        if (pendingSkipAfterAd && !adActive) {
          pendingSkipAfterAd = false;
          beginRecallPhase();
        }
      });

      window.addEventListener("mousemove", (event) => {
        if (!fogActive) return;
        const now = performance.now();
        const x = event.clientX;
        const y = event.clientY;
        if (fogLastMove.x !== null) {
          const dx = x - fogLastMove.x;
          const dy = y - fogLastMove.y;
          const dt = Math.max(1, now - fogLastMove.t);
          const speed = Math.hypot(dx, dy) / dt;
          if (speed >= 0.25) {
            clearFogAt(x, y, speed, fogLastMove.x, fogLastMove.y);
          }
        }
        fogLastMove = { x, y, t: now };
      });

      window.addEventListener("mousemove", (event) => {
        if (!blurActive) return;
        const now = performance.now();
        const x = event.clientX;
        const y = event.clientY;
        if (blurLastMove.x !== null) {
          const dx = x - blurLastMove.x;
          const dy = y - blurLastMove.y;
          const dt = Math.max(1, now - blurLastMove.t);
          const speed = Math.hypot(dx, dy) / dt;
          if (speed >= 0.25) {
            clearBlurAt(x, y, speed, blurLastMove.x, blurLastMove.y);
          }
        }
        blurLastMove = { x, y, t: now };
      });

      window.addEventListener("resize", () => {
        if (!fogActive) return;
        resizeFog();
        drawFog();
      });

      window.addEventListener("resize", () => {
        if (!blurActive) return;
        resizeBlur();
        drawBlur();
      });

      window.addEventListener("resize", () => {
        if (document.body.dataset.view !== "stages") return;
      });

      window.addEventListener("keydown", (event) => {
        if (!isPlatformerControlActive()) return;
        const key = event.key.toLowerCase();
        if (event.key.startsWith("Arrow") || key === "a" || key === "d" || key === "w" || key === " ") {
          event.preventDefault();
        }
        if (event.key === "ArrowLeft" || key === "a") {
          platformerState.keys.left = true;
        }
        if (event.key === "ArrowRight" || key === "d") {
          platformerState.keys.right = true;
        }
        if (event.key === "ArrowUp" || event.key === " " || key === "w") {
          platformerState.keys.jump = true;
        }
      });

      window.addEventListener("keyup", (event) => {
        if (!platformerState.enabled) return;
        const key = event.key.toLowerCase();
        if (event.key === "ArrowLeft" || key === "a") {
          platformerState.keys.left = false;
        }
        if (event.key === "ArrowRight" || key === "d") {
          platformerState.keys.right = false;
        }
      });

      platformerLoop();

      document.addEventListener("keydown", (event) => {
        // Only allow arrow key input during recall phase in game view
        if (phase !== "recall") return;
        // Get the focused input field
        const activeInput = document.querySelector('input[type="text"]:focus');
        if (!activeInput) return;

        // Map arrow keys to arrow characters - clear and replace
        switch(event.key) {
          case "ArrowUp":
            event.preventDefault();
            if (activeInput) {
              const nextArrow = "\u2191";
              const current = String(activeInput.value || "").trim();
              const isSequenceInput = activeInput.dataset.sequence === "true";
              const isArrowSeq = /^[\u2191\u2193\u2190\u2192]+$/.test(current);
              if (isSequenceInput) {
                activeInput.value = current + nextArrow;
              } else if (isArrowSeq && current.length === 1) {
                activeInput.value = current + nextArrow;
              } else {
                activeInput.value = nextArrow;
              }
              activeInput.dispatchEvent(new Event("input", { bubbles: true }));
            }
            break;
          case "ArrowDown":
            event.preventDefault();
            if (activeInput) {
              const nextArrow = "\u2193";
              const current = String(activeInput.value || "").trim();
              const isSequenceInput = activeInput.dataset.sequence === "true";
              const isArrowSeq = /^[\u2191\u2193\u2190\u2192]+$/.test(current);
              if (isSequenceInput) {
                activeInput.value = current + nextArrow;
              } else if (isArrowSeq && current.length === 1) {
                activeInput.value = current + nextArrow;
              } else {
                activeInput.value = nextArrow;
              }
              activeInput.dispatchEvent(new Event("input", { bubbles: true }));
            }
            break;
          case "ArrowLeft":
            event.preventDefault();
            if (activeInput) {
              const nextArrow = "\u2190";
              const current = String(activeInput.value || "").trim();
              const isSequenceInput = activeInput.dataset.sequence === "true";
              const isArrowSeq = /^[\u2191\u2193\u2190\u2192]+$/.test(current);
              if (isSequenceInput) {
                activeInput.value = current + nextArrow;
              } else if (isArrowSeq && current.length === 1) {
                activeInput.value = current + nextArrow;
              } else {
                activeInput.value = nextArrow;
              }
              activeInput.dispatchEvent(new Event("input", { bubbles: true }));
            }
            break;
          case "ArrowRight":
            event.preventDefault();
            if (activeInput) {
              const nextArrow = "\u2192";
              const current = String(activeInput.value || "").trim();
              const isSequenceInput = activeInput.dataset.sequence === "true";
              const isArrowSeq = /^[\u2191\u2193\u2190\u2192]+$/.test(current);
              if (isSequenceInput) {
                activeInput.value = current + nextArrow;
              } else if (isArrowSeq && current.length === 1) {
                activeInput.value = current + nextArrow;
              } else {
                activeInput.value = nextArrow;
              }
              activeInput.dispatchEvent(new Event("input", { bubbles: true }));
            }
            break;
        }
      });

      // Pause UI removed.

      if (submitBtn) {
        submitBtn.addEventListener("click", () => {
          checkAnswers();
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener("click", () => {
          if (phase === "result" && gameMode === "stages") {
            if (stageState.completed) {
              resetStageProgress();
              resetGame();
              openStagesScreen(false);
              return;
            }
            if (stageState.failed) {
              stageState.failed = false;
              stageState.completed = false;
              stageState.startTime = performance.now();
              stageState.active = false;
              resetGame();
              startRound({ advanceRound: true });
              return;
            }
          }
          startRound();
        });
      }

      function handleResultActionClick(event) {
        clearResultAutoActionCountdown();
        if (autoAdvanceNextTimerId) {
          clearTimeout(autoAdvanceNextTimerId);
          autoAdvanceNextTimerId = null;
          cancelStageNextAutoAdvanceBar();
        }
        if (autoRetryTimerId) {
          clearTimeout(autoRetryTimerId);
          autoRetryTimerId = null;
        }
        if (typeof window.cancelAutoRetryFromResults === "function") {
          window.cancelAutoRetryFromResults();
        }
        const menuButton = event.target.closest("#stageMenuButton, #stageBackButton");
        if (menuButton) {
          logUiInteraction("stage_menu", {
            area: "result_actions",
            action: "click"
          });
          // Analytics: Track level quit via back button
          if (gameMode === "stages" && stageState.active && !stageState.completed) {
            const backElapsedSeconds = Number.isFinite(stageState.elapsedSeconds)
              ? stageState.elapsedSeconds
              : (performance.now() - (stageState.startTime || performance.now())) / 1000;
            const backEntries = window.__lastEntries || [];
            const activeContext = typeof window.getActiveLevelContext === "function"
              ? window.getActiveLevelContext()
              : null;
            if (typeof trackQuitReason === "function") {
              trackQuitReason("menu_quit", activeContext || {});
            }
            if (typeof window.recordLevelAttemptStats === "function") {
              window.recordLevelAttemptStats(false, { countFailure: false });
            }
            if (typeof trackLevelSession === 'function') {
              trackLevelSession(stageState.index, false, 0, backElapsedSeconds, backEntries, "menu_quit", activeContext || {});
            }
          }
          resetStageProgress();
          resetGame();
          openStagesScreen(true);
          return;
        }
        const shareButton = event.target.closest("#stageShareButton");
        if (shareButton) {
          logUiInteraction("stage_share", {
            area: "result_actions",
            action: "click"
          });
          if (typeof window.shareCurrentStageResultCard === "function") {
            Promise.resolve(window.shareCurrentStageResultCard()).catch((error) => {
              console.warn("Failed to share stage result", error);
            });
          }
          return;
        }
        const nextButton = event.target.closest("#stageNextButton");
        if (nextButton) {
          logUiInteraction("stage_next", {
            area: "result_actions",
            action: "click"
          });
          const stages = Array.isArray(window.stagesConfig) ? window.stagesConfig : [];
          const nextIndex = stageState.index + 1;
          if (!stages[nextIndex]) return;
          if (typeof window.setStageIntroOpenSource === "function") {
            window.setStageIntroOpenSource("manual_next_button");
          }
          if (typeof window.hideAutoAdvanceNextFromResults === "function") {
            window.hideAutoAdvanceNextFromResults();
          } else {
            hideStageNextAutoAdvanceBar();
          }
          if (typeof window.setStageIntroAnimationMode === "function") {
            window.setStageIntroAnimationMode("soft");
          }
          startStage(nextIndex, { skipIntro: false, originEl: null });
          return;
        }
        const practiceBack = event.target.closest("#practiceBackButton");
        if (practiceBack) {
          logUiInteraction("practice_back", {
            area: "result_actions",
            action: "click"
          });
          resetGame();
          setPhase("Waiting to start", "idle");
          document.body.dataset.view = "home";
          scheduleMenuMusicFadeIn();
          document.body.classList.remove("home-anim");
          void document.body.offsetWidth;
          document.body.classList.add("home-anim");
          return;
        }
        const practiceRetry = event.target.closest("#practiceRetryButton");
        if (practiceRetry) {
          logUiInteraction("practice_retry", {
            area: "result_actions",
            action: "click"
          });
          resetForRetryRound();
          startRound({ reuseItems: false, advanceRound: false });
          return;
        }
        const practiceSettings = event.target.closest("#practiceSettingsButton");
        if (practiceSettings) {
          logUiInteraction("practice_settings_open", {
            area: "result_actions",
            action: "open"
          });
          if (gameMode === "aminoAcids") openAminoAcidsModal();
          else openPracticeModal();
          return;
        }
        const homeButton = event.target.closest("#stageHomeButton");
        if (homeButton) {
          logUiInteraction("stage_home", {
            area: "result_actions",
            action: "click"
          });
          resetStageProgress();
          resetGame();
          setPhase("Waiting to start", "idle");
          modeSelect.value = "practice";
          updateModeUI();
          document.body.dataset.view = "home";
          scheduleMenuMusicFadeIn();
          document.body.classList.remove("home-anim");
          void document.body.offsetWidth;
          document.body.classList.add("home-anim");
          updatePracticeAvailability();
          return;
        }
        const retryButton = event.target.closest("#stageRetryButton");
        if (!retryButton) return;
        logUiInteraction("stage_retry", {
          area: "result_actions",
          action: "click"
        });
        startStage(stageState.index, { skipIntro: true });
        return;
      }

      if (resultsPanel) {
        resultsPanel.addEventListener("click", handleResultActionClick);
      }
      if (actions) {
        actions.addEventListener("click", handleResultActionClick);
      }

      modeSelect.addEventListener("change", () => {
        if (modeSelect.value !== "stages") {
          resetStageProgress();
        }
        updateModeUI();
        resetGame();
      });

      document.addEventListener("keydown", (event) => {
        if (activeRebindAction) {
          const key = normalizeKey(event.key);
          if (!key) {
            event.preventDefault();
            return;
          }
          if (key === "escape") {
            event.preventDefault();
            activeRebindAction = null;
            setKeybindStatus("Keybind update cancelled.");
            refreshKeybindButtons();
            return;
          }
          if (!isBindableKey(key)) {
            event.preventDefault();
            setKeybindStatus("Use letters, numbers, arrows, Enter, or Space.");
            return;
          }
          const conflict = Object.keys(keybinds).find(
            (action) => action !== activeRebindAction && normalizeKey(keybinds[action]) === key
          );
          const isRetryNextPair =
            (activeRebindAction === "retry" && conflict === "stageNext") ||
            (activeRebindAction === "stageNext" && conflict === "retry");
          if (conflict && !isRetryNextPair) {
            event.preventDefault();
            setKeybindStatus(`"${getKeyLabel(key)}" is already used. Choose another key.`);
            return;
          }
          keybinds[activeRebindAction] = key;
          const changedAction = activeRebindAction;
          event.preventDefault();
          activeRebindAction = null;
          saveKeybinds();
          refreshKeybindButtons();
          refreshActionKeyHints();
          logSettingChange(`keybind_${changedAction}`, key, {
            setting_category: "keybind"
          });
          logSettingsSnapshot("keybind_change", {
            setting_name: `keybind_${changedAction}`
          });
          setKeybindStatus("Keybind saved.");
          return;
        }
        if (playerNamePromptDelayActive && phase === "result" && gameMode === "stages") {
          event.preventDefault();
          return;
        }
        if (playerNameModal && playerNameModal.classList.contains("show")) {
          if (event.key === "Escape") {
            event.preventDefault();
            markPlayerNamePrompted();
            closePlayerNameModal();
            return;
          }
          if (event.key === "Enter") {
            event.preventDefault();
            if (playerNameSave && !playerNameSave.disabled) {
              playerNameSave.click();
            } else if (playerNameSkip) {
              playerNameSkip.click();
            } else {
              markPlayerNamePrompted();
              closePlayerNameModal();
            }
            return;
          }
          return;
        }
        if (tabTutorialActive) {
          if (event.key === "Tab") {
            tabTutorialActive = false;
            if (tabTutorialDisabledInputs.length) {
              tabTutorialDisabledInputs.forEach((field) => {
                field.disabled = false;
              });
              tabTutorialDisabledInputs = [];
            }
            return;
          }
        }
        if (!isTextEntryTarget(event.target) && keybindMatches(event, "fullscreen")) {
          event.preventDefault();
          toggleFullscreen();
          return;
        }
        if (creditsModal && creditsModal.classList.contains("show")) {
          if (event.key === "Escape") {
            event.preventDefault();
            setModalState(creditsModal, false);
          }
          return;
        }
        if (referenceModal && referenceModal.classList.contains("show")) {
          if (event.key === "Escape") {
            event.preventDefault();
            setModalState(referenceModal, false);
          }
          return;
        }
        if (flashStageModal && flashStageModal.classList.contains("show")) {
          if (event.key === "Escape") {
            event.preventDefault();
            closeFlashStagePrompt();
            return;
          }
          if (event.key === "Enter") {
            event.preventDefault();
            if (flashStageStart) {
              flashStageStart.click();
            }
            return;
          }
          return;
        }
        if (stageIntroModal && stageIntroModal.classList.contains("show")) {
          if (event.key === "Escape") {
            event.preventDefault();
            closeStageIntro();
            return;
          }
          if (event.key === "Enter") {
            event.preventDefault();
            clearTabKeyHint();
            if (stageIntroStart) {
              stageIntroStart.click();
            }
            return;
          }
          return;
        }
        if (leaderboardModal && leaderboardModal.classList.contains("show")) {
          if (event.key === "Escape") {
            event.preventDefault();
            setModalState(leaderboardModal, false);
          }
          if (event.key === "Enter") {
            event.preventDefault();
          }
          return;
        }
        if (document.body.dataset.view === "stages") {
          if (event.key === "Escape") {
            event.preventDefault();
            closeStagesScreen();
          }
          return;
        }
        if (aminoAcidsModal.classList.contains("show") && aminoAcidsModal.dataset.closing !== "true") {
          if (event.key === "Escape") {
            event.preventDefault();
            closeAminoAcidsModal();
          } else if (event.key === "Enter" && !event.target.closest("button")) {
            event.preventDefault();
            aminoAcidsForm.requestSubmit();
          } else if (event.key === "Tab") {
            const fields = Array.from(aminoAcidsForm.querySelectorAll("input, select, button"));
            const first = fields[0], last = fields[fields.length - 1];
            if (event.shiftKey && event.target === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && event.target === last) { event.preventDefault(); first.focus(); }
          }
          return;
        }
        if (practiceModal.classList.contains("show")) {
          if (event.key === "Enter") {
            event.preventDefault();
            practiceConfirm.click();
          } else if (event.key === "Escape") {
            event.preventDefault();
            closePracticeModal();
          }
          return;
        }
        if (event.key === "Escape") {
          if (gameMode === "stages" && (stageState.active || phase === "result")) {
            event.preventDefault();
            if (stageState.active && !stageState.completed) {
              const backElapsedSeconds = Number.isFinite(stageState.elapsedSeconds)
                ? stageState.elapsedSeconds
                : (performance.now() - (stageState.startTime || performance.now())) / 1000;
              const backEntries = window.__lastEntries || [];
              const activeContext = typeof window.getActiveLevelContext === "function"
                ? window.getActiveLevelContext()
                : null;
              if (typeof trackQuitReason === "function") {
                trackQuitReason("menu_quit", activeContext || {});
              }
              if (typeof window.recordLevelAttemptStats === "function") {
                window.recordLevelAttemptStats(false, { countFailure: false });
              }
              if (typeof trackLevelSession === 'function') {
                trackLevelSession(stageState.index, false, 0, backElapsedSeconds, backEntries, "menu_quit", activeContext || {});
              }
            }
            resetStageProgress();
            resetGame();
            openStagesScreen(false);
          }
          return;
        }
        if (phase === "result" && gameMode === "stages") {
          if (keybindMatches(event, "stageQuit")) {
            event.preventDefault();
            const menuBtn =
              document.getElementById("stageMenuButton") || document.getElementById("stageBackButton");
            if (menuBtn) menuBtn.click();
            return;
          }
          if (keybindMatches(event, "stageNext")) {
            const nextBtn = document.getElementById("stageNextButton");
            if (nextBtn) {
              event.preventDefault();
              nextBtn.click();
              return;
            }
          }
          if (keybindMatches(event, "retry")) {
            event.preventDefault();
            const retryBtn = document.getElementById("stageRetryButton");
            if (retryBtn) retryBtn.click();
            return;
          }
          if (isConfirmKey(event) && stageState && stageState.failed) {
            event.preventDefault();
            const retryBtn = document.getElementById("stageRetryButton");
            if (retryBtn) retryBtn.click();
            return;
          }

        }
        if (phase === "result" && isFreePlayMode()) {
          if (keybindMatches(event, "practiceHome")) {
            event.preventDefault();
            const backBtn = document.getElementById("practiceBackButton");
            if (backBtn) backBtn.click();
            return;
          }
          if (keybindMatches(event, "retry")) {
            event.preventDefault();
            const retryBtn = document.getElementById("practiceRetryButton");
            if (retryBtn) retryBtn.click();
            return;
          }
          if (isConfirmKey(event) && document.body.classList.contains("stage-fail")) {
            event.preventDefault();
            const retryBtn = document.getElementById("practiceRetryButton");
            if (retryBtn) retryBtn.click();
            return;
          }

          if (keybindMatches(event, "practiceSettings")) {
            event.preventDefault();
            const settingsBtn = document.getElementById("practiceSettingsButton");
            if (settingsBtn) settingsBtn.click();
            return;
          }
        }
        if (successAnimationActive) {
          event.preventDefault();
          return;
        }
        if (event.key === "Enter" && phase === "recall" && performance.now() < recallSubmitLockUntil) {
          event.preventDefault();
          return;
        }
        if (event.key !== "Enter") return;
        if (phase === "recall" && (swapTimeoutId || swapStartRecall)) {
          event.preventDefault();
          return;
        }
        if (phase === "show") {
          event.preventDefault();
          skipRevealNow();
        } else if (phase === "recall") {
          const inputs = Array.from(inputGrid.querySelectorAll('input[data-index]'));
          const activeIndex = inputs.indexOf(document.activeElement);
          const hasAminoAcidAnswers = roundItems.some(item =>
            (item.answerCategory || item.category) === "aminoAcids" && !item.sequenceSteps?.length &&
            item.recallHint !== "Background color" && item.recallHint !== "Text color");
          const hasCountryAnswers = window.MemoryChallenges?.hasEnabled('countries');
          if (enterToNextEnabled && !hasAminoAcidAnswers && !hasCountryAnswers && activeIndex !== -1 && activeIndex < inputs.length - 1) {
            event.preventDefault();
            inputs[activeIndex + 1].focus();
            return;
          }
          checkAnswers();
        }
      });

      function showTabKeyHint() {
        const hud = document.getElementById("hudCluster");
        if (!hud) return;
        const rect = hud.getBoundingClientRect();
        let left = rect.left + rect.width / 2;
        let top = rect.bottom + 170;
        if (!Number.isFinite(left) || rect.width === 0) {
          left = window.innerWidth / 2;
          top = 120;
        }
        if (!tabTutorialHintEl) {
          tabTutorialHintEl = document.createElement("div");
          tabTutorialHintEl.className = "tab-key-hint";
          tabTutorialHintEl.innerHTML = `<span class="tab-keycap">TAB</span>`;
          document.body.appendChild(tabTutorialHintEl);
        }
        tabTutorialHintEl.style.left = `${left}px`;
        tabTutorialHintEl.style.top = `${top}px`;
        tabTutorialHintEl.style.animation = "none";
        void tabTutorialHintEl.offsetWidth;
        tabTutorialHintEl.style.animation = "";
        if (tabTutorialHintTimeout) {
          clearTimeout(tabTutorialHintTimeout);
        }
        tabTutorialHintTimeout = window.setTimeout(() => {
          if (tabTutorialHintEl) {
            tabTutorialHintEl.remove();
            tabTutorialHintEl = null;
          }
          tabTutorialHintTimeout = null;
        }, 1200);
      }

      function showFirstLetterHint(message) {
        const hud = document.getElementById("hudCluster");
        const rect = hud ? hud.getBoundingClientRect() : null;
        let left = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
        let top = rect ? rect.bottom + 170 : 140;
        if (!Number.isFinite(left)) left = window.innerWidth / 2;
        if (!Number.isFinite(top)) top = 140;
        if (!firstLetterHintEl) {
          firstLetterHintEl = document.createElement("div");
          firstLetterHintEl.className = "first-letter-hint";
          firstLetterHintEl.innerHTML = `<span class="first-letter-pill"></span>`;
          document.body.appendChild(firstLetterHintEl);
        }
        const pill = firstLetterHintEl.querySelector(".first-letter-pill");
        if (pill) {
          pill.textContent = message;
          pill.style.whiteSpace = "pre-line";
          pill.style.textAlign = "center";
        }
        firstLetterHintEl.style.left = `${left}px`;
        firstLetterHintEl.style.top = `${top}px`;
        firstLetterHintEl.style.animation = "none";
        void firstLetterHintEl.offsetWidth;
        firstLetterHintEl.style.animation = "";
        if (firstLetterHintTimeout) {
          clearTimeout(firstLetterHintTimeout);
        }
        firstLetterHintTimeout = window.setTimeout(() => {
          if (firstLetterHintEl) {
            firstLetterHintEl.remove();
            firstLetterHintEl = null;
          }
          firstLetterHintTimeout = null;
        }, 2600);
      }

      function clearFirstLetterHint() {
        if (firstLetterHintTimeout) {
          clearTimeout(firstLetterHintTimeout);
          firstLetterHintTimeout = null;
        }
        if (firstLetterHintEl) {
          firstLetterHintEl.remove();
          firstLetterHintEl = null;
        }
      }
      window.clearFirstLetterHint = clearFirstLetterHint;

      document.addEventListener("pointerdown", (event) => {
        if (!tabTutorialActive) return;
        const targetInput = event.target && event.target.closest
          ? event.target.closest("input[data-index]")
          : null;
        if (!targetInput) return;
        const idx = Number(targetInput.dataset.index);
        if (Number.isFinite(idx) && idx > 0) {
          showTabKeyHint();
          tabTutorialActive = false;
        }
      }, { capture: true });

      loadKeybinds();
      refreshKeybindButtons();
      refreshActionKeyHints();
      if (keybindResetDefaults) {
        keybindResetDefaults.addEventListener("click", () => {
          keybinds = { ...defaultKeybinds };
          activeRebindAction = null;
          saveKeybinds();
          refreshKeybindButtons();
          refreshActionKeyHints();
          logUiInteraction("keybind_reset_defaults", {
            area: "settings_modal",
            action: "click"
          });
          logSettingsSnapshot("keybind_reset_defaults");
          setKeybindStatus("Keybinds reset.");
        });
      }
      Object.entries(keybindButtons).forEach(([action, button]) => {
        if (!button) return;
        button.addEventListener("click", () => {
          activeRebindAction = activeRebindAction === action ? null : action;
          setKeybindStatus(
            activeRebindAction
              ? `Press a key for ${button.parentElement ? button.parentElement.firstElementChild.textContent.toLowerCase() : "selected action"}.`
              : ""
          );
          refreshKeybindButtons();
        });
      });

      {
        const storedAppearance = getStoredAppearance();
        applyAppearance(
          storedAppearance.theme,
          storedAppearance.layout,
          storedAppearance.colorVision
        );
      }
        {
          migrateAudioDefaultsIfNeeded();
          const storedAudio = getStoredAudioSettings();
          audioMuted = getStoredAudioMuteState();
          audioMasterBeforeMute = getStoredAudioMasterBeforeMute();
          if (audioMuted) {
            applyAudioSettings({ ...storedAudio, master: 0 }, false);
          } else {
            applyAudioSettings(storedAudio, false);
          }
        }

      if (audioMasterVolume && audioMusicVolume && audioEffectsVolume) {
        const syncAudioSettings = () => {
          applyAudioSettings(
            {
              master: audioMasterVolume.value,
              music: audioMusicVolume.value,
              effects: audioEffectsVolume.value
            },
            true
          );
        };
        audioMasterVolume.addEventListener("input", syncAudioSettings);
        audioMusicVolume.addEventListener("input", syncAudioSettings);
        audioEffectsVolume.addEventListener("input", syncAudioSettings);
      }
      if (audioResetDefaults) {
        audioResetDefaults.addEventListener("click", () => {
          applyAudioSettings(defaultAudioSettings, true);
          logSettingChange("audio_defaults_reset", true, {
            setting_category: "audio"
          });
          logSettingsSnapshot("setting_change", {
            setting_name: "audio_defaults_reset"
          });
        });
      }
      if (audioTestSfx) {
        audioTestSfx.addEventListener("click", () => {
          if (typeof window.playCorrectSound === "function") {
            window.playCorrectSound();
          }
        });
      }

      if (audioToggle) {
        updateAudioToggleUI();
        audioToggle.addEventListener("click", () => {
          setAudioMuted(!audioMuted);
        });
      }

      updateModeUI();
      updatePracticeAvailability();
      resetGame();
      updateCategoryControls();

      if (successAnimationToggle) {
        const storageKey = "flashRecallSuccessAnimation";
        const saved = window.localStorage.getItem(storageKey);
        if (saved !== null) {
          successAnimationToggle.checked = saved === "1";
        } else {
          successAnimationToggle.checked = Boolean(defaultControlSettings.successAnimation);
        }
        setSuccessAnimationEnabled(successAnimationToggle.checked);
        successAnimationToggle.addEventListener("change", () => {
          window.localStorage.setItem(storageKey, successAnimationToggle.checked ? "1" : "0");
          setSuccessAnimationEnabled(successAnimationToggle.checked);
          logSettingChange("success_animation_enabled", successAnimationToggle.checked, {
            setting_category: "controls"
          });
          logSettingsSnapshot("setting_change", {
            setting_name: "success_animation_enabled"
          });
        });
      }
      if (enterToNextToggle) {
        const storageKey = "flashRecallEnterToNext";
        const saved = window.localStorage.getItem(storageKey);
        if (saved !== null) {
          enterToNextToggle.checked = saved === "1";
        } else {
          enterToNextToggle.checked = Boolean(defaultControlSettings.enterToNext);
        }
        enterToNextEnabled = enterToNextToggle.checked;
        enterToNextToggle.addEventListener("change", () => {
          enterToNextEnabled = enterToNextToggle.checked;
          window.localStorage.setItem(storageKey, enterToNextEnabled ? "1" : "0");
          logSettingChange("enter_to_next_enabled", enterToNextEnabled, {
            setting_category: "controls"
          });
          logSettingsSnapshot("setting_change", {
            setting_name: "enter_to_next_enabled"
          });
        });
      } else {
        enterToNextEnabled = Boolean(defaultControlSettings.enterToNext);
      }

      if (flashCountdownToggle) {
        const storageKey = "flashRecallFlashCountdown";
        const saved = window.localStorage.getItem(storageKey);
        if (saved !== null) {
          flashCountdownToggle.checked = saved === "1";
        } else {
          flashCountdownToggle.checked = Boolean(defaultControlSettings.flashCountdown);
        }
        flashCountdownEnabled = flashCountdownToggle.checked;
        flashCountdownToggle.addEventListener("change", () => {
          flashCountdownEnabled = flashCountdownToggle.checked;
          window.localStorage.setItem(storageKey, flashCountdownToggle.checked ? "1" : "0");
          logSettingChange("flash_countdown_enabled", flashCountdownEnabled, {
            setting_category: "controls"
          });
          logSettingsSnapshot("setting_change", {
            setting_name: "flash_countdown_enabled"
          });
        });
      }
      if (autoAdvanceNextToggle) {
        const storageKey = "flashRecallAutoAdvanceNext";
        const saved = window.localStorage.getItem(storageKey);
        if (saved !== null) {
          autoAdvanceNextToggle.checked = saved === "1";
        } else {
          autoAdvanceNextToggle.checked = Boolean(defaultControlSettings.autoAdvanceNext);
        }
        autoAdvanceNextEnabled = autoAdvanceNextToggle.checked;
        autoAdvanceNextToggle.addEventListener("change", () => {
          autoAdvanceNextEnabled = autoAdvanceNextToggle.checked;
          window.localStorage.setItem(storageKey, autoAdvanceNextToggle.checked ? "1" : "0");
          logSettingChange("auto_advance_next_enabled", autoAdvanceNextEnabled, {
            setting_category: "controls"
          });
          logSettingsSnapshot("setting_change", {
            setting_name: "auto_advance_next_enabled"
          });
          if (!autoAdvanceNextEnabled) {
            if (typeof window.clearDeferredAutoAdvanceNext === "function") {
              window.clearDeferredAutoAdvanceNext();
            }
            if (autoAdvanceNextTimerId) {
              logAutoplayEvent("result_auto_advance_cancelled", {
                autoplay_mode: "manual",
                cancel_source: "settings_toggle",
                level_number: Number.isFinite(stageState && stageState.index) ? stageState.index + 2 : null
              }, { immediate: true });
              clearTimeout(autoAdvanceNextTimerId);
              autoAdvanceNextTimerId = null;
              cancelStageNextAutoAdvanceBar();
            }
          }
        });
      } else {
        autoAdvanceNextEnabled = Boolean(defaultControlSettings.autoAdvanceNext);
      }
      if (autoRetryToggle) {
        const storageKey = "flashRecallAutoRetry";
        const saved = window.localStorage.getItem(storageKey);
        if (saved !== null) {
          autoRetryToggle.checked = saved === "1";
        } else {
          autoRetryToggle.checked = Boolean(defaultControlSettings.autoRetry);
        }
        autoRetryEnabled = autoRetryToggle.checked;
        autoRetryToggle.addEventListener("change", () => {
          autoRetryEnabled = autoRetryToggle.checked;
          window.localStorage.setItem(storageKey, autoRetryEnabled ? "1" : "0");
          logSettingChange("auto_retry_enabled", autoRetryEnabled, {
            setting_category: "controls"
          });
          logSettingsSnapshot("setting_change", {
            setting_name: "auto_retry_enabled"
          });
          if (!autoRetryEnabled && autoRetryTimerId) {
            logAutoplayEvent("result_auto_retry_cancelled", {
              autoplay_mode: "manual",
              cancel_source: "settings_toggle",
              level_number: Number.isFinite(stageState && stageState.index) ? stageState.index + 1 : null
            }, { immediate: true });
            clearTimeout(autoRetryTimerId);
            autoRetryTimerId = null;
            cancelStageRetryAutoAdvanceBar();
          }
        });
      } else {
        autoRetryEnabled = Boolean(defaultControlSettings.autoRetry);
      }
      if (autoStartStagePreviewToggle) {
        const storageKey = "flashRecallAutoStartStagePreview";
        const saved = window.localStorage.getItem(storageKey);
        if (saved !== null) {
          autoStartStagePreviewToggle.checked = saved === "1";
        } else {
          autoStartStagePreviewToggle.checked = Boolean(defaultControlSettings.autoStartStagePreview);
        }
        stageIntroAutoStartEnabled = autoStartStagePreviewToggle.checked;
        autoStartStagePreviewToggle.addEventListener("change", () => {
          stageIntroAutoStartEnabled = autoStartStagePreviewToggle.checked;
          window.localStorage.setItem(storageKey, autoStartStagePreviewToggle.checked ? "1" : "0");
          logSettingChange("auto_start_stage_preview_enabled", stageIntroAutoStartEnabled, {
            setting_category: "controls"
          });
          logSettingsSnapshot("setting_change", {
            setting_name: "auto_start_stage_preview_enabled"
          });
          if (!stageIntroAutoStartEnabled) {
            cancelStageIntroAutoStartBar("settings_toggle");
            clearStageIntroAutoStart();
          }
        });
      } else {
        stageIntroAutoStartEnabled = Boolean(defaultControlSettings.autoStartStagePreview);
      }

      leaderboardsEnabled = true;

      if (appearanceColorVision) {
        appearanceColorVision.addEventListener("change", () => {
          const previous = document.body.dataset.colorVision || "standard";
          applyAppearance("classic", "classic", appearanceColorVision.value);
          window.localStorage.setItem(APPEARANCE_COLOR_VISION_KEY, document.body.dataset.colorVision);
          logSettingChange("color_vision_mode", document.body.dataset.colorVision, {
            setting_category: "appearance",
            previous_value: previous
          });
          logSettingsSnapshot("appearance_change");
        });
      }

      logSettingsSnapshot("initial_load", {}, { immediate: true });
      window.requestAnimationFrame(() => {
        showContentResetNoticeIfNeeded();
      });

      // Track session end on page unload
      window.addEventListener("beforeunload", () => {
        const activeContext = typeof window.getActiveLevelContext === "function"
          ? window.getActiveLevelContext()
          : null;
        if (activeContext && typeof trackQuitReason === "function") {
          trackQuitReason("close_tab_mid_level", activeContext);
        }
        const totalSessionSeconds = (performance.now() - sessionStartTime) / 1000;
        if (typeof trackSessionEnd === 'function') {
          trackSessionEnd(totalSessionSeconds, lastCompletedLevel, "beforeunload");
        }
      });
      function clearTabKeyHint() {
        if (tabTutorialHintTimeout) {
          clearTimeout(tabTutorialHintTimeout);
          tabTutorialHintTimeout = null;
        }
        if (tabTutorialHintEl) {
          tabTutorialHintEl.remove();
          tabTutorialHintEl = null;
        }
      }
      window.clearTabKeyHint = clearTabKeyHint;
