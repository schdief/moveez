const { test, expect } = require("@playwright/test");

const SERIES = ["the bear"];
const YEARS = { Arrival: "2016", Frozen: "2013" };
const IMDB = { Arrival: "7.9", Frozen: "7.4" };
// Wikidata items of the FSK ratings: Q20644794 = FSK 0, Q20644796 = FSK 12.
const WIKIDATA_FSK = { Frozen: "Q20644794", Arrival: "Q20644796", "Dune: Part Two": "Q20644796" };
// TMDB (only used when a TMDB key is configured).
const TMDB = {
  "Toy Story 5": { fsk: "0", titleDe: "Toy Story 5", flatrate: ["Disney Plus"] },
  "The Odyssey": { fsk: "12", titleDe: "Die Odyssee", flatrate: [] },
  "The Bear": { fsk: "16", titleDe: "The Bear: King of the Kitchen", flatrate: ["Disney Plus", "WOW"] }
};
const day = offset => { const date = new Date(); date.setDate(date.getDate() + offset); return date.toLocaleDateString("sv-SE"); };
const CINEMAS = {
  cinemas: [
    { name: "CinemaxX Dresden", url: "https://www.kinoprogramm.com/kino/dresden/cinemaxx-42197", films: [
      { title: "Die Odyssee", fsk: "12", genres: ["Abenteuer"], runtime: "150 Min.", days: [day(0)], showtimes: [{ date: day(0), time: "23:40", version: "Deutsch" }], url: "https://www.kinoprogramm.com/kino/dresden/cinemaxx/die-odyssee-1" },
      { title: "Toy Story 5", fsk: "0", genres: ["Trickfilm"], runtime: "97 Min.", days: [day(1)], showtimes: [{ date: day(1), time: "15:15", version: "Deutsch" }], url: "https://www.kinoprogramm.com/kino/dresden/cinemaxx/toy-story-5-2" }
    ] },
    { name: "UCI Dresden", url: "https://www.kinoprogramm.com/kino/dresden/uci-kinowelt-elbe-park-40872", films: [
      { title: "Toy Story 5", fsk: "0", genres: ["Trickfilm"], runtime: "97 Min.", days: [day(0), day(1)], showtimes: [{ date: day(0), time: "23:50", version: "Deutsch/3D" }, { date: day(1), time: "13:50", version: "Deutsch" }], url: "https://www.kinoprogramm.com/kino/dresden/uci/toy-story-5-2" }
    ] }
  ]
};

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
      .map(([, id]) => [id, WIKIDATA_FSK[names.get(id)]])
      .filter(([, item]) => item)
      .map(([id, item]) => ({ imdb: { value: id }, fsk: { value: `http://www.wikidata.org/entity/${item}` } }));
    await route.fulfill({ contentType: "application/sparql-results+json", body: JSON.stringify({ results: { bindings } }) });
  });
  await page.route("https://api.themoviedb.org/3/**", async route => {
    const url = new URL(route.request().url());
    const [, kind, key] = url.pathname.match(/\/3\/(find|movie|tv)\/([^/]+)/);
    const name = kind === "find" ? names.get(key) : names.get(`tt${key}`);
    const info = TMDB[name];
    if (kind === "find") {
      const hit = info ? [{ id: Number(key.slice(2)) }] : [];
      const series = SERIES.includes(name.toLowerCase());
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ movie_results: series ? [] : hit, tv_results: series ? hit : [] }) });
    }
    const providers = { results: { DE: { link: "https://www.themoviedb.org/watch", flatrate: info.flatrate.map(provider_name => ({ provider_name, logo_path: `/${provider_name}.png` })) } } };
    const body = kind === "tv"
      ? { name: info.titleDe, content_ratings: { results: [{ iso_3166_1: "US", rating: "TV-MA" }, { iso_3166_1: "DE", rating: info.fsk }] }, "watch/providers": providers }
      : { title: info.titleDe, release_dates: { results: [{ iso_3166_1: "DE", release_dates: [{ certification: "" }, { certification: info.fsk }] }] }, "watch/providers": providers };
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.route("**/data/cinemas.json", route => route.fulfill({ status: 404, body: "" }));
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

async function useTmdbAndCinemas(page) {
  await page.route("**/data/cinemas.json", route => route.fulfill({ contentType: "application/json", body: JSON.stringify(CINEMAS) }));
  await page.evaluate(() => localStorage.setItem("moveez-settings-v2", JSON.stringify({ tmdbKey: "test-key" })));
  await page.reload();
}

