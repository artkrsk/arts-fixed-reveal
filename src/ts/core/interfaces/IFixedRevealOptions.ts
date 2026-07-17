export interface IFixedRevealOptions {
  /** CSS selector for the main content wrapper that receives the scale transform */
  wrapperSelector?: string
  /** CSS selector for the footer element that triggers the reveal —
   *  init() wraps it in the runway (view-timeline subject) at runtime */
  footerSelector?: string
}
