# MSSQL (getter)

Returns the underlying `mssql` npm package module for direct access to SQL Server type constants and driver features.

## Signature

```javascript
get MSSQL()
```

## Return Value

| Type | Description |
|------|-------------|
| object | The `mssql` npm module |

## Primary Use

The main purpose of this getter is to access type constants for prepared statement parameters:

```javascript
let tmpPS = _Fable.MeadowMSSQLProvider.preparedStatement;

tmpPS.input('bookId', _Fable.MeadowMSSQLProvider.MSSQL.Int);
tmpPS.input('title', _Fable.MeadowMSSQLProvider.MSSQL.VarChar(255));
tmpPS.input('price', _Fable.MeadowMSSQLProvider.MSSQL.Decimal(10, 2));
```

## Type Constants Reference

### Integer Types

| Constant | SQL Server Type | Range |
|----------|----------------|-------|
| `MSSQL.Int` | `INT` | -2^31 to 2^31-1 |
| `MSSQL.BigInt` | `BIGINT` | -2^63 to 2^63-1 |
| `MSSQL.SmallInt` | `SMALLINT` | -32,768 to 32,767 |
| `MSSQL.TinyInt` | `TINYINT` | 0 to 255 |

### String Types

| Constant | SQL Server Type | Description |
|----------|----------------|-------------|
| `MSSQL.VarChar(n)` | `VARCHAR(n)` | Variable-length non-Unicode string |
| `MSSQL.NVarChar(n)` | `NVARCHAR(n)` | Variable-length Unicode string |
| `MSSQL.Char(n)` | `CHAR(n)` | Fixed-length non-Unicode string |
| `MSSQL.NChar(n)` | `NCHAR(n)` | Fixed-length Unicode string |
| `MSSQL.Text` | `TEXT` | Large non-Unicode text |
| `MSSQL.NText` | `NTEXT` | Large Unicode text |

### Numeric Types

| Constant | SQL Server Type | Description |
|----------|----------------|-------------|
| `MSSQL.Decimal(p, s)` | `DECIMAL(p,s)` | Fixed precision and scale |
| `MSSQL.Float` | `FLOAT` | Approximate numeric |

### Date/Time Types

| Constant | SQL Server Type | Description |
|----------|----------------|-------------|
| `MSSQL.DateTime` | `DATETIME` | Date and time (3.33ms precision) |
| `MSSQL.DateTime2(s)` | `DATETIME2(s)` | Higher precision date/time |
| `MSSQL.Date` | `DATE` | Date only |
| `MSSQL.Time` | `TIME` | Time only |

### Other Types

| Constant | SQL Server Type | Description |
|----------|----------------|-------------|
| `MSSQL.Bit` | `BIT` | Boolean (0 or 1) |

## Usage with Prepared Statements

```javascript
let tmpMSSQL = _Fable.MeadowMSSQLProvider.MSSQL;
let tmpPS = _Fable.MeadowMSSQLProvider.preparedStatement;

tmpPS.input('id', tmpMSSQL.Int);
tmpPS.input('name', tmpMSSQL.VarChar(200));
tmpPS.input('price', tmpMSSQL.Decimal(10, 2));
tmpPS.input('published', tmpMSSQL.DateTime);
tmpPS.input('active', tmpMSSQL.Bit);

tmpPS.prepare(
	'INSERT INTO Product ([Name], [Price], [PublishDate], [Active]) VALUES (@name, @price, @published, @active); SELECT SCOPE_IDENTITY() AS ID',
	(pError) =>
	{
		if (pError) { return; }

		tmpPS.execute(
			{
				name: 'Widget',
				price: 19.99,
				published: new Date(),
				active: true
			},
			(pError, pResult) =>
			{
				if (!pError)
				{
					console.log(`Inserted ID: ${pResult.recordset[0].ID}`);
				}
				tmpPS.unprepare(() => {});
			});
	});
```

## Related

- [preparedStatement](preparedStatement.md) -- Create prepared statements that use these types
- [pool](pool.md) -- Direct query access
