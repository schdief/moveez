const STORAGE_KEY = "moveez-titles-v2";
const BUILD = "__BUILD__";
const SETTINGS_KEY = "moveez-settings-v2";
// Public key that the original Moveez GUI shipped with; users can set their own in Settings.
const DEFAULT_OMDB_KEY = "b50af808";
// Injected by the Pages workflow from the TMDB_API_KEY repository secret (TMDB answers browser requests, JustWatch does not).
const TMDB_KEY = "__TMDB_KEY__";
// Rotten Tomatoes has no official API. Its own website searches this public, search-only Algolia index,
// which is the only browser-reachable source of the audience score.
const RT_SEARCH = "https://79frdp12pn-dsn.algolia.net/1/indexes/content_rt/query?x-algolia-application-id=79FRDP12PN&x-algolia-api-key=175588f6e5f8319b27702e4cc4013561";
const REFRESH_AFTER_MS = 12 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10000;
// Programmes are collected by scripts/cinemas.mjs in the Pages workflow and published next to the app.
const CINEMAS = [
  { name: "CinemaxX Dresden", logo: "icons/providers/cinemaxx.png" },
  { name: "Filmpalast Bautzen", logo: "icons/providers/filmpalast.png" },
  { name: "UCI Dresden", logo: "icons/providers/uci.png" }
];
// TMDB provider names → short names and bundled logos (other services use the TMDB logo).
const STREAMING = [
  { match: /^netflix/i, name: "Netflix", logo: "icons/providers/netflix.png" },
  { match: /^amazon prime/i, name: "Prime Video", logo: "icons/providers/prime-video.png" },
  { match: /^disney/i, name: "Disney+", logo: "icons/providers/disney-plus.png" },
  { match: /^apple tv/i, name: "Apple TV+", logo: "icons/providers/apple-tv.png" },
  { match: /^paramount/i, name: "Paramount+", logo: "icons/providers/paramount-plus.png" }
];
const FSK_LEVELS = ["0", "6", "12", "16", "18"];
// Wikidata items for the FSK age ratings (property P1981).
const FSK_ITEMS = { Q20644794: "0", Q20644795: "6", Q20644796: "12", Q20644797: "16", Q20644798: "18" };
const ASSETS = "services/gui/app/views/public/";
const NO_COVER = `${ASSETS}nocover.png`;

const $ = id => document.getElementById(id);
const icon = name => `<svg class="icon"><use href="#i-${name}"/></svg>`;

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function streamingService(rawName, logoPath = "") {
  const known = STREAMING.find(service => service.match.test(rawName));
  if (known) return { name: known.name, logo: known.logo };
  return { name: rawName.replace(/ with ads$/i, ""), logo: logoPath ? `https://image.tmdb.org/t/p/w92${logoPath}` : "" };
}
const uniqueByName = list => list.filter((item, index) => list.findIndex(other => other.name === item.name) === index);

let titles = load(STORAGE_KEY, []);
titles.forEach(title => {
  // Earlier versions stored the RT critics score (Tomatometer) as rtRating; Moveez uses the audience score.
  delete title.rtRating;
  delete title.fskManual;
  title.genres ||= [];
  // Services used to be picked by hand; they now come from TMDB. Cinemas come from the live programmes.
  if (!Array.isArray(title.streaming)) {
    const cinemas = CINEMAS.map(cinema => cinema.name);
    title.streaming = uniqueByName((title.services || []).filter(name => !cinemas.includes(name)).map(name => streamingService(name)));
  }
  delete title.services;
  delete title.cinemaNow;
  delete title.cinema;
  title.fsk ??= "";
});
let settings = load(SETTINGS_KEY, {});
let cinemaData = null;
let currentView = "watchlist";
let sortBy = "added";
let detail = null;
let detailToken = 0;
let lookupController = null;
let lookupTimer = null;
let statusTimer = null;

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}
function newId() {
  return crypto.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}
function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(titles));
  render();
}
function showStatus(message, kind = "") {
  const el = $("status");
  clearTimeout(statusTimer);
  el.textContent = message;
  el.className = `toast visible ${kind}`;
  statusTimer = setTimeout(() => { el.className = "toast"; }, kind === "error" ? 9000 : 4500);
}

