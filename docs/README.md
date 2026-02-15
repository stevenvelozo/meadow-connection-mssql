# Meadow Connection MSSQL

A Fable service that wraps the `mssql` npm package for Microsoft SQL Server connections. Register it once and every Meadow entity in your application shares the same managed pool.

## Quick Start

```bash
npm install meadow-connection-mssql
```

```javascript
const libFable = require('fable');
const libMeadowConnectionMSSQL = require('meadow-connection-mssql');

let _Fable = new libFable({
    Product: 'MyApp',
    MSSQL: {
        server: 'localhost',
        port: 1433,
        user: 'sa',
        password: 'YourPassword',
        database: 'myapp'
    }
});

_Fable.serviceManager.addServiceType('MeadowMSSQLProvider', libMeadowConnectionMSSQL);
_Fable.serviceManager.instantiateServiceProvider('MeadowMSSQLProvider');

// MSSQL connections are async -- use connectAsync
_Fable.MeadowMSSQLProvider.connectAsync(
    (pError, pPool) =>
    {
        if (pError) return console.error(pError);

        pPool.query('SELECT TOP 10 * FROM Book')
            .then((pResult) =>
            {
                console.log(`Found ${pResult.recordset.length} books.`);
            });
    });
```

## Why Async?

Unlike MySQL, the Microsoft SQL Server Node.js driver requires an asynchronous connection step. The `connectAsync()` method handles this and calls your callback once the pool is ready. A synchronous `connect()` exists for API symmetry but logs a warning about potential race conditions -- prefer `connectAsync()`.

## Configuration

MSSQL settings are read from the `MSSQL` key in Fable's settings:

```javascript
let _Fable = new libFable({
    MSSQL: {
        server: 'localhost',
        port: 1433,
        user: 'sa',
        password: 'YourPassword',
        database: 'myapp'
    }
});
```

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `MSSQL.server` | string | -- | SQL Server hostname or IP |
| `MSSQL.port` | number | 1433 | SQL Server port |
| `MSSQL.user` | string | -- | Login username |
| `MSSQL.password` | string | -- | Login password |
| `MSSQL.database` | string | -- | Target database name |
| `MSSQL.MeadowConnectionMSSQLAutoConnect` | boolean | -- | If true, connects during service instantiation |

### Connection pool defaults

The pool is created with these settings (currently not configurable via Fable settings):

| Option | Value | Description |
|--------|-------|-------------|
| `pool.max` | 10 | Maximum connections in the pool |
| `pool.min` | 0 | Minimum connections kept open |
| `pool.idleTimeoutMillis` | 30000 | Close idle connections after 30 seconds |
| `requestTimeout` | 80000 | Per-query timeout (80 seconds) |
| `connectionTimeout` | 80000 | Connection establishment timeout (80 seconds) |
| `options.useUTC` | false | Use local time for DATETIME values |
| `options.trustServerCertificate` | true | Trust self-signed certificates |

## Using with Meadow

Once the pool is registered, Meadow entities use it automatically when their provider is set to MSSQL:

```javascript
const libMeadow = require('meadow');

let tmpBookDAL = _Meadow.loadFromPackage(__dirname + '/model/Book.json');
tmpBookDAL.setProvider('MSSQL');

tmpBookDAL.doReads(tmpBookDAL.query,
    (pError, pQuery, pRecords) =>
    {
        console.log(`Read ${pRecords.length} books.`);
    });
```

Meadow's MSSQL provider uses prepared statements for all queries and supports `SCOPE_IDENTITY()` for returning inserted record IDs.

## Prepared Statements

For direct use outside of Meadow, you can create prepared statements:

```javascript
let tmpPS = _Fable.MeadowMSSQLProvider.preparedStatement;
tmpPS.input('bookId', _Fable.MeadowMSSQLProvider.MSSQL.Int);

tmpPS.prepare('SELECT * FROM Book WHERE IDBook < @bookId',
    (pError) =>
    {
        if (pError) return console.error(pError);

        tmpPS.execute({ bookId: 100 },
            (pError, pResult) =>
            {
                console.log(`Found ${pResult.recordset.length} books.`);

                tmpPS.unprepare(() => {});
            });
    });
```

The `MSSQL` getter exposes the underlying `mssql` package for accessing type constants like `MSSQL.Int`, `MSSQL.VarChar`, `MSSQL.Decimal`, etc.

## Table Creation

The service can generate and execute CREATE TABLE statements from Meadow schema definitions. See [Schema & Table Creation](schema.md) for details.

## Learn More

- [Schema & Table Creation](schema.md) -- Generate MSSQL tables from Meadow schemas
- [API Reference](api.md) -- Complete method and property documentation
- [Meadow](/meadow/meadow/) -- The data access layer
- [FoxHound](/meadow/foxhound/) -- Query DSL used by Meadow
