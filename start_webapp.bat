@echo off
chcp 65001 > nul
echo ================================================
echo   SUUMO物件情報取得ツール を起動します
echo ================================================
echo.

REM 必要なパッケージをインストール
echo 必要なパッケージを確認中...
pip install streamlit playwright pandas openpyxl beautifulsoup4 -q
playwright install chromium

echo.
echo ブラウザでアプリが開きます...
echo 終了するにはこのウィンドウを閉じてください
echo.

streamlit run suumo_webapp.py
pause
