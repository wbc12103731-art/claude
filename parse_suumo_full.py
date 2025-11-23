"""
SUUMOのHTMLから全ての物件情報を抽出するスクリプト
Usage: python parse_suumo_full.py [HTMLファイルパス]
"""
from bs4 import BeautifulSoup
import pandas as pd
import sys
import os
import re
from datetime import datetime

def parse_price(price_str):
    """価格を数値に変換（万円単位）"""
    if not price_str:
        return None
    match = re.search(r'([\d,]+)', price_str.replace(',', ''))
    if match:
        return int(match.group(1))
    return None

def parse_area(area_str):
    """面積を数値に変換（m²）"""
    if not area_str:
        return None
    match = re.search(r'([\d.]+)\s*m', area_str)
    if match:
        return float(match.group(1))
    return None

def parse_station(station_str):
    """沿線・駅・徒歩分数を分離"""
    if not station_str:
        return None, None, None

    # パターン: "地下鉄中央線「堺筋本町」徒歩2分"
    match = re.match(r'(.+?)「(.+?)」徒歩(\d+)分', station_str)
    if match:
        return match.group(1), match.group(2), int(match.group(3))

    # パターン: "地下鉄中央線「堺筋本町」徒歩2分" (全角数字対応)
    match = re.match(r'(.+?)「(.+?)」徒歩([\d０-９]+)分', station_str)
    if match:
        minutes = match.group(3)
        # 全角数字を半角に変換
        minutes = minutes.translate(str.maketrans('０１２３４５６７８９', '0123456789'))
        return match.group(1), match.group(2), int(minutes)

    return station_str, None, None

def parse_date(date_str):
    """築年月を日付に変換"""
    if not date_str:
        return None
    match = re.search(r'(\d{4})年(\d{1,2})月', date_str)
    if match:
        year = int(match.group(1))
        month = int(match.group(2))
        return datetime(year, month, 1)
    return None

def extract_properties(html_file):
    with open(html_file, 'r', encoding='utf-8') as f:
        html = f.read()

    soup = BeautifulSoup(html, 'html.parser')
    properties = []

    for unit in soup.select('.property_unit'):
        prop = {}
        raw = {}  # 元データを一時保存

        # 物件名とリンク
        title_elem = unit.select_one('.property_unit-title a, .property_unit-title_wide a')
        prop['物件名'] = title_elem.get_text(strip=True) if title_elem else ''
        prop['リンク'] = 'https://suumo.jp' + title_elem['href'] if title_elem and title_elem.get('href') else ''

        # タグ（新着、即引渡可、売主コメント等）
        tags = [t.get_text(strip=True) for t in unit.select('.property_unit-pcts li') if t.get_text(strip=True)]
        prop['タグ'] = '、'.join(tags) if tags else ''

        # PRコメント（物件説明文）
        lead = unit.select_one('.dottable-lead td')
        prop['PRコメント'] = lead.get_text(strip=True) if lead else ''

        # 基本情報（dottable-line内のデータ）
        for dl in unit.select('.dottable-line dl'):
            dt = dl.select_one('dt')
            dd = dl.select_one('dd')
            if dt and dd:
                key = dt.get_text(strip=True)
                val = dd.get_text(strip=True)
                if key:
                    raw[key] = val

        # データ変換
        # 販売価格 → 数値（万円）
        prop['販売価格（万円）'] = parse_price(raw.get('販売価格', ''))

        # 沿線・駅・徒歩分数を分離
        line, station, walk_min = parse_station(raw.get('沿線・駅', ''))
        prop['沿線'] = line
        prop['駅'] = station
        prop['徒歩（分）'] = walk_min

        # 間取り
        prop['間取り'] = raw.get('間取り', '')

        # 専有面積 → 数値（m²）
        prop['専有面積（m²）'] = parse_area(raw.get('専有面積', ''))

        # バルコニー → 数値（m²）
        prop['バルコニー（m²）'] = parse_area(raw.get('バルコニー', ''))

        # 所在地
        prop['所在地'] = raw.get('所在地', '')

        # 築年月 → 日付
        prop['築年月'] = parse_date(raw.get('築年月', ''))

        if prop.get('物件名'):
            properties.append(prop)

    return properties

def format_excel(df, output_file):
    """Excelファイルを整形して保存"""
    # 列の順序を指定
    desired_columns = [
        '物件名', '販売価格（万円）', '所在地', '沿線', '駅', '徒歩（分）',
        '間取り', '専有面積（m²）', 'バルコニー（m²）', '築年月',
        'タグ', 'PRコメント', 'リンク'
    ]

    # 存在する列のみを使用
    columns = [col for col in desired_columns if col in df.columns]
    df = df[columns]

    # Excelに保存
    with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='物件一覧')

        ws = writer.sheets['物件一覧']

        # 列幅を調整
        column_widths = {
            '物件名': 35, '販売価格（万円）': 15, '所在地': 25,
            '沿線': 18, '駅': 12, '徒歩（分）': 10,
            '間取り': 15, '専有面積（m²）': 15, 'バルコニー（m²）': 15,
            '築年月': 12, 'タグ': 20, 'PRコメント': 50, 'リンク': 60
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
    print(f'\n【列一覧】')
    for col in df.columns:
        dtype = df[col].dtype
        print(f'  {col}: {dtype}')
