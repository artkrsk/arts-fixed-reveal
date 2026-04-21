import { Resize, debounce } from "@arts/utilities";

import { CSS_VARS, DEFAULTS, ELEMENTOR_MAPPED_OPTIONS } from "./constants";
import type { IFixedRevealOptions } from "./interfaces";
import { LiveSettingsService } from "./services";
import type { TTranslateYMode } from "./types";

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
  private settingsService: LiveSettingsService | null = null;
  private wrapper: HTMLElement | null = null;
  private footer: HTMLElement | null = null;
  /** Cached from RO entry — avoids offsetHeight reads in ScrollTrigger hot paths */
  private footerHeight = 0;
  private resizeObserver: Resize | null = null;

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

    /** Skip when footer is inside the wrapper (e.g. editing a footer template in Elementor) */
    if (wrapper.contains(footer)) {
      return;
    }

    this.wrapper = wrapper;
    this.footer = footer;
    /** Seed the cache — RO's first callback fires on the next frame, not synchronously */
    this.footerHeight = footer.offsetHeight;

    this.setupResizeObserver();
    this.buildTimelineIfEligible();
  }

  destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.destroy();
      this.resizeObserver = null;
    }
    if (this.timeline) {
      this.timeline.kill();
      this.timeline = null;
    }
    this.wrapper = null;
    this.footer = null;
    this.footerHeight = 0;
  }

  /** Attach live settings listener for Elementor editor WYSIWYG */
  loadElementorSettingsHandler(): void {
    if (this.settingsService) {
      return;
    }

    this.settingsService = new LiveSettingsService(
      async () => this.onSettingsChange(),
      ELEMENTOR_MAPPED_OPTIONS,
    );
  }

  /** Detach live settings listener */
  destroyElementorSettingsHandler(): void {
    if (this.settingsService) {
      this.settingsService.detach();
      this.settingsService = null;
    }
  }

  /** Full reinit on any setting change — CSS vars are re-read fresh */
  private async onSettingsChange(): Promise<void> {
    this.destroy();
    this.init();
  }

  /** Observe wrapper + footer so eligibility re-evaluates across breakpoints and deferred content growth */
  private setupResizeObserver(): void {
    if (!this.wrapper || !this.footer) {
      return;
    }

    this.resizeObserver = new Resize({
      elements: [this.wrapper, this.footer],
      callbackResize: (_targets, entries) => {
        for (const entry of entries) {
          if (entry.target === this.footer) {
            this.footerHeight =
              entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
          }
        }
      },
      callbackResizeDebounced: debounce(() => {
        this.buildTimelineIfEligible();
      }, 150),
    });
  }

  /** Effect eligibility — reads cached height to stay free of layout reads */
  private isEligible(): boolean {
    if (!this.wrapper || !this.footer) {
      return false;
    }
    if (this.footerHeight <= 0) {
      return false;
    }
    if (ScrollTrigger.maxScroll(window) < this.footerHeight) {
      return false;
    }
    return true;
  }

  /** Build or tear down the timeline based on current eligibility */
  private buildTimelineIfEligible(): void {
    const eligible = this.isEligible();

    if (eligible && !this.timeline) {
      this.buildTimeline();
    } else if (!eligible && this.timeline) {
      this.timeline.kill();
      this.timeline = null;
    }
  }

  private buildTimeline(): void {
    if (!this.wrapper || !this.footer) {
      return;
    }
    const wrapper = this.wrapper;
    const footer = this.footer;

    const tl = gsap.timeline({
      scrollTrigger: {
        start: () => ScrollTrigger.maxScroll(window) - this.footerHeight,
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
    const raw = getComputedStyle(document.body).getPropertyValue(name);
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
  private addFooterEffects(tl: gsap.core.Timeline, footer: HTMLElement): void {
    this.addFooterOpacity(tl, footer);
    this.addFooterCustomTranslateY(tl, footer);
  }

  /** Fade footer from starting opacity to 1 */
  private addFooterOpacity(tl: gsap.core.Timeline, footer: HTMLElement): void {
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

    tl.fromTo(
      footer,
      /** Skip offset when footer is taller than viewport — small offset looks bad at that size */
      { y: () => this.footerHeight > window.innerHeight ? 0 : this.getCSSVar(CSS_VARS.translateYFrom) },
      { y: 0, ease: "none", duration: 1 },
      0,
    );
  }
}
