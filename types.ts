
export type TransactionType = 'expense' | 'income';

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  category: string;
  type: TransactionType;
  receiptUrl?: string;
  createdAt: number;
  // Income-specific fields
  payerName?: string;
  withholdingTax?: number;
}

export interface TransactionRule {
  id: string;
  keyword: string;
  category: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  timestamp: number;
}

export interface AIAction {
  type: 'ADD_TRANSACTION' | 'SUGGEST_CONFIRMATION' | 'SHOW_REPORT' | 'CREATE_RULE' | 'AUDIT_RISK' | 'NONE';
  data?: Partial<Transaction> & Partial<TransactionRule> & {
    category?: string;
    riskLevel?: 'high' | 'medium' | 'low';
    taxAuthorityConcerns?: string[];
    userPreparationPoints?: string[];
    recommendations?: string[];
  };
}

export interface AIResponse {
  reply: string;
  actions: AIAction[];
}

export interface AuditPrediction {
  id: string;
  accountName: string; // 勘定科目名
  amount: number;
  riskLevel: 'low' | 'medium' | 'high'; // リスクレベル
  comment: string; // 指摘コメント
  transactionId: string; // 元の取引ID
}

// 異常検知情報
export interface AnomalyDetection {
  dimension: '構成比異常' | '急変異常' | '統計的異常' | '比率変動異常';
  accountName: string;
  value: number;
  severity: 'low' | 'medium' | 'high';
  message: string;          // 既存: UI表示用の説明文
  fact?: string;            // 🆕 事実の簡潔な記述（AI用）
  ruleDescription?: string; // 🆕 検知ルールの説明（AI用）
}

// 監査予報（全体）- 勘定科目合計・比率ベースの論点
export interface AuditForecastItem {
  id: string;
  accountName: string; // 勘定科目名
  totalAmount: number; // 合計金額
  ratio: number; // 全体に対する比率（%）
  riskLevel: 'low' | 'medium' | 'high'; // リスクレベル
  issues: string[]; // 論点リスト

  // 異常検知由来（追加）
  zScore: number | null;          // 標準偏差からの乖離度（null: データなし）
  growthRate: number | null;      // 前年比成長率（%）（null: データなし）
  diffRatio: number | null;       // 前年との比率差（ポイント）（null: データなし）
  anomalyRisk?: 'low' | 'medium' | 'high';  // 異常検知によるリスク

  // 評価軸方式（新規追加）
  detectedAnomalies?: AnomalyDetection[];  // この項目で検知された異常リスト
  anomalyCount?: number;  // 異常検知数

  // AI生成コンテンツ（すべてオプショナル・テキストのみ）
  aiSuspicionView?: string;        // 税務署からの見られ方（AIが生成）
  aiPreparationAdvice?: string;    // 準備すべきことの説明（AIが生成）
}

// 記帳チェック（個別）- 個別のチェック項目
export interface BookkeepingCheckItem {
  id: string;
  type: '不足' | '確認' | '推奨'; // チェックタイプ
  title: string; // チェック項目名
  description: string; // 詳細説明
  actionable: boolean; // その場で修正可能か
  transactionId?: string; // 関連する取引ID（任意）
}

export interface AuditChatContext {
  predictionId: string;
  accountName: string;
  amount: number;
  currentCategory: string;
  riskLevel: 'low' | 'medium' | 'high';
  comment: string;
}
