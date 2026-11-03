# Flash Recall

Flash Recall is a browser-based memory game with progressive difficulty, gameplay modifiers, unlockable achievements, stage variants, and Firestore-backed telemetry.

The game uses one stage set. Sloth characters, interactions, sounds, and related achievements have been removed. Adaptive difficulty remains: clearing the first two levels without failing halves reveal time from level 3 onward. Sandbox timing is unchanged.

All levels and Sandbox options are available immediately. Card types and modifiers have no star costs or purchase requirements; stars remain as result ratings.

## Combined Memory Rounds

The main menu offers Levels, Sandbox, and Amino Acids. Levels opens the full level picker. Each round now shows the original cards alongside Memory Maze, Vanishing Shapes, Find the Different Shape, Wiring, and Countries. All five extra challenges are enabled by default in both levels and Sandbox.

Each round scatters the cards and puzzles over a shared, borderless workspace. Cards use a fixed 120 × 120 square (200 × 200 for amino acids) with a small random tilt; longer labels shrink to fit on one line. Positions stay fixed through reveal and recall; resizing reflows them without changing the card answer sequence. The puzzle workspace fits inside a fixed viewport frame, scaling as needed on small screens. The timer sits directly above it and controls float over the workspace; game screens do not scroll. Study everything during the text-free reveal, then press Enter/Return to enter recall. The maze and shape grids become blank; the different-shape grid also hides its shapes so the player must remember their positions. Trace the maze route from the filled circular start to the outlined square end, reconstruct the filled shape cells, select the different-shape positions, connect each colored left wire to its remembered right socket, and enter the card answers. Press Enter/Return again to evaluate the entire round. Puzzle titles and the submit button stay hidden during recall. Every enabled task must be correct; the existing timers also transition and submit all tasks together.

Card answers follow the original memorization positions from left to right; horizontal positions within 6 pixels use the higher card first. Answer boxes replace their original cards at the same positions and dimensions. Solution review keeps those positions, showing the original content and corrections inside each answer frame. Tab navigation follows the original left-to-right order. The legacy card-swap option does not remap answers in scattered rounds.

Maze paths use orthogonal neighboring cells. Retracing a path undoes steps; Clear resets that grid. Shape cells support click or drag painting and erasing. Grid buttons also support arrow-key navigation and Space to select. Solutions stay in private round state and are removed from the answer DOM. Result grids mark missed cells with dashed borders and extra cells with ×.

Under **Settings → General → Extra memory challenges**, each challenge can be toggled and configured for the next round:

- Grid sizes: 3–8 cells per side, independently for each game.
- Maze: 2–N² ordered path steps.
- Vanishing Shapes: 1–N²−1 connected filled cells.
- Different Shape: 1–floor((N²−1)/2) differences, keeping the ordinary shape in the majority.
- Wiring: 2–8 colored wires, up to 10 destination sockets (at least one per wire), and path complexity 1–4.
- Countries: 1–12 names and difficulty 1–3. The prompt pool expands from the 70 largest drawn regions to 140, then all mapped regions, including small countries and territories.

Wiring answers support dragging a left color onto a right socket, with a live wire preview and highlighted drop target. Clicking a left color and then a right socket also works. Releasing outside a socket or canceling a drag keeps the previous answer. Reusing a socket clears its previous connection; Clear resets all wire choices. Each result reports correct connections separately and reveals the original paths only after evaluation. As with the grids, every connection must be correct to pass the round.

Settings persist locally. Disabling all five extras restores card-only rounds. A stage can override any of these settings with a `memoryChallenges` object; unspecified fields retain the player's settings:

```js
memoryChallenges: {
  maze: { enabled: true, size: 5, length: 12 },
  shape: { enabled: true, size: 5, cells: 8 },
  different: { enabled: true, size: 4, count: 3 },
  wiring: { enabled: true, wires: 5, destinations: 6, complexity: 3 },
  countries: { enabled: true, count: 4, difficulty: 2 }
}
```

Gameplay fills the viewport beneath the timer. Only failed screens hide controls until you hover along the bottom edge. Blur is confined to the streak, failure text, and button groups. On failed screens, the small bottom handle also supports touch and keyboard focus; Escape closes the overlay. Other screens show their controls normally.

## Country memory challenge

Reveal displays country names only. Enter replaces them with the supplied interactive `country_quiz/BlankMap-World.svg`; clicking an outline toggles that country and updates the selected-name list. All islands belonging to the same map identifier highlight together. Wheel or +/− zooms around the pointer or map center; drag while zoomed to pan. Dragging does not select countries. Reset restores the full map. Space selects a focused country; Enter or the map's Submit button evaluates the entire round.

Country identifiers reuse the provided SVG's ISO alpha-2 IDs, consistently across prompts, shapes, selections, and evaluation. Names come from the same SVG. The source includes countries and territories; optional invisible overlays and locator circles are excluded from hit detection. All clickable outlines retain the original path geometry. Review marks and lists correctly selected, missed, and incorrect countries independently. The existing round still requires all enabled challenges to pass.

