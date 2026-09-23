<#assign
	productId = (CPDefinition_cProductId.getData())!""
	scopeGroupId = (themeDisplay.getScopeGroupId())!""

	channels = restClient.get("/headless-commerce-delivery-catalog/v1.0/channels?accountId=-1&filter=siteGroupId eq '${scopeGroupId}'&pageSize=1")

	channelId = (channels.items[0].id)!""

	catalogName = ""
	productSpecifications = []
	publisherDetails = {}
/>

<#if channelId?has_content && productId?has_content>
	<#assign
		product = restClient.get("/headless-commerce-delivery-catalog/v1.0/channels/" + channelId + "/products/" + productId + "?accountId=-1&nestedFields=productSpecifications")

		catalogName = product.catalogName!""
		productSpecifications = product.productSpecifications![]
	/>
</#if>

<#if catalogName?has_content>
	<#assign
		publisherDetailsResponse = restClient.get("/c/publisherdetailses?filter=publisherName eq '${catalogName}'&pageSize=1")

		publisherDetails = (publisherDetailsResponse.items[0])!{}
	/>
</#if>

<div>
	<#if productSpecifications?has_content>
		<#assign developerNames = productSpecifications?filter(item -> stringUtil.equals(item.specificationKey, "developer-name")) />

		<#if developerNames?has_content>
			<#list developerNames as developerName>
				<#if (publisherDetails.friendlyUrlPath)?has_content>
					<a class="bg-neutral-8" href="/c_publisherdetails/${publisherDetails.friendlyUrlPath}">
						${developerName.value}
					</a>
				<#else>
					<span class="bg-neutral-8">${developerName.value}</span>
				</#if>
			</#list>
		</#if>
	</#if>
</div>