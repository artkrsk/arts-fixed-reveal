# CLAUDE.md

Scroll-driven fixed reveal for Elementor sites: as the footer comes into view, the content wrapper scales down and the footer shows behind it. It ships two ways:

- **WordPress:** the Composer library `arts/fixed-reveal` (`Arts\FixedReveal\Plugin`, booted by Velum's `velum-core`). It adds the "Footer Fixed Reveal" Site Settings tab, enqueues the IIFE and CSS, and retargets the page background.
- **Browser:** the ESM package `@arts/fixed-reveal` (see Build).

## How It Works

Shell contract: `#page-wrapper` holds the content and `[data-elementor-type="footer"]` sits outside it. When the footer is inside the wrapper (editor and template contexts), `init()` skips. The theme must stack the wrapper above the footer, positioned with a z-index of 1 or more (Velum's `.page-wrapper` uses 50, the dev fixture 1). The package sets no stacking, and the footer overlaps the content's last screen during the reveal.

| Layer          | Element                          | Source                                         |
| -------------- | -------------------------------- | ---------------------------------------------- |
| Back (canvas)  | `body`                           | Elementor Site Settings > Background           |
| Content (card) | `#page-wrapper`                  | Per-document background (retargeted from body) |
| Footer         | `[data-elementor-type="footer"]` | Transparent by convention                      |

- **Runway:** `init()` wraps the footer in `.arts-fixed-reveal__runway`, a static div exactly the footer's size. It adopts a runway already in the markup and on `destroy()` unwraps only one it created. The runway is the view-timeline subject (`--arts-fixed-reveal`), and every effect runs over its `entry` range: min(footer height, viewport) of scroll.
- **Footer effects are CSS** (`src/styles/fixed-reveal.sass`): the opacity and translate keyframes, bound as unconditional longhands with `linear` timing.
- **The wrapper scale is the only JS animation:** a WAAPI animation on `new ViewTimeline({ subject: runway })`, because the wrapper is the runway's sibling and cannot see its named timeline. It animates the standalone `scale` property to `(vw − 2·gap) / vw`, with `fill: 'forwards'` (never `both`; the comment in `buildAnimation()` explains the WebKit reason). It is rebuilt on resize only, and skipped when the endpoint is unchanged. No per-frame JS: the timeline samples live geometry.
- **`is-taller-than-viewport`** on the runway is toggled from the resize path and again on `load`.
- **`freezeScale()`** hands the wrapper's scale to another animation system mid-scrub. It stays latched until the next `init()`.

## CSS Variables

The Site Settings controls print them on `{{WRAPPER}}` (the Kit class on `body`). Only the gap is registered (`@property` in the head stylesheet, so the registration lands in the first style pass) and read by JS: `getComputedStyle(document.body)`, resolved to px for the scale endpoint. The other two are read only by the keyframes, on the footer, so an override declared deeper in the tree wins.

| Variable                               | Syntax                | Fallback | Purpose                                             |
| -------------------------------------- | --------------------- | -------- | --------------------------------------------------- |
| `--arts-fixed-reveal-gap`              | `<length>`            | `0px`    | Gap per side at full reveal                         |
| `--arts-fixed-reveal-opacity-from`     | `<number>`            | `1`      | Starting footer opacity                             |
| `--arts-fixed-reveal-translate-y-from` | `<length-percentage>` | `0px`    | Starting footer offset (Custom, or Fixed's `-100%`) |

## TranslateY Modes

| Mode     | Kit CSS                                                                                              | Behaviour                                                        |
| -------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `fixed`  | Footer `position: sticky; bottom: 0; z-index: 0`, plus `--arts-fixed-reveal-translate-y-from: -100%` | Footer pinned at the viewport bottom while the content lifts off |
| `custom` | The Starting Offset value in the var                                                                 | Settle-in from the offset to 0                                   |
| `none`   | Nothing                                                                                              | No vertical movement                                             |

Fixed mode works in two stages. The sticky holds the footer from the first paint until `init()` wraps it. Inside the runway it is inert: the parent is exactly the footer's size and leaves it no room (#1). From then on the `-100%` → 0 offset over `entry` cancels the scroll. A hidden control (`fixed_reveal_translate_y_fixed_styles`) prints both declarations. The `.is-taller-than-viewport` rule zeroes the var on the footer, so a footer taller than the viewport gets neither the Custom offset nor the Fixed pin.

A change to a control's `selectors` reaches a site only after Elementor regenerates its CSS (`wp elementor flush-css`, or Tools > Regenerate CSS & Data). Elementor never invalidates a cached Kit CSS file because a plugin changed its controls (`core/files/css/base.php`, `is_update_required()` returns `false`).

## Consumer Contracts

Renaming any of these breaks code outside this repo:

- `window.artsFixedReveal` with `init()`, `destroy()` and `freezeScale()`: ArtsAJAXNavigator's `ajax-plugin-fixed-reveal` calls `destroy()` and `init()` before each visit settles. Its `freezeFixedReveal()` calls `freezeScale()`, and Velum wires it as a transition's `onLeaveTail`.
- Velum's `velum-ajax-transitions` (`choreography/general/footer.ts`) bakes the footer's live `opacity` and `translate` at leave and cancels its animations.
- Velum's `velum-elementor` PostsNavigationNext (`styles/_fixed-reveal.sass`) re-declares the footer's animation longhands with `arts-fixed-reveal-translate-y` and the `--arts-fixed-reveal` timeline. It also targets `.arts-fixed-reveal__runway.is-taller-than-viewport`.

## Per-Document Background Retargeting

When the reveal is enabled, `Options.php` hooks `elementor/element/before_section_end` and rewrites `{{WRAPPER}}` to `{{WRAPPER}} #page-wrapper` in the `background_*` selectors of the page's `section_page_style`. "Page Settings > Body Style > Background" then paints the wrapper instead of body, giving the two-layer colour architecture without custom controls. A selector that already contains `#page-wrapper` is left alone, for example one Velum AJAX Transitions already retargeted.

## Browser Support

Native scroll timelines only (Chrome and Edge, Safari 26+, Firefox 159+). Since 2.0.0 the package loads no scroll-timeline polyfill and no longer registers its handle. In a browser without timelines the script still wraps the runway but builds no wrapper animation. The footer's longhand bindings rest at their natural state there, so the footer simply sits in place, unpinned in Fixed mode too.

## Reduced Motion

A visitor whose system asks for reduced motion (`prefers-reduced-motion: reduce`) gets the page as with the reveal switched off: the footer in flow below the content, no wrapper scale, no footer fade or offset. A site forces the full effect with the filter shared across Arts packages, `add_filter( 'arts/reduced_motion/enabled', '__return_false' )` (default `true`). The verdict is site-wide and the preference is the visitor's, so cached HTML stays right for everyone: PHP only decides whether the gates exist, and the browser applies them.

- **Script:** `Options.php` prints the verdict as `reducedMotion` in `artsFixedRevealOptions`. `wp_localize_script` turns it into `'1'` or `''`, which `boot.ts` coerces. `init()` returns before building the runway when the option is on and the media query matches, so none of the sheet's bindings match (the Fixed `-100%` var goes unused) and no scale is built. It is read at each `init()`, never subscribed: a changed setting applies from the next AJAX visit (the navigator plugin re-inits) or page load. `IFixedRevealOptions.reducedMotion` (default `true`) is the same switch for an ESM host, whose footer CSS is its own to gate.
- **CSS:** the Kit's Fixed mode makes the footer sticky from the first paint, before any script. `Frontend.php` adds an inline `@media (prefers-reduced-motion: reduce)` rule to the `arts-fixed-reveal` style that resets it to `position: static; z-index: auto`, and only while the verdict is true: the compiled sheet cannot read the filter, so the gate lives where the verdict is known. `:root:root` outranks the Kit selector in any print order. The rule follows the system setting live; the script half follows at the next init.
- The per-document background retarget (post CSS) does not change per visitor. The footer then sits on the body background, as it does at the end of the full reveal.

## Build

The WordPress Vite build starts from `src/ts/boot.ts` and mirrors its IIFE and CSS to `src/php/libraries/arts-fixed-reveal/` (gitignored). `build:library` separately emits passive ESM, declarations and CSS under `dist/esm` and `dist/types`; it never mirrors WordPress assets. Neither build removes the other's output. `pnpm-lock.yaml` is gitignored, so install with plain `pnpm install`.

```
pnpm dev           # Dev playground (index.html + dev/main.ts)
pnpm dev:lib       # Watch + copy IIFE for Composer consumers
pnpm build         # One-shot build
pnpm build:library # ESM, declarations and CSS for packed browser consumers
pnpm check         # Type-check (tsc --noEmit)
```

The dev playground's runway is in the markup, so `init()` takes the adopt path. `dev/main.ts` prints Custom-mode vars on `:root` (`-20vh`). To try Fixed mode, set `--arts-fixed-reveal-translate-y-from: -100%` on `body` and make the footer sticky. The footer's `getBoundingClientRect().bottom` should then equal `innerHeight` through the whole reveal.

For a browser host, import `ArtsFixedReveal` from `@arts/fixed-reveal`, load `@arts/fixed-reveal/styles.css` in the head, then construct it and call `init()` explicitly. Publish the instance as `window.artsFixedReveal` when using the navigator's FixedReveal adapter, and dispose of it with `destroy()`. The root is passive, including with WordPress options present. Source consumers select `arts-source` and compile `@arts/fixed-reveal/styles.sass` instead; the explicit extension avoids Sass package-importer ambiguity with `styles.css`. The public `@arts/utilities` peer must be installed alongside (a prepared archive is enough). The engine uses the native `ViewTimeline` only and creates no GSAP or ScrollTrigger instances. Keep the `#page-wrapper` and `[data-elementor-type="footer"]` shell contract, including the stylesheet's footer selector.

## Edge Cases

- **Footer taller than viewport:** the `entry` range spans one viewport. Custom mode skips its offset (it reads badly at that size) and Fixed mode its pin, so the footer scrolls in; the opacity still fades.
- **Short pages:** nothing is skipped. When the footer is already in view at scrollY 0, the reveal starts part-way: the wrapper renders pre-scaled and the footer part-faded. A page that doesn't scroll at all sits at the end state, with the wrapper fully scaled.
- **Elementor editor:** the script and style always load, but `boot.ts` inits only when `enabled` was true at page load. Nothing here listens to editor events (`EDITOR_CHANGE_CALLBACK_CONTROLS` only makes ArtsElementorExtension emit `arts/elementor_extension/editor/setting_changed` in the preview). Control changes reach the preview through Elementor's live Kit CSS, and turning the reveal on or off needs a preview reload.
