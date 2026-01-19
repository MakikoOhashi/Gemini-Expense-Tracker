
import React, { useState, useEffect } from 'react';
import { ExclamationTriangleIcon, EyeIcon, ChatBubbleLeftRightIcon, CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Transaction, AuditPrediction, AuditForecastItem, BookkeepingCheckItem } from '../types';
import { auditService } from '../services/auditService';

interface DashboardProps {
  transactions: Transaction[];
  onAuditQuery?: (query: string) => void;
  onTabChange?: (tab: 'chat' | 'dashboard' | 'history' | 'tax') => void;
  selectedAuditYear: number;
  onAuditYearSelect: (year: number) => void;
  availableYears: number[];
  onOpenYearModal: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  transactions,
  onAuditQuery,
  onTabChange,
  selectedAuditYear,
  onAuditYearSelect,
  availableYears,
  onOpenYearModal
}) => {
  const [auditForecast, setAuditForecast] = useState<AuditForecastItem[]>([]);
  const [bookkeepingChecks, setBookkeepingChecks] = useState<BookkeepingCheckItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('監査予報を読み込み中...');

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
        // キャッシュチェック用のパラメータを取得
        const googleId = '117675493044504889175'; // 固定値
        const year = selectedAuditYear.toString();
        const today = new Date().toISOString().split('T')[0];

        try {
          // 最終アクセス日を確認（サーバーAPI経由）
          const lastAccessResponse = await fetch(`http://localhost:3001/api/user/last-access/${googleId}?year=${year}`);
          const lastAccessData = await lastAccessResponse.json();

          if (!lastAccessResponse.ok) {
            throw new Error(lastAccessData.details || '最終アクセス日の取得に失敗しました');
          }

          const lastAccessDate = lastAccessData.lastAccessDate?.[year];

          // キャッシュヒット判定（同日・同年度）
          const isCacheHit = lastAccessDate === today;

          if (isCacheHit) {
            console.log('🔄 キャッシュヒット: サーバーから監査予報を取得します');
            setLoadingMessage('保存された予報を読み込み中...');
            // キャッシュから取得（サーバーAPI経由）
            const forecastResponse = await fetch(`http://localhost:3001/api/user/forecast/${googleId}/${year}/${today}`);
            const forecastData = await forecastResponse.json();

            if (forecastResponse.ok && forecastData.forecastResults) {
              setAuditForecast(forecastData.forecastResults);
              console.log('✅ キャッシュから監査予報データを読み込みました');
            } else {
              // キャッシュが存在しない場合は新規生成
              console.log('⚠️ キャッシュが見つからないため、新規生成します');
              await generateAndCacheForecast(filteredTransactions, googleId, year, today);
            }
          } else {
            console.log('🆕 キャッシュミスまたは初回アクセス: 監査予報を新規生成します');
            setLoadingMessage('監査予報を生成中...');
            // キャッシュミス時は既存処理を実行
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

        // 生成した予報をサーバーAPI経由でFirestoreに保存
        const saveResponse = await fetch('http://localhost:3001/api/user/forecast', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            googleId,
            year,
            date: today,
            forecastResults: forecastData
          }),
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

  const handleAskQuestion = (forecastItem: AuditForecastItem) => {
    if (!onAuditQuery || !onTabChange) return;

    // デフォルトの質問文を生成（課題文プレフィックスを付けて取引登録ではないことを示す）
    const defaultQuestion = `課題文：${forecastItem.accountName} ¥${forecastItem.totalAmount.toLocaleString()}について、想定される税務上の確認点と、ユーザーが準備すべき説明を教えてください。`;

    // 監査クエリを設定してチャットタブに遷移
    onAuditQuery(defaultQuestion);
    onTabChange('chat');
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
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
    }
  };

  return (
    <div className="p-4 pb-24 space-y-6 overflow-x-hidden">
      {/* タイトル・説明文 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
          <EyeIcon className="w-6 h-6 text-slate-900" />
          監査予報
        </h2>
        <p className="text-gray-600 text-sm leading-relaxed">
          スプシのデータから、<br />
          数値の構成から推測される事業の特徴を踏まえ、<br />
          税務署が確認しやすい観点とユーザーが説明として整理すべきポイントを列挙します。<br />
          Gemini によるAI推論で監査リスクを予測します。
        </p>
      </div>

      {/* セクションA：年度選択ブロック */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-slate-800">📅 選択された年度</h3>
          <button
            onClick={onOpenYearModal}
            className="px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition"
          >
            年度変更
          </button>
        </div>
        <p className="text-sm text-slate-700">
          {selectedAuditYear}年度（{selectedAuditYear}年1月1日〜{selectedAuditYear}年12月31日）の取引データを集計しています。
        </p>
      </div>

      {/* セクションB：監査予報（全体） */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-sm font-bold text-gray-700 mb-4">
          今日の監査予報（{new Date().toISOString().split('T')[0]}時点）
        </h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3 text-slate-600">
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">{loadingMessage}</span>
            </div>
          </div>
        ) : auditForecast.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">監査予報データが見つかりませんでした</p>
        ) : (
          <div className="space-y-3">
            {auditForecast.map((item) => (
              <div key={item.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{item.accountName}</p>
                    <p className="text-xs text-gray-500">
                      ¥{item.totalAmount.toLocaleString()} ({item.ratio.toFixed(1)}%)
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-bold">{getRiskEmoji(item.riskLevel)} {getRiskText(item.riskLevel)}</p>
                    <button
                      onClick={() => handleAskQuestion(item)}
                      className="px-3 py-1 bg-slate-900 text-white text-xs rounded-lg hover:bg-slate-800 transition flex items-center gap-1"
                    >
                      <ChatBubbleLeftRightIcon className="w-3 h-3" />
                      質問する
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
          <h3 className="text-sm font-bold text-gray-700">記帳チェック（個別）</h3>
          <button className="px-3 py-1 bg-slate-900 text-white text-xs rounded-lg hover:bg-slate-800 transition">
            スプレッドシートで修正する
          </button>
        </div>
        {bookkeepingChecks.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">チェック項目が見つかりませんでした</p>
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
            <h3 className="text-sm font-bold text-gray-700 mb-2">次のアクション</h3>
            <p className="text-sm text-gray-600">赤字または高リスク項目について、分類根拠や証憑を確認し、必要に応じて修正してください。</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