const posterOf = url => (url && url !== "N/A" ? url : NO_COVER);
const formatLabel = type => (type === "series" ? "TV series" : "Movie");
const typeIcon = type => `<svg class="icon type-icon" role="img" aria-label="${formatLabel(type)}"><title>${formatLabel(type)}</title><use href="#i-${type === "series" ? "tv" : "film"}"/></svg>`;
const imdbUrl = title => (title.imdbID ? `https://www.imdb.com/title/${encodeURIComponent(title.imdbID)}/` : `https://www.imdb.com/find/?q=${encodeURIComponent(title.name)}`);
const rtUrl = title => title.rtUrl || `https://www.rottentomatoes.com/search?search=${encodeURIComponent(title.name)}`;
const isOnList = imdbID => Boolean(imdbID) && titles.some(title => title.imdbID === imdbID);
const today = () => new Date().toLocaleDateString("sv-SE");
const tmdbKey = () => settings.tmdbKey || (TMDB_KEY.startsWith("__") ? "" : TMDB_KEY);
function formatDate(value) {
  const date = new Date(value.length === 10 ? `${value}T00:00` : value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/* ---------- Requests ---------- */

// A stalled request must never leave the app waiting forever (Wikidata sometimes takes very long to answer).
async function fetchJson(url, { signal, ...options } = {}) {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  const timer = setTimeout(() => { timedOut = true; abort(); }, REQUEST_TIMEOUT_MS);
  signal?.addEventListener("abort", abort, { once: true });
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const data = await response.json().catch(error => { if (error.name === "AbortError") throw error; return {}; });
    return { response, data };
  } catch (error) {
    throw timedOut ? new Error("The request timed out.") : error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

/* ---------- OMDb ---------- */

async function omdb(params, signal) {
  const url = new URL("https://www.omdbapi.com/");
  url.search = new URLSearchParams({ apikey: settings.omdbKey || DEFAULT_OMDB_KEY, ...params });
  const { response, data } = await fetchJson(url, { signal });
  if (data.Response === "True") return data;
  throw new Error(data.Error || `OMDb responded with ${response.status}`);
}

function describeLookupError(error, query) {
  if (/not found/i.test(error.message)) return `No movies or series found for “${query}”.`;
  if (/too many/i.test(error.message)) return "Too many matches – keep typing.";
  if (/api key|limit/i.test(error.message)) return `OMDb says: ${error.message}`;
  return "OMDb could not be reached. Check your connection and try again.";
}

function toTitle(data) {
  const clean = value => (value && value !== "N/A" ? value : "");
  return {
    imdbID: data.imdbID,
    name: data.Title,
    year: clean(data.Year),
    type: data.Type === "series" ? "series" : "movie",
    runtime: clean(data.Runtime),
    imdbRating: clean(data.imdbRating),
    genres: clean(data.Genre).split(",").map(genre => genre.trim()).filter(Boolean),
    plot: clean(data.Plot),
    poster: clean(data.Poster)
  };
}

/* ---------- Rotten Tomatoes audience score ---------- */

const normalize = value => String(value || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();

// Resolves to { rtAudience, rtUrl } (empty strings if RT has no matching title); rejects on network errors.
async function fetchRtAudience(title) {
  const params = new URLSearchParams({ query: title.name, hitsPerPage: "10", attributesToRetrieve: JSON.stringify(["title", "titles", "type", "releaseYear", "vanity", "rottenTomatoes"]) });
  // form-urlencoded keeps this a CORS "simple" request (no preflight); Algolia still parses the JSON body.
  const { response, data } = await fetchJson(RT_SEARCH, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: JSON.stringify({ params: params.toString() }) });
  if (!response.ok) throw new Error(`Rotten Tomatoes responded with ${response.status}`);
  const { hits = [] } = data;
  const type = title.type === "series" ? "tv" : "movie";
  const year = parseInt(title.year, 10);
  const name = normalize(title.name);
  const candidates = hits.filter(hit => hit.type === type && (!year || !hit.releaseYear || Math.abs(hit.releaseYear - year) <= 1));
  const hit = candidates.find(item => [item.title, ...(item.titles || [])].some(value => normalize(value) === name));
  if (!hit) return { rtAudience: "", rtUrl: "" };
  const score = hit.rottenTomatoes?.audienceScore;
  return {
    rtAudience: Number.isFinite(score) ? String(score) : "",
    rtUrl: hit.vanity ? `https://www.rottentomatoes.com/${type === "tv" ? "tv" : "m"}/${encodeURIComponent(hit.vanity)}` : ""
  };
}

// IMDb (0–10) × RT audience (0–100 %) → 0–10, so 10 is a perfect score.
function moveezScore(title) {
  const imdb = parseFloat(title.imdbRating);
  const audience = parseFloat(title.rtAudience);
  return Number.isFinite(imdb) && Number.isFinite(audience) ? (Math.round(imdb * audience / 10) / 10).toFixed(1) : "";
}

/* ---------- TMDB: FSK and streaming services in Germany ---------- */

async function tmdb(path, params = {}) {
  const url = new URL(`https://api.themoviedb.org/3/${path}`);
  url.search = new URLSearchParams({ api_key: tmdbKey(), ...params });
  const { response, data } = await fetchJson(url);
  if (!response.ok) throw new Error(data.status_message || `TMDB responded with ${response.status}`);
  return data;
}

// Resolves to the fields TMDB knows for Germany; the streaming offers are JustWatch data.
async function fetchTmdb(title) {
  let kind = title.tmdbType || (title.type === "series" ? "tv" : "movie");
  let id = title.tmdbId;
  if (!id) {
    const found = await tmdb(`find/${encodeURIComponent(title.imdbID)}`, { external_source: "imdb_id" });
    const hit = found[`${kind}_results`]?.[0] || found.movie_results?.[0] || found.tv_results?.[0];
    if (!hit) return { tmdbCheckedAt: new Date().toISOString() };
    kind = found.movie_results?.includes(hit) ? "movie" : "tv";
    id = hit.id;
  }
  const extra = kind === "tv" ? "content_ratings,watch/providers" : "release_dates,watch/providers";
  const data = await tmdb(`${kind}/${id}`, { language: "de-DE", append_to_response: extra });
  const germany = list => (list || []).find(entry => entry.iso_3166_1 === "DE");
  const fsk = kind === "tv"
    ? germany(data.content_ratings?.results)?.rating
    : germany(data.release_dates?.results)?.release_dates?.map(release => release.certification).find(value => FSK_LEVELS.includes(value));
  const offers = data["watch/providers"]?.results?.DE;
  return {
    tmdbId: id,
    tmdbType: kind,
    titleDe: data.title || data.name || "",
    streaming: uniqueByName((offers?.flatrate || []).map(offer => streamingService(offer.provider_name, offer.logo_path))),
    watchUrl: offers?.link || "",
    ...(FSK_LEVELS.includes(fsk) ? { fsk } : {}),
    tmdbCheckedAt: new Date().toISOString()
  };
}

/* ---------- FSK fallback: Wikidata ---------- */

// Resolves to { imdbID: "12", … }.
async function fetchFsk(imdbIDs) {
  const ids = [...new Set(imdbIDs)].filter(id => /^tt\d+$/.test(id));
  if (!ids.length) return {};
  const query = `SELECT ?imdb ?fsk WHERE { VALUES ?imdb { ${ids.map(id => `"${id}"`).join(" ")} } ?item wdt:P345 ?imdb; wdt:P1981 ?fsk. }`;
  const { response, data } = await fetchJson(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`, { headers: { Accept: "application/sparql-results+json" } });
  if (!response.ok) throw new Error(`Wikidata responded with ${response.status}`);
  const found = {};
  for (const row of data.results?.bindings || []) {
    const fsk = FSK_ITEMS[row.fsk?.value.split("/").pop()];
    const id = row.imdb?.value;
    // If Wikidata lists several ratings (e.g. re-releases), the strictest one wins.
    if (fsk && id && (!found[id] || Number(fsk) > Number(found[id]))) found[id] = fsk;
  }
  return found;
}

/* ---------- Cinemas ---------- */

async function loadCinemas() {
  try {
    const { response, data } = await fetchJson("data/cinemas.json");
    if (response.ok && Array.isArray(data.cinemas)) { cinemaData = data; render(); }
  } catch { /* no programme available (e.g. local development) */ }
}

// Cinemas list German titles ("Die Odyssee" for "The Odyssey"), so match the original and the German TMDB title.
function showingsOf(title) {
  if (!cinemaData || title.type !== "movie") return [];
  const names = [title.name, title.titleDe].filter(Boolean).map(normalize);
  return cinemaData.cinemas.flatMap(cinema => {
    const film = cinema.films.find(item => names.includes(normalize(item.title)) || names.includes(normalize(item.title.split(" - ")[0])));
    const logo = CINEMAS.find(item => item.name === cinema.name)?.logo || "";
    return film ? [{ name: cinema.name, logo, film }] : [];
  });
}

const fskOf = title => (FSK_LEVELS.includes(title.fsk) ? title.fsk : showingsOf(title).map(showing => showing.film.fsk).find(fsk => FSK_LEVELS.includes(fsk)) || "");
function fskBadge(title) {
  const fsk = fskOf(title);
  const label = fsk ? `FSK ${fsk}` : "FSK unknown";
  return `<span class="fsk fsk-${fsk || "unknown"}" role="img" aria-label="${label}" title="${label}"><small>FSK</small><b>${fsk || "?"}</b></span>`;
}

/* ---------- Background refresh ---------- */

async function fetchRatings(title) {
  const year = parseInt(title.year, 10);
  const data = title.imdbID
    ? await omdb({ i: title.imdbID })
    : await omdb({ t: title.name, type: title.type, ...(year ? { y: String(year) } : {}) });
  const fresh = toTitle(data);
  const update = { imdbID: fresh.imdbID, imdbRating: fresh.imdbRating, ratingsUpdatedAt: new Date().toISOString() };
  try { Object.assign(update, await fetchRtAudience(fresh)); } catch { /* keep the last known RT values */ }
  return update;
}

const isStale = value => !(Date.now() - Date.parse(value) < REFRESH_AFTER_MS);

// Updates ratings, FSK and where to watch without ever blocking the list; cards change as data arrives.
async function refresh(list, { ratings = title => true, streaming = title => true } = {}) {
  const BATCH = 4;
  for (let index = 0; index < list.length; index += BATCH) {
    const updates = await Promise.all(list.slice(index, index + BATCH).map(async title => {
      const [rated, tmdbData] = await Promise.all([
        ratings(title) ? fetchRatings(title).catch(() => ({})) : {},
        tmdbKey() && title.imdbID && streaming(title) ? fetchTmdb(title).catch(() => ({})) : {}
      ]);
      return [title, { ...rated, ...tmdbData }];
    }));
    let changed = false;
    for (const [title, update] of updates) {
      if (titles.includes(title) && Object.keys(update).length) { Object.assign(title, update); changed = true; }
    }
    if (changed) persist();
  }
  // Wikidata fills in the FSK where TMDB has none (or no TMDB key is configured): one request for all titles.
  const fskDue = list.filter(title => titles.includes(title) && title.imdbID && !FSK_LEVELS.includes(title.fsk));
  if (!fskDue.length) return;
  try {
    const found = await fetchFsk(fskDue.map(title => title.imdbID));
    const updated = fskDue.filter(title => found[title.imdbID]);
    updated.forEach(title => { title.fsk = found[title.imdbID]; });
    if (updated.length) persist();
  } catch { /* try again on the next start */ }
}

function refreshOnStart() {
  // Watchlist titles are kept fresh; binged titles are only backfilled once.
  const ratings = title => (title.seen ? !title.ratingsUpdatedAt : isStale(title.ratingsUpdatedAt));
  const streaming = title => (title.seen ? !title.tmdbCheckedAt : isStale(title.tmdbCheckedAt));
  refresh(titles.filter(title => ratings(title) || (tmdbKey() && streaming(title)) || !FSK_LEVELS.includes(title.fsk)), { ratings, streaming });
}

/* ---------- Rendering ---------- */

function ratingsHtml(title) {
  const score = moveezScore(title);
  const moveez = score
    ? `<span class="rating score" title="Moveez score: IMDb × Rotten Tomatoes audience score"><img src="icons/icon.svg" alt="">${score}</span>`
    : "";
  const imdb = title.imdbRating
    ? `<a class="rating" href="${esc(imdbUrl(title))}" target="_blank" rel="noopener" title="Open on IMDb"><span class="imdb-logo">IMDb</span><span>${esc(title.imdbRating)}</span></a>`
    : "";
  const rt = title.rtAudience
    ? `<a class="rating" href="${esc(rtUrl(title))}" target="_blank" rel="noopener" title="Rotten Tomatoes audience score – open on Rotten Tomatoes"><img class="rt-logo" src="${ASSETS}rottentomato.png" alt="Rotten Tomatoes audience"><span>${esc(title.rtAudience)}%</span></a>`
    : "";
  return moveez || imdb || rt ? `<div class="ratings">${moveez}${imdb}${rt}</div>` : "";
}

const logoImg = logo => (logo ? `<img src="${esc(logo)}" alt="" loading="lazy">` : "");
function whereToWatch(title) {
  const streaming = title.streaming.map(service => title.watchUrl
    ? `<a class="chip provider" href="${esc(title.watchUrl)}" target="_blank" rel="noopener">${logoImg(service.logo)}${esc(service.name)}</a>`
    : `<span class="chip provider">${logoImg(service.logo)}${esc(service.name)}</span>`);
  const cinemas = title.seen ? [] : showingsOf(title).map(({ name, logo, film }) =>
    `<a class="chip provider cinema" href="${esc(film.url)}" target="_blank" rel="noopener" title="Showtimes at ${esc(name)}">${logoImg(logo)}${esc(name)}</a>`);
  return [...cinemas, ...streaming].join("");
}

function popcornButtons(title) {
  return `<div class="popcorn-rate" role="group" aria-label="Your rating">${[1, 2, 3, 4, 5].map(value =>
    `<button type="button" class="${value <= (title.userRating || 0) ? "selected" : ""}" data-rate="${esc(title.id)}" data-value="${value}" aria-pressed="${value === title.userRating}" aria-label="${value} popcorn bag${value > 1 ? "s" : ""}">🍿</button>`).join("")}</div>`;
}

function card(title) {
  const genres = title.genres.map(genre => `<span class="chip">${esc(genre)}</span>`).join("");
  const providers = whereToWatch(title);
  const watched = title.seen ? `<div class="watched"><span class="note">Watched ${esc(formatDate(title.seenOn || ""))}</span>${popcornButtons(title)}</div>` : "";
  const primary = title.seen
    ? `<button class="button soft small" data-unwatch="${esc(title.id)}">${icon("undo")}Watch again</button>`
    : `<button class="button primary small" data-watch="${esc(title.id)}">${icon("check")}Binged</button>`;
  return `<article class="card">
    <img class="poster" src="${esc(posterOf(title.poster))}" alt="" loading="lazy" data-fallback>
    <div class="card-body">
      <div class="card-head">
        <div>
          <p class="meta">${typeIcon(title.type)}${title.year ? `<span>${esc(title.year)}</span>` : ""}</p>
          <h2>${esc(title.name)}</h2>
        </div>
        ${fskBadge(title)}
      </div>
      ${ratingsHtml(title)}
      ${genres ? `<div class="chips">${genres}</div>` : ""}
      ${providers ? `<div class="chips">${providers}</div>` : ""}
      ${watched}
      <div class="card-actions">${primary}<button class="icon-button danger" data-remove="${esc(title.id)}" aria-label="Remove ${esc(title.name)}" title="Remove">${icon("trash")}</button></div>
    </div>
  </article>`;
}

function emptyState(filtered) {
  if (filtered) return `<div class="empty"><h2>No matches</h2><p>Nothing on this list fits your search or filters.</p></div>`;
  if (currentView === "binged") return `<div class="empty"><img src="${ASSETS}logo.png" alt=""><h2>Nothing binged yet</h2><p>Tap “Binged” on a title once you have watched it.</p></div>`;
  return `<div class="empty"><img src="${ASSETS}logo.png" alt=""><h2>Your watchlist is empty</h2><p>Search IMDb for the movies and series you want to watch next.</p><button class="button primary" data-action="add">${icon("plus")}Add title</button></div>`;
}

// Highest first; titles without a value go to the end (Array#sort is stable, so ties keep list order).
const descending = value => (a, b) => {
  const x = value(a), y = value(b);
  if (Number.isNaN(x)) return Number.isNaN(y) ? 0 : 1;
  return Number.isNaN(y) ? -1 : y - x;
};
const SORTS = {
  added: { label: "Recently added", compare: descending(title => Date.parse(title.createdAt)) },
  binged: { label: "Recently binged", compare: descending(title => Date.parse(title.seenOn)) },
  year: { label: "Release year", compare: descending(title => parseInt(title.year, 10)) },
  imdb: { label: "IMDb rating", compare: descending(title => parseFloat(title.imdbRating)) },
  rt: { label: "RT audience", compare: descending(title => parseFloat(title.rtAudience)) },
  moveez: { label: "moveez score", compare: descending(title => parseFloat(moveezScore(title))) }
};

const inCurrentView = title => (currentView === "binged" ? title.seen : !title.seen);
const servicesOf = title => [...title.streaming.map(service => service.name), ...(title.seen ? [] : showingsOf(title).map(showing => showing.name))];

function visibleTitles() {
  const query = $("searchInput").value.trim().toLowerCase();
  const type = $("typeFilter").value;
  const service = $("serviceFilter").value;
  const genre = $("genreFilter").value;
  const fsk = $("fskFilter").value;
  return titles
    .filter(inCurrentView)
    .filter(title => !query || [title.name, title.titleDe].some(name => name?.toLowerCase().includes(query)))
    .filter(title => type === "all" || title.type === type)
    .filter(title => genre === "all" || title.genres.includes(genre))
    .filter(title => service === "all" || servicesOf(title).includes(service))
    // With an age limit, titles without a known FSK are hidden: better safe with kids around.
    .filter(title => fsk === "all" || (fskOf(title) !== "" && Number(fskOf(title)) <= Number(fsk)))
    .sort(SORTS[sortBy].compare);
}

function fillSelect(select, allLabel, groups) {
  const current = select.value;
  const options = list => list.map(item => `<option>${esc(item)}</option>`).join("");
  select.innerHTML = `<option value="all">${allLabel}</option>${groups.map(([label, list]) => (label ? `<optgroup label="${label}">${options(list)}</optgroup>` : options(list))).join("")}`;
  select.value = groups.some(([, list]) => list.includes(current)) ? current : "all";
}

function render() {
  const inView = titles.filter(inCurrentView);
  fillSelect($("genreFilter"), "All genres", [["", [...new Set(titles.flatMap(title => title.genres))].sort()]]);
  const streamingNames = [...new Set(inView.flatMap(title => title.streaming.map(service => service.name)))].sort();
  const cinemaNames = CINEMAS.map(cinema => cinema.name).filter(name => inView.some(title => servicesOf(title).includes(name)));
  fillSelect($("serviceFilter"), "All services", [["Streaming", streamingNames], ["Cinema", cinemaNames]].filter(([, list]) => list.length));
  const sorts = Object.keys(SORTS).filter(key => key !== "binged" || currentView === "binged");
  $("sortSelect").innerHTML = sorts.map(key => `<option value="${key}">${SORTS[key].label}</option>`).join("");
  $("sortSelect").value = sortBy;

  const visible = visibleTitles();
  $("viewName").textContent = currentView === "binged" ? "Binged" : "Watchlist";
  $("viewCount").textContent = inView.length;
  $("surpriseButton").hidden = currentView === "binged";
  document.querySelectorAll(".tab").forEach(tab => {
    const active = tab.dataset.view === currentView;
    tab.classList.toggle("active", active);
    if (active) tab.setAttribute("aria-current", "page"); else tab.removeAttribute("aria-current");
  });
  $("titleGrid").innerHTML = visible.length ? visible.map(card).join("") : emptyState(inView.length > 0);
}

/* ---------- Add title dialog ---------- */

function setLookupMessage(message, kind = "") {
  $("lookupMessage").textContent = message;
  $("lookupMessage").className = `hint ${kind}`;
}

function showLookupPane() {
  detailToken++;
  detail = null;
  $("lookupPane").hidden = false;
  $("detailPane").hidden = true;
  $("detailFoot").hidden = true;
  $("lookupBack").hidden = true;
  $("titleDialogHeading").textContent = "Add title";
}

function openAddDialog() {
  showLookupPane();
  lookupController?.abort();
  $("lookupInput").value = "";
  $("lookupResults").innerHTML = "";
  setLookupMessage("Search IMDb for a movie or series to add.");
  $("titleDialog").showModal();
  $("lookupInput").focus();
}

function resultRow(item) {
  const trailing = isOnList(item.imdbID) ? `<span class="pill">On your list</span>` : icon("next");
  return `<li><button type="button" class="lookup-result" data-imdb="${esc(item.imdbID)}">
    <img src="${esc(posterOf(item.Poster))}" alt="" loading="lazy" data-fallback>
    <span class="result-text"><strong>${esc(item.Title)}</strong><small>${esc(item.Year)} · ${formatLabel(item.Type)}</small></span>
    ${trailing}
  </button></li>`;
}

async function lookup(query) {
  lookupController?.abort();
  if (query.length < 3) {
    $("lookupResults").innerHTML = "";
    setLookupMessage(query ? "Keep typing…" : "Search IMDb for a movie or series to add.");
    return;
  }
  lookupController = new AbortController();
  setLookupMessage("Searching…");
  try {
    const data = await omdb({ s: query }, lookupController.signal);
    const seen = new Set();
    const results = data.Search.filter(item => (item.Type === "movie" || item.Type === "series") && !seen.has(item.imdbID) && seen.add(item.imdbID));
    $("lookupResults").innerHTML = results.map(resultRow).join("");
    setLookupMessage(results.length ? "" : `No movies or series found for “${query}”.`);
  } catch (error) {
    if (error.name === "AbortError") return;
    $("lookupResults").innerHTML = "";
    setLookupMessage(describeLookupError(error, query), "error");
  }
}

function detailHtml(title) {
  const meta = [formatLabel(title.type), title.year, title.runtime].filter(Boolean).map(esc).join(" · ");
  return `<div class="detail">
      <img src="${esc(posterOf(title.poster))}" alt="" data-fallback>
      <div>
        <p class="meta">${meta}</p>
        <h3>${esc(title.name)}</h3>
        ${ratingsHtml(title)}
        ${title.genres.length ? `<div class="chips">${title.genres.map(genre => `<span class="chip">${esc(genre)}</span>`).join("")}</div>` : ""}
      </div>
    </div>
    ${title.plot ? `<p class="plot">${esc(title.plot)}</p>` : ""}
    <div class="links">
      <a class="button ghost small" href="${esc(imdbUrl(title))}" target="_blank" rel="noopener">IMDb ${icon("external")}</a>
      <a class="button ghost small" href="${esc(rtUrl(title))}" target="_blank" rel="noopener">Rotten Tomatoes ${icon("external")}</a>
    </div>`;
}

async function openDetail(imdbID) {
  const token = ++detailToken;
  detail = null;
  $("lookupPane").hidden = true;
  $("detailPane").hidden = false;
  $("detailFoot").hidden = true;
  $("lookupBack").hidden = false;
  $("titleDialogHeading").textContent = "Details";
  $("detailPane").innerHTML = `<p class="hint">Loading…</p>`;
  try {
    const data = await omdb({ i: imdbID, plot: "short" });
    if (token !== detailToken) return;
    const base = toTitle(data);
    const rt = await fetchRtAudience(base).catch(() => ({ rtAudience: "", rtUrl: "" }));
    if (token !== detailToken) return;
    detail = { ...base, ...rt, ratingsUpdatedAt: new Date().toISOString() };
    const onList = isOnList(detail.imdbID);
    $("titleDialogHeading").textContent = detail.name;
    $("detailPane").innerHTML = detailHtml(detail);
    $("confirmAdd").disabled = onList;
    $("confirmAdd").textContent = onList ? "Already on your list" : "Add to watchlist";
    $("detailFoot").hidden = false;
  } catch (error) {
    if (token !== detailToken) return;
    $("detailPane").innerHTML = `<p class="hint error">The details could not be loaded. ${esc(error.message)}</p>`;
  }
}

function addDetail() {
  if (!detail || isOnList(detail.imdbID)) return;
  const entry = { id: newId(), ...detail, fsk: "", streaming: [], seen: false, createdAt: new Date().toISOString() };
  titles.unshift(entry);
  currentView = "watchlist";
  persist();
  $("titleDialog").close();
  showStatus(`“${entry.name}” added to your watchlist.`);
  // FSK and where to watch are looked up in the background.
  refresh([entry], { ratings: () => false });
}

/* ---------- Surprise me ---------- */

async function surpriseMe() {
  // Picks from the current filters, so an FSK limit also applies to the surprise.
  const unseen = visibleTitles();
  const hasLlm = Boolean(settings.llmEndpoint && settings.llmKey);
  if (!unseen.length && !hasLlm) {
    showStatus(titles.some(title => !title.seen) ? "No title on your watchlist matches the filters." : "Add a few titles first, then I can pick one for you.");
    return;
  }
  const button = $("surpriseButton");
  button.disabled = true;
  try {
    if (hasLlm) {
      try {
        const response = await fetch(settings.llmEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${settings.llmKey}` },
          body: JSON.stringify({
            model: settings.llmModel || "gpt-4o-mini",
            temperature: 0.8,
            messages: [
              { role: "system", content: "You recommend one movie or TV series the user has not listed. Reply only with the title and one short reason separated by a pipe character." },
              { role: "user", content: `My list: ${titles.map(title => `${title.name} (${title.genres.join(", ")})`).join("; ") || "empty"}` }
            ]
          })
        });
        if (!response.ok) throw new Error(`LLM responded with ${response.status}`);
        const data = await response.json();
        const [name, reason] = (data.choices?.[0]?.message?.content || "").split("|");
        if (name?.trim()) {
          showStatus(`Try “${name.trim()}” – ${(reason || "a fresh match for your list.").trim()}`);
          return;
        }
      } catch {
        if (!unseen.length) { showStatus("The LLM is unavailable right now.", "error"); return; }
      }
    }
    const pick = unseen[Math.floor(Math.random() * unseen.length)];
    showStatus(`Tonight’s pick: “${pick.name}”`);
  } finally {
    button.disabled = false;
  }
}

