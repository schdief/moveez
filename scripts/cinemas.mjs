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

async function program(cinema) {
  const response = await fetch(cinema.url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; moveez; +https://github.com/schdief/moveez)" } });
  if (!response.ok) throw new Error(`${cinema.name}: HTTP ${response.status}`);
  return { name: cinema.name, url: cinema.url, films: parseProgram(await response.text(), cinema.url) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const results = await Promise.allSettled(CINEMAS.map(program));
  const cinemas = results.flatMap((result, index) => {
    if (result.status === "fulfilled") return [result.value];
    console.error(`Skipping ${CINEMAS[index].name}: ${result.reason.message}`);
    return [];
  });
  console.log(JSON.stringify({ updatedAt: new Date().toISOString(), cinemas }));
}
