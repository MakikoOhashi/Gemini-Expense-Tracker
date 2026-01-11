# Google Sheets & Drive 連携セットアップガイド（OAuth 2.0）

## 🚀 簡単セットアップ！

**OAuth 2.0認証で安全・簡単にGoogle SheetsとGoogle Driveに連携できます！**

## 1. Google Cloud Console設定（必須）

### 1-1. プロジェクト作成
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成または既存プロジェクトを選択

### 1-2. OAuth 2.0クライアントID作成
1. **APIs & Services > Credentials** を開く
2. **+ CREATE CREDENTIALS > OAuth client ID** をクリック
3. **Application type** を **Web application** に選択
4. **Name** を入力（例: `Expense Tracker OAuth`）
5. **Authorized redirect URIs** に以下を追加：
   ```
   http://localhost:3001/auth/google/callback
   ```
6. **CREATE** をクリック

### 1-3. クライアントIDとシークレット取得
作成されたOAuthクライアントをクリックして、以下の値をコピー：
- **Client ID**
- **Client secret**

### 1-4. API有効化
**APIs & Services > Library** で以下のAPIを有効化：
- ✅ Google Sheets API
- ✅ Google Drive API

## 2. 環境変数設定

`.env`ファイルを以下のように編集：

```env
# Google OAuth 2.0 Configuration
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
```

## 3. サーバー起動

```bash
npm run server
```

## 4. 認証設定

ブラウザで `http://localhost:3001/auth/google` にアクセスしてOAuth認証を実行：

1. Googleアカウントでログイン
2. 権限を承認（SheetsとDriveへのアクセス）
3. 自動的にリダイレクトされ認証完了

## 5. 自動初期化実行

認証完了後、新しいターミナルで初期化を実行：

```bash
node test-initialization.js
```

実行すると自動的に：
- ✅ **Gemini Expense Tracker** ルートフォルダ作成（Google Drive）
- ✅ 年別スプレッドシート作成（例: `2026_Expenses`）
- ✅ **Receipts** フォルダと月別サブフォルダ作成
- ✅ 4つのシート自動作成（Expenses, Income, Summary, Rules）
- ✅ サンプルルール2件自動登録

## 6. 完了！

これで準備完了！アプリで取引データを保存すると、自動的に：
- 📊 Google Sheetsにデータ保存
- 📁 Google Driveにレシート画像アップロード
- 📈 Summaryシートで自動集計

## 📊 自動作成される構造

### Google Driveフォルダ構造
```
📁 Gemini Expense Tracker/
├── 📊 2026_Expenses (スプレッドシート)
│   ├── 📋 Expenses（支出データ）
│   ├── 📈 Income（売上データ）
│   ├── 📊 Summary（集計・分析）
│   └── ⚙️ Rules（自動分類ルール）
└── 📂 2026_Receipts/
    ├── 📁 2026-01/
    ├── 📁 2026-02/
    └── 📁 ...（1-12月分）
```

### 各シートの構造

#### Expenses & Income シート
| 日付 | 金額 | カテゴリ | メモ | レシートURL |
|------|------|----------|------|-------------|
| 2024-01-15 | 1200 | 消耗品費 | ランチ | https://drive.google.com/... |

#### Summary シート（自動集計）
- **月別支出集計**（1-12月）
- **月別売上集計**（1-12月）
- **カテゴリ別支出集計**（動的）
- **カテゴリ別売上集計**（動的）
- **損益比較表**（月別）

#### Rules シート（自動分類）
| Keyword | Category | Confidence | Notes |
|---------|----------|------------|-------|
| Amazon | 消耗品費 | 75 | オンラインショッピング |
| Slack | 通信費 | 90 | サブスクリプション |

## 🔧 トラブルシューティング

### 認証エラー
```
OAuth認証に失敗しました
```
**確認事項:**
1. GOOGLE_CLIENT_ID が正しいか
2. GOOGLE_CLIENT_SECRET が正しいか
3. GOOGLE_REDIRECT_URI が一致するか
4. Google Cloud ConsoleのOAuth設定が正しいか

### 初期化エラー
```
❌ 初期化に失敗しました
```
**確認事項:**
1. OAuth認証が完了しているか
2. Google Sheets API が有効か
3. Google Drive API が有効か
4. アプリにSheets/Driveへのアクセス権限を与えたか

### 保存エラー
```
データの保存に失敗しました
```
**確認事項:**
1. 年別スプレッドシートが存在するか
2. ユーザートークンが有効か（再認証が必要かも）

## 🎯 使用方法

### 基本的なデータ保存
```javascript
// 支出データ保存
await sheetsService.saveExpense({
  date: '2024-01-15',
  amount: 1200,
  category: '消耗品費',
  memo: 'オフィス用品',
  receipt_url: 'https://drive.google.com/...'
});

// 全取引データ取得
const transactions = await sheetsService.getTransactions(2024);

// ルール管理
const rules = await sheetsService.getRules(2024);
await sheetsService.addRule({
  keyword: 'AWS',
  category: '外注費',
  confidence: 85,
  notes: 'クラウドサービス'
});
```

### 年別管理
システムは自動的に年ごとにスプレッドシートを作成・管理します：
- `2024_Expenses` → 2024年度のデータ
- `2025_Expenses` → 2025年度のデータ
- 年度をまたぐと自動で新しいシート作成

## 🔐 セキュリティ

- OAuth 2.0認証を使用（サービスアカウント不要）
- ユーザーのGoogleアカウント権限のみ使用
- データはユーザーのGoogle Drive/Sheetsに保存
- アクセストークンはメモリのみに保存（再起動で消滅）
