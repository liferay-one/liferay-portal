<nav aria-label="breadcrumb">
<ol class="breadcrumb">
	<li class="breadcrumb-item">
			<a class="text-dark" href="/home">
				Home
			</a>
		</li>

	<li class="breadcrumb-item">
			<a class="text-dark" href="/marketplace/applications">
				Applications
			</a>
		</li>

	<li class="breadcrumb-item active" aria-current="page">
			<#if (ObjectField_publisherName.getData())??>
				${ObjectField_publisherName.getData()}
			</#if>
		</li>
</ol>
</nav>