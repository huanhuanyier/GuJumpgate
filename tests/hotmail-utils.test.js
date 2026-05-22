const test = require('node:test');
const assert = require('node:assert/strict');

const { parseHotmailImportText } = require('../hotmail-utils.js');

test('parseHotmailImportText skips headers and malformed rows', () => {
  const accounts = parseHotmailImportText([
    'mail',
    'not-an-email----password----client-id----refresh-token',
    'user@example.com----secret----client-id----refresh-token',
    'missing-token@example.com----secret----client-id----',
  ].join('\n'));

  assert.deepEqual(accounts, [{
    email: 'user@example.com',
    password: 'secret',
    clientId: 'client-id',
    refreshToken: 'refresh-token',
  }]);
});
