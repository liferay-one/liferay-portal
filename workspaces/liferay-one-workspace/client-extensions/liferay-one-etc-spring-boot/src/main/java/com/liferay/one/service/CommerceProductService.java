/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Catalog;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Option;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.ProductOption;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.ProductOptionValue;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Sku;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.SkuOption;
import com.liferay.headless.commerce.admin.catalog.client.pagination.Page;
import com.liferay.headless.commerce.admin.catalog.client.pagination.Pagination;
import com.liferay.headless.commerce.admin.catalog.client.problem.Problem;
import com.liferay.headless.commerce.admin.catalog.client.resource.v1_0.OptionResource;
import com.liferay.headless.commerce.admin.catalog.client.resource.v1_0.ProductOptionResource;
import com.liferay.headless.commerce.admin.catalog.client.resource.v1_0.ProductOptionValueResource;
import com.liferay.headless.commerce.admin.catalog.client.resource.v1_0.ProductResource;
import com.liferay.one.constants.CommerceCatalogConstants;
import com.liferay.one.constants.CommerceProductConstants;
import com.liferay.one.exception.NoSuchProductException;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.StringUtil;
import com.liferay.portal.kernel.util.Validator;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;

/**
 * @author Kyle Bischof
 */
@Component
public class CommerceProductService extends OneBaseService {

	@CacheEvict(allEntries = true, cacheNames = "product")
	public void deactivateProduct(String salesforceProductId) throws Exception {
		Sku sku = _updateSku(false, salesforceProductId);

		if (sku == null) {
			_logMissingSku(salesforceProductId);

			return;
		}

		if (_hasPublishedSku(sku.getProductId())) {
			return;
		}

		ProductResource productResource = buildProductResource();

		Product product = new Product();

		product.setActive(() -> Boolean.FALSE);

		productResource.patchProduct(sku.getProductId(), product);
	}

	@Cacheable("product")
	public Product fetchProduct(long id) throws Exception {
		return _fetchProduct(id);
	}

	@Cacheable(unless = "#result == null", value = "product")
	public Product fetchProduct(String externalReferenceCode) throws Exception {
		return _fetchProduct(externalReferenceCode);
	}

	public Product getProduct(long id) throws Exception {
		Product product = _fetchProduct(id);

		if (product == null) {
			throw new NoSuchProductException(
				"No product exists for commerce product ID " + id);
		}

		return product;
	}

	@CacheEvict(allEntries = true, cacheNames = "product")
	public void updateProduct(
			String description, String name, String productGroup,
			String salesforceProductId)
		throws Exception {

		Long productId = _updateOrAddSku(
			description, name, productGroup, salesforceProductId);

		if (productId == null) {
			return;
		}

		ProductResource productResource = buildProductResource();

		Product product = new Product();

		product.setActive(() -> Boolean.TRUE);

		if (_hasSingleSku(productId)) {
			product.setDescription(
				() -> Collections.singletonMap(
					_LANGUAGE_ID_DEFAULT, description));
			product.setName(
				() -> Collections.singletonMap(_LANGUAGE_ID_DEFAULT, name));
		}

		productResource.patchProduct(productId, product);
	}

	protected OptionResource buildOptionResource() {
		return OptionResource.builder(
		).endpoint(
			getDXPEndpointAddress(), lxcDXPServerProtocol
		).header(
			HttpHeaders.AUTHORIZATION, getAuthorization()
		).build();
	}

	protected ProductOptionResource buildProductOptionResource() {
		return ProductOptionResource.builder(
		).endpoint(
			getDXPEndpointAddress(), lxcDXPServerProtocol
		).header(
			HttpHeaders.AUTHORIZATION, getAuthorization()
		).build();
	}

	protected ProductOptionValueResource buildProductOptionValueResource() {
		return ProductOptionValueResource.builder(
		).endpoint(
			getDXPEndpointAddress(), lxcDXPServerProtocol
		).header(
			HttpHeaders.AUTHORIZATION, getAuthorization()
		).build();
	}

