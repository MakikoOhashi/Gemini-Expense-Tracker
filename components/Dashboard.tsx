
import React from 'react';
import { ExclamationTriangleIcon, EyeIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { Transaction, AuditPrediction } from '../types';

interface DashboardProps {
  transactions: Transaction[];
  onAuditQuery?: (query: string) => void;
  onTabChange?: (tab: 'chat' | 'dashboard' | 'history' | 'tax') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, onAuditQuery, onTabChange }) => {
  // リスク判定ロジック（仮実装）
  const generateAuditPredictions = (transactions: Transaction[]): AuditPrediction[] => {
    return transactions
      .filter(t => t.type === 'expense') // 支出のみを対象
      .map(transaction => {
        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        let comment = '問題なし';

        // 金額ベースのリスク判定
        if (transaction.amount >= 100000) {
          riskLevel = 'high';
          comment = '高額支出の妥当性を確認してください';
        } else if (transaction.amount >= 50000) {
          riskLevel = 'medium';
          comment = '中額支出です。根拠を確認してください';
        }

        // 科目ベースのリスク判定（既存ロジックを上書き）
        if (transaction.category === '外注費' || transaction.category === '会議費') {
          riskLevel = 'medium';
          comment = '領収書と業務目的の関連性を確認してください';
        } else if (transaction.category === '消耗品費' && transaction.amount >= 10000) {
          riskLevel = 'high';
          comment = '消耗品費が高額です。詳細を確認してください';
        }

        return {
          id: `audit_${transaction.id}`,
          accountName: transaction.category,
          amount: transaction.amount,
          riskLevel,
          comment,
          transactionId: transaction.id
        };
      })
      .filter(prediction => prediction.riskLevel !== 'low') // 低リスクは表示しない
      .slice(0, 10); // 最大10件に制限
  };

  const predictions = generateAuditPredictions(transactions);

  const handleAskQuestion = (prediction: AuditPrediction) => {
    if (!onAuditQuery || !onTabChange) return;

    // デフォルトの質問文を生成（課題文プレフィックスを付けて取引登録ではないことを示す）
    const defaultQuestion = `課題文：${prediction.accountName} ¥${prediction.amount.toLocaleString()}について、想定される税務上の確認点と、ユーザーが準備すべき説明を教えてください。`;

    // 監査クエリを設定してチャットタブに遷移
    onAuditQuery(defaultQuestion);
    onTabChange('chat');
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
          ここに入力データから<br />
          問題になりやすい項目の予測と推奨対応を表示します<br />
          Gemini 3 による推論は次段階で連携予定。
        </p>
      </div>

      {/* 予測スコア用テーブル */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-sm font-bold text-gray-700 mb-4">予測スコア</h3>
        {predictions.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">リスク項目が見つかりませんでした</p>
        ) : (
          <div className="space-y-3">
            {predictions.map((prediction) => (
              <div key={prediction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{prediction.accountName}</p>
                  <p className="text-xs text-gray-500">¥{prediction.amount.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold">{getRiskEmoji(prediction.riskLevel)} {getRiskText(prediction.riskLevel)}</p>
                    <p className="text-xs text-gray-600">{prediction.comment}</p>
                  </div>
                  <button
                    onClick={() => handleAskQuestion(prediction)}
                    className="px-3 py-1 bg-slate-900 text-white text-xs rounded-lg hover:bg-slate-800 transition flex items-center gap-1"
                  >
                    <ChatBubbleLeftRightIcon className="w-3 h-3" />
                    質問する
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 予想質問・回答例エリア */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-sm font-bold text-gray-700 mb-4">予想質問・回答例</h3>
        {predictions.filter(p => p.riskLevel === 'high' || p.riskLevel === 'medium').length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">該当する項目がありません</p>
        ) : (
          <div className="space-y-4">
            {predictions
              .filter(p => p.riskLevel === 'high' || p.riskLevel === 'medium')
              .slice(0, 5) // 最大5件
              .map((prediction, index) => {
                const isHighRisk = prediction.riskLevel === 'high';
                const bgColor = isHighRisk ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200';
                const textColor = isHighRisk ? 'text-red-800' : 'text-amber-800';
                const answerColor = isHighRisk ? 'text-red-700' : 'text-amber-700';

                // テンプレートベースのQ&A生成
                const qaTemplates = {
                  '外注費': {
                    q: `${prediction.accountName} ¥${prediction.amount.toLocaleString()}は事業に必要な支出ですか？`,
                    a: '業務委託契約書・請求書・作業内容を確認済み。事業運営に不可欠なサービスです。'
                  },
                  '会議費': {
                    q: `${prediction.accountName} ¥${prediction.amount.toLocaleString()}の領収書は適切ですか？`,
                    a: '会議参加者名簿・議事録・領収書を揃えて保管。業務上の正当な支出です。'
                  },
                  '消耗品費': {
                    q: `${prediction.accountName} ¥${prediction.amount.toLocaleString()}は少額すぎませんか？`,
                    a: '事業用消耗品として使用。レシート・使用目的を記録しています。'
                  },
                  'default': {
                    q: `この${prediction.accountName} ¥${prediction.amount.toLocaleString()}の支出は妥当ですか？`,
                    a: '領収書・契約書・使用目的を明確に記録。税務調査時に説明できる準備ができています。'
                  }
                };

                const template = qaTemplates[prediction.accountName as keyof typeof qaTemplates] || qaTemplates.default;

                return (
                  <div key={prediction.id} className={`p-4 ${bgColor} border rounded-lg`}>
                    <p className={`text-sm font-medium ${textColor} mb-2`}>Q: {template.q}</p>
                    <p className={`text-sm ${answerColor}`}>A: {template.a}</p>
                  </div>
                );
              })}
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
