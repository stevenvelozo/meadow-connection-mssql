# API Reference

## Class: MeadowConnectionMSSQL

Extends `FableServiceProviderBase` from fable-serviceproviderbase.

```javascript
const libMeadowConnectionMSSQL = require('meadow-connection-mssql');
```

## Constructor

```javascript
new MeadowConnectionMSSQL(pFable, pManifest, pServiceHash)
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pFable` | Fable instance | Yes | The Fable instance for DI and configuration |
| `pManifest` | object | No | Service options |
| `pServiceHash` | string | No | Service instance hash |

**Construction behavior:**

1. Reads `MSSQL` settings from `pFable.settings` if present
2. Copies `server`, `port`, `user`, `password`, `database` into `this.options`
3. Defaults `port` to 1433 if not specified
4. Sets `this.connected = false`
5. Does **not** auto-connect (connection is async and must go through `connectAsync`)

## Instance Properties

### connected

- **Type:** boolean
- **Default:** `false`
- **Description:** Whether the connection pool has been established.

### pool

- **Type:** mssql ConnectionPool (getter)
- **Description:** The underlying mssql connection pool. Use for direct queries.

```javascript
_Fable.MeadowMSSQLProvider.pool.query('SELECT TOP 10 * FROM Book')
    .then((pResult) =>
    {
        console.log(pResult.recordset);
    });
```

Note: MSSQL pool queries return a Promise. Results are in `pResult.recordset` (an array of row objects).

### preparedStatement

- **Type:** mssql PreparedStatement (getter)
- **Description:** Creates a new PreparedStatement bound to the current pool. Throws an error if not connected.

```javascript
let tmpPS = _Fable.MeadowMSSQLProvider.preparedStatement;
tmpPS.input('id', _Fable.MeadowMSSQLProvider.MSSQL.Int);
tmpPS.prepare('SELECT * FROM Book WHERE IDBook = @id',
    (pError) =>
    {
        tmpPS.execute({ id: 42 },
            (pError, pResult) =>
            {
                console.log(pResult.recordset);
                tmpPS.unprepare(() => {});
            });
    });
```

### MSSQL

- **Type:** mssql module (getter)
- **Description:** The underlying `mssql` npm package. Use this to access SQL Server type constants for prepared statement parameters.

Common types:

| Constant | Use |
|----------|-----|
| `MSSQL.Int` | Integer parameters |
| `MSSQL.VarChar` | Variable-length strings |
| `MSSQL.NVarChar` | Unicode strings |
| `MSSQL.Decimal` | Decimal numbers |
| `MSSQL.DateTime` | Date/time values |
| `MSSQL.Bit` | Boolean values |
| `MSSQL.Text` | Large text |

### serviceType

- **Type:** string
- **Value:** `'MeadowConnectionMSSQL'`

## Instance Methods

### connectAsync(fCallback)

Asynchronously connects to SQL Server and creates a connection pool.

```javascript
_Fable.MeadowMSSQLProvider.connectAsync(
    (pError, pConnectionPool) =>
    {
        if (pError) return console.error(pError);
        console.log('Connected!');
    });
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `fCallback` | function | Yes | Callback with signature `(pError, pConnectionPool)` |

**Behavior:**

- If already connected, returns the existing pool (no duplicate connections)
- Creates a pool via `mssql.connect()` with the resolved settings
- Sets `this.connected = true` and `this._ConnectionPool` on success
- Logs connection details (password masked)
- Logs an error if called without a callback (defaults to a no-op)

### connect()

Synchronous wrapper that calls `connectAsync()` without a callback. **Not recommended** -- logs a warning about potential race conditions. Prefer `connectAsync()`.

### generateCreateTableStatement(pMeadowTableSchema)

Generates an MSSQL CREATE TABLE statement from a Meadow table schema.

```javascript
let tmpSQL = _Fable.MeadowMSSQLProvider.generateCreateTableStatement(schema);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `pMeadowTableSchema` | object | Schema with `TableName` and `Columns` array |

**Returns:** A string containing the CREATE TABLE DDL with `[dbo].[TableName]` notation.

See [Schema & Table Creation](schema.md) for the full type mapping.

### createTable(pMeadowTableSchema, fCallback)

Generates and executes a CREATE TABLE statement against the connection pool.

```javascript
_Fable.MeadowMSSQLProvider.createTable(schema,
    (pError) =>
    {
        if (pError) console.error(pError);
    });
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `pMeadowTableSchema` | object | Schema with `TableName` and `Columns` array |
| `fCallback` | function | Callback with signature `(pError)` |

**Behavior:**

- Generates the DDL via `generateCreateTableStatement()`
- Executes it via the pool's Promise-based `query()` method
- If the table already exists, catches the error and continues
- Other errors are passed to the callback

### createTables(pMeadowSchema, fCallback)

Creates all tables in a Meadow schema sequentially.

```javascript
_Fable.MeadowMSSQLProvider.createTables(fullSchema,
    (pError) =>
    {
        if (pError) console.error(pError);
    });
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `pMeadowSchema` | object | Schema with a `Tables` array of table schemas |
| `fCallback` | function | Callback with signature `(pError)` |

Tables are created one at a time using `fable.Utility.eachLimit()` with a concurrency of 1.

### generateDropTableStatement(pTableName)

Generates an MSSQL-safe DROP TABLE statement that checks for existence first.

```javascript
let tmpSQL = _Fable.MeadowMSSQLProvider.generateDropTableStatement('Book');
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `pTableName` | string | The table name to drop |

**Returns:** A string containing:

```sql
IF OBJECT_ID('dbo.[Book]', 'U') IS NOT NULL
    DROP TABLE dbo.[Book];
GO
```

## Configuration Reference

```json
{
    "MSSQL": {
        "server": "localhost",
        "port": 1433,
        "user": "sa",
        "password": "YourPassword",
        "database": "myapp",
        "MeadowConnectionMSSQLAutoConnect": false
    }
}
```

All properties use camelCase (matching the `mssql` npm package convention).
