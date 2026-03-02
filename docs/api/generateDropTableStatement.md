# generateDropTableStatement(pTableName)

Generates an MSSQL-safe `DROP TABLE` statement that checks for table existence before dropping using `IF OBJECT_ID`.

## Signature

```javascript
generateDropTableStatement(pTableName)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pTableName` | string | Yes | The name of the table to drop (without schema prefix) |

## Return Value

A string containing the `IF OBJECT_ID ... DROP TABLE` SQL statement with a `GO` batch separator.

## Generated SQL

```javascript
let tmpSQL = _Fable.MeadowMSSQLProvider.generateDropTableStatement('Book');
console.log(tmpSQL);
```

Produces:

```sql
IF OBJECT_ID('dbo.[Book]', 'U') IS NOT NULL
    DROP TABLE dbo.[Book];
GO
```

### SQL Explained

- `OBJECT_ID('dbo.[Book]', 'U')` -- Checks if a user table (`'U'`) named `dbo.[Book]` exists
- The `IF NOT NULL` guard prevents errors when dropping a table that does not exist
- `GO` is a batch separator that ensures the DROP completes before any subsequent statements

## Basic Usage

This method only generates the SQL string -- it does not execute it. Run it against the pool yourself:

```javascript
let tmpDropSQL = _Fable.MeadowMSSQLProvider.generateDropTableStatement('Book');

_Fable.MeadowMSSQLProvider.pool.query(tmpDropSQL)
	.then(() =>
	{
		console.log('Table dropped.');
	})
	.catch((pError) =>
	{
		console.error('Drop failed:', pError);
	});
```

## Recreating a Table

Combine with `createTable()` to drop and recreate a table:

```javascript
let tmpDropSQL = _Fable.MeadowMSSQLProvider.generateDropTableStatement('Book');

_Fable.MeadowMSSQLProvider.pool.query(tmpDropSQL)
	.then(() =>
	{
		_Fable.MeadowMSSQLProvider.createTable(tmpBookSchema,
			(pCreateError) =>
			{
				if (pCreateError) { console.error(pCreateError); return; }
				console.log('Table recreated.');
			});
	})
	.catch((pError) =>
	{
		console.error('Drop failed:', pError);
	});
```

## Difference from MySQL

The MySQL connector uses a simpler `DROP TABLE IF EXISTS` syntax. The MSSQL version uses `IF OBJECT_ID` because SQL Server does not support the `IF EXISTS` clause on `DROP TABLE` in older versions:

| MySQL | MSSQL |
|-------|-------|
| `DROP TABLE IF EXISTS Book;` | `IF OBJECT_ID('dbo.[Book]', 'U') IS NOT NULL DROP TABLE dbo.[Book]; GO` |

## Related

- [generateCreateTableStatement](generateCreateTableStatement.md) -- Generate CREATE TABLE DDL
- [createTable](createTable.md) -- Create a table from schema
- [pool](pool.md) -- Execute queries directly
