import type { PageContent } from "./content/types";

export const SITE_URL = "https://studio.henrywithu.com";
export const SITE_DESCRIPTION =
  "An independent creative playground by Henry. Exploring life, art, science and technology through design, motion and interactive worlds. A Trapnest project.";

export function updateMetadata(page: Pick<PageContent, "route" | "title" | "description">) {
  document.title = page.title;
  const url = SITE_URL + (page.route === "/" ? "/" : page.route.replace(/\/$/, "") + "/");
  for (const [selector, value] of Object.entries({
    'meta[name="description"]': page.description,
    'meta[property="og:title"]': page.title,
    'meta[property="og:description"]': page.description,
    'meta[property="og:url"]': url,
    'meta[name="twitter:title"]': page.title,
    'meta[name="twitter:description"]': page.description,
    'meta[name="twitter:url"]': url,
  })) document.querySelector<HTMLMetaElement>(selector)?.setAttribute("content", value);
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute("href", url);
}
