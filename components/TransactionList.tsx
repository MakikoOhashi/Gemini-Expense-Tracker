import React, { useState, useMemo, useRef } from 'react';
import {
  TrashIcon,
  ReceiptRefundIcon,
  CheckIcon,
  XMarkIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  PhotoIcon,
  DocumentCheckIcon,
  DocumentMinusIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline';
import { Transaction } from '../types';
import { CATEGORIES } from '../constants';
import { sheetsService } from '../services/sheetsService';

interface TransactionListProps {
  transactions: Transaction[];
  onRemove: (id: string) => void;
  onUpdate: (transaction: Transaction) => void;
}

type SortKey = 'date' | 'category';
type ProofFilter = 'all' | 'with' | 'without';

// 証憑の有無を判定（URLが空または空白文字の場合は「なし」とする）
const hasReceipt = (t: Transaction): boolean => {
  return !!(t.receiptUrl && t.receiptUrl.trim() !== '');
};

const TransactionList: React.FC<TransactionListProps> = ({ transactions, onRemove, onUpdate }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Transaction>>({});
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [proofFilter, setProofFilter] = useState<ProofFilter>('all');
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredAndSortedTransactions = useMemo(() => {
    let result = [...transactions];

    // Filtering by Category
    if (filterCategory !== 'all') {
      result = result.filter(t => t.category === filterCategory);
    }

    // Filtering by Proof (receiptUrlの有無で判定)
    if (proofFilter === 'with') {
      result = result.filter(t => hasReceipt(t));
    } else if (proofFilter === 'without') {
      result = result.filter(t => !hasReceipt(t));
    }

    // Sorting
    result.sort((a, b) => {
      if (sortKey === 'date') {
        return b.createdAt - a.createdAt; // Newest first
      } else {
        return a.category.localeCompare(b.category, 'ja'); // Alphabetical by category
      }
    });

    return result;
  }, [transactions, filterCategory, sortKey, proofFilter]);

  const startEdit = (t: Transaction) => {
    setEditingId(t.id);
    setEditValues({ ...t });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const saveEdit = async () => {
    if (editingId && editValues) {
      // まずローカル state を更新
      onUpdate(editValues as Transaction);
      
      // Google Sheets にも更新
      try {
        const transactionData = {
          id: editValues.id,
          date: editValues.date || new Date().toISOString().split('T')[0],
          amount: editValues.amount || 0,
          category: editValues.category || '雑費',
          memo: editValues.description || '',
          receiptUrl: editValues.receiptUrl || '',
          type: editValues.type || 'expense'
        };
        
        await sheetsService.updateTransaction(transactionData);
        console.log('✅ Google Sheets に更新しました');
      } catch (error: any) {
        console.error('❌ Google Sheets 更新エラー:', error);
        alert(`Google Sheetsへの更新に失敗しました: ${error.message}`);
      }
      
      setEditingId(null);
      setEditValues({});
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditValues(prev => ({
      ...prev,
      [name]: name === 'amount' ? Number(value) : value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setEditValues(prev => ({
          ...prev,
          receiptUrl: event.target?.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const saveToSheets = async (transaction: Transaction) => {
    setSavingIds(prev => new Set(prev).add(transaction.id));

    try {
      const expenseData = {
        date: transaction.date,
        amount: transaction.amount,
        category: transaction.category,
        memo: transaction.description,
        receipt_url: transaction.receiptUrl || ''
      };

      await sheetsService.saveExpense(expenseData);
      alert('Google Sheetsに保存しました！');
    } catch (error: any) {
      alert(`保存に失敗しました: ${error.message}`);
    } finally {
      setSavingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(transaction.id);
        return newSet;
      });
    }
  };

  return (
    <div className="p-4 space-y-3 pb-24">
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-700">取引履歴</h2>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
            全 {transactions.length} 件
          </span>
        </div>

        {/* Filters and Sorting Controls */}
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FunnelIcon className="h-4 w-4 text-gray-400" />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none shadow-sm cursor-pointer"
            >
              <option value="all">すべての科目</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <ArrowsUpDownIcon className="h-4 w-4 text-gray-400" />
            </div>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="block w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none shadow-sm cursor-pointer"
            >
              <option value="date">日付順</option>
              <option value="category">科目順</option>
            </select>
          </div>
        </div>

        {/* Proof Presence Filter */}
        <div className="flex p-1 bg-gray-100 rounded-xl gap-1">
          <button 
            onClick={() => setProofFilter('all')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${proofFilter === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            すべて
          </button>
          <button 
            onClick={() => setProofFilter('with')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${proofFilter === 'with' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            証憑あり
          </button>
          <button 
            onClick={() => setProofFilter('without')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${proofFilter === 'without' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            証憑なし
          </button>
        </div>
      </div>
      
      {filteredAndSortedTransactions.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-200 text-center flex flex-col items-center gap-2">
          <div className="bg-gray-50 p-4 rounded-full">
            <ReceiptRefundIcon className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-400 font-medium">該当する記録がありません</p>
        </div>
      ) : (
        filteredAndSortedTransactions.map((t) => {
          const isEditing = editingId === t.id;

          if (isEditing) {
            return (
              <div key={t.id} className="bg-indigo-50 p-4 rounded-xl border border-indigo-200 shadow-sm animate-in zoom-in-95 duration-200 mb-4">
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="col-span-2">
                    <label className="text-[10px] text-indigo-400 font-bold uppercase">メモ</label>
                    <input 
                      type="text" 
                      name="description"
                      value={editValues.description} 
                      onChange={handleInputChange}
                      className="w-full text-sm font-bold p-2 bg-white rounded border border-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-indigo-400 font-bold uppercase">金額</label>
                    <input 
                      type="number" 
                      name="amount"
                      value={editValues.amount} 
                      onChange={handleInputChange}
                      className="w-full text-sm font-bold p-2 bg-white rounded border border-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-indigo-400 font-bold uppercase">勘定科目</label>
                    <select 
                      name="category"
                      value={editValues.category} 
                      onChange={handleInputChange}
                      className="w-full text-sm font-bold p-2 bg-white rounded border border-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 mt-2">
                    <label className="text-[10px] text-indigo-400 font-bold uppercase mb-1 block">証憑</label>
                    {editValues.receiptUrl && editValues.receiptUrl.trim() ? (
                      <div className="flex items-center gap-2">
                        <a 
                          href={editValues.receiptUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 underline text-sm break-all"
                        >
                          📄 レシートを確認
                        </a>
                        <button 
                          onClick={() => setEditValues(prev => ({...prev, receiptUrl: undefined}))}
                          className="text-gray-400 hover:text-rose-500 transition"
                          title="証憑を削除"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">証憑なし</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveEdit} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg flex items-center justify-center gap-1 font-bold shadow-md hover:bg-indigo-700 active:scale-95 transition">
                    <CheckIcon className="w-4 h-4" /> 保存
                  </button>
                  <button onClick={cancelEdit} className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-300 transition">
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div 
              key={t.id} 
              onDoubleClick={() => startEdit(t)}
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between group transition-all select-none active:bg-slate-50 cursor-pointer mb-2"
              title="ダブルクリックで編集"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className={`p-2 rounded-lg flex-shrink-0 ${t.type === 'income' ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
                  {t.type === 'income' ? <ReceiptRefundIcon className="w-5 h-5" /> : <ReceiptRefundIcon className="w-5 h-5" />}
                </div>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-800 truncate">{t.description}</p>
                    {t.receiptUrl ? (
                      <DocumentCheckIcon className="w-3.5 h-3.5 text-indigo-500" title="証憑あり" />
                    ) : (
                      <DocumentMinusIcon className="w-3.5 h-3.5 text-gray-300" title="証憑なし" />
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                    {t.date} • <span className="text-indigo-500 font-bold uppercase">{t.category}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <p className={`font-bold text-sm ${t.type === 'income' ? 'text-indigo-600' : 'text-gray-900'}`}>
                    {t.type === 'income' ? '+' : '-'}¥{t.amount.toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); saveToSheets(t); }}
                    disabled={savingIds.has(t.id)}
                    className="p-1.5 text-gray-300 hover:text-green-500 hover:bg-green-50 rounded-lg transition sm:opacity-0 group-hover:opacity-100 disabled:opacity-50"
                    title="Google Sheetsに保存"
                  >
                    {savingIds.has(t.id) ? (
                      <div className="w-5 h-5 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
                    ) : (
                      <CloudArrowUpIcon className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemove(t.id); }}
                    className="p-1.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition sm:opacity-0 group-hover:opacity-100"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default TransactionList;
