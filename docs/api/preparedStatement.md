# preparedStatement (getter)

Creates and returns a new `mssql.PreparedStatement` bound to the active connection pool. A new instance is created on each access.

## Signature

```javascript
get preparedStatement()
```

## Return Value

| Type | Description |
|------|-------------|
| mssql.PreparedStatement | A new prepared statement bound to the active pool |

## Error Conditions

Throws an error if the pool is not connected:

```
"The Meadow Microsoft SQL provider could not create a prepared statement;
disconnected or no valid connection pool."
```

## Prepared Statement Lifecycle

Each prepared statement follows a strict lifecycle:

1. **Create** -- Access the `preparedStatement` getter
2. **Define inputs** -- Call `ps.input(name, type)` for each parameter
3. **Prepare** -- Call `ps.prepare(sql, callback)` with the SQL template
4. **Execute** -- Call `ps.execute(params, callback)` with parameter values
5. **Unprepare** -- Call `ps.unprepare(callback)` to release resources

## Basic Usage

```javascript
let tmpPS = _Fable.MeadowMSSQLProvider.preparedStatement;

// Define input parameters with MSSQL type constants
tmpPS.input('bookId', _Fable.MeadowMSSQLProvider.MSSQL.Int);

// Prepare the statement
tmpPS.prepare('SELECT * FROM Book WHERE IDBook = @bookId',
	(pError) =>
	{
		if (pError)
		{
			console.error('Prepare failed:', pError);
			return;
		}

		// Execute with parameter values
		tmpPS.execute({ bookId: 42 },
			(pError, pResult) =>
			{
				if (pError)
				{
					console.error('Execute failed:', pError);
				}
				else
				{
					console.log(pResult.recordset);
				}

				// Always unprepare when done
				tmpPS.unprepare(() => {});
			});
	});
```

## Multiple Parameters

```javascript
let tmpPS = _Fable.MeadowMSSQLProvider.preparedStatement;

tmpPS.input('authorName', _Fable.MeadowMSSQLProvider.MSSQL.VarChar(200));
tmpPS.input('minYear', _Fable.MeadowMSSQLProvider.MSSQL.Int);
tmpPS.input('maxPrice', _Fable.MeadowMSSQLProvider.MSSQL.Decimal(10, 2));

tmpPS.prepare(
	'SELECT * FROM Book WHERE Author = @authorName AND Year >= @minYear AND Price <= @maxPrice',
	(pError) =>
	{
		if (pError) { return; }

		tmpPS.execute(
			{ authorName: 'Frank Herbert', minYear: 1960, maxPrice: 29.99 },
			(pError, pResult) =>
			{
				console.log(`Found ${pResult.recordset.length} books.`);
				tmpPS.unprepare(() => {});
			});
	});
```

## Re-executing a Prepared Statement

A prepared statement can be executed multiple times before unpreparing:

```javascript
let tmpPS = _Fable.MeadowMSSQLProvider.preparedStatement;
tmpPS.input('authorId', _Fable.MeadowMSSQLProvider.MSSQL.Int);

tmpPS.prepare('SELECT * FROM Book WHERE IDAuthor = @authorId',
	(pError) =>
	{
		if (pError) { return; }

		// First execution
		tmpPS.execute({ authorId: 1 },
			(pError, pResult1) =>
			{
				console.log(`Author 1: ${pResult1.recordset.length} books`);

				// Second execution with different params
				tmpPS.execute({ authorId: 2 },
					(pError, pResult2) =>
					{
						console.log(`Author 2: ${pResult2.recordset.length} books`);

						// Unprepare when completely done
						tmpPS.unprepare(() => {});
					});
			});
	});
```

## Each Access Creates a New Instance

The getter creates a fresh `PreparedStatement` on every access:

```javascript
let tmpPS1 = _Fable.MeadowMSSQLProvider.preparedStatement;
let tmpPS2 = _Fable.MeadowMSSQLProvider.preparedStatement;

// tmpPS1 and tmpPS2 are independent instances
// They can be prepared with different queries
```

## Related

- [MSSQL](MSSQL.md) -- Access type constants for `ps.input()`
- [pool](pool.md) -- Direct query access (no prepared statements)
- [connectAsync](connectAsync.md) -- Must connect before using prepared statements
