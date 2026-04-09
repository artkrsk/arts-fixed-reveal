<?php

namespace Arts\FixedReveal;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use Arts\ElementorExtension\Plugins\BasePlugin;
use Arts\GSAPLoader\Plugin as GSAPLoaderPlugin;

/**
 * @extends BasePlugin<ManagersContainer>
 */
class Plugin extends BasePlugin {
	protected function get_default_config(): array {
		return array();
	}

	protected function get_default_strings(): array {
		return array();
	}

	protected function get_default_run_action(): string {
		return 'init';
	}

	protected function add_options(): void {
		$this->options = $this->managers->options->get_options();
	}

	protected function get_managers_classes(): array {
		return array(
			'extension' => Managers\Extension::class,
			'options'   => Managers\Options::class,
			'frontend'  => Managers\Frontend::class,
		);
	}

	protected function do_after_init_managers(): void {
		GSAPLoaderPlugin::instance();
		add_filter( 'arts/elementor_extension/tabs/tabs', array( $this->managers->options, 'get_elementor_site_settings_tabs' ) );
		add_filter( 'arts/elementor_extension/plugin/config', array( $this->managers->extension, 'filter_plugin_config' ) );
		add_filter( 'arts/elementor_extension/plugin/strings', array( $this->managers->extension, 'get_strings' ) );
	}

	protected function add_actions(): void {
		add_action( 'wp_enqueue_scripts', array( $this->managers->frontend, 'register' ) );
		add_action( 'wp_enqueue_scripts', array( $this->managers->frontend, 'enqueue' ) );
		add_action( 'elementor/element/before_section_end', array( $this->managers->options, 'retarget_background_controls' ), 10, 3 );
	}
}
