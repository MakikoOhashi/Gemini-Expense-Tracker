import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface AuditReasoningModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuditReasoningModal: React.FC<AuditReasoningModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col animate-in zoom-in-95 duration-300">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-lg">🧠</span>
            <h2 className="text-lg font-bold text-gray-800">AI Audit Reasoning（簡易表示）</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* コンテンツエリア */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <p className="text-sm text-gray-600 leading-relaxed">
            この監査リスク判定は、以下の3段階の分析に基づいています。
          </p>

          {/* Step 1 */}
          <div className="space-y-3">
            <h3 className="font-bold text-gray-800">Step 1: 数値特徴の分析（自動計算）</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <p className="text-sm text-gray-700">・売上前年差 +38%（前年差平均との差 +2.4σ）</p>
              <p className="text-sm text-gray-700">・地代家賃 比率 100.0%（業種平均との差 +3.1σ）</p>
            </div>
            <p className="text-sm text-gray-600">
              → 過去平均との差から大きく乖離した数値が検出されました。
            </p>
          </div>

          {/* Step 2 */}
          <div className="space-y-3">
            <h3 className="font-bold text-gray-800">Step 2: リスク特徴のスコアリング（ルールベース）</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <p className="text-sm text-gray-700">・異常値スコア = 0.78（閾値 0.65 超過）</p>
              <p className="text-sm text-gray-700">・構成比変動スコア = 0.82</p>
            </div>
            <p className="text-sm text-gray-600">
              → 異常度・構成比変動ともに高リスク領域に該当します。
            </p>
          </div>

          {/* Step 3 */}
          <div className="space-y-3">
            <h3 className="font-bold text-gray-800">Step 3: AIによるリスク要因の解釈（Gemini）</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <p className="text-sm text-gray-700">・高額な固定費（地代家賃）が特定項目に集中しています</p>
              <p className="text-sm text-gray-700">・売上変動に対して費用構造の変化が小さい傾向があります</p>
              <p className="text-sm text-gray-700">・高リスク傾向の財務パターンに該当しています</p>
            </div>
            <p className="text-sm text-gray-600">
              ※ 本ステップは Step1・2 の数値結果をもとに、AIがリスク要因を言語化したものです。
            </p>
          </div>

          {/* 総合判定 */}
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg space-y-3">
            <h3 className="font-bold text-red-800 flex items-center gap-2">
              <span>▶</span>
              総合判定
            </h3>
            <p className="text-sm text-red-700 font-medium">
              総合監査リスク：高（スコア 0.85）
            </p>
            <p className="text-xs text-red-600">
              ※ 本結果は統計的指標とAIによる補助的な分析結果であり、最終的な判断は専門家による確認を推奨します。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditReasoningModal;
