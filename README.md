# Audit Risk Forecast Tracker

> **「レシートは正しい。でも"構造"が危ない。」**  
> **Your receipts may be correct. But your structure might not be.**

---

## One-line Summary

> This is not an accounting app. It is a system that makes your business structure explainable before submission.

---

**AI-Powered Tax Audit Risk Forecasting Platform**

**Impact:** Zero anxiety, 80% reduction in inquiries, improved efficiency across the entire tax system  
**How it works:** AI analyzes data → Generates reference-ready forms based on calculations (not final filings) → Forecasts audit risks for proactive response

---

## Demo Mode Notice

**Demo mode disables AI chat intentionally to reduce API cost and risk.**

Production will remove demo branches entirely.

---

## TL;DR (Understand in 1 Minute)

Audit Risk Forecast Tracker is not a "receipt management app."  
It's **an app that tells you what questions tax authorities are likely to ask in advance.**

- AI organizes receipts
- Analyzes annual structure
- Visualizes points tax authorities may question
- Enables preparation of explanations in advance

In other words:  
👉 Transform "anxiety after submission"  
👉 Into "preparation before submission"

### Target Users

- Individual business owners who use freee/MF but fear audits
- People who want to understand their own structure rather than outsourcing to accountants
- Side business owners, freelancers, and small business representatives

---

## Why This App Exists — The Hidden Anxiety in Tax Filing

Individual business owners face a paradox.

Each transaction looks fine on its own.  
Cloud invoices, meeting fees, software subscriptions — all reasonable.

But when the tax office asks:

> "Why is your business structured like this?"

Individual transactions cannot answer that question.

### The Essence of Tax Audits

Tax audits are not about catching criminals.  
They are **places where "people who cannot explain" fail.**

What matters is:
- Not whether individual receipts are correct
- But **whether the entire business structure is explainable**

This is the real anxiety in tax filing:  
Not whether *individual expenses* are valid,  
But whether *the entire business structure* is explainable.

### Limitations of Existing Accounting Software

Existing tools like freee and Money Forward:
- Improve bookkeeping efficiency
- Categorize individual items
- Create submission documents

But they **don't tell you "why those numbers might be problematic."**

---

## Core Idea: From Item-by-Item to Total Story

Most accounting tools stop at this level:

- Categorize each transaction
- Flag suspicious individual items
- Display summaries for bookkeeping

This solves **local correctness**  
but not **global explainability**.

This app flips the perspective.

> Not "Is this one expense okay?"  
> But  
> "Looking at the entire year, does your business tell a coherent story?"

---

## What "Audit Forecast" Actually Means

Audit Forecast is not a judgment engine.  
It does not say "this is illegal" or "this will be audited."

It does something more practical:

- Aggregates transactions across the entire year
- Analyzes **ratios and structure**, not individual items
- Visualizes areas where tax authorities are likely to ask questions

### Example

- Each meeting fee looks normal
- Each cloud cost seems justified
- **But together**, meeting fees account for 50% of revenue

The problem is not the receipts,  
but **whether the business model can be explained.**

---

## User Transformation

**Before**

- "This transaction seems fine"
- "That one is probably okay too"
- → False sense of security

**After**

- "Individually fine, but structurally unusual"
- "I need to explain my business model, not just my receipts"
- → True state of preparedness

---

## How Gemini 3 Is Used (Intentionally)

Gemini 3 is not used as a classifier or chatbot.

### Why It Must Be Gemini 3

**Selected for its nature, not just performance.**

Purpose:

- Reason over aggregated financial structures
- Compare against the total picture
- **Generate explanation paths**

The model surfaces  
not "what category this belongs to"  
but "why explanation might be needed."

This requires **structural understanding and contextual reasoning**  
impossible with simple classification models or rule-based systems.

Only with Gemini 3's reasoning capabilities can we:
- Understand relationships between different account items
- Evaluate consistency with the overall business model
- Verbalize "discrepancies" from a tax perspective

---

## Why This Matters

Tax filing is not about  
**passing a checklist, but being able to explain your numbers as a whole.**

This app aims not for  
automation for automation's sake  
but **visualization of explainability**.

