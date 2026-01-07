# Gemini Expense Tracker - AI-Powered Expense Tracker

完全自動化されたAI経費管理システム。Google Gemini AIとGoogle Workspaceを統合し、領収書撮影だけで経費管理が完了します。

## 🌟 主な特徴

### 🤖 AI自動分類
- Google Gemini AIが領収書画像を解析
- 自動で金額・日付・店舗名を抽出
- ユーザー定義ルールによる高精度分類

### 📊 年別自動管理
- 年ごとにスプレッドシートを自動作成
- 月別・カテゴリ別集計を自動計算
- 年度末に自動で新年度ファイル生成

### 📁 Google Drive自動整理
- gemini-expense-trackerフォルダを自動作成
- 年別・月別フォルダ階層の自動生成
- 領収書画像の整理された保存

### 🎯 完全自動化
- Google Cloud設定だけで利用開始
- フォルダ・ファイル・集計表の完全自動生成
- 手動操作一切なし

## 🏗️ アーキテクチャ

### 現在の実装（Service Account）

```
Frontend (React) → Backend (Express) → Google Workspace APIs
                                       ├── Google Sheets API
                                       ├── Google Drive API
                                       └── Google Gemini API
```

**認証方式**: Service Account (アプリ所有の認証情報)
- 利点: 設定が簡単、API制限なし
- 制約: アプリ所有のGoogleアカウントを使用

### 将来の実装（OAuth 2.0）

```
Frontend (React) → Google OAuth 2.0 → Backend (Express) → Google Workspace APIs
                                       ├── Google Sheets API (ユーザー所有)
                                       ├── Google Drive API (ユーザー所有)
                                       └── Google Gemini API
```

**認証方式**: OAuth 2.0 (ユーザー自身の認証情報)
- 利点: **100%ユーザーのデータ所有権**
- 特徴: ユーザーがGoogleアカウントでログインし、自身のDrive/Sheetsに直接アクセス

## 📋 現在の実装範囲

### ✅ 完了済み機能

#### 1. AI経費抽出
- Gemini AIによる領収書画像解析
- 自動金額・日付・店舗名抽出
- リアルタイム分類結果表示

#### 2. 年別ファイル管理
- 年度ごとにスプレッドシート自動作成（`2026_Expenses.xlsx`）
- Expenses/ Summary / Rules の3シート構成
- 月別集計式の自動挿入

#### 3. Rulesベース分類
- ユーザー定義ルールによる高精度分類
- 8つの初期サンプルルール
- 信頼度スコア付き

#### 4. Google Drive自動整理
- gemini-expense-trackerルートフォルダ自動作成
- 年別レシートフォルダ自動生成
- 月別サブフォルダ自動作成

#### 5. APIエンドポイント
```
POST   /api/initialize          # システム初期化
POST   /api/spreadsheet/:year   # 年別スプレッドシート取得/作成
GET    /api/rules/:year         # ルール取得
POST   /api/rules/:year         # ルール追加
POST   /api/expenses            # 支出データ保存
POST   /api/upload-receipt      # 領収書アップロード
GET    /api/config/folders      # フォルダ設定取得
```

### 🚧 開発中 / 今後実装予定

#### フロントエンド機能拡張
- Rules管理UI
- レシートアップロードUI
- レポート・グラフ表示

#### バックエンド機能拡張
- 複数年データ集計
- エクスポート機能
- バックアップ機能

## 🚀 クイックスタート（現在の実装）

### 1. Google Cloud プロジェクト設定

#### 1-1. プロジェクト作成
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成

#### 1-2. Service Account作成
1. **IAM & Admin > Service Accounts** を開く
2. **+ CREATE SERVICE ACCOUNT** をクリック
3. 名前を入力（例: `expense-service`）
4. **CREATE AND CONTINUE** をクリック
5. ロールは設定せず **DONE** をクリック

#### 1-3. キー作成とダウンロード
1. 作成したサービスアカウントをクリック
2. **Keys** タブを開く
3. **ADD KEY > Create new key** をクリック
4. **JSON** を選択して **CREATE** をクリック
5. JSONファイルがダウンロードされる

