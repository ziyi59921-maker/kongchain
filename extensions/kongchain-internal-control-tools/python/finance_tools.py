#!/usr/bin/env python3
"""Reusable finance tools for KongChain.

Actions: profile, voucher, analyze, workpaper, deliver.
Input: JSON on stdin. Output: one JSON document on stdout.
Calculations use Decimal; source files are never overwritten.
"""
from __future__ import annotations

import csv
import json
import os
import re
import sys
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from tools import (  # noqa: E402
    OUTPUT_ROOT,
    allowed,
    cell,
    fail,
    inside,
    normalize_amount,
    read_table,
    source_meta,
)

try:
    from docx import Document
except Exception:  # pragma: no cover
    Document = None
try:
    from openpyxl import Workbook
except Exception:  # pragma: no cover
    Workbook = None
try:
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
except Exception:  # pragma: no cover
    A4 = None
    canvas = None

DATE_PATTERN = re.compile(r'^\d{4}-\d{2}-\d{2}')
Q = Decimal('0.01')


def dec(value):
    parsed = normalize_amount(value)
    return None if parsed is None else parsed.quantize(Q)


def as_text(value):
    return '' if value is None else str(value).strip()


def infer_kind(values):
    non_empty = [value for value in values if as_text(value) != '']
    if not non_empty:
        return 'empty'
    numeric = sum(1 for value in non_empty if dec(value) is not None)
    dates = sum(1 for value in non_empty if DATE_PATTERN.match(as_text(value)))
    if numeric == len(non_empty):
        return 'numeric'
    if dates == len(non_empty):
        return 'date'
    return 'text'


def clean_rows(table):
    rows = []
    issues = []
    for record in table.get('rows', []):
        cleaned = {}
        for key, value in record.items():
            if key == '__row__':
                cleaned[key] = value
                continue
            text = as_text(value)
            if text == '':
                cleaned[key] = None
                continue
            cleaned[key] = text
            if dec(value) is not None:
                cleaned[key] = str(dec(value))
        rows.append(cleaned)
        for key, value in cleaned.items():
            if key != '__row__' and value is None:
                issues.append({'row': record.get('__row__'), 'field': key, 'issue': 'missing'})
    return rows, issues


def duplicate_findings(rows, keys):
    groups = {}
    for row in rows:
        key = tuple(as_text(row.get(field)).casefold() for field in keys)
        if any(part == '' for part in key):
            continue
        groups.setdefault(key, []).append(row.get('__row__'))
    return [
        {'key': dict(zip(keys, key)), 'rows': row_numbers, 'count': len(row_numbers)}
        for key, row_numbers in groups.items() if len(row_numbers) > 1
    ]


def numeric_summary(rows, amount_columns):
    summary = {}
    for column in amount_columns:
        values = [dec(row.get(column)) for row in rows]
        values = [value for value in values if value is not None]
        if not values:
            summary[column] = {'count': 0, 'sum': '0.00', 'mean': None, 'min': None, 'max': None}
            continue
        total = sum(values, Decimal('0'))
        summary[column] = {
            'count': len(values),
            'sum': str(total.quantize(Q)),
            'mean': str((total / Decimal(len(values))).quantize(Q)),
            'min': str(min(values)),
            'max': str(max(values)),
        }
    return summary


def group_summary(rows, group_column, amount_columns):
    groups = {}
    for row in rows:
        group = as_text(row.get(group_column)) or '(blank)'
        bucket = groups.setdefault(group, {'count': 0, 'amounts': {column: Decimal('0') for column in amount_columns}})
        bucket['count'] += 1
        for column in amount_columns:
            value = dec(row.get(column))
            if value is not None:
                bucket['amounts'][column] += value
    return [
        {'group': group, 'count': bucket['count'], 'amounts': {column: str(value.quantize(Q)) for column, value in bucket['amounts'].items()}}
        for group, bucket in sorted(groups.items())
    ]


def anomaly_findings(rows, amount_column, threshold=Decimal('0.20')):
    values = [dec(row.get(amount_column)) for row in rows]
    values = [value for value in values if value is not None]
    findings = []
    if not values:
        return findings
    total = sum(values, Decimal('0'))
    mean = total / Decimal(len(values))
    for row in rows:
        value = dec(row.get(amount_column))
        if value is None:
            continue
        if value < 0:
            findings.append({'row': row.get('__row__'), 'type': 'negative_amount', 'value': str(value)})
        elif mean != 0 and abs(value - mean) / abs(mean) > threshold and abs(value - mean) > Decimal('100'):
            findings.append({'row': row.get('__row__'), 'type': 'deviation_from_mean', 'value': str(value), 'mean': str(mean.quantize(Q))})
    return findings


