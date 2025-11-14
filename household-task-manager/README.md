# 家事タスク管理アプリ

家事の実施タイミングを管理して、定期的な掃除の習慣をつけるためのiPhoneアプリです。

## 機能

### 主な機能
- **家事マスタ登録**: 定期的に実施する家事を登録できます
- **実施間隔設定**: 各家事の実施頻度（⚪︎日に1回、⚪︎週間に1回など）を設定できます
- **実施履歴記録**: 家事を実施したタイミングを記録できます
- **期限切れ通知**: 実施期限が過ぎた家事を通知・表示します
- **フィルター表示**: 期限切れのタスクのみを表示できます

### 画面構成
1. **タスク一覧画面**: すべてのタスクを表示、期限切れタスクのフィルタリング機能付き
2. **タスク詳細画面**: タスクの詳細情報と実施履歴を表示、完了記録機能付き
3. **タスク追加・編集画面**: 新しいタスクの追加、既存タスクの編集

## 使い方

### アプリの起動
```bash
# 依存パッケージのインストール
npm install

# 開発サーバーの起動
npm start

# iOSシミュレータで起動
npm run ios

# Androidエミュレータで起動
npm run android

# Webブラウザで起動
npm run web
```

### タスクの登録
1. タスク一覧画面下部の「+ タスクを追加」ボタンをタップ
2. タスク名を入力（例: 洗濯機の掃除）
3. 説明を入力（任意）
4. 実施間隔を設定（例: 1ヶ月に1回）
5. 「追加」ボタンをタップ

### タスクの完了記録
1. タスク一覧からタスクをタップ
2. 詳細画面の「✓ 完了を記録」ボタンをタップ
3. 実施日時が記録され、次回予定日が更新されます

### 期限切れタスクの確認
- タスク一覧画面の「期限切れのみ」タブをタップすると、期限が過ぎたタスクのみが表示されます
- 期限切れのタスクには赤いバッジで超過日数が表示されます

## 技術スタック

- **フレームワーク**: React Native (Expo)
- **言語**: TypeScript
- **ナビゲーション**: React Navigation
- **データ保存**: AsyncStorage
- **通知**: Expo Notifications

## プロジェクト構造

```
src/
├── components/       # 再利用可能なコンポーネント
│   └── TaskItem.tsx
├── navigation/       # ナビゲーション設定
│   └── types.ts
├── screens/          # 画面コンポーネント
│   ├── TaskListScreen.tsx
│   ├── TaskDetailScreen.tsx
│   └── AddEditTaskScreen.tsx
├── storage/          # データ永続化
│   └── index.ts
├── types/            # TypeScript型定義
│   └── index.ts
└── utils/            # ユーティリティ関数
    ├── dateUtils.ts
    └── notifications.ts
```

## データモデル

### HouseholdTask（家事タスク）
```typescript
{
  id: string;
  name: string;
  description?: string;
  interval: {
    value: number;
    unit: 'days' | 'weeks';
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### TaskHistory（実施履歴）
```typescript
{
  id: string;
  taskId: string;
  completedAt: Date;
}
```

## なぜこのアプリを使うのか

家事をするがいつ実施したか忘れてしまう。そのためいつの間にかとても汚くなっていたり、洗濯機が動かなくなるリスクがあります。このアプリを使うことで、定期的に掃除をする習慣をつけることができます。

## ライセンス

MIT
