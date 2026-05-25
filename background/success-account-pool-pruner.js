(function attachSuccessAccountPoolPruner(root, factory) {
  root.MultiPageSuccessAccountPoolPruner = factory();
})(typeof self !== 'undefined' ? self : globalThis, function createSuccessAccountPoolPrunerModule() {
  const HOTMAIL_PROVIDER = 'hotmail-api';

  function normalizeString(value = '') {
    return String(value || '').trim();
  }

  function isHotmailProvider(state = {}) {
    return normalizeString(state?.mailProvider) === HOTMAIL_PROVIDER;
  }

  function normalizeHotmailAccounts(accounts = []) {
    return Array.isArray(accounts)
      ? accounts.filter((account) => account && typeof account === 'object')
      : [];
  }

  function createSuccessAccountPoolPruner(deps = {}) {
    const {
      addLog: rawAddLog = async () => {},
      broadcastDataUpdate = () => {},
      getState = async () => ({}),
      setPersistentSettings = async () => {},
      setState = async () => {},
    } = deps;

    async function addLog(message, level = 'info') {
      return rawAddLog(message, level, {
        stepKey: 'success-account-pool-prune',
      });
    }

    async function removeCurrentAccountAfterSuccess(context = {}) {
      try {
        const latestState = {
          ...(context?.state && typeof context.state === 'object' ? context.state : {}),
          ...await getState(),
        };
        if (!isHotmailProvider(latestState)) {
          return { removed: false, reason: 'not-hotmail-provider' };
        }

        const currentId = normalizeString(latestState.currentHotmailAccountId);
        if (!currentId) {
          return { removed: false, reason: 'missing-current-hotmail-account' };
        }

        const accounts = normalizeHotmailAccounts(latestState.hotmailAccounts);
        const removedAccount = accounts.find((account) => normalizeString(account?.id) === currentId) || null;
        if (!removedAccount) {
          return { removed: false, reason: 'current-hotmail-account-not-found' };
        }

        const nextAccounts = accounts.filter((account) => normalizeString(account?.id) !== currentId);
        const update = {
          hotmailAccounts: nextAccounts,
          currentHotmailAccountId: null,
        };
        await setPersistentSettings({ hotmailAccounts: nextAccounts });
        await setState(update);
        broadcastDataUpdate(update);
        await addLog(`注册成功：已从 Hotmail 账号池删除 ${normalizeString(removedAccount.email) || currentId}。`, 'ok');

        return {
          removed: true,
          removedAccount,
          hotmailAccounts: nextAccounts,
        };
      } catch (error) {
        await addLog(`注册成功后删除账号池账号失败：${error?.message || error}`, 'warn');
        return { removed: false, reason: 'error', error };
      }
    }

    return {
      removeCurrentAccountAfterSuccess,
    };
  }

  return {
    HOTMAIL_PROVIDER,
    createSuccessAccountPoolPruner,
  };
});
