<#assign
	accountId = "-1"
	currencyCode = "USD"

	commerceContext = (renderRequest.getAttribute("COMMERCE_CONTEXT"))!
/>

<#if !commerceContext?has_content>
	<#assign commerceContext = (request.getAttribute("COMMERCE_CONTEXT"))! />
</#if>

<#if commerceContext?has_content>
	<#if commerceContext.getAccountEntry()??>
		<#assign accountId = commerceContext.getAccountEntry().getAccountEntryId()?string />
	</#if>
	<#if commerceContext.getCommerceCurrency()??>
		<#assign currencyCode = commerceContext.getCommerceCurrency().getCode() />
	</#if>
</#if>

<#assign
	channel = restClient.get("/headless-commerce-delivery-catalog/v1.0/channels?accountId=" + accountId + "&filter=siteGroupId eq '${themeDisplay.getScopeGroupId()}'")
	product = restClient.get("/headless-commerce-delivery-catalog/v1.0/channels/" + channel.items[0].id + "/products/" + CPDefinition_cProductId.getData() + "?accountId=" + accountId + "&nestedFields=categories,productSpecifications,skus&skus.accountId=" + accountId + "&skus.currencyCode=" + currencyCode)
	productSpecifications = product.productSpecifications![]

	licenseSpecifications = productSpecifications?filter(spec -> stringUtil.equals(spec.specificationKey, "license"))
	storefrontVideoURLSpecifications = productSpecifications?filter(spec -> stringUtil.equals(spec.specificationKey, "app-storefront-video-url"))

	licenseValue = (licenseSpecifications[0].value)!""
	storefrontVideoURLValue = (storefrontVideoURLSpecifications[0].value)!""
/>

<span class="marketplace-section-title">${languageUtil.get(locale, "description")}</span>

<#if description.getData()?has_content>
	<div class="marketplace-description-content mt-4">
		${description.getData()}
	</div>
</#if>

<div>
	<#if licenseSpecifications?has_content>
		<span class="marketplace-section-title">${languageUtil.get(locale, "license")}</span>

		<div class="marketplace-description-content mt-4">
			${licenseValue}
		</div>
	</#if>
</div>

<#if storefrontVideoURLSpecifications?has_content>
	<script>
		setTimeout(function () {
			Liferay.fire('plyr:play', { videoURL: "${storefrontVideoURLValue}" });
		}, 300);
	</script>
</#if>