const { test, expect } = require("@playwright/test");

const SERIES = ["the bear"];
const YEARS = { Arrival: "2016", Frozen: "2013" };
const IMDB = { Arrival: "7.9", Frozen: "7.4" };
// Wikidata items of the FSK ratings: Q20644794 = FSK 0, Q20644796 = FSK 12.
const FSK = { Frozen: "Q20644794", Arrival: "Q20644796", "Dune: Part Two": "Q20644796" };

const names = new Map();
function idFor(name) {
  let hash = 7;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % 10000000;
  const id = `tt${hash}`;
  names.set(id, name);
  return id;
}

test.beforeEach(async ({ page }) => {
  await page.route("https://www.omdbapi.com/**", async route => {
    const url = new URL(route.request().url());
    const search = url.searchParams.get("s");
    const name = search || names.get(url.searchParams.get("i")) || url.searchParams.get("t");
    const type = SERIES.includes(name.toLowerCase()) ? "series" : "movie";
    const item = { Title: name, Year: YEARS[name] || "2024", Type: type, imdbID: idFor(name), Poster: "N/A" };
    const body = search
      ? { Response: "True", Search: [item] }
      : { Response: "True", ...item, imdbRating: IMDB[name] || "8.5", Genre: "Sci-Fi, Drama", Plot: "A short plot." };
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.route("https://79frdp12pn-dsn.algolia.net/**", async route => {
    const query = new URLSearchParams(JSON.parse(route.request().postData()).params).get("query");
    const type = SERIES.includes(query.toLowerCase()) ? "tv" : "movie";
    const hits = [{ title: query, type, releaseYear: Number(YEARS[query] || 2024), vanity: query.toLowerCase().replace(/\W+/g, "_"), rottenTomatoes: { audienceScore: 92, criticsScore: 50 } }];
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ hits }) });
  });
  await page.route("https://query.wikidata.org/**", async route => {
    const query = new URL(route.request().url()).searchParams.get("query");
    const bindings = [...query.matchAll(/"(tt\d+)"/g)]
      .map(([, id]) => [id, FSK[names.get(id)]])
      .filter(([, item]) => item)
      .map(([id, item]) => ({ imdb: { value: id }, fsk: { value: `http://www.wikidata.org/entity/${item}` } }));
    await route.fulfill({ contentType: "application/sparql-results+json", body: JSON.stringify({ results: { bindings } }) });
  });
  await page.goto("/");
  await page.evaluate(async () => {
    localStorage.clear();
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    for (const key of await caches.keys()) await caches.delete(key);
  });
  await page.reload();
});

const tab = (page, name) => page.getByRole("navigation", { name: "Lists" }).getByRole("button", { name });
const cardOf = (page, name) => page.locator(".card", { has: page.getByRole("heading", { name, exact: true }) });

async function addTitle(page, title, { providers = [], fsk } = {}) {
  await page.getByRole("button", { name: "Add title" }).first().click();
  const dialog = page.locator("#titleDialog");
  await dialog.getByRole("searchbox", { name: "Search movies and series" }).fill(title);
  await dialog.locator(".lookup-result").click();
  await expect(dialog.getByRole("button", { name: "Add to watchlist" })).toBeVisible();
  if (fsk !== undefined) await dialog.getByLabel("Age rating (FSK)").selectOption(fsk);
  for (const provider of providers) await dialog.getByRole("checkbox", { name: provider }).check();
  await dialog.getByRole("button", { name: "Add to watchlist" }).click();
  await expect(dialog).toBeHidden();
}

test("shows the two list views with counts and adds a title with IMDb, RT audience, moveez score and FSK", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Watchlist (0)" })).toBeVisible();
  await expect(tab(page, "Binged")).toHaveText("Binged");

  await addTitle(page, "Dune: Part Two");

  await expect(page.getByRole("heading", { name: "Watchlist (1)" })).toBeVisible();
  const card = cardOf(page, "Dune: Part Two");
  await expect(card).toContainText("8.5");
  await expect(card).toContainText("92%");
  await expect(card.locator(".score")).toHaveText("7.8");
  await expect(card.locator(".fsk")).toHaveAttribute("title", "FSK 12");
  await expect(card.getByRole("link", { name: /Rotten Tomatoes/ })).toHaveAttribute("href", "https://www.rottentomatoes.com/m/dune_part_two");
});

