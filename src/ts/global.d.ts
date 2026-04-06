import type GSAPStatic from "gsap";

declare global {
  interface Window {
    gsap: typeof GSAPStatic;
    ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger;
    artsFixedRevealOptions?: {
      enabled: boolean;
      opacityEnabled: boolean;
      translateYMode: import("./core/types/TTranslateYMode").TTranslateYMode;
    };
    artsFixedReveal?: import("./core/ArtsFixedReveal").ArtsFixedReveal;
  }
}
