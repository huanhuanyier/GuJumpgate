const test = require('node:test');
const assert = require('node:assert/strict');

global.self = globalThis;
require('../background/plus-success-session-upload.js');

function createReadyState() {
  return {
    plusPaymentMethod: 'paypal',
    plusCheckoutTabId: 123,
    nodeStatuses: {
      'plus-checkout-create': 'running',
    },
  };
}

test('payments success invokes subscription success hook before completing node', async () => {
  const events = [];
  const manager = globalThis.MultiPageBackgroundPlusSuccessSessionUpload.createPlusSuccessSessionUploadManager({
    addLog: async () => {},
    getState: async () => createReadyState(),
    setState: async () => {},
    delay: async () => {},
    onSubscriptionSuccess: async (payload) => {
      events.push(['hook', payload.plusReturnUrl]);
    },
    completeNodeFromBackground: async (nodeId, payload) => {
      events.push(['complete', nodeId, payload.plusReturnUrl]);
    },
  });

  await manager.processPaymentsSuccessTab(123, 'https://chatgpt.com/payments/success?session_id=test');

  assert.deepEqual(events, [
    ['hook', 'https://chatgpt.com/payments/success?session_id=test'],
    ['complete', 'plus-checkout-create', 'https://chatgpt.com/payments/success?session_id=test'],
  ]);
});

test('payments success hook failure does not block node completion', async () => {
  const events = [];
  const logs = [];
  const manager = globalThis.MultiPageBackgroundPlusSuccessSessionUpload.createPlusSuccessSessionUploadManager({
    addLog: async (message, level) => {
      logs.push([level, message]);
    },
    getState: async () => createReadyState(),
    setState: async () => {},
    delay: async () => {},
    onSubscriptionSuccess: async () => {
      events.push(['hook']);
      throw new Error('excel offline');
    },
    completeNodeFromBackground: async (nodeId) => {
      events.push(['complete', nodeId]);
    },
  });

  await manager.processPaymentsSuccessTab(123, 'https://chatgpt.com/payments/success');

  assert.deepEqual(events, [
    ['hook'],
    ['complete', 'plus-checkout-create'],
  ]);
  assert.ok(logs.some(([level, message]) => level === 'warn' && /Excel/.test(message)));
});
