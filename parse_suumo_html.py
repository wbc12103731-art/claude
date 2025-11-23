#!/usr/bin/env python3
"""
SUUMOの保存済みHTMLファイルを解析してExcelに出力するスクリプト

使用方法:
1. ブラウザでSUUMOの物件一覧ページを開く
2. Ctrl+S でHTMLを保存（またはCtrl+Uでソース表示してコピー）
3. このスクリプトを実行: python parse_suumo_html.py <htmlファイルパス>
"""

from bs4 import BeautifulSoup
import pandas as pd
import re
import sys

def parse_suumo_html(html_file):
    """SUUMOのHTMLファイルを解析"""

    print(f"HTMLファイルを読み込み中: {html_file}")

    with open(html_file, 'r', encoding='utf-8') as f:
        html = f.read()

    soup = BeautifulSoup(html, 'html.parser')

    print(f"ページタイトル: {soup.title.string if soup.title else 'なし'}")

    properties = []

    # SUUMOの中古マンション一覧ページの構造を解析
    # 複数のパターンを試行

    # パターン1: cassetteitem（賃貸一覧など）
    items = soup.select('.cassetteitem')

    # パターン2: property_unit（売買物件一覧）
    if not items:
        items = soup.select('.property_unit')

    # パターン3: searchresultitem（検索結果）
    if not items:
        items = soup.select('.searchresultitem')

    # パターン4: dottable形式
    if not items:
        items = soup.select('.dottable')

    print(f"物件ブロック数: {len(items)}")

    # SUUMOの中古マンション一覧の具体的な構造
    # 通常は各物件が div.property_unit 内にある
    if items:
        for item in items:
            prop = extract_property_from_item(item)
            if prop and any(prop.values()):
                properties.append(prop)
    else:
        # 別のアプローチ: テーブル行から抽出
        properties = extract_from_table_rows(soup)

    # さらに別のアプローチ: リンクベースで抽出
    if not properties:
        properties = extract_from_links(soup)

    return properties

def extract_property_from_item(item):
    """物件アイテムから情報を抽出"""
    prop = {}

    # 物件名（複数のセレクタを試行）
    name_selectors = [
        '.property_unit-title a',
        '.cassetteitem_content-title',
        '.ui-section--h2',
        'h2 a',
        '.searchresultitem_name a',
        'dt a'
    ]
    for sel in name_selectors:
        elem = item.select_one(sel)
        if elem:
            prop['物件名'] = clean_text(elem.get_text())
            break

    # 価格
    price_selectors = [
        '.dottable-value',
        '.property_unit-price',
        '.cassetteitem_price--accent',
        '.detailvalue',
        '[class*="price"]'
    ]
    for sel in price_selectors:
        elem = item.select_one(sel)
        if elem:
            text = clean_text(elem.get_text())
            if '万円' in text or '億' in text:
                prop['価格'] = text
                break

    # 所在地
    addr_selectors = [
        '.dottable-line:contains("所在地")',
        '.cassetteitem_detail-col1',
        '[class*="address"]',
        '[class*="location"]'
    ]
    for sel in addr_selectors:
        try:
            elem = item.select_one(sel)
            if elem:
                prop['所在地'] = clean_text(elem.get_text())
                break
        except:
            continue

    # dottable形式のデータを抽出
    dottable_lines = item.select('.dottable-line')
    for line in dottable_lines:
        label_elem = line.select_one('.dottable-vm')
        value_elem = line.select_one('.dottable-value')
        if label_elem and value_elem:
            label = clean_text(label_elem.get_text())
            value = clean_text(value_elem.get_text())
            if label and value:
                prop[label] = value

    # テキスト全体からも情報を抽出
    full_text = clean_text(item.get_text())
    extract_from_text(prop, full_text)

    return prop

def extract_from_table_rows(soup):
    """テーブル行から物件情報を抽出"""
    properties = []

    # テーブルを探す
    tables = soup.select('table')

    for table in tables:
        rows = table.select('tr')
        headers = []

        for row in rows:
            cells = row.select('th, td')

            # ヘッダー行を検出
            if row.select('th'):
                headers = [clean_text(th.get_text()) for th in row.select('th')]
                continue

            # データ行
            if len(cells) >= 3:
                prop = {}
                for i, cell in enumerate(cells):
                    text = clean_text(cell.get_text())
                    if headers and i < len(headers):
                        prop[headers[i]] = text
                    else:
                        # 価格や面積を含む場合、適切なキーを推測
                        if '万円' in text:
                            prop['価格'] = text
                        elif 'm' in text or '㎡' in text:
                            prop['専有面積'] = text
                        elif 'LDK' in text or 'DK' in text or 'K' in text:
                            prop['間取り'] = text
                        else:
                            prop[f'列{i+1}'] = text

                if any(prop.values()):
                    properties.append(prop)

    return properties

