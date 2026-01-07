
import React from 'react';
import { XMarkIcon, TrashIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { TransactionRule } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: TransactionRule[];
  onDeleteRule: (id: string) => void;
  onClearHistory: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, rules, onDeleteRule, onClearHistory }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-indigo-50">
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-gray-800">個人ルール設定</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition">
            <XMarkIcon className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">自動分類ルール</h3>
            {rules.length === 0 ? (
              <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-xl text-center">
                チャットで「〜の時は〜の科目にして」と<br/>教えてもらうとここに自動追加されます。
              </p>
            ) : (
              <div className="space-y-2">
                {rules.map(rule => (
                  <div key={rule.id} className="flex items-center justify-between bg-white border border-gray-100 p-3 rounded-xl shadow-sm">
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-indigo-600 mb-0.5">キーワード: {rule.keyword}</p>
                      <p className="text-sm text-gray-800 font-medium">勘定科目: {rule.category}</p>
                    </div>
                    <button 
                      onClick={() => onDeleteRule(rule.id)}
                      className="p-2 text-gray-300 hover:text-rose-500 transition"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="pt-4 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">データ管理</h3>
            <button 
              onClick={() => {
                if (window.confirm('チャット履歴を全て削除しますか？')) {
                  onClearHistory();
                  onClose();
                }
              }}
              className="w-full py-3 px-4 bg-rose-50 text-rose-600 text-sm font-bold rounded-xl hover:bg-rose-100 transition text-center"
            >
              チャット履歴をクリア
            </button>
          </section>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition shadow-sm"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
