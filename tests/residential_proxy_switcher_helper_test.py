import unittest

import scripts.hotmail_helper as helper


class FakeMihomoTransport:
    def __init__(self, current):
        self.current = current
        self.put_payloads = []

    def get_proxy(self, group_name):
        return {
            "name": group_name,
            "type": "Selector",
            "now": self.current,
            "all": ["BestGo-US-01", "BestGo-US-02", "BestGo-US-03"],
        }

    def put_proxy(self, group_name, proxy_name):
        self.put_payloads.append((group_name, proxy_name))
        self.current = proxy_name
        return {"ok": True}


class ResidentialProxySwitcherHelperTest(unittest.TestCase):
    def test_advances_to_next_proxy(self):
        transport = FakeMihomoTransport("BestGo-US-01")

        result = helper.advance_residential_proxy({
            "groupName": "GuJumpgate住宅IP",
            "proxies": ["BestGo-US-01", "BestGo-US-02", "BestGo-US-03"],
        }, transport=transport)

        self.assertEqual(result["previousProxy"], "BestGo-US-01")
        self.assertEqual(result["nextProxy"], "BestGo-US-02")
        self.assertEqual(transport.put_payloads, [("GuJumpgate住宅IP", "BestGo-US-02")])

    def test_wraps_from_last_proxy_to_first(self):
        transport = FakeMihomoTransport("BestGo-US-03")

        result = helper.advance_residential_proxy({
            "groupName": "GuJumpgate住宅IP",
            "proxies": ["BestGo-US-01", "BestGo-US-02", "BestGo-US-03"],
        }, transport=transport)

        self.assertEqual(result["previousProxy"], "BestGo-US-03")
        self.assertEqual(result["nextProxy"], "BestGo-US-01")
        self.assertEqual(transport.put_payloads, [("GuJumpgate住宅IP", "BestGo-US-01")])

    def test_uses_first_proxy_when_current_is_unknown(self):
        transport = FakeMihomoTransport("DIRECT")

        result = helper.advance_residential_proxy({
            "groupName": "GuJumpgate住宅IP",
            "proxies": ["BestGo-US-01", "BestGo-US-02"],
        }, transport=transport)

        self.assertEqual(result["previousProxy"], "DIRECT")
        self.assertEqual(result["nextProxy"], "BestGo-US-01")


if __name__ == "__main__":
    unittest.main()
