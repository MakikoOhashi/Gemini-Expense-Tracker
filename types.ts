
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
