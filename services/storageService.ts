
import { Transaction, ChatMessage, TransactionRule } from "../types";

const TRANSACTIONS_KEY = 'gemini_expense_tracker_transactions';
const MESSAGES_KEY = 'gemini_expense_tracker_messages';
const RULES_KEY = 'gemini_expense_tracker_rules';

export const storageService = {
  saveTransactions: (transactions: Transaction[]) => {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
  },
  loadTransactions: (): Transaction[] => {
    const data = localStorage.getItem(TRANSACTIONS_KEY);
    return data ? JSON.parse(data) : [];
  },
  saveMessages: (messages: ChatMessage[]) => {
    // 画像を除いてメッセージを保存（localStorage制限対策）
    const messagesWithoutImages = messages.map(m => {
      const { image, ...rest } = m;
      return rest;
    });
    try {
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(messagesWithoutImages));
    } catch (e) {
      console.warn('メッセージ保存に失敗しました（容量制限）');
      // 古いメッセージを削除して再試行
      const trimmedMessages = messagesWithoutImages.slice(-20);
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(trimmedMessages));
    }
  },
  loadMessages: (): ChatMessage[] => {
    const data = localStorage.getItem(MESSAGES_KEY);
    return data ? JSON.parse(data) : [];
  },
  saveRules: (rules: TransactionRule[]) => {
    localStorage.setItem(RULES_KEY, JSON.stringify(rules));
  },
  loadRules: (): TransactionRule[] => {
    const data = localStorage.getItem(RULES_KEY);
    return data ? JSON.parse(data) : [];
  }
};
