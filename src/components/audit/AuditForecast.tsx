import React, { useState } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { AuditForecastItem } from '../../../types';
import { TEXT, Language } from '../../i18n/text';

interface AuditForecastProps {
  auditForecast: AuditForecastItem[];
  isLoading: boolean;
  loadingMessage: string;
  t: any;
  language?: 'ja' | 'en';
}

const AuditForecast: React.FC<AuditForecastProps> = ({
  auditForecast,
  isLoading,
  loadingMessage,
  t,
  language = 'ja'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // スコア計算ロジック（既存のものを再利用）
  const calculateAnomalyScores = (item: AuditForecastItem) => {
    const scores = {
      composition: 0,
      suddenChange: 0,
      statisticalDeviation: 0,
      ratioFluctuation: 0,
      highAmountDensity: 0,
      crossCategoryMatch: 0
    };

    // 構成比異常スコア
    if (item.ratio > 30) {
      scores.composition = Math.min(100, (item.ratio - 30) * 2);
    }

    // 急変異常スコア
    if (item.growthRate !== null) {
      const absGrowth = Math.abs(item.growthRate);
      if (absGrowth > 50) {
        scores.suddenChange = Math.min(100, (absGrowth - 50) * 1.5);
      }
    }

    // 統計的乖離スコア
    if (item.zScore !== null) {
      const absZ = Math.abs(item.zScore);
      if (absZ > 2) {
        scores.statisticalDeviation = Math.min(100, (absZ - 2) * 25);
      }
    }

    // 比率変動スコア
    if (item.diffRatio !== null) {
      const absDiff = Math.abs(item.diffRatio);
      if (absDiff > 10) {
        scores.ratioFluctuation = Math.min(100, (absDiff - 10) * 2);
      }
    }

    // 高額取引密度スコア
    if (item.totalAmount > 1000000) {
      scores.highAmountDensity = Math.min(100, (item.totalAmount / 1000000) * 20);
    }

    // クロスカテゴリ一致スコア
    if (item.detectedAnomalies) {
      const crossCategoryCount = item.detectedAnomalies.filter(
        anomaly => anomaly.dimension === 'crossCategory'
      ).length;
      scores.crossCategoryMatch = Math.min(100, crossCategoryCount * 25);
    }

    return scores;
  };

  // AI総評の生成ロジック
  const generateOverallAssessment = (item: AuditForecastItem) => {
    const scores = calculateAnomalyScores(item);
    const maxScore = Math.max(...Object.values(scores));
    const maxScoreKey = Object.keys(scores).find(key => scores[key as keyof typeof scores] === maxScore);

    if (maxScore === 0) {
      return t.noAbnormalPatternDetected;
    }

    const patternMap: Record<string, string> = {
      composition: t.compositionAbnormality,
      suddenChange: t.suddenChangeAbnormality,
      statisticalDeviation: t.statisticalDeviation,
      ratioFluctuation: t.ratioFluctuation,
      highAmountDensity: t.highAmountDensity,
      crossCategoryMatch: t.crossCategoryMatch
    };

    const patternName = patternMap[maxScoreKey || ''] || t.abnormalPattern;
    
    // リスクパターンの判定
    let riskPattern = t.singleSubjectConcentrationRisk;
    if (maxScore > 70) {
      riskPattern = t.multipleSubjectConcentrationRisk;
    } else if (maxScore > 30) {
      riskPattern = t.singleSubjectConcentrationRisk;
    }

    return `${patternName}が突出した${riskPattern}`;
  };

  // レーダーチャート用データ
  const getRadarChartData = (item: AuditForecastItem) => {
    const scores = calculateAnomalyScores(item);
    
    return [
      { subject: t.compositionAbnormality, A: scores.composition, fullMark: 100 },
      { subject: t.suddenChangeAbnormality, A: scores.suddenChange, fullMark: 100 },
      { subject: t.statisticalDeviation, A: scores.statisticalDeviation, fullMark: 100 },
      { subject: t.ratioFluctuation, A: scores.ratioFluctuation, fullMark: 100 },
      { subject: t.highAmountDensity, A: scores.highAmountDensity, fullMark: 100 },
      { subject: t.crossCategoryMatch, A: scores.crossCategoryMatch, fullMark: 100 }
    ];
  };

  // リスクレベルに応じた色
  const getRiskColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
    }
  };

  // 異常パターンの検出状態を取得
  const getAnomalyDetectionStatus = (item: AuditForecastItem) => {
    const scores = calculateAnomalyScores(item);
    
    return [
      { name: t.compositionAbnormality, detected: scores.composition > 0, score: scores.composition },
      { name: t.suddenChangeAbnormality, detected: scores.suddenChange > 0, score: scores.suddenChange },
      { name: t.statisticalDeviation, detected: scores.statisticalDeviation > 0, score: scores.statisticalDeviation },
      { name: t.ratioFluctuation, detected: scores.ratioFluctuation > 0, score: scores.ratioFluctuation },
      { name: t.highAmountDensity, detected: scores.highAmountDensity > 0, score: scores.highAmountDensity },
      { name: t.crossCategoryMatch, detected: scores.crossCategoryMatch > 0, score: scores.crossCategoryMatch }
    ];
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

  if (isLoading) {
    return (
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-sm font-bold text-gray-700 mb-4">
          📊 {t.todayAuditForecast.replace('{date}', new Date().toISOString().split('T')[0])}
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3 text-slate-600">
            <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
            <span className="text-sm font-medium">{loadingMessage}</span>
          </div>
        </div>
      </div>
    );
  }

  if (auditForecast.length === 0) {
    return (
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-sm font-bold text-gray-700 mb-4">
          📊 {t.todayAuditForecast.replace('{date}', new Date().toISOString().split('T')[0])}
        </h3>
        <p className="text-sm text-gray-500 text-center py-4">{t.noAuditData}</p>
      </div>
    );
  }

  const item = auditForecast[0]; // 最もリスクが高い項目
  const scores = calculateAnomalyScores(item);
  const maxScore = Math.max(...Object.values(scores));
  const radarData = getRadarChartData(item);
  const anomalyStatus = getAnomalyDetectionStatus(item);

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
      <h3 className="text-sm font-bold text-gray-700 mb-4">
        📊 {t.todayAuditForecast.replace('{date}', new Date().toISOString().split('T')[0])}
      </h3>

      {/* 常時表示部分 */}
      <div className="space-y-4">
        {/* レーダーチャート */}
        <div className="bg-gray-50 rounded-lg p-4">
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={radarData}>
              <PolarGrid gridType="polygon" />
              <PolarAngleAxis dataKey="subject" />
              <PolarRadiusAxis angle={60} domain={[0, 100]} tick={false} />
              <Radar
                name={t.categories[item.accountName] || item.accountName}
                dataKey="A"
                stroke={getRiskColor(item.riskLevel)}
                fill={getRiskColor(item.riskLevel)}
                fillOpacity={0.6}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* AI総評 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">💬</span>
            <h4 className="font-bold text-blue-800 text-sm">{t.aiOverallAssessment}</h4>
          </div>
          <p className="text-sm text-blue-700">{generateOverallAssessment(item)}</p>
        </div>

        {/* 折りたたみトグル */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          {isExpanded ? '▲' : '▼'} {isExpanded ? t.hideDetails : t.showDetails}
        </button>
      </div>

      {/* 展開後の詳細部分 */}
      {isExpanded && (
        <div className="mt-4 space-y-4 border-t border-gray-200 pt-4 animate-in slide-in-from-top-2 duration-200">
          {/* AI監査リスク分析 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🧠</span>
              <h4 className="font-bold text-gray-800">{t.aiAuditRiskAnalysis}</h4>
            </div>
            <div className="space-y-2 text-sm text-gray-700">
              <p>• {t.overallAuditRisk}: {t.riskLevels[item.riskLevel]}</p>
              <p>• {t.mostLikelyItem}: {t.categories[item.accountName] || item.accountName} (¥{(item.totalAmount || 0).toLocaleString()} / {item.ratio.toFixed(1)}%)</p>
              <p>• {t.reason}: {t.expenseCompositionDistortion}</p>
            </div>
          </div>

          {/* 検知された異常パターン */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🎯</span>
              <h4 className="font-bold text-gray-800">{t.detectedAbnormalPatterns}</h4>
            </div>
            <div className="space-y-2">
              {anomalyStatus.map((anomaly, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    {anomaly.detected ? '✔' : '✖'} {anomaly.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {anomaly.detected ? `${Math.round(anomaly.score)}点` : t.noAbnormality}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 税務署視点での意味 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🔍</span>
              <h4 className="font-bold text-gray-800">{t.meaningFromTaxAuthorityPerspective}</h4>
            </div>
            <div className="space-y-3 text-sm text-gray-700">
              {item.aiSuspicionView ? (
                item.aiSuspicionView.split('\n').map((paragraph, index) => (
                  <p key={index} className="leading-relaxed">{paragraph}</p>
                ))
              ) : (
                <p>{t.aiSuspicionViewNotAvailable}</p>
              )}
            </div>
          </div>

          {/* 数値的根拠 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📊</span>
              <h4 className="font-bold text-gray-800">{t.numericalEvidence}</h4>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600 mb-1">{t.totalAmount}</p>
                <p className="font-semibold">¥{(item.totalAmount || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">{t.ratioOfTotal}</p>
                <p className="font-semibold">{item.ratio.toFixed(1)}%</p>
              </div>
              {item.zScore !== null && (
                <div>
                  <p className="text-gray-600 mb-1">{t.zScore}</p>
                  <p className="font-semibold">{item.zScore.toFixed(2)}</p>
                </div>
              )}
              {item.growthRate !== null && (
                <div>
                  <p className="text-gray-600 mb-1">{t.growthRate}</p>
                  <p className="font-semibold">{item.growthRate.toFixed(1)}%</p>
                </div>
              )}
              {item.diffRatio !== null && (
                <div>
                  <p className="text-gray-600 mb-1">{t.ratioDifference}</p>
                  <p className="font-semibold">{item.diffRatio.toFixed(1)}ポイント</p>
                </div>
              )}
            </div>
          </div>

          {/* データ制約 */}
          {maxScore === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">⚠️</span>
                <h4 className="font-bold text-yellow-800 text-sm">{t.dataConstraints}</h4>
              </div>
              <p className="text-sm text-yellow-700">{t.comparisonDataInsufficient}</p>
            </div>
          )}

          {/* 今すぐやるべきこと */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">✅</span>
              <h4 className="font-bold text-green-800">{t.immediateActionsRequired}</h4>
            </div>
            <div className="space-y-2 text-sm text-green-700">
              {item.issues.map((issue, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                  <p>{translateIssue(issue)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditForecast;