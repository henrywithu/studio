# Studio: reference investigation

Reference: https://thelinestudio.com/ (snapshot captured 2026-10-09).

## Evidence and extraction

- 114 public routes, enumerated from the original sitemap, downloaded as rendered HTML.
- 114 original Nuxt flattened content payloads downloaded and decoded independently. They contain original copy, project records, media URLs, crop geometry, responsive image sets, episode recordings and credits.
- 89 initial module/style resources downloaded recursively for inspection; additional route resources obtained from every HTML document.
- Original variable font: `DenimWeb`, `/fonts/DenimVF.woff{,2}`, weights 300–800, OpenType `ss03` enabled.
- Browser observations: Chromium, desktop 1440×900, mobile 390×844. Browser captures and production bundles are ignored research material, never client dependencies.
- The production implementation uses Nuxt/Vue, GSAP, ScrollTrigger, CustomEase and Lenis. Audio previews use Howler. Studio replaces framework/application code with independent React/TypeScript components and controllers.

## Global geometry and color

Root font size 62.5% (1rem=10px). Mobile gutter 8px; desktop gutter 0.46296vw. Desktop grid 9 columns (5 on mobile); responsive boundaries include 768px and 1024px. Body #dddee2, paper #f8f8f8, ink #0b0b0b, accent #ff391e. Translucent acetates use pure red and `mix-blend-mode:multiply`; this is the red hero effect, not a color grading shader. Native scrollbars are hidden only for hover-capable pointers; a 0.46296vw custom handle is draggable.

## Preloader (original application entry module)

SVG geometry consists of a line and seven individual letters, divided into shapes. Initially letters opacity=0; XY shapes scale=3; X shapes scaleX=5; Y shapes scaleY=3; line scaleX=0, origin left.

Timeline starts after 0.5s. FPS labels blink at 0, .12, .24, .36. The line expands for 1.2s using power1.out; at 1.18s it expands vertically to scaleY=3.6 over .35s with expoInOut. At 1.53s restore the line and reveal letters. Letter shapes return to normal over 1s with power4.out, .01s offset per letter. Registered mark blinks in at 1.8s; FPS wrapper blinks out at 2.8s. Counter interpolates 00→24 for 3s after .8s delay with expoInOut.

On home completion the same logo wrapper moves into the hero. On other routes the loading sheet exits yPercent=-125, xPercent=10, rotate=15, origin top right, duration=.8, delay=.2, pageOut easing. Lenis stops during loading.

## Motion primitives

Original easings: expoOut=cubic-bezier(.19,1,.22,1), pageOut=cubic-bezier(.44,.14,.28,1). Default GSAP ease power2.out. Lenis lerp .2, driven by GSAP ticker. Blink: opacity 0 at 0, 1 at .09, 0 at .15, 1 at .21. BlinkOnce ends at .09. BlinkOut: 0 at 0, 1 at .09, 0 at .15.

Cursor: DOM element, pointer smoothing .1 per ticker frame; labels and image previews are portaled into the cursor. Horizontal position maps into rotation -10°…10° (after resize original code changes this to -30°…30°). Cursor is disabled for coarse pointers.

## Home scroll choreography (B6MUFv6g.js)

Hero is 200svh, with a scroller extending a further 100svh and a 100lvh sticky video. The red acetate and wordmark rotate -15° and translate X -10%, origin bottom left, from top-top+1 to bottom-top, scrub=true, power1.in. Original background reel is Vimeo playback 1017272898, 720p, muted loop.

Intro wrapper: xPercent -10 and rotate 8→0 over top-bottom to top-center, origin left. Entire intro exits xPercent -10, rotate -4, yPercent 5 from top-35% to bottom-top-50%, origin right, power1.out.

Three featured projects, in the order of the global case list: The Mountain; Here, Tomorrow; Marvel Snap / Hero. Each occupies a 100lvh scroller and layers within a common sticky viewport. Title sheet enters yPercent=110,xPercent=15,rotate=15, origin top left; media enters yPercent=130,xPercent=20,rotate=15, .06 timeline offset. Both return to identity from top-bottom to top-top. Exit title: y=-80,x=-25,rotate=-7 (last item y=50,x=-10,rotate=-3). Exit media y=-50,x=-5,rotate=-5 (last y=40,x=-2.5,rotate=-2). Both scrub from top-top+1 to bottom-top.

About heading: x=-20%,y=20%,rotate=16→identity from top-bottom to top-center. First photograph x=-45%,y=20%,rotate=4.89→identity. Last photograph x=25%,y=0,rotate=8→x45%,y-10%,rotate4.89 over wrapper top-102% to top-15%, power1.inOut. Clients slash and labels appear by .05/.03s stagger.

## Scope and fidelity policy

Original geometry, copy, media, fonts, SVGs, crops and CSS are extraction-backed. Behavior is reconstructed in readable TypeScript; no production JavaScript runs in Studio. Cookie consent is deliberately omitted at the user's request. There is no deployment workflow. Any unavailable media, incomplete behaviors or visual deviations must be recorded rather than described as identical.

## Component and route extraction milestone

Each of the 114 routes was inspected through its original Vue component tree. Media component properties supplied exact sources, responsive crop parameters, dimensions, small-screen video sources and original player URLs. Conditional crew panels were captured on 78 project routes; 14 directors’ notes were captured after opening their original controls. Header theme trigger properties were recorded for all routes. The only unmapped slot is an empty source image in the Unilever gallery.

The client uses React 19, TypeScript, Vite HMR, GSAP and Lenis. It renders typed declarative content, with separate controllers for media, text splitting, route motion, galleries, filters, cursor and controls. Content and production JavaScript remain separate. Original SVG geometry and CSS are preserved, including component scope attributes where selectors require them.

The local library contains 2,924 exact image crop variants, the original font, favicon, scribble, eight homepage background videos and 30 podcast previews. Large case films remain progressive streams at their original public URLs; embedded films retain their YouTube IDs. Repeated image URLs are canonicalized by sorted crop parameters to avoid storing the same transformation twice.

Source investigation found no application WebGL, WGSL, GLSL or shader pipeline. The visual sheets, acetates, grading, clipping and mouse previews use SVG, DOM transforms and CSS blending. There are consequently no invented shader files.

Detailed visual and interaction validation is ongoing at this milestone.
