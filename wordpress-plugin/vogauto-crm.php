<?php
/**
 * Plugin Name:       VogAuto CRM — punte pentru anunțuri
 * Description:       Permite CRM-ului să completeze prețul, anul și parcursul anunțurilor prin API. NU modifică designul, NU atinge anunțurile existente și NU adaugă nimic în paginile publice.
 * Version:           1.2.0
 * Author:            VogAuto
 * Requires at least: 5.6
 * License:           GPL-2.0-or-later
 */

// Blochează accesul direct la fișier.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const VOGAUTO_CRM_NS   = 'vogauto-crm/v1';
const VOGAUTO_CRM_TYPE = 'listing';

/**
 * Doar un utilizator care poate edita anunțuri trece mai departe. Autentificarea
 * se face cu „Application Password", deci nimic nu e expus public.
 */
function vogauto_crm_can_edit( $request ) {
	$id = (int) $request['id'];
	if ( get_post_type( $id ) !== VOGAUTO_CRM_TYPE ) {
		return new WP_Error( 'vogauto_not_listing', 'Id-ul nu este un anunț.', array( 'status' => 404 ) );
	}
	if ( ! current_user_can( 'edit_post', $id ) ) {
		return new WP_Error( 'vogauto_forbidden', 'Nu ai dreptul să editezi acest anunț.', array( 'status' => 403 ) );
	}
	return true;
}

add_action( 'rest_api_init', function () {
	register_rest_route( VOGAUTO_CRM_NS, '/listing/(?P<id>\d+)/fields', array(
		// Citire: arată ce câmpuri are anunțul (ca să știm numele exacte).
		array(
			'methods'             => 'GET',
			'permission_callback' => 'vogauto_crm_can_edit',
			'callback'            => function ( $request ) {
				$meta = get_post_meta( (int) $request['id'] );
				$out  = array();
				foreach ( $meta as $key => $values ) {
					$value = isset( $values[0] ) ? $values[0] : '';
					// Valorile foarte lungi (galerii serializate) se scurtează:
					// aici ne interesează numele cheilor, nu conținutul lor.
					$out[ $key ] = is_string( $value ) && strlen( $value ) > 200
						? substr( $value, 0, 200 ) . '…'
						: $value;
				}
				return rest_ensure_response( array( 'id' => (int) $request['id'], 'fields' => $out ) );
			},
		),
		// Scriere: completează câmpurile trimise de CRM.
		array(
			'methods'             => 'POST',
			'permission_callback' => 'vogauto_crm_can_edit',
			'args'                => array(
				'fields' => array(
					'required' => true,
					'type'     => 'object',
				),
			),
			'callback'            => function ( $request ) {
				$id     = (int) $request['id'];
				$fields = $request->get_param( 'fields' );
				if ( ! is_array( $fields ) ) {
					return new WP_Error( 'vogauto_bad_fields', '„fields" trebuie să fie un obiect.', array( 'status' => 400 ) );
				}

				$written = array();
				foreach ( $fields as $key => $value ) {
					// Numai chei simple, inclusiv cele cu „_" la început (câmpurile
					// temei sunt protejate, deci încep toate cu underscore).
					if ( ! is_string( $key ) || ! preg_match( '/^_?[A-Za-z0-9_\-]{1,100}$/', $key ) ) {
						continue;
					}

					// Tema ține unele câmpuri ca listă (culoarea, tipul ofertei,
					// galeria), deci acceptăm și liste — curățate element cu element.
					if ( is_array( $value ) ) {
						$clean = array();
						foreach ( $value as $k => $v ) {
							if ( is_array( $v ) || is_object( $v ) ) {
								continue;
							}
							$k = is_numeric( $k ) ? (int) $k : sanitize_key( (string) $k );
							// Id-urile de termeni se păstrează ca numere, exact cum le
							// scrie tema în anunțurile create din panoul WordPress.
							if ( is_numeric( $v ) && (string) (int) $v === (string) $v ) {
								$clean[ $k ] = (int) $v;
								continue;
							}
							$v = (string) $v;
							$clean[ $k ] = preg_match( '#^https?://#i', $v )
								? esc_url_raw( $v )
								: sanitize_text_field( $v );
						}
						update_post_meta( $id, $key, $clean );
						$written[] = $key;
						continue;
					}

					if ( is_object( $value ) ) {
						continue;
					}
					update_post_meta( $id, $key, sanitize_text_field( (string) $value ) );
					$written[] = $key;
				}

				return rest_ensure_response( array( 'id' => $id, 'written' => $written ) );
			},
		),
	) );
} );
