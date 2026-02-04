import { authService } from './authService.ts';

export interface ExpenseData {
  date: string;
  amount: number;
  category: string;
  memo?: string;
  receipt_url?: string;
}

export interface TransactionData {
  id?: string;
  date: string;
  amount: number;
  category: string;
  memo?: string;
  receipt_url?: string;
  type: 'expense' | 'income';
}

export interface Rule {
  id?: string;
  keyword: string;
  category: string;
  confidence: number;
  notes?: string;
}

const API_URL = process.env.VITE_API_URL || 'http://localhost:3001';

export class SheetsService {
  private baseUrl = `${API_URL}/api`;
  private userId: string = 'test-user';

  setUserId(userId: string) {
    this.userId = userId;
  }

  async getOrCreateSpreadsheet(year?: number): Promise<{ spreadsheetId: string; spreadsheetName: string }> {
    try {
      const currentYear = year || new Date().getFullYear();
      const response = await fetch(`${this.baseUrl}/spreadsheet/${currentYear}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: this.userId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'スプレッドシートの取得/作成に失敗しました');
      }

      return result;
    } catch (error: any) {
      console.error('Spreadsheet Get/Create Error:', error);
      throw new Error(error.message || 'ネットワークエラーが発生しました');
    }
  }

  async initialize(year?: number): Promise<{ spreadsheetId: string; spreadsheetName: string }> {
    try {
      const currentYear = year || new Date().getFullYear();
      const response = await fetch(`${this.baseUrl}/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: this.userId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'システムの初期化に失敗しました');
      }

      return result;
    } catch (error: any) {
      console.error('System Initialize Error:', error);
      throw new Error(error.message || 'ネットワークエラーが発生しました');
    }
  }

  async getRules(year?: number): Promise<Rule[]> {
    try {
      const currentYear = year || new Date().getFullYear();
      const response = await fetch(`${this.baseUrl}/rules/${currentYear}?userId=${this.userId}`);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'ルールの取得に失敗しました');
      }

      return result.rules || [];
    } catch (error: any) {
      console.error('Get Rules Error:', error);
      throw new Error(error.message || 'ネットワークエラーが発生しました');
    }
  }

  async addRule(rule: Omit<Rule, 'id'>, year?: number): Promise<{ success: boolean; rule: Rule }> {
    try {
      const currentYear = year || new Date().getFullYear();
      const response = await fetch(`${this.baseUrl}/rules/${currentYear}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...rule, userId: this.userId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'ルールの追加に失敗しました');
      }

      return result;
    } catch (error: any) {
      console.error('Add Rule Error:', error);
      throw new Error(error.message || 'ネットワークエラーが発生しました');
    }
  }

  async getCurrentSpreadsheetId(): Promise<{ spreadsheetId: string; spreadsheetName: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/spreadsheet-id?userId=${this.userId}`);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'スプレッドシートIDの取得に失敗しました');
      }

      return result;
    } catch (error: any) {
      console.error('Get Spreadsheet ID Error:', error);
      throw new Error(error.message || 'ネットワークエラーが発生しました');
    }
  }

  async saveExpense(expenseData: ExpenseData): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...expenseData, userId: this.userId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'データの保存に失敗しました');
      }

      return result;
    } catch (error: any) {
      console.error('Sheets API Error:', error);
      throw new Error(error.message || 'ネットワークエラーが発生しました');
    }
  }

  async getTransactions(year?: number): Promise<any> {
    try {
      const currentYear = year || new Date().getFullYear();
      
      // 並列で支出と売上を取得
      const [expensesResponse, incomeResponse] = await Promise.all([
        fetch(`${this.baseUrl}/expenses?userId=${this.userId}&year=${currentYear}`),
        fetch(`${this.baseUrl}/income?userId=${this.userId}&year=${currentYear}`)
      ]);

      const expensesResult = await expensesResponse.json();
      const incomeResult = await incomeResponse.json();

      if (!expensesResponse.ok) {
        throw new Error(expensesResult.error || '支出データの取得に失敗しました');
      }
      if (!incomeResponse.ok) {
        throw new Error(incomeResult.error || '売上データの取得に失敗しました');
      }

      // フォルダ競合チェック（厳密比較: true の場合のみ）
      if (expensesResult.isFolderAmbiguous === true || incomeResult.isFolderAmbiguous === true) {
        console.warn('⚠️ フォルダ名の重複を検出しました');
        return {
          isFolderAmbiguous: true,
          folderConflict: expensesResult.folderConflict || incomeResult.folderConflict,
          expenses: [],
          income: []
        };
      }

      // データを結合（receiptUrlフィールドをreceipt_urlに統一、idも保持）
      const expenses: TransactionData[] = (expensesResult.expenses || []).map((e: any) => {
        console.log('📋 支出データ受信:', { id: e.id, date: e.date, amount: e.amount,
          receiptUrl: e.receiptUrl });
        return {
          id: e.id,
          date: e.date,
          amount: e.amount,
          category: e.category,
          memo: e.memo,
          receipt_url: e.receiptUrl || '',
          type: 'expense' as const
        };
      });

      const income: TransactionData[] = (incomeResult.income || []).map((i: any) => {
        console.log('📋 売上データ受信:', { id: i.id, date: i.date, amount: i.amount, payerName: i.payerName });
        return {
          id: i.id,
          date: i.date,
          amount: i.amount,
          category: i.category,
          memo: i.memo || '', 
          receipt_url: i.receiptUrl || '',
          type: 'income' as const,
          payerName: i.payerName || '',
          withholdingTax: i.withholdingTax || 0
        };
      });

      // 日付でソート（新しい順）
      const allTransactions = [...expenses, ...income].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      console.log(`📊 ${currentYear}年度の取引データを取得: ${allTransactions.length}件`);
      if (allTransactions.length > 0) {
        console.log('📋 サンプルデータ:', allTransactions[0]);
      }
      return allTransactions;
    } catch (error: any) {
      console.error('Get Transactions Error:', error);
      throw new Error(error.message || 'ネットワークエラーが発生しました');
    }
  }

  async updateTransaction(transaction: TransactionData): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/update-transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...transaction,
          userId: this.userId
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'データの更新に失敗しました');
      }

      return result;
    } catch (error: any) {
      console.error('Update Transaction Error:', error);
      throw new Error(error.message || 'ネットワークエラーが発生しました');
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  async generateSummary(year?: number): Promise<{ success: boolean; message: string; lastUpdated?: string }> {
    try {
      const currentYear = year || new Date().getFullYear();

      // Get ID token from auth service
      const idToken = await authService.getIdToken();

      if (!idToken) {
        throw new Error('認証されていません');
      }

      const response = await fetch(`${this.baseUrl}/audit-forecast-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}` // Using real ID token
        },
        body: JSON.stringify({ year: currentYear }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '集計生成に失敗しました');
      }

      return result;
    } catch (error: any) {
      console.error('Generate Summary Error:', error);
      throw new Error(error.message || 'ネットワークエラーが発生しました');
    }
  }

  async getSummaryMeta(year?: number): Promise<{ hasSummary: boolean; lastUpdated: string | null; message?: string }> {
    try {
      const currentYear = year || new Date().getFullYear();

      // Get ID token from auth service to get real Google ID
      const idToken = await authService.getIdToken();
      if (!idToken) {
        throw new Error('認証されていません');
      }

      // Get last summary generated date from Firestore via server API
      const response = await fetch(`${this.baseUrl}/user/last-summary-generated/${encodeURIComponent(idToken)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '集計メタデータの取得に失敗しました');
      }

      const lastUpdated = result.lastSummaryGeneratedAt;
      const hasSummary = !!lastUpdated;

      // Format for display: "YYYY-MM-DD HH:mm JST"
      let formattedLastUpdated = null;
      if (lastUpdated) {
        // Handle Firestore Timestamp object or string
        let dateObj = lastUpdated;
        if (typeof lastUpdated === 'object' && lastUpdated.toDate) {
          // Firestore Timestamp object
          dateObj = lastUpdated.toDate();
        }
        // Convert to JST
        const jstDate = new Date(dateObj.getTime() + (dateObj.getTimezoneOffset() + 9 * 60) * 60 * 1000);
        const dateString = jstDate.toISOString().split('T')[0];
        // Format as "YYYY-MM-DD HH:mm JST"
        const hours = String(jstDate.getHours()).padStart(2, '0');
        const minutes = String(jstDate.getMinutes()).padStart(2, '0');
        formattedLastUpdated = `${dateString} ${hours}:${minutes} JST`;
      }

      return {
        hasSummary,
        lastUpdated: formattedLastUpdated,
        message: null
      };
    } catch (error: any) {
      console.error('Get Summary Meta Error:', error);
      throw new Error(error.message || 'ネットワークエラーが発生しました');
    }
  }
}

export const sheetsService = new SheetsService();
