#!/usr/bin/env python3
"""
SUUMOの物件一覧ページをスクレイピングしてExcelに出力するスクリプト
"""

import requests
from bs4 import BeautifulSoup
import pandas as pd
import re
import time

def scrape_suumo(url):
    """SUUMOの物件一覧ページをスクレイピング"""

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
    }

    print(f"ページを取得中: {url}")
    response = requests.get(url, headers=headers, timeout=30)
    response.encoding = 'utf-8'

    if response.status_code != 200:
        print(f"エラー: ステータスコード {response.status_code}")
        return []

    soup = BeautifulSoup(response.text, 'html.parser')

    # デバッグ: ページの一部を表示
    print(f"ページタイトル: {soup.title.string if soup.title else 'なし'}")

    properties = []

    # SUUMOの物件カセット（リスト形式）を探す
    # 複数のセレクタを試行
    property_items = soup.select('.cassetteitem')

    if not property_items:
        property_items = soup.select('.property_unit')

    if not property_items:
        property_items = soup.select('[class*="cassette"]')

    if not property_items:
        # 詳細一覧モードの場合
        property_items = soup.select('.dottable-line')

    print(f"見つかった物件数: {len(property_items)}")

    # HTMLの構造をデバッグ表示
    if not property_items:
        print("\n--- HTMLの主要な構造を確認 ---")
        # クラス名を持つ主要な要素を表示
        main_divs = soup.find_all('div', class_=True, limit=30)
        for div in main_divs:
            classes = ' '.join(div.get('class', []))
            if 'property' in classes.lower() or 'bukken' in classes.lower() or 'item' in classes.lower():
                print(f"Found: <div class='{classes}'>")

        # tableがある場合
        tables = soup.find_all('table', limit=5)
        for table in tables:
            classes = ' '.join(table.get('class', []))
            print(f"Found table: class='{classes}'")

    for item in property_items:
        try:
            prop = extract_property_info(item)
            if prop:
                properties.append(prop)
        except Exception as e:
            print(f"物件情報抽出エラー: {e}")
            continue

    # 別の形式を試行（テーブル形式）
    if not properties:
        properties = extract_from_table(soup)

    return properties

def extract_property_info(item):
    """物件情報を抽出"""
    prop = {}

    # 物件名
    name_elem = item.select_one('.cassetteitem_content-title') or \
                item.select_one('[class*="title"]') or \
                item.select_one('dt')
    prop['物件名'] = name_elem.get_text(strip=True) if name_elem else ''

    # 価格
    price_elem = item.select_one('.cassetteitem_price--accent') or \
                 item.select_one('[class*="price"]')
    prop['価格'] = price_elem.get_text(strip=True) if price_elem else ''

    # 所在地
    addr_elem = item.select_one('.cassetteitem_detail-col1') or \
                item.select_one('[class*="address"]')
    prop['所在地'] = addr_elem.get_text(strip=True) if addr_elem else ''

    # 交通（最寄り駅）
    access_elem = item.select_one('.cassetteitem_detail-col2') or \
                  item.select_one('[class*="access"]')
    prop['交通'] = access_elem.get_text(strip=True) if access_elem else ''

    # 間取り
    madori_elem = item.select_one('[class*="madori"]')
    prop['間取り'] = madori_elem.get_text(strip=True) if madori_elem else ''

    # 専有面積
    area_elem = item.select_one('[class*="menseki"]')
    prop['専有面積'] = area_elem.get_text(strip=True) if area_elem else ''

    # 築年数
    age_elem = item.select_one('[class*="chikunen"]') or \
               item.select_one('[class*="age"]')
    prop['築年数'] = age_elem.get_text(strip=True) if age_elem else ''

    return prop if any(prop.values()) else None

def extract_from_table(soup):
    """テーブル形式からデータを抽出"""
    properties = []

    # SUUMOの物件一覧テーブルを探す
    rows = soup.select('tr.js-cassette_link') or \
           soup.select('tr[class*="cassette"]') or \
           soup.select('.dottable-line tr')

    print(f"テーブル行数: {len(rows)}")

    for row in rows:
        cells = row.find_all(['td', 'th'])
        if len(cells) >= 3:
            prop = {}
            for i, cell in enumerate(cells):
                text = cell.get_text(strip=True)
                if text:
                    prop[f'列{i+1}'] = text
            if prop:
                properties.append(prop)

    return properties

def extract_all_text_properties(soup):
    """ページ全体から物件らしい情報を抽出（フォールバック）"""
    properties = []

    # 物件ブロックを探す（より広い検索）
    blocks = soup.find_all('div', recursive=True)

    for block in blocks:
        text = block.get_text()
        # 価格パターンを含むブロックを探す
        if re.search(r'\d+万円', text) and len(text) < 2000:
            # 価格、面積、駅などの情報を含むかチェック
            if re.search(r'(LDK|DK|K|m²|㎡|駅)', text):
                prop = {'全文': text[:500]}
                properties.append(prop)

    return properties[:30]  # 最大30件

def save_to_excel(properties, filename):
    """物件情報をExcelに保存"""
    if not properties:
        print("保存する物件がありません")
        return

    df = pd.DataFrame(properties)
    df.to_excel(filename, index=False, engine='openpyxl')
    print(f"Excelファイルを保存しました: {filename}")
    print(f"物件数: {len(properties)}件")

def main():
    url = "https://suumo.jp/jj/bukken/ichiran/JJ012FC001/?ar=060&bs=011&cn=20&cnb=10&et=5&fw2=&jc=042&kb=1&kt=7500&mb=50&md=2&md=3&mh=151&mt=70&sc=27103&sc=27106&sc=27109&sc=27111&sc=27127&sc=27128&scTemp=27103&scTemp=27106&scTemp=27109&scTemp=27111&scTemp=27127&scTemp=27128&ta=27&tj=0&bknlistmodeflg=1&pc=30&page=1"

    properties = scrape_suumo(url)

    if properties:
        save_to_excel(properties, '/home/user/claude/suumo_properties.xlsx')
    else:
        print("物件情報を取得できませんでした。HTMLを保存して構造を確認します...")
        # HTMLを保存してデバッグ
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
        response = requests.get(url, headers=headers, timeout=30)
        with open('/home/user/claude/suumo_debug.html', 'w', encoding='utf-8') as f:
            f.write(response.text)
        print("HTMLを suumo_debug.html に保存しました")

if __name__ == '__main__':
    main()
