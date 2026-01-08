
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ChatBubbleLeftRightIcon, 
  ChartBarIcon, 
  ListBulletIcon, 
  CameraIcon, 
  PaperAirplaneIcon, 
  XMarkIcon, 
  ReceiptPercentIcon, 
  Cog6ToothIcon,
  SparklesIcon,
  BanknotesIcon,
  TagIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  ArrowPathIcon,
  PencilIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { Transaction, ChatMessage, AIAction, TransactionRule } from './types';
import { storageService } from './services/storageService';
import { sheetsService } from './services/sheetsService';
import { GeminiService } from './services/geminiService';
import { authService, AuthStatus } from './services/authService';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import SettingsModal from './components/SettingsModal';
import { CATEGORIES } from './constants';
import heic2any from 'heic2any';

const gemini = new GeminiService();

const QUICK_ACTIONS = [
  { label: 'ルール設定', icon: TagIcon, prefix: 'ルール：' },
  { label: '経費入力', icon: BanknotesIcon, prefix: '経費：' },
  { label: '売上入力', icon: SparklesIcon, prefix: '売上：' },
  { label: '集計', icon: ChartBarIcon, prefix: '集計を見せて' },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'dashboard' | 'history'>('chat');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  const [transactions, setTransactions] = useState<Transaction[]>(() => storageService.loadTransactions());
  const [rules, setRules] = useState<TransactionRule[]>(() => storageService.loadRules());
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = storageService.loadMessages();
    return saved.length > 0 ? saved : [{
      id: 'welcome',
      role: 'assistant',
      content: 'こんにちは！Gemini Expenseです。\n入力内容からデータを抽出し、確認カードを表示します。',
      timestamp: Date.now()
    }];
  });

  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConvertingImage, setIsConvertingImage] = useState(false);
  
  const [pendingExtraction, setPendingExtraction] = useState<{
    type: 'transaction' | 'rule';
    data: any;
    imageUrl?: string;
  } | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { storageService.saveTransactions(transactions); }, [transactions]);
  useEffect(() => { storageService.saveMessages(messages); }, [messages]);
  useEffect(() => { storageService.saveRules(rules); }, [rules]);

  // Check authentication status on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const status = await authService.checkAuthStatus();
        setAuthStatus(status);

        // Set userId in sheetsService
        sheetsService.setUserId(status.userId);

        // Check for auth result from URL
        const authResult = authService.checkAuthResult();
        if (authResult === 'success') {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: '✅ Google アカウントとの連携が完了しました！',
            timestamp: Date.now()
          }]);
          // Refresh auth status
          const updatedStatus = await authService.checkAuthStatus();
          setAuthStatus(updatedStatus);
          sheetsService.setUserId(updatedStatus.userId);
        } else if (authResult === 'error') {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: '❌ Google アカウントとの連携に失敗しました。',
            timestamp: Date.now()
          }]);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (activeTab === 'chat') {
      const timer = setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [messages, activeTab, pendingExtraction, isEditing, isProcessing]);

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    });
  };

  const commitTransaction = async () => {
    if (!pendingExtraction) return;

    try {
      const { data, imageUrl } = pendingExtraction;

      // Determine type based on category
      const type = data.category === '売上' ? 'income' : 'expense';

      // Prepare data for API
      const expenseData = {
        date: data.date || new Date().toISOString().split('T')[0],
        amount: Number(data.amount) || 0,
        category: data.category || '雑費',
        memo: data.description || '内容なし',
        receipt_url: imageUrl || '',
        type: type,
        userId: authStatus?.userId || 'test-user'
      };

      // Save to Sheet via API
      const response = await fetch('http://localhost:3001/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expenseData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.details || result.error || '保存に失敗しました');
      }

      // Create local transaction object for UI display
      const newTx: Transaction = {
        id: crypto.randomUUID(),
        date: expenseData.date,
        amount: expenseData.amount,
        description: expenseData.memo,
        category: expenseData.category,
        type: type,
        receiptUrl: expenseData.receipt_url,
        createdAt: Date.now()
      };

      // Update local state
      setTransactions(prev => [newTx, ...prev]);

      // Show success message
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `✅ 保存完了: ${newTx.description} (${result.id ? `行${result.id}` : ''})`,
        timestamp: Date.now()
      }]);

      setPendingExtraction(null);

    } catch (error: any) {
      console.error('Transaction save error:', error);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `❌ 保存に失敗しました: ${error.message}`,
        timestamp: Date.now()
      }]);
    }
  };

  const commitRule = () => {
    if (!pendingExtraction) return;
    const { keyword, category } = pendingExtraction.data;
    if (keyword && category) {
      setRules(prev => {
        const filtered = prev.filter(r => r.keyword !== keyword);
        return [...filtered, { id: crypto.randomUUID(), keyword, category }];
      });
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `✅ ルール追加: 「${keyword}」→「${category}」`,
        timestamp: Date.now()
      }]);
      setPendingExtraction(null);
    }
  };

  const handleSendMessage = async () => {
    const currentInput = inputText.trim();
    if (isProcessing || isConvertingImage) return;
    if (!currentInput && !selectedImage) return;

    setInputText('');
    const currentImage = selectedImage;
    setSelectedImage(null);
    setIsProcessing(true);
    setPendingExtraction(null);

    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'user',
      content: currentInput || "画像を解析してください",
      image: currentImage || undefined,
      timestamp: Date.now()
    }]);

    try {
      const response = await gemini.processInput(
        currentInput || "画像を解析してください", 
        currentImage || undefined, 
        messages.slice(-4),
        rules
      );
      
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.reply,
        timestamp: Date.now()
      }]);

      if (response.actions && response.actions.length > 0) {
        const action = response.actions.find(a => a.type === 'ADD_TRANSACTION' || a.type === 'CREATE_RULE');
        if (action && action.data) {
          setPendingExtraction({
            type: action.type === 'ADD_TRANSACTION' ? 'transaction' : 'rule',
            data: { ...action.data },
            imageUrl: currentImage || undefined
          });
        }
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `⚠️ エラーが発生しました: ${err.message}`,
        timestamp: Date.now()
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsConvertingImage(true);
    try {
      let processFile: Blob = file;
      if (file.name.toLowerCase().match(/\.(heic|heif)$/)) {
        const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.6 });
        processFile = Array.isArray(converted) ? converted[0] : converted;
      }
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const compressed = await compressImage(ev.target?.result as string);
        setSelectedImage(compressed);
        setIsConvertingImage(false);
      };
      reader.readAsDataURL(processFile);
    } catch (err) {
      setIsConvertingImage(false);
    }
  };

  const handleQuickAction = (prefix: string) => {
    setInputText(prefix);
    textareaRef.current?.focus();
  };

  const handleInitializeSystem = async () => {
    try {
      await sheetsService.initialize();
    } catch (error: any) {
      throw new Error(error.message || 'システムの初期化に失敗しました');
    }
  };

  const handleGoogleLogin = () => {
    setIsAuthenticating(true);
    window.location.href = authService.getAuthUrl();
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      setAuthStatus({ authenticated: false, userId: 'test-user' });
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '✅ Google アカウントからログアウトしました。',
        timestamp: Date.now()
      }]);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-white shadow-xl overflow-hidden relative">
      <header className="bg-indigo-600 text-white p-4 shadow-md flex items-center justify-between z-30">
        <div className="flex items-center gap-2 font-bold">
          <ReceiptPercentIcon className="w-8 h-8" />
          <h1 className="text-xl tracking-tight">Gemini Expense</h1>
        </div>
        <div className="flex items-center gap-2">
          {authStatus && (
            <div className="flex items-center gap-2 text-sm">
              {authStatus.authenticated ? (
                <>
                  <span className="flex items-center gap-1 text-green-300">
                    <CheckCircleIcon className="w-4 h-4" />
                    Google連携済み
                  </span>
                  <button
                    onClick={handleLogout}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-xs transition"
                  >
                    ログアウト
                  </button>
                </>
              ) : (
                <button
                  onClick={handleGoogleLogin}
                  disabled={isAuthenticating}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-xs transition flex items-center gap-1 disabled:opacity-50"
                >
                  {isAuthenticating ? (
                    <>
                      <ArrowPathIcon className="w-3 h-3 animate-spin" />
                      連携中...
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Google連携
                    </>
                  )}
                </button>
              )}
            </div>
          )}
          <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:bg-white/10 rounded-full transition ml-2">
            <Cog6ToothIcon className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* min-h-0 を追加してグラフ描画時のサイズ計算を安定化 */}
      <main className="flex-1 overflow-y-auto bg-slate-50 relative min-h-0">
        {activeTab === 'chat' ? (
          <div className="p-4 space-y-4 pb-48">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'}`}>
                  {m.image && <img src={m.image} className="w-full h-48 object-cover rounded-lg mb-2 border border-black/10 shadow-inner" alt="添付" />}
                  <p className="whitespace-pre-wrap leading-relaxed text-sm font-medium">{m.content}</p>
                </div>
              </div>
            ))}
            
            {(isProcessing || isConvertingImage) && (
              <div className="flex justify-start">
                <div className="bg-white border border-indigo-100 p-4 rounded-2xl flex items-center gap-3 text-indigo-500 shadow-sm border-l-4 border-l-indigo-500 animate-pulse">
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  <span className="text-xs font-bold tracking-widest uppercase">
                    {isConvertingImage ? 'Optimizing Image...' : 'Analyzing Data...'}
                  </span>
                </div>
              </div>
            )}

            {pendingExtraction && (
              <div className="flex justify-start animate-in slide-in-from-bottom-8 duration-500">
                <div className="w-full max-w-[95%] bg-white border-2 border-indigo-200 rounded-3xl p-5 shadow-2xl ring-4 ring-indigo-50/50">
                  <div className="flex items-center justify-between mb-4 border-b border-indigo-50 pb-3">
                    <div className="flex items-center gap-2 text-indigo-700 font-bold">
                      <SparklesIcon className="w-6 h-6 animate-pulse" />
                      <span className="text-sm font-bold">抽出内容の確認</span>
                    </div>
                    <button onClick={() => setPendingExtraction(null)} className="p-1 text-gray-300 hover:text-rose-400 transition">
                      <XMarkIcon className="w-6 h-6" />
                    </button>
                  </div>
                  
                  {isEditing ? (
                    <div className="space-y-4 bg-slate-50 p-4 rounded-2xl mb-4">
                      {pendingExtraction.type === 'transaction' ? (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] text-gray-400 font-bold mb-1 block">金額</label>
                              <input type="number" value={pendingExtraction.data.amount} onChange={(e) => setPendingExtraction({...pendingExtraction, data: {...pendingExtraction.data, amount: e.target.value}})} className="w-full p-2 rounded-lg border border-indigo-200 text-sm font-bold outline-none" />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-400 font-bold mb-1 block">科目</label>
                              <select value={pendingExtraction.data.category} onChange={(e) => setPendingExtraction({...pendingExtraction, data: {...pendingExtraction.data, category: e.target.value}})} className="w-full p-2 rounded-lg border border-indigo-200 text-sm font-bold outline-none">
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 font-bold mb-1 block">内容</label>
                            <input type="text" value={pendingExtraction.data.description} onChange={(e) => setPendingExtraction({...pendingExtraction, data: {...pendingExtraction.data, description: e.target.value}})} className="w-full p-2 rounded-lg border border-indigo-200 text-sm font-bold outline-none" />
                          </div>
                        </>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <label className="text-[10px] text-gray-400 font-bold mb-1 block">キーワード</label>
                            <input type="text" value={pendingExtraction.data.keyword} onChange={(e) => setPendingExtraction({...pendingExtraction, data: {...pendingExtraction.data, keyword: e.target.value}})} className="w-full p-2 rounded-lg border border-indigo-200 text-sm font-bold outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 font-bold mb-1 block">分類科目</label>
                            <select value={pendingExtraction.data.category} onChange={(e) => setPendingExtraction({...pendingExtraction, data: {...pendingExtraction.data, category: e.target.value}})} className="w-full p-2 rounded-lg border border-indigo-200 text-sm font-bold outline-none">
                              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                        </div>
                      )}
                      <button onClick={() => setIsEditing(false)} className="w-full py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs">編集完了</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      {pendingExtraction.type === 'transaction' ? (
                        <>
                          <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-50">
                            <p className="text-[10px] text-indigo-400 font-bold uppercase mb-1">金額</p>
                            <p className="text-2xl font-black text-indigo-700">¥{Number(pendingExtraction.data.amount || 0).toLocaleString()}</p>
                          </div>
                          <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-50">
                            <p className="text-[10px] text-indigo-400 font-bold uppercase mb-1">勘定科目</p>
                            <p className="text-sm font-bold text-gray-800">{pendingExtraction.data.category || '未設定'}</p>
                          </div>
                          <div className="col-span-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">内容</p>
                            <p className="text-sm font-bold text-gray-700">{pendingExtraction.data.description || '内容なし'}</p>
                          </div>
                        </>
                      ) : (
                        <div className="col-span-2 bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                          <p className="text-sm font-bold text-gray-800 leading-relaxed">
                            「<span className="text-indigo-600 font-black">{pendingExtraction.data.keyword}</span>」のときは
                            「<span className="text-indigo-600 font-black">{pendingExtraction.data.category}</span>」に自動分類します。
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button 
                      onClick={pendingExtraction.type === 'transaction' ? commitTransaction : commitRule}
                      className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition flex items-center justify-center gap-2"
                    >
                      <CheckCircleIcon className="w-6 h-6" />
                      この内容で保存
                    </button>
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="flex-1 bg-white text-indigo-600 py-4 rounded-2xl font-bold text-sm border-2 border-indigo-100 hover:bg-indigo-50 active:scale-95 transition flex items-center justify-center gap-1"
                    >
                      <PencilSquareIcon className="w-5 h-5" />
                      修正
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} className="h-4" />
          </div>
        ) : activeTab === 'dashboard' ? (
          <Dashboard transactions={transactions} />
        ) : (
          <TransactionList 
            transactions={transactions} 
            onRemove={(id) => setTransactions(p => p.filter(t => t.id !== id))} 
            onUpdate={(u) => setTransactions(p => p.map(t => t.id === u.id ? u : t))} 
          />
        )}
      </main>

      {activeTab === 'chat' && (
        <div className="bg-white border-t border-gray-100 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-40">
          <div className="px-4 pt-3 flex gap-2 overflow-x-auto no-scrollbar">
            {QUICK_ACTIONS.map((action, i) => (
              <button key={i} onClick={() => handleQuickAction(action.prefix)} className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-indigo-600 text-[11px] font-bold shadow-sm hover:bg-indigo-50 transition active:scale-95">
                <action.icon className="w-3.5 h-3.5" /> {action.label}
              </button>
            ))}
          </div>
          <div className="p-4">
            {selectedImage && (
              <div className="mb-3 relative inline-block animate-in zoom-in-50 duration-200">
                <img src={selectedImage} className="w-20 h-20 object-cover rounded-xl border-2 border-indigo-200 shadow-md" alt="添付" />
                <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1.5 shadow-lg active:scale-90 transition">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <button onClick={() => fileInputRef.current?.click()} disabled={isProcessing} className="p-3.5 bg-slate-100 text-gray-600 rounded-2xl hover:bg-slate-200 transition active:scale-95">
                <CameraIcon className="w-6 h-6" />
                <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleImageUpload} />
              </button>
              <textarea 
                ref={textareaRef}
                value={inputText} 
                onChange={(e) => setInputText(e.target.value)} 
                placeholder="メッセージ..."
                className="flex-1 bg-slate-100 rounded-2xl border-none focus:ring-2 focus:ring-indigo-300 resize-none max-h-32 text-sm p-3.5 placeholder:text-gray-400 font-medium" 
                rows={1} 
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { if (e.nativeEvent.isComposing) return; e.preventDefault(); handleSendMessage(); } }} 
              />
              <button onClick={handleSendMessage} disabled={isProcessing || (!inputText.trim() && !selectedImage)} className="p-3.5 bg-indigo-600 text-white rounded-2xl shadow-lg hover:bg-indigo-700 active:scale-95 transition">
                <PaperAirplaneIcon className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="flex justify-around items-center p-3 bg-white border-t border-gray-100 pb-8 sm:pb-3 z-30">
        <button onClick={() => setActiveTab('chat')} className={`flex flex-col items-center gap-1 transition ${activeTab === 'chat' ? 'text-indigo-600 scale-110' : 'text-gray-400'}`}>
          <ChatBubbleLeftRightIcon className="w-6 h-6" /> <span className="text-[10px] font-bold">チャット</span>
        </button>
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 transition ${activeTab === 'dashboard' ? 'text-indigo-600 scale-110' : 'text-gray-400'}`}>
          <ChartBarIcon className="w-6 h-6" /> <span className="text-[10px] font-bold">サマリー</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 transition ${activeTab === 'history' ? 'text-indigo-600 scale-110' : 'text-gray-400'}`}>
          <ListBulletIcon className="w-6 h-6" /> <span className="text-[10px] font-bold">履歴</span>
        </button>
      </nav>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        rules={rules}
        onDeleteRule={(id) => setRules(p => p.filter(r => r.id !== id))}
        onClearHistory={() => setMessages([{ id: 'welcome', role: 'assistant', content: '履歴をクリアしました。', timestamp: Date.now() }])}
        onInitializeSystem={handleInitializeSystem}
      />
    </div>
  );
};

export default App;
