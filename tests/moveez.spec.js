const { test, expect } = require("@playwright/test");

const SERIES = ["the bear"];

test.beforeEach(async ({ page }) => {
  await page.route("https://www.omdbapi.com/**", async route => {
    const url = new URL(route.request().url());
    const search = url.searchParams.get("s");
    const id = url.searchParams.get("i");
    const name = search || decodeURIComponent((id || "").replace(/^tt-/, ""));
    const type = SERIES.includes(name.toLowerCase()) ? "series" : "movie";
    const imdbID = `tt-${encodeURIComponent(name)}`;
    const body = search
      ? { Response: "True", Search: [{ Title: name, Year: "2024", Type: type, imdbID, Poster: "N/A" }] }
      : { Response: "True", Title: name, Year: "2024", Type: type, imdbID, imdbRating: "8.5", Genre: "Sci-Fi, Drama", Plot: "A short plot.", Poster: "N/A" };
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.route("https://79frdp12pn-dsn.algolia.net/**", async route => {
    const query = new URLSearchParams(JSON.parse(route.request().postData()).params).get("query");
    const type = SERIES.includes(query.toLowerCase()) ? "tv" : "movie";
    const hits = [{ title: query, type, releaseYear: 2024, vanity: query.toLowerCase().replace(/\W+/g, "_"), rottenTomatoes: { audienceScore: 92, criticsScore: 50 } }];
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ hits }) });
  });
  await page.goto("/");
  await page.evaluate(async () => {
    localStorage.clear();
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    for (const key of await caches.keys()) await caches.delete(key);
  });
  await page.reload();
});

async function addTitle(page, title) {
  await page.getByRole("button", { name: "Add title" }).first().click();
  const dialog = page.locator("#titleDialog");
  await dialog.getByRole("searchbox", { name: "Search movies and series" }).fill(title);
  await dialog.locator(".lookup-result").click();
  await dialog.getByRole("button", { name: "Add to watchlist" }).click();
  await expect(dialog).toBeHidden();
}

test("shows the two list views and adds a title with IMDb, RT audience and moveez score", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Watchlist", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Binged/ })).toBeVisible();

  await addTitle(page, "Dune: Part Two");

  const card = page.locator(".card", { hasText: "Dune: Part Two" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("8.5");
  await expect(card).toContainText("92%");
  await expect(card.locator(".score")).toHaveText("7.8");
  await expect(card.getByRole("link", { name: /Rotten Tomatoes/ })).toHaveAttribute("href", "https://www.rottentomatoes.com/m/dune_part_two");
  await expect(page.getByRole("button", { name: /Watchlist/ })).toContainText("1");
});

test("refreshes watchlist ratings in the background after start-up", async ({ page }) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route("https://www.omdbapi.com/**", async route => { await gate; await route.fallback(); });
  await page.evaluate(() => localStorage.setItem("moveez-titles-v2", JSON.stringify([
    { id: "a", imdbID: "tt-Arrival", name: "Arrival", year: "2024", type: "movie", imdbRating: "5.0", rtRating: "40", genres: [], services: [], seen: false }
  ])));
  await page.reload();

  const card = page.locator(".card", { hasText: "Arrival" });
  await expect(card).toContainText("5.0");
  await expect(card).not.toContainText("40%");
  await page.getByRole("button", { name: /Binged/ }).click();
  await page.getByRole("button", { name: /Watchlist/ }).click();

  release();
  await expect(card).toContainText("8.5");
  await expect(card).toContainText("92%");
  await expect(card.locator(".score")).toHaveText("7.8");
});

test("closes the add dialog with the X button", async ({ page }) => {
  await page.getByRole("button", { name: "Add title" }).first().click();
  const dialog = page.locator("#titleDialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
});

test("prevents adding the same title twice", async ({ page }) => {
  await addTitle(page, "Arrival");
  await page.getByRole("button", { name: "Add title" }).first().click();
  const dialog = page.locator("#titleDialog");
  await dialog.getByRole("searchbox", { name: "Search movies and series" }).fill("Arrival");
  await expect(dialog.locator(".lookup-result")).toContainText("On your list");
  await dialog.locator(".lookup-result").click();
  await expect(dialog.getByRole("button", { name: "Already on your list" })).toBeDisabled();
});

test("filters titles by format and searches by title", async ({ page }) => {
  await addTitle(page, "The Bear");
  await addTitle(page, "Arrival");

  await page.getByLabel("Filter by type").selectOption("series");
  await expect(page.getByRole("heading", { name: "The Bear" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Arrival" })).toHaveCount(0);

  await page.locator("#searchInput").fill("arrival");
  await expect(page.getByRole("heading", { name: "No matches" })).toBeVisible();
});

test("moves a title to binge history with a popcorn rating", async ({ page }) => {
  await addTitle(page, "Spirited Away");
  await page.getByRole("button", { name: "Mark watched" }).click();
  await page.locator('[data-rating="5"]').click();
  await page.getByRole("button", { name: "Add to binge history" }).click();

  await page.getByRole("button", { name: /Binged/ }).click();
  await expect(page.getByRole("heading", { name: "Spirited Away" })).toBeVisible();
  await expect(page.locator("#titleGrid").getByText("🍿🍿🍿🍿🍿")).toBeVisible();
});

test("persists settings locally and closes settings without saving via X", async ({ page }) => {
  await page.getByRole("button", { name: "Open settings" }).click();
  await page.getByLabel("OMDb API key").fill("test-key");
  await page.getByLabel("LLM model").fill("test-model");
  await page.getByRole("button", { name: "Save settings" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Open settings" }).click();
  await expect(page.getByLabel("OMDb API key")).toHaveValue("test-key");
  await page.getByLabel("LLM model").fill("changed");
  await page.locator("#settingsDialog").getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: "Open settings" }).click();
  await expect(page.getByLabel("LLM model")).toHaveValue("test-model");
});
