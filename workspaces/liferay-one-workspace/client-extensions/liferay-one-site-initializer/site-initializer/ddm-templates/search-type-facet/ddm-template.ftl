<#assign
	filteredCount = 0
	title = languageUtil.get(locale, "type")
/>

<#list entries as entry>
	<#if entry.isSelected()>
		<#assign filteredCount++>
	</#if>
</#list>

<#if filteredCount gt 0>
	<#assign title = title + " (${filteredCount})" />
</#if>

<@liferay_ui["panel-container"]
	cssClass="border-radius-xlarge facet-panel"
	extended=true
	id="${namespace + 'facetAssetEntriesPanelContainer'}"
	markupView="lexicon"
	persistState=true
>
	<@liferay_ui.panel
		collapsible=true
		cssClass="font-size-paragraph-small font-weight-semi-bold"
		extended=!browserSniffer.isMobile(request)
		id="${namespace + 'facetAssetEntriesPanel'}"
		markupView="lexicon"
		persistState=true
		title="${title}"
	>
		<#if filteredCount gt 0>
			<button class="btn-unstyled clear-btn mb-4" onClick="Liferay.Search.FacetUtil.clearSelections(event);">
				${languageUtil.get(locale, "clear")}
			</button>
		</#if>

		<ul class="list-unstyled mb-0">
			<#list entries as entry>
				<li class="color-neutral-2 facet-value py-1">
					<div class="custom-checkbox custom-control font-weight-normal">
						<label class="facet-checkbox-label" for="${namespace}_term_${entry?index}">
							<input
								${(entry.isSelected())?then("checked","")}
								class="custom-control-input facet-term"
								data-term-id="${entry.getFilterValue()}"
								disabled
								id="${namespace}_term_${entry?index}"
								name="${namespace}_term_${entry?index}"
								onChange="Liferay.Search.FacetUtil.changeSelection(event);"
								type="checkbox"
							/>

							<span class="custom-control-label font-size-paragraph-small term-name ${(entry.isSelected())?then('facet-term-selected', 'facet-term-unselected')}">
								<span class="custom-control-label-text">
									${htmlUtil.escape(entry.getBucketText())}

									<#if entry.isFrequencyVisible()>
										<span class="facet-frequency">(${entry.getFrequency()})</span>
									</#if>
								</span>
							</span>
						</label>
					</div>
				</li>
			</#list>
		</ul>
	</@>

	<hr class="separator" />
</@>