async function addTitle(page, title) {
  await page.getByRole("searchbox", { name: "Search your list or add from IMDb" }).fill(title);
  await page.locator("#suggestions .lookup-result", { hasText: title }).click();
  const dialog = page.locator("#titleDialog");
  await dialog.getByRole("button", { name: "Add to watchlist" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("searchbox")).toHaveValue("");
}

test("shows the list count in a bubble and adds a title with IMDb, RT audience, moveez score and FSK", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Watchlist 0" })).toBeVisible();
  await expect(tab(page, "Binged")).toHaveText("Binged");

  await addTitle(page, "Dune: Part Two");

  await expect(page.locator("#viewCount")).toHaveText("1");
  const card = cardOf(page, "Dune: Part Two");
  await expect(card.getByRole("img", { name: "Movie" })).toBeVisible();
  await expect(card).toContainText("8.5");
  await expect(card).toContainText("92%");
  await expect(card.locator(".score")).toHaveText("7.8");
  // No TMDB key here: the FSK comes from Wikidata in the background.
  await expect(card.getByRole("img", { name: "FSK 12" })).toBeVisible();
  await expect(card.getByRole("link", { name: /Rotten Tomatoes/ })).toHaveAttribute("href", "https://www.rottentomatoes.com/m/dune_part_two");
  await expect(card.getByRole("button", { name: /edit/i })).toHaveCount(0);
});

test("looks up FSK and streaming services automatically after adding a title", async ({ page }) => {
  await useTmdbAndCinemas(page);
  await addTitle(page, "The Bear");

  const card = cardOf(page, "The Bear");
  await expect(card.getByRole("img", { name: "TV series" })).toBeVisible();
  await expect(card.getByRole("img", { name: "FSK 16" })).toBeVisible();
  const services = card.locator(".chip.provider");
  await expect(services).toHaveText(["Disney+", "WOW"]);
  await expect(services.first().locator("img")).toHaveAttribute("src", "icons/providers/disney-plus.png");
  await expect(services.nth(1).locator("img")).toHaveAttribute("src", "https://image.tmdb.org/t/p/w92/WOW.png");
});

test("shows the cinemas that are playing a movie, also under its German title", async ({ page }) => {
  await useTmdbAndCinemas(page);
  await addTitle(page, "Toy Story 5");
  await addTitle(page, "The Odyssey");

  await expect(cardOf(page, "Toy Story 5").locator(".chip.provider")).toHaveText(["CinemaxX Dresden", "UCI Dresden", "Disney+"]);
  const odyssey = cardOf(page, "The Odyssey").getByRole("link", { name: "CinemaxX Dresden" });
  await expect(odyssey).toHaveAttribute("href", "https://www.kinoprogramm.com/kino/dresden/cinemaxx/die-odyssee-1");

  await page.getByLabel("Filter by service or cinema").selectOption("UCI Dresden");
  await expect(page.locator(".card h2")).toHaveText(["Toy Story 5"]);
});

test("the cinema tab shows the programme of the cinemas by day with showtimes", async ({ page }) => {
  // Showtimes that have started are hidden, so pin the clock to the morning.
  await page.clock.setFixedTime(new Date(`${day(0)}T10:00`));
  await useTmdbAndCinemas(page);
  await addTitle(page, "Toy Story 5");
  await tab(page, "Cinema").tap();

  await expect(page.getByRole("heading", { name: "Cinema 2" })).toBeVisible();
  await expect(page.locator("#dayBar .day")).toHaveText(["Today", "Tomorrow"]);
  // Earliest showtime first; the watchlist title is recognised.
  await expect(page.locator(".card h2")).toHaveText(["Die Odyssee", "Toy Story 5"]);
  const toyStory = cardOf(page, "Toy Story 5");
  await expect(toyStory.locator(".time")).toHaveText(["23:503D"]);
  await expect(toyStory).toContainText("On your watchlist");

  await page.locator("#dayBar").getByRole("button", { name: "Tomorrow" }).tap();
  await expect(page.locator(".card h2")).toHaveText(["Toy Story 5"]);
  await expect(toyStory.locator(".showtimes")).toHaveCount(2);
  await expect(toyStory.locator(".time")).toHaveText(["15:15", "13:50"]);

  // The FSK filter also applies to the cinema programme.
  await page.locator("#dayBar").getByRole("button", { name: "Today" }).tap();
  await page.getByLabel("Filter by age rating").selectOption("6");
  await expect(page.locator(".card h2")).toHaveText(["Toy Story 5"]);

  // Films not on the watchlist can be looked up on IMDb from here.
  await page.getByLabel("Filter by age rating").selectOption("all");
  await cardOf(page, "Die Odyssee").getByRole("button", { name: "Watchlist" }).tap();
  await expect(page.getByRole("searchbox")).toHaveValue("Die Odyssee");
  await expect(page.locator("#suggestions .lookup-result")).toContainText("Die Odyssee");
});

test("refreshes watchlist ratings and missing FSK in the background after start-up", async ({ page }) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route("https://www.omdbapi.com/**", async route => { await gate; await route.fallback(); });
  await page.evaluate(id => localStorage.setItem("moveez-titles-v2", JSON.stringify([
    { id: "a", imdbID: id, name: "Arrival", year: "2016", type: "movie", imdbRating: "5.0", rtRating: "40", genres: [], services: ["Netflix", "UCI Dresden"], cinemaNow: true, cinema: "UCI Dresden", seen: false }
  ])), idFor("Arrival"));
  await page.reload();

  const card = cardOf(page, "Arrival");
  await expect(card).toContainText("5.0");
  await expect(card).not.toContainText("40%");
  // Services picked by hand in older versions are kept until TMDB knows better; cinemas come from the programmes.
  await expect(card.locator(".chip.provider")).toHaveText(["Netflix"]);

  release();
  await expect(card).toContainText("7.9");
  await expect(card).toContainText("92%");
  await expect(card.locator(".score")).toHaveText("7.3");
  await expect(card.getByRole("img", { name: "FSK 12" })).toBeVisible();
});

