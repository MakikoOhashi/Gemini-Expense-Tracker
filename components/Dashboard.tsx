
import React, { useState, useEffect } from 'react';
import { ExclamationTriangleIcon, EyeIcon, ChatBubbleLeftRightIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Transaction, AuditPrediction, AuditForecastItem, BookkeepingCheckItem } from '../types';
import { auditService } from '../services/auditService';

interface DashboardProps {
  transactions: Transaction[];
  onAuditQuery?: (query: string) => void;
  onTabChange?: (tab: 'chat' | 'dashboard' | 'history' | 'tax') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, onAuditQuery, onTabChange }) => {
  const [auditForecast, setAuditForecast] = useState<AuditForecastItem[]>([]);
  const [bookkeepingChecks, setBookkeepingChecks] = useState<BookkeepingCheckItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 監査予報データと記帳チェックデータを取得
  useEffect(() => {
    const loadAuditData = async () => {
      if (transactions.length === 0) {
        setAuditForecast([]);
        setBookkeepingChecks([]);
        return;
      }

      setIsLoading(true);
      try {
        const [forecastData, checksData] = await Promise.all([
          auditService.generateAuditForecast(transactions),
          auditService.generateBookkeepingChecks(transactions)
        ]);
        setAuditForecast(forecastData);
        setBookkeepingChecks(checksData);
      } catch (error) {
        console.error('Failed to generate audit data:', error);
        // エラー時は空の配列を表示
        setAuditForecast([]);
        setBookkeepingChecks([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuditData();
  }, [transactions]);

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

      {/* セクションB：監査予報（全体） */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-sm font-bold text-gray-700 mb-4">監査予報（全体）</h3>
        {auditForecast.length === 0 ? (
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
