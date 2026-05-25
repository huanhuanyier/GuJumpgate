const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const phoneAuthSource = fs.readFileSync(path.join(__dirname, '..', 'content', 'phone-auth.js'), 'utf8');
const phoneCountryUtilsSource = fs.readFileSync(path.join(__dirname, '..', 'content', 'phone-country-utils.js'), 'utf8');

function extractSnippet(source, startText, endText) {
  const start = source.indexOf(startText);
  assert.notEqual(start, -1, `Missing snippet start: ${startText}`);
  const end = source.indexOf(endText, start);
  assert.notEqual(end, -1, `Missing snippet end: ${endText}`);
  return source.slice(start, end);
}

test('phone country selection does not accept the currently selected country when target lookup fails', () => {
  const ensureCountrySelected = extractSnippet(
    phoneAuthSource,
    'async function ensureCountrySelected',
    'function getAddPhoneSubmitButton'
  );

  assert.doesNotMatch(ensureCountrySelected, /return Boolean\(getSelectedCountryOption\(\)\)/);
  assert.match(ensureCountrySelected, /return false/);
});

test('Saudi phone numbers can resolve the Saudi Arabia add-phone country option by dial code', () => {
  const knownDialCodes = extractSnippet(
    phoneCountryUtilsSource,
    'const KNOWN_DIAL_CODES',
    'function normalizePhoneDigits'
  );
  const findOptionByPhoneNumber = extractSnippet(
    phoneCountryUtilsSource,
    'function findOptionByPhoneNumber',
    'function findElementByDialCode'
  );

  assert.match(knownDialCodes, /'966'/);
  assert.match(findOptionByPhoneNumber, /digits\.startsWith\(dialCode\)/);
  assert.match(findOptionByPhoneNumber, /bestDialCodeLength/);
});
