"""
SUUMOの各物件詳細ページから詳細情報を取得するスクリプト
Usage: python scrape_suumo_detail.py <SUUMO_URL>
"""
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import pandas as pd
import sys, re, time
from datetime import datetime

def parse_price(s):
    if not s: return None
    m = re.search(r'([\d,]+)', s.replace(',', ''))
    return int(m.group(1)) if m else None

def parse_area(s):
    if not s: return None
    m = re.search(r'([\d.]+)\s*m', s)
    return float(m.group(1)) if m else None

def parse_station(s):
    if not s: return None, None, None
    m = re.match(r'(.+?)「(.+?)」徒歩(\d+)分', s)
    if m: return m.group(1), m.group(2), int(m.group(3))
    return s, None, None

def parse_date(s):
    if not s: return None
    m = re.search(r'(\d{4})年(\d{1,2})月', s)
    return datetime(int(m.group(1)), int(m.group(2)), 1) if m else None

def parse_floor(s):
    """階数を解析: "5階/14階建" -> (5, 14)"""
    if not s: return None, None
    m = re.search(r'(\d+)階[/／](\d+)階建', s)
    if m: return int(m.group(1)), int(m.group(2))
    m = re.search(r'(\d+)階建', s)
    if m: return None, int(m.group(1))
    m = re.search(r'(\d+)階', s)
    if m: return int(m.group(1)), None
    return None, None

def extract_list_page(html):
    """一覧ページから物件リンクを抽出"""
    soup = BeautifulSoup(html, 'html.parser')
    properties = []

    for unit in soup.select('.property_unit'):
        p = {}
        t = unit.select_one('.property_unit-title a, .property_unit-title_wide a')
        if t and t.get('href'):
            p['物件名'] = t.get_text(strip=True)
            p['リンク'] = 'https://suumo.jp' + t['href']

            # タグ
            tags = [x.get_text(strip=True) for x in unit.select('.property_unit-pcts li') if x.get_text(strip=True)]
            p['タグ'] = '、'.join(tags)

            # PRコメント
            lead = unit.select_one('.dottable-lead td')
            p['PRコメント'] = lead.get_text(strip=True) if lead else ''

            properties.append(p)

    return properties

def extract_detail_page(html, base_info):
    """詳細ページから物件情報を抽出"""
    soup = BeautifulSoup(html, 'html.parser')
    p = base_info.copy()
    raw = {}

    # 物件概要テーブルから情報取得
    for table in soup.select('table'):
        for tr in table.select('tr'):
            th = tr.select_one('th')
            td = tr.select_one('td')
            if th and td:
                key = th.get_text(strip=True)
                val = td.get_text(strip=True)
                if key and val:
                    raw[key] = val

    # データ変換
    p['販売価格（万円）'] = parse_price(raw.get('販売価格', raw.get('価格', '')))

    # 沿線・駅・徒歩
    station_str = raw.get('沿線・駅', raw.get('交通', ''))
    line, sta, walk = parse_station(station_str)
    p['沿線'] = line
    p['駅'] = sta
    p['徒歩（分）'] = walk

    p['所在地'] = raw.get('所在地', raw.get('住所', ''))
    p['間取り'] = raw.get('間取り', '')
    p['専有面積（m²）'] = parse_area(raw.get('専有面積', ''))
    p['バルコニー（m²）'] = parse_area(raw.get('バルコニー', ''))
    p['築年月'] = parse_date(raw.get('築年月', raw.get('築年', '')))

    # 追加情報
    floor, total_floor = parse_floor(raw.get('所在階/階建', raw.get('階建', '')))
    p['所在階'] = floor
    p['階建'] = total_floor

    p['向き'] = raw.get('向き', raw.get('バルコニー向き', ''))
    p['管理費（円）'] = parse_price(raw.get('管理費', ''))
    p['修繕積立金（円）'] = parse_price(raw.get('修繕積立金', ''))
    p['総戸数'] = parse_price(raw.get('総戸数', ''))
    p['構造'] = raw.get('構造', raw.get('建物構造', ''))
    p['駐車場'] = raw.get('駐車場', '')
    p['ペット'] = raw.get('ペット', '')
    p['現況'] = raw.get('現況', '')
    p['引渡し'] = raw.get('引渡し', raw.get('引渡時期', ''))
    p['取引態様'] = raw.get('取引態様', '')

    return p

def main(url):
    print('=' * 50)
    print('SUUMO 物件詳細スクレイパー')
    print('=' * 50)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=False)
        page = browser.new_page()

        # 1. 一覧ページを取得
        print(f'\n[1/2] 一覧ページを読み込み中...')
        page.goto(url, wait_until='networkidle', timeout=60000)
        time.sleep(2)
        list_html = page.content()

        properties = extract_list_page(list_html)
        print(f'  -> {len(properties)}件の物件を検出')

        if not properties:
            print('物件が見つかりませんでした')
            browser.close()
            return

        # 2. 各物件の詳細ページを取得
        print(f'\n[2/2] 詳細ページを取得中...')
        detailed_props = []

        for i, prop in enumerate(properties, 1):
            print(f'  [{i}/{len(properties)}] {prop["物件名"][:20]}...', end=' ')
            try:
                page.goto(prop['リンク'], wait_until='networkidle', timeout=30000)
                time.sleep(1)
                detail_html = page.content()
                detailed = extract_detail_page(detail_html, prop)
                detailed_props.append(detailed)
                print('OK')
            except Exception as e:
                print(f'エラー: {e}')
                detailed_props.append(prop)  # 基本情報のみ保存

        browser.close()

    # Excel出力
    df = pd.DataFrame(detailed_props)

    # 列順を整理
    cols = [
        '物件名', '販売価格（万円）', '所在地', '沿線', '駅', '徒歩（分）',
        '間取り', '専有面積（m²）', 'バルコニー（m²）', '所在階', '階建', '向き',
        '築年月', '管理費（円）', '修繕積立金（円）', '総戸数', '構造',
        '駐車場', 'ペット', '現況', '引渡し', '取引態様',
        'タグ', 'PRコメント', 'リンク'
    ]
    df = df[[c for c in cols if c in df.columns]]

    output = 'suumo_detail.xlsx'
    df.to_excel(output, index=False)

    print(f'\n{"=" * 50}')
    print(f'完了: {len(detailed_props)}件 -> {output}')
    print(f'価格範囲: {df["販売価格（万円）"].min()}万円 〜 {df["販売価格（万円）"].max()}万円')
    print(f'{"=" * 50}')

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('使い方: py scrape_suumo_detail.py "SUUMOのURL"')
        print('例: py scrape_suumo_detail.py "https://suumo.jp/jj/bukken/ichiran/..."')
        sys.exit(1)
    main(sys.argv[1])
