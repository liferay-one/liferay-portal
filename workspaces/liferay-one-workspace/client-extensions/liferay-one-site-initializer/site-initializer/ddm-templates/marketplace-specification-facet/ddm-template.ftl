<#function langKey label>
	<#return label?lower_case?replace(" ", "-", "r")?replace("&", "and", "r")?replace(",", "", "r")?replace("/", "-", "r") />
</#function>

<#function getFacetTitle paramName>
	<#local key = langKey(paramName) />
	<#if locale?starts_with("ja")>
		<#switch key>
			<#case "dxp-versions"><#return "DXPバージョン" />
			<#case "availability"><#return "可用性" />
			<#case "app-category"><#return "アプリカテゴリ" />
			<#case "category"><#return "カテゴリ" />
			<#case "deployment-method"><#return "デプロイ方法" />
			<#case "type"><#return "タイプ" />
			<#case "liferay-products-categories"><#return "Liferay製品カテゴリ" />
			<#case "liferay-version"><#return "Liferayバージョン" />
			<#case "our-selection"><#return "おすすめ" />
			<#case "price-model"><#return "価格モデル" />
			<#case "tag"><#return "タグ" />
			<#default><#return languageUtil.get(locale, key, paramName?replace("-", " ")?cap_first) />
		</#switch>
	<#elseif locale?starts_with("es")>
		<#switch key>
			<#case "dxp-versions"><#return "Versiones de DXP" />
			<#case "availability"><#return "Disponibilidad" />
			<#case "app-category"><#return "Categoría de aplicación" />
			<#case "category"><#return "Categoría" />
			<#case "deployment-method"><#return "Método de implementación" />
			<#case "type"><#return "Tipo" />
			<#case "liferay-products-categories"><#return "Categorías de productos de Liferay" />
			<#case "liferay-version"><#return "Versión de Liferay" />
			<#case "our-selection"><#return "Nuestra selección" />
			<#case "price-model"><#return "Modelo de precios" />
			<#case "tag"><#return "Etiqueta" />
			<#default><#return languageUtil.get(locale, key, paramName?replace("-", " ")?cap_first) />
		</#switch>
	<#elseif locale?starts_with("pt")>
		<#switch key>
			<#case "dxp-versions"><#return "Versões do DXP" />
			<#case "availability"><#return "Disponibilidade" />
			<#case "app-category"><#return "Categoria do aplicativo" />
			<#case "category"><#return "Categoria" />
			<#case "deployment-method"><#return "Método de implantação" />
			<#case "type"><#return "Tipo" />
			<#case "liferay-products-categories"><#return "Categorias de produtos Liferay" />
			<#case "liferay-version"><#return "Versão do Liferay" />
			<#case "our-selection"><#return "Nossa seleção" />
			<#case "price-model"><#return "Modelo de preço" />
			<#case "tag"><#return "Tag" />
			<#default><#return languageUtil.get(locale, key, paramName?replace("-", " ")?cap_first) />
		</#switch>
	<#else>
		<#return languageUtil.get(locale, key, paramName?replace("-", " ")?cap_first) />
	</#if>
</#function>

<#function getFacetTermName displayName>
	<#local lowerName = displayName?lower_case />
	<#if locale?starts_with("ja")>
		<#switch lowerName>
			<#case "free"><#return "無料" />
			<#case "paid"><#return "有料" />
			<#case "true"><#return "おすすめ" />
			<#case "dxp"><#return "DXP" />
			<#default><#return languageUtil.get(locale, langKey(displayName), displayName?capitalize) />
		</#switch>
	<#elseif locale?starts_with("es")>
		<#switch lowerName>
			<#case "free"><#return "Gratis" />
			<#case "paid"><#return "De pago" />
			<#case "true"><#return "Seleccionado" />
			<#case "dxp"><#return "DXP" />
			<#default><#return languageUtil.get(locale, langKey(displayName), displayName?capitalize) />
		</#switch>
	<#elseif locale?starts_with("pt")>
		<#switch lowerName>
			<#case "free"><#return "Gratuito" />
			<#case "paid"><#return "Pago" />
			<#case "true"><#return "Selecionado" />
			<#case "dxp"><#return "DXP" />
			<#default><#return languageUtil.get(locale, langKey(displayName), displayName?capitalize) />
		</#switch>
	<#else>
		<#if lowerName == 'dxp'><#return "DXP" /><#else><#return displayName?capitalize /></#if>
	</#if>
</#function>

<#assign
	filteredCount = 0
	title = getFacetTitle(cpSpecificationOptionsSearchFacetDisplayContext.getParameterName())
/>

<#list entries?sort_by("displayName") as entry>
	<#if entry.isSelected()>
		<#assign filteredCount++>
	</#if>
</#list>

<#if filteredCount gt 0>
	<#assign title = title + " (${filteredCount})" />