test("adds a title even while the FSK lookup hangs", async ({ page }) => {
  await page.route("https://query.wikidata.org/**", () => new Promise(() => {}));
  await addTitle(page, "Arrival");
  await expect(cardOf(page, "Arrival").getByRole("img", { name: "FSK unknown" })).toBeVisible();
});

test("closes the details with the X button", async ({ page }) => {
  await page.getByRole("searchbox").fill("Arrival");
  await page.locator("#suggestions .lookup-result").click();
  const dialog = page.locator("#titleDialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
});

test("one search shows matching titles on the list and suggests the others from IMDb", async ({ page }) => {
  await addTitle(page, "Arrival");
  const search = page.getByRole("searchbox");

  await search.fill("Arrival");
  await expect(page.locator(".card h2")).toHaveText(["Arrival"]);
  await expect(page.locator("#suggestions")).toContainText("IMDb has nothing else for this search.");
  await expect(page.locator("#suggestions .lookup-result")).toHaveCount(0);

  await search.fill("Frozen");
  await expect(page.locator(".card")).toHaveCount(0);
  await expect(page.locator("#titleGrid")).toContainText("Nothing on this list matches “Frozen”.");
  await expect(page.locator("#suggestions .lookup-result")).toContainText("Add");

  // A title on the other list is not added twice; tapping it opens that list instead.
  await search.fill("");
  await cardOf(page, "Arrival").getByRole("button", { name: "Binged" }).click();
  await search.fill("Arrival");
  await page.locator("#suggestions .lookup-result", { hasText: "In Binged" }).click();
  await expect(page.getByRole("heading", { name: "Binged 1" })).toBeVisible();
  await expect(page.locator(".card h2")).toHaveText(["Arrival"]);
});

test("filters titles by format and searches by title", async ({ page }) => {
  await addTitle(page, "The Bear");
  await addTitle(page, "Arrival");

  await page.getByLabel("Filter by type").selectOption("series");
  await expect(page.getByRole("heading", { name: "The Bear" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Arrival" })).toHaveCount(0);

  await page.locator("#searchInput").fill("arrival");
  await expect(page.locator(".card")).toHaveCount(0);
});

test("filters by FSK, hiding titles without a known age rating", async ({ page }) => {
  await addTitle(page, "Frozen");
  await addTitle(page, "Arrival");
  await addTitle(page, "The Bear");
  await expect(cardOf(page, "Frozen").getByRole("img", { name: "FSK 0" })).toBeVisible();
  await expect(cardOf(page, "Arrival").getByRole("img", { name: "FSK 12" })).toBeVisible();
  await expect(cardOf(page, "The Bear").getByRole("img", { name: "FSK unknown" })).toBeVisible();

  await page.getByLabel("Filter by age rating").selectOption("6");
  await expect(page.locator(".card h2")).toHaveText(["Frozen"]);
  await page.getByLabel("Filter by age rating").selectOption("12");
  await expect(page.locator(".card h2")).toHaveText(["Arrival", "Frozen"]);
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

test("moves a title to Binged with one tap and rates it with popcorn there", async ({ page }) => {
  await addTitle(page, "Spirited Away");
  await cardOf(page, "Spirited Away").getByRole("button", { name: "Binged" }).tap();

  await expect(page.locator("#viewCount")).toHaveText("0");
  await tab(page, "Binged").tap();
  await expect(page.getByRole("heading", { name: "Binged 1" })).toBeVisible();
  const card = cardOf(page, "Spirited Away");
  await card.getByRole("button", { name: "4 popcorn bags" }).tap();
  await expect(card.locator(".popcorn-rate .selected")).toHaveCount(4);
  await page.reload();
  await tab(page, "Binged").tap();
  await expect(cardOf(page, "Spirited Away").locator(".popcorn-rate .selected")).toHaveCount(4);
});

test("opens settings by tap, saves them and closes without saving via X", async ({ page }) => {
  await page.getByRole("button", { name: "Open settings" }).tap();
  await expect(page.locator("#settingsDialog")).toBeVisible();
  await page.getByLabel("OMDb API key").fill("test-key");
  await page.getByLabel("LLM model").fill("test-model");
  await page.getByRole("button", { name: "Save settings" }).tap();
  await page.reload();
  await page.getByRole("button", { name: "Open settings" }).tap();
  await expect(page.getByLabel("OMDb API key")).toHaveValue("test-key");
  await page.getByLabel("LLM model").fill("changed");
  await page.locator("#settingsDialog").getByRole("button", { name: "Close" }).tap();
  await page.getByRole("button", { name: "Open settings" }).tap();
  await expect(page.getByLabel("LLM model")).toHaveValue("test-model");
});
