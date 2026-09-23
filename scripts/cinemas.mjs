// Collects what the Moveez cinemas are showing and prints it as JSON.
// Runs in the Pages workflow: kinoprogramm.com offers no API and no CORS, so the app cannot ask it directly.
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
    const days = article.split(/<section class="kino-week-day"/).slice(1)
      .filter(section => section.includes("kino-week-time"))
      .map(section => section.match(/data-kino-week-day="(\d{4}-\d{2}-\d{2})"/)?.[1])
      .filter(Boolean);
    return {
      title: decode(link[2]),
      fsk: info.match(/FSK (\d+)/)?.[1] || "",
      days,
      url: new URL(link[1], baseUrl).href
    };
  }).filter(film => film && film.days.length);
}

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "de-DE,de;q=0.9"
};

async function program(cinema, attempts = 3) {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(cinema.url, { headers: HEADERS, signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const films = parseProgram(await response.text(), cinema.url);
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
  for (const cinema of CINEMAS) {
    try {
      cinemas.push(await program(cinema));
    } catch (error) {
      const message = [error.message, error.cause?.code || error.cause?.message].filter(Boolean).join(": ");
      console.error(`Skipping ${cinema.name}: ${message}`);
      errors.push({ cinema: cinema.name, message });
    }
  }
  console.log(JSON.stringify({ updatedAt: new Date().toISOString(), cinemas, errors }));
}
