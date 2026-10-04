export interface Song {
  id: string;
  artist: string;
  title: string;
  year: number;
  spotifyUrl: string;
  genre?: string;
  country?: string;
}
export interface Player {
  name: string;
  cards: string[];
}
export interface Game {
  version: 1;
  players: Player[];
  target: 5 | 7 | 10;
  currentPlayer: number;
  deck: string[];
  mystery: string | null;
  selected: number | null;
  phase: "placing" | "reveal" | "winner" | "exhausted";
  correct: boolean | null;
  turn: number;
}
export const STORAGE_KEY = "timeline-tracks:game:v1";
export function isCorrectPlacement(
  years: number[],
  year: number,
  slot: number,
): boolean {
  if (
    !Number.isInteger(slot) ||
    slot < 0 ||
    slot > years.length ||
    !Number.isFinite(year)
  )
    return false;
  return (
    (slot === 0 || years[slot - 1] <= year) &&
    (slot === years.length || year <= years[slot])
  );
}
export function shuffled<T>(items: readonly T[], random = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function createGame(
  names: string[],
  target: Game["target"],
  songs: Song[],
  random = Math.random,
): Game {
  if (
    names.length < 2 ||
    names.length > 6 ||
    ![5, 7, 10].includes(target) ||
    songs.length < names.length + 1
  )
    throw new Error("Invalid game setup");
  const ids = shuffled(
    songs.map((s) => s.id),
    random,
  );
  const players = names.map((name, i) => ({
    name: name.trim().slice(0, 30) || `Player ${i + 1}`,
    cards: [ids.shift()!],
  }));
  return {
    version: 1,
    players,
    target,
    currentPlayer: 0,
    deck: ids.slice(1),
    mystery: ids[0],
    selected: null,
    phase: "placing",
    correct: null,
    turn: 1,
  };
}
export function lockAnswer(game: Game, songs: Song[]): Game {
  if (game.phase !== "placing" || game.selected === null || !game.mystery)
    return game;
  const map = new Map(songs.map((s) => [s.id, s]));
  const player = game.players[game.currentPlayer];
  const correct = isCorrectPlacement(
    player.cards.map((id) => map.get(id)!.year),
    map.get(game.mystery)!.year,
    game.selected,
  );
  const cards = [...player.cards];
  if (correct) cards.splice(game.selected, 0, game.mystery);
  const players = game.players.map((p, i) =>
    i === game.currentPlayer ? { ...p, cards } : p,
  );
  return {
    ...game,
    players,
    correct,
    phase: correct && cards.length >= game.target ? "winner" : "reveal",
  };
}
export function nextTurn(game: Game): Game {
  if (game.phase !== "reveal") return game;
  if (!game.deck.length)
    return { ...game, phase: "exhausted", mystery: null, selected: null };
  return {
    ...game,
    currentPlayer: (game.currentPlayer + 1) % game.players.length,
    mystery: game.deck[0],
    deck: game.deck.slice(1),
    selected: null,
    correct: null,
    phase: "placing",
    turn: game.turn + 1,
  };
}
export function restoreGame(raw: string | null, songs: Song[]): Game | null {
  if (!raw) return null;
  try {
    const g: Game = JSON.parse(raw);
    const map = new Map(songs.map((s) => [s.id, s]));
    if (
      g.version !== 1 ||
      !Array.isArray(g.players) ||
      g.players.length < 2 ||
      g.players.length > 6 ||
      ![5, 7, 10].includes(g.target) ||
      !Number.isInteger(g.currentPlayer) ||
      g.currentPlayer < 0 ||
      g.currentPlayer >= g.players.length ||
      !["placing", "reveal", "winner", "exhausted"].includes(g.phase) ||
      !Array.isArray(g.deck) ||
      !Number.isInteger(g.turn) ||
      g.turn < 1 ||
      ![null, true, false].includes(g.correct)
    )
      return null;
    for (const p of g.players) {
      if (
        typeof p.name !== "string" ||
        !p.name.trim() ||
        p.name.length > 30 ||
        !Array.isArray(p.cards) ||
        !p.cards.length ||
        p.cards.some((id) => !map.has(id))
      )
        return null;
      const years = p.cards.map((id) => map.get(id)!.year);
      if (years.some((year, i) => i > 0 && year < years[i - 1])) return null;
    }
    const cards = g.players.flatMap((p) => p.cards);
    if (
      new Set(cards).size !== cards.length ||
      g.deck.some((id) => !map.has(id) || cards.includes(id)) ||
      new Set(g.deck).size !== g.deck.length
    )
      return null;
    if (g.phase === "exhausted") {
      if (g.mystery !== null || g.deck.length || g.selected !== null)
        return null;
    } else {
      if (!g.mystery || !map.has(g.mystery) || g.deck.includes(g.mystery))
        return null;
      const p = g.players[g.currentPlayer];
      if (
        g.selected !== null &&
        (!Number.isInteger(g.selected) ||
          g.selected < 0 ||
          g.selected > p.cards.length - (g.correct ? 1 : 0))
      )
        return null;
      if (
        g.phase === "placing" &&
        (g.correct !== null || cards.includes(g.mystery))
      )
        return null;
      if (
        g.phase !== "placing" &&
        (g.correct === null ||
          g.selected === null ||
          (g.correct
            ? !p.cards.includes(g.mystery)
            : cards.includes(g.mystery)))
      )
        return null;
      if (g.phase === "winner" && (!g.correct || p.cards.length < g.target))
        return null;
    }
    return g;
  } catch {
    return null;
  }
}
