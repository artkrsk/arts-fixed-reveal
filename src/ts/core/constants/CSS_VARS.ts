/**
 * CSS custom properties owned by the JS island. The footer-effect vars
 * (`--arts-fixed-reveal-opacity-from`, `--arts-fixed-reveal-translate-y-from`)
 * are a pure CSS contract now — consumed by the keyframes in
 * `src/styles/fixed-reveal.sass` with var() fallbacks, never read by JS.
 */
export const CSS_VARS = {
  /** Registered typed (<length>) so getComputedStyle resolves any unit
   *  (px/rem/vw/clamp) to a pixel number for the scale endpoint. */
  gap: '--arts-fixed-reveal-gap',
} as const
