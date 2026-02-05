# Google Sheets & Drive 連携セットアップガイド（OAuth 2.0）

## 概要
このアプリは OAuth 2.0 を使って、ユーザー自身の Google Drive / Sheets にデータを保存します。

- データはユーザーの Drive に保存
- サービスアカウントは不要
- 初回アクセス時に必要なフォルダ・スプレッドシートを自動作成

---

## 1. Google Cloud Console 設定（必須）

### 1-1. プロジェクト作成
1. Google Cloud Console で新規プロジェクトを作成
2. 既存プロジェクトを使う場合は選択

### 1-2. OAuth 2.0 クライアントID作成
1. APIs & Services > Credentials を開く
2. + CREATE CREDENTIALS > OAuth client ID
3. Application type を Web application に設定
4. Name を入力（例: `Expense Tracker OAuth`）
5. Authorized redirect URIs に以下を追加

```
http://localhost:3001/auth/google/callback
```

6. CREATE をクリック

### 1-3. クライアントIDとシークレット取得
作成された OAuth クライアントから以下を控える:

- Client ID
- Client secret

### 1-4. API 有効化
APIs & Services > Library で有効化:

- Google Sheets API
- Google Drive API

---

## 2. 環境変数設定

`.env` に以下を設定:

```env
# Google OAuth 2.0 Configuration
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
```

---

## 3. サーバー起動

```bash
npm run server
```

---

## 4. 認証（OAuth）

ブラウザで以下にアクセスして認証:

```
http://localhost:3001/auth/google
```

1. Googleアカウントでログイン
2. Sheets / Drive の権限を許可
3. 自動的にリダイレクトされ認証完了

---

## 5. 初期化について

初回アクセス時に自動で以下を作成/確認します:

- Gemini Expense Tracker フォルダ（Drive 直下）
- Gemini_Expenses スプレッドシート
- 年別タブ（YYYY_Expenses / YYYY_Income）
- Rules シート
- Receipts フォルダと月別サブフォルダ

必要に応じて API で明示的に初期化も可能:

```
POST /api/initialize
```

---

## 6. 自動作成される構造

### Google Drive
```
Gemini Expense Tracker/
├─ Gemini_Expenses (Google Sheets)
└─ Receipts/
   ├─ YYYY-01/
   ├─ YYYY-02/
   └─ ...
```

### Google Sheets: Gemini_Expenses
- Rules
- YYYY_Expenses
- YYYY_Income
- Summary_Base
- Summary_Year_Total
- Summary_Account_History

※ Summary 系のタブは監査予報タブで対象年度を開いたタイミングで作成/更新されます。

---

## 7. 各シートの構造

### YYYY_Expenses
| 日付 | 金額 | カテゴリ | メモ | レシートURL |

例:
| 2026-01-15 | 1200 | 消耗品費 | ランチ | https://drive.google.com/... |

### YYYY_Income
| 日付 | 金額 | 支払者名 | 源泉徴収税額 | メモ | レシートURL |

例:
| 2026-01-15 | 50000 | 株式会社ABC | 5000 | 1月分請求 | https://drive.google.com/... |

### Rules
| Keyword | Category | Confidence | Notes |

---

## 8. 監査予報の集計（Summary）

監査予報は Summary タブ群を使って集計します。
以下のタイミングで作成/更新されます:

- 監査予報タブで対象年度を開いたとき

---

## 9. トラブルシューティング

### OAuth 認証エラー
- クライアントID/シークレットが正しいか
- Redirect URI が一致しているか

### データが保存されない
- 対象年のタブ（YYYY_Expenses / YYYY_Income）が存在するか
- OAuth のトークンが失効していないか

### Folder conflict
- Drive に「Gemini Expense Tracker」フォルダが複数ある場合は競合扱いになります

---

## 10. セキュリティ

- OAuth 2.0 のみ使用
- サービスアカウント不要
- データはユーザーの Drive / Sheets に保存
