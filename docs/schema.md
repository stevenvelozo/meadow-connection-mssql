# Schema & Table Creation

Meadow Connection MSSQL can generate and execute CREATE TABLE statements from Meadow schema definitions. This lets you bootstrap a SQL Server database directly from your model.

## Generating a CREATE TABLE Statement

Pass a Meadow table schema object to `generateCreateTableStatement()`:

```javascript
let tmpSchema = {
    TableName: 'Book',
    Columns: [
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
};

let tmpSQL = _Fable.MeadowMSSQLProvider.generateCreateTableStatement(tmpSchema);
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
        [Price] DECIMAL(10,2),
        [Synopsis] TEXT,
        [PublishDate] DATETIME,
        [InPrint] TINYINT DEFAULT 0,
        [IDAuthor] INT UNSIGNED NOT NULL DEFAULT 0
    );
```

Note the MSSQL-specific conventions: `[dbo].[TableName]` schema qualification, `[ColumnName]` bracket notation, and `IDENTITY PRIMARY KEY` for auto-increment columns.

## Meadow Data Types

| Meadow Type | MSSQL Type | Default | Notes |
|-------------|-----------|---------|-------|
| `ID` | `INT NOT NULL IDENTITY PRIMARY KEY` | -- | Auto-increment with inline primary key |
| `GUID` | `VARCHAR(254)` | `'00000000-0000-0000-0000-000000000000'` | GUID stored as string |
| `ForeignKey` | `INT UNSIGNED NOT NULL` | `0` | |
| `Numeric` | `INT NOT NULL` | `0` | |
| `Decimal` | `DECIMAL(Size)` | -- | Size is the precision spec (e.g. `'10,2'`) |
| `String` | `VARCHAR(Size)` | `''` | |
| `Text` | `TEXT` | -- | |
| `DateTime` | `DATETIME` | -- | |
| `Boolean` | `TINYINT` | `0` | |

## Differences from MySQL DDL

If you are coming from the MySQL connection module, note these differences:

| Feature | MySQL | MSSQL |
|---------|-------|-------|
| Table name | `Book` | `[dbo].[Book]` |
| Column names | `Title` | `[Title]` |
| Auto-increment | `INT UNSIGNED NOT NULL AUTO_INCREMENT` | `INT NOT NULL IDENTITY PRIMARY KEY` |
| Primary key | Separate `PRIMARY KEY (col)` clause | Inline on `ID` column |
| GUID default | `'0xDe'` | `'00000000-0000-0000-0000-000000000000'` |
| GUID type | `CHAR(36)` | `VARCHAR(254)` |
| String type | `CHAR(Size)` | `VARCHAR(Size)` |
| Charset | `utf8mb4` collation clause | None (server default) |

## Creating a Single Table

Execute the CREATE TABLE against the connected pool:

```javascript
_Fable.MeadowMSSQLProvider.createTable(tmpSchema,
    (pError) =>
    {
        if (pError) return console.error(pError);
        console.log('Table created.');
    });
```

If the table already exists, the error is caught and execution continues without failing.

## Creating Multiple Tables

Pass a full Meadow schema (with a `Tables` array) to create all tables sequentially:

```javascript
let tmpFullSchema = {
    Tables: [
        { TableName: 'Author', Columns: [...] },
        { TableName: 'Book', Columns: [...] },
        { TableName: 'BookAuthorJoin', Columns: [...] }
    ]
};

_Fable.MeadowMSSQLProvider.createTables(tmpFullSchema,
    (pError) =>
    {
        if (pError) return console.error(pError);
        console.log('All tables created.');
    });
```

Tables are created one at a time (serial, not parallel) to respect dependency ordering.

## Dropping a Table

Generate an MSSQL-safe DROP TABLE statement that checks existence first:

```javascript
let tmpDropSQL = _Fable.MeadowMSSQLProvider.generateDropTableStatement('Book');
```

This produces:

```sql
IF OBJECT_ID('dbo.[Book]', 'U') IS NOT NULL
    DROP TABLE dbo.[Book];
GO
```

Execute it against the pool yourself:

```javascript
_Fable.MeadowMSSQLProvider.pool.query(tmpDropSQL)
    .then(() => console.log('Table dropped.'))
    .catch((pError) => console.error(pError));
```
