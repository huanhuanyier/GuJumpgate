const test = require('node:test');
const assert = require('node:assert/strict');

global.self = globalThis;
require('../background/steps/oauth-login.js');

function createExecutor(overrides = {}) {
  const completions = [];
  const logs = [];
  const executor = globalThis.MultiPageBackgroundStep7.createStep7Executor({
    addLog: async (message, level) => logs.push([level, message]),
    completeNodeFromBackground: async (nodeId, payload) => completions.push({ nodeId, payload }),
    getErrorMessage: (error) => String(error?.message || error || ''),
    getLoginAuthStateLabel: (state) => state || 'unknown',
    getOAuthFlowStepTimeoutMs: async (fallback) => fallback,
    getState: async () => ({
      email: 'user@example.com',
      password: 'secret',
      phoneVerificationEnabled: true,
    }),
    getTabId: async () => 1,
    isStep6RecoverableResult: (result) => result?.step6Outcome === 'recoverable',
    isStep6SuccessResult: (result) => result?.step6Outcome === 'success',
    refreshOAuthUrlBeforeStep6: async () => 'https://auth.openai.com/oauth',
    reuseOrCreateTab: async () => 1,
    sendToContentScriptResilient: async () => ({
      step6Outcome: 'success',
      state: 'add_phone_page',
      addPhonePage: true,
      skipLoginVerificationStep: true,
      url: 'https://auth.openai.com/add-phone',
    }),
    startOAuthFlowTimeoutWindow: async () => {},
    STEP6_MAX_ATTEMPTS: 2,
    throwIfStopped: (error) => {
      if (error) throw error;
    },
    ...overrides,
  });
  return { executor, completions, logs };
}

test('step 7 hands add-phone page to post-login phone verification', async () => {
  const { executor, completions } = createExecutor();

  await executor.executeStep7({
    email: 'user@example.com',
    password: 'secret',
    phoneVerificationEnabled: true,
    plusAccountAccessStrategy: 'oauth',
    signupMethod: 'email',
    visibleStep: 7,
  });

  assert.deepEqual(completions, [{
    nodeId: 'oauth-login',
    payload: {
      loginVerificationRequestedAt: null,
      skipLoginVerificationStep: true,
      addPhonePage: true,
      phoneVerificationPage: false,
    },
  }]);
});
