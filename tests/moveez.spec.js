const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("moveez-settings-v2", JSON.stringify({ omdbKey: "test-key" }));
  });
  let catalogTitle = "";
  await page.route("https://www.omdbapi.com/**", async route => {
    const url = new URL(route.request().url());
    const query = url.searchParams.get("s") || "";
    if (query) catalogTitle = query;
    const isSeries = query.toLowerCase().includes("bear") || url.searchParams.get("i") === "tt14452776";
    const body = url.searchParams.has("s")
      ? { Response: "True", Search: [{ Title: query || "Dune: Part Two", Year: "2024", Type: isSeries ? "series" : "movie", imdbID: isSeries ? "tt14452776" : "tt15239678", Poster: "N/A" }] }
      : { Response: "True", Title: isSeries ? "The Bear" : catalogTitle, Year: "2024", Type: isSeries ? "series" : "movie", imdbRating: "8.5", tomatoUserRating: "92", Genre: "Sci-Fi, Drama", Poster: "N/A" };
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.evaluate(async () => {
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    for (const key of await caches.keys()) await caches.delete(key);
  });
  await page.reload();
});

async function addTitle(page, title, type = "movie") {
  await page.getByRole("button", { name: "Browse catalogue" }).click();
  const dialog = page.locator("#titleDialog");
  await dialog.locator("#lookupInput").fill(title);
  await expect(dialog.locator(".lookup-result")).toBeVisible();
  await dialog.locator(".lookup-result").click();
  await dialog.getByRole("button", { name: "Add selected title to watchlist" }).click();
}

test("shows the two list views and adds a title to the watchlist", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "What’s next?" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Watchlist/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Binged/ })).toBeVisible();

  await addTitle(page, "Dune: Part Two");

  await expect(page.getByRole("heading", { name: "Dune: Part Two" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Watchlist/ })).toContainText("1");
});

test("filters titles by format and searches by title", async ({ page }) => {
  await addTitle(page, "The Bear", "series");
  await addTitle(page, "Arrival", "movie");

  await page.getByLabel("Filter by type").selectOption("series");
  await expect(page.getByRole("heading", { name: "The Bear" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Arrival" })).toHaveCount(0);

  await page.locator("#searchInput").fill("arrival");
  await expect(page.getByText("Your next favourite is waiting")).toBeVisible();
});

test("moves a title to binge history with a popcorn rating", async ({ page }) => {
  await addTitle(page, "Spirited Away");
  await page.getByRole("button", { name: "✓ Mark watched" }).click();
  await expect(page.locator("#titleGrid").getByRole("heading", { name: "Spirited Away" })).toBeVisible();
  await page.locator('[data-rating="5"]').click();
  await page.getByRole("button", { name: "Add to binge history" }).click();

  await page.getByRole("button", { name: /Binged/ }).click();
  await expect(page.getByRole("heading", { name: "Spirited Away" })).toBeVisible();
  await expect(page.locator("#titleGrid").getByText("🍿🍿🍿🍿🍿")).toBeVisible();
});

test("persists settings locally and shows the offline-first setup", async ({ page }) => {
  await page.getByRole("button", { name: "Open settings" }).click();
  await page.getByLabel("OMDb API key").fill("test-key");
  await page.getByLabel("LLM model").fill("test-model");
  await page.getByRole("button", { name: "Save settings" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Open settings" }).click();
  await expect(page.getByLabel("OMDb API key")).toHaveValue("test-key");
  await expect(page.getByLabel("LLM model")).toHaveValue("test-model");
});
