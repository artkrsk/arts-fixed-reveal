/**
 * CSS custom properties registered via CSS.registerProperty().
 * The browser resolves any CSS value (px, vh, rem, clamp, calc)
 * to a concrete number, which JS reads via getComputedStyle.
 */
export const CSS_VARS = {
  gap: '--arts-fixed-reveal-gap',
  opacityFrom: '--arts-fixed-reveal-opacity-from',
  translateYFrom: '--arts-fixed-reveal-translate-y-from',
} as const
