
import React from 'react';
import { ExclamationTriangleIcon, EyeIcon } from '@heroicons/react/24/outline';

const Dashboard: React.FC = () => {
  // ダミーデータ
  const mockPredictionData = [
    { item: 'AWSクラウドサービス', amount: 1200, score: '🟡 中程度', question: 'なぜ外注費として分類？' },
    { item: '会議費（Zoom有料）', amount: 50, score: '🔴 高い', question: '適正な支出か確認を' },
    { item: '通信費（ソフトバンク）', amount: 80, score: '🟢 低い', question: '問題なし' },
  ];

  return (
    <div className="p-4 pb-24 space-y-6 overflow-x-hidden">
      {/* タイトル・説明文 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
          <EyeIcon className="w-6 h-6 text-indigo-600" />
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
        <div className="space-y-3">
          {mockPredictionData.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">{item.item}</p>
                <p className="text-xs text-gray-500">¥{item.amount.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">{item.score}</p>
                <p className="text-xs text-gray-600">{item.question}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 予想質問・回答例エリア */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-sm font-bold text-gray-700 mb-4">予想質問・回答例</h3>
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm font-medium text-amber-800 mb-2">Q: AWS $1,200はなぜ外注費ですか？</p>
            <p className="text-sm text-amber-700">A: 契約書により「基盤インフラ」として事業で使用。利用目的を確認済み。</p>
          </div>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-medium text-red-800 mb-2">Q: この会議費 $50 は適切ですか？</p>
            <p className="text-sm text-red-700">A: 出席者リスト・議事録で確認済み。会議費として妥当。</p>
          </div>
        </div>
      </div>

      {/* 次のアクション */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-2">次のアクション</h3>
            <p className="text-sm text-gray-600">ここを確認してください。赤字項目の根拠を確認し、必要に応じて修正してください。</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
