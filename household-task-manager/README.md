# 家事タスク管理アプリ

家事の実施タイミングを管理して、定期的な掃除の習慣をつけるためのアプリです。

## iPhoneブラウザでアプリを開く方法

### Vercelで無料デプロイ（推奨）

1. **Vercelアカウントを作成**
   - [Vercel](https://vercel.com)にアクセス
   - 「Sign Up」をクリック
   - GitHubアカウントでサインアップ（無料）

2. **リポジトリをインポート**
   - Vercelダッシュボードで「Add New」→「Project」をクリック
   - GitHubリポジトリを選択してインポート
   - Root Directory: そのまま（自動検出）
   - 「Deploy」をクリック

3. **デプロイ完了**
   - 数分でデプロイが完了します
   - 表示されたURLをiPhoneのブラウザで開くだけ！
   - 例: `https://your-app.vercel.app`

### 代替方法: Netlify

1. [Netlify](https://netlify.com)にアクセス
2. GitHubでサインアップ
3. 「Add new site」→「Import an existing project」
4. GitHubリポジトリを選択
5. Build settings:
   - Base directory: `household-task-manager`
   - Build command: `npx expo export -p web`
   - Publish directory: `household-task-manager/dist`
6. 「Deploy site」をクリック

## アプリの機能

- 家事タスクの登録と管理
- 実施間隔の設定（X日、X週間）
- 実施履歴の記録
- 期限切れタスクの表示
- タスク完了の記録

詳細は `household-task-manager/README.md` を参照してください。
