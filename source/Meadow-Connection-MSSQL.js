/**
* Meadow MSSQL Provider Fable Service
* @author Steven Velozo <steven@velozo.com>
*/
const libFableServiceProviderBase = require('fable-serviceproviderbase');

const libMSSQL = require('mssql');

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

		if (this.fable.settings.hasOwnProperty('MSSQL'))
		{
			if (this.fable.settings.MSSQL.hasOwnProperty('server'))
			{
				this.options.server = this.fable.settings.MSSQL.server;
			}
			if (this.fable.settings.MSSQL.hasOwnProperty('user'))
			{
				this.options.user = this.fable.settings.MSSQL.user;
			}
			if (this.fable.settings.MSSQL.hasOwnProperty('password'))
			{
				this.options.password = this.fable.settings.MSSQL.password;
			}
			if (this.fable.settings.MSSQL.hasOwnProperty('database'))
			{
				this.options.database = this.fable.settings.MSSQL.database;
			}
			if (this.fable.settings.MSSQL.hasOwnProperty('MeadowConnectionMSSQLAutoConnect'))
			{
				this.options.MeadowConnectionMSSQLAutoConnect = this.fable.settings.MSSQL.MeadowConnectionMSSQLAutoConnect;
			}
		}
	}

	generateDropTableStatement(pTableName)
	{
		let tmpDropTableStatement = `IF OBJECT_ID('dbo.[${pTableName}]', 'U') IS NOT NULL\n`;
		tmpDropTableStatement += `    DROP TABLE dbo.[${pTableName}];\n`;
		tmpDropTableStatement += `GO`;
		return tmpDropTableStatement;
	}

	generateCreateTableStatement(pMeadowTableSchema)
	{
		this.log.info(`--> Building the table create string for ${pMeadowTableSchema} ...`);

		let tmpPrimaryKey = false;
		let tmpCreateTableStatement = `--   [ ${pMeadowTableSchema.TableName} ]`;
		tmpCreateTableStatement += `\nCREATE TABLE [dbo].[${pMeadowTableSchema.TableName}]\n    (`;
		for (let j = 0; j < pMeadowTableSchema.Columns.length; j++)
		{
			let tmpColumn = pMeadowTableSchema.Columns[j];

			// If we aren't the first column, append a comma.
			if (j > 0)
			{
				tmpCreateTableStatement += `,`;
			}

			tmpCreateTableStatement += `\n`;
			// Dump out each column......
			switch (tmpColumn.DataType)
			{
				case 'ID':
					// if (this.options.AllowIdentityInsert)
					// {
					// 	tmpCreateTableStatement += `        [${tmpColumn.Column}] INT NOT NULL PRIMARY KEY`;
					// }
					// else
					// {
					// There is debate on whether IDENTITY(1,1) is better or not.
					tmpCreateTableStatement += `        [${tmpColumn.Column}] INT NOT NULL IDENTITY PRIMARY KEY`;
					//}
					tmpPrimaryKey = tmpColumn.Column;
					break;
				case 'GUID':
					tmpCreateTableStatement += `        [${tmpColumn.Column}] VARCHAR(254) DEFAULT '00000000-0000-0000-0000-000000000000'`;
					break;
				case 'ForeignKey':
					tmpCreateTableStatement += `        [${tmpColumn.Column}] INT UNSIGNED NOT NULL DEFAULT 0`;
					tmpPrimaryKey = tmpColumn.Column;
					break;
				case 'Numeric':
					tmpCreateTableStatement += `        [${tmpColumn.Column}] INT NOT NULL DEFAULT 0`;
					break;
				case 'Decimal':
					tmpCreateTableStatement += `        [${tmpColumn.Column}] DECIMAL(${tmpColumn.Size})`;
					break;
				case 'String':
					tmpCreateTableStatement += `        [${tmpColumn.Column}] VARCHAR(${tmpColumn.Size}) DEFAULT ''`;
					break;
				case 'Text':
					tmpCreateTableStatement += `        [${tmpColumn.Column}] TEXT`;
					break;
				case 'DateTime':
					tmpCreateTableStatement += `        [${tmpColumn.Column}] DATETIME`;
					break;
				case 'Boolean':
					tmpCreateTableStatement += `        [${tmpColumn.Column}] TINYINT DEFAULT 0`;
					break;
				default:
					break;
			}
		}
		if (tmpPrimaryKey)
		{
			//				tmpCreateTableStatement += `,\n\n        PRIMARY KEY (${tmpPrimaryKey$})`;
		}
		tmpCreateTableStatement += `\n    );`;

		//this.log.info(`Generated Create Table Statement: ${tmpCreateTableStatement}`);

		return tmpCreateTableStatement;
	}

	createTables(pMeadowSchema, fCallback)
	{
		// Now create the Book databases if they don't exist.
		this.fable.Utility.eachLimit(pMeadowSchema.Tables, 1,
			(pTable, fCreateComplete) =>
			{
				return this.createTable(pTable, fCreateComplete)
			},
			(pCreateError) =>
			{
				if (pCreateError)
				{
					this.log.error(`Meadow-MSSQL Error creating tables from Schema: ${pCreateError}`,pCreateError);
				}
				this.log.info('Done creating tables!');
				return fCallback(pCreateError);
			});
	}

	createTable(pMeadowTableSchema, fCallback)
	{
		let tmpCreateTableStatement = this.generateCreateTableStatement(pMeadowTableSchema);
		this._ConnectionPool.query(tmpCreateTableStatement)
			.then((pResult) =>
			{
				this.log.info(`Meadow-MSSQL CREATE TABLE ${pMeadowTableSchema.TableName} Success`);
				this.log.warn(`Meadow-MSSQL Create Table Statement: ${tmpCreateTableStatement}`)
				return fCallback();
			})
			.catch((pError) =>
			{
				if (pError.hasOwnProperty('originalError')
					// TODO: This check may be extraneous; not familiar enough with the mssql node driver yet
					&& (pError.originalError.hasOwnProperty('info'))
					// TODO: Validate that there isn't a better way to find this (pError.code isn't explicit enough)
					&& (pError.originalError.info.message.indexOf("There is already an object named") == 0)
					&& (pError.originalError.info.message.indexOf('in the database.') > 0))
				{
					// The table already existed; log a warning but keep on keeping on.
					//this.log.warn(`Meadow-MSSQL CREATE TABLE ${pMeadowTableSchema.TableName} executed but table already existed.`);
					//this.log.warn(`Meadow-MSSQL Create Table Statement: ${tmpCreateTableStatement}`)
					return fCallback();
				}
				else
				{
					this.log.error(`Meadow-MSSQL CREATE TABLE ${pMeadowTableSchema.TableName} failed!`, pError);
					//this.log.warn(`Meadow-MSSQL Create Table Statement: ${tmpCreateTableStatement}`)
					return fCallback(pError);
				}
			});
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
		let tmpConnectionSettings = (
			{
				server: this.options.server,
				user: this.options.user,
				password: this.options.password,
				database: this.options.database,
				requestTimeout: 80000,
				connectionTimeout: 80000,
				port: 1433,
				pool:
				{
					max: 10,
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
