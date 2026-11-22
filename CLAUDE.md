# CLAUDE.md

Standalone framework package — scroll-driven fixed reveal effect for Elementor. Same tier as ArtsSmoothScrolling and ArtsCursorFollower.

## How It Works

The footer sits behind the main content wrapper. As the user scrolls past the content, the wrapper scales down (via ScrollTrigger scrub), revealing the dark body/footer layer behind. Optional opacity fade and translateY effects enhance the footer reveal.

Three CSS layers, no custom color controls:

| Layer          | Element                          | Source                                         |
| -------------- | -------------------------------- | ---------------------------------------------- |
| Back (canvas)  | `body`                           | Elementor Site Settings > Background           |
| Content (card) | `#page-wrapper`                  | Per-document background (retargeted from body) |
| Footer         | `[data-elementor-type="footer"]` | Transparent by convention                      |

## CSS Variable Architecture

All visual parameters are CSS custom properties; only the gap is registered (typed `<length>`, via `@property` in `fixed-reveal.sass` — the stylesheet is enqueued in the head so the registration lands in the first style pass; a late registration restyles the whole document). Elementor's responsive slider controls set the values through CSS selectors. JS reads resolved values via `getComputedStyle`: the gap from `document.body`, but the opacity/translateY vars from the **footer element** — so per-instance overrides declared deeper in the tree are honored (CSS vars inherit downward only).

| Variable                               | Syntax     | Initial | Purpose                     |
| -------------------------------------- | ---------- | ------- | --------------------------- |
| `--arts-fixed-reveal-gap`              | `<length>` | `0px`   | Gap per side at full reveal |
| `--arts-fixed-reveal-opacity-from`     | `<number>` | `1`     | Starting footer opacity     |
| `--arts-fixed-reveal-translate-y-from` | `<length>` | `0px`   | Custom translateY offset    |

## TranslateY Modes

| Mode     | Behavior                                                                         | CSS                                 |
| -------- | -------------------------------------------------------------------------------- | ----------------------------------- |
| `fixed`  | Footer positioned via `position: sticky; bottom: 0` (CSS-only, no JS animation) | Emitted by hidden Elementor control |
| `custom` | Footer translateY from CSS variable to 0 (settle-in effect)                      | No sticky                           |
| `none`   | No vertical translation                                                          | No sticky                           |

## ScrollTrigger Setup

Uses absolute scroll positions to avoid trigger-element shift issues:

- `start`: `maxScroll - footerHeight` (functional, recalculated on refresh)
- `end`: `"max"`
- Single timeline with wrapper scale + optional footer opacity/translateY
- Refreshes LAST (`refreshPriority: -999`) so `start` is computed after consumer pins settle — otherwise it reads an un-pinned page height and the wrapper renders pre-scaled at scrollY=0

This approach is immune to CSS transforms or sticky positioning on the footer affecting trigger calculations.

## Per-Document Background Retargeting

When enabled, `Options.php` hooks into `elementor/element/before_section_end` and replaces `{{WRAPPER}}` with `{{WRAPPER}} #page-wrapper` in the per-document background group control selectors. This redirects the "Page Settings > Body Style > Background" to target the wrapper instead of body — creating the two-layer color architecture without custom controls.

## Browser Support

Native scroll timelines only (Chrome and Edge, Safari 26+, Firefox 159+). Since 2.0.0 the package loads no scroll-timeline polyfill and no longer registers its handle. In a browser without timelines the script builds no wrapper animation, and the footer's own bindings (longhands) rest at their natural state, so the footer simply sits in place.

## Reduced Motion

A visitor whose system asks for reduced motion (`prefers-reduced-motion: reduce`) gets the page as with the reveal switched off: the footer in flow below the content, no wrapper scale, no footer fade or offset. A site forces the full effect with the filter shared across Arts packages, `add_filter( 'arts/reduced_motion/enabled', '__return_false' )` (default `true`). The verdict is site-wide and the preference is the visitor's, so cached HTML stays right for everyone: PHP only decides whether the gates exist, and the browser applies them.

- **Script:** `Options.php` prints the verdict as `reducedMotion` in `artsFixedRevealOptions` (`wp_localize_script` turns it into `'1'` or `''`, which `boot.ts` coerces). `init()` returns before the runway when the option is on and the media query matches, so none of the sheet's bindings match and no scale is built. It is read at each `init()`, never subscribed: a changed setting applies from the next AJAX visit (the navigator plugin re-inits) or page load. `IFixedRevealOptions.reducedMotion` (default `true`) is the same switch for an ESM host, whose own footer CSS is its own to gate.
- **CSS:** the Kit's Fixed mode makes the footer sticky from the first paint, before any script. `Frontend.php` adds an inline `@media (prefers-reduced-motion: reduce)` rule to the `arts-fixed-reveal` style that puts it back to `position: static; z-index: auto`, and only while the verdict is true: the compiled sheet cannot read the filter, so the gate lives where the verdict is known. `:root:root` outranks the Kit selector in any print order. The rule is live with the system setting; the script half follows at the next init.
- The per-document background retarget (post CSS) does not change per visitor; the footer then sits on the body background, as it does at the end of the full reveal.

## Build

The WordPress Vite build starts from `src/ts/boot.ts` and mirrors its IIFE/CSS to `src/php/libraries/arts-fixed-reveal/`. `build:library` separately emits passive ESM, declarations and CSS under `dist/esm` and `dist/types`; it never mirrors WordPress assets. Neither build removes the other's output.

```
pnpm dev      # Dev playground with theme-like fixture
pnpm dev:lib  # Watch + copy IIFE for Composer consumers
pnpm build    # One-shot build
pnpm build:library # ESM, declarations and CSS for packed browser consumers
pnpm check    # Type-check (tsc --noEmit)
```

For a browser host, import `ArtsFixedReveal` from `@arts/fixed-reveal`, load `@arts/fixed-reveal/styles.css` in the head, then construct and explicitly call `init()`. Publish the instance as `window.artsFixedReveal` when using the navigator's existing FixedReveal adapter; dispose it with `destroy()`. The root is passive, including with WordPress options present. Source consumers select `arts-source` and compile `@arts/fixed-reveal/styles.sass` instead. The explicit extension avoids Sass package-importer ambiguity with `styles.css`. The public `@arts/utilities` peer must be installed alongside this package (a prepared archive is sufficient).

Initialize the shared scroll-timeline loader before this effect. The engine uses native/polyfilled `ViewTimeline`; it does not create GSAP or ScrollTrigger instances. Retain the `#page-wrapper` and `[data-elementor-type="footer"]` shell contract, including the stylesheet's footer selector.

## Edge Cases

- **Footer taller than viewport**: "custom" mode skips the translateY offset (looks bad at that size); opacity still fades. "fixed" mode works (parallax through content).
- **Short pages** (`maxScroll < footerHeight`): entire effect skipped.
- **Elementor editor**: always loads script for live toggle preview.
