# createTable(pMeadowTableSchema, fCallback)

Generates and executes a `CREATE TABLE` statement against the connected MSSQL pool.

## Signature

```javascript
createTable(pMeadowTableSchema, fCallback)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pMeadowTableSchema` | object | Yes | Schema with `TableName` and `Columns` array |
| `fCallback` | function | Yes | Callback with signature `(pError)` |

## Return Value

None (result provided via callback).

## Behavior

1. Calls `generateCreateTableStatement(pMeadowTableSchema)` to produce the DDL string
2. Executes via `this._ConnectionPool.query()` (Promise-based)
3. On success:
   - Logs info: "Meadow-MSSQL CREATE TABLE [TableName] Success"
   - Logs warning with the full SQL statement
   - Calls `fCallback()` with no error
4. On error:
   - Checks if the error indicates the table already exists (via `originalError.info.message`)
   - If table exists: silently succeeds, calls `fCallback()` with no error
   - Otherwise: logs the error, calls `fCallback(pError)`

## Basic Usage

```javascript
let tmpSchema =
{
	TableName: 'Book',
	Columns:
	[
		{ Column: 'IDBook', DataType: 'ID' },
		{ Column: 'GUIDBook', DataType: 'GUID' },
		{ Column: 'Title', DataType: 'String', Size: 255 },
		{ Column: 'Author', DataType: 'String', Size: 128 },
		{ Column: 'Year', DataType: 'Numeric' }
	]
};

_Fable.MeadowMSSQLProvider.createTable(tmpSchema,
	(pError) =>
	{
		if (pError)
		{
			console.error('Table creation failed:', pError);
			return;
		}
		console.log('Book table created successfully.');
	});
```

## Idempotent Operation

Calling `createTable()` for an existing table does not produce an error. The "table already exists" error is caught internally and execution continues:

```
// No error -- table simply already existed
```

This makes `createTable()` safe to call during application startup.

## Prerequisites

The connection pool must be established before calling `createTable()`:

```javascript
_Fable.MeadowMSSQLProvider.connectAsync(
	(pError) =>
	{
		if (pError) { return; }

		_Fable.MeadowMSSQLProvider.createTable(tmpSchema,
			(pCreateError) =>
			{
				if (pCreateError) { console.error(pCreateError); }
			});
	});
```

## Related

- [generateCreateTableStatement](generateCreateTableStatement.md) -- Generate DDL without executing
- [createTables](createTables.md) -- Create multiple tables sequentially
- [generateDropTableStatement](generateDropTableStatement.md) -- Generate DROP TABLE DDL
- [Schema & Table Creation](../schema.md) -- Full walkthrough
