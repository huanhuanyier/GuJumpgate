const test = require('node:test');
const assert = require('node:assert/strict');

global.self = globalThis;
require('../background/residential-proxy-switcher.js');

test('account success proxy switcher calls local helper and logs next proxy', async () => {
  const requests = [];
  const logs = [];
  const switcher = globalThis.MultiPageResidentialProxySwitcher.createResidentialProxySwitcher({
    addLog: async (message, level) => logs.push([level, message]),
    buildLocalHelperEndpoint: (baseUrl, path) => `${baseUrl}${path}`,
    fetch: async (url, options) => {
      requests.push([url, JSON.parse(options.body)]);
      return {
        ok: true,
        json: async () => ({
          ok: true,
          groupName: 'GuJumpgate住宅IP',
          previousProxy: 'BestGo-US-01',
          nextProxy: 'BestGo-US-02',
        }),
      };
    },
    getState: async () => ({ hotmailLocalBaseUrl: 'http://127.0.0.1:17374' }),
  });

  const result = await switcher.advanceAfterAccountSuccess({ nodeId: 'cpa-session-import' });

  assert.equal(result.nextProxy, 'BestGo-US-02');
  assert.equal(requests.length, 1);
  assert.equal(requests[0][0], 'http://127.0.0.1:17374/advance-residential-proxy');
  assert.equal(requests[0][1].groupName, 'GuJumpgate住宅IP');
  assert.equal(requests[0][1].proxies.length, 20);
  assert.equal(requests[0][1].trigger, 'account-success');
  assert.ok(logs.some(([level, message]) => level === 'ok' && message.includes('BestGo-US-02')));
});

test('account success proxy switcher logs warning and does not throw when helper fails', async () => {
  const logs = [];
  const switcher = globalThis.MultiPageResidentialProxySwitcher.createResidentialProxySwitcher({
    addLog: async (message, level) => logs.push([level, message]),
    buildLocalHelperEndpoint: (baseUrl, path) => `${baseUrl}${path}`,
    fetch: async () => ({
      ok: false,
      status: 500,
      json: async () => ({ ok: false, error: 'pipe offline' }),
    }),
    getState: async () => ({ hotmailLocalBaseUrl: 'http://127.0.0.1:17374' }),
  });

  const result = await switcher.advanceAfterAccountSuccess({ nodeId: 'cpa-session-import' });

  assert.equal(result, null);
  assert.ok(logs.some(([level, message]) => level === 'warn' && message.includes('pipe offline')));
});
