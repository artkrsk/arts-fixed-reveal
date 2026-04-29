<?php

namespace Arts\FixedReveal\Managers;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use Arts\ElementorExtension\Plugins\BaseManager;
use Arts\Utilities\Utilities;

class Frontend extends BaseManager {
	/** @var string */
	private $handle = 'arts-fixed-reveal';

	public function register(): void {
		if ( ! $this->managers || ! isset( $this->managers->options ) ) {
			return;
		}

		$options = Utilities::get_array_value( $this->managers->options->get_options(), array() );

		wp_register_script(
			$this->handle,
			esc_url( untrailingslashit( $this->plugin_dir_url ) . '/libraries/arts-fixed-reveal/index.iife.js' ),
			array( 'gsap', 'scrolltrigger' ),
			false,
			array(
				'in_footer' => true,
				'strategy'  => 'defer',
			)
		);

		wp_localize_script( $this->handle, 'artsFixedRevealOptions', $options );
	}

	public function enqueue(): void {
		if ( ! $this->managers || ! isset( $this->managers->options ) ) {
			return;
		}

		$options      = Utilities::get_array_value( $this->managers->options->get_options(), array() );
		$enabled      = Utilities::get_bool_value( $options['enabled'] ?? null, false );
		$is_in_editor = Utilities::is_elementor_editor_active();

		if ( ! $enabled && ! $is_in_editor ) {
			return;
		}

		if ( ! $is_in_editor && ! did_action( 'elementor/theme/after_do_footer' ) ) {
			return;
		}

		wp_enqueue_script( $this->handle );
	}
}
