# Audit Risk Forecast Tracker　
-AI-powered tax audit risk forecasting platform

## Why this app exists — the hidden anxiety in tax filing

Individual business owners face a paradox.

Each transaction usually looks fine on its own.  
A cloud invoice, a meeting fee, a software subscription — all reasonable.

But when the tax office asks:

> “Why is your business structured like this?”

No single transaction can answer that question.

This is the real anxiety of tax filing:
not whether *one expense* is acceptable,
but whether the *entire business structure* is explainable.

---

## The core idea: from item-by-item to total story

Most accounting tools stop at this level:

- Categorize each transaction  
- Flag suspicious individual items  
- Show summaries for bookkeeping

That solves **local correctness**, but not **global explainability**.

This app flips the perspective.

Instead of asking:
> “Is this one expense okay?”

It asks:
> “When you look at the whole year,  
> does your business tell a coherent story?”

---

## What “Audit Forecast” actually means here

The Audit Forecast is not a judgment engine.
It does not say “this is illegal” or “this will be audited”.

It does something more practical:

- Aggregates transactions across the entire year
- Analyzes **ratios and structure**, not isolated entries
- Identifies areas where a tax officer is likely to ask:
  > “Why is this so high compared to your revenue?”

Example:

- Each meeting fee looks normal
- Each cloud cost looks justified
- **But together**, meeting fees account for 50% of revenue

The problem is not a single receipt.
The problem is whether the business model behind those numbers
can be explained clearly.

---

## The shift for the user

Before:

- “This transaction seems fine.”
- “That one is probably okay too.”
- → False sense of security

After:

- “Individually fine, but structurally unusual.”
- “I need to explain my business model, not just my receipts.”
- → Real preparedness

This is the moment of recognition the app is designed to create.

---

## How Gemini 3 is used (intentionally)

Gemini 3 is not used as a simple classifier or chatbot.

It is used to:

- Reason over **aggregated financial structures**
- Compare individual transactions *against the total picture*
- Generate **explanation paths**, not just labels

The model helps surface *why* something may need explanation,
not merely *what* category it belongs to.

---

## Why this matters

Tax filing is not about passing a checklist.
It is about being able to explain your numbers as a whole.

By making the “total story” visible,
this app turns anxiety into preparation.

Not automation for automation’s sake —
but clarity where it actually matters.

**Audit Risk Forecast Tracker** - 提出表は赤字を写すだけ。AI監査予報でリスクを予測し、事前対応。
Impact: 不安ゼロ、問い合わせ80%削減、社会全体の処理効率も向上。  
How it works: 赤字データをAIが解析 → 提出表自動生成 → 監査予報で事前対応  


## 🌟 主な特徴

### 🤖 AI監査予報

### 🤖 AI自動分類
- Google Gemini AIが領収書画像を解析
- 自動で金額・日付・店舗名を抽出
- ユーザー定義ルールによる入力補助

### 📊 年別自動管理
- 年ごとにスプレッドシートを自動作成
- 月別・カテゴリ別集計を自動計算
- 年度末に自動で新年度ファイル生成

### 📁 Google Drive自動整理
- gemini-expense-trackerフォルダを自動作成
- 年別・月別フォルダ階層の自動生成
- 領収書画像の整理された保存

### 🎯 最適化
- Google Cloud設定だけで利用開始
- フォルダ・ファイル・集計表の完全自動生成
- ユーザーが見慣れたスプレッドシートのDB使用


## 🏗️ アーキテクチャ

### ✅ 実装（OAuth 2.0）

```
Frontend (React) → Google OAuth 2.0 → Backend (Express) → Google Workspace APIs
                                       ├── Google Sheets API (ユーザー所有)
                                       ├── Google Drive API (ユーザー所有)
                                       └── Google Gemini API
```

**認証方式**: OAuth 2.0 (ユーザー自身の認証情報)
- 利点: **100%ユーザーのデータ所有権**
- 特徴: ユーザーがGoogleアカウントでログインし、自身のDrive/Sheetsに直接アクセス
- セキュリティ: アプリ提供者は一切のユーザーデータにアクセス不可


#### 1. AI経費抽出
- Gemini AIによる領収書画像解析
- 自動金額・日付・店舗名抽出
- リアルタイム分類結果表示

#### 2. 年別タブ管理
- 年度ごとにスプレッドシートタブ自動作成

#### 3. Rulesベース分類
- ユーザー定義ルールによる高精度分類

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


