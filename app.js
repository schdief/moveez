const STORAGE_KEY = "moveez-titles-v2";
const SETTINGS_KEY = "moveez-settings-v2";
const services = ["Disney+", "Amazon Prime", "Paramount+", "Netflix", "Apple TV+"];
let titles = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
let settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
let currentView = "watchlist";
let selectedRating = 0;
const $ = id => document.getElementById(id);

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(titles)); render(); }
function esc(value = "") { return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char])); }
function poster(title) { return title.poster || "services/gui/app/views/public/nocover.png"; }
function showStatus(message, kind = "") { $("status").textContent = message; $("status").className = `status ${kind}`; if (message) setTimeout(() => { $("status").textContent = ""; }, 5000); }

function render() {
  const query = $("searchInput").value.toLowerCase();
  const type = $("typeFilter").value;
  const genre = $("genreFilter").value;
  const service = $("serviceFilter").value;
  const visible = titles.filter(title => (currentView === "binged" ? title.seen : !title.seen))
    .filter(title => !query || title.name.toLowerCase().includes(query))
    .filter(title => type === "all" || title.type === type)
    .filter(title => genre === "all" || title.genres.includes(genre))
    .filter(title => service === "all" || title.services.includes(service));
  $("watchCount").textContent = titles.filter(title => !title.seen).length;
  $("bingeCount").textContent = titles.filter(title => title.seen).length;
  const genres = [...new Set(titles.flatMap(title => title.genres))].sort();
  const previousGenre = genre;
  $("genreFilter").innerHTML = `<option value="all">All genres</option>${genres.map(item => `<option value="${esc(item)}">${esc(item)}</option>`).join("")}`;
  $("genreFilter").value = genres.includes(previousGenre) ? previousGenre : "all";
  $("titleGrid").innerHTML = visible.length ? visible.map(card).join("") : `<div class="empty"><span>${currentView === "binged" ? "🍿" : "✦"}</span><h2>${currentView === "binged" ? "Your binge history is empty" : "Your next favourite is waiting"}</h2><p>${currentView === "binged" ? "Mark a title as watched and give it your popcorn rating." : "Add a title above or ask Moveez to surprise you."}</p></div>`;
}

function card(title) {
  const rating = title.imdbRating ? `<span class="imdb">★ ${esc(title.imdbRating)}</span>` : "";
  const rt = title.rtRating ? `<span class="rt">🍅 ${esc(title.rtRating)}%</span>` : "";
  const serviceChips = title.services.map(service => `<span class="chip">${esc(service)}</span>`).join("");
  const genres = title.genres.map(item => `<span class="genre-chip">${esc(item)}</span>`).join("");
  const cinema = title.cinemaNow ? `<span class="cinema">● In ${esc(title.cinema)}</span>` : "";
  const popcorn = title.userRating ? `<span class="user-rating">${"🍿".repeat(title.userRating)}</span>` : "";
  return `<article class="title-card"><img class="poster" src="${esc(poster(title))}" alt="" loading="lazy" onerror="this.src='services/gui/app/views/public/nocover.png'"><div class="card-content"><div class="card-top"><span class="format">${title.type === "series" ? "TV SERIES" : "MOVIE"} · ${esc(title.year || "—")}</span><button class="remove" data-remove="${title.id}" aria-label="Remove ${esc(title.name)}">×</button></div><h2>${esc(title.name)}</h2><div class="badges">${rating}${rt}</div><div class="genres">${genres}</div>${serviceChips ? `<div class="services">${serviceChips}</div>` : ""}${cinema ? `<div class="cinema-line">${cinema}</div>` : ""}${popcorn ? `<div class="watched-line">Your rating ${popcorn}</div>` : ""}<div class="card-actions">${title.seen ? `<button class="secondary-button" data-unwatch="${title.id}">↶ Watch again</button>` : `<button class="primary-button small" data-watch="${title.id}">✓ Mark watched</button>`}<button class="text-button" data-remove="${title.id}">Remove</button></div></div></article>`;
}

