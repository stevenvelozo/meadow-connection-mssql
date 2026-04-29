/**
 * Connection form schema for Microsoft SQL Server.
 *
 * Consumed by meadow-connection-manager#getProviderFormSchema('MSSQL').
 * Pure data — safe to require() even when the mssql driver is not
 * installed.  See Meadow-Connection-MySQL-FormSchema.js for the field
 * contract.
 *
 * MSSQL has reliability tuning that lives in nested keys under
 * ConnectRetryOptions / DDLRetryOptions.  The form exposes "initial
 * delay" and "max delay" once each, but each value populates BOTH
 * Connect and DDL retry buckets — that's why those fields use MapTo.
 *
 * Unit convention: timeouts and delays are entered in seconds in the UI
 * but stored in milliseconds in the config blob; expressed via
 * Multiplier: 1000.
 */
'use strict';

module.exports =
{
	Provider:    'MSSQL',
	DisplayName: 'MSSQL',
	Description: 'Connect to a Microsoft SQL Server instance.',
	Fields:
	[
		// ── Basic ──
		{ Name: 'server',           Label: 'Server',           Type: 'String',   Default: '127.0.0.1', Required: true, Placeholder: '127.0.0.1' },
		{ Name: 'port',             Label: 'Port',             Type: 'Number',   Default: 1433,        Required: true, Min: 1, Max: 65535 },
		{ Name: 'user',             Label: 'User',             Type: 'String',   Default: 'sa',        Required: true },
		{ Name: 'password',         Label: 'Password',         Type: 'Password' },
		{ Name: 'database',         Label: 'Database',         Type: 'String',   Placeholder: 'meadow_clone' },
		{ Name: 'connectionLimit',  Label: 'Connection Limit', Type: 'Number',   Default: 20, Min: 1, Group: 'Advanced' },
		{
			Name:  'LegacyPagination',
			Label: 'Legacy pagination (SQL Server < 2012 / compat level < 110)',
			Type:  'Boolean',
			Help:  'Use ROW_NUMBER() instead of OFFSET/FETCH for older SQL Server versions.'
		},

		// ── Advanced: timeouts (entered as sec, stored as ms) ──
		{
			Name:        'RequestTimeoutMs',
			Label:       'Request timeout (sec)',
			Type:        'Number',
			Default:     120,
			Min:         1,
			Multiplier:  1000,
			OmitIfFalsy: true,
			Group:       'Advanced'
		},
		{
			Name:        'ConnectionTimeoutMs',
			Label:       'Connection timeout (sec)',
			Type:        'Number',
			Default:     60,
			Min:         1,
			Multiplier:  1000,
			OmitIfFalsy: true,
			Group:       'Advanced'
		},

		// ── Advanced: retry buckets (Connect + DDL) ──
		{
			Name:        'ConnectRetryOptions.MaxAttempts',
			Label:       'Connect retries (max attempts)',
			Type:        'Number',
			Default:     5,
			Min:         1,
			Max:         20,
			OmitIfFalsy: true,
			Group:       'Advanced'
		},
		{
			Name:        'DDLRetryOptions.MaxAttempts',
			Label:       'DDL retries (max attempts)',
			Type:        'Number',
			Default:     5,
			Min:         1,
			Max:         20,
			OmitIfFalsy: true,
			Group:       'Advanced'
		},
		{
			// Same UI value populates BOTH buckets — DataCloner has done it
			// this way since these timings should track each other.  MapTo
			// preserves that behavior declaratively.
			Name:        'RetryInitialDelaySec',
			Label:       'Retry initial delay (sec)',
			Type:        'Number',
			Default:     3,
			Min:         1,
			Max:         60,
			Multiplier:  1000,
			MapTo:       [ 'ConnectRetryOptions.InitialDelayMs', 'DDLRetryOptions.InitialDelayMs' ],
			OmitIfFalsy: true,
			Group:       'Advanced'
		},
		{
			Name:        'RetryMaxDelaySec',
			Label:       'Retry max delay (sec)',
			Type:        'Number',
			Default:     30,
			Min:         1,
			Max:         600,
			Multiplier:  1000,
			MapTo:       [ 'ConnectRetryOptions.MaxDelayMs', 'DDLRetryOptions.MaxDelayMs' ],
			OmitIfFalsy: true,
			Group:       'Advanced'
		}
	]
};
