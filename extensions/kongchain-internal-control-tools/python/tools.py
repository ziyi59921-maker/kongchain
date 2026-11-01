#!/usr/bin/env python3
"""KongChain internal-control tool helper.

One deterministic Python process per call. Actions:
  extract, compare, rules, evidence, report

Input: JSON on stdin. Output: one JSON document on stdout. The Node plugin
validates paths before spawning this helper; this module repeats the check.
"""
from __future__ import annotations

import csv
import hashlib
import json
import os
import re
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path

try:
    from docx import Document
except Exception:  # pragma: no cover - reported as a limitation
    Document = None
try:
    import pdfplumber
except Exception:  # pragma: no cover
    pdfplumber = None
try:
    import openpyxl
except Exception:  # pragma: no cover
    openpyxl = None
try:
    from openpyxl import Workbook
except Exception:  # pragma: no cover
    Workbook = None
try:
    from docx.shared import Pt
except Exception:  # pragma: no cover
    Pt = None

ALLOWED_ROOTS = [Path('F:/KongChain').resolve(), Path('F:/KongChain-logs/samples').resolve()]
OUTPUT_ROOT = Path('F:/KongChain-logs/samples').resolve()
TEXT_LIMIT = 20000


def fail(message: str) -> dict:
    return {'ok': False, 'error': message}


def inside(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
        return True
    except Exception:
        return False


def allowed(path: Path) -> bool:
    return any(inside(path, root) for root in ALLOWED_ROOTS)


def source_meta(path: Path) -> dict:
    stat = path.stat()
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    return {
        'path': str(path),
        'name': path.name,
        'suffix': path.suffix.lower(),
        'size': stat.st_size,
        'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
        'sha256': digest,
    }


def normalize_amount(value):
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)):
        text = str(value)
    else:
        text = str(value).strip().replace(',', '').replace('，', '')
    if text == '':
        return None
    try:
        return Decimal(text)
    except (InvalidOperation, ValueError):
        return None


