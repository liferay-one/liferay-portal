/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.client.extension.util.spring.boot3.client.LiferayOAuth2AccessTokenManager;
import com.liferay.client.extension.util.spring.boot3.service.BaseService;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.StringUtil;
import com.liferay.portal.kernel.util.Validator;

import java.net.URI;

import java.nio.charset.StandardCharsets;

import java.time.Instant;

import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.reactive.function.client.ClientRequest;
import org.springframework.web.reactive.function.client.ExchangeFilterFunction;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

import reactor.core.publisher.Mono;

/**
 * @author Amos Fong
 */
public abstract class OneBaseService extends BaseService {

	protected String escapeODataString(String value) {
		if (value == null) {
			return null;
		}

		return StringUtil.replace(value, '\'', "''");
	}

	protected String fetch(String authorization, URI uri) {
		try {
			return get(authorization, uri);
		}
		catch (WebClientResponseException webClientResponseException) {
			HttpStatusCode httpStatusCode =
				webClientResponseException.getStatusCode();

			if (httpStatusCode.isSameCodeAs(HttpStatus.NOT_FOUND)) {
				return null;
			}

			throw webClientResponseException;
		}
	}

	protected <T> List<T> getAllItems(
			String path, String filterString, Function<JSONObject, T> function)
		throws Exception {

		return _getAllItems(path, null, filterString, function, null, null);
	}

	protected <T> List<T> getAllItems(
			String path, String filterString, Function<JSONObject, T> function,
			Jwt jwt)
		throws Exception {

		return _getAllItems(path, null, filterString, function, jwt, null);
	}

	protected <T> List<T> getAllItems(
			String path, String filterString, Function<JSONObject, T> function,
			String nestedFields)
		throws Exception {

		return _getAllItems(
			path, null, filterString, function, null, nestedFields);
	}

	/**
	 * Returns every item with only the given fields serialized. A projection
	 * keeps a page small when the caller reads a handful of fields off an
	 * object that carries dozens, since the portal otherwise writes every
	 * field plus the action and permission envelopes.
	 */
	protected <T> List<T> getAllProjectedItems(
			String path, String fields, String filterString,
			Function<JSONObject, T> function)
		throws Exception {

		return _getAllItems(path, fields, filterString, function, null, null);
	}

	protected String getAuthorization() {
		return _liferayOAuth2AccessTokenManager.getAuthorization(
			"liferay-one-etc-spring-boot-oahs");
	}

	protected String getAuthorization(Jwt jwt) {
		if (jwt == null) {
			return getAuthorization();
		}

		return "Bearer " + jwt.getTokenValue();
	}

	protected String getDXPEndpointAddress() {
		if (lxcDXPMainDomain.contains(":")) {
			return lxcDXPMainDomain;
		}

		int port = 80;

		if (StringUtil.equals(lxcDXPServerProtocol, "https")) {
			port = 443;
		}

		return lxcDXPMainDomain + ":" + port;
	}

	@Override
	protected ExchangeFilterFunction getWebClientExchangeFilterFunction() {
		return super.getWebClientExchangeFilterFunction(
		).andThen(
			(clientRequest, exchangeFunction) -> exchangeFunction.exchange(
				clientRequest
			).flatMap(
				clientResponse -> {
					int statusCode = clientResponse.statusCode(
					).value();

					if (statusCode != 403) {
						return Mono.just(clientResponse);
					}

					return clientResponse.bodyToMono(
						String.class
					).defaultIfEmpty(
						""
					).map(
						body -> {
							_logForbidden(body, clientRequest);

							return clientResponse.mutate(
							).body(
								body
							).build();
						}
					);
				}
			)
		);
	}

	protected boolean isNotFound(String status) {
		return Objects.equals(HttpStatus.NOT_FOUND.name(), status);
	}

