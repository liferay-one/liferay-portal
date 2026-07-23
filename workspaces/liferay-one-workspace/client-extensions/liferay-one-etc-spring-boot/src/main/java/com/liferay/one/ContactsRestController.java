/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.okta.model.OktaUser;
import com.liferay.one.okta.service.OktaService;
import com.liferay.one.service.EmailAddressValidatorService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Ports <code>ContactResourceImpl</code> from
 * <code>osb-provisioning-rest-impl</code>.
 *
 * @author Allen Ziegenfus
 */
@RequestMapping("/contacts")
@RestController
public class ContactsRestController extends OneBaseRestController {

	/**
	 * Ports <code>ContactResourceImpl#getContactValidate</code>, keeping its
	 * condition unchanged: an address is invalid only when no contact exists
	 * for it and it uses a Liferay domain.
	 *
	 * <p>
	 * Legacy resolved the contact through
	 * <code>ContactIdentityProvider#fetchContactByEmailAddress</code> with
	 * <code>sync</code> false, which read Koroneiki first and fell back to the
	 * Okta API without activating a deactivated user. Liferay One has no
	 * Koroneiki, so the lookup goes straight to Okta, and
	 * <code>OktaService#fetchContactByEmailAddress</code> carries the same
	 * absence of side effects.
	 * </p>
	 */
	@GetMapping("/{contactEmailAddress}/validate")
	public boolean getContactsValidate(
			@PathVariable("contactEmailAddress") String contactEmailAddress)
		throws Exception {

		OktaUser oktaUser = _oktaService.fetchContactByEmailAddress(
			contactEmailAddress);

		if ((oktaUser == null) &&
			_emailAddressValidatorService.isLiferayDomain(
				contactEmailAddress)) {

			return false;
		}

		return true;
	}

	@Autowired
	private EmailAddressValidatorService _emailAddressValidatorService;

	@Autowired
	private OktaService _oktaService;

}