import { debounce, Resize } from '@arts/utilities'
import { CSS_VARS, DEFAULTS } from './constants'
import type { IFixedRevealOptions } from './interfaces'

interface IViewTimelineCtor {
  new (options: { subject: Element }): AnimationTimeline
}

const RUNWAY_CLASS = 'arts-fixed-reveal__runway'
const TALLER_CLASS = 'is-taller-than-viewport'

/** Uniform scale from the STANDALONE `scale` property — where the keyframes
 *  below write. Deliberately not `transform`: computed `transform` excludes
 *  the individual transform properties, so a matrix decomposition reads 1
 *  here no matter how far the scrub has progressed. */
function readScale(el: HTMLElement): number {
  const raw = getComputedStyle(el).scale

  if (!raw || raw === 'none') {
    return 1
  }

  return parseFloat(raw) || 1
}

/**
 * Scroll-driven fixed reveal — the JS island of the v2 architecture.
 *
 * The footer's own reveal effects (opacity, translateY) are pure CSS
 * (`src/styles/fixed-reveal.sass`) bound to the runway's view timeline.
 * This class owns ONLY what CSS cannot express:
 *
 *  - the RUNWAY: a static in-flow div this class wraps around the footer
 *    at init() (and unwraps at destroy()) — the view-timeline subject (a
 *    sticky footer would distort ranges; its wrapper keeps the in-flow
 *    slot). JS-owned wrapping keeps the package THEME-AGNOSTIC (no theme
 *    markup contract — works on any theme, e.g. Hello) and AJAX-safe:
 *    partial-update systems that swap/insert/remove the footer element
 *    never meet a foreign wrapper server-side, and the standard
 *    destroy() → init() re-init cycle re-wraps whatever footer exists;
 *  - the wrapper's scale-down: the wrapper is a DOM SIBLING of the runway,
 *    so no ancestor timeline lookup exists and `timeline-scope` is not
 *    polyfill-viable — a WAAPI animation on a JS-built `ViewTimeline`
 *    crosses the sibling boundary instead (compositor-threaded in native
 *    browsers; the polyfill's JS constructors are its most reliable path);
 *  - the scale endpoint `(vw − 2·gap) / vw`, recomputed on resize only;
 *  - the taller-than-viewport class that neutralizes the CSS translateY
 *    settle-in (parity with the v1 guard).
 *
 * No per-frame JS anywhere: the timeline samples live geometry natively,
 * so content growth (infinite scroll) needs no refresh at all.
 */
export class ArtsFixedReveal {
  private readonly wrapperSelector: string
  private readonly footerSelector: string
  private wrapper: HTMLElement | null = null
  private runway: HTMLElement | null = null
  /** True when init() created the runway (vs adopting an existing one) —
   *  only self-created wrappers are unwrapped on destroy(). */
  private ownsRunway = false
  private animation: Animation | null = null
  private resizeObserver: Resize | null = null
  private waitHandle: number | null = null
  /** Set by freezeScale() — a caller owns the wrapper's scale from here
   *  until the next init(), so no rebuild may re-arm the animation. */
  private frozen = false

  constructor(options: IFixedRevealOptions = {}) {
    this.wrapperSelector = options.wrapperSelector ?? DEFAULTS.wrapperSelector
    this.footerSelector = options.footerSelector ?? DEFAULTS.footerSelector

    this.registerGapProperty()
  }

  init(): void {
    const wrapper = document.querySelector<HTMLElement>(this.wrapperSelector)
    const footer = document.querySelector<HTMLElement>(this.footerSelector)

    if (!wrapper || !footer) {
      return
    }

    /** Editor/template contexts render the footer inside the wrapper — skip */
    if (wrapper.contains(footer)) {
      return
    }

    this.frozen = false
    this.wrapper = wrapper
    this.runway = this.wrapRunway(footer)

    this.syncTallerClass()
    // The footer's final height can land after init() (lazy component-chunk
    // CSS, late media) without producing a resize entry this instance acts
    // on — re-sync once the page settles. Harmless post-destroy: the sync
    // no-ops when the runway ref is gone.
    if (document.readyState !== 'complete') {
      window.addEventListener('load', () => this.syncTallerClass(), { once: true })
    }
    this.whenViewTimelineAvailable(() => {
      this.buildAnimation()
    })
    this.setupResizeObserver()
  }

  destroy(): void {
    if (this.waitHandle !== null) {
      window.clearInterval(this.waitHandle)
      this.waitHandle = null
    }
    if (this.resizeObserver) {
      this.resizeObserver.destroy()
      this.resizeObserver = null
    }
    if (this.animation) {
      this.animation.cancel()
      this.animation = null
    }
    if (this.wrapper) {
      this.wrapper.style.removeProperty('transform-origin')
    }
    this.unwrapRunway()
    this.wrapper = null
    this.runway = null
  }