def safe_output(path_value, default_name):
    if path_value:
        path = Path(str(path_value)).resolve()
    else:
        stamp = datetime.now().strftime('%Y%m%d-%H%M%S')
        path = (OUTPUT_ROOT / 'finance-batch' / 'out' / f'{default_name}-{stamp}.xlsx').resolve()
    if not inside(path, OUTPUT_ROOT.resolve()):
        raise ValueError(f'output must stay under {OUTPUT_ROOT}')
    if path.exists():
        raise ValueError(f'refusing to overwrite existing output: {path}')
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def write_xlsx(path, sheets):
    if Workbook is None:
        raise RuntimeError('openpyxl is not installed')
    workbook = Workbook()
    first = True
    for name, rows in sheets.items():
        sheet = workbook.active if first else workbook.create_sheet()
        first = False
        sheet.title = name[:31]
        for row in rows:
            sheet.append(row)
    workbook.save(path)
    return str(path)


def profile(args):
    path = Path(str(args.get('path', ''))).resolve()
    if not allowed(path) or not path.exists():
        return fail(f'file not found or outside authorized workspace: {path}')
    table = read_table(path, args.get('sheet'))
    rows, missing = clean_rows(table)
    columns = table.get('columns') or []
    amount_columns = args.get('amountColumns') or [column for column in columns if infer_kind([row.get(column) for row in rows]) == 'numeric']
    keys = args.get('dedupeKeys') or []
    group_column = args.get('groupBy')
    result = {
        'ok': True,
        'source': source_meta(path),
        'columns': columns,
        'kinds': {column: infer_kind([row.get(column) for row in rows]) for column in columns},
        'rowCount': len(rows),
        'missing': missing,
        'duplicates': duplicate_findings(rows, keys) if keys else [],
        'totals': numeric_summary(rows, amount_columns),
        'groups': group_summary(rows, group_column, amount_columns) if group_column else [],
        'anomalies': anomaly_findings(rows, amount_columns[0]) if amount_columns else [],
        'assumptions': [
            '金额按 Decimal 解析，千分位/货币符号不自动清洗。',
            '异常是统计线索，不等同于错误或舞弊。',
        ],
        'limitations': ['只处理 CSV/XLSX；公式单元格使用缓存值。'],
    }
    if args.get('outputPath') or args.get('writeOutput'):
        output = safe_output(args.get('outputPath'), 'finance-profile')
        cleaned_rows = [[column] + [row.get(column) for row in rows] for column in columns]
        summary_rows = [['metric', 'value']]
        for column, stats in result['totals'].items():
            for metric, value in stats.items():
                summary_rows.append([f'{column}.{metric}', value])
        result['outputPath'] = write_xlsx(output, {'Cleaned': [columns] + [[row.get(column) for column in columns] for row in rows], 'Summary': summary_rows})
    return result


def reconcile_tables(left_rows, right_rows, keys, amount_column):
    def index(rows):
        out = {}
        for row in rows:
            key = tuple(as_text(row.get(field)).casefold() for field in keys)
            out.setdefault(key, []).append(row)
        return out
    left_index, right_index = index(left_rows), index(right_rows)
    differences = []
    for key in sorted(set(left_index) | set(right_index)):
        left_group, right_group = left_index.get(key, []), right_index.get(key, [])
        key_object = dict(zip(keys, key))
        if not right_group:
            differences.append({'type': 'left_only', 'key': key_object, 'rows': [row.get('__row__') for row in left_group]})
        elif not left_group:
            differences.append({'type': 'right_only', 'key': key_object, 'rows': [row.get('__row__') for row in right_group]})
        else:
            for left in left_group:
                for right in right_group:
                    left_amount, right_amount = dec(left.get(amount_column)), dec(right.get(amount_column))
                    if left_amount is not None and right_amount is not None and left_amount != right_amount:
                        differences.append({'type': 'amount_diff', 'key': key_object, 'leftRow': left.get('__row__'), 'rightRow': right.get('__row__'), 'delta': str((left_amount - right_amount).quantize(Q))})
    return differences


