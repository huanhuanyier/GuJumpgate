const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

function createAccountPoolUiStub() {
  return {
    createAccountPoolFormController({
      formShell,
      toggleButton,
      hiddenLabel = '添加账号',
      visibleLabel = '取消添加',
      onClear,
      onFocus,
    } = {}) {
      let visible = false;

      function sync() {
        if (formShell) {
          formShell.hidden = !visible;
        }
        if (toggleButton) {
          toggleButton.textContent = visible ? visibleLabel : hiddenLabel;
          toggleButton.setAttribute?.('aria-expanded', String(visible));
        }
      }

      function setVisible(nextVisible, options = {}) {
        visible = Boolean(nextVisible);
        if (options.clearForm) {
          onClear?.();
        }
        sync();
        if (visible && options.focusField) {
          onFocus?.();
        }
      }

      sync();
      return {
        isVisible: () => visible,
        setVisible,
        sync,
      };
    },
  };
}

test('sidepanel loads hotmail manager before sidepanel bootstrap', () => {
  const html = fs.readFileSync('sidepanel/sidepanel.html', 'utf8');
  const helperIndex = html.indexOf('<script src="account-pool-ui.js"></script>');
  const hotmailManagerIndex = html.indexOf('<script src="hotmail-manager.js"></script>');
  const sidepanelIndex = html.indexOf('<script src="sidepanel.js"></script>');

  assert.notEqual(helperIndex, -1);
  assert.notEqual(hotmailManagerIndex, -1);
  assert.notEqual(sidepanelIndex, -1);
  assert.ok(helperIndex < hotmailManagerIndex);
  assert.ok(hotmailManagerIndex < sidepanelIndex);
});

test('sidepanel html contains collapsible hotmail form controls', () => {
  const html = fs.readFileSync('sidepanel/sidepanel.html', 'utf8');
  assert.match(html, /id="btn-toggle-hotmail-form"/);
  assert.match(html, /id="btn-import-hotmail-excel"/);
  assert.match(html, /id="hotmail-form-shell"/);
  assert.match(html, /id="btn-import-hotmail-accounts"[^>]*>批量导入</);
});

test('hotmail manager exposes a factory and renders empty state', () => {
  const source = fs.readFileSync('sidepanel/hotmail-manager.js', 'utf8');
  const windowObject = {
    SidepanelAccountPoolUi: createAccountPoolUiStub(),
  };
  const localStorageMock = {
    getItem() {
      return null;
    },
    setItem() {},
  };

  const api = new Function('window', 'localStorage', `${source}; return window.SidepanelHotmailManager;`)(
    windowObject,
    localStorageMock
  );

  assert.equal(typeof api?.createHotmailManager, 'function');

  const hotmailAccountsList = { innerHTML: '' };
  const toggleButton = {
    textContent: '',
    disabled: false,
    setAttribute() {},
  };
  const noopClassList = { toggle() {} };

  const manager = api.createHotmailManager({
    state: {
      getLatestState: () => ({ currentHotmailAccountId: null }),
      syncLatestState() {},
    },
    dom: {
      btnClearUsedHotmailAccounts: { textContent: '', disabled: false },
      btnDeleteAllHotmailAccounts: { textContent: '', disabled: false },
      btnToggleHotmailList: toggleButton,
      hotmailAccountsList,
      hotmailListShell: { classList: noopClassList },
      selectMailProvider: { value: 'hotmail-api' },
      inputEmail: { value: '' },
    },
    helpers: {
      getHotmailAccounts: () => [],
      getCurrentHotmailEmail: () => '',
      escapeHtml: (value) => String(value || ''),
      showToast() {},
      openConfirmModal: async () => true,
      copyTextToClipboard: async () => {},
    },
    runtime: {
      sendMessage: async () => ({}),
    },
    constants: {
      copyIcon: '',
      displayTimeZone: 'Asia/Shanghai',
      expandedStorageKey: 'multipage-hotmail-list-expanded',
    },
    hotmailUtils: {},
  });

  assert.equal(typeof manager.renderHotmailAccounts, 'function');
  assert.equal(typeof manager.bindHotmailEvents, 'function');
  assert.equal(typeof manager.initHotmailListExpandedState, 'function');

  manager.renderHotmailAccounts();
  assert.match(hotmailAccountsList.innerHTML, /还没有 Hotmail 账号/);
});

