/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.ProductSpecification;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.ProductVirtualSettingsFileEntry;
import com.liferay.one.constants.EntitlementConstants;
import com.liferay.one.constants.EnvironmentConstants;
import com.liferay.one.constants.LicenseKeyGenerationConstants;
import com.liferay.one.constants.ProductSpecificationConstants;
import com.liferay.one.exception.ExpiredActivationTokenException;
import com.liferay.one.exception.InvalidSignatureException;
import com.liferay.one.license.LicenseKeyExporter;
import com.liferay.one.license.LicenseKeyGenerator;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.Environment;
import com.liferay.one.model.Project;
import com.liferay.one.permission.AdminPermission;
import com.liferay.one.permission.EnvironmentActivationPermission;
import com.liferay.one.service.AccountService;
import com.liferay.one.service.CommerceProductService;
import com.liferay.one.service.CommerceProductVirtualSettingsService;
import com.liferay.one.service.CommerceSkuService;
import com.liferay.one.service.EntitlementService;
import com.liferay.one.service.EnvironmentQuotaService;
import com.liferay.one.service.EnvironmentService;
import com.liferay.one.util.JWTSignatureValidator;
import com.liferay.one.util.KeyedLock;
import com.liferay.petra.string.StringPool;
import com.liferay.portal.ee.license.shared.LicenseConstants;
import com.liferay.portal.kernel.security.auth.PrincipalException;
import com.liferay.portal.kernel.util.StringUtil;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;

import java.lang.reflect.Method;

import java.net.http.HttpResponse;

import java.nio.charset.StandardCharsets;

import java.security.KeyPair;
import java.security.KeyPairGenerator;

import java.text.DateFormat;
import java.text.SimpleDateFormat;

import java.util.Base64;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;

import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.method.annotation.ExceptionHandlerMethodResolver;

/**
 * @author Amos Fong
 */
public class DXPEnvironmentsRestControllerTest {

