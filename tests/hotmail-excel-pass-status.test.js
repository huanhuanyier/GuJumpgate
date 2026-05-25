const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} should exist`);
  const paramsStart = source.indexOf('(', start);
  let paramsDepth = 1;
  let paramsEnd = -1;
  for (let index = paramsStart + 1; index < source.length; index += 1) {
    const char = source[index];
    if (char === '(') paramsDepth += 1;
    if (char === ')') {
      paramsDepth -= 1;
      if (paramsDepth === 0) {
        paramsEnd = index;
        break;
      }
    }
  }
  assert.notEqual(paramsEnd, -1, `${name} parameters should close`);
  const bodyStart = source.indexOf('{', paramsEnd);
  let depth = 1;
  for (let index = bodyStart + 1; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }
  throw new Error(`Could not extract ${name}`);
}

function loadWritebackResolver() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'background.js'), 'utf8');
  const resolverSource = [
    extractFunction(source, 'resolveHotmailExcelSourceForState'),
    extractFunction(source, 'resolveHotmailExcelWritebackData'),
    'return resolveHotmailExcelWritebackData;',
  ].join('\n');

  return new Function('normalizeHotmailAccounts', resolverSource)((accounts) => accounts || []);
}

test('Hotmail Excel writeback leaves Pass blank for non-success statuses', () => {
  const resolveHotmailExcelWritebackData = loadWritebackResolver();
  const writeback = resolveHotmailExcelWritebackData({
    hotmailAccounts: [{
      id: 'account-1',
      email: 'user@example.com',
      excelSource: {
        filePath: 'C:\\accounts.xlsx',
        sheetName: 'Sheet1',
        rowNumber: 2,
      },
    }],
    currentHotmailAccountId: 'account-1',
  }, 'failed');

  assert.equal(writeback.passStatus, '');
});

test('Hotmail Excel writeback still marks Pass as open on success', () => {
  const resolveHotmailExcelWritebackData = loadWritebackResolver();
  const writeback = resolveHotmailExcelWritebackData({
    hotmailAccounts: [{
      id: 'account-1',
      email: 'user@example.com',
      excelSource: {
        filePath: 'C:\\accounts.xlsx',
        sheetName: 'Sheet1',
        rowNumber: 2,
      },
    }],
    currentHotmailAccountId: 'account-1',
  }, 'success');

  assert.equal(writeback.passStatus, '开通');
});
