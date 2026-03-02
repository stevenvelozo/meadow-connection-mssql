# Meadow Connection MSSQL

<small>v1.0.11</small>

> Microsoft SQL Server connection pooling as a Fable service

A wrapper around the [mssql](https://github.com/tediousjs/node-mssql) npm package (Tedious driver) that manages connection pooling, prepared statements, and schema DDL generation. Register once, query from anywhere through Meadow or directly.

- **Async Connection** -- Promise-based pool creation with callback notification when ready
- **Connection Pooling** -- Managed pool with configurable timeouts and connection limits
- **Prepared Statements** -- First-class access to parameterized queries with MSSQL type constants
- **Direct Driver Access** -- `MSSQL` getter exposes the raw mssql package for type constants
- **Schema-Driven DDL** -- Generate CREATE TABLE statements with `[dbo]` schema and IDENTITY keys
- **Connection Safety** -- Guards against duplicate pools with cleansed logging

[Get Started](README.md)
[Quickstart](quickstart.md)
[Architecture](architecture.md)
[Schema & Tables](schema.md)
[API Reference](api/reference.md)
[GitHub](https://github.com/stevenvelozo/meadow-connection-mssql)
