import { readFile, writeFile, readdir, mkdir, unlink } from "node:fs/promises";
import { load } from "cheerio";
import { createHash } from "node:crypto";
import { decodePayload } from "./decode-payload.mjs";
const root = "research/reference";
await mkdir("public/content", { recursive: true });
await mkdir("src/content", { recursive: true });
await mkdir("src/styles/reference", { recursive: true });
const assets = new Map(),
  issues = [];
const sourceStyles = new Map();
function localImage(url) {
  if (!url?.startsWith("https://www.datocms-assets.com/")) return url;
  const u = new URL(url);
  if (!u.pathname.endsWith(".svg")) u.searchParams.set("fm", "webp");
  const original = u.href;
  const canonical = new URL(original);
  canonical.searchParams.sort();
  const canonicalKey = canonical.href;
  const ext = u.pathname.endsWith(".svg") ? "svg" : "webp";
  const name = u.pathname
    .split("/")
    .at(-1)
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 70);
  const local = `/assets/${name}-${createHash("sha256").update(canonicalKey).digest("hex").slice(0, 10)}.${ext}`;
  assets.set(canonicalKey, { url: original, path: "public" + local });
  return local;
}
function imageInfo(a) {
  return a?.image || a;
}
function gather(value, path = "", result = []) {
  if (!value || typeof value !== "object") return result;
  if (value.isVideo) {
    result.push({
      type: "video",
      src: value.videoUrl,
      small: value.videoUrlSmall,
      width: value.videoWidth,
      height: value.videoHeight,
      path,
    });
    return result;
  }
  if (value.url?.startsWith("https://www.datocms-assets.com/") && value.width) {
    result.push({ type: "image", ...value, path });
    return result;
  }
  for (const [k, v] of Object.entries(value)) {
    if (k === "seo") continue;
    gather(v, path + "." + k, result);
  }
  return result;
}
function mediaNode($, element, a) {
  if (!a?.src && !a?.url) return;
  if (a.type === "video") {
    $(element).find("video").attr("data-src", a.src);
    if (a.small) $(element).find("video").attr("data-src-small", a.small);
    return;
  }
  const info = imageInfo(a);
  const responsive = info.responsiveImage;
  const src = responsive?.src || info.url || a.src;
  if (!src) return;
  $(element).find("img,source").remove();
  $(element).append(
    $("<img>").attr({
      class: "base-image__img",
      src: localImage(src),
      width: info.width || "",
      height: info.height || "",
      alt: info.alt || "",
      loading: "lazy",
      decoding: "async",
    }),
  );
  // Preserve the source's actual crop and responsive variants, rather than inventing crops.
  if (responsive?.webpSrcSet) {
    const set = responsive.webpSrcSet
      .split(",")
      .filter((s) => {
        const url = new URL(s.trim().split(" ")[0]);
        const dpr = Number(url.searchParams.get("dpr") || 1);
        return dpr <= 1 && dpr !== 0.75;
      })
      .map((s) => {
        const parts = s.trim().split(" ");
        return localImage(parts[0]) + " " + parts[1];
      })
      .filter((s) => !s.endsWith("undefined"))
      .join(",");
    $(element)
      .find("img")
      .attr("srcset", set)
      .attr("sizes", responsive.sizes || "100vw");
  }
  $(element).removeClass("base-image--loaded");
}
const home$ = load(await readFile(root + "/pages/home.html", "utf8"));
const sharedPayload = decodePayload(JSON.parse(home$("#__NUXT_DATA__").text()))
  .pinia.data;
