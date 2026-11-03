# Function Reference

This document describes the functions in the core game scripts. Use your editor’s search or symbol list to jump to a function name here.

## app-core.js

### getSelectedCategories()
Reads the checked category checkboxes in the Practice settings modal and returns only values that exist in `dataSets`. This ensures the game never picks a category that has no backing data.

### getActiveCategories(currentRound)
Returns the category pool for the current round based on `gameMode`. In Stages it uses the stage configuration; otherwise it uses the practice selections from the UI.

### getChallengeOptions(currentRound)
Builds the modifier settings for the round (math ops, misleading colors, background color recall, glitch). In Stages it reads the stage config; in Practice it reads the checkboxes.

### isPlatformerEnabled()
Returns whether the platformer modifier is active for the current round. In Stages it is driven by stage modifiers; in Practice by the checkbox.

### isAdEnabled()
Returns whether the ads modifier is active for the current round. In Stages it is driven by stage modifiers; in Practice by the checkbox.

### isFogEnabled()
Returns whether the fog modifier is active for the current round. In Stages it is driven by stage modifiers; in Practice by the checkbox.

### isSwapEnabled()
Returns whether the swap modifier is active for the current round. In Stages it is driven by stage modifiers; in Practice by the checkbox.

### skipRevealNow()
Ends the reveal phase early, cancels timers and ad scheduling, and transitions immediately into recall.

### updateModeUI()
Synchronizes `gameMode` with the hidden `modeSelect` control, updates the page’s data attributes, and refreshes score/streak UI.

### updateCategoryControls()
Enables or disables category/modifier checkboxes depending on the active mode. Stages locks these inputs because rules are auto‑controlled.

### setPhase(text, nextState)
Updates the phase pill text and the `phase` state, then refreshes round/streak/stage timer visibility.

### updateScore()
Renders the pills for mode/round/score/lives and the streak indicator based on current game mode.

### updateStreakVisibility()
Shows the streak pill only during Practice active phases. Hides it for idle or stages.

### clamp(value, min, max)
Utility to clamp a numeric value into a min/max range.

### resetBoard()
Clears the card grid, input grid, and results panel to prepare for a new round.

### normalize(value)
Normalizes user input for comparison by trimming and lower‑casing.

### formatCategoryLabel(category)
Maps internal category keys to human‑readable labels used in the UI.

### renderShapeSVG(shape)
Returns SVG markup for shape cards (circle/square/triangle).

### isCorrectAnswer(item, actualValue)
Compares a user’s input to the expected answer with special handling for colors, directions, shapes, and background‑color prompts.

### buildChallenge(item, options)
Applies modifier logic to a base item: misleading labels, background‑color recall, and text/background color targets for color cards.

### pickItems()
Selects a unique set of items for the round from active categories, applies modifier transformations (including math ops), and returns the final list.

### renderCards(show)
Renders card elements either in reveal mode (showing values) or recall mode (showing hints/categories).

### renderInputs()
Creates input fields corresponding to the current round’s cards.

## modifiers/background-color.js

### pickBackgroundColor()
Selects a random background color option from `backgroundColors` for the background‑color recall modifier.

## modifiers/misleading-colors.js

### pickMisleadingLabel(actualLabel)
Chooses a color name that differs from the true color to create misleading text for the color‑mislead modifier.

## modifiers/math-ops.js

### applyNumberChallenge(item)
Turns a number card into a math‑operation challenge (add/subtract/multiply), producing a new recall hint and answer.

### applyNumberChallenges(items, options)
Applies `applyNumberChallenge` to up to two number cards per round based on the configured probability.

## modifiers/glitch.js

### setGlitchActive(active)
Toggles glitch classes on card elements to create flicker effects.

### startGlitching()
Starts the flicker interval during reveal if the glitch modifier is enabled.

### stopGlitching()
Stops the flicker interval and clears the glitch classes.

## modifiers/fog.js

### resizeFog()
Sizes the fog canvas to the viewport dimensions.

