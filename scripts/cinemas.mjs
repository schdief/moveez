// Collects what the Moveez cinemas are showing and prints it as JSON.
// Runs in the Pages workflow: kinoprogramm.com offers no API and no CORS, so the app cannot ask it directly.
import https from "node:https";

const CINEMAS = [
  { name: "CinemaxX Dresden", url: "https://www.kinoprogramm.com/kino/dresden/cinemaxx-42197" },
  { name: "Filmpalast Bautzen", url: "https://www.kinoprogramm.com/kino/bautzen/filmpalast-31354" },
  { name: "UCI Dresden", url: "https://www.kinoprogramm.com/kino/dresden/uci-kinowelt-elbe-park-40872" }
];

const decode = text => text
  .replace(/<[^>]+>/g, "")
  .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
  .replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
  .replace(/\s+/g, " ")
  .trim();

export function parseProgram(html, baseUrl) {
  return html.split(/<article class="kino-week-film/).slice(1).map(block => {
    const article = block.split("</article>")[0];
    const link = article.match(/<a class="text-lg[^"]*" href="([^"]+)">([\s\S]*?)<\/a>/);
    if (!link) return null;
    const info = decode(article.match(/<p class="mb-3[^"]*">([\s\S]*?)<\/p>/)?.[1] || "");
    const showtimes = article.split(/<section class="kino-week-day"/).slice(1).flatMap(section => {
      const date = section.match(/data-kino-week-day="(\d{4}-\d{2}-\d{2})"/)?.[1];
      if (!date) return [];
      // Each language/format version ("Deutsch/MXP 2D", "OmU") has its own times.
      const versions = section.split(/data-kino-week-version=/).slice(1);
      return (versions.length ? versions : [section]).flatMap(version => {
        const label = versions.length ? decode(version.match(/<p[^>]*>([\s\S]*?)<\/p>/)?.[1] || "") : "";
        return [...version.matchAll(/class="kino-week-time"[^>]*>\s*(\d{1,2}:\d{2})/g)].map(([, time]) => ({ date, time: time.padStart(5, "0"), version: label }));
      });
    }).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    const poster = article.match(/<img[^>]+src="([^"]+)"/)?.[1];
    return {
      title: decode(link[2]),
      fsk: info.match(/FSK (\d+)/)?.[1] || "",
      genres: info.split("·")[0].split(",").map(genre => genre.trim()).filter(genre => genre && !/^FSK|Laufzeit/.test(genre)),
      runtime: info.match(/Laufzeit: ([^·]+)/)?.[1].trim() || "",
      poster: poster ? new URL(poster, baseUrl).href : "",
      days: [...new Set(showtimes.map(showtime => showtime.date))],
      showtimes,
      url: new URL(link[1], baseUrl).href
    };
  }).filter(film => film && film.days.length);
}

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "de-DE,de;q=0.9"
};

const describe = error => [error.message, error.cause?.code || error.cause?.message].filter(Boolean).join(": ");

// kinoprogramm.com also has an IPv6 address, which GitHub's runners cannot reach, so fetch() may time out.
function getIPv4(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: HEADERS, family: 4, timeout: 20000 }, response => {
      if (response.statusCode !== 200) { response.resume(); reject(new Error(`HTTP ${response.statusCode}`)); return; }
      let body = "";
      response.setEncoding("utf8");
      response.on("data", chunk => { body += chunk; });
      response.on("end", () => resolve(body));
    });
    request.on("timeout", () => request.destroy(new Error("IPv4 request timed out")));
    request.on("error", reject);
  });
}

async function fetchPage(url) {
  try {
    const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } catch (error) {
    try {
      return await getIPv4(url);
    } catch (fallbackError) {
      throw new Error(`fetch: ${describe(error)}; IPv4: ${describe(fallbackError)}`);
    }
  }
}

async function program(cinema, attempts = 3) {
  for (let attempt = 1; ; attempt++) {
    try {
      const films = parseProgram(await fetchPage(cinema.url), cinema.url);
      if (!films.length) throw new Error("no films found in the page");
      return { name: cinema.name, url: cinema.url, films };
    } catch (error) {
      if (attempt >= attempts) throw error;
      await new Promise(resolve => setTimeout(resolve, attempt * 3000));
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const cinemas = [];
  // Published with the programme, so failures of the workflow run can be seen on the website.
  const errors = [];
  let previous;
  for (const cinema of CINEMAS) {
    try {
      cinemas.push(await program(cinema));
    } catch (error) {
      const message = describe(error);
      console.error(`Skipping ${cinema.name}: ${message}`);
      errors.push({ cinema: cinema.name, message });
      // Keep showing the last published programme of this cinema rather than none.
      if (process.env.PREVIOUS_PROGRAMME) {
        previous ??= await fetch(process.env.PREVIOUS_PROGRAMME).then(response => response.json()).catch(() => ({}));
        const last = previous.cinemas?.find(item => item.name === cinema.name);
        if (last) cinemas.push({ ...last, stale: true });
      }
    }
  }
  console.log(JSON.stringify({ updatedAt: new Date().toISOString(), cinemas, errors }));
}