const global = sharedPayload.globalData;
const cases = sharedPayload.allCases;
const articles = sharedPayload.allArticles;
for (const file of (await readdir(root + "/pages")).filter((f) =>
  f.endsWith(".html"),
)) {
  const name = file.slice(0, -5);
  const route = name === "home" ? "/" : "/" + name.replaceAll("__", "/");
  const $ = load(await readFile(root + "/pages/" + file, "utf8"));
  const payload = decodePayload(
    JSON.parse(await readFile(root + "/payloads/" + name + ".json", "utf8")),
  ).data;
  const pageRaw = payload[Object.keys(payload).at(-1)];
  const candidates = gather(pageRaw);
  let pageAssets = candidates.filter(
    (a) =>
      !/(thumbnail(Big|Medium|Small|ExtraSmall)|\.next|\.previous)/.test(
        a.path,
      ),
  );
  if (!pageAssets.length) pageAssets = candidates;
  const used = new Set();
  const allAssets = gather(payload);
  let componentData;
  try {
    componentData = JSON.parse(
      await readFile("research/browser/" + name + "-data.json", "utf8"),
    );
  } catch {}
  $("style").each((i, e) =>
    sourceStyles.set(
      createHash("sha256").update($(e).text()).digest("hex"),
      $(e).text(),
    ),
  );
  let measured;
  try {
    measured = JSON.parse(
      await readFile("research/browser/" + name + "-media.json", "utf8"),
    );
  } catch {}
  if (!measured) {
    try {
      const candidate = JSON.parse(
        await readFile("research/browser/" + name + "-components.json", "utf8"),
      );
      if (candidate.length) measured = candidate;
    } catch {}
  }
  // Work's grid is client rendered on the source. Extract its actual hydrated layout.
  if (name === "work") {
    const live = load(
      await readFile("research/browser/work-full.html", "utf8"),
    );
    $(".work-grid").replaceWith(live(".work-grid").clone());
    $(".work-filters__toggle").replaceWith(
      live(".work-filters__toggle").clone(),
    );
    $(".work-filter").each((i, e) => {
      const other = live(".work-filter").eq(i);
      if (other.length) $(e).replaceWith(other.clone());
    });
  }
  if (name === "about" && componentData)
    componentData.media = componentData.media.filter(
      (m) => !m.class.includes("carousel-cursor"),
    );
  if (name === "podcast" && componentData) {
    const previews = componentData.media.slice(1, 32);
    $(".podcast-list-item").each((i, e) => {
      const a = previews[i]?.asset;
      if (a)
        $(e).attr("data-preview", localImage(a.responsiveImage?.src || a.src));
    });
    componentData.media = [
      componentData.media[0],
      ...componentData.media.slice(32),
    ];
  }
  if (name === "work")
    $(".work-filter__btn").each((i, e) => {
      const label = $(e).clone().children().remove().end().text().trim();
      const count = cases.filter(
        (c) => label === "All" || c.tags?.some((t) => t.label === label),
      ).length;
      $(e)
        .find(".work-filter__count")
        .html(
          `<span class="work-filter__bracket">[</span>${count}<span class="work-filter__bracket">]</span>`,
        );
    });
  const media = $("main picture.base-image,main .base-video").toArray();
  let measuredIndex = 0;
  for (const element of media) {
    const inNav = $(element).closest(".nav").length;
    const inFooter = $(element).closest("footer").length;
    const isVideo = $(element).hasClass("base-video");
    const m = measured?.[measuredIndex];
    const component = componentData?.media?.[measuredIndex++];
    const im = $(element).find("img").first();
    const width = Number(
      im.attr("width") || $(element).find("video").attr("width"),
    );
    const height = Number(
      im.attr("height") || $(element).find("video").attr("height"),
    );
    let asset;
    if (inNav) asset = { type: "image", ...global.navImage };
    else if (inFooter) asset = { type: "image", ...global.footerImage };
    else {
      const href = $(element).closest("a").attr("href");
      const item = href?.startsWith("/work/")
        ? cases.find((c) => href.endsWith("/" + c.slug))
        : href?.startsWith("/blog/")
          ? articles.find((c) => href.endsWith("/" + c.slug))
          : null;
      if (item) {
        const opts = gather(item);
        asset =
          opts.find(
            (a) =>
              a.type === (isVideo ? "video" : "image") &&
              ((a.width === width && a.height === height) ||
                (a.responsiveImage?.width === width &&
                  a.responsiveImage?.height === height)),
          ) || opts.find((a) => a.type === (isVideo ? "video" : "image"));
      }
      if (m?.src && measured.length === media.length) {
        if (isVideo) asset = { type: "video", src: m.src, small: asset?.small };
        else {
          const direct = allAssets.find(
            (a) =>
              a.type === "image" &&
              m.src.split("?")[0] === a.url?.split("?")[0],
          );
          asset = direct || { type: "image", url: m.src, width, height };
        }
      }
      if (!asset) {
        let index = pageAssets.findIndex(
          (a, i) =>
            !used.has(i) &&
            a.type === (isVideo ? "video" : "image") &&
            (isVideo ||
              (a.width === width && a.height === height) ||
              (a.responsiveImage?.width === width &&
                a.responsiveImage?.height === height)),
        );
        if (index < 0)
          index = pageAssets.findIndex(
            (a, i) => !used.has(i) && a.type === (isVideo ? "video" : "image"),
          );
        if (index >= 0) {
          asset = pageAssets[index];
          used.add(index);
        }
      }
    }
    if (component?.asset && componentData.media.length === media.length) {
      const a = component.asset;
      asset = isVideo
        ? {
            type: "video",
            src: a.src,
            small: a.srcSmall,
            width: a.width,
            height: a.height,
          }
        : {
            type: "image",
            url: a.src,
            width: a.width,
            height: a.height,
            responsiveImage: a.responsiveImage,
            alt: a.alt,
          };
    }
    if (asset) mediaNode($, element, asset);
    else
      issues.push({
        route,
        kind: isVideo ? "video" : "image",
        width,
        height,
        class: $(element).parent().attr("class"),
      });
  }
  let interactions;
  try {
    interactions = JSON.parse(
      await readFile("research/browser/" + name + "-interactions.json", "utf8"),
    );
  } catch {}
  if (interactions) {
    for (const theme of interactions.themes || []) {
      const classes = theme.class
        .split(" ")
        .filter(
          (c) =>
            c && !c.includes("--") && c !== "is-visible" && c !== "gutters",
        );
      const selector = classes.map((c) => "." + c).join("");
      if (selector)
        $("main " + selector).attr({
          "data-header-theme": theme.props.headerTheme,
          "data-header-leave": String(theme.props.hasLeaveCallback),
        });
    }
    if (interactions.crew) {
      const crew = load(interactions.crew);
      crew(".case-hero-team")
        .removeClass("case-team-enter-active case-team-enter-to")
        .attr("hidden", "");
      $(".case-hero").first().append(crew(".case-hero-team"));
    }
    if (interactions.note) {
      const note = load(interactions.note);
      note(".director-note")
        .removeClass("case-dn-enter-active case-dn-enter-to")
        .attr("hidden", "");
      note("[style]").removeAttr("style");
      for (const [i, e] of note("picture.base-image,.base-video")
        .toArray()
        .entries()) {
        const a = interactions.media[i]?.asset;
        if (a)
          mediaNode(note, e, {
            type: "image",
            url: a.src,
            width: a.width,
            height: a.height,
            responsiveImage: a.responsiveImage,
            alt: a.alt,
          });
      }
      note("[src]").each((i, e) => {
        const src = note(e).attr("src");
        if (src?.startsWith("https://www.datocms-assets.com"))
          note(e).attr("src", localImage(src));
      });
      note(".director-note__header button").attr(
        "data-director",
        pageRaw.caseStudy?.director?.slug || "",
      );
      $(".case-study").append(note(".director-note"));
    }
  }
  // Handle Vimeo embeds and full-length players without matching an unrelated thumbnail.
  const urls = [];
  function strings(v, key = "") {
    if (
      typeof v === "string" &&
      /https:.*\.mp4/.test(v) &&
      /(Url|url)$/.test(key) &&
      !key.includes("Small")
    )
      urls.push({ key, url: v });
    else if (v && typeof v === "object")
      for (const [k, x] of Object.entries(v)) strings(x, k);
  }
  strings(pageRaw);
  $(".player-alt").each((i, e) => {
    const full = $(e).find(".player-alt__video video");
    const u = urls.find(
      (x) => !/^videoUrl$/.test(x.key) && !x.key.includes("Thumbnail"),
    );
    if (u && full.length) full.attr("data-src", u.url);
  });
  if (name === "home") {
    const h = payload.home.home;
    $(".home-hero video").attr({
      "data-src": h.heroReelThumbnail.videoUrl,
      "data-src-small": h.heroReelThumbnail.videoUrlSmall,
    });
    $(".player-alt__fig video").attr({ "data-src": h.reelThumbnail.videoUrl });
    $(".player-alt__video video").attr("data-src", h.reelUrl);
  }
  const players =
    componentData?.widgets.filter((w) => w.name === "PlayerAlt") || [];
  $(".player-alt").each((i, e) => {
    if (players[i]?.props.url)
      $(e)
        .find(".player-alt__video video")
        .attr("data-src", players[i].props.url);
    if (players[i]?.props.embedId && !$(e).find("iframe").length)
      $(e)
        .find(".player-alt__video")
        .append(
          `<iframe src="https://www.youtube.com/embed/${players[i].props.embedId}" allow="autoplay; fullscreen; encrypted-media" allowfullscreen></iframe>`,
        );
  });
  if (name === "podcast") {
    const sounds = [];
    function walk(v) {
      if (!v || typeof v !== "object") return;
      if (v.soundPreview)
        sounds.push(
          typeof v.soundPreview === "string"
            ? v.soundPreview
            : v.soundPreview.url,
        );
      for (const x of Object.values(v)) if (typeof x === "object") walk(x);
    }
    walk(pageRaw);
    $(".sound-equalizer__btn").each((i, e) => {
      const equalizers =
        componentData?.widgets.filter((w) => w.name === "Equalizer") || [];
      const audio = equalizers[i]?.props.soundSrc || sounds[i];
      if (audio) $(e).attr("data-audio", audio);
    });
  }
  // Source HTML contains no executable scripts after extraction. Inline layout is preserved; generated motion styles are removed.
  $("script,.cookie-consent,.cookies").remove();
  $("main [style]").each((i, e) => {
    const style = $(e).attr("style") || "";
    if (name === "work")
      $(e).attr(
        "style",
        style.replace(
          /(?:transform|opacity|visibility|translate|rotate|transition-delay)[^;]*;?/g,
          "",
        ),
      );
  });
  $(".text-splitter").each((i, e) => {
    $(e).addClass("text-splitter--splitted");
  });
  $(".work-item-meta-bot").each((i, e) => {
    const href = $(e).closest("a").attr("href");
    const c = cases.find((c) => href?.endsWith("/" + c.slug));
    if (c) {
      $(e)
        .closest(".work-grid-item")
        .attr(
          "data-directors",
          c.information
            ?.flatMap((i) => i.directors || [])
            .map((d) => d.slug)
            .join(" ") || "",
        );
      $(e).find(".work-item-meta-bot__line").remove();
      $(e)
        .find(".work-item-meta-bot__excerpt")
        .html(
          `<span class="text-splitter text-splitter--splitted">${c.excerpt || ""}</span>`,
        );
    }
  });
  const splitterProps =
    componentData?.widgets
      .filter((w) => w.name === "TextSplitter")
      .map((w) => w.props) || [];
  const matched = new Set();
  const plain = (html) =>
    load("<div>" + html + "</div>")("div")
      .text()
      .replace(/\s+/g, " ")
      .trim();
  $(".text-splitter").each((i, e) => {
    const text = $(e).text().replace(/\s+/g, " ").trim();
    const ix = splitterProps.findIndex(
      (p, k) => !matched.has(k) && plain(p.content) === text,
    );
    if (ix < 0) return;
    matched.add(ix);
    const p = splitterProps[ix];
    $(e).attr({
      "data-split-type": p.type,
      "data-split-font": String(p.hasFontCorrection),
      "data-split-line": p.lineClass || "anim-line",
      "data-split-display": String(p.shouldSetDisplay),
    });
  });
  function tree(e) {
    if (e.type === "text") return e.data;
    if (e.type !== "tag") return null;
    const attrs = {};
    for (const [k, v] of Object.entries(e.attribs || {})) {
      if (k.startsWith("on")) continue;
      if (k === "src" && e.name === "video") continue;
      attrs[k] = v;
    }
    return {
      tag: e.name,
      attrs,
      children: (e.children || []).map(tree).filter((v) => v !== null),
    };
  }
  const main = $("main");
  const content = main
    .children()
    .filter(
      (i, e) =>
        !["header", "preloader", "cursor", "scrollbar"].some((c) =>
          $(e).hasClass(c),
        ),
    )
    .last();
  const sections = content
    .children()
    .map((i, e) => tree(e))
    .get();
  const page = {
    route,
    title: $("title").text(),
    description: $('meta[name="description"]').attr("content") || "",
    mainClass: main.attr("class"),
    pageClass: content.attr("class"),
    sections,
    meta: { videoUrls: urls },
  };
  await writeFile("public/content/" + name + ".json", JSON.stringify(page));
  if (name === "home") {
    const header = tree($("header")[0]);
    const loader = tree($(".preloader")[0]);
    await writeFile(
      "src/content/chrome.json",
      JSON.stringify({ header, loader }),
    );
  }
}
const sourceCSS = (await readdir(root + "/_nuxt")).filter((f) =>
  f.endsWith(".css"),
);
for (const file of await readdir("src/styles/reference"))
  if (
    file.endsWith(".css") &&
    !["base.css", "index.css", ...sourceCSS].includes(file)
  )
    await unlink("src/styles/reference/" + file);
