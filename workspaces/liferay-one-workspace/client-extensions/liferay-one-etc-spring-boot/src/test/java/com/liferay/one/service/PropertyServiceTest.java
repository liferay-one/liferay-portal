/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.one.constants.PropertyConstants;
import com.liferay.one.model.Project;
import com.liferay.petra.string.StringPool;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

/**
 * @author Drew Brokke
 */
@DisplayName("[SVC-PROPERTYSERVICE] PropertyService")
public class PropertyServiceTest {

	@BeforeEach
	public void setUp() throws Exception {
		Mockito.when(
			_propertyService.getDataOpsAccountKey(Mockito.any(Project.class))
		).thenCallRealMethod();
	}

	@Test
	public void testGetDataOpsAccountKeyFallsBackToAccountExternalReferenceCode()
		throws Exception {

		Assertions.assertEquals(
			_ACCOUNT_EXTERNAL_REFERENCE_CODE,
			_propertyService.getDataOpsAccountKey(_createProject(_ACCOUNT_ID)));

		Mockito.when(
			_propertyService.getPropertyValue(
				_ACCOUNT_ID, PropertyConstants.NAME_KORONEIKI_ACCOUNT_KEY)
		).thenReturn(
			StringPool.BLANK
		);

		Assertions.assertEquals(
			_ACCOUNT_EXTERNAL_REFERENCE_CODE,
			_propertyService.getDataOpsAccountKey(_createProject(_ACCOUNT_ID)));
	}

	@Test
	public void testGetDataOpsAccountKeyReadsKoroneikiAccountKey()
		throws Exception {

		Mockito.when(
			_propertyService.getPropertyValue(
				_ACCOUNT_ID, PropertyConstants.NAME_KORONEIKI_ACCOUNT_KEY)
		).thenReturn(
			_KORONEIKI_ACCOUNT_KEY
		);

		Assertions.assertEquals(
			_KORONEIKI_ACCOUNT_KEY,
			_propertyService.getDataOpsAccountKey(_createProject(_ACCOUNT_ID)));
	}

	@Test
	public void testGetDataOpsAccountKeySkipsLookupWithoutAccount()
		throws Exception {

		Assertions.assertEquals(
			_ACCOUNT_EXTERNAL_REFERENCE_CODE,
			_propertyService.getDataOpsAccountKey(_createProject(0)));

		Mockito.verify(
			_propertyService, Mockito.never()
		).getPropertyValue(
			Mockito.anyLong(), Mockito.anyString()
		);
	}

	private Project _createProject(long accountId) {
		return new Project(
			new JSONObject(
			).put(
				"r_accountEntryToProject_accountEntryERC",
				_ACCOUNT_EXTERNAL_REFERENCE_CODE
			).put(
				"r_accountEntryToProject_accountEntryId", accountId
			));
	}

	private static final String _ACCOUNT_EXTERNAL_REFERENCE_CODE = "ACCNT-1";

	private static final long _ACCOUNT_ID = 5;

	private static final String _KORONEIKI_ACCOUNT_KEY = "KOR-1";

	private final PropertyService _propertyService = Mockito.mock(
		PropertyService.class);

}