/* ---------- Settings ---------- */

const SETTING_FIELDS = ["omdbKey", "tmdbKey", "llmEndpoint", "llmKey", "llmModel"];

function openSettings() {
  SETTING_FIELDS.forEach(id => { $(id).value = settings[id] || ""; });
  $("appVersion").textContent = BUILD.startsWith("__") ? "development build" : BUILD;
  $("tmdbStatus").textContent = tmdbKey() ? "FSK and streaming services are looked up automatically." : "Without a TMDB key only the cinemas and Wikidata FSK ratings are available.";
  $("settingsDialog").showModal();
}

function saveSettings() {
  const tmdbChanged = $("tmdbKey").value.trim() !== (settings.tmdbKey || "");
  SETTING_FIELDS.forEach(id => { settings[id] = $(id).value.trim(); });
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  $("settingsDialog").close();
  showStatus("Settings saved on this device.");
  if (tmdbChanged && tmdbKey()) refresh(titles, { ratings: () => false });
}

/* ---------- Events ---------- */

// Show unexpected errors instead of silently doing nothing, so problems on a phone can be reported.
window.addEventListener("error", event => showStatus(`Something went wrong: ${event.message}`, "error"));
window.addEventListener("unhandledrejection", event => showStatus(`Something went wrong: ${event.reason?.message || event.reason}`, "error"));

