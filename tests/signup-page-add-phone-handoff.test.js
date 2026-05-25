const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const signupPageSource = fs.readFileSync(path.join(__dirname, '..', 'content', 'signup-page.js'), 'utf8');

function extractSnippet(startText, endText) {
  const start = signupPageSource.indexOf(startText);
  assert.notEqual(start, -1, `Missing snippet start: ${startText}`);
  const end = signupPageSource.indexOf(endText, start);
  assert.notEqual(end, -1, `Missing snippet end: ${endText}`);
  return signupPageSource.slice(start, end);
}

test('choose existing account treats add-phone page as successful handoff', () => {
  const resultHelpers = extractSnippet(
    'function createStep6AddEmailSuccessResult',
    'function createStep6RecoverableResult'
  );
  const chooseExistingAccount = extractSnippet(
    'async function step6ChooseExistingAccount',
    'async function waitForPhoneLoginEntrySwitchTransition'
  );

  assert.match(
    resultHelpers,
    /function createStep6AddPhoneSuccessResult\(snapshot,\s*options\s*=\s*\{\}\)/
  );
  assert.match(
    chooseExistingAccount,
    /if\s*\(nextSnapshot\.state\s*===\s*'add_phone_page'\)\s*\{[\s\S]*?createStep6AddPhoneSuccessResult\(nextSnapshot/
  );
});
