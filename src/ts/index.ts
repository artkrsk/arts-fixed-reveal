/// <reference path="./global.d.ts" />
import { ArtsFixedReveal } from './core/ArtsFixedReveal'
import '../styles/fixed-reveal.sass'

export type { IFixedRevealOptions } from './core/interfaces'
export type { ArtsFixedReveal }

// Self-init from localized WordPress options
const options = window.artsFixedRevealOptions
if (options?.enabled) {
  const reveal = new ArtsFixedReveal()
  reveal.init()
  window.artsFixedReveal = reveal
}

export default ArtsFixedReveal
