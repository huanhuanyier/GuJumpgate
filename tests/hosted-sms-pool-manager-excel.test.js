const test = require('node:test');
const assert = require('node:assert/strict');

global.window = globalThis;
global.document = {
  createElement() {
    return {
      className: '',
      innerHTML: '',
      querySelector() { return null; },
    };
  },
};

require('../sidepanel/hosted-sms-pool-manager.js');

function makeButton() {
  return {
    disabled: false,
    listeners: {},
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
    click() {
      return this.listeners.click?.({ preventDefault() {} });
    },
  };
}

test('hosted SMS manager imports Excel entries with success counts and source rows', async () => {
  let text = '';
  let usage = {};
  let persisted = 0;
  const toastMessages = [];
  const inputPath = { value: 'C:\\pool.xlsx', disabled: false };
  const browseButton = makeButton();
  const importButton = makeButton();
  const manager = globalThis.SidepanelHostedSmsPoolManager.createHostedSmsPoolManager({
    dom: {
      inputHostedSmsPoolExcelPath: inputPath,
      btnHostedSmsPoolExcelBrowse: browseButton,
      btnHostedSmsPoolExcelImport: importButton,
      hostedSmsPoolSummary: { textContent: '' },
      hostedSmsPoolList: { innerHTML: '', appendChild() {} },
    },
    state: {
      getText: () => text,
      setText: (value) => { text = value; },
      getUsage: () => usage,
      setUsage: (value) => { usage = value; },
      getCurrentEntry: () => null,
      isVisible: () => true,
    },
    actions: {
      persistPool: async () => { persisted += 1; },
      importExcel: async () => ({
        entries: [{
          phone: '2345678901',
          verificationUrl: 'https://example.test/code',
          successCount: 4,
          excelSource: {
            filePath: 'C:\\pool.xlsx',
            sheetName: 'Sheet1',
            rowNumber: 2,
          },
        }],
      }),
    },
    helpers: {
      escapeHtml: (value) => String(value),
      showToast: (message) => toastMessages.push(message),
    },
  });

  manager.bindEvents();
  importButton.click();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(text, '2345678901----https://example.test/code');
  assert.equal(usage['2345678901----https://example.test/code'].useCount, 4);
  assert.equal(usage['2345678901----https://example.test/code'].excelSource.rowNumber, 2);
  assert.equal(persisted, 1);
  assert.match(toastMessages.find((message) => /已导入 1 个号码/.test(message)) || '', /已导入 1 个号码/);
});