def extract_from_links(soup):
    """物件リンクから情報を抽出"""
    properties = []
    seen = set()

    # 物件詳細リンクを探す
    link_patterns = [
        r'/jj/bukken/shosai',
        r'/ms/chuko/',
        r'/chukoikkodate/',
        r'/tochi/'
    ]

    pattern = '|'.join(link_patterns)
    links = soup.find_all('a', href=re.compile(pattern))

    print(f"物件リンク数: {len(links)}")

    for link in links:
        href = link.get('href', '')
        if href in seen:
            continue
        seen.add(href)

        # 親要素を遡って物件情報を取得
        parent = find_property_container(link)
        if parent:
            text = clean_text(parent.get_text())
            if len(text) > 30:
                prop = {}
                prop['リンク'] = 'https://suumo.jp' + href if href.startswith('/') else href
                extract_from_text(prop, text)

                # 物件名がない場合はリンクテキストを使用
                if not prop.get('物件名'):
                    link_text = clean_text(link.get_text())
                    if link_text:
                        prop['物件名'] = link_text[:100]

                if prop.get('物件名') or prop.get('価格'):
                    properties.append(prop)

    return properties

def find_property_container(elem):
    """物件情報を含む親要素を探す"""
    # 親要素を遡る
    for _ in range(10):
        parent = elem.parent
        if not parent:
            break

        # 物件コンテナらしいクラスを持つか確認
        classes = parent.get('class', [])
        class_str = ' '.join(classes) if classes else ''

        if any(keyword in class_str.lower() for keyword in ['property', 'cassette', 'item', 'unit']):
            return parent

        # テキスト長が適切な範囲の親を返す
        text_len = len(parent.get_text())
        if 100 < text_len < 3000:
            return parent

        elem = parent

    return elem.parent

def extract_from_text(prop, text):
    """テキストから物件情報を抽出"""

    # 価格を抽出
    if not prop.get('価格'):
        price_match = re.search(r'([\d,]+億)?[\s]*([\d,]+)万円', text)
        if price_match:
            prop['価格'] = price_match.group(0)

    # 専有面積を抽出
    if not prop.get('専有面積'):
        area_match = re.search(r'([\d.]+)\s*[m㎡²]', text)
        if area_match:
            prop['専有面積'] = area_match.group(0)

    # 間取りを抽出
    if not prop.get('間取り'):
        layout_match = re.search(r'\d[SLDK]+', text)
        if layout_match:
            prop['間取り'] = layout_match.group(0)

    # 築年数を抽出
    if not prop.get('築年数'):
        age_match = re.search(r'築(\d+)年', text)
        if age_match:
            prop['築年数'] = age_match.group(0)

    # 階数を抽出
    if not prop.get('階数') and not prop.get('階'):
        floor_match = re.search(r'(\d+)階[/／]', text)
        if floor_match:
            prop['階数'] = floor_match.group(0)

    # 駅情報を抽出
    if not prop.get('最寄り駅') and not prop.get('交通'):
        station_match = re.search(r'「([^」]+)」駅', text)
        if station_match:
            prop['最寄り駅'] = station_match.group(0)
        else:
            station_match = re.search(r'([^\s「」]+線\s*「[^」]+」駅)', text)
            if station_match:
                prop['交通'] = station_match.group(0)

def clean_text(text):
    """テキストをクリーンアップ"""
    if not text:
        return ''
    text = re.sub(r'[\n\t\r]+', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def save_to_excel(properties, output_file):
    """Excelに保存"""
    if not properties:
        print("保存する物件がありません")
        return False

    df = pd.DataFrame(properties)

    # 列の順序を整理
    preferred_order = ['物件名', '価格', '所在地', '最寄り駅', '交通', '間取り', '専有面積', '築年数', '階数', 'バルコニー', '管理費', '修繕積立金', 'リンク']
    cols = [c for c in preferred_order if c in df.columns]
    other_cols = [c for c in df.columns if c not in preferred_order]
    df = df[cols + other_cols]

    df.to_excel(output_file, index=False, engine='openpyxl')
    print(f"\nExcelファイルを保存しました: {output_file}")
    print(f"物件数: {len(properties)}件")

    # サンプル表示
    print("\n=== 抽出された物件サンプル（最初の3件）===")
    for i, p in enumerate(properties[:3]):
        print(f"\n【物件 {i+1}】")
        for k, v in list(p.items())[:8]:
            v_str = str(v)
            print(f"  {k}: {v_str[:60]}..." if len(v_str) > 60 else f"  {k}: {v_str}")

    return True

def main():
    if len(sys.argv) < 2:
        print("使用方法: python parse_suumo_html.py <HTMLファイルパス>")
        print("\n手順:")
        print("1. ブラウザでSUUMOの物件一覧ページを開く")
        print("2. Ctrl+U でソース表示、全選択してコピー")
        print("3. テキストエディタに貼り付けて保存（例: suumo.html）")
        print("4. python parse_suumo_html.py suumo.html")
        return

    html_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else '/home/user/claude/suumo_properties.xlsx'

    try:
        properties = parse_suumo_html(html_file)

        if properties:
            save_to_excel(properties, output_file)
        else:
            print("物件情報を抽出できませんでした。HTMLファイルの形式を確認してください。")

    except FileNotFoundError:
        print(f"ファイルが見つかりません: {html_file}")
    except Exception as e:
        print(f"エラーが発生しました: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
