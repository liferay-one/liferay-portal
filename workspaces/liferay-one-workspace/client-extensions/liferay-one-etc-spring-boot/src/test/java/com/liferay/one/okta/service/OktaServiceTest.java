/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.okta.service;

import com.liferay.one.exception.OktaUnavailableException;
import com.liferay.one.okta.model.OktaUser;
import com.liferay.one.okta.pubsub.OktaPubsubPublisher;
import com.liferay.petra.string.StringPool;

import java.util.List;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;

import reactor.core.publisher.Mono;

/**
 * @author Ryan Schuhler
 */
public class OktaServiceTest {

	@Test
	public void testCreateContactPublishesWhenContactIsAbsent()
		throws Exception {

		OktaService oktaService = _createOktaService(
			_BODY_NOT_FOUND, HttpStatus.NOT_FOUND);

		Assertions.assertNull(
			oktaService.createContact(_EMAIL_ADDRESS, "Jane", null, "Doe"));

		Mockito.verify(
			_oktaPubsubPublisher
		).publish(
			Mockito.any()
		);
	}

	@Test
	public void testCreateContactSkipsWhenContactExists() throws Exception {
		OktaService oktaService = _createOktaService(
			_BODY_CONTACT, HttpStatus.OK);

		Assertions.assertNotNull(
			oktaService.createContact(_EMAIL_ADDRESS, "Jane", null, "Doe"));

		Mockito.verifyNoInteractions(_oktaPubsubPublisher);
	}

	@Test
	public void testCreateContactThrowsWhenOktaReturnsErrorStatus() {
		OktaService oktaService = _createOktaService(
			_BODY_ERROR, HttpStatus.UNAUTHORIZED);

		Assertions.assertThrows(
			OktaUnavailableException.class,
			() -> oktaService.createContact(
				_EMAIL_ADDRESS, "Jane", null, "Doe"));

		Mockito.verifyNoInteractions(_oktaPubsubPublisher);
	}

	@Test
	public void testFetchContactByEmailAddressReturnsContact()
		throws Exception {

		OktaService oktaService = _createOktaService(
			_BODY_CONTACT, HttpStatus.OK);

		OktaUser oktaUser = oktaService.fetchContactByEmailAddress(
			_EMAIL_ADDRESS);

		Assertions.assertNotNull(oktaUser);
		Assertions.assertEquals(_EMAIL_ADDRESS, oktaUser.getEmail());
	}

	@Test
	public void testFetchContactByEmailAddressReturnsNullWhenNotFound()
		throws Exception {

		OktaService oktaService = _createOktaService(
			_BODY_NOT_FOUND, HttpStatus.NOT_FOUND);

		Assertions.assertNull(
			oktaService.fetchContactByEmailAddress(_EMAIL_ADDRESS));
	}

	@Test
	public void testFetchContactByEmailAddressThrowsWhenOktaRedirects() {
		OktaService oktaService = _createOktaService(
			StringPool.BLANK, HttpStatus.FOUND);

		Assertions.assertThrows(
			OktaUnavailableException.class,
			() -> oktaService.fetchContactByEmailAddress(_EMAIL_ADDRESS));
	}

	@Test
	public void testFetchContactByEmailAddressThrowsWhenOktaReturnsError() {
		for (HttpStatus httpStatus :
				List.of(
					HttpStatus.MOVED_PERMANENTLY, HttpStatus.FOUND,
					HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN,
					HttpStatus.TOO_MANY_REQUESTS,
					HttpStatus.INTERNAL_SERVER_ERROR)) {

			OktaService oktaService = _createOktaService(
				_BODY_ERROR, httpStatus);

			Assertions.assertThrows(
				OktaUnavailableException.class,
				() -> oktaService.fetchContactByEmailAddress(_EMAIL_ADDRESS));
		}
	}

	private OktaService _createOktaService(
		String body, HttpStatusCode httpStatusCode) {

		OktaService oktaService = new OktaService();

		ReflectionTestUtils.setField(
			oktaService, "_oktaPubsubPublisher", _oktaPubsubPublisher);
		ReflectionTestUtils.setField(
			oktaService, "_webClient", _createWebClient(body, httpStatusCode));

		return oktaService;
	}

	private WebClient _createWebClient(
		String body, HttpStatusCode httpStatusCode) {

		return WebClient.builder(
		).exchangeFunction(
			clientRequest -> Mono.just(
				ClientResponse.create(
					httpStatusCode
				).header(
					"Content-Type", MediaType.APPLICATION_JSON_VALUE
				).body(
					body
				).build())
		).build();
	}

	private static final String _BODY_CONTACT =
		"{\"profile\": {\"email\": \"jane@example.com\", \"firstName\": " +
			"\"Jane\"}, \"status\": \"ACTIVE\"}";

	private static final String _BODY_ERROR =
		"{\"errorCode\": \"E0000011\", \"errorSummary\": \"Invalid token\"}";

	private static final String _BODY_NOT_FOUND =
		"{\"errorCode\": \"E0000007\", \"errorSummary\": \"Not found\"}";

	private static final String _EMAIL_ADDRESS = "jane@example.com";

	private final OktaPubsubPublisher _oktaPubsubPublisher = Mockito.mock(
		OktaPubsubPublisher.class);

}