<#assign
	scopeGroupId = ""
	channelId = ""
	productId = ""
/>

<#if themeDisplay?has_content>
	<#assign scopeGroupId = themeDisplay.getScopeGroupId() />
</#if>

<#assign
	channel = restClient.get(
		"/headless-commerce-delivery-catalog/v1.0/channels?accountId=-1&filter=name eq 'One Liferay Channel' and siteGroupId eq '${scopeGroupId}'"
	)
/>

<#if channel?has_content && channel.items?has_content>
	<#assign channelId = channel.items[0].id />
</#if>

<#if (CPDefinition_cProductId.getData())??>
	<#assign productId = CPDefinition_cProductId.getData() />
</#if>

<#if channelId?has_content && productId?has_content>

	<#assign
		product = restClient.get(
			"/headless-commerce-delivery-catalog/v1.0/channels/" +
			channelId +
			"/products/" +
			productId +
			"?accountId=-1&nestedFields=productSpecifications&productSpecifications.pageSize=-1"
		)
		specifications = product.productSpecifications![]
	/>

	<div>
		<#if specifications?has_content>
			<#assign
				liferayVersionSpecification = specifications?filter(
					item -> stringUtil.equals(item.specificationKey, "liferay-version")
				)
			/>

			<#if liferayVersionSpecification?has_content>
				<#list liferayVersionSpecification as liferayVersion>
					<#assign liferayVersionValue = liferayVersion.value />

					<#if liferayVersionValue?has_content>
						${liferayVersionValue}<#if liferayVersion?has_next>,</#if>
					</#if>
				</#list>
			</#if>
		</#if>
	</div>
</#if>