#### 1-4. API有効化
**APIs & Services > Library** で以下を有効化:
- Google Sheets API
- Google Drive API
- Gemini API

### 2. 環境設定

ダウンロードしたJSONファイルを開き、`.env`ファイルを編集：

```env
# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key
API_KEY=your_gemini_api_key

# Google Service Account（JSONファイルからコピー）
GOOGLE_CLIENT_EMAIL="your-service@project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
```

### 3. アプリケーション起動

```bash
# 依存関係インストール
npm install

# サーバー起動
npm run server

# 新しいターミナルで初期化テスト
npm run test:sheets
```

### 4. 初期化確認

実行すると以下が自動作成されます：

```
Google Drive
└─ gemini-expense-tracker/
    ├─ 2026_Expenses.xlsx
    │   ├─ Expenses（支出データ）
    │   ├─ Summary（集計表）
    │   └─ Rules（分類ルール）
    └─ 2026_Receipts/
        ├─ 2026-01/
        ├─ 2026-02/
        └─ ...（月別フォルダ）
```

## 🔮 将来の実装（OAuth 2.0）

### ユーザー体験の進化

#### 現在の方式（Service Account）
```
ユーザーの作業:
1. Google Cloud Consoleでサービスアカウント設定
2. JSONキーをダウンロードして.envに配置
3. npm run test:sheets で初期化

結果:
- データはアプリ所有のGoogleアカウントに保存
- ユーザーごとに異なるGoogleアカウントが必要
- セキュリティ的にアプリ提供者がデータにアクセス可能
```

#### 将来的方式（OAuth 2.0）
```
ユーザーの作業:
1. Googleアカウントでログイン
2. 許可ダイアログで承認

結果:
- データは100%ユーザー自身のGoogleアカウントに保存
- ユーザーのDrive/Sheetsに直接アクセス
- アプリ提供者は一切のデータにアクセス不可
- セキュリティ・プライバシーが完全に保護
```

### 技術仕様

#### OAuth 2.0 フロー
```
1. ユーザーが「Googleでログイン」ボタンをクリック
2. Google OAuth 2.0 認証画面にリダイレクト
3. ユーザーが権限を承認
4. アクセストークンを取得
5. ユーザーのDrive/Sheetsにアクセス
```

#### スコープ
```javascript
scopes: [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/userinfo.profile'
]
```

#### セキュリティ特性
- **Zero Trust**: アプリはユーザーのデータに一切アクセス不可
- **データ所有権**: 100%ユーザーの所有物
- **プライバシー保護**: 個人情報はユーザー自身のストレージのみ
- **アクセス制御**: ユーザーがいつでも権限を撤回可能

## 📊 データ構造

### スプレッドシート構造

#### Expensesシート
| 日付 | 金額 | カテゴリ | メモ | レシートURL |
|------|------|----------|------|-------------|
| 2024-01-15 | 1200 | 食費 | ランチ | https://drive.google.com/... |

#### Summaryシート（自動集計）
- 月別支出集計（1-12月）
- カテゴリ別支出集計（食費、交通費、日用品、娯楽、その他）

#### Rulesシート（学習データ）
| Keyword | Category | Confidence | Notes |
|---------|----------|------------|-------|
| ベローチェ | 地代家賃 | 95 | オフィス家賃 |
| Slack | 通信費 | 90 | サブスクリプション |

### Driveフォルダ構造

```
gemini-expense-tracker/
├─ 2026_Expenses.xlsx
├─ 2026_Receipts/
│   ├─ 2026-01/
│   │   └─ receipt_123456.jpg
│   ├─ 2026-02/
│   │   └─ receipt_789012.jpg
│   └─ 2026-12/
└─ 2027_Expenses.xlsx（翌年自動作成）
```

## 🛠️ 開発情報

