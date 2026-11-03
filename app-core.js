const revealInput = document.getElementById("revealTime");
      const recallInput = document.getElementById("recallTime");
      const practiceStart = document.getElementById("practiceStart");
      const aminoAcidsStart = document.getElementById("aminoAcidsStart");
      const aminoAcidsModal = document.getElementById("aminoAcidsModal");
      const aminoAcidsForm = document.getElementById("aminoAcidsForm");
      const aminoAcidsCancel = document.getElementById("aminoAcidsCancel");
      const aminoRevealInput = document.getElementById("aminoRevealTime");
      const aminoRecallInput = document.getElementById("aminoRecallTime");
      const aminoCardCountInput = document.getElementById("aminoCardCount");
      const aminoAnswerFormatInputs = Array.from(document.querySelectorAll("#aminoAnswerFormats input"));
      const aminoAnswerFormatError = document.getElementById("aminoAnswerFormatError");
      function getSelectedAminoAnswerFormats() {
        return aminoAnswerFormatInputs.filter(input => input.checked).map(input => input.value);
      }
      const splashScreen = document.getElementById("splashScreen");
      const splashAutoStartMessage = document.getElementById("splashAutoStartMessage");
      const splashLoading = document.getElementById("splashLoading");
      const mainHeader = document.querySelector("header");
      const mainMenuTitle = document.getElementById("mainMenuTitle");
      const referenceOpen = document.getElementById("referenceOpen");
      const fullscreenToggle = document.getElementById("fullscreenToggle");
      const stagesOpen = document.getElementById("stagesOpen");
      const stagesScreen = document.getElementById("stagesScreen");
      const stagesBack = document.getElementById("stagesBack");
      const stagesPrev = document.getElementById("stagesPrev");
      const stagesNext = document.getElementById("stagesNext");
      const stagesFooter = document.getElementById("stagesFooter");
      const stageList = document.getElementById("stageList");
      const stageInstructions = document.getElementById("stageInstructions");
      const stageInstructionPanel = document.getElementById("stageInstructionPanel");
      const hudCluster = document.getElementById("hudCluster");
      const submitBtn = document.getElementById("submitBtn");
      const nextBtn = document.getElementById("nextBtn");
      const practiceModal = document.getElementById("practiceModal");
      const practiceCancel = document.getElementById("practiceCancel");
      const practiceConfirm = document.getElementById("practiceConfirm");
      const practiceDeselectAll = document.getElementById("practiceDeselectAll");
      const practiceSelectAll = document.getElementById("practiceSelectAll");
      const cardCountInput = document.getElementById("cardCount");
      const practicePlatformer = document.getElementById("practicePlatformer");
      const practiceGlitch = document.getElementById("practiceGlitch");
      const practiceRotate = document.getElementById("practiceRotate");
      const practiceRotatePlus = document.getElementById("practiceRotatePlus");
      const practiceSequence = document.getElementById("practiceSequence");
      const practiceFog = document.getElementById("practiceFog");
      const practiceBlur = document.getElementById("practiceBlur");
      const practiceAds = document.getElementById("practiceAds");
      const practiceSwap = document.getElementById("practiceSwap");
      const practiceMathChance = document.getElementById("practiceMathChance");
      const practiceMisleadChance = document.getElementById("practiceMisleadChance");
      const practiceBackgroundChance = document.getElementById("practiceBackgroundChance");
      const practiceSwapChance = document.getElementById("practiceSwapChance");
      const pauseModal = document.getElementById("pauseModal");
      const pauseResume = document.getElementById("pauseResume");
      const pauseRestart = document.getElementById("pauseRestart");
      const pauseQuit = document.getElementById("pauseQuit");
      const pauseButton = document.getElementById("pauseButton");
      const interruptModal = document.getElementById("interruptModal");
      const interruptClose = document.getElementById("interruptClose");
      const interruptCard = interruptModal
        ? interruptModal.querySelector(".interrupt-card")
        : null;
      const practiceMathOps = document.getElementById("practiceMathOps");
      const practiceMathOpsPlus = document.getElementById("practiceMathOpsPlus");
      const practiceMisleadColors = document.getElementById("practiceMisleadColors");
      const practiceBackgroundColor = document.getElementById("practiceBackgroundColor");
      const practiceTextColor = document.getElementById("practiceTextColor");
      const practicePreviousCard = document.getElementById("practicePreviousCard");
      const settingsOpen = document.getElementById("settingsOpen");
      const creditsOpen = document.getElementById("creditsOpen");
      const statsOpen = document.getElementById("statsOpen");
      const achievementsOpen = document.getElementById("achievementsOpen");
      const settingsModal = document.getElementById("settingsModal");
      const settingsClose = document.getElementById("settingsClose");
      const creditsModal = document.getElementById("creditsModal");
      const creditsClose = document.getElementById("creditsClose");
      const creditsList = document.getElementById("creditsList");
      const creditsEmpty = document.getElementById("creditsEmpty");
      const statsModal = document.getElementById("statsModal");
      const statsClose = document.getElementById("statsClose");
      const achievementsModal = document.getElementById("achievementsModal");
      const achievementsClose = document.getElementById("achievementsClose");
      const achievementsList = document.getElementById("achievementsList");
      const achievementsEmpty = document.getElementById("achievementsEmpty");
      const achievementsSummary = document.getElementById("achievementsSummary");
      const achievementInfoModal = document.getElementById("achievementInfoModal");
      const achievementInfoCard = document.getElementById("achievementInfoCard");
      const achievementInfoIcon = document.getElementById("achievementInfoIcon");
      const achievementInfoTitle = document.getElementById("achievementInfoTitle");
      const achievementInfoDescription = document.getElementById("achievementInfoDescription");
      const achievementInfoMeta = document.getElementById("achievementInfoMeta");
      const achievementInfoClose = document.getElementById("achievementInfoClose");
      const achievementToastStack = document.getElementById("achievementToastStack");
      const statsLeaderboardOpen = document.getElementById("statsLeaderboardOpen");
      const statsLeaderboardModal = document.getElementById("statsLeaderboardModal");
      const statsLeaderboardTitle = document.getElementById("statsLeaderboardTitle");
      const statsLeaderboardTabStars = document.getElementById("statsLeaderboardTabStars");
      const statsLeaderboardTabStages = document.getElementById("statsLeaderboardTabStages");
      const statsLeaderboardTabAchievements = document.getElementById("statsLeaderboardTabAchievements");
      const statsLeaderboardClose = document.getElementById("statsLeaderboardClose");
      const playerNameModal = document.getElementById("playerNameModal");
      const playerNameInput = document.getElementById("playerNameInput");
      const playerNameSave = document.getElementById("playerNameSave");
      const playerNameSkip = document.getElementById("playerNameSkip");
      const playerNameRandomize = document.getElementById("playerNameRandomize");
      const playerNameSetting = document.getElementById("playerNameSetting");
      const playerNameRandomizeSetting = document.getElementById("playerNameRandomizeSetting");
      const photosensitivityWarningToggle = document.getElementById("photosensitivityWarningToggle");
      const appearanceColorVision = document.getElementById("appearanceColorVision");
      const appearanceLayout = document.getElementById("appearanceLayout");
      const audioMasterVolume = document.getElementById("audioMasterVolume");
      const audioMusicVolume = document.getElementById("audioMusicVolume");
      const audioEffectsVolume = document.getElementById("audioEffectsVolume");
      const audioMasterValue = document.getElementById("audioMasterValue");
      const audioMusicValue = document.getElementById("audioMusicValue");
      const audioEffectsValue = document.getElementById("audioEffectsValue");
      const audioTestSfx = document.getElementById("audioTestSfx");
      const audioResetDefaults = document.getElementById("audioResetDefaults");
      const keybindStatus = document.getElementById("keybindStatus");
      const keybindRetry = document.getElementById("keybindRetry");
      const keybindStageNext = document.getElementById("keybindStageNext");
      const keybindStageQuit = document.getElementById("keybindStageQuit");
      const keybindPracticeHome = document.getElementById("keybindPracticeHome");
      const keybindPracticeSettings = document.getElementById("keybindPracticeSettings");
      const keybindFullscreen = document.getElementById("keybindFullscreen");
      const keybindResetDefaults = document.getElementById("keybindResetDefaults");
      const flashCountdownToggle = document.getElementById("flashCountdownToggle");
      const enterToNextToggle = document.getElementById("enterToNextToggle");
      const autoRetryToggle = document.getElementById("autoRetryToggle");
      const referenceModal = document.getElementById("referenceModal");
      const referenceClose = document.getElementById("referenceClose");

      const colorVisionProfiles = {
        standard: {
          palette: {
            red: { label: "Red", color: "#ef4444", pattern: "solid" },
            blue: { label: "Blue", color: "#3b82f6", pattern: "solid" },
            yellow: { label: "Yellow", color: "#facc15", pattern: "solid" },
            green: { label: "Green", color: "#22c55e", pattern: "solid" },
            white: { label: "White", color: "#f8fafc", pattern: "solid" },
            orange: { label: "Orange", color: "#f97316", pattern: "solid" },
            pink: { label: "Pink", color: "#ec4899", pattern: "solid" },
            brown: { label: "Brown", color: "#8b5e34", pattern: "solid" },
            purple: { label: "Purple", color: "#8b5cf6", pattern: "solid" }
          }
        },
        protanopia: {
          palette: {
            red: { label: "Red", color: "#b24592", pattern: "diagonal" },
            blue: { label: "Blue", color: "#2563eb", pattern: "dots" },
            yellow: { label: "Yellow", color: "#f5d547", pattern: "horizontal" },
            green: { label: "Green", color: "#14866d", pattern: "vertical" },
            white: { label: "White", color: "#f8fafc", pattern: "solid" },
            orange: { label: "Orange", color: "#c47a1b", pattern: "crosshatch" },
            pink: { label: "Pink", color: "#e07bb2", pattern: "rings" },
            brown: { label: "Brown", color: "#6b4f2d", pattern: "grid" },
            purple: { label: "Purple", color: "#6d5bd0", pattern: "waves" }
          }
        },
        deuteranopia: {
          palette: {
            red: { label: "Red", color: "#c05a8a", pattern: "diagonal" },
            blue: { label: "Blue", color: "#2f6fde", pattern: "dots" },
            yellow: { label: "Yellow", color: "#f0d247", pattern: "horizontal" },
            green: { label: "Green", color: "#1c8d7b", pattern: "vertical" },
            white: { label: "White", color: "#f8fafc", pattern: "solid" },
            orange: { label: "Orange", color: "#c7831e", pattern: "crosshatch" },
            pink: { label: "Pink", color: "#e38ec2", pattern: "rings" },
            brown: { label: "Brown", color: "#6b5136", pattern: "grid" },
            purple: { label: "Purple", color: "#7358d7", pattern: "waves" }
          }
        },
        tritanopia: {
          palette: {
            red: { label: "Red", color: "#d44c4c", pattern: "diagonal" },
            blue: { label: "Blue", color: "#3a86a8", pattern: "dots" },
            yellow: { label: "Yellow", color: "#e6b800", pattern: "horizontal" },
            green: { label: "Green", color: "#3ba55d", pattern: "vertical" },
            white: { label: "White", color: "#f8fafc", pattern: "solid" },
            orange: { label: "Orange", color: "#f08b24", pattern: "crosshatch" },
            pink: { label: "Pink", color: "#d46aa5", pattern: "rings" },
            brown: { label: "Brown", color: "#7b5838", pattern: "grid" },
            purple: { label: "Purple", color: "#7a4cc2", pattern: "waves" }
          }
        },
        monochromacy: {
          palette: {
            red: { label: "Red", color: "#1f2937", pattern: "diagonal" },
            blue: { label: "Blue", color: "#334155", pattern: "dots" },
            yellow: { label: "Yellow", color: "#475569", pattern: "horizontal" },
            green: { label: "Green", color: "#64748b", pattern: "vertical" },
            white: { label: "White", color: "#f8fafc", pattern: "solid" },
            orange: { label: "Orange", color: "#94a3b8", pattern: "crosshatch" },
            pink: { label: "Pink", color: "#cbd5e1", pattern: "rings" },
            brown: { label: "Brown", color: "#52525b", pattern: "grid" },
            purple: { label: "Purple", color: "#0f172a", pattern: "waves" }
          }
        }
      };
      const RARE_CAT_CARD_CHANCE = 1 / 5000;
      const RARE_EVENT_GRACE_PERIOD_MS = 60 * 1000;
      const RARE_CAT_CARD_IMAGES = [
        "imgs/cats/Aidan_cat.jpg",
        "imgs/cats/Aidan_cat2.jpg",
        "imgs/cats/Karl_Cat.jpg",
        "imgs/cats/Lin_Cat.jpg"
      ];

      function normalizeColorVisionLabel(label) {
        return String(label || "").trim().toLowerCase();
      }

      function getColorVisionMode() {
        const requestedMode = document.body.dataset.colorVision || "standard";
        return Object.prototype.hasOwnProperty.call(colorVisionProfiles, requestedMode)
          ? requestedMode
          : "standard";
      }

      function getAccessibleColorEntry(label, fallbackColor) {
        const key = normalizeColorVisionLabel(label);
        const profile = colorVisionProfiles[getColorVisionMode()] || colorVisionProfiles.standard;
        const entry = profile.palette[key] || colorVisionProfiles.standard.palette[key];
        if (entry) {
          return {
            label: entry.label,
            color: entry.color,
            pattern: entry.pattern || "solid"
          };
        }
        return {
          label: label || "",
          color: fallbackColor || "#94a3b8",
          pattern: "solid"
        };
      }

      function getReadableCardInk(hexColor) {
        const value = String(hexColor || "").trim();
        const match = value.match(/^#?([0-9a-f]{6})$/i);
        if (!match) return "#0f172a";
        const hex = match[1];
        const red = parseInt(hex.slice(0, 2), 16);
        const green = parseInt(hex.slice(2, 4), 16);
        const blue = parseInt(hex.slice(4, 6), 16);
        const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
        return luminance > 0.58 ? "#0f172a" : "#f8fafc";
      }

      function getCardBackgroundHex() {
        if (typeof window.getComputedStyle !== "function" || !document.body) return "";
        return String(window.getComputedStyle(document.body).getPropertyValue("--card") || "").trim();
      }

      function applyCardColorVisionAssist(card, fillCue, textCue) {
        const existingCueStack = card.querySelector(".card-color-cues");
        if (existingCueStack) {
          existingCueStack.remove();
        }
        delete card.dataset.fillPattern;
        card.classList.remove("card--color-vision");
        if (getColorVisionMode() === "standard" || (!fillCue && !textCue)) {
          return;
        }
        card.classList.add("card--color-vision");
        if (fillCue && fillCue.pattern && fillCue.pattern !== "solid") {
          card.dataset.fillPattern = fillCue.pattern;
        }
        const cueStack = document.createElement("div");
        cueStack.className = "card-color-cues";
        if (fillCue) {
          const fillBadge = document.createElement("span");
          fillBadge.className = "card-color-cue";
          fillBadge.textContent = `Fill: ${fillCue.label}`;
          cueStack.appendChild(fillBadge);
        }
        if (textCue) {
          const textBadge = document.createElement("span");
          textBadge.className = "card-color-cue";
          textBadge.textContent = `Text: ${textCue.label}`;
          cueStack.appendChild(textBadge);
        }
        if (cueStack.childElementCount) {
          card.appendChild(cueStack);
        }
      }

      window.getFlashRecallColorVisionMode = getColorVisionMode;
      window.getAccessibleColorEntry = getAccessibleColorEntry;
      const flashStageModal = document.getElementById("flashStageModal");
      const flashStageStart = document.getElementById("flashStageStart");
      const flashCountdown = document.getElementById("flashCountdown");
      const flashStageSkip = document.getElementById("flashStageSkip");
      const autoAdvanceNextToggle = document.getElementById("autoAdvanceNextToggle");
      const autoStartStagePreviewToggle = document.getElementById("autoStartStagePreviewToggle");
      const leaderboardsEnabledToggle = document.getElementById("leaderboardsEnabledToggle");
      const stageIntroModal = document.getElementById("stageIntroModal");
      const stageIntroTitle = document.getElementById("stageIntroTitle");
      const stageIntroSubtitle = document.getElementById("stageIntroSubtitle");
      const stageIntroStars = document.getElementById("stageIntroStars");
      const stageIntroBest = document.getElementById("stageIntroBest");
      const stageIntroGoals = document.getElementById("stageIntroGoals");
      const stageIntroList = document.getElementById("stageIntroList");
      const stageIntroClose = document.getElementById("stageIntroClose");
      const stageIntroStart = document.getElementById("stageIntroStart");
      const leaderboardOpen = document.getElementById("leaderboardOpen");
      const leaderboardModal = document.getElementById("leaderboardModal");
      const leaderboardClose = document.getElementById("leaderboardClose");
      const stageIntroCard = stageIntroModal
        ? stageIntroModal.querySelector(".modal-card--intro")
        : null;
      const stagePanel = document.querySelector(".stage.panel");
      const modeSelect = document.getElementById("modeSelect");
      const timerBar = document.getElementById("timerBar");
      const timerFill = document.getElementById("timerFill");
      const streakPill = document.getElementById("streakPill");
      const roundPill = document.getElementById("roundPill");
      const stageTimerHud = document.getElementById("stageTimerHud");
      const successAnimationToggle = document.getElementById("successAnimationToggle");
      const successToast = document.getElementById("successToast");
      const cardGrid = document.getElementById("cardGrid");
      const promptGrid = document.getElementById("promptGrid");
      const inputGrid = document.getElementById("inputGrid");
      const actions = document.querySelector(".stage .actions");
      const resultsPanel = document.getElementById("resultsPanel");
      const platformerPanel = document.getElementById("platformerPanel");
      const platformerCanvas = document.getElementById("platformerCanvas");
      const platformerCtx = platformerCanvas.getContext("2d");
      const fogCanvas = document.getElementById("fogCanvas");
      const fogCtx = fogCanvas.getContext("2d");
      const page = document.body;
      window.addEventListener("resize", () => {
        positionStageInstructionPanel();
      });

      let phase = "idle";
      let round = 0;
      let roundStartTime = 0;
      let streak = 0;
      let sandboxResultStreak = null;
      let timerId = null;
      let stageTimerId = null;
      let stageInstructionTimers = [];
      let stageInstructionToken = 0;
      const instructionPanelGapReveal = 170;
      const instructionPanelGapRecall = 280;
      let roundFlowToken = 0;
      let successAnimationEnabled = true;
      let successAnimationActive = false;
      let successAnimationPaused = false;
      let successAnimationStart = null;
      let successAnimationRemaining = 0;
      let successAnimationTimeoutId = null;
      let successAnimationPromise = null;
      let successAnimationResolve = null;
      const successAnimationDurationMs = 900;

      function bumpRoundFlowToken() {
        roundFlowToken += 1;
      }
      let roundItems = [];
      let roundItemsBase = [];
      let lastRoundItems = null;
      let lastRoundStageId = null;
      let lastAnswerInitials = null;
      let lastAnswerInitialsStageId = null;
      let rotatePromptHistory = null;
      let rotatePromptHistoryStageId = null;
      let priorRoundItems = null;
      let priorRoundStageId = null;
      let lastBackgroundColorLabel = null;
      let lastBackgroundColorStageId = null;
      let backgroundColorHistory = null;
      let backgroundColorHistoryStageId = null;
      let gameMode = "practice";
      function isFreePlayMode(mode = gameMode) {
        return mode === "practice" || mode === "aminoAcids";
      }
      let pausedState = null;
      let timerState = null;
      let recallSubmitLockUntil = 0;
      let stage1RecallSubmitLockUsed = false;
      const platformerState = {
        enabled: false,
        completed: false,
        required: false,
        failed: false,
        player: { x: 20, y: 0, w: 16, h: 20, vx: 0, vy: 0 },
        start: { x: 20, y: 0 },
        platforms: [],
        pits: [],
        goal: { x: 0, y: 0, w: 12, h: 20 },
        keys: { left: false, right: false, jump: false }
      };
      let adTimer = null;
      let autoAdvanceNextTimerId = null;
      let autoAdvanceNextEnabled = true;
      let autoRetryTimerId = null;
      let autoRetryEnabled = true;
      let stageIntroAutoStartEnabled = true;
      let stageIntroAutoStartTimerId = null;
      let adEnabled = false;
      let adActive = false;
      let adShownThisRound = false;
      let pendingSkipAfterAd = false;
      let adSnapshot = null;
      let fogEnabled = false;
      let fogActive = false;
      let fogLastMove = { x: null, y: null, t: 0 };
      let blurEnabled = false;
      let blurActive = false;
      let blurLastMove = { x: null, y: null, t: 0 };
      let glitchTimer = null;
      let sequenceModifierActive = false;
      let sequenceModifierTimer = null;
      let sequenceModifierStepIndex = 0;
      let sequenceModifierConfig = null;
      let sequenceModifierItems = null;
      let swapEnabled = false;
      let swapChance = 1;
      let swapActive = false;
      let swapPair = null;
      let swapMap = null;
      const swapAnimationDuration = 1300;
      let swapTimeoutId = null;
      let swapStartTime = null;
      let swapRemaining = null;
      let swapStartRecall = null;
      let swapCleanup = null;
      let swapStagePauseStart = null;
      let swapStagePauseAccumulated = 0;
      let sequenceRevealActive = false;
      let sequenceRevealIndex = 0;
      let sequenceRevealSeconds = 0;
      let stageCategoryQueue = null;
      let stageCategoryQueueIndex = 0;
      let stageCategoryQueueStageId = null;
      const stageState = {
        active: false,
        index: 0,
        startTime: null,
        elapsedMs: 0,
        completed: false,
        failed: false,
        lastStars: 0,
        page: 0
      };
      let sessionStartTime = performance.now();
      let rareEventGraceAccumulatedMs = 0;
      let rareEventGraceActiveStartedAt = null;
      let lastCompletedLevel = 0;
      let dragSelecting = false;
      let dragTargetState = null;
      function getCurrentModifierKeys() {
        if (gameMode === "aminoAcids") return [];
        if (gameMode === "stages") {
          const stage = window.getStageConfig ? window.getStageConfig(stageState.index) : null;
          const modifiers = window.getStageModifiers
            ? window.getStageModifiers(stage)
            : (stage && stage.modifiers ? stage.modifiers : {});
          return Object.keys(modifiers || {}).filter((key) => Boolean(modifiers[key]));
        }
        const active = [];
        if (practiceMathOps && practiceMathOps.checked) active.push("mathOps");
        if (practiceMathOpsPlus && practiceMathOpsPlus.checked) active.push("mathOpsPlus");
        if (practiceMisleadColors && practiceMisleadColors.checked) active.push("misleadColors");
        if (practiceBackgroundColor && practiceBackgroundColor.checked) active.push("backgroundColor");
        if (practiceTextColor && practiceTextColor.checked) active.push("textColor");
        if (practicePreviousCard && practicePreviousCard.checked) active.push("previousCard");
        if (practiceRotate && practiceRotate.checked) active.push("rotate");
        if (practiceRotatePlus && practiceRotatePlus.checked) active.push("rotatePlus");
        if (practiceSequence && practiceSequence.checked) active.push("sequence");
        if (practiceSwap && practiceSwap.checked) active.push("swapCards");
        if (practicePlatformer && practicePlatformer.checked) active.push("platformer");
        if (practiceGlitch && practiceGlitch.checked) active.push("glitch");
        if (practiceFog && practiceFog.checked) active.push("fog");
        if (practiceBlur && practiceBlur.checked) active.push("blur");
        if (practiceAds && practiceAds.checked) active.push("ads");
        return active;
      }

      function pauseRareEventGracePeriod() {
        if (!Number.isFinite(rareEventGraceActiveStartedAt)) {
          return;
        }
        rareEventGraceAccumulatedMs += Math.max(0, performance.now() - rareEventGraceActiveStartedAt);
        rareEventGraceActiveStartedAt = null;
      }

      function resetRareEventGracePeriod() {
        rareEventGraceAccumulatedMs = 0;
        rareEventGraceActiveStartedAt = null;
      }

      function beginRareEventGracePeriod(force = false) {
        if (force) {
          rareEventGraceAccumulatedMs = 0;
          rareEventGraceActiveStartedAt = performance.now();
          return;
        }
        if (!Number.isFinite(rareEventGraceActiveStartedAt)) {
          rareEventGraceActiveStartedAt = performance.now();
        }
      }

      function getRareEventGraceElapsedMs() {
        return rareEventGraceAccumulatedMs + (
          Number.isFinite(rareEventGraceActiveStartedAt)
            ? Math.max(0, performance.now() - rareEventGraceActiveStartedAt)
            : 0
        );
      }

      function getRareEventGraceRemainingMs() {
        return Math.max(0, RARE_EVENT_GRACE_PERIOD_MS - getRareEventGraceElapsedMs());
      }

      function hasRareEventGracePeriodElapsed() {
        return getRareEventGraceRemainingMs() <= 0;
      }

      window.beginRareEventGracePeriod = beginRareEventGracePeriod;
      window.pauseRareEventGracePeriod = pauseRareEventGracePeriod;
      window.resetRareEventGracePeriod = resetRareEventGracePeriod;
      window.getRareEventGraceRemainingMs = getRareEventGraceRemainingMs;
      window.hasRareEventGracePeriodElapsed = hasRareEventGracePeriodElapsed;

      function incrementAchievementCounter(map, key, amount = 1) {
        if (!map || !key || !Number.isFinite(amount) || amount <= 0) return;
        map[key] = (Number(map[key]) || 0) + amount;
      }

      function buildRoundAchievementSnapshot(items) {
        const safeItems = Array.isArray(items) ? items : [];
        const cardTypeCounts = {};
        const modifierVariantCounts = {};
        safeItems.forEach((item) => {
          if (!item || typeof item !== "object") return;
          if (typeof item.category === "string" && item.category) {
            incrementAchievementCounter(cardTypeCounts, item.category);
          }
          const itemModifiers = Array.isArray(item.achievementModifiers) ? item.achievementModifiers : [];
          itemModifiers.forEach((modifierKey) => {
            incrementAchievementCounter(modifierVariantCounts, modifierKey);
          });
        });
        const perRoundModifiers = new Set(["swapCards", "platformer", "glitch", "fog", "blur", "ads"]);
        getCurrentModifierKeys().forEach((modifierKey) => {
          if (perRoundModifiers.has(modifierKey)) {
            incrementAchievementCounter(modifierVariantCounts, modifierKey);
          }
        });
        return { cardTypeCounts, modifierVariantCounts };
      }

      function getActiveLevelContext() {
        if (gameMode !== "stages" || !stageState.active) return null;
        const stage = window.getStageConfig ? window.getStageConfig(stageState.index) : null;
        const activeModifiers = getCurrentModifierKeys();
        return {
          mode: gameMode,
          stage_index: stageState.index,
          level_number: stageState.index + 1,
          stage_name: stage && stage.name ? stage.name : null,
          stage_type: stage && stage.stageType ? String(stage.stageType) : null,
          attempt_number: Number.isFinite(stageState.attempts) ? stageState.attempts : null,
          active_modifiers: activeModifiers
        };
      }
      window.getActiveLevelContext = getActiveLevelContext;
      window.getCurrentModifierKeys = getCurrentModifierKeys;
      window.getRoundAchievementSnapshot = buildRoundAchievementSnapshot;
      window.achievementInfoModal = achievementInfoModal;
      window.achievementInfoCard = achievementInfoCard;
      window.achievementInfoIcon = achievementInfoIcon;
      window.achievementInfoTitle = achievementInfoTitle;
      window.achievementInfoDescription = achievementInfoDescription;
      window.achievementInfoMeta = achievementInfoMeta;
      window.achievementInfoClose = achievementInfoClose;
      window.achievementToastStack = achievementToastStack;
      window.getCurrentGameMode = function getCurrentGameMode() {
        return gameMode;
      };
      window.applyPreviousCardSwap = function applyPreviousCardSwap(map) {
        const previousRoundItems =
          typeof window.getPreviousRoundItems === "function" ? window.getPreviousRoundItems() : null;
        if (!Array.isArray(map) || !Array.isArray(previousRoundItems) || !previousRoundItems.length) {
          return;
        }
        map.forEach((mappedIndex) => {
          const item = roundItems[mappedIndex];
          if (!item || item.recallHint !== "Previous card") return;
          const prevItem = previousRoundItems[mappedIndex];
          if (!prevItem) return;
          item.answer = prevItem.textLabel || prevItem.label || prevItem.answer || "";
        });
      };
      function getSelectedCategories() {
        return Array.from(document.querySelectorAll("#practiceModal .checkboxes input:checked"))
          .map((checkbox) => checkbox.value)
          .filter((value) => dataSets[value]);
      }

      function getActiveCategories(currentRound) {
        if (gameMode === "aminoAcids") return ["aminoAcids"];
        if (gameMode === "stages") {
          const stage = window.getStageConfig ? window.getStageConfig(stageState.index) : null;
          if (window.getStageCategories) {
            return window.getStageCategories(stage);
          }
          return ["numbers"];
        }
        return getSelectedCategories();
      }

      function getChallengeOptions(currentRound) {
        if (gameMode === "aminoAcids") return {};
        if (gameMode === "stages") {
          const stage = window.getStageConfig ? window.getStageConfig(stageState.index) : null;
          if (window.getStageChallengeOptions) {
            return window.getStageChallengeOptions(stage, currentRound);
          }
          return {
            enableMathOps: false,
            enableMathOpsPlus: false,
            mathChance: 0.7,
            misleadColors: false,
            misleadChance: 0.6,
            enableBackgroundColor: false,
            backgroundColorChance: 0.35,
            backgroundPromptChance: 0.5,
            enableTextColor: false,
            textColorChance: 0.6,
            textPromptChance: 0.5,
            enablePreviousCard: false,
            previousCardChance: 0.5,
            enableRotate: false,
            enableRotatePlus: false,
            misleadMinCount: null,
            misleadMaxCount: null,
            backgroundPromptMinCount: null,
            backgroundPromptMaxCount: null,
            textPromptMinCount: null,
            textPromptMaxCount: null,
            previousPromptMinCount: null,
            previousPromptMaxCount: null,
            enableGlitch: false,
            enableSequence: false,
            sequenceSteps: null,
            sequenceStepSeconds: null,
            sequenceStepHoldSeconds: null,
            sequenceFinalHoldSeconds: null,
            sequencePool: null,
            sequenceMinCount: null,
            sequenceMaxCount: null
          };
        }
        return {
          enableMathOps: practiceMathOps.checked,
          enableMathOpsPlus: Boolean(practiceMathOpsPlus && practiceMathOpsPlus.checked),
          mathChance: clamp(Number(practiceMathChance && practiceMathChance.value) || 0.7, 0, 1),
          misleadColors: practiceMisleadColors.checked,
          misleadChance: clamp(Number(practiceMisleadChance && practiceMisleadChance.value) || 0.6, 0, 1),
          enableBackgroundColor: practiceBackgroundColor.checked,
          backgroundColorChance: clamp(Number(practiceBackgroundChance && practiceBackgroundChance.value) || 0.35, 0, 1),
          backgroundPromptChance: 0.5,
          enableTextColor: practiceTextColor.checked,
          textColorChance: 0.6,
          textPromptChance: 0.5,
          enablePreviousCard: practicePreviousCard.checked,
          previousCardChance: 0.5,
          enableRotate: Boolean(practiceRotate && practiceRotate.checked),
          enableRotatePlus: Boolean(practiceRotatePlus && practiceRotatePlus.checked),
          enableGlitch: practiceGlitch.checked,
          enableSequence: Boolean(practiceSequence && practiceSequence.checked),
          sequenceSteps: 3,
          sequenceStepSeconds: 0.2,
          sequenceStepHoldSeconds: 0.2,
          sequenceFinalHoldSeconds: 0.5,
          sequencePool: getSelectedCategories(),
          sequenceMinCount: null,
          sequenceMaxCount: null
        };
      }

      function isPlatformerEnabled() {
        if (gameMode === "aminoAcids") return false;
        if (gameMode === "stages") {
          const stage = window.getStageConfig ? window.getStageConfig(stageState.index) : null;
          const modifiers = window.getStageModifiers ? window.getStageModifiers(stage) : null;
          return Boolean(modifiers && modifiers.platformer);
        }
        return Boolean(practicePlatformer.checked);
      }

      function isAdEnabled() {
        if (gameMode === "aminoAcids") return false;
        if (gameMode === "stages") {
          const stage = window.getStageConfig ? window.getStageConfig(stageState.index) : null;
          const modifiers = window.getStageModifiers ? window.getStageModifiers(stage) : null;
          return Boolean(modifiers && modifiers.ads);
        }
        return Boolean(practiceAds.checked);
      }

      function isFogEnabled() {
        if (gameMode === "aminoAcids") return false;
        if (gameMode === "stages") {
          const stage = window.getStageConfig ? window.getStageConfig(stageState.index) : null;
          const modifiers = window.getStageModifiers ? window.getStageModifiers(stage) : null;
          return Boolean(modifiers && modifiers.fog);
        }
        return Boolean(practiceFog.checked);
      }

      function isBlurEnabled() {
        if (gameMode === "aminoAcids") return false;
        if (gameMode === "stages") {
          const stage = window.getStageConfig ? window.getStageConfig(stageState.index) : null;
          const modifiers = window.getStageModifiers ? window.getStageModifiers(stage) : null;
          return Boolean(modifiers && modifiers.blur);
        }
        return Boolean(practiceBlur && practiceBlur.checked);
      }

      function isSwapEnabled() {
        if (gameMode === "aminoAcids") return false;
        if (gameMode === "stages") {
          const stage = window.getStageConfig ? window.getStageConfig(stageState.index) : null;
          const modifiers = window.getStageModifiers ? window.getStageModifiers(stage) : null;
          return Boolean(modifiers && modifiers.swapCards);
        }
        return Boolean(practiceSwap && practiceSwap.checked);
      }

      function getSwapChance() {
        if (gameMode === "aminoAcids") return 0;
        if (gameMode === "stages") {
          const stage = window.getStageConfig ? window.getStageConfig(stageState.index) : null;
          const modifiers = window.getStageModifiers ? window.getStageModifiers(stage) : null;
          const value = modifiers && typeof modifiers.swapChance === "number" ? modifiers.swapChance : 1;
          return Math.max(0, Math.min(1, value));
        }
        return clamp(Number(practiceSwapChance && practiceSwapChance.value) || 1, 0, 1);
      }

      function skipRevealNow() {
        if (phase !== "show") return;
        if (timerId) {
          clearInterval(timerId);
          timerId = null;
        }
        timerState = null;
        clearAdTimer();
        pendingSkipAfterAd = false;
        adShownThisRound = true;
        if (adActive) {
          hideAd();
        }
        beginRecallPhase();
      }

      function updateModeUI() {
        gameMode = modeSelect.value;
        page.dataset.mode = gameMode;
        updateCategoryControls();
        updateScore();
        updateStreakVisibility();
      }

      function updateCategoryControls() {
        const disabled = gameMode !== "practice" &&
          !(practiceModal && practiceModal.classList.contains("show"));
        document.querySelectorAll("#practiceModal .checkboxes input, #practiceModal .stat-field input")
          .forEach((input) => {
            input.disabled = disabled;
            delete input.dataset.locked;
            delete input.dataset.cost;
            delete input.dataset.unlockType;
          });
      }

      function positionStageInstructionPanel() {
        if (!stageInstructionPanel || !stagePanel) return;
        if (window.MemoryChallenges && window.MemoryChallenges.hasEnabled()) {
          stageInstructionPanel.style.left = "";
          stageInstructionPanel.style.top = "";
          stageInstructionPanel.style.bottom = "";
          stageInstructionPanel.style.width = "";
          stageInstructionPanel.style.transform = "none";
          return;
        }
        const anchor = timerBar ? timerBar.getBoundingClientRect() : stagePanel.getBoundingClientRect();
        const baseRect = stagePanel.getBoundingClientRect();
        const gap =
          phase === "show"
            ? instructionPanelGapReveal
            : phase === "recall"
              ? instructionPanelGapRecall
              : instructionPanelGapRecall;
        const panelWidth = Math.min(760, Math.max(260, baseRect.width * 0.72));
        stageInstructionPanel.style.left = `${Math.round(baseRect.left + baseRect.width / 2)}px`;
        stageInstructionPanel.style.top = `${Math.round(anchor.bottom + gap)}px`;
        stageInstructionPanel.style.width = `${Math.round(panelWidth)}px`;
        stageInstructionPanel.style.bottom = "";
        stageInstructionPanel.style.transform = "translate(-50%, 0)";
      }

      function setPhase(text, nextState) {
        const previousPhase = phase;
        if (nextState) {
          phase = nextState;
          page.dataset.state = nextState;
          if (window.MemoryChallenges) {
            window.MemoryChallenges.setPhase(nextState, { interactive: text !== "Swapping..." });
          }
          if ((nextState === "result" || nextState === "idle") && typeof pauseRareEventGracePeriod === "function") {
            pauseRareEventGracePeriod();
          }
        }
        updateRoundVisibility();
        updateStreakVisibility();
        updateStageTimerVisibility();
        renderStageInstructions();
        positionStageInstructionPanel();
        if (nextState === "idle") {
          if (stageInstructionPanel && stageInstructions && stageInstructions.parentElement !== stageInstructionPanel) {
            stageInstructionPanel.appendChild(stageInstructions);
            stageInstructions.style.position = "";
            stageInstructions.style.left = "";
            stageInstructions.style.top = "";
            stageInstructions.style.width = "";
            stageInstructions.style.height = "";
            stageInstructions.style.inset = "";
            stageInstructions.style.zIndex = "";
          }
          document.body.classList.remove("show-pause");
          document.body.classList.remove("pause-hint");
        }
      }

      function toPercent(value) {
        const numberValue = Number(value);
        if (!Number.isFinite(numberValue)) return null;
        return numberValue <= 1 ? numberValue * 100 : numberValue;
      }

      function toInstructionPos(value, axis) {
        const numberValue = Number(value);
        if (!Number.isFinite(numberValue)) return null;
        if (axis === "y") {
          return numberValue <= 1 ? `${numberValue * 100}%` : `${numberValue}px`;
        }
        return numberValue <= 1 ? `${numberValue * 100}%` : `${numberValue}%`;
      }

      function renderStageInstructions() {
        if (!stageInstructions) return;
        stageInstructionToken += 1;
        stageInstructionTimers.forEach((timerId) => clearTimeout(timerId));
        stageInstructionTimers = [];
        stageInstructions.innerHTML = "";
        stageInstructions.style.display = "none";
        if (stageInstructionPanel) {
          stageInstructionPanel.style.display = "none";
        }
      }

      function scheduleInstructionEntries(entries) {
        const renderToken = stageInstructionToken;
        const fadeMs = 500;
        const showEntry = (entry) => {
          if (renderToken !== stageInstructionToken) return;
          if (!entry || typeof entry.text !== "string" || !entry.text.trim()) return;
          const box = document.createElement("div");
          box.className = "stage-instruction";
          if (entry.className) {
            String(entry.className).split(" ").filter(Boolean)
              .forEach((cls) => box.classList.add(cls));
          }
          const safeText = entry.text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
          const formatted = safeText.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
          box.innerHTML = `<span class="stage-instruction__text">${formatted}</span>`;
          const width = toInstructionPos(entry.w, "x");
          if (width !== null) box.style.width = width;
          if (entry.align) box.style.textAlign = entry.align;
          if (entry.size) box.style.fontSize = entry.size;
          if (entry.color) box.style.color = "var(--ink)";
          stageInstructions.appendChild(box);
          requestAnimationFrame(() => {
            if (renderToken !== stageInstructionToken) return;
            box.classList.add("is-visible");
          });
          const duration = Number(entry.duration);
          if (Number.isFinite(duration) && duration > 0) {
            const hideId = window.setTimeout(() => {
              if (renderToken !== stageInstructionToken) return;
              box.classList.remove("is-visible");
              box.classList.add("is-hidden");
              const removeId = window.setTimeout(() => {
                if (renderToken !== stageInstructionToken) return;
                box.remove();
              }, fadeMs);
              stageInstructionTimers.push(removeId);
            }, duration);
            stageInstructionTimers.push(hideId);
          }
        };
        entries.forEach((entry) => {
          const delay = Number(entry && entry.at);
          if (Number.isFinite(delay) && delay > 0) {
            const timerId = window.setTimeout(() => showEntry(entry), delay);
            stageInstructionTimers.push(timerId);
          } else {
            showEntry(entry);
          }
        });
      }

      function updateScore() {
        const stage = gameMode === "stages" && window.getStageConfig ? window.getStageConfig(stageState.index) : null;
        if (gameMode === "stages" && stage) {
          roundPill.textContent = `Round ${round}/${stage.rounds || 1}`;
        } else {
          roundPill.textContent = `Round ${round}`;
        }
        if (streakPill) {
          const displayedStreak = isFreePlayMode() && phase === "result" && sandboxResultStreak !== null
            ? sandboxResultStreak : streak;
          streakPill.textContent = `STREAK ${displayedStreak}`;
        }
        updateRoundVisibility();
        updateStageTimerVisibility();
      }

      function updateRoundVisibility() {
        if (!roundPill) return;
        const showRound = !isFreePlayMode() && phase !== "idle" && phase !== "result";
        roundPill.style.display = showRound ? "block" : "none";
      }

      function updateStreakVisibility() {
        if (!streakPill) return;
        const showStreak = isFreePlayMode() && phase === "result" &&
          document.body.classList.contains("stage-fail");
        streakPill.style.display = showStreak ? "block" : "none";
      }

      function updateStageTimerVisibility() {
        if (!stageTimerHud) return;
        const showStageTimer = gameMode === "stages" && phase !== "idle" && phase !== "result";
        stageTimerHud.style.display = showStageTimer ? "block" : "none";
        if (hudCluster) {
          hudCluster.style.display = showStageTimer ? "flex" : "none";
        }
        if (!showStageTimer) {
          stageTimerHud.textContent = "Time 0.00";
        }
      }

      function setSuccessAnimationEnabled(enabled) {
        successAnimationEnabled = Boolean(enabled);
      }

      function pauseSuccessAnimation() {
        if (!successAnimationActive || successAnimationPaused || !successToast) return;
        successAnimationPaused = true;
        if (successAnimationTimeoutId) {
          clearTimeout(successAnimationTimeoutId);
          successAnimationTimeoutId = null;
        }
        if (successAnimationStart) {
          const elapsed = performance.now() - successAnimationStart;
          successAnimationRemaining = Math.max(0, successAnimationRemaining - elapsed);
        }
        successAnimationStart = null;
        successToast.style.animationPlayState = "paused";
      }

      function resumeSuccessAnimation() {
        if (!successAnimationActive || !successAnimationPaused || !successToast) return;
        successAnimationPaused = false;
        successAnimationStart = performance.now();
        successToast.style.animationPlayState = "running";
        successAnimationTimeoutId = window.setTimeout(() => {
          finishSuccessAnimation();
        }, successAnimationRemaining);
      }

      function finishSuccessAnimation() {
        if (!successAnimationActive) return;
        if (successAnimationTimeoutId) {
          clearTimeout(successAnimationTimeoutId);
          successAnimationTimeoutId = null;
        }
        successToast.classList.remove("show");
        successAnimationActive = false;
        successAnimationPaused = false;
        successAnimationStart = null;
        successAnimationRemaining = 0;
        successAnimationPromise = null;
        if (typeof successAnimationResolve === "function") {
          successAnimationResolve();
        }
        successAnimationResolve = null;
      }

      function cancelSuccessAnimation() {
        if (!successAnimationActive) return;
        if (successAnimationTimeoutId) {
          clearTimeout(successAnimationTimeoutId);
          successAnimationTimeoutId = null;
        }
        if (successToast) {
          successToast.classList.remove("show");
          successToast.style.animationPlayState = "";
        }
        successAnimationActive = false;
        successAnimationPaused = false;
        successAnimationStart = null;
        successAnimationRemaining = 0;
        successAnimationPromise = null;
        if (typeof successAnimationResolve === "function") {
          successAnimationResolve();
        }
        successAnimationResolve = null;
      }

      function playSuccessAnimation() {
        if (!successAnimationEnabled || !successToast) {
          return Promise.resolve();
        }
        if (successAnimationActive && successAnimationPromise) {
          return successAnimationPromise;
        }
        if (typeof window.clearFirstLetterHint === "function") {
          window.clearFirstLetterHint();
        }
        if (typeof window.clearTabKeyHint === "function") {
          window.clearTabKeyHint();
        }
        successAnimationActive = true;
        successAnimationPaused = false;
        const shouldPauseStageTimer = gameMode === "stages" && typeof stopStageStopwatch === "function";
        const wasStageTimerRunning = shouldPauseStageTimer && stageTimerId;
        if (wasStageTimerRunning) {
          stopStageStopwatch();
        }
        successToast.classList.remove("show");
        void successToast.offsetWidth;
        successToast.classList.add("show");
        successToast.style.animationPlayState = "running";
        successAnimationRemaining = successAnimationDurationMs;
        successAnimationStart = performance.now();
        successAnimationPromise = new Promise((resolve) => {
          successAnimationResolve = resolve;
          successAnimationTimeoutId = window.setTimeout(() => {
            if (wasStageTimerRunning && typeof startStageStopwatch === "function") {
              if (stageState && typeof stageState.startTime === "number") {
                stageState.startTime += successAnimationDurationMs;
              }
              if (!document.body.classList.contains("pause-active")) {
                startStageStopwatch();
              }
            }
            finishSuccessAnimation();
          }, successAnimationRemaining);
        });
        return successAnimationPromise;
      }

      function resetStageProgress() {
        stageState.active = false;
        stageState.startTime = null;
        stageState.elapsedMs = 0;
        stageState.completed = false;
        stageState.failed = false;
        stageState.lastStars = 0;
      }

      function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
      }

      function shuffleArray(list) {
        for (let i = list.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [list[i], list[j]] = [list[j], list[i]];
        }
        return list;
      }


      function resetBoard() {
        cardGrid.innerHTML = "";
        if (promptGrid) {
          promptGrid.innerHTML = "";
        }
        inputGrid.innerHTML = "";
        resultsPanel.classList.remove("show");
        resultsPanel.innerHTML = "";
        if (typeof window.closeStageSharePreviewModal === "function") {
          window.closeStageSharePreviewModal();
        }
        if (typeof window.clearStageSharePreview === "function") {
          window.clearStageSharePreview();
        }
      }

      function normalize(value) {
        return value.trim().toLowerCase();
      }

      function pickRareCatImage() {
        if (!RARE_CAT_CARD_IMAGES.length) return "";
        const index = Math.floor(Math.random() * RARE_CAT_CARD_IMAGES.length);
        return RARE_CAT_CARD_IMAGES[index] || RARE_CAT_CARD_IMAGES[0];
      }

      function maybeConvertToCatCard(item) {
        if (gameMode === "aminoAcids") return item;
        const canShowRareCat =
          typeof window.hasRareEventGracePeriodElapsed !== "function" || window.hasRareEventGracePeriodElapsed();
        if (!item || item.specialType === "cat" || !canShowRareCat || Math.random() >= RARE_CAT_CARD_CHANCE) {
          return item;
        }
        return {
          ...item,
          specialType: "cat",
          specialImage: pickRareCatImage(),
          answer: "cat",
          answerAliases: ["c", "cat"],
          recallHint: "Cat",
          textLabel: null,
          colorTarget: null,
          backgroundColorLabel: null,
          backgroundColorHex: null,
          textColorLabel: null,
          textColorHex: null
        };
      }

      function formatCategoryLabel(category) {
        switch (category) {
          case "numbers":
            return "Number";
          case "letters":
            return "Letter";
          case "greekLetters":
            return "Greek letter";
          case "colors":
            return "Color";
          case "directions":
            return "Direction";
          case "diagonal":
            return "Diagonal";
          case "shapes":
            return "Shape";
          case "fruits":
            return "Fruit";
          case "aminoAcids":
            return "Amino acid";
          default:
            return category ? category[0].toUpperCase() + category.slice(1) : "Card";
        }
      }

      function renderShapeSVG(shape) {
        if (shape === "circle") {
          return `
            <svg class="shape-svg" viewBox="0 0 100 100" aria-hidden="true">
              <circle class="shape-stroke" cx="50" cy="50" r="30"></circle>
            </svg>
          `;
        }
        if (shape === "square") {
          return `
            <svg class="shape-svg" viewBox="0 0 100 100" aria-hidden="true">
              <rect class="shape-stroke" x="24" y="24" width="52" height="52"></rect>
            </svg>
          `;
        }
        return `
          <svg class="shape-svg" viewBox="0 0 100 100" aria-hidden="true">
            <polygon class="shape-stroke" points="50,18 82,82 18,82"></polygon>
          </svg>
        `;
      }

      function getDirectionRotation(label) {
        const direction = String(label || "").toLowerCase();
        switch (direction) {
          case "up":
            return -90;
          case "right":
            return 0;
          case "down":
            return 90;
          case "left":
            return 180;
          default:
            return 0;
        }
      }

      function getDiagonalRotation(label) {
        const direction = String(label || "").toLowerCase();
        switch (direction) {
          case "ne":
            return -45;
          case "se":
            return 45;
          case "sw":
            return 135;
          case "nw":
            return -135;
          default:
            return 0;
        }
      }

      function normalizeCompassKey(label) {
        const value = String(label || "").trim().toLowerCase();
        if (["up", "right", "down", "left"].includes(value)) return value;
        if (["ne", "nw", "se", "sw"].includes(value)) return value;
        return null;
      }

      function getRotatedCompassKey(baseKey, degrees, direction) {
        const compass = ["up", "ne", "right", "se", "down", "sw", "left", "nw"];
        const start = compass.indexOf(baseKey);
        if (start === -1) return baseKey;
        const steps = Math.round(degrees / 45);
        const delta = direction === "ccw" ? -steps : steps;
        const next = (start + delta + compass.length * 10) % compass.length;
        return compass[next];
      }

      function formatCompassLabel(key) {
        switch (key) {
          case "up":
            return "Up";
          case "right":
            return "Right";
          case "down":
            return "Down";
          case "left":
            return "Left";
          case "ne":
            return "NE";
          case "nw":
            return "NW";
          case "se":
            return "SE";
          case "sw":
            return "SW";
          default:
            return key;
        }
      }

      function applyRotationChallenges(items, options) {
        const enableRotate = Boolean(options && options.enableRotate);
        const enableRotatePlus = Boolean(options && options.enableRotatePlus);
        if (!enableRotate && !enableRotatePlus) return items;
        const degreesBase = enableRotate ? [45, 90, 180] : [];
        const degreesPlus = enableRotatePlus ? [135, 225, 270, 315, 360] : [];
        if (!degreesBase.length && !degreesPlus.length) return items;
        const promptHistory = options && options._rotatePromptHistory instanceof Set
          ? options._rotatePromptHistory
          : null;
        const roundPromptSeen = new Set();
        const buildPromptKey = (degree, direction) => `${degree}-${direction}`;
        const getPromptSymbol = (direction) => (direction === "ccw" ? "\u21ba" : "\u21bb");
        const enforceUniqueRotateDegrees = (rotatedItems, rotatedEntries) => {
          if (!options || !options.rotateUniqueDegreesPerRound || rotatedEntries.length <= 1) {
            return;
          }
          const usedDegrees = new Set();
          rotatedEntries.forEach((entry) => {
            if (!entry || typeof entry.degree !== "number") return;
            if (!usedDegrees.has(entry.degree)) {
              usedDegrees.add(entry.degree);
              return;
            }
            const available = Array.isArray(entry.degrees) ? entry.degrees : [];
            if (!available.length) return;
            let candidates = available.filter((value) => value !== entry.degree && !usedDegrees.has(value));
            if (promptHistory || roundPromptSeen.size) {
              candidates = candidates.filter((value) => {
                const key = buildPromptKey(value, entry.direction);
                if (promptHistory && promptHistory.has(key)) return false;
                if (roundPromptSeen.has(key)) return false;
                return true;
              });
            }
            if (!candidates.length) {
              candidates = available.filter((value) => value !== entry.degree && !usedDegrees.has(value));
            }
            if (!candidates.length) return;
            const nextDegree = candidates[Math.floor(Math.random() * candidates.length)];
            const nextKey = buildPromptKey(nextDegree, entry.direction);
            const rotatedKey = getRotatedCompassKey(entry.baseKey, nextDegree, entry.direction);
            const answerLabel = formatCompassLabel(rotatedKey);
            const answerCategory =
              ["up", "right", "down", "left"].includes(rotatedKey) ? "directions" : "diagonal";
            const symbol = getPromptSymbol(entry.direction);
            const current = rotatedItems[entry.index];
            if (current) {
              rotatedItems[entry.index] = {
                ...current,
                answer: answerLabel,
                answerCategory,
                recallHint: `${nextDegree}\u00b0 ${symbol}`
              };
            }
            if (entry.promptKey) {
              roundPromptSeen.delete(entry.promptKey);
            }
            entry.degree = nextDegree;
            entry.promptKey = nextKey;
            roundPromptSeen.add(nextKey);
            usedDegrees.add(nextDegree);
          });
        };
        const pickRotationPrompt = (degreesList) => {
          if (!Array.isArray(degreesList) || !degreesList.length) return null;
          const candidates = [];
          degreesList.forEach((degree) => {
            candidates.push({
              degree,
              direction: "cw",
              key: buildPromptKey(degree, "cw"),
              symbol: getPromptSymbol("cw")
            });
            candidates.push({
              degree,
              direction: "ccw",
              key: buildPromptKey(degree, "ccw"),
              symbol: getPromptSymbol("ccw")
            });
          });
          const filtered = candidates.filter((candidate) => {
            if (promptHistory && promptHistory.has(candidate.key)) return false;
            if (roundPromptSeen.has(candidate.key)) return false;
            return true;
          });
          const pool = filtered.length ? filtered : candidates;
          const picked = pool[Math.floor(Math.random() * pool.length)];
          roundPromptSeen.add(picked.key);
          return picked;
        };

        const rotateMin = typeof options.rotateMinCount === "number" ? Math.max(0, Math.floor(options.rotateMinCount)) : null;
        const rotateMax = typeof options.rotateMaxCount === "number" ? Math.max(0, Math.floor(options.rotateMaxCount)) : null;
        const rotatePlusMin = typeof options.rotatePlusMinCount === "number" ? Math.max(0, Math.floor(options.rotatePlusMinCount)) : null;
        const rotatePlusMax = typeof options.rotatePlusMaxCount === "number" ? Math.max(0, Math.floor(options.rotatePlusMaxCount)) : null;
        const rotateChance = typeof options.rotateChance === "number" ? Math.max(0, Math.min(1, options.rotateChance)) : null;
        const rotatePlusChance = typeof options.rotatePlusChance === "number" ? Math.max(0, Math.min(1, options.rotatePlusChance)) : null;
        const hasRotateConstraints = rotateMin !== null || rotateMax !== null || rotateChance !== null;
        const hasRotatePlusConstraints = rotatePlusMin !== null || rotatePlusMax !== null || rotatePlusChance !== null;
        const hasConstraints = hasRotateConstraints || hasRotatePlusConstraints;

        const eligible = items
          .map((item, index) => ({ item, index }))
          .filter((entry) => {
            if (!entry.item || entry.item.recallHint) return false;
            return entry.item.category === "directions" || entry.item.category === "diagonal";
          })
          .map((entry) => entry.index);

        if (!hasConstraints) {
          const degrees = [...degreesBase, ...degreesPlus];
          const rotatedEntries = [];
          const rotatedItems = items.map((item, index) => {
            if (!item || item.recallHint) return item;
            if (item.category !== "directions" && item.category !== "diagonal") {
              return item;
            }
            const baseKey = normalizeCompassKey(item.label);
            if (!baseKey) return item;
            const prompt = pickRotationPrompt(degrees);
            if (!prompt) return item;
            const { degree, direction, symbol, key } = prompt;
            const rotatedKey = getRotatedCompassKey(baseKey, degree, direction);
            const answerLabel = formatCompassLabel(rotatedKey);
            const answerCategory =
              ["up", "right", "down", "left"].includes(rotatedKey) ? "directions" : "diagonal";
            rotatedEntries.push({
              index,
              baseKey,
              degrees,
              direction,
              degree,
              modifierKey: "rotate",
              promptKey: key
            });
            return {
              ...item,
              answer: answerLabel,
              answerCategory,
              recallHint: `${degree}° ${symbol}`
            };
          });
          enforceUniqueRotateDegrees(rotatedItems, rotatedEntries);
          if (promptHistory && rotatedEntries.length) {
            rotatedEntries.forEach((entry) => {
              if (entry.promptKey) promptHistory.add(entry.promptKey);
            });
          }
          return rotatedItems;
        }

        const rotateChanceValue = rotateChance !== null ? rotateChance : (hasRotateConstraints ? 1 : 0);
        const rotatePlusChanceValue = rotatePlusChance !== null ? rotatePlusChance : (hasRotatePlusConstraints ? 1 : 0);

        const hasPreselectedPlus = options && options._rotatePlusPlanSelected instanceof Set;
        const hasPreselectedBase = options && options._rotatePlanSelected instanceof Set;
        const selectedPlus = hasPreselectedPlus ? new Set(options._rotatePlusPlanSelected) : new Set();
        const selectedBase = hasPreselectedBase ? new Set(options._rotatePlanSelected) : new Set();
        if (!hasPreselectedPlus || !hasPreselectedBase) {
          let remaining = eligible.slice();
          if (selectedPlus.size) {
            remaining = remaining.filter((idx) => !selectedPlus.has(idx));
          }
          if (!hasPreselectedPlus && degreesPlus.length) {
            const pickedPlus = selectModifierIndices(remaining, rotatePlusChanceValue, rotatePlusMin, rotatePlusMax);
            pickedPlus.forEach((idx) => selectedPlus.add(idx));
            remaining = remaining.filter((idx) => !selectedPlus.has(idx));
          }
          if (selectedBase.size) {
            remaining = remaining.filter((idx) => !selectedBase.has(idx));
          }
          if (!hasPreselectedBase && degreesBase.length) {
            const pickedBase = selectModifierIndices(remaining, rotateChanceValue, rotateMin, rotateMax);
            pickedBase.forEach((idx) => selectedBase.add(idx));
          }
        }

        const rotatedEntries = [];
        const rotatedItems = items.map((item, index) => {
          const isSelected = selectedPlus.has(index) || selectedBase.has(index);
          if (!item) return item;
          if (item.recallHint && !isSelected) return item;
          if (item.category !== "directions" && item.category !== "diagonal") {
            return item;
          }
          const baseKey = normalizeCompassKey(item.label);
          if (!baseKey) return item;
          let degrees = null;
          let modifierKey = null;
          if (selectedPlus.has(index)) {
            degrees = degreesPlus.length ? degreesPlus : degreesBase;
            modifierKey = "rotatePlus";
          } else if (selectedBase.has(index)) {
            degrees = degreesBase.length ? degreesBase : degreesPlus;
            modifierKey = "rotate";
          }
          if (!degrees || !degrees.length || !modifierKey) return item;
          const prompt = pickRotationPrompt(degrees);
          if (!prompt) return item;
          const { degree, direction, symbol, key } = prompt;
          const rotatedKey = getRotatedCompassKey(baseKey, degree, direction);
          const answerLabel = formatCompassLabel(rotatedKey);
          const answerCategory =
            ["up", "right", "down", "left"].includes(rotatedKey) ? "directions" : "diagonal";
          const achievementModifiers = Array.isArray(item.achievementModifiers)
            ? item.achievementModifiers.slice()
            : [];
          if (!achievementModifiers.includes(modifierKey)) {
            achievementModifiers.push(modifierKey);
          }
          const rotated = {
            ...item,
            answer: answerLabel,
            answerCategory,
            recallHint: `${degree}\u00b0 ${symbol}`,
            achievementModifiers
          };
          rotatedEntries.push({
            index,
            baseKey,
            degrees,
            direction,
            degree,
            modifierKey,
            promptKey: key
          });
          return rotated;
        });

        if (
          options &&
          options.rotateUniqueDegreesPerRound &&
          rotatedEntries.length > 1
        ) {
          const unique = new Set(rotatedEntries.map((entry) => entry.degree));
          if (unique.size <= 1) {
            const target = rotatedEntries.find((entry) => entry.degrees.length > 1) || rotatedEntries[1];
            if (target && target.degrees.length > 1) {
              const alternatives = target.degrees.filter((value) => value !== target.degree);
              if (alternatives.length) {
                const direction = target.direction;
                const filtered = alternatives.filter((value) => {
                  const key = buildPromptKey(value, direction);
                  if (promptHistory && promptHistory.has(key)) return false;
                  if (roundPromptSeen.has(key)) return false;
                  return true;
                });
                const pool = filtered.length ? filtered : alternatives;
                const nextDegree = pool[Math.floor(Math.random() * pool.length)];
                const nextKey = buildPromptKey(nextDegree, direction);
                const rotatedKey = getRotatedCompassKey(target.baseKey, nextDegree, target.direction);
                const answerLabel = formatCompassLabel(rotatedKey);
                const answerCategory =
                  ["up", "right", "down", "left"].includes(rotatedKey) ? "directions" : "diagonal";
                const symbol = getPromptSymbol(direction);
                const current = rotatedItems[target.index];
                if (current) {
                  rotatedItems[target.index] = {
                    ...current,
                    answer: answerLabel,
                    answerCategory,
                    recallHint: `${nextDegree}\u00b0 ${symbol}`
                  };
                }
                if (target.promptKey) {
                  roundPromptSeen.delete(target.promptKey);
                }
                target.degree = nextDegree;
                target.promptKey = nextKey;
                roundPromptSeen.add(nextKey);
              }
            }
          }
        }

        enforceUniqueRotateDegrees(rotatedItems, rotatedEntries);

        if (promptHistory && rotatedEntries.length) {
          rotatedEntries.forEach((entry) => {
            if (entry.promptKey) promptHistory.add(entry.promptKey);
          });
        }

        return rotatedItems;
      }

      function getAminoAcidAnswerTokens(item) {
        const expected = normalize(String(item.answer ?? item.label ?? ""));
        const aminoAcid = dataSets.aminoAcids.find(entry => normalize(entry.label) === expected);
        if (!aminoAcid) return [];
        if (item.aminoAnswerFormat === "label") return [aminoAcid.label, ...aminoAcid.nameAliases].map(normalize);
        if (item.aminoAnswerFormat === "threeLetterCode") return [normalize(aminoAcid.threeLetterCode)];
        if (item.aminoAnswerFormat === "oneLetterCode") return [normalize(aminoAcid.oneLetterCode)];
        if (item.aminoAnswerFormat === "sideChainType") {
          return {
            Nonpolar: ["nonpolar", "non-polar", "non polar", "hydrophobic"],
            Polar: ["polar", "polar uncharged", "uncharged polar", "polar neutral", "neutral polar"],
            Acidic: ["acidic", "acid", "negative", "negatively charged"],
            Basic: ["basic", "base", "positive", "positively charged"]
          }[aminoAcid.sideChainType] || [];
        }
        return [aminoAcid.label, aminoAcid.oneLetterCode, aminoAcid.threeLetterCode, ...aminoAcid.nameAliases].map(normalize);
      }

      function getAminoAcidAnswerFormatLabel(item) {
        return {
          label: "Full name",
          threeLetterCode: "Three-letter code",
          oneLetterCode: "One-letter code",
          sideChainType: "Type"
        }[item.aminoAnswerFormat] || "Amino acid";
      }

      function autocorrectAminoAcidName(value) {
        const original = String(value ?? "");
        const typed = normalize(original);
        // Codes are intentional answers, including codes for a different card.
        if (dataSets.aminoAcids.some(entry =>
          [entry.label, entry.oneLetterCode, entry.threeLetterCode, ...entry.nameAliases]
            .some(name => normalize(name) === typed))) return original;
        const spelling = typed.replace(/[\s_-]+/g, "");
        if (!/^[a-z]{2,40}$/.test(spelling)) return original;
        // Complete distinctive beginnings without waiting for a nearly full name.
        const prefixes = dataSets.aminoAcids.filter(entry => [entry.label, ...entry.nameAliases]
          .some(name => name.toLowerCase().replace(/\s/g, "").startsWith(spelling)));
        if (prefixes.length === 1) return prefixes[0].label;
        if (prefixes.length > 1 || spelling.length < 4) return original;
        const distance = (left, right) => {
          const rows = Array.from({ length: left.length + 1 }, (_, i) => [i]);
          rows[0] = Array.from({ length: right.length + 1 }, (_, i) => i);
          for (let i = 1; i <= left.length; i++) {
            for (let j = 1; j <= right.length; j++) {
              rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1,
                rows[i - 1][j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1));
              if (i > 1 && j > 1 && left[i - 1] === right[j - 2] && left[i - 2] === right[j - 1]) {
                rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
              }
            }
          }
          return rows[left.length][right.length];
        };
        const candidates = dataSets.aminoAcids.map(entry => ({
          name: entry.label,
          distance: Math.min(...[entry.label, ...entry.nameAliases].map(name => distance(spelling, name.toLowerCase().replace(/\s/g, ""))))
        })).sort((a, b) => a.distance - b.distance);
        const best = candidates[0];
        const limit = Math.min(3, Math.max(1, Math.floor(spelling.length / 3)));
        return best && best.distance <= limit && best.distance < candidates[1].distance ? best.name : original;
      }

      function getAminoAcidInputSuggestion(input) {
        if (phase !== "recall" || !input || input.disabled || input.dataset.composing === "true") return null;
        const index = Number(input.dataset.index);
        const item = roundItems[swapMap ? swapMap[index] : index];
        if (!item || (item.answerCategory || item.category) !== "aminoAcids" ||
            item.sequenceSteps?.length || item.recallHint === "Background color" || item.recallHint === "Text color") return null;
        if (item.aminoAnswerFormat && item.aminoAnswerFormat !== "label") return null;
        const abbreviation = dataSets.aminoAcids.find(entry => normalize(entry.threeLetterCode) === normalize(input.value));
        const suggestion = abbreviation ? abbreviation.label : autocorrectAminoAcidName(input.value);
        return suggestion !== input.value ? suggestion : null;
      }

      function isCorrectAnswer(item, actualValue) {
        if (!actualValue || !String(actualValue).trim()) {
          return false;
        }
        const actual = normalize(actualValue);
        const expected = normalize(item.answer ?? item.label);
        const answerAliases = Array.isArray(item.answerAliases)
          ? item.answerAliases.map((value) => normalize(String(value)))
          : [];
        if (answerAliases.includes(actual)) {
          return true;
        }
        if (Array.isArray(item.sequenceSteps) && item.sequenceSteps.length) {
          return matchesSequenceAnswer(actual, item);
        }
        const category = item.answerCategory || item.category;
        const stage = gameMode === "stages" && window.getStageConfig
          ? window.getStageConfig(stageState.index)
          : null;
        const disableColorInitials = Boolean(stage && stage.disableColorInitials);
        if (item.recallHint === "Previous card" && Array.isArray(item.previousAnswerKeys)) {
          if (item.previousAnswerKeys.includes(actual)) {
            return true;
          }
        }
        if (item.recallHint === "Background color" || item.recallHint === "Text color") {
          const initial = expected.charAt(0);
          return disableColorInitials ? actual === expected : (actual === expected || actual === initial);
        }
        if (category === "colors") {
          const initial = expected.charAt(0);
          return disableColorInitials ? actual === expected : (actual === expected || actual === initial);
        }
        if (category === "directions") {
          const initial = expected.charAt(0);
          const arrowMap = {
            up: "\u2191",
            down: "\u2193",
            left: "\u2190",
            right: "\u2192"
          };
          const cardinalMap = { up: "n", right: "e", down: "s", left: "w" };
          return (
            actual === expected ||
            actual === initial ||
            actual === arrowMap[expected] ||
            actual === cardinalMap[expected]
          );
        }
        if (category === "diagonal") {
          const normalized = expected.replace(/\s+/g, "");
          const compact = actual.replace(/\s+/g, "");
          if (compact === expected || compact === normalized) return true;
          const arrowPairs = {
            ne: ["\u2191\u2192", "\u2192\u2191"],
            nw: ["\u2191\u2190", "\u2190\u2191"],
            se: ["\u2193\u2192", "\u2192\u2193"],
            sw: ["\u2193\u2190", "\u2190\u2193"]
          };
          const allowed = arrowPairs[normalized];
            return Array.isArray(allowed) && allowed.includes(compact);
        }
        if (category === "aminoAcids") {
          return (!item.aminoAnswerFormat && actual === expected) || getAminoAcidAnswerTokens(item).includes(actual);
        }
        if (category === "fruits") {
          const initial = expected.charAt(0);
          return actual === expected || actual === initial;
        }
        if (category === "greekLetters") {
          const initial = expected.charAt(0);
          const symbol = item.symbol ? normalize(String(item.symbol)) : "";
          return actual === expected || actual === initial || (symbol && actual === symbol);
        }
        if (category === "shapes") {
          if (expected === "square") {
            return actual === "square" || actual === "s" || actual === "rectangle" || actual === "r";
          }
          const initial = expected.charAt(0);
          return actual === expected || actual === initial;
        }
        return actual === expected;
      }

      function buildChallenge(item, options, plan = {}) {
        const challenge = {
          ...item,
          answer: item.label,
          recallHint: null,
          textLabel: null,
          colorTarget: null,
          backgroundColorLabel: null,
          backgroundColorHex: null,
          textColorLabel: null,
          textColorHex: null,
          achievementModifiers: Array.isArray(item.achievementModifiers)
            ? item.achievementModifiers.slice()
            : []
        };
        const collectPreviousAnswerKeys = (previousItem) => {
          if (!previousItem) return null;
          const keys = new Set();
          const addKey = (value) => {
            if (value === null || value === undefined) return;
            const text = String(value).trim();
            if (!text) return;
            keys.add(normalize(text));
          };
          addKey(previousItem.textLabel);
          addKey(previousItem.label);
          addKey(previousItem.answer);
          addKey(previousItem.symbol);
          if ((previousItem.answerCategory || previousItem.category) === "aminoAcids") {
            getAminoAcidAnswerTokens(previousItem).forEach(addKey);
          }
          const prevCategory = previousItem.answerCategory || previousItem.category;
          const baseValue =
            previousItem.answer ?? previousItem.textLabel ?? previousItem.label ?? "";
          const base = normalize(String(baseValue));
          if (base) {
            if (prevCategory === "colors" || prevCategory === "fruits") {
              keys.add(base.charAt(0));
            } else if (prevCategory === "shapes") {
              if (base === "square") {
                keys.add("s");
                keys.add("rectangle");
                keys.add("r");
              } else {
                keys.add(base.charAt(0));
              }
            } else if (prevCategory === "directions") {
              keys.add(base.charAt(0));
              const arrowMap = {
                up: "↑",
                down: "↓",
                left: "←",
                right: "→"
              };
              const cardinalMap = { up: "n", right: "e", down: "s", left: "w" };
              if (arrowMap[base]) keys.add(arrowMap[base]);
              if (cardinalMap[base]) keys.add(cardinalMap[base]);
            } else if (prevCategory === "diagonal") {
              const compact = base.replace(/\s+/g, "");
              if (compact) {
                keys.add(compact);
                const arrowPairs = {
                  ne: ["↑→", "→↑"],
                  nw: ["↑←", "←↑"],
                  se: ["↓→", "→↓"],
                  sw: ["↓←", "←↓"]
                };
                const allowed = arrowPairs[compact];
                if (Array.isArray(allowed)) {
                  allowed.forEach((value) => addKey(value));
                }
              }
            }
          }
          return Array.from(keys);
        };
        const stage = gameMode === "stages" && window.getStageConfig
          ? window.getStageConfig(stageState.index)
          : null;
        const noRepeatBackgroundAcrossRounds = Boolean(stage && stage.noRepeatBackgroundAcrossRounds);
        const previousBackgroundLabel =
          noRepeatBackgroundAcrossRounds && lastBackgroundColorStageId === (stage && stage.id)
            ? lastBackgroundColorLabel
            : null;
        const previousRoundItems =
          typeof window.getPreviousRoundItems === "function" ? window.getPreviousRoundItems() : null;
        if (
          options &&
          options.enablePreviousCard &&
          Array.isArray(previousRoundItems) &&
          previousRoundItems.length > 0
        ) {
          const usePlan = Boolean(options._usePreviousPromptPlan);
          const usePrevious = usePlan
            ? plan.forcePreviousPrompt
            : plan.forcePreviousPrompt || Math.random() < (Number(options.previousCardChance) || 0);
          const previousItem = previousRoundItems[plan.positionIndex];
          if (usePrevious && previousItem) {
            challenge.answer = previousItem.textLabel || previousItem.label || previousItem.answer || "";
            challenge.recallHint = "Previous card";
            if (!challenge.achievementModifiers.includes("previousCard")) {
              challenge.achievementModifiers.push("previousCard");
            }
            const prevCategory = previousItem.answerCategory || previousItem.category;
            if (prevCategory) {
              challenge.answerCategory = prevCategory;
            }
            challenge.previousAnswerKeys = collectPreviousAnswerKeys(previousItem);
          }
        }
        const canUseTextColor = ["numbers", "letters", "greekLetters", "colors"].includes(item.category);
        const applyTextColor =
          Boolean(options && options.enableTextColor) &&
          canUseTextColor &&
          (plan.forceTextPrompt || Math.random() < (Number(options.textColorChance) || 0));
        if (applyTextColor) {
          const usedLabels =
            options && options.textColorUniqueLabelsPerRound && options._textColorUsedLabels
              ? options._textColorUsedLabels
              : null;
          const avoidHex = options && options.textColorAvoidCardBackground
            ? (item.color || item.backgroundColorHex || getCardBackgroundHex())
            : "";
          const textColor = pickTextColor(usedLabels, avoidHex);
          if (textColor) {
            challenge.textColorLabel = textColor.label;
            challenge.textColorHex = textColor.color;
            if (usedLabels && textColor.label) {
              const key = String(textColor.label).toLowerCase();
              usedLabels.add(key);
              challenge._textColorUsedLabel = key;
            }
          }
          if (!challenge.achievementModifiers.includes("textColor")) {
            challenge.achievementModifiers.push("textColor");
          }
          const promptChance =
            typeof options.textPromptChance === "number" ? options.textPromptChance : 0.5;
          const shouldPrompt = options._useTextPromptPlan
            ? plan.forceTextPrompt
            : plan.forceTextPrompt || Math.random() < promptChance;
          if (shouldPrompt) {
            challenge.answer = textColor.label;
            challenge.recallHint = "Text color";
          }
        }
        if (item.category === "colors") {
          if (options.misleadColors) {
            const usePlan = Boolean(options._useMisleadPlan);
            const useMislead = usePlan
              ? plan.forceMislead
              : plan.forceMislead || Math.random() < options.misleadChance;
            if (useMislead) {
              const usedLabels =
                options &&
                (options.misleadUniqueLabelsPerRound || options.textLabelUniquePerRound) &&
                options._misleadUsedLabels
                  ? options._misleadUsedLabels
                  : null;
              challenge.misleadingLabel = pickMisleadingLabel(item.label, usedLabels);
              if (challenge.misleadingLabel && !challenge.achievementModifiers.includes("misleadColors")) {
                challenge.achievementModifiers.push("misleadColors");
              }
              if (usedLabels && challenge.misleadingLabel) {
                usedLabels.add(challenge.misleadingLabel);
              }
            }
          }
          challenge.textLabel = challenge.misleadingLabel || challenge.label;
          const allowBackground = Boolean(options.enableBackgroundColor);
          const bgChance =
            typeof options.backgroundColorChance === "number" ? options.backgroundColorChance : 0.5;
          const usePromptPlan = Boolean(options._useBackgroundPromptPlan);
          if (allowBackground) {
            challenge.colorTarget = usePromptPlan
              ? (plan.forceBackgroundPrompt ? "background" : "text")
              : (plan.forceBackgroundPrompt
                  ? "background"
                  : Math.random() < bgChance
                    ? "background"
                    : "text");
          } else {
            challenge.colorTarget = "text";
          }
          if (challenge.recallHint !== "Text color" && challenge.recallHint !== "Previous card") {
            if (challenge.colorTarget === "background") {
              challenge.answer = challenge.label;
              challenge.recallHint = "Background color";
              if (!challenge.achievementModifiers.includes("backgroundColor")) {
                challenge.achievementModifiers.push("backgroundColor");
              }
            } else {
              challenge.answer = challenge.textLabel;
              challenge.recallHint = "Text";
            }
          }
        } else if (options.enableBackgroundColor && item.category !== "aminoAcids") {
          const bgChance =
            typeof options.backgroundColorChance === "number" ? options.backgroundColorChance : 0.5;
          const usePromptPlan = Boolean(options._useBackgroundPromptPlan);
          const useBackgroundPlan = Boolean(options._useBackgroundColorPlan);
          const forceBackground = plan.forceBackgroundPrompt || plan.forceBackgroundColor;
          const shouldApplyBackground =
            forceBackground || (!useBackgroundPlan && Math.random() < bgChance);
          if (shouldApplyBackground) {
            const usedLabels =
              options && options.backgroundColorUniqueLabelsPerRound && options._backgroundColorUsedLabels
                ? options._backgroundColorUsedLabels
                : null;
            const historyLabels =
              options && options._backgroundColorHistory ? options._backgroundColorHistory : null;
            let combinedUsedLabels = null;
            if (historyLabels && historyLabels.size) {
              combinedUsedLabels = new Set(historyLabels);
            }
            if (usedLabels && usedLabels.size) {
              if (!combinedUsedLabels) {
                combinedUsedLabels = new Set();
              }
              usedLabels.forEach((label) => combinedUsedLabels.add(label));
            }
            const backgroundColor = pickBackgroundColorWithUsed(
              combinedUsedLabels || usedLabels,
              noRepeatBackgroundAcrossRounds ? previousBackgroundLabel : null
            ) || (noRepeatBackgroundAcrossRounds
              ? (pickBackgroundColorAvoiding(previousBackgroundLabel) || pickBackgroundColor())
              : pickBackgroundColor());
            challenge.backgroundColorLabel = backgroundColor.label;
            challenge.backgroundColorHex = backgroundColor.color;
            if (!challenge.achievementModifiers.includes("backgroundColor")) {
              challenge.achievementModifiers.push("backgroundColor");
            }
            if (usedLabels && backgroundColor.label) {
              usedLabels.add(String(backgroundColor.label).toLowerCase());
            }
            if (historyLabels && backgroundColor.label) {
              historyLabels.add(String(backgroundColor.label).toLowerCase());
            }
            if (noRepeatBackgroundAcrossRounds && backgroundColor.label && stage) {
              lastBackgroundColorLabel = backgroundColor.label;
              lastBackgroundColorStageId = stage.id;
            }
            if (
              options &&
              options.textColorAvoidCardBackground &&
              challenge.textColorHex &&
              challenge.backgroundColorHex &&
              String(challenge.textColorHex).toLowerCase() === String(challenge.backgroundColorHex).toLowerCase()
            ) {
              const usedLabels =
                options.textColorUniqueLabelsPerRound && options._textColorUsedLabels
                  ? options._textColorUsedLabels
                  : null;
              if (usedLabels && challenge._textColorUsedLabel) {
                usedLabels.delete(challenge._textColorUsedLabel);
                challenge._textColorUsedLabel = null;
              }
              const reroll = pickTextColor(usedLabels, challenge.backgroundColorHex);
              if (reroll) {
                challenge.textColorLabel = reroll.label;
                challenge.textColorHex = reroll.color;
                if (usedLabels && reroll.label) {
                  const key = String(reroll.label).toLowerCase();
                  usedLabels.add(key);
                  challenge._textColorUsedLabel = key;
                }
              }
            }
            const promptChance =
              typeof options.backgroundPromptChance === "number" ? options.backgroundPromptChance : 0.5;
            const shouldPrompt = usePromptPlan
              ? plan.forceBackgroundPrompt
              : plan.forceBackgroundPrompt || Math.random() < promptChance;
            if (
              shouldPrompt &&
              challenge.recallHint !== "Text color" &&
              challenge.recallHint !== "Previous card"
            ) {
              challenge.answer = backgroundColor.label;
              challenge.recallHint = "Background color";
            }
          }
        }
        if (options && options.textColorMatchCardBackground) {
          const matchLabel = item.category === "colors"
            ? item.label
            : (challenge.backgroundColorLabel || item.backgroundColorLabel);
          const matchHex = item.category === "colors"
            ? item.color
            : (challenge.backgroundColorHex || item.backgroundColorHex);
          if (matchLabel && matchHex) {
            const usedLabels =
              options.textColorUniqueLabelsPerRound && options._textColorUsedLabels
                ? options._textColorUsedLabels
                : null;
            if (usedLabels && challenge._textColorUsedLabel) {
              usedLabels.delete(challenge._textColorUsedLabel);
              challenge._textColorUsedLabel = null;
            }
            if (usedLabels) {
              const key = String(matchLabel).toLowerCase();
              usedLabels.add(key);
              challenge._textColorUsedLabel = key;
            }
            challenge.textColorLabel = matchLabel;
            challenge.textColorHex = matchHex;
            if (!challenge.achievementModifiers.includes("textColor")) {
              challenge.achievementModifiers.push("textColor");
            }
            if (challenge.recallHint === "Text color") {
              challenge.answer = matchLabel;
            }
          }
        }
        if (challenge.recallHint === "Text color" && challenge.textColorLabel) {
          challenge.answer = challenge.textColorLabel;
        }
        return challenge;
      }

      function clampCount(value) {
        return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : null;
      }

      function shuffleArray(list) {
        for (let i = list.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [list[i], list[j]] = [list[j], list[i]];
        }
        return list;
      }

      function selectModifierIndices(eligible, chance, minCount, maxCount) {
        const min = clampCount(minCount);
        let max = clampCount(maxCount);
        if (max !== null && min !== null && max < min) {
          max = min;
        }
        const pool = shuffleArray([...eligible]);
        const selected = new Set();
        if (min !== null) {
          for (let i = 0; i < min && i < pool.length; i += 1) {
            selected.add(pool[i]);
          }
        }
        const limit = max !== null ? Math.min(max, pool.length) : pool.length;
        const baseChance =
          typeof chance === "number" ? Math.max(0, Math.min(1, chance)) : 1;
        for (let i = 0; i < pool.length && selected.size < limit; i += 1) {
          const idx = pool[i];
          if (selected.has(idx)) continue;
          if (Math.random() < baseChance) {
            selected.add(idx);
          }
        }
        return selected;
      }

      function planModifierAssignments(items, options) {
        const plan = items.map(() => ({
          forceMislead: false,
          forceBackgroundPrompt: false,
          forceBackgroundColor: false,
          forceTextPrompt: false,
          forcePreviousPrompt: false,
          forceSequence: false,
          positionIndex: 0
        }));
        plan.forEach((entry, index) => {
          entry.positionIndex = index;
        });
        const selectedTextPromptIndices = new Set();
        let rotatePlanSelected = null;
        let rotatePlusPlanSelected = null;
        if (options && options.misleadColors) {
          const min = clampCount(options.misleadMinCount);
          const max = clampCount(options.misleadMaxCount);
          if (min !== null || max !== null) {
            options._useMisleadPlan = true;
            const eligible = items
              .map((item, index) => (item.category === "colors" ? index : null))
              .filter((index) => index !== null);
            const selected = selectModifierIndices(eligible, options.misleadChance, min, max);
            selected.forEach((index) => {
              plan[index].forceMislead = true;
            });
          }
        }
        if (options && (options.enableRotate || options.enableRotatePlus)) {
          const rotateMin = clampCount(options.rotateMinCount);
          const rotateMax = clampCount(options.rotateMaxCount);
          const rotatePlusMin = clampCount(options.rotatePlusMinCount);
          const rotatePlusMax = clampCount(options.rotatePlusMaxCount);
          const rotateChance =
            typeof options.rotateChance === "number" ? Math.max(0, Math.min(1, options.rotateChance)) : null;
          const rotatePlusChance =
            typeof options.rotatePlusChance === "number" ? Math.max(0, Math.min(1, options.rotatePlusChance)) : null;
          const hasRotateConstraints = rotateMin !== null || rotateMax !== null || rotateChance !== null;
          const hasRotatePlusConstraints = rotatePlusMin !== null || rotatePlusMax !== null || rotatePlusChance !== null;
          if (hasRotateConstraints || hasRotatePlusConstraints) {
            const eligible = items
              .map((item, index) =>
                item && (item.category === "directions" || item.category === "diagonal") ? index : null
              )
              .filter((index) => index !== null);
            let remaining = eligible.slice();
            if (options.enableRotatePlus) {
              const rotatePlusChanceValue = rotatePlusChance !== null ? rotatePlusChance : 1;
              const pickedPlus = selectModifierIndices(remaining, rotatePlusChanceValue, rotatePlusMin, rotatePlusMax);
              rotatePlusPlanSelected = new Set(pickedPlus);
              remaining = remaining.filter((index) => !rotatePlusPlanSelected.has(index));
              options._useRotatePlan = true;
              options._useRotatePlusPlan = true;
            }
            if (options.enableRotate) {
              const rotateChanceValue = rotateChance !== null ? rotateChance : 1;
              const pickedBase = selectModifierIndices(remaining, rotateChanceValue, rotateMin, rotateMax);
              rotatePlanSelected = new Set(pickedBase);
              options._useRotatePlan = true;
            }
            if (rotatePlanSelected) {
              options._rotatePlanSelected = rotatePlanSelected;
            }
            if (rotatePlusPlanSelected) {
              options._rotatePlusPlanSelected = rotatePlusPlanSelected;
            }
          }
        }
        if (options && options.enableTextColor) {
          const min = clampCount(options.textPromptMinCount);
          const max = clampCount(options.textPromptMaxCount);
          if (min !== null || max !== null) {
            options._useTextPromptPlan = true;
            const eligible = items
              .map((item, index) =>
                (["numbers", "letters", "greekLetters", "colors"].includes(item.category) ? index : null)
              )
              .filter((index) => index !== null);
            const selected = selectModifierIndices(eligible, options.textPromptChance, min, max);
            selected.forEach((index) => {
              plan[index].forceTextPrompt = true;
              selectedTextPromptIndices.add(index);
            });
            options._textPromptSelectedIndices = selectedTextPromptIndices;
          }
        }
        if (options && options.enableBackgroundColor) {
          const minColor = clampCount(options.backgroundColorMinCount);
          const maxColor = clampCount(options.backgroundColorMaxCount);
          if (minColor !== null || maxColor !== null) {
            options._useBackgroundColorPlan = true;
            const eligible = items
              .map((item, index) => (["colors", "aminoAcids"].includes(item.category) ? null : index))
              .filter((index) => index !== null);
            if (eligible.length) {
              const selected = selectModifierIndices(eligible, options.backgroundColorChance, minColor, maxColor);
              selected.forEach((index) => {
                plan[index].forceBackgroundColor = true;
              });
            }
          }
          const min = clampCount(options.backgroundPromptMinCount);
          const max = clampCount(options.backgroundPromptMaxCount);
          if (min !== null || max !== null) {
            options._useBackgroundPromptPlan = true;
            let eligible = items.map((item, index) => item.category === "aminoAcids" ? null : index)
              .filter((index) => index !== null);
            if (options._useBackgroundColorPlan) {
              const forcedBackground = items
                .map((_, index) => (plan[index].forceBackgroundColor ? index : null))
                .filter((index) => index !== null);
              if (forcedBackground.length) {
                eligible = forcedBackground;
              }
            }
            const requireMathPrompts =
              (options.enableMathOps || options.enableMathOpsPlus) &&
              typeof options.mathMinCount === "number" &&
              options.mathMinCount > 0;
            const requireRotatePrompts =
              (options.enableRotate || options.enableRotatePlus) &&
              (
                (typeof options.rotateMinCount === "number" && options.rotateMinCount > 0) ||
                (typeof options.rotatePlusMinCount === "number" && options.rotatePlusMinCount > 0)
              );
            const rotateLocked = new Set();
            if (rotatePlanSelected) {
              rotatePlanSelected.forEach((index) => rotateLocked.add(index));
            }
            if (rotatePlusPlanSelected) {
              rotatePlusPlanSelected.forEach((index) => rotateLocked.add(index));
            }
            const minRequired = min ?? 0;
            const filterEligible = (list, config) => {
              const avoidNumbers = Boolean(config && config.avoidNumbers);
              const avoidRotate = Boolean(config && config.avoidRotate);
              const avoidText = Boolean(config && config.avoidText);
              const avoidRotateSelected = Boolean(config && config.avoidRotateSelected);
              return list.filter((index) => {
                if (avoidText && selectedTextPromptIndices.has(index)) return false;
                if (avoidRotateSelected && rotateLocked.has(index)) return false;
                const item = items[index];
                if (!item) return false;
                if (avoidNumbers && item.category === "numbers") return false;
                if (avoidRotate && (item.category === "directions" || item.category === "diagonal")) return false;
                return true;
              });
            };
            const baseEligible = eligible.slice();
            let filtered = filterEligible(baseEligible, {
              avoidNumbers: requireMathPrompts,
              avoidRotate: requireRotatePrompts,
              avoidText: selectedTextPromptIndices.size > 0,
              avoidRotateSelected: rotateLocked.size > 0
            });
            if (filtered.length >= minRequired) {
              eligible = filtered;
            } else {
              filtered = filterEligible(baseEligible, {
                avoidNumbers: false,
                avoidRotate: requireRotatePrompts,
                avoidText: selectedTextPromptIndices.size > 0,
                avoidRotateSelected: rotateLocked.size > 0
              });
              if (filtered.length >= minRequired) {
                eligible = filtered;
              } else {
                filtered = filterEligible(baseEligible, {
                  avoidNumbers: false,
                  avoidRotate: false,
                  avoidText: selectedTextPromptIndices.size > 0,
                  avoidRotateSelected: rotateLocked.size > 0
                });
                if (filtered.length) {
                  eligible = filtered;
                }
              }
            }
            const selected = selectModifierIndices(eligible, options.backgroundPromptChance, min, max);
            selected.forEach((index) => {
              plan[index].forceBackgroundPrompt = true;
            });
          }
        }
        const previousRoundItems =
          typeof window.getPreviousRoundItems === "function" ? window.getPreviousRoundItems() : null;
        if (options && options.enablePreviousCard && Array.isArray(previousRoundItems) && previousRoundItems.length) {
          const min = clampCount(options.previousPromptMinCount);
          const max = clampCount(options.previousPromptMaxCount);
          if (min !== null || max !== null) {
            options._usePreviousPromptPlan = true;
            const eligible = items.map((_, index) => index);
            const selected = selectModifierIndices(eligible, options.previousCardChance, min, max);
            selected.forEach((index) => {
              plan[index].forcePreviousPrompt = true;
            });
          }
        }
        return plan;
      }

      function applySequenceModifier(items, options) {
        sequenceModifierConfig = null;
        if (!options || !options.enableSequence) return items;
        const pool = Array.isArray(options.sequencePool) && options.sequencePool.length
          ? options.sequencePool.filter((key) => dataSets[key])
          : getActiveCategories(round);
        const stepsCount = clampCount(options.sequenceSteps) ?? 3;
        const stepSeconds = typeof options.sequenceStepSeconds === "number" ? options.sequenceStepSeconds : 0.2;
        const stepHoldSeconds =
          typeof options.sequenceStepHoldSeconds === "number" ? options.sequenceStepHoldSeconds : 0.2;
        const finalHoldSeconds =
          typeof options.sequenceFinalHoldSeconds === "number" ? options.sequenceFinalHoldSeconds : 0.5;
        let min = clampCount(options.sequenceMinCount);
        let max = clampCount(options.sequenceMaxCount);
        if (gameMode !== "stages") {
          const total = Array.isArray(items) ? items.length : 0;
          if (total <= 8) {
            min = 1;
            max = 1;
          } else {
            min = 1;
            if (max === null) {
              max = total;
            }
          }
        }
        if (min === null && max === null) {
          min = 1;
          max = 1;
        }
        const eligible = items.map((_, index) => index);
        const selected = selectModifierIndices(eligible, 1, min, max);
        if (!selected.size) return items;
        sequenceModifierConfig = {
          steps: stepsCount,
          stepSeconds,
          stepHoldSeconds,
          finalHoldSeconds
        };
        return items.map((item, index) => {
          if (!selected.has(index)) return item;
          const steps = [];
          let previousKey = "";
          for (let i = 0; i < stepsCount; i += 1) {
            const step = pickSequenceStepItem(pool, previousKey);
            if (step) {
              steps.push(step);
              previousKey = buildSequenceStepKey(step);
            }
          }
          if (!steps.length) return item;
          const answer = steps.map(buildSequenceInitial).join("");
          const achievementModifiers = Array.isArray(item.achievementModifiers)
            ? item.achievementModifiers.slice()
            : [];
          if (!achievementModifiers.includes("sequence")) {
            achievementModifiers.push("sequence");
          }
          return {
            ...item,
            sequenceSteps: steps,
            sequenceAnswer: answer,
            answer,
            recallHint: "Sequence",
            achievementModifiers
          };
        });
      }

      function buildItemKey(category, label) {
        const value = String(label || "").trim();
        if (!value) return String(category || "").toLowerCase();
        return value[0].toLowerCase();
      }

      function buildAnswerInitial(item) {
        if (!item) return "";
        const value = item.answer ?? item.label ?? "";
        const normalized = normalize(String(value));
        return normalized ? normalized[0] : "";
      }

      function buildSequenceInitial(step) {
        if (!step) return "";
        const value = step.answer ?? step.textLabel ?? step.label ?? step.symbol ?? "";
        const normalized = normalize(String(value));
        if (!normalized) return "";
        const category = String(step.answerCategory || step.category || "").toLowerCase();
        if (category === "aminoacids") {
          return normalize(step.oneLetterCode || normalized[0]);
        }
        if (category === "diagonal") {
          return normalized.replace(/\s+/g, "");
        }
        if (category === "numbers") {
          return normalized;
        }
        return normalized[0];
      }

      function getSequenceStepTokens(step) {
        if (!step) return [];
        const tokens = new Set();
        const category = String(step.answerCategory || step.category || "").toLowerCase();
        const label = normalize(String(step.label ?? step.answer ?? step.textLabel ?? ""));
        if (category === "aminoacids") {
          return getAminoAcidAnswerTokens(step).map(token => token.replace(/\s+/g, ""));
        }
        if (category === "diagonal") {
          const compact = label.replace(/\s+/g, "");
          if (compact) tokens.add(compact);
          const arrowPairs = {
            ne: ["\u2191\u2192", "\u2192\u2191"],
            nw: ["\u2191\u2190", "\u2190\u2191"],
            se: ["\u2193\u2192", "\u2192\u2193"],
            sw: ["\u2193\u2190", "\u2190\u2193"]
          };
          const allowed = arrowPairs[compact];
          if (Array.isArray(allowed)) {
            allowed.forEach((value) => tokens.add(value));
          }
          return Array.from(tokens).filter(Boolean);
        }
        if (category === "directions") {
          if (label) {
            tokens.add(label[0]);
          }
          const arrowMap = {
            up: "\u2191",
            down: "\u2193",
            left: "\u2190",
            right: "\u2192"
          };
          const cardinalMap = { up: "n", right: "e", down: "s", left: "w" };
          if (arrowMap[label]) tokens.add(arrowMap[label]);
          if (cardinalMap[label]) tokens.add(cardinalMap[label]);
          return Array.from(tokens).filter(Boolean);
        }
        if (category === "numbers") {
          if (label) tokens.add(label);
          return Array.from(tokens);
        }
        const initial = buildSequenceInitial(step);
        if (initial) tokens.add(initial);
        return Array.from(tokens).filter(Boolean);
      }

      function matchesSequenceAnswer(actualInput, item) {
        if (!item || !Array.isArray(item.sequenceSteps) || !item.sequenceSteps.length) return false;
        const actual = normalize(String(actualInput || "")).replace(/\s+/g, "");
        if (!actual) return false;
        const expected = normalize(String(item.answer ?? "")).replace(/\s+/g, "");
        if (expected && actual === expected) return true;
        let positions = new Set([0]);
        for (const step of item.sequenceSteps) {
          const tokens = getSequenceStepTokens(step);
          if (!tokens.length) return false;
          const next = new Set();
          positions.forEach((pos) => {
            tokens.forEach((token) => {
              if (actual.startsWith(token, pos)) {
                next.add(pos + token.length);
              }
            });
          });
          positions = next;
          if (!positions.size) return false;
        }
        return positions.has(actual.length);
      }

      function buildSequenceStepKey(step) {
        if (!step) return "";
        const category = step.category ? String(step.category).toLowerCase() : "";
        const label = step.label ? String(step.label).toLowerCase() : "";
        return `${category}:${label}`;
      }

      function pickSequenceStepItem(pool, avoidKey = "") {
        const categories = Array.isArray(pool) ? pool.filter((key) => dataSets[key]) : [];
        if (!categories.length) return null;
        let lastCandidate = null;
        const maxAttempts = 8;
        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
          const category = categories[Math.floor(Math.random() * categories.length)];
          const list = dataSets[category];
          if (!Array.isArray(list) || !list.length) continue;
          const rawItem = list[Math.floor(Math.random() * list.length)];
          const item = typeof rawItem === "string" ? { label: rawItem } : { ...rawItem };
          const candidate = { ...item, category };
          lastCandidate = candidate;
          if (!avoidKey || buildSequenceStepKey(candidate) !== avoidKey) {
            return candidate;
          }
        }
        return lastCandidate;
      }

      function pickBackgroundColorAvoiding(previousLabel) {
        if (typeof pickBackgroundColor !== "function") return null;
        const safePrev = previousLabel ? String(previousLabel).toLowerCase() : "";
        if (!safePrev) return pickBackgroundColor();
        const list = Array.isArray(backgroundColors) ? backgroundColors : null;
        if (!list || list.length <= 1) return pickBackgroundColor();
        const filtered = list.filter((entry) => {
          if (!entry || !entry.label) return false;
          return String(entry.label).toLowerCase() !== safePrev;
        });
        if (!filtered.length) return pickBackgroundColor();
        return filtered[Math.floor(Math.random() * filtered.length)];
      }

      function pickBackgroundColorWithUsed(usedLabels, avoidLabel) {
        const list = Array.isArray(backgroundColors) ? backgroundColors : [];
        if (!list.length) return null;
        const normalizeLabel = (value) => String(value || "").trim().toLowerCase();
        const avoidValue = normalizeLabel(avoidLabel);
        let pool = list;
        if (usedLabels && usedLabels.size) {
          const filtered = pool.filter((entry) => {
            if (!entry || !entry.label) return false;
            return !usedLabels.has(normalizeLabel(entry.label));
          });
          if (filtered.length) {
            pool = filtered;
          }
        }
        if (avoidValue) {
          const filtered = pool.filter((entry) => {
            if (!entry || !entry.label) return false;
            return normalizeLabel(entry.label) !== avoidValue;
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

      function pickItems(attempt = 0) {
        const options = getChallengeOptions(round);
        if (options && (options.misleadUniqueLabelsPerRound || options.textLabelUniquePerRound)) {
          options._misleadUsedLabels = new Set();
        }
        if (options && options.textColorUniqueLabelsPerRound) {
          options._textColorUsedLabels = new Set();
        }
        if (options && options.backgroundColorUniqueLabelsPerRound) {
          options._backgroundColorUsedLabels = new Set();
        }
        const stage = gameMode === "stages" && window.getStageConfig
          ? window.getStageConfig(stageState.index)
          : null;
        if (gameMode === "stages" && stage && options && options.rotateNoRepeatPromptsAcrossRounds) {
          if (rotatePromptHistoryStageId !== stage.id || round === 1) {
            rotatePromptHistory = new Set();
            rotatePromptHistoryStageId = stage.id;
          }
          options._rotatePromptHistory = rotatePromptHistory;
        }
        if (gameMode === "stages" && stage && stage.noRepeatBackgroundAcrossRounds) {
          if (backgroundColorHistoryStageId !== stage.id || round === 1) {
            backgroundColorHistory = new Set();
            backgroundColorHistoryStageId = stage.id;
          }
          options._backgroundColorHistory = backgroundColorHistory;
        }
        const enforceAnswerInitials =
          gameMode === "stages" && stage && stage.noRepeatAnswerInitialsAcrossRounds === true;
        const enforceUniqueInitials =
          gameMode === "stages" && stage && stage.noDuplicateAnswerInitialsPerRound === true;
        const previousAnswerInitials =
          enforceAnswerInitials && lastAnswerInitialsStageId === stage.id ? lastAnswerInitials : null;
        const roundOverride =
          stage && typeof window.getStageRoundOverride === "function"
            ? window.getStageRoundOverride(stage, round)
            : null;
        const overrideCardCounts =
          roundOverride && roundOverride.cards && typeof roundOverride.cards.counts === "object"
            ? roundOverride.cards.counts
            : null;
        const cardCounts = overrideCardCounts ||
          (gameMode === "stages" && window.getStageCardCounts
            ? window.getStageCardCounts(stage)
            : null);
        const overrideTotal =
          roundOverride && roundOverride.cards && Number(roundOverride.cards.total);
        const uniqueCardTypesPerRound =
          gameMode === "stages" && stage && stage.uniqueCardTypesPerRound === true;
        let categories = getActiveCategories(round);
        let forcedCategory = null;
        if (gameMode === "stages" && stage && Number(stage.rounds) > 1) {
          const perRoundGuarantee = Array.isArray(stage.roundCategoryGuarantee)
            ? stage.roundCategoryGuarantee.filter((key) => typeof key === "string")
            : null;
          const cardCount = Number.isFinite(overrideTotal) && overrideTotal > 0
            ? overrideTotal
            : (window.getStageCardCount ? window.getStageCardCount(stage) : stage.cards || 1);
          if (perRoundGuarantee && perRoundGuarantee.length && Number(cardCount) === 1) {
            const stageCategories = window.getStageCategories ? window.getStageCategories(stage) : categories;
            const required = perRoundGuarantee.filter((key) => stageCategories.includes(key));
            if (stageCategoryQueueStageId !== stage.id || round === 1) {
              const queue = shuffleArray([...required]);
              const totalRounds = Number(stage.rounds) || 1;
              const remaining = Math.max(0, totalRounds - queue.length);
              for (let i = 0; i < remaining; i += 1) {
                const pick = stageCategories[Math.floor(Math.random() * stageCategories.length)];
                queue.push(pick);
              }
              stageCategoryQueue = queue;
              stageCategoryQueueIndex = 0;
              stageCategoryQueueStageId = stage.id;
            }
            if (Array.isArray(stageCategoryQueue) && stageCategoryQueue.length) {
              forcedCategory = stageCategoryQueue[stageCategoryQueueIndex] || null;
              stageCategoryQueueIndex = Math.min(stageCategoryQueueIndex + 1, stageCategoryQueue.length);
            }
          }
        }
        if (cardCounts && typeof cardCounts === "object") {
          const extra = Object.keys(cardCounts).filter((key) => dataSets[key]);
          categories = Array.from(new Set([...categories, ...extra]));
        }
        if (!categories.length) {
          categories = ["numbers"];
        }
        if (forcedCategory && categories.includes(forcedCategory)) {
          categories = [forcedCategory];
        }
        const count =
          gameMode === "aminoAcids"
            ? Number(aminoCardCountInput.value || 1)
            : gameMode === "practice"
            ? Number(cardCountInput.value || 4)
            : gameMode === "stages"
                ? (window.getStageCardCount
                    ? window.getStageCardCount(
                        stage
                      )
                    : 4)
                : 1;
        const resolvedCount = Number.isFinite(overrideTotal) && overrideTotal > 0
          ? overrideTotal
          : count;
        const fixedCards =
          gameMode === "stages" && stage && Array.isArray(stage.fixedCards) ? stage.fixedCards : null;
        const uniquePool = categories.reduce((total, category) => {
          const list = dataSets[category];
          return total + (Array.isArray(list) ? list.length : 0);
        }, 0);
        const targetCount = Math.max(1, resolvedCount);
        const getCategoryPool = (category) => {
          const list = dataSets[category];
          // Exclude the actual preceding single card before sampling, rather
          // than retrying random picks and occasionally selecting it again.
          const previous = roundItemsBase.length === 1 ? roundItemsBase[0] : null;
          if (targetCount === 1 && category === "aminoAcids" && previous?.category === "aminoAcids" && Array.isArray(list)) {
            const alternatives = list.filter(entry => entry.label !== previous.label);
            if (alternatives.length) return alternatives;
          }
          return list;
        };
        const allowDuplicates = uniquePool > 0 && count > uniquePool;
        const noRepeatAcrossRounds =
          gameMode === "stages" && stage && stage.noRepeatAcrossRounds === true;
        const noRepeatABAPatterns =
          gameMode === "stages" && stage && stage.noRepeatABAPatterns === true;
        const noAdjacentAnswerKeys =
          gameMode === "stages" && stage && stage.noAdjacentAnswerKeys === true;
        const preventImmediateRepeat = noRepeatAcrossRounds || noRepeatABAPatterns;
        const previousKeysByIndex =
          preventImmediateRepeat &&
          lastRoundStageId === (stage && stage.id) &&
          Array.isArray(lastRoundItems) &&
          lastRoundItems.length
            ? lastRoundItems.map((item) => buildItemKey(item.category, item.label))
            : null;
        const previousPreviousKeysByIndex =
          noRepeatABAPatterns &&
          priorRoundStageId === (stage && stage.id) &&
          Array.isArray(priorRoundItems) &&
          priorRoundItems.length
            ? priorRoundItems.map((item) => buildItemKey(item.category, item.label))
            : null;
        const chosen = [];
        const used = new Set();
        const usedCategories = new Set();
        const treatDirectionalAsOne =
          uniqueCardTypesPerRound &&
          stage &&
          Array.isArray(stage.categories) &&
          stage.categories.includes("directions") &&
          stage.categories.includes("diagonal");
        const getCategoryGroup = (category) => {
          if (treatDirectionalAsOne && (category === "directions" || category === "diagonal")) {
            return "directional";
          }
          return category;
        };
        const noteCategoryUsed = (category) => {
          if (uniqueCardTypesPerRound) {
            usedCategories.add(getCategoryGroup(category));
          }
        };
        const findFixedItem = (category, label) => {
          const list = dataSets[category];
          if (!Array.isArray(list) || !list.length) {
            return { label };
          }
          const match = list.find((entry) => {
            if (typeof entry === "string") {
              return entry === label;
            }
            return entry && entry.label === label;
          });
          if (!match) {
            return { label };
          }
          return typeof match === "string" ? { label: match } : { ...match };
        };
        const pickFromCategory = (category) => {
          const list = getCategoryPool(category);
          if (!Array.isArray(list) || !list.length) return false;
          if (uniqueCardTypesPerRound && usedCategories.has(getCategoryGroup(category))) return false;
          const lastChosen = chosen.length ? chosen[chosen.length - 1] : null;
          const lastKey = lastChosen ? buildItemKey(lastChosen.category, lastChosen.label) : null;
          let pool = list;
          if (noAdjacentAnswerKeys && lastKey) {
            const filtered = list.filter((entry) => {
              const label = typeof entry === "string" ? entry : (entry && entry.label);
              const key = buildItemKey(category, label);
              return key && key !== lastKey;
            });
            if (filtered.length) {
              pool = filtered;
            }
          }
          const maxAttempts = Math.min(10, pool.length);
          for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
            const rawItem = pool[Math.floor(Math.random() * pool.length)];
            const item = typeof rawItem === "string" ? { label: rawItem } : rawItem;
            const key = `${category}-${item.label}`.toLowerCase();
            if (!allowDuplicates && used.has(key)) continue;
            if (!allowDuplicates) {
              used.add(key);
            }
            chosen.push({ ...item, category });
            noteCategoryUsed(category);
            return true;
          }
          return false;
        };
        if (fixedCards && fixedCards.length) {
          fixedCards.slice(0, targetCount).forEach((entry) => {
            if (!entry || typeof entry.category !== "string" || typeof entry.label !== "string") return;
            const item = findFixedItem(entry.category, entry.label);
            const key = `${entry.category}-${item.label}`.toLowerCase();
            if (uniqueCardTypesPerRound && usedCategories.has(getCategoryGroup(entry.category))) return;
            if (!allowDuplicates && used.has(key)) return;
            used.add(key);
            chosen.push({ ...item, category: entry.category });
            noteCategoryUsed(entry.category);
          });
        }
        if (cardCounts && typeof cardCounts === "object") {
          Object.entries(cardCounts).forEach(([category, minCount]) => {
            if (!dataSets[category]) return;
            const needed = Math.max(0, Math.floor(Number(minCount) || 0));
            for (let i = 0; i < needed && chosen.length < targetCount; i += 1) {
              let attempts = 0;
              while (!pickFromCategory(category) && attempts < 10) {
                attempts += 1;
              }
            }
          });
        }
        let remainingUniqueCategories = null;
        if (uniqueCardTypesPerRound) {
          remainingUniqueCategories = shuffleArray(
            categories.filter((category) => !usedCategories.has(getCategoryGroup(category)))
          );
        }
        let fillGuard = 0;
        const maxFillGuard = 200;
        while (chosen.length < targetCount) {
          if (fillGuard >= maxFillGuard) break;
          const category = uniqueCardTypesPerRound &&
            remainingUniqueCategories &&
            remainingUniqueCategories.length
            ? remainingUniqueCategories.pop()
            : categories[Math.floor(Math.random() * categories.length)];
          const picked = pickFromCategory(category);
          if (!picked) {
            fillGuard += 1;
            continue;
          }
          fillGuard = 0;
        }
        const canShuffle = !fixedCards || !fixedCards.length;
        if (canShuffle) {
          const shuffleInPlace = (list) => {
            for (let i = list.length - 1; i > 0; i -= 1) {
              const j = Math.floor(Math.random() * (i + 1));
              [list[i], list[j]] = [list[j], list[i]];
            }
          };
          const hasSameSlotRepeat = (list) => {
            const hasPrev = Array.isArray(previousKeysByIndex) && previousKeysByIndex.length;
            const hasPrevPrev = Array.isArray(previousPreviousKeysByIndex) && previousPreviousKeysByIndex.length;
            if (!hasPrev && !hasPrevPrev) return false;
            const limit = Math.min(list.length, hasPrev ? previousKeysByIndex.length : list.length, hasPrevPrev ? previousPreviousKeysByIndex.length : list.length);
            for (let i = 0; i < limit; i += 1) {
              const key = buildItemKey(list[i].category, list[i].label);
              if (hasPrev) {
                const prevKey = previousKeysByIndex[i];
                if (prevKey && key === prevKey) return true;
              }
              if (hasPrevPrev) {
                const prevPrevKey = previousPreviousKeysByIndex[i];
                if (prevPrevKey && key === prevPrevKey) return true;
              }
            }
            return false;
          };
          const hasAdjacentKeyRepeat = (list) => {
            if (!noAdjacentAnswerKeys) return false;
            if (!Array.isArray(list) || list.length < 2) return false;
            let lastKey = buildItemKey(list[0].category, list[0].label);
            for (let i = 1; i < list.length; i += 1) {
              const key = buildItemKey(list[i].category, list[i].label);
              if (key && lastKey && key === lastKey) return true;
              lastKey = key;
            }
            return false;
          };
          const needsShuffleValidation =
            (previousKeysByIndex && previousKeysByIndex.length) ||
            (previousPreviousKeysByIndex && previousPreviousKeysByIndex.length) ||
            noAdjacentAnswerKeys;
          if (needsShuffleValidation) {
            const maxAttempts = 10;
            if (chosen.length <= 1) {
              const prevKey = previousKeysByIndex ? previousKeysByIndex[0] : null;
              const prevPrevKey = previousPreviousKeysByIndex ? previousPreviousKeysByIndex[0] : null;
              const currentKey = buildItemKey(chosen[0].category, chosen[0].label);
              if ((prevKey && currentKey === prevKey) || (prevPrevKey && currentKey === prevPrevKey)) {
                let replacement = null;
                for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
                  const category = categories[Math.floor(Math.random() * categories.length)];
                  const list = getCategoryPool(category);
                  if (!Array.isArray(list) || !list.length) continue;
                  const rawItem = list[Math.floor(Math.random() * list.length)];
                  const item = typeof rawItem === "string" ? { label: rawItem } : rawItem;
                  const key = buildItemKey(category, item.label);
                  if (prevKey && key === prevKey) continue;
                  if (prevPrevKey && key === prevPrevKey) continue;
                  replacement = { ...item, category };
                  break;
                }
                if (replacement) {
                  chosen[0] = replacement;
                }
              }
            } else {
              let candidate = chosen.slice();
              let fallback = candidate.slice();
              let satisfied = false;
              for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
                shuffleInPlace(candidate);
                fallback = candidate.slice();
                if (!hasSameSlotRepeat(candidate) && !hasAdjacentKeyRepeat(candidate)) {
                  satisfied = true;
                  break;
                }
              }
              const result = satisfied ? candidate : fallback;
              chosen.length = 0;
              chosen.push(...result);
            }
          } else {
            shuffleInPlace(chosen);
          }
        }
        const plan = planModifierAssignments(chosen, options);
        if (options && options.backgroundColorUniqueLabelsPerRound && options._backgroundColorUsedLabels) {
          chosen.forEach((item) => {
            if (!item || item.category !== "colors" || !item.label) return;
            options._backgroundColorUsedLabels.add(String(item.label).toLowerCase());
          });
        }
        const built = chosen.map((item, index) => maybeConvertToCatCard(buildChallenge(item, options, plan[index])));
        if (
          built.some((item) => item && item.specialType === "cat") &&
          typeof window.recordCatSecretFound === "function"
        ) {
          window.recordCatSecretFound();
        }
        if (options && (options.misleadUniqueLabelsPerRound || options.textLabelUniquePerRound)) {
          const used = new Set();
          built.forEach((item) => {
            if (!item || item.category !== "colors" || !item.misleadingLabel) return;
            const current = item.textLabel || item.misleadingLabel;
            if (!current) return;
            if (!used.has(current)) {
              used.add(current);
              return;
            }
            const next = pickMisleadingLabel(item.label, used);
            if (!next) return;
            item.misleadingLabel = next;
            item.textLabel = next;
            if (item.recallHint === "Text") {
              item.answer = next;
            }
            used.add(next);
          });
        }
        if (options && options.textColorUniqueLabelsPerRound && Array.isArray(built)) {
          const usedLabels =
            options._textColorUsedLabels instanceof Set ? options._textColorUsedLabels : new Set();
          usedLabels.clear();
          const normalizeLabel = (value) => String(value || "").trim().toLowerCase();
          const maxAttempts = 6;
          built.forEach((item) => {
            if (!item || !item.textColorLabel) return;
            const currentLabel = normalizeLabel(item.textColorLabel);
            if (!currentLabel) return;
            if (!usedLabels.has(currentLabel)) {
              usedLabels.add(currentLabel);
              return;
            }
            const avoidHex = options.textColorAvoidCardBackground
              ? (item.color || item.backgroundColorHex || getCardBackgroundHex())
              : "";
            let replacement = null;
            for (let attemptIndex = 0; attemptIndex < maxAttempts; attemptIndex += 1) {
              const next = pickTextColor(usedLabels, avoidHex);
              if (!next || !next.label) continue;
              const nextLabel = normalizeLabel(next.label);
              if (!nextLabel || usedLabels.has(nextLabel)) continue;
              replacement = next;
              break;
            }
            if (replacement) {
              item.textColorLabel = replacement.label;
              item.textColorHex = replacement.color;
              usedLabels.add(normalizeLabel(replacement.label));
            } else {
              usedLabels.add(currentLabel);
            }
          });
        }
        if (options && options.textColorNoAdjacent && Array.isArray(built) && built.length > 1) {
          const maxAttempts = 5;
          for (let i = 1; i < built.length; i += 1) {
            const current = built[i];
            const previous = built[i - 1];
            if (!current || !previous) continue;
            if (!current.textColorLabel || !previous.textColorLabel) continue;
            const prevLabel = String(previous.textColorLabel).toLowerCase();
            const currentLabel = String(current.textColorLabel).toLowerCase();
            if (!prevLabel || !currentLabel || prevLabel !== currentLabel) continue;
            const usedLabels =
              options.textColorUniqueLabelsPerRound && options._textColorUsedLabels
                ? options._textColorUsedLabels
                : null;
            const tempSet = usedLabels || new Set();
            let addedPrev = false;
            if (!tempSet.has(prevLabel)) {
              tempSet.add(prevLabel);
              addedPrev = true;
            }
            const avoidHex = options.textColorAvoidCardBackground
              ? (current.color || current.backgroundColorHex || getCardBackgroundHex())
              : "";
            let replacement = null;
            for (let attemptIndex = 0; attemptIndex < maxAttempts; attemptIndex += 1) {
              const next = pickTextColor(tempSet, avoidHex);
              if (!next || !next.label) continue;
              const nextLabel = String(next.label).toLowerCase();
              if (!nextLabel || nextLabel === prevLabel) continue;
              replacement = next;
              if (usedLabels) {
                if (current._textColorUsedLabel) {
                  usedLabels.delete(current._textColorUsedLabel);
                }
                usedLabels.add(nextLabel);
                current._textColorUsedLabel = nextLabel;
              }
              break;
            }
            if (replacement) {
              current.textColorLabel = replacement.label;
              current.textColorHex = replacement.color;
            }
            if (addedPrev && !usedLabels) {
              tempSet.delete(prevLabel);
            }
          }
        }
        const rotated = applyRotationChallenges(built, options);
        const numbered = applyNumberChallenges(rotated, options);
        const result = applySequenceModifier(numbered, options);
        if ((enforceAnswerInitials || enforceUniqueInitials) && Array.isArray(result)) {
          const currentInitials = result.map(buildAnswerInitial);
          if (enforceUniqueInitials) {
            const seen = new Set();
            let duplicate = false;
            currentInitials.forEach((value) => {
              if (!value) return;
              if (seen.has(value)) {
                duplicate = true;
              }
              seen.add(value);
            });
            if (duplicate && attempt < 8) {
              return pickItems(attempt + 1);
            }
          }
          const limit = Array.isArray(previousAnswerInitials)
            ? Math.min(currentInitials.length, previousAnswerInitials.length)
            : 0;
          let conflict = false;
          for (let i = 0; i < limit; i += 1) {
            const current = currentInitials[i];
            const prev = previousAnswerInitials[i];
            if (current && prev && current === prev) {
              conflict = true;
              break;
            }
          }
          if (conflict && attempt < 8) {
            return pickItems(attempt + 1);
          }
          lastAnswerInitials = currentInitials;
          lastAnswerInitialsStageId = stage && stage.id ? stage.id : null;
        }
        return result;
      }


      function applyCardContent(card, item, show, index) {
        card.classList.remove("background-color", "card--text-color");
        card.style.background = "";
        card.style.color = "";
        applyCardColorVisionAssist(card, null, null);
        if (show) {
          if (item.specialType === "cat") {
            const src = item.specialImage || pickRareCatImage();
            card.innerHTML = `
              <img class="cat-image" src="${src}" alt="Cat" />
            `;
          } else if (item.category === "directions") {
            const rotation = getDirectionRotation(item.label);
            card.innerHTML = `
              <img
                class="direction-arrow"
                src="imgs/arrow.png"
                alt="${item.label}"
                style="transform: rotate(${rotation}deg);"
              />
            `;
          } else if (item.category === "diagonal") {
            const rotation = getDiagonalRotation(item.label);
            card.innerHTML = `
              <img
                class="direction-arrow"
                src="imgs/arrow.png"
                alt="${item.label}"
                style="transform: rotate(${rotation}deg);"
              />
            `;
          } else if (item.category === "greekLetters") {
            const symbol = item.symbol || item.label;
            card.innerHTML = `<span class="card-value">${symbol}</span>`;
          } else if (item.category === "shapes") {
            card.innerHTML = `${renderShapeSVG(item.shape)}`;
          } else if (item.category === "aminoAcids") {
            card.innerHTML = `<img class="amino-acid-image" src="${item.image}" alt="Amino acid structure" />`;
          } else if (item.category === "fruits") {
            const src = item.image || "";
            card.innerHTML = `
              <img class="fruit-image" src="${src}" alt="${item.label}" />
            `;
          } else {
            const cardLabel = item.textLabel ?? item.label;
            const symbol = item.symbol ? `${item.symbol} ` : "";
            card.innerHTML = `<span class="card-value">${symbol}${cardLabel}</span>`;
          }
          let fillCue = null;
          let textCue = null;
          if (item.specialType !== "cat") {
            if (item.color) {
              fillCue = getAccessibleColorEntry(item.label, item.color);
              card.style.background = fillCue.color;
              if (!item.textColorHex) {
                card.style.color = "#000";
              }
            } else if (item.backgroundColorHex) {
              fillCue = getAccessibleColorEntry(item.backgroundColorLabel, item.backgroundColorHex);
              card.style.background = fillCue.color;
              if (!item.textColorHex) {
                card.style.color = "#000";
              }
              card.classList.add("background-color");
            }
            if (item.textColorHex) {
              textCue = getAccessibleColorEntry(item.textColorLabel, item.textColorHex);
              card.style.color = textCue.color;
              card.classList.add("card--text-color");
            }
            applyCardColorVisionAssist(card, fillCue, textCue);
          }
          if (window.ScatterLayout) window.ScatterLayout.fitCardText(card);
          return;
        }
        if (item.aminoAnswerFormat) {
          card.innerHTML = "";
          return;
        }
        const safeIndex = Number.isFinite(index) ? index : 0;
        const cardLabel = `Card ${safeIndex + 1}`;
        const categoryLabel = item.specialType === "cat" ? "Cat" : formatCategoryLabel(item.category);
        if (item.specialType === "cat") {
          card.innerHTML = `
            <small>${cardLabel}</small>
            <span>Cat</span>
          `;
        } else if (item.recallHint) {
          const hintHtml = String(item.recallHint)
            .replace(/\u21bb/g, '<span class="rotation-icon">\u21bb</span>')
            .replace(/\u21ba/g, '<span class="rotation-icon">\u21ba</span>');
          card.innerHTML = `
            <small>${cardLabel}</small>
            <span>${hintHtml}</span>
          `;
        } else {
          card.innerHTML = `
            <small>${cardLabel}</small>
            <span>${categoryLabel}</span>
          `;
        }
      }

      function renderCards(show) {
        cardGrid.innerHTML = "";
        const glitchEnabled = show && getChallengeOptions(round).enableGlitch;
        roundItems.forEach((item, index) => {
          const card = document.createElement("div");
          const hintClass = !show && item.recallHint ? " hidden-card hint" : " hidden-card";
          card.className = `card ${show ? "" : hintClass}`.trim();
          card.classList.add("card--rise");
          if (glitchEnabled) {
            card.classList.add("glitch", "glitch-tv");
          }
          if (show && item.sequenceSteps && item.sequenceSteps.length) {
            card.dataset.sequence = "true";
          }
          card.style.order = index;
          card.dataset.index = index;
          const displayItem =
            show && item.sequenceSteps && item.sequenceSteps.length ? item.sequenceSteps[0] : item;
          card.classList.toggle("card--numbers", Boolean(displayItem && displayItem.category === "numbers"));
          applyCardContent(card, displayItem, show, index);
          cardGrid.appendChild(card);
          if (window.ScatterLayout) window.ScatterLayout.positionCard(card, item);
        });
      }

      function updateSequenceModifierCards(stepIndex) {
        if (!sequenceModifierActive || !cardGrid) return;
        const cards = Array.from(cardGrid.querySelectorAll(".card"));
        const sourceItems = sequenceModifierItems || roundItems;
        cards.forEach((card) => {
          const idx = Number(card.dataset.index);
          if (!Number.isFinite(idx)) return;
          const item = sourceItems[idx];
          if (!item || !Array.isArray(item.sequenceSteps) || !item.sequenceSteps.length) return;
          const stepItem = item.sequenceSteps[stepIndex] || item.sequenceSteps[item.sequenceSteps.length - 1];
          applyCardContent(card, stepItem, true, idx);
        });
      }

      function stopSequenceModifier() {
        sequenceModifierActive = false;
        sequenceModifierStepIndex = 0;
        sequenceModifierItems = null;
        if (sequenceModifierTimer) {
          clearTimeout(sequenceModifierTimer);
          sequenceModifierTimer = null;
        }
      }

      function startSequenceModifier(itemsOverride = null) {
        stopSequenceModifier();
        if (!sequenceModifierConfig || !sequenceModifierConfig.steps) return;
        sequenceModifierItems = Array.isArray(itemsOverride) ? itemsOverride : null;
        const sourceItems = sequenceModifierItems || roundItems;
        const hasSequence = Array.isArray(sourceItems) &&
          sourceItems.some((item) => item && Array.isArray(item.sequenceSteps) && item.sequenceSteps.length);
        if (!hasSequence) return;
        const stepMs = Math.max(0, sequenceModifierConfig.stepSeconds * 1000);
        const holdMs = Math.max(0, sequenceModifierConfig.stepHoldSeconds * 1000);
        const finalHoldMs = Math.max(0, sequenceModifierConfig.finalHoldSeconds * 1000);
        sequenceModifierActive = true;
        sequenceModifierStepIndex = 0;
        updateSequenceModifierCards(sequenceModifierStepIndex);
        const scheduleNext = () => {
          if (!sequenceModifierActive) return;
          const isLast = sequenceModifierStepIndex >= sequenceModifierConfig.steps - 1;
          const delay = stepMs + (isLast ? finalHoldMs : holdMs);
          sequenceModifierTimer = window.setTimeout(() => {
            if (!sequenceModifierActive) return;
            if (isLast) {
              sequenceModifierStepIndex = 0;
            } else {
              sequenceModifierStepIndex += 1;
            }
            updateSequenceModifierCards(sequenceModifierStepIndex);
            scheduleNext();
          }, delay);
        };
        scheduleNext();
      }

      window.refreshRenderedCardsForAppearance = function refreshRenderedCardsForAppearance() {
        if (!cardGrid || !cardGrid.children.length) return;
        const firstCard = cardGrid.children[0];
        const showingCards = !firstCard.classList.contains("hidden-card");
        renderCards(showingCards);
      };

      function renderInputs() {
        inputGrid.innerHTML = "";
        roundItems.forEach((item, index) => {
          const wrapper = document.createElement("div");
          wrapper.className = "input-slot";
          const input = document.createElement("input");
          input.type = "text";
          input.placeholder = "";
          input.dataset.index = index;
          if (item.aminoAnswerFormat) {
            input.id = `aminoAnswer-${index}`;
            input.autocomplete = "off";
            input.spellcheck = false;
            const prompt = document.createElement("label");
            prompt.className = "amino-answer-label";
            prompt.htmlFor = input.id;
            prompt.textContent = getAminoAcidAnswerFormatLabel(item);
            input.setAttribute("aria-label", `Card ${index + 1}: ${prompt.textContent}`);
            wrapper.appendChild(prompt);
          }
          const suggestion = document.createElement("button");
          suggestion.type = "button";
          suggestion.className = "amino-name-suggestion";
          suggestion.id = `aminoSuggestion-${index}`;
          suggestion.tabIndex = -1;
          suggestion.hidden = true;
          const hideSuggestion = () => {
            suggestion.hidden = true;
            input.removeAttribute("aria-describedby");
          };
          const updateSuggestion = () => {
            const name = getAminoAcidInputSuggestion(input);
            if (!name) { hideSuggestion(); return; }
            suggestion.textContent = name;
            suggestion.setAttribute("aria-label", `Use ${name}`);
            suggestion.hidden = false;
            input.setAttribute("aria-describedby", suggestion.id);
          };
          const acceptSuggestion = () => {
            const name = getAminoAcidInputSuggestion(input);
            if (!name || suggestion.hidden) return;
            input.value = name;
            hideSuggestion();
            input.focus({ preventScroll: true });
            input.dispatchEvent(new Event("input", { bubbles: true }));
          };
          input.addEventListener("input", updateSuggestion);
          input.addEventListener("focus", updateSuggestion);
          input.addEventListener("compositionstart", () => { input.dataset.composing = "true"; hideSuggestion(); });
          input.addEventListener("compositionend", () => { delete input.dataset.composing; updateSuggestion(); });
          input.addEventListener("keydown", event => {
            if (event.key === "Tab" && !event.shiftKey && !event.isComposing && input.dataset.composing !== "true") {
              acceptSuggestion();
              // The existing input-grid Tab handler advances and wraps focus.
              return;
            }
            if (suggestion.hidden) return;
            if (event.key === "ArrowDown") {
              event.preventDefault(); event.stopPropagation(); suggestion.focus({ preventScroll: true });
            } else if (event.key === "Escape") {
              event.preventDefault(); event.stopPropagation(); hideSuggestion();
            }
          });
          suggestion.addEventListener("pointerdown", event => event.preventDefault());
          suggestion.addEventListener("click", acceptSuggestion);
          suggestion.addEventListener("keydown", event => {
            if (event.key === "Tab" && !event.shiftKey) {
              acceptSuggestion();
            } else if (event.key === "Enter" || event.key === " ") {
              event.preventDefault(); event.stopPropagation(); acceptSuggestion();
            } else if (event.key === "Escape" || event.key === "ArrowUp") {
              event.preventDefault(); event.stopPropagation(); input.focus({ preventScroll: true }); hideSuggestion();
            }
          });
          wrapper.addEventListener("focusout", event => {
            if (!wrapper.contains(event.relatedTarget)) hideSuggestion();
          });
          if (item && Array.isArray(item.sequenceSteps) && item.sequenceSteps.length) {
            input.dataset.sequence = "true";
          }
          wrapper.appendChild(input);
          wrapper.appendChild(suggestion);
          inputGrid.appendChild(wrapper);
          if (window.ScatterLayout) window.ScatterLayout.positionCard(wrapper, item);
        });
      }
