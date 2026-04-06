<?php

namespace Arts\FixedReveal;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use Arts\Base\Containers\ManagersContainer as BaseManagersContainer;

/**
 * @property Managers\Extension $extension
 * @property Managers\Options $options
 * @property Managers\Frontend $frontend
 */
class ManagersContainer extends BaseManagersContainer {
}
