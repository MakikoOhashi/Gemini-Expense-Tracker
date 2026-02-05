import { GoogleGenAI } from "@google/genai";
import { AIResponse, AuditPrediction, AuditForecastItem, BookkeepingCheckItem, AnomalyDetection } from "../types.ts";
import { sheetsService } from "./sheetsService.ts";
import { authService } from "./authService.ts";

const API_URL = process.env.VITE_API_URL || 'http://localhost:3001';

// 税務調査対応アシスタントの出力形式
export interface TaxAuditResponse {
  taxAuthorityConcerns: string[];
  expectedQuestions: string[];
  userPreparationPoints: string[];
  nextActions: string[];
}

// クロスカテゴリーマッチインターフェース
interface CrossCategoryMatch {
  accountName: string;
  amount: number;
  date: string;
  merchant: string;
  daysDifference: number;
}

export class AuditService {
  /**
   * 監査対応チェックリストをAIに生成させる（issuesを元に3件）
   */
  async generateAuditPreparationChecklist(
    issues: string[],
    language: 'ja' | 'en' = 'ja'
  ): Promise<string[]> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      throw new Error("APIキーが設定されていません。環境変数を確認してください。");
    }

    if (!issues || issues.length === 0) return [];

    const ai = new GoogleGenAI({ apiKey });
    const modelName = 'gemini-3-pro-preview';

    const issueList = issues.map(i => `- ${i}`).join('\n');

    const systemInstruction = language === 'en'
      ? `You are a tax audit preparation assistant.

Given the following detected anomalies:
${issueList}

Generate 3 concise, practical actions a business owner should take
to prepare for a potential tax audit.

Rules:
- Do NOT restate any numbers.
- Focus on documentation and verification steps.
- Output ONLY a JSON array of 3 short strings.`
      : `あなたは税務監査の準備アシスタントです。

以下の検知された異常点があります：
${issueList}

税務調査に備えて事業者が取るべき実務的なアクションを3つ、簡潔に作成してください。

ルール:
- 数値の再掲はしないこと
- 資料の整理や検証手順に集中すること
- 出力は3件の短い文のみ（JSON配列のみ）`;

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("AI応答タイムアウト（15秒経過）。もう一度送信してみてください。")), 15000)
    );

    const generatePromise = ai.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts: [{ text: language === 'en'
        ? 'Generate the audit preparation checklist.'
        : '監査対応チェックリストを生成してください。' }] }],
      config: {
        systemInstruction,
        temperature: 0.6
      },
    });

    const response: any = await Promise.race([generatePromise, timeoutPromise]);
    const responseText = response.text;
    if (!responseText) throw new Error("AIから空の応答が返されました。");

    // まずJSON配列としてパース
    try {
      const parsed = JSON.parse(responseText);
      if (Array.isArray(parsed)) {
        return parsed.map(String).filter(Boolean).slice(0, 3);
      }
    } catch {
      // fallback: 行単位で抽出
    }

    const lines = String(responseText)
      .split('\n')
      .map(line => line.replace(/^\s*[-*\d.]+\s*/, '').trim())
      .filter(Boolean);
    return lines.slice(0, 3);
  }
  /**
   * 日次総括（taxAuthorityPerspective）をAIに生成させる
   * - 勘定科目ごとの文言生成はしない（この関数の返り値のみ）
   */
  async generateTaxAuthorityPerspective(
    forecastItems: AuditForecastItem[],
    language: 'ja' | 'en' = 'ja'
  ): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      throw new Error("APIキーが設定されていません。環境変数を確認してください。");
    }

    const ai = new GoogleGenAI({ apiKey });
    const modelName = 'gemini-3-pro-preview';

    const structuredData = forecastItems.map(item => ({
      accountName: item.accountName,
      totalAmount: item.totalAmount,
      ratio: item.ratio,
      detectedAnomalies: (item.detectedAnomalies || []).map(anomaly => ({
        dimension: anomaly.dimension,
        severity: anomaly.severity,
        fact: anomaly.fact || `値: ${anomaly.value}`,
        ruleDescription: anomaly.ruleDescription || '基準値超過',
        crossCategoryMatches: anomaly.crossCategoryMatches || null
      }))
    }));

    const systemInstruction = language === 'en'
      ? `You are an experienced tax auditor.

You are given facts detected by an accounting system (already classified anomalies).
Write ONLY a daily overview text (taxAuthorityPerspective) describing how tax authorities are likely to interpret these facts.

Constraints:
- Do NOT re-classify or add new topics. Use only detectedAnomalies facts.
- No extra calculations. Be neutral and non-accusatory.
- If crossCategoryMatches exist, mention them first as the strongest risk signal.

Data:
${JSON.stringify(structuredData, null, 2)}

Output: plain text only (no JSON/markdown). Length: ~200-450 chars.`
      : `あなたは経験豊富な税務調査官です。

以下は会計システムが自動検出した「異常構造の事実」です（分類は完了済み）。
あなたはこの事実が税務調査でどう見られやすいかを、日次の総括（taxAuthorityPerspective）として1つの文章で説明してください。

制約:
- 異常の再分類・再評価や追加の計算は不要です
- 断定は避け、中立的に「説明が求められやすい」観点で述べてください
- detectedAnomalies以外の論点を新規追加しないでください
- crossCategoryMatchesがあれば最優先で言及してください

データ:
${JSON.stringify(structuredData, null, 2)}

出力: プレーンテキストのみ（JSON/マークダウン禁止）。200〜450文字程度。`;

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("AI応答タイムアウト（15秒経過）。もう一度送信してみてください。")), 15000)
    );

    const generatePromise = ai.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts: [{ text: language === 'en'
        ? 'Generate the daily taxAuthorityPerspective overview.'
        : '日次の税務署視点の総括（taxAuthorityPerspective）を生成してください。' }] }],
      config: {
        systemInstruction,
        temperature: 0.7
      },
    });

    const response: any = await Promise.race([generatePromise, timeoutPromise]);
    const responseText = response.text;
    if (!responseText) throw new Error("AIから空の応答が返されました。");
    return String(responseText).trim();
  }

  // 異常検知済み構造データをAIに渡して解釈させる
  async analyzeAuditForecastWithStructure(forecastItems: AuditForecastItem[], enrichedStructuredData?: any[]): Promise<{
    accountName: string;
    aiSuspicionView: string;
    aiPreparationAdvice: string;
  }[]> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    console.log('🔑 GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
    console.log('🔑 API_KEY exists:', !!process.env.API_KEY);
    console.log('🔑 Using API key:', !!apiKey);
    console.log('🔑 API key length:', apiKey?.length);
    if (!apiKey) {
      throw new Error("APIキーが設定されていません。環境変数を確認してください。");
    }

    const ai = new GoogleGenAI({ apiKey });
    const modelName = 'gemini-3-pro-preview';

    // 検知済み異常を「事実」として整形（意味づけ前の情報のみ）
    const structuredData = forecastItems.map(item => ({
      accountName: item.accountName,
      totalAmount: item.totalAmount,
      ratio: item.ratio,
      detectedAnomalies: (item.detectedAnomalies || []).map(anomaly => ({
        dimension: anomaly.dimension,
        fact: anomaly.fact || `値: ${anomaly.value}`,              // 🆕 事実のみ
        ruleDescription: anomaly.ruleDescription || '基準値超過',   // 🆕 ルール説明のみ
        severity: anomaly.severity
      }))
    }));

    const systemInstruction = `あなたは経験豊富な税務調査官です。

以下のデータは、会計システムが自動検出した「異常構造の事実」です。
あなたの役割は、この事実が税務調査でどう見られやすいかを「文章として説明すること」だけです。

## 重要な制約
- 異常の分類・判定は完了済みです。再評価や再分類は不要です
- 数値の計算や追加の判定も不要です
- あなたは「この事実がどう見られるか」を言葉にするだけです
- 断定は避け、「〜の可能性があります」「〜と見られやすい」など可能性を示す表現を使ってください
- 「架空計上」「私的利用」などの断定的な用語は避け、「説明が求められやすい」「確認されやすい」など中立的な表現を使ってください
- **抽象的な一般論ではなく、必ず与えられたfactとruleに紐づけて説明してください**
- **detectedAnomalies以外の論点は新たに追加しないでください**

## 最重要指示：勘定科目横断の視点
**複数の勘定科目にまたがって、金額・日付・取引先が一致または近接している取引が検出されている場合、
それは最も重要な税務リスクシグナルです。**

このような科目横断の一致は：
- 単一科目の異常よりも優先して説明してください
- 「なぜ同じ取引先・同じ金額が別の勘定科目に計上されているのか」という疑問を中心に説明してください
- 取引の実在性や経理処理の妥当性が特に確認されやすいことを明示してください

crossCategoryMatchesフィールドがある場合、必ずそれを最優先で言及してください。

${JSON.stringify(structuredData, null, 2)}

## 出力形式

勘定科目ごとに、以下の形式で回答してください：

---
【勘定科目】地代家賃

${enrichedStructuredData && enrichedStructuredData.some(item => 
  item.detectedAnomalies?.some(a => a.crossCategoryMatches?.length > 0)
) ? `
【🔍 勘定科目横断で検出された重要事項】（最優先）
複数の勘定科目にまたがる取引の一致がある場合、ここで必ず説明してください。
` : ''}

【税務署からの見られ方】（100-150文字）
検出された異常構造を踏まえ、税務調査でどのように見られる可能性があるかを説明してください。

【準備すべきこと】（150-200文字）
この構造に対して、どのような説明や資料を準備すべきかを具体的に述べてください。
---

**重要**: 上記の形式で全勘定科目について記載してください。JSONやマークダウンコードブロックは不要です。`;

    console.log('[AI呼び出し直前]', {
      科目数: forecastItems.length,
      科目リスト: forecastItems.map(i => i.accountName),
      プロンプト長: systemInstruction.length,
      プロンプトプレビュー: systemInstruction.substring(0, 500)
    });

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("AI応答タイムアウト（15秒経過）。もう一度送信してみてください。")), 15000)
      );

      const generatePromise = ai.models.generateContent({
        model: modelName,
        contents: [{ role: 'user', parts: [{ text: `上記の異常検知済みデータを分析し、各勘定科目について税務調査の観点から解釈してください。` }] }],
        config: {
          systemInstruction,
          temperature: 1.0  // CRITICAL for cross-category reasoning
        },
      });

      const response: any = await Promise.race([generatePromise, timeoutPromise]);
      const responseText = response.text;

      if (!responseText) {
        throw new Error("AIから空の応答が返されました。");
      }

    // テキストレスポンスをパース（区切り文字で分割）
    const results = this.parseAITextResponse(responseText, forecastItems);

    console.log('[パース後]', {
      パース成功科目数: results.length,
      パース成功科目: results.map(r => r.accountName),
      未パース科目: forecastItems
        .filter(i => !results.find(r => r.accountName === i.accountName))
        .map(i => i.accountName)
    });

    return results;

  } catch (error: any) {
    console.error("AI Structure Analysis Error:", error);
    // Fallback: 基本的な解釈を返す
    return forecastItems.map(item => ({
      accountName: item.accountName,
      aiSuspicionView: 'AI解釈を取得できませんでした。検知された異常構造について、支出の妥当性を説明できる資料の準備が重要です。',
      aiPreparationAdvice: `${item.accountName}の契約書・領収書・使用実態を示す資料を整理し、事業との関連性を明確に説明できるよう準備してください。`
    }));
  }
  }

  async analyzeAuditForecast(transactions: any[], userId?: string): Promise<AIResponse> {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("APIキーが設定されていません。環境変数を確認してください。");
    }

    const ai = new GoogleGenAI({ apiKey });
    const modelName = 'gemini-3-pro-preview';

    // 取引データを構造化
    const transactionSummary = this.summarizeTransactions(transactions);

    const systemInstruction = `あなたはフリーランス・個人事業主向けの税務監査予報アシスタントです。

スプシのデータから、
数値の構成から推測される事業の特徴を踏まえ、
税務署が確認しやすい観点と
ユーザーが説明として整理すべきポイントを列挙してください。

## 分析対象データ
${JSON.stringify(transactionSummary, null, 2)}

## 必須要件
1. 事業の特徴を数値データから分析してください
2. 税務署が特に確認しそうなポイントを列挙してください
3. ユーザーが事前に準備すべき説明資料・根拠を整理してください
4. リスクの高い項目から優先順位を付けて提示してください

## 異常検知データ
以下の勘定科目について、なぜリスクが高いと判定されたか説明してください。

勘定科目: \${item.accountName}
金額: \${item.totalAmount}
支出比率: \${item.ratio}%
前年比成長率: \${item.growthRate}%
過去平均との乖離度（Z値）: \${item.zScore}

この数値から、税務署がどのような質問をする可能性があるか、
事業者はどう説明すべきかを示してください。

## 出力形式
以下のJSON形式で回答してください：
{
  "reply": "全体の分析概要とアドバイス",
  "actions": [
    {
      "type": "AUDIT_RISK",
      "data": {
        "category": "科目名",
        "riskLevel": "high|medium|low",
        "taxAuthorityConcerns": ["税務署の確認ポイント1", "確認ポイント2"],
        "userPreparationPoints": ["準備すべき説明1", "準備すべき説明2"],
        "recommendations": ["推奨アクション1", "推奨アクション2"]
      }
    }
  ]
}

**重要**: 純粋なJSONオブジェクト一つのみを返してください。`;

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("AI応答タイムアウト（15秒経過）。もう一度送信してみてください。")), 15000)
      );

      const generatePromise = ai.models.generateContent({
        model: modelName,
        contents: [{ role: 'user', parts: [{ text: '上記の取引データを分析し、監査予報を生成してください。' }] }],
        config: {
          systemInstruction,
          temperature: 0.3,
        },
      });

      const response: any = await Promise.race([generatePromise, timeoutPromise]);
      const responseText = response.text;

      console.log('[AI応答受信]', {
        応答長: responseText.length,
        応答プレビュー: responseText.substring(0, 1000),
        JSON判定: (() => {
          try {
            JSON.parse(responseText);
            return 'valid';
          } catch {
            return 'invalid';
          }
        })()
      });

      if (!responseText) {
        throw new Error("AIから空の応答が返されました。");
      }

      // JSON抽出ロジック
      const jsonStart = responseText.indexOf('{');
      const jsonEnd = responseText.lastIndexOf('}');

      if (jsonStart === -1 || jsonEnd === -1) {
        return {
          reply: responseText,
          actions: []
        };
      }

      const jsonStr = responseText.substring(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(jsonStr);

      return {
        reply: parsed.reply || "監査予報を生成しました。",
        actions: Array.isArray(parsed.actions) ? parsed.actions : []
      };

    } catch (error: any) {
      console.error("Audit Service Error Detail:", error);
      let errorMessage = error.message || "不明なエラーが発生しました。";

      if (errorMessage.includes("fetch")) errorMessage = "ネットワークエラー。接続を確認してください。";
      if (errorMessage.includes("429")) errorMessage = "リクエスト上限に達しました。1分ほど待ってから再試行してください。";
      if (errorMessage.includes("403")) errorMessage = "APIキーの権限エラー、またはモデルが未有効です。";

      throw new Error(errorMessage);
    }
  }

  // 取引データから監査予測を生成（Geminiを使わずに簡易版）
  async generateAuditPredictions(transactions: any[]): Promise<AuditPrediction[]> {
    try {
      // Gemini APIを使って本格的な分析を行う
      const auditResponse = await this.analyzeAuditForecast(transactions);

      // AUDIT_RISKアクションから予測データを生成
      const predictions: AuditPrediction[] = auditResponse.actions
        .filter(action => action.type === 'AUDIT_RISK')
        .map((action, index) => {
          const data = action.data;
          if (!data || !data.category) return null;

          // 該当する取引を探す
          const relatedTransaction = transactions.find(t =>
            t.category === data.category &&
            t.type === 'expense'
          );

          return {
            id: `audit_${Date.now()}_${index}`,
            accountName: data.category || '',
            amount: relatedTransaction?.amount || 0,
            riskLevel: data.riskLevel || 'medium',
            comment: data.recommendations?.[0] || `${data.category}に関する監査リスクがあります`,
            transactionId: relatedTransaction?.id || `transaction_${index}`
          };
        })
        .filter(prediction => prediction !== null) as AuditPrediction[];

      return predictions;
    } catch (error) {
      console.warn('Gemini audit analysis failed, falling back to simple logic:', error);

      // フォールバック：シンプルなロジックで予測を生成
      return this.generateSimpleAuditPredictions(transactions);
    }
  }

  private generateSimpleAuditPredictions(transactions: any[]): AuditPrediction[] {
    // 総支出額を計算
    const totalAmount = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // 科目別の集計
    const categoryTotals: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach(transaction => {
        const category = transaction.category || 'その他';
        categoryTotals[category] = (categoryTotals[category] || 0) + (transaction.amount || 0);
      });

    return transactions
      .filter(t => t.type === 'expense')
      .map(transaction => {
        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        let comment = '問題なし';

        const category = transaction.category || 'その他';
        const categoryTotal = categoryTotals[category] || 0;
        const categoryRatio = totalAmount > 0 ? (categoryTotal / totalAmount) * 100 : 0;

        // 構造ベースのリスク判定（構成比を主軸に）
        if (categoryRatio > 60) {
          riskLevel = 'high';
          comment = `${category}が総支出の${categoryRatio.toFixed(1)}%を占める異常な構成です`;
        } else if (categoryRatio > 40) {
          riskLevel = 'medium';
          comment = `${category}が総支出の${categoryRatio.toFixed(1)}%を占めています`;
        }

        // 金額が大きい場合のseverity調整（補助情報として）
        if (transaction.amount >= 100000 && riskLevel === 'medium') {
          riskLevel = 'high';
          comment = `${comment}（高額支出のため詳細確認が必要です）`;
        }

        // 科目別のリスク評価（構造ベースに変更）
        if (category === '外注費' && categoryRatio > 30) {
          riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
          comment = '外注費の割合が高めです。業務委託契約の関連性を確認してください';
        } else if (category === '会議費' && categoryRatio > 20) {
          riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
          comment = '会議費の割合が目立ちます。支出目的と参加者情報を整理してください';
        } else if (category === '消耗品費' && categoryRatio > 25) {
          riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
          comment = '消耗品費の割合が高いです。事業規模とのバランスを確認してください';
        }

        return {
          id: `audit_${transaction.id}`,
          accountName: transaction.category,
          amount: transaction.amount,
          riskLevel,
          comment,
          transactionId: transaction.id
        };
      })
      .filter(prediction => prediction.riskLevel !== 'low')
      .slice(0, 10);
  }

  private summarizeTransactions(transactions: any[]) {
    // カテゴリ別集計
    const categorySummary = transactions.reduce((acc, transaction) => {
      const category = transaction.category || 'その他';
      if (!acc[category]) {
        acc[category] = {
          count: 0,
          totalAmount: 0,
          items: []
        };
      }
      acc[category].count += 1;
      acc[category].totalAmount += transaction.amount || 0;
      acc[category].items.push({
        description: transaction.description,
        amount: transaction.amount,
        date: transaction.date
      });
      return acc;
    }, {} as Record<string, any>);

    // 事業タイプの推測
    const businessType = this.inferBusinessType(categorySummary);

    return {
      totalTransactions: transactions.length,
      totalAmount: transactions.reduce((sum, t) => sum + (t.amount || 0), 0),
      categoryBreakdown: categorySummary,
      inferredBusinessType: businessType,
      timeRange: this.getTimeRange(transactions)
    };
  }

  private inferBusinessType(categorySummary: Record<string, any>): string {
    const categories = Object.keys(categorySummary);

    if (categories.includes('ソフトウェア・サブスク費') || categories.includes('通信費')) {
      return 'IT・ソフトウェア関連事業';
    }
    if (categories.includes('外注費') && categorySummary['外注費'].count > 5) {
      return '外注中心のサービス事業';
    }
    if (categories.includes('交通費') && categories.includes('食事代')) {
      return '営業・移動を中心とした事業';
    }
    if (categories.includes('消耗品費') && categories.includes('地代家賃')) {
      return '店舗・事務所を構えた事業';
    }

    return '一般的な個人事業';
  }

  private getTimeRange(transactions: any[]): string {
    if (transactions.length === 0) return 'データなし';

    const dates = transactions
      .map(t => new Date(t.date))
      .filter(d => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    if (dates.length === 0) return '不明';

    // JST形式で日付を取得
    const toJSTDateString = (date: Date): string => {
      const jstDate = new Date(date.getTime() + (date.getTimezoneOffset() + 9 * 60) * 60 * 1000);
      return jstDate.toISOString().split('T')[0];
    };

    const start = toJSTDateString(dates[0]);
    const end = toJSTDateString(dates[dates.length - 1]);

    return `${start} 〜 ${end}`;
  }

  // 異常検知リスク分類関数
  private classifyAnomalyRisk(z: number, growth: number, ratio: number, diffRatio: number): 'low' | 'medium' | 'high' {
    if (z >= 3 && ratio >= 60 && growth >= 25) return 'high';
    if (z >= 2 || growth >= 30 || diffRatio >= 10) return 'medium';
    return 'low';
  }

  // AIのテキストレスポンスをパース
  private parseAITextResponse(responseText: string, forecastItems: AuditForecastItem[]): {
    accountName: string;
    aiSuspicionView: string;
    aiPreparationAdvice: string;
  }[] {
    console.log('📝 [parseAITextResponse] 入力テキスト長:', responseText.length);
    console.log('📝 [parseAITextResponse] 入力テキストプレビュー:', responseText.substring(0, 500));
    
    const results: {
      accountName: string;
      aiSuspicionView: string;
      aiPreparationAdvice: string;
    }[] = [];

    // レスポンスを --- で分割
    const sections = responseText.split('---').filter(section => section.trim());
    console.log('📝 [parseAITextResponse] セクション数:', sections.length);

    for (const section of sections) {
      const lines = section.trim().split('\n').filter(line => line.trim());
      console.log('📝 [parseAITextResponse] セクション行数:', lines.length);
      console.log('📝 [parseAITextResponse] 最初の行:', lines[0]);

      if (lines.length < 3) {
        console.log('⚠️ [parseAITextResponse] セクションが短すぎる、スキップ');
        continue;
      }

      // 勘定科目名の抽出
      const accountNameMatch = lines[0].match(/【勘定科目】(.+)/);
      if (!accountNameMatch) {
        console.log('⚠️ [parseAITextResponse] 勘定科目名が見つからない、スキップ');
        continue;
      }

      const accountName = accountNameMatch[1].trim();
      console.log('✅ [parseAITextResponse] 勘定科目名:', accountName);

      // 税務署からの見られ方と準備すべきことの説明を抽出
      let suspicionView = '';
      let preparationAdvice = '';

      let currentSection = '';
      for (const line of lines.slice(1)) {
        if (line.includes('【税務署からの見られ方】')) {
          currentSection = 'suspicion';
          continue;
        } else if (line.includes('【準備すべきこと】')) {
          currentSection = 'preparation';
          continue;
        }

        if (currentSection === 'suspicion') {
          suspicionView += line + ' ';
        } else if (currentSection === 'preparation') {
          preparationAdvice += line + ' ';
        }
      }

      results.push({
        accountName,
        aiSuspicionView: suspicionView.trim(),
        aiPreparationAdvice: preparationAdvice.trim()
      });
    }

    console.log('📝 [parseAITextResponse] 最終結果数:', results.length);
    console.log('📝 [parseAITextResponse] 結果:', results.map(r => r.accountName));

    // forecastItems に含まれない勘定科目は除外
    const validAccountNames = forecastItems.map(item => item.accountName);
    const filteredResults = results.filter(result => validAccountNames.includes(result.accountName));
    
    console.log('📝 [parseAITextResponse] フィルタリング後結果数:', filteredResults.length);
    console.log('📝 [parseAITextResponse] フィルタリング後結果:', filteredResults.map(r => r.accountName));

    return filteredResults;
  }

  // Summary_Account_History からデータ取得
  async fetchSummaryAccountHistory(year: number, userId?: string): Promise<{ usable: boolean; reason?: string; data: any[] }> {
    // DEMO ONLY: Skip authentication for demo users
    // TODO: remove demo mode before production
    const isDemo = userId === 'demo-user';
    
    const idToken = await authService.getIdToken();
    if (!idToken && !isDemo) throw new Error('認証されていません');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }

    const response = await fetch(`${API_URL}/api/summary-account-history?year=${year}`, {
      method: 'GET',
      headers
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || err.details || 'Failed to fetch account history');
    }
    return response.json();
  }

  // 監査予報（全体）- 勘定科目合計・比率ベースの論点を生成
  async generateAuditForecast(transactions: any[], targetYear?: number, userId?: string): Promise<AuditForecastItem[]> {
    const year = targetYear || new Date().getFullYear();

    // DEMO ONLY: Check if demo user
    // TODO: remove demo mode before production
    const isDemo = userId === 'demo-user';
    if (isDemo) {
      console.log('📊 Demo mode: generating audit forecast without Firestore cache');
    }

    // Summary（スプシ関数結果）を補助情報として使う：常に取引データを主軸にする
    let summaryData: Array<{ year: number; accountName: string; amount: number; ratio: number | null }> = [];
    let summaryUsable = false;
    
    try {
      const summaryResponse = await this.fetchSummaryAccountHistory(year, userId);
      // Check if summary is usable (has valid data structure)
      if (summaryResponse && typeof summaryResponse === 'object' && 'usable' in summaryResponse) {
        if (summaryResponse.usable === true && Array.isArray(summaryResponse.data)) {
          summaryData = summaryResponse.data;
          summaryUsable = true;
          console.log(`✅ Summary_Account_History が使用可能です: ${summaryData.length}件のデータ`);
        } else {
          console.log(`⚠️ Summary_Account_History が使用できません: ${summaryResponse.reason || '不明な理由'}`);
        }
      } else {
        console.warn('⚠️ Summary response format is invalid, using transactions only');
      }
    } catch (e: any) {
      console.warn('⚠️ Summary account history fetch failed (using transactions only):', e?.message || e);
    }

    // 常に取引データを主軸にして集計（Summaryは補助情報として後で使用）
    const safeAdd = (accumulator: number, transaction: any): number => {
      const safeAmount = typeof transaction.amount === 'number' && isFinite(transaction.amount)
        ? transaction.amount
        : 0;
      return accumulator + safeAmount;
    };
    const totalAmount = transactions.reduce(safeAdd, 0);

    const categoryTotals: Record<string, { total: number; count: number; maxSingle: number }> = {};
    Object.assign(
      categoryTotals,
      transactions.reduce((acc, transaction) => {
        const category = (transaction.category as string) || 'その他';
        if (!acc[category]) {
          acc[category] = { total: 0, count: 0, maxSingle: 0 };
        }
        const safeAmount = typeof transaction.amount === 'number' && isFinite(transaction.amount)
          ? transaction.amount
          : 0;
        acc[category].total += safeAmount;
        acc[category].count += 1;
        if (safeAmount > acc[category].maxSingle) {
          acc[category].maxSingle = safeAmount;
        }
        return acc;
      }, {} as Record<string, { total: number; count: number; maxSingle: number }>)
    );

    // 各勘定科目をAuditForecastItemに変換
    const auditForecastItems: AuditForecastItem[] = Object.entries(categoryTotals)
      .map(([category, data], index) => {
        const ratio = totalAmount > 0 ? (data.total / totalAmount) * 100 : 0;
        const maxSingleRatio = totalAmount > 0 ? (data.maxSingle / totalAmount) * 100 : 0;

        // 基本リスクレベルと論点を決定（構造ベース）
        let baseRisk: 'low' | 'medium' | 'high' = 'low';
        const issues: string[] = [];

        // 構成比ベースのリスク判定（金額は補助情報として使用）
        if (ratio > 60) {
          baseRisk = 'high';
          issues.push(`${category}が総支出の${ratio.toFixed(1)}%を占める異常な構成`);
          issues.push('→ 事業実態との乖離が疑われやすい状態');
        } else if (ratio > 40) {
          baseRisk = 'medium';
          issues.push(`${category}が総支出の${ratio.toFixed(1)}%を占めています`);
          issues.push('→ 税務調査時に支出の妥当性確認が必要な水準');
        }

        // 金額が大きい場合のseverity調整（補助情報として）
        if (data.total >= 1000000 && baseRisk === 'medium') {
          baseRisk = 'high'; // 大規模支出の場合、mediumをhighに引き上げ
          issues.push('大規模支出のため、より詳細な確認が必要');
        }

        // 科目別のリスク評価（構造ベースに変更）
        if (category === '外注費' && ratio > 30) {
          baseRisk = baseRisk === 'low' ? 'medium' : baseRisk;
          issues.push('外注費の構成比が高めです。業務委託契約の関連性を確認してください');
        } else if (category === '会議費' && ratio > 20) {
          baseRisk = baseRisk === 'low' ? 'medium' : baseRisk;
          issues.push('会議費の構成比が目立ちます。支出目的と参加者情報を整理してください');
        } else if (category === '消耗品費' && ratio > 25) {
          baseRisk = baseRisk === 'low' ? 'medium' : baseRisk;
          issues.push('消耗品費の構成比が高いです。事業規模とのバランスを確認してください');
        }

        // 低リスクの場合も基本的な論点を追加
        if (issues.length === 0) {
          issues.push(`${category}が総支出の${ratio.toFixed(1)}%を占めています`);
          issues.push('→ 支出根拠資料の整理を推奨');
        }

        return {
          id: `forecast_${Date.now()}_${index}`,
          accountName: category,
          totalAmount: data.total,
          ratio: Math.round(ratio * 10) / 10, // 小数点1桁
          maxSingleTransactionAmount: data.maxSingle,
          maxSingleTransactionRatio: Math.round(maxSingleRatio * 10) / 10, // 小数点1桁
          riskLevel: baseRisk,
          issues,
          zScore: null, // データなし
          growthRate: null, // データなし
          diffRatio: null, // データなし
          anomalyRisk: 'low' // デフォルト値
        };
      });

    // Summary_Account_History からデータを取得・計算（Summaryが使用可能な場合のみ）
    if (summaryUsable && summaryData.length > 0) {
      for (const item of auditForecastItems) {
        const accountHistory = summaryData
          .filter((h: any) => h.accountName === item.accountName)
          .sort((a: any, b: any) => (b.year || 0) - (a.year || 0));

        if (accountHistory.length >= 2) {
          // 現年度と前年度のデータ
          const currentYearData = accountHistory.find((h: any) => h.year === year);
          const previousYearData = accountHistory.find((h: any) => h.year === year - 1);

          if (currentYearData && previousYearData) {
            // 1. growthRate 計算（前年が0/不正の場合は計算しない）
            const prevAmount = Number(previousYearData.amount);
            const currAmount = Number(currentYearData.amount);
            if (isFinite(prevAmount) && prevAmount > 0 && isFinite(currAmount)) {
              const rawGrowth = ((currAmount - prevAmount) / prevAmount) * 100;
              item.growthRate = isFinite(rawGrowth) ? rawGrowth : null;
            } else {
              item.growthRate = null;
            }

            // 2. diffRatio 計算（支出比率の差）
            const currRatio = Number(currentYearData.ratio);
            const prevRatio = Number(previousYearData.ratio);
            if (isFinite(currRatio) && isFinite(prevRatio)) {
              const rawDiff = currRatio - prevRatio;
              item.diffRatio = isFinite(rawDiff) ? rawDiff : null;
            } else {
              item.diffRatio = null;
            }

            // 3. zScore 計算（直近3年平均との差）: currentYearは除外して平均との差を作る
            const pastAmounts = accountHistory
              .filter((h: any) => h.year !== year)
              .slice(0, 3)
              .map((h: any) => h.amount);
            if (pastAmounts.length >= 2) {  // 少なくとも2つのデータが必要
              const mean = pastAmounts.reduce((a: number, b: number) => a + b, 0) / pastAmounts.length;
              const variance = pastAmounts.reduce((sum: number, val: number) => sum + Math.pow(val - mean, 2), 0) / pastAmounts.length;
              const stdDev = Math.sqrt(variance);

              // 標準偏差が0より大きい場合のみ計算（全て同じ値の場合は計算不能）
              const rawZ = stdDev > 0 ? (currAmount - mean) / stdDev : null;
              item.zScore = rawZ !== null && isFinite(rawZ) ? rawZ : null;
            } else {
              item.zScore = null; // データが不十分
            }

            // 4. anomalyRisk 分類
            item.anomalyRisk = this.classifyAnomalyRisk(
              item.zScore,
              item.growthRate,
              item.ratio,
              item.diffRatio
            );

            // 5. issues に追加
            if (item.growthRate > 30) {
              item.issues.push(`前年比 +${item.growthRate.toFixed(1)}% と急増しています`);
            }
            if (item.zScore > 2) {
              item.issues.push(`過去平均との差のZスコアが ${item.zScore.toFixed(1)} です`);
            }
          }
        }

        // デフォルト値（過去データがない場合）
        if (item.zScore === undefined) item.zScore = null;
        if (item.growthRate === undefined) item.growthRate = null;
        if (item.diffRatio === undefined) item.diffRatio = null;
        if (item.anomalyRisk === undefined) item.anomalyRisk = 'low';
      }
    }

    // ===== 評価軸方式: 4つの評価軸で異常検知 =====
    const anomalies: AnomalyDetection[] = [];

    // ① 構成比異常チェック
    for (const item of auditForecastItems) {
      if (item.ratio > 40) {
        anomalies.push({
          dimension: '構成比異常',
          accountName: item.accountName,
          value: item.ratio,
          severity: item.ratio > 60 ? 'high' : 'medium',
          message: `売上に対して${item.accountName}が${item.ratio.toFixed(1)}%を占めています`,
          fact: `構成比${item.ratio.toFixed(1)}%`,                    // 🆕 事実のみ
          ruleDescription: item.ratio > 60 ? '単一科目が総支出の60%を超過' : '単一科目が総支出の40%を超過'              // 🆕 ルール説明
        });
      }
    }

    // ② 急変異常チェック（時系列データがある場合のみ）
    for (const item of auditForecastItems) {
      if (Math.abs(item.growthRate || 0) > 50) {
        anomalies.push({
          dimension: '急変異常',
          accountName: item.accountName,
          value: item.growthRate || 0,
          severity: Math.abs(item.growthRate || 0) > 100 ? 'high' : 'medium',
          message: `前年比${item.growthRate! > 0 ? '+' : ''}${item.growthRate!.toFixed(1)}%と急変`,
          fact: `前年比${item.growthRate! > 0 ? '+' : ''}${item.growthRate!.toFixed(1)}%`,  // 🆕 事実のみ
          ruleDescription: '前年比の変動率が50%を超過'                                      // 🆕 ルール説明
        });
      }
    }

    // ③ 統計的異常チェック（時系列データがある場合のみ）
    for (const item of auditForecastItems) {
      if (Math.abs(item.zScore || 0) > 2.0) {
        anomalies.push({
          dimension: '統計的異常',
          accountName: item.accountName,
          value: item.zScore || 0,
          severity: Math.abs(item.zScore || 0) > 3 ? 'high' : 'medium',
          message: `過去平均から${item.zScore!.toFixed(1)}σ乖離`,
          fact: `Z値${item.zScore! > 0 ? '+' : ''}${item.zScore!.toFixed(1)}σ`,  // 🆕 事実のみ
          ruleDescription: '過去平均からの乖離が2σを超過'                        // 🆕 ルール説明
        });
      }
    }

    // ④ 比率変動異常チェック（時系列データがある場合のみ）
    for (const item of auditForecastItems) {
      if (Math.abs(item.diffRatio || 0) > 20) {
        anomalies.push({
          dimension: '比率変動異常',
          accountName: item.accountName,
          value: item.diffRatio || 0,
          severity: Math.abs(item.diffRatio || 0) > 40 ? 'high' : 'medium',
          message: `構成比が${item.diffRatio! > 0 ? '+' : ''}${item.diffRatio!.toFixed(1)}pt変動`,
          fact: `構成比変動${item.diffRatio! > 0 ? '+' : ''}${item.diffRatio!.toFixed(1)}pt`,  // 🆕 事実のみ
          ruleDescription: '構成比の変動幅が20pt以上'                                         // 🆕 ルール説明
        });
      }
    }

    // 各カテゴリに検知情報を付与
    for (const item of auditForecastItems) {
      item.detectedAnomalies = anomalies.filter(a => a.accountName === item.accountName);
      item.anomalyCount = item.detectedAnomalies.length;
    }

    // ===== クロスカテゴリーアノマリー検出 =====
    const crossMatches = this.detectCrossCategoryAnomalies(transactions, auditForecastItems);
    
    // ===== クロスカテゴリーマッチを専用異常として追加 =====
    console.log('🔄 Injecting cross-category matches as dedicated anomalies...');
    for (const item of auditForecastItems) {
      const crosses = crossMatches.get(item.accountName) || [];

      if (crosses.length > 0) {
        const crossCategoryAnomaly: AnomalyDetection = {
          dimension: 'クロスカテゴリ一致',
          accountName: item.accountName,
          value: crosses.length,
          severity: crosses.length >= 3 ? 'high' : 'medium',
          message: `勘定科目横断で${crosses.length}件の一致取引を検出`,
          fact: `一致取引${crosses.length}件`,
          ruleDescription: '同一取引先・同一金額の取引が複数科目に存在',
          crossCategoryMatches: crosses.map(c => ({
            relatedAccount: c.accountName,
            sameAmount: c.amount,
            dateGap: `${Math.round(c.daysDifference)}日差`,
            merchant: c.merchant
          }))
        };

        if (!item.detectedAnomalies) {
          item.detectedAnomalies = [];
        }
        item.detectedAnomalies.push(crossCategoryAnomaly);
      }
    }

    // クロスカテゴリ一致追加後に検知数を再計算
    for (const item of auditForecastItems) {
      item.anomalyCount = item.detectedAnomalies ? item.detectedAnomalies.length : 0;
    }
    
    // NOTE: taxAuthorityPerspective（日次総括）のAI生成はDashboard側で1回だけ実行する

    // 異常検知数でソート（第1優先）、同点の場合は riskLevel でソート（第2優先）
    return auditForecastItems.sort((a, b) => {
      // 第1優先: anomalyCount（検知数が多い順）
      const countDiff = (b.anomalyCount || 0) - (a.anomalyCount || 0);
      if (countDiff !== 0) return countDiff;

      // 第2優先: riskLevel（high > medium > low）
      const riskOrder = { high: 3, medium: 2, low: 1 };
      return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
    });
  }

  // 記帳チェック（個別）- 個別のチェック項目を生成
  async generateBookkeepingChecks(transactions: any[], language: 'ja' | 'en' = 'ja', categories?: any): Promise<BookkeepingCheckItem[]> {
    const checks: BookkeepingCheckItem[] = [];

    // 領収書がない取引を集計
    const missingReceipts: Record<string, { count: number; transactions: any[] }> = {};
    const highAmountTransactions: any[] = [];
    const shortDescriptionTransactions: any[] = [];

    // 取引ごとのチェック
    transactions.forEach((transaction) => {
      const amount = transaction.amount as number;
      const category = (transaction.category as string) || 'その他';
      const description = transaction.description as string;
      const id = transaction.id as string;
      const receiptUrl = transaction.receiptUrl as string;

      // 高額取引のチェック（個別表示）
      if (amount >= 100000) {
        highAmountTransactions.push(transaction);
      }

      // 領収書がない取引を集計
      if (!receiptUrl) {
        if (!missingReceipts[category]) {
          missingReceipts[category] = { count: 0, transactions: [] };
        }
        missingReceipts[category].count += 1;
        missingReceipts[category].transactions.push(transaction);
      }

      // 説明が不十分な取引を集計
      if (!description || description.length < 5) {
        shortDescriptionTransactions.push(transaction);
      }
    });

    // 領収書がない取引のチェックをカテゴリごとにまとめて表示
    Object.entries(missingReceipts).forEach(([category, data]) => {
      const translatedCategory = categories ? categories[category] || category : category;
      checks.push({
        id: `check_receipt_${category}`,
        type: language === 'ja' ? '不足' : 'Deficiency',
        title: language === 'ja'
          ? `領収書の添付が必要: ${translatedCategory} (${data.count}件)`
          : `Receipts needed: ${translatedCategory} (${data.count} items)`,
        description: language === 'ja'
          ? `${translatedCategory}カテゴリで${data.count}件の取引に領収書が添付されていません。税務調査時に必要となるため、必ず添付してください。`
          : `${data.count} transactions in the ${translatedCategory} category do not have receipts attached. These are required for tax audits, so please attach them.`,
        actionable: true
      });
    });

    // 高額取引のチェック（個別表示）
    highAmountTransactions.forEach((transaction) => {
      const amount = transaction.amount as number;
      const category = (transaction.category as string) || 'その他';
      const translatedCategory = categories ? categories[category] || category : category;
      const description = transaction.description as string;
      const date = transaction.date as string;
      const id = transaction.id as string;

      checks.push({
        id: `check_high_amount_${id}`,
        type: language === 'ja' ? '確認' : 'Confirmation',
        title: language === 'ja'
          ? `高額支出の確認: ${translatedCategory} ¥${amount.toLocaleString()} (${date})`
          : `High amount transaction check: ${translatedCategory} ¥${amount.toLocaleString()} (${date})`,
        description: language === 'ja'
          ? `${description}の支出が10万円を超えています。事業との関連性と根拠資料を確認してください。`
          : `The ${description} expense exceeds ¥100,000. Please verify the business relevance and supporting documents.`,
        actionable: false,
        transactionId: id
      });
    });

    // 説明が不十分な取引を集計してまとめて表示
    if (shortDescriptionTransactions.length > 0) {
      const descriptionByCategory: Record<string, number> = {};
      shortDescriptionTransactions.forEach((transaction) => {
        const category = (transaction.category as string) || 'その他';
        descriptionByCategory[category] = (descriptionByCategory[category] || 0) + 1;
      });

      Object.entries(descriptionByCategory).forEach(([category, count]) => {
        const translatedCategory = categories ? categories[category] || category : category;
        checks.push({
          id: `check_description_${category}`,
          type: language === 'ja' ? '推奨' : 'Recommendation',
          title: language === 'ja'
            ? `説明の充実を推奨: ${translatedCategory} (${count}件)`
            : `Description enhancement recommended: ${translatedCategory} (${count} items)`,
          description: language === 'ja'
            ? `${translatedCategory}カテゴリで${count}件の取引説明が簡素です。事業との関連性や支出目的がわかるよう、詳細な説明を追加することを推奨します。`
            : `${count} transactions in the ${translatedCategory} category have insufficient descriptions. It is recommended to add detailed descriptions explaining the business relevance and purpose of the expenses.`,
          actionable: true
        });
      });
    }

    // カテゴリごとのチェック
    const categoryCount: Record<string, number> = transactions.reduce((acc, t) => {
      const category = (t.category as string) || 'その他';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(categoryCount).forEach(([category, count]) => {
      if (count > 10) {
        const translatedCategory = categories ? categories[category] || category : category;
        checks.push({
          id: `check_category_frequency_${category}`,
          type: language === 'ja' ? '確認' : 'Confirmation',
          title: language === 'ja'
            ? `頻繁な取引の確認: ${translatedCategory}`
            : `Frequent transactions check: ${translatedCategory}`,
          description: language === 'ja'
            ? `${translatedCategory}の取引が${count}件あります。取引内容の一貫性と事業性を確認してください。`
            : `There are ${count} transactions in the ${translatedCategory} category. Please verify the consistency and business nature of the transactions.`,
          actionable: false
        });
      }
    });

    // 全体的なチェック
    const totalTransactions = transactions.length;
    if (totalTransactions < 5) {
      checks.push({
        id: 'check_overall_transaction_count',
        type: language === 'ja' ? '推奨' : 'Recommendation',
        title: language === 'ja'
          ? '取引件数の確認'
          : 'Transaction count check',
        description: language === 'ja'
          ? `取引件数が${totalTransactions}件と少ないです。事業の実態に合った取引数を確認してください。`
          : `There are only ${totalTransactions} transactions, which is low. Please verify if this matches your actual business activities.`,
        actionable: false
      });
    }

    // チェック項目を優先順位でソート（不足 -> 確認 -> 推奨）
    const typeOrder = { '不足': 3, '確認': 2, '推奨': 1, 'Deficiency': 3, 'Confirmation': 2, 'Recommendation': 1 };
    return checks.sort((a, b) => typeOrder[b.type] - typeOrder[a.type]);
  }

  // クロスカテゴリーアノマリー検出関数
  private detectCrossCategoryAnomalies(
    transactions: any[], 
    forecastItems: AuditForecastItem[]
  ): Map<string, CrossCategoryMatch[]> {
    
    const crossMatches = new Map<string, CrossCategoryMatch[]>();
    
    // 取引をmerchant+amount+date proximityでグループ化
    const transactionGroups = new Map<string, any[]>();
    
    transactions.forEach(tx => {
      const memoText = (tx.memo || tx.description || '').trim();
      if (!memoText || tx.amount < 100000) return; // 高額取引のみチェック
      
      // ファジィキーを作成: merchant name (最初の10文字) + amount
      const merchant = memoText.substring(0, 10);
      const key = `${merchant}_${tx.amount}`;
      
      if (!transactionGroups.has(key)) {
        transactionGroups.set(key, []);
      }
      transactionGroups.get(key)!.push(tx);
    });
    
    // 複数カテゴリがあるグループを検出
    transactionGroups.forEach((txs, key) => {
      const categories = new Set(txs.map(t => t.category));
      
      // クロスカテゴリーマッチ検出！
      if (categories.size >= 2) {
        txs.forEach(tx => {
          const matches = txs
            .filter(other => other.category !== tx.category)
            .map(other => ({
              accountName: other.category || '不明',
              amount: other.amount,
              date: other.date,
              merchant: (other.memo || other.description || '').trim(),
              daysDifference: Math.abs(
                (new Date(tx.date).getTime() - new Date(other.date).getTime()) 
                / (1000 * 60 * 60 * 24)
              )
            }));
          
          if (matches.length > 0) {
            const category = tx.category || '不明';
            if (!crossMatches.has(category)) {
              crossMatches.set(category, []);
            }
            crossMatches.get(category)!.push(...matches);
          }
        });
      }
    });
    
    return crossMatches;
  }

  // 税務調査対応アシスタント - 検知済み異常データから税務署の観点・質問・準備事項を生成
  async generateTaxAuditAssistance(forecastData: {
    accountName: string;
    totalAmount: number;
    ratio: number;
    anomalyCount: number;
    detectedAnomalies: AnomalyDetection[];
  }[]): Promise<TaxAuditResponse> {
    console.log('🔍 Starting tax audit assistance generation...');
    console.log('📊 Input forecastData:', JSON.stringify(forecastData, null, 2));

    const taxAuthorityConcerns: string[] = [];
    const expectedQuestions: string[] = [];
    const userPreparationPoints: string[] = [];
    const nextActions: string[] = [];

    // severity が high の異常を優先的に処理
    const highSeverityAnomalies = forecastData
      .flatMap(item => item.detectedAnomalies || [])
      .filter(anomaly => anomaly.severity === 'high')
      .sort((a, b) => {
        // 同じdimension内ではvalueの絶対値が大きいものを優先
        if (a.dimension === b.dimension) {
          return Math.abs(b.value) - Math.abs(a.value);
        }
        return 0;
      });

    const mediumSeverityAnomalies = forecastData
      .flatMap(item => item.detectedAnomalies || [])
      .filter(anomaly => anomaly.severity === 'medium');

    // 全ての異常を処理（high → medium の順）
    const allAnomalies = [...highSeverityAnomalies, ...mediumSeverityAnomalies];
    console.log('📋 All anomalies to process:', allAnomalies.length);

    for (const anomaly of allAnomalies) {
      const item = forecastData.find(f => f.accountName === anomaly.accountName);
      if (!item) continue;

      console.log(`🔍 Processing anomaly: ${anomaly.dimension} for ${anomaly.accountName}`);

      // 各dimensionに基づいて税務署の観点、質問、準備事項、次アクションを生成
      switch (anomaly.dimension) {
        case '構成比異常':
          const concern1 = `${item.accountName}が売上全体の${item.ratio.toFixed(1)}%を占める理由について、事業の必要性と妥当性を確認する`;
          const question1 = `${item.accountName}の支出が売上の${item.ratio.toFixed(1)}%にも達する理由を説明してください`;
          const question2 = `この支出割合は同業他社と比較して適正であるか、具体的な根拠を示してください`;
          const prep1 = `売上との関連性を示す事業計画書や予算書の準備`;
          const prep2 = `${item.accountName}の支出が事業に必要な理由をまとめた説明資料`;
          const prep3 = `同業他社との比較データや業界平均値の調査資料`;

          taxAuthorityConcerns.push(concern1);
          expectedQuestions.push(question1);
          expectedQuestions.push(question2);
          userPreparationPoints.push(prep1);
          userPreparationPoints.push(prep2);
          userPreparationPoints.push(prep3);
          console.log('✅ Added 構成比異常 items');
          break;

        case '急変異常':
          const growthText = anomaly.value > 0 ? `急増（+${anomaly.value.toFixed(1)}%）` : `急減（${anomaly.value.toFixed(1)}%）`;
          const concern2 = `${item.accountName}の前年比${growthText}について、急変の理由と事業継続性を確認する`;
          const question3 = `${item.accountName}が前年比${anomaly.value.toFixed(1)}%変動した具体的な理由を説明してください`;
          const question4 = `この変動は一時的なものか、今後も継続する計画か明確にしてください`;
          const prep4 = `前年との比較表と変動理由の詳細説明`;
          const prep5 = `契約書、発注書、見積書など変動の根拠となる書類`;
          const prep6 = `事業計画の変更や市場環境変化を説明する資料`;

          taxAuthorityConcerns.push(concern2);
          expectedQuestions.push(question3);
          expectedQuestions.push(question4);
          userPreparationPoints.push(prep4);
          userPreparationPoints.push(prep5);
          userPreparationPoints.push(prep6);
          console.log('✅ Added 急変異常 items');
          break;

        case '統計的異常':
          const zScoreText = anomaly.value > 0 ? `高い値（+${anomaly.value.toFixed(1)}σ）` : `低い値（${anomaly.value.toFixed(1)}σ）`;
          const concern3 = `${item.accountName}の過去平均からの乖離度（${zScoreText}）について、異常値の原因を確認する`;
          const question5 = `${item.accountName}の支出が過去平均から${anomaly.value.toFixed(1)}σ乖離している理由を説明してください`;
          const question6 = `この乖離は事業の成長による自然な変動か、特別な要因によるものか判断してください`;
          const prep7 = `過去3年分の${item.accountName}支出推移表`;
          const prep8 = `統計的異常の原因となる契約書や発注書類`;
          const prep9 = `${item.accountName}の支出パターンを説明する事業特性資料`;

          taxAuthorityConcerns.push(concern3);
          expectedQuestions.push(question5);
          expectedQuestions.push(question6);
          userPreparationPoints.push(prep7);
          userPreparationPoints.push(prep8);
          userPreparationPoints.push(prep9);
          console.log('✅ Added 統計的異常 items');
          break;

        case '比率変動異常':
          const diffText = anomaly.value > 0 ? `上昇（+${anomaly.value.toFixed(1)}pt）` : `下降（${anomaly.value.toFixed(1)}pt）`;
          const concern4 = `${item.accountName}の構成比${diffText}について、事業構造の変化を確認する`;
          const question7 = `${item.accountName}の構成比が${anomaly.value.toFixed(1)}pt変動した事業上の理由を説明してください`;
          const question8 = `この比率変動は事業戦略の変更によるものか、具体的な計画を示してください`;
          const prep10 = `構成比の時系列推移グラフと変動理由説明`;
          const prep11 = `事業構造変化を裏付ける契約書や事業計画書`;
          const prep12 = `競合環境や市場変化を説明する業界資料`;

          taxAuthorityConcerns.push(concern4);
          expectedQuestions.push(question7);
          expectedQuestions.push(question8);
          userPreparationPoints.push(prep10);
          userPreparationPoints.push(prep11);
          userPreparationPoints.push(prep12);
          console.log('✅ Added 比率変動異常 items');
          break;
      }
    }

    console.log('📝 Before deduplication:');
    console.log('  taxAuthorityConcerns:', taxAuthorityConcerns.length, taxAuthorityConcerns);
    console.log('  expectedQuestions:', expectedQuestions.length, expectedQuestions);
    console.log('  userPreparationPoints:', userPreparationPoints.length, userPreparationPoints);

    // 重複を除去し、優先順位付け
    const uniqueConcerns = [...new Set(taxAuthorityConcerns)].filter(item => item && item.length > 0).slice(0, 5);
    const uniqueQuestions = [...new Set(expectedQuestions)].filter(item => item && item.length > 0).slice(0, 8);
    const uniquePreparationPoints = [...new Set(userPreparationPoints)].filter(item => item && item.length > 0).slice(0, 10);

    // 次アクションの設定（優先順位付き）
    const nextActionsList = [
      '検知された異常のseverityが高い項目から順に説明資料を準備する',
      '各異常のdimensionごとに必要な根拠書類をリストアップする',
      '税理士や専門家に相談し、説明内容の妥当性を確認する',
      '類似事業者のデータや業界平均を調査し、比較資料を作成する',
      '必要に応じて追加の証憑書類を準備・整理する'
    ];

    const result = {
      taxAuthorityConcerns: uniqueConcerns,
      expectedQuestions: uniqueQuestions,
      userPreparationPoints: uniquePreparationPoints,
      nextActions: nextActionsList
    };

    console.log('📋 Final result:', JSON.stringify(result, null, 2));

    return result;
  }
}

export const auditService = new AuditService();
