# Timeline Tracks

Play now: [Timeline Tracks](https://turning50.github.io/timeline-tracks/) · [GitHub repository](https://github.com/turning50/timeline-tracks)

A mobile-first music timeline party game for 2–6 people, built with React, TypeScript and Vite. No backend, database, paid service, or game account is required.

## Game modes

Choose a mode on the home screen. Every mode uses the same listening, QR, lock, reveal and next-turn controls.

| Mode                          | Rules                                     | Finish                              | Hints                                    | Theme / pack                                     |
| ----------------------------- | ----------------------------------------- | ----------------------------------- | ---------------------------------------- | ------------------------------------------------ |
| Classic           | Place on your full timeline               | 5, 7 or 10 cards, including starter | None                                     | Original navy/gold; original 37 tracks unchanged |
| Junior · Helppo (Easy)        | Older or newer than your last earned card | 5 correct answers, plus starter     | Two optional clues per track             | Violet/mint; 46-track Junior pack                |
| Junior · Haastava (Challenge) | Place on your full timeline               | 7 correct answers, plus starter     | Two hints per player for the entire game | Violet/mint; 46-track Junior pack                |
| Family                | Classic rules for mixed-age play          | 5, 7 or 10 cards, including starter | None                                     | Warm cream/terracotta; Junior/Family pack        |

Wrong answers never remove earned cards. Equal years are accepted on either side in every mode. Easy mode compares against the last **correctly earned** card (initially the starter), while collected cards remain sorted; a wrong guess does not change the comparison card. Hints show the decade, then a five-year range; they never show the exact answer, artist or title. Hint budgets and the chosen answer survive reloads.

Junior’s starter gives context but no point. Both Junior difficulties count actual correct answers. The 46-track pack supports a six-player challenge game with all correct guesses; wrong guesses can still exhaust it. The existing highest-score/tie finish applies when no unused tracks remain.

The themes use accessible text/button contrast, generous touch controls and the familiar vertical layout. Junior/Family reveal animations are disabled by `prefers-reduced-motion`; Classic retains its v1.0.0 palette. Saved original v1 games continue as Classic with their original score rules.

### Junior / Family songs

Edit `src/data/junior-songs.json` independently of `src/data/songs.json`. The Junior pack blends film songs (Frozen, Moana, Encanto, The Lego Movie), pop (BTS, One Direction, Katy Perry) and some older recognisable classics. It is an editorial selection for ages 8–14, not an official age rating. Some mainstream songs include mild romance, adversity or figurative language. Parents can adapt the pack to their preferences; Spotify recommendations/ads are outside the game. See `SONG_SOURCES.md` for all verified track links and recording-year notes. Shared song IDs must describe the same recording in both packs.

### Version history

The working original version is preserved as [`v1.0.0`](https://github.com/turning50/timeline-tracks/releases/tag/v1.0.0), commit `a764505fa8d7f7824149c1d9bb3f4297a62fda11`. Junior/Family changes are developed on `feature/junior`, validated there and on pull requests, then merged into `main` for Pages publication. Only `main` deploys; feature/PR runs only validate.

## Classic play

1. Start a game, name 2–6 players and choose 5, 7 (default) or 10 cards.
2. Each player gets one revealed starting card, which counts toward the finish line.
3. On your turn, scan the mystery QR using another phone or select **Open in Spotify**.
4. Keep the Spotify screen away from the person guessing: Spotify itself displays the artist/title. The game phone does not reveal them.
5. Choose a gap before, between or after your cards, then **Lock in answer**.
6. A correct track stays on your timeline. A wrong one is discarded. Equal years are accepted anywhere that preserves chronological order.
7. Pass the phone with **Next Turn**. The first player reaching the target wins.

The 37-track starter pack spans 1957–2023. Every drawn track is used once, including discarded tracks. If the pack runs out, the highest card count wins, with shared winners on ties. For six-player / ten-card games, expand the pack: all players approaching the target could require at least 55 tracks, plus allowance for wrong guesses.

## Run locally

Use Node.js 22.12+ and npm.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite, including `/timeline-tracks/`. For a production preview:

```sh
npm run build
npm run preview
```

## Checks

```sh
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

The unit suite covers chronological gaps, equal years, player counts, rotation, winning, no reuse, exhaustion, save validation and data integrity. Browser tests cover actual mobile UI interactions, QR rendering, Spotify link targets, correct/wrong answers, six-player winning, restore, repository base path, manifest and offline shell. `TT_CHROMIUM_PATH` optionally selects an existing Chromium executable for constrained environments; ordinary local and CI runs use Playwright's browser.

## Add songs

Edit `src/data/songs.json`, then run the checks. No game code changes are necessary.

```json
{
  "id": "unique-stable-song-id",
  "artist": "Artist name",
  "title": "Song title",
  "year": 1987,
  "spotifyUrl": "https://open.spotify.com/track/VERIFIED_TRACK_ID_HERE"
}
```

The example ID above is deliberately a placeholder, not a playable link. In Spotify, open the correct recording, choose **Share → Copy song link**, and retain `https://open.spotify.com/track/` plus its 22-character track ID. Remove tracking parameters. Check the recording, artist and availability before adding it. Do not invent IDs or use album, playlist or search links.

`year` means the first commercial release year of the selected recording (including an earlier album release), **not** a later compilation/remaster year. A substantially different recording or mix needs its own chosen year and clear title. The starter uses the 1985 single mix of “Take on Me”. Billie Jean uses its 1982 album release; Rolling in the Deep 2010; Mr. Brightside 2003; One More Time 2000. Optional `genre` and `country` fields are supported by the type but no filters are implemented yet. See [SONG_SOURCES.md](SONG_SOURCES.md) for verified link provenance.

Keep IDs stable: saved games reference them. Removing or renaming a song used by a save invalidates that save safely.

## GitHub Pages

This project is configured for the repository **timeline-tracks** at:

[https://turning50.github.io/timeline-tracks/](https://turning50.github.io/timeline-tracks/)

Pages is enabled with GitHub Actions in this repository. Every push to `main` validates the project and publishes a new build. The steps below describe setup for a fresh copy.

1. Create a public repository named `timeline-tracks` under your chosen account.
2. Push this project and its commit history to its `main` branch.
3. In that repository, choose **Settings → Pages → Build and deployment → Source → GitHub Actions**.
4. The included `.github/workflows/deploy.yml` validates, tests, builds and deploys each push to `main`. After first enabling Pages, rerun the workflow if needed.

`vite.config.ts` sets `base: '/timeline-tracks/'`. The HTML, manifest, app icons, worker registration and service worker all use that repository scope. No client-side route rewrite is required. If you rename the repository, update the Vite base and rerun tests. GitHub Actions must be enabled and allowed to deploy Pages.

## PWA and saved games

On iPhone Safari, use **Share → Add to Home Screen**. Icons, a web manifest and a scoped service worker are included. After an online visit and reload, the cached app shell can launch offline. Spotify playback still requires connectivity; the game does not download music. The worker uses network-first requests so updated pages/assets are cached when online. Reload online to obtain new builds. Installation and switching into the native Spotify app must be checked on a real iPhone; desktop Chromium tests cannot prove iOS behavior.

State is saved after every game change. Opening the site again offers **Continue Game**, including a selected but unlocked answer or the last reveal. Invalid or incompatible saves are ignored. If localStorage is unavailable or full, a warning tells players to keep the page open. Clearing browser/site data removes the save. PWA and Safari storage may be separate on some iOS versions.

## Architecture

- `src/game/engine.ts`: pure game transitions and chronological rules; no UI or storage dependency.
- `src/data/songs.json`: independent pack of song records.
- `src/App.tsx`: setup, turn, reveal and finish views; QR display and local save integration.
- `src/style.css`: responsive mobile-first styling, large touch controls and vertical timeline.
- `public/`: icons, PWA manifest and scoped service worker.
- `tests/`: browser acceptance tests; `src/game/engine.test.ts`: unit tests.

The engine accepts a song collection, so future decade/genre/country/custom-pack selection can pass a filtered pack without rewriting placement rules. Bonus scoring could be added to game transitions; Spotify playback can sit behind a listening adapter; future network multiplayer would require a separate synchronization layer. None of those features are included in this MVP.

## Current limits

- The MVP uses **ordinary Spotify links**, not the Spotify API. No API key, client secret, OAuth or programmatic playback is used.
- Spotify may ask for an account, show ads, restrict playback or vary availability by region/device/subscription. The OS decides whether a link opens the app or web player.
- Song identity is hidden in the game UI until reveal, but is visible on Spotify and present in the downloaded static JSON. This is a friendly party game, not an anti-cheat system.
- One shared game phone, turn-based local multiplayer; no remote synchronization.
- Two curated packs; no custom imports or filters yet. A small pack can exhaust before the chosen target.
- A save is local to this browser and origin; no cloud backup.
- QR generation runs locally; listening itself is not bundled or cached.
- English interface. Real-device Safari, Home Screen installation and scanning with another phone remain device acceptance checks.

## License

MIT for this project's source code. Song/artist names identify Spotify recordings; music and Spotify branding belong to their respective owners. No music files, artwork or third-party game branding are included.
