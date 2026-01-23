import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { AuditForecastItem } from '../types';

interface AuditReasoningModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditData?: AuditForecastItem;  // 実際のデータ
  year?: string;
}

const AuditReasoningModal: React.FC<AuditReasoningModalProps> = ({
  isOpen,
  onClose,
  auditData,
  year
}) => {
  // データが存在しない場合の早期リターン
  if (!auditData) {
    return null;
  }

  // 実際のデータから表示内容を生成
  const {
    accountName,
    totalAmount,
    ratio,
    riskLevel,
    zScore,
    growthRate,
    diffRatio,
    anomalyRisk,
    issues
  } = auditData;

  // リスクレベルに応じた表示色
  const riskColor = riskLevel === 'high' ? 'bg-red-100 border-red-500'
                : riskLevel === 'medium' ? 'bg-yellow-100 border-yellow-500'
                : 'bg-green-100 border-green-500';

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${!isOpen && 'hidden'}`}>
      <div className="bg-white rounded-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">

        {/* ① 総合判定（ファーストビュー） */}
        <div className={`p-6 rounded-lg border-l-4 ${riskColor} mb-6`}>
          <h2 className="text-xl font-bold mb-2">
            🚨 監査リスク分析結果（{accountName}）
          </h2>
          <p className="text-lg font-bold mb-2">
            総合監査リスク：{riskLevel === 'high' ? '高' : riskLevel === 'medium' ? '中' : '低'}
          </p>
          <div className="text-sm text-gray-700 space-y-1">
            {issues.map((issue, idx) => (
              <p key={idx}>• {issue}</p>
            ))}
          </div>
        </div>

        {/* ② なぜ危険か（AI解釈） */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-3">🧠 税務・経営的な意味（AI解釈）</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700">
              {accountName}の支出が総支出の{ratio}%を占めています。
              {growthRate && growthRate > 30 && `前年比 +${growthRate.toFixed(1)}% と急増しており、`}
              {zScore && zScore > 2 && `統計的にも過去平均から大きく乖離（Zスコア: ${zScore.toFixed(1)}）しています。`}
              税務調査では「実態に即した経費か？」が最大の論点になります。
            </p>
          </div>
        </div>

        {/* ③ 数値根拠（エビデンス） */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-3">🔍 リスクの根拠（数値・ルール）</h3>
          <div className="space-y-2 text-sm">
            {growthRate !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-600">売上前年差</span>
                <span className="font-bold">{growthRate > 0 ? '+' : ''}{growthRate.toFixed(1)}%</span>
              </div>
            )}
            {ratio !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-600">{accountName} 比率</span>
                <span className="font-bold">{ratio.toFixed(1)}%</span>
              </div>
            )}
            {zScore !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-600">過去平均との差（σ）</span>
                <span className="font-bold">{zScore > 0 ? '+' : ''}{zScore.toFixed(1)}σ</span>
              </div>
            )}
            {diffRatio !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-600">構成比変動</span>
                <span className="font-bold">{diffRatio > 0 ? '+' : ''}{diffRatio.toFixed(1)}pt</span>
              </div>
            )}
          </div>
        </div>

        {/* ④ 今やるべきこと */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-3">🛠 今すぐやるべきこと</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="font-bold">1.</span>
              <span>{accountName}の契約書・領収書・使用実態資料を準備</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold">2.</span>
              <span>売上と事業活動との関係性を説明できる資料を作成</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold">3.</span>
              <span>他の経費項目が極端に少ない理由を整理</span>
            </div>
            {growthRate && growthRate > 30 && (
              <div className="flex items-start gap-2">
                <span className="font-bold">4.</span>
                <span>前年比 +{growthRate.toFixed(1)}% となった理由を言語化</span>
              </div>
            )}
          </div>
          <div className="mt-4 p-3 bg-amber-50 rounded-lg text-xs text-amber-900">
            ※ これらが説明できない場合、否認リスクが高まります
          </div>
        </div>

        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="w-full bg-gray-600 text-white py-3 rounded-lg font-bold hover:bg-gray-700"
        >
          閉じる
        </button>
      </div>
    </div>
  );
};

export default AuditReasoningModal;
