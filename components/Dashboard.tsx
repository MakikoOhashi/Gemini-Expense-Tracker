
import React, { useState, useEffect } from 'react';
import { ExclamationTriangleIcon, EyeIcon, ChatBubbleLeftRightIcon, CheckCircleIcon, XCircleIcon, ArrowPathIcon, LightBulbIcon } from '@heroicons/react/24/outline';
import { Transaction, AuditPrediction, AuditForecastItem, BookkeepingCheckItem } from '../types';
import { auditService } from '../services/auditService';
import { sheetsService } from '../services/sheetsService';
import { authService } from '../services/authService';
import AuditForecast from '../src/components/audit/AuditForecast';
import { getTodayJSTString, getTodayJSTDateTimeString } from '../lib/dateUtils';
import { TEXT, Language } from '../src/i18n/text';

// API URL from environment variable
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// DEMO ONLY: Helper to check if user is in demo mode
// TODO: remove demo mode before production
function isDemoUser(userId: string): boolean {
  return userId === 'demo-user';
}

interface DashboardProps {
  transactions: Transaction[];
  onAuditQuery?: (query: string) => void;
  onTabChange?: (tab: 'chat' | 'dashboard' | 'history' | 'tax') => void;
  selectedAuditYear: number | null;
  onAuditYearSelect: (year: number) => void;
  availableYears: number[];
  onOpenYearModal: () => void;
  t: any;
  language?: 'ja' | 'en';
  userId?: string;
  isDemo?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({
  transactions,
  onAuditQuery,
  onTabChange,
  selectedAuditYear,
  onAuditYearSelect,
  availableYears,
  onOpenYearModal,
  t,
  language = 'ja',
  userId,
  isDemo = false
}) => {
  const [auditForecast, setAuditForecast] = useState<AuditForecastItem[]>([]);
  const [bookkeepingChecks, setBookkeepingChecks] = useState<BookkeepingCheckItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(t.loadingAuditForecast || '監査予報を読み込み中...');
  const [forecastLastUpdated, setForecastLastUpdated] = useState<string | null>(null);
  const [taxAuthorityPerspective, setTaxAuthorityPerspective] = useState<string | null>(null);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null);

  // スプレッドシートURLを取得
  useEffect(() => {
    const fetchSpreadsheetUrl = async () => {
      try {
        const currentUserId = userId || 'test-user';
        const response = await fetch(`${API_URL}/api/spreadsheet-id?userId=${currentUserId}`);
        const data = await response.json();
        if (data.spreadsheetId) {
          const rulesSheetGid = data.rulesSheetGid || 3;
          const url = `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit#gid=${rulesSheetGid}`;
          setSpreadsheetUrl(url);
        }
      } catch (error) {
        console.error('Failed to fetch spreadsheet URL:', error);
      }
    };

    fetchSpreadsheetUrl();
  }, [userId]);

