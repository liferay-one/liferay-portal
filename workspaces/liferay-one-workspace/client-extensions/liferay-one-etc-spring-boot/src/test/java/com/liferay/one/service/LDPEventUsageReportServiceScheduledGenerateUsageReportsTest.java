/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import java.io.InputStream;

import java.time.YearMonth;
import java.time.ZoneOffset;

import java.util.List;
import java.util.Properties;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;

import org.springframework.scheduling.annotation.Scheduled;

/**
 * @author Ryan Schuhler
 */
@DisplayName(
	"[CRON-SCHEDULEDGENERATEUSAGEREPORTS] " +
		"LDPEventUsageReportService#scheduledGenerateUsageReports"
)
public class LDPEventUsageReportServiceScheduledGenerateUsageReportsTest {

	@BeforeEach
	public void setUp() throws Exception {
		_ldpEventUsageReportService = Mockito.spy(
			new LDPEventUsageReportService());

		Mockito.doNothing(
		).when(
			_ldpEventUsageReportService
		).generateUsageReports(
			ArgumentMatchers.any(YearMonth.class)
		);
	}

	@Test
	public void testScheduledGenerateUsageReportsGeneratesPreviousMonth()
		throws Exception {

		YearMonth beforeYearMonth = _getPreviousYearMonth();

		_ldpEventUsageReportService.scheduledGenerateUsageReports();

		YearMonth afterYearMonth = _getPreviousYearMonth();

		ArgumentCaptor<YearMonth> argumentCaptor = ArgumentCaptor.forClass(
			YearMonth.class);

		Mockito.verify(
			_ldpEventUsageReportService
		).generateUsageReports(
			argumentCaptor.capture()
		);

		Assertions.assertTrue(
			List.of(
				beforeYearMonth, afterYearMonth
			).contains(
				argumentCaptor.getValue()
			));
	}

	@Test
	public void testScheduledGenerateUsageReportsRunsAtTwoUTCOnTheFirstOfTheMonth()
		throws Exception {

		Scheduled scheduled = LDPEventUsageReportService.class.getMethod(
			"scheduledGenerateUsageReports"
		).getAnnotation(
			Scheduled.class
		);

		Assertions.assertEquals(
			"${liferay.one.ldp.event.usage.report.cron}", scheduled.cron());
		Assertions.assertEquals("UTC", scheduled.zone());

		Properties properties = new Properties();

		try (InputStream inputStream =
				LDPEventUsageReportService.class.getResourceAsStream(
					"/application-default.properties")) {

			properties.load(inputStream);
		}

		Assertions.assertEquals(
			"0 0 2 1 * *",
			properties.getProperty("liferay.one.ldp.event.usage.report.cron"));
	}

	@Test
	public void testScheduledGenerateUsageReportsSwallowsFailure()
		throws Exception {

		Mockito.doThrow(
			new IllegalStateException("Unable to generate")
		).when(
			_ldpEventUsageReportService
		).generateUsageReports(
			ArgumentMatchers.any(YearMonth.class)
		);

		Assertions.assertDoesNotThrow(
			_ldpEventUsageReportService::scheduledGenerateUsageReports);
	}

	private YearMonth _getPreviousYearMonth() {
		return YearMonth.now(
			ZoneOffset.UTC
		).minusMonths(
			1
		);
	}

	private LDPEventUsageReportService _ldpEventUsageReportService;

}