def voucher(args):
    voucher_path = Path(str(args.get('voucherPath', ''))).resolve()
    invoice_path = Path(str(args.get('invoicePath', ''))).resolve()
    attachment_path = Path(str(args.get('attachmentPath'))).resolve() if args.get('attachmentPath') else None
    for path in [voucher_path, invoice_path] + ([attachment_path] if attachment_path else []):
        if not allowed(path) or not path.exists():
            return fail(f'file not found or outside authorized workspace: {path}')
    keys = args.get('keyColumns') or ['voucherNo']
    amount_column = args.get('amountColumn') or 'amount'
    required = args.get('requiredFields') or ['voucherNo', 'amount']
    vouchers = read_table(voucher_path, args.get('voucherSheet'))['rows']
    invoices = read_table(invoice_path, args.get('invoiceSheet'))['rows']
    attachments = read_table(attachment_path, args.get('attachmentSheet'))['rows'] if attachment_path else []
    findings = []
    for row in vouchers:
        for field in required:
            if as_text(row.get(field)) == '':
                findings.append({'classification': 'fact', 'type': 'missing_required', 'row': row.get('__row__'), 'field': field})
    findings.extend({'classification': 'calculation', 'type': difference['type'], **difference} for difference in reconcile_tables(vouchers, invoices, keys, amount_column))
    voucher_keys = {tuple(as_text(row.get(field)).casefold() for field in keys) for row in vouchers}
    invoice_keys = {tuple(as_text(row.get(field)).casefold() for field in keys) for row in invoices}
    for row in attachments:
        key = tuple(as_text(row.get(field)).casefold() for field in keys)
        confidence = dec(row.get('confidence'))
        if key not in voucher_keys and key not in invoice_keys:
            findings.append({'classification': 'fact', 'type': 'orphan_attachment', 'row': row.get('__row__'), 'key': dict(zip(keys, key))})
        if confidence is not None and confidence < Decimal('0.80'):
            findings.append({'classification': 'toVerify', 'type': 'low_scan_confidence', 'row': row.get('__row__'), 'confidence': str(confidence), 'note': '扫描件/图片识别置信度低，需人工确认票面内容。'})
    for key in sorted(voucher_keys | invoice_keys):
        if attachments and not any(tuple(as_text(row.get(field)).casefold() for field in keys) == key for row in attachments):
            findings.append({'classification': 'toVerify', 'type': 'missing_attachment_index', 'key': dict(zip(keys, key))})
    result = {
        'ok': True,
        'sources': [source_meta(path) for path in [voucher_path, invoice_path] + ([attachment_path] if attachment_path else [])],
        'parameters': {'keys': keys, 'amountColumn': amount_column, 'requiredFields': required},
        'counts': {'vouchers': len(vouchers), 'invoices': len(invoices), 'attachments': len(attachments), 'findings': len(findings)},
        'findings': findings,
        'assumptions': ['金额勾稽按指定键与金额列执行；键值大小写/空白已归一化。'],
        'limitations': ['扫描件/图片没有 OCR；置信度低的附件只列为待核实，不推断票面内容。'],
    }
    if args.get('outputPath'):
        output = safe_output(args.get('outputPath'), 'voucher-reconcile')
        rows = [['classification', 'type', 'row', 'field', 'key', 'delta', 'confidence', 'note']]
        for item in findings:
            rows.append([item.get('classification'), item.get('type'), item.get('row'), item.get('field'), json.dumps(item.get('key'), ensure_ascii=False) if item.get('key') else '', item.get('delta', ''), item.get('confidence', ''), item.get('note', '')])
        result['outputPath'] = write_xlsx(output, {'Findings': rows})
    return result


