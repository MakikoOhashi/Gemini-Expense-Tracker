import React from 'react';
import { AuditForecastItem } from '../types';

interface CrossCategoryWarningProps {
  item: AuditForecastItem;
  isVisible: boolean;
  onClose: () => void;
}

export const CrossCategoryWarning: React.FC<CrossCategoryWarningProps> = ({
  item,
  isVisible,
  onClose
}) => {
  if (!isVisible || !item.detectedAnomalies) {
    return null;
  }

  // Find cross-category matches
  const crossCategoryAnomalies = item.detectedAnomalies.filter(
    anomaly => anomaly.dimension === '構成比異常' && anomaly.crossCategoryMatches && anomaly.crossCategoryMatches.length > 0
  );

  if (crossCategoryAnomalies.length === 0) {
    return null;
  }

  return (
    <div className="cross-category-warning">
      <div className="warning-header">
        <span className="warning-icon">🔍</span>
        <h4>勘定科目横断で検出された重要事項</h4>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      
      <div className="warning-content">
        <p className="warning-text">
          同じ取引先・同じ金額が別の勘定科目に計上されている可能性があります。
          これは税務調査で特に確認されやすい重要なリスクシグナルです。
        </p>
        
        {crossCategoryAnomalies.map((anomaly, index) => (
          <div key={index} className="cross-matches">
            {anomaly.crossCategoryMatches?.map((match, matchIndex) => (
              <div key={matchIndex} className="match-item">
                <div className="match-details">
                  <span className="match-amount">¥{match.sameAmount.toLocaleString()}</span>
                  <span className="match-merchant">{match.merchant}</span>
                  <span className="match-date">{match.dateGap}</span>
                </div>
                <div className="match-account">
                  <strong>{match.relatedAccount}</strong> と重複
                </div>
              </div>
            ))}
          </div>
        ))}
        
        <div className="warning-actions">
          <button className="action-btn primary">
            取引詳細を確認
          </button>
          <button className="action-btn secondary">
            説明資料を準備
          </button>
        </div>
      </div>
    </div>
  );
};