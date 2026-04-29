/**
 * Maps component option keys to Elementor control IDs.
 * Used by ElementorSettingsHandler to filter relevant change events
 * and trigger destroy → init on any matched control change.
 *
 * The _prefixed keys are CSS-variable controls — their converted values
 * are ignored since init() re-reads CSS vars directly. They're included
 * so that slider changes in the editor trigger a reinit.
 */
export const ELEMENTOR_MAPPED_OPTIONS = {
  enabled: 'fixed_reveal_enabled',
  opacityEnabled: 'fixed_reveal_opacity_enabled',
  translateYMode: 'fixed_reveal_translate_y_mode',
  _gap: 'fixed_reveal_gap',
  _opacityFrom: 'fixed_reveal_opacity_from',
  _translateYFrom: 'fixed_reveal_translate_y_from',
} as const