### 技術スタック
- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Node.js + Express
- **AI**: Google Gemini 2.5 Flash Lite
- **Storage**: Google Sheets + Google Drive
- **Auth**: Service Account（現在）→ OAuth 2.0（将来）

### プロジェクト構造
```
gemini-expense-tracker/
├─ src/
│   ├─ components/     # Reactコンポーネント
│   ├─ services/       # APIサービス層
│   └─ types/          # TypeScript型定義
├─ server/             # Expressバックエンド
│   ├─ index.js        # メインサーバー
│   └─ configManager.js # 設定管理
├─ config/             # 設定ファイル（自動生成）
└─ public/             # 静的ファイル
```

### 開発コマンド
```bash
# 開発サーバー起動
npm run dev

# バックエンド起動
npm run server

# 両方同時に起動
npm run dev:full

# 初期化テスト
npm run test:sheets
```

## 🎯 本質的強さ

### コア設計思想：「人間の作業負荷が最小になる場所だけ、高知能を当てる」

**競合との差別化：**
- Freee / マネーフォワード：全処理を同一エンジン
  → 速いけど賢くない、または賢いけど使いづらい
- **ExpenseGPT**：タスク複雑度に応じた最適モデル選択
  → 体感速度 + 知的処理の完璧な両立

### モデル役割分担（実務AI設計）

| 処理 | モデル | 理由 |
|------|--------|------|
| レシートOCR / 自然文→JSON | **Flash** | 速い・安い・試行回数制約なし |
| Sheets 書き込み / 日常入力 | **Flash** | 体感即レスが正義 |
| 月次集計 / 傾向分析 | **Gemini 3** | 数十件まとめて意味解釈 |
| 別表A / 確定申告ガイド生成 | **Gemini 3** | 推論・構造化・説明が必要な"知的処理" |

## 📈 実装ロードマップ

### Phase A ✅（今）：Google Sheets 連携安定化
- Service Account認証の安定化
- UIからのセットアップ機能実装
- バックエンドAPIの堅牢化

### Phase B 🔄（次）：Flash → JSON → Sheets パイプライン完成
- レシート画像アップロードUI実装
- Gemini FlashでのOCR処理
- JSONデータ→Sheets自動書き込み
- リアルタイム分類結果表示

### Phase C 📋（3ヶ月後）：Gemini 3 で月次分析 + 別表A生成
- 月次・四半期レポート自動生成
- 支出傾向のAI分析
- 確定申告別表Aの自動作成
- 税務アドバイス機能

### Phase D 📋（6ヶ月後）：e-Tax ガイド統合
- 電子申告手順の自動生成
- 税務書類のチェック機能
- 提出前の最終確認システム

### Phase E 📋（1年後）：多言語対応 + スケーラビリティ
- 日本語 / 英語対応
- 複数ユーザー対応
- モバイルアプリ化
- クラウドネイティブアーキテクチャ

**ポイント：** ここまで来たら 「アプリ」から **「確定申告の相棒」** に昇格する。

### 従来ロードマップ（参考）

#### Phase 1 ✅（完了）
- 基本的なAI経費抽出
- 年別ファイル自動管理
- Google Drive自動整理

#### Phase 2 🔄（開発中）
- OAuth 2.0 認証実装
- フロントエンドUI改善
- 複数デバイス同期

#### Phase 3 📋（計画中）
- 複数ユーザー対応
- 高度なレポート機能
- モバイルアプリ化

## 🤝 貢献

IssueやPull Requestをお待ちしています！

## 📄 ライセンス

MIT License

## ⚠️ 注意事項

### 現在の実装について
- Service Account方式のため、データはアプリ所有のGoogleアカウントに保存されます
- 将来的にOAuth 2.0方式に移行予定です
- それまでの間、重要なデータは別途バックアップをおすすめします

### API制限
- Google Sheets API: 100秒間に100リクエスト
- Gemini API: 1分間に60リクエスト
- Drive API: 1分間に20リクエスト（アップロード）

---

**Gemini Expense Tracker** - AIとクラウドの力を借りて、経費管理を自動化する革命的なツール
