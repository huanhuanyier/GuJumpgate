const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const signupPageSource = fs.readFileSync(path.join(__dirname, '..', 'content', 'signup-page.js'), 'utf8');
const backgroundSource = fs.readFileSync(path.join(__dirname, '..', 'background.js'), 'utf8');

function extractSnippet(source, startText, endText) {
  const start = source.indexOf(startText);
  assert.notEqual(start, -1, `Missing snippet start: ${startText}`);
  const end = source.indexOf(endText, start);
  assert.notEqual(end, -1, `Missing snippet end: ${endText}`);
  return source.slice(start, end);
}

test('step 4 recognizes temporary auth login error page and requests restart from step 2', () => {
  assert.match(signupPageSource, /STEP4_AUTH_RESTART_FROM_STEP2_ERROR_PREFIX\s*=\s*'STEP4_AUTH_RESTART_FROM_STEP2::'/);
  assert.match(signupPageSource, /AUTH_TEMPORARY_LOGIN_ERROR_PATTERN[\s\S]*登录时出现问题[\s\S]*请稍后重试/);

  const detector = extractSnippet(
    signupPageSource,
    'function getStep4AuthRestartFromStep2PageState',
    'function getAuthTimeoutErrorPageState'
  );
  assert.match(detector, /state:\s*'auth_restart_from_step2'/);
  assert.match(detector, /getAuthBackButton\(\{\s*allowDisabled:\s*true\s*\}\)/);

  const inspection = extractSnippet(
    signupPageSource,
    'function inspectSignupVerificationState',
    'async function waitForSignupVerificationTransition'
  );
  assert.match(inspection, /getStep4AuthRestartFromStep2PageState\(\)/);

  const transition = extractSnippet(
    signupPageSource,
    'async function waitForSignupVerificationTransition',
    'async function prepareSignupVerificationFlow'
  );
  assert.match(transition, /snapshot\.state\s*===\s*'auth_restart_from_step2'/);

  const prepare = extractSnippet(
    signupPageSource,
    'async function prepareSignupVerificationFlow',
    'async function fillVerificationCode'
  );
  assert.match(prepare, /snapshot\.state\s*===\s*'auth_restart_from_step2'/);
  assert.match(prepare, /STEP4_AUTH_RESTART_FROM_STEP2_ERROR_PREFIX/);
});

test('auto-run handles step 4 auth restart signal by rerunning submit-signup-email at most twice', () => {
  assert.match(backgroundSource, /function isStep4AuthRestartFromStep2Failure\(error\)/);
  assert.match(backgroundSource, /let step4AuthRestartFromStep2Count\s*=\s*0/);
  assert.match(backgroundSource, /step4AuthRestartFromStep2Count\s*>\s*2/);

  const fetchSignupCodeHandler = extractSnippet(
    backgroundSource,
    "if (nodeId === 'fetch-signup-code')",
    'const restartDecision = await getPostStep6AutoRestartDecision'
  );
  assert.match(fetchSignupCodeHandler, /isStep4AuthRestartFromStep2Failure\(err\)/);
  assert.match(fetchSignupCodeHandler, /getPreviousNodeId\('submit-signup-email',\s*await getState\(\)\)\s*\|\|\s*'open-chatgpt'/);
  assert.match(fetchSignupCodeHandler, /setRestartNode\('submit-signup-email'\)/);
});
