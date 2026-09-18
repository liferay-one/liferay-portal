/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Account;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.one.constants.ClassNameConstants;
import com.liferay.one.constants.CommerceOrderConstants;
import com.liferay.one.exception.LicenseKeyDateException;
import com.liferay.one.exception.LicenseKeyProductPurchaseKeyException;
import com.liferay.one.exception.NoSuchLicenseKeyException;
import com.liferay.one.license.LicenseKeyCSVExporter;
import com.liferay.one.license.LicenseKeyEntitlementValidator;
import com.liferay.one.license.LicenseKeyExporter;
import com.liferay.one.license.LicenseKeyQuotaContext;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.LicenseKey;
import com.liferay.one.model.SubscriptionEntry;
import com.liferay.one.permission.AdminPermission;
import com.liferay.one.permission.LicenseKeyPermission;
import com.liferay.one.service.AccountService;
import com.liferay.one.service.CommerceOrderService;
import com.liferay.one.service.EntitlementService;
import com.liferay.one.service.LicenseKeyService;
import com.liferay.one.service.SubscriptionEntryService;
import com.liferay.one.util.AccountUtil;
import com.liferay.one.util.KeyedLock;
import com.liferay.one.util.LicenseKeyLockUtil;
import com.liferay.portal.kernel.security.permission.ActionKeys;

import java.time.Instant;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * @author Amos Fong
 */
@RequestMapping("/license-keys")
@RestController
public class LicenseKeysRestController extends OneBaseRestController {

	@DeleteMapping("/subscriptions")
	public void deleteSubscriptions(
			@AuthenticationPrincipal Jwt jwt,
			@RequestParam("licenseKeyIds") long[] licenseKeyIds)
		throws Exception {

		UserAccount userAccount = getMyUserAccount(jwt);

		for (long licenseKeyId : licenseKeyIds) {
			_subscriptionEntryService.deleteSubscriptionEntry(
				jwt, ClassNameConstants.LICENSE_KEY, licenseKeyId,
				userAccount.getId());
		}
	}

	@GetMapping("/{licenseKeyId}")
	public LicenseKey getLicenseKey(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable("licenseKeyId") long licenseKeyId)
		throws Exception {

		LicenseKey licenseKey = _licenseKeyService.getLicenseKey(
			jwt, licenseKeyId);

		_licenseKeyPermission.check(
			licenseKey.getAccountEntryId(), ActionKeys.VIEW, jwt);

		return licenseKey;
	}

