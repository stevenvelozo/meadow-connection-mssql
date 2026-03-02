# API Reference

Complete method and property documentation for `MeadowConnectionMSSQL`.

---

## Class: MeadowConnectionMSSQL

Extends `FableServiceProviderBase` from [fable-serviceproviderbase](https://github.com/stevenvelozo/fable-serviceproviderbase).

```javascript
const libMeadowConnectionMSSQL = require('meadow-connection-mssql');
```

---

## Constructor

```javascript
new MeadowConnectionMSSQL(pFable, pManifest, pServiceHash)
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pFable` | Fable instance | Yes | The Fable instance for DI and configuration |
| `pManifest` | object | No | Service options |
| `pServiceHash` | string | No | Service instance hash for multiple instances |

**Construction behavior:**

1. Reads `MSSQL` settings from `pFable.settings` if present
2. Copies `server`, `port`, `user`, `password`, `database` into `this.options`
3. Defaults `port` to 1433 if not specified
4. Sets `this.connected = false`
5. Does **not** auto-connect (MSSQL connections are asynchronous)

---

## Properties

### connected

- **Type:** `boolean`
- **Default:** `false`

Whether the connection pool has been established. Set to `true` after a successful `connectAsync()` call.

```javascript
if (_Fable.MeadowMSSQLProvider.connected)
{
	console.log('Pool is ready.');
}
```

### pool

- **Type:** mssql ConnectionPool (getter)
- **Default:** `undefined` before connection

Returns the underlying mssql connection pool for direct query access. See [pool](pool.md) for full documentation.

```javascript
_Fable.MeadowMSSQLProvider.pool.query('SELECT TOP 10 * FROM Book')
	.then((pResult) =>
	{
		console.log(pResult.recordset);
	});
```

### preparedStatement

- **Type:** mssql PreparedStatement (getter)

Creates and returns a new `mssql.PreparedStatement` bound to the active pool. Throws an error if not connected. See [preparedStatement](preparedStatement.md) for full documentation.

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

Returns the underlying `mssql` npm package for direct access to type constants. See [MSSQL](MSSQL.md) for full documentation.

### serviceType

- **Type:** `string`
- **Value:** `'MeadowConnectionMSSQL'`

The service type identifier used by Fable's service manager.

---

## Connection Methods

### connectAsync(fCallback)

Asynchronously connects to SQL Server and creates a connection pool. This is the **recommended** connection method. See [connectAsync()](connectAsync.md) for full documentation.

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

### connect()

Synchronous wrapper that calls `connectAsync()` without a callback. **Not recommended** -- logs a warning about potential race conditions. See [connect()](connect.md) for full documentation.

---

## DDL Methods

### generateCreateTableStatement(pMeadowTableSchema)

Generates an MSSQL `CREATE TABLE` statement from a Meadow table schema. See [generateCreateTableStatement()](generateCreateTableStatement.md) for full documentation.

```javascript
let tmpSQL = _Fable.MeadowMSSQLProvider.generateCreateTableStatement(tmpSchema);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `pMeadowTableSchema` | object | Schema with `TableName` and `Columns` array |

**Returns:** A string containing the CREATE TABLE DDL with `[dbo].[TableName]` notation.

### createTable(pMeadowTableSchema, fCallback)

Generates and executes a CREATE TABLE statement against the connection pool. See [createTable()](createTable.md) for full documentation.

```javascript
_Fable.MeadowMSSQLProvider.createTable(tmpSchema,
	(pError) =>
	{
		if (pError) console.error(pError);
	});
```

### createTables(pMeadowSchema, fCallback)

Creates all tables in a Meadow schema sequentially. See [createTables()](createTables.md) for full documentation.

```javascript
_Fable.MeadowMSSQLProvider.createTables(tmpFullSchema,
	(pError) =>
	{
		if (pError) console.error(pError);
	});
```

### generateDropTableStatement(pTableName)

Generates an MSSQL-safe `DROP TABLE` statement using `IF OBJECT_ID` to check existence first. See [generateDropTableStatement()](generateDropTableStatement.md) for full documentation.

```javascript
let tmpSQL = _Fable.MeadowMSSQLProvider.generateDropTableStatement('Book');
```

---

## Configuration Reference

```json
{
	"MSSQL":
	{
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

### Settings Reference

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `MSSQL.server` | string | -- | SQL Server hostname or IP address |
| `MSSQL.port` | number | 1433 | SQL Server port |
| `MSSQL.user` | string | -- | Login username |
| `MSSQL.password` | string | -- | Login password |
| `MSSQL.database` | string | -- | Target database name |
| `MeadowConnectionMSSQLAutoConnect` | boolean | false | Auto-connect on instantiation |

### Hardcoded Pool Settings

| Setting | Value | Description |
|---------|-------|-------------|
| `pool.max` | 10 | Maximum concurrent connections |
| `pool.min` | 0 | Minimum connections kept alive |
| `pool.idleTimeoutMillis` | 30,000 ms | Close idle connections after 30s |
| `requestTimeout` | 80,000 ms | Per-query execution timeout |
| `connectionTimeout` | 80,000 ms | Connection establishment timeout |
| `options.useUTC` | `false` | Use local time for DATETIME values |
| `options.trustServerCertificate` | `true` | Trust self-signed SSL certificates |

---

## Column Type Mapping

Used by `generateCreateTableStatement()`:

| Meadow Type | MSSQL Type | Default Value | Notes |
|-------------|-----------|---------------|-------|
| `ID` | `INT NOT NULL IDENTITY PRIMARY KEY` | -- | Auto-increment with inline primary key |
| `GUID` | `VARCHAR(254)` | `'00000000-0000-0000-0000-000000000000'` | GUID stored as string |
| `ForeignKey` | `INT UNSIGNED NOT NULL` | `0` | Foreign key reference |
| `Numeric` | `INT NOT NULL` | `0` | Integer |
| `Decimal` | `DECIMAL(Size)` | -- | Size is precision spec (e.g. `'10,2'`) |
| `String` | `VARCHAR(Size)` | `''` | Variable-length string |
| `Text` | `TEXT` | -- | Large text |
| `DateTime` | `DATETIME` | -- | Date and time |
| `Boolean` | `TINYINT` | `0` | 0 or 1 |

---

## Related

- [connectAsync()](connectAsync.md) -- Async connection (recommended)
- [connect()](connect.md) -- Sync convenience wrapper
- [pool](pool.md) -- Access the mssql pool
- [preparedStatement](preparedStatement.md) -- Create prepared statements
- [MSSQL](MSSQL.md) -- Access type constants
- [generateCreateTableStatement()](generateCreateTableStatement.md) -- Generate DDL
- [createTable()](createTable.md) -- Execute DDL for a single table
- [createTables()](createTables.md) -- Execute DDL for multiple tables
- [generateDropTableStatement()](generateDropTableStatement.md) -- Generate DROP TABLE
- [Schema & Table Creation](../schema.md) -- Full schema walkthrough
