import { CSS_VARS } from "./constants/CSS_VARS";
import { DEFAULTS } from "./constants/DEFAULTS";
import type { IFixedRevealOptions } from "./interfaces/IFixedRevealOptions";
import type { TTranslateYMode } from "./types/TTranslateYMode";

/**
 * Scroll-driven fixed reveal effect. The main content wrapper scales down
 * via ScrollTrigger scrub, revealing the dark body/footer layer behind.
 * Footer content can optionally fade in and translate into place.
 *
 * All visual parameters (gap, opacity, translateY) are read from CSS custom
 * properties registered via CSS.registerProperty(), so Elementor's responsive
 * slider controls drive the values through CSS — no JS option passing needed.
 */
export class ArtsFixedReveal {
  private readonly wrapperSelector: string;
  private readonly footerSelector: string;
  private opacityEnabled: boolean;
  private translateYMode: TTranslateYMode;
  private timeline: gsap.core.Timeline | null = null;

  constructor(options: IFixedRevealOptions = {}) {
    this.wrapperSelector = options.wrapperSelector ?? DEFAULTS.wrapperSelector;
    this.footerSelector = options.footerSelector ?? DEFAULTS.footerSelector;
    this.opacityEnabled = options.opacityEnabled ?? DEFAULTS.opacityEnabled;
    this.translateYMode = options.translateYMode ?? DEFAULTS.translateYMode;

    this.registerProperties();
  }

  init(): void {
    const wrapper = document.querySelector<HTMLElement>(this.wrapperSelector);
    const footer = document.querySelector<HTMLElement>(this.footerSelector);

    if (!wrapper || !footer) {
      return;
    }

    const tl = window.gsap.timeline({
      scrollTrigger: {
        start: () =>
          window.ScrollTrigger.maxScroll(window) - footer.offsetHeight,
        end: "max",
        scrub: true,
        invalidateOnRefresh: true,
      },
    });

    tl.to(
      wrapper,
      {
        scale: () => this.getScale(),
        transformOrigin: "50% 100%",
        ease: "none",
        duration: 1,
      },
      0,
    );

    this.addFooterAnimation(tl, footer);
    this.timeline = tl;
  }

  destroy(): void {
    if (this.timeline) {
      this.timeline.kill();
      this.timeline = null;
    }
  }

  /** Register typed CSS custom properties so getComputedStyle resolves any unit to a number */
  private registerProperties(): void {
    const props: Array<{ name: string; syntax: string; initial: string }> = [
      { name: CSS_VARS.gap, syntax: "<length>", initial: "0px" },
      { name: CSS_VARS.opacityFrom, syntax: "<number>", initial: "1" },
      { name: CSS_VARS.translateYFrom, syntax: "<length>", initial: "0px" },
    ];

    for (const { name, syntax, initial } of props) {
      try {
        CSS.registerProperty({
          name,
          syntax,
          inherits: true,
          initialValue: initial,
        });
      } catch {
        // Already registered
      }
    }
  }

  /** Read a resolved CSS custom property value as a number */
  private getCSSVar(name: string): number {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(
      name,
    );
    return parseFloat(raw) || 0;
  }

  /** Compute scale factor from the gap CSS variable and viewport width */
  private getScale(): number {
    const vw = window.innerWidth;
    const gap = this.getCSSVar(CSS_VARS.gap);

    if (vw <= 0 || gap <= 0) {
      return 1;
    }
    return (vw - 2 * gap) / vw;
  }

  /** Add opacity and/or translateY tweens for the footer element */
  private addFooterAnimation(
    tl: gsap.core.Timeline,
    footer: HTMLElement,
  ): void {
    const hasOpacity = this.opacityEnabled;
    const hasTranslateY = this.translateYMode !== "none";

    if (!hasOpacity && !hasTranslateY) {
      return;
    }

    if (window.ScrollTrigger.maxScroll(window) < footer.offsetHeight) {
      return;
    }

    /**
     * Custom offset mode: skip when footer is taller than viewport
     * (small translateY + opacity fade looks bad on tall footers).
     * Fixed mode: always allowed — parallax-scrolls through content.
     */
    if (
      this.translateYMode === "custom" &&
      hasOpacity &&
      footer.offsetHeight > window.innerHeight
    ) {
      return;
    }

    const fromVars: gsap.TweenVars = {};
    const toVars: gsap.TweenVars = { ease: "none", duration: 1 };
    let hasEffect = false;

    if (hasOpacity && this.getCSSVar(CSS_VARS.opacityFrom) < 1) {
      fromVars.opacity = () => this.getCSSVar(CSS_VARS.opacityFrom);
      toVars.opacity = 1;
      hasEffect = true;
    }

    if (this.translateYMode === "fixed") {
      fromVars.y = () => -footer.offsetHeight;
      toVars.y = 0;
      hasEffect = true;
    } else if (
      this.translateYMode === "custom" &&
      this.getCSSVar(CSS_VARS.translateYFrom) !== 0
    ) {
      fromVars.y = () => this.getCSSVar(CSS_VARS.translateYFrom);
      toVars.y = 0;
      hasEffect = true;
    }

    if (!hasEffect) {
      return;
    }

    tl.fromTo(footer, fromVars, toVars, 0);
  }
}
