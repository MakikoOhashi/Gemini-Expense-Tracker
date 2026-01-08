export interface ExpenseData {
  date: string;
  amount: number;
  category: string;
  memo?: string;
  receipt_url?: string;
}

export interface Rule {
  id?: string;
  keyword: string;
  category: string;
  confidence: number;
  notes?: string;
}

export class SheetsService {
  private baseUrl = 'http://localhost:3001/api';
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

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

export const sheetsService = new SheetsService();
