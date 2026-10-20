/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.jira.constants.JiraBusinessEventConstants;
import com.liferay.one.jira.converter.JiraBusinessEventConverter;
import com.liferay.one.jira.model.JiraAssetObjectFieldOption;
import com.liferay.one.jira.model.JiraBusinessEvent;
import com.liferay.one.jira.model.JiraBusinessEventVersion;
import com.liferay.one.jira.model.JiraProductVersion;
import com.liferay.one.jira.service.JiraBusinessEventService;
import com.liferay.one.permission.ProjectPermission;
import com.liferay.portal.kernel.security.auth.PrincipalException;
import com.liferay.portal.kernel.security.permission.ActionKeys;

import java.util.Set;

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

	@DeleteMapping("/projects/{externalReferenceCode}/business-events/{id}")
	public ResponseEntity<String> deleteProjectsBusinessEvents(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable("externalReferenceCode") String externalReferenceCode,
			@PathVariable("id") String id)
		throws Exception {

		_projectPermission.check(ActionKeys.UPDATE, jwt, externalReferenceCode);

		_checkBusinessEvent(externalReferenceCode, id);

		_businessEventService.deleteJiraBusinessEvent(id);

		return new ResponseEntity<>(HttpStatus.OK);
	}

	@GetMapping("/business-events/fields/{fieldName}/options")
	public ResponseEntity<String> getBusinessEventsFieldsOptions(
			@PathVariable("fieldName") String fieldName)
		throws Exception {

		if (!_fieldNames.contains(fieldName)) {
			return new ResponseEntity<>(HttpStatus.NOT_FOUND);
		}

		return getResponseEntity(
			_businessEventService.getFieldOptions(fieldName),
			JiraAssetObjectFieldOption::toJSONObject);
	}

	@GetMapping("/product-versions")
	public ResponseEntity<String> getProductVersions() throws Exception {
		return getResponseEntity(
			_businessEventService.getJiraProductVersions(),
			JiraProductVersion::toJSONObject);
	}

	@GetMapping("/projects/{externalReferenceCode}/business-events")
	public ResponseEntity<String> getProjectsBusinessEvents(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable("externalReferenceCode") String externalReferenceCode)
		throws Exception {

		_projectPermission.check(ActionKeys.VIEW, jwt, externalReferenceCode);

		return getResponseEntity(
			_businessEventService.getJiraBusinessEvents(externalReferenceCode),
			JiraBusinessEvent::toJSONObject);
	}

	@GetMapping("/projects/{externalReferenceCode}/business-events/{id}")
	public ResponseEntity<String> getProjectsBusinessEvents(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable("externalReferenceCode") String externalReferenceCode,
			@PathVariable("id") String id)
		throws Exception {

		_projectPermission.check(ActionKeys.VIEW, jwt, externalReferenceCode);

		_checkBusinessEvent(externalReferenceCode, id);

		JiraBusinessEvent jiraBusinessEvent =
			_businessEventService.getJiraBusinessEvent(id);

		return new ResponseEntity<>(
			jiraBusinessEvent.toJSONObject(
			).toString(),
			HttpStatus.OK);
	}

	@GetMapping(
		"/projects/{externalReferenceCode}/business-events/{id}/versions"
	)
	public ResponseEntity<String> getProjectsBusinessEventsVersions(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable("externalReferenceCode") String externalReferenceCode,
			@PathVariable("id") String id)
		throws Exception {

		_projectPermission.check(ActionKeys.VIEW, jwt, externalReferenceCode);

		_checkBusinessEvent(externalReferenceCode, id);

		return getResponseEntity(
			_businessEventService.getJiraBusinessEventVersions(id),
			JiraBusinessEventVersion::toJSONObject);
	}

	@PostMapping("/projects/{externalReferenceCode}/business-events")
	public ResponseEntity<String> postProjectsBusinessEvents(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable("externalReferenceCode") String externalReferenceCode,
			@RequestBody String json)
		throws Exception {

		_projectPermission.check(ActionKeys.UPDATE, jwt, externalReferenceCode);

		UserAccount userAccount = getMyUserAccount(jwt);

		_businessEventService.createJiraBusinessEvent(
			_businessEventConverter.toJiraBusinessEvent(
				json, userAccount.getEmailAddress(), externalReferenceCode));

		return getResponseEntity(
			_businessEventService.getJiraBusinessEvents(externalReferenceCode),
			JiraBusinessEvent::toJSONObject);
	}

	@PutMapping("/projects/{externalReferenceCode}/business-events/{id}")
	public ResponseEntity<String> putProjectsBusinessEvents(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable("externalReferenceCode") String externalReferenceCode,
			@PathVariable("id") String id, @RequestBody String json)
		throws Exception {

		if (_log.isInfoEnabled()) {
			_log.info("PUT business event " + id);
		}

		_projectPermission.check(ActionKeys.UPDATE, jwt, externalReferenceCode);

		_checkBusinessEvent(externalReferenceCode, id);

		UserAccount userAccount = getMyUserAccount(jwt);

		JiraBusinessEvent jiraBusinessEvent =
			_businessEventConverter.toJiraBusinessEvent(
				json, userAccount.getEmailAddress(), externalReferenceCode);

		jiraBusinessEvent = _businessEventService.updateJiraBusinessEvent(
			jiraBusinessEvent, id);

		return new ResponseEntity<>(
			jiraBusinessEvent.toJSONObject(
			).toString(),
			HttpStatus.OK);
	}

	private void _checkBusinessEvent(String externalReferenceCode, String id)
		throws Exception {

		if (!_businessEventService.hasJiraBusinessEvent(
				id, externalReferenceCode)) {

			throw new PrincipalException();
		}
	}

	private static final Set<String> _fieldNames = Set.of(
		JiraBusinessEventConstants.ATTRIBUTE_NAME_EVENT_TYPE,
		JiraBusinessEventConstants.ATTRIBUTE_NAME_TIME_ZONE);
	private static final Log _log = LogFactory.getLog(
		BusinessEventsRestController.class);

	@Autowired
	private JiraBusinessEventConverter _businessEventConverter;

	@Autowired
	private JiraBusinessEventService _businessEventService;

	@Autowired
	private ProjectPermission _projectPermission;

}