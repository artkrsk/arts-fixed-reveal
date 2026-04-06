import { ArtsFixedReveal } from "./core/ArtsFixedReveal";
export default ArtsFixedReveal;

export type { ArtsFixedReveal };
export type { IFixedRevealOptions } from "./core/interfaces/IFixedRevealOptions";
export type { TTranslateYMode } from "./core/types/TTranslateYMode";

// Self-init from localized WordPress options
const options = window.artsFixedRevealOptions;
if (options?.enabled) {
  const reveal = new ArtsFixedReveal({
    opacityEnabled: options.opacityEnabled,
    translateYMode: options.translateYMode,
  });
  reveal.init();
  window.artsFixedReveal = reveal;
}
