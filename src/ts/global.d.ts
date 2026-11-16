declare global {
  interface Window {
    artsFixedRevealOptions?: {
      enabled: boolean
      /** The `arts/reduced_motion/enabled` verdict, which `wp_localize_script` prints as `'1'` or `''` */
      reducedMotion?: boolean | string
    }
    artsFixedReveal?: import('./core/ArtsFixedReveal').ArtsFixedReveal
  }
}

export {}
