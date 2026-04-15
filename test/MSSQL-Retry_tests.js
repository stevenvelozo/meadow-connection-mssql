/**
 * Unit tests for the Meadow-MSSQL-Retry helper (classifyError + runWithRetry).
 *
 * These are pure-JS tests — no real MSSQL connection needed.  The goal is
 * to lock in the behavior of the error classifier and the retry loop so
 * regressions don't silently degrade production observability.
 *
 * @license MIT
 */

'use strict';

const Chai = require('chai');
const Expect = Chai.expect;

const libRetry = require('../source/Meadow-MSSQL-Retry.js');

// A fake logger that captures every call so we can assert on log output.
function makeTestLogger()
{
	let tmpRecords = [];
	let tmpLog = (pLevel) => (pMsg) => tmpRecords.push({ level: pLevel, message: String(pMsg) });
	return {
		info: tmpLog('info'),
		warn: tmpLog('warn'),
		error: tmpLog('error'),
		records: tmpRecords
	};
}

// Helpers that synthesize the shapes real mssql errors take.
function networkError(pCode) {
	let e = new Error(`Network failure (${pCode})`);
	e.code = pCode;
	return e;
}
function timeoutError() {
	let e = new Error('Request timeout');
	e.code = 'ETIMEOUT';
	return e;
}
function timeoutUnknownReason() {
	return new Error('operation timed out for an unknown reason');
}
function alreadyExistsError() {
	let e = new Error('server error');
	e.code = 'EREQUEST';
	e.originalError = { info: { message: "There is already an object named 'Sample' in the database." } };
	return e;
}
function serverError(pMsg) {
	let e = new Error('server error');
	e.code = 'EREQUEST';
	e.originalError = { info: { message: pMsg } };
	return e;
}

