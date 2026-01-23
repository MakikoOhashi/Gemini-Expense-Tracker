import { db } from '../lib/firebase.js';
import admin from 'firebase-admin';
import jwt from 'jsonwebtoken';
import { AuditForecastItem } from '../types.ts';

export interface UserDocument {
  last_access: { [year: string]: string }; // { "2025": "2026-01-19", "2026": "2026-01-18" }
  forecasts: { [year: string]: { date: string; results: AuditForecastItem[]; updatedAt: admin.firestore.FieldValue } }; // NORMALIZED FORMAT ONLY: { "2025": { date: "2026-01-19", results: [...], updatedAt: Timestamp } }
  lastSummaryGeneratedAt?: string; // JST date string (YYYY-MM-DD) for daily limit
}

export interface ForecastResult {
  id: number;
  prediction: string;
  score: number;
}

export class UserService {
  /**
   * 監査予報データの構造を検証し、正規化されたフォーマットのみを許可
   */
  private validateForecastStructure(userDoc: UserDocument | null): void {
    if (!userDoc) return;

    let hasLegacyFormat = false;

    // 検出するレガシー形式:
    // 1. forecastsに直接日付キーがある場合 (forecasts["2026-01-21"])
    // 2. forecasts[year]が配列である場合
    // 3. forecasts[year]がオブジェクトだが、ネストされた日付キーがある場合 (forecasts["2026"]["2026-01-21"])
    // 4. 新しいドット記法のキーを検証 (forecasts.2025)

    // まず従来のforecastsオブジェクトをチェック（後方互換性のため）
    if (userDoc.forecasts) {
      const forecasts = userDoc.forecasts;
      Object.keys(forecasts).forEach(key => {
        const value = forecasts[key];

        // 日付形式のキー（YYYY-MM-DD）を検出
        if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
          console.warn(`🚨 LEGACY FORMAT DETECTED: Root-level date key found: forecasts["${key}"]`);
          hasLegacyFormat = true;
        }

        // 値が配列の場合（古いフォーマット）
        if (Array.isArray(value)) {
          console.warn(`🚨 LEGACY FORMAT DETECTED: Array found at forecasts["${key}"] - should be object`);
          hasLegacyFormat = true;
        }

        // 値がオブジェクトで、ネストされた日付キーがある場合
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // 正規化されたフォーマットの場合: { date, results, updatedAt }
          // レガシーなネストの場合: { "2026-01-21": [...] }
          const nestedKeys = Object.keys(value);
          const hasNestedDateKeys = nestedKeys.some(nestedKey => /^\d{4}-\d{2}-\d{2}$/.test(nestedKey));

          if (hasNestedDateKeys) {
            console.warn(`🚨 LEGACY FORMAT DETECTED: Nested date keys found in forecasts["${key}"]: ${nestedKeys.filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).join(', ')}`);
            hasLegacyFormat = true;
          }

          // ネストされたオブジェクトが配列を含む場合も検出
          nestedKeys.forEach(nestedKey => {
            if (Array.isArray(value[nestedKey])) {
              console.warn(`🚨 LEGACY FORMAT DETECTED: Nested array found at forecasts["${key}"]["${nestedKey}"]`);
              hasLegacyFormat = true;
            }
          });
        }
      });
    }

    // 次に新しいドット記法のforecastデータをチェック
    Object.keys(userDoc).forEach(key => {
      if (key.startsWith('forecasts.')) {
        const value = (userDoc as any)[key];

        // 正規化されたフォーマットか確認: { date, results, updatedAt }
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const requiredKeys = ['date', 'results', 'updatedAt'];
          const hasRequiredKeys = requiredKeys.every(requiredKey => requiredKey in value);

          if (!hasRequiredKeys) {
            console.warn(`🚨 MALFORMED NORMALIZED FORMAT: Missing required keys in ${key}: expected ${requiredKeys.join(', ')}`);
            hasLegacyFormat = true;
          }

          // resultsが配列であることを確認
          if (!Array.isArray(value.results)) {
            console.warn(`🚨 MALFORMED NORMALIZED FORMAT: results is not an array in ${key}`);
            hasLegacyFormat = true;
          }

          // dateがYYYY-MM-DD形式であることを確認
          if (typeof value.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.date)) {
            console.warn(`🚨 MALFORMED NORMALIZED FORMAT: date is not valid YYYY-MM-DD format in ${key}: ${value.date}`);
            hasLegacyFormat = true;
          }
        } else {
          console.warn(`🚨 MALFORMED NORMALIZED FORMAT: ${key} should be an object with date, results, updatedAt`);
          hasLegacyFormat = true;
        }
      }
    });

    if (hasLegacyFormat) {
      console.error('🚨 MALFORMED FORECAST STRUCTURE DETECTED - Legacy formats must be cleaned up');
      throw new Error('Malformed forecast structure detected. Legacy formats are not supported.');
    }
  }

  /**
   * レガシーな監査予報データをクリーンアップ
   */
  private async cleanupLegacyForecastData(googleId: string, userDoc: UserDocument): Promise<void> {
    if (!userDoc?.forecasts) return;

    const forecasts = userDoc.forecasts;
    const cleanupOperations: any[] = [];
    let needsCleanup = false;

    console.log('🧹 Checking for legacy forecast data to clean up...');

    // 1. ルートレベルの日付キーを削除 (forecasts["2026-01-21"])
    Object.keys(forecasts).forEach(key => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
        console.log(`🗑️ Removing legacy root-level date key: forecasts["${key}"]`);
        cleanupOperations.push({
          [`forecasts.${key}`]: admin.firestore.FieldValue.delete()
        });
        needsCleanup = true;
      }
    });

    // 2. ネストされた日付キーをクリーンアップ
    Object.keys(forecasts).forEach(yearKey => {
      const yearData = forecasts[yearKey];

      if (typeof yearData === 'object' && yearData !== null && !Array.isArray(yearData)) {
        const nestedKeys = Object.keys(yearData);
        const dateKeys = nestedKeys.filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key));

        dateKeys.forEach(dateKey => {
          console.log(`🗑️ Removing legacy nested date key: forecasts["${yearKey}"]["${dateKey}"]`);
          cleanupOperations.push({
            [`forecasts.${yearKey}.${dateKey}`]: admin.firestore.FieldValue.delete()
          });
          needsCleanup = true;
        });
      }
    });

    if (needsCleanup && cleanupOperations.length > 0) {
      console.log(`🧹 Performing ${cleanupOperations.length} cleanup operations...`);

      // 複数のクリーンアップ操作をバッチ実行
      const batch = db.batch();
      const userRef = db.collection('users').doc(googleId);

      cleanupOperations.forEach(operation => {
        batch.update(userRef, operation);
      });

      await batch.commit();
      console.log('✅ Legacy forecast data cleanup completed');
    } else {
      console.log('✅ No legacy forecast data found - cleanup not needed');
    }
  }

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
   * 指定された年度・日付の監査予報を取得（正規化されたフォーマットのみサポート）
   */
  async getForecast(googleId: string, year: string, date: string): Promise<AuditForecastItem[] | null> {
    try {
      console.log(`🔍 Getting forecast for ${googleId}, year: ${year}, date: ${date}`);

      const userDoc = await this.getUserDocument(googleId);

      // 構造検証を実行（レガシー形式を検出）
      console.log('🔍 Validating forecast structure on read...');
      this.validateForecastStructure(userDoc);

      // Firestoreのドット記法で保存されたデータを取得: forecasts.2025
      const forecastKey = `forecasts.${year}`;
      const forecastData = userDoc?.[forecastKey];

      // 正規化されたフォーマットのみサポート: forecasts[year] = { date, results, updatedAt }
      if (forecastData && typeof forecastData === 'object' && !Array.isArray(forecastData)) {
        // 正しい構造か確認
        if (forecastData.date === date && Array.isArray(forecastData.results)) {
          console.log(`✅ Forecast found in normalized format for year ${year}, date ${date}`);
          return forecastData.results;
        } else {
          console.warn(`⚠️ Forecast data exists but date mismatch or invalid structure: expected date=${date}, found date=${forecastData.date}`);
          return null;
        }
      }

      console.log(`ℹ️ No forecast data found for year ${year}, date ${date}`);
      return null;
    } catch (error) {
      console.error('Error getting forecast:', error);
      throw error;
    }
  }

  /**
   * 監査予報結果を保存（年度ごとに1件のみ上書き - 正規化されたフォーマットのみ）
   */
  async saveForecast(
    googleId: string,
    year: string,
    date: string,
    forecastResults: AuditForecastItem[]
  ): Promise<void> {
    try {
      console.log(`💾 Starting forecast save for ${googleId}, year: ${year}, date: ${date}`);

      // 1. 現在のユーザードキュメントを取得
      const userDoc = await this.getUserDocument(googleId);

      // 2. 構造検証を実行（レガシー形式を検出）
      console.log('🔍 Validating forecast structure...');
      this.validateForecastStructure(userDoc);

      // 3. レガシー形式のクリーンアップを実行（必要な場合）
      console.log('🧹 Performing legacy data cleanup...');
      await this.cleanupLegacyForecastData(googleId, userDoc);

      // 4. データの検証（オプショナルフィールドのundefinedは許可）
      console.log('✅ Validating forecast results data...');
      const hasUndefined = forecastResults.some(result =>
        // 必須フィールドのみチェック（オプショナルフィールドのundefinedは許可）
        result.id === undefined ||
        result.accountName === undefined ||
        result.totalAmount === undefined ||
        result.ratio === undefined ||
        result.riskLevel === undefined ||
        result.issues === undefined ||
        // 配列内のundefinedチェック
        (Array.isArray(result.issues) && result.issues.some(item => item === undefined)) ||
        (Array.isArray(result.detectedAnomalies) && result.detectedAnomalies.some(item => item === undefined))
      );

      if (hasUndefined) {
        console.error('❌ Firestore保存前にundefined値が検出されました（必須フィールド）');
        throw new Error('forecastResultsに必須フィールドのundefined値が含まれています');
      }

      // 5. Firestore用にデータを正規化（undefinedをnullに変換）
      const normalizedForecastResults = forecastResults.map(result => ({
        ...result,
        // Firestoreはundefinedを許可しないのでnullに変換
        zScore: result.zScore !== undefined ? result.zScore : null,
        growthRate: result.growthRate !== undefined ? result.growthRate : null,
        diffRatio: result.diffRatio !== undefined ? result.diffRatio : null,
        anomalyRisk: result.anomalyRisk !== undefined ? result.anomalyRisk : null,
        anomalyCount: result.anomalyCount !== undefined ? result.anomalyCount : null,
        aiSuspicionView: result.aiSuspicionView !== undefined ? result.aiSuspicionView : null,
        aiPreparationAdvice: result.aiPreparationAdvice !== undefined ? result.aiPreparationAdvice : null,
      }));

      // 6. 正規化されたフォーマットで保存
      const updatePath = `forecasts.${year}`;
      const updateData = {
        [updatePath]: {
          date: date,
          results: normalizedForecastResults,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }
      };

      console.log(`💾 Saving to normalized path: ${updatePath}`);
      console.log(`💾 Forecast results count: ${forecastResults.length}`);

      await this.createOrUpdateUserDocument(googleId, updateData);

      console.log(`✅ Forecast saved successfully in normalized format for ${googleId}, year: ${year}, date: ${date}`);
    } catch (error) {
      console.error('Error saving forecast:', error);
      throw error;
    }
  }

  /**
   * 最後の集計生成日時を取得（JSTベース）
   */
  async getLastSummaryGeneratedAt(googleId: string): Promise<string | null> {
    try {
      const userDoc = await this.getUserDocument(googleId);
      return userDoc?.lastSummaryGeneratedAt || null;
    } catch (error) {
      console.error('Error getting last summary generated date:', error);
      throw error;
    }
  }

  /**
   * 最後の集計生成日時を更新（JSTベース）
   */
  async updateLastSummaryGeneratedAt(googleId: string, generatedAt: string): Promise<void> {
    try {
      await this.createOrUpdateUserDocument(googleId, {
        lastSummaryGeneratedAt: generatedAt
      });
      console.log(`📅 Updated last summary generated date for user ${googleId}: ${generatedAt}`);
    } catch (error) {
      console.error('Error updating last summary generated date:', error);
      throw error;
    }
  }

  /**
   * 当日(JST)が集計生成済みかどうかをチェック
   */
  async hasGeneratedSummaryToday(googleId: string): Promise<boolean> {
    try {
      const lastGeneratedAt = await this.getLastSummaryGeneratedAt(googleId);
      if (!lastGeneratedAt) {
        return false;
      }

      // JSTで今日の日付を取得
      const todayJST = new Date();
      todayJST.setTime(todayJST.getTime() + (todayJST.getTimezoneOffset() + 9 * 60) * 60 * 1000);
      const todayString = todayJST.toISOString().split('T')[0];

      return lastGeneratedAt === todayString;
    } catch (error) {
      console.error('Error checking daily summary generation limit:', error);
      throw error;
    }
  }
}

export const userService = new UserService();
