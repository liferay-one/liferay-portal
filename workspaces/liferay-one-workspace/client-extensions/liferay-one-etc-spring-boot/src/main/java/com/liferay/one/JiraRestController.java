/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.jira.model.SupportIssue;
import com.liferay.one.jira.service.JiraIssueService;
import com.liferay.one.permission.BusinessEventPermission;
import com.liferay.petra.string.StringPool;
import com.liferay.portal.kernel.security.permission.ActionKeys;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * @author Jenny Chen
 */
@RequestMapping("/jira")
@RestController
public class JiraRestController extends OneBaseRestController {

	@GetMapping("/projects/{externalReferenceCode}/tickets")
	public ResponseEntity<String> getProjectsTickets(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable("externalReferenceCode") String externalReferenceCode,
			@RequestParam(defaultValue = StringPool.BLANK, required = false)
				String[] ticketIds)
		throws Exception {

		_businessEventPermission.check(
			ActionKeys.VIEW, jwt, externalReferenceCode);

		return getResponseEntity(
			_jiraIssueService.getSupportIssues(
				externalReferenceCode, ticketIds),
			SupportIssue::toJSONObject);
	}

	@Autowired
	private BusinessEventPermission _businessEventPermission;

	@Autowired
	private JiraIssueService _jiraIssueService;

}