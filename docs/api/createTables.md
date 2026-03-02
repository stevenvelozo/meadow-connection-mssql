# createTables(pMeadowSchema, fCallback)

Creates all tables defined in a Meadow schema object by calling `createTable()` for each table sequentially.

## Signature

```javascript
createTables(pMeadowSchema, fCallback)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pMeadowSchema` | object | Yes | Schema with a `Tables` array of table schema objects |
| `fCallback` | function | Yes | Callback with signature `(pError)` |

### Schema Object Format

```javascript
{
	Tables:
	[
		{
			TableName: 'Author',
			Columns:
			[
				{ Column: 'IDAuthor', DataType: 'ID' },
				{ Column: 'Name', DataType: 'String', Size: 200 }
			]
		},
		{
			TableName: 'Book',
			Columns:
			[
				{ Column: 'IDBook', DataType: 'ID' },
				{ Column: 'Title', DataType: 'String', Size: 255 },
				{ Column: 'IDAuthor', DataType: 'ForeignKey' }
			]
		}
	]
}
```

## Return Value

None (result provided via callback).

## Behavior

1. Iterates `pMeadowSchema.Tables` using `fable.Utility.eachLimit()` with a concurrency of 1 (serial)
2. Calls `createTable()` for each table in the array
3. If any table creation fails (with an error other than "already exists"), logs the error and passes it to the final callback
4. On completion, logs "Done creating tables!" and calls `fCallback()`

## Basic Usage

```javascript
let tmpFullSchema =
{
	Tables:
	[
		{
			TableName: 'Author',
			Columns:
			[
				{ Column: 'IDAuthor', DataType: 'ID' },
				{ Column: 'GUIDAuthor', DataType: 'GUID' },
				{ Column: 'Name', DataType: 'String', Size: 200 },
				{ Column: 'Bio', DataType: 'Text' }
			]
		},
		{
			TableName: 'Book',
			Columns:
			[
				{ Column: 'IDBook', DataType: 'ID' },
				{ Column: 'GUIDBook', DataType: 'GUID' },
				{ Column: 'Title', DataType: 'String', Size: 255 },
				{ Column: 'Year', DataType: 'Numeric' },
				{ Column: 'IDAuthor', DataType: 'ForeignKey' }
			]
		}
	]
};

_Fable.MeadowMSSQLProvider.createTables(tmpFullSchema,
	(pError) =>
	{
		if (pError)
		{
			console.error('Schema creation failed:', pError);
			return;
		}
		console.log('All tables created.');
	});
```

## Serial Execution

Tables are created one at a time (concurrency of 1). This respects dependency ordering and avoids concurrent DDL issues with SQL Server.

## Error Handling

If a table creation fails with an error other than "table already exists", execution stops and the error is passed to the callback. Tables created before the failure remain in the database.

## Related

- [createTable](createTable.md) -- Create a single table
- [generateCreateTableStatement](generateCreateTableStatement.md) -- Generate DDL without executing
- [Schema & Table Creation](../schema.md) -- Full walkthrough
