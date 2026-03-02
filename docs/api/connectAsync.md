# connectAsync(fCallback)

Asynchronously establishes a connection pool to Microsoft SQL Server. This is the **recommended** connection method -- MSSQL connections are inherently asynchronous due to the TDS protocol handshake.

## Signature

```javascript
connectAsync(fCallback)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `fCallback` | function | Yes | Callback with signature `(pError, pConnectionPool)` |

## Return Value

None (result provided via callback).

## Callback Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `pError` | Error or null | Connection error, if any |
| `pConnectionPool` | mssql Pool | The connected mssql pool instance |

## Behavior

1. If `fCallback` is not a function, logs an error and substitutes a no-op callback
2. If a pool already exists (`this._ConnectionPool` is truthy):
   - Logs an error with cleansed connection details (password masked)
   - Returns the existing pool via the callback (prevents duplicate connections)
3. If not connected:
   - Logs the connection attempt details (server, port, user, database, pool limit)
   - Calls `mssql.connect()` with the resolved settings (Promise-based)
   - Applies hardcoded pool, timeout, and TLS settings
   - On success: sets `connected = true`, logs success, calls callback with `(null, pool)`
   - On error: logs the error, calls callback with `(error)`

## Basic Usage

```javascript
const libFable = require('fable');
const libMeadowConnectionMSSQL = require('meadow-connection-mssql');

let _Fable = new libFable(
	{
		"MSSQL":
		{
			"server": "localhost",
			"port": 1433,
			"user": "sa",
			"password": "YourPassword123",
			"database": "bookstore"
		}
	});

_Fable.serviceManager.addServiceType('MeadowMSSQLProvider', libMeadowConnectionMSSQL);
_Fable.serviceManager.instantiateServiceProvider('MeadowMSSQLProvider');

_Fable.MeadowMSSQLProvider.connectAsync(
	(pError, pPool) =>
	{
		if (pError)
		{
			console.error('Connection failed:', pError);
			return;
		}

		// pPool is the mssql connection pool
		pPool.query('SELECT TOP 5 * FROM Book')
			.then((pResult) =>
			{
				console.log(`Found ${pResult.recordset.length} books.`);
			});
	});
```

## Double-Connect Guard

Calling `connectAsync()` a second time returns the existing pool without creating a new one:

```javascript
_Fable.MeadowMSSQLProvider.connectAsync(
	(pError, pPool1) =>
	{
		// First call -- pool created

		_Fable.MeadowMSSQLProvider.connectAsync(
			(pError, pPool2) =>
			{
				// Second call -- logs error, returns existing pool
				// "already established a connection"
			});
	});
```

## Missing Callback Warning

If called without a callback, `connectAsync()` logs an error:

```javascript
// Not recommended
_Fable.MeadowMSSQLProvider.connectAsync();
// Logs error about missing callback
```

## Related

- [connect](connect.md) -- Synchronous wrapper (not recommended)
- [pool](pool.md) -- Access the connection pool
