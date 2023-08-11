/*
	Exercise the create table functionality of the MSSQL provider
*/
/**
* @author <steven@velozo.com>
*/

const libFable = require('fable');
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

_Fable.log.info("Application is starting up...");

const libMeadowConnectionMSSQL = require('../source/Meadow-Connection-MSSQL.js');
_Fable.serviceManager.addServiceType('MeadowMSSQLProvider', libMeadowConnectionMSSQL);
_Fable.serviceManager.instantiateServiceProvider('MeadowMSSQLProvider', 
	{
		// This makes the sync service still able to sync IDs.
		AllowIdentityInsert: true
	});

_Fable.log.info("...Creating SQL Connection pools at " + _Fable.settings.MSSQL.server + "...");

_Fable.MeadowMSSQLProvider.connectAsync(
    (pError, pConnectionPool) =>
    {
        if (pError)
        {
            _Fable.log.error(`Error connecting to MS SQL Database: ${pError}`);
            return false;
        }

		const tmpTestModel = require('../retold-harness/model/json_schema/BookStore-Extended.json');

        _Fable.log.info('Connection complete!');
        _Fable.MeadowMSSQLProvider.createTables(tmpTestModel,
            (pCreateTablesError) =>
            {
                _Fable.log.info('Tables created successfully');
            });
	});
