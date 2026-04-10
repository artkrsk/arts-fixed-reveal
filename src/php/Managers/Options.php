<?php

namespace Arts\FixedReveal\Managers;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use Arts\ElementorExtension\Plugins\BaseManager;
use Arts\FixedReveal\Elementor\Tabs\FixedReveal;
use Arts\Utilities\Utilities;

class Options extends BaseManager {
	/**
	 * @param array<int|string, mixed> $tabs
	 * @return array<int|string, mixed>
	 */
	public function get_elementor_site_settings_tabs( array $tabs ): array {
		$tabs[] = array(
			'class' => FixedReveal::class,
		);

		return $tabs;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function get_options(): array {
		$enabled_raw         = Utilities::get_kit_setting_or_option( 'fixed_reveal_enabled', 'yes' );
		$opacity_enabled_raw = Utilities::get_kit_setting_or_option( 'fixed_reveal_opacity_enabled', 'yes' );
		$translate_y_mode    = Utilities::get_string_value(
			Utilities::get_kit_setting_or_option( 'fixed_reveal_translate_y_mode', 'fixed' ),
			'fixed'
		);

		return array(
			'enabled'        => ! empty( $enabled_raw ),
			'opacityEnabled' => ! empty( $opacity_enabled_raw ),
			'translateYMode' => $translate_y_mode,
		);
	}

	/**
	 * Retarget per-document background controls from body to #page-wrapper.
	 *
	 * Reads each background_* control's existing selectors and replaces
	 * {{WRAPPER}} with {{WRAPPER}} #page-wrapper in the selector keys.
	 *
	 * @param \Elementor\Controls_Stack $element
	 * @param string                    $section_id
	 * @param array<string, mixed>      $args
	 */
	public function retarget_background_controls( $element, $section_id, $args ): void {
		if ( 'section_page_style' !== $section_id ) {
			return;
		}

		$options = $this->get_options();
		if ( empty( $options['enabled'] ) ) {
			return;
		}

		$controls = $element->get_controls();

		foreach ( $controls as $control_id => $control_data ) {
			if ( strpos( $control_id, 'background_' ) !== 0 ) {
				continue;
			}

			if ( empty( $control_data['selectors'] ) ) {
				continue;
			}

			$new_selectors = array();
			foreach ( $control_data['selectors'] as $selector => $css ) {
				// Already retargeted (e.g. by Velum AJAX Transitions) — keep as-is
				if ( strpos( $selector, '#page-wrapper' ) !== false ) {
					$new_selectors[ $selector ] = $css;
					continue;
				}
				$new_selector                   = str_replace( '{{WRAPPER}}', '{{WRAPPER}} #page-wrapper', $selector );
				$new_selectors[ $new_selector ] = $css;
			}

			$element->update_control(
				$control_id,
				array(
					'selectors' => $new_selectors,
				)
			);
		}
	}
}
