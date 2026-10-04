# Junior / Family validation — 2026-10-04

- TypeScript: passed (`npm run typecheck`).
- ESLint: passed (`npm run lint`).
- Unit tests: 36 passed, including all 20 original Classic checks.
- Browser acceptance tests: 12 passed, including all five original tests.
- Production build: passed (`npm run build`), repository base `/timeline-tracks/`.
- Mobile viewports: 390 × 844 and 320 × 740; desktop 1280 × 900.

## New coverage

- Home mode selection, Junior difficulty setup, mode-specific themes and preserved Classic palette.
- Easy older/newer comparison, sorted earned cards, correct and wrong answers; wrong answers preserve the score and comparison reference.
- Equal years accepted in both answers/gaps for both difficulties.
- Six-player Easy games reach five correct answers; six-player Challenge games reach seven correct answers. The starter never awards a Junior point.
- Easy hints reset for the next track; Challenge has two hints per player for the whole game. Restoring a save never replenishes spent hints.
- QR rendering, Spotify URL, hidden identity before reveal, selected-answer restore, reveal/winner restore and old v1 Classic saves.
- Family uses Classic scoring with the Junior/Family pack and no hints.
- Text and primary-button contrast >= 4.5:1 in all three home themes; mode targets >= 44 px. No horizontal overflow at 320 px.
- Reduced-motion setting disables reveal animation. Pack has 46 unique verified-form Spotify URLs; original Classic JSON retains 37 songs.
- Existing PWA, offline shell, rotation, wrong answers, winning, corruption handling and Pages path tests still pass.

The narrow-screen preview overflow and the brief low-contrast theme-button color transition found during validation were fixed before publication. The original wrong-answer browser test now uses deterministic unequal years to avoid treating a valid equal-year guess as a failure.

## Version / publication

Original working main commit `a764505fa8d7f7824149c1d9bb3f4297a62fda11` is preserved as `v1.0.0`. Changes are developed in `feature/junior`. GitHub Actions validates this feature branch and pull requests; only main publishes to the existing Pages site. Actions repeats TypeScript, lint, unit tests, browser tests and production build.

## Device limits

No physical iPhone or second scanning phone was available. Native Spotify app opening, actual audio playback, camera scanning and Safari Home Screen installation remain physical-device checks. Public Spotify pages verified identities, not availability in every region. The Junior pack is an editorial 8–14 selection, not an official content rating; families can edit it. Ordinary Spotify links are still used without API credentials.

## Environment

The local Playwright download endpoint returned incomplete archives. Tests used Chromium through the existing optional `TT_CHROMIUM_PATH` setting, from a temporary reputable npm browser package outside the project. No browser package was added to project dependencies. CI uses ordinary Playwright installation.

## Original release report

# Validation — 2026-10-04

- TypeScript: passed (`npm run typecheck`).
- ESLint: passed (`npm run lint`).
- Unit tests: 20 passed (`npm test`).
- Browser acceptance tests: 5 passed in mobile Chromium, 390 × 844; desktop viewport 1280 × 900 also inspected.
- Production build: passed (`npm run build`).
- Production dependency audit: 0 reported vulnerabilities (`npm audit --omit=dev --audit-level=high`).

## Browser coverage

1. Three-player setup; hidden mystery identity; correct Spotify href; large QR rendering; selected placement; correct reveal; persisted reveal after reload; next player's turn; no horizontal overflow.
2. Wrong placement; no added card; turn rotation.
3. Six-player game completed to a five-card winner; winner restored after reload.
4. Equal-year placement; unlocked selection restored; corrupted localStorage ignored.
5. `/timeline-tracks/` assets and manifest; scoped service worker; offline reload; desktop layout.

## Limits of validation

No real iPhone or second physical scanning phone was available. Native Spotify app opening, actual audio playback, camera scanning and Safari Home Screen installation need a device check. Public Spotify pages/embed results verified the identities of the links, not availability in every region. GitHub Pages deployment succeeded. GitHub Actions repeated all checks on Ubuntu, including the normal Playwright browser install. All 28 published source files were compared by Git blob SHA against the tested local source and matched.

## Environment note

The usual Playwright browser download was unavailable in this environment. Browser tests used Chromium 153 with Playwright through the optional `TT_CHROMIUM_PATH` override. CI uses the ordinary Playwright install path. No environment-specific browser package remains in project dependencies.

## Published build

- Repository: https://github.com/turning50/timeline-tracks
- Live application: https://turning50.github.io/timeline-tracks/
- First successful validation and deployment: https://github.com/turning50/timeline-tracks/actions/runs/37183740779
- Live browser smoke check: home and player setup loaded; mystery track, QR and Spotify link rendered; placement, reveal, next turn and restore checked after publication.