def cell(value):
    if value is None:
        return None
    if isinstance(value, (datetime,)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    return value


def read_table(path: Path, sheet: str | None = None) -> dict:
    suffix = path.suffix.lower()
    if suffix in ('.xlsx', '.xlsm'):
        if openpyxl is None:
            raise RuntimeError('openpyxl is not installed')
        workbook = openpyxl.load_workbook(path, data_only=True)
        ws = workbook[sheet] if sheet else workbook.worksheets[0]
        rows = []
        for row in ws.iter_rows(values_only=True):
            rows.append([cell(value) for value in row])
        header = [str(value).strip() if value is not None else f'column_{index + 1}' for index, value in enumerate(rows[0] if rows else [])]
        records = []
        for index, row in enumerate(rows[1:], start=2):
            record = {header[column] if column < len(header) else f'column_{column + 1}': cell(value) for column, value in enumerate(row)}
            record['__row__'] = index
            records.append(record)
        return {'kind': 'xlsx', 'sheet': ws.title, 'sheets': workbook.sheetnames, 'columns': header, 'rows': records}
    if suffix == '.csv':
        with path.open('r', encoding='utf-8-sig', newline='') as handle:
            reader = list(csv.reader(handle))
        header = [str(value).strip() for value in reader[0]] if reader else []
        records = []
        for index, row in enumerate(reader[1:], start=2):
            record = {header[column] if column < len(header) else f'column_{column + 1}': value for column, value in enumerate(row)}
            record['__row__'] = index
            records.append(record)
        return {'kind': 'csv', 'sheet': None, 'sheets': [], 'columns': header, 'rows': records}
    raise RuntimeError(f'unsupported table format: {suffix}')


def extract_docx(path: Path, include_tables: bool) -> dict:
    if Document is None:
        raise RuntimeError('python-docx is not installed')
    document = Document(path)
    paragraphs = [{'index': index + 1, 'text': paragraph.text} for index, paragraph in enumerate(document.paragraphs) if paragraph.text.strip()]
    tables = []
    if include_tables:
        for table_index, table in enumerate(document.tables, start=1):
            rows = []
            for row_index, row in enumerate(table.rows, start=1):
                rows.append({'row': row_index, 'cells': [cell.text for cell in row.cells]})
            tables.append({'table': table_index, 'rows': rows})
    text = '\n'.join(item['text'] for item in paragraphs)
    return {
        'kind': 'docx',
        'paragraphs': paragraphs,
        'tables': tables,
        'text': text,
        'locators': {'paragraphs': len(paragraphs), 'tables': len(tables)},
        'limitations': ['DOCX 不保留稳定页码；证据定位使用段落/表格序号。', '仅提取文本层；图片中的文字没有 OCR。'] if include_tables else ['DOCX 不保留稳定页码；仅提取文本层。'],
    }


def extract_pdf(path: Path, include_tables: bool) -> dict:
    if pdfplumber is None:
        raise RuntimeError('pdfplumber is not installed')
    pages = []
    empty_pages = []
    with pdfplumber.open(path) as pdf:
        for index, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ''
            tables = page.extract_tables() if include_tables else []
            pages.append({'page': index, 'text': text, 'tables': tables})
            if not text.strip():
                empty_pages.append(index)
    limitations = ['PDF 仅提取文本层；扫描页需要 OCR 才能识别。']
    if empty_pages:
        limitations.append(f'{len(empty_pages)} 页没有文本层：{empty_pages[:10]}')
    return {'kind': 'pdf', 'pages': pages, 'text': '\n\n'.join(page['text'] for page in pages), 'locators': {'pages': len(pages)}, 'limitations': limitations}


def extract_xlsx(path: Path, include_tables: bool) -> dict:
    if openpyxl is None:
        raise RuntimeError('openpyxl is not installed')
    workbook = openpyxl.load_workbook(path, data_only=True)
    sheets = []
    for ws in workbook.worksheets:
        rows = []
        for row in ws.iter_rows(values_only=True):
            rows.append([cell(value) for value in row])
        sheets.append({'sheet': ws.title, 'rows': rows, 'max_row': ws.max_row, 'max_column': ws.max_column})
    text = '\n'.join(f'{sheet["sheet"]}: ' + ' | '.join(' '.join(str(value) for value in row if value is not None) for row in sheet['rows'][:50]) for sheet in sheets)
    return {'kind': 'xlsx', 'sheets': sheets, 'text': text, 'locators': {'sheets': [sheet['sheet'] for sheet in sheets]}, 'limitations': ['公式单元格使用缓存值；若缓存缺失会显示为空。', '不计算公式依赖链；需要重算时用专门工具。']}


def extract(args: dict) -> dict:
    raw = str(args.get('path', '')).strip()
    if raw == '':
        return fail('path is required')
    path = Path(raw).resolve()
    if not allowed(path):
        return fail(f'path outside authorized workspace: {path}')
    if not path.exists() or not path.is_file():
        return fail(f'file not found: {path}')
    include_tables = bool(args.get('includeTables', True))
    max_chars = int(args.get('maxChars', TEXT_LIMIT))
    suffix = path.suffix.lower()
    if suffix == '.pdf':
        result = extract_pdf(path, include_tables)
    elif suffix == '.docx':
        result = extract_docx(path, include_tables)
    elif suffix in ('.xlsx', '.xlsm'):
        result = extract_xlsx(path, include_tables)
    elif suffix == '.csv':
        table = read_table(path)
        result = {'kind': 'csv', 'sheets': [table], 'text': '\n'.join(' | '.join(str(row.get(column, '')) for column in table['columns']) for row in table['rows'][:200]), 'locators': {'columns': table['columns'], 'rows': len(table['rows'])}, 'limitations': ['CSV 按 UTF-8-SIG/逗号解析；其他分隔符未自动识别。']}
    else:
        text = path.read_text(encoding='utf-8', errors='replace')
        result = {'kind': 'text', 'text': text, 'locators': {'lines': len(text.splitlines())}, 'limitations': ['按 UTF-8 读取；其他编码可能替换字符。']}
    if len(result.get('text', '')) > max_chars:
        result['text'] = result['text'][:max_chars]
        result['textTruncated'] = True
    result.update({'ok': True, 'source': source_meta(path)})
    return result


def compare(args: dict) -> dict:
    left_path = Path(str(args.get('left', ''))).resolve()
    right_path = Path(str(args.get('right', ''))).resolve()
    for path in (left_path, right_path):
        if not allowed(path) or not path.exists():
            return fail(f'file not found or outside authorized workspace: {path}')
    key_columns = args.get('keyColumns') or ['supplier', 'invoiceNo']
    amount_columns = args.get('amountColumns') or ['amount']
    tolerance = Decimal(str(args.get('tolerance', '0.01')))
    left = read_table(left_path, args.get('leftSheet'))
    right = read_table(right_path, args.get('rightSheet'))

    def normalized(record):
        keys = []
        for column in key_columns:
            value = record.get(column)
            keys.append('' if value is None else str(value).strip().casefold())
        amounts = []
        for column in amount_columns:
            value = normalize_amount(record.get(column))
            amounts.append(None if value is None else value.quantize(Decimal('0.01')))
        return tuple(keys), amounts

    def index_table(table):
        groups = {}
        quality = []
        for record in table['rows']:
            keys, amounts = normalized(record)
            if any(key == '' for key in keys):
                quality.append({'row': record.get('__row__'), 'issue': 'missing_key', 'record': record})
                continue
            if any(amount is None for amount in amounts):
                quality.append({'row': record.get('__row__'), 'issue': 'invalid_amount', 'record': record})
                continue
            group = groups.setdefault(keys, [])
            group.append({'row': record.get('__row__'), 'amounts': amounts, 'record': record})
        duplicates = [{'key': dict(zip(key_columns, key)), 'count': len(entries), 'rows': [entry['row'] for entry in entries]} for key, entries in groups.items() if len(entries) > 1]
        return groups, duplicates, quality

    left_groups, left_duplicates, left_quality = index_table(left)
    right_groups, right_duplicates, right_quality = index_table(right)
    differences = []
    for key in sorted(set(left_groups) | set(right_groups)):
        left_entries = left_groups.get(key, [])
        right_entries = right_groups.get(key, [])
        key_object = dict(zip(key_columns, key))
        if not right_entries:
            differences.append({'type': 'left_only', 'key': key_object, 'leftRows': [entry['row'] for entry in left_entries]})
            continue
        if not left_entries:
            differences.append({'type': 'right_only', 'key': key_object, 'leftRows': [], 'rightRows': [entry['row'] for entry in right_entries]})
            continue
        for left_entry in left_entries:
            for right_entry in right_entries:
                deltas = []
                for index, column in enumerate(amount_columns):
                    delta = left_entry['amounts'][index] - right_entry['amounts'][index]
                    deltas.append({'column': column, 'left': str(left_entry['amounts'][index]), 'right': str(right_entry['amounts'][index]), 'delta': str(delta)})
                if any(abs(Decimal(item['delta'])) > tolerance for item in deltas):
                    differences.append({'type': 'amount_diff', 'key': key_object, 'leftRows': [left_entry['row']], 'rightRows': [right_entry['row']], 'deltas': deltas})
    sums = {}
    for table_name, table, groups in (('left', left, left_groups), ('right', right, right_groups)):
        totals = {column: Decimal('0') for column in amount_columns}
        for entries in groups.values():
            for entry in entries:
                for index, column in enumerate(amount_columns):
                    totals[column] += entry['amounts'][index]
        sums[table_name] = {column: str(total.quantize(Decimal('0.01'))) for column, total in totals.items()}
    return {
        'ok': True,
        'sources': [source_meta(left_path), source_meta(right_path)],
        'parameters': {'keyColumns': key_columns, 'amountColumns': amount_columns, 'tolerance': str(tolerance)},
        'counts': {'leftRows': len(left['rows']), 'rightRows': len(right['rows']), 'differences': len(differences)},
        'totals': sums,
        'differences': differences,
        'duplicates': {'left': left_duplicates, 'right': right_duplicates},
        'quality': {'left': left_quality, 'right': right_quality},
        'recomputation': {'leftFile': str(left_path), 'rightFile': str(right_path), 'keyColumns': key_columns, 'amountColumns': amount_columns, 'tolerance': str(tolerance)},
        'limitations': ['比对基于指定键和金额列；键/列名不同会得到大量独有项。', '金额使用 Decimal 计算，不修正源数据口径。'],
    }


def load_rules(path: Path) -> dict:
    if not path.exists():
        return {'version': '0.1.0', 'rules': []}
    return json.loads(path.read_text(encoding='utf-8'))


def save_rules(path: Path, document: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(document, ensure_ascii=False, indent=2), encoding='utf-8')


def apply_rule(rule: dict, table: dict) -> dict:
    rule_type = rule.get('type')
    params = rule.get('params') or {}
    rows = table['rows']
    violations = []
    if rule_type == 'unique':
        fields = params.get('fields') or []
        groups = {}
        for record in rows:
            key = tuple(str(record.get(field, '')).strip().casefold() for field in fields)
            groups.setdefault(key, []).append(record.get('__row__'))
        for key, row_numbers in groups.items():
            if len(row_numbers) > 1:
                violations.append({'key': dict(zip(fields, key)), 'rows': row_numbers, 'count': len(row_numbers)})
    elif rule_type in ('min_amount', 'max_amount'):
        field = params.get('field', 'amount')
        boundary = Decimal(str(params.get('min' if rule_type == 'min_amount' else 'max')))
        for record in rows:
            amount = normalize_amount(record.get(field))
            if amount is None:
                violations.append({'row': record.get('__row__'), 'field': field, 'value': record.get(field), 'reason': 'invalid_amount'})
            elif (rule_type == 'min_amount' and amount < boundary) or (rule_type == 'max_amount' and amount > boundary):
                violations.append({'row': record.get('__row__'), 'field': field, 'value': str(amount), 'reason': rule_type})
    elif rule_type == 'required':
        for field in params.get('fields') or []:
            for record in rows:
                value = record.get(field)
                if value is None or str(value).strip() == '':
                    violations.append({'row': record.get('__row__'), 'field': field, 'reason': 'required'})
    elif rule_type == 'equals':
        field = params.get('field')
        expected = params.get('value')
        for record in rows:
            if str(record.get(field)) != str(expected):
                violations.append({'row': record.get('__row__'), 'field': field, 'value': record.get(field), 'expected': expected})
    else:
        return {'ruleId': rule.get('id'), 'ruleVersion': rule.get('version'), 'status': 'unsupported', 'violations': [], 'checked': len(rows)}
    return {'ruleId': rule.get('id'), 'name': rule.get('name'), 'ruleVersion': rule.get('version'), 'type': rule_type, 'params': params, 'status': 'violations' if violations else 'pass', 'checked': len(rows), 'violations': violations}


def rules(args: dict) -> dict:
    action = args.get('action', 'list')
    rules_path = Path(str(args.get('rulesPath', 'F:/KongChain-logs/samples/rules.json'))).resolve()
    if not allowed(rules_path):
        return fail(f'rules path outside authorized workspace: {rules_path}')
    if action == 'list':
        document = load_rules(rules_path)
        return {'ok': True, 'rulesPath': str(rules_path), 'version': document.get('version'), 'rules': document.get('rules', [])}
    if action == 'save':
        rule = args.get('rule') or {}
        if not rule.get('id') or not rule.get('type'):
            return fail('rule.id and rule.type are required')
        document = load_rules(rules_path)
        existing = next((item for item in document.get('rules', []) if item.get('id') == rule['id']), None)
        if existing:
            existing.update(rule)
        else:
            document.setdefault('rules', []).append(rule)
        save_rules(rules_path, document)
        return {'ok': True, 'action': 'saved', 'rule': rule, 'rulesPath': str(rules_path)}
    if action == 'disable':
        rule_id = args.get('ruleId')
        document = load_rules(rules_path)
        found = False
        for rule in document.get('rules', []):
            if rule.get('id') == rule_id:
                rule['enabled'] = False
                found = True
        if not found:
            return fail(f'rule not found: {rule_id}')
        save_rules(rules_path, document)
        return {'ok': True, 'action': 'disabled', 'ruleId': rule_id, 'rulesPath': str(rules_path)}
    if action == 'check':
        data_path = Path(str(args.get('dataPath', ''))).resolve()
        if not allowed(data_path) or not data_path.exists():
            return fail(f'data file not found or outside authorized workspace: {data_path}')
        document = load_rules(rules_path)
        table = read_table(data_path, args.get('sheet'))
        results = [apply_rule(rule, table) for rule in document.get('rules', []) if rule.get('enabled', True)]
        return {
            'ok': True,
            'rulesPath': str(rules_path),
            'rulesVersion': document.get('version'),
            'dataSource': source_meta(data_path),
            'results': results,
            'limitations': ['规则只对实际读取的字段和行执行；缺失字段会按规则报错。', '规则结果需要结合原始单据进一步核实。'],
        }
    return fail(f'unknown rules action: {action}')


def evidence(args: dict) -> dict:
    sources = [Path(str(path)).resolve() for path in (args.get('sources') or [])]
    if not sources:
        return fail('at least one source is required; do not fabricate evidence')
    for path in sources:
        if not allowed(path) or not path.exists():
            return fail(f'source not found or outside authorized workspace: {path}')
    output = Path(str(args.get('outputPath', ''))).resolve()
    if not inside(output, OUTPUT_ROOT):
        return fail(f'output must be under {OUTPUT_ROOT}')
    findings = args.get('findings') or []
    payload = {
        'title': args.get('title', '证据整理'),
        'createdAt': datetime.now().isoformat(),
        'sources': [source_meta(path) for path in sources],
        'findings': findings,
        'classification': {
            'fact': '直接来自证据的可验证陈述',
            'calculation': '基于事实的确定性计算',
            'inference': '基于事实的推断，必须注明依据与限制',
            'toVerify': '尚未核实、需要补充证据的事项',
        },
        'limitations': ['证据包只记录输入中实际存在的字段；未提供的文件不会被补造。'],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
    return {'ok': True, 'outputPath': str(output), 'sources': payload['sources'], 'findings': findings, 'limitations': payload['limitations']}


def report(args: dict) -> dict:
    sources = [Path(str(path)).resolve() for path in (args.get('sources') or [])]
    if not sources:
        return fail('sources are required; refusing to generate a report without source data')
    for path in sources:
        if not allowed(path) or not path.exists():
            return fail(f'source not found or outside authorized workspace: {path}')
    output = Path(str(args.get('outputPath', ''))).resolve()
    if not inside(output, OUTPUT_ROOT):
        return fail(f'output must be under {OUTPUT_ROOT}')
    fmt = str(args.get('format', 'docx')).lower()
    title = str(args.get('title', '控链工作底稿'))
    sections = args.get('sections') or []
    findings = args.get('findings') or []
    source_rows = [source_meta(path) for path in sources]
    output.parent.mkdir(parents=True, exist_ok=True)
    if fmt == 'docx':
        if Document is None:
            return fail('python-docx is not installed')
        document = Document()
        document.add_heading(title, level=1)
        document.add_paragraph('本底稿由控链根据实际提供的源文件生成；未提供的证据不会补造。')
        document.add_heading('一、源文件', level=2)
        table = document.add_table(rows=1, cols=4)
        for index, header in enumerate(['文件名', '路径', 'SHA-256', '修改时间']):
            table.rows[0].cells[index].text = header
        for row in source_rows:
            cells = table.add_row().cells
            cells[0].text = row['name']
            cells[1].text = row['path']
            cells[2].text = row['sha256']
            cells[3].text = row['modified']
        for section in sections:
            document.add_heading(str(section.get('heading', '')), level=2)
            for paragraph in section.get('paragraphs') or []:
                document.add_paragraph(str(paragraph))
            for table_data in section.get('tables') or []:
                rows = [list(row) for row in table_data if row]
                if not rows:
                    continue
                width = max(len(row) for row in rows)
                table = document.add_table(rows=1, cols=max(width, 1))
                for index in range(width):
                    table.rows[0].cells[index].text = str(rows[0][index]) if index < len(rows[0]) else ''
                for row in rows[1:]:
                    cells = table.add_row().cells
                    for index in range(width):
                        cells[index].text = str(row[index]) if index < len(row) else ''
        if findings:
            document.add_heading('二、发现', level=2)
            table = document.add_table(rows=1, cols=5)
            for index, header in enumerate(['编号', '事实', '依据', '性质', '限制']):
                table.rows[0].cells[index].text = header
            for finding in findings:
                cells = table.add_row().cells
                cells[0].text = str(finding.get('id', ''))
                cells[1].text = str(finding.get('fact', ''))
                cells[2].text = str(finding.get('basis', ''))
                cells[3].text = str(finding.get('classification', 'toVerify'))
                cells[4].text = str(finding.get('limitation', ''))
        document.add_heading('三、限制', level=2)
        for limitation in ['结论仅基于上述源文件与实际执行的程序。', '缺失文件、无法验真的签章、外部证据不在本底稿范围内。']:
            document.add_paragraph(limitation)
        document.save(output)
    elif fmt == 'xlsx':
        if Workbook is None:
            return fail('openpyxl is not installed')
        workbook = Workbook()
        summary = workbook.active
        summary.title = 'Summary'
        summary.append(['标题', title])
        summary.append(['生成时间', datetime.now().isoformat()])
        summary.append(['源文件数', len(source_rows)])
        sources_sheet = workbook.create_sheet('Sources')
        sources_sheet.append(['文件名', '路径', 'SHA-256', '修改时间'])
        for row in source_rows:
            sources_sheet.append([row['name'], row['path'], row['sha256'], row['modified']])
        findings_sheet = workbook.create_sheet('Findings')
        findings_sheet.append(['编号', '事实', '依据', '性质', '限制'])
        for finding in findings:
            findings_sheet.append([finding.get('id'), finding.get('fact'), finding.get('basis'), finding.get('classification'), finding.get('limitation')])
        data_sheet = workbook.create_sheet('Sections')
        data_sheet.append(['章节', '内容'])
        for section in sections:
            data_sheet.append([section.get('heading', ''), ' '.join(str(value) for value in section.get('paragraphs') or [])])
        workbook.save(output)
    else:
        return fail(f'unsupported report format: {fmt}')
    return {'ok': True, 'format': fmt, 'outputPath': str(output), 'sources': source_rows, 'sections': len(sections), 'findings': len(findings)}


def main() -> None:
    action = os.sys.argv[1] if len(os.sys.argv) > 1 else ''
    try:
        args = json.loads(os.sys.stdin.read() or '{}')
    except Exception as error:
        print(json.dumps(fail(f'invalid JSON input: {error}'), ensure_ascii=False))
        return
    try:
        if action == 'extract':
            result = extract(args)
        elif action == 'compare':
            result = compare(args)
        elif action == 'rules':
            result = rules(args)
        elif action == 'evidence':
            result = evidence(args)
        elif action == 'report':
            result = report(args)
        else:
            result = fail(f'unknown action: {action}')
    except Exception as error:
        result = fail(f'{type(error).__name__}: {error}')
    print(json.dumps(result, ensure_ascii=False, default=str))


if __name__ == '__main__':
    main()
