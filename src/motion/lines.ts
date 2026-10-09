/** Preserve native font kerning and wrapping when exposing plain copy as animated lines.
 * Range geometry avoids the extra line introduced by current SplitText on some source excerpts.
 */
export function splitMeasuredLines(element: HTMLElement, className: string) {
  const original = element.innerHTML;
  const label = element.getAttribute("aria-label");
  const text = element.textContent || "";
  const result = {
    lines: [] as HTMLElement[],
    chars: [] as HTMLElement[],
    revert,
  };
  let width = -1;
  let disposed = false;
  function measure() {
    if (disposed) return;
    element.textContent = text;
    const node = element.firstChild;
    if (!node) return;
    const range = document.createRange();
    const groups: { top: number; start: number; end: number }[] = [];
    let start = 0;
    for (const char of text) {
      const end = start + char.length;
      if (/\s/u.test(char)) {
        start = end;
        continue;
      }
      range.setStart(node, start);
      range.setEnd(node, end);
      const top = range.getBoundingClientRect().top;
      const last = groups.at(-1);
      if (last && Math.abs(last.top - top) < 1) last.end = end;
      else groups.push({ top, start, end });
      start = end;
    }
    result.lines = groups.map(({ start, end }) => {
      const line = document.createElement("div");
      line.className = className;
      line.style.cssText =
        "position:relative;display:block;text-align:start;opacity:0";
      line.textContent = text.slice(start, end);
      line.setAttribute("aria-hidden", "true");
      return line;
    });
    element.replaceChildren(...result.lines);
    element.setAttribute("aria-label", text);
    width = element.clientWidth;
  }
  const observer = new ResizeObserver(() => {
    if (element.clientWidth !== width) measure();
  });
  observer.observe(element);
  document.fonts.addEventListener("loadingdone", measure);
  measure();
  function revert() {
    disposed = true;
    observer.disconnect();
    document.fonts.removeEventListener("loadingdone", measure);
    element.innerHTML = original;
    if (label === null) element.removeAttribute("aria-label");
    else element.setAttribute("aria-label", label);
  }
  return result;
}
