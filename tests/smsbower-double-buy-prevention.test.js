const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadSmsBowerProvider() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'phone-sms', 'providers', 'smsbower.js'), 'utf8');
  const context = {
    self: {},
    globalThis: {},
    console,
    URL,
    AbortController,
    setTimeout,
    clearTimeout,
  };
  context.globalThis = context;
  vm.runInNewContext(source, context, { filename: 'smsbower.js' });
  return context.self.PhoneSmsBowerProvider || context.PhoneSmsBowerProvider;
}

function createTextResponse(payload) {
  return {
    ok: true,
    status: 200,
    text: async () => (typeof payload === 'string' ? payload : JSON.stringify(payload)),
  };
}

test('SMSBower does not call getNumber after getNumberV2 returns wrapped activation data', async () => {
  const smsBower = loadSmsBowerProvider();
  const calls = [];
  const provider = smsBower.createProvider({
    fetchImpl: async (url) => {
      const parsedUrl = new URL(url);
      const action = parsedUrl.searchParams.get('action');
      calls.push(action);
      if (action === 'getNumberV2') {
        return createTextResponse({
          status: 'success',
          data: {
            activation: 'act-v2-1',
            number: '+966501234567',
          },
        });
      }
      return createTextResponse('ACCESS_NUMBER:act-legacy-2:+966509999999');
    },
  });

  const activation = await provider.requestActivation({
    smsBowerApiKey: 'key',
    smsBowerCountryId: 53,
    smsBowerCountryLabel: 'Saudi Arabia',
    smsBowerServiceCode: 'dr',
  });

  assert.equal(activation.activationId, 'act-v2-1');
  assert.equal(activation.phoneNumber, '+966501234567');
  assert.deepEqual(calls, ['getNumberV2']);
});

test('SMSBower additional SMS request does not call setStatus 3 and create a second order', async () => {
  const smsBower = loadSmsBowerProvider();
  const calls = [];
  const provider = smsBower.createProvider({
    fetchImpl: async (url) => {
      const parsedUrl = new URL(url);
      calls.push({
        action: parsedUrl.searchParams.get('action'),
        status: parsedUrl.searchParams.get('status'),
      });
      return createTextResponse('ACCESS_READY');
    },
  });

  await provider.requestAdditionalSms({
    smsBowerApiKey: 'key',
  }, {
    activationId: 'act-existing',
    phoneNumber: '+966501234567',
    provider: 'smsbower',
  });

  assert.deepEqual(calls, []);
});