	@BeforeEach
	public void setUp() throws Exception {
		_dxpEnvironmentsRestController = new DXPEnvironmentsRestController();

		_accountService = Mockito.mock(AccountService.class);
		_adminPermission = Mockito.mock(AdminPermission.class);
		_commerceProductService = Mockito.mock(CommerceProductService.class);
		_commerceProductVirtualSettingsService = Mockito.mock(
			CommerceProductVirtualSettingsService.class);
		_commerceSkuService = Mockito.mock(CommerceSkuService.class);
		_entitlementService = Mockito.mock(EntitlementService.class);
		_environmentActivationPermission = Mockito.mock(
			EnvironmentActivationPermission.class);
		_environmentService = Mockito.mock(EnvironmentService.class);

		EnvironmentQuotaService environmentQuotaService =
			new EnvironmentQuotaService();

		ReflectionTestUtils.setField(
			environmentQuotaService, "_entitlementService",
			_entitlementService);
		ReflectionTestUtils.setField(
			environmentQuotaService, "_environmentService",
			_environmentService);

		_licenseKeyExporter = new LicenseKeyExporter();
		_licenseKeyGenerator = new LicenseKeyGenerator();

		ReflectionTestUtils.setField(
			_licenseKeyExporter, "_licenseKeyGenerator", _licenseKeyGenerator);

		Account account = new Account();

		account.setName("Acme");

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		Mockito.when(
			_environmentActivationPermission.checkLicenseKeyActivation(
				null, _PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			new Project(
				new JSONObject(
				).put(
					"externalReferenceCode", _PROJECT_EXTERNAL_REFERENCE_CODE
				).put(
					"r_accountEntryToProject_accountEntryId", _ACCOUNT_ID
				))
		);

		Mockito.when(
			_environmentService.getDXPEnvironmentsByInstallationId(
				ArgumentMatchers.anyString(), ArgumentMatchers.anyString(),
				ArgumentMatchers.anyString())
		).thenReturn(
			Collections.emptyList()
		);

		ReflectionTestUtils.setField(
			_dxpEnvironmentsRestController, "_accountService", _accountService);
		ReflectionTestUtils.setField(
			_dxpEnvironmentsRestController, "_adminPermission",
			_adminPermission);
		ReflectionTestUtils.setField(
			_dxpEnvironmentsRestController, "_jwtSignatureValidator",
			new JWTSignatureValidator());
		ReflectionTestUtils.setField(
			_dxpEnvironmentsRestController, "_commerceProductService",
			_commerceProductService);
		ReflectionTestUtils.setField(
			_dxpEnvironmentsRestController,
			"_commerceProductVirtualSettingsService",
			_commerceProductVirtualSettingsService);
		ReflectionTestUtils.setField(
			_dxpEnvironmentsRestController, "_commerceSkuService",
			_commerceSkuService);
		ReflectionTestUtils.setField(
			_dxpEnvironmentsRestController, "_entitlementService",
			_entitlementService);
		ReflectionTestUtils.setField(
			_dxpEnvironmentsRestController, "_environmentActivationPermission",
			_environmentActivationPermission);
		ReflectionTestUtils.setField(
			_dxpEnvironmentsRestController, "_environmentQuotaService",
			environmentQuotaService);
		ReflectionTestUtils.setField(
			_dxpEnvironmentsRestController, "_environmentService",
			_environmentService);
		ReflectionTestUtils.setField(
			_dxpEnvironmentsRestController, "_keyedLock", new KeyedLock());
		ReflectionTestUtils.setField(
			_dxpEnvironmentsRestController, "_licenseKeyExporter",
			_licenseKeyExporter);
		ReflectionTestUtils.setField(
			_dxpEnvironmentsRestController, "_licenseKeyGenerator",
			_licenseKeyGenerator);

		_keyPair = _generateKeyPair();

		RequestContextHolder.setRequestAttributes(
			new ServletRequestAttributes(new MockHttpServletRequest()));
	}

	@AfterEach
	public void tearDown() {
		RequestContextHolder.resetRequestAttributes();
	}

	@Test
	public void testGetProjectsDXPActivationCodes() throws Exception {
		_mockDXPEntitlement(EnvironmentConstants.TYPE_PRODUCTION);

		Mockito.when(
			_environmentService.getDXPEnvironments(
				_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			List.of(_createPendingEnvironment())
		);

		ResponseEntity<String> responseEntity =
			_dxpEnvironmentsRestController.getProjectsDXPActivationCodes(
				null, _PROJECT_EXTERNAL_REFERENCE_CODE);

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		JSONArray environmentTypesJSONArray = jsonObject.getJSONArray(
			"environmentTypes");

		Assertions.assertEquals(3, environmentTypesJSONArray.length());

		for (int i = 0; i < environmentTypesJSONArray.length(); i++) {
			JSONObject environmentTypeJSONObject =
				environmentTypesJSONArray.getJSONObject(i);

			Assertions.assertEquals(
				1, environmentTypeJSONObject.getInt("maxClusterNodes"));

			JSONArray activationCodesJSONArray =
				environmentTypeJSONObject.getJSONArray("activationCodes");

			if (Objects.equals(
					EnvironmentConstants.TYPE_PRODUCTION,
					environmentTypeJSONObject.getString("type"))) {

				Assertions.assertEquals(1, activationCodesJSONArray.length());

				JSONObject activationCodeJSONObject =
					activationCodesJSONArray.getJSONObject(0);

				Assertions.assertEquals(
					_ACTIVATION_CODE,
					activationCodeJSONObject.getString("activationCode"));
				Assertions.assertFalse(
					activationCodeJSONObject.has("lastHeartbeatAt"));
				Assertions.assertFalse(
					activationCodeJSONObject.has("productVersion"));

				Assertions.assertEquals(
					0, environmentTypeJSONObject.getInt("availableCount"));
				Assertions.assertEquals(
					"2030-01-01T00:00:00Z",
					environmentTypeJSONObject.getString("endDate"));
				Assertions.assertEquals(
					"2026-01-01T00:00:00Z",
					environmentTypeJSONObject.getString("startDate"));
			}
			else {
				Assertions.assertEquals(0, activationCodesJSONArray.length());
				Assertions.assertFalse(
					environmentTypeJSONObject.has("endDate"));
				Assertions.assertFalse(
					environmentTypeJSONObject.has("startDate"));
				Assertions.assertEquals(
					0, environmentTypeJSONObject.getInt("totalCount"));
			}
		}
	}

	@Test
	public void testGetProjectsDXPActivationCodesAsAdmin() throws Exception {
		_mockDXPEntitlement(EnvironmentConstants.TYPE_PRODUCTION);

		Mockito.when(
			_adminPermission.contains((Jwt)null)
		).thenReturn(
			true
		);

		Mockito.when(
			_environmentService.getDXPEnvironments(
				_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			List.of(
				new Environment(
					_createEnvironmentJSONObject(
					).put(
						"activationStatus",
						EnvironmentConstants.ACTIVATION_STATUS_ACTIVE
					).put(
						"lastHeartbeatAt", "2026-11-19T20:00:00Z"
					).put(
						"productVersion", "2027.Q1.0"
					)))
		);

		ResponseEntity<String> responseEntity =
			_dxpEnvironmentsRestController.getProjectsDXPActivationCodes(
				null, _PROJECT_EXTERNAL_REFERENCE_CODE);

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		JSONArray environmentTypesJSONArray = jsonObject.getJSONArray(
			"environmentTypes");

		for (int i = 0; i < environmentTypesJSONArray.length(); i++) {
			JSONObject environmentTypeJSONObject =
				environmentTypesJSONArray.getJSONObject(i);

			if (!Objects.equals(
					EnvironmentConstants.TYPE_PRODUCTION,
					environmentTypeJSONObject.getString("type"))) {

				continue;
			}

			JSONObject activationCodeJSONObject =
				environmentTypeJSONObject.getJSONArray(
					"activationCodes"
				).getJSONObject(
					0
				);

			Assertions.assertEquals(
				"2026-11-19T20:00:00Z",
				activationCodeJSONObject.getString("lastHeartbeatAt"));
			Assertions.assertEquals(
				"2027.Q1.0",
				activationCodeJSONObject.getString("productVersion"));
		}
	}

	@Test
	public void testHandleException() throws Exception {
		ExceptionHandlerMethodResolver exceptionHandlerMethodResolver =
			new ExceptionHandlerMethodResolver(
				DXPEnvironmentsRestController.class);

		for (PrincipalException principalException :
				List.of(
					new ExpiredActivationTokenException(),
					new InvalidSignatureException())) {

			Method method =
				exceptionHandlerMethodResolver.resolveMethodByThrowable(
					principalException);

			Assertions.assertEquals(
				DXPEnvironmentsRestController.class,
				method.getDeclaringClass());

			ResponseEntity<?> responseEntity =
				_dxpEnvironmentsRestController.handleException(
					principalException);

			Assertions.assertEquals(
				HttpStatus.UNAUTHORIZED, responseEntity.getStatusCode());

			ProblemDetail problemDetail =
				(ProblemDetail)responseEntity.getBody();

			Assertions.assertEquals(
				principalException.getMessage(), problemDetail.getDetail());
		}

		Method method = exceptionHandlerMethodResolver.resolveMethodByThrowable(
			new PrincipalException());

		Assertions.assertEquals(
			OneBaseRestController.class, method.getDeclaringClass());
	}

	@Test
	public void testPatchProjectsDXPEnvironmentsActive() throws Exception {
		_mockEnvironmentByExternalReferenceCode(
			_createActiveEnvironment(
				EnvironmentConstants.ACTIVATION_MODE_ONLINE,
				_getPublicKey(_keyPair)));

		ResponseEntity<?> responseEntity =
			_dxpEnvironmentsRestController.patchProjectsDXPEnvironmentsActive(
				null, _ENVIRONMENT_EXTERNAL_REFERENCE_CODE,
				_PROJECT_EXTERNAL_REFERENCE_CODE, "{\"active\": false}");

		Assertions.assertEquals(
			HttpStatus.NO_CONTENT, responseEntity.getStatusCode());

		Mockito.verify(
			_environmentService
		).updateEnvironmentActivationStatus(
			EnvironmentConstants.ACTIVATION_STATUS_INACTIVE, null,
			_ENVIRONMENT_ID
		);
	}

	@Test
	public void testPatchProjectsDXPEnvironmentsActiveWithActiveTrue()
		throws Exception {

		_mockEnvironmentByExternalReferenceCode(
			_createDeactivatedEnvironment(
				EnvironmentConstants.ACTIVATION_MODE_ONLINE,
				_getPublicKey(_keyPair)));

		ResponseEntity<?> responseEntity =
			_dxpEnvironmentsRestController.patchProjectsDXPEnvironmentsActive(
				null, _ENVIRONMENT_EXTERNAL_REFERENCE_CODE,
				_PROJECT_EXTERNAL_REFERENCE_CODE, "{\"active\": true}");

		Assertions.assertEquals(
			HttpStatus.BAD_REQUEST, responseEntity.getStatusCode());

		_verifyNotDeactivated();
	}

	@Test
	public void testPatchProjectsDXPEnvironmentsActiveWithAnotherProject()
		throws Exception {

		_mockEnvironmentByExternalReferenceCode(
			new Environment(
				_createEnvironmentJSONObject(
				).put(
					"activationStatus",
					EnvironmentConstants.ACTIVATION_STATUS_ACTIVE
				).put(
					"r_projectToEnvironment_c_projectERC", "ANOTHER-PROJECT"
				)));

		ResponseEntity<?> responseEntity =
			_dxpEnvironmentsRestController.patchProjectsDXPEnvironmentsActive(
				null, _ENVIRONMENT_EXTERNAL_REFERENCE_CODE,
				_PROJECT_EXTERNAL_REFERENCE_CODE, "{\"active\": false}");

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND, responseEntity.getStatusCode());

		_verifyNotDeactivated();
	}

	@Test
	public void testPostDXPInstallationsActivation() throws Exception {
		_mockEnvironmentByActivationCode(_createPendingEnvironment());

		ResponseEntity<?> responseEntity =
			_dxpEnvironmentsRestController.postDXPInstallationsActivation(
				_INSTALLATION_ID, _createActivationBody(_keyPair, _keyPair));

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		Mockito.verify(
			_environmentService
		).updateDXPEnvironmentActivation(
			EnvironmentConstants.ACTIVATION_MODE_ONLINE, _ENVIRONMENT_ID,
			_INSTALLATION_ID, _getPublicKey(_keyPair)
		);
	}

	@Test
	public void testPostDXPInstallationsActivationWithAnotherKeyPair()
		throws Exception {

		_mockEnvironmentByActivationCode(_createPendingEnvironment());

		Assertions.assertThrows(
			InvalidSignatureException.class,
			() -> _dxpEnvironmentsRestController.postDXPInstallationsActivation(
				_INSTALLATION_ID,
				_createActivationBody(_keyPair, _generateKeyPair())));

		_verifyNotActivated();
	}

	@Test
	public void testPostDXPInstallationsActivationWithDeactivatedActivationCode()
		throws Exception {

		_mockEnvironmentByActivationCode(
			_createDeactivatedEnvironment(
				EnvironmentConstants.ACTIVATION_MODE_ONLINE,
				_getPublicKey(_keyPair)));

		ResponseEntity<?> responseEntity =
			_dxpEnvironmentsRestController.postDXPInstallationsActivation(
				_INSTALLATION_ID, _createActivationBody(_keyPair, _keyPair));

		Assertions.assertEquals(
			HttpStatus.CONFLICT, responseEntity.getStatusCode());

		_verifyNotActivated();
	}

	@Test
	public void testPostDXPInstallationsActivationWithExpiredJWT()
		throws Exception {

		_mockEnvironmentByActivationCode(_createPendingEnvironment());

		String body = _createSignedJWT(
			_keyPair,
			new JWTClaimsSet.Builder(
			).claim(
				"activationCode", _ACTIVATION_CODE
			).claim(
				"installationId", _INSTALLATION_ID
			).claim(
				"publicKey", _getPublicKey(_keyPair)
			).expirationTime(
				new Date(System.currentTimeMillis() - 60000)
			).build());

		Assertions.assertThrows(
			ExpiredActivationTokenException.class,
			() -> _dxpEnvironmentsRestController.postDXPInstallationsActivation(
				_INSTALLATION_ID, body));

		_verifyNotActivated();
	}

	@Test
	public void testPostDXPInstallationsActivationWithInstallationActivated()
		throws Exception {

		_mockEnvironmentByActivationCode(_createPendingEnvironment());

		Mockito.when(
			_environmentService.getDXPEnvironmentsByInstallationId(
				EnvironmentConstants.ACTIVATION_MODE_ONLINE,
				EnvironmentConstants.ACTIVATION_STATUS_ACTIVE, _INSTALLATION_ID)
		).thenReturn(
			List.of(
				_createActiveEnvironment(
					EnvironmentConstants.ACTIVATION_MODE_ONLINE,
					_getPublicKey(_keyPair)))
		);

		ResponseEntity<?> responseEntity =
			_dxpEnvironmentsRestController.postDXPInstallationsActivation(
				_INSTALLATION_ID, _createActivationBody(_keyPair, _keyPair));

		Assertions.assertEquals(
			HttpStatus.CONFLICT, responseEntity.getStatusCode());

		_verifyNotActivated();
	}

	@Test
	public void testPostDXPInstallationsActivationWithUnknownActivationCode()
		throws Exception {

		ResponseEntity<?> responseEntity =
			_dxpEnvironmentsRestController.postDXPInstallationsActivation(
				_INSTALLATION_ID, _createActivationBody(_keyPair, _keyPair));

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND, responseEntity.getStatusCode());
	}

	@Test
	public void testPostDXPInstallationsActivationWithUsedActivationCode()
		throws Exception {

		_mockEnvironmentByActivationCode(
			_createActiveEnvironment(
				EnvironmentConstants.ACTIVATION_MODE_ONLINE,
				_getPublicKey(_keyPair)));

		ResponseEntity<?> responseEntity =
			_dxpEnvironmentsRestController.postDXPInstallationsActivation(
				_INSTALLATION_ID, _createActivationBody(_keyPair, _keyPair));

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		KeyPair keyPair = _generateKeyPair();

		responseEntity =
			_dxpEnvironmentsRestController.postDXPInstallationsActivation(
				_INSTALLATION_ID, _createActivationBody(keyPair, keyPair));

		Assertions.assertEquals(
			HttpStatus.CONFLICT, responseEntity.getStatusCode());

		_verifyNotActivated();
	}

	@Test
	public void testPostDXPInstallationsActivationWithAnotherInstallationId()
		throws Exception {

		_mockEnvironmentByActivationCode(_createPendingEnvironment());

		ResponseEntity<?> responseEntity =
			_dxpEnvironmentsRestController.postDXPInstallationsActivation(
				"ANOTHER-INSTALLATION",
				_createActivationBody(_keyPair, _keyPair));

		Assertions.assertEquals(
			HttpStatus.BAD_REQUEST, responseEntity.getStatusCode());

		_verifyNotActivated();
	}

	@Test
	public void testPostDXPInstallationsManifest() throws Exception {
		_mockActivatedInstallation(_keyPair);
		_mockAddOn();

		ResponseEntity<?> responseEntity =
			_dxpEnvironmentsRestController.postDXPInstallationsManifest(
				_INSTALLATION_ID, _createSignedBody(_keyPair, "2027.q1.0"));

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		JSONObject jsonObject = new JSONObject(
			(String)responseEntity.getBody());

		JSONArray addOnsJSONArray = jsonObject.getJSONArray("add-ons");

		Assertions.assertEquals(1, addOnsJSONArray.length());

		JSONObject addOnJSONObject = addOnsJSONArray.getJSONObject(0);

		Assertions.assertEquals(
			_APP_ENTRY_UUID, addOnJSONObject.getString("productId"));
		Assertions.assertTrue(
			addOnJSONObject.getString(
				"downloadURL"
			).endsWith(
				"/dxp/products/" + _PRODUCT_EXTERNAL_REFERENCE_CODE +
					"/virtual-entry/" + _VIRTUAL_ENTRY_ID + "/download"
			));

		String licenseXML = new String(
			Base64.getDecoder(
			).decode(
				jsonObject.getString("licenseXML")
			),
			StandardCharsets.UTF_8);

		Assertions.assertTrue(
			licenseXML.contains(
				"<installation-id>" + _INSTALLATION_ID + "</installation-id>"));
		Assertions.assertTrue(
			licenseXML.contains("<license-version>7</license-version>"));
		Assertions.assertTrue(
			licenseXML.contains("<product-id>" + _APP_ENTRY_UUID));

		String portalLicenseXML = _getPortalLicenseXML(licenseXML);

		Assertions.assertTrue(
			portalLicenseXML.contains(
				"<license-type>" + LicenseConstants.TYPE_PRODUCTION +
					"</license-type>"));
		Assertions.assertTrue(
			portalLicenseXML.contains(
				"<max-cluster-nodes>1</max-cluster-nodes>"));
		Assertions.assertTrue(
			portalLicenseXML.contains(
				"<instance-size>Sizing 3</instance-size>"));
		Assertions.assertFalse(portalLicenseXML.contains("<host-names>"));
		Assertions.assertFalse(portalLicenseXML.contains("<ip-addresses>"));
		Assertions.assertFalse(portalLicenseXML.contains("<mac-addresses>"));
		Assertions.assertFalse(portalLicenseXML.contains("<max-servers>"));

		String key = _getPortalLicenseKey(licenseXML);

		Assertions.assertEquals(
			_encryptPortalLicenseKey(licenseXML, _INSTALLATION_ID), key);
		Assertions.assertNotEquals(
			_encryptPortalLicenseKey(licenseXML, "ANOTHER-INSTALLATION"), key);

		Assertions.assertEquals(
			EnvironmentConstants.MANIFEST_STATUS_ACTIVE,
			jsonObject.getString("status"));

		Mockito.verify(
			_environmentService
		).updateDXPEnvironmentCheckIn(
			ArgumentMatchers.eq(_ENVIRONMENT_ID), ArgumentMatchers.any(),
			ArgumentMatchers.eq("2027.q1.0")
		);
	}

	@Test
	public void testPostDXPInstallationsManifestWithCheckInFailure()
		throws Exception {

		_mockActivatedInstallation(_keyPair);

		Mockito.doThrow(
			new RuntimeException()
		).when(
			_environmentService
		).updateDXPEnvironmentCheckIn(
			ArgumentMatchers.anyLong(), ArgumentMatchers.any(),
			ArgumentMatchers.anyString()
		);

		ResponseEntity<?> responseEntity =
			_dxpEnvironmentsRestController.postDXPInstallationsManifest(
				_INSTALLATION_ID, _createSignedBody(_keyPair, "2027.q1.0"));

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		JSONObject jsonObject = new JSONObject(
			(String)responseEntity.getBody());

		Assertions.assertEquals(
			EnvironmentConstants.MANIFEST_STATUS_ACTIVE,
			jsonObject.getString("status"));
	}

	@Test
	public void testPostDXPInstallationsManifestWithBackupEntitlement()
		throws Exception {

		Mockito.when(
			_environmentService.getDXPEnvironmentsByInstallationId(
				EnvironmentConstants.ACTIVATION_MODE_ONLINE,
				EnvironmentConstants.ACTIVATION_STATUS_ACTIVE, _INSTALLATION_ID)
		).thenReturn(
			List.of(
				new Environment(
					_createEnvironmentJSONObject(
					).put(
						"activationMode",
						EnvironmentConstants.ACTIVATION_MODE_ONLINE
					).put(
						"activationStatus",
						EnvironmentConstants.ACTIVATION_STATUS_ACTIVE
					).put(
						"externalEnvironmentId", _INSTALLATION_ID
					).put(
						"publicKey", _getPublicKey(_keyPair)
					).put(
						"type", EnvironmentConstants.TYPE_BACKUP
					)))
		);

		_mockDXPEntitlement(EnvironmentConstants.TYPE_BACKUP);

		ResponseEntity<?> responseEntity =
			_dxpEnvironmentsRestController.postDXPInstallationsManifest(
				_INSTALLATION_ID, _createSignedBody(_keyPair, "2027.q1.0"));

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		JSONObject jsonObject = new JSONObject(
			(String)responseEntity.getBody());

		String licenseXML = _getPortalLicenseXML(
			new String(
				Base64.getDecoder(
				).decode(
					jsonObject.getString("licenseXML")
				),
				StandardCharsets.UTF_8));

		Assertions.assertTrue(
			licenseXML.contains("<license-name>DXP Backup</license-name>"));
		Assertions.assertTrue(
			licenseXML.contains("<product-name>DXP Backup</product-name>"));
	}

	@Test
	public void testPostDXPInstallationsManifestWithAnotherInstallationId()
		throws Exception {

		_mockActivatedInstallation(_keyPair);

		Mockito.when(
			_environmentService.getDXPEnvironmentsByInstallationId(
				EnvironmentConstants.ACTIVATION_MODE_ONLINE,
				EnvironmentConstants.ACTIVATION_STATUS_ACTIVE,
				"ANOTHER-INSTALLATION")
		).thenReturn(
			List.of(
				_createActiveEnvironment(
					EnvironmentConstants.ACTIVATION_MODE_ONLINE,
					_getPublicKey(_keyPair)))
		);

		ResponseEntity<?> responseEntity =
			_dxpEnvironmentsRestController.postDXPInstallationsManifest(
				"ANOTHER-INSTALLATION",
				_createSignedBody(_keyPair, "2027.q1.0"));

		Assertions.assertEquals(
			HttpStatus.BAD_REQUEST, responseEntity.getStatusCode());
	}

	@Test
	public void testPostDXPInstallationsManifestWithAnotherKeyPair()
		throws Exception {

		_mockActivatedInstallation(_keyPair);

		Assertions.assertThrows(
			InvalidSignatureException.class,
			() -> _dxpEnvironmentsRestController.postDXPInstallationsManifest(
				_INSTALLATION_ID,
				_createSignedBody(_generateKeyPair(), "2027.q1.0")));
	}

	@Test
	public void testPostDXPInstallationsManifestWithDeactivatedEnvironment()
		throws Exception {

		_mockDXPEntitlement(EnvironmentConstants.TYPE_PRODUCTION);

		Mockito.when(
			_environmentService.getDXPEnvironmentsByInstallationId(
				EnvironmentConstants.ACTIVATION_MODE_ONLINE,
				EnvironmentConstants.ACTIVATION_STATUS_INACTIVE,
				_INSTALLATION_ID)
		).thenReturn(
			List.of(
				_createDeactivatedEnvironment(
					EnvironmentConstants.ACTIVATION_MODE_ONLINE,
					_getPublicKey(_keyPair)))
		);

		ResponseEntity<?> responseEntity =
			_dxpEnvironmentsRestController.postDXPInstallationsManifest(
				_INSTALLATION_ID, _createSignedBody(_keyPair, "2027.q1.0"));

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		JSONObject jsonObject = new JSONObject(
			(String)responseEntity.getBody());

		Assertions.assertEquals(
			EntitlementConstants.TERMINATION_STATUS_TERMINATED,
			jsonObject.getString("dxpTerminationStatus"));
		Assertions.assertEquals(
			0,
			jsonObject.getJSONArray(
				"add-ons"
			).length());
		Assertions.assertFalse(jsonObject.has("licenseXML"));
		Assertions.assertEquals(
			EnvironmentConstants.MANIFEST_STATUS_INACTIVE,
			jsonObject.getString("status"));

		Mockito.verify(
			_environmentService
		).updateDXPEnvironmentCheckIn(
			ArgumentMatchers.eq(_ENVIRONMENT_ID), ArgumentMatchers.any(),
			ArgumentMatchers.eq("2027.q1.0")
		);
	}

	@Test
	public void testPostDXPInstallationsManifestWithInstallationIdCollision()
		throws Exception {

		KeyPair keyPair = _generateKeyPair();

		Environment environment = _createActiveEnvironment(
			EnvironmentConstants.ACTIVATION_MODE_ONLINE,
			_getPublicKey(_keyPair));

		Mockito.when(
			_environmentService.getDXPEnvironmentsByInstallationId(
				EnvironmentConstants.ACTIVATION_MODE_ONLINE,
				EnvironmentConstants.ACTIVATION_STATUS_ACTIVE, _INSTALLATION_ID)
		).thenReturn(
			List.of(
				new Environment(
					new JSONObject(
					).put(
						"activationMode",
						EnvironmentConstants.ACTIVATION_MODE_ONLINE
					).put(
						"activationStatus",
						EnvironmentConstants.ACTIVATION_STATUS_ACTIVE
					).put(
						"externalEnvironmentId", _INSTALLATION_ID
					).put(
						"externalReferenceCode", "OTHER"
					).put(
						"id", 1L
					).put(
						"publicKey", _getPublicKey(keyPair)
					).put(
						"r_projectToEnvironment_c_projectERC", "OTHER-PROJECT"
					).put(
						"type", EnvironmentConstants.TYPE_PRODUCTION
					)),
				environment)
		);

		_mockDXPEntitlement(EnvironmentConstants.TYPE_PRODUCTION);

		ResponseEntity<?> responseEntity =
			_dxpEnvironmentsRestController.postDXPInstallationsManifest(
				_INSTALLATION_ID, _createSignedBody(_keyPair, "2027.q1.0"));

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		Mockito.verify(
			_entitlementService
		).getActiveEntitlements(
			_PROJECT_EXTERNAL_REFERENCE_CODE
		);

		Mockito.verify(
			_entitlementService, Mockito.never()
		).getActiveEntitlements(
			"OTHER-PROJECT"
		);
	}

	@Test
	public void testPostDXPInstallationsManifestWithLargerCurrentSizing()
		throws Exception {

		_mockActivatedInstallation(_keyPair);

		Mockito.when(
			_entitlementService.getActiveEntitlements(
				_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			List.of(
				_createDXPEntitlement(EnvironmentConstants.TYPE_PRODUCTION),
				_createDXPEntitlement(
					"2028-01-01T00:00:00Z", "liferay-self-hosted-prod-sizing-5",
					EnvironmentConstants.TYPE_PRODUCTION),
				_createDXPEntitlement(
					"2031-01-01T00:00:00Z",
					"liferay-self-hosted-nonprod-sizing-8",
					EnvironmentConstants.TYPE_NONPRODUCTION))
		);

		ResponseEntity<?> responseEntity =
			_dxpEnvironmentsRestController.postDXPInstallationsManifest(
				_INSTALLATION_ID, _createSignedBody(_keyPair, "2027.q1.0"));

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		JSONObject jsonObject = new JSONObject(
			(String)responseEntity.getBody());

		String licenseXML = new String(
			Base64.getDecoder(
			).decode(
				jsonObject.getString("licenseXML")
			),
			StandardCharsets.UTF_8);

		Assertions.assertTrue(
			licenseXML.contains("<instance-size>Sizing 5</instance-size>"));
		Assertions.assertTrue(
			licenseXML.contains("<expiration-date>Tuesday, January 1, 2030"));
	}

	@Test
	public void testPostDXPInstallationsManifestWithNonproductionEntitlement()
		throws Exception {

		_mockActivatedInstallation(_keyPair);
		_mockDXPEntitlement(EnvironmentConstants.TYPE_NONPRODUCTION);

		ResponseEntity<?> responseEntity =
			_dxpEnvironmentsRestController.postDXPInstallationsManifest(
				_INSTALLATION_ID, _createSignedBody(_keyPair, "2027.q1.0"));

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		JSONObject jsonObject = new JSONObject(
			(String)responseEntity.getBody());

		Assertions.assertEquals(
			0,
			jsonObject.getJSONArray(
				"add-ons"
			).length());
		Assertions.assertFalse(jsonObject.has("dxpTerminationStatus"));
		Assertions.assertFalse(jsonObject.has("licenseXML"));
		Assertions.assertEquals(
			EnvironmentConstants.MANIFEST_STATUS_INACTIVE,
			jsonObject.getString("status"));
	}

	@Test
	public void testPostDXPInstallationsManifestWithUnsupportedVersion()
		throws Exception {

		_mockActivatedInstallation(_keyPair);

		for (String dxpVersion :
				new String[] {"2026.q4.1", "7.4.13", StringPool.BLANK}) {

			ResponseEntity<?> responseEntity =
				_dxpEnvironmentsRestController.postDXPInstallationsManifest(
					_INSTALLATION_ID, _createSignedBody(_keyPair, dxpVersion));

			Assertions.assertEquals(
				HttpStatus.BAD_REQUEST, responseEntity.getStatusCode(),
				dxpVersion);
		}
	}

	@Test
	public void testPostDXPProductsVirtualEntryDownload() throws Exception {
		_mockActivatedInstallation(_keyPair);
		_mockAddOn();

		ResponseEntity<?> responseEntity =
			_dxpEnvironmentsRestController.postDXPProductsVirtualEntryDownload(
				_PRODUCT_EXTERNAL_REFERENCE_CODE, _VIRTUAL_ENTRY_ID,
				_createSignedBody(_keyPair, null));

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		ByteArrayOutputStream byteArrayOutputStream =
			new ByteArrayOutputStream();

		InputStreamResource inputStreamResource =
			(InputStreamResource)responseEntity.getBody();

		try (InputStream inputStream = inputStreamResource.getInputStream()) {
			inputStream.transferTo(byteArrayOutputStream);
		}

		Assertions.assertEquals(
			"lpkg", byteArrayOutputStream.toString(StandardCharsets.UTF_8));

		String body = _createSignedBody(_generateKeyPair(), null);

		Assertions.assertThrows(
			InvalidSignatureException.class,
			() ->
				_dxpEnvironmentsRestController.
					postDXPProductsVirtualEntryDownload(
						_PRODUCT_EXTERNAL_REFERENCE_CODE, _VIRTUAL_ENTRY_ID,
						body));
	}

	@Test
	public void testPostProjectsDXPActivationCodes() throws Exception {
		_mockDXPEntitlement(EnvironmentConstants.TYPE_PRODUCTION);

		Mockito.when(
			_environmentService.addDXPEnvironment(
				ArgumentMatchers.eq(_ACCOUNT_ID), ArgumentMatchers.anyString(),
				ArgumentMatchers.eq(_PROJECT_EXTERNAL_REFERENCE_CODE),
				ArgumentMatchers.eq(EnvironmentConstants.TYPE_PRODUCTION))
		).thenReturn(
			_createPendingEnvironment()
		);

		ResponseEntity<?> responseEntity =
			_dxpEnvironmentsRestController.postProjectsDXPActivationCodes(
				null, _PROJECT_EXTERNAL_REFERENCE_CODE,
				_createTypeJSON(EnvironmentConstants.TYPE_PRODUCTION));

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		Mockito.when(
			_environmentService.getDXPEnvironments(
				_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			List.of(_createPendingEnvironment())
		);

		responseEntity =
			_dxpEnvironmentsRestController.postProjectsDXPActivationCodes(
				null, _PROJECT_EXTERNAL_REFERENCE_CODE,
				_createTypeJSON(EnvironmentConstants.TYPE_PRODUCTION));

		Assertions.assertEquals(
			HttpStatus.UNPROCESSABLE_ENTITY, responseEntity.getStatusCode());

		responseEntity =
			_dxpEnvironmentsRestController.postProjectsDXPActivationCodes(
				null, _PROJECT_EXTERNAL_REFERENCE_CODE,
				_createTypeJSON(EnvironmentConstants.TYPE_NONPRODUCTION));

		Assertions.assertEquals(
			HttpStatus.UNPROCESSABLE_ENTITY, responseEntity.getStatusCode());

		responseEntity =
			_dxpEnvironmentsRestController.postProjectsDXPActivationCodes(
				null, _PROJECT_EXTERNAL_REFERENCE_CODE,
				_createTypeJSON(EnvironmentConstants.TYPE_UAT));

		Assertions.assertEquals(
			HttpStatus.BAD_REQUEST, responseEntity.getStatusCode());

		Mockito.verify(
			_environmentService
		).addDXPEnvironment(
			ArgumentMatchers.anyLong(), ArgumentMatchers.anyString(),
			ArgumentMatchers.anyString(), ArgumentMatchers.anyString()
		);
	}

	@Test
	public void testPostProjectsDXPOfflineActivationBundle() throws Exception {
		_mockEnvironmentByActivationCode(_createPendingEnvironment());
		_mockAddOn();

		ResponseEntity<?> responseEntity =
			_postProjectsDXPOfflineActivationBundle(
				_createActivationToken(_keyPair, _keyPair));

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		String installationId = _getInstallationId(_keyPair);

		Mockito.verify(
			_environmentService
		).updateDXPEnvironmentActivation(
			EnvironmentConstants.ACTIVATION_MODE_OFFLINE, _ENVIRONMENT_ID,
			installationId, _getPublicKey(_keyPair)
		);

		Map<String, String> zipEntries = _readZipEntries(responseEntity);

		Assertions.assertEquals(
			"lpkg", zipEntries.get("add-ons/" + _APP_ENTRY_UUID + ".lpkg"));

		JSONObject manifestJSONObject = new JSONObject(
			zipEntries.get("manifest.json"));

		String licenseXML = new String(
			Base64.getDecoder(
			).decode(
				manifestJSONObject.getString("licenseXML")
			),
			StandardCharsets.UTF_8);

		Assertions.assertTrue(
			licenseXML.contains(
				"<installation-id>" + installationId + "</installation-id>"));
	}

	@Test
	public void testPostProjectsDXPOfflineActivationBundleWithAnotherInstallationID()
		throws Exception {

		_mockEnvironmentByActivationCode(_createPendingEnvironment());

		Assertions.assertThrows(
			InvalidSignatureException.class,
			() -> _postProjectsDXPOfflineActivationBundle(
				_createSignedJWT(
					_keyPair,
					new JWTClaimsSet.Builder(
					).claim(
						"installationId", _INSTALLATION_ID
					).claim(
						"publicKey", _getPublicKey(_keyPair)
					).build())));

		_verifyNotActivated();
	}

	@Test
	public void testPostProjectsDXPOfflineActivationBundleWithAnotherKeyPair()
		throws Exception {

		_mockEnvironmentByActivationCode(_createPendingEnvironment());

		Assertions.assertThrows(
			InvalidSignatureException.class,
			() -> _postProjectsDXPOfflineActivationBundle(
				_createActivationToken(_keyPair, _generateKeyPair())));

		_verifyNotActivated();
	}

	@Test
	public void testPostProjectsDXPOfflineActivationBundleWithInstallationActivated()
		throws Exception {

		_mockEnvironmentByActivationCode(_createPendingEnvironment());

		Mockito.when(
			_environmentService.getDXPEnvironmentsByInstallationId(
				EnvironmentConstants.ACTIVATION_MODE_ONLINE,
				EnvironmentConstants.ACTIVATION_STATUS_ACTIVE,
				_getInstallationId(_keyPair))
		).thenReturn(
			List.of(
				_createActiveEnvironment(
					EnvironmentConstants.ACTIVATION_MODE_ONLINE, _keyPair))
		);

		ResponseEntity<?> responseEntity =
			_postProjectsDXPOfflineActivationBundle(
				_createActivationToken(_keyPair, _keyPair));

		Assertions.assertEquals(
			HttpStatus.CONFLICT, responseEntity.getStatusCode());

		_verifyNotActivated();
	}

	@Test
	public void testPostProjectsDXPOfflineActivationBundleWithInvalidToken()
		throws Exception {

		_mockEnvironmentByActivationCode(_createPendingEnvironment());

		Assertions.assertThrows(
			InvalidSignatureException.class,
			() -> _postProjectsDXPOfflineActivationBundle("not.a.token"));

		ResponseEntity<?> responseEntity =
			_postProjectsDXPOfflineActivationBundle(StringPool.BLANK);

		Assertions.assertEquals(
			HttpStatus.BAD_REQUEST, responseEntity.getStatusCode());

		_verifyNotActivated();
	}

	@Test
	public void testPostProjectsDXPOfflineActivationBundleWithUsedActivationCode()
		throws Exception {

		_mockEnvironmentByActivationCode(
			_createActiveEnvironment(
				EnvironmentConstants.ACTIVATION_MODE_OFFLINE, _keyPair));
		_mockAddOn();

		ResponseEntity<?> responseEntity =
			_postProjectsDXPOfflineActivationBundle(
				_createActivationToken(_keyPair, _keyPair));

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		Map<String, String> zipEntries = _readZipEntries(responseEntity);

		Assertions.assertTrue(zipEntries.containsKey("manifest.json"));

		KeyPair keyPair = _generateKeyPair();

		responseEntity = _postProjectsDXPOfflineActivationBundle(
			_createActivationToken(keyPair, keyPair));

		Assertions.assertEquals(
			HttpStatus.CONFLICT, responseEntity.getStatusCode());

		_verifyNotActivated();
	}

	private String _createActivationBody(
			KeyPair publicKeyPair, KeyPair signingKeyPair)
		throws Exception {

		return _createSignedJWT(
			signingKeyPair,
			new JWTClaimsSet.Builder(
			).claim(
				"activationCode", _ACTIVATION_CODE
			).claim(
				"installationId", _INSTALLATION_ID
			).claim(
				"publicKey", _getPublicKey(publicKeyPair)
			).expirationTime(
				_getExpirationDate()
			).build());
	}

	private String _createActivationToken(
			KeyPair publicKeyPair, KeyPair signingKeyPair)
		throws Exception {

		return _createSignedJWT(
			signingKeyPair,
			new JWTClaimsSet.Builder(
			).claim(
				"installationId", _getInstallationId(publicKeyPair)
			).claim(
				"publicKey", _getPublicKey(publicKeyPair)
			).build());
	}

	private Environment _createActiveEnvironment(
		String activationMode, String publicKey) {

		return new Environment(
			_createEnvironmentJSONObject(
			).put(
				"activationMode", activationMode
			).put(
				"activationStatus",
				EnvironmentConstants.ACTIVATION_STATUS_ACTIVE
			).put(
				"externalEnvironmentId", _INSTALLATION_ID
			).put(
				"publicKey", publicKey
			));
	}

	private Environment _createActiveEnvironment(
		String activationMode, KeyPair keyPair) {

		return new Environment(
			_createEnvironmentJSONObject(
			).put(
				"activationMode", activationMode
			).put(
				"activationStatus",
				EnvironmentConstants.ACTIVATION_STATUS_ACTIVE
			).put(
				"externalEnvironmentId", _getInstallationId(keyPair)
			).put(
				"publicKey", _getPublicKey(keyPair)
			));
	}

	private Environment _createDeactivatedEnvironment(
		String activationMode, String publicKey) {

		return new Environment(
			_createEnvironmentJSONObject(
			).put(
				"activationMode", activationMode
			).put(
				"activationStatus",
				EnvironmentConstants.ACTIVATION_STATUS_INACTIVE
			).put(
				"externalEnvironmentId", _INSTALLATION_ID
			).put(
				"publicKey", publicKey
			));
	}

	private Entitlement _createDXPEntitlement(String type) {
		return _createDXPEntitlement(
			"2030-01-01T00:00:00Z", "DXP Self-Hosted Production Sizing 3",
			type);
	}

	private Entitlement _createDXPEntitlement(
		String effectiveEndDate, String name, String type) {

		return new Entitlement(
			new JSONObject(
			).put(
				"effectiveEndDate", effectiveEndDate
			).put(
				"id", 1L
			).put(
				"licenseKeyFamily",
				LicenseKeyGenerationConstants.LICENSE_KEY_FAMILY_DXP
			).put(
				"licenseKeyType", type
			).put(
				"maxQuantity", 1
			).put(
				"name", name
			).put(
				"startDate", "2026-01-01T00:00:00Z"
			).put(
				"terminationStatus", "active"
			));
	}

	private JSONObject _createEnvironmentJSONObject() {
		return new JSONObject(
		).put(
			"activationCode", _ACTIVATION_CODE
		).put(
			"externalReferenceCode", _ENVIRONMENT_EXTERNAL_REFERENCE_CODE
		).put(
			"id", _ENVIRONMENT_ID
		).put(
			"offering", EnvironmentConstants.OFFERING_DXP
		).put(
			"r_accountEntryToEnvironment_accountEntryId", _ACCOUNT_ID
		).put(
			"r_projectToEnvironment_c_projectERC",
			_PROJECT_EXTERNAL_REFERENCE_CODE
		).put(
			"type", EnvironmentConstants.TYPE_PRODUCTION
		);
	}

	private Environment _createPendingEnvironment() {
		return new Environment(
			_createEnvironmentJSONObject().put(
				"activationStatus",
				EnvironmentConstants.ACTIVATION_STATUS_PENDING));
	}

	private String _createSignedBody(KeyPair keyPair, String dxpVersion)
		throws Exception {

		return _createSignedJWT(
			keyPair,
			new JWTClaimsSet.Builder(
			).claim(
				"dxpVersion", dxpVersion
			).claim(
				"installationId", _INSTALLATION_ID
			).expirationTime(
				_getExpirationDate()
			).build());
	}

	private String _createSignedJWT(KeyPair keyPair, JWTClaimsSet jwtClaimsSet)
		throws Exception {

		SignedJWT signedJWT = new SignedJWT(
			new JWSHeader(JWSAlgorithm.RS256), jwtClaimsSet);

		signedJWT.sign(new RSASSASigner(keyPair.getPrivate()));

		return signedJWT.serialize();
	}

	private String _createTypeJSON(String type) {
		return new JSONObject(
		).put(
			"type", type
		).toString();
	}

	private String _encryptPortalLicenseKey(
			String licenseXML, String installationId)
		throws Exception {

		Map<String, String> properties = _licenseKeyGenerator.getProperties(
			"Acme", "DXP Production", LicenseConstants.TYPE_PRODUCTION, 7,
			"DXP Production", LicenseConstants.PRODUCT_ID_PORTAL, "2027.Q1",
			_ENVIRONMENT_EXTERNAL_REFERENCE_CODE, 1, 0, 0, 0, 0, "Sizing 3",
			"DXP Self-Hosted", StringPool.BLANK, StringPool.BLANK,
			StringPool.BLANK, StringPool.BLANK, StringPool.BLANK,
			_getLicenseDate(licenseXML, "start-date"),
			_getLicenseDate(licenseXML, "expiration-date"));

		properties.put("installationId", installationId);

		return _licenseKeyGenerator.encrypt(properties);
	}

	private KeyPair _generateKeyPair() throws Exception {
		KeyPairGenerator keyPairGenerator = KeyPairGenerator.getInstance("RSA");

		keyPairGenerator.initialize(2048);

		return keyPairGenerator.generateKeyPair();
	}

	private Date _getExpirationDate() {
		return new Date(System.currentTimeMillis() + 300000);
	}

	private Date _getLicenseDate(String licenseXML, String elementName)
		throws Exception {

		Matcher matcher = Pattern.compile(
			"<" + elementName + ">(.*?)</" + elementName + ">"
		).matcher(
			_getPortalLicenseXML(licenseXML)
		);

		Assertions.assertTrue(matcher.find());

		DateFormat dateFormat = new SimpleDateFormat(
			"EEEE, MMMM d, yyyy h:mm:ss a z", Locale.US);

		return dateFormat.parse(matcher.group(1));
	}

	private String _getPortalLicenseKey(String licenseXML) {
		Matcher matcher = _keyPattern.matcher(_getPortalLicenseXML(licenseXML));

		Assertions.assertTrue(matcher.find());

		return matcher.group(1);
	}

	private String _getPortalLicenseXML(String licenseXML) {
		int index = licenseXML.indexOf(
			"<product-id>" + LicenseConstants.PRODUCT_ID_PORTAL);

		if (index < 0) {
			index = licenseXML.indexOf("<installation-id>");
		}

		return licenseXML.substring(
			licenseXML.lastIndexOf("<license>", index),
			licenseXML.indexOf("</license>", index));
	}

	private String _getInstallationId(KeyPair keyPair) {
		UUID uuid = UUID.nameUUIDFromBytes(
			keyPair.getPublic(
			).getEncoded());

		return StringUtil.toUpperCase(uuid.toString());
	}

	private String _getPublicKey(KeyPair keyPair) {
		Base64.Encoder encoder = Base64.getEncoder();

		return encoder.encodeToString(
			keyPair.getPublic(
			).getEncoded());
	}

	private void _mockActivatedInstallation(KeyPair keyPair) throws Exception {
		Mockito.when(
			_environmentService.getDXPEnvironmentsByInstallationId(
				EnvironmentConstants.ACTIVATION_MODE_ONLINE,
				EnvironmentConstants.ACTIVATION_STATUS_ACTIVE, _INSTALLATION_ID)
		).thenReturn(
			List.of(
				_createActiveEnvironment(
					EnvironmentConstants.ACTIVATION_MODE_ONLINE,
					_getPublicKey(keyPair)))
		);

		_mockDXPEntitlement(EnvironmentConstants.TYPE_PRODUCTION);
	}

	@SuppressWarnings("unchecked")
	private void _mockAddOn() throws Exception {
		Mockito.when(
			_entitlementService.getActiveEntitlements(
				_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			List.of(
				_createDXPEntitlement(EnvironmentConstants.TYPE_PRODUCTION),
				new Entitlement(
					new JSONObject(
					).put(
						"id", 2L
					).put(
						"skuExternalReferenceCode", _SKU_EXTERNAL_REFERENCE_CODE
					).put(
						"terminationStatus", "active"
					)))
		);

		Mockito.when(
			_commerceSkuService.fetchProductId(_SKU_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			_C_PRODUCT_ID
		);

		Product product = new Product();

		ProductSpecification productSpecification = new ProductSpecification();

		productSpecification.setSpecificationKey(
			() -> ProductSpecificationConstants.KEY_APP_ENTRY_UUID);
		productSpecification.setValue(() -> Map.of("en_US", _APP_ENTRY_UUID));

		product.setExternalReferenceCode(_PRODUCT_EXTERNAL_REFERENCE_CODE);
		product.setName(() -> Map.of("en_US", "Add On"));
		product.setProductId(_C_PRODUCT_ID);
		product.setProductSpecifications(
			() -> new ProductSpecification[] {productSpecification});

		Mockito.when(
			_commerceProductService.fetchProduct(_C_PRODUCT_ID)
		).thenReturn(
			product
		);

		Mockito.when(
			_commerceProductService.fetchProduct(
				_PRODUCT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			product
		);

		ProductVirtualSettingsFileEntry productVirtualSettingsFileEntry =
			new ProductVirtualSettingsFileEntry();

		productVirtualSettingsFileEntry.setId(_VIRTUAL_ENTRY_ID);
		productVirtualSettingsFileEntry.setSrc(_VIRTUAL_ENTRY_SRC);
		productVirtualSettingsFileEntry.setVersion("1.0.0");

		Mockito.when(
			_commerceProductVirtualSettingsService.
				fetchProductVirtualSettingsFileEntry(_C_PRODUCT_ID, "2027.Q1.0")
		).thenReturn(
			productVirtualSettingsFileEntry
		);

		Mockito.when(
			_commerceProductVirtualSettingsService.
				fetchProductVirtualSettingsFileEntry(
					_C_PRODUCT_ID, _VIRTUAL_ENTRY_ID)
		).thenReturn(
			productVirtualSettingsFileEntry
		);

		Mockito.when(
			_commerceProductVirtualSettingsService.getSHA256Checksum(
				_VIRTUAL_ENTRY_SRC)
		).thenReturn(
			"checksum"
		);

		HttpResponse<InputStream> httpResponse = Mockito.mock(
			HttpResponse.class);

		Mockito.when(
			httpResponse.body()
		).thenAnswer(
			invocation -> new ByteArrayInputStream(
				"lpkg".getBytes(StandardCharsets.UTF_8))
		);

		Mockito.when(
			_commerceProductVirtualSettingsService.getAssetHttpResponse(
				_VIRTUAL_ENTRY_SRC)
		).thenReturn(
			httpResponse
		);
	}

	private void _mockDXPEntitlement(String type) throws Exception {
		Mockito.when(
			_entitlementService.getActiveEntitlements(
				_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			List.of(_createDXPEntitlement(type))
		);
	}

	private void _mockEnvironmentByActivationCode(Environment environment)
		throws Exception {

		Mockito.when(
			_environmentService.fetchDXPEnvironmentByActivationCode(
				_ACTIVATION_CODE)
		).thenReturn(
			environment
		);
	}

	private void _mockEnvironmentByExternalReferenceCode(
			Environment environment)
		throws Exception {

		Mockito.when(
			_environmentService.fetchEnvironmentByExternalReferenceCode(
				_ENVIRONMENT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			environment
		);
	}

	private ResponseEntity<?> _postProjectsDXPOfflineActivationBundle(
			String activationToken)
		throws Exception {

		return _dxpEnvironmentsRestController.
			postProjectsDXPOfflineActivationBundle(
				null, _PROJECT_EXTERNAL_REFERENCE_CODE,
				new JSONObject(
				).put(
					"activationCode", _ACTIVATION_CODE
				).put(
					"activationToken", activationToken
				).put(
					"dxpVersion", "2027.Q1.0"
				).toString());
	}

	private Map<String, String> _readZipEntries(
			ResponseEntity<?> responseEntity)
		throws Exception {

		ByteArrayOutputStream byteArrayOutputStream =
			new ByteArrayOutputStream();

		InputStreamResource inputStreamResource =
			(InputStreamResource)responseEntity.getBody();

		try (InputStream inputStream = inputStreamResource.getInputStream()) {
			inputStream.transferTo(byteArrayOutputStream);
		}

		Map<String, String> zipEntries = new HashMap<>();

		try (ZipInputStream zipInputStream = new ZipInputStream(
				new ByteArrayInputStream(
					byteArrayOutputStream.toByteArray()))) {

			ZipEntry zipEntry = null;

			while ((zipEntry = zipInputStream.getNextEntry()) != null) {
				zipEntries.put(
					zipEntry.getName(),
					new String(
						zipInputStream.readAllBytes(), StandardCharsets.UTF_8));
			}
		}

		return zipEntries;
	}

	private void _verifyNotActivated() throws Exception {
		Mockito.verify(
			_environmentService, Mockito.never()
		).updateDXPEnvironmentActivation(
			ArgumentMatchers.anyString(), ArgumentMatchers.anyLong(),
			ArgumentMatchers.anyString(), ArgumentMatchers.any()
		);
	}

	private void _verifyNotDeactivated() throws Exception {
		Mockito.verify(
			_environmentService, Mockito.never()
		).updateEnvironmentActivationStatus(
			ArgumentMatchers.anyString(), ArgumentMatchers.any(),
			ArgumentMatchers.anyLong()
		);
	}

	private static final long _ACCOUNT_ID = 1000L;

	private static final String _ACTIVATION_CODE = "e9e3f0ef8e4d4a2e";

	private static final String _APP_ENTRY_UUID = "app-entry-uuid-1";

	private static final long _C_PRODUCT_ID = 3000L;

	private static final String _ENVIRONMENT_EXTERNAL_REFERENCE_CODE = "DXPE-1";

	private static final long _ENVIRONMENT_ID = 2000L;

	private static final String _INSTALLATION_ID =
		"C4CA4238-A0B9-3382-8DCC-509A6F75849B";

	private static final String _PRODUCT_EXTERNAL_REFERENCE_CODE =
		"PRDCT-ADDON";

	private static final String _PROJECT_EXTERNAL_REFERENCE_CODE = "PRJCT-005";

	private static final String _SKU_EXTERNAL_REFERENCE_CODE = "SKU-3000";

	private static final long _VIRTUAL_ENTRY_ID = 6000L;

	private static final Pattern _keyPattern = Pattern.compile(
		"<key>(.*?)</key>");

	private static final String _VIRTUAL_ENTRY_SRC =
		"https://cdn.example.com/add-ons/addon-1.0.lpkg?signature=1";

	private AccountService _accountService;
	private AdminPermission _adminPermission;
	private CommerceProductService _commerceProductService;
	private CommerceProductVirtualSettingsService
		_commerceProductVirtualSettingsService;
	private CommerceSkuService _commerceSkuService;
	private DXPEnvironmentsRestController _dxpEnvironmentsRestController;
	private EntitlementService _entitlementService;
	private EnvironmentActivationPermission _environmentActivationPermission;
	private EnvironmentService _environmentService;
	private KeyPair _keyPair;
	private LicenseKeyExporter _licenseKeyExporter;
	private LicenseKeyGenerator _licenseKeyGenerator;

}