test('hotmail manager toggles form container from header button', () => {
  const source = fs.readFileSync('sidepanel/hotmail-manager.js', 'utf8');
  const windowObject = {
    SidepanelAccountPoolUi: createAccountPoolUiStub(),
  };
  const localStorageMock = {
    getItem() {
      return null;
    },
    setItem() {},
  };

  const api = new Function('window', 'localStorage', `${source}; return window.SidepanelHotmailManager;`)(
    windowObject,
    localStorageMock
  );

  const handlers = {};
  const toggleFormButton = {
    textContent: '',
    disabled: false,
    setAttribute(name, value) {
      this[name] = value;
    },
    addEventListener(type, handler) {
      if (type === 'click') handlers.toggleForm = handler;
    },
  };
  const formShell = { hidden: true };

  const manager = api.createHotmailManager({
    state: {
      getLatestState: () => ({ currentHotmailAccountId: null }),
      syncLatestState() {},
    },
    dom: {
      btnAddHotmailAccount: { textContent: '', disabled: false, addEventListener() {} },
      btnClearUsedHotmailAccounts: { textContent: '', disabled: false, addEventListener() {} },
      btnDeleteAllHotmailAccounts: { textContent: '', disabled: false, addEventListener() {} },
      btnHotmailUsageGuide: { addEventListener() {} },
      btnImportHotmailAccounts: { disabled: false, addEventListener() {} },
      btnToggleHotmailForm: toggleFormButton,
      btnToggleHotmailList: { textContent: '', disabled: false, setAttribute() {}, addEventListener() {} },
      hotmailAccountsList: { innerHTML: '', addEventListener() {} },
      hotmailFormShell: formShell,
      hotmailListShell: { classList: { toggle() {} } },
      inputEmail: { value: '' },
      inputHotmailClientId: { value: '' },
      inputHotmailEmail: { value: '', focus() { this.focused = true; } },
      inputHotmailImport: { value: '' },
      inputHotmailPassword: { value: '' },
      inputHotmailRefreshToken: { value: '' },
      selectMailProvider: { value: 'hotmail-api' },
    },
    helpers: {
      getHotmailAccounts: () => [],
      getCurrentHotmailEmail: () => '',
      escapeHtml: (value) => String(value || ''),
      showToast() {},
      openConfirmModal: async () => true,
      copyTextToClipboard: async () => {},
    },
    runtime: {
      sendMessage: async () => ({}),
    },
    constants: {
      copyIcon: '',
      displayTimeZone: 'Asia/Shanghai',
      expandedStorageKey: 'multipage-hotmail-list-expanded',
    },
    hotmailUtils: {},
  });

  manager.bindHotmailEvents();
  assert.equal(formShell.hidden, true);
  assert.equal(toggleFormButton.textContent, '添加账号');

  handlers.toggleForm();
  assert.equal(formShell.hidden, false);
  assert.equal(toggleFormButton.textContent, '取消添加');

  handlers.toggleForm();
  assert.equal(formShell.hidden, true);
  assert.equal(toggleFormButton.textContent, '添加账号');
});

test('hotmail manager hides form after save succeeds', async () => {
  const source = fs.readFileSync('sidepanel/hotmail-manager.js', 'utf8');
  const windowObject = {
    SidepanelAccountPoolUi: createAccountPoolUiStub(),
  };
  const localStorageMock = {
    getItem() {
      return null;
    },
    setItem() {},
  };

  const api = new Function('window', 'localStorage', `${source}; return window.SidepanelHotmailManager;`)(
    windowObject,
    localStorageMock
  );

  const handlers = {};
  const formShell = { hidden: true };
  const toggleFormButton = {
    textContent: '',
    disabled: false,
    setAttribute() {},
    addEventListener(type, handler) {
      if (type === 'click') handlers.toggleForm = handler;
    },
  };
  const addButton = {
    textContent: '',
    disabled: false,
    addEventListener(type, handler) {
      if (type === 'click') handlers.add = handler;
    },
  };
  const inputHotmailEmail = { value: '', focus() {} };
  const inputHotmailClientId = { value: '' };
  const inputHotmailPassword = { value: '' };
  const inputHotmailRefreshToken = { value: '' };
  const toastMessages = [];

  const manager = api.createHotmailManager({
    state: {
      getLatestState: () => ({ currentHotmailAccountId: null }),
      syncLatestState() {},
    },
    dom: {
      btnAddHotmailAccount: addButton,
      btnClearUsedHotmailAccounts: { textContent: '', disabled: false, addEventListener() {} },
      btnDeleteAllHotmailAccounts: { textContent: '', disabled: false, addEventListener() {} },
      btnHotmailUsageGuide: { addEventListener() {} },
      btnImportHotmailAccounts: { disabled: false, addEventListener() {} },
      btnToggleHotmailForm: toggleFormButton,
      btnToggleHotmailList: { textContent: '', disabled: false, setAttribute() {}, addEventListener() {} },
      hotmailAccountsList: { innerHTML: '', addEventListener() {} },
      hotmailFormShell: formShell,
      hotmailListShell: { classList: { toggle() {} } },
      inputEmail: { value: '' },
      inputHotmailClientId,
      inputHotmailEmail,
      inputHotmailImport: { value: '' },
      inputHotmailPassword,
      inputHotmailRefreshToken,
      selectMailProvider: { value: 'hotmail-api' },
    },
    helpers: {
      getHotmailAccounts: () => [],
      getCurrentHotmailEmail: () => '',
      escapeHtml: (value) => String(value || ''),
      showToast(message) {
        toastMessages.push(message);
      },
      openConfirmModal: async () => true,
      copyTextToClipboard: async () => {},
    },
    runtime: {
      sendMessage: async () => ({
        account: {
          id: 'acc-1',
          email: 'demo@hotmail.com',
          clientId: 'client-id',
          refreshToken: 'refresh-token',
        },
      }),
    },
    constants: {
      copyIcon: '',
      displayTimeZone: 'Asia/Shanghai',
      expandedStorageKey: 'multipage-hotmail-list-expanded',
    },
    hotmailUtils: {},
  });

  manager.bindHotmailEvents();
  handlers.toggleForm();
  inputHotmailEmail.value = 'demo@hotmail.com';
  inputHotmailClientId.value = 'client-id';
  inputHotmailPassword.value = 'secret';
  inputHotmailRefreshToken.value = 'refresh-token';

  await handlers.add();

  assert.equal(formShell.hidden, true);
  assert.equal(toggleFormButton.textContent, '添加账号');
  assert.equal(inputHotmailEmail.value, '');
  assert.equal(inputHotmailClientId.value, '');
  assert.equal(inputHotmailPassword.value, '');
  assert.equal(inputHotmailRefreshToken.value, '');
  assert.match(toastMessages.at(-1) || '', /已保存 Hotmail 账号/);
});

