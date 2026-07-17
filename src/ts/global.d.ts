declare global {
  interface Window {
    artsFixedRevealOptions?: {
      enabled: boolean
    }
    artsFixedReveal?: import('./core/ArtsFixedReveal').ArtsFixedReveal
  }
}

export {}