function openDialog(dialog) { dialog.showModal(); }
function clearForm() { ["titleName", "titleYear", "imdbRating", "rtRating", "titleGenres", "posterUrl"].forEach(id => $(id).value = ""); $("titleType").value = "movie"; $("cinemaNow").checked = false; $("lookupResults").innerHTML = ""; document.querySelectorAll('input[name="service"]').forEach(input => { input.checked = false; }); }
function fillTitle(data) {
  $("titleName").value = data.Title || ""; $("titleYear").value = (data.Year || "").slice(0, 4); $("titleType").value = data.Type === "series" ? "series" : "movie"; $("imdbRating").value = data.imdbRating || ""; $("rtRating").value = data.tomatoUserRating || ""; $("titleGenres").value = data.Genre || ""; $("posterUrl").value = data.Poster && data.Poster !== "N/A" ? data.Poster : "";
}

async function lookup(query) {
  if (!settings.omdbKey || query.length < 3) return;
  try {
    const response = await fetch(`https://www.omdbapi.com/?apikey=${encodeURIComponent(settings.omdbKey)}&s=${encodeURIComponent(query)}`);
    const data = await response.json();
    $("lookupResults").innerHTML = data.Response === "True" ? data.Search.slice(0, 5).map(item => `<button type="button" class="lookup-result" data-imdb="${esc(item.imdbID)}"><img src="${esc(item.Poster === "N/A" ? poster({}) : item.Poster)}" alt=""><span><strong>${esc(item.Title)}</strong><small>${esc(item.Year)} · ${esc(item.Type)}</small></span><b>＋</b></button>`).join("") : `<p class="muted">No matches found.</p>`;
  } catch (error) { showStatus("Could not reach OMDb. You can still enter the title manually.", "error"); }
}

async function loadLookup(id) {
  try {
    const response = await fetch(`https://www.omdbapi.com/?apikey=${encodeURIComponent(settings.omdbKey)}&i=${encodeURIComponent(id)}&plot=short`);
    fillTitle(await response.json());
  } catch (error) { showStatus("The title details could not be loaded.", "error"); }
}