def analyze(args):
    current_path = Path(str(args.get('currentPath', ''))).resolve()
    previous_path = Path(str(args.get('previousPath', ''))).resolve() if args.get('previousPath') else None
    budget_path = Path(str(args.get('budgetPath'))).resolve() if args.get('budgetPath') else None
    for path in [current_path] + ([previous_path] if previous_path else []) + ([budget_path] if budget_path else []):
        if not allowed(path) or not path.exists():
            return fail(f'file not found or outside authorized workspace: {path}')
    category = args.get('categoryColumn') or 'category'
    amount = args.get('amountColumn') or 'amount'
    current = read_table(current_path, args.get('currentSheet'))['rows']
    previous = read_table(previous_path, args.get('previousSheet'))['rows'] if previous_path else []
    budget = read_table(budget_path, args.get('budgetSheet'))['rows'] if budget_path else []
    def total(rows, column=amount):
        values = [dec(row.get(column)) for row in rows]
        return sum((value for value in values if value is not None), Decimal('0'))
    current_total, previous_total = total(current), total(previous) if previous else Decimal('0')
    period = {
        'currentTotal': str(current_total.quantize(Q)),
        'previousTotal': str(previous_total.quantize(Q)),
        'delta': str((current_total - previous_total).quantize(Q)),
        'deltaPct': None if previous_total == 0 else str(((current_total - previous_total) / previous_total * Decimal('100')).quantize(Q)),
    }
    budget_rows = []
    if budget:
        actual_groups = {as_text(row.get(category)): total([row]) for row in current}
        for row in budget:
            group = as_text(row.get(category))
            budget_amount = dec(row.get('budgetAmount')) or dec(row.get(amount)) or Decimal('0')
            actual = actual_groups.get(group, Decimal('0'))
            budget_rows.append({'category': group, 'actual': str(actual.quantize(Q)), 'budget': str(budget_amount.quantize(Q)), 'variance': str((actual - budget_amount).quantize(Q)), 'executionPct': None if budget_amount == 0 else str((actual / budget_amount * Decimal('100')).quantize(Q))})
    structure = group_summary(current, category, [amount])
    ratios = {}
    metrics = {as_text(row.get('metric')): dec(row.get('value')) for row in current if as_text(row.get('metric'))}
    for name, numerator, denominator in [
        ('expenseRatio', 'expense', 'revenue'),
        ('currentRatio', 'currentAssets', 'currentLiabilities'),
        ('grossMargin', 'grossProfit', 'revenue'),
    ]:
        top, bottom = metrics.get(numerator), metrics.get(denominator)
        ratios[name] = None if top is None or bottom in (None, Decimal('0')) else str((top / bottom).quantize(Q))
    threshold = Decimal(str(args.get('varianceThreshold', '0.20')))
    anomalies = []
    for row in budget_rows:
        if row['executionPct'] is not None:
            execution = Decimal(row['executionPct']) / Decimal('100')
            if abs(execution - Decimal('1')) > threshold:
                anomalies.append({'category': row['category'], 'type': 'budget_variance', 'executionPct': row['executionPct']})
    result = {
        'ok': True,
        'sources': [source_meta(path) for path in [current_path] + ([previous_path] if previous_path else []) + ([budget_path] if budget_path else [])],
        'parameters': {'categoryColumn': category, 'amountColumn': amount, 'varianceThreshold': str(threshold)},
        'periodCompare': period,
        'budgetExecution': budget_rows,
        'costStructure': structure,
        'ratios': ratios,
        'anomalies': anomalies,
        'assumptions': ['比率仅在输入提供对应字段时计算。', '异常阈值是分析参数，不构成审计结论。'],
        'limitations': ['不做会计政策判断；结论需结合原始凭证和政策原文。'],
    }
    if args.get('outputPath'):
        output = safe_output(args.get('outputPath'), 'finance-analysis')
        rows = [['section', 'item', 'value']]
        rows += [['period', key, value] for key, value in period.items()]
        rows += [['budget', item['category'], json.dumps(item, ensure_ascii=False)] for item in budget_rows]
        rows += [['ratio', key, value] for key, value in ratios.items()]
        result['outputPath'] = write_xlsx(output, {'Analysis': rows, 'Structure': [['category', 'count', 'amount']] + [[item['group'], item['count'], item['amounts'].get(amount)] for item in structure]})
    return result


def workpaper(args):
    sources = [Path(str(path)).resolve() for path in (args.get('sources') or [])]
    if not sources:
        return fail('sources are required; workpapers must cite real files')
    for path in sources:
        if not allowed(path) or not path.exists():
            return fail(f'source not found or outside authorized workspace: {path}')
    findings = args.get('findings') or []
    payload = {
        'ok': True,
        'title': args.get('title', '财务与内控工作底稿'),
        'scope': args.get('scope', ''),
        'sources': [source_meta(path) for path in sources],
        'sections': {
            'riskPoints': args.get('riskPoints') or [],
            'controlObjectives': args.get('controlObjectives') or [],
            'testProcedures': args.get('testProcedures') or [],
            'anomalies': findings,
            'remediation': args.get('remediation') or [],
        },
        'classification': {
            'fact': '来自源文件的事实',
            'calculation': '可复算的确定性计算',
            'inference': '基于事实的推断，必须注明依据',
            'toVerify': '待核实事项',
            'recommendation': '整改/管理建议，不是审计结论',
        },
        'limitations': ['AI 辅助分析，不构成自动审计结论；舞弊定性需人工与充分证据。'],
    }
    if args.get('outputPath'):
        output = safe_output(args.get('outputPath'), 'audit-workpaper')
        if output.suffix.lower() == '.docx' and Document is not None:
            document = Document()
            document.add_heading(payload['title'], level=1)
            document.add_paragraph(f"范围：{payload['scope']}")
            document.add_heading('来源', level=2)
            for source in payload['sources']:
                document.add_paragraph(f"{source['name']} {source['sha256']}", style='List Bullet')
            for name, items in payload['sections'].items():
                document.add_heading(name, level=2)
                for item in items:
                    document.add_paragraph(json.dumps(item, ensure_ascii=False), style='List Bullet')
            document.add_heading('限制', level=2)
            document.add_paragraph(payload['limitations'][0])
            document.save(output)
            payload['outputPath'] = str(output)
        else:
            output = output.with_suffix('.json')
            output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
            payload['outputPath'] = str(output)
    return payload