	private <T> List<T> _getAllItems(
			String path, String fields, String filterString,
			Function<JSONObject, T> function, Jwt jwt, String nestedFields)
		throws Exception {

		List<T> items = new ArrayList<>();

		int page = 1;

		while (true) {
			UriComponentsBuilder uriComponentsBuilder =
				UriComponentsBuilder.fromPath(
					path
				).queryParam(
					"page", page
				).queryParam(
					"pageSize", _PAGE_SIZE
				);

			Map<String, Object> uriVariables = new HashMap<>();

			if (fields != null) {
				uriComponentsBuilder.queryParam("fields", "{fields}");

				uriVariables.put("fields", fields);
			}

			if (filterString != null) {
				uriComponentsBuilder.queryParam("filter", "{filter}");

				uriVariables.put("filter", filterString);
			}

			if (nestedFields != null) {
				uriComponentsBuilder.queryParam(
					"nestedFields", "{nestedFields}");

				uriVariables.put("nestedFields", nestedFields);
			}

			String response = get(
				getAuthorization(jwt),
				uriComponentsBuilder.encode(
				).buildAndExpand(
					uriVariables
				).toUri());

			if (Validator.isNull(response)) {
				return items;
			}

			JSONObject jsonObject = new JSONObject(response);

			JSONArray jsonArray = jsonObject.getJSONArray("items");

			for (int i = 0; i < jsonArray.length(); i++) {
				items.add(function.apply(jsonArray.getJSONObject(i)));
			}

			if (jsonArray.length() < _PAGE_SIZE) {
				return items;
			}

			page++;
		}
	}

	private String _getObjectScope(URI uri) {
		String path = uri.getPath();

		int index = path.indexOf("/o/c/");

		if (index < 0) {
			return null;
		}

		String objectName = path.substring(index + 5);

		int slashIndex = objectName.indexOf('/');

		if (slashIndex >= 0) {
			objectName = objectName.substring(0, slashIndex);
		}

		if (objectName.isEmpty()) {
			return null;
		}

		if (objectName.endsWith("s")) {
			objectName = objectName.substring(0, objectName.length() - 1);
		}

		return "c_" + objectName;
	}

	private JSONObject _getTokenClaimsJSONObject(String authorization) {
		if ((authorization == null) || !authorization.startsWith("Bearer ")) {
			return new JSONObject();
		}

		try {
			String token = authorization.substring(7);

			int firstIndex = token.indexOf('.');

			int secondIndex = token.indexOf('.', firstIndex + 1);

			if ((firstIndex < 0) || (secondIndex < 0)) {
				return new JSONObject();
			}

			String payload = new String(
				Base64.getUrlDecoder(
				).decode(
					token.substring(firstIndex + 1, secondIndex)
				),
				StandardCharsets.UTF_8);

			return new JSONObject(payload);
		}
		catch (RuntimeException runtimeException) {
			if (_log.isDebugEnabled()) {
				_log.debug("Unable to read the token claims", runtimeException);
			}

			return new JSONObject();
		}
	}

	private void _logForbidden(String body, ClientRequest clientRequest) {
		if (!_log.isWarnEnabled()) {
			return;
		}

		URI uri = clientRequest.url();

		JSONObject tokenClaimsJSONObject = _getTokenClaimsJSONObject(
			clientRequest.headers(
			).getFirst(
				HttpHeaders.AUTHORIZATION
			));

		String tokenScope = tokenClaimsJSONObject.optString("scope");

		String objectScope = _getObjectScope(uri);

		String message = null;

		if ((objectScope != null) && !tokenScope.contains(objectScope)) {
			message = StringBundler.concat(
				"Received a 403 from ", uri,
				". The service account token is missing the ", objectScope,
				" scope.");
		}
		else {
			message = StringBundler.concat("Received a 403 from ", uri, ".");
		}

		_log.warn(
			StringBundler.concat(
				message, " The token client ID is ",
				tokenClaimsJSONObject.optString("client_id"),
				", the subject is ", tokenClaimsJSONObject.optString("sub"),
				", the issuer is ", tokenClaimsJSONObject.optString("iss"),
				", and the token was issued at ",
				Instant.ofEpochSecond(tokenClaimsJSONObject.optLong("iat")),
				". The response body is ", StringUtil.shorten(body, 1000),
				". The token scopes are ", tokenScope));
	}

	private static final int _PAGE_SIZE = 500;

	private static final Log _log = LogFactory.getLog(OneBaseService.class);

	@Autowired
	private LiferayOAuth2AccessTokenManager _liferayOAuth2AccessTokenManager;

}