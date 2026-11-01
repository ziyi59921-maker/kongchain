import json
import os
import sys
import time
import unittest
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import finance_tools  # noqa: E402
from openpyxl import Workbook  # noqa: E402

ROOT = Path('F:/KongChain-logs/samples/finance-batch')
TEST_ROOT = ROOT / 'test-unit'
RUN = str(time.time_ns())


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
    lines = [','.join(str(value) for value in row) for row in rows]
    path.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    return path


def setUpModule():
    TEST_ROOT.mkdir(parents=True, exist_ok=True)


class FinanceToolsTest(unittest.TestCase):
    def test_profile_cleans_duplicates_totals_and_anomalies(self):
        source = write_xlsx(TEST_ROOT / 'profile.xlsx', [
            ['category', 'supplier', 'amount', 'note'],
            ['办公', '甲公司', 100, 'ok'],
            ['办公', '甲公司', 100, 'duplicate'],
            ['差旅', '乙公司', -50, 'negative'],
            ['差旅', '乙公司', 10000, 'outlier'],
            ['办公', '', 200, 'missing supplier'],
        ])
        output = TEST_ROOT / f'profile-out-{RUN}.xlsx'
        result = finance_tools.profile({
            'path': str(source),
            'groupBy': 'category',
            'amountColumns': ['amount'],
            'dedupeKeys': ['category', 'supplier', 'amount'],
            'outputPath': str(output),
        })
        self.assertTrue(result['ok'])
        self.assertEqual(result['totals']['amount']['sum'], '10350.00')
        self.assertEqual(len(result['duplicates']), 1)
        self.assertTrue(any(item['type'] == 'negative_amount' for item in result['anomalies']))
        self.assertTrue(output.exists())
        self.assertTrue(source.exists())

    def test_voucher_flags_required_amount_and_low_confidence(self):
        vouchers = write_csv(TEST_ROOT / 'vouchers.csv', [
            ['voucherNo', 'amount', 'payee'],
            ['V001', 100, '甲公司'],
            ['V002', '', '乙公司'],
            ['V003', 300, '丙公司'],
        ])
        invoices = write_csv(TEST_ROOT / 'invoices.csv', [
            ['voucherNo', 'amount'],
            ['V001', 120],
            ['V003', 300],
            ['V004', 50],
        ])
        attachments = write_csv(TEST_ROOT / 'attachments.csv', [
            ['voucherNo', 'file', 'confidence'],
            ['V001', 'v001.pdf', 0.95],
            ['V003', 'v003.jpg', 0.42],
        ])
        result = finance_tools.voucher({
            'voucherPath': str(vouchers),
            'invoicePath': str(invoices),
            'attachmentPath': str(attachments),
            'keyColumns': ['voucherNo'],
            'amountColumn': 'amount',
            'requiredFields': ['voucherNo', 'amount'],
        })
        types = {item['type'] for item in result['findings']}
        self.assertIn('missing_required', types)
        self.assertIn('amount_diff', types)
        self.assertIn('low_scan_confidence', types)
        self.assertTrue(any(item['classification'] == 'toVerify' for item in result['findings']))

    def test_analyze_period_budget_structure_and_ratios(self):
        current = write_xlsx(TEST_ROOT / 'current.xlsx', [
            ['category', 'amount', 'metric', 'value'],
            ['办公', 100, 'revenue', 1000],
            ['差旅', 300, 'expense', 600],
            ['办公', 150, 'currentAssets', 800],
            ['差旅', 0, 'currentLiabilities', 400],
        ])
        previous = write_xlsx(TEST_ROOT / 'previous.xlsx', [
            ['category', 'amount'],
            ['办公', 80],
            ['差旅', 250],
        ])
        budget = write_xlsx(TEST_ROOT / 'budget.xlsx', [
            ['category', 'budgetAmount'],
            ['办公', 200],
            ['差旅', 100],
        ])
        result = finance_tools.analyze({
            'currentPath': str(current),
            'previousPath': str(previous),
            'budgetPath': str(budget),
            'categoryColumn': 'category',
            'amountColumn': 'amount',
            'varianceThreshold': '0.20',
        })
        self.assertEqual(result['periodCompare']['delta'], '220.00')
        self.assertEqual(result['periodCompare']['deltaPct'], '66.67')
        self.assertEqual(result['ratios']['expenseRatio'], '0.60')
        self.assertEqual(result['ratios']['currentRatio'], '2.00')
        self.assertTrue(any(item['category'] == '差旅' for item in result['anomalies']))

    def test_workpaper_classifies_findings_and_writes_file(self):
        source = write_csv(TEST_ROOT / 'workpaper-source.csv', [['id'], ['1']])
        output = TEST_ROOT / f'workpaper-{RUN}.docx'
        result = finance_tools.workpaper({
            'title': '测试底稿',
            'scope': '合成数据',
            'sources': [str(source)],
            'findings': [{'classification': 'fact', 'type': 'test'}],
            'riskPoints': [{'risk': '凭证不完整'}],
            'controlObjectives': [{'objective': '完整性'}],
            'testProcedures': [{'procedure': '抽查凭证'}],
            'remediation': [{'action': '补附件'}],
            'outputPath': str(output),
        })
        self.assertTrue(result['ok'])
        self.assertEqual(result['sections']['anomalies'][0]['classification'], 'fact')
        self.assertTrue(output.exists())

    def test_deliver_generates_files_and_refuses_without_sources(self):
        source = write_csv(TEST_ROOT / 'deliver-source.csv', [['id'], ['1']])
        for fmt, suffix in [('xlsx', '.xlsx'), ('csv', '.csv'), ('docx', '.docx'), ('pdf', '.pdf')]:
            output = TEST_ROOT / f'deliver-{RUN}{suffix}'
            result = finance_tools.deliver({
                'format': fmt,
                'title': '财务分析',
                'scope': '合成数据',
                'methodology': 'Decimal 计算',
                'results': [{'item': '合计', 'value': '1'}],
                'issues': [{'issue': '无'}],
                'limitations': ['仅合成数据'],
                'review': ['复核原始凭证'],
                'sources': [str(source)],
                'outputPath': str(output),
            })
            self.assertTrue(result['ok'])
            self.assertTrue(output.exists())
        refused = finance_tools.deliver({'format': 'csv', 'sources': [], 'outputPath': str(TEST_ROOT / 'refuse.csv')})
        self.assertFalse(refused['ok'])
        self.assertIn('sources are required', refused['error'])


if __name__ == '__main__':
    unittest.main()
