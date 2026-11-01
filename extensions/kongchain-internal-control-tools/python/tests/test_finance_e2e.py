import json
import os
import subprocess
import sys
import time
import unittest
from pathlib import Path

from openpyxl import Workbook

HELPER = Path(__file__).resolve().parents[1] / 'finance_tools.py'
ROOT = Path('F:/KongChain-logs/samples/finance-batch')
E2E_ROOT = ROOT / 'test-e2e'
RUN = str(time.time_ns())


def call(action, payload):
    result = subprocess.run(
        [sys.executable, str(HELPER), action],
        input=json.dumps(payload, ensure_ascii=False),
        capture_output=True,
        text=True,
        encoding='utf-8',
        env={**os.environ, 'PYTHONIOENCODING': 'utf-8', 'PYTHONUTF8': '1'},
    )
    self = None
    if result.returncode != 0:
        raise AssertionError(f'{action} failed: {result.stderr}')
    return json.loads(result.stdout)


def write_xlsx(path, rows):
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = 'Data'
    for row in rows:
        sheet.append(row)
    path.parent.mkdir(parents=True, exist_ok=True)
    workbook.save(path)
    return path


def write_csv(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text('\n'.join(','.join(str(value) for value in row) for row in rows) + '\n', encoding='utf-8')
    return path


class FinanceE2ETest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.current = write_xlsx(E2E_ROOT / 'current.xlsx', [
            ['category', 'amount', 'metric', 'value'],
            ['采购', 1200, 'revenue', 5000],
            ['费用', 800, 'expense', 3000],
            ['采购', 900, 'currentAssets', 2000],
            ['费用', 0, 'currentLiabilities', 1000],
        ])
        cls.previous = write_xlsx(E2E_ROOT / 'previous.xlsx', [
            ['category', 'amount'],
            ['采购', 1000],
            ['费用', 900],
        ])
        cls.budget = write_xlsx(E2E_ROOT / 'budget.xlsx', [
            ['category', 'budgetAmount'],
            ['采购', 1800],
            ['费用', 1200],
        ])
        cls.vouchers = write_csv(E2E_ROOT / 'vouchers.csv', [
            ['voucherNo', 'amount', 'payee'],
            ['V001', 1000, '甲公司'],
            ['V002', 500, '乙公司'],
        ])
        cls.invoices = write_csv(E2E_ROOT / 'invoices.csv', [
            ['voucherNo', 'amount'],
            ['V001', 1000],
            ['V002', 450],
        ])
        cls.attachments = write_csv(E2E_ROOT / 'attachments.csv', [
            ['voucherNo', 'file', 'confidence'],
            ['V001', 'v001.pdf', 0.92],
            ['V002', 'v002.jpg', 0.55],
        ])

    def test_five_capabilities_end_to_end(self):
        profile = call('profile', {
            'path': str(self.current),
            'groupBy': 'category',
            'amountColumns': ['amount'],
            'dedupeKeys': ['category', 'amount'],
            'outputPath': str(E2E_ROOT / f'profile-out-{RUN}.xlsx'),
        })
        self.assertTrue(profile['ok'])
        self.assertEqual(profile['totals']['amount']['sum'], '2900.00')

        voucher = call('voucher', {
            'voucherPath': str(self.vouchers),
            'invoicePath': str(self.invoices),
            'attachmentPath': str(self.attachments),
            'keyColumns': ['voucherNo'],
            'amountColumn': 'amount',
            'requiredFields': ['voucherNo', 'amount'],
            'outputPath': str(E2E_ROOT / f'voucher-out-{RUN}.xlsx'),
        })
        self.assertTrue(voucher['ok'])
        self.assertTrue(any(item['type'] == 'amount_diff' for item in voucher['findings']))

        analyze = call('analyze', {
            'currentPath': str(self.current),
            'previousPath': str(self.previous),
            'budgetPath': str(self.budget),
            'categoryColumn': 'category',
            'amountColumn': 'amount',
            'varianceThreshold': '0.20',
            'outputPath': str(E2E_ROOT / f'analysis-out-{RUN}.xlsx'),
        })
        self.assertTrue(analyze['ok'])
        self.assertEqual(analyze['periodCompare']['delta'], '1000.00')

        workpaper = call('workpaper', {
            'title': '采购与凭证内控底稿',
            'scope': '合成多表数据',
            'sources': [str(self.current), str(self.vouchers), str(self.invoices)],
            'findings': [{'classification': 'toVerify', 'type': 'low_scan_confidence'}],
            'riskPoints': [{'risk': '附件缺失'}],
            'controlObjectives': [{'objective': '凭证完整'}],
            'testProcedures': [{'procedure': '核对凭证与发票'}],
            'remediation': [{'action': '补充附件'}],
            'outputPath': str(E2E_ROOT / f'workpaper-{RUN}.docx'),
        })
        self.assertTrue(workpaper['ok'])

        deliver = call('deliver', {
            'format': 'xlsx',
            'title': '财务分析交付',
            'scope': '合成多表数据',
            'methodology': 'Decimal 计算、键值核对',
            'results': [{'item': '合计', 'value': analyze['periodCompare']['currentTotal']}],
            'issues': [{'issue': 'V002 金额差异 50'}],
            'limitations': ['合成数据'],
            'review': ['复核原始凭证'],
            'sources': [str(self.current), str(self.vouchers)],
            'outputPath': str(E2E_ROOT / f'deliverable-{RUN}.xlsx'),
        })
        self.assertTrue(deliver['ok'])
        for path in [f'profile-out-{RUN}.xlsx', f'voucher-out-{RUN}.xlsx', f'analysis-out-{RUN}.xlsx', f'workpaper-{RUN}.docx', f'deliverable-{RUN}.xlsx']:
            self.assertTrue((E2E_ROOT / path).exists(), path)


if __name__ == '__main__':
    unittest.main()
