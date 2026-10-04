import { test, expect } from "@playwright/test";
import songs from "../src/data/songs.json" with { type: "json" };
import { createGame, STORAGE_KEY } from "../src/game/engine";
async function start(page: import("@playwright/test").Page, n = 2, target = 5) {
  await page.goto("./");
  await page.getByRole("button", { name: "New Game", exact: true }).click();
  await page.getByRole("button", { name: String(n), exact: true }).click();
  await page
    .getByRole("button", { name: `${target} cards`, exact: true })
    .click();
  await page.getByRole("button", { name: "Start Game" }).click();
}
async function correctGap(page: import("@playwright/test").Page) {
  const g = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)!),
    STORAGE_KEY,
  );
  const year = songs.find((s) => s.id === g.mystery)!.year;
  const years = g.players[g.currentPlayer].cards.map(
    (id: string) => songs.find((s) => s.id === id)!.year,
  );
  return years.filter((y: number) => y < year).length;
}
test("mobile: start, hide answer, QR, link, placement, reveal, next and restore", async ({
  page,
}) => {
  await start(page, 3);
  await expect(
    page.getByRole("heading", { name: "Player 1's turn" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Mystery Track" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Lock in answer" }),
  ).toBeDisabled();
  const g = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)!),
    STORAGE_KEY,
  );
  const mystery = songs.find((s) => s.id === g.mystery)!;
  await expect(page.locator(".mystery")).not.toContainText(mystery.title);
  await expect(page.locator(".mystery")).not.toContainText(mystery.artist);
  await expect(
    page.getByRole("link", { name: "Open in Spotify" }),
  ).toHaveAttribute("href", mystery.spotifyUrl);
  await page.getByRole("button", { name: "Show QR" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".qr svg")).toBeVisible();
  expect(
    await page
      .locator(".qr svg")
      .evaluate((e) => e.getBoundingClientRect().width),
  ).toBeGreaterThan(260);
  await page.screenshot({ path: "test-results/mobile-qr.png" });
  await page.getByRole("button", { name: "Done", exact: true }).click();
  const slot = await correctGap(page);
  await page
    .getByRole("button", { name: `Place in gap ${slot + 1}`, exact: true })
    .click();
  await page.getByRole("button", { name: "Lock in answer" }).click();
  await expect(page.locator(".reveal")).toContainText("Correct!");
  await expect(page.locator(".reveal")).toContainText(mystery.title);
  await page.reload();
  await page.getByRole("button", { name: "Continue Game" }).click();
  await expect(page.locator(".reveal")).toContainText("Correct!");
  await page.getByRole("button", { name: "Next Turn" }).click();
  await expect(
    page.getByRole("heading", { name: "Player 2's turn" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/mobile-game.png",
    fullPage: true,
  });
});
test("wrong placement and rotation", async ({ page }) => {
  // This case needs different years; equal years correctly accept both gaps.
  await page.addInitScript(() => {
    Math.random = () => 0.5;
  });
  await start(page);
  const right = await correctGap(page);
  await page
    .getByRole("button", {
      name: `Place in gap ${right === 0 ? 2 : 1}`,
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Lock in answer" }).click();
  await expect(page.locator(".reveal")).toContainText("Wrong");
  await expect(page.locator(".song-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Next Turn" }).click();
  await expect(
    page.getByRole("heading", { name: "Player 2's turn" }),
  ).toBeVisible();
});
test("play to a winner with six players and restore", async ({ page }) => {
  await start(page, 6);
  for (let i = 0; i < 24; i++) {
    const slot = await correctGap(page);
    await page
      .getByRole("button", { name: `Place in gap ${slot + 1}`, exact: true })
      .click();
    await page.getByRole("button", { name: "Lock in answer" }).click();
    if (await page.locator(".finish").isVisible()) break;
    await page.getByRole("button", { name: "Next Turn" }).click();
  }
  await expect(page.locator(".finish")).toContainText("WINNER");
  await page.reload();
  await page.getByRole("button", { name: "View Last Game" }).click();
  await expect(page.locator(".finish")).toContainText("WINNER");
});
test("same-year cards, chosen slot persistence and corrupt storage", async ({
  page,
}) => {
  const sorted = [...songs].sort((a, b) => a.year - b.year);
  const pair = sorted.find((s, i) => i > 0 && s.year === sorted[i - 1].year)!;
  const other = sorted.find((s) => s.year === pair.year && s.id !== pair.id)!;
  let g = createGame(["A", "B"], 7, songs);
  g = {
    ...g,
    players: [
      { name: "A", cards: [pair.id] },
      {
        name: "B",
        cards: [songs.find((s) => s.id !== pair.id && s.id !== other.id)!.id],
      },
    ],
    mystery: other.id,
    deck: [],
    selected: 1,
  };
  await page.goto("./");
  await page.evaluate(
    ({ key, g }) => localStorage.setItem(key, JSON.stringify(g)),
    { key: STORAGE_KEY, g },
  );
  await page.reload();
  await page.getByRole("button", { name: "Continue Game" }).click();
  await expect(
    page.getByRole("button", { name: "Place in gap 2", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Lock in answer" }).click();
  await expect(page.locator(".reveal")).toContainText("Correct!");
  await page.evaluate((k) => localStorage.setItem(k, "broken"), STORAGE_KEY);
  await page.reload();
  await expect(page.getByRole("button", { name: "Continue Game" })).toHaveCount(
    0,
  );
});
test("Pages assets, PWA scope, desktop and offline shell", async ({
  page,
  request,
}) => {
  await page.goto("./");
  const manifest = await request.get("manifest.webmanifest");
  expect(manifest.ok()).toBe(true);
  expect((await manifest.json()).start_url).toBe("./");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "New Game", exact: true }),
  ).toBeVisible();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await page.context().setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "New Game", exact: true }),
  ).toBeVisible();
  await page.context().setOffline(false);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({
    path: "test-results/desktop-home.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
