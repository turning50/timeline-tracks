export interface Song {
  id: string;
  artist: string;
  title: string;
  year: number;
  spotifyUrl: string;
  genre?: string;
  country?: string;
}
export type GameMode = "classic" | "junior" | "family";
export type Difficulty = "easy" | "challenge";
export interface GameOptions {
  mode: GameMode;
  difficulty?: Difficulty;
}
export interface Player {
  name: string;
  cards: string[];
  reference?: string;
  hintsRemaining?: number;
}
export interface Game {
  version: 1;
  mode?: GameMode;
  difficulty?: Difficulty | null;
  hintLevel?: number;
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
export function gameMode(game: Game): GameMode {
  return game.mode ?? "classic";
}
export function isEasy(game: Game): boolean {
  return gameMode(game) === "junior" && game.difficulty === "easy";
}
export function score(game: Game, player: Player): number {
  return player.cards.length - (gameMode(game) === "junior" ? 1 : 0);
}
export function isCorrectComparison(
  referenceYear: number,
  year: number,
  answer: number,
): boolean {
  return (
    Number.isFinite(referenceYear) &&
    Number.isFinite(year) &&
    ((answer === 0 && year <= referenceYear) ||
      (answer === 1 && year >= referenceYear))
  );
}
export function spendHint(game: Game): Game {
  const level = game.hintLevel ?? 0;
  const p = game.players[game.currentPlayer];
  if (
    gameMode(game) !== "junior" ||
    game.phase !== "placing" ||
    level >= 2 ||
    (!isEasy(game) && (p.hintsRemaining ?? 0) <= 0)
  )
    return game;
  return {
    ...game,
    hintLevel: level + 1,
    players: game.players.map((player, i) =>
      i === game.currentPlayer && !isEasy(game)
        ? { ...player, hintsRemaining: player.hintsRemaining! - 1 }
        : player,
    ),
  };
}
export function hintText(year: number, level: number): string {
  if (level === 1) return `Released in the ${Math.floor(year / 10) * 10}s.`;
  if (level === 2) {
    const start = Math.floor(year / 5) * 5;
    return `Released between ${start} and ${start + 4}.`;
  }
  return "";
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
  options: GameOptions = { mode: "classic" },
): Game {
  if (
    names.length < 2 ||
    names.length > 6 ||
    ![5, 7, 10].includes(target) ||
    songs.length < names.length + 1
  )
    throw new Error("Invalid game setup");
  if (
    !["classic", "junior", "family"].includes(options.mode) ||
    (options.mode === "junior" &&
      !["easy", "challenge"].includes(options.difficulty ?? ""))
  )
    throw new Error("Invalid game mode");
  const finish =
    options.mode === "junior"
      ? options.difficulty === "easy"
        ? 5
        : 7
      : target;
  const ids = shuffled(
    songs.map((s) => s.id),
    random,
  );
  const players = names.map((name, i) => {
    const seed = ids.shift()!;
    return {
      name: name.trim().slice(0, 30) || `Player ${i + 1}`,
      cards: [seed],
      ...(options.mode === "junior"
        ? { reference: seed, hintsRemaining: 2 }
        : {}),
    };
  });
  return {
    version: 1,
    mode: options.mode,
    difficulty: options.mode === "junior" ? options.difficulty! : null,
    hintLevel: 0,
    players,
    target: finish,
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
  const years = player.cards.map((id) => map.get(id)!.year);
  const year = map.get(game.mystery)!.year;
  const correct = isEasy(game)
    ? isCorrectComparison(map.get(player.reference!)!.year, year, game.selected)
    : isCorrectPlacement(years, year, game.selected);
  const cards = [...player.cards];
  if (correct) {
    const slot = isEasy(game)
      ? years.filter((y) => y <= year).length
      : game.selected;
    cards.splice(slot, 0, game.mystery);
  }
  const players = game.players.map((p, i) =>
    i === game.currentPlayer
      ? {
          ...p,
          cards,
          ...(gameMode(game) === "junior" && correct
            ? { reference: game.mystery! }
            : {}),
        }
      : p,
  );
  return {
    ...game,
    players,
    correct,
    phase:
      correct && score(game, players[game.currentPlayer]) >= game.target
        ? "winner"
        : "reveal",
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
    hintLevel: 0,
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
    const mode = gameMode(g);
    if (
      !["classic", "junior", "family"].includes(mode) ||
      (mode === "junior" &&
        (!["easy", "challenge"].includes(g.difficulty ?? "") ||
          g.target !== (isEasy(g) ? 5 : 7))) ||
      (mode !== "junior" && g.difficulty != null) ||
      (g.hintLevel !== undefined &&
        (!Number.isInteger(g.hintLevel) ||
          g.hintLevel < 0 ||
          g.hintLevel > 2)) ||
      (mode !== "junior" && (g.hintLevel ?? 0) !== 0)
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
      if (
        mode === "junior" &&
        (!p.reference ||
          !p.cards.includes(p.reference) ||
          !Number.isInteger(p.hintsRemaining) ||
          p.hintsRemaining! < 0 ||
          p.hintsRemaining! > 2)
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
          g.selected > (isEasy(g) ? 1 : p.cards.length - (g.correct ? 1 : 0)))
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
      if (g.phase === "winner" && (!g.correct || score(g, p) < g.target))
        return null;
    }
    return g;
  } catch {
    return null;
  }
}
