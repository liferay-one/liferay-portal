/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.jira.converter.BusinessEventConverter;
import com.liferay.one.jira.model.AssetObjectFieldOption;
import com.liferay.one.jira.model.BusinessEvent;
import com.liferay.one.jira.model.BusinessEventVersion;
import com.liferay.one.jira.model.ProductVersion;
import com.liferay.one.jira.service.BusinessEventService;
import com.liferay.one.permission.BusinessEventPermission;
import com.liferay.portal.kernel.security.permission.ActionKeys;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * @author Jenny Chen
 * @author Drew Brokke
 */
@RequestMapping("/jira")
@RestController
public class BusinessEventsRestController extends OneBaseRestController {

	@DeleteMapping("/accounts/{externalReferenceCode}/business-events/{id}")
	public ResponseEntity<String> deleteAccountsBusinessEvents(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable("externalReferenceCode") String externalReferenceCode,
			@PathVariable("id") String id)
		throws Exception {

		_businessEventPermission.check(
			externalReferenceCode, ActionKeys.UPDATE, jwt);

		_businessEventService.deleteBusinessEvent(id);

		return new ResponseEntity<>(HttpStatus.OK);
	}

	@GetMapping("/accounts/{externalReferenceCode}/business-events")
	public ResponseEntity<String> getAccountsBusinessEvents(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable("externalReferenceCode") String externalReferenceCode)
		throws Exception {

		_businessEventPermission.check(
			externalReferenceCode, ActionKeys.VIEW, jwt);

		return getResponseEntity(
			_businessEventService.getBusinessEvents(externalReferenceCode),
			BusinessEvent::toJSONObject);
	}

	@GetMapping("/accounts/{externalReferenceCode}/business-events/{id}")
	public ResponseEntity<String> getAccountsBusinessEvents(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable("externalReferenceCode") String externalReferenceCode,
			@PathVariable("id") String id)
		throws Exception {

		_businessEventPermission.check(
			externalReferenceCode, ActionKeys.VIEW, jwt);

		BusinessEvent businessEvent = _businessEventService.getBusinessEvent(
			id);

		return new ResponseEntity<>(
			businessEvent.toJSONObject(
			).toString(),
			HttpStatus.OK);
	}

	@GetMapping(
		"/accounts/{externalReferenceCode}/business-events/{id}/versions"
	)
	public ResponseEntity<String> getAccountsBusinessEventsVersions(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable("externalReferenceCode") String externalReferenceCode,
			@PathVariable("id") String id)
		throws Exception {

		_businessEventPermission.check(
			externalReferenceCode, ActionKeys.VIEW, jwt);

		return getResponseEntity(
			_businessEventService.getBusinessEventVersions(id),
			BusinessEventVersion::toJSONObject);
	}

	@GetMapping("/business-events/fields/{fieldName}/options")
	public ResponseEntity<String> getBusinessEventsFieldsOptions(
			@PathVariable("fieldName") String fieldName)
		throws Exception {

		return getResponseEntity(
			_businessEventService.getFieldOptions(fieldName),
			AssetObjectFieldOption::toJSONObject);
	}

	@GetMapping("/product-versions")
	public ResponseEntity<String> getProductVersions() throws Exception {
		return getResponseEntity(
			_businessEventService.getProductVersions(),
			ProductVersion::toJSONObject);
	}

	@PostMapping("/accounts/{externalReferenceCode}/business-events")
	public ResponseEntity<String> postAccountsBusinessEvents(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable("externalReferenceCode") String externalReferenceCode,
			@RequestBody String json)
		throws Exception {

		_businessEventPermission.check(
			externalReferenceCode, ActionKeys.UPDATE, jwt);

		UserAccount userAccount = getMyUserAccount(jwt);

		_businessEventService.createBusinessEvent(
			_businessEventConverter.toBusinessEvent(
				externalReferenceCode, json, userAccount.getEmailAddress()));

		return getResponseEntity(
			_businessEventService.getBusinessEvents(externalReferenceCode),
			BusinessEvent::toJSONObject);
	}

	@PutMapping("/accounts/{externalReferenceCode}/business-events/{id}")
	public ResponseEntity<String> putAccountsBusinessEvents(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable("externalReferenceCode") String externalReferenceCode,
			@PathVariable("id") String id, @RequestBody String json)
		throws Exception {

		if (_log.isInfoEnabled()) {
			_log.info("PUT business event " + id);
		}

		_businessEventPermission.check(
			externalReferenceCode, ActionKeys.UPDATE, jwt);

		UserAccount userAccount = getMyUserAccount(jwt);

		BusinessEvent businessEvent = _businessEventConverter.toBusinessEvent(
			externalReferenceCode, json, userAccount.getEmailAddress());

		businessEvent = _businessEventService.updateBusinessEvent(
			businessEvent, id);

		return new ResponseEntity<>(
			businessEvent.toJSONObject(
			).toString(),
			HttpStatus.OK);
	}

	private static final Log _log = LogFactory.getLog(
		BusinessEventsRestController.class);

	@Autowired
	private BusinessEventConverter _businessEventConverter;

	@Autowired
	private BusinessEventPermission _businessEventPermission;

	@Autowired
	private BusinessEventService _businessEventService;

}