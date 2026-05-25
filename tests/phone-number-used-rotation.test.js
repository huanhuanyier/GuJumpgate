const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const phoneAuthSource = fs.readFileSync(path.join(__dirname, '..', 'content', 'phone-auth.js'), 'utf8');
const phoneFlowSource = fs.readFileSync(path.join(__dirname, '..', 'background', 'phone-verification-flow.js'), 'utf8');

function extractSnippet(source, startText, endText) {
  const start = source.indexOf(startText);
  assert.notEqual(start, -1, `Missing snippet start: ${startText}`);
  const end = source.indexOf(endText, start);
  assert.notEqual(end, -1, `Missing snippet end: ${endText}`);
  return source.slice(start, end);
}

test('phone auth content script treats in-use and max-account phone errors as number-used failures', () => {
  assert.match(phoneAuthSource, /PHONE_NUMBER_USED_PATTERN/);
  assert.match(phoneAuthSource, /phone_number_in_use/);
  assert.match(phoneAuthSource, /可关联/);
  assert.match(phoneAuthSource, /已关联/);

  const resendProbe = extractSnippet(
    phoneAuthSource,
    'function checkPhoneResendError()',
    'function getAuthRetryButton'
  );
  assert.match(resendProbe, /getPhoneNumberUsedErrorText\(\)/);
  assert.match(resendProbe, /reason:\s*'phone_number_used'/);

  const verificationOutcome = extractSnippet(
    phoneAuthSource,
    'async function waitForPhoneVerificationOutcome',
    'async function submitPhoneVerificationCode'
  );
  assert.match(verificationOutcome, /getPhoneNumberUsedErrorText\(\)/);
  assert.match(verificationOutcome, /invalidCode:\s*true/);
});

test('step 9 rotates SMSBower numbers when the page reports the phone is already used', () => {
  const usedDetector = extractSnippet(
    phoneFlowSource,
    'function isPhoneNumberUsedError',
    'function isPhoneNumberInvalidError'
  );
  assert.match(usedDetector, /phone_number_in_use/);
  assert.match(usedDetector, /电话号码/);
  assert.match(usedDetector, /关联/);

  const resendPolling = extractSnippet(
    phoneFlowSource,
    'onStatus: async ({ elapsedMs, pollCount, statusText }) => {',
    'await addLog('
  );
  assert.match(resendPolling, /pageError\?\.reason\s*===\s*'phone_number_used'/);

  const pageProbeGate = extractSnippet(
    phoneFlowSource,
    'function usePageProbeForPhoneResend',
    'async function persistCurrentActivation'
  );
  assert.match(pageProbeGate, /PHONE_SMS_PROVIDER_SMSBOWER/);
});

test('phone verification request limit is classified as a number replacement failure', () => {
  const requestLimitText = '你请求手机验证的次数过多。请稍后再试。';

  assert.match(phoneAuthSource, new RegExp(requestLimitText));
  assert.match(phoneFlowSource, new RegExp(requestLimitText));

  const contentDetector = extractSnippet(
    phoneAuthSource,
    'const PHONE_NUMBER_USED_PATTERN',
    'const PHONE_ROUTE_405_RECOVERY_FAILED_ERROR_PREFIX'
  );
  assert.match(contentDetector, /请求手机验证的次数过多/);

  const usedDetector = extractSnippet(
    phoneFlowSource,
    'function isPhoneNumberUsedError',
    'function isPhoneNumberInvalidError'
  );
  assert.match(usedDetector, /请求手机验证的次数过多/);
});
