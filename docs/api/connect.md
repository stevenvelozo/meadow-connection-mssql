# connect()

Synchronous convenience wrapper that calls `connectAsync()` without a callback.

> **Warning:** This method is **not recommended** because the MSSQL driver requires an asynchronous connection handshake. Using `connect()` can cause race conditions where queries are executed before the pool is ready. Always prefer [connectAsync()](connectAsync.md).

## Signature

```javascript
connect()
```

## Parameters

None.

## Return Value

None.

## Behavior

1. Logs a warning: "The non-async Meadow-MSSQL connect() was called and the Microsoft SQL node driver has an asynchronous connection method; although this may function it will likely cause a race condition."
2. Calls `this.connectAsync()` internally without passing a callback

## Usage

```javascript
// NOT recommended -- use connectAsync() instead
_Fable.MeadowMSSQLProvider.connect();

// The pool may not be ready yet -- race condition!
// _Fable.MeadowMSSQLProvider.pool.query(...) // might fail
```

## Why It Exists

This method exists for API symmetry with other Meadow connection providers (MySQL, SQLite) that support synchronous connection. The `MeadowConnectionMSSQLAutoConnect` flag calls `connect()` during construction, which allows a one-liner instantiation pattern:

```javascript
let _Fable = new libFable(
	{
		"MSSQL":
		{
			"server": "localhost",
			"port": 1433,
			"user": "sa",
			"password": "YourPassword123",
			"database": "bookstore",
			"MeadowConnectionMSSQLAutoConnect": true
		}
	});

_Fable.serviceManager.addAndInstantiateServiceType(
	'MeadowMSSQLProvider', libMeadowConnectionMSSQL);

// Pool is connecting asynchronously -- not guaranteed to be ready yet
```

## Recommended Alternative

```javascript
_Fable.MeadowMSSQLProvider.connectAsync(
	(pError, pPool) =>
	{
		if (pError) return console.error(pError);
		// Pool is guaranteed to be ready here
	});
```

## Related

- [connectAsync](connectAsync.md) -- Async connection (recommended)
- [pool](pool.md) -- Access the connection pool
