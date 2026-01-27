
import React, { useState, useEffect } from 'react';
import { ExclamationTriangleIcon, EyeIcon, ChatBubbleLeftRightIcon, CheckCircleIcon, XCircleIcon, ArrowPathIcon, LightBulbIcon } from '@heroicons/react/24/outline';
import { Transaction, AuditPrediction, AuditForecastItem, BookkeepingCheckItem } from '../types';
import { auditService } from '../services/auditService';
import { sheetsService } from '../services/sheetsService';
import { authService } from '../services/authService';
import AuditReasoningModal from './AuditReasoningModal';
import { getTodayJSTString } from '../lib/dateUtils';
import { TEXT, Language } from '../src/i18n/text';

interface DashboardProps {
  transactions: Transaction[];
  onAuditQuery?: (query: string) => void;
  onTabChange?: (tab: 'chat' | 'dashboard' | 'history' | 'tax') => void;
  selectedAuditYear: number | null;
  onAuditYearSelect: (year: number) => void;
  availableYears: number[];
  onOpenYearModal: () => void;
  t: any;
}

const Dashboard: React.FC<DashboardProps> = ({
  transactions,
  onAuditQuery,
  onTabChange,
  selectedAuditYear,
  onAuditYearSelect,
  availableYears,
  onOpenYearModal,
  t
}) => {
  const [auditForecast, setAuditForecast] = useState<AuditForecastItem[]>([]);
  const [bookkeepingChecks, setBookkeepingChecks] = useState<BookkeepingCheckItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('監査予報を読み込み中...');
  const [isReasoningModalOpen, setIsReasoningModalOpen] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [lastSummaryUpdated, setLastSummaryUpdated] = useState<string | null>(null);
  const [summaryStatusMessage, setSummaryStatusMessage] = useState<string | null>(null);

  // 監査予報データと記帳チェックデータを取得（Firestoreキャッシュ機能付き）
  useEffect(() => {
    const loadAuditData = async () => {
      if (transactions.length === 0) {
        setAuditForecast([]);
        setBookkeepingChecks([]);
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
        return;
      }

      setIsLoading(true);

      try {
        // Get real Google ID from authentication
        const idToken = await authService.getIdToken();
        if (!idToken) {
          throw new Error('認証されていません');
        }

        // Extract Google ID from ID token via server API
        const googleIdResponse = await fetch(`http://localhost:3001/api/user/last-summary-generated/${encodeURIComponent(idToken)}`);
        const googleIdData = await googleIdResponse.json();
        if (!googleIdResponse.ok) {
          throw new Error(googleIdData.details || 'Google IDの取得に失敗しました');
        }
        const googleId = googleIdData.googleId;

        if (!selectedAuditYear) return; // null の場合は処理しない
        const year = selectedAuditYear.toString();
        const today = getTodayJSTString(); // "2026-01-21" 形式

        try {
          // 最終アクセス日を確認（サーバーAPI経由）
          const lastAccessResponse = await fetch(`http://localhost:3001/api/user/last-access/${googleId}?year=${year}`);
          const lastAccessData = await lastAccessResponse.json();

          if (!lastAccessResponse.ok) {
            throw new Error(lastAccessData.details || '最終アクセス日の取得に失敗しました');
          }

          const lastAccessDate = lastAccessData.lastAccessDate?.[year];

          // キャッシュ判定ロジック：forecasts[year]が存在し、dateが今日の日付と一致する場合
          console.log('🔄 キャッシュ判定: サーバーから監査予報を取得します');
          setLoadingMessage('保存された予報を読み込み中...');

          // 直接forecastデータを取得してキャッシュ判定
          const forecastResponse = await fetch(`http://localhost:3001/api/user/forecast/${googleId}/${year}/${today}`);
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
            console.log('✅ キャッシュから監査予報データを読み込みました（データ修正済み）');
          } else {
            // キャッシュが存在しない場合は新規生成
            console.log('🆕 キャッシュミスまたは初回アクセス: 監査予報を新規生成します');
            setLoadingMessage('監査予報を生成中...');
            await generateAndCacheForecast(filteredTransactions, googleId, year, today);
          }
        } catch (cacheError) {
          console.error('❌ キャッシュチェックエラー:', cacheError);
          // キャッシュエラーの場合は新規生成
          console.log('🔄 キャッシュエラー: 新規生成にフォールバックします');
          setLoadingMessage('監査予報を生成中...');
          await generateAndCacheForecast(filteredTransactions, googleId, year, today);
        }

        // 記帳チェックデータは常に新規生成（キャッシュ不要）
        const checksData = await auditService.generateBookkeepingChecks(filteredTransactions);
        setBookkeepingChecks(checksData);

      } catch (error) {
        console.error('❌ 監査データ取得エラー:', error);
        // Firestore接続エラー時は既存処理にフォールバック
        try {
          console.log('🔄 Firestoreエラー: 既存処理にフォールバックします');
          const [forecastData, checksData] = await Promise.all([
            auditService.generateAuditForecast(filteredTransactions),
            auditService.generateBookkeepingChecks(filteredTransactions)
          ]);
          setAuditForecast(forecastData);
          setBookkeepingChecks(checksData);
        } catch (fallbackError) {
          console.error('❌ フォールバック処理も失敗:', fallbackError);
          setAuditForecast([]);
          setBookkeepingChecks([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    // 監査予報生成・保存処理
    const generateAndCacheForecast = async (
      filteredTransactions: Transaction[],
      googleId: string,
      year: string,
      today: string
    ) => {
      try {
        // 監査予報を生成
        const forecastData = await auditService.generateAuditForecast(filteredTransactions);
        setAuditForecast(forecastData);

        // 生成した予報をサーバーAPI経由でFirestoreに保存（最重要リスク1件のみ）
        console.log('🔍 Saving to Firebase:', forecastData[0]);
        console.log('🔍 detectedAnomalies:', forecastData[0]?.detectedAnomalies);

        const requestBody = {
          googleId,
          year,
          date: today,
          forecastResults: forecastData.length > 0 ? [forecastData[0]] : []
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

        const saveResponse = await fetch('http://localhost:3001/api/user/forecast', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!saveResponse.ok) {
          const saveData = await saveResponse.json();
          throw new Error(saveData.details || '予報データの保存に失敗しました');
        }

        // 最終アクセス日をサーバーAPI経由で更新
        const accessResponse = await fetch('http://localhost:3001/api/user/last-access', {
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
          throw new Error(accessData.details || '最終アクセス日の更新に失敗しました');
        }

        console.log('💾 監査予報データをFirestoreに保存しました');
      } catch (error) {
        console.error('❌ 監査予報生成・保存エラー:', error);
        throw error;
      }
    };

    loadAuditData();
  }, [transactions, selectedAuditYear]);

  // Summaryメタデータを取得（ページロード時）
  useEffect(() => {
    const loadSummaryMeta = async () => {
      try {
        const meta = await sheetsService.getSummaryMeta(selectedAuditYear);
        setLastSummaryUpdated(meta.lastUpdated);
        if (!meta.hasSummary) {
          setSummaryStatusMessage(t.generateCrossTabulationFirst);
        } else {
          setSummaryStatusMessage(null);
        }
      } catch (error) {
        console.error('❌ Summary meta loading error:', error);
        setLastSummaryUpdated(null);
        setSummaryStatusMessage(t.summaryMetadataFetchFailed);
      }
    };

    loadSummaryMeta();
  }, [selectedAuditYear]);

  const handleViewReasoning = () => {
    setIsReasoningModalOpen(true);
  };

  const handleGenerateSummary = async () => {
    if (isGeneratingSummary) return;

    setIsGeneratingSummary(true);
    setSummaryError(null);

    try {
      const result = await sheetsService.generateSummary(selectedAuditYear);

      if (result.success) {
        console.log('✅ Summary generated successfully');

        // 成功時は最終更新日時を現在時刻に設定（バックエンドがlastSummaryGeneratedAtを更新しないため）
        const now = new Date();
        const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        setLastSummaryUpdated(formattedDate);
        setSummaryStatusMessage(null);

        // メタデータを再読み込みして最新の状態を反映（バックエンドのタイミング問題対策）
        // ただし、バックエンドがlastSummaryGeneratedAtを更新しない場合は現在時刻を維持
        try {
          const meta = await sheetsService.getSummaryMeta(selectedAuditYear);
          if (meta.lastUpdated) {
            setLastSummaryUpdated(meta.lastUpdated);
          }
          // messageはクリアしたまま維持（生成成功済みのため）
        } catch (metaError) {
          console.error('❌ Summary meta refresh error:', metaError);
          // メタデータの読み込みに失敗しても、現在時刻を維持
        }
      } else {
        setSummaryError('集計生成に失敗しました');
      }
    } catch (error: any) {
      console.error('❌ Summary generation error:', error);

      // エラーメッセージの処理
      if (error.message?.includes('429') || error.message?.includes('明日再実行')) {
        setSummaryError('本日の集計はすでに生成されています。明日再実行してください。');
      } else if (error.message?.includes('認証')) {
        setSummaryError('認証が必要です。再度ログインしてください。');
      } else {
        setSummaryError(error.message || '集計生成中にエラーが発生しました');
      }
    } finally {
      setIsGeneratingSummary(false);
    }
  };

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

      {/* セクションA：監査用横断集計を更新 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            📊
            {t.updateCrossTabulation}
          </h3>

          {/* ボタン */}
          <button
            onClick={handleGenerateSummary}
            disabled={isGeneratingSummary}
            className={`px-6 py-2 text-white font-semibold rounded-lg transition flex items-center gap-2 text-sm ${
              isGeneratingSummary
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-slate-900 hover:bg-slate-800 shadow-md hover:shadow-lg'
            }`}
          >
            {isGeneratingSummary ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                {t.updating}
              </>
            ) : (
              <>
                <ArrowPathIcon className="w-4 h-4" />
                {t.update}
              </>
            )}
          </button>
        </div>

        {/* 説明文 */}
        <p className="text-sm text-gray-600 leading-relaxed mb-3">
          {t.crossTabulationDescription}
        </p>

        {/* 最終更新日時表示 */}
        <div className="mb-3">
          {lastSummaryUpdated ? (
            <p className="text-sm text-gray-700 font-medium">
              {t.lastUpdated}{lastSummaryUpdated} JST
            </p>
          ) : summaryStatusMessage ? (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
              {summaryStatusMessage}
            </p>
          ) : (
            <p className="text-sm text-gray-500">
              {t.loadingSummaryData}
            </p>
          )}
        </div>

        {summaryError && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{summaryError}</p>
        )}
      </div>

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
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-sm font-bold text-gray-700 mb-4">
          {t.todayAuditForecast.replace('{date}', getTodayJSTString())}
        </h3>

        {/* Gemini AI Audit Risk Summary */}
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🧠</span>
            <h4 className="font-bold text-blue-800">Gemini AI Audit Risk Summary</h4>
          </div>
          <p className="text-sm text-blue-700">
            {t.mostLikelyItem} 「{(() => {
              // リスクレベルでソート（high -> medium -> low）
              const sortedByRisk = [...auditForecast].sort((a, b) => {
                const riskOrder = { high: 3, medium: 2, low: 1 };
                return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
              });
              return sortedByRisk[0]?.accountName || 'なし';
            })()}」 です
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3 text-slate-600">
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">{loadingMessage}</span>
            </div>
          </div>
        ) : auditForecast.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">{t.noAuditData}</p>
        ) : (
          <div className="space-y-3">
            {auditForecast.slice(0, 1).map((item) => (
              <div key={item.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{item.accountName}</p>
                    <p className="text-xs text-gray-500">
                      ¥{(item.totalAmount || 0).toLocaleString()} ({item.ratio.toFixed(1)}%)
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-bold">{getRiskEmoji(item.riskLevel)} {getRiskText(item.riskLevel)}</p>
                    <button
                      onClick={handleViewReasoning}
                      className="px-3 py-1 bg-slate-900 text-white text-xs rounded-lg hover:bg-slate-800 transition flex items-center gap-1"
                    >
                      <LightBulbIcon className="w-3 h-3" />
                      {t.reasoning}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  {item.issues.map((issue, index) => (
                    <p key={index} className="text-xs text-gray-600">• {issue}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* セクションA：記帳チェック（個別） */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-700">{t.individualBookkeepingChecks}</h3>
          <button className="px-3 py-1 bg-slate-900 text-white text-xs rounded-lg hover:bg-slate-800 transition">
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

      {/* AI Audit Reasoning Modal */}
      <AuditReasoningModal
        isOpen={isReasoningModalOpen}
        onClose={() => setIsReasoningModalOpen(false)}
        auditData={auditForecast[0]}  // 最もリスクが高い項目
        year={selectedAuditYear ? selectedAuditYear.toString() : ''}
        t={t}
      />
    </div>
  );
};

export default Dashboard;
