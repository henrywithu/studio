import { readFile, writeFile, mkdir } from "node:fs/promises";
import { load } from "cheerio";

const origin = "https://studio.henrywithu.com";
const template = await readFile("dist/index.html", "utf8");
const routes = JSON.parse(await readFile("public/content/routes.json", "utf8"));
const locations = [];
for (const { route, file } of routes) {
  const page = JSON.parse(await readFile("public/content/" + file, "utf8"));
  const $ = load(template);
  const url = origin + (route === "/" ? "/" : route + "/");
  $("title").text(page.title);
  $('meta[name="description"]').attr("content", page.description);
  for (const prefix of ["og", "twitter"]) {
    const attribute = prefix === "og" ? "property" : "name";
    for (const [key, value] of Object.entries({ title: page.title, description: page.description, url }))
      $(`meta[${attribute}="${prefix}:${key}"]`).attr("content", value);
  }
  $('link[rel="canonical"]').attr("href", url);
  $("body").append($("<noscript>").text(page.description + " Enable JavaScript to explore Trapnest Studio."));
  const directory = route === "/" ? "dist" : "dist" + route;
  await mkdir(directory, { recursive: true });
  await writeFile(directory + "/index.html", $.html());
  locations.push(url);
}
await writeFile("dist/sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + locations.map(url => `<url><loc>${url}</loc></url>`).join("") + "</urlset>\n");
await writeFile("dist/robots.txt", "User-agent: *\nAllow: /\nSitemap: " + origin + "/sitemap.xml\n");
const $ = load(template);
$("title").text("Page not found | Trapnest Studio");
$("head").append('<meta name="robots" content="noindex" />');
$('link[rel="canonical"], meta[property="og:url"], meta[name="twitter:url"]').remove();
await writeFile("dist/404.html", $.html());
console.log(`Generated crawler metadata for ${routes.length} routes, sitemap, robots and 404 page.`);
