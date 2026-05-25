const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const phoneFlowSource = fs.readFileSync(path.join(__dirname, '..', 'background', 'phone-verification-flow.js'), 'utf8');
const smsBowerSource = fs.readFileSync(path.join(__dirname, '..', 'phone-sms', 'providers', 'smsbower.js'), 'utf8');

function extractSnippet(source, startText, endText) {
  const start = source.indexOf(startText);
  assert.notEqual(start, -1, `Missing snippet start: ${startText}`);
  const end = source.indexOf(endText, start);
  assert.notEqual(end, -1, `Missing snippet end: ${endText}`);
  return source.slice(start, end);
}

test('signup phone flow allows saved successful activations to be reused before buying a new number', () => {
  const acquire = extractSnippet(
    phoneFlowSource,
    'async function acquirePhoneActivation',
    'let lastProviderError = null'
  );

  assert.match(acquire, /canUseSavedActivationForCurrentFlow\s*=\s*canReuseSavedActivationForCurrentFlow\(state,\s*options\)/);
  assert.match(acquire, /isReusableActivationProvider\(provider\)/);
  assert.match(acquire, /reactivatePhoneActivation\(state,\s*candidateActivation\)/);
  assert.match(acquire, /removeReusableActivationFromPool\(candidateActivation/);

  const reusableProvider = extractSnippet(
    phoneFlowSource,
    'function isReusableActivationProvider',
    'function createResolvedFiveSimProvider'
  );
  assert.match(reusableProvider, /PHONE_SMS_PROVIDER_SMSBOWER/);

  const finalizeSignup = extractSnippet(
    phoneFlowSource,
    'async function finalizeSignupPhoneActivationAfterSuccess',
    'async function cancelSignupPhoneActivation'
  );
  assert.match(finalizeSignup, /shouldDeferCompletionForReusableActivation\(state,\s*normalizedActivation,\s*\{\s*allowPhoneSignup:\s*true\s*\}\)/);
  assert.match(finalizeSignup, /if\s*\(!deferCompletion\)\s*\{[\s\S]*?completePhoneActivation\(state,\s*normalizedActivation\)/);
  assert.match(finalizeSignup, /markActivationReusableAfterSuccess\(state,\s*normalizedActivation,\s*\{\s*allowPhoneSignup:\s*true\s*\}\)/);

  const reusableMarker = extractSnippet(
    phoneFlowSource,
    'async function markActivationReusableAfterSuccess',
    'function shouldPreserveActivationForFreeReuse'
  );
  assert.match(reusableMarker, /options\s*=\s*\{\}/);
  assert.match(reusableMarker, /allowPhoneSignup/);
  assert.match(reusableMarker, /isReusableActivationProvider\(reusableProvider\)/);
});

test('SMSBower signup success defers API completion until the reusable number reaches max uses', () => {
  const deferHelper = extractSnippet(
    phoneFlowSource,
    'function shouldDeferCompletionForReusableActivation',
    'async function markActivationReusableAfterSuccess'
  );
  assert.match(deferHelper, /allowPhoneSignup/);
  assert.match(deferHelper, /PHONE_SMS_PROVIDER_SMSBOWER/);
  assert.match(deferHelper, /successfulUses\s*\+\s*1\s*<\s*normalizedActivation\.maxUses/);

  const reusableMarker = extractSnippet(
    phoneFlowSource,
    'async function markActivationReusableAfterSuccess',
    'function shouldPreserveActivationForFreeReuse'
  );
  assert.match(reusableMarker, /if\s*\(successfulUses\s*>=\s*normalizedActivation\.maxUses\)\s*\{[\s\S]*?completePhoneActivation\(state,\s*nextReusableActivation\)/);
});

test('SMSBower post-login phone success defers API completion and stores the number for the next account', () => {
  const phoneSuccess = extractSnippet(
    phoneFlowSource,
    'const latestSuccessState = await getState();',
    'await addLog(\'步骤 9'
  );
  assert.match(phoneSuccess, /shouldDeferCompletionForReusableActivation\(latestSuccessState,\s*activation\)/);
  assert.match(phoneSuccess, /if\s*\(!deferCompletion\)\s*\{[\s\S]*?completePhoneActivation\(latestSuccessState,\s*activation\)/);
  assert.match(phoneSuccess, /markActivationReusableAfterSuccess\(latestSuccessState,\s*activation\)/);
  assert.doesNotMatch(phoneSuccess, /completePhoneActivation\(latestSuccessState,\s*activation\);\s*\}\s*await markFreeReusableActivationAfterAutoSuccess/);
});

test('SMSBower login phone success also defers API completion and stores the number for reuse', () => {
  const finalizeLogin = extractSnippet(
    phoneFlowSource,
    'async function finalizeLoginPhoneActivationAfterSuccess',
    'async function completeLoginPhoneVerificationFlow'
  );
  assert.match(finalizeLogin, /shouldDeferCompletionForReusableActivation\(state,\s*normalizedActivation\)/);
  assert.match(finalizeLogin, /if\s*\(!deferCompletion\)\s*\{[\s\S]*?completePhoneActivation\(state,\s*normalizedActivation\)/);
  assert.match(finalizeLogin, /markActivationReusableAfterSuccess\(state,\s*normalizedActivation\)/);
});

test('SMSBower provider exposes reuseActivation and keeps successful numbers reusable for multiple attempts', () => {
  assert.match(smsBowerSource, /async function reuseActivation\(state\s*=\s*\{\},\s*activation,\s*deps\s*=\s*\{\}\)/);
  const reuse = extractSnippet(
    smsBowerSource,
    'async function reuseActivation',
    'async function setActivationStatus'
  );
  assert.match(reuse, /requestAdditionalSms\(state,\s*normalizedActivation,\s*deps\)/);
  assert.doesNotMatch(reuse, /action:\s*'getNumber'/);
  assert.doesNotMatch(reuse, /number:\s*normalizedActivation\.phoneNumber/);
  assert.match(smsBowerSource, /reuseActivation:\s*\(state,\s*activation\)\s*=>\s*reuseActivation\(state,\s*activation,\s*providerDeps\)/);
  assert.match(smsBowerSource, /maxUses:\s*Math\.max\(1,\s*Math\.floor\(Number\(record\?\.maxUses\)\s*\|\|\s*3\)\)/);
});
