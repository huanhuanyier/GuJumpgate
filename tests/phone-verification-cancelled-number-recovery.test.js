const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const phoneFlowSource = fs.readFileSync(path.join(__dirname, '..', 'background', 'phone-verification-flow.js'), 'utf8');

function extractSnippet(source, startText, endText) {
  const start = source.indexOf(startText);
  assert.notEqual(start, -1, `Missing snippet start: ${startText}`);
  const end = source.indexOf(endText, start);
  assert.notEqual(end, -1, `Missing snippet end: ${endText}`);
  return source.slice(start, end);
}

test('step 9 recovers when a cancelled number leaves the page on phone code verification without an activation', () => {
  const helper = extractSnippet(
    phoneFlowSource,
    'const recoverMissingActivationFromPhoneVerificationPage',
    'const rotateActivationAfterAddPhoneFailure'
  );
  assert.match(helper, /usedNumberReplacementAttempts\s*\+=\s*1/);
  assert.match(helper, /buildPhoneReplacementLimitError\(maxNumberReplacementAttempts,\s*'missing_activation_after_cancelled_number'\)/);
  assert.match(helper, /ensureAddPhonePageBeforeSubmit\(\s*'missing activation after cancelled number'/);
  assert.match(helper, /addPhonePage:\s*true/);
  assert.match(helper, /phoneVerificationPage:\s*false/);

  const phoneCodeBranch = extractSnippet(
    phoneFlowSource,
    'if (!activation) {',
    'let shouldReplaceNumber = false;'
  );
  assert.doesNotMatch(phoneCodeBranch, /throw new Error\('.*没有保存手机号接码订单.*'\)/);
  assert.match(phoneCodeBranch, /recoverMissingActivationFromPhoneVerificationPage\(\)/);
  assert.match(phoneCodeBranch, /continue/);
});
