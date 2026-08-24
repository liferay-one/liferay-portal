/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.model.AccountInvitation;
import com.liferay.one.service.AccountInvitationService;
import com.liferay.portal.kernel.util.Validator;

import java.util.UUID;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * @author Pedro Oliveira
 */
@RequestMapping("/invitations")
@RestController
public class AccountInvitationsRestController extends OneBaseRestController {

	@GetMapping("/accept")
	public ResponseEntity<String> getAccept(@RequestParam("token") String token)
		throws Exception {

		if (!_isValidToken(token)) {
			return _toResponseEntity("invalid");
		}

		AccountInvitation accountInvitation =
			_accountInvitationService.fetchAccountInvitationByToken(token);

		if (accountInvitation == null) {
			return _toResponseEntity("invalid");
		}

		if (accountInvitation.isAccepted()) {
			return _toResponseEntity("accepted");
		}

		if (accountInvitation.isExpired()) {
			return _toResponseEntity("expired");
		}

		try {
			_accountInvitationService.updateAccepted(
				accountInvitation.getAccountInvitationId());
		}
		catch (Exception exception) {
			_log.error(
				"Unable to accept the invitation " +
					accountInvitation.getExternalReferenceCode(),
				exception);

			return _toResponseEntity("error");
		}

		return _toResponseEntity("accepted");
	}

	private boolean _isValidToken(String token) {
		if (Validator.isNull(token)) {
			return false;
		}

		try {
			UUID.fromString(token);

			return true;
		}
		catch (IllegalArgumentException illegalArgumentException) {
			if (_log.isDebugEnabled()) {
				_log.debug(
					"Unable to read the invitation token as a UUID",
					illegalArgumentException);
			}

			return false;
		}
	}

	private ResponseEntity<String> _toResponseEntity(String status) {
		JSONObject jsonObject = new JSONObject(
		).put(
			"status", status
		);

		return ResponseEntity.ok(jsonObject.toString());
	}

	private static final Log _log = LogFactory.getLog(
		AccountInvitationsRestController.class);

	@Autowired
	private AccountInvitationService _accountInvitationService;

}