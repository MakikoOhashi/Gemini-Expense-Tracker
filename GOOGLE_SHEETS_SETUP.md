# Google Sheets 連携セットアップガイド（自動化版）

## 🚀 超簡単セットアップ！

**ユーザーがやることはGoogle Cloud設定だけ。あとは全部アプリが自動でやってくれます！**

## 1. Google Cloud Console設定（必須）

### 1-1. プロジェクト作成
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成

### 1-2. サービスアカウント作成
1. **IAM & Admin > Service Accounts** を開く
2. **+ CREATE SERVICE ACCOUNT** をクリック
3. 名前を入力（例: `expense-tracker-service`）
4. **CREATE AND CONTINUE** をクリック
5. ロールは設定せず **DONE** をクリック

### 1-3. キー作成とダウンロード
1. 作成したサービスアカウントをクリック
2. **Keys** タブを開く
3. **ADD KEY > Create new key** をクリック
4. **JSON** を選択して **CREATE** をクリック
5. JSONファイルがダウンロードされる

### 1-4. Google Sheets API有効化
1. **APIs & Services > Library** を開く
2. "Google Sheets API" を検索
3. **ENABLE** をクリック

## 2. 環境変数設定

ダウンロードしたJSONファイルを開き、`.env`ファイルを以下のように編集：

```env
# Google Sheets API設定
GOOGLE_CLIENT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----"
SPREADSHEET_ID=your-spreadsheet-id-here
```

**JSONファイルからコピーする値:**
- `client_email` → `GOOGLE_CLIENT_EMAIL`
- `private_key` → `GOOGLE_PRIVATE_KEY`（`\n`は保持）

## 3. 自動初期化実行

```bash
# サーバー起動
npm run server

# 新しいターミナルで初期化実行
node test-initialization.js
```

実行すると自動的に：
- ✅ 新しいスプレッドシート作成（"Gemini Expense Tracker"）
- ✅ "Expenses"シート作成（ヘッダー付き）
- ✅ "Summary"シート作成（集計式自動挿入）
- ✅ Spreadsheet ID表示

## 4. .envファイル更新

コンソールに表示されたSpreadsheet IDを`.env`にコピー：

```env
SPREADSHEET_ID=1ABC...xyz
```

## 5. 完了！

これで準備完了！フロントエンドの各取引に雲アイコンが表示され、クリックすると自動的にGoogle Sheetsに保存されます。

## 📊 自動作成されるシート構造

### Expensesシート
| 日付 | 金額 | カテゴリ | メモ | レシートURL |
|------|------|----------|------|-------------|
| 2024-01-15 | 1200 | 食費 | ランチ | https://... |

### Summaryシート（自動集計）
- 月別支出集計（1-12月）
- カテゴリ別支出集計（食費、交通費、日用品、娯楽、その他）

## 🔧 トラブルシューティング

### 初期化エラー
```
❌ 初期化に失敗しました
```

**確認事項:**
1. GOOGLE_CLIENT_EMAIL が正しいか
2. GOOGLE_PRIVATE_KEY の `\n` が保持されているか
3. Google Sheets API が有効になっているか
4. サービスアカウントに権限があるか

### 保存エラー
```
データの保存に失敗しました
```

**確認事項:**
1. SPREADSHEET_ID が正しく設定されているか
2. サービスアカウントがスプレッドシートにアクセスできるか

## 🎯 使用方法

```javascript
// 初期化（初回のみ）
const result = await sheetsService.initialize();
console.log('Spreadsheet ID:', result.spreadsheetId);

// データ保存
await sheetsService.saveExpense({
  date: '2024-01-15',
  amount: 1200,
  category: '食費',
  memo: 'ランチ',
  receipt_url: 'https://example.com/receipt.jpg'
});