</#if>

<#if cpSpecificationOptionsSearchFacetDisplayContext.getParameterName() != 'developer-name'>

	<@liferay_ui["panel-container"]
		cssClass="bg-white border-radius-xlarge facet-panel"
		extended=true
		id="${namespace + 'facetPriceModelPanelContainer'}"
		markupView="lexicon"
		persistState=true
	>
		<@liferay_ui.panel
			collapsible=true
			cssClass="font-size-paragraph-small font-weight-semi-bold search-facet"
			extended=!browserSniffer.isMobile(request)
			id="${cpSpecificationOptionsSearchFacetDisplayContext.getParameterName()}"
			markupView="lexicon"
			persistState=true
			title="${title}">

			<button class="btn-unstyled mb-4" id="${namespace + 'facetAssetSelectAll'}" onClick="${namespace}selectAll(event, `${cpSpecificationOptionsSearchFacetDisplayContext.getParameterName()}`)">
				${languageUtil.get(locale, "select-all")}
			</button>

			<button class="btn-unstyled options-btn mb-4 ml-1" onClick="Liferay.Search.FacetUtil.clearSelections(event);">
				${languageUtil.get(locale, "clear")}
			</button>

			<ul class="list-unstyled mb-0">
				<#assign
					currentURL = themeDisplay.getURLCurrent()?replace("%20", " ")
					isExpanded = currentURL?contains("${cpSpecificationOptionsSearchFacetDisplayContext.getParameterName()}Expanded")
					optionsCount = 0
				/>

				<#list entries?sort_by("displayName") as entry>
					<#if optionsCount lte 10 || isExpanded>
						<li class="color-neutral-2 <#if optionsCount gte 10 && !isExpanded>d-none</#if> facet-value py-1">
							<div class="custom-checkbox custom-control font-weight-normal">
								<label class="facet-checkbox-label" for="${namespace}_term_${entry.getDisplayName()}">
									<input
										${(entry.isSelected())?then("checked","")}
										class="custom-control-input facet-term"
										data-term-id="${entry.getDisplayName()}"
										id="${namespace}_term_${entry.getDisplayName()}"
										name="${namespace}_term_${entry.getDisplayName()}"
										onChange="Liferay.Search.FacetUtil.changeSelection(event);"
										type="checkbox" />

									<span class="custom-control-label font-size-paragraph-small term-name ${(entry.isSelected())?then('facet-term-selected', 'facet-term-unselected')}">
										<span class="custom-control-label-text">
											<#assign displayName = entry.getDisplayName()?replace("-", " ") />

											${htmlUtil.escape(getFacetTermName(displayName))}

											<span class="facet-frequency">(${entry.getFrequency()})</span>
										</span>
									</span>
								</label>
							</div>
						</li>
					</#if>
					<#assign optionsCount++ />
				</#list>

				<#if optionsCount gt 10 && !isExpanded>
					<button
						class="btn-unstyled mt-4 view-all-btn"
						id="${cpSpecificationOptionsSearchFacetDisplayContext.getParameterName() + 'facetAssetCategoriesViewAll'}"
						onClick="${namespace}viewAll(event, `${cpSpecificationOptionsSearchFacetDisplayContext.getParameterName()}`, '${namespace + 'facetAssetCategoriesPanel'}')"
					>
						<span>${languageUtil.get(locale, "view-all")}</span>
					</button>
				</#if>
			</ul>
		</@>
		<hr class="separator" />
	</@>
</#if>

<@liferay_aui.script>
		function ${namespace}selectAll(event, parameterName) {
			event.preventDefault();

			const divId = event.target.closest('.collapse').id;
			const checkboxes = document.querySelectorAll('#' + divId + ' .custom-checkbox input[type="checkbox"]');
			const url = new URL(window.location.href);

			if (url.searchParams.size === 0) {
				url.href += '?'
			}

			checkboxes.forEach((checkbox) => {
				if (!checkbox.checked) {
					if (url.searchParams.size > 0) {
						url.href += '&';
					}
					url.href += parameterName + '=' + checkbox.getAttribute('data-term-id');
				}
			});

			window.location.href = url.href;
		}

	function ${namespace}viewAll(event, parameterName) {
		event.preventDefault();

		const treeElement = document.getElementById(parameterName);

		if (treeElement) {
			const hiddenItems = treeElement.querySelectorAll('.d-none');
			hiddenItems.forEach(item => {
				item.classList.remove('d-none');
			});

			const viewAllButton = treeElement.querySelector('.view-all-btn');
			if (viewAllButton) {
				viewAllButton.style.display = 'none';
			}
		}

	  	let newParamURL = window.location.search === '' ? '?' : window.location.search + '&';

		newParamURL += parameterName + 'Expanded';

		window.history.pushState({}, "", newParamURL);
	}
</@>