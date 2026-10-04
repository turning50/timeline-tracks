import { describe, it, expect } from "vitest";
import {
  createGame,
  isCorrectComparison,
  isCorrectPlacement,
  lockAnswer,
  nextTurn,
  restoreGame,
  score,
  spendHint,
  hintText,
  type Song,
  type Game,
  type Difficulty,
} from "./engine";
import juniorSongs from "../data/junior-songs.json";
import classicSongs from "../data/songs.json";
const songs: Song[] = Array.from({ length: 80 }, (_, i) => ({
  id: String(i),
  artist: "A",
  title: "T",
  year: 1980 + Math.floor(i / 2),
  spotifyUrl: "https://open.spotify.com/track/4PTG3Z6ehGkBFwjybzWkR8",
}));
const year = (id: string) => songs[Number(id)].year;
function start(difficulty: Difficulty = "easy", n = 2) {
  return createGame(
    Array.from({ length: n }, (_, i) => `P${i + 1}`),
    10,
    songs,
    () => 0.6,
    { mode: "junior", difficulty },
  );
}
function answer(g: Game, correct = true): Game {
  const p = g.players[g.currentPlayer];
  const y = year(g.mystery!);
  const choices =
    g.difficulty === "easy"
      ? [0, 1]
      : Array.from({ length: p.cards.length + 1 }, (_, i) => i);
  const selected = choices.find(
    (i) =>
      (g.difficulty === "easy"
        ? isCorrectComparison(year(p.reference!), y, i)
        : isCorrectPlacement(p.cards.map(year), y, i)) === correct,
  )!;
  return lockAnswer({ ...g, selected }, songs);
}
describe("Junior rules", () => {
  it.each([0, 1])("accepts equal years for easy answer %i", (selected) => {
    let g = start();
    g = {
      ...g,
      players: [
        { ...g.players[0], cards: ["0"], reference: "0" },
        { ...g.players[1], cards: ["2"], reference: "2" },
      ],
      mystery: "1",
      deck: [],
      selected,
    };
    const result = lockAnswer(g, songs);
    expect(result.correct).toBe(true);
    expect(score(result, result.players[0])).toBe(1);
    expect(restoreGame(JSON.stringify(result), songs)).toEqual(result);
  });
  it.each([0, 1])("accepts equal years in challenge gap %i", (selected) => {
    let g = start("challenge");
    g = {
      ...g,
      players: [
        { ...g.players[0], cards: ["0"], reference: "0" },
        { ...g.players[1], cards: ["2"], reference: "2" },
      ],
      mystery: "1",
      deck: [],
      selected,
    };
    expect(lockAnswer(g, songs).correct).toBe(true);
  });
  it.each(["easy", "challenge"] as const)(
    "wins only after the required correct answers: %s",
    (difficulty) => {
      let g = start(difficulty, 6);
      expect(g.target).toBe(difficulty === "easy" ? 5 : 7);
      expect(score(g, g.players[0])).toBe(0);
      const seen = new Set(g.players.flatMap((p) => p.cards));
      while (g.phase !== "winner") {
        expect(seen.has(g.mystery!)).toBe(false);
        seen.add(g.mystery!);
        g = answer(g);
        expect(restoreGame(JSON.stringify(g), songs)).toEqual(g);
        if (g.phase !== "winner") g = nextTurn(g);
      }
      const p = g.players[g.currentPlayer];
      expect(score(g, p)).toBe(g.target);
      expect(p.cards).toHaveLength(g.target + 1);
      expect(restoreGame(JSON.stringify(g), songs)).toEqual(g);
    },
  );
  it.each(["easy", "challenge"] as const)(
    "wrong answer preserves earned cards, score and reference: %s",
    (difficulty) => {
      let g = start(difficulty);
      g = answer(g);
      g = nextTurn(answer(nextTurn(g)));
      const before = g.players[0];
      const missed = g.mystery;
      g = answer(g, false);
      expect(g.correct).toBe(false);
      expect(g.players[0]).toEqual(before);
      expect(score(g, g.players[0])).toBe(1);
      expect(restoreGame(JSON.stringify(g), songs)).toEqual(g);
      expect(nextTurn(g).deck).not.toContain(missed);
    },
  );
  it("keeps easy cards sorted when comparing against a middle card", () => {
    const g = {
      ...start(),
      players: [
        {
          name: "A",
          cards: ["0", "20", "50"],
          reference: "20",
          hintsRemaining: 2,
        },
        { name: "B", cards: ["2"], reference: "2", hintsRemaining: 2 },
      ],
      mystery: "30",
      deck: [],
      selected: 1,
    };
    const result = lockAnswer(g, songs);
    expect(result.players[0].cards).toEqual(["0", "20", "30", "50"]);
    expect(result.players[0].reference).toBe("30");
  });
  it("limits challenge hints per player for the whole game, including restore", () => {
    let g = spendHint(start("challenge"));
    g = spendHint(g);
    expect(g.hintLevel).toBe(2);
    expect(g.players[0].hintsRemaining).toBe(0);
    expect(spendHint(g)).toEqual(g);
    g = restoreGame(JSON.stringify(g), songs)!;
    g = nextTurn(answer(g));
    expect(g.hintLevel).toBe(0);
    expect(g.players[1].hintsRemaining).toBe(2);
    g = nextTurn(answer(g));
    expect(spendHint(g)).toEqual(g);
  });
  it("resets easy hints each track, but never in the middle of a saved turn", () => {
    let g = spendHint(spendHint(start()));
    expect(spendHint(g)).toEqual(g);
    expect(restoreGame(JSON.stringify(g), songs)).toEqual(g);
    expect(g.players[0].hintsRemaining).toBe(2);
    g = nextTurn(answer(g));
    expect(g.hintLevel).toBe(0);
    expect(spendHint(g).hintLevel).toBe(1);
    expect(spendHint(answer(g))).toEqual(answer(g));
  });
  it("hints reveal a decade or five-year window, not an exact answer", () => {
    expect(hintText(2013, 1)).toBe("Released in the 2010s.");
    expect(hintText(2013, 2)).toBe("Released between 2010 and 2014.");
    expect(hintText(2013, 0)).toBe("");
  });
  it("restores legacy Classic saves with the original rules", () => {
    const g = createGame(["A", "B"], 7, classicSongs);
    delete g.mode;
    delete g.difficulty;
    delete g.hintLevel;
    expect(restoreGame(JSON.stringify(g), classicSongs)).toEqual(g);
    expect(score(g, g.players[0])).toBe(1);
    expect(spendHint(g)).toEqual(g);
  });
  it("Family uses classic targets and no hints", () => {
    const g = createGame(["A", "B"], 10, juniorSongs, () => 0.5, {
      mode: "family",
    });
    expect(g.target).toBe(10);
    expect(score(g, g.players[0])).toBe(1);
    expect(spendHint(g)).toEqual(g);
    expect(restoreGame(JSON.stringify(g), juniorSongs)).toEqual(g);
  });
  it("rejects bad Junior settings and corrupted rules or references", () => {
    expect(() =>
      createGame(["A", "B"], 5, songs, Math.random, { mode: "junior" }),
    ).toThrow();
    const g = start();
    for (const value of [
      { ...g, target: 10 },
      { ...g, mode: "unknown" },
      { ...g, hintLevel: 3 },
      { ...g, selected: 2 },
      { ...g, players: g.players.map((p) => ({ ...p, hintsRemaining: -1 })) },
      { ...g, players: g.players.map((p) => ({ ...p, reference: g.mystery })) },
    ])
      expect(restoreGame(JSON.stringify(value), songs)).toBeNull();
  });
  it("provides a separate, unique 46-song Junior pack without changing Classic", () => {
    expect(juniorSongs).toHaveLength(46);
    expect(classicSongs).toHaveLength(37);
    expect(new Set(juniorSongs.map((s) => s.id)).size).toBe(46);
    expect(new Set(juniorSongs.map((s) => s.spotifyUrl)).size).toBe(46);
    expect(juniorSongs.filter((s) => s.year >= 2010).length).toBeGreaterThan(
      20,
    );
    for (const s of juniorSongs)
      expect(s.spotifyUrl).toMatch(
        /^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]{22}$/,
      );
  });
});
