#!/usr/bin/env node
/**
 * Initialize the MSSQL test database from the host.
 * Uses the mssql npm package to connect and run schema + seed SQL.
 */
const libMSSQL = require('mssql');
const libFS = require('fs');
const libPath = require('path');

const MSSQL_CONFIG = {
	server: '127.0.0.1',
	port: 21433,
	user: 'sa',
	password: 'Retold1234567890!',
	requestTimeout: 30000,
	connectionTimeout: 10000,
	options: {
		trustServerCertificate: true
	}
};

const MAX_CONNECT_RETRIES = 30;
const RETRY_DELAY_MS = 3000;

async function connectWithRetry(pConfig)
{
	for (let i = 1; i <= MAX_CONNECT_RETRIES; i++)
	{
		try
		{
			let tmpPool = await libMSSQL.connect(pConfig);
			return tmpPool;
		}
		catch (pError)
		{
			if (i >= MAX_CONNECT_RETRIES)
			{
				throw pError;
			}
			console.log(`  Connection attempt ${i}/${MAX_CONNECT_RETRIES} failed, retrying in ${RETRY_DELAY_MS / 1000}s...`);
			await new Promise((fResolve) => setTimeout(fResolve, RETRY_DELAY_MS));
		}
	}
}

async function run()
{
	let tmpPool;
	try
	{
		// Connect to master to create the database
		console.log('Connecting to MSSQL...');
		tmpPool = await connectWithRetry(Object.assign({}, MSSQL_CONFIG, { database: 'master' }));
		console.log('Connected to MSSQL.');

		// Check if bookstore database already exists
		let tmpResult = await tmpPool.query`SELECT name FROM sys.databases WHERE name = 'bookstore'`;
		if (tmpResult.recordset.length > 0)
		{
			console.log('Database "bookstore" already exists, skipping initialization.');
			await tmpPool.close();
			process.exit(0);
		}

		// Read the SQL file and split on GO statements
		let tmpSQLPath = libPath.join(__dirname, '01-schema.sql');
		let tmpSQL = libFS.readFileSync(tmpSQLPath, 'utf8');

		// Split on GO lines (MSSQL batch separator)
		let tmpBatches = tmpSQL.split(/^\s*GO\s*$/mi).filter((pBatch) => pBatch.trim().length > 0);

		console.log(`Running ${tmpBatches.length} SQL batches...`);
		for (let i = 0; i < tmpBatches.length; i++)
		{
			let tmpBatch = tmpBatches[i].trim();
			if (tmpBatch.length === 0)
			{
				continue;
			}

			// After CREATE DATABASE, reconnect to bookstore
			if (tmpBatch.toUpperCase().indexOf('CREATE DATABASE') >= 0)
			{
				await tmpPool.query(tmpBatch);
				console.log(`  Batch ${i + 1}: CREATE DATABASE bookstore`);
				await tmpPool.close();
				// Delay for database to be ready (especially under Rosetta emulation)
				await new Promise((fResolve) => setTimeout(fResolve, 3000));
				tmpPool = await connectWithRetry(Object.assign({}, MSSQL_CONFIG, { database: 'bookstore' }));
				continue;
			}

			// Skip USE statements (we already connected to the right DB)
			if (tmpBatch.toUpperCase().indexOf('USE BOOKSTORE') >= 0)
			{
				continue;
			}

			try
			{
				await tmpPool.query(tmpBatch);
				console.log(`  Batch ${i + 1}: OK`);
			}
			catch (pError)
			{
				console.error(`  Batch ${i + 1}: ERROR - ${pError.message}`);
				console.error(`  SQL: ${tmpBatch.substring(0, 100)}...`);
			}
		}

		console.log('Database initialization complete.');
	}
	catch (pError)
	{
		console.error(`Fatal error: ${pError.message}`);
		process.exit(1);
	}
	finally
	{
		if (tmpPool)
		{
			await tmpPool.close();
		}
	}
}

run();
