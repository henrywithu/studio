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

Root font size 62.5% (1rem=10px). Mobile gutter 8px; desktop gutter 0.46296vw. Desktop grid 9 columns (5 on mobile); responsive boundaries include 768px and 1024px. Body #dddee2, paper #f8f8f8, ink #0b0b0b, accent #ff391e. Translucent acetates use pure red and `mix-blend-mode:multiply`; this is the red hero effect, not a color grading shader. Native scrollbars are hidden only for hover-capable pointers; a 0.46296vw custom handle is draggable, with fixed minimum height 4.62963vw.

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

The local library contains 3,006 exact image crop variants, the original font, favicon, scribble, eight homepage background videos and 30 podcast previews. Large case films remain progressive streams at their original public URLs; embedded films retain their YouTube IDs. Repeated image URLs are canonicalized by sorted crop parameters to avoid storing the same transformation twice.

Source investigation found no application WebGL, WGSL, GLSL or shader pipeline. The visual sheets, acetates, grading, clipping and mouse previews use SVG, DOM transforms and CSS blending. There are consequently no invented shader files.

Final validation results and remaining limits are recorded in [VALIDATION.md](VALIDATION.md).

## Work catalog and control state (D9wrofva.js, ONgAZZxY.js)

The source global catalog contains 85 cases, while its rendered grid/list contains 77 published cards. Filter counts come from the global catalog, so `All [85]` with 77 cards is intentional source behavior. Selecting a filter moves it into the first list position; the original first-item CSS hides that button behind the large current-filter toggle. All remains available after selecting another type.

Every filter rebuilds the visible grid using column spans `[5,4,3,3,3,9,4,5,3,3,3,9]`, repeating across nine columns. Its corresponding crop sizes are `[medium,small,extra-small,extra-small,extra-small,big,small,medium,extra-small,extra-small,extra-small,big]`. All four original asset variants and the separate cursor thumbnail are extracted per case. The list uses the source cursor crop (1130×634 for the current records), rather than the grid image.

Each sorting control cycles default → ascending → descending → default. The first year state sorts newest first using the complete date. Title sorting uses the original title. Director sorting uses first/last alphabetical names, and changes the displayed director-name order. Type sorting uses first/last alphabetical tag slugs. A director query opens list layout and puts matching projects first while retaining every published row. Reset clears the query. Floating layout/back-to-top buttons appear between scroll 200px and the footer; director-query mode displays Reset.

Filter sheets move from `translate(-50%,115%) rotate(8deg)` on mobile or `translate(-10%,115%) rotate(8deg)` on desktop over .8s with cubic(.14,1,.34,1). Grid/list entry moves from X20%, Y120lvh, rotation8 over .8s after .6s delay. Source page entry uses X−10%, Y105lvh, rotation−4 over .8s with pageOut; outgoing content then moves Y−25lvh, rotation4 over .78s. Next-project navigation uses the case-footer hero sheet.

## Other route motion and conditional controls

- About directional carousel: right-half click advances, left-half click goes back, wrapping ten original images. Next sheets enter/leave from X−110%,Y30%,rotation−10; previous from X110%,Y−40%,rotation10. Entry is 1.4s cubic(.19,1,.22,1); exit is 1s cubic(1,0,.25,.995). The next/previous thumbnail is 15.74074vw with aspect272/153, alongside `previous / [n/10]` or `next / [n/10]`. Pointer translation and rotation interpolate .1 per frame. Initial horizontal rotation range is −10…10; resize changes it to −30…30.
- Contact entrance: .5s delay; text sheet enters from Y100% over1s. Foreground image enters from Y120%,X−10%,rotation6, origin top-right over1.3s at offset.2. Acetate/content layers enter from Y120%,X−20%,rotation8, origin top-left over1s at offset.3. On completion, scroll from hero top-top to bottom-top scrubs .5: text Y−20%,X10%,rotation8; figure Y−40%,X10%,rotation8; acetates Y−50%,rotation8; background Y−10%.
- Entertainment hero: scroll moves its sheets Y−80%,X−15%,rotation−8. Artwork has distinct desktop/mobile transforms, transcribed in `motion/pages.ts`.
- Feed hero link moves Y60%,X10%,rotation8 from top-top+1 to bottom-top; article figures themselves remain static. Native line geometry is preserved for excerpts, including hyphenated words that can break within a line.
- Case hero: its sheets move Y−30%,X15%,rotation8; figure Y−10%, scrub.5. Crew opening moves main acetate/content Y−180px and clone Y−100%; the captured original crew panel enters X15%,Y120%,rotation−10 over1s. Scrolling beyond150px closes it.
- Fourteen original director notes open X−15%,Y115%,rotation10 over1s, stop smooth scrolling, and provide close/director-work controls. Their original HTML, signatures and images are extracted.
- Case footer scrolls from rotation−16,Y28%,X−15% to rotation−8,Y−10%,X−8%, origin top-right, from top-bottom to document max with scrub.5.
- Footer reserves measured content height +8px. Wordmark moves X−7%,rotation−6 on desktop and X−14%,Y−40%,rotation−6 on mobile; sticky content rises Y15%→0. Credits first scroll to bottom over.8s, then reveal after.82s. The original open class shifts the sticky sheet X5%,Y−16.2037vw,rotation−6 on desktop or X5%,Y−24rem,rotation−3 on mobile.
- FAQ starts with the first answer expanded, permits one open answer, and animates height over.6s power2.out. Mobile footer sections also use exclusive height expansion.
- Gallery drag clamps to the original content width, calculates figure width from source aspect ratios, and interpolates horizontal motion .15 per frame. Numbered case carousels retain original navigation labels, thumbnails and sheet geometry.
- Shop images travel along the original SVG path using MotionPathPlugin, five-second motion with staggered repeats; alternating images rotate through360°.

## Media, text and responsiveness

Background videos use original desktop/small-screen URLs, muted looping playback and viewport-driven loading. Full-length video playback starts only on the original Play control, enables the source's native controls and unmuted audio, and closes on Escape/ended. YouTube IDs remain original embeds. Thirty original podcast MP3 previews are local; selecting another preview stops the previous one. Sixteen source equalizer bars animate independently with repeated random scaleY values at .5s intervals and .025s stagger. Playback volume is .5.

Original TextSplitter props are captured per instance: split type, line class, font correction and inline-flex display. Denim's first-letter offsets are preserved. Hidden `<br>` elements under768px are treated as spaces so current SplitText does not impose a mobile line break absent from the source. Plain excerpts use browser Range geometry to retain native kerning and word-break positions. Resizing remeasures those lines and rebuilds breakpoint-dependent splits.

Responsive images preserve exact original crop dimensions instead of uncropped file dimensions; this prevents native lazy placeholders from increasing section height. Vue client-only teleport placeholders are removed where hydration removes them. Two targeted CSS cascade corrections preserve source route loading order: mobile Entertainment metadata is relative, and the Contact opportunities dot is absolute. These changes derive from computed style comparisons, rather than compensating spacers.

## Provenance artifacts

`docs/evidence/assets.json` records every stored asset's original URL, local path, bytes and SHA-256. `reference-resources.json` records all89 inspected module/style URLs and their hashes without copying application code into the client. Route, viewport and motion validation summaries are committed beside them. Extraction scripts can regenerate the content from the ignored research snapshots.
