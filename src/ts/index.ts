/// <reference path="./global.d.ts" />
import { elementorEditorLoaded } from "@arts/utilities";
import { ArtsFixedReveal } from "./core/ArtsFixedReveal";

export type { ArtsFixedReveal };
export type { IFixedRevealOptions } from "./core/interfaces";
export type { TTranslateYMode } from "./core/types";

// Self-init from localized WordPress options
const options = window.artsFixedRevealOptions;
if (options?.enabled) {
  const reveal = new ArtsFixedReveal({
    opacityEnabled: options.opacityEnabled,
    translateYMode: options.translateYMode,
  });
  reveal.init();
  window.artsFixedReveal = reveal;

  elementorEditorLoaded().then((isEditor) => {
    if (isEditor) {
      reveal.loadElementorSettingsHandler();
    }
  });
}

export default ArtsFixedReveal;
