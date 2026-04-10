# Architecture

Meadow Connection MSSQL bridges the Meadow data access layer and Microsoft SQL Server. This page documents the component design, data flow, connection lifecycle, and how the module integrates with the broader Retold ecosystem.

---

## System Architecture

```mermaid
graph TB
	subgraph Application
		A[Application Code]
		B[Meadow ORM]
		C[FoxHound Query DSL]
	end

	subgraph MeadowConnectionMSSQL["Meadow Connection MSSQL"]
		D[MeadowConnectionMSSQL Service]
		E[PreparedStatement Factory]
		F[MSSQL Type Constants]
		G[mssql Connection Pool]
	end

	subgraph Database["SQL Server"]
		H[Microsoft SQL Server]
	end

	A -->|doCreate / doRead / doUpdate / doDelete| B
	B -->|setProvider MSSQL| C
	C -->|SQL + Parameters| D
	D -->|Prepared Statements| E
	D -->|Type Definitions| F
	E --> G
	F --> G
	D --> G
	G -->|TDS Protocol| H

	style MeadowConnectionMSSQL fill:#e8f4f8,stroke:#2E7D74,stroke-width:2px
	style Application fill:#f5f0e8,stroke:#423D37,stroke-width:1px
	style Database fill:#fef3e2,stroke:#c97a2e,stroke-width:1px
```

---

## Component Responsibilities

### MeadowConnectionMSSQL Service

The core class, extending `FableServiceProviderBase`. It manages the lifecycle of the mssql connection pool:

- **Construction** -- Reads MSSQL settings from Fable config, copies `server`, `port`, `user`, `password`, `database` into options, defaults port to 1433
- **Async Connection** -- Creates the pool via `mssql.connect()` with hardcoded timeout and pool settings
- **Pool Management** -- Guards against double-connect, masks passwords in log output
- **DDL Generation** -- Produces `CREATE TABLE` statements with `[dbo].[TableName]` notation and `IDENTITY PRIMARY KEY`

### PreparedStatement Factory

The `preparedStatement` getter creates a new `mssql.PreparedStatement` bound to the active pool on each access:

- Validates that the pool is connected before creating the statement
- Each statement is independent and must be manually unprepared after use
- Used by Meadow's MSSQL provider for all query execution

### MSSQL Type Constants

The `MSSQL` getter exposes the raw `mssql` npm package, giving access to SQL Server type constants:

- Used to define input parameters on prepared statements (`MSSQL.Int`, `MSSQL.VarChar`, etc.)
- Required for type-safe parameterized queries

---

## Connection Lifecycle

```mermaid
sequenceDiagram
	participant App as Application
	participant Fable as Fable Instance
	participant MCS as MeadowConnectionMSSQL
	participant Pool as mssql Pool
	participant SQL as SQL Server

	App->>Fable: new libFable(config)
	App->>Fable: addServiceType('MeadowMSSQLProvider', ...)
	App->>Fable: instantiateServiceProvider('MeadowMSSQLProvider')
	Fable->>MCS: constructor(fable, manifest, hash)
	MCS->>MCS: Copy MSSQL settings from fable.settings
	MCS->>MCS: Default port to 1433
	MCS-->>MCS: connected = false

	App->>MCS: connectAsync(callback)
	MCS->>Pool: mssql.connect(settings)
	Note over Pool,SQL: Promise-based TDS handshake
	Pool->>SQL: Establish TCP + TDS connection
	SQL-->>Pool: Connected
	Pool-->>MCS: Connection pool ready
	MCS-->>MCS: connected = true
	MCS-->>App: callback(null, pool)

	App->>Pool: pool.query(sql)
	Pool->>SQL: Execute query (TDS)
	SQL-->>Pool: Result set
	Pool-->>App: Promise resolves with { recordset }
```

---

## Query Execution Models

MSSQL supports two distinct query patterns:

```mermaid
flowchart LR
	subgraph Direct["Direct Query (pool.query)"]
		A1[SQL String] --> B1[pool.query]
		B1 --> C1[Promise]
		C1 --> D1[result.recordset]
	end

	subgraph Prepared["Prepared Statement"]
		A2[SQL Template] --> B2[ps.prepare]
		B2 --> C2[ps.input types]
		C2 --> D2[ps.execute params]
		D2 --> E2[result.recordset]
		E2 --> F2[ps.unprepare]
	end

	style Direct fill:#e8f4f8,stroke:#2E7D74
	style Prepared fill:#f5f0e8,stroke:#423D37
```

### Direct Query

Use `pool.query()` for ad-hoc SQL. Returns a Promise with `result.recordset` (array of row objects):

```javascript
pool.query('SELECT TOP 10 * FROM Book')
    .then((pResult) => { /* pResult.recordset */ });
```

### Prepared Statement

Use `preparedStatement` for parameterized queries with typed inputs. Requires a manual lifecycle (prepare -> execute -> unprepare):

```javascript
let ps = connection.preparedStatement;
ps.input('id', connection.MSSQL.Int);
ps.prepare('SELECT * FROM Book WHERE IDBook = @id', (err) => {
    ps.execute({ id: 42 }, (err, result) => {
        ps.unprepare(() => {});
    });
});
```

Meadow's MSSQL provider uses prepared statements for all CRUD operations.

---

## Connection Settings Flow

```mermaid
flowchart TD
	A[Constructor Called] --> B{fable.settings.MSSQL exists?}
	B -->|Yes| C[Copy server, port, user, password, database]
	B -->|No| D[No MSSQL config available]
	C --> E{port provided?}
	E -->|Yes| F[Use provided port]
	E -->|No| G[Default to 1433]
	F --> H[Store in this.options]
	G --> H

	H --> I[connectAsync called]
	I --> J[Build connection settings]
	J --> K[Add hardcoded pool/timeout settings]
	K --> L[mssql.connect with Promise]
	L --> M{Connection success?}
	M -->|Yes| N[Set connected = true]
	M -->|No| O[Pass error to callback]
```

