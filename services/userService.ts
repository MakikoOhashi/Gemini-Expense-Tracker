import { db } from '../lib/firebase.js';
import jwt from 'jsonwebtoken';

export interface UserDocument {
  last_access_date: string; // YYYY-MM-DD format
  last_forecast: { [date: string]: Array<{ id: number; prediction: string; score: number }> };
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
   * 監査予報ページアクセス時の処理
   * last_access_dateを更新
   */
  async updateLastAccessDate(googleId: string, accessDate: string): Promise<void> {
    try {
      await this.createOrUpdateUserDocument(googleId, {
        last_access_date: accessDate
      });
    } catch (error) {
      console.error('Error updating last access date:', error);
      throw error;
    }
  }

  /**
   * 予報結果を保存
   */
  async saveForecastResult(
    googleId: string,
    forecastDate: string,
    forecastResults: ForecastResult[]
  ): Promise<void> {
    try {
      const userDoc = await this.getUserDocument(googleId);
      const lastForecast = userDoc?.last_forecast || {};

      // 指定された日付の予報結果を更新
      lastForecast[forecastDate] = forecastResults;

      await this.createOrUpdateUserDocument(googleId, {
        last_forecast: lastForecast
      });
    } catch (error) {
      console.error('Error saving forecast result:', error);
      throw error;
    }
  }

  /**
   * 指定された日付の予報結果を取得
   */
  async getForecastResult(googleId: string, forecastDate: string): Promise<ForecastResult[] | null> {
    try {
      const userDoc = await this.getUserDocument(googleId);
      if (userDoc?.last_forecast && userDoc.last_forecast[forecastDate]) {
        return userDoc.last_forecast[forecastDate];
      }
      return null;
    } catch (error) {
      console.error('Error getting forecast result:', error);
      throw error;
    }
  }

  /**
   * ユーザーの最終アクセス日を取得
   */
  async getLastAccessDate(googleId: string): Promise<string | null> {
    try {
      const userDoc = await this.getUserDocument(googleId);
      return userDoc?.last_access_date || null;
    } catch (error) {
      console.error('Error getting last access date:', error);
      throw error;
    }
  }
}

export const userService = new UserService();