document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => {
  currentView = tab.dataset.view;
  // "Recently binged" only exists on the binged list and is its natural default.
  if (sortBy === "added" || sortBy === "binged") sortBy = currentView === "binged" ? "binged" : "added";
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}));
$("searchInput").addEventListener("input", render);
["typeFilter", "genreFilter", "serviceFilter", "fskFilter"].forEach(id => $(id).addEventListener("change", render));
$("sortSelect").addEventListener("change", event => { sortBy = event.target.value; render(); });

$("addButton").addEventListener("click", openAddDialog);
$("surpriseButton").addEventListener("click", surpriseMe);

$("titleGrid").addEventListener("click", event => {
  const target = event.target.closest("button");
  if (!target) return;
  const title = titles.find(item => item.id === (target.dataset.watch || target.dataset.unwatch || target.dataset.rate || target.dataset.remove));
  if (target.dataset.action === "add") openAddDialog();
  if (!title) return;
  if (target.dataset.watch) {
    Object.assign(title, { seen: true, seenOn: today(), userRating: 0 });
    persist();
    showStatus(`“${title.name}” moved to Binged – rate it there with popcorn.`);
  }
  if (target.dataset.unwatch) {
    Object.assign(title, { seen: false, userRating: 0, seenOn: undefined });
    persist();
    showStatus(`“${title.name}” is back on your watchlist.`);
  }
  if (target.dataset.rate) {
    const value = Number(target.dataset.value);
    title.userRating = value === title.userRating ? 0 : value;
    persist();
  }
  if (target.dataset.remove && confirm(`Remove “${title.name}”?`)) {
    titles = titles.filter(item => item !== title);
    persist();
  }
});

