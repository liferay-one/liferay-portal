<#function getCustomFieldData navigationMenuItem name>
	<#list (navigationMenuItem.customFields)![] as customField>
		<#if customField.name == name>
			<#assign data = (customField.customValue.data)!"" />

			<#if data?is_sequence>
				<#return (data?first)!"" />
			</#if>

			<#return data />
		</#if>
	</#list>

	<#return "" />
</#function>

<#function getNavigationMenuItemURL navigationMenuItem>
	<#if stringUtil.equals((navigationMenuItem.type)!"", "layout")>
		<#return (layoutFriendlyURLs[(navigationMenuItem.typeSettings.externalReferenceCode)!""])!"" />
	</#if>

	<#return (navigationMenuItem.typeSettings.url)!"" />
</#function>

<#function hasLayoutNavigationMenuItems navigationMenuItems>
	<#list navigationMenuItems as navigationMenuItem>
		<#if stringUtil.equals((navigationMenuItem.type)!"", "layout") || hasLayoutNavigationMenuItems((navigationMenuItem.navigationMenuItems)![])>
			<#return true />
		</#if>
	</#list>

	<#return false />
</#function>

<#assign
	canBypassMyAccount = false
	hasMarketplacePublisherRole = false
/>

<#attempt>
	<#if themeDisplay.isSignedIn()>
		<#list themeDisplay.getUser().getRoles() as userRole>
			<#if stringUtil.equals(userRole.getName(), "Administrator") || stringUtil.equals(userRole.getName(), "Liferay Staff")>
				<#assign canBypassMyAccount = true />
			</#if>

			<#if stringUtil.equals(userRole.getName(), "Marketplace Publisher")>
				<#assign hasMarketplacePublisherRole = true />
			</#if>
		</#list>
	</#if>
<#recover>
	<#assign
		canBypassMyAccount = false
		hasMarketplacePublisherRole = false
	/>
</#attempt>

<#attempt>
	<#assign navigationMenu = restClient.get("/headless-delivery/v1.0/sites/" + themeDisplay.getScopeGroupId()?c + "/navigation-menus/by-external-reference-code/LO_PRIMARY_NAV?nestedFields=customFields,navigationMenuItems") />
<#recover>
	<#assign navigationMenu = {} />
</#attempt>

<#assign layoutFriendlyURLs = {} />

<#if ((navigationMenu.navigationMenuItems)?? && hasLayoutNavigationMenuItems(navigationMenu.navigationMenuItems))>
	<#attempt>
		<#assign sitePages = restClient.get("/headless-delivery/v1.0/sites/" + themeDisplay.getScopeGroupId()?c + "/site-pages?fields=friendlyUrlPath,uuid&pageSize=-1") />

		<#list (sitePages.items)![] as sitePage>
			<#assign layoutFriendlyURLs = layoutFriendlyURLs + {(sitePage.uuid)!"": (sitePage.friendlyUrlPath)!""} />
		</#list>
	<#recover>
		<#assign layoutFriendlyURLs = {} />
	</#attempt>
</#if>

<#assign activeSectionName = "" />

<#attempt>
	<#assign topLayout = themeDisplay.getLayout() />

	<#list themeDisplay.getLayout().getAncestors() as ancestorLayout>
		<#assign topLayout = ancestorLayout />
	</#list>

	<#assign activeSectionName = topLayout.getName(locale) />
<#recover>
	<#assign activeSectionName = "" />
</#attempt>

<ul class="adt-navigation" data-account-bypass="${canBypassMyAccount?c}">
	<#if (navigationMenu.navigationMenuItems)??>
		<#list navigationMenu.navigationMenuItems as navPrimaryItem>
			<#assign
				navPrimaryItemName = (navPrimaryItem.name)!""
				navPrimaryItemURL = getNavigationMenuItemURL(navPrimaryItem)
				isActiveSection = activeSectionName?has_content && stringUtil.equals(navPrimaryItemName, activeSectionName)
			/>

			<#if !navPrimaryItemName?has_content>
			<#elseif (stringUtil.equals(navPrimaryItemName, "My Account") || stringUtil.equals(navPrimaryItemName, "Admin")) && !themeDisplay.isSignedIn()>
			<#elseif (((navPrimaryItem.navigationMenuItems)![])?size > 0)>
				<div class="adt-nav-item dropdown dropdown-action<#if isActiveSection> selected</#if> w-100">
					<button
						aria-expanded="true"
						class="adt-nav-text align-items-center d-flex menu-info"
						data-toggle="liferay-dropdown"
						id="main-menu-id"
						tabindex="4"
					>
						<span class="adt-nav-title text-truncate">
							${navPrimaryItemName}
						</span>
						<span class="adt-nav-caret-bottom-icon align-self-center">
							<svg class="lexicon-icon lexicon-icon-caret-bottom" role="presentation" viewBox="0 0 512 512"><use xlink:href="/o/admin-theme/images/clay/icons.svg#caret-bottom"></use></svg>
						</span>
					</button>

					<@renderNavigationDropdown navPrimaryItem />
				</div>
			<#elseif navPrimaryItemURL?has_content>
				<a class="adt-nav-item<#if isActiveSection> selected</#if> w-100" href="${navPrimaryItemURL}"<#if stringUtil.equals((navPrimaryItem.typeSettings.useNewTab)!"", "true")> target="_blank"</#if>>
					<div class="adt-nav-text d-flex pr-3" tabindex="4">
						<span class="adt-nav-title text-truncate">
							${navPrimaryItemName}
						</span>
					</div>
				</a>
			</#if>
		</#list>
	</#if>