let n = 0;
for (const css of (await readdir(root + "/_nuxt")).filter((f) =>
  f.endsWith(".css"),
)) {
  const data = await readFile(root + "/_nuxt/" + css, "utf8");
  const name = css;
  await writeFile("src/styles/reference/" + name, data);
  n++;
}
await writeFile(
  "src/styles/reference/base.css",
  [...sourceStyles.values()].join("\n"),
);
await writeFile(
  "src/styles/reference/index.css",
  '@import "./base.css";\n' +
    (await readdir("src/styles/reference"))
      .filter(
        (f) => f.endsWith(".css") && !["base.css", "index.css"].includes(f),
      )
      .map((f) => '@import "./' + f + '";')
      .join("\n") +
    "\n",
);
await writeFile(
  "research/assets-manifest.json",
  JSON.stringify([...assets.values()], null, 2),
);
await writeFile(
  "research/extraction-issues.json",
  JSON.stringify(issues, null, 2),
);
await writeFile(
  "public/content/routes.json",
  JSON.stringify(
    (await readdir("public/content"))
      .filter((f) => f.endsWith(".json") && f !== "routes.json")
      .map((f) => ({
        route:
          f === "home.json" ? "/" : "/" + f.slice(0, -5).replaceAll("__", "/"),
        file: f,
      })),
    null,
    2,
  ),
);
try {
  const aliases = {
    ...JSON.parse(await readFile("research/video-aliases.json", "utf8")),
    ...JSON.parse(await readFile("research/audio-aliases.json", "utf8")),
  };
  for (const file of (await readdir("public/content")).filter((f) =>
    f.endsWith(".json"),
  )) {
    let data = await readFile("public/content/" + file, "utf8");
    for (const [url, path] of Object.entries(aliases))
      data = data.replaceAll(JSON.stringify(url), JSON.stringify(path));
    await writeFile("public/content/" + file, data);
  }
} catch {}
console.log(
  "Extracted",
  n,
  "styles,",
  assets.size,
  "asset variants;",
  issues.length,
  "unmapped media.",
);
console.log(issues.slice(0, 15));
