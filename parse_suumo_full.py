"""
SUUMOのHTMLから全ての物件情報を抽出するスクリプト
Usage: python parse_suumo_full.py [HTMLファイルパス]
"""
from bs4 import BeautifulSoup
import pandas as pd
import sys
import os
import re

def extract_properties(html_file):
    with open(html_file, 'r', encoding='utf-8') as f:
        html = f.read()

    soup = BeautifulSoup(html, 'html.parser')
    properties = []

    for unit in soup.select('.property_unit'):
        prop = {}

        # 物件名とリンク
        title_elem = unit.select_one('.property_unit-title a, .property_unit-title_wide a')
        prop['物件名'] = title_elem.get_text(strip=True) if title_elem else ''
        prop['リンク'] = 'https://suumo.jp' + title_elem['href'] if title_elem and title_elem.get('href') else ''

        # タグ（新着、即引渡可、売主コメント等）
        tags = []
        for tag in unit.select('.property_unit-pcts li'):
            tag_text = tag.get_text(strip=True)
            if tag_text:
                tags.append(tag_text)
        prop['タグ'] = '、'.join(tags) if tags else ''

        # PRコメント（物件説明文）
        lead = unit.select_one('.dottable-lead td')
        prop['PRコメント'] = lead.get_text(strip=True) if lead else ''

        # 基本情報（dottable-line内のデータ）
        for row in unit.select('.dottable-line table tr'):
            for dl in row.select('dl'):
                dt = dl.select_one('dt')
                dd = dl.select_one('dd')
                if dt and dd:
                    key = dt.get_text(strip=True)
                    val = dd.get_text(strip=True)
                    if key:  # 空のキーは無視
                        prop[key] = val

        if prop.get('物件名'):
            properties.append(prop)

    return properties

def format_excel(df, output_file):
    """Excelファイルを整形して保存"""
    # 列の順序を指定
    desired_columns = [
        '物件名', '販売価格', '所在地', '沿線・駅', '間取り',
        '専有面積', 'バルコニー', '築年月', 'タグ', 'PRコメント', 'リンク'
    ]

    # 存在する列のみを使用
    columns = [col for col in desired_columns if col in df.columns]
    # 残りの列を追加
    for col in df.columns:
        if col not in columns:
            columns.append(col)

    df = df[columns]

    # Excelに保存
    with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='物件一覧')

        # シートを取得
        ws = writer.sheets['物件一覧']

        # 列幅を調整
        column_widths = {
            '物件名': 35, '販売価格': 12, '所在地': 25, '沿線・駅': 25,
            '間取り': 15, '専有面積': 18, 'バルコニー': 12, '築年月': 12,
            'タグ': 20, 'PRコメント': 50, 'リンク': 60
        }

        from openpyxl.utils import get_column_letter
        for idx, col in enumerate(df.columns, 1):
            width = column_widths.get(col, 15)
            ws.column_dimensions[get_column_letter(idx)].width = width

        # ヘッダー行を固定
        ws.freeze_panes = 'A2'

        # フィルターを追加
        ws.auto_filter.ref = ws.dimensions

if __name__ == '__main__':
    html_file = sys.argv[1] if len(sys.argv) > 1 else 'suumo.html'

    if not os.path.exists(html_file):
        print(f'エラー: ファイルが見つかりません: {html_file}')
        sys.exit(1)

    props = extract_properties(html_file)

    if not props:
        print('物件が見つかりませんでした')
        sys.exit(1)

    df = pd.DataFrame(props)
    output = os.path.splitext(html_file)[0] + '_full.xlsx'
    format_excel(df, output)

    print(f'完了: {len(props)}件 -> {output}')
    print(f'\n取得した列: {", ".join(df.columns.tolist())}')