test('hotmail manager imports accounts from selected Excel file', async () => {
  const source = fs.readFileSync('sidepanel/hotmail-manager.js', 'utf8');
  const windowObject = {
    SidepanelAccountPoolUi: createAccountPoolUiStub(),
  };
  const localStorageMock = {
    getItem() {
      return null;
    },
    setItem() {},
  };

  const api = new Function('window', 'localStorage', `${source}; return window.SidepanelHotmailManager;`)(
    windowObject,
    localStorageMock
  );

  const handlers = {};
  const toastMessages = [];
  const runtimeMessages = [];
  let latestState = { currentHotmailAccountId: null, hotmailAccounts: [] };

  const manager = api.createHotmailManager({
    state: {
      getLatestState: () => latestState,
      syncLatestState(updates) {
        latestState = {
          ...latestState,
          ...(updates || {}),
        };
      },
    },
    dom: {
      btnAddHotmailAccount: { disabled: false, addEventListener() {} },
      btnClearUsedHotmailAccounts: { textContent: '', disabled: false, addEventListener() {} },
      btnDeleteAllHotmailAccounts: { textContent: '', disabled: false, addEventListener() {} },
      btnHotmailUsageGuide: { addEventListener() {} },
      btnImportHotmailAccounts: { disabled: false, addEventListener() {} },
      btnImportHotmailExcel: {
        disabled: false,
        addEventListener(type, handler) {
          if (type === 'click') handlers.importExcel = handler;
        },
      },
      btnToggleHotmailForm: { textContent: '', setAttribute() {}, addEventListener() {} },
      btnToggleHotmailList: { textContent: '', disabled: false, setAttribute() {}, addEventListener() {} },
      hotmailAccountsList: { innerHTML: '', addEventListener() {} },
      hotmailFormShell: { hidden: true },
      hotmailListShell: { classList: { toggle() {} } },
      inputEmail: { value: '' },
      inputHotmailClientId: { value: '' },
      inputHotmailEmail: { value: '', focus() {} },
      inputHotmailImport: { value: '' },
      inputHotmailPassword: { value: '' },
      inputHotmailRefreshToken: { value: '' },
      selectMailProvider: { value: 'hotmail-api' },
    },
    helpers: {
      getHotmailAccounts: () => latestState.hotmailAccounts,
      getCurrentHotmailEmail: () => '',
      escapeHtml: (value) => String(value || ''),
      showToast(message) {
        toastMessages.push(message);
      },
      openConfirmModal: async () => true,
      copyTextToClipboard: async () => {},
    },
    runtime: {
      sendMessage: async (message) => {
        runtimeMessages.push(message);
        if (message.type === 'BROWSE_HOTMAIL_EXCEL') {
          return { ok: true, filePath: 'D:\\accounts.xlsx' };
        }
        if (message.type === 'IMPORT_HOTMAIL_EXCEL') {
          return {
            ok: true,
            importedCount: 2,
            updatedCount: 0,
            accounts: [
              { id: 'a', email: 'a@outlook.com' },
              { id: 'b', email: 'b@outlook.com' },
            ],
          };
        }
        return { ok: true };
      },
    },
    constants: {
      copyIcon: '',
      displayTimeZone: 'Asia/Shanghai',
      expandedStorageKey: 'multipage-hotmail-list-expanded',
    },
    hotmailUtils: {},
  });

  manager.bindHotmailEvents();
  await handlers.importExcel();

  assert.deepEqual(runtimeMessages.map((message) => message.type), [
    'BROWSE_HOTMAIL_EXCEL',
    'IMPORT_HOTMAIL_EXCEL',
  ]);
  assert.deepEqual(runtimeMessages[1].payload, { filePath: 'D:\\accounts.xlsx' });
  assert.equal(latestState.hotmailAccounts.length, 2);
  assert.match(toastMessages.at(-1) || '', /Hotmail Excel/);
});