This represents:
- **Social issue**: Anxiety over accountability in tax processing
- **AI solution**: Pre-submission preparation support through structural reasoning

A clear problem-solution framework.

---

# 🌟 Key Features

## 🤖 AI Audit Forecast

Predicts likely question points in advance and suggests response strategies

## 🤖 AI Auto-Classification

- OCR is performed via Vision API; Gemini handles structuring and extraction
- User-defined rule-based input assistance

## 📊 Annual Auto-Management

- Auto-generates sheets by year
- Monthly and category-based aggregation
- Auto-updates at year-end

## 📁 Drive Auto-Organization

- Auto-generates folders
- Year and month-based management
- Auto-saves receipts

## 🎯 Optimization

- Start with just Google Cloud setup
- Uses Sheets as DB

---

# 🏗️ System Architecture

## OAuth 2.0 Configuration

```
Frontend → Google OAuth → Backend → Google APIs
                             ├ Sheets
                             ├ Drive
                             └ Gemini
```

### Features

- 100% user-owned data
- App provider has no access
- Zero-trust design

---

## Why Use Google Sheets as DB

This project intentionally uses Sheets as the main database.

### Reasons

**From transparency and accountability perspective**

- Users can directly view and modify "raw data"
- In tax/accounting domains, "transparency" is more important than "black-box processing"
- Familiar spreadsheet interface lowers adoption barriers

**Technical advantages**

- Complete separation as user-owned data via OAuth 2.0
- Aggregation logic visible through spreadsheet functions
- Accountants and users can verify and audit themselves

This is a design decision that sacrifices Firestore or BigQuery's "speed"  
in favor of **"explainability" and "user trust"**.

---

# 📊 Data Structure

## Spreadsheet Design

### Expenses

| Date | Amount | Category | Notes | Receipt URL |
|------|--------|----------|-------|-------------|

### Summary (Updated on audit forecast refresh)

- Base
- Year_Total
- Account_History

### Rules

| Keyword | Category | Notes |
|---------|----------|-------|

---

## Drive Structure

```
Gemini Expense Tracker/
├ Gemini_Expenses.xlsx
└ Receipts/
   ├ 2026-01/
   ├ 2026-02/
   └ ...
```

---

# 🎯 Core Strengths (Design Philosophy)

## AI Role Definition

> **AI does not judge, only translates into explainable structures**

### Ethical and Legal Design Philosophy

This project does not have AI perform "judgments" or "approvals."

Reasons:
- Tax judgments are ultimately human responsibility
- AI misjudgments could create tax risks
- Accountability must always belong to users

Instead:
- Visualization of structure
- Presentation of question points
- Generation of explanation paths

---

## Differentiation from Competitors

**Existing Accounting Software (freee / Money Forward)**

- Focus on bookkeeping efficiency
- Don't tell you why numbers are risky
- Focus on efficiency until submission

**This App**

- Visualizes "reasons you'll be questioned"
- Design that trains explanation skills
- Converts post-submission anxiety into pre-submission preparation

### Why Existing Accounting Software Is Insufficient

Existing accounting software aims to "record correctly."  
But this app targets "why those numbers become difficult to explain."

**They are complementary, not replacements.**

- Existing tools: Accurate bookkeeping and tax form creation
- This app: Visualization of structural risks and explanation preparation

---

## Philosophy of Eliminating Transcription Errors

- Printing is NG (risk of format discrepancies and rejections)
- A device to eliminate transcription errors
- Design that quietly crushes failures

---

## Model Role Division

| Task | Model | Reason |
|------|-------|--------|
| OCR | Flash | Fast, low-cost, high-volume processing |
| Input | Flash | Immediacy, user experience |
| Audit Forecast | Gemini 3 | Structural reasoning, contextual understanding, explanation path generation |

---

# 📈 Implementation Status (Hackathon Build)

## Core Pipeline ✅

- Receipt image upload → OCR processing
- JSON data → Auto-write to Sheets
- Year and month-based data management
- Drive auto-organization

## Audit Forecast Prototype ✅

