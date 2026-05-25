const test = require('node:test');
const assert = require('node:assert/strict');

global.self = globalThis;
require('../background/logging-status.js');

test('logging status trims logs and retries when session storage quota is exceeded', async () => {
  const state = {
    logs: Array.from({ length: 500 }, (_, index) => ({
      message: `old log ${index} ${'x'.repeat(400)}`,
      level: 'info',
      timestamp: index,
      step: 9,
      stepKey: 'post-login-phone-verification',
      nodeId: 'post-login-phone-verification',
    })),
  };
  const setStateCalls = [];
  const messages = [];
  let failedOnce = false;

  const logging = globalThis.MultiPageBackgroundLoggingStatus.createLoggingStatus({
    chrome: {
      runtime: {
        sendMessage: async (message) => {
          messages.push(message);
        },
      },
    },
    DEFAULT_STATE: { nodeStatuses: {} },
    getState: async () => state,
    setState: async (updates) => {
      setStateCalls.push(updates);
      if (!failedOnce) {
        failedOnce = true;
        throw new Error('Session storage quota bytes exceeded. Values were not stored.');
      }
      state.logs = updates.logs;
    },
  });

  await logging.addLog('new important log', 'warn', {
    step: 9,
    stepKey: 'post-login-phone-verification',
  });

  assert.equal(setStateCalls.length, 2);
  assert.ok(setStateCalls[0].logs.length > setStateCalls[1].logs.length);
  assert.ok(setStateCalls[1].logs.length <= 200);
  assert.equal(setStateCalls[1].logs.at(-1).message, 'new important log');
  assert.equal(messages.length, 1);
});

test('logging status keeps the newest entry when quota retry needs a smaller log window', async () => {
  const state = {
    logs: Array.from({ length: 500 }, (_, index) => ({
      message: `old log ${index} ${'x'.repeat(1200)}`,
      level: 'info',
      timestamp: index,
      step: 9,
      stepKey: 'post-login-phone-verification',
      nodeId: 'post-login-phone-verification',
    })),
  };
  const setStateCalls = [];
  let failuresLeft = 2;

  const logging = globalThis.MultiPageBackgroundLoggingStatus.createLoggingStatus({
    chrome: {
      runtime: {
        sendMessage: async () => {},
      },
    },
    DEFAULT_STATE: { nodeStatuses: {} },
    getState: async () => state,
    setState: async (updates) => {
      setStateCalls.push(updates);
      if (failuresLeft > 0) {
        failuresLeft -= 1;
        throw new Error('Session storage quota bytes exceeded. Values were not stored.');
      }
      state.logs = updates.logs;
    },
  });

  await logging.addLog('latest diagnostic survives', 'error', {
    step: 9,
    stepKey: 'post-login-phone-verification',
  });

  assert.equal(setStateCalls.length, 3);
  assert.ok(setStateCalls[1].logs.length <= 200);
  assert.ok(setStateCalls[2].logs.length <= 50);
  assert.equal(setStateCalls[2].logs.at(-1).message, 'latest diagnostic survives');
});
