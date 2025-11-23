"""
SUUMO物件情報スクレイパー - Webアプリ版
非技術者向けのシンプルなUI
"""
import streamlit as st
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import pandas as pd
import re
import io
from datetime import datetime
import time

# ページ設定
st.set_page_config(
    page_title="SUUMO物件情報取得ツール",
    page_icon="🏠",
    layout="centered"
)

# パース関数
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
    m = re.match(r'(.+?)「(.+?)」[歩徒]+(\d+)分', s)
    if m: return m.group(1), m.group(2), int(m.group(3))
    return s, None, None

def parse_date(s):
    if not s: return None
    m = re.search(r'(\d{4})年(\d{1,2})月', s)
    return datetime(int(m.group(1)), int(m.group(2)), 1) if m else None

def parse_floor(s):
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

            tags = [x.get_text(strip=True) for x in unit.select('.property_unit-pcts li') if x.get_text(strip=True)]
            p['タグ'] = '、'.join(tags)

            lead = unit.select_one('.dottable-lead td')
            p['PRコメント'] = lead.get_text(strip=True) if lead else ''

            properties.append(p)

    return properties

def extract_detail_page(html, base_info):
    """詳細ページから物件情報を抽出"""
    soup = BeautifulSoup(html, 'html.parser')
    p = base_info.copy()
    raw = {}

    for table in soup.select('table'):
        ths = table.select('th')
        for th in ths:
            key = th.get_text(strip=True).replace('ヒント', '')
            next_td = th.find_next_sibling('td')
            if next_td:
                val = next_td.get_text(strip=True)
                if key and val:
                    raw[key] = val

    # データ変換
    p['販売価格（万円）'] = parse_price(raw.get('販売価格', raw.get('価格', '')))

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

def scrape_suumo(url, progress_bar, status_text):
    """SUUMOからデータをスクレイプ"""
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=False)
        page = browser.new_page()

        # 一覧ページを取得
        status_text.text('一覧ページを読み込み中...')
        page.goto(url, wait_until='networkidle', timeout=60000)
        time.sleep(2)
        list_html = page.content()

        properties = extract_list_page(list_html)

        if not properties:
            browser.close()
            return None

        status_text.text(f'{len(properties)}件の物件を検出しました')

        # 各物件の詳細ページを取得
        detailed_props = []

        for i, prop in enumerate(properties):
            progress = (i + 1) / len(properties)
            progress_bar.progress(progress)
            status_text.text(f'詳細取得中: [{i+1}/{len(properties)}] {prop["物件名"][:25]}...')

            try:
                page.goto(prop['リンク'], wait_until='networkidle', timeout=30000)
                time.sleep(1)
                detail_html = page.content()
                detailed = extract_detail_page(detail_html, prop)
                detailed_props.append(detailed)
            except Exception as e:
                detailed_props.append(prop)

        browser.close()

    return detailed_props

def create_excel(properties):
    """DataFrameからExcelバイトを生成"""
    df = pd.DataFrame(properties)

    cols = [
        '物件名', '販売価格（万円）', '所在地', '沿線', '駅', '徒歩（分）',
        '間取り', '専有面積（m²）', 'バルコニー（m²）', '所在階', '階建', '向き',
        '築年月', '管理費（円）', '修繕積立金（円）', '総戸数', '構造',
        '駐車場', 'ペット', '現況', '引渡し', '取引態様',
        'タグ', 'PRコメント', 'リンク'
    ]
    df = df[[c for c in cols if c in df.columns]]

    output = io.BytesIO()
    df.to_excel(output, index=False, engine='openpyxl')
    output.seek(0)

    return output, df

# UI部分
st.title('🏠 SUUMO物件情報取得ツール')
st.markdown('---')

st.markdown('''
### 使い方
1. SUUMOの物件一覧ページのURLをコピー
2. 下の入力欄にペースト
3. 「取得開始」ボタンをクリック
4. 処理完了後、Excelをダウンロード
''')

url = st.text_input(
    'SUUMOのURL',
    placeholder='https://suumo.jp/jj/bukken/ichiran/...',
    help='SUUMOの中古マンション一覧ページのURLを入力してください'
)

if st.button('🔍 取得開始', type='primary', disabled=not url):
    if not url.startswith('https://suumo.jp'):
        st.error('⚠️ SUUMOのURLを入力してください')
    else:
        progress_bar = st.progress(0)
        status_text = st.empty()

        try:
            with st.spinner('物件情報を取得中...'):
                properties = scrape_suumo(url, progress_bar, status_text)

            if properties:
                excel_data, df = create_excel(properties)

                st.success(f'✅ {len(properties)}件の物件情報を取得しました！')

                # 結果プレビュー
                st.markdown('### 取得結果プレビュー')
                st.dataframe(df.head(10), use_container_width=True)

                # ダウンロードボタン
                filename = f'suumo_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
                st.download_button(
                    label='📥 Excelをダウンロード',
                    data=excel_data,
                    file_name=filename,
                    mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                )

                # 統計情報
                st.markdown('### 統計情報')
                col1, col2, col3 = st.columns(3)
                with col1:
                    st.metric('物件数', f'{len(properties)}件')
                with col2:
                    if '販売価格（万円）' in df.columns:
                        min_price = df['販売価格（万円）'].min()
                        st.metric('最低価格', f'{min_price:,}万円' if pd.notna(min_price) else '-')
                with col3:
                    if '販売価格（万円）' in df.columns:
                        max_price = df['販売価格（万円）'].max()
                        st.metric('最高価格', f'{max_price:,}万円' if pd.notna(max_price) else '-')
            else:
                st.warning('⚠️ 物件が見つかりませんでした。URLを確認してください。')

        except Exception as e:
            st.error(f'❌ エラーが発生しました: {str(e)}')
            status_text.empty()
            progress_bar.empty()

st.markdown('---')
st.caption('※ このツールはローカルPC上で動作します。SUUMOの利用規約を遵守してご使用ください。')