test("refreshes watchlist ratings and missing FSK in the background after start-up", async ({ page }) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route("https://www.omdbapi.com/**", async route => { await gate; await route.fallback(); });
  await page.evaluate(id => localStorage.setItem("moveez-titles-v2", JSON.stringify([
    { id: "a", imdbID: id, name: "Arrival", year: "2016", type: "movie", imdbRating: "5.0", rtRating: "40", genres: [], services: [], cinemaNow: true, cinema: "UCI Dresden", seen: false }
  ])), idFor("Arrival"));
  await page.reload();

  const card = cardOf(page, "Arrival");
  await expect(card).toContainText("5.0");
  await expect(card).not.toContainText("40%");
  // The former "now in cinema" flag became a regular provider label.
  await expect(card.locator(".chip.provider")).toHaveText("UCI Dresden");

  release();
  await expect(card).toContainText("7.9");
  await expect(card).toContainText("92%");
  await expect(card.locator(".score")).toHaveText("7.3");
  await expect(card.locator(".fsk")).toHaveAttribute("title", "FSK 12");
});

test("shows details and adds a title while the FSK lookup hangs", async ({ page }) => {
  await page.route("https://query.wikidata.org/**", () => new Promise(() => {}));
  await addTitle(page, "Arrival", { fsk: "12" });
  await expect(cardOf(page, "Arrival").locator(".fsk")).toHaveAttribute("title", "FSK 12");
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

test("filters by FSK, hiding titles without a known age rating", async ({ page }) => {
  await addTitle(page, "Frozen");
  await addTitle(page, "Arrival");
  await addTitle(page, "The Bear");
  await expect(cardOf(page, "Frozen").locator(".fsk")).toHaveAttribute("title", "FSK 0");
  await expect(cardOf(page, "The Bear").locator(".fsk")).toHaveAttribute("title", "FSK unknown");

  await page.getByLabel("Filter by age rating").selectOption("6");
  await expect(page.locator(".card h2")).toHaveText(["Frozen"]);

  // Setting the FSK by hand makes the title show up in the filtered list.
  await page.getByLabel("Filter by age rating").selectOption("all");
  await cardOf(page, "The Bear").getByRole("button", { name: "FSK unknown – change" }).click();
  const dialog = page.locator("#editDialog");
  await dialog.getByLabel("Age rating (FSK)").selectOption("6");
  await dialog.getByRole("button", { name: "Save" }).click();
  await page.getByLabel("Filter by age rating").selectOption("6");
  await expect(page.locator(".card h2")).toHaveText(["The Bear", "Frozen"]);
});

test("offers streaming services and cinemas with logos, and filters by them", async ({ page }) => {
  await addTitle(page, "Arrival", { providers: ["CinemaxX Dresden", "Netflix"] });
  await addTitle(page, "Frozen", { providers: ["Disney+"] });

  const chips = cardOf(page, "Arrival").locator(".chip.provider");
  await expect(chips).toHaveText(["Netflix", "CinemaxX Dresden"]);
  await expect(chips.first().locator("img")).toHaveAttribute("src", "icons/providers/netflix.png");

  await page.getByLabel("Filter by service or cinema").selectOption("CinemaxX Dresden");
  await expect(page.locator(".card h2")).toHaveText(["Arrival"]);

  await page.getByLabel("Filter by service or cinema").selectOption("all");
  await cardOf(page, "Frozen").getByRole("button", { name: "Edit Frozen" }).click();
  await page.locator("#editDialog").getByRole("checkbox", { name: "UCI Dresden" }).check();
  await page.locator("#editDialog").getByRole("button", { name: "Save" }).click();
  await expect(cardOf(page, "Frozen").locator(".chip.provider")).toHaveText(["Disney+", "UCI Dresden"]);
});

test("sorts by date added, release year and ratings", async ({ page }) => {
  await addTitle(page, "Frozen");
  await addTitle(page, "Dune: Part Two");
  await addTitle(page, "Arrival");
  const order = () => page.locator(".card h2");

  await expect(order()).toHaveText(["Arrival", "Dune: Part Two", "Frozen"]);
  await page.getByLabel("Sort by").selectOption("year");
  await expect(order()).toHaveText(["Dune: Part Two", "Arrival", "Frozen"]);
  await page.getByLabel("Sort by").selectOption("imdb");
  await expect(order()).toHaveText(["Dune: Part Two", "Arrival", "Frozen"]);
  await page.getByLabel("Sort by").selectOption("moveez");
  await expect(order()).toHaveText(["Dune: Part Two", "Arrival", "Frozen"]);
});

test("moves a title to binge history with a popcorn rating", async ({ page }) => {
  await addTitle(page, "Spirited Away");
  await cardOf(page, "Spirited Away").getByRole("button", { name: "Binged" }).click();
  await page.locator('[data-rating="5"]').click();
  await page.getByRole("button", { name: "Add to binge history" }).click();

  await expect(page.getByRole("heading", { name: "Watchlist (0)" })).toBeVisible();
  await tab(page, "Binged").click();
  await expect(page.getByRole("heading", { name: "Binged (1)" })).toBeVisible();
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
