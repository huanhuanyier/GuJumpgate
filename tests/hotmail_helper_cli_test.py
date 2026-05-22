import importlib.util
import tempfile
import unittest
from pathlib import Path


def load_hotmail_helper():
    module_path = Path(__file__).resolve().parents[1] / "scripts" / "hotmail_helper.py"
    spec = importlib.util.spec_from_file_location("hotmail_helper", module_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


hotmail_helper = load_hotmail_helper()


class HotmailHelperCliTest(unittest.TestCase):
    def test_normalize_server_port_uses_default_when_empty(self):
        self.assertEqual(hotmail_helper.normalize_server_port(None), 17373)
        self.assertEqual(hotmail_helper.normalize_server_port(""), 17373)

    def test_normalize_server_port_validates_range(self):
        self.assertEqual(hotmail_helper.normalize_server_port("18080"), 18080)
        with self.assertRaises(ValueError):
            hotmail_helper.normalize_server_port("0")
        with self.assertRaises(ValueError):
            hotmail_helper.normalize_server_port("70000")

    def test_resolve_server_config_reads_cli_and_environment(self):
        config = hotmail_helper.resolve_server_config(
            ["--port", "18080"],
            environ={},
        )
        self.assertEqual(config["host"], "127.0.0.1")
        self.assertEqual(config["port"], 18080)

        env_config = hotmail_helper.resolve_server_config(
            [],
            environ={"HOTMAIL_HELPER_HOST": "0.0.0.0", "HOTMAIL_HELPER_PORT": "19090"},
        )
        self.assertEqual(env_config["host"], "0.0.0.0")
        self.assertEqual(env_config["port"], 19090)

    def test_save_local_cpa_json_creates_parent_dir_and_writes_content(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            target = Path(tmpdir) / "plugin" / ".cli-proxy-api" / "codex-demo.json"
            saved_path = hotmail_helper.save_local_cpa_json(
                str(target),
                '{"type":"codex"}\n',
                str(target.parent),
            )
            self.assertEqual(saved_path, str(target))
            self.assertEqual(target.read_text(encoding="utf-8"), '{"type":"codex"}\n')

    def test_import_hotmail_accounts_excel_reads_first_column_raw_accounts(self):
        openpyxl = hotmail_helper.require_openpyxl()
        with tempfile.TemporaryDirectory() as tmpdir:
            target = Path(tmpdir) / "hotmail.xlsx"
            workbook = openpyxl.Workbook()
            sheet = workbook.active
            sheet.title = "Accounts"
            sheet.cell(row=1, column=1).value = "Email"
            sheet.cell(row=1, column=2).value = "Name"
            sheet.cell(row=2, column=1).value = "a@outlook.com----pa----client-a----token-a"
            sheet.cell(row=2, column=2).value = "ignored"
            sheet.cell(row=3, column=1).value = "b@outlook.com----pb----client-b----token-b"
            workbook.save(target)

            result = hotmail_helper.import_hotmail_accounts_excel(str(target))

        self.assertEqual(result["filePath"], str(target))
        self.assertEqual(result["sheetName"], "Accounts")
        self.assertEqual(result["count"], 2)
        self.assertEqual(result["accounts"][0]["raw"], "a@outlook.com----pa----client-a----token-a")
        self.assertEqual(result["accounts"][0]["excelSource"]["rowNumber"], 2)

    def test_import_hotmail_accounts_excel_skips_mail_header_and_invalid_rows(self):
        openpyxl = hotmail_helper.require_openpyxl()
        with tempfile.TemporaryDirectory() as tmpdir:
            target = Path(tmpdir) / "hotmail.xlsx"
            workbook = openpyxl.Workbook()
            sheet = workbook.active
            sheet.title = "mail"
            sheet.cell(row=1, column=1).value = "mail"
            sheet.cell(row=1, column=2).value = "name"
            sheet.cell(row=2, column=1).value = "not-an-account"
            sheet.cell(row=3, column=1).value = "a@outlook.com----pa----client-a----token-a"
            workbook.save(target)

            result = hotmail_helper.import_hotmail_accounts_excel(str(target))

        self.assertEqual(result["count"], 1)
        self.assertEqual(result["accounts"][0]["raw"], "a@outlook.com----pa----client-a----token-a")
        self.assertEqual(result["accounts"][0]["excelSource"]["rowNumber"], 3)


if __name__ == "__main__":
    unittest.main()