</ul>

<#macro renderNavigationDropdown
	navPrimaryItem
>
	<div class="adt-submenu dropdown-menu main-menu-dropdown position-absolute pt-2">
		<div class="adt-submenu-outer-wrapper container-fluid-max-xl">
			<div class="adt-submenu-inner-wrapper">
				<#list (navPrimaryItem.navigationMenuItems)![] as navSecondaryItem>
					<#assign
						backgroundColor = getCustomFieldData(navSecondaryItem, "Submenu Background")
						childColumns = getCustomFieldData(navSecondaryItem, "Submenu Child Columns")
						columnSpan = getCustomFieldData(navSecondaryItem, "Submenu Column Span")
						imageURL = getCustomFieldData(navSecondaryItem, "Menu Item Image URL")
						menuItemType = getCustomFieldData(navSecondaryItem, "Menu Item Type")
						navSecondaryItemName = (navSecondaryItem.name)!""
					/>

					<#if childColumns?has_content>
						<#assign childColumns = (columnSpan?number / childColumns?number)?floor?string />
					</#if>

					<#if columnSpan?has_content>
						<#assign columnSpan = "_" + columnSpan + "-section-span" />
					</#if>

					<ul class="adt-submenu-section ${backgroundColor} ${columnSpan}">
						<li class="adt-submenu-header color-neutral-8 font-size-small-caps">
							<#if stringUtil.equals(menuItemType, "Image") && imageURL?has_content>
								<img class="adt-submenu-header-image" loading="lazy" src="${imageURL}" />
							</#if>
							${navSecondaryItemName}
						</li>

						<#list (navSecondaryItem.navigationMenuItems)![] as navTertiaryItem>
							<#assign
								descriptionText = getCustomFieldData(navTertiaryItem, "Menu Item Description")
								imageURL = getCustomFieldData(navTertiaryItem, "Menu Item Image URL")
								menuItemType = getCustomFieldData(navTertiaryItem, "Menu Item Type")
								navTertiaryItemName = (navTertiaryItem.name)!""
								navTertiaryItemURL = getNavigationMenuItemURL(navTertiaryItem)
								preheaderText = getCustomFieldData(navTertiaryItem, "Menu Item Preheader")
							/>

							<#if navTertiaryItemName?has_content && navTertiaryItemURL?has_content && !(stringUtil.equals(navTertiaryItemName, "Publisher Dashboard") && !hasMarketplacePublisherRole)>
								<li class="adt-submenu-item-content ${menuItemType?lower_case}-type grid-column-span-${childColumns}">
									<a class="adt-submenu-item-link" href="${navTertiaryItemURL}" tabindex="4">
										<#if stringUtil.equals(menuItemType, "Image") && imageURL?has_content>
											<img class="adt-submenu-item-image" loading="lazy" src="${imageURL}" />
										</#if>

										<div class="adt-submenu-item-text">
											<#if stringUtil.equals(menuItemType, "Image") && preheaderText?has_content>
												<div class="adt-submenu-item-preheader color-neutral-3 font-weight-semi-bold">
													${preheaderText}
												</div>
											</#if>

											<div class="adt-submenu-item-title h5" data-nav-name="${navTertiaryItemName}">
												${navTertiaryItemName}
											</div>

											<#if descriptionText?has_content>
												<div class="adt-submenu-item-description">
													${descriptionText}
												</div>
											</#if>
										</div>
									</a>
								</li>
							</#if>
						</#list>
					</ul>
				</#list>
			</div>
		</div>
	</div>
</#macro>