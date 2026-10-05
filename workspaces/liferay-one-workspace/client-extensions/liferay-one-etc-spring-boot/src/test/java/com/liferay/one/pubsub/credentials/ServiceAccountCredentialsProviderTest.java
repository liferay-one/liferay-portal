/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.pubsub.credentials;

import com.google.api.gax.core.CredentialsProvider;
import com.google.auth.Credentials;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.ServiceAccountCredentials;

import com.liferay.petra.string.StringBundler;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;

import java.util.Base64;
import java.util.List;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.MockedStatic;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
@DisplayName(
	"[CLS-SERVICEACCOUNTCREDENTIALSPROVIDER] ServiceAccountCredentialsProvider"
)
public class ServiceAccountCredentialsProviderTest {

	@Test
	public void testGetCredentialsProviderUsesApplicationDefaultCredentials()
		throws Exception {

		_assertApplicationDefaultCredentials(
			_createServiceAccountCredentialsProvider("", "", "", ""));
	}

	@Test
	public void testGetCredentialsProviderUsesApplicationDefaultCredentialsWhenAnyPropertyIsMissing()
		throws Exception {

		String privateKeyPkcs8 = _createPrivateKeyPkcs8();

		_assertApplicationDefaultCredentials(
			_createServiceAccountCredentialsProvider(
				"", "client-id", "key-id", privateKeyPkcs8));
		_assertApplicationDefaultCredentials(
			_createServiceAccountCredentialsProvider(
				"test@liferay.com", "", "key-id", privateKeyPkcs8));
		_assertApplicationDefaultCredentials(
			_createServiceAccountCredentialsProvider(
				"test@liferay.com", "client-id", "", privateKeyPkcs8));

		_assertApplicationDefaultCredentials(
			_createServiceAccountCredentialsProvider(
				"test@liferay.com", "client-id", "key-id", ""));
	}

	@Test
	public void testGetCredentialsProviderUsesServiceAccountCredentials()
		throws Exception {

		ServiceAccountCredentialsProvider serviceAccountCredentialsProvider =
			_createServiceAccountCredentialsProvider(
				"test@liferay.com", "client-id", "key-id",
				_createPrivateKeyPkcs8());

		CredentialsProvider credentialsProvider =
			serviceAccountCredentialsProvider.getCredentialsProvider();

		Credentials credentials = credentialsProvider.getCredentials();

		Assertions.assertInstanceOf(
			ServiceAccountCredentials.class, credentials);

		ServiceAccountCredentials serviceAccountCredentials =
			(ServiceAccountCredentials)credentials;

		Assertions.assertEquals(
			"client-id", serviceAccountCredentials.getClientId());
		Assertions.assertEquals(
			"test@liferay.com", serviceAccountCredentials.getClientEmail());
		Assertions.assertEquals(
			"key-id", serviceAccountCredentials.getPrivateKeyId());
		Assertions.assertEquals(
			List.of(ServiceAccountCredentialsProvider.SCOPE),
			List.copyOf(serviceAccountCredentials.getScopes()));
	}

	private void _assertApplicationDefaultCredentials(
			ServiceAccountCredentialsProvider serviceAccountCredentialsProvider)
		throws Exception {

		GoogleCredentials googleCredentials = Mockito.mock(
			GoogleCredentials.class);
		GoogleCredentials scopedGoogleCredentials = Mockito.mock(
			GoogleCredentials.class);

		Mockito.when(
			googleCredentials.createScoped(
				List.of(ServiceAccountCredentialsProvider.SCOPE))
		).thenReturn(
			scopedGoogleCredentials
		);

		try (MockedStatic<GoogleCredentials> googleCredentialsMockedStatic =
				Mockito.mockStatic(GoogleCredentials.class)) {

			googleCredentialsMockedStatic.when(
				GoogleCredentials::getApplicationDefault
			).thenReturn(
				googleCredentials
			);

			CredentialsProvider credentialsProvider =
				serviceAccountCredentialsProvider.getCredentialsProvider();

			Assertions.assertSame(
				scopedGoogleCredentials, credentialsProvider.getCredentials());
		}
	}

	private String _createPrivateKeyPkcs8() throws Exception {
		KeyPairGenerator keyPairGenerator = KeyPairGenerator.getInstance("RSA");

		keyPairGenerator.initialize(2048);

		KeyPair keyPair = keyPairGenerator.generateKeyPair();

		Base64.Encoder encoder = Base64.getMimeEncoder();

		PrivateKey privateKey = keyPair.getPrivate();

		return StringBundler.concat(
			"-----BEGIN PRIVATE KEY-----\n",
			encoder.encodeToString(privateKey.getEncoded()),
			"\n-----END PRIVATE KEY-----\n");
	}

	private ServiceAccountCredentialsProvider
		_createServiceAccountCredentialsProvider(
			String clientEmailAddress, String clientId, String privateKeyId,
			String privateKeyPkcs8) {

		ServiceAccountCredentialsProvider serviceAccountCredentialsProvider =
			new ServiceAccountCredentialsProvider();

		ReflectionTestUtils.setField(
			serviceAccountCredentialsProvider, "_clientEmailAddress",
			clientEmailAddress);
		ReflectionTestUtils.setField(
			serviceAccountCredentialsProvider, "_clientId", clientId);
		ReflectionTestUtils.setField(
			serviceAccountCredentialsProvider, "_privateKeyId", privateKeyId);
		ReflectionTestUtils.setField(
			serviceAccountCredentialsProvider, "_privateKeyPkcs8",
			privateKeyPkcs8);

		return serviceAccountCredentialsProvider;
	}

}