  /**
   * Stop driving the wrapper's scale and report the value it stopped at.
   *
   * For handing the element to another animation system mid-scrub (the AJAX
   * transition's leave choreography takes over the leaving page's transform).
   * The keyframes drive the STANDALONE `scale` property, which composes
   * MULTIPLICATIVELY with any `transform` the new owner writes — so the
   * animation must be gone, not merely paused, or the scale applies twice.
   *
   * Nothing is re-applied here: the caller owns the value from this point and
   * must re-establish it SYNCHRONOUSLY, or a frame paints unscaled.
   *
   * Sticky until the next `init()`, and that latch is the load-bearing half:
   * cancelling alone is not enough, because whatever the caller does next
   * usually resizes the runway (an AJAX transition takes the page out of
   * flow), and the resize observer would rebuild the animation right back
   * onto an element somebody else now owns — measured at ~10 frames after
   * the cancel, surfacing as a scale pop plus a compounded shrink.
   */
  freezeScale(): number {
    this.frozen = true

    const scale = this.wrapper ? readScale(this.wrapper) : 1

    if (this.animation) {
      // Separate try blocks on purpose: commitStyles() throws on a target
      // that isn't being rendered, and a shared catch would swallow that
      // and skip the cancel() — leaving the animation alive to fight the
      // caller, which is the whole failure this method exists to prevent.
      try {
        this.animation.commitStyles()
      } catch {
        // Nothing baked inline — the RETURNED value still carries the state.
      }
      try {
        this.animation.cancel()
      } catch {
        // Already cancelled.
      }
      this.animation = null
    }

    return scale
  }

  /** Wrap the footer in the runway div (or adopt an existing wrapper —
   *  idempotent across re-inits and server-rendered markup). The
   *  insertBefore + appendChild pair preserves exact document order, so
   *  the wrap is layout-neutral. */
  private wrapRunway(footer: HTMLElement): HTMLElement {
    const parent = footer.parentElement

    if (parent?.classList.contains(RUNWAY_CLASS)) {
      this.ownsRunway = false
      return parent
    }

    const runway = document.createElement('div')
    runway.className = RUNWAY_CLASS

    if (parent) {
      parent.insertBefore(runway, footer)
    }
    runway.appendChild(footer)
    this.ownsRunway = true

    return runway
  }

  /** Move the footer back out and drop a self-created runway — leaves the
   *  DOM exactly as found, so repeated destroy() → init() cycles (AJAX
   *  re-inits, editor toggles) never accumulate wrappers. */
  private unwrapRunway(): void {
    const runway = this.runway

    if (!runway) {
      return
    }

    runway.classList.remove(TALLER_CLASS)

    if (!this.ownsRunway) {
      return
    }

    const parent = runway.parentElement

    if (parent) {
      while (runway.firstChild) {
        parent.insertBefore(runway.firstChild, runway)
      }
      runway.remove()
    }

    this.ownsRunway = false
  }

  /** The polyfill loads via a guarded async append — in non-native
   *  browsers `ViewTimeline` may not exist yet when this script runs.
   *  Native browsers resolve synchronously. */
  private whenViewTimelineAvailable(callback: () => void): void {
    if (this.getViewTimelineCtor()) {
      callback()
      return
    }

    const startedAt = Date.now()
    this.waitHandle = window.setInterval(() => {
      if (this.getViewTimelineCtor()) {
        if (this.waitHandle !== null) {
          window.clearInterval(this.waitHandle)
          this.waitHandle = null
        }
        callback()
      } else if (Date.now() - startedAt > 5000) {
        /** No native support and no polyfill arrived — the CSS
         *  effects are equally inert here; leave the wrapper static. */
        if (this.waitHandle !== null) {
          window.clearInterval(this.waitHandle)
          this.waitHandle = null
        }
      }
    }, 100)
  }

  private getViewTimelineCtor(): IViewTimelineCtor | undefined {
    return (window as unknown as { ViewTimeline?: IViewTimelineCtor }).ViewTimeline
  }

  private buildAnimation(): void {
    if (!this.wrapper || !this.runway || this.frozen) {
      return
    }

    const ViewTimelineCtor = this.getViewTimelineCtor()
    if (!ViewTimelineCtor) {
      return
    }

    if (this.animation) {
      this.animation.cancel()
      this.animation = null
    }

    const scale = this.getScale()
    if (scale >= 1) {
      return
    }

    this.wrapper.style.transformOrigin = '50% 100%'

    const options = {
      timeline: new ViewTimelineCtor({ subject: this.runway }),
      rangeStart: 'entry 0%',
      rangeEnd: 'entry 100%',
      fill: 'both',
      easing: 'linear',
    }

    this.animation = this.wrapper.animate(
      [{ scale: '1' }, { scale: String(scale) }],
      options as unknown as KeyframeAnimationOptions,
    )
  }

  /** Rebuild on resize only — the scale endpoint depends on vw + gap;
   *  everything else (content growth, footer height) is sampled live by
   *  the timeline itself. */
  private setupResizeObserver(): void {
    if (!this.runway) {
      return
    }

    this.resizeObserver = new Resize({
      elements: [this.runway],
      callbackResizeDebounced: debounce(() => {
        this.syncTallerClass()
        this.buildAnimation()
      }, 150),
    })
  }

  /** Neutralizes the CSS translateY settle-in on footers taller than the
   *  viewport (see fixed-reveal.sass) — measured here because the island
   *  already owns a resize path. */
  private syncTallerClass(): void {
    if (!this.runway) {
      return
    }
    this.runway.classList.toggle(TALLER_CLASS, this.runway.offsetHeight > window.innerHeight)
  }

  /** Register the gap var typed so getComputedStyle resolves ANY unit
   *  (rem/vw/clamp) to a pixel number — the one surviving registration;
   *  the other vars are consumed by CSS keyframes directly. */
  private registerGapProperty(): void {
    try {
      CSS.registerProperty({
        name: CSS_VARS.gap,
        syntax: '<length>',
        inherits: true,
        initialValue: '0px',
      })
    } catch {
      // Already registered
    }
  }

  private getCSSVar(name: string, el: HTMLElement = document.body): number {
    const raw = getComputedStyle(el).getPropertyValue(name)
    return parseFloat(raw) || 0
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
}
