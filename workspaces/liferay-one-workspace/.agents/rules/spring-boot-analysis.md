---

paths:
  - "**/liferay-one-etc-spring-boot/**"

---

# Spring Boot Static Analysis

The Liferay source formatter reads every Java file in `liferay-one-etc-spring-boot`, and it checks the whitespace and the import order. It does not check what the code does.

SpotBugs checks what the code does. Configure it to run as part of `check`, so that `./gradlew build` runs it. A branch that has it configured runs it on its own:

```bash
./gradlew :client-extensions:liferay-one-etc-spring-boot:spotbugsMain
```

SpotBugs writes the report to `build/reports/spotbugs/main.html`, and the XML report to the same folder.

## What It Is and Is Not

SpotBugs reads the bytecode. It therefore finds three kinds of defect that a reviewer does not see. The first is a charset that changes with the machine. The second is a static array that any caller can change. The third is a null check on a value that is never null.

SpotBugs does not find the most frequent defect in this client extension. [`concurrency.md`](./concurrency.md) describes shared mutable state on a singleton bean. Three examples are a `HashMap` in a field, a double checked lock on a field that is not `volatile`, and one `SimpleDateFormat` that two threads use. SpotBugs reports only the most direct of these.

A reviewer works from `concurrency.md`. That file has a higher priority than this one, and SpotBugs does not replace it.

## Configuration

Leave `ignoreFailures` on while findings remain, so that SpotBugs reports them and the build still succeeds. Turn `ignoreFailures` off when the count reaches zero.

`spotbugs-exclude.xml` holds two exclusions:

- The `liferay-release-tool-ee` sources. Git checks these files into the source set of this project. This team does not own them.
- `EI_EXPOSE_REP` and `EI_EXPOSE_REP2`. These two rules report every getter that returns a mutable field. This project holds many DTOs, so these two rules report no defect.

SpotBugs reports every other rule. Add an exclusion only when a rule is incorrect for this project. Do not add an exclusion to hide a correct finding.

## What It Finds Here

These are the defect classes SpotBugs reports in this client extension. Correct a new one as soon as it appears.

| Bug | Why it matters |
| --- | --- |
| `MS_MUTABLE_ARRAY` | `final` protects the reference to an array, not the contents. Any caller can write into the array. A Spring singleton shares that array with every request. Return a `List.of(...)`, or return a copy. |
| `CT_CONSTRUCTOR_THROW` | A constructor throws after it builds part of the object. A finalizer can then read that incomplete object. |
| `DM_DEFAULT_ENCODING` | Read this finding first. The section below gives the reason. |
| `MS_EXPOSE_REP` | A method returns a static mutable field to a caller. |
| `RCN_REDUNDANT_NULLCHECK_OF_NONNULL_VALUE` | A null check reads a value that is never null. The code inside the check never runs. |
| `DM_BOXED_PRIMITIVE_FOR_PARSING` | The code calls `Integer.valueOf(s)`. The correct call is `Integer.parseInt(s)`. |
| `SE_COMPARATOR_SHOULD_BE_SERIALIZABLE` | A comparator that a serializable collection holds must be serializable itself. |

### The Encoding Findings

Read the `DM_DEFAULT_ENCODING` findings first, because the ones in `getAuthorization`, `_getAuthorization`, and `_getAccessToken` build the credentials for an outbound request.

A conversion from a string to bytes without a charset uses the default charset of the JVM. That default is UTF-8 on a developer machine. In production the default comes from the locale of the container.

A credential that holds a non-ASCII byte therefore produces different bytes in the two places. The request authenticates on the developer machine and fails after deployment. The stack trace gives no indication of the cause.

Name the charset. Write `StandardCharsets.UTF_8`.

## Enforcement

Every finding class above applies to new code. Record the remaining counts in the branch that owns the SpotBugs configuration, not here: a count is true for one tree and wrong in every other one.