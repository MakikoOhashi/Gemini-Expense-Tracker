import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { AuditForecastItem } from '../types';
import { TEXT, Language } from '../src/i18n/text';

interface AuditReasoningModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditData?: AuditForecastItem;  // 実際のデータ
  year?: string;
  t: any;
}

const AuditReasoningModal: React.FC<AuditReasoningModalProps> = ({
  isOpen,
  onClose,
  auditData,
  year,
  t
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

  // 検知された異常から「特に注意すべき点」を生成する関数
  const generateConcernDetails = (): string[] => {
    const concerns: string[] = [];

    if (!detectedAnomalies || detectedAnomalies.length === 0) {
      return [t.concernDefault];
    }

    // 検知された異常ごとに対応する注意点を追加
    detectedAnomalies.forEach(anomaly => {
      switch (anomaly.dimension) {
        case '構成比異常':
          concerns.push(t.concernCompositionAnomaly);
          break;
        case '急変異常':
          if (growthRate !== null && growthRate !== undefined) {
            concerns.push(t.concernSuddenChange.replace(/\{growthRate\}/g, `${growthRate > 0 ? '+' : ''}${growthRate.toFixed(1)}`));
          }
          break;
        case '統計的異常':
          if (zScore !== null && zScore !== undefined) {
            concerns.push(t.concernStatistical.replace(/\{zScore\}/g, zScore.toFixed(1)));
          }
          break;
        case '比率変動異常':
          if (diffRatio !== null && diffRatio !== undefined) {
            concerns.push(t.concernRatioVariation.replace(/\{diffRatio\}/g, `${diffRatio > 0 ? '+' : ''}${diffRatio.toFixed(1)}`));
          }
          break;
      }
    });

    // 条件付きで共通注意点を追加（構成比異常または急変異常が検知された場合のみ）
    const hasStructuralAnomaly = detectedAnomalies.some(a =>
      a.dimension === '構成比異常' || a.dimension === '急変異常'
    );

    if (hasStructuralAnomaly) {
      concerns.push(t.concernBusinessRelevance);
    }

    // もし concerns が空なら、フォールバックを返す
    if (concerns.length === 0) {
      return [t.concernDefault];
    }

    return concerns;
  };

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
            🚨 {t.auditRiskAnalysisResult}（{accountName}）
          </h2>
          <p className="text-lg font-bold mb-2">
            {t.overallAuditRisk}：{riskLevel === 'high' ? t.highRisk : riskLevel === 'medium' ? t.mediumRisk : t.lowRisk}
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
              🎯 {t.detectedAnomaliesCount}（{anomalyCount || 0}{t.rulesCount}）
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: '構成比異常', label: t.compositionAnomaly, desc: t.compositionDistortion },
                { key: '統計的異常', label: t.statisticalAnomaly, desc: t.deviationFromAverage },
                { key: '急変異常', label: t.suddenChangeAnomaly, desc: t.suddenChange },
                { key: '比率変動異常', label: t.ratioChangeAnomaly, desc: t.ratioVariation }
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
            🧠 {t.taxBusinessMeaning}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {t.aiInterpretationNote}
          </p>

          {/* AIの税務署からの見られ方 */}
          {auditData.aiSuspicionView && (
            <div className="mb-4">
              <p className="font-semibold text-gray-800 mb-2">{t.aiAnalysisResult}（{t.suspicionView}）：</p>
              <p className="text-gray-700">{auditData.aiSuspicionView}</p>
            </div>
          )}

          {/* AIの準備アドバイス */}
          {auditData.aiPreparationAdvice && (
            <div className="mb-4">
              <p className="font-semibold text-blue-800 mb-2">{t.aiPreparationAdvice}：</p>
              <p className="text-blue-700">{auditData.aiPreparationAdvice}</p>
            </div>
          )}

          {accountName === '地代家賃' ? (
            <>
              {/* 1. 思考：税務署の視点 */}
              <div className="mb-4">
                <p className="font-semibold text-gray-800 mb-2">{t.taxAuditConcerns}：</p>
                <p className="text-gray-700">
                  {t.rentStructureConcern.replace(/\{accountName\}/g, accountName).replace(/\{ratio\}/g, ratio.toFixed(1))}
                </p>
              </div>

              {/* 2. ロジック：なぜ問題か */}
              <div className="mb-4">
                <p className="font-semibold text-gray-800 mb-2">{t.particularlyNote}：</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  {ratio > 80 && (
                    <li>{t.extremeConcentration}</li>
                  )}
                  {growthRate !== null && growthRate !== undefined && growthRate > 30 && (
                    <li>{t.rapidYearOverYearChange.replace(/\{growthRate\}/g, growthRate.toFixed(1))}</li>
                  )}
                  {zScore !== null && zScore !== undefined && Math.abs(zScore) > 2 && (
                    <li>{t.statisticalDeviation.replace(/\{zScore\}/g, zScore.toFixed(1))}</li>
                  )}
                  {/* 🆕 条件付きで共通注意点を追加（構成比異常または急変異常が検知された場合のみ） */}
                  {(detectedAnomalies?.some(a => a.dimension === '構成比異常') ||
                    detectedAnomalies?.some(a => a.dimension === '急変異常')) && (
                    <li>{t.businessRelevance}</li>
                  )}
                </ul>
              </div>

              {/* 3. 反証：正当化される可能性 */}
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                <p className="font-semibold text-gray-800 mb-2">{t.rentJustificationCases}：</p>
                <div className="text-sm text-gray-700 space-y-2">
                  <p><strong>{t.rentProblemLessLikelyIndustries}：</strong></p>
                  <ul className="list-disc list-inside ml-4">
                    <li>{t.rentRealEstateRental}</li>
                    <li>{t.rentRentalSpaceStudio}</li>
                    <li>{t.rentWarehouseEquipmentBusiness}</li>
                  </ul>
                  <p className="mt-2"><strong>{t.rentProblemProneIndustries}：</strong></p>
                  <ul className="list-disc list-inside ml-4">
                    <li>{t.rentRetailIT}</li>
                    <li>{t.rentConsulting}</li>
                  </ul>
                  <p className="mt-3 text-blue-800 font-medium">
                    {t.rentBusinessModelNote}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* 1. 思考：税務署の視点 */}
              <div className="mb-4">
                <p className="font-semibold text-gray-800 mb-2">{t.taxAuditConcerns}：</p>
                <p className="text-gray-700">
                  {t.taxAuditConcernsGeneric.replace(/\{accountName\}/g, accountName).replace(/\{ratio\}/g, ratio.toFixed(1))}
                </p>
              </div>

              {/* 2. ロジック：なぜ問題か */}
              <div className="mb-4">
                <p className="font-semibold text-gray-800 mb-2">{t.particularlyNote}：</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  {ratio > 80 && (
                    <li>{t.extremeConcentration}</li>
                  )}
                  {growthRate !== null && growthRate !== undefined && growthRate > 30 && (
                    <li>{t.rapidYearOverYearChange.replace(/\{growthRate\}/g, growthRate.toFixed(1))}</li>
                  )}
                  {zScore !== null && zScore !== undefined && Math.abs(zScore) > 2 && (
                    <li>{t.statisticalDeviation.replace(/\{zScore\}/g, zScore.toFixed(1))}</li>
                  )}
                  {/* 🆕 条件付きで共通注意点を追加（構成比異常または急変異常が検知された場合のみ） */}
                  {(detectedAnomalies?.some(a => a.dimension === '構成比異常') ||
                    detectedAnomalies?.some(a => a.dimension === '急変異常')) && (
                    <li>{t.businessRelevance}</li>
                  )}
                </ul>
              </div>

              {/* 3. 反証：正当化される可能性 */}
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                <p className="font-semibold text-gray-800 mb-2">{t.justificationCasesGeneric}</p>
                <div className="text-sm text-gray-700 space-y-2">
                  <p><strong>{t.commonJustificationPoints}</strong></p>
                  <ul className="list-disc list-inside ml-4">
                    <li>{t.justificationPoint1}</li>
                    <li>{t.justificationPoint2}</li>
                    <li>{t.justificationPoint3}</li>
                  </ul>
                  <p className="mt-3 text-blue-800 font-medium">
                    {t.justificationNote}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ③ 数値根拠（エビデンス） */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-3">🔍 {t.riskBasisTitle}</h3>
          <div className="space-y-2 text-sm">
            {/* 数値表示 */}
            <div className="flex justify-between">
              <span className="text-gray-600">売上前年差</span>
              <span className={`font-bold ${formatValue(growthRate, '%') === 'N/A' ? 'text-gray-400' : ''}`}>
                {formatValue(growthRate, '%')}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">{t.accountRatio.replace(/\{accountName\}/g, accountName)}</span>
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
              <p className="font-bold text-blue-900 mb-1">{t.dataInsufficientNoteTitle}</p>
              <p className="text-blue-800">
                {t.dataInsufficientNote}
              </p>
            </div>
          )}
        </div>

        {/* ④ 今やるべきこと */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-3">🛠 {t.whatToDoNow}</h3>



          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="font-bold">1.</span>
              <span>{t.action1.replace(/\{accountName\}/g, accountName)}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold">2.</span>
              <span>{t.action2}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold">3.</span>
              <span>{t.action3}</span>
            </div>
            {growthRate !== null && growthRate !== undefined && growthRate > 30 && (
              <div className="flex items-start gap-2">
                <span className="font-bold">4.</span>
                <span>{t.action4.replace(/\{growthRate\}/g, growthRate.toFixed(1))}</span>
              </div>
            )}
          </div>
          <div className="mt-4 p-3 bg-amber-50 rounded-lg text-xs text-amber-900">
            {t.denialRiskNote}
          </div>
        </div>

        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="w-full bg-gray-600 text-white py-3 rounded-lg font-bold hover:bg-gray-700"
        >
          {t.close}
        </button>
      </div>
    </div>
  );
};

export default AuditReasoningModal;
