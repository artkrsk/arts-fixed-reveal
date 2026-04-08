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
				'strategy'  => 'defer',
				'in_footer' => true,
			)
		);

		wp_localize_script( $this->handle, 'artsFixedRevealOptions', $options );
	}

	public function enqueue(): void {
		if ( ! $this->managers || ! isset( $this->managers->options ) ) {
			return;
		}

		$options = Utilities::get_array_value( $this->managers->options->get_options(), array() );
		$enabled = Utilities::get_bool_value( $options['enabled'] ?? null, false );

		if ( ! $enabled && ! Utilities::is_elementor_editor_active() ) {
			return;
		}

		wp_enqueue_script( $this->handle );
	}
}