### Hardcoded Pool Settings

These settings are applied internally and are not currently configurable via Fable settings:

| Setting | Value | Purpose |
|---------|-------|---------|
| `requestTimeout` | 80,000 ms | Per-query execution timeout |
| `connectionTimeout` | 80,000 ms | Connection establishment timeout |
| `pool.max` | 10 | Maximum concurrent connections |
| `pool.min` | 0 | Minimum connections kept alive |
| `pool.idleTimeoutMillis` | 30,000 ms | Close idle connections after 30s |
| `options.useUTC` | `false` | Use local time for DATETIME values |
| `options.trustServerCertificate` | `true` | Trust self-signed SSL certificates |

---

## DDL Generation Flow

The `generateCreateTableStatement()` method walks a Meadow table schema and produces MSSQL DDL:

```mermaid
flowchart LR
	A[Meadow Table Schema] --> B[Walk Columns Array]
	B --> C{DataType?}
	C -->|ID| D["INT NOT NULL IDENTITY PRIMARY KEY"]
	C -->|GUID| E["VARCHAR(254) DEFAULT '000...'"]
	C -->|ForeignKey| F["INT UNSIGNED NOT NULL DEFAULT 0"]
	C -->|Numeric| G["INT NOT NULL DEFAULT 0"]
	C -->|Decimal| H["DECIMAL(Size)"]
	C -->|String| I["VARCHAR(Size) DEFAULT ''"]
	C -->|Text| J["TEXT"]
	C -->|DateTime| K["DATETIME"]
	C -->|Boolean| L["TINYINT DEFAULT 0"]
	D --> M["CREATE TABLE [dbo].[TableName] (...)"]
	E --> M
	F --> M
	G --> M
	H --> M
	I --> M
	J --> M
	K --> M
	L --> M
```

### MSSQL DDL Conventions

- Table names are schema-qualified: `[dbo].[TableName]`
- All column names are bracketed: `[ColumnName]`
- `ID` columns use `IDENTITY PRIMARY KEY` (inline, no separate clause)
- No charset or collation clause (uses server defaults)
- `GUID` defaults to `'00000000-0000-0000-0000-000000000000'` and uses `VARCHAR(254)`
- Drop statements use `IF OBJECT_ID(..., 'U') IS NOT NULL` guard with `GO` batch separator

---

## Connection Safety

```mermaid
flowchart TD
	A[connectAsync called] --> B{Callback provided?}
	B -->|No| C[Log error, create no-op callback]
	B -->|Yes| D{Pool already exists?}
	C --> D
	D -->|Yes| E[Log error with cleansed settings]
	E --> F[Return existing pool via callback]
	D -->|No| G[Log connection details]
	G --> H[mssql.connect with Promise]
	H --> I{Success?}
	I -->|Yes| J[Set pool and connected = true]
	J --> K[Return pool via callback]
	I -->|No| L[Log error]
	L --> M[Return error via callback]
```

### Password Protection

- Connection details are logged at `info` level when connecting
- If a duplicate connection is detected, the error log includes connection settings with the password masked
- Passwords are never included in error messages or query logs

---

## Meadow Integration

When a Meadow entity sets its provider to `'MSSQL'`, queries follow this path:

```mermaid
sequenceDiagram
	participant App as Application
	participant Meadow as Meadow Entity
	participant FH as FoxHound
	participant Provider as Meadow-Provider-MSSQL
	participant MCS as MeadowConnectionMSSQL
	participant PS as PreparedStatement
	participant Pool as mssql Pool

	App->>Meadow: doReads(query, callback)
	Meadow->>FH: Build SQL query
	FH-->>Meadow: SQL string + parameters
	Meadow->>Provider: Execute read
	Provider->>MCS: Get preparedStatement
	MCS-->>Provider: New mssql.PreparedStatement
	Provider->>PS: input(name, type) for each param
	Provider->>PS: prepare(sql)
	PS->>Pool: Prepare on pool
	Provider->>PS: execute(params)
	PS->>Pool: Execute prepared query
	Pool-->>PS: Result recordset
	PS-->>Provider: result.recordset
	Provider->>PS: unprepare()
	Provider-->>Meadow: Marshalled records
	Meadow-->>App: callback(error, query, records)
```

The MSSQL provider uses prepared statements for all operations, with `SCOPE_IDENTITY()` for retrieving auto-generated IDs after inserts.

---

## Comparison with Other Connectors

| Feature | MSSQL | MySQL | SQLite | RocksDB |
|---------|-------|-------|--------|---------|
| Connection Type | Pool (TDS) | Pool (TCP) | File handle | File handle |
| Server Required | Yes | Yes | No | No |
| Connection Method | Async only | Sync or Async | Async | Async |
| Query API | Promise-based | Callback-based | Sync | Callback-based |
| Result Format | `result.recordset` | `(err, rows, fields)` | Direct return | `(err, value)` |
| Prepared Statements | Yes (getter) | No (use pool) | No | N/A |
| Driver Access | Yes (`MSSQL` getter) | No | No | No |
| Auto-Connect | Via `connect()` | Via flag | No | No |
| DDL Schema Prefix | `[dbo].[Table]` | None | None | N/A |
| Column Brackets | `[Column]` | None | None | N/A |
| Auto-Increment | `IDENTITY PRIMARY KEY` | `AUTO_INCREMENT` | `AUTOINCREMENT` | N/A |
| Underlying Library | mssql (Tedious) | mysql2 | better-sqlite3 | rocksdb |
