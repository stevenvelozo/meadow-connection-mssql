# pool (getter)

Returns the underlying mssql connection pool for direct query access.

## Signature

```javascript
get pool()
```

## Return Value

| Type | Description |
|------|-------------|
| mssql ConnectionPool | The connection pool instance (after successful `connectAsync()`) |
| `undefined` | Before connection |

## Basic Usage

```javascript
_Fable.MeadowMSSQLProvider.connectAsync(
	(pError) =>
	{
		if (pError) { return; }

		let tmpPool = _Fable.MeadowMSSQLProvider.pool;

		tmpPool.query('SELECT TOP 10 * FROM Book')
			.then((pResult) =>
			{
				for (let i = 0; i < pResult.recordset.length; i++)
				{
					console.log(`[${pResult.recordset[i].IDBook}] ${pResult.recordset[i].Title}`);
				}
			})
			.catch((pError) =>
			{
				console.error('Query failed:', pError);
			});
	});
```

## Query Methods

The mssql pool exposes these primary methods:

### query(sql) → Promise

Execute a SQL query. Returns a Promise:

```javascript
let tmpPool = _Fable.MeadowMSSQLProvider.pool;

tmpPool.query('SELECT COUNT(*) AS Total FROM Book')
	.then((pResult) =>
	{
		console.log(`Total books: ${pResult.recordset[0].Total}`);
	})
	.catch((pError) =>
	{
		console.error(pError);
	});
```

### Result Object

The Promise resolves with a result object containing:

| Property | Type | Description |
|----------|------|-------------|
| `recordset` | Array | Array of row objects (primary result set) |
| `recordsets` | Array | Array of all result sets (for multi-statement queries) |
| `rowsAffected` | Array | Number of rows affected by each statement |

### Using async/await

```javascript
try
{
	let tmpResult = await _Fable.MeadowMSSQLProvider.pool.query(
		'SELECT TOP 10 * FROM Book ORDER BY Title');
	console.log(`Found ${tmpResult.recordset.length} books.`);
}
catch (pError)
{
	console.error('Query failed:', pError);
}
```

## Checking Connection State

Always verify the pool is available before using it:

```javascript
if (!_Fable.MeadowMSSQLProvider.connected)
{
	console.error('Not connected to SQL Server.');
	return;
}

let tmpPool = _Fable.MeadowMSSQLProvider.pool;
```

## Related

- [connectAsync](connectAsync.md) -- Create the connection pool
- [preparedStatement](preparedStatement.md) -- Create parameterized queries
- [MSSQL](MSSQL.md) -- Access type constants
