/// <reference path="./global.d.ts" />
import ArtsFixedReveal from './index'
import '../styles/fixed-reveal.sass'

if (window.artsFixedRevealOptions?.enabled) {
  window.artsFixedReveal?.destroy()
  const reveal = new ArtsFixedReveal()
  reveal.init()
  window.artsFixedReveal = reveal
}

export default ArtsFixedReveal
