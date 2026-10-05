---

paths:
  - "**/*.css"
  - "**/*.scss"

---

# CSS Sort Order

This rule applies [202] Sort sortable sequences to CSS. Sort the rules in a stylesheet, and the nested rules in each block, by the type of their first simple selector:

1. Nested `&` rules, such as `&:hover` and `&.active`.

1. HTML element selectors, such as `body`, `button`, `hr`, `nav`, `svg`, and `ul`.

1. ID selectors, such as `#main-content`.

1. Class selectors, such as `.card-title`, and other selectors that start with a class, a pseudo class, an attribute, or a combinator.

1. At rules, such as `@media`.

Inside each group, sort the selectors case sensitively in ASCII order. A space sorts before `.`, and `.` sorts before `:`, so `body .container-fluid-max-xl` comes before `body.page-maximized` and `body:not(...)`. Sort the selectors in a selector list in the same order, and sort the properties in each block alphabetically.

Declarations come first in a block, then the nested rules in the order above, with one blank line between them.

```css
/* Wrong */

.facet-panel {
	overflow: hidden;

	.panel-body {
		padding: 0;
	}

	&:hover {
		border-color: var(--primary);
	}

	hr.separator {
		display: none;
	}
}

/* Correct */

.facet-panel {
	overflow: hidden;

	&:hover {
		border-color: var(--primary);
	}

	hr.separator {
		display: none;
	}

	.panel-body {
		padding: 0;
	}
}
```

## The Cascade Wins Over the Sort

The order of two rules is a dependency when they have the same specificity, can match the same element, and set the same property. The later rule wins, so a reorder changes what the page shows. Keep the order in these cases and do not sort them:

- A `:hover` or `:focus` rule before an `.active` rule that must override it.

- A `max-width` media query before a smaller `max-width` media query that must override it.

Before you move a rule, compare its specificity and its properties with each rule that it moves past.