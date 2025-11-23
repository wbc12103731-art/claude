"""
SUUMOのURLから物件情報を自動取得してExcelに出力するスクリプト
Usage: python scrape_suumo_auto.py <SUUMO_URL>
"""
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import pandas as pd
import sys, os, re
from datetime import datetime
import time

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

def fetch_html(url):
    """Playwrightでページを取得"""
    print(f'ブラウザを起動中...')
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # ブラウザを表示
        page = browser.new_page()

        print(f'ページを読み込み中: {url[:50]}...')
        page.goto(url, wait_until='networkidle', timeout=60000)

        # ページが完全に読み込まれるまで待機
        time.sleep(3)

        # HTMLを取得
        html = page.content()
        print(f'HTML取得完了: {len(html)} bytes')

        browser.close()

    return html

def extract_from_html(html):
    """HTMLから物件情報を抽出"""
    soup = BeautifulSoup(html, 'html.parser')
    props = []

    for unit in soup.select('.property_unit'):
        p, raw = {}, {}
        t = unit.select_one('.property_unit-title a, .property_unit-title_wide a')
        p['物件名'] = t.get_text(strip=True) if t else ''
        p['リンク'] = 'https://suumo.jp' + t['href'] if t and t.get('href') else ''

        tags = [x.get_text(strip=True) for x in unit.select('.property_unit-pcts li') if x.get_text(strip=True)]
        p['タグ'] = '、'.join(tags)

        lead = unit.select_one('.dottable-lead td')
        p['PRコメント'] = lead.get_text(strip=True) if lead else ''

        for dl in unit.select('.dottable-line dl'):
            dt, dd = dl.select_one('dt'), dl.select_one('dd')
            if dt and dd and dt.get_text(strip=True):
                raw[dt.get_text(strip=True)] = dd.get_text(strip=True)

        p['販売価格（万円）'] = parse_price(raw.get('販売価格'))
        line, sta, walk = parse_station(raw.get('沿線・駅'))
        p['沿線'], p['駅'], p['徒歩（分）'] = line, sta, walk
        p['間取り'] = raw.get('間取り', '')
        p['専有面積（m²）'] = parse_area(raw.get('専有面積'))
        p['バルコニー（m²）'] = parse_area(raw.get('バルコニー'))
        p['所在地'] = raw.get('所在地', '')
        p['築年月'] = parse_date(raw.get('築年月'))

        if p['物件名']:
            props.append(p)

    return props

def save_excel(props, output_file):
    """Excelファイルに保存"""
    df = pd.DataFrame(props)
    cols = ['物件名','販売価格（万円）','所在地','沿線','駅','徒歩（分）',
            '間取り','専有面積（m²）','バルコニー（m²）','築年月','タグ','PRコメント','リンク']
    df = df[[c for c in cols if c in df.columns]]
    df.to_excel(output_file, index=False)
    return df

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('使い方: python scrape_suumo_auto.py <SUUMO_URL>')
        print('例: python scrape_suumo_auto.py "https://suumo.jp/jj/bukken/ichiran/..."')
        sys.exit(1)

    url = sys.argv[1]

    # HTMLを取得
    html = fetch_html(url)

    # 物件情報を抽出
    props = extract_from_html(html)

    if not props:
        print('物件が見つかりませんでした')
        sys.exit(1)

    # Excel出力
    output = 'suumo_properties.xlsx'
    df = save_excel(props, output)

    print(f'\n完了: {len(props)}件 -> {output}')
    print(f'\n価格範囲: {df["販売価格（万円）"].min()}万円 〜 {df["販売価格（万円）"].max()}万円')