### drawFog()
Draws the randomized fog overlay on the fog canvas.

### startFog()
Enables the fog overlay for reveal and resets movement tracking.

### stopFog()
Disables and hides the fog overlay.

### clearFogAt(x, y, speed, lastX, lastY)
Clears fog along the cursor’s path; stroke width increases with cursor speed.

## modifiers/ads.js

### showAd(options)
Displays the ad modal during reveal, positions it, and marks the ad as shown.

### hideAd()
Hides the ad modal and resets ad state.

### setAdInteractive(enabled)
Enables or disables pointer interaction for the ad modal (used during pause).

### clearAdTimer()
Cancels any scheduled ad display.

### positionAd(reuseSnapshot)
Computes a safe random placement for the ad card within the card grid bounds.

### scheduleAd(revealSeconds)
Schedules a random ad appearance within the first third of the reveal window.

## modifiers/swap.js

### pickSwapPair(count)
Chooses a random pair of distinct indices for the swap modifier.

### animateSwap(firstIndex, secondIndex, duration)
Performs the CSS‑driven swap animation between the two chosen cards and sets cleanup handlers.

## modifiers/platformer.js

### resetPlatformer()
Resets platformer state and builds a new platform layout.

### generatePlatforms()
Procedurally generates ground platforms, pits, and floating platforms.

### resetPlayerToStart()
Moves the player back to the start position and zeroes velocity.

### updatePlatformer()
Updates player physics, handles collisions, and checks for goal completion.

### isPlayerOnGround()
Checks whether the player is currently standing on any platform.

### checkGoalHit()
Returns true if the player intersects the goal.

### drawPlatformer()
Draws the platformer scene on the canvas.

### updatePlatformerVisibility(active)
Shows or hides the platformer UI and enables/disables its logic.

### isPlatformerControlActive()
Determines whether keyboard input should control the platformer (only during reveal).

### isPlatformerLoopActive()
Determines whether the platformer update loop should run.

### platformerLoop()
Animation loop that updates and renders the platformer while active.

## app-game.js

### setTimer(seconds, label, onComplete, totalSeconds)
Starts a countdown timer, updates the UI pill and progress bar, and calls `onComplete` when finished.

### setModalState(modal, open)
Opens/closes a modal while managing `aria-hidden` and `inert` state for accessibility.

### openPauseModal()
Captures current gameplay state, pauses timers/effects, and opens the pause modal.

### closePauseModal()
Closes the pause modal and restores ad interaction.

### resumeFromPause()
Restores timers and effects after unpausing, respecting the saved pause snapshot.

### restorePausedEffects(remainingSeconds)
Restores ad/fog/glitch/swap effects that were active before pausing.

### buildExpectedLabel(item)
Builds the recall prompt and expected answer text used in results.

### showResults(entries, allCorrect)
Renders the results panel with expected/actual answers and correctness badges.

### showFailure(reason)
Shows a failure panel (used for platformer failure before recall).

### getStageStars(elapsedSeconds, stage)
Returns 0–3 stars based on elapsed seconds and the stage star targets.

### saveStageStars(stage, stars)
Persists the best star result for a stage.

### showStageComplete(elapsedSeconds, stars, stage)
Shows the stage completion summary with time and stars.

### lockInputs(locked)
Enables/disables recall inputs.

### checkAnswers()
Evaluates recall answers, handles success/failure flows, and transitions to next round.

### beginRecallPhase()
Transitions from reveal to recall, handling modifiers (swap, ads, fog, glitch, platformer).

### startRound(options)
Creates a new round (or reuses items), resets UI, starts reveal timer, and activates modifiers.

### getRevealSeconds()
Returns the reveal duration, accounting for stage timing overrides.

## app-events.js

### openPracticeModal()
Opens the Practice settings modal.

### closePracticeModal()
Closes the Practice settings modal.

### resetGame()
Resets timers, round state, UI, and modifiers to initial defaults.
