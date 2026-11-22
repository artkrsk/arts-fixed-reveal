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

	/**
	 * Under reduced motion the footer stays in flow, as with the reveal switched off: this undoes the Kit's
	 * Fixed mode (`position: sticky; bottom: 0; z-index: 0`), which is CSS from the first paint and so cannot
	 * wait for the script. `:root:root` outranks the Kit's `.elementor-kit-N [data-elementor-type="footer"]`
	 * wherever an optimizer prints either sheet. `z-index` as well: in a theme whose body is a flex column the
	 * footer is a flex item, which keeps a stacking context at a static position.
	 */
	private const REDUCED_MOTION_STYLE = '@media (prefers-reduced-motion: reduce){:root:root [data-elementor-type="footer"]{position:static;z-index:auto}}';

	public function register(): void {
		if ( ! $this->managers || ! isset( $this->managers->options ) ) {
			return;
		}

		$options = Utilities::get_array_value( $this->managers->options->get_options(), array() );

		wp_register_script(
			$this->handle,
			esc_url( untrailingslashit( $this->plugin_dir_url ) . '/libraries/arts-fixed-reveal/index.iife.js' ),
			array(),
			$this->asset_version( 'index.iife.js' ),
			array(
				'in_footer' => true,
				'strategy'  => 'defer',
			)
		);

		wp_localize_script( $this->handle, 'artsFixedRevealOptions', $options );

		wp_register_style(
			$this->handle,
			esc_url( untrailingslashit( $this->plugin_dir_url ) . '/libraries/arts-fixed-reveal/index.css' ),
			array(),
			$this->asset_version( 'index.css' )
		);

		// Printed only while the site honours reduced motion, because the compiled sheet cannot read that
		// filter; the media query keeps a cached page right for every visitor.
		if ( Utilities::get_bool_value( $options['reducedMotion'] ?? null, true ) ) {
			wp_add_inline_style( $this->handle, self::REDUCED_MOTION_STYLE );
		}

		// The style goes in the head, ahead of the footer check the script waits for: printed from
		// wp_footer it lands after the first style pass, and its `@property` registration would then
		// restyle the whole document. Its rules are inert on a page without the runway.
		$enabled = Utilities::get_bool_value( $options['enabled'] ?? null, false );

		if ( $enabled || Utilities::is_elementor_editor_active() ) {
			wp_enqueue_style( $this->handle );
		}
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

	/**
	 * The package's version as the bundle's version: a released archive carries it in its `composer.json`.
	 * A checkout linked for development has none there, so the file's modification time stands in and a
	 * rebuilt bundle still gets a new URL. A `false` version falls back to the WordPress core version,
	 * and a CDN would go on serving the old bundle for its max-age.
	 *
	 * @return string|false
	 */
	private function asset_version( string $file ) {
		$manifest = wp_json_file_decode( dirname( __DIR__, 3 ) . '/composer.json', array( 'associative' => true ) );

		if ( is_array( $manifest ) && isset( $manifest['version'] ) && is_string( $manifest['version'] ) ) {
			return $manifest['version'];
		}

		$path  = dirname( __DIR__ ) . '/libraries/arts-fixed-reveal/' . $file;
		$mtime = file_exists( $path ) ? filemtime( $path ) : false;

		return false === $mtime ? false : (string) $mtime;
	}
}
