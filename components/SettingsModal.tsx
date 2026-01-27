
import React, { useState, useEffect } from 'react';
import { XMarkIcon, TrashIcon, SparklesIcon, CloudIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { TransactionRule } from '../types';
import { AuthStatus } from '../services/authService';
import { TEXT, Language } from '../src/i18n/text';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: TransactionRule[];
  onDeleteRule: (id: string) => void;
  onClearHistory: () => void;
  onInitializeSystem: () => Promise<void>;
  authStatus: AuthStatus | null;
  t: any;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, rules: initialRules, onDeleteRule, onClearHistory, onInitializeSystem, authStatus, t }) => {
  const [isInitializing, setIsInitializing] = useState(false);
  const [initMessage, setInitMessage] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [rulesSheetGid, setRulesSheetGid] = useState<number>(3);
  const [rules, setRules] = useState<TransactionRule[]>(initialRules);

  // Fetch rules and spreadsheet ID when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchSpreadsheetId();
      fetchRules();
    }
  }, [isOpen]);

  const fetchSpreadsheetId = async () => {
    try {
      const userId = authStatus?.userId || 'test-user';
      const response = await fetch(`/api/spreadsheet-id?userId=${userId}`);
      const data = await response.json();
      if (data.spreadsheetId) {
        setSpreadsheetId(data.spreadsheetId);
        setRulesSheetGid(data.rulesSheetGid || 3);
      }
    } catch (error) {
      console.error('Failed to fetch spreadsheet ID:', error);
    }
  };

  const fetchRules = async () => {
    try {
      const year = new Date().getFullYear();
      const userId = authStatus?.userId || 'test-user';
      const response = await fetch(`/api/rules?userId=${userId}&year=${year}`);
      const data = await response.json();
      if (data.success && data.rules) {
        setRules(data.rules);
      }
    } catch (error) {
      console.error('Failed to fetch rules:', error);
    }
  };

  const sheetsUrl = spreadsheetId 
    ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${rulesSheetGid}`
    : null;

  if (!isOpen) return null;

  const handleInitializeSystem = async () => {
    setIsInitializing(true);
    setInitMessage(null);
    try {
      await onInitializeSystem();
      setInitMessage('✅ セットアップ完了');
      setTimeout(() => setInitMessage(null), 3000);
    } catch (error: any) {
      setInitMessage(`❌ エラー: ${error.message}`);
      setTimeout(() => setInitMessage(null), 5000);
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-slate-900" />
            <h2 className="font-bold text-gray-800">{t.personalRuleSettings}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition">
            <XMarkIcon className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.autoClassificationRules}</h3>
              {rules.length > 0 && (
                <span className="text-xs font-bold text-slate-900 bg-slate-50 px-2 py-1 rounded-full">
                  {rules.length}{t.rulesCount}
                </span>
              )}
            </div>
            
            {/* Google Sheets へのリンクボタン - 常時表示 */}
            {sheetsUrl && (
              <a
                href={sheetsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full mb-3 py-3 px-4 bg-green-50 text-green-600 text-sm font-bold rounded-xl hover:bg-green-100 transition text-center flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
                  <path d="M7 12h2v5H7zm4-3h2v8h-2zm4-3h2v11h-2z"/>
                </svg>
                {t.checkRulesInSheets}
              </a>
            )}
            
            {rules.length === 0 ? (
              <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-xl text-center">
                {t.rulesDescription}
              </p>
            ) : (
              <div className="space-y-2">
                {rules.map(rule => (
                  <div key={rule.id} className="flex items-center justify-between bg-white border border-gray-100 p-3 rounded-xl shadow-sm">
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-slate-900 mb-0.5">{t.keyword}: {rule.keyword}</p>
                      <p className="text-sm text-gray-800 font-medium">{t.accountCategory}: {rule.category}</p>
                    </div>
                    <button
                      onClick={() => {
                        if (sheetsUrl) {
                          window.open(sheetsUrl, '_blank');
                        }
                      }}
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-100 transition flex items-center gap-1"
                      disabled={!sheetsUrl}
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
                        <path d="M7 12h2v5H7zm4-3h2v8h-2zm4-3h2v11h-2z"/>
                      </svg>
                      {t.editInSheets}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="pt-4 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{t.systemSettings}</h3>
            <div className="space-y-3">
              <button
                onClick={handleInitializeSystem}
                disabled={isInitializing}
                className="w-full py-3 px-4 bg-slate-50 text-slate-900 text-sm font-bold rounded-xl hover:bg-slate-100 transition text-center disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isInitializing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                    セットアップ中...
                  </>
                ) : (
                  <>
                    <CloudIcon className="w-4 h-4" />
                    {t.setupGoogleDrive}
                  </>
                )}
              </button>
              {initMessage && (
                <div className={`p-3 rounded-xl text-center text-sm font-bold ${
                  initMessage.includes('✅')
                    ? 'bg-green-50 text-green-600 border border-green-200'
                    : 'bg-red-50 text-red-600 border border-red-200'
                }`}>
                  {initMessage}
                </div>
              )}
            </div>
          </section>

          <section className="pt-4 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{t.dataManagement}</h3>
            <button
              onClick={() => {
                if (window.confirm(t.clearHistoryConfirm)) {
                  onClearHistory();
                  onClose();
                }
              }}
              className="w-full py-3 px-4 bg-rose-50 text-rose-600 text-sm font-bold rounded-xl hover:bg-rose-100 transition text-center"
            >
              {t.clearChatHistory}
            </button>
          </section>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition shadow-sm"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
