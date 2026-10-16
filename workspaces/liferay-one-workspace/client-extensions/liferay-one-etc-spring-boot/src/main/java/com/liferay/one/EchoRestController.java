/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.portal.kernel.util.StringUtil;

import jakarta.servlet.http.HttpServletRequest;

import java.net.URL;

import java.nio.charset.StandardCharsets;

import java.time.Instant;

import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.util.UriUtils;

/**
 * Returns a description of each request it receives, to troubleshoot how a
 * caller reaches the client extension: the HTTP method, the path, the query
 * parameters, the headers, the body, and the claims of the OAuth2 token.
 * The values of the Authorization and Cookie headers are hidden.
 *
 * @author Drew Brokke
 */
@ConditionalOnProperty(havingValue = "true", name = "liferay.one.echo.enabled")
@RequestMapping("/echo")
@RestController
public class EchoRestController extends OneBaseRestController {

	@DeleteMapping("/**")
	public ResponseEntity<String> deleteEcho(
		@RequestBody(required = false) String body,
		HttpServletRequest httpServletRequest,
		@AuthenticationPrincipal Jwt jwt) {

		return _echo(body, httpServletRequest, jwt);
	}

	@GetMapping("/**")
	public ResponseEntity<String> getEcho(
		@RequestBody(required = false) String body,
		HttpServletRequest httpServletRequest,
		@AuthenticationPrincipal Jwt jwt) {

		return _echo(body, httpServletRequest, jwt);
	}

	@PatchMapping("/**")
	public ResponseEntity<String> patchEcho(
		@RequestBody(required = false) String body,
		HttpServletRequest httpServletRequest,
		@AuthenticationPrincipal Jwt jwt) {

		return _echo(body, httpServletRequest, jwt);
	}

	@PostMapping("/**")
	public ResponseEntity<String> postEcho(
		@RequestBody(required = false) String body,
		HttpServletRequest httpServletRequest,
		@AuthenticationPrincipal Jwt jwt) {

		return _echo(body, httpServletRequest, jwt);
	}

	@PutMapping("/**")
	public ResponseEntity<String> putEcho(
		@RequestBody(required = false) String body,
		HttpServletRequest httpServletRequest,
		@AuthenticationPrincipal Jwt jwt) {

		return _echo(body, httpServletRequest, jwt);
	}

	private ResponseEntity<String> _echo(
		String body, HttpServletRequest httpServletRequest, Jwt jwt) {

		String contextPath = httpServletRequest.getContextPath();
		String requestURI = httpServletRequest.getRequestURI();

		String path = requestURI.substring(contextPath.length());

		JSONObject jsonObject = new JSONObject(
		).put(
			"body", (body == null) ? JSONObject.NULL : body
		).put(
			"contentType", _toJSONValue(httpServletRequest.getContentType())
		).put(
			"headers", _getHeadersJSONObject(httpServletRequest)
		).put(
			"method", httpServletRequest.getMethod()
		).put(
			"path", path
		).put(
			"pathSegments", _getPathSegmentsJSONArray(path)
		).put(
			"principal", _getPrincipalJSONObject(jwt)
		).put(
			"queryParameters",
			_getQueryParametersJSONObject(httpServletRequest.getQueryString())
		).put(
			"queryString", _toJSONValue(httpServletRequest.getQueryString())
		);

		return ResponseEntity.ok(
		).contentType(
			MediaType.APPLICATION_JSON
		).body(
			jsonObject.toString()
		);
	}

	private JSONObject _getHeadersJSONObject(
		HttpServletRequest httpServletRequest) {

		JSONObject jsonObject = new JSONObject();

		for (String name :
				Collections.list(httpServletRequest.getHeaderNames())) {

			JSONArray jsonArray = new JSONArray();

			for (String value :
					Collections.list(httpServletRequest.getHeaders(name))) {

				jsonArray.put(_hideHeaderValue(name, value));
			}

			jsonObject.put(name, jsonArray);
		}

		return jsonObject;
	}

	private JSONArray _getPathSegmentsJSONArray(String path) {
		JSONArray jsonArray = new JSONArray();

		String[] segments = path.split("/");

		// Skip the empty segment before the first slash and the "echo"
		// segment

		for (int i = 2; i < segments.length; i++) {
			if (!segments[i].isEmpty()) {
				jsonArray.put(
					UriUtils.decode(segments[i], StandardCharsets.UTF_8));
			}
		}

		return jsonArray;
	}

	private Object _getPrincipalJSONObject(Jwt jwt) {
		if (jwt == null) {
			return JSONObject.NULL;
		}

		JSONObject jsonObject = new JSONObject();

		Map<String, Object> claims = jwt.getClaims();

		for (Map.Entry<String, Object> entry : claims.entrySet()) {
			jsonObject.put(entry.getKey(), _toClaimJSONValue(entry.getValue()));
		}

		return jsonObject;
	}

	private JSONObject _getQueryParametersJSONObject(String queryString) {
		JSONObject jsonObject = new JSONObject();

		if (queryString == null) {
			return jsonObject;
		}

		MultiValueMap<String, String> queryParams =
			UriComponentsBuilder.fromUriString(
				"?" + queryString
			).build(
			).getQueryParams();

		for (Map.Entry<String, List<String>> entry : queryParams.entrySet()) {
			JSONArray jsonArray = new JSONArray();

			for (String value : entry.getValue()) {
				jsonArray.put(
					(value == null) ? JSONObject.NULL :
						UriUtils.decode(value, StandardCharsets.UTF_8));
			}

			jsonObject.put(
				UriUtils.decode(entry.getKey(), StandardCharsets.UTF_8),
				jsonArray);
		}

		return jsonObject;
	}

	private String _hideHeaderValue(String name, String value) {
		if (StringUtil.equalsIgnoreCase(name, "Cookie")) {
			return "<hidden>";
		}

		if (StringUtil.equalsIgnoreCase(name, "Authorization")) {
			int index = value.indexOf(' ');

			if (index == -1) {
				return "<hidden>";
			}

			return value.substring(0, index) + " <hidden>";
		}

		return value;
	}

	private Object _toClaimJSONValue(Object value) {
		if (value instanceof Collection<?> collection) {
			JSONArray jsonArray = new JSONArray();

			for (Object element : collection) {
				jsonArray.put(_toClaimJSONValue(element));
			}

			return jsonArray;
		}

		if (value instanceof Instant || value instanceof URL) {
			return value.toString();
		}

		return _toJSONValue(value);
	}

	private Object _toJSONValue(Object value) {
		if (value == null) {
			return JSONObject.NULL;
		}

		if (value instanceof Boolean || value instanceof Number) {
			return value;
		}

		return value.toString();
	}

}