import { db } from '../lib/firebase.js';
import jwt from 'jsonwebtoken';
import { AuditForecastItem } from '../types';

export interface UserDocument {
  last_access: { [year: string]: string }; // { "2025": "2026-01-19", "2026": "2026-01-18" }
  forecasts: { [year: string]: { [date: string]: AuditForecastItem[] } }; // { "2025": { "2026-01-19": [...] } }
}

export interface ForecastResult {
  id: number;
  prediction: string;
  score: number;
}

export class UserService {
  /**
   * Google OAuth IDトークンからsub（ユーザーID）を取得
   */
  private extractSubFromIdToken(idToken: string): string {
    try {
      const decoded = jwt.decode(idToken, { complete: true });
      if (decoded && typeof decoded.payload === 'object' && 'sub' in decoded.payload) {
        return decoded.payload.sub as string;
      }
      throw new Error('Invalid ID token format');
    } catch (error) {
      console.error('Error extracting sub from ID token:', error);
      throw new Error('Failed to extract user ID from token');
    }
  }

  /**
   * ユーザードキュメントを取得
   */
  async getUserDocument(googleId: string): Promise<UserDocument | null> {
    try {
      const userDoc = await db.collection('users').doc(googleId).get();
      if (userDoc.exists) {
        return userDoc.data() as UserDocument;
      }
      return null;
    } catch (error) {
      console.error('Error getting user document:', error);
      throw error;
    }
  }

  /**
   * ユーザードキュメントを作成または更新
   */
  async createOrUpdateUserDocument(googleId: string, data: Partial<UserDocument>): Promise<void> {
    try {
      const userRef = db.collection('users').doc(googleId);
      await userRef.set(data, { merge: true });
      console.log(`User document updated for googleId: ${googleId}`);
    } catch (error) {
      console.error('Error creating/updating user document:', error);
      throw error;
    }
  }

  /**
   * 指定された年度の最終アクセス日を取得
   */
  async getLastAccessDate(googleId: string, year: string): Promise<string | null> {
    try {
      const userDoc = await this.getUserDocument(googleId);
      return userDoc?.last_access?.[year] || null;
    } catch (error) {
      console.error('Error getting last access date:', error);
      throw error;
    }
  }

  /**
   * 指定された年度の最終アクセス日を更新
   */
  async updateLastAccessDate(googleId: string, year: string, accessDate: string): Promise<void> {
    try {
      const userDoc = await this.getUserDocument(googleId);
      const lastAccess = userDoc?.last_access || {};

      // 指定された年度のアクセス日を更新
      lastAccess[year] = accessDate;

      await this.createOrUpdateUserDocument(googleId, {
        last_access: lastAccess
      });
    } catch (error) {
      console.error('Error updating last access date:', error);
      throw error;
    }
  }

  /**
   * 指定された年度・日付の監査予報を取得
   */
  async getForecast(googleId: string, year: string, date: string): Promise<AuditForecastItem[] | null> {
    try {
      const userDoc = await this.getUserDocument(googleId);
      if (userDoc?.forecasts?.[year]?.[date]) {
        return userDoc.forecasts[year][date];
      }
      return null;
    } catch (error) {
      console.error('Error getting forecast:', error);
      throw error;
    }
  }

  /**
   * 監査予報結果を保存
   */
  async saveForecast(
    googleId: string,
    year: string,
    date: string,
    forecastResults: AuditForecastItem[]
  ): Promise<void> {
    try {
      const userDoc = await this.getUserDocument(googleId);
      const forecasts = userDoc?.forecasts || {};

      // 指定された年度の予報データを初期化
      if (!forecasts[year]) {
        forecasts[year] = {};
      }

      // 指定された日付の予報結果を保存
      forecasts[year][date] = forecastResults;

      await this.createOrUpdateUserDocument(googleId, {
        forecasts: forecasts
      });
    } catch (error) {
      console.error('Error saving forecast:', error);
      throw error;
    }
  }
}

export const userService = new UserService();
