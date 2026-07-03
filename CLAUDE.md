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

All visual parameters are CSS custom properties registered via `CSS.registerProperty()`. Elementor's responsive slider controls set the values through CSS selectors. JS reads resolved values via `getComputedStyle`: the gap from `document.body`, but the opacity/translateY vars from the **footer element** — so per-instance overrides declared deeper in the tree are honored (CSS vars inherit downward only).

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

## Build

Vite library mode. GSAP externalized (runtime global via ArtsGSAPLoader). Output: `src/php/libraries/arts-fixed-reveal/index.iife.js`.

```
pnpm dev      # Dev playground with theme-like fixture
pnpm dev:lib  # Watch + copy IIFE for Composer consumers
pnpm build    # One-shot build
pnpm check    # Type-check (tsc --noEmit)
```

## Edge Cases

- **Footer taller than viewport**: "custom" mode skips the translateY offset (looks bad at that size); opacity still fades. "fixed" mode works (parallax through content).
- **Short pages** (`maxScroll < footerHeight`): entire effect skipped.
- **Elementor editor**: always loads script for live toggle preview.
