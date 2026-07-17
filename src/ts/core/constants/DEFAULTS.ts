export const DEFAULTS = {
  wrapperSelector: '#page-wrapper',
  /** The footer the effect reveals. The runway (view-timeline subject) is
   *  NOT a selector: init() wraps the footer in it at runtime — the
   *  package stays theme-agnostic and AJAX partial swaps never meet a
   *  foreign wrapper server-side. */
  footerSelector: '[data-elementor-type="footer"]',
} as const