  // 監査予報データと記帳チェックデータを取得（Firestoreキャッシュ機能付き）
  useEffect(() => {
    const loadAuditData = async () => {
      if (transactions.length === 0) {
        setAuditForecast([]);
        setBookkeepingChecks([]);
        setForecastLastUpdated(null);
        setTaxAuthorityPerspective(null);
        return;
      }

      // 選択された年度の取引データをフィルタリング
      const filteredTransactions = transactions.filter(t => {
        const transactionYear = new Date(t.date).getFullYear();
        return transactionYear === selectedAuditYear;
      });

      if (filteredTransactions.length === 0) {
        setAuditForecast([]);
        setBookkeepingChecks([]);
        setForecastLastUpdated(null);
        setTaxAuthorityPerspective(null);
        return;
      }

      setIsLoading(true);

      try {
        // DEMO ONLY: Demo mode - skip authentication and Firestore cache
        // TODO: remove demo mode before production
        if (isDemo || isDemoUser(userId || '')) {
          console.log('📊 Demo mode: skipping authentication, generating forecast directly from transactions');
          setLoadingMessage(t.generatingAuditForecast);
          
          if (!selectedAuditYear) return;
          const year = selectedAuditYear.toString();
          const today = getTodayJSTString();
          
          // Generate forecast directly from transactions (no Firestore cache)
          const forecastData = await auditService.generateAuditForecast(filteredTransactions, Number(year), userId || 'demo-user');
          setAuditForecast(forecastData);
          setForecastLastUpdated(getTodayJSTDateTimeString());
          
          // Generate tax authority perspective with AI
          try {
            setLoadingMessage(t.generatingTaxAuthorityPerspective);
            const generatedTaxAuthorityPerspective = await auditService.generateTaxAuthorityPerspective(forecastData, language);
            setTaxAuthorityPerspective(generatedTaxAuthorityPerspective);
          } catch (aiError) {
            console.warn('⚠️ Demo mode: AI perspective generation failed:', aiError);
            setTaxAuthorityPerspective(null);
          }
          
          // Generate bookkeeping checks
          const checksData = await auditService.generateBookkeepingChecks(filteredTransactions, language, t.categories);
          setBookkeepingChecks(checksData);
          
          console.log('✅ Demo mode: audit forecast generated directly from transactions');
          setIsLoading(false);
          return;
        }

        // Get real Google ID from authentication
        const idToken = await authService.getIdToken();
        if (!idToken) {
          throw new Error('認証されていません');
        }

        // Extract Google ID from ID token via server API
        const googleIdResponse = await fetch(`${API_URL}/api/user/last-summary-generated/${encodeURIComponent(idToken)}`);
        const googleIdData = await googleIdResponse.json();
        if (!googleIdResponse.ok) {
          throw new Error(googleIdData.details || 'Google IDの取得に失敗しました');
        }
        const googleId = googleIdData.googleId;

        if (!selectedAuditYear) return; // null の場合は処理しない
        const year = selectedAuditYear.toString();
        const today = getTodayJSTString(); // "2026-01-21" 形式

        // DEMO ONLY: Demo mode check (fallback for safety)
        // TODO: remove demo mode before production
        if (isDemoUser(googleId)) {
          console.log('📊 Demo mode: skipping Firestore cache, generating forecast directly from transactions');
          setLoadingMessage(t.generatingAuditForecast);
          
          // Generate forecast directly from transactions (no Firestore cache)
          const forecastData = await auditService.generateAuditForecast(filteredTransactions, Number(year), googleId);
          setAuditForecast(forecastData);
          setForecastLastUpdated(getTodayJSTDateTimeString());
          
          // Generate tax authority perspective with AI
          try {
            setLoadingMessage(t.generatingTaxAuthorityPerspective);
            const generatedTaxAuthorityPerspective = await auditService.generateTaxAuthorityPerspective(forecastData, language);
            setTaxAuthorityPerspective(generatedTaxAuthorityPerspective);
          } catch (aiError) {
            console.warn('⚠️ Demo mode: AI perspective generation failed:', aiError);
            setTaxAuthorityPerspective(null);
          }
          
          // Generate bookkeeping checks
          const checksData = await auditService.generateBookkeepingChecks(filteredTransactions, language, t.categories);
          setBookkeepingChecks(checksData);
          
          console.log('✅ Demo mode: audit forecast generated directly from transactions');
          setIsLoading(false);
          return;
        }

        try {
          // キャッシュ判定ロジック：forecasts[year]が存在し、dateが今日の日付と一致する場合
          console.log('🔄 キャッシュ判定: サーバーから監査予報を取得します');
          setLoadingMessage(t.loadingSavedForecast);

          // 直接forecastデータを取得してキャッシュ判定
          const forecastResponse = await fetch(`${API_URL}/api/user/forecast/${googleId}/${year}/${today}`);
          const forecastData = await forecastResponse.json();

          if (forecastResponse.ok && forecastData.forecastResults && forecastData.forecastResults.length > 0) {
            // Fix legacy data format: convert 0 to null for zScore, growthRate, diffRatio
            const fixedForecastResults = forecastData.forecastResults.map(item => ({
              ...item,
              zScore: item.zScore === 0 && item.growthRate === 0 && item.diffRatio === 0 ? null : item.zScore,
              growthRate: item.growthRate === 0 && item.zScore === 0 && item.diffRatio === 0 ? null : item.growthRate,
              diffRatio: item.diffRatio === 0 && item.zScore === 0 && item.growthRate === 0 ? null : item.diffRatio
            }));
            setAuditForecast(fixedForecastResults);
            // Use updatedAt timestamp from Firestore
            if (forecastData.updatedAt) {
              const jstDate = forecastData.updatedAt.toDate ? forecastData.updatedAt.toDate() : new Date(forecastData.updatedAt);
              const hours = String(jstDate.getHours()).padStart(2, '0');
              const minutes = String(jstDate.getMinutes()).padStart(2, '0');
              setForecastLastUpdated(`${jstDate.toISOString().split('T')[0]} ${hours}:${minutes}`);
            } else {
              setForecastLastUpdated(getTodayJSTDateTimeString());
            }
            setTaxAuthorityPerspective(forecastData.taxAuthorityPerspective || null);
            console.log('✅ キャッシュから監査予報データを読み込みました（データ修正済み）');
          } else {
            // キャッシュが存在しない場合は新規生成（処理順序: ①スプシ→②関数→③AI→④Firestore）
            console.log('🆕 キャッシュミスまたは初回アクセス: 監査予報を新規生成します');
            setLoadingMessage(t.updatingAuditForecast);
            await refreshForecastOncePerDay(filteredTransactions, googleId, year, today, idToken);
          }
        } catch (cacheError) {
          console.error('❌ キャッシュチェックエラー:', cacheError);
          // キャッシュエラーの場合は “最新の古いキャッシュ” を試してから新規生成へ
          console.log('🔄 キャッシュエラー: 最新の古いキャッシュにフォールバックします');
          const latestResponse = await fetch(`${API_URL}/api/user/forecast-latest/${googleId}/${year}`);
          const latestData = await latestResponse.json();
          if (latestResponse.ok && latestData?.forecastResults?.length > 0) {
            setAuditForecast(latestData.forecastResults);
            // Use updatedAt timestamp from Firestore
            if (latestData.updatedAt) {
              const jstDate = latestData.updatedAt.toDate ? latestData.updatedAt.toDate() : new Date(latestData.updatedAt);
              const hours = String(jstDate.getHours()).padStart(2, '0');
              const minutes = String(jstDate.getMinutes()).padStart(2, '0');
              setForecastLastUpdated(`${jstDate.toISOString().split('T')[0]} ${hours}:${minutes}`);
            } else {
              setForecastLastUpdated(getTodayJSTDateTimeString());
            }
            setTaxAuthorityPerspective(latestData.taxAuthorityPerspective || null);
          } else {
            console.log('🔄 古いキャッシュも無い/取得失敗: 新規生成にフォールバックします');
            setLoadingMessage(t.updatingAuditForecast);
            await refreshForecastOncePerDay(filteredTransactions, googleId, year, today, idToken);
          }
        }

        // 記帳チェックデータは常に新規生成（キャッシュ不要）
        const checksData = await auditService.generateBookkeepingChecks(filteredTransactions, language, t.categories);
        setBookkeepingChecks(checksData);

      } catch (error) {
        console.error('❌ 監査データ取得エラー:', error);
        // Firestore接続エラー時は既存処理にフォールバック
        try {
          console.log('🔄 Firestoreエラー: 既存処理にフォールバックします');
          const [forecastData, checksData] = await Promise.all([
            auditService.generateAuditForecast(filteredTransactions, selectedAuditYear || undefined),
            auditService.generateBookkeepingChecks(filteredTransactions, language, t.categories)
          ]);
          setAuditForecast(forecastData);
          setBookkeepingChecks(checksData);
          setForecastLastUpdated(null);
          setTaxAuthorityPerspective(null);
        } catch (fallbackError) {
          console.error('❌ フォールバック処理も失敗:', fallbackError);
          setAuditForecast([]);
          setBookkeepingChecks([]);
          setForecastLastUpdated(null);
          setTaxAuthorityPerspective(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    /**
     * 監査予報の更新（1日1回）
     * 処理順序:
     * ① スプシからSummaryデータ最新取得
     * ② 関数で異常判定・スコア計算
     * ③ AIで文言生成
     * ④ Firestoreにキャッシュ保存
     *
     * 失敗時: 古いキャッシュがあれば返す
     */
    const refreshForecastOncePerDay = async (
      filteredTransactions: Transaction[],
      googleId: string,
      year: string,
      today: string,
      idToken: string
    ) => {
      try {
        // ① Summaryを最新化（サーバー側で1日1回制限・lastSummaryGeneratedAt更新）
        try {
          setLoadingMessage(t.updatingCrossTabulation);
          const summaryResponse = await fetch(`${API_URL}/api/audit-forecast-update`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({ year: Number(year) })
          });
          const summaryData = await summaryResponse.json();
          if (!summaryResponse.ok) {
            throw new Error(summaryData.details || summaryData.error || t.crossTabulationUpdateFailed);
          }
          console.log('✅ Summary updated for audit forecast:', summaryData);
        } catch (summaryError) {
          // Summary更新に失敗しても、予報生成自体は継続可能（ただし要求によりログは明確に）
          console.error('❌ Summary update failed (continuing):', summaryError);
        }

        // ② 関数で異常判定・スコア計算（Summary優先）
        setLoadingMessage(t.generatingAuditForecast);
        const forecastData = await auditService.generateAuditForecast(filteredTransactions, Number(year));
        setAuditForecast(forecastData);
        setForecastLastUpdated(getTodayJSTDateTimeString());

        // ③ AIで日次総括（taxAuthorityPerspectiveのみ生成）
        setLoadingMessage(t.generatingTaxAuthorityPerspective);
        const generatedTaxAuthorityPerspective = await auditService.generateTaxAuthorityPerspective(forecastData, language);
        setTaxAuthorityPerspective(generatedTaxAuthorityPerspective);

        // ④ 生成した予報をサーバーAPI経由でFirestoreに保存（不要フィールドは保存しない）
        console.log('🔍 Saving to Firebase:', forecastData.length, 'items');
        console.log('🔍 First item detectedAnomalies:', forecastData[0]?.detectedAnomalies);

        const requestBody = {
          googleId,
          year,
          date: today,
          forecastResults: forecastData,
          taxAuthorityPerspective: generatedTaxAuthorityPerspective
        };

        // ガード: dateに "/" が含まれていたらエラー
        if (requestBody.date.includes("/")) {
          throw new Error(`Invalid date format detected: ${requestBody.date}`);
        }

        console.log('📤 Sending forecast request:', JSON.stringify(requestBody, null, 2));
        console.log('📅 Date format check:', requestBody.date, '(should be YYYY-MM-DD)');

        // デバッグ: 各forecastResultのtotalAmountを確認
        forecastData.forEach((item, index) => {
          console.log(`📊 Forecast item ${index}: ${item.accountName} = ${item.totalAmount} (${typeof item.totalAmount}, isFinite: ${isFinite(item.totalAmount)})`);
        });

        const saveResponse = await fetch(`${API_URL}/api/user/forecast`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!saveResponse.ok) {
          const saveData = await saveResponse.json();
          throw new Error(saveData.details || t.forecastDataSaveFailed);
        }

        // 最終アクセス日をサーバーAPI経由で更新
        const accessResponse = await fetch(`${API_URL}/api/user/last-access`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            googleId,
            year,
            accessDate: today
          }),
        });

        if (!accessResponse.ok) {
          const accessData = await accessResponse.json();
          throw new Error(accessData.details || t.lastAccessDateUpdateFailed);
        }

        console.log('💾 監査予報データをFirestoreに保存しました');
      } catch (error) {
        console.error('❌ 監査予報生成・保存エラー:', error);
        // 失敗時: 古いキャッシュがあればそれを返す
        try {
          const latestResponse = await fetch(`${API_URL}/api/user/forecast-latest/${googleId}/${year}`);
          const latestData = await latestResponse.json();
          if (latestResponse.ok && latestData?.forecastResults?.length > 0) {
            setAuditForecast(latestData.forecastResults);
            // Use updatedAt timestamp from Firestore
            if (latestData.updatedAt) {
              const jstDate = latestData.updatedAt.toDate ? latestData.updatedAt.toDate() : new Date(latestData.updatedAt);
              const hours = String(jstDate.getHours()).padStart(2, '0');
              const minutes = String(jstDate.getMinutes()).padStart(2, '0');
              setForecastLastUpdated(`${jstDate.toISOString().split('T')[0]} ${hours}:${minutes}`);
            } else {
              setForecastLastUpdated(getTodayJSTDateTimeString());
            }
            setTaxAuthorityPerspective(latestData.taxAuthorityPerspective || null);
            return;
          }
        } catch (fallbackCacheError) {
          console.error('❌ Latest cache fallback failed:', fallbackCacheError);
        }

        // 最終フォールバック: ローカル生成（Firestore保存はしない）
        const fallbackForecast = await auditService.generateAuditForecast(filteredTransactions, Number(year));
        setAuditForecast(fallbackForecast);
        setForecastLastUpdated(null);
        setTaxAuthorityPerspective(null);
      }
    };

    loadAuditData();
  }, [transactions, selectedAuditYear, language]);

