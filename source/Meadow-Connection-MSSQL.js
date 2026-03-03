/**
* Meadow MSSQL Provider Fable Service
* @author Steven Velozo <steven@velozo.com>
*/
const libFableServiceProviderBase = require('fable-serviceproviderbase');

const libMSSQL = require('mssql');

const libMeadowSchemaMSSQL = require('./Meadow-Schema-MSSQL.js');

/*
	Das alt muster:

	{
		connectionLimit: _Fable.settings.MSSQL.ConnectionPoolLimit,
		server: _Fable.settings.MSSQL.Server,
		// TODO: Not yet mapped.
		port: _Fable.settings.MSSQL.Port,
		user: _Fable.settings.MSSQL.User,
		password: _Fable.settings.MSSQL.Password,
		database: _Fable.settings.MSSQL.Database
	}
*/

class MeadowConnectionMSSQL extends libFableServiceProviderBase
{
	constructor(pFable, pManifest, pServiceHash)
	{
		super(pFable, pManifest, pServiceHash);

		this.serviceType = 'MeadowConnectionMSSQL';

		this.connected = false;

		// Resolve MSSQL connection settings from options or fable settings
		if (typeof(this.options.MSSQL) == 'object')
		{
			// Options were passed in with an MSSQL sub-object; coerce PascalCase to lowercase
			if (!this.options.MSSQL.hasOwnProperty('server') && this.options.MSSQL.hasOwnProperty('Server'))
			{
				this.options.MSSQL.server = this.options.MSSQL.Server;
			}
			if (!this.options.MSSQL.hasOwnProperty('port') && this.options.MSSQL.hasOwnProperty('Port'))
			{
				this.options.MSSQL.port = this.options.MSSQL.Port;
			}
			if (!this.options.MSSQL.hasOwnProperty('user') && this.options.MSSQL.hasOwnProperty('User'))
			{
				this.options.MSSQL.user = this.options.MSSQL.User;
			}
			if (!this.options.MSSQL.hasOwnProperty('password') && this.options.MSSQL.hasOwnProperty('Password'))
			{
				this.options.MSSQL.password = this.options.MSSQL.Password;
			}
			if (!this.options.MSSQL.hasOwnProperty('database') && this.options.MSSQL.hasOwnProperty('Database'))
			{
				this.options.MSSQL.database = this.options.MSSQL.Database;
			}
		}
		else if (typeof(this.options.server) === 'string')
		{
			// Options were passed in flat (already has server, user, etc.)
			this.options.MSSQL = (
				{
					server: this.options.server,
					port: this.options.port,
					user: this.options.user,
					password: this.options.password,
					database: this.options.database,
					ConnectionPoolLimit: this.options.ConnectionPoolLimit
				});
		}
		else if (typeof(this.fable.settings.MSSQL) == 'object')
		{
			// Fall back to fable settings
			let tmpSettings = this.fable.settings.MSSQL;
			this.options.MSSQL = (
				{
					server: tmpSettings.server || tmpSettings.Server,
					port: tmpSettings.port || tmpSettings.Port,
					user: tmpSettings.user || tmpSettings.User,
					password: tmpSettings.password || tmpSettings.Password,
					database: tmpSettings.database || tmpSettings.Database,
					ConnectionPoolLimit: tmpSettings.ConnectionPoolLimit
				});
		}

		// Schema provider handles DDL operations (create, drop, index, etc.)
		this._SchemaProvider = new libMeadowSchemaMSSQL(this.fable, this.options, `${this.Hash}-Schema`);
	}

	get schemaProvider()
	{
		return this._SchemaProvider;
	}

	generateDropTableStatement(pTableName)
	{
		return this._SchemaProvider.generateDropTableStatement(pTableName);
	}

	generateCreateTableStatement(pMeadowTableSchema)
	{
		return this._SchemaProvider.generateCreateTableStatement(pMeadowTableSchema);
	}

	createTables(pMeadowSchema, fCallback)
	{
		return this._SchemaProvider.createTables(pMeadowSchema, fCallback);
	}

	createTable(pMeadowTableSchema, fCallback)
	{
		return this._SchemaProvider.createTable(pMeadowTableSchema, fCallback);
	}

	getIndexDefinitionsFromSchema(pMeadowTableSchema)
	{
		return this._SchemaProvider.getIndexDefinitionsFromSchema(pMeadowTableSchema);
	}

	generateCreateIndexScript(pMeadowTableSchema)
	{
		return this._SchemaProvider.generateCreateIndexScript(pMeadowTableSchema);
	}

	generateCreateIndexStatements(pMeadowTableSchema)
	{
		return this._SchemaProvider.generateCreateIndexStatements(pMeadowTableSchema);
	}

	createIndex(pIndexStatement, fCallback)
	{
		return this._SchemaProvider.createIndex(pIndexStatement, fCallback);
	}