suite('Meadow-MSSQL-Retry',
	() =>
	{
		suite('classifyError',
			() =>
			{
				test('classifies network errors as NetworkError (retryable, recycle)',
					() =>
					{
						let tmpClasses = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ESOCKET', 'ENOTFOUND'];
						for (let i = 0; i < tmpClasses.length; i++)
						{
							let result = libRetry.classifyError(networkError(tmpClasses[i]), 123);
							Expect(result.mode).to.equal(libRetry.ERROR_MODES.NetworkError);
							Expect(result.isRetryable).to.equal(true);
							Expect(result.recommendPoolRecycle).to.equal(true);
							Expect(result.description).to.include(tmpClasses[i]);
						}
					});

				test('classifies request timeout as RequestTimeout with DDL-lock hint',
					() =>
					{
						let r = libRetry.classifyError(timeoutError(), 30012);
						Expect(r.mode).to.equal(libRetry.ERROR_MODES.RequestTimeout);
						Expect(r.isRetryable).to.equal(true);
						Expect(r.recommendPoolRecycle).to.equal(true);
						Expect(r.description).to.include('DDL lock contention');
						Expect(r.description).to.include('30.0s');
					});

				test('classifies "timed out for an unknown reason" (customer-log string) as RequestTimeout',
					() =>
					{
						let r = libRetry.classifyError(timeoutUnknownReason(), 30000);
						Expect(r.mode).to.equal(libRetry.ERROR_MODES.RequestTimeout);
					});

				test('classifies "already exists" as AlreadyExists (non-retryable, no recycle)',
					() =>
					{
						let r = libRetry.classifyError(alreadyExistsError(), 45);
						Expect(r.mode).to.equal(libRetry.ERROR_MODES.AlreadyExists);
						Expect(r.isRetryable).to.equal(false);
						Expect(r.recommendPoolRecycle).to.equal(false);
					});

				test('classifies generic server error (EREQUEST) as ServerError (non-retryable)',
					() =>
					{
						let r = libRetry.classifyError(serverError('Invalid object name dbo.BadTable'), 50);
						Expect(r.mode).to.equal(libRetry.ERROR_MODES.ServerError);
						Expect(r.isRetryable).to.equal(false);
						Expect(r.description).to.include('Invalid object name');
					});

				test('detects PoolDegraded pattern (fast-fail after prior slow timeout)',
					() =>
					{
						// Simulate an ECONNRESET happening 150ms after a prior
						// 30s RequestTimeout — classic stale-pool symptom.
						let priorInfo = {
							lastFailureMode: libRetry.ERROR_MODES.RequestTimeout,
							lastFailureElapsed: 30000
						};
						let r = libRetry.classifyError(networkError('ECONNRESET'), 150, priorInfo);
						Expect(r.mode).to.equal(libRetry.ERROR_MODES.PoolDegraded);
						Expect(r.isRetryable).to.equal(true);
						Expect(r.recommendPoolRecycle).to.equal(true);
						Expect(r.description).to.include('degraded');
					});

				test('does NOT flag PoolDegraded when prior failure was fast too',
					() =>
					{
						// Two fast failures in a row — not pool degradation,
						// something deterministic.
						let priorInfo = {
							lastFailureMode: libRetry.ERROR_MODES.NetworkError,
							lastFailureElapsed: 100
						};
						let r = libRetry.classifyError(networkError('ECONNRESET'), 200, priorInfo);
						Expect(r.mode).to.equal(libRetry.ERROR_MODES.NetworkError);
					});

				test('classifies unknown errors as Unknown, retryable, no recycle',
					() =>
					{
						let e = new Error('something weird');
						let r = libRetry.classifyError(e, 500);
						Expect(r.mode).to.equal(libRetry.ERROR_MODES.Unknown);
						Expect(r.isRetryable).to.equal(true);
						Expect(r.recommendPoolRecycle).to.equal(false);
					});
			});

		suite('extractErrorMessage',
			() =>
			{
				test('returns empty string for null/undefined',
					() =>
					{
						Expect(libRetry.extractErrorMessage(null)).to.equal('');
						Expect(libRetry.extractErrorMessage(undefined)).to.equal('');
					});

				test('surfaces inner mssql driver message when present',
					() =>
					{
						let e = new Error('Wrapper');
						e.originalError = { info: { message: 'The real reason' } };
						Expect(libRetry.extractErrorMessage(e)).to.include('The real reason');
						Expect(libRetry.extractErrorMessage(e)).to.include('Wrapper');
					});

				test('returns top message alone when inner is identical or missing',
					() =>
					{
						let e = new Error('Only one message');
						Expect(libRetry.extractErrorMessage(e)).to.equal('Only one message');
					});
			});

		suite('runWithRetry',
			() =>
			{
				test('calls operation once on success, no retries',
					(fDone) =>
					{
						let log = makeTestLogger();
						let tmpCalls = 0;
						libRetry.runWithRetry(log, { OperationName: 'test-op', MaxAttempts: 3 },
							(fAttemptDone) =>
							{
								tmpCalls++;
								fAttemptDone(null, 'yay');
							},
							(err, result) =>
							{
								try {
									Expect(err).to.be.null;
									Expect(result).to.equal('yay');
									Expect(tmpCalls).to.equal(1);
									fDone();
								} catch (e) { fDone(e); }
							});
					});

				test('retries on NetworkError with exponential backoff and succeeds',
					(fDone) =>
					{
						let log = makeTestLogger();
						let tmpCalls = 0;
						libRetry.runWithRetry(log,
							{ OperationName: 'flaky-op', MaxAttempts: 3, InitialDelayMs: 10, MaxDelayMs: 50, BackoffFactor: 2 },
							(fAttemptDone) =>
							{
								tmpCalls++;
								if (tmpCalls < 3) fAttemptDone(networkError('ECONNRESET'));
								else fAttemptDone(null, 'finally');
							},
							(err, result) =>
							{
								try {
									Expect(err).to.be.null;
									Expect(result).to.equal('finally');
									Expect(tmpCalls).to.equal(3);
									let tmpWarnCount = log.records.filter(r => r.level === 'warn').length;
									Expect(tmpWarnCount).to.equal(2);
									fDone();
								} catch (e) { fDone(e); }
							});
					});

				test('logs classified failure mode on each attempt',
					(fDone) =>
					{
						let log = makeTestLogger();
						libRetry.runWithRetry(log,
							{ OperationName: 'logtest', MaxAttempts: 2, InitialDelayMs: 5 },
							(fAttemptDone) => fAttemptDone(networkError('ECONNRESET')),
							(err) =>
							{
								try {
									Expect(err).to.not.be.null;
									let tmpRelevant = log.records.filter(r => r.message.indexOf('[NetworkError]') >= 0);
									Expect(tmpRelevant.length).to.be.at.least(1);
									fDone();
								} catch (e) { fDone(e); }
							});
					});

				test('does not retry ServerError — fails fast',
					(fDone) =>
					{
						let log = makeTestLogger();
						let tmpCalls = 0;
						libRetry.runWithRetry(log,
							{ OperationName: 'bad-sql', MaxAttempts: 5, InitialDelayMs: 10 },
							(fAttemptDone) =>
							{
								tmpCalls++;
								fAttemptDone(serverError('Syntax error'));
							},
							(err) =>
							{
								try {
									Expect(err).to.not.be.null;
									Expect(tmpCalls).to.equal(1);
									let tmpGivingUp = log.records.filter(r => r.message.indexOf('not retryable') >= 0);
									Expect(tmpGivingUp.length).to.equal(1);
									fDone();
								} catch (e) { fDone(e); }
							});
					});

				test('treats AlreadyExists as success',
					(fDone) =>
					{
						let log = makeTestLogger();
						let tmpCalls = 0;
						libRetry.runWithRetry(log,
							{ OperationName: 'create-table', MaxAttempts: 3, InitialDelayMs: 10 },
							(fAttemptDone) =>
							{
								tmpCalls++;
								fAttemptDone(alreadyExistsError());
							},
							(err) =>
							{
								try {
									Expect(err).to.be.null;
									Expect(tmpCalls).to.equal(1);
									let tmpTreatedAsSuccess = log.records.filter(r => r.message.indexOf('treating as success') >= 0);
									Expect(tmpTreatedAsSuccess.length).to.equal(1);
									fDone();
								} catch (e) { fDone(e); }
							});
					});

				test('invokes OnRecyclePool for pool-degrading failure modes',
					(fDone) =>
					{
						let log = makeTestLogger();
						let tmpRecycleCalls = 0;
						let tmpCalls = 0;
						libRetry.runWithRetry(log,
							{
								OperationName: 'ddl',
								MaxAttempts: 3,
								InitialDelayMs: 5,
								OnRecyclePool: (fDoneRecycle) =>
								{
									tmpRecycleCalls++;
									setImmediate(fDoneRecycle);
								}
							},
							(fAttemptDone) =>
							{
								tmpCalls++;
								if (tmpCalls === 1) fAttemptDone(timeoutUnknownReason());
								else fAttemptDone(null, 'ok');
							},
							(err) =>
							{
								try {
									Expect(err).to.be.null;
									Expect(tmpCalls).to.equal(2);
									Expect(tmpRecycleCalls).to.equal(1);
									fDone();
								} catch (e) { fDone(e); }
							});
					});

				test('gives up after MaxAttempts and propagates last error',
					(fDone) =>
					{
						let log = makeTestLogger();
						let tmpLastErr = networkError('ECONNRESET');
						libRetry.runWithRetry(log,
							{ OperationName: 'doomed', MaxAttempts: 3, InitialDelayMs: 5 },
							(fAttemptDone) => fAttemptDone(tmpLastErr),
							(err) =>
							{
								try {
									Expect(err).to.equal(tmpLastErr);
									let tmpGiveUp = log.records.filter(r => r.message.indexOf('exhausted 3 attempts') >= 0);
									Expect(tmpGiveUp.length).to.equal(1);
									fDone();
								} catch (e) { fDone(e); }
							});
					});
			});
	});
