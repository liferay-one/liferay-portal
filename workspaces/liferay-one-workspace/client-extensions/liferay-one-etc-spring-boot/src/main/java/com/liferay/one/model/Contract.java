/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.model;

import com.liferay.portal.kernel.util.Validator;

import java.time.Instant;

import org.json.JSONObject;

/**
 * @author Kyle Bischof
 */
public class Contract {

	public Contract(JSONObject jsonObject) {
		_dateCreatedInstant = Instant.parse(
			jsonObject.optString("dateCreated"));
		_externalReferenceCode = jsonObject.optString("externalReferenceCode");
		_id = jsonObject.optLong("id");
		_projectExternalReferenceCode = jsonObject.optString(
			"r_projectToContract_c_projectERC");

		String endDate = jsonObject.optString("endDate");

		if (Validator.isNull(endDate)) {
			_endDateInstant = null;
		}
		else {
			_endDateInstant = Instant.parse(endDate);
		}
	}

	public Instant getDateCreatedInstant() {
		return _dateCreatedInstant;
	}

	public Instant getEndDateInstant() {
		return _endDateInstant;
	}

	public String getExternalReferenceCode() {
		return _externalReferenceCode;
	}

	public long getId() {
		return _id;
	}

	public String getProjectExternalReferenceCode() {
		return _projectExternalReferenceCode;
	}

	private final Instant _dateCreatedInstant;
	private final Instant _endDateInstant;
	private final String _externalReferenceCode;
	private final long _id;
	private final String _projectExternalReferenceCode;

}