import type { TTranslateYMode } from "../types/TTranslateYMode";

export const DEFAULTS = {
  wrapperSelector: "#page-wrapper",
  footerSelector: '[data-elementor-type="footer"]',
  opacityEnabled: true,
  translateYMode: "fixed" as TTranslateYMode,
} as const;
