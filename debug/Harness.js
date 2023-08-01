const libFable = require('fable');
const libMeadowConnectionMSSQL = require('../source/Meadow-Connection-MSSQL.js');

let tmpTestModel = require('../retold-harness/model/json_schema/BookStore-Extended.json');

let _Fable = new libFable(
	{
		"Product": "MeadowMSSQLTestBookstore",
		"ProductVersion": "1.0.0",

		"UUID":
			{
				"DataCenter": 0,
				"Worker": 0
			},
		"LogStreams":
			[
				{
					"streamtype": "console"
				}
			],

		"MSSQL":
			{
				"server": "127.0.0.1",
				"port": 3306,
				"user": "sa",
				"password": "1234567890abc.",
				"database": "bookstore",
				"ConnectionPoolLimit": 20
			}
	});

_Fable.serviceManager.addServiceType('MeadowMSSQLProvider', libMeadowConnectionMSSQL);

_Fable.serviceManager.instantiateServiceProvider('MeadowMSSQLProvider');

_Fable.MeadowMSSQLProvider.connectAsync(
	(pError, pConnectionPool) =>
	{
		if (pError)
		{
			_Fable.log.error(`Error connecting to MS SQL Database: ${pError}`);
			return false;
		}

		_Fable.log.info('Connection complete!');
		_Fable.MeadowMSSQLProvider.createTables(tmpTestModel,
			(pCreateTablesError) =>
			{
				_Fable.log.info('Tables created successfully');
				let tmpPreparedStatement = _Fable.MeadowMSSQLProvider.preparedStatement;
				tmpPreparedStatement.input('param', _Fable.MeadowMSSQLProvider.MSSQL.Int);
				tmpPreparedStatement.prepare('SELECT * FROM Book WHERE IDBook < @param',
					(pPrepareError) =>
					{
						tmpPreparedStatement.execute({ param: 12345 },
							(pPreparedExecutionError, pPreparedResult) =>
							{
								_Fable.log.info(`Prepared statement returned...`, pPreparedResult);
								// release the connection after queries are executed
								tmpPreparedStatement.unprepare(
									(pPreparedStatementUnprepareError) =>
									{
										_Fable.log.trace(`Prepared statement unprepared.`);
									});
							})
					});
			});
	}
);