// Posters from OMDb/IMDb sometimes 404; swap in the placeholder once.
document.addEventListener("error", event => {
  const img = event.target;
  if (img.tagName === "IMG" && img.hasAttribute("data-fallback") && !img.src.endsWith(NO_COVER)) img.src = NO_COVER;
}, true);

$("lookupInput").addEventListener("input", event => {
  clearTimeout(lookupTimer);
  lookupTimer = setTimeout(() => lookup(event.target.value.trim()), 300);
});
$("lookupResults").addEventListener("click", event => {
  const result = event.target.closest("[data-imdb]");
  if (result) openDetail(result.dataset.imdb);
});
$("lookupBack").addEventListener("click", () => { showLookupPane(); $("lookupInput").focus(); });
$("confirmAdd").addEventListener("click", addDetail);

$("settingsButton").addEventListener("click", openSettings);
$("saveSettings").addEventListener("click", saveSettings);
$("clearData").addEventListener("click", () => {
  if (!confirm("Delete all titles and settings stored on this device?")) return;
  titles = [];
  settings = {};
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SETTINGS_KEY);
  $("settingsDialog").close();
  render();
  showStatus("Local data cleared.");
});

document.querySelectorAll("dialog").forEach(dialog => {
  dialog.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => dialog.close()));
  // Clicks on the dialog element itself (not its content) come from the backdrop.
  dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
});

if ("serviceWorker" in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  const reload = () => { if (!reloading) { reloading = true; location.reload(); } };
  // A new deployment activated a new worker: reload to pick up the new app, but never in the middle of a dialog.
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController) return;
    if (document.querySelector("dialog[open]")) document.addEventListener("visibilitychange", reload, { once: true });
    else reload();
  });
  navigator.serviceWorker.register("sw.js").then(registration => {
    // Installed iOS apps resume from memory instead of reloading, so check for updates whenever the app comes back.
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") registration.update().catch(() => {}); });
  }).catch(() => {});
}
render();
loadCinemas();
refreshOnStart();