## 🚀 クイックスタート

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
    ├─ Gemini_Expenses.xlsx
    │   ├─ 2026_Expenses（支出データ）
    │   ├─ 2026_Income（売上データ）
    │   └─ Rules（分類ルール）
    └─ Receipts/
        ├─ 2026-01/
        ├─ 2026-02/
        └─ ...（月別フォルダ）
```

## ユーザー体験（OAuth 2.0）

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

#### Summaryシート３種（監査予報の「更新」ボタン押下タイミングで作成・再集計）
- Summary_Base → **事実の正規化レイヤー**
- Summary_Year_Total → **検算と財務視点**
- Summary_Account_History → **統計・異常検知の素材**

#### Rulesシート（学習データ）
| Keyword | Category | Confidence | Notes |
|---------|----------|------------|-------|
| ベローチェ | 地代家賃 | 95 | オフィス家賃 |
| Slack | 通信費 | 90 | サブスクリプション |

### Driveフォルダ構造

```
Gemini Expense Tracker/（ルートフォルダ）
├─ Gemini_Expenses.xlsx ← スプレッドシート　（年度別タブ内蔵）
├─ Receipts/
│   ├─ 2026-01/（月別フォルダ）
│   │   └─ receipt_123456.jpg
│   ├─ 2026-02/
│   │   └─ receipt_789012.jpg
│   └─ 2026-12/
│   ├─ 2027-01/ ← 翌年追加（前年データ保持）
│   └─ 2027-12/
```

### フォルダ作成順序

初期化時のフォルダ・ファイル作成順序：

1. **ルートフォルダ検索/作成**: `Gemini Expense Tracker/` フォルダ
2. **スプレッドシート作成**: `Gemini_Expenses.xlsx`（ルート配下に配置）
3. **Receiptsフォルダ作成**: `Receipts/` フォルダ
4. **月別フォルダ作成**: `2026-01/` から `2026-12/` まで一括作成

### 翌年対応挙動

次の年（例: 2027年）になってセットアップボタンを押した場合、または翌年日付のデータを入力した場合：

- **前年データ完全保持**: 2026年のタブは一切変更/削除されません
- **新規追加のみ**: 2027年用のタブを追加作成
- **独立運用**: 2026年と2027年のデータを並行して使用可能

#### 作成されるもの（2027年分）:
```
Gemini Expense Tracker/
├─ Gemini_Expenses.xlsx ✅（既存保持・2027タブ追加）
├─ Receipts/
│   ├─ 2026-01/ ~ 2026-12/ ✅（既存保持）
│   ├─ 2027-01/ ~ 2027-12/ 🆕（新規追加）
```

#### テスト実行例:
```bash
# 2027年初期化テスト
curl -X POST "http://localhost:3001/api/initialize?year=2027"
```

この設計により、年度末のデータ移行が不要で、年度をまたいだ長期運用が可能です。

## 🛠️ 開発情報

### 技術スタック
- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Node.js + Express
- **AI**: Google Gemini 2.5 Flash Lite + Google Gemini 3
- **Storage**: Google Sheets + Google Drive + Firebase
- **Auth**: OAuth 2.0

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

### コア設計思想：「AIは「判断」ではなく
“数値で検出した事実を、人間が説明できる形に翻訳する役割”に限定している」

**競合との差別化：**
- Freee / マネーフォワード
- 記帳・集計・申告を「速く・楽に」するツール
- → 作業効率は高いが
“なぜその数字が危ないか”までは教えない

- このアプリ
- AIで監査・リスクをシミュレーション
- 異常値・構成比・前年差をもとに
“突っ込まれる理由”を事前に可視化
- → 申告の正確さではなく、“説明力”を鍛えるプロダクト

### モデル役割分担（実務AI設計）

| 処理 | モデル | 理由 |
|------|--------|------|
| レシートOCR / 自然文→JSON | **Flash** | 速い・安い・試行回数制約なし |
| Sheets 書き込み / 日常入力 | **Flash** | 体感即レスが正義 |
| 監査予報 / 異常・リスク検知 / パターン逸脱分析 | **Gemini 3** | 推論・文脈理解・「違和感」を読む知的処理 |

## 📈 実装ロードマップ

### Phase A ✅（完了）：Google Sheets 連携安定化
- Service Account認証の実装完了
- UIからのセットアップ機能実装完了
- バックエンドAPIの堅牢化完了

### Phase B ✅（完了）：Flash → JSON → Sheets パイプライン完成
- レシート画像アップロードUI実装完了
- Gemini FlashでのOCR処理実装完了
- JSONデータ→Sheets自動書き込み実装完了
- リアルタイム分類結果表示実装完了

### Phase C ✅（完了）：別表A自動生成 + 税務チェックエンジン

**目標**: ユーザーが「あ、赤字のところだけ写せばいいのね」と思う状態を実現

**新しい構造（重要）**

1. **Sheets の役割（隠れた計算機）**
   - SUMIFS で勘定科目別集計
   - CategoryMapping で別表A項目に自動変換
   - API で JSON 吐き出し
   - ユーザーは直接見ない

2. **アプリ UI の役割（見える・転記対象）**
   - 「第一表」を 再現
   - 「第二表」を 再現
   - 数値はすべて Sheets API からバインド
   - hover で根拠表示：「この金額は◯◯費の合計」
   - 赤字項目のみを転記対象として強調

3. **ユーザーの最高のセリフ**
   > 「あ、赤字のところだけ写せばいいのね」

**重要な哲学**
- Sheets での印刷は NG（フォーマットズレで差し戻し）
- このアプリは「**転記ミスを根絶する装置**」
- 派手さではなく、静かに失敗を潰すツール

#### C1. 自動作成
- Google Sheets で勘定科目 → 項目の自動マッピング
- SUMIFS で機械的集計
- フォーマットの自動生成



**Phase C のゴール**
> 「レシート掘り返す必要ゼロ。シート見ながらe-Tax入力するだけ」

### Phase C-2 📋（実装中）：監査予報　最重要課題　Gemini３の見せ場

#### Step1 の設計：

✅ 「ユーザー自身の過去年平均との差」

つまり：

過去年平均との差 → ✅

例：
・売上前年差 +38%（過去3年平均との差 +2.4σ）
・地代家賃 比率 100%（過去年平均との差 +3.1σ）

自前データ使用

#### Step2 完全にローカル計算

異常値スコア = f(z_score, growth_rate, ratio)
構成比変動スコア = f(diff_ratio, variance)

Sheets内計算

「ルールベース監査モデル」


#「数学的に異常だけど、税務的には問題なし」
という“ハリボテAI”にならないために。
取るべき４系統データ
- ① 「構成比がおかしい」

売上に対して、〇〇費が多すぎない？

例：
売上 500万
地代家賃 400万（80%）

👉 統計的にじゃなく
👉 “常識的におかしい”
ここは z-score より
構成比 × 業種常識 ×前年比 の方が効く。

- ② 「急に増えてる」

去年まで年120万だった地代家賃が、今年いきなり300万？
これが一番、税務っぽい。
ここは：
成長率
前年差
z-score
全部が効く、王道ゾーン。

- ③ 「一貫性がない」

去年は通信費ほぼゼロ、今年だけ異様に多い
なのに売上は変わらない

👉 “何があった？”ってなるやつ

これは：

勘定科目の突然出現

使われ方の変化
で検知できる。

- ④ 「意図が透ける」

これが一番AIが苦手で、一番重要。
例：

12月にだけ消耗品費が爆増
50万円未満ギリギリの領収書が大量
家族っぽい支出が経費に混ざってる

👉 これは統計より構造と分布の歪み

月別分布
金額ヒストグラム
閾値直前集中

✅ 評価軸方式の説明

「税務調査で実際に見られる5つの視点（金額・前年比・統計的異常・構成比・変動幅）それぞれで最も目立つ項目を抽出し、複数の視点で異常と判定されたものを最重要リスクとします」
＝
「実務的」
「説明可能性が高い」
「AIが恣意的な判断をしていない」


#### Step3（Gemini）

※ 本ステップは Step1・2 の数値結果をもとに、AIがリスク要因を言語化したものです。

Chain-of-thought非開示ポリシー回避
説明責任
LLMは「解釈」と「文章生成」だけ

→ 法務・監査的に理想構成。

### Phase D 📋（実装予定）：e-Tax ガイド⇨Notionで作ってリンクを貼るだけ
- 現在の優先度外

### Phase E 📋（実装予定）：多言語対応 + スケーラビリティ
- 日本語 / 英語対応
- 複数ユーザー対応
- モバイルアプリ化
- クラウドネイティブアーキテクチャ


## 🤝 貢献

IssueやPull Requestをお待ちしています！

## 📄 ライセンス

MIT License

## ⚠️ 注意事項

### 現在の実装について
- データはアプリ所有のGoogleアカウント・ドライブに保存されます
- OAuth 2.0方式
- 重要なデータは適宜別途バックアップをおすすめします

### API制限
- Google Sheets API: 100秒間に100リクエスト
- Gemini API: 1分間に60リクエスト
- Drive API: 1分間に20リクエスト（アップロード）

---

# 監査予報（Audit Forecast）機能

**Title:**
*We reduced audit inquiries by predicting problematic classifications before submission*


## 概要

「監査予報」は、納税者の不安を軽減し、税務処理の効率化を目的としたアプリです。  
Gemini 3 の推論能力を活用し、取引データを解析して「質問されそうなポイント」と「対応策」を自動提示します。

「監査予報」は、納税者が提出するデータに対して、**事前に質問されそうなポイント**を予測する機能です。
単なる仕訳自動化ではなく、**ユーザーの不安解消と税務処理全体の効率化**を目的としています。

## 特徴
**Key Feature:**

* 監査予報タブ
* 質問可能性スコア（🟢🟡🔴）
* Gemini 3 推論

### 1. 不安を「準備」に変換

* 数字や科目の分類に対する不安やモヤモヤを可視化
* 「質問される可能性」を評価し、対応方法を提案
* ユーザーは事前に確認・修正可能

### 2. 推論プロセスの透明化

* Gemini 3 の推論力を活用
* なぜその分類になったかの**根拠**を提示
* 例：

  ```
  AWS $1,200 → 外注費
  根拠：クラウド基盤として事業で使用
  推奨対応：契約書で利用目的を確認
  ```

### 3. 社会的インパクト

**Impact:**

* **納税者:** 不安ゼロ、事前確認で安心
* **税務フロー:** 問い合わせ件数削減
* **社会:** 税務処理の効率化

* 納税者：不安解消、確認時間短縮
* 税務処理フロー：問い合わせ件数削減
* 社会全体：税務処理の効率向上

### 4. 視覚化とユーザー体験

* 「質問の可能性」をスコア化：🟢低 / 🟡中 / 🔴高
* 対応テンプレートを提示、hoverで根拠表示
* 不安を準備アクションに変換するUX

## 価値提案（Value Proposition）

* 単なる自動化ではなく、**税務処理全体の最適化**を実現
* ユーザーの行動に直結するフィードバックを提供
* 推論能力を活かしたUX

- **目的:** 納税者が安心して申告できる
- **副産物:** 関係部署の問い合わせ量を削減し、社会全体の効率化に貢献
- **技術:** Gemini 3, 自動分類・推論ロジック




2026/01/17

## Design Philosophy: Audit Forecast as Reasoning Support

This application does **not** use AI to decide whether a transaction is “OK” or “NG”.

Instead, it uses Gemini 3 to support **explanation responsibility** —  
helping users understand *what questions are likely to be asked* and *how to structure their own explanations*.

---

## What Gemini 3 Reasons Over (Not Single Transactions)

The core reasoning target is **not a single expense**, but the intersection of:

- Amount (e.g. ¥5,500,000)
- Expense category (e.g. Rent / Lease)
- Overall business structure
- Tax audit perspective (what tax officers tend to question)

In other words, Gemini reasons over:

Amount × Category × Business Model × Tax Perspective
→ Potential discussion points and risk factors


This shifts the focus from item-by-item validation  
to **whether the total business structure can be reasonably explained**.

---

## Output Is Not a Judgment, but a Structured Checklist

Gemini 3 is intentionally **not asked to judge correctness**.

It is used to generate:

- Points that are likely to be checked by the tax office
- Key aspects the user should organize in advance
- Typical angles from which explanations are requested

The output is a **thinking scaffold**, not a conclusion.

---

## Human-in-the-Loop Responsibility Model

The responsibility flow is explicitly designed as:

- **AI**: Enumerates and structures potential audit viewpoints  
- **User**: Applies those viewpoints to their own actual business context  
- **Result**: A coherent, explainable narrative the user can stand behind

This ensures that:
- The AI does not replace human accountability
- The user remains the final decision-maker
- The system is viable for real-world tax workflows

---

## Why This Matters (Social Implementation)

Most tax-related anxiety does not come from individual transactions,  
but from the fear of being unable to explain the **overall story** of the business.

This project reframes AI from:
- “Automating tax filing”
to
- **“Supporting explanation readiness”**

By doing so, it improves:
- User confidence
- Audit communication quality
- Overall efficiency of tax administration

This aligns with Gemini 3’s role as a **reasoning engine**,  
supporting complex human decision-making rather than replacing it.