The original asset remains at the project root. An identical copy and its attribution are bundled in `memory-game-main/country_quiz/` because localhost and Firebase serve `memory-game-main/`. No mapping library or second boundary dataset is used. Credits include the supplied Canuckguy/Wikimedia attribution.

Browser integration check: `node scripts/check-country-challenge.cjs` (local server on port 8765 and a separate Chrome debugging session on port 9223, like the existing memory-challenge check).

## Amino Acids mode

The dedicated setup screen lets you set reveal time (2–20 seconds), recall time (5–30 seconds), and card count (1–20), then start with Play or Enter. Select one or more answer-format tiles: full name (Lysine), three-letter code (Lys), one-letter code (K), and side-chain type (Basic). With one selected, every card asks for that format. With multiple selected, each card independently draws a random format from the selection. The prompt stays fixed through recall and review; grading and corrections use that card’s requested format. At least one format must be selected. Existing saved single-format settings migrate automatically. These settings save locally, independently of Sandbox. Amino Acids uses only structure cards, without Sandbox modifiers or extra memory puzzles. After a failed round, Settings reopens this setup screen; Retry and Home work as in Sandbox.

The standalone Amino Acid Memorization website is in the sibling `amino-acids-main/` folder. Run a static server from the parent project directory and open `/amino-acids-main/`. The old `memory-game-main/amino-acids.html` entry redirects to the standalone site when served from that parent directory.

Select **Amino Acids** on the home screen to memorize the 20 structure PNGs from `amino_acids/structures`. Single-card rounds exclude the preceding amino acid when picking the next card, including after a failed-round retry. Cards show structures only, inside larger 200×200 squares; other card types remain 120×120. Card-only rounds keep their full screen size when the cards fit; random placement does not shrink them. Over-capacity rounds and combined puzzle rounds use workspace scaling to stay within the viewport. Enter each card’s requested answer format (case insensitive), e.g. **Lysine**, **Lys**, or **K**. Aspartate and glutamate are also accepted for aspartic acid and glutamic acid. In full-name mode, close name misspellings  show a suggestion while typing; code modes leave the typed code unchanged. Tab accepts the visible suggestion and advances to the next answer, wrapping from the last card to the first. Without a suggestion, Tab simply advances. Clicking the suggestion or pressing Arrow Down then Enter also accepts it. Shift+Tab moves backward without accepting; Enter from an answer box submits without silently accepting a suggestion. Valid letter codes remain valid; ambiguous or unrelated text is left alone. Suggestions use all 20 names, independently of the card’s solution.

