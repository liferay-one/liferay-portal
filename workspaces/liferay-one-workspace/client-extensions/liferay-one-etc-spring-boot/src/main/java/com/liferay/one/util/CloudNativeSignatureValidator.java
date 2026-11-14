/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import com.liferay.one.exception.ExpiredActivationTokenException;
import com.liferay.portal.kernel.security.auth.PrincipalException;
import com.liferay.portal.kernel.util.Validator;

import com.nimbusds.jose.crypto.RSASSAVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.X509EncodedKeySpec;

import java.text.ParseException;

import java.util.Base64;
import java.util.Date;
import java.util.Objects;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.springframework.stereotype.Component;

/**
 * @author Kyle Bischof
 * @author Amos Fong
 */
@Component
public class CloudNativeSignatureValidator {

	public static boolean equalsPublicKey(
		String publicKey1, String publicKey2) {

		return Objects.equals(
			toBase64PublicKey(publicKey1), toBase64PublicKey(publicKey2));
	}

	public static String toBase64PublicKey(String publicKey) {
		if (publicKey == null) {
			return null;
		}

		publicKey = publicKey.replaceAll(
			"-----(BEGIN|END) PUBLIC KEY-----", "");

		return publicKey.replaceAll("\\s", "");
	}

	public void validateSignature(SignedJWT signedJWT)
		throws ParseException, PrincipalException {

		JWTClaimsSet jwtClaimsSet = signedJWT.getJWTClaimsSet();

		validateSignature(jwtClaimsSet.getStringClaim("publicKey"), signedJWT);
	}

	public void validateSignature(String publicKey, SignedJWT signedJWT)
		throws ParseException, PrincipalException {

		if (!_hasValidSignature(publicKey, signedJWT)) {
			throw new PrincipalException();
		}

		JWTClaimsSet jwtClaimsSet = signedJWT.getJWTClaimsSet();

		Date expirationTime = jwtClaimsSet.getExpirationTime();

		if ((expirationTime == null) || expirationTime.before(new Date())) {
			throw new ExpiredActivationTokenException();
		}
	}

	private boolean _hasValidSignature(String publicKey, SignedJWT signedJWT) {
		if (Validator.isNull(publicKey)) {
			return false;
		}

		try {
			RSAPublicKey rsaPublicKey = _toRSAPublicKey(publicKey);

			if (rsaPublicKey == null) {
				return false;
			}

			return signedJWT.verify(new RSASSAVerifier(rsaPublicKey));
		}
		catch (Exception exception) {
			_log.error("Unable to verify the signature", exception);

			return false;
		}
	}

	private RSAPublicKey _toRSAPublicKey(String encodedPublicKey)
		throws GeneralSecurityException {

		Base64.Decoder decoder = Base64.getDecoder();

		KeyFactory keyFactory = KeyFactory.getInstance("RSA");

		return (RSAPublicKey)keyFactory.generatePublic(
			new X509EncodedKeySpec(
				decoder.decode(toBase64PublicKey(encodedPublicKey))));
	}

	private static final Log _log = LogFactory.getLog(
		CloudNativeSignatureValidator.class);

}