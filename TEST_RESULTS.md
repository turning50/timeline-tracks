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

No real iPhone or second physical scanning phone was available. Native Spotify app opening, actual audio playback, camera scanning and Safari Home Screen installation need a device check. Public Spotify pages/embed results verified the identities of the links, not availability in every region. The Pages deployment was not run: the connected GitHub capabilities cannot create a repository or change Pages settings. No repository or live Pages URL is claimed yet.

## Environment note

The usual Playwright browser download was unavailable in this environment. Browser tests used Chromium 153 with Playwright through the optional `TT_CHROMIUM_PATH` override. CI uses the ordinary Playwright install path. No environment-specific browser package remains in project dependencies.