  const getCheckTypeLabel = (type: '不足' | '確認' | '推奨') => {
    switch (type) {
      case '不足': return '領収書の添付が必要';
      case '確認': return '高額支出の確認';
      case '推奨': return '説明の充実を推奨';
    }
  };

  const getRiskEmoji = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
    }
  };

  const getRiskText = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'high': return t.highRisk;
      case 'medium': return t.mediumRisk;
      case 'low': return t.lowRisk;
    }
  };

  // issues を翻訳する関数
  const translateIssue = (issue: string): string => {
    // 異常な構成のパターン
    const abnormalCompositionMatch = issue.match(/^(.+?)が総支出の([\d.]+)%を占める異常な構成$/);
    if (abnormalCompositionMatch) {
      const [, category, ratio] = abnormalCompositionMatch;
      return t.abnormalComposition.replace(/\{category\}/g, t.categories[category] || category).replace(/\{ratio\}/g, ratio);
    }

    // 占めていますのパターン
    const categoryRatioMatch = issue.match(/^(.+?)が総支出の([\d.]+)%を占めています$/);
    if (categoryRatioMatch) {
      const [, category, ratio] = categoryRatioMatch;
      return t.categoryRatio.replace(/\{category\}/g, t.categories[category] || category).replace(/\{ratio\}/g, ratio);
    }

    // 乖離が疑われやすい状態のパターン
    if (issue === '→ 事業実態との乖離が疑われやすい状態') {
      return t.deviationSuspected;
    }

    // 税務調査時に支出の妥当性確認が必要な水準
    if (issue === '→ 税務調査時に支出の妥当性確認が必要な水準') {
      return t.taxAuditConfirmationNeeded;
    }

    // 大規模支出のため、より詳細な確認が必要
    if (issue === '大規模支出のため、より詳細な確認が必要') {
      return t.largeScaleExpenditure;
    }

    // 外注費の構成比が高めです。業務委託契約の関連性を確認してください
    if (issue === '外注費の構成比が高めです。業務委託契約の関連性を確認してください') {
      return t.subcontractorRatioHigh;
    }

    // 会議費の構成比が目立ちます。支出目的と参加者情報を整理してください
    if (issue === '会議費の構成比が目立ちます。支出目的と参加者情報を整理してください') {
      return t.meetingExpenseNotable;
    }

    // 消耗品費の構成比が高いです。事業規模とのバランスを確認してください
    if (issue === '消耗品費の構成比が高いです。事業規模とのバランスを確認してください') {
      return t.consumablesRatioHigh;
    }

    // 支出根拠資料の整理を推奨
    if (issue === '→ 支出根拠資料の整理を推奨') {
      return t.expenditureEvidenceRecommended;
    }

    // マッチしない場合はそのまま返す
    return issue;
  };

  return (
    <div className="p-4 pb-24 space-y-6 overflow-x-hidden lg:p-6 xl:p-8">
      {/* タイトル・説明文 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
          <EyeIcon className="w-6 h-6 text-slate-900" />
          {t.auditForecastDashboard}
        </h2>
        <p className="text-gray-600 text-sm leading-relaxed">
          {t.auditForecastDescription}
        </p>
      </div>

      {/* 削除: Update Cross Tabulation セクション */}

      {/* セクションB：年度選択ブロック */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-slate-800">{t.selectedYearSection}</h3>
          <button
            onClick={onOpenYearModal}
            className="px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition"
          >
            {t.changeYear}
          </button>
        </div>
        <p className="text-sm text-slate-700">
          {selectedAuditYear ? t.yearDataDescription.replace(/{year}/g, selectedAuditYear.toString()) : t.yearNotSelected}
        </p>
      </div>

      {/* セクションB：監査予報（全体） */}
      <AuditForecast
        auditForecast={auditForecast}
        isLoading={isLoading}
        loadingMessage={loadingMessage}
        t={t}
        language={language}
        taxAuthorityPerspective={taxAuthorityPerspective}
      />

      {/* 監査予報の最終更新日時（UIに残す） */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <p className="text-sm text-gray-700 font-medium">
          {language === 'ja' ? '最終更新: ' : 'Last updated: '}
          {forecastLastUpdated ? `${forecastLastUpdated} JST` : (language === 'ja' ? '不明（キャッシュ未使用）' : 'Unknown (no cache)')}
        </p>
      </div>

      {/* セクションA：記帳チェック（個別） */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-700">{t.individualBookkeepingChecks}</h3>
          <button 
            onClick={() => spreadsheetUrl && window.open(spreadsheetUrl, '_blank')}
            disabled={!spreadsheetUrl}
            className="px-3 py-1 bg-slate-900 text-white text-xs rounded-lg hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t.fixInSpreadsheet}
          </button>
        </div>
        {bookkeepingChecks.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">{t.noCheckItems}</p>
        ) : (
          <div className="space-y-3">
            {bookkeepingChecks.slice(0, 10).map((check) => (
              <div key={check.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-medium text-gray-800 mb-1">{check.title}</p>
                <p className="text-xs text-gray-600">{check.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 次のアクション */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-2">{t.nextActions}</h3>
            <p className="text-sm text-gray-600">{t.nextActionDescription}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