async function surpriseMe() {
  if (!titles.length) { openDialog($("titleDialog")); showStatus("Add a few titles first, then I can find your vibe."); return; }
  $("surpriseButton").disabled = true; showStatus("Finding a good match…");
  let suggestion = null;
  if (settings.llmEndpoint && settings.llmKey) {
    try {
      const response = await fetch(settings.llmEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${settings.llmKey}` }, body: JSON.stringify({ model: settings.llmModel || "gpt-4o-mini", messages: [{ role: "system", content: "You recommend movies or TV series. Return only a title and one short reason separated by a pipe." }, { role: "user", content: `My watchlist: ${titles.map(title => `${title.name} (${title.genres.join(", ")})`).join("; ")}` }], temperature: 0.8 }) });
      const data = await response.json(); const text = data.choices?.[0]?.message?.content || ""; const [name, reason] = text.split("|"); if (name) suggestion = { name: name.trim(), reason: (reason || "A fresh match for your watchlist.").trim() };
    } catch (error) { showStatus("The LLM is unavailable, so I picked a local match instead.", "error"); }
  }
  const fallback = titles.filter(title => !title.seen)[Math.floor(Math.random() * Math.max(1, titles.filter(title => !title.seen).length))] || titles[Math.floor(Math.random() * titles.length)];
  $("surpriseButton").disabled = false;
  if (suggestion) showStatus(`Try “${suggestion.name}” — ${suggestion.reason}`, "success");
  else showStatus(`Tonight’s pick: “${fallback.name}” — it’s already on your list.`, "success");
}

function addTitle(event) {
  event.preventDefault();
  const name = $("titleName").value.trim(); if (!name) return;
  const entry = { id: crypto.randomUUID(), name, year: $("titleYear").value.trim(), type: $("titleType").value, imdbRating: $("imdbRating").value, rtRating: $("rtRating").value, genres: $("titleGenres").value.split(",").map(item => item.trim()).filter(Boolean), services: [...document.querySelectorAll('input[name="service"]:checked')].map(input => input.value), cinemaNow: $("cinemaNow").checked, cinema: $("cinema").value, poster: $("posterUrl").value.trim(), seen: false, createdAt: new Date().toISOString() };
  titles.unshift(entry); save(); $("titleDialog").close(); clearForm(); showStatus(`“${name}” added to your watchlist.`, "success");
}

function markWatched(id) { const title = titles.find(item => item.id === id); if (!title) return; $("ratingTitle").textContent = title.name; $("watchedDate").value = new Date().toISOString().slice(0, 10); selectedRating = 0; renderPopcorn(); $("ratingDialog").dataset.id = id; openDialog($("ratingDialog")); }
function renderPopcorn() { $("popcornRating").innerHTML = [1, 2, 3, 4, 5].map(value => `<button type="button" class="${value <= selectedRating ? "selected" : ""}" data-rating="${value}" aria-label="${value} popcorn bags">🍿</button>`).join(""); }
function saveRating(event) { event.preventDefault(); const title = titles.find(item => item.id === $("ratingDialog").dataset.id); if (!title) return; title.seen = true; title.seenOn = $("watchedDate").value || new Date().toISOString(); title.userRating = selectedRating; save(); $("ratingDialog").close(); showStatus("Added to your binge history.", "success"); }

document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => { currentView = tab.dataset.view; document.querySelectorAll(".tab").forEach(item => item.classList.toggle("active", item === tab)); render(); }));
["searchInput", "typeFilter", "genreFilter", "serviceFilter"].forEach(id => $(id).addEventListener(id === "searchInput" ? "input" : "change", render));
$("addButton").addEventListener("click", () => { clearForm(); openDialog($("titleDialog")); });
$("titleForm").addEventListener("submit", addTitle); $("surpriseButton").addEventListener("click", surpriseMe);
$("settingsButton").addEventListener("click", () => { ["omdbKey", "llmEndpoint", "llmKey", "llmModel"].forEach(id => $(id).value = settings[id] || ""); openDialog($("settingsDialog")); });
$("settingsForm").addEventListener("submit", event => { event.preventDefault(); ["omdbKey", "llmEndpoint", "llmKey", "llmModel"].forEach(id => settings[id] = $(id).value.trim()); localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); $("settingsDialog").close(); showStatus("Settings saved on this device.", "success"); });
$("saveRatingButton").addEventListener("click", () => saveRating({ preventDefault() {} }));
$("clearData").addEventListener("click", () => { if (confirm("Delete all titles and local settings?")) { titles = []; settings = {}; localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(SETTINGS_KEY); $("settingsDialog").close(); render(); showStatus("Local data cleared.", "success"); } });
$("lookupInput").addEventListener("input", event => { clearTimeout(window.lookupTimer); window.lookupTimer = setTimeout(() => lookup(event.target.value.trim()), 350); });
document.addEventListener("click", event => { const result = event.target.closest("[data-imdb]"); if (result) loadLookup(result.dataset.imdb); const watch = event.target.closest("[data-watch]"); if (watch) markWatched(watch.dataset.watch); const unwatch = event.target.closest("[data-unwatch]"); if (unwatch) { const title = titles.find(item => item.id === unwatch.dataset.unwatch); title.seen = false; title.userRating = 0; save(); } const remove = event.target.closest("[data-remove]"); if (remove && confirm("Remove this title?")) { titles = titles.filter(item => item.id !== remove.dataset.remove); save(); } const rating = event.target.closest("[data-rating]"); if (rating) { selectedRating = Number(rating.dataset.rating); renderPopcorn(); } });
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
render();
