import { createElement, type CSSProperties, type ReactNode } from "react";
import type { ContentNode } from "../content/types";
const names: Record<string, string> = {
  datetime: "dateTime",
  class: "className",
  for: "htmlFor",
  tabindex: "tabIndex",
  viewbox: "viewBox",
  playsinline: "playsInline",
  autoplay: "autoPlay",
  controlslist: "controlsList",
  disablepictureinpicture: "disablePictureInPicture",
  srcset: "srcSet",
  frameborder: "frameBorder",
  allowfullscreen: "allowFullScreen",
  crossorigin: "crossOrigin",
  readonly: "readOnly",
  maxlength: "maxLength",
  contenteditable: "contentEditable",
  fillrule: "fillRule",
  cliprule: "clipRule",
};
const booleans = new Set([
  "muted",
  "loop",
  "controls",
  "playsInline",
  "autoPlay",
  "disablePictureInPicture",
  "allowFullScreen",
  "required",
  "readOnly",
  "disabled",
  "multiple",
]);
function style(input: string): CSSProperties {
  const result: Record<string, string> = {};
  for (const declaration of input.split(";")) {
    const i = declaration.indexOf(":");
    if (i < 0) continue;
    const name = declaration.slice(0, i).trim();
    result[
      name.startsWith("--")
        ? name
        : name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
    ] = declaration.slice(i + 1).trim();
  }
  return result;
}
/** Render extracted content as React elements: no embedded reference runtime or HTML execution. */
export function renderContent(
  node: ContentNode,
  key?: number | string,
): ReactNode {
  if (typeof node === "string") return node;
  const props: Record<string, unknown> = { key };
  for (const [name, value] of Object.entries(node.attrs)) {
    if (
      name.startsWith("on") ||
      ["v-cloak", "data-nuxt-link", "header-trigger", "is-visible"].includes(
        name,
      )
    )
      continue;
    const attribute =
      names[name] ||
      (name.includes("-") &&
      !name.startsWith("aria-") &&
      !name.startsWith("data-")
        ? name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
        : name);
    props[attribute] =
      name === "style" ? style(value) : booleans.has(attribute) ? true : value;
  }
  if (node.tag === "img" && String(props.src || "").startsWith("/assets/"))
    props.onLoad = (event: React.SyntheticEvent<HTMLImageElement>) =>
      event.currentTarget
        .closest("picture")
        ?.classList.add("base-image--loaded");
  if (["input", "textarea", "select"].includes(node.tag)) {
    if (props.value !== undefined) {
      props.defaultValue = props.value;
      delete props.value;
    }
    if (props.checked !== undefined) {
      props.defaultChecked = true;
      delete props.checked;
    }
  }
  const voidTags = new Set([
    "img",
    "input",
    "br",
    "hr",
    "source",
    "track",
    "meta",
    "link",
    "area",
    "base",
    "embed",
    "param",
    "wbr",
  ]);
  return createElement(
    node.tag,
    props,
    ...(voidTags.has(node.tag)
      ? []
      : node.children.map((child, index) => renderContent(child, index))),
  );
}
export function Content({ node }: { node: ContentNode }) {
  return renderContent(node);
}
