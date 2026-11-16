export interface IFixedRevealOptions {
  /** CSS selector for the main content wrapper that receives the scale transform */
  wrapperSelector?: string
  /** CSS selector for the footer element that triggers the reveal —
   *  init() wraps it in the runway (view-timeline subject) at runtime */
  footerSelector?: string
  /** Honour the visitor's reduced-motion setting: while their system asks for it, `init()` builds
   *  nothing (no runway, no wrapper scale, no footer fade or offset), so the page reads as with the
   *  reveal switched off. Read at each `init()`, never subscribed: a changed setting applies from
   *  the next re-init (an AJAX visit) or page load. `false` forces the full effect. Default `true`.
   *  CSS that pins the footer is the host's to gate; the WordPress package prints that gate for
   *  the Kit's Fixed mode. */
  reducedMotion?: boolean
}
