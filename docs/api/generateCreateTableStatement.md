# generateCreateTableStatement(pMeadowTableSchema)

Generates an MSSQL `CREATE TABLE` statement from a Meadow table schema object. Tables are created in the `[dbo]` schema with bracketed column names.

## Signature

```javascript
generateCreateTableStatement(pMeadowTableSchema)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pMeadowTableSchema` | object | Yes | Schema with `TableName` (string) and `Columns` (array) properties |

### Schema Object Format

```javascript
{
	TableName: 'Book',
	Columns:
	[
		{ Column: 'IDBook', DataType: 'ID' },
		{ Column: 'GUIDBook', DataType: 'GUID' },
		{ Column: 'Title', DataType: 'String', Size: 255 },
		{ Column: 'Year', DataType: 'Numeric' },
		{ Column: 'Price', DataType: 'Decimal', Size: '10,2' },
		{ Column: 'Synopsis', DataType: 'Text' },
		{ Column: 'PublishDate', DataType: 'DateTime' },
		{ Column: 'InPrint', DataType: 'Boolean' },
		{ Column: 'IDAuthor', DataType: 'ForeignKey' }
	]
}
```

## Return Value

A string containing the complete `CREATE TABLE` SQL statement.

## Type Mapping

| Meadow DataType | MSSQL Output | Default Value | Notes |
|-----------------|-------------|---------------|-------|
| `ID` | `INT NOT NULL IDENTITY PRIMARY KEY` | -- | Auto-increment with inline primary key |
| `GUID` | `VARCHAR(254)` | `'00000000-0000-0000-0000-000000000000'` | GUID stored as string |
| `ForeignKey` | `INT UNSIGNED NOT NULL` | `0` | Foreign key reference |
| `Numeric` | `INT NOT NULL` | `0` | Integer |
| `Decimal` | `DECIMAL(Size)` | -- | Size is precision spec (e.g. `'10,2'`) |
| `String` | `VARCHAR(Size)` | `''` | Variable-length string |
| `Text` | `TEXT` | -- | Large text |
| `DateTime` | `DATETIME` | -- | Date and time |
| `Boolean` | `TINYINT` | `0` | 0 or 1 |

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
		{ Column: 'Year', DataType: 'Numeric' },
		{ Column: 'Price', DataType: 'Decimal', Size: '10,2' }
	]
};

let tmpSQL = _Fable.MeadowMSSQLProvider.generateCreateTableStatement(tmpSchema);
console.log(tmpSQL);
```

This produces:

```sql
--   [ Book ]
CREATE TABLE [dbo].[Book]
    (
        [IDBook] INT NOT NULL IDENTITY PRIMARY KEY,
        [GUIDBook] VARCHAR(254) DEFAULT '00000000-0000-0000-0000-000000000000',
        [Title] VARCHAR(255) DEFAULT '',
        [Year] INT NOT NULL DEFAULT 0,
        [Price] DECIMAL(10,2)
    );
```

## MSSQL DDL Conventions

- Table names are schema-qualified: `[dbo].[TableName]`
- All column names use bracket notation: `[ColumnName]`
- `ID` columns include `IDENTITY PRIMARY KEY` inline (no separate PRIMARY KEY clause)
- No charset or collation clause (uses SQL Server defaults)
- `GUID` columns use `VARCHAR(254)` with a zeroed GUID default

## Differences from MySQL DDL

| Feature | MySQL | MSSQL |
|---------|-------|-------|
| Table name | `Book` | `[dbo].[Book]` |
| Column names | `Title` | `[Title]` |
| Auto-increment | `INT UNSIGNED NOT NULL AUTO_INCREMENT` | `INT NOT NULL IDENTITY PRIMARY KEY` |
| Primary key | Separate `PRIMARY KEY (col)` clause | Inline on `ID` column |
| GUID default | `'0xDe'` | `'00000000-0000-0000-0000-000000000000'` |
| GUID type | `CHAR(36)` | `VARCHAR(254)` |
| String type | `CHAR(Size)` | `VARCHAR(Size)` |
| Charset | `utf8mb4` collation clause | None |

## Related

- [createTable](createTable.md) -- Execute the generated DDL
- [createTables](createTables.md) -- Create multiple tables from a schema
- [generateDropTableStatement](generateDropTableStatement.md) -- Generate DROP TABLE DDL
- [Schema & Table Creation](../schema.md) -- Full walkthrough
