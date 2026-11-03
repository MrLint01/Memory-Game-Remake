(() => {
  let stageRoundOverridePlan = null;
  let stageRoundOverrideStageId = null;
  let stageRoundOverrideLastRound = null;
  let stageRoundOverridePlanType = null;

  function shuffleArray(list) {
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  function buildRoundOverridePlan(stage, pool) {
    const rounds = Number(stage && stage.rounds) || pool.length;
    const shuffled = shuffleArray(pool.slice());
    const plan = {};
    for (let i = 1; i <= rounds; i += 1) {
      plan[i] = shuffled[i - 1] ?? null;
    }
    return plan;
  }

  function buildRoundGuaranteePlan(stage, guarantee, cardCount) {
    const rounds = Number(stage && stage.rounds) || 1;
    const stageCategories = window.getStageCategories ? window.getStageCategories(stage) : guarantee;
    const required = guarantee.filter((key) => stageCategories.includes(key));
    const totalSlots = Math.max(1, rounds * Math.max(1, cardCount));
    const pool = shuffleArray(required.slice());
    while (pool.length < totalSlots) {
      pool.push(stageCategories[Math.floor(Math.random() * stageCategories.length)]);
    }
    const plan = {};
    for (let round = 1; round <= rounds; round += 1) {
      const start = (round - 1) * cardCount;
      const slice = pool.slice(start, start + cardCount);
      const counts = {};
      slice.forEach((category) => {
        if (!category) return;
        counts[category] = (counts[category] || 0) + 1;
      });
      plan[round] = { cards: { total: cardCount, counts } };
    }
    return plan;
  }

  window.getStageRoundOverride = function getStageRoundOverride(stage, currentRound) {
    if (!stage || !Number.isFinite(currentRound)) return null;
    if (stage.roundOverrides && typeof stage.roundOverrides === "object") {
      return stage.roundOverrides[currentRound] || null;
    }
    const pool = Array.isArray(stage.roundOverridePool) ? stage.roundOverridePool : null;
    if (pool && pool.length) {
      const stageId = stage.id ?? null;
      const shouldReset =
        stageRoundOverrideStageId !== stageId ||
        stageRoundOverridePlan === null ||
        stageRoundOverridePlanType !== "pool" ||
        (stageRoundOverrideLastRound !== null &&
          (currentRound < stageRoundOverrideLastRound || (currentRound === 1 && stageRoundOverrideLastRound !== 1)));
      if (shouldReset) {
        stageRoundOverridePlan = buildRoundOverridePlan(stage, pool);
        stageRoundOverrideStageId = stageId;
        stageRoundOverridePlanType = "pool";
      }
      stageRoundOverrideLastRound = currentRound;
      return stageRoundOverridePlan ? stageRoundOverridePlan[currentRound] || null : null;
    }
    const guarantee = Array.isArray(stage.roundCategoryGuarantee)
      ? stage.roundCategoryGuarantee.filter((key) => typeof key === "string")
      : null;
    const cardCount = window.getStageCardCount ? window.getStageCardCount(stage) : Number(stage.cards) || 1;
    if (guarantee && guarantee.length && cardCount > 1) {
      const stageId = stage.id ?? null;
      const shouldReset =
        stageRoundOverrideStageId !== stageId ||
        stageRoundOverridePlan === null ||
        stageRoundOverridePlanType !== "guarantee" ||
        (stageRoundOverrideLastRound !== null &&
          (currentRound < stageRoundOverrideLastRound || (currentRound === 1 && stageRoundOverrideLastRound !== 1)));
      if (shouldReset) {
        stageRoundOverridePlan = buildRoundGuaranteePlan(stage, guarantee, cardCount);
        stageRoundOverrideStageId = stageId;
        stageRoundOverridePlanType = "guarantee";
      }
      stageRoundOverrideLastRound = currentRound;
      return stageRoundOverridePlan ? stageRoundOverridePlan[currentRound] || null : null;
    }
    return null;
  };

  window.resetStageRoundOverridePlan = function resetStageRoundOverridePlan() {
    stageRoundOverridePlan = null;
    stageRoundOverrideStageId = null;
    stageRoundOverrideLastRound = null;
    stageRoundOverridePlanType = null;
  };

  function safeGetStorageItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function safeSetStorageItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (error) {
      return false;
    }
  }

  function safeRemoveStorageItem(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {}
  }

  function clearStorageKeysWithPrefix(prefix) {
    try {
      const keys = [];
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i);
        if (key && key.indexOf(prefix) === 0) {
          keys.push(key);
        }
      }
      keys.forEach((key) => {
        window.localStorage.removeItem(key);
      });
    } catch (error) {}
  }

  // Keep the established stage storage keys so existing progress survives.
  window.getStageProgressStorageKey = () => "flashRecallStageProgress_B";
  window.getStatsStorageKey = () => "flashRecallStats_B";

  const progressKey = window.getStageProgressStorageKey();
  const statsKey = window.getStatsStorageKey();
  const legacyProgressKey = "flashRecallStageProgress";
  const legacyStatsKey = "flashRecallStats";
  const playerNameKey = "flashRecallPlayerName";
  const playerNamePromptKey = "flashRecallPlayerNamePrompted";
  const splashSeenKey = "flashRecallSplashSeen";
  const contentResetVersion = window.FLASH_RECALL_CONTENT_RESET_VERSION || "";
  const contentResetStorageKey = "flashRecallContentResetVersion";
  window.stagesConfig = Array.isArray(window.stagesConfig) ? window.stagesConfig : [];
  window.stageStars = {};
  window.stageBestTimes = {};
  window.stageCompleted = {};

  function migrateLegacyStorageKey(fromKey, toKey) {
    if (!fromKey || !toKey || fromKey === toKey) return;
    if (safeGetStorageItem(toKey)) return;
    const raw = safeGetStorageItem(fromKey);
    if (raw) {
      safeSetStorageItem(toKey, raw);
    }
  }

  // Carry over progress for players previously assigned the retired stage set.
  // Existing progress in the current stage set takes precedence.
  migrateLegacyStorageKey("flashRecallStageProgress_A", progressKey);
  migrateLegacyStorageKey("flashRecallStats_A", statsKey);
  safeRemoveStorageItem("flashRecallABVariant");

  migrateLegacyStorageKey(legacyProgressKey, progressKey);
  migrateLegacyStorageKey(legacyStatsKey, statsKey);

  function parseJsonStorage(key) {
    const raw = safeGetStorageItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  function hasMeaningfulStageProgress(payload) {
    if (!payload || typeof payload !== "object") return false;
    const stars = payload.stars && typeof payload.stars === "object" ? payload.stars : {};
    const completed = payload.completed && typeof payload.completed === "object" ? payload.completed : {};
    const bestTimes = payload.bestTimes && typeof payload.bestTimes === "object" ? payload.bestTimes : {};
    return Object.values(stars).some((value) => Number(value) > 0)
      || Object.values(completed).some(Boolean)
      || Object.values(bestTimes).some((value) => Number.isFinite(Number(value)));
  }

  function hasMeaningfulLifetimeStats(payload) {
    if (!payload || typeof payload !== "object") return false;
    return [
      payload.totalSeconds,
      payload.totalCards,
      payload.totalLevelAttempts,
      payload.totalLevelSuccesses,
      payload.failedLevelCount,
      payload.sandboxCompletedCount,
      payload.flashCompletedCount,
      payload.tutorialCompletedCount,
      payload.challengeCompletedCount
    ].some((value) => Number(value) > 0);
  }

  function applyContentResetIfNeeded() {
    if (!contentResetVersion) return;
    const storedResetVersion = safeGetStorageItem(contentResetStorageKey);
    if (storedResetVersion === contentResetVersion) {
      return;
    }

    const storedProgress = parseJsonStorage(progressKey);
    const storedStats = parseJsonStorage(statsKey);
    const storedPlayerName = safeGetStorageItem(playerNameKey);
    const wasPromptedForName = safeGetStorageItem(playerNamePromptKey) === "1";
    const hadSeenSplash = safeGetStorageItem(splashSeenKey) === "1";
    const isReturningPlayer = hasMeaningfulStageProgress(storedProgress)
      || hasMeaningfulLifetimeStats(storedStats)
      || Boolean(storedPlayerName)
      || wasPromptedForName
      || hadSeenSplash;

    if (!isReturningPlayer) {
      safeSetStorageItem(contentResetStorageKey, contentResetVersion);
      return;
    }

    window.stageStars = {};
    window.stageBestTimes = {};
    window.stageCompleted = {};
    safeRemoveStorageItem(progressKey);
    safeRemoveStorageItem(statsKey);
    clearStorageKeysWithPrefix("flashRecallLeaderboardSynced_");
    clearStorageKeysWithPrefix("flashRecallLeaderboardReadBudget_");
    safeSetStorageItem(contentResetStorageKey, contentResetVersion);

    window.__flashRecallContentResetNotice = {
      resetVersion: contentResetVersion,
      playerName: String(storedPlayerName || "")
    };
  }

  function loadStageProgress() {
    try {
      const raw = window.localStorage.getItem(progressKey);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return false;
      if (parsed.stars && typeof parsed.stars === "object") {
        const stars = { ...parsed.stars };
        // One-time migration: copy legacy keys without version suffix into v1 keys.
        Object.keys(stars).forEach((key) => {
          if (/_v\d+$/.test(key)) return;
          const legacyValue = stars[key];
          const v1Key = `${key}_v1`;
          if (stars[v1Key] === undefined && Number.isFinite(Number(legacyValue))) {
            stars[v1Key] = legacyValue;
          }
          delete stars[key];
        });
        window.stageStars = stars;
      }
      if (parsed.completed && typeof parsed.completed === "object") {
        const completed = { ...parsed.completed };
        // One-time migration: copy legacy keys without version suffix into v1 keys.
        Object.keys(completed).forEach((key) => {
          if (/_v\d+$/.test(key)) return;
          const v1Key = `${key}_v1`;
          if (completed[v1Key] === undefined) {
            completed[v1Key] = Boolean(completed[key]);
          }
          delete completed[key];
        });
        window.stageCompleted = completed;
      }
      if (parsed.bestTimes && typeof parsed.bestTimes === "object") {
        const bestTimes = { ...parsed.bestTimes };
        // One-time migration: copy legacy keys without version suffix into v1 keys.
        Object.keys(bestTimes).forEach((key) => {
          if (/_v\d+$/.test(key)) return;
          const legacyValue = bestTimes[key];
          const v1Key = `${key}_v1`;
          if (bestTimes[v1Key] === undefined && Number.isFinite(Number(legacyValue))) {
            bestTimes[v1Key] = legacyValue;
          }
          delete bestTimes[key];
        });
        window.stageBestTimes = bestTimes;
      }
      if (typeof window.syncLocalBestTimesOnce === "function") {
        window.syncLocalBestTimesOnce();
      }
      return true;
    } catch (error) {
      console.warn("Failed to load stage progress", error);
      return false;
    }
  }

  function saveStageProgress() {
    try {
      const payload = {
        stars: window.stageStars,
        completed: window.stageCompleted,
        bestTimes: window.stageBestTimes
      };
      window.localStorage.setItem(progressKey, JSON.stringify(payload));
    } catch (error) {
      console.warn("Failed to save stage progress", error);
    }
  }
  applyContentResetIfNeeded();
  loadStageProgress();

  window.saveStageProgress = saveStageProgress;
  window.consumeContentResetNotice = function consumeContentResetNotice() {
    const notice = window.__flashRecallContentResetNotice || null;
    window.__flashRecallContentResetNotice = null;
    return notice;
  };

  window.getStageVersion = function getStageVersion(stage) {
    const version = stage && Number(stage.version);
    return Number.isFinite(version) && version > 0 ? version : 1;
  };

  window.getStageBestTimeKey = function getStageBestTimeKey(stage, index) {
    const id = stage && stage.id ? String(stage.id) : String(index + 1);
    const version = window.getStageVersion ? window.getStageVersion(stage) : 1;
    return `${id}_v${version}`;
  };

  window.getStageStarsKey = function getStageStarsKey(stage, index) {
    const id = stage && stage.id ? String(stage.id) : String(index + 1);
    const version = window.getStageVersion ? window.getStageVersion(stage) : 1;
    return `${id}_v${version}`;
  };

  window.getStageConfig = function getStageConfig(index) {
    if (!Array.isArray(window.stagesConfig)) return null;
    return window.stagesConfig[index] || null;
  };

  window.getStageCategories = function getStageCategories(stage) {
    if (!stage || !Array.isArray(stage.categories) || !stage.categories.length) {
      return ["numbers"];
    }
    return stage.categories.slice();
  };

  window.getStageModifiers = function getStageModifiers(stage) {
      const defaults = {
        mathOps: false,
        mathOpsPlus: false,
        misleadColors: false,
        backgroundColor: false,
        textColor: false,
        previousCard: false,
        rotate: false,
        rotatePlus: false,
        sequence: false,
        swapCards: false,
        platformer: false,
        glitch: false,
        fog: false,
        ads: false
    };
    if (!stage || typeof stage.modifiers !== "object" || stage.modifiers === null) {
      const options = { ...defaults };
    }
    return { ...defaults, ...stage.modifiers };
  };

  window.getStageCardCount = function getStageCardCount(stage) {
    const count = stage && Number(stage.cards);
    return Number.isFinite(count) && count > 0 ? count : 4;
  };

  window.getStageCardCounts = function getStageCardCounts(stage) {
    if (!stage || typeof stage.cardCounts !== "object" || stage.cardCounts === null) {
      return null;
    }
    return { ...stage.cardCounts };
  };

  window.getStageStarTargets = function getStageStarTargets(stage) {
    const fallback = { platinum: null, gold: 30, silver: 45, bronze: 60 };
    if (!stage || !stage.starTimes) return fallback;
    return {
      platinum: Number(stage.starTimes.platinum) || fallback.platinum,
      gold: Number(stage.starTimes.gold) || fallback.gold,
      silver: Number(stage.starTimes.silver) || fallback.silver,
      bronze: Number(stage.starTimes.bronze) || fallback.bronze
    };
  };

  window.getStageChallengeOptions = function getStageChallengeOptions(stage, currentRound) {
    const modifiers = window.getStageModifiers(stage);
    const options = {
      enableMathOps: Boolean(modifiers.mathOps),
      enableMathOpsPlus: Boolean(modifiers.mathOpsPlus),
      mathChance: typeof modifiers.mathChance === "number" ? modifiers.mathChance : 0.7,
      mathMinCount: typeof modifiers.mathMinCount === "number" ? modifiers.mathMinCount : null,
      mathMaxCount: typeof modifiers.mathMaxCount === "number" ? modifiers.mathMaxCount : null,
      misleadColors: Boolean(modifiers.misleadColors),
      misleadChance: typeof modifiers.misleadChance === "number" ? modifiers.misleadChance : 0.6,
      misleadUniqueLabelsPerRound: Boolean(modifiers.misleadUniqueLabelsPerRound),
      textLabelUniquePerRound: Boolean(modifiers.textLabelUniquePerRound),
      misleadMinCount: typeof modifiers.misleadMinCount === "number" ? modifiers.misleadMinCount : null,
      misleadMaxCount: typeof modifiers.misleadMaxCount === "number" ? modifiers.misleadMaxCount : null,
      enableBackgroundColor: Boolean(modifiers.backgroundColor),
      backgroundColorChance:
        typeof modifiers.backgroundColorChance === "number" ? modifiers.backgroundColorChance : 0.35,
      backgroundColorMinCount:
        typeof modifiers.backgroundColorMinCount === "number" ? modifiers.backgroundColorMinCount : null,
      backgroundColorMaxCount:
        typeof modifiers.backgroundColorMaxCount === "number" ? modifiers.backgroundColorMaxCount : null,
      backgroundColorUniqueLabelsPerRound: Boolean(modifiers.backgroundColorUniqueLabelsPerRound),
      backgroundPromptChance:
        typeof modifiers.backgroundPromptChance === "number" ? modifiers.backgroundPromptChance : 0.5,
      backgroundPromptMinCount:
        typeof modifiers.backgroundPromptMinCount === "number" ? modifiers.backgroundPromptMinCount : null,
      backgroundPromptMaxCount:
        typeof modifiers.backgroundPromptMaxCount === "number" ? modifiers.backgroundPromptMaxCount : null,
      enableTextColor: Boolean(modifiers.textColor),
      textColorChance: typeof modifiers.textColorChance === "number" ? modifiers.textColorChance : 0.6,
      textPromptChance: typeof modifiers.textPromptChance === "number" ? modifiers.textPromptChance : 0.5,
      textColorUniqueLabelsPerRound: Boolean(modifiers.textColorUniqueLabelsPerRound),
      textColorAvoidCardBackground: Boolean(modifiers.textColorAvoidCardBackground),
      textColorNoAdjacent: Boolean(modifiers.textColorNoAdjacent),
      textColorMatchCardBackground: Boolean(modifiers.textColorMatchCardBackground),
      textPromptMinCount:
        typeof modifiers.textPromptMinCount === "number" ? modifiers.textPromptMinCount : null,
      textPromptMaxCount:
        typeof modifiers.textPromptMaxCount === "number" ? modifiers.textPromptMaxCount : null,
      enablePreviousCard: Boolean(modifiers.previousCard),
      previousCardChance: typeof modifiers.previousCardChance === "number" ? modifiers.previousCardChance : 0.5,
      previousPromptMinCount:
        typeof modifiers.previousPromptMinCount === "number" ? modifiers.previousPromptMinCount : null,
      previousPromptMaxCount:
        typeof modifiers.previousPromptMaxCount === "number" ? modifiers.previousPromptMaxCount : null,
      enableRotate: Boolean(modifiers.rotate),
      enableRotatePlus: Boolean(modifiers.rotatePlus),
      rotateUniqueDegreesPerRound: Boolean(modifiers.rotateUniqueDegreesPerRound),
      rotateNoRepeatPromptsAcrossRounds: Boolean(modifiers.rotateNoRepeatPromptsAcrossRounds),
      rotateChance: typeof modifiers.rotateChance === "number" ? modifiers.rotateChance : null,
      rotateMinCount: typeof modifiers.rotateMinCount === "number" ? modifiers.rotateMinCount : null,
      rotateMaxCount: typeof modifiers.rotateMaxCount === "number" ? modifiers.rotateMaxCount : null,
      rotatePlusChance: typeof modifiers.rotatePlusChance === "number" ? modifiers.rotatePlusChance : null,
      rotatePlusMinCount: typeof modifiers.rotatePlusMinCount === "number" ? modifiers.rotatePlusMinCount : null,
      rotatePlusMaxCount: typeof modifiers.rotatePlusMaxCount === "number" ? modifiers.rotatePlusMaxCount : null,
      enableGlitch: Boolean(modifiers.glitch),
      enableSequence: Boolean(modifiers.sequence),
      sequenceSteps: typeof modifiers.sequenceSteps === "number" ? modifiers.sequenceSteps : null,
      sequenceStepSeconds: typeof modifiers.sequenceStepSeconds === "number" ? modifiers.sequenceStepSeconds : null,
      sequenceStepHoldSeconds:
        typeof modifiers.sequenceStepHoldSeconds === "number" ? modifiers.sequenceStepHoldSeconds : null,
      sequenceFinalHoldSeconds:
        typeof modifiers.sequenceFinalHoldSeconds === "number" ? modifiers.sequenceFinalHoldSeconds : null,
      sequencePool: Array.isArray(modifiers.sequencePool) ? modifiers.sequencePool.slice() : null,
      sequenceMinCount: typeof modifiers.sequenceMinCount === "number" ? modifiers.sequenceMinCount : null,
      sequenceMaxCount: typeof modifiers.sequenceMaxCount === "number" ? modifiers.sequenceMaxCount : null
    };

    const roundOverride =
      stage && Number.isFinite(currentRound) && typeof window.getStageRoundOverride === "function"
        ? window.getStageRoundOverride(stage, currentRound)
        : null;
    if (roundOverride && roundOverride.prompts && typeof roundOverride.prompts === "object") {
      const overrides = roundOverride.prompts;
      options.mathMinCount = null;
      options.mathMaxCount = null;
      options.misleadMinCount = null;
      options.misleadMaxCount = null;
      options.backgroundPromptMinCount = null;
      options.backgroundPromptMaxCount = null;
      options.textPromptMinCount = null;
      options.textPromptMaxCount = null;
      options.previousPromptMinCount = null;
      options.previousPromptMaxCount = null;
      options.rotateMinCount = null;
      options.rotateMaxCount = null;
      options.rotatePlusMinCount = null;
      options.rotatePlusMaxCount = null;


      const hasMathOpsOverride = Object.prototype.hasOwnProperty.call(overrides, "mathOps");
      const hasMathOpsPlusOverride = Object.prototype.hasOwnProperty.call(overrides, "mathOpsPlus");
      if (hasMathOpsOverride || hasMathOpsPlusOverride) {
        options.enableMathOps = hasMathOpsOverride;
        options.enableMathOpsPlus = hasMathOpsPlusOverride;
      }
      const hasRotateOverride = Object.prototype.hasOwnProperty.call(overrides, "rotate");
      const hasRotatePlusOverride = Object.prototype.hasOwnProperty.call(overrides, "rotatePlus");
      if (hasRotateOverride || hasRotatePlusOverride) {
        options.enableRotate = hasRotateOverride;
        options.enableRotatePlus = hasRotatePlusOverride;
      }

      const getCounts = (value) => {
        if (typeof value === "number") {
          return { min: value, max: null };
        }
        if (value && typeof value === "object") {
          const min = typeof value.min === "number" ? value.min : null;
          const max = typeof value.max === "number" ? value.max : null;
          return { min, max };
        }
        return { min: null, max: null };
      };

      if (Object.prototype.hasOwnProperty.call(overrides, "background")) {
        const { min, max } = getCounts(overrides.background);
        options.enableBackgroundColor = true;
        options.backgroundPromptMinCount = min;
        options.backgroundPromptMaxCount = max;
      }
      if (Object.prototype.hasOwnProperty.call(overrides, "textColor")) {
        const { min, max } = getCounts(overrides.textColor);
        options.enableTextColor = true;
        options.textPromptMinCount = min;
        options.textPromptMaxCount = max;
      }
      if (Object.prototype.hasOwnProperty.call(overrides, "previousCard")) {
        const { min, max } = getCounts(overrides.previousCard);
        options.enablePreviousCard = true;
        options.previousPromptMinCount = min;
        options.previousPromptMaxCount = max;
      }
      if (Object.prototype.hasOwnProperty.call(overrides, "misleadColors")) {
        const { min, max } = getCounts(overrides.misleadColors);
        options.misleadColors = true;
        options.misleadMinCount = min;
        options.misleadMaxCount = max;
      }
      if (Object.prototype.hasOwnProperty.call(overrides, "mathOps")) {
        const { min, max } = getCounts(overrides.mathOps);
        options.enableMathOps = true;
        options.mathMinCount = min;
        options.mathMaxCount = max;
      }
      if (Object.prototype.hasOwnProperty.call(overrides, "mathOpsPlus")) {
        const { min, max } = getCounts(overrides.mathOpsPlus);
        options.enableMathOpsPlus = true;
        options.mathMinCount = min;
        options.mathMaxCount = max;
      }
      if (Object.prototype.hasOwnProperty.call(overrides, "rotate")) {
        const { min, max } = getCounts(overrides.rotate);
        options.enableRotate = true;
        options.rotateMinCount = min;
        options.rotateMaxCount = max;
      }
      if (Object.prototype.hasOwnProperty.call(overrides, "rotatePlus")) {
        const { min, max } = getCounts(overrides.rotatePlus);
        options.enableRotatePlus = true;
        options.rotatePlusMinCount = min;
        options.rotatePlusMaxCount = max;
      }
    }

    return options;
  };

  window.getStageInstructionSlides = function getStageInstructionSlides(stage) {
    if (!stage || !Array.isArray(stage.instructions)) return { slides: [], result: [] };
    const raw = stage.instructions;
    if (
      raw.length &&
      raw[0] &&
      !Array.isArray(raw[0]) &&
      (Object.prototype.hasOwnProperty.call(raw[0], "reveal") ||
        Object.prototype.hasOwnProperty.call(raw[0], "recall"))
    ) {
      const slides = [];
      raw.forEach((entry) => {
        const reveal = Array.isArray(entry.reveal)
          ? entry.reveal
          : entry.reveal
            ? [entry.reveal]
            : [];
        const recall = Array.isArray(entry.recall)
          ? entry.recall
          : entry.recall
            ? [entry.recall]
            : [];
        slides.push(reveal, recall);
      });
      return { slides, result: Array.isArray(stage.resultInstructions) ? stage.resultInstructions : [] };
    }
    const slides = raw.map((entry) => {
      if (!entry) return [];
      return Array.isArray(entry) ? entry : [entry];
    });
    return { slides, result: Array.isArray(stage.resultInstructions) ? stage.resultInstructions : [] };
  };
})();
