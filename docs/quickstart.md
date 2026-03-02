# Quickstart

This guide walks through setting up Meadow Connection MSSQL from scratch: install, configure, connect asynchronously, run queries, use prepared statements, create tables from schemas, and integrate with the Meadow ORM.

---

## Prerequisites

- Node.js 14 or later
- A running Microsoft SQL Server instance (or Azure SQL Database)
- A database created and accessible by the configured user

---

## Install

```bash
npm install meadow-connection-mssql fable
```

---

## Step 1: Configure and Connect

MSSQL connections are inherently asynchronous (the Tedious TDS protocol requires a handshake). Always use `connectAsync()`:

```javascript
const libFable = require('fable');
const libMeadowConnectionMSSQL = require('meadow-connection-mssql');

let _Fable = new libFable(
	{
		"Product": "BookstoreExample",
		"ProductVersion": "1.0.0",
		"UUID": { "DataCenter": 0, "Worker": 0 },
		"LogStreams": [{ "streamtype": "console" }],
		"MSSQL":
		{
			"server": "localhost",
			"port": 1433,
			"user": "sa",
			"password": "YourPassword123",
			"database": "bookstore"
		}
	});

_Fable.serviceManager.addServiceType('MeadowMSSQLProvider', libMeadowConnectionMSSQL);
_Fable.serviceManager.instantiateServiceProvider('MeadowMSSQLProvider');

_Fable.MeadowMSSQLProvider.connectAsync(
	(pError, pPool) =>
	{
		if (pError)
		{
			console.error('Connection failed:', pError);
			return;
		}

		console.log('Connected:', _Fable.MeadowMSSQLProvider.connected);
		// => Connected: true
	});
```

---

## Step 2: Run a Query

The `pool` getter returns the mssql connection pool. MSSQL pool queries return Promises, and results are in `pResult.recordset`:

```javascript
_Fable.MeadowMSSQLProvider.pool.query('SELECT TOP 5 * FROM Book ORDER BY IDBook ASC')
	.then((pResult) =>
	{
		for (let i = 0; i < pResult.recordset.length; i++)
		{
			console.log(`  [${pResult.recordset[i].IDBook}] ${pResult.recordset[i].Title}`);
		}
	})
	.catch((pError) =>
	{
		console.error('Query failed:', pError);
	});
```

---

## Step 3: Use Prepared Statements

The `preparedStatement` getter creates a new prepared statement bound to the active pool. Use the `MSSQL` getter to access type constants:

```javascript
let tmpPS = _Fable.MeadowMSSQLProvider.preparedStatement;

// Define input parameters with MSSQL type constants
tmpPS.input('authorId', _Fable.MeadowMSSQLProvider.MSSQL.Int);
tmpPS.input('minYear', _Fable.MeadowMSSQLProvider.MSSQL.Int);

tmpPS.prepare('SELECT * FROM Book WHERE IDAuthor = @authorId AND Year > @minYear',
	(pError) =>
	{
		if (pError)
		{
			console.error('Prepare failed:', pError);
			return;
		}

		tmpPS.execute({ authorId: 42, minYear: 2000 },
			(pError, pResult) =>
			{
				if (pError)
				{
					console.error('Execute failed:', pError);
				}
				else
				{
					console.log(`Found ${pResult.recordset.length} books.`);
				}

				// Always unprepare when done
				tmpPS.unprepare(() => {});
			});
	});
```

### Common MSSQL Type Constants

| Constant | Use |
|----------|-----|
| `MSSQL.Int` | Integer parameters |
| `MSSQL.BigInt` | 64-bit integer parameters |
| `MSSQL.VarChar(n)` | Variable-length strings |
| `MSSQL.NVarChar(n)` | Unicode strings |
| `MSSQL.Decimal(p, s)` | Decimal numbers with precision |
| `MSSQL.DateTime` | Date and time values |
| `MSSQL.Bit` | Boolean values (0 or 1) |
| `MSSQL.Text` | Large text blocks |

---

## Step 4: Create Tables from Schema

Define a Meadow table schema and generate the DDL:

```javascript
let tmpBookSchema =
{
	TableName: 'Book',
	Columns:
	[
		{ Column: 'IDBook', DataType: 'ID' },
		{ Column: 'GUIDBook', DataType: 'GUID' },
		{ Column: 'Title', DataType: 'String', Size: 255 },
		{ Column: 'Author', DataType: 'String', Size: 128 },
		{ Column: 'Year', DataType: 'Numeric' },
		{ Column: 'Price', DataType: 'Decimal', Size: '10,2' },
		{ Column: 'Synopsis', DataType: 'Text' },
		{ Column: 'PublishDate', DataType: 'DateTime' },
		{ Column: 'InPrint', DataType: 'Boolean' }
	]
};

// Generate the SQL without executing it
let tmpSQL = _Fable.MeadowMSSQLProvider.generateCreateTableStatement(tmpBookSchema);
console.log(tmpSQL);
```

Execute it against the database:

```javascript
_Fable.MeadowMSSQLProvider.createTable(tmpBookSchema,
	(pError) =>
	{
		if (pError)
		{
			console.error('Table creation failed:', pError);
			return;
		}
		console.log('Book table created.');
	});
```

For multiple tables, use `createTables()` with a schema containing a `Tables` array:

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
				{ Column: 'Name', DataType: 'String', Size: 200 }
			]
		},
		{
			TableName: 'Book',
			Columns:
			[
				{ Column: 'IDBook', DataType: 'ID' },
				{ Column: 'GUIDBook', DataType: 'GUID' },
				{ Column: 'Title', DataType: 'String', Size: 255 },
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

Tables are created sequentially (one at a time) to respect dependency ordering.

---

## Step 5: Meadow ORM Integration

With the pool registered, Meadow entities can query through it automatically:

```javascript
const libMeadow = require('meadow');

let tmpBookMeadow = libMeadow.new(_Fable, 'Book')
	.setProvider('MSSQL')
	.setDefaultIdentifier('IDBook');

// Meadow uses prepared statements and SCOPE_IDENTITY()
// for all MSSQL queries automatically
tmpBookMeadow.doReads(tmpBookMeadow.query,
	(pError, pQuery, pRecords) =>
	{
		console.log(`Read ${pRecords.length} books.`);
	});
```

FoxHound generates the SQL queries and Meadow routes them through the registered connection pool automatically. The MSSQL provider uses prepared statements for all queries and `SCOPE_IDENTITY()` for returning inserted record IDs.

---

## Summary

| Step | What It Does |
|------|-------------|
| Configure | Set `MSSQL` settings in Fable config (server, port, user, password, database) |
| Connect | Always use `connectAsync()` -- MSSQL connections are inherently async |
| Query | Use `pool.query()` with Promises; results in `pResult.recordset` |
| Prepared Statements | Use `preparedStatement` getter with `MSSQL` type constants |
| DDL | Generate and execute CREATE TABLE from Meadow schemas |
| Meadow | Set provider to `'MSSQL'` and use standard CRUD operations |
