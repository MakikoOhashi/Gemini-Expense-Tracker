import { GoogleGenAI } from "@google/genai";
import { AIResponse, AuditPrediction, AuditForecastItem, BookkeepingCheckItem, AnomalyDetection } from "../types";
import { sheetsService } from "./sheetsService";

export class AuditService {
  async analyzeAuditForecast(transactions: any[], userId?: string): Promise<AIResponse> {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("APIキーが設定されていません。環境変数を確認してください。");
    }

    const ai = new GoogleGenAI({ apiKey });
    const modelName = 'gemini-2.5-flash-lite';

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
    return transactions
      .filter(t => t.type === 'expense')
      .map(transaction => {
        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        let comment = '問題なし';

        // 金額ベースのリスク判定
        if (transaction.amount >= 100000) {
          riskLevel = 'high';
          comment = '高額支出の妥当性を確認してください';
        } else if (transaction.amount >= 50000) {
          riskLevel = 'medium';
          comment = '中額支出です。根拠を確認してください';
        }

        // 科目ベースのリスク判定
        if (transaction.category === '外注費' || transaction.category === '会議費') {
          riskLevel = 'medium';
          comment = '領収書と業務目的の関連性を確認してください';
        } else if (transaction.category === '消耗品費' && transaction.amount >= 10000) {
          riskLevel = 'high';
          comment = '消耗品費が高額です。詳細を確認してください';
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

    const start = dates[0].toISOString().split('T')[0];
    const end = dates[dates.length - 1].toISOString().split('T')[0];

    return `${start} 〜 ${end}`;
  }

  // 異常検知リスク分類関数
  private classifyAnomalyRisk(z: number, growth: number, ratio: number, diffRatio: number): 'low' | 'medium' | 'high' {
    if (z >= 3 && ratio >= 60 && growth >= 25) return 'high';
    if (z >= 2 || growth >= 30 || diffRatio >= 10) return 'medium';
    return 'low';
  }

  // Summary_Account_History からデータ取得
  async fetchSummaryAccountHistory(year: number): Promise<any[]> {
    const response = await fetch(`/api/summary-account-history?year=${year}`);
    if (!response.ok) throw new Error('Failed to fetch account history');
    return response.json();
  }

  // 監査予報（全体）- 勘定科目合計・比率ベースの論点を生成
  async generateAuditForecast(transactions: any[], userId?: string): Promise<AuditForecastItem[]> {
    // NaN/無効値対策: 安全な数値加算関数
    const safeAdd = (accumulator: number, transaction: any): number => {
      const safeAmount = typeof transaction.amount === 'number' && isFinite(transaction.amount)
        ? transaction.amount
        : 0;
      return accumulator + safeAmount;
    };

    const totalAmount = transactions.reduce(safeAdd, 0);

    // 勘定科目ごとに集計
    const categoryTotals: Record<string, { total: number; count: number }> = transactions.reduce((acc, transaction) => {
      const category = (transaction.category as string) || 'その他';
      if (!acc[category]) {
        acc[category] = { total: 0, count: 0 };
      }

      // NaN/無効値対策: 必ず安全な数値を使用
      const safeAmount = typeof transaction.amount === 'number' && isFinite(transaction.amount)
        ? transaction.amount
        : 0;

      acc[category].total += safeAmount;
      acc[category].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    // 現在の年度を特定
    const currentYear = new Date().getFullYear();

    // Summary_Account_History からデータ取得
    const historyData = userId ? await this.fetchSummaryAccountHistory(currentYear) : [];

    // 各勘定科目をAuditForecastItemに変換
    const auditForecastItems: AuditForecastItem[] = Object.entries(categoryTotals)
      .map(([category, data], index) => {
        const ratio = totalAmount > 0 ? (data.total / totalAmount) * 100 : 0;

        // 基本リスクレベルと論点を決定
        let baseRisk: 'low' | 'medium' | 'high' = 'low';
        const issues: string[] = [];

        // 高額支出の科目はリスクが高い
        if (data.total >= 500000) {
          baseRisk = 'high';
          issues.push(`${category}の支出が総支出の${ratio.toFixed(1)}%を占めています`);
          issues.push('大口支出の事業性と必要性を確認する必要があります');
        } else if (data.total >= 200000) {
          baseRisk = 'medium';
          issues.push(`${category}の支出が総支出の${ratio.toFixed(1)}%を占めています`);
          issues.push('支出内容の妥当性を確認してください');
        }

        // 科目別のリスク評価
        if (category === '外注費' && data.total >= 100000) {
          baseRisk = baseRisk === 'low' ? 'medium' : baseRisk;
          issues.push('外注費の金額と業務委託契約の関連性を確認してください');
        } else if (category === '会議費' && data.total >= 50000) {
          baseRisk = baseRisk === 'low' ? 'medium' : baseRisk;
          issues.push('会議費の支出目的と参加者情報を整理してください');
        } else if (category === '消耗品費' && data.total >= 30000) {
          baseRisk = baseRisk === 'low' ? 'medium' : baseRisk;
          issues.push('消耗品費の金額と事業規模のバランスを確認してください');
        }

        // 低リスクの場合も基本的な論点を追加
        if (issues.length === 0) {
          issues.push(`${category}の支出は総支出の${ratio.toFixed(1)}%を占めています`);
          issues.push('支出の根拠となる資料を整理してください');
        }

        return {
          id: `forecast_${Date.now()}_${index}`,
          accountName: category,
          totalAmount: data.total,
          ratio: Math.round(ratio * 10) / 10, // 小数点1桁
          riskLevel: baseRisk,
          issues,
          zScore: 0, // デフォルト値
          growthRate: 0, // デフォルト値
          diffRatio: 0, // デフォルト値
          anomalyRisk: 'low' // デフォルト値
        };
      });

    // Summary_Account_History からデータを取得・計算
    if (userId && historyData.length > 0) {
      for (const item of auditForecastItems) {
        const accountHistory = historyData.filter((h: any) => h.accountName === item.accountName);

        if (accountHistory.length >= 2) {
          // 現年度と前年度のデータ
          const currentYearData = accountHistory.find((h: any) => h.year === currentYear);
          const previousYearData = accountHistory.find((h: any) => h.year === currentYear - 1);

          if (currentYearData && previousYearData) {
            // 1. growthRate 計算
            item.growthRate = ((currentYearData.amount - previousYearData.amount) / previousYearData.amount) * 100;

            // 2. diffRatio 計算（支出比率の差）
            item.diffRatio = currentYearData.ratio - previousYearData.ratio;

            // 3. zScore 計算（過去3年平均との差）
            const pastAmounts = accountHistory.slice(0, 3).map((h: any) => h.amount);
            const mean = pastAmounts.reduce((a: number, b: number) => a + b, 0) / pastAmounts.length;
            const variance = pastAmounts.reduce((sum: number, val: number) => sum + Math.pow(val - mean, 2), 0) / pastAmounts.length;
            const stdDev = Math.sqrt(variance);

            item.zScore = stdDev > 0 ? (currentYearData.amount - mean) / stdDev : 0;

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
        if (item.zScore === undefined) item.zScore = 0;
        if (item.growthRate === undefined) item.growthRate = 0;
        if (item.diffRatio === undefined) item.diffRatio = 0;
        if (item.anomalyRisk === undefined) item.anomalyRisk = 'low';
      }
    }

    // ===== 評価軸方式: 4つの評価軸で異常検知 =====
    const anomalies: AnomalyDetection[] = [];

    // ① 構成比異常チェック
    for (const item of auditForecastItems) {
      if (item.ratio > 60) {
        anomalies.push({
          dimension: '構成比異常',
          accountName: item.accountName,
          value: item.ratio,
          severity: item.ratio > 80 ? 'high' : 'medium',
          message: `売上に対して${item.accountName}が${item.ratio.toFixed(1)}%を占めています`
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
          message: `前年比${item.growthRate! > 0 ? '+' : ''}${item.growthRate!.toFixed(1)}%と急変`
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
          message: `過去平均から${item.zScore!.toFixed(1)}σ乖離`
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
          message: `構成比が${item.diffRatio! > 0 ? '+' : ''}${item.diffRatio!.toFixed(1)}pt変動`
        });
      }
    }

    // 各カテゴリに検知情報を付与
    for (const item of auditForecastItems) {
      item.detectedAnomalies = anomalies.filter(a => a.accountName === item.accountName);
      item.anomalyCount = item.detectedAnomalies.length;
    }

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
  async generateBookkeepingChecks(transactions: any[]): Promise<BookkeepingCheckItem[]> {
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
      checks.push({
        id: `check_receipt_${category}`,
        type: '不足',
        title: `領収書の添付が必要: ${category} (${data.count}件)`,
        description: `${category}カテゴリで${data.count}件の取引に領収書が添付されていません。税務調査時に必要となるため、必ず添付してください。`,
        actionable: true
      });
    });

    // 高額取引のチェック（個別表示）
    highAmountTransactions.forEach((transaction) => {
      const amount = transaction.amount as number;
      const category = (transaction.category as string) || 'その他';
      const description = transaction.description as string;
      const date = transaction.date as string;
      const id = transaction.id as string;

      checks.push({
        id: `check_high_amount_${id}`,
        type: '確認',
        title: `高額支出の確認: ${category} ¥${amount.toLocaleString()} (${date})`,
        description: `${description}の支出が10万円を超えています。事業との関連性と根拠資料を確認してください。`,
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
        checks.push({
          id: `check_description_${category}`,
          type: '推奨',
          title: `説明の充実を推奨: ${category} (${count}件)`,
          description: `${category}カテゴリで${count}件の取引説明が簡素です。事業との関連性や支出目的がわかるよう、詳細な説明を追加することを推奨します。`,
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
        checks.push({
          id: `check_category_frequency_${category}`,
          type: '確認',
          title: `頻繁な取引の確認: ${category}`,
          description: `${category}の取引が${count}件あります。取引内容の一貫性と事業性を確認してください。`,
          actionable: false
        });
      }
    });

    // 全体的なチェック
    const totalTransactions = transactions.length;
    if (totalTransactions < 5) {
      checks.push({
        id: 'check_overall_transaction_count',
        type: '推奨',
        title: '取引件数の確認',
        description: `取引件数が${totalTransactions}件と少ないです。事業の実態に合った取引数を確認してください。`,
        actionable: false
      });
    }

    // チェック項目を優先順位でソート（不足 -> 確認 -> 推奨）
    const typeOrder = { '不足': 3, '確認': 2, '推奨': 1 };
    return checks.sort((a, b) => typeOrder[b.type] - typeOrder[a.type]);
  }
}

export const auditService = new AuditService();
