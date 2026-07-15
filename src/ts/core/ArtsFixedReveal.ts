import { debounce, Resize } from '@arts/utilities'
import { CSS_VARS, DEFAULTS, ELEMENTOR_MAPPED_OPTIONS, OPACITY_FLOOR } from './constants'
import type { IFixedRevealOptions } from './interfaces'
import { LiveSettingsService } from './services'
import type { TTranslateYMode } from './types'

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
  private readonly wrapperSelector: string
  private readonly footerSelector: string
  private opacityEnabled: boolean
  private translateYMode: TTranslateYMode
  private timeline: gsap.core.Timeline | null = null
  private settingsService: LiveSettingsService | null = null
  private wrapper: HTMLElement | null = null
  private footer: HTMLElement | null = null
  /** Cached from RO entry — avoids offsetHeight reads in ScrollTrigger hot paths */
  private footerHeight = 0
  private resizeObserver: Resize | null = null

  constructor(options: IFixedRevealOptions = {}) {
    this.wrapperSelector = options.wrapperSelector ?? DEFAULTS.wrapperSelector
    this.footerSelector = options.footerSelector ?? DEFAULTS.footerSelector
    this.opacityEnabled = options.opacityEnabled ?? DEFAULTS.opacityEnabled
    this.translateYMode = options.translateYMode ?? DEFAULTS.translateYMode

    this.registerProperties()
  }

  init(): void {
    const wrapper = document.querySelector<HTMLElement>(this.wrapperSelector)
    const footer = document.querySelector<HTMLElement>(this.footerSelector)

    if (!wrapper || !footer) {
      return
    }

    /** Skip when footer is inside the wrapper (e.g. editing a footer template in Elementor) */
    if (wrapper.contains(footer)) {
      return
    }

    this.wrapper = wrapper
    this.footer = footer
    /** Seed the cache — RO's first callback fires on the next frame, not synchronously */
    this.footerHeight = footer.offsetHeight

    this.setupResizeObserver()
    this.buildTimelineIfEligible()
  }

  destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.destroy()
      this.resizeObserver = null
    }
    if (this.timeline) {
      this.timeline.kill()
      this.timeline = null
    }
    this.wrapper = null
    this.footer = null
    this.footerHeight = 0
  }

  /** Attach live settings listener for Elementor editor WYSIWYG */
  loadElementorSettingsHandler(): void {
    if (this.settingsService) {
      return
    }

    this.settingsService = new LiveSettingsService(
      async () => this.onSettingsChange(),
      ELEMENTOR_MAPPED_OPTIONS,
    )
  }

  /** Detach live settings listener */
  destroyElementorSettingsHandler(): void {
    if (this.settingsService) {
      this.settingsService.detach()
      this.settingsService = null
    }
  }

  /** Full reinit on any setting change — CSS vars are re-read fresh */
  private async onSettingsChange(): Promise<void> {
    this.destroy()
    this.init()
  }

  /** Observe wrapper + footer so eligibility re-evaluates across breakpoints and deferred content growth */
  private setupResizeObserver(): void {
    if (!this.wrapper || !this.footer) {
      return
    }

    this.resizeObserver = new Resize({
      elements: [this.wrapper, this.footer],
      callbackResize: (_targets, entries) => {
        for (const entry of entries) {
          if (entry.target === this.footer) {
            /** Round to match offsetHeight semantics — ScrollTrigger.maxScroll() is an integer, subpixel mismatch breaks the eligibility check */
            const raw = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height
            this.footerHeight = Math.round(raw)
          }
        }
      },
      callbackResizeDebounced: debounce(() => {
        this.buildTimelineIfEligible()
      }, 150),
    })
  }

  /** Effect eligibility — reads cached height to stay free of layout reads */
  private isEligible(): boolean {
    if (!this.wrapper || !this.footer) {
      return false
    }
    if (this.footerHeight <= 0) {
      return false
    }
    if (ScrollTrigger.maxScroll(window) < this.footerHeight) {
      return false
    }
    return true
  }

  /** Build, tear down, or refresh the timeline based on current eligibility */
  private buildTimelineIfEligible(): void {
    const eligible = this.isEligible()

    if (eligible && !this.timeline) {
      this.buildTimeline()
    } else if (!eligible && this.timeline) {
      this.timeline.kill()
      this.timeline = null
    } else if (eligible && this.timeline) {
      /** Content/footer shifted while eligible — refresh so the start getter picks up the new cache value.
       * Skip if a global refresh pass is already in flight; it'll run our getter anyway.
       * isRefreshing is public on ScrollTrigger at runtime but missing from the typings. */
      const isRefreshing = (ScrollTrigger as unknown as { isRefreshing: boolean }).isRefreshing
      if (!isRefreshing) {
        this.timeline.scrollTrigger?.refresh()
      }
    }
  }

  private buildTimeline(): void {
    if (!this.wrapper || !this.footer) {
      return
    }
    const wrapper = this.wrapper
    const footer = this.footer

    const tl = gsap.timeline({
      scrollTrigger: {
        start: () => ScrollTrigger.maxScroll(window) - this.footerHeight,
        // End = start + reveal DISTANCE. Distance defaults to footerHeight
        // (→ end = maxScroll = the old `'max'`, unchanged for normal footers),
        // but a footer can shrink it via `--arts-fixed-reveal-height` when part
        // of its height is scroll runway rather than revealable content (e.g. a
        // `position: sticky` scene sitting at the footer's top with a taller
        // track below it). `start` stays on footerHeight — the reveal still
        // BEGINS when the footer first enters — only the DURATION shortens, so
        // the scale-down completes as the content lands instead of continuing
        // to animate an already-offscreen wrapper across the runway.
        end: () => ScrollTrigger.maxScroll(window) - this.footerHeight + this.getRevealHeight(),
        scrub: true,
        invalidateOnRefresh: true,
        // Refresh LAST in the trigger queue. Our `start` getter reads
        // `ScrollTrigger.maxScroll(window)`, which depends on whether
        // other triggers' pinSpacing elements are currently in the DOM.
        // Default (priority 0) puts us in DOM order; a sibling pin
        // refreshing later than us would leave us with a stale `start`
        // computed against the un-pinned page height, then the wrapper
        // renders at an interpolated scale even at scrollY=0.
        //
        // GSAP sorts by `refreshPriority * -1e6` ascending — negative
        // values land at the end of the queue. It's a full numeric sort,
        // but any negative value meets our one constraint: refresh after
        // the priority-0 consumer pins. `-999` mirrors the framework
        // convention already used in `ArtsHeader Sticky.ts:210`. Anything
        // more negative (e.g. ScrollSmoother's `-9999`) could refresh
        // after us — harmless, since both global-geometry triggers
        // (ArtsHeader + ArtsFixedReveal) still land after consumer pins.
        refreshPriority: -999,
      },
    })

    tl.to(
      wrapper,
      {
        scale: () => this.getScale(),
        transformOrigin: '50% 100%',
        ease: 'none',
        duration: 1,
      },
      0,
    )

    this.addFooterEffects(tl, footer)
    this.timeline = tl
  }

  /** Register typed CSS custom properties so getComputedStyle resolves any unit to a number */
  private registerProperties(): void {
    const props: Array<{ name: string; syntax: string; initial: string }> = [
      { name: CSS_VARS.gap, syntax: '<length>', initial: '0px' },
      { name: CSS_VARS.opacityFrom, syntax: '<number>', initial: '1' },
      { name: CSS_VARS.translateYFrom, syntax: '<length>', initial: '0px' },
      // `0px` initial = "unset" — `getRevealHeight` falls back to footerHeight.
      { name: CSS_VARS.height, syntax: '<length>', initial: '0px' },
    ]

    for (const { name, syntax, initial } of props) {
      try {
        CSS.registerProperty({
          name,
          syntax,
          inherits: true,
          initialValue: initial,
        })
      } catch {
        // Already registered
      }
    }
  }

  /** Read a resolved CSS custom property value as a number from a given
   *  element (default: `document.body`). CSS variables inherit DOWN the
   *  tree only, so per-instance overrides set on the footer (or the
   *  wrapper) are invisible when read from `body`. Callers that want
   *  instance-scoped values must pass the relevant element. */
  private getCSSVar(name: string, el: HTMLElement = document.body): number {
    const raw = getComputedStyle(el).getPropertyValue(name)
    return parseFloat(raw) || 0
  }

  /** Reveal distance in scroll px — the `--arts-fixed-reveal-height` override
   *  read from the footer, or the measured footer height when unset (`0`). */
  private getRevealHeight(): number {
    if (!this.footer) {
      return this.footerHeight
    }
    const override = this.getCSSVar(CSS_VARS.height, this.footer)
    return override > 0 ? override : this.footerHeight
  }

  /** Compute scale factor from the gap CSS variable and viewport width */
  private getScale(): number {
    const vw = window.innerWidth
    const gap = this.getCSSVar(CSS_VARS.gap)

    if (vw <= 0 || gap <= 0) {
      return 1
    }
    return (vw - 2 * gap) / vw
  }

  /** Add opacity and/or custom translateY tweens for the footer */
  private addFooterEffects(tl: gsap.core.Timeline, footer: HTMLElement): void {
    this.addFooterOpacity(tl, footer)
    this.addFooterCustomTranslateY(tl, footer)
  }

  /** Fade footer from starting opacity to 1. Reads the `opacityFrom` CSS
   *  var from the footer element itself so per-instance overrides — e.g.
   *  `[data-elementor-type="footer"]:has(.heavy-widget) { --…-opacity-from: 1 }`
   *  — correctly skip the tween. Reading from `body` would miss any var
   *  declared deeper in the tree (CSS variables don't propagate upward). */
  private addFooterOpacity(tl: gsap.core.Timeline, footer: HTMLElement): void {
    if (!this.opacityEnabled) {
      return
    }

    if (this.getCSSVar(CSS_VARS.opacityFrom, footer) >= 1) {
      return
    }

    tl.fromTo(
      footer,
      { opacity: () => Math.max(OPACITY_FLOOR, this.getCSSVar(CSS_VARS.opacityFrom, footer)) },
      { opacity: 1, ease: 'none', duration: 1 },
      0,
    )
  }

  /** Custom translateY settle-in (only in "custom" mode). Reads from
   *  the footer for the same reason `addFooterOpacity` does — per-instance
   *  overrides set deeper in the tree must be visible. */
  private addFooterCustomTranslateY(tl: gsap.core.Timeline, footer: HTMLElement): void {
    if (this.translateYMode !== 'custom') {
      return
    }

    if (this.getCSSVar(CSS_VARS.translateYFrom, footer) === 0) {
      return
    }

    tl.fromTo(
      footer,
      /** Skip offset when footer is taller than viewport — small offset looks bad at that size */
      {
        y: () =>
          this.footerHeight > window.innerHeight
            ? 0
            : this.getCSSVar(CSS_VARS.translateYFrom, footer),
      },
      { y: 0, ease: 'none', duration: 1 },
      0,
    )
  }
}