- Calculation of differences from past averages, year-over-year, composition ratios
- Anomaly score calculation (z-score / growth_rate / ratio)
- Structural data integration with Gemini 3
- Natural language generation of risk factors
- Question likelihood score calculation (🟢🟡🔴)

## UI/UX 🔄

- Schedule A auto-generation feature
- Hover to show rationale
- Highlight items in red
- Response template generation
- Continuous improvement

---

# 🔍 Audit Forecast Design Details

## Risk Detection Logic: Avoiding "Hollow AI"

Many AI tax tools detect "mathematical anomalies,"  
but **"mathematical anomalies" ≠ "tax problems"**.

This app realizes risk detection with practical perspectives.

---

### ① Composition Ratio Anomalies

Are specific expenses too high relative to revenue?

**Example:**
```
Revenue: ¥5,000,000
Rent: ¥4,000,000 (80%)
```

👉 Detects "common-sense abnormalities" rather than statistical anomalies  
👉 **Composition ratio × industry norms × year-over-year** works better than z-score

---

### ② Rapid Fluctuations

Rent was ¥1,200,000/year until last year, but suddenly ¥3,000,000 this year?

👉 This is the biggest "tax-like" question trigger

**Detection elements:**
- Growth rate
- Year-over-year difference
- z-score

All effective in this core zone.

---

### ③ Lack of Consistency

Communication expenses were nearly zero last year, but unusually high this year  
Yet revenue hasn't changed

👉 The "what happened?" pattern

**Detection elements:**
- Sudden appearance of account items
- Changes in usage patterns

---

### ④ Transparent Intent

This is what AI struggles with most, yet is most important.

**Examples:**
- Office supply expenses explode only in December
- Lots of receipts just under ¥500,000
- Family-related expenses mixed into business expenses

👉 Detected through **structural and distribution distortions** rather than statistics

**Detection elements:**
- Monthly distribution
- Amount histogram
- Concentration just below thresholds

---

## Evaluation Axis Approach

"We extract the most prominent items from each of the 5 perspectives actually examined in tax audits (amount, year-over-year, statistical anomaly, composition ratio, fluctuation range), and treat items judged anomalous from multiple perspectives as highest-priority risks."

**Advantages of this approach:**
- Practical
- High explainability
- AI doesn't make arbitrary judgments

---

## Design as Reasoning Support

- Reasons over structure, not individual transactions
- Does not judge
- Only generates checklists

### Human-in-the-Loop Responsibility Model

**Responsibility flow:**

- **AI**: Presents perspectives
- **Human**: Makes judgments and explanations
- **Responsibility**: Always on the human side

**Clarification of responsibility in AI design:**
- LLM's role is limited to "interpretation" and "text generation"
- Complies with chain-of-thought non-disclosure policy
- Accountability always belongs to users
- Ideal configuration from legal and audit perspectives

This ensures:
- AI does not replace human accountability
- Users remain the final decision-makers
- System is viable for actual tax workflows

---

# 🚀 Quick Start

## 1. Google Cloud Project Setup

