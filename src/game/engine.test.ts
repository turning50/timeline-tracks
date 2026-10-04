import { describe, it, expect } from "vitest";
import {
  createGame,
  isCorrectPlacement,
  lockAnswer,
  nextTurn,
  restoreGame,
  type Song,
  type Game,
} from "./engine";
import songs from "../data/songs.json";
const fixtures: Song[] = Array.from({ length: 80 }, (_, i) => ({
  id: String(i),
  artist: "Artist",
  title: "Song",
  year: 1950 + i,
  spotifyUrl: "https://open.spotify.com/track/4PTG3Z6ehGkBFwjybzWkR8",
}));
function answer(g: Game, correct = true) {
  const years = g.players[g.currentPlayer].cards.map(
    (id) => fixtures[Number(id)].year,
  );
  const year = fixtures[Number(g.mystery)].year;
  const slot = Array.from({ length: years.length + 1 }, (_, i) => i).find(
    (i) => isCorrectPlacement(years, year, i) === correct,
  )!;
  return lockAnswer({ ...g, selected: slot }, fixtures);
}
describe("chronological placement", () => {
  it.each([
    [0, 1980, true],
    [0, 2003, false],
    [1, 2003, false],
    [2, 2003, true],
    [3, 2003, false],
    [3, 2020, true],
  ])("slot %s for %s", (slot, year, correct) =>
    expect(isCorrectPlacement([1985, 1997, 2010], year, slot)).toBe(correct),
  );
  it("accepts equal years on both sides and between ties", () => {
    for (const slot of [1, 2, 3])
      expect(isCorrectPlacement([1980, 2000, 2000, 2020], 2000, slot)).toBe(
        true,
      );
  });
  it("handles empty timelines and invalid slots", () => {
    expect(isCorrectPlacement([], 2000, 0)).toBe(true);
    for (const slot of [-1, 4, 1.5])
      expect(isCorrectPlacement([1980, 2000, 2020], 2001, slot)).toBe(false);
  });
});
describe("game lifecycle", () => {
  it.each([2, 3, 4, 5, 6])("starts %s players with unique cards", (n) => {
    const g = createGame(
      Array.from({ length: n }, (_, i) => `P${i}`),
      7,
      fixtures,
    );
    expect(g.players).toHaveLength(n);
    const ids = [...g.players.flatMap((p) => p.cards), ...g.deck, g.mystery!];
    expect(new Set(ids).size).toBe(fixtures.length);
    expect(restoreGame(JSON.stringify(g), fixtures)).toEqual(g);
  });
  it("normalizes names", () => {
    expect(
      createGame(["  ", " Thomas "], 5, fixtures).players.map((p) => p.name),
    ).toEqual(["Player 1", "Thomas"]);
  });
  it("keeps correct cards and removes wrong cards from future play", () => {
    let g = createGame(["A", "B"], 7, fixtures, () => 0.5);
    const mystery = g.mystery;
    g = answer(g);
    expect(g.players[0].cards).toContain(mystery);
    expect(g.correct).toBe(true);
    expect(restoreGame(JSON.stringify(g), fixtures)).toEqual(g);
    g = nextTurn(g);
    const missed = g.mystery;
    g = answer(g, false);
    expect(g.correct).toBe(false);
    expect(g.players[1].cards).not.toContain(missed);
    expect(nextTurn(g).deck).not.toContain(missed);
  });
  it("rejects duplicate lock / next and rotates all six players", () => {
    let g = createGame(["A", "B", "C", "D", "E", "F"], 10, fixtures);
    expect(lockAnswer(g, fixtures)).toEqual(g);
    expect(nextTurn(g)).toEqual(g);
    for (let i = 0; i < 6; i++) {
      expect(g.currentPlayer).toBe(i);
      g = answer(g);
      expect(lockAnswer(g, fixtures)).toEqual(g);
      g = nextTurn(g);
    }
    expect(g.currentPlayer).toBe(0);
  });
  it("finishes at target with no repeated mystery songs", () => {
    let g = createGame(["A", "B"], 5, fixtures);
    const seen = new Set(g.players.flatMap((p) => p.cards));
    while (g.phase !== "winner") {
      expect(seen.has(g.mystery!)).toBe(false);
      seen.add(g.mystery!);
      g = answer(g);
      if (g.phase !== "winner") g = nextTurn(g);
    }
    expect(g.players[g.currentPlayer].cards).toHaveLength(5);
    expect(nextTurn(g)).toEqual(g);
    expect(restoreGame(JSON.stringify(g), fixtures)).toEqual(g);
  });
  it("handles exhausted packs without repeating", () => {
    let g = createGame(["A", "B"], 10, fixtures.slice(0, 4));
    g = answer(g, false);
    g = nextTurn(g);
    g = answer(g, false);
    g = nextTurn(g);
    expect(g.phase).toBe("exhausted");
    expect(restoreGame(JSON.stringify(g), fixtures)).toEqual(g);
  });
  it("restores a selected answer and rejects corrupted saves", () => {
    const g = { ...createGame(["A", "B"], 7, fixtures), selected: 1 };
    expect(restoreGame(JSON.stringify(g), fixtures)).toEqual(g);
    for (const raw of [
      "bad",
      "{}",
      JSON.stringify({ ...g, currentPlayer: 99 }),
      JSON.stringify({ ...g, deck: [g.mystery] }),
      JSON.stringify({ ...g, selected: -1 }),
      JSON.stringify({ ...g, version: 2 }),
    ])
      expect(restoreGame(raw, fixtures)).toBeNull();
  });
});
describe("song pack integrity", () => {
  it("has unique IDs and real-form Spotify track URLs across decades", () => {
    expect(songs.length).toBeGreaterThanOrEqual(30);
    expect(new Set(songs.map((s) => s.id)).size).toBe(songs.length);
    expect(new Set(songs.map((s) => s.spotifyUrl)).size).toBe(songs.length);
    expect(
      new Set(songs.map((s) => Math.floor(s.year / 10))).size,
    ).toBeGreaterThanOrEqual(6);
    for (const s of songs) {
      expect(s.artist.length).toBeGreaterThan(0);
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.spotifyUrl).toMatch(
        /^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]{22}$/,
      );
      expect(Number.isInteger(s.year)).toBe(true);
    }
  });
});
