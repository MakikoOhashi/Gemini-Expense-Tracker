
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
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
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
