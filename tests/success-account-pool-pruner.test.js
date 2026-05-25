const test = require('node:test');
const assert = require('node:assert/strict');

global.self = globalThis;
require('../background/success-account-pool-pruner.js');

test('success account pool pruner removes current Hotmail account from pool', async () => {
  const persistentUpdates = [];
  const stateUpdates = [];
  const broadcasts = [];
  const logs = [];
  const pruner = globalThis.MultiPageSuccessAccountPoolPruner.createSuccessAccountPoolPruner({
    addLog: async (message, level) => logs.push([level, message]),
    broadcastDataUpdate: (payload) => broadcasts.push(payload),
    getState: async () => ({
      mailProvider: 'hotmail-api',
      currentHotmailAccountId: 'hotmail-1',
      hotmailAccounts: [
        { id: 'hotmail-1', email: 'used@example.com' },
        { id: 'hotmail-2', email: 'next@example.com' },
      ],
    }),
    setPersistentSettings: async (updates) => persistentUpdates.push(updates),
    setState: async (updates) => stateUpdates.push(updates),
  });

  const result = await pruner.removeCurrentAccountAfterSuccess();

  assert.equal(result.removed, true);
  assert.equal(result.removedAccount.email, 'used@example.com');
  assert.deepEqual(persistentUpdates, [{
    hotmailAccounts: [{ id: 'hotmail-2', email: 'next@example.com' }],
  }]);
  assert.deepEqual(stateUpdates, [{
    hotmailAccounts: [{ id: 'hotmail-2', email: 'next@example.com' }],
    currentHotmailAccountId: null,
  }]);
  assert.deepEqual(broadcasts, [{
    hotmailAccounts: [{ id: 'hotmail-2', email: 'next@example.com' }],
    currentHotmailAccountId: null,
  }]);
  assert.ok(logs.some(([level, message]) => level === 'ok' && message.includes('used@example.com')));
});

test('success account pool pruner skips non-Hotmail providers', async () => {
  const stateUpdates = [];
  const pruner = globalThis.MultiPageSuccessAccountPoolPruner.createSuccessAccountPoolPruner({
    getState: async () => ({
      mailProvider: 'custom',
      currentHotmailAccountId: 'hotmail-1',
      hotmailAccounts: [{ id: 'hotmail-1', email: 'used@example.com' }],
    }),
    setState: async (updates) => stateUpdates.push(updates),
  });

  const result = await pruner.removeCurrentAccountAfterSuccess();

  assert.equal(result.removed, false);
  assert.equal(result.reason, 'not-hotmail-provider');
  assert.deepEqual(stateUpdates, []);
});
