<?php

namespace Arts\FixedReveal\Elementor\Tabs;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use Arts\ElementorExtension\Tabs\BaseTab;
use Elementor\Controls_Manager;

class FixedReveal extends BaseTab {
	const TAB_ID = 'arts-fixed-reveal-tab-fixed-reveal';

	const EDITOR_CHANGE_CALLBACK_CONTROLS = array(
		'fixed_reveal_enabled',
		'fixed_reveal_gap',
		'fixed_reveal_opacity_enabled',
		'fixed_reveal_opacity_from',
		'fixed_reveal_translate_y_mode',
		'fixed_reveal_translate_y_from',
	);

	const CONDITION_FIXED_REVEAL_ENABLED = array(
		'fixed_reveal_enabled' => 'yes',
	);

	public function get_title() {
		return esc_html__( 'Fixed Reveal', 'fixed-reveal-for-elementor' );
	}

	public function get_group() {
		return 'settings';
	}

	public function get_icon() {
		return 'eicon-scroll';
	}

	protected function register_tab_controls() {
		$this->start_controls_section(
			'section_fixed_reveal',
			array(
				'label' => $this->get_title(),
				'tab'   => $this->get_id(),
			)
		);

		$this->add_control(
			'fixed_reveal_enabled',
			array(
				'label'     => esc_html__( 'Enable Fixed Reveal', 'fixed-reveal-for-elementor' ),
				'type'      => Controls_Manager::SWITCHER,
				'default'   => 'yes',
				'save_db'   => 'option',
				'selectors' => array(
					'{{WRAPPER}} #page-wrapper' => 'position: relative; z-index: 1;',
				),
			)
		);

		$this->add_responsive_control(
			'fixed_reveal_gap',
			array(
				'label'       => esc_html__( 'Side Gap', 'fixed-reveal-for-elementor' ),
				'description' => esc_html__( 'Gap on each side at full reveal.', 'fixed-reveal-for-elementor' ),
				'type'        => Controls_Manager::SLIDER,
				'size_units'  => array( 'px', 'rem', 'vw', 'custom' ),
				'range'       => array(
					'px' => array(
						'min'  => 0,
						'max'  => 200,
						'step' => 1,
					),
				),
				'default'     => array(
					'unit' => 'px',
					'size' => 20,
				),
				'selectors'   => array(
					'{{WRAPPER}}' => '--arts-fixed-reveal-gap: {{SIZE}}{{UNIT}};',
				),
				'condition'   => self::CONDITION_FIXED_REVEAL_ENABLED,
			)
		);

		$this->add_control(
			'fixed_reveal_separator_opacity',
			array(
				'type'      => Controls_Manager::DIVIDER,
				'condition' => self::CONDITION_FIXED_REVEAL_ENABLED,
			)
		);

		$this->add_control(
			'fixed_reveal_opacity_enabled',
			array(
				'label'     => esc_html__( 'Opacity Effect', 'fixed-reveal-for-elementor' ),
				'type'      => Controls_Manager::SWITCHER,
				'default'   => 'yes',
				'condition' => self::CONDITION_FIXED_REVEAL_ENABLED,
				'save_db'   => 'option',
			)
		);

		$this->add_control(
			'fixed_reveal_opacity_from',
			array(
				'label'     => esc_html__( 'Starting Opacity', 'fixed-reveal-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => array(
					'px' => array(
						'min'  => 0,
						'max'  => 1,
						'step' => 0.01,
					),
				),
				'default'   => array(
					'unit' => 'px',
					'size' => 0,
				),
				'selectors' => array(
					'{{WRAPPER}}' => '--arts-fixed-reveal-opacity-from: {{SIZE}};',
				),
				'condition' => array_merge(
					self::CONDITION_FIXED_REVEAL_ENABLED,
					array( 'fixed_reveal_opacity_enabled' => 'yes' )
				),
			)
		);

		$this->add_control(
			'fixed_reveal_separator_translate_y',
			array(
				'type'      => Controls_Manager::DIVIDER,
				'condition' => self::CONDITION_FIXED_REVEAL_ENABLED,
			)
		);

		$this->add_control(
			'fixed_reveal_translate_y_mode',
			array(
				'label'     => esc_html__( 'Translate Y Effect', 'fixed-reveal-for-elementor' ),
				'type'      => Controls_Manager::SELECT,
				'default'   => 'fixed',
				'options'   => array(
					'none'   => esc_html__( 'None', 'fixed-reveal-for-elementor' ),
					'fixed'  => esc_html__( 'Fixed (Pinned)', 'fixed-reveal-for-elementor' ),
					'custom' => esc_html__( 'Custom Offset', 'fixed-reveal-for-elementor' ),
				),
				'condition' => self::CONDITION_FIXED_REVEAL_ENABLED,
				'save_db'   => 'option',
			)
		);

		/** Emit sticky CSS only when "fixed" mode is selected */
		$this->add_control(
			'fixed_reveal_translate_y_fixed_styles',
			array(
				'type'      => Controls_Manager::HIDDEN,
				'default'   => 'fixed',
				'selectors' => array(
					'{{WRAPPER}} [data-elementor-type="footer"]' => 'position: sticky; bottom: 0; z-index: 0;',
				),
				'condition' => array_merge(
					self::CONDITION_FIXED_REVEAL_ENABLED,
					array( 'fixed_reveal_translate_y_mode' => 'fixed' )
				),
			)
		);

		$this->add_responsive_control(
			'fixed_reveal_translate_y_from',
			array(
				'label'      => esc_html__( 'Starting Offset', 'fixed-reveal-for-elementor' ),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => array( 'px', 'vh', 'custom' ),
				'range'      => array(
					'px' => array(
						'min'  => -500,
						'max'  => 500,
						'step' => 1,
					),
					'vh' => array(
						'min'  => -100,
						'max'  => 100,
						'step' => 1,
					),
				),
				'default'    => array(
					'unit' => 'vh',
					'size' => -20,
				),
				'selectors'  => array(
					'{{WRAPPER}}' => '--arts-fixed-reveal-translate-y-from: {{SIZE}}{{UNIT}};',
				),
				'condition'  => array_merge(
					self::CONDITION_FIXED_REVEAL_ENABLED,
					array( 'fixed_reveal_translate_y_mode' => 'custom' )
				),
			)
		);

		$this->end_controls_section();
	}
}