	@GetMapping("/{licenseKeyId}/download")
	public ResponseEntity<String> getLicenseKeysDownload(
			@AuthenticationPrincipal Jwt jwt, @PathVariable long licenseKeyId)
		throws Exception {

		LicenseKey licenseKey = _licenseKeyService.getLicenseKey(
			jwt, licenseKeyId);

		_licenseKeyPermission.check(
			licenseKey.getAccountEntryId(), ActionKeys.VIEW, jwt);

		if (licenseKey.getLicenseVersion() < 2) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND);
		}

		String fileName = _licenseKeyExporter.getFileName(licenseKey);

		return ResponseEntity.ok(
		).contentType(
			MediaType.TEXT_XML
		).header(
			HttpHeaders.CONTENT_DISPOSITION,
			"attachment; filename=\"" + fileName + "\""
		).body(
			_licenseKeyExporter.toXML(licenseKey)
		);
	}

	@GetMapping("/download")
	public ResponseEntity<String> getLicenseKeysDownload(
			@AuthenticationPrincipal Jwt jwt,
			@RequestParam("licenseKeyIds") long[] licenseKeyIds)
		throws Exception {

		_checkLicenseKeyIds(licenseKeyIds);

		List<LicenseKey> licenseKeys = _getActiveLicenseKeys(
			jwt, licenseKeyIds);

		if (licenseKeys.isEmpty()) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND);
		}

		String fileName = _licenseKeyExporter.getFileName(licenseKeys);

		return ResponseEntity.ok(
		).contentType(
			MediaType.TEXT_XML
		).header(
			HttpHeaders.CONTENT_DISPOSITION,
			"attachment; filename=\"" + fileName + "\""
		).body(
			_licenseKeyExporter.toXML(licenseKeys)
		);
	}

	@GetMapping("/download-zip")
	public ResponseEntity<byte[]> getLicenseKeysDownloadZip(
			@AuthenticationPrincipal Jwt jwt,
			@RequestParam("licenseKeyIds") long[] licenseKeyIds)
		throws Exception {

		_checkLicenseKeyIds(licenseKeyIds);

		List<LicenseKey> licenseKeys = _getActiveLicenseKeys(
			jwt, licenseKeyIds);

		if (licenseKeys.isEmpty()) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND);
		}

		return ResponseEntity.ok(
		).contentType(
			MediaType.parseMediaType("application/zip")
		).header(
			HttpHeaders.CONTENT_DISPOSITION,
			"attachment; filename=\"activation-keys.zip\""
		).body(
			_licenseKeyExporter.toZip(licenseKeys)
		);
	}

	@GetMapping("/export")
	public ResponseEntity<String> getLicenseKeysExport(
			@AuthenticationPrincipal Jwt jwt,
			@RequestParam("licenseKeyIds") long[] licenseKeyIds)
		throws Exception {

		_checkLicenseKeyIds(licenseKeyIds);

		List<LicenseKey> licenseKeys = _getLicenseKeys(jwt, licenseKeyIds);

		UserAccount userAccount = getMyUserAccount(jwt);

		for (LicenseKey licenseKey : licenseKeys) {
			_licenseKeyPermission.check(
				userAccount, licenseKey.getAccountEntryId(), ActionKeys.VIEW);
		}

		return ResponseEntity.ok(
		).contentType(
			_CONTENT_TYPE_CSV
		).header(
			HttpHeaders.CONTENT_DISPOSITION,
			"attachment; filename=\"" + _licenseKeyCSVExporter.getFileName() +
				"\""
		).body(
			_licenseKeyCSVExporter.toCSV(licenseKeys)
		);
	}

	@GetMapping("/subscriptions")
	public boolean getSubscriptions(
			@AuthenticationPrincipal Jwt jwt,
			@RequestParam("licenseKeyId") long licenseKeyId)
		throws Exception {

		UserAccount userAccount = getMyUserAccount(jwt);

		SubscriptionEntry subscriptionEntry =
			_subscriptionEntryService.fetchSubscriptionEntry(
				jwt, ClassNameConstants.LICENSE_KEY, licenseKeyId,
				userAccount.getId());

		if (subscriptionEntry != null) {
			return true;
		}

		return false;
	}

	@PostMapping("/extend")
	public List<LicenseKey> postLicenseKeysExtend(
			@AuthenticationPrincipal Jwt jwt, @RequestBody String json)
		throws Exception {

		JSONArray jsonArray = new JSONArray(json);

		if ((jsonArray.length() == 0) ||
			(jsonArray.length() > _MAX_LICENSE_KEY_IDS)) {

			throw new ResponseStatusException(
				HttpStatus.BAD_REQUEST,
				"Between 1 and " + _MAX_LICENSE_KEY_IDS +
					" license keys may be extended at once");
		}

		long[] licenseKeyIds = new long[jsonArray.length()];

		for (int i = 0; i < jsonArray.length(); i++) {
			JSONObject jsonObject = jsonArray.getJSONObject(i);

			licenseKeyIds[i] = jsonObject.getLong("licenseKeyId");
		}

		Map<Long, LicenseKey> licenseKeysMap = new HashMap<>();

		for (LicenseKey licenseKey : _getLicenseKeys(jwt, licenseKeyIds)) {
			licenseKeysMap.put(licenseKey.getLicenseKeyId(), licenseKey);
		}

		List<LicenseKey> licenseKeys = new ArrayList<>();

		for (long licenseKeyId : licenseKeyIds) {
			licenseKeys.add(licenseKeysMap.get(licenseKeyId));
		}

		_checkManageLicenseKeys(true, licenseKeys, getMyUserAccount(jwt));

		return _keyedLock.withLock(
			LicenseKeyLockUtil.toAccountLockKey(_toAccountEntryId(licenseKeys)),
			() -> {
				LicenseKeyQuotaContext licenseKeyQuotaContext =
					new LicenseKeyQuotaContext();

				for (int i = 0; i < jsonArray.length(); i++) {
					_validateExtension(
						jsonArray.getJSONObject(i), licenseKeys.get(i),
						licenseKeyQuotaContext);
				}

				List<LicenseKey> extendedLicenseKeys = new ArrayList<>();

				for (int i = 0; i < jsonArray.length(); i++) {
					JSONObject jsonObject = jsonArray.getJSONObject(i);

					LicenseKey licenseKey = licenseKeys.get(i);

					extendedLicenseKeys.add(
						_licenseKeyService.extendLicenseKey(
							Date.from(_toInstant(jsonObject, "expirationDate")),
							licenseKey.getLicenseKeyId(),
							Date.from(_toInstant(jsonObject, "startDate"))));
				}

				return extendedLicenseKeys;
			});
	}

	@PostMapping("/type-free")
	public LicenseKey postLicenseKeysTypeFree(@RequestBody String json)
		throws Exception {

		JSONObject jsonObject = new JSONObject(json);

		String domains = jsonObject.optString("domains");
		long orderId = jsonObject.optLong("orderId");
		String owner = jsonObject.optString("owner");

		if (_licenseKeyService.hasValidLicenseKeyTypeFree(domains, owner)) {
			throw new ResponseStatusException(
				HttpStatus.CONFLICT,
				"A license key was already provisioned for the owner with " +
					"this domain");
		}

		Order order = _commerceOrderService.getCommerceOrder(orderId);

		Account account = order.getAccount();

		LicenseKey licenseKey = _licenseKeyService.addLicenseKeyTypeFree(
			account.getId(), domains, String.valueOf(orderId), owner);

		Integer orderStatus = order.getOrderStatus();

		if ((orderStatus == null) ||
			(orderStatus != CommerceOrderConstants.ORDER_STATUS_COMPLETED)) {

			_commerceOrderService.completeOrder(
				order.getId(),
				CommerceOrderConstants.ORDER_PAYMENT_STATUS_NOT_REQUIRED);
		}

		return licenseKey;
	}

	@PostMapping("/type-free-domains-check")
	public void postLicenseKeysTypeFreeDomainsCheck(@RequestBody String json)
		throws Exception {

		JSONObject jsonObject = new JSONObject(json);

		if (_licenseKeyService.hasValidLicenseKeyTypeFree(
				jsonObject.optString("domains"),
				jsonObject.optString("owner"))) {

			throw new ResponseStatusException(
				HttpStatus.CONFLICT,
				"A license key was already provisioned for the owner with " +
					"this domain");
		}
	}

	@PutMapping("/activate")
	public void putLicenseKeysActivate(
			@AuthenticationPrincipal Jwt jwt,
			@RequestParam("licenseKeyIds") long[] licenseKeyIds)
		throws Exception {

		_updateLicenseKeysActive(true, jwt, licenseKeyIds);
	}

	@PutMapping("/deactivate")
	public void putLicenseKeysDeactivate(
			@AuthenticationPrincipal Jwt jwt,
			@RequestParam("licenseKeyIds") long[] licenseKeyIds)
		throws Exception {

		_updateLicenseKeysActive(false, jwt, licenseKeyIds);
	}

	@PutMapping("/subscriptions")
	public void putSubscriptions(
			@AuthenticationPrincipal Jwt jwt,
			@RequestParam("licenseKeyIds") long[] licenseKeyIds)
		throws Exception {

		UserAccount userAccount = getMyUserAccount(jwt);

		for (long licenseKeyId : licenseKeyIds) {
			LicenseKey licenseKey = _licenseKeyService.getLicenseKey(
				jwt, licenseKeyId);

			_licenseKeyPermission.check(
				userAccount, licenseKey.getAccountEntryId(), ActionKeys.VIEW);
		}

		for (long licenseKeyId : licenseKeyIds) {
			_subscriptionEntryService.addSubscriptionEntry(
				jwt, ClassNameConstants.LICENSE_KEY, licenseKeyId,
				userAccount.getId());
		}
	}

	private void _checkAllFound(
			List<LicenseKey> licenseKeys, long[] licenseKeyIds)
		throws Exception {

		if (licenseKeys.size() < licenseKeyIds.length) {
			throw new NoSuchLicenseKeyException(
				"Unable to find every license key in " +
					Arrays.toString(licenseKeyIds));
		}
	}

	private void _checkLicenseKeyIds(long[] licenseKeyIds) {
		if (licenseKeyIds.length == 0) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND);
		}

		if (licenseKeyIds.length > _MAX_LICENSE_KEY_IDS) {
			throw new ResponseStatusException(
				HttpStatus.BAD_REQUEST,
				"No more than " + _MAX_LICENSE_KEY_IDS +
					" license keys may be requested at once");
		}
	}

	private void _checkManageLicenseKeys(
			boolean selfProvisioning, List<LicenseKey> licenseKeys,
			UserAccount userAccount)
		throws Exception {

		Set<Long> accountEntryIds = new LinkedHashSet<>();

		for (LicenseKey licenseKey : licenseKeys) {
			accountEntryIds.add(licenseKey.getAccountEntryId());
		}

		for (long accountEntryId : accountEntryIds) {
			_licenseKeyPermission.check(
				userAccount, accountEntryId, ActionKeys.UPDATE);

			if (selfProvisioning) {
				_licenseKeyPermission.checkSelfProvisioning(
					accountEntryId, userAccount);
			}
		}
	}

	private List<LicenseKey> _getActiveLicenseKeys(
			Jwt jwt, long[] licenseKeyIds)
		throws Exception {

		List<LicenseKey> licenseKeys = new ArrayList<>();

		UserAccount userAccount = getMyUserAccount(jwt);

		for (LicenseKey licenseKey : _getLicenseKeys(jwt, licenseKeyIds)) {
			_licenseKeyPermission.check(
				userAccount, licenseKey.getAccountEntryId(), ActionKeys.VIEW);

			if (!licenseKey.isActive()) {
				continue;
			}

			licenseKeys.add(licenseKey);
		}

		return licenseKeys;
	}

	private List<LicenseKey> _getLicenseKeys(Jwt jwt, long[] licenseKeyIds)
		throws Exception {

		long[] distinctLicenseKeyIds = _toDistinctLicenseKeyIds(licenseKeyIds);

		List<LicenseKey> licenseKeys = _licenseKeyService.getLicenseKeysByIds(
			jwt, distinctLicenseKeyIds);

		_checkAllFound(licenseKeys, distinctLicenseKeyIds);

		return licenseKeys;
	}

	private long _toAccountEntryId(List<LicenseKey> licenseKeys) {
		Set<Long> accountEntryIds = new TreeSet<>();

		for (LicenseKey licenseKey : licenseKeys) {
			accountEntryIds.add(licenseKey.getAccountEntryId());
		}

		if (accountEntryIds.size() > 1) {
			throw new ResponseStatusException(
				HttpStatus.BAD_REQUEST,
				"Every license key must belong to the same account");
		}

		Iterator<Long> iterator = accountEntryIds.iterator();

		return iterator.next();
	}

	private long[] _toDistinctLicenseKeyIds(long[] licenseKeyIds) {
		Set<Long> distinctLicenseKeyIds = new LinkedHashSet<>();

		for (long licenseKeyId : licenseKeyIds) {
			distinctLicenseKeyIds.add(licenseKeyId);
		}

		long[] longs = new long[distinctLicenseKeyIds.size()];

		int i = 0;

		for (long licenseKeyId : distinctLicenseKeyIds) {
			longs[i++] = licenseKeyId;
		}

		return longs;
	}

	private Instant _toInstant(JSONObject jsonObject, String key) {
		try {
			return Instant.parse(jsonObject.getString(key));
		}
		catch (Exception exception) {
			throw new ResponseStatusException(
				HttpStatus.BAD_REQUEST, "Invalid \"" + key + "\"", exception);
		}
	}

	private void _updateLicenseKeysActive(
			boolean active, Jwt jwt, long[] licenseKeyIds)
		throws Exception {

		_checkLicenseKeyIds(licenseKeyIds);

		List<LicenseKey> licenseKeys = _getLicenseKeys(jwt, licenseKeyIds);

		_checkManageLicenseKeys(active, licenseKeys, getMyUserAccount(jwt));

		_keyedLock.withLock(
			LicenseKeyLockUtil.toAccountLockKey(_toAccountEntryId(licenseKeys)),
			() -> {
				if (active) {
					LicenseKeyQuotaContext licenseKeyQuotaContext =
						new LicenseKeyQuotaContext();

					for (LicenseKey licenseKey : licenseKeys) {
						long entitlementId = licenseKey.getEntitlementId();

						if (licenseKey.isActive() ||
							licenseKey.isComplimentary() ||
							(entitlementId == 0)) {

							continue;
						}

						_licenseKeyEntitlementValidator.validateQuota(
							_entitlementService.getEntitlement(entitlementId),
							licenseKeyQuotaContext,
							licenseKey.getMaxClusterNodes());
					}
				}

				for (LicenseKey licenseKey : licenseKeys) {
					_licenseKeyService.updateLicenseKeyActive(
						active, licenseKey.getLicenseKeyId());
				}
			});
	}

	private void _validateExtension(
			JSONObject jsonObject, LicenseKey licenseKey,
			LicenseKeyQuotaContext licenseKeyQuotaContext)
		throws Exception {

		long entitlementId = licenseKey.getEntitlementId();

		if (entitlementId == 0) {
			throw new LicenseKeyProductPurchaseKeyException(
				"License key " + licenseKey.getLicenseKeyId() +
					" is not backed by an entitlement");
		}

		Instant expirationDateInstant = _toInstant(
			jsonObject, "expirationDate");
		Instant startDateInstant = _toInstant(jsonObject, "startDate");

		if (expirationDateInstant.isBefore(startDateInstant)) {
			throw new LicenseKeyDateException(
				"Invalid start date or expiration date");
		}

		Entitlement entitlement = _entitlementService.getEntitlement(
			entitlementId);

		_licenseKeyEntitlementValidator.validateEntitlementDefinition(
			entitlement);

		com.liferay.headless.admin.user.client.dto.v1_0.Account account =
			_accountService.fetchAccount(licenseKey.getAccountEntryId());

		boolean allowPermanentLicenses = true;

		if (account != null) {
			allowPermanentLicenses = AccountUtil.getCustomFieldBoolean(
				account, "allowPermanentLicenses", true);
		}

		_licenseKeyEntitlementValidator.validateTerm(
			allowPermanentLicenses, entitlement, expirationDateInstant,
			startDateInstant);

		if (!licenseKey.isComplimentary()) {
			_licenseKeyEntitlementValidator.validateQuota(
				entitlement, licenseKeyQuotaContext,
				licenseKey.getMaxClusterNodes());
		}
	}

	private static final MediaType _CONTENT_TYPE_CSV = MediaType.parseMediaType(
		"text/csv");

	private static final int _MAX_LICENSE_KEY_IDS = 100;

	@Autowired
	private AccountService _accountService;

	@Autowired
	private AdminPermission _adminPermission;

	@Autowired
	private CommerceOrderService _commerceOrderService;

	@Autowired
	private EntitlementService _entitlementService;

	@Autowired
	private KeyedLock _keyedLock;

	@Autowired
	private LicenseKeyCSVExporter _licenseKeyCSVExporter;

	@Autowired
	private LicenseKeyEntitlementValidator _licenseKeyEntitlementValidator;

	@Autowired
	private LicenseKeyExporter _licenseKeyExporter;

	@Autowired
	private LicenseKeyPermission _licenseKeyPermission;

	@Autowired
	private LicenseKeyService _licenseKeyService;

	@Autowired
	private SubscriptionEntryService _subscriptionEntryService;

}