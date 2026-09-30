<#assign
	cpDataSourceResult = cpSearchResultsDisplayContext.getCPDataSourceResult()
/>

<#function getCountLabel>
	<#if locale?starts_with("ja")>
		<#return "件の利用可能なアプリケーション" />
	<#elseif locale?starts_with("es")>
		<#return "Aplicaciones disponibles" />
	<#elseif locale?starts_with("pt")>
		<#return "Aplicativos disponíveis" />
	<#else>
		<#return "Applications Available" />
	</#if>
</#function>

<span class="app-search-count-text">
	<strong class="app-search-count-text mr-1">
		${cpDataSourceResult.length}
	</strong>
	${getCountLabel()}
</span>