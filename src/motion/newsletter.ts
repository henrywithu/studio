import { gsap } from "./engine";
/** Original form timing and validation. Submission uses the original external service. */
export function setupNewsletter(root: HTMLElement) {
  const cleanup: (() => void)[] = [];
  root.querySelectorAll<HTMLElement>(".newsletter").forEach((newsletter) => {
    const input = newsletter.querySelector<HTMLInputElement>("input")!,
      form = newsletter.querySelector("form")!;
    input.placeholder = "Newsletter";
    input.setAttribute("aria-label", "Email address");
    const typing = gsap.timeline({ paused: true });
    typing.add(() => {
      input.placeholder = "";
    }, 0);
    [..."Enter email"].forEach((char, i) =>
      typing.add(
        () => {
          input.placeholder += char;
        },
        0.05 * (i + 1),
      ),
    );
    const focus = () => typing.restart(),
      blur = () => {
        if (!input.value) {
          typing.pause();
          input.placeholder = "Newsletter";
        }
      };
    const submit = async (event: SubmitEvent) => {
      event.preventDefault();
      let message = newsletter.querySelector<HTMLElement>(
        ".newsletter__message",
      );
      if (!message) {
        message = document.createElement("div");
        message.className = "newsletter__message p7 ttu fw440 slash-light";
        message.setAttribute("role", "status");
        newsletter.prepend(message);
      }
      if (!input.validity.valid) {
        message.textContent = "/ Email address format is not recognised.";
        return;
      }
      message.textContent = "/ Sending…";
      const controller = new AbortController();
      cleanup.push(() => controller.abort());
      try {
        const response = await fetch(
          import.meta.env.VITE_NEWSLETTER_ENDPOINT ||
            "https://thelinestudio.com/.netlify/functions/submitSubscription",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: input.value }),
            signal: controller.signal,
          },
        );
        const result = await response.json();
        message.textContent = "/ " + result.message;
      } catch {
        message.textContent =
          "/ Subscription service is unavailable. Please try again later.";
      }
    };
    input.addEventListener("focus", focus);
    input.addEventListener("blur", blur);
    form.addEventListener("submit", submit);
    cleanup.push(() => {
      typing.kill();
      input.removeEventListener("focus", focus);
      input.removeEventListener("blur", blur);
      form.removeEventListener("submit", submit);
    });
  });
  return () => cleanup.forEach((fn) => fn());
}
