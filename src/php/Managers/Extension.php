<?php

namespace Arts\FixedReveal\Managers;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use Arts\ElementorExtension\Plugins\BaseManager;

class Extension extends BaseManager {
	/**
	 * @param array<string, mixed> $config
	 * @return array<string, mixed>
	 */
	public function filter_plugin_config( array $config ): array {
		$config['required_elementor_version'] = '3.27.0';
		$config['required_php_version']       = '7.4';

		return $config;
	}

	/**
	 * @param array<string, mixed> $config
	 * @return array<string, mixed>
	 */
	public function get_strings( array $config ): array {
		$config['extension_name'] = 'Fixed Reveal for Elementor';

		return $config;
	}
}