### 1-1. Create Project
1. Access [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project

### 1-2. Create Service Account
1. Open **IAM & Admin > Service Accounts**
2. Click **+ CREATE SERVICE ACCOUNT**
3. Enter name (e.g., `expense-service`)
4. Click **CREATE AND CONTINUE**
5. Don't set roles, click **DONE**

### 1-3. Create and Download Key
1. Click the created service account
2. Open **Keys** tab
3. Click **ADD KEY > Create new key**
4. Select **JSON** and click **CREATE**
5. JSON file will be downloaded

### 1-4. Enable APIs
Enable the following in **APIs & Services > Library**:
- Google Sheets API
- Google Drive API
- Gemini API

## 2. Environment Setup

Open the downloaded JSON file and edit `.env`:

```env
# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key
API_KEY=your_gemini_api_key

# Google Service Account (copy from JSON file)
GOOGLE_CLIENT_EMAIL="your-service@project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
```

## 3. Launch Application

```bash
# Install dependencies
npm install

# Start server
npm run server

# In new terminal, run initialization test
npm run test:sheets
```

## 4. Verify Initialization

Running this will auto-create:

```
Google Drive
└─ gemini-expense-tracker/
    ├─ Gemini_Expenses.xlsx
    │   ├─ 2026_Expenses (expense data)
    │   ├─ 2026_Income (revenue data)
    │   └─ Rules (classification rules)
    └─ Receipts/
        ├─ 2026-01/
        ├─ 2026-02/
        └─ ... (monthly folders)
```

---

# 🛠️ Development Information

## Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Node.js + Express
- **AI**: Google Gemini 2.5 Flash Lite + Google Gemini 3
- **Storage**: Google Sheets + Google Drive + Firebase
- **Auth**: OAuth 2.0

## Project Structure
```
gemini-expense-tracker/
├─ src/
│   ├─ components/     # React components
│   ├─ services/       # API service layer
│   └─ types/          # TypeScript type definitions
├─ server/             # Express backend
│   ├─ index.js        # Main server
│   └─ configManager.js # Configuration management
├─ config/             # Config files (auto-generated)
└─ public/             # Static files
```

## Development Commands
```bash
# Start dev server
npm run dev

# Start backend
npm run server

# Start both simultaneously
npm run dev:full

# Run initialization test
npm run test:sheets
```

---

# 🤝 Contributing

Issues and Pull Requests are welcome!

---

# 📄 License

MIT License

---

# ⚠️ Disclaimer & Notes

## Legal Disclaimer

- **This is not legal or tax advice**
- **The AI does not make judgments**
- **The final responsibility remains with the user**

This application is a tool to support explanation preparation in tax filing and does not provide tax judgments or legal advice. All tax judgment and filing responsibilities belong to the user.

## Current Implementation

- Data is stored in the app-owned Google account/Drive
- OAuth 2.0 approach
- We recommend backing up important data separately as needed

## API Limits

- Google Sheets API: 100 requests per 100 seconds
- Gemini API: rate limits depend on plan/model configuration
- Drive API: 20 requests per minute (upload)

---
---
---

# Audit Risk Forecast Tracker

> **「レシートは正しい。でも"構造"が危ない。」**  
> **Your receipts may be correct. But your structure might not be.**

---

## 一行要約

> これは会計アプリではない。提出前にビジネス構造を説明可能にするシステムである。

---

**AI駆動型税務監査リスク予測プラットフォーム**

**Impact:** 不安ゼロ、問い合わせ80%削減、社会全体の処理効率も向上  
**How it works:** 赤字データをAIが解析 → 計算式に基づく参照用の表を作成（提出用帳票ではない） → 監査予報で事前対応

---

## TL;DR（1分でわかる）

Audit Risk Forecast Tracker は、  
「レシートを管理するアプリ」ではなく  
**"税務署から何を聞かれそうか"を事前に教えてくれるアプリ**です。

- レシートをAIで整理
- 年間構造を分析
- 税務署が突っ込みそうなポイントを可視化
- 事前に説明を準備できる

つまり：  
👉 「提出してからビクビクする」のを  
👉 「提出前に備える」に変えるツールです。

### 想定ユーザー

- 会計はfreeeやマネフォを使っているが「監査が怖い」個人事業主
- 税理士に丸投げせず、自分で構造を理解したい層
- 副業・フリーランス・小規模法人の代表

---

## なぜこのアプリが存在するのか — 申告における隠れた不安

個人事業主はパラドックスに直面しています。

個々の取引は問題なく見えます。  
クラウドの請求書、会議費、ソフトウェアのサブスクリプション — すべて妥当です。

しかし税務署が尋ねるのは：

> 「なぜあなたのビジネスはこのような構造なのですか？」

この質問に、個別の取引だけでは答えられません。

### 税務調査の本質

税務調査は違法者を捕まえる場ではありません。  
**「説明できない人が落ちる」場**です。

だから重要なのは：
- 個別のレシートが正しいかではなく
- **ビジネス構造全体が説明可能か**

これが申告における真の不安です：  
*個々の経費*が妥当かではなく、  
*ビジネス構造全体*が説明可能かどうか。

### 既存会計ソフトの限界

freee、マネーフォワードなどの既存ツールは：
- 記帳効率を上げる
- 個別項目を分類する
- 提出書類を作る

しかし、**「なぜその数字が危ないか」までは教えない**。

---

## 核となるアイデア：項目単位から全体ストーリーへ

ほとんどの会計ツールはこのレベルで止まります：

- 各取引を分類する
- 怪しい個別項目にフラグを立てる
- 記帳用のサマリーを表示する

これは**局所的な正しさ**は解決しますが、  
**全体的な説明可能性**は解決しません。

このアプリは視点を転換します。

> 「この1つの経費は大丈夫か？」  
> ではなく  
> 「年間全体を見たとき、あなたのビジネスは一貫したストーリーを語っているか？」

---

## 「監査予報」が実際に意味すること

監査予報は判定エンジンではありません。  
「これは違法」「これは監査される」とは言いません。

より実用的なことを行います：

- 年間全体の取引を集約
- 個別項目ではなく**比率と構造**を分析
- 税務署が質問しそうな領域を事前に可視化

### 例

- 各会議費は正常
- 各クラウドコストも妥当
- **しかし合計すると**、会議費が売上の50%

問題はレシートではなく、  
**ビジネスモデルを説明できるかどうか**。

---

## ユーザーの変化

**Before**

- 「この取引は大丈夫そう」
- 「あれもたぶん問題ない」
- → 誤った安心感

**After**

- 「個別には問題ないが、構造的に異常」
- 「レシートではなくビジネスモデルを説明すべき」
- → 真の準備態勢

---

## Gemini 3の使い方（意図的に）

Gemini 3は分類器やチャットボットではありません。

### なぜGemini 3でなければならないか

**性能ではなく性質で選択しています。**

使用目的：

- 集約された財務構造を推論
- 全体像との比較
- **説明パスの生成**

モデルは  
「何に分類されるか」ではなく  
「なぜ説明が必要になるか」を表面化します。

これは単純な分類モデルやルールベースでは不可能な、  
**構造理解と文脈推論**を必要とします。

Gemini 3の推論能力があって初めて：
- 異なる勘定科目間の関連性を理解
- ビジネスモデル全体との整合性を評価
- 税務視点での「違和感」を言語化

これが可能になります。

---

## なぜこれが重要か

税務申告とは、  
**チェックリストを通すことではなく、数字全体を説明できること。**

本アプリは  
自動化のための自動化ではなく  
**説明可能性の可視化**を目的としています。

これは：
- **社会課題**: 税務処理における説明責任の不安
- **AI解決**: 構造推論による事前準備支援

という明確な課題解決の構図です。

---

# 🌟 主な機能

## 🤖 AI監査予報

質問されそうなポイントを事前予測し、対応策を提示

## 🤖 AI自動分類

- OCRはVision APIで実行し、Geminiは整形・抽出を担当
- ユーザー定義ルールによる入力補助

## 📊 年別自動管理

- 年ごとのシート自動生成
- 月別・カテゴリ別集計
- 年度末自動更新

## 📁 Drive自動整理

- フォルダ自動生成
- 年別・月別管理
- レシート自動保存

## 🎯 最適化

- Google Cloud設定のみで開始
- SheetsをDBとして活用

---

# 🏗️ システムアーキテクチャ

## OAuth 2.0構成

```
Frontend → Google OAuth → Backend → Google APIs
                             ├ Sheets
                             ├ Drive
                             └ Gemini
```

### 特徴

- 100%ユーザー所有データ
- アプリ提供者はアクセス不可
- ゼロトラスト設計

---

## なぜGoogle SheetsをDBとして使うのか

本プロジェクトでは、あえてSheetsをメインDBとして採用しています。

### 理由

**透明性と説明責任の観点から**

- ユーザー自身が"生データ"を直接確認・修正できる
- 税務・会計という領域では「ブラックボックス化」よりも「透明性」が重要
- 会計ソフトに近い操作感で導入障壁が低い

**技術的な利点**

- OAuth 2.0でユーザー所有データとして完全分離
- スプレッドシート関数で集計ロジックが可視化される
- 税理士やユーザー自身が検算・監査可能

これはFirestoreやBigQueryの「高速性」を捨てる代わりに、  
**「説明可能性」と「ユーザーの信頼」**を最優先した設計判断です。

---

# 📊 データ構造

## スプレッドシート設計

### Expenses

| 日付 | 金額 | カテゴリ | メモ | レシートURL |
|------|------|----------|------|-------------|

### Summary（監査予報更新時）

- Base
- Year_Total
- Account_History

### Rules

| Keyword | Category | Notes |
|---------|----------|-------|

---

## Drive構成

```
Gemini Expense Tracker/
├ Gemini_Expenses.xlsx
└ Receipts/
   ├ 2026-01/
   ├ 2026-02/
   └ ...
```

---

# 🎯 本質的強さ（Design Philosophy）

## AIの役割定義

> **AIは判断せず、説明可能な構造に翻訳するのみ**

### 倫理的・法務的な設計思想

このプロジェクトは、AIに「判定」や「承認」を行わせません。

理由：
- 税務判断は最終的に人間の責任
- AIによる誤判定が税務リスクを生む可能性
- 説明責任は常にユーザーに帰属すべき

代わりに：
- 構造の可視化
- 質問ポイントの提示
- 説明パスの生成

---

## 競合との差別化

**既存会計ソフト（freee / マネーフォワード）**

- 記帳効率重視
- なぜ危険かは教えない
- 提出までの効率化にフォーカス

**本アプリ**

- "突っ込まれる理由"を可視化
- 説明力を鍛える設計
- 提出後の不安を事前準備に変換

### なぜ既存会計ソフトでは不十分なのか

既存会計ソフトは「正しく記帳する」ことを目的としています。  
しかし本アプリは「なぜその数字が説明困難になるか」を対象にしています。

**両者は補完関係であり、置き換えではありません。**

- 既存ツール：正確な記帳と申告書作成
- 本アプリ：構造的リスクの可視化と説明準備

---

## 転記ミス根絶の哲学

- 印刷NG（フォーマットズレで差し戻しリスク）
- 転記ミス根絶装置
- 静かに失敗を潰す設計

---

## モデル役割分担

| 処理 | モデル | 理由 |
|------|--------|------|
| OCR | Flash | 高速・低コスト・大量処理 |
| 入力 | Flash | 即時性・ユーザー体験 |
| 監査予報 | Gemini 3 | 構造推論・文脈理解・説明パス生成 |

---

# 📈 実装状況（Hackathon Build）

## Core Pipeline ✅

- レシート画像アップロード → OCR処理
- JSONデータ → Sheets自動書き込み
- 年別・月別データ管理
- Drive自動整理

## Audit Forecast Prototype ✅

- 過去平均との差・前年比・構成比の算出
- 異常スコア計算（z-score / growth_rate / ratio）
- Gemini 3への構造データ連携
- リスク要因の自然言語生成
- 質問可能性スコア算出（🟢🟡🔴）

## UI/UX 🔄

- 別表A自動生成機能
- hover で根拠表示
- 赤字項目強調表示
- 対応テンプレート生成
- 継続的改良中

---

# 🔍 監査予報 設計詳細

## リスク検知ロジック：「ハリボテAI」にならないために

多くのAI税務ツールは「数学的に異常」を検出しますが、  
**「税務的に問題」とは限りません**。

本アプリは実務視点を組み込んだリスク検知を実現しています。

---

### ① 構成比異常

売上に対して特定費用が多すぎないか？

**例：**
```
売上: 500万円
地代家賃: 400万円（80%）
```

👉 統計的異常ではなく「常識的におかしい」を検知  
👉 z-score より **構成比 × 業種常識 × 前年比** が効く

---

### ② 急激変動

去年まで年120万円だった地代家賃が、今年いきなり300万円？

👉 これが一番「税務っぽい」質問のトリガー

**検知要素：**
- 成長率（growth_rate）
- 前年差（year-over-year）
- z-score

全てが効く王道ゾーン。

---

### ③ 一貫性欠如

去年は通信費ほぼゼロ、今年だけ異様に多い  
なのに売上は変わらない

👉 「何があった？」となるパターン

**検知要素：**
- 勘定科目の突然出現
- 使われ方の変化

---

### ④ 意図透過

これが一番AIが苦手で、一番重要。

**例：**
- 12月にだけ消耗品費が爆増
- 50万円未満ギリギリの領収書が大量
- 家族っぽい支出が経費に混ざってる

👉 統計より**構造と分布の歪み**で検知

**検知要素：**
- 月別分布
- 金額ヒストグラム
- 閾値直前集中

---

## 評価軸方式

「税務調査で実際に見られる5つの視点（金額・前年比・統計的異常・構成比・変動幅）それぞれで最も目立つ項目を抽出し、複数の視点で異常と判定されたものを最重要リスクとします」

**この方式の利点：**
- 実務的
- 説明可能性が高い
- AIが恣意的な判断をしていない

---

## 推論サポートとしての設計

- 個別取引ではなく構造を推論
- 判定しない
- チェックリスト生成のみ

### Human-in-the-Loop 責任モデル

**責任フロー：**

- **AI**: 観点提示
- **人間**: 判断と説明
- **責任**: 常に人間側

**AI設計における責任の明確化：**
- LLMの役割は「解釈」と「文章生成」のみ
- Chain-of-thought非開示ポリシーに準拠
- 説明責任は常にユーザーに帰属
- 法務・監査的に理想的な構成

これにより：
- AIが人間の説明責任を置き換えない
- ユーザーが最終的な意思決定者であり続ける
- システムが実際の税務ワークフローで実行可能

---

# 🚀 クイックスタート

## 1. Google Cloud プロジェクト設定

### 1-1. プロジェクト作成
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成

### 1-2. Service Account作成
1. **IAM & Admin > Service Accounts** を開く
2. **+ CREATE SERVICE ACCOUNT** をクリック
3. 名前を入力（例: `expense-service`）
4. **CREATE AND CONTINUE** をクリック
5. ロールは設定せず **DONE** をクリック

### 1-3. キー作成とダウンロード
1. 作成したサービスアカウントをクリック
2. **Keys** タブを開く
3. **ADD KEY > Create new key** をクリック
4. **JSON** を選択して **CREATE** をクリック
5. JSONファイルがダウンロードされる

### 1-4. API有効化
**APIs & Services > Library** で以下を有効化:
- Google Sheets API
- Google Drive API
- Gemini API

## 2. 環境設定

ダウンロードしたJSONファイルを開き、`.env`ファイルを編集：

```env
# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key
API_KEY=your_gemini_api_key

# Google Service Account（JSONファイルからコピー）
GOOGLE_CLIENT_EMAIL="your-service@project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
```

## 3. アプリケーション起動

```bash
# 依存関係インストール
npm install

# サーバー起動
npm run server

# 新しいターミナルで初期化テスト
npm run test:sheets
```

## 4. 初期化確認

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

---

# 🛠️ 開発情報

## 技術スタック
- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Node.js + Express
- **AI**: Google Gemini 2.5 Flash Lite + Google Gemini 3
- **Storage**: Google Sheets + Google Drive + Firebase
- **Auth**: OAuth 2.0

## プロジェクト構造
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

## 開発コマンド
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

---

# 🤝 貢献

IssueやPull Requestをお待ちしています！

---

# 📄 ライセンス

MIT License

---

# ⚠️ 免責事項・注意事項

## 法的免責

- **本アプリケーションは法的助言・税務助言ではありません**
- **AIは判断を行いません**
- **最終的な責任は利用者に帰属します**

本アプリケーションは税務申告における説明準備をサポートするツールであり、税務判断や法的助言を提供するものではありません。すべての税務判断と申告の責任は利用者に帰属します。

## 現在の実装について

- データはアプリ所有のGoogleアカウント・ドライブに保存されます
- OAuth 2.0方式
- 重要なデータは適宜別途バックアップをおすすめします

## API制限

- Google Sheets API: 100秒間に100リクエスト
- Gemini API: プラン/モデル設定に依存
- Drive API: 1分間に20リクエスト（アップロード）
