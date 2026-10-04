import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import data from "./data/songs.json";
import {
  createGame,
  lockAnswer,
  nextTurn,
  restoreGame,
  STORAGE_KEY,
  type Game,
  type Song,
} from "./game/engine";
const songs: Song[] = data;
const catalog = new Map(songs.map((s) => [s.id, s]));
function load() {
  try {
    return restoreGame(localStorage.getItem(STORAGE_KEY), songs);
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
    setGame(createGame(names.slice(0, count), target, songs));
    setScreen("game");
    setQr(false);
  }
  const player = game?.players[game.currentPlayer];
  const mystery = game?.mystery ? catalog.get(game.mystery) : null;
  return (
    <main className="app">
      <header>
        <button
          className="brand"
          onClick={() => {
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
      {screen === "home" && (
        <section className="home">
          <div className="eyebrow">A GOOD NIGHT, OUT OF ORDER</div>
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
          <div className="home-actions">
            {game && (
              <button className="primary" onClick={() => setScreen("game")}>
                {game.phase === "winner" || game.phase === "exhausted"
                  ? "View Last Game"
                  : "Continue Game"}
              </button>
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
              <li>Choose a gap on your timeline, then lock your answer.</li>
              <li>
                Correct tracks stay. Equal years count as correct on either
                side.
              </li>
              <li>Your starting card counts toward the target.</li>
            </ol>
            <p>
              Original release years are used, even when Spotify lists a later
              reissue. This pack contains {songs.length} tracks. If it runs out,
              the highest score wins; ties are shared.
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
                  {p.cards.length}
                  <small> / {game.target}</small>
                </b>
              </div>
            ))}
          </div>
          {game.phase === "winner" ? (
            <section className="finish" aria-live="polite">
              <div className="eyebrow">WINNER</div>
              <h1>{player.name}</h1>
              <p>{player.cards.length} cards. A timeline worth celebrating.</p>
              <button className="primary" onClick={() => setScreen("setup")}>
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
                      p.cards.length ===
                      Math.max(...game.players.map((p) => p.cards.length)),
                  )
                  .map((p) => p.name)
                  .join(" & ")}
              </h1>
              <p>
                No unused tracks remain. Highest score wins; ties are shared.
              </p>
              <button className="primary" onClick={() => setScreen("setup")}>
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
                    Scan or open the track and listen before placing it on your
                    timeline.
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
                <h2>Your timeline</h2>
                <span>
                  {player.cards.length} / {game.target} cards
                </span>
              </div>
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
              {game.phase === "placing" && (
                <div className="lock-bar">
                  <button
                    className="primary full"
                    disabled={game.selected === null}
                    onClick={() => {
                      setGame(lockAnswer(game, songs));
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
