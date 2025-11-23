#!/usr/bin/env python3
"""
SUUMOの物件一覧ページをPlaywrightでスクレイピングしてExcelに出力
"""

from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import pandas as pd
import re
import time

def scrape_suumo():
    url = "https://suumo.jp/jj/bukken/ichiran/JJ012FC001/?ar=060&bs=011&cn=20&cnb=10&et=5&fw2=&jc=042&kb=1&kt=7500&mb=50&md=2&md=3&mh=151&mt=70&sc=27103&sc=27106&sc=27109&sc=27111&sc=27127&sc=27128&scTemp=27103&scTemp=27106&scTemp=27109&scTemp=27111&scTemp=27127&scTemp=27128&ta=27&tj=0&bknlistmodeflg=1&pc=30&page=1"

    print("ブラウザを起動中...")

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
        )
        context = browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale='ja-JP',
            ignore_https_errors=True
        )
        page = context.new_page()

        print(f"ページにアクセス中: {url}")
        page.goto(url, timeout=60000, wait_until='domcontentloaded')

        # 少し待機
        time.sleep(3)

        print(f"ページタイトル: {page.title()}")

        # HTMLを取得
        html = page.content()

        # デバッグ用にHTMLを保存
        with open('/home/user/claude/suumo_page.html', 'w', encoding='utf-8') as f:
            f.write(html)
        print("HTMLを保存しました: suumo_page.html")

        browser.close()

    # HTMLを解析
    soup = BeautifulSoup(html, 'html.parser')
    properties = extract_properties(soup)

    return properties

def extract_properties(soup):
    """物件情報を抽出"""
    properties = []

    # SUUMOの物件一覧の様々なセレクタを試行
    # 中古マンション一覧ページの構造
    property_items = soup.select('.property_unit-content')

    if not property_items:
        property_items = soup.select('.cassetteitem')

    if not property_items:
        property_items = soup.select('.property_unit')

    if not property_items:
        # dottable形式（一覧表示）
        property_items = soup.select('.dottable-vm')

    print(f"見つかった物件ブロック: {len(property_items)}")

    # 物件が見つからない場合、別のアプローチ
    if not property_items:
        # 物件テーブルを探す
        return extract_from_dottable(soup)

    for item in property_items:
        prop = {}

        # 物件名
        name = item.select_one('.property_unit-title') or \
               item.select_one('.cassetteitem_content-title') or \
               item.select_one('dt a')
        prop['物件名'] = clean_text(name.get_text()) if name else ''

        # 価格
        price = item.select_one('.dottable-value') or \
                item.select_one('.property_unit-price') or \
                item.select_one('.cassetteitem_price--accent')
        prop['価格'] = clean_text(price.get_text()) if price else ''

        # その他の情報を取得
        details = item.select('.dottable-line')
        for detail in details:
            label = detail.select_one('.dottable-vm')
            value = detail.select_one('.dottable-value')
            if label and value:
                key = clean_text(label.get_text())
                val = clean_text(value.get_text())
                prop[key] = val

        if any(prop.values()):
            properties.append(prop)

    return properties

def extract_from_dottable(soup):
    """dottable形式からデータを抽出"""
    properties = []

    # property_unit をベースに検索
    units = soup.select('.property_unit')
    print(f"property_unit数: {len(units)}")

    if not units:
        # 別形式: テーブル行ベース
        rows = soup.select('tr')
        print(f"テーブル行数: {len(rows)}")

    # 物件カードを探す（別パターン）
    cards = soup.select('[class*="cassette"]') or soup.select('[class*="property"]')
    print(f"カード形式: {len(cards)}")

    # 一覧ページの場合、個別の物件情報を抽出
    # SUUMOの中古マンション一覧は通常以下の構造
    bukken_items = soup.select('.cassettebox') or soup.select('.js-cassette_link_href')
    print(f"bukken items: {len(bukken_items)}")

    # 最終手段: 全てのリンク付き物件名を探す
    if not properties:
        properties = extract_property_links(soup)

    return properties

def extract_property_links(soup):
    """リンク付きの物件情報を探す"""
    properties = []

    # 物件詳細へのリンクを持つ要素を探す
    links = soup.find_all('a', href=re.compile(r'/jj/bukken/shosai|/ms/chuko/'))

    print(f"物件リンク数: {len(links)}")

    seen = set()
    for link in links:
        href = link.get('href', '')
        if href in seen:
            continue
        seen.add(href)

        # 親要素から情報を取得
        parent = link.find_parent('div', class_=True) or link.find_parent('tr')
        if parent:
            text = clean_text(parent.get_text())
            # テキストが短すぎる場合はスキップ
            if len(text) > 20:
                prop = parse_property_text(text)
                prop['リンク'] = 'https://suumo.jp' + href if href.startswith('/') else href
                if prop.get('物件名') or prop.get('価格'):
                    properties.append(prop)

    return properties

def parse_property_text(text):
    """テキストから物件情報をパース"""
    prop = {}

    # 価格を抽出 (例: 3980万円, 3,980万円)
    price_match = re.search(r'([\d,]+)万円', text)
    if price_match:
        prop['価格'] = price_match.group(0)

    # 面積を抽出 (例: 70.5m2, 70.5㎡)
    area_match = re.search(r'([\d.]+)\s*[m㎡]', text)
    if area_match:
        prop['専有面積'] = area_match.group(0)

    # 間取りを抽出 (例: 3LDK, 2DK)
    layout_match = re.search(r'\d[SLDK]+', text)
    if layout_match:
        prop['間取り'] = layout_match.group(0)

    # 築年数を抽出
    age_match = re.search(r'築(\d+)年', text)
    if age_match:
        prop['築年数'] = age_match.group(0)

    # 階数を抽出
    floor_match = re.search(r'(\d+)階', text)
    if floor_match:
        prop['階数'] = floor_match.group(0)

    # 駅情報を抽出
    station_match = re.search(r'[「「]?([^「」\s]+)駅', text)
    if station_match:
        prop['最寄り駅'] = station_match.group(0)

    # 残りをテキストとして保存（最初の50文字を物件名として使用）
    prop['物件名'] = text[:80].split('万円')[0] if '万円' in text[:80] else text[:50]

    return prop

def clean_text(text):
    """テキストをクリーンアップ"""
    if not text:
        return ''
    # 改行、タブ、余分な空白を削除
    text = re.sub(r'[\n\t\r]+', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def save_to_excel(properties, filename):
    """Excelに保存"""
    if not properties:
        print("保存する物件がありません")
        return False

    df = pd.DataFrame(properties)

    # 列の順序を整理
    preferred_order = ['物件名', '価格', '所在地', '最寄り駅', '交通', '間取り', '専有面積', '築年数', '階数', 'リンク']
    cols = [c for c in preferred_order if c in df.columns]
    other_cols = [c for c in df.columns if c not in preferred_order]
    df = df[cols + other_cols]

    df.to_excel(filename, index=False, engine='openpyxl')
    print(f"\nExcelファイルを保存しました: {filename}")
    print(f"物件数: {len(properties)}件")
    return True

def main():
    try:
        properties = scrape_suumo()

        if properties:
            save_to_excel(properties, '/home/user/claude/suumo_properties.xlsx')
            print("\n=== 抽出された物件サンプル ===")
            for i, p in enumerate(properties[:3]):
                print(f"\n物件 {i+1}:")
                for k, v in p.items():
                    print(f"  {k}: {v[:60]}..." if len(str(v)) > 60 else f"  {k}: {v}")
        else:
            print("物件情報を抽出できませんでした。HTMLファイルを確認してください。")

    except Exception as e:
        print(f"エラーが発生しました: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
