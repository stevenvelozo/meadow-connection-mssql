# Meadow Connection MSSQL

> Microsoft SQL Server connection pooling as a Fable service

A wrapper around the `mssql` npm package that manages connection pooling, prepared statements, and schema DDL generation. Register once, query from anywhere through Meadow or directly.

- **Async Connection** -- Promise-based pool creation with callback notification when ready
- **Prepared Statements** -- First-class access to parameterized queries with MSSQL type constants
- **Schema Support** -- Generate CREATE TABLE statements from Meadow schema definitions
- **Fable Service** -- Registers with Fable's service manager for consistent dependency injection

[Get Started](README.md)
[Schema & Tables](schema.md)
[API Reference](api.md)
[GitHub](https://github.com/stevenvelozo/meadow-connection-mssql)
