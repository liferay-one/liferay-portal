/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.model.UsageReport;
import com.liferay.one.service.UsageReportService;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.Mockito;

import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
@DisplayName(
	"[REST-POST-OBJECT-ACTION-USAGE-REPORT-APPROVED] ObjectActionUsageReportApprovedRestController"
)
@ExtendWith(OutputCaptureExtension.class)
public class ObjectActionUsageReportApprovedRestControllerTest {

	@BeforeEach
	public void setUp() {
		ReflectionTestUtils.setField(
			_objectActionUsageReportApprovedRestController,
			"_usageReportService", _usageReportService);
	}

	@Test
	public void testPostReportsApprovedUsageReport(
			CapturedOutput capturedOutput)
		throws Exception {

		_mockUsageReport(UsageReportService.REVIEW_STATUS_APPROVED);

		_objectActionUsageReportApprovedRestController.post(_JSON);

		Assertions.assertTrue(
			capturedOutput.getOut(
			).contains(
				"Unable to create an overage order for usage report " +
					_EXTERNAL_REFERENCE_CODE
			));
	}

	@Test
	public void testPostSkipsPayloadWithoutObjectEntry() throws Exception {
		_objectActionUsageReportApprovedRestController.post(
			new JSONObject(
			).put(
				"classPK", 12345L
			).toString());

		Mockito.verifyNoInteractions(_usageReportService);
	}

	@Test
	public void testPostSkipsUsageReportReadyForReview(
			CapturedOutput capturedOutput)
		throws Exception {

		_mockUsageReport(UsageReportService.REVIEW_STATUS_READY_FOR_REVIEW);

		_objectActionUsageReportApprovedRestController.post(_JSON);

		Mockito.verify(
			_usageReportService
		).fetchUsageReport(
			_EXTERNAL_REFERENCE_CODE
		);

		Assertions.assertFalse(
			capturedOutput.getOut(
			).contains(
				_EXTERNAL_REFERENCE_CODE
			));
	}

	private void _mockUsageReport(String reviewStatus) throws Exception {
		UsageReport usageReport = Mockito.mock(UsageReport.class);

		Mockito.when(
			usageReport.getExternalReferenceCode()
		).thenReturn(
			_EXTERNAL_REFERENCE_CODE
		);

		Mockito.when(
			usageReport.getReviewStatus()
		).thenReturn(
			reviewStatus
		);

		Mockito.when(
			_usageReportService.fetchUsageReport(_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			usageReport
		);
	}

	private static final String _EXTERNAL_REFERENCE_CODE = "C_USAGE_REPORT_1";

	private static final String _JSON = new JSONObject(
	).put(
		"objectEntry",
		new JSONObject(
		).put(
			"externalReferenceCode", _EXTERNAL_REFERENCE_CODE
		)
	).toString();

	private final ObjectActionUsageReportApprovedRestController
		_objectActionUsageReportApprovedRestController =
			new ObjectActionUsageReportApprovedRestController();
	private final UsageReportService _usageReportService = Mockito.mock(
		UsageReportService.class);

}