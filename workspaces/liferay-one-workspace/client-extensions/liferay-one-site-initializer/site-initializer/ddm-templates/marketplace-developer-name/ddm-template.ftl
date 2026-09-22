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
	product = restClient.get("/headless-commerce-delivery-catalog/v1.0/channels/"+ channelId +"/products/"+ productId +"?accountId=-1&nestedFields=productSpecifications")
	catalogName = product.catalogName
	productSpecifications = product.productSpecifications![]
/>

<#if catalogName?has_content>
	<#assign publisherDetailsResponse = restClient.get("/c/publisherdetailses?filter=publisherName eq '${catalogName}'") />

	<#if publisherDetailsResponse.items?has_content>
		<#assign publisherDetails = publisherDetailsResponse.items[0] />
	</#if>
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
