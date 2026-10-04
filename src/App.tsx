import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import data from "./data/songs.json";
import juniorData from "./data/junior-songs.json";
import {
  createGame,
  gameMode,
  isEasy,
  score,
  spendHint,
  hintText,
  type GameMode,
  type Difficulty,
  lockAnswer,
  nextTurn,
  restoreGame,
  STORAGE_KEY,
  type Game,
  type Song,
} from "./game/engine";
const songs: Song[] = data;
const juniorSongs: Song[] = juniorData;
const allSongs: Song[] = [
  ...new Map([...songs, ...juniorSongs].map((s) => [s.id, s])).values(),
];
const modes = {
  classic: {
    name: "Classic",
    description: "The original game. All decades, your full timeline.",
    eyebrow: "A GOOD NIGHT, OUT OF ORDER",
  },
  junior: {
    name: "Junior",
    description:
      "Ages 8–14. Familiar hits, helpful hints. Pick your challenge.",
    eyebrow: "YOUR MUSIC. YOUR MOMENT.",
  },
  family: {
    name: "Family",
    description: "Classic rules, a family song pack. Make a timeline together.",
    eyebrow: "GOOD MUSIC. GREAT COMPANY.",
  },
};
const catalog = new Map(allSongs.map((s) => [s.id, s]));
function load() {
  try {
    return restoreGame(localStorage.getItem(STORAGE_KEY), allSongs);
  } catch {
    return null;
  }
}
function Card({ id, highlight = false }: { id: string; highlight?: boolean }) {
  const s = catalog.get(id)!;
  return (
    <article className={`song-card ${highlight ? "highlight" : ""}`}>
      <strong className="year">{s.year}</strong>
      <div>
        <b>{s.artist}</b>
        <span>{s.title}</span>
      </div>
    </article>
  );
}
export default function App() {
  const [game, setGame] = useState<Game | null>(load);
  const [mode, setMode] = useState<GameMode>("classic");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [screen, setScreen] = useState<"home" | "setup" | "game">("home");
  const [count, setCount] = useState(2);
  const [names, setNames] = useState(
    Array.from({ length: 6 }, (_, i) => `Player ${i + 1}`),
  );
  const [target, setTarget] = useState<Game["target"]>(7);
  const [qr, setQr] = useState(false);
  const [notice, setNotice] = useState("");
  const [confirmNew, setConfirmNew] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const qrTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!game) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
    } catch {
      queueMicrotask(() =>
        setNotice(
          "This browser cannot save the game. Keep this page open to continue.",
        ),
      );
    }
  }, [game]);
  useEffect(() => {
    if (qr) closeRef.current?.focus();
  }, [qr]);
  const closeQr = () => {
    setQr(false);
    qrTrigger.current?.focus();
  };
  function setup() {
    if (game && game.phase !== "winner" && game.phase !== "exhausted")
      setConfirmNew(true);
    else setScreen("setup");
  }
  function start() {
    setGame(
      createGame(
        names.slice(0, count),
        target,
        mode === "classic" ? songs : juniorSongs,
        Math.random,
        { mode, difficulty },
      ),
    );
    setScreen("game");
    setQr(false);
  }
  const player = game?.players[game.currentPlayer];
  const mystery = game?.mystery ? catalog.get(game.mystery) : null;
  const activeMode = screen === "game" && game ? gameMode(game) : mode;
  const modeInfo = modes[activeMode];
  const easy = game ? isEasy(game) : false;
  const junior = game ? gameMode(game) === "junior" : false;
  return (
    <main className={`app theme-${activeMode}`}>
      <header>
        <button
          className="brand"
          onClick={() => {
            setMode(activeMode);
            if (activeMode === "junior" && game?.difficulty)
              setDifficulty(game.difficulty);
            setScreen("home");
            setQr(false);
          }}
          aria-label="Timeline Tracks home"
        >
          <span className="brand-mark">TT</span>
          <span>Timeline Tracks</span>
        </button>
        <span className="header-note">THE MUSIC TIMELINE GAME</span>
      </header>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {screen !== "home" && (
        <div className="mode-badge">
          {modeInfo.name}
          {activeMode === "junior"
            ? ` · ${screen === "game" && game ? (isEasy(game) ? "Easy" : "Challenge") : difficulty === "easy" ? "Easy" : "Challenge"}`
            : ""}
        </div>
      )}
      {screen === "home" && (
        <section className="home">
          <div className="eyebrow">{modeInfo.eyebrow}</div>
          <h1>
            Know the song.
            <br />
            <em>Find its time.</em>
          </h1>
          <p className="intro">
            Listen to a mystery track. Find its place on your timeline. First to
            the finish wins.
          </p>
          <div className="preview-timeline" aria-hidden="true">
            <div>1977</div>
            <div className="unknown">?</div>
            <div>2003</div>
          </div>
          <fieldset className="mode-picker">
            <legend>Choose your game</legend>
            <div className="mode-options">
              {(["classic", "junior", "family"] as const).map((m) => (
                <button
                  key={m}
                  className={`mode-option mode-${m}`}
                  aria-pressed={mode === m}
                  onClick={() => setMode(m)}
                >
                  <span className="mode-dot" aria-hidden="true" />
                  <strong>{modes[m].name}</strong>
                  <span>{modes[m].description}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <div className="home-actions">
            {game && (
              <button className="primary" onClick={() => setScreen("game")}>
                {game.phase === "winner" || game.phase === "exhausted"
                  ? "View Last Game"
                  : "Continue Game"}
              </button>
            )}
            {game && (
              <p className="save-label">
                Saved: {modes[gameMode(game)].name}
                {gameMode(game) === "junior"
                  ? ` · ${isEasy(game) ? "Easy" : "Challenge"}`
                  : ""}
              </p>
            )}
            <button className={game ? "secondary" : "primary"} onClick={setup}>
              New Game
            </button>
          </div>
          <div className="facts">
            <span>2–6 players</span>
            <span>One shared phone</span>
            <span>Spotify links</span>
          </div>
          <details>
            <summary>How to play</summary>
            <ol>
              <li>Each player starts with one revealed track.</li>
              <li>Scan the mystery QR with a second phone, or open Spotify.</li>
              <li>Keep the Spotify screen away from the person guessing.</li>
              <li>
                {mode === "junior"
                  ? "Easy: choose older or newer than your comparison card. Challenge: choose a gap on your full timeline."
                  : "Choose a gap on your timeline, then lock your answer."}
              </li>
              <li>
                Correct tracks stay. Wrong answers never remove earned cards.
                Equal years count on either side.
              </li>
              <li>
                {mode === "junior"
                  ? "Easy: 5 correct answers, with two optional clues per track. Challenge: 7 correct answers, with two hints per player for the whole game. The starter does not count."
                  : "Your starting card counts toward the target."}
              </li>
            </ol>
            <p>
              Original release years are used, even when Spotify lists a later
              reissue. This pack contains{" "}
              {mode === "classic" ? songs.length : juniorSongs.length} tracks.
              If it runs out, the highest score wins; ties are shared.
            </p>
            <p>
              On iPhone: Safari → Share → Add to Home Screen. Spotify listening
              needs internet and may require a Spotify account.
            </p>
          </details>
        </section>
      )}
      {screen === "setup" && (
        <section className="setup">
          <button className="text-button" onClick={() => setScreen("home")}>
            Back
          </button>
          <div className="eyebrow">GATHER YOUR PEOPLE</div>
          <h1>Set the table.</h1>
          <fieldset>
            <legend>Players</legend>
            <div className="choices">
              {[2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  aria-pressed={count === n}
                  onClick={() => setCount(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="names">
            {names.slice(0, count).map((n, i) => (
              <label key={i}>
                <span>Player {i + 1}</span>
                <input
                  maxLength={30}
                  value={n}
                  onChange={(e) =>
                    setNames(
                      names.map((v, j) => (j === i ? e.target.value : v)),
                    )
                  }
                />
              </label>
            ))}
          </div>
          {mode === "junior" ? (
            <fieldset>
              <legend>Junior challenge</legend>
              <div className="difficulty-choices">
                <button
                  aria-pressed={difficulty === "easy"}
                  onClick={() => setDifficulty("easy")}
                >
                  <strong>Easy</strong>
                  <span>Older or newer · 5 correct</span>
                </button>
                <button
                  aria-pressed={difficulty === "challenge"}
                  onClick={() => setDifficulty("challenge")}
                >
                  <strong>Challenge</strong>
                  <span>Full timeline · 7 correct</span>
                </button>
              </div>
              <p className="muted">
                {difficulty === "easy"
                  ? "Compare with your last earned card. Two optional clues per track."
                  : "Place anywhere on your timeline. Each player has two hints for the whole game."}{" "}
                Your starter does not count. Earned cards always stay.
              </p>
            </fieldset>
          ) : (
            <fieldset>
              <legend>Finish line</legend>
              <div className="choices">
                {([5, 7, 10] as const).map((n) => (
                  <button
                    key={n}
                    aria-pressed={target === n}
                    onClick={() => setTarget(n)}
                  >
                    {n} cards
                  </button>
                ))}
              </div>
              <p className="muted">
                Your first card counts. Seven is a good place to start.
              </p>
            </fieldset>
          )}
          <button className="primary full" onClick={start}>
            Start Game
          </button>
        </section>
      )}
      {screen === "game" && game && player && (
        <section className="play">
          <div className="scoreboard" aria-label="Player scores">
            {game.players.map((p, i) => (
              <div key={i} className={i === game.currentPlayer ? "active" : ""}>
                <span>{p.name}</span>
                <b>
                  {score(game, p)}
                  <small> / {game.target}</small>
                </b>
              </div>
            ))}
          </div>
          {game.phase === "winner" ? (
            <section className="finish" aria-live="polite">
              <div className="eyebrow">WINNER</div>
              <h1>{player.name}</h1>
              <p>
                {junior
                  ? `${score(game, player)} correct answers. ${player.cards.length} cards including your starter.`
                  : `${player.cards.length} cards. A timeline worth celebrating.`}
              </p>
              <button
                className="primary"
                onClick={() => {
                  setMode(gameMode(game));
                  if (game.difficulty) setDifficulty(game.difficulty);
                  setScreen("setup");
                }}
              >
                New Game
              </button>
              <div className="final-timeline">
                {player.cards.map((id) => (
                  <Card key={id} id={id} />
                ))}
              </div>
            </section>
          ) : game.phase === "exhausted" ? (
            <section className="finish">
              <div className="eyebrow">PACK COMPLETE</div>
              <h1>
                {game.players
                  .filter(
                    (p) =>
                      score(game, p) ===
                      Math.max(...game.players.map((p) => score(game, p))),
                  )
                  .map((p) => p.name)
                  .join(" & ")}
              </h1>
              <p>
                No unused tracks remain. Highest score wins; ties are shared.
              </p>
              <button
                className="primary"
                onClick={() => {
                  setMode(gameMode(game));
                  if (game.difficulty) setDifficulty(game.difficulty);
                  setScreen("setup");
                }}
              >
                New Game
              </button>
            </section>
          ) : (
            <>
              <div className="turn-heading">
                <div>
                  <div className="eyebrow">TURN {game.turn}</div>
                  <h1>{player.name}'s turn</h1>
                </div>
                <span className="remaining">{game.deck.length + 1} left</span>
              </div>
              {game.phase === "placing" && mystery ? (
                <section className="mystery">
                  <div className="eyebrow">LISTEN FIRST</div>
                  <h2>
                    Mystery Track{" "}
                    <span className="mystery-icon" aria-hidden="true">
                      ?
                    </span>
                  </h2>
                  <p>
                    {easy
                      ? "Listen, then decide: older or newer than your comparison track?"
                      : "Scan or open the track and listen before placing it on your timeline."}
                  </p>
                  <div className="listen-actions">
                    <button
                      className="primary"
                      ref={qrTrigger}
                      onClick={() => setQr(true)}
                    >
                      Show QR
                    </button>
                    <a
                      className="secondary"
                      href={mystery.spotifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open in Spotify
                    </a>
                  </div>
                  <p className="small-note">
                    Keep the Spotify screen hidden from the guessing player.
                  </p>
                  {junior && (
                    <div className="hint-panel">
                      <button
                        className="secondary full"
                        disabled={
                          (game.hintLevel ?? 0) >= 2 ||
                          (!easy && (player.hintsRemaining ?? 0) === 0)
                        }
                        onClick={() => setGame(spendHint(game))}
                      >
                        {easy
                          ? `Show hint (${2 - (game.hintLevel ?? 0)} left this track)`
                          : `Use hint (${player.hintsRemaining ?? 0} left this game)`}
                      </button>
                      {(game.hintLevel ?? 0) > 0 && (
                        <p className="hint-text" role="status">
                          {hintText(mystery.year, game.hintLevel!)}
                        </p>
                      )}
                    </div>
                  )}
                </section>
              ) : (
                mystery && (
                  <section
                    className={`reveal ${game.correct ? "correct" : "wrong"}`}
                    aria-live="polite"
                  >
                    <div className="eyebrow">
                      {game.correct ? "Correct!" : "Wrong"}
                    </div>
                    <strong className="reveal-year">{mystery.year}</strong>
                    <h2>{mystery.title}</h2>
                    <p>{mystery.artist}</p>
                    <p className="small-note">
                      {game.correct
                        ? "This track is yours."
                        : junior
                          ? "Good try! Your earned cards stay. The next track is a fresh chance."
                          : "This track leaves the round."}
                    </p>
                    <button
                      className="primary full"
                      onClick={() => {
                        setGame(nextTurn(game));
                        setQr(false);
                        window.scrollTo({ top: 0, behavior: "instant" });
                      }}
                    >
                      Next Turn
                    </button>
                  </section>
                )
              )}
              <div className="timeline-heading">
                <h2>
                  {easy && game.phase === "placing"
                    ? "Your comparison track"
                    : "Your timeline"}
                </h2>
                <span>
                  {score(game, player)} / {game.target}{" "}
                  {junior ? "correct" : "cards"}
                </span>
              </div>
              {easy && game.phase === "placing" ? (
                <>
                  <div className="comparison-card">
                    <Card id={player.reference!} />
                  </div>
                  <div className="comparison-choices">
                    {["Older", "Newer"].map((label, i) => (
                      <button
                        key={label}
                        className={`slot ${game.selected === i ? "selected" : ""}`}
                        aria-pressed={game.selected === i}
                        onClick={() => setGame({ ...game, selected: i })}
                      >
                        <span aria-hidden="true">{i === 0 ? "←" : "→"}</span>
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="muted">
                    The same year? Either answer is correct.
                  </p>
                  <details className="collected-cards">
                    <summary>
                      Your collected cards ({player.cards.length})
                    </summary>
                    <div className="final-timeline">
                      {player.cards.map((id) => (
                        <Card key={id} id={id} />
                      ))}
                    </div>
                  </details>
                </>
              ) : (
                <div className="timeline">
                  {Array.from({ length: player.cards.length + 1 }, (_, i) => (
                    <div key={i}>
                      {game.phase === "placing" && (
                        <button
                          className={`slot ${game.selected === i ? "selected" : ""}`}
                          aria-label={`Place in gap ${i + 1}`}
                          aria-pressed={game.selected === i}
                          onClick={() => setGame({ ...game, selected: i })}
                        >
                          <span>+</span>{" "}
                          {game.selected === i
                            ? "Your pick"
                            : i === 0
                              ? "Before the first track"
                              : i === player.cards.length
                                ? "After the last track"
                                : "Place here"}
                        </button>
                      )}
                      {i < player.cards.length && (
                        <Card
                          id={player.cards[i]}
                          highlight={
                            game.phase === "reveal" &&
                            game.correct === true &&
                            player.cards[i] === game.mystery
                          }
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
              {game.phase === "placing" && (
                <div className="lock-bar">
                  <button
                    className="primary full"
                    disabled={game.selected === null}
                    onClick={() => {
                      setGame(lockAnswer(game, allSongs));
                      setQr(false);
                      window.scrollTo({ top: 0, behavior: "instant" });
                    }}
                  >
                    Lock in answer
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}
      {qr && mystery && game?.phase === "placing" && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeQr();
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qr-title"
            onKeyDown={(e) => {
              if (e.key === "Escape") closeQr();
              if (e.key === "Tab") {
                e.preventDefault();
                closeRef.current?.focus();
              }
            }}
          >
            <div className="eyebrow">PASS THE MUSIC, NOT THE ANSWER</div>
            <h2 id="qr-title">Scan to listen</h2>
            <div className="qr">
              <QRCodeSVG
                value={mystery.spotifyUrl}
                size={300}
                level="M"
                marginSize={4}
                title="Mystery track Spotify QR code"
              />
            </div>
            <p>
              Use another phone's camera. Keep its Spotify screen away from the
              guessing player.
            </p>
            <button ref={closeRef} className="primary full" onClick={closeQr}>
              Done
            </button>
          </section>
        </div>
      )}
      {confirmNew && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-title"
          >
            <h2 id="new-title">Start a new game?</h2>
            <p>Your saved game will be replaced when you press Start Game.</p>
            <button
              className="primary full"
              onClick={() => {
                setConfirmNew(false);
                setScreen("setup");
              }}
            >
              Set up New Game
            </button>
            <button
              className="secondary full"
              onClick={() => setConfirmNew(false)}
            >
              Keep playing
            </button>
          </section>
        </div>
      )}
      <footer>
        Timeline Tracks <span>Listen. Place. Reveal.</span>
      </footer>
    </main>
  );
}
