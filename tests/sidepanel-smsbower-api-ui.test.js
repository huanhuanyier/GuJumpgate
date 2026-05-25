const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sidepanelSource = fs.readFileSync(path.join(__dirname, '..', 'sidepanel', 'sidepanel.js'), 'utf8');

function extractSnippet(startText, endText) {
  const start = sidepanelSource.indexOf(startText);
  assert.notEqual(start, -1, `Missing snippet start: ${startText}`);
  const end = endText ? sidepanelSource.indexOf(endText, start) : -1;
  assert.notEqual(end, -1, `Missing snippet end: ${endText}`);
  return sidepanelSource.slice(start, end);
}

test('SMSBower reuses the visible phone SMS API key row', () => {
  const providerState = extractSnippet(
    'const heroProviderValue = typeof PHONE_SMS_PROVIDER_HERO',
    'if (rowPhoneVerificationEnabled)'
  );
  const apiRowVisibility = extractSnippet(
    'if (rowHeroSmsCountry) rowHeroSmsCountry.style.display',
    'if (rowNexSmsApiKey) rowNexSmsApiKey.style.display'
  );

  assert.match(
    providerState,
    /smsBowerProvider\s*=\s*provider\s*===\s*smsBowerProviderValue/
  );
  assert.match(
    apiRowVisibility,
    /rowHeroSmsApiKey\.style\.display\s*=\s*showSettings\s*&&\s*\(heroProvider\s*\|\|\s*smsBowerProvider\)/
  );
});

test('SMSBower reuses the country picker and selected country order rows', () => {
  const countryRowVisibility = extractSnippet(
    'if (rowHeroSmsCountry) rowHeroSmsCountry.style.display',
    'if (rowHeroSmsAcquirePriority) rowHeroSmsAcquirePriority.style.display'
  );

  assert.match(
    countryRowVisibility,
    /rowHeroSmsCountry\.style\.display\s*=\s*showSettings\s*&&\s*\(heroProvider\s*\|\|\s*smsBowerProvider\)/
  );
  assert.match(
    countryRowVisibility,
    /rowHeroSmsCountryFallback\.style\.display\s*=\s*showSettings\s*&&\s*\(heroProvider\s*\|\|\s*smsBowerProvider\)/
  );
});

test('SMSBower country picker includes Saudi Arabia', () => {
  const countryItems = extractSnippet(
    'const HERO_SMS_SUPPORTED_COUNTRY_ITEMS',
    'const HERO_SMS_SUPPORTED_COUNTRY_ID_SET'
  );

  assert.match(
    countryItems,
    /HERO_SMS_SUPPORTED_COUNTRY_ITEMS[\s\S]*\{\s*id:\s*53,\s*chn:\s*'沙特阿拉伯',\s*eng:\s*'Saudi Arabia'\s*\}/
  );
});

test('SMSBower API key is restored into the shared phone SMS API input on runtime updates', () => {
  const runtimeSync = extractSnippet(
    'message.payload.phoneSmsProvider !== undefined && selectPhoneSmsProvider',
    'message.payload.fiveSimApiKey !== undefined && inputFiveSimApiKey'
  );

  assert.match(
    runtimeSync,
    /message\.payload\.smsBowerApiKey\s*!==\s*undefined/
  );
  assert.match(
    runtimeSync,
    /getSelectedPhoneSmsProvider\(\)\s*===\s*PHONE_SMS_PROVIDER_SMSBOWER[\s\S]*?message\.payload\.smsBowerApiKey/
  );
});

test('SMSBower price preview can parse price entries with shared helper', () => {
  const helperSnippet = extractSnippet(
    'function collectPhoneSmsPriceEntriesForPreview',
    'function formatPriceTiersForPreview'
  );
  const smsBowerPreview = extractSnippet(
    "const smsBowerLines = ['SMSBower:']",
    'if (smsBowerLines.length === 1)'
  );

  assert.match(
    helperSnippet,
    /function collectPhoneSmsPriceEntriesForPreview\(payload,\s*entries\s*=\s*\[\]\)/
  );
  assert.match(
    smsBowerPreview,
    /collectPhoneSmsPriceEntriesForPreview\(payload,\s*\[\]\)/
  );
  assert.doesNotMatch(
    smsBowerPreview,
    /collectPriceEntries\(payload,\s*\[\]\)/
  );
});
