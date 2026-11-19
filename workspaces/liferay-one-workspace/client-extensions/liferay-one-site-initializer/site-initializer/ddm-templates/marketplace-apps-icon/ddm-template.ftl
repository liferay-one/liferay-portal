<#compress>
<#if themeDisplay?has_content>
	<#assign scopeGroupId = themeDisplay.getScopeGroupId() />
</#if>

<#assign
	channel = restClient.get("/headless-commerce-delivery-catalog/v1.0/channels?accountId=-1&filter=siteGroupId eq '${scopeGroupId}'")
	product = {}
/>

<#if (channel.items)?has_content && (CPDefinition_cProductId.getData())??>
	<#assign product = restClient.get("/headless-commerce-delivery-catalog/v1.0/channels/" + channel.items[0].id + "/products/" + CPDefinition_cProductId.getData() + "?accountId=-1&images.accountId=-1&nestedFields=images") />
</#if>

<#assign productImage = (product.images![])?filter(item -> item.tags?seq_contains("app icon")) />

<#if productImage?has_content && productImage[0].src?has_content>
	<#if productImage[0].src?contains("/o/")>
		<#assign productThumbnail1 = "/o/" + productImage[0].src?keep_after("/o/") />
	<#else>
		<#assign productThumbnail1 = productImage[0].src />
	</#if>
<#elseif product.urlImage?has_content>
	<#if product.urlImage?contains("/o/")>
		<#assign productThumbnail1 = "/o/" + product.urlImage?keep_after("/o/") />
	<#else>
		<#assign productThumbnail1 = product.urlImage />
	</#if>
<#else>
	<#assign productThumbnail1 = "/o/commerce-media/default/?groupId=${scopeGroupId}" />
</#if>

${productThumbnail1}
</#compress>