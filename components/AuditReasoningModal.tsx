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
    issues,
    detectedAnomalies,
    anomalyCount
  } = auditData;

  // 数値表示のフォーマット関数
  const formatValue = (value: number | null | undefined, unit: string): string => {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    if (value === 0) {
      return '0' + unit;
    }

    if (unit === '%') {
      return `${value > 0 ? '+' : ''}${value.toFixed(1)}${unit}`;
    }
    if (unit === 'σ') {
      return `${value > 0 ? '+' : ''}${value.toFixed(1)}${unit}`;
    }
    if (unit === 'pt') {
      return `${value > 0 ? '+' : ''}${value.toFixed(1)}${unit}`;
    }

    return `${value.toFixed(1)}${unit}`;
  };

  // 前年度データが存在しないかチェック
  const hasComparisonData = () => {
    return (
      (growthRate !== null && growthRate !== undefined && growthRate !== 0) ||
      (zScore !== null && zScore !== undefined && zScore !== 0) ||
      (diffRatio !== null && diffRatio !== undefined && diffRatio !== 0)
    );
  };

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

        {/* 検知された異常の詳細表示 */}
        {detectedAnomalies && detectedAnomalies.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              🎯 検知された異常（{anomalyCount || 0}件）
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: '構成比異常', label: '構成比異常', desc: '支出構成の歪み' },
                { key: '統計的異常', label: '統計的異常', desc: '平均値からの乖離' },
                { key: '急変異常', label: '急変異常', desc: '前年比の急激な変化' },
                { key: '比率変動異常', label: '比率変動異常', desc: '構成比の変動' }
              ].map(({ key, label, desc }) => {
                const isDetected = detectedAnomalies.some(anomaly => anomaly.dimension === key);
                const anomaly = detectedAnomalies.find(a => a.dimension === key);

                return (
                  <div
                    key={key}
                    className={`p-3 rounded-lg border-2 ${
                      isDetected
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-lg ${isDetected ? 'text-red-600' : 'text-gray-400'}`}>
                        {isDetected ? '✔' : '✖'}
                      </span>
                      <span className={`font-bold text-sm ${isDetected ? 'text-red-800' : 'text-gray-600'}`}>
                        {label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">{desc}</p>
                    {anomaly && (
                      <p className="text-xs text-red-700 font-medium">
                        {anomaly.message}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ② なぜ危険か（AI解釈） */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
            🧠 税務・経営的な意味（AI解釈）
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            ※ 過去の一般的な税務調査事例・財務パターンをもとにAIが推論しています
          </p>

          {accountName === '地代家賃' ? (
            <>
              {/* 1. 思考：税務署の視点 */}
              <div className="mb-4">
                <p className="font-semibold text-gray-800 mb-2">税務調査での疑義ポイント：</p>
                <p className="text-gray-700">
                  {accountName}が総支出の{ratio.toFixed(1)}%を占める構造は、
                  「実態のある事業活動が本当に存在しているか」という観点で強く疑義を持たれやすい財務パターンです。
                </p>
              </div>

              {/* 2. ロジック：なぜ問題か */}
              <div className="mb-4">
                <p className="font-semibold text-gray-800 mb-2">特に注意すべき点：</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  {ratio > 80 && (
                    <li>一つの科目への極端な集中（通常の事業では複数経費が発生）</li>
                  )}
                  {growthRate !== null && growthRate !== undefined && growthRate > 30 && (
                    <li>前年比{growthRate.toFixed(1)}%増という急激な変化（売上との連動性が問われる）</li>
                  )}
                  {zScore !== null && zScore !== undefined && Math.abs(zScore) > 2 && (
                    <li>業界平均から統計的に大きく乖離（{zScore.toFixed(1)}σ）</li>
                  )}
                  <li>「実体なき経費計上」や「私的利用の混入」を疑われやすい特徴</li>
                </ul>
              </div>

              {/* 3. 反証：正当化される可能性 */}
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                <p className="font-semibold text-gray-800 mb-2">ただし、正当化されやすいケース：</p>
                <div className="text-sm text-gray-700 space-y-2">
                  <p><strong>問題になりにくい業種：</strong></p>
                  <ul className="list-disc list-inside ml-4">
                    <li>不動産賃貸業</li>
                    <li>レンタルスペース・スタジオ運営</li>
                    <li>倉庫業など設備依存型ビジネス</li>
                  </ul>
                  <p className="mt-2"><strong>問題になりやすい業種：</strong></p>
                  <ul className="list-disc list-inside ml-4">
                    <li>物販業・IT業（通常は人件費・仕入が発生）</li>
                    <li>コンサルティング業（地代家賃が主要経費になりにくい）</li>
                  </ul>
                  <p className="mt-3 text-blue-800 font-medium">
                    → 事業モデルとの整合性説明が成否を分けます
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* 1. 思考：税務署の視点 */}
              <div className="mb-4">
                <p className="font-semibold text-gray-800 mb-2">税務調査での疑義ポイント：</p>
                <p className="text-gray-700">
                  {accountName}が総支出の{ratio.toFixed(1)}%を占める構造は、
                  「実態のある事業活動が本当に存在しているか」という観点で強く疑義を持たれやすい財務パターンです。
                </p>
              </div>

              {/* 2. ロジック：なぜ問題か */}
              <div className="mb-4">
                <p className="font-semibold text-gray-800 mb-2">特に注意すべき点：</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  {ratio > 80 && (
                    <li>一つの科目への極端な集中（通常の事業では複数経費が発生）</li>
                  )}
                  {growthRate !== null && growthRate !== undefined && growthRate > 30 && (
                    <li>前年比{growthRate.toFixed(1)}%増という急激な変化（売上との連動性が問われる）</li>
                  )}
                  {zScore !== null && zScore !== undefined && Math.abs(zScore) > 2 && (
                    <li>業界平均から統計的に大きく乖離（{zScore.toFixed(1)}σ）</li>
                  )}
                  <li>「実体なき経費計上」や「私的利用の混入」を疑われやすい特徴</li>
                </ul>
              </div>

              {/* 3. 反証：正当化される可能性 */}
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                <p className="font-semibold text-gray-800 mb-2">ただし、正当化されやすいケース：</p>
                <div className="text-sm text-gray-700 space-y-2">
                  <p><strong>汎用的な正当化ポイント：</strong></p>
                  <ul className="list-disc list-inside ml-4">
                    <li>事業規模・業種に合った合理的な支出額であること</li>
                    <li>売上・事業活動との明確な因果関係が説明できること</li>
                    <li>市場相場・業界平均と比較して妥当な水準であること</li>
                  </ul>
                  <p className="mt-3 text-blue-800 font-medium">
                    → 事業内容との整合性説明と裏付け資料が重要です
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ③ 数値根拠（エビデンス） */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-3">🔍 リスクの根拠（数値・ルール）</h3>
          <div className="space-y-2 text-sm">
            {/* 数値表示 */}
            <div className="flex justify-between">
              <span className="text-gray-600">売上前年差</span>
              <span className={`font-bold ${formatValue(growthRate, '%') === 'N/A' ? 'text-gray-400' : ''}`}>
                {formatValue(growthRate, '%')}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">{accountName} 比率</span>
              <span className="font-bold">{ratio.toFixed(1)}%</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">過去平均との差（σ）</span>
              <span className={`font-bold ${formatValue(zScore, 'σ') === 'N/A' ? 'text-gray-400' : ''}`}>
                {formatValue(zScore, 'σ')}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">構成比変動</span>
              <span className={`font-bold ${formatValue(diffRatio, 'pt') === 'N/A' ? 'text-gray-400' : ''}`}>
                {formatValue(diffRatio, 'pt')}
              </span>
            </div>
          </div>

          {/* データ不足時の注意書き（条件付き表示） */}
          {!hasComparisonData() && (
            <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded text-xs">
              <p className="font-bold text-blue-900 mb-1">⚠️ 比較データ不足に関する注意</p>
              <p className="text-blue-800">
                前年度データが存在しないため、前年差・平均との差の評価は参考値または未算出です。
                本リスクは「構成比異常」に基づいて検知されています。
              </p>
            </div>
          )}
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
            {growthRate !== null && growthRate !== undefined && growthRate > 30 && (
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