The **Type** option asks for Nonpolar, Polar (uncharged), Acidic, or Basic. Classification follows [Campbell Biology, Figure 5.14](https://www.pearson.com/content/dam/one-dot-com/one-dot-com/us/en/higher-ed/en/custom-product/urry-campbell-biology-11e/pdf/urry11e-ch5.pdf#page=12): nonpolar G/A/V/L/I/M/F/W/P; polar S/T/C/Y/N/Q; acidic D/E; basic K/R/H. This uses the standard side-chain grouping near cellular pH, with cysteine in the polar group. Type answers are case insensitive; “non-polar”, “non polar”, “polar uncharged”, “negatively charged”, and “positively charged” are also accepted for their respective groups.

The original source images are copied unchanged from the workspace's `amino_acids/structures` folder into the served game folder. Symbol mappings follow the [IUPAC amino acid table](https://iupac.qmul.ac.uk/AminoAcid/tab1.html). Existing levels retain their current card categories; stage configuration can opt into `aminoAcids`.

## Live URLs
- Firebase Hosting: https://flash-recall-df7d9.web.app
- GitHub Pages: https://mrlint01.github.io/memory-game/

## Current Release
- App version: `2026.04.0`
- Content reset version: `2026.04.0-stage-reset-1`
- Global progress leaderboard version: tied to the content reset version

## Tech Stack
- HTML, CSS, JavaScript
- Firebase Hosting
- Firestore
- Python + pandas + matplotlib for offline analysis

## Repository Structure
- `index.html`: main app shell
- `app-core.js`, `app-game.js`, `app-events.js`: gameplay and UI runtime
- `memory-challenges.js`: independent challenge data, grids, pointer input, settings, and grading, coordinated by the existing round lifecycle
- `firebase-analytics.js`: telemetry, achievements, Firestore sync, leaderboards
- `settings-defaults.js`: settings defaults
- `stages-data.js`, `stages-mode.js`, `stages-instructions.js`: stage content and stage-select flow
- `style.css`: game styling and theme definitions
- `version.js`: release, channel, and reset metadata
- `firestore.rules`: Firestore security rules
- `package-site.ps1`: builds a zip with `index.html` at archive root
- `scripts/export_firestore_logs.py`: export Firestore logs
- `scripts/prepare_log_exports.py`: convert exports to CSVs
- `scripts/analyze_logs.py`: generate charts and summaries
- `scripts/compare_release_versions.py`: compare multiple releases

## Prerequisites
- Node.js 18+
- Firebase CLI
- Python 3.10+

## Firebase Setup
```bash
npm install -g firebase-tools
firebase login
firebase use flash-recall-df7d9
```

## Local Run
```bash
firebase emulators:start --only hosting
```

## Deploy
### Hosting
```bash
firebase deploy --only hosting
```

### Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### Full Deploy
```bash
firebase deploy --only hosting,firestore:rules
```

## Packaging
Build the standard publish set:
- `dist/crazygames-small`
- `dist/crazygames-large`
- `gamejolt-small.zip`
- `gamejolt-large.zip`
- `dist/flash-recall-small.zip`
- `dist/flash-recall-large.zip`

The small build is also copied to the compatibility paths:
- `dist/crazygames`
- `gamejolt.zip`
- `dist/flash-recall.zip`

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\package-site.ps1
```

Optional one-off zip output:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\package-site.ps1 -Variant large -OutputPath .\dist\flash-recall-custom.zip
```

## Versioning
`version.js` publishes:
- `window.FLASH_RECALL_VERSION`
- `window.FLASH_RECALL_RELEASE_CHANNEL`
- `window.FLASH_RECALL_BUILD_ID`
- `window.FLASH_RECALL_CONTENT_RESET_VERSION`
- `window.FLASH_RECALL_PROGRESS_LEADERBOARD_VERSION`

Update `version` and reset metadata before releases that change leaderboard or progression compatibility.

## Firestore Data Model
Telemetry is written under:
- `game_sessions/{sessionDoc}`
- `game_sessions/{sessionDoc}/attempts/{attempt}`
- `game_sessions/{sessionDoc}/events/{event}`

Stage leaderboards are written under:
- `leaderboards/stage_{stageId}/versions/v{stageVersion}/entries/{playerId}`

Global progress leaderboards are written under:
- `leaderboards_global/progress/versions/{resetVersion}/entries/{authUid}`

Achievement state is written under:
- `achievement_profiles/{playerId}`
- `achievements_global/summary`
- `achievements_global/summary/entries/{achievementId}`

## Logging and Analytics
Telemetry currently captures:
- stable browser `player_id`
- authenticated Firebase anonymous `auth_uid`
- session lifecycle and active playtime
- fullscreen usage duration
- level, round, and attempt events
- quit context and inactivity inference
- settings usage and current settings state
- home menu, stats, achievements, and leaderboard interactions
- adaptive difficulty group assignment (`undecided`, `A`, `B`)
- autoplay vs manual progression for splash, preview, and next-level flows

This data supports retention, feature-usage, quit-location, and adaptive-group comparison graphs.

## Export and Analysis
Install Python dependencies:

```bash
pip install google-cloud-firestore pandas matplotlib
```

### Step 1: Export Firestore Data
Keep the service account key out of git.

```bash
python scripts/export_firestore_logs.py ^
  --service-account C:\keys\flash-recall-service-account.json ^
  --out data_combined.json
```

Optional sample export:

```bash
python scripts/export_firestore_logs.py ^
  --service-account C:\keys\flash-recall-service-account.json ^
  --out data_combined_sample.json ^
  --limit 100
```

### Step 2: Prepare CSVs
```bash
python scripts/prepare_log_exports.py ^
  --combined data_combined.json ^
  --outdir prepared_data
```

Outputs:
- `prepared_data/sessions.csv`
- `prepared_data/attempts.csv`
- `prepared_data/events.csv`

### Step 3: Analyze
```bash
python scripts/analyze_logs.py ^
  --sessions prepared_data/sessions.csv ^
  --attempts prepared_data/attempts.csv ^
  --events prepared_data/events.csv ^
  --outdir analysis_output
```

Useful options:
- `--version-filter <version>`
- `--extra-version <version>`

Comparison helper:

```bash
python scripts/compare_release_versions.py
```

## Troubleshooting
- If Firestore writes fail with `Missing or insufficient permissions`, deploy both the latest app code and rules:
  - `firebase deploy --only hosting,firestore:rules`
- If stats leaderboards do not update after a reset, confirm the client and Firestore rules both use:
  - `leaderboards_global/progress/versions/{resetVersion}/entries/{authUid}`
- If Firebase Hosting works but GitHub Pages does not, the GitHub Pages copy is stale and must be updated separately.
- If deploy changes do not appear, hard refresh or test in an incognito window.
- `favicon.ico` 404s are cosmetic unless you explicitly want a favicon.

## Browser Regression Checks

The memory challenge checks use Node.js 22+ and a separate headless Chrome profile, with no npm dependencies. They exercise actual mouse dragging, the Enter key, independent grading, timers, retries, configuration bounds, saved settings, and desktop/mobile layout. The test profile's local game data is cleared, and cloud/font requests are blocked during these tests.

Start the local server and a separate browser in separate terminals:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --remote-debugging-port=9223 --user-data-dir=/tmp/flash-recall-browser-tests about:blank
```

Then run from the project directory:

```bash
node scripts/check-memory-challenges.cjs
node scripts/check-amino-mode.cjs
```

`MEMORY_GAME_URL` and `MEMORY_CHROME_PORT` can override the test endpoints. Set `MEMORY_SCREENSHOT` to a PNG file path to save the desktop layout (or the failure state).

## Safety
- Do not commit service account keys.
- If a key is exposed, rotate or delete it immediately.
