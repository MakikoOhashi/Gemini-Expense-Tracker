
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
  type: 'ADD_TRANSACTION' | 'SUGGEST_CONFIRMATION' | 'SHOW_REPORT' | 'CREATE_RULE' | 'NONE';
  data?: Partial<Transaction> & Partial<TransactionRule>;
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

export interface AuditChatContext {
  predictionId: string;
  accountName: string;
  amount: number;
  currentCategory: string;
  riskLevel: 'low' | 'medium' | 'high';
  comment: string;
}
