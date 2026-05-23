(function attachResidentialProxySwitcher(root, factory) {
  root.MultiPageResidentialProxySwitcher = factory();
})(typeof self !== 'undefined' ? self : globalThis, function createResidentialProxySwitcherModule() {
  const DEFAULT_GROUP_NAME = 'GuJumpgate住宅IP';
  const DEFAULT_HELPER_PATH = '/advance-residential-proxy';
  const DEFAULT_PROXY_NAMES = Array.from({ length: 20 }, (_, index) => `BestGo-US-${String(index + 1).padStart(2, '0')}`);

  function normalizeString(value = '') {
    return String(value || '').trim();
  }

  function createResidentialProxySwitcher(deps = {}) {
    const {
      addLog: rawAddLog = async () => {},
      buildLocalHelperEndpoint,
      fetch: fetchImpl = typeof fetch === 'function' ? fetch.bind(globalThis) : null,
      getState = async () => ({}),
      groupName = DEFAULT_GROUP_NAME,
      helperPath = DEFAULT_HELPER_PATH,
      proxies = DEFAULT_PROXY_NAMES,
    } = deps;

    async function addLog(message, level = 'info') {
      return rawAddLog(message, level, {
        stepKey: 'residential-proxy-switch',
      });
    }

    function resolveHelperUrl(state = {}) {
      if (typeof buildLocalHelperEndpoint !== 'function') {
        throw new Error('缺少本地助手地址构造器。');
      }
      return buildLocalHelperEndpoint(state?.hotmailLocalBaseUrl, helperPath);
    }

    async function requestAdvance(payload = {}) {
      if (typeof fetchImpl !== 'function') {
        throw new Error('当前运行环境不支持 fetch。');
      }
      const state = await getState();
      const response = await fetchImpl(resolveHelperUrl(state), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });
      let body = null;
      try {
        body = await response.json();
      } catch (_) {
        body = null;
      }
      if (!response.ok || body?.ok === false) {
        throw new Error(body?.error || `HTTP ${response.status}`);
      }
      return body || { ok: true };
    }

    async function advanceAfterAccountSuccess(context = {}) {
      try {
        const result = await requestAdvance({
          groupName,
          proxies,
          trigger: 'account-success',
          nodeId: normalizeString(context?.nodeId),
        });
        const previousProxy = normalizeString(result?.previousProxy);
        const nextProxy = normalizeString(result?.nextProxy);
        const detail = previousProxy && nextProxy
          ? `${previousProxy} -> ${nextProxy}`
          : nextProxy || '下一个住宅 IP';
        await addLog(`账号成功后已切换住宅代理：${detail}`, 'ok');
        return result;
      } catch (error) {
        await addLog(`账号成功后切换住宅代理失败：${error?.message || error}`, 'warn');
        return null;
      }
    }

    return {
      advanceAfterAccountSuccess,
    };
  }

  return {
    DEFAULT_GROUP_NAME,
    DEFAULT_PROXY_NAMES,
    createResidentialProxySwitcher,
  };
});
