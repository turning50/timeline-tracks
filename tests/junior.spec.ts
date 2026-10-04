import { test, expect, type Page } from "@playwright/test";
import juniorSongs from "../src/data/junior-songs.json" with { type: "json" };
import classicSongs from "../src/data/songs.json" with { type: "json" };
import { createGame, STORAGE_KEY, type Game } from "../src/game/engine";
const songs = [...classicSongs, ...juniorSongs];
const lookup = (id: string) => songs.find((s) => s.id === id)!;
async function state(page: Page): Promise<Game> {
  return page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)!),
    STORAGE_KEY,
  );
}
async function setup(
  page: Page,
  mode = "Junior",
  difficulty = "Easy",
  count = 2,
) {
  await page.goto("./");
  await page.getByRole("button", { name: new RegExp(`^${mode} `) }).click();
  await page.getByRole("button", { name: "New Game", exact: true }).click();
  await page.getByRole("button", { name: String(count), exact: true }).click();
  if (mode === "Junior")
    await page
      .getByRole("button", { name: new RegExp(`^${difficulty} `) })
      .click();
  await page.getByRole("button", { name: "Start Game", exact: true }).click();
}
async function right(page: Page) {
  const g = await state(page);
  const p = g.players[g.currentPlayer];
  const y = lookup(g.mystery!).year;
  if (g.difficulty === "easy")
    await page
      .getByRole("button", {
        name: y <= lookup(p.reference!).year ? "Older" : "Newer",
        exact: true,
      })
      .click();
  else {
    const slot = p.cards.filter((id) => lookup(id).year < y).length;
    await page
      .getByRole("button", { name: `Place in gap ${slot + 1}`, exact: true })
      .click();
  }
  await page
    .getByRole("button", { name: "Lock in answer", exact: true })
    .click();
}
test("Junior easy: select theme, QR, two hints, selected answer and restore", async ({
  page,
}) => {
  await setup(page, "Junior", "Easy", 3);
  await expect(page.locator("main")).toHaveClass(/theme-junior/);
  await expect(
    page.getByRole("heading", { name: "Your comparison track" }),
  ).toBeVisible();
  expect((await state(page)).target).toBe(5);
  await expect(
    page.getByRole("button", { name: "Place in gap 1", exact: true }),
  ).toHaveCount(0);
  const g = await state(page);
  const s = lookup(g.mystery!);
  await expect(page.locator(".mystery")).not.toContainText(s.artist);
  await expect(page.locator(".mystery")).not.toContainText(s.title);
  await expect(
    page.getByRole("link", { name: "Open in Spotify" }),
  ).toHaveAttribute("href", s.spotifyUrl);
  await page.getByRole("button", { name: /Show hint/ }).click();
  await expect(page.locator(".hint-text")).toContainText("Released in");
  await page.getByRole("button", { name: /Show hint/ }).click();
  await expect(page.getByRole("button", { name: /Show hint/ })).toBeDisabled();
  await page.getByRole("button", { name: "Show QR" }).click();
  await expect(page.locator(".qr svg")).toBeVisible();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Older", exact: true }).click();
  await page.reload();
  await page
    .getByRole("button", { name: "Continue Game", exact: true })
    .click();
  await expect(page.locator("main")).toHaveClass(/theme-junior/);
  await expect(
    page.getByRole("button", { name: "Older", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /Show hint/ })).toBeDisabled();
  await right(page);
  await expect(page.locator(".reveal")).toContainText("Correct!");
  await page.getByRole("button", { name: "Next Turn" }).click();
  await expect(
    page.getByRole("heading", { name: "Player 2's turn" }),
  ).toBeVisible();
  expect((await state(page)).hintLevel).toBe(0);
  await page.screenshot({
    path: "test-results/junior-easy.png",
    fullPage: true,
  });
});
test("Junior wrong answer keeps already earned cards and reference", async ({
  page,
}) => {
  const pack = juniorSongs;
  let g = createGame(["A", "B"], 5, pack, () => 0.5, {
    mode: "junior",
    difficulty: "easy",
  });
  const a = pack.find((s) => s.year === 2013)!;
  const b = pack.find((s) => s.year === 2016)!;
  const c = pack.find((s) => s.year === 2020)!;
  const d = pack.find((s) => s.year === 2023)!;
  g = {
    ...g,
    players: [
      { name: "A", cards: [a.id, b.id], reference: b.id, hintsRemaining: 2 },
      { name: "B", cards: [c.id], reference: c.id, hintsRemaining: 2 },
    ],
    mystery: d.id,
    deck: [],
    selected: 0,
  };
  await page.goto("./");
  await page.evaluate(
    ({ g, k }) => localStorage.setItem(k, JSON.stringify(g)),
    { g, k: STORAGE_KEY },
  );
  await page.reload();
  await page.getByRole("button", { name: "Continue Game" }).click();
  await page.getByRole("button", { name: "Lock in answer" }).click();
  await expect(page.locator(".reveal")).toContainText(
    "Good try! Your earned cards stay.",
  );
  const result = await state(page);
  expect(result.players[0]).toEqual(g.players[0]);
  await expect(page.locator(".song-card")).toHaveCount(2);
});
test("Junior challenge: full timeline and two hints per player survive later turns", async ({
  page,
}) => {
  await setup(page, "Junior", "Challenge");
  expect((await state(page)).target).toBe(7);
  await expect(
    page.getByRole("button", { name: "Older", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /Use hint/ }).click();
  await page.getByRole("button", { name: /Use hint/ }).click();
  await right(page);
  await page.getByRole("button", { name: "Next Turn" }).click();
  await expect(
    page.getByRole("button", {
      name: "Use hint (2 left this game)",
      exact: true,
    }),
  ).toBeEnabled();
  await right(page);
  await page.getByRole("button", { name: "Next Turn" }).click();
  await expect(
    page.getByRole("button", {
      name: "Use hint (0 left this game)",
      exact: true,
    }),
  ).toBeDisabled();
  await page.reload();
  await page.getByRole("button", { name: "Continue Game" }).click();
  await expect(
    page.getByRole("button", {
      name: "Use hint (0 left this game)",
      exact: true,
    }),
  ).toBeDisabled();
  await page.screenshot({
    path: "test-results/junior-challenge.png",
    fullPage: true,
  });
});
for (const difficulty of ["Easy", "Challenge"])
  test(`Junior ${difficulty}: six players play to required correct-answer winner`, async ({
    page,
  }) => {
    await setup(page, "Junior", difficulty, 6);
    for (let i = 0; i < 42; i++) {
      await right(page);
      if (await page.locator(".finish").isVisible()) break;
      await page.getByRole("button", { name: "Next Turn" }).click();
    }
    await expect(page.locator(".finish")).toContainText("WINNER");
    await expect(page.locator(".finish")).toContainText(
      `${difficulty === "Easy" ? 5 : 7} correct answers`,
    );
    await page.reload();
    await page.getByRole("button", { name: "View Last Game" }).click();
    await expect(page.locator(".finish")).toContainText("WINNER");
  });
test("Family warm theme, Classic preservation, legacy save and reduced motion", async ({
  page,
}) => {
  await setup(page, "Family");
  await expect(page.locator("main")).toHaveClass(/theme-family/);
  await expect(page.getByRole("button", { name: /hint/ })).toHaveCount(0);
  await right(page);
  await page.screenshot({
    path: "test-results/family-mobile.png",
    fullPage: true,
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page
      .locator(".reveal")
      .evaluate((e) => getComputedStyle(e).animationName),
  ).toBe("none");
  const classic = createGame(["A", "B"], 7, classicSongs);
  delete classic.mode;
  delete classic.difficulty;
  delete classic.hintLevel;
  await page.evaluate(
    ({ g, k }) => localStorage.setItem(k, JSON.stringify(g)),
    { g: classic, k: STORAGE_KEY },
  );
  await page.reload();
  await page.getByRole("button", { name: /^Junior / }).click();
  await page.getByRole("button", { name: "Continue Game" }).click();
  await expect(page.locator("main")).toHaveClass(/theme-classic/);
  expect(
    await page
      .locator(".primary")
      .first()
      .evaluate((e) => getComputedStyle(e).backgroundColor),
  ).toBe("rgb(232, 179, 102)");
  await expect(page.locator(".scoreboard")).toContainText("1");
});
test("All themes: readable contrast, touch targets and narrow-screen layout", async ({
  page,
}) => {
  const contrast = (foreground: string, background: string) => {
    const luminance = (color: string) => {
      const c = color
        .match(/\d+/g)!
        .slice(0, 3)
        .map(Number)
        .map((x) => {
          x /= 255;
          return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
        });
      return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
    };
    const a = luminance(foreground),
      b = luminance(background);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("./");
  for (const name of ["Classic", "Junior", "Family"]) {
    await page.getByRole("button", { name: new RegExp(`^${name} `) }).click();
    const colors = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const button = getComputedStyle(
        document.querySelector(".home-actions button")!,
      );
      const text = getComputedStyle(document.querySelector(".intro")!);
      return {
        background: root.backgroundColor,
        text: root.color,
        secondary: text.color,
        button: button.color,
        buttonBackground: button.backgroundColor,
      };
    });
    expect(contrast(colors.text, colors.background)).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(
      contrast(colors.secondary, colors.background),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(colors.button, colors.buttonBackground),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const sizes = await page
      .locator(".mode-option")
      .evaluateAll((es) => es.map((e) => e.getBoundingClientRect().height));
    expect(sizes.every((h) => h >= 44)).toBe(true);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({
    path: "test-results/family-home.png",
    fullPage: true,
  });
});
