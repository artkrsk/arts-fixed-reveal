/**
 * CSS custom properties registered via CSS.registerProperty().
 * The browser resolves any CSS value (px, vh, rem, clamp, calc)
 * to a concrete number, which JS reads via getComputedStyle.
 */
export const CSS_VARS = {
  gap: '--arts-fixed-reveal-gap',
  opacityFrom: '--arts-fixed-reveal-opacity-from',
  translateYFrom: '--arts-fixed-reveal-translate-y-from',
  /** Optional per-footer override for the reveal DISTANCE (how far the
   *  scrub runs), independent of `footer.offsetHeight`. `0` (the initial
   *  value) means "use the measured footer height" — the default. Set it
   *  when the footer is taller than its revealable content, e.g. a footer
   *  whose height includes a `position: sticky` scroll runway: the reveal
   *  should complete over the VISIBLE height, not the runway. */
  height: '--arts-fixed-reveal-height',
} as const
