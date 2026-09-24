<#if themeDisplay?has_content>
	<#assign scopeGroupId = themeDisplay.getScopeGroupId() />
</#if>

<#assign channel = restClient.get("/headless-commerce-delivery-catalog/v1.0/channels?accountId=-1&filter=siteGroupId eq '${scopeGroupId}'") />

<#if channel?has_content>
	<#assign channelId = channel.items[0].id />
</#if>

<#if (CPDefinition_cProductId.getData())??>
	<#assign productId = CPDefinition_cProductId.getData() />
</#if>

<#assign
	product = restClient.get("/headless-commerce-delivery-catalog/v1.0/channels/"+ channelId +"/products/"+ productId +"?accountId=-1&images.accountId=-1&nestedFields=images")
	productImage = product.images?filter(item -> item.tags?seq_contains("app icon"))![]
/>

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