	createIndices(pMeadowTableSchema, fCallback)
	{
		return this._SchemaProvider.createIndices(pMeadowTableSchema, fCallback);
	}

	createAllIndices(pMeadowSchema, fCallback)
	{
		return this._SchemaProvider.createAllIndices(pMeadowSchema, fCallback);
	}

	// Database Introspection delegation

	listTables(fCallback)
	{
		return this._SchemaProvider.listTables(fCallback);
	}

	introspectTableColumns(pTableName, fCallback)
	{
		return this._SchemaProvider.introspectTableColumns(pTableName, fCallback);
	}

	introspectTableIndices(pTableName, fCallback)
	{
		return this._SchemaProvider.introspectTableIndices(pTableName, fCallback);
	}

	introspectTableForeignKeys(pTableName, fCallback)
	{
		return this._SchemaProvider.introspectTableForeignKeys(pTableName, fCallback);
	}

	introspectTableSchema(pTableName, fCallback)
	{
		return this._SchemaProvider.introspectTableSchema(pTableName, fCallback);
	}

	introspectDatabaseSchema(fCallback)
	{
		return this._SchemaProvider.introspectDatabaseSchema(fCallback);
	}

	generateMeadowPackageFromTable(pTableName, fCallback)
	{
		return this._SchemaProvider.generateMeadowPackageFromTable(pTableName, fCallback);
	}

	connect()
	{
		this.log.warn('The non-async Meadow-MSSQL connect() was called and the Microsoft SQL node driver has an asynchronous connection method; although this may function it will likely cause a race condition.');
		this.connectAsync();
	}

	connectAsync(fCallback)
	{
		let tmpCallback = fCallback;
		if (typeof (tmpCallback) !== 'function')
		{
			this.log.error(`Meadow MSSQL connect() called without a callback; this could lead to connection race conditions.`);
			tmpCallback = () => { };
		}
		let tmpMSSQLSettings = this.options.MSSQL || {};
		let tmpConnectionSettings = (
			{
				server: tmpMSSQLSettings.server,
				user: tmpMSSQLSettings.user,
				password: tmpMSSQLSettings.password,
				database: tmpMSSQLSettings.database,
				requestTimeout: 80000,
				connectionTimeout: 80000,
				port: tmpMSSQLSettings.port,
				pool:
				{
					max: tmpMSSQLSettings.ConnectionPoolLimit || 10,
					min: 0,
					idleTimeoutMillis: 30000
				},
				options:
				{
					useUTC: false,
					trustServerCertificate: true // change to true for local dev / self-signed customer certs
				},
			});
		if (this._ConnectionPool)
		{
			tmpCleansedLogSettings = JSON.parse(JSON.stringify(tmpConnectionSettings));
			// No leaking passwords!
			tmpCleansedLogSettings.password = '*****************';
			this.log.error(`Meadow-Connection-MSSQL trying to connect to MSSQL but is already connected - skipping the generation of extra connections.`, tmpCleansedLogSettings);
			return tmpCallback(null, this._ConnectionPool);
		}
		else
		{
			this.log.info(`Meadow-Connection-MSSQL connecting to [${tmpConnectionSettings.server} : ${tmpConnectionSettings.port}] as ${tmpConnectionSettings.user} for database ${tmpConnectionSettings.database} at a connection limit of ${tmpConnectionSettings.pool.max}`);
			libMSSQL.connect(tmpConnectionSettings)
				.then(
					(pConnectionPool) =>
					{
						this.log.info(`Meadow-Connection-MSSQL successfully connected to MSSQL at [${tmpConnectionSettings.server} : ${tmpConnectionSettings.port}] as ${tmpConnectionSettings.user} for database ${tmpConnectionSettings.database} at a connection limit of ${tmpConnectionSettings.pool.max}.`);
						this._ConnectionPool = pConnectionPool;
						this.connected = true;
						this._SchemaProvider.setConnectionPool(this._ConnectionPool);
						return tmpCallback(null, this._ConnectionPool)
					})
				.catch(
					(pError) =>
					{
						this.log.error(`Meadow-Connection-MSSQL error connecting to MSSQL at [${tmpConnectionSettings.server} : ${tmpConnectionSettings.port}] as ${tmpConnectionSettings.user} for database ${tmpConnectionSettings.database} at a connection limit of ${tmpConnectionSettings.pool.max}.`, pError);
						return tmpCallback(pError);
					});
		}
	}

	get preparedStatement()
	{
		if (this.connected && this._ConnectionPool)
		{
			return new libMSSQL.PreparedStatement(this._ConnectionPool);
		}
		else
		{
			throw new Error('The Meadow Microsoft SQL provider could not create a prepared statement; disconnected or no valid connection pool.');
		}
	}

	get MSSQL()
	{
		return libMSSQL;
	}

	get pool()
	{
		return this._ConnectionPool;
	}
}

module.exports = MeadowConnectionMSSQL;
