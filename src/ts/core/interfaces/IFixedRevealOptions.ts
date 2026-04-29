import type { TTranslateYMode } from '../types/TTranslateYMode'

export interface IFixedRevealOptions {
  /** CSS selector for the main content wrapper that receives the scale transform */
  wrapperSelector?: string
  /** CSS selector for the footer element that triggers the reveal */
  footerSelector?: string
  /** Fade footer from a starting opacity to 1 during reveal */
  opacityEnabled?: boolean
  /**
   * - `'fixed'` — footer positioned via CSS sticky (no JS animation needed)
   * - `'custom'` — user-defined translateY offset via CSS variable
   * - `'none'` — no vertical translation
   */
  translateYMode?: TTranslateYMode
}