def deliver(args):
    sources = [Path(str(path)).resolve() for path in (args.get('sources') or [])]
    if not sources:
        return fail('sources are required; refusing to fabricate a financial deliverable')
    for path in sources:
        if not allowed(path) or not path.exists():
            return fail(f'source not found or outside authorized workspace: {path}')
    fmt = str(args.get('format', 'xlsx')).lower()
    output = safe_output(args.get('outputPath'), f'finance-deliverable.{fmt}')
    title = args.get('title', '财务分析交付')
    sections = {
        '数据范围': args.get('scope', ''),
        '分析口径': args.get('methodology', ''),
        '主要结果': args.get('results') or [],
        '发现的问题': args.get('issues') or [],
        '限制': args.get('limitations') or [],
        '复核建议': args.get('review') or [],
    }
    if fmt == 'csv':
        with output.open('w', encoding='utf-8-sig', newline='') as handle:
            writer = csv.writer(handle)
            writer.writerow(['section', 'content'])
            writer.writerow(['title', title])
            for name, value in sections.items():
                writer.writerow([name, json.dumps(value, ensure_ascii=False) if isinstance(value, (list, dict)) else value])
            writer.writerow(['sources', '; '.join(str(path) for path in sources)])
    elif fmt == 'docx' and Document is not None:
        document = Document()
        document.add_heading(title, level=1)
        for name, value in sections.items():
            document.add_heading(name, level=2)
            if isinstance(value, list):
                for item in value:
                    document.add_paragraph(json.dumps(item, ensure_ascii=False), style='List Bullet')
            else:
                document.add_paragraph(str(value))
        document.save(output)
    elif fmt == 'xlsx' and Workbook is not None:
        workbook = Workbook()
        sheet = workbook.active
        sheet.title = 'Deliverable'
        sheet.append(['section', 'content'])
        sheet.append(['title', title])
        for name, value in sections.items():
            sheet.append([name, json.dumps(value, ensure_ascii=False) if isinstance(value, (list, dict)) else value])
        sheet.append(['sources', '; '.join(str(path) for path in sources)])
        workbook.save(output)
    elif fmt == 'pdf' and canvas is not None:
        pdf = canvas.Canvas(str(output), pagesize=A4)
        pdf.setFont('Helvetica', 12)
        y = 800
        pdf.drawString(72, y, title[:90])
        y -= 24
        for name, value in sections.items():
            text = json.dumps(value, ensure_ascii=False) if isinstance(value, (list, dict)) else str(value)
            pdf.drawString(72, y, f'{name}: {text[:90]}')
            y -= 18
            if y < 72:
                pdf.showPage()
                y = 800
        pdf.save()
    else:
        return fail(f'unsupported format or missing library: {fmt}')
    return {
        'ok': True,
        'format': fmt,
        'outputPath': str(output),
        'sources': [source_meta(path) for path in sources],
        'sections': list(sections),
        'limitations': ['交付物只包含提供源文件支持的内容；未提供资料不补造。'],
    }


def main():
    action = sys.argv[1] if len(sys.argv) > 1 else ''
    try:
        args = json.loads(sys.stdin.read() or '{}')
    except Exception as error:
        print(json.dumps(fail(f'invalid JSON input: {error}'), ensure_ascii=False))
        return
    try:
        if action == 'profile':
            result = profile(args)
        elif action == 'voucher':
            result = voucher(args)
        elif action == 'analyze':
            result = analyze(args)
        elif action == 'workpaper':
            result = workpaper(args)
        elif action == 'deliver':
            result = deliver(args)
        else:
            result = fail(f'unknown action: {action}')
    except Exception as error:
        result = fail(f'{type(error).__name__}: {error}')
    print(json.dumps(result, ensure_ascii=False, default=str))


if __name__ == '__main__':
    main()
