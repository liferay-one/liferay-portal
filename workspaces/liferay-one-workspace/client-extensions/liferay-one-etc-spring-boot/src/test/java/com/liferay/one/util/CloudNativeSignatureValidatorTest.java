/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.security.auth.PrincipalException;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

import java.nio.charset.StandardCharsets;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PublicKey;

import java.time.Duration;
import java.time.Instant;

import java.util.Base64;
import java.util.Date;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName(
	"[CLS-CLOUDNATIVESIGNATUREVALIDATOR] CloudNativeSignatureValidator"
)
public class CloudNativeSignatureValidatorTest {

	@BeforeAll
	public static void setUpClass() throws Exception {
		KeyPairGenerator keyPairGenerator = KeyPairGenerator.getInstance("RSA");

		keyPairGenerator.initialize(2048);

		_keyPair = keyPairGenerator.generateKeyPair();
		_otherKeyPair = keyPairGenerator.generateKeyPair();
	}

	@Test
	public void testValidateSignatureAcceptsPEMPublicKey() throws Exception {
		_cloudNativeSignatureValidator.validateSignature(
			_toPEM(_keyPair.getPublic()), _createSignedJWT(_getFutureDate()));
	}

	@Test
	public void testValidateSignatureAcceptsPublicKeyClaim() throws Exception {
		_cloudNativeSignatureValidator.validateSignature(
			_createSignedJWT(_getFutureDate()));
	}

	@Test
	public void testValidateSignatureRejectsBlankPublicKey() throws Exception {
		SignedJWT signedJWT = _createSignedJWT(_getFutureDate());

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _cloudNativeSignatureValidator.validateSignature(
				"", signedJWT));
	}

	@Test
	public void testValidateSignatureRejectsMalformedPublicKey()
		throws Exception {

		SignedJWT signedJWT = _createSignedJWT(_getFutureDate());

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _cloudNativeSignatureValidator.validateSignature(
				"not-a-public-key", signedJWT));
	}

	@Test
	public void testValidateSignatureRejectsMissingExpiration()
		throws Exception {

		SignedJWT signedJWT = _createSignedJWT(null);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _cloudNativeSignatureValidator.validateSignature(
				_toPEM(_keyPair.getPublic()), signedJWT));
	}

	@Test
	public void testValidateSignatureRejectsPastExpiration() throws Exception {
		SignedJWT signedJWT = _createSignedJWT(
			Date.from(
				Instant.now(
				).minus(
					Duration.ofMinutes(5)
				)));

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _cloudNativeSignatureValidator.validateSignature(
				_toPEM(_keyPair.getPublic()), signedJWT));
	}

	@Test
	public void testValidateSignatureRejectsTamperedSignature()
		throws Exception {

		SignedJWT signedJWT = _createSignedJWT(_getFutureDate());

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _cloudNativeSignatureValidator.validateSignature(
				_toPEM(_otherKeyPair.getPublic()), signedJWT));
	}

	private SignedJWT _createSignedJWT(Date expirationDate) throws Exception {
		JWTClaimsSet.Builder builder = new JWTClaimsSet.Builder(
		).claim(
			"publicKey", _toPEM(_keyPair.getPublic())
		);

		if (expirationDate != null) {
			builder.expirationTime(expirationDate);
		}

		SignedJWT signedJWT = new SignedJWT(
			new JWSHeader(JWSAlgorithm.RS256), builder.build());

		signedJWT.sign(new RSASSASigner(_keyPair.getPrivate()));

		return SignedJWT.parse(signedJWT.serialize());
	}

	private Date _getFutureDate() {
		return Date.from(
			Instant.now(
			).plus(
				Duration.ofHours(1)
			));
	}

	private String _toPEM(PublicKey publicKey) {
		Base64.Encoder encoder = Base64.getMimeEncoder(
			64, "\n".getBytes(StandardCharsets.UTF_8));

		return StringBundler.concat(
			"-----BEGIN PUBLIC KEY-----\n",
			encoder.encodeToString(publicKey.getEncoded()),
			"\n-----END PUBLIC KEY-----\n");
	}

	private static KeyPair _keyPair;
	private static KeyPair _otherKeyPair;

	private final CloudNativeSignatureValidator _cloudNativeSignatureValidator =
		new CloudNativeSignatureValidator();

}