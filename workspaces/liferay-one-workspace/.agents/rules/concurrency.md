# Concurrency

Every Spring stereotype in `liferay-one-etc-spring-boot` is a singleton. One instance of each `@Component`, `@RestController`, and `@Configuration` class serves every HTTP request, every Salesforce Pub/Sub message, and every `@Scheduled` tick — concurrently. Instance fields on those classes are shared mutable state, not per-request scratch space.

This is the easiest defect class to write and the hardest to reproduce: it passes every local test, then corrupts one request in a thousand under real traffic.

## Injected Fields Are Effectively Final

An `@Autowired` field is written once, by Spring, before the bean serves anything. Read it freely; never reassign it at runtime. A field that a request handler writes is not a dependency — it is state, and it needs one of the shapes below.

## Three Sanctioned Shapes For Mutable State

Any field a method assigns after startup must use one of these. Anything else is a defect.

| Shape | Use when | Cost of a race |
| --- | --- | --- |
| `volatile` + idempotent recompute | The value is a cache of something derivable, and computing it twice is harmless | Duplicate fetch, same answer |
| `JiraSyncLock` (or `synchronized`) around the whole read-modify-write | Recomputing has a side effect — creating a record, minting a token, publishing | Duplicate record, wasted token, double publish |
| A concurrent collection (`ConcurrentHashMap`) | The field is a map or set that many threads read and write | Lost entry, or a corrupted `HashMap` that spins forever |

`volatile` is not optional in the first shape. Without it a thread can read a half-published object or never observe another thread's write at all.

```java
// Correct — volatile, and a second fetch would just return the same channel ID
private volatile Long _channelId;

private Long _fetchChannelId() throws Exception {
	if (_channelId != null) {
		return _channelId;
	}

	_channelId = ...;

	return _channelId;
}
```

When the recompute has a side effect, the null check alone is not enough — two threads both see `null` and both act. Take the lock, then check again inside it:

```java
// Correct — double-checked, because _resolveOrCreate() may create the asset object
public String getFirstLineSupportTeamRoleObjectId() {
	String objectId = _firstLineSupportTeamRoleObjectId;

	if (objectId != null) {
		return objectId;
	}

	return _jiraSyncLock.withLock(
		TeamRoleConstants.EXTERNAL_KEY_FIRST_LINE_SUPPORT,
		() -> {
			if (_firstLineSupportTeamRoleObjectId != null) {
				return _firstLineSupportTeamRoleObjectId;
			}

			...
		});
}
```

`JiraSyncLock` (`com.liferay.one.jira.util.JiraSyncLock`) is the workspace's named-lock primitive — prefer it over a bare `synchronized` block whenever the thing being serialized has a natural key, since it lets unrelated keys proceed in parallel.

## Check-Then-Act Is Not Atomic

Two statements that read then write a shared map leave a window between them.

```java
// Wrong — two threads both miss, both put, one entry is lost
if (!_topics.containsKey(name)) {
	_topics.put(name, _createTopic(name));
}

// Correct
_topics.computeIfAbsent(name, this::_createTopic);
```

The same applies to counters (`AtomicLong`, not `long++`) and to any "if absent, create" against an external system, where the fix is a lock rather than a map method.

## Non-Request Threads Reach The Same Fields

A field is not single-threaded just because only one REST endpoint writes it. In this client extension the following all run off the request thread and touch the same beans:

- `@Scheduled` cron methods
- `@Async` methods and `@EventListener(ApplicationReadyEvent.class)` startup warm-ups
- Pub/Sub subscribers, which the Salesforce gRPC client invokes on its own executor

A warm-up that populates a cache at startup while the first request reads it is a real race — that is exactly why the cached ID fields above are `volatile`.

## Date And Number Formatters Are Locals

`SimpleDateFormat`, `DateFormat`, and `NumberFormat` carry mutable parse state and are not thread-safe. Declare them inside the method that uses them, or use `java.time.format.DateTimeFormatter`, which is immutable and safe to hold in a `static final` field.

```java
// Wrong — one instance, many threads, silently wrong dates
private static final DateFormat _dateFormat = new SimpleDateFormat("yyyy-MM-dd");

// Correct — a local per call
DateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd");

// Correct — immutable, so a field is fine
private static final DateTimeFormatter _dateTimeFormatter =
	DateTimeFormatter.ISO_INSTANT;
```

## React: Async Results Outlive Their Effect

`liferay-one-custom-element` has no threads, but it has the same shape of bug: a `fetch` started by an effect can resolve after the component unmounted, or after a newer fetch for different parameters already resolved. The result is a stale render or a state update on a dead component.

Every effect that starts an async call must handle its own cancellation:

```tsx
// Wrong — switching accounts twice renders whichever response is slower
useEffect(() => {
	HeadlessAdminUser.getAccount(accountId).then(setAccount);
}, [accountId]);

// Correct — the stale response is discarded
useEffect(() => {
	let cancelled = false;

	HeadlessAdminUser.getAccount(accountId).then((account) => {
		if (!cancelled) {
			setAccount(account);
		}
	});

	return () => {
		cancelled = true;
	};
}, [accountId]);
```

Prefer an `AbortController` passed into the fetcher when the request is expensive enough to be worth cancelling on the wire, not just ignoring on arrival.

Two related traps in the same family:

- **Stale closures** — an effect or callback with an incomplete dependency array captures the first render's values forever. Read the current value from a ref, or list the dependency.
- **Uncleaned subscriptions** — `setInterval`, `addEventListener`, and any subscribe call must be torn down in the effect's cleanup function.