	protected ProductResource buildProductResource() {
		return ProductResource.builder(
		).endpoint(
			getDXPEndpointAddress(), lxcDXPServerProtocol
		).header(
			HttpHeaders.AUTHORIZATION, getAuthorization()
		).parameter(
			"nestedFields", "productSpecifications"
		).parameter(
			"productSpecifications.pageSize", "-1"
		).build();
	}

	private Product _addProduct(
			String description, String name, String productGroup)
		throws Exception {

		Catalog catalog = _commerceCatalogService.fetchCatalog(
			CommerceCatalogConstants.
				EXTERNAL_REFERENCE_CODE_LIFERAY_INC_CATALOG);

		if (catalog == null) {
			if (_log.isWarnEnabled()) {
				_log.warn(
					StringBundler.concat(
						"Unable to add product ", productGroup,
						" without catalog ",
						CommerceCatalogConstants.
							EXTERNAL_REFERENCE_CODE_LIFERAY_INC_CATALOG));
			}

			return null;
		}

		ProductResource productResource = buildProductResource();

		Product product = new Product();

		product.setActive(() -> Boolean.TRUE);
		product.setCatalogId(catalog::getId);
		product.setDescription(
			() -> Collections.singletonMap(_LANGUAGE_ID_DEFAULT, description));
		product.setExternalReferenceCode(() -> productGroup);
		product.setName(
			() -> Collections.singletonMap(_LANGUAGE_ID_DEFAULT, name));
		product.setProductType(() -> _PRODUCT_TYPE_VIRTUAL);

		return productResource.postProduct(product);
	}

	private void _addSalesforceOption() throws Exception {
		Option option = _fetchSalesforceOption();

		if (option != null) {
			return;
		}

		option = new Option();

		option.setExternalReferenceCode(
			() ->
				CommerceProductConstants.
					OPTION_EXTERNAL_REFERENCE_CODE_SALESFORCE_PRODUCT);
		option.setFacetable(() -> Boolean.FALSE);
		option.setFieldType(() -> Option.FieldType.SELECT);
		option.setKey(
			() -> CommerceProductConstants.OPTION_KEY_SALESFORCE_PRODUCT);
		option.setName(
			() -> Collections.singletonMap(
				_LANGUAGE_ID_DEFAULT, _OPTION_NAME_SALESFORCE_PRODUCT));
		option.setRequired(() -> Boolean.FALSE);
		option.setSkuContributor(() -> Boolean.TRUE);

		OptionResource optionResource = buildOptionResource();

		optionResource.postOption(option);
	}

	private ProductOption _addSalesforceProductOption(long productId)
		throws Exception {

		_addSalesforceOption();

		ProductOption productOption = new ProductOption();

		productOption.setFacetable(() -> Boolean.FALSE);
		productOption.setFieldType(() -> _FIELD_TYPE_SELECT);
		productOption.setKey(
			() -> CommerceProductConstants.OPTION_KEY_SALESFORCE_PRODUCT);
		productOption.setName(
			() -> Collections.singletonMap(
				_LANGUAGE_ID_DEFAULT, _OPTION_NAME_SALESFORCE_PRODUCT));
		productOption.setOptionExternalReferenceCode(
			() ->
				CommerceProductConstants.
					OPTION_EXTERNAL_REFERENCE_CODE_SALESFORCE_PRODUCT);
		productOption.setPriority(() -> 0.0);
		productOption.setRequired(() -> Boolean.FALSE);
		productOption.setSkuContributor(() -> Boolean.TRUE);

		ProductOptionResource productOptionResource =
			buildProductOptionResource();

		productOptionResource.postProductIdProductOptionsPage(
			productId, new ProductOption[] {productOption});

		return _fetchSalesforceProductOption(productId);
	}

	private String _addSalesforceProductOptionValue(
			String name, long productId, String salesforceProductId)
		throws Exception {

		synchronized (_getProductLock(productId)) {
			ProductOption productOption = _fetchSalesforceProductOption(
				productId);

			if (productOption == null) {
				productOption = _addSalesforceProductOption(productId);
			}

			String key = StringUtil.toLowerCase(salesforceProductId);

			if (_hasProductOptionValue(key, productOption.getId())) {
				return key;
			}

			ProductOptionValue productOptionValue = new ProductOptionValue();

			productOptionValue.setKey(() -> key);
			productOptionValue.setName(
				() -> Collections.singletonMap(_LANGUAGE_ID_DEFAULT, name));
			productOptionValue.setPriority(() -> 0.0);

			ProductOptionValueResource productOptionValueResource =
				buildProductOptionValueResource();

			productOptionValueResource.postProductOptionIdProductOptionValue(
				productOption.getId(), productOptionValue);

			return key;
		}
	}

	private Product _fetchProduct(long id) throws Exception {
		ProductResource productResource = buildProductResource();

		try {
			return productResource.getProduct(id);
		}
		catch (Problem.ProblemException problemException) {
			Problem problem = problemException.getProblem();

			if ((problem != null) && isNotFound(problem.getStatus())) {
				return null;
			}

			throw problemException;
		}
	}

	private Product _fetchProduct(String externalReferenceCode)
		throws Exception {

		ProductResource productResource = buildProductResource();

		try {
			return productResource.getProductByExternalReferenceCode(
				externalReferenceCode);
		}
		catch (Problem.ProblemException problemException) {
			Problem problem = problemException.getProblem();

			if ((problem != null) && isNotFound(problem.getStatus())) {
				return null;
			}

			throw problemException;
		}
	}

	private Option _fetchSalesforceOption() throws Exception {
		OptionResource optionResource = buildOptionResource();

		try {
			return optionResource.getOptionByExternalReferenceCode(
				CommerceProductConstants.
					OPTION_EXTERNAL_REFERENCE_CODE_SALESFORCE_PRODUCT);
		}
		catch (Problem.ProblemException problemException) {
			Problem problem = problemException.getProblem();

			if ((problem != null) && isNotFound(problem.getStatus())) {
				return null;
			}

			throw problemException;
		}
	}

	private ProductOption _fetchSalesforceProductOption(long productId)
		throws Exception {

		ProductOptionResource productOptionResource =
			buildProductOptionResource();

		Page<ProductOption> productOptionsPage =
			productOptionResource.getProductIdProductOptionsPage(
				productId, null, Pagination.of(1, _PRODUCT_OPTIONS_PAGE_SIZE),
				null);

		for (ProductOption productOption : productOptionsPage.getItems()) {
			if (Objects.equals(
					CommerceProductConstants.OPTION_KEY_SALESFORCE_PRODUCT,
					productOption.getKey())) {

				return productOption;
			}
		}

		return null;
	}

	private Object _getProductGroupLock(String productGroup) {
		return _productGroupLocks.computeIfAbsent(
			productGroup, key -> new Object());
	}

	private Object _getProductLock(long productId) {
		return _productLocks.computeIfAbsent(productId, key -> new Object());
	}

	private boolean _hasProductOptionValue(String key, long productOptionId)
		throws Exception {

		ProductOptionValueResource productOptionValueResource =
			buildProductOptionValueResource();

		int page = 1;

		while (true) {
			Page<ProductOptionValue> productOptionValuesPage =
				productOptionValueResource.
					getProductOptionIdProductOptionValuesPage(
						productOptionId, null,
						Pagination.of(page, _PRODUCT_OPTION_VALUES_PAGE_SIZE),
						null);

			for (ProductOptionValue productOptionValue :
					productOptionValuesPage.getItems()) {

				if (Objects.equals(key, productOptionValue.getKey())) {
					return true;
				}
			}

			if (!productOptionValuesPage.hasNext()) {
				return false;
			}

			page++;
		}
	}

	private boolean _hasPublishedSku(long productId) throws Exception {
		for (Sku sku : _commerceSkuService.getSkus(productId)) {
			if (Boolean.TRUE.equals(sku.getPublished())) {
				return true;
			}
		}

		return false;
	}

	private boolean _hasSingleSku(long productId) throws Exception {
		List<Sku> skus = _commerceSkuService.getSkus(productId);

		if (skus.size() == 1) {
			return true;
		}

		return false;
	}

	private void _logMissingSku(String salesforceProductId) {
		if (_log.isWarnEnabled()) {
			_log.warn(
				"No SKU exists for Salesforce product " + salesforceProductId);
		}
	}

	private void _publishSku(String name, String salesforceProductId, Sku sku)
		throws Exception {

		List<SkuOption> skuOptions = new ArrayList<>();

		if (sku.getSkuOptions() != null) {
			for (SkuOption skuOption : sku.getSkuOptions()) {
				if (!Objects.equals(
						CommerceProductConstants.OPTION_KEY_SALESFORCE_PRODUCT,
						skuOption.getKey())) {

					skuOptions.add(skuOption);
				}
			}
		}

		skuOptions.add(
			_toSkuOption(
				_addSalesforceProductOptionValue(
					name, sku.getProductId(), salesforceProductId)));

		Sku publishedSku = new Sku();

		publishedSku.setPublished(() -> Boolean.TRUE);
		publishedSku.setPurchasable(() -> Boolean.TRUE);
		publishedSku.setSkuOptions(() -> skuOptions.toArray(new SkuOption[0]));

		_commerceSkuService.patchSku(salesforceProductId, publishedSku);
	}

	private SkuOption _toSkuOption(String skuOptionValueKey) {
		SkuOption skuOption = new SkuOption();

		skuOption.setKey(
			() -> CommerceProductConstants.OPTION_KEY_SALESFORCE_PRODUCT);
		skuOption.setValue(() -> skuOptionValueKey);

		return skuOption;
	}

	private Long _updateOrAddSku(
			String description, String name, String productGroup,
			String salesforceProductId)
		throws Exception {

		Sku sku = _commerceSkuService.fetchSku(salesforceProductId);

		if (sku != null) {
			_publishSku(name, salesforceProductId, sku);

			return sku.getProductId();
		}

		if (Validator.isNull(productGroup)) {
			_logMissingSku(salesforceProductId);

			return null;
		}

		synchronized (_getProductGroupLock(productGroup)) {
			sku = _commerceSkuService.fetchSku(salesforceProductId);

			if (sku != null) {
				_publishSku(name, salesforceProductId, sku);

				return sku.getProductId();
			}

			Product product = _fetchProduct(productGroup);

			if (product == null) {
				product = _addProduct(description, name, productGroup);
			}

			if (product == null) {
				return null;
			}

			String skuOptionValueKey = _addSalesforceProductOptionValue(
				name, product.getProductId(), salesforceProductId);

			Sku productGroupSku = new Sku();

			productGroupSku.setExternalReferenceCode(() -> salesforceProductId);
			productGroupSku.setNeverExpire(() -> Boolean.TRUE);
			productGroupSku.setPublished(() -> Boolean.TRUE);
			productGroupSku.setPurchasable(() -> Boolean.TRUE);
			productGroupSku.setSku(() -> salesforceProductId);
			productGroupSku.setSkuOptions(
				() -> new SkuOption[] {_toSkuOption(skuOptionValueKey)});

			_commerceSkuService.addSku(productGroup, productGroupSku);

			return product.getProductId();
		}
	}

	private Sku _updateSku(boolean published, String salesforceProductId)
		throws Exception {

		Sku sku = new Sku();

		sku.setPublished(() -> published);
		sku.setPurchasable(() -> published);

		return _commerceSkuService.patchSku(salesforceProductId, sku);
	}

	private static final String _FIELD_TYPE_SELECT = "select";

	private static final String _LANGUAGE_ID_DEFAULT = "en_US";

	private static final String _OPTION_NAME_SALESFORCE_PRODUCT =
		"Salesforce Product";

	private static final int _PRODUCT_OPTION_VALUES_PAGE_SIZE = 100;

	private static final int _PRODUCT_OPTIONS_PAGE_SIZE = 50;

	private static final String _PRODUCT_TYPE_VIRTUAL = "virtual";

	private static final Log _log = LogFactory.getLog(
		CommerceProductService.class);

	@Autowired
	private CommerceCatalogService _commerceCatalogService;

	@Autowired
	private CommerceSkuService _commerceSkuService;

	private final Map<String, Object> _productGroupLocks =
		new ConcurrentHashMap<>();
	private final Map<Long, Object> _productLocks = new ConcurrentHashMap<>();

}