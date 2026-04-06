import { CSS_VARS } from "./constants/CSS_VARS";
import { DEFAULTS } from "./constants/DEFAULTS";
import type { IFixedRevealOptions } from "./interfaces/IFixedRevealOptions";
import type { TTranslateYMode } from "./types/TTranslateYMode";

/**
 * Scroll-driven fixed reveal effect. The footer is positioned via CSS
 * (sticky bottom) behind the wrapper. As the user scrolls past the content,
 * the wrapper scales down revealing the footer underneath.
 *
 * The "slideout footer" CSS pattern handles the positioning (zero jitter,
 * GPU-composited). ScrollTrigger only drives the animations: wrapper scale,
 * footer opacity, and optional custom translateY settle-in.
 *
 * All visual parameters are read from CSS custom properties registered
 * via CSS.registerProperty(), so Elementor's responsive controls drive
 * the values through CSS — no JS option passing needed.
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

    if (window.ScrollTrigger.maxScroll(window) < footer.offsetHeight) {
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

    this.addFooterEffects(tl, footer);
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
    const raw = getComputedStyle(document.body).getPropertyValue(
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

  /** Add opacity and/or custom translateY tweens for the footer */
  private addFooterEffects(
    tl: gsap.core.Timeline,
    footer: HTMLElement,
  ): void {
    this.addFooterOpacity(tl, footer);
    this.addFooterCustomTranslateY(tl, footer);
  }

  /** Fade footer from starting opacity to 1 */
  private addFooterOpacity(
    tl: gsap.core.Timeline,
    footer: HTMLElement,
  ): void {
    if (!this.opacityEnabled) {
      return;
    }

    if (this.getCSSVar(CSS_VARS.opacityFrom) >= 1) {
      return;
    }

    tl.fromTo(
      footer,
      { opacity: () => this.getCSSVar(CSS_VARS.opacityFrom) },
      { opacity: 1, ease: "none", duration: 1 },
      0,
    );
  }

  /** Custom translateY settle-in (only in "custom" mode) */
  private addFooterCustomTranslateY(
    tl: gsap.core.Timeline,
    footer: HTMLElement,
  ): void {
    if (this.translateYMode !== "custom") {
      return;
    }

    if (this.getCSSVar(CSS_VARS.translateYFrom) === 0) {
      return;
    }

    /** Skip when footer is taller than viewport — small offset looks bad */
    if (footer.offsetHeight > window.innerHeight) {
      return;
    }

    tl.fromTo(
      footer,
      { y: () => this.getCSSVar(CSS_VARS.translateYFrom) },
      { y: 0, ease: "none", duration: 1 },
      0,
    );
  }
}
