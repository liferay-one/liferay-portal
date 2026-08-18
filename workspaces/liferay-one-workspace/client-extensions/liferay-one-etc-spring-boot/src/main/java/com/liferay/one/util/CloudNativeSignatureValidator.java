/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import com.liferay.portal.kernel.security.auth.PrincipalException;
import com.liferay.portal.kernel.util.Validator;

import com.nimbusds.jose.crypto.RSASSAVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

import java.security.KeyFactory;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.X509EncodedKeySpec;

import java.util.Base64;
import java.util.Date;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.springframework.stereotype.Component;

/**
 * @author Kyle Bischof
 * @author Amos Fong
 */
@Component
public class CloudNativeSignatureValidator {

	public void validateSignature(String publicKey, SignedJWT signedJWT)
		throws Exception {

		if (!_hasValidSignature(publicKey, signedJWT)) {
			throw new PrincipalException();
		}

		JWTClaimsSet jwtClaimsSet = signedJWT.getJWTClaimsSet();

		Date expirationTime = jwtClaimsSet.getExpirationTime();

		if ((expirationTime == null) || expirationTime.before(new Date())) {
			throw new PrincipalException();
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
		throws Exception {

		String base64 = encodedPublicKey.replaceAll(
			"-----(BEGIN|END) PUBLIC KEY-----", "");

		base64 = base64.replaceAll("\\s", "");

		Base64.Decoder decoder = Base64.getDecoder();

		KeyFactory keyFactory = KeyFactory.getInstance("RSA");

		return (RSAPublicKey)keyFactory.generatePublic(
			new X509EncodedKeySpec(decoder.decode(base64)));
	}

	private static final Log _log = LogFactory.getLog(
		CloudNativeSignatureValidator.class);

}