
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getTodayJSTString, getCurrentYearJST } from './lib/dateUtils';
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
import { sheetsService } from './services/sheetsService';
import { GeminiService } from './services/geminiService';
import { performOCR } from './services/ocrService';
import { authService, AuthStatus } from './services/authService';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import SettingsModal from './components/SettingsModal';
import YearSelectionModal from './components/YearSelectionModal';
import { BetsuhyoA } from './components/BetsuhyoA';
import { CATEGORIES } from './constants';
import heic2any from 'heic2any';

const gemini = new GeminiService();

const QUICK_ACTIONS = [
  { label: '経費入力', icon: BanknotesIcon, prefix: '経費：' },
  { label: '売上入力', icon: SparklesIcon, prefix: '売上：' },
  { label: 'ルール設定', icon: TagIcon, prefix: 'ルール：' },
];

interface ActivePrefix {
  id: string;
  text: string;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'dashboard' | 'history' | 'tax'>('chat');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isYearSelectionModalOpen, setIsYearSelectionModalOpen] = useState(false);
  const [selectedTaxYear, setSelectedTaxYear] = useState<number | null>(null);
  const [selectedAuditYear, setSelectedAuditYear] = useState<number | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAuditYearSelectionModalOpen, setIsAuditYearSelectionModalOpen] = useState(false);
  
  // Folder conflict modal state
  const [folderConflict, setFolderConflict] = useState<{
    duplicateFolders: Array<{ id: string; name: string; createdTime: string }>;
    message: string;
  } | null>(null);
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rules, setRules] = useState<TransactionRule[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: 'welcome',
    role: 'assistant',
    content: 'こんにちは！Gemini Expenseです。\n入力内容からデータを抽出し、確認カードを表示します。',
    timestamp: Date.now()
  }]);

  const [inputText, setInputText] = useState('');
  const [activePrefixes, setActivePrefixes] = useState<ActivePrefix[]>([]);
  const [auditQuery, setAuditQuery] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConvertingImage, setIsConvertingImage] = useState(false);
  const [showFirstTimeGuide, setShowFirstTimeGuide] = useState(false);
  
const [pendingExtraction, setPendingExtraction] = useState<{
  type: 'transaction' | 'rule';
  data: any;
  imageUrl?: string;
} | null>(null);
const [isEditing, setIsEditing] = useState(false);

// Rule input card state
const [showRuleInputCard, setShowRuleInputCard] = useState(false);
const [ruleInputData, setRuleInputData] = useState({
  keyword: '',
  category: CATEGORIES[0],
  notes: ''
});

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load transactions function (can be called from anywhere)
  const loadTransactions = useCallback(async () => {
    try {
      console.log('📊 Google Sheetsから取引データを取得中...');
      // 当年度のみのデータを取得
      const currentYear = getCurrentYearJST();
      const yearsToLoad = [currentYear]; // 当年度のみ

      let allTransactions: Transaction[] = [];

      for (const year of yearsToLoad) {
        try {
          const response = await sheetsService.getTransactions(year) as any;
          // 競合チェック
          if (response.isFolderAmbiguous && response.folderConflict) {
            setFolderConflict(response.folderConflict);
            continue; // 競合時はスキップ
          }

          // Transaction型に変換（年度情報を含めたユニークなIDを生成）
          const mappedTransactions: Transaction[] = response.map((t: any, index: number) => {
            // サーバーIDから行番号を抽出（新しい形式 "2026exp-5" または古い形式 "exp_5" に対応）
            let rowNumber;
            if (t.id.includes('-')) {
              // 新しい形式: "2026exp-5" → "5"
              rowNumber = t.id.split('-')[1];
            } else {
              // 古い形式: "exp_5" → "5"
              rowNumber = t.id.split('_')[1];
            }

            // rowNumber が undefined の場合はフォールバック（ユニークなIDを生成）
            if (!rowNumber || rowNumber === 'undefined') {
              rowNumber = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            }

            const typePrefix = t.type === 'income' ? 'inc' : 'exp';
            const uniqueId = `${year}${typePrefix}-${rowNumber}`;

            return {
              id: uniqueId,
              date: t.date,
              amount: t.amount,
              description: t.memo || '',
              category: t.category,
              type: t.type,
              receiptUrl: t.receipt_url || '',
              createdAt: new Date(t.date).getTime(),
              // 収入データの場合のみ支払者名と源泉徴収税額を追加
              ...(t.type === 'income' && {
                payerName: t.payerName || '',
                withholdingTax: t.withholdingTax || 0
              })
            };
          });

          allTransactions = [...allTransactions, ...mappedTransactions];
          console.log(`✅ ${year}年度: ${mappedTransactions.length}件の取引データを取得しました`);
        } catch (yearError) {
          console.warn(`${year}年度のデータ取得に失敗:`, yearError.message);
          // 年度が存在しない場合はスキップ（エラーではない）
        }
      }
      
      setTransactions(allTransactions);
      console.log(`✅ 全年度合計 ${allTransactions.length}件の取引データを取得しました`);
    } catch (error: any) {
      console.error('❌ 取引データ取得エラー:', error);
      setTransactions([]);
    }
  }, []);

  // Check authentication status on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const status = await authService.checkAuthStatus();
        setAuthStatus(status);

        // Set userId in sheetsService
        sheetsService.setUserId(status.userId);

        // Store ID token if available
        if (status.idToken) {
          authService.setIdToken(status.idToken);
        }

        // Check for auth result from URL (一度だけ実行)
        const authResult = authService.checkAuthResult();
        if (authResult === 'success' && !messages.some(m => m.content.includes('Google アカウントとの連携が完了しました'))) {
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

          // Store updated ID token if available
          if (updatedStatus.idToken) {
            authService.setIdToken(updatedStatus.idToken);
          }
        } else if (authResult === 'error' && !messages.some(m => m.content.includes('Google アカウントとの連携に失敗しました'))) {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: '❌ Google アカウントとの連携に失敗しました。',
            timestamp: Date.now()
          }]);
        }

        // Show first time guide if not shown before
        const hasSeenGuide = localStorage.getItem('hasSeenFirstTimeGuide');
        if (!hasSeenGuide && status.authenticated) {
          setShowFirstTimeGuide(true);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    };

    checkAuth();
  }, []);

  // Check for folder conflicts immediately after authentication
  useEffect(() => {
    const checkFolderConflict = async () => {
      // Only check if user is authenticated
      if (!authStatus?.authenticated) return;

      try {
        const userId = authStatus?.userId || 'test-user';
        console.log('🔍 フォルダ競合チェック開始...');

        const response = await fetch(`http://localhost:3001/api/check-folder-conflict?userId=${userId}`);
        const data = await response.json();

        if (data.isFolderAmbiguous && data.folderConflict) {
          console.log('⚠️ 認証後にフォルダ競合を検出しました');
          setFolderConflict(data.folderConflict);
        }
      } catch (error) {
        console.error('フォルダ競合チェックエラー:', error);
      }
    };

    checkFolderConflict();
  }, [authStatus?.authenticated]);

  // Authentication check modal
  useEffect(() => {
    if (!authStatus) return; // Wait for auth status to be determined

    if (!authStatus.authenticated) {
      // Show auth modal if not authenticated
      setShowAuthModal(true);
    } else {
      // Hide auth modal if authenticated
      setShowAuthModal(false);
    }
  }, [authStatus]);

  // 監査予報からの質問をチャットタブにセット
  useEffect(() => {
    if (auditQuery && activeTab === 'chat') {
      setInputText(auditQuery);
      setActivePrefixes([]); // プレフィックスをクリア
      setAuditQuery(null); // リセット
      // 少し待ってから自動送信
      setTimeout(() => {
        handleSendMessage();
      }, 100);
    }
  }, [auditQuery, activeTab]);

  useEffect(() => {
    if (activeTab === 'chat') {
      const timer = setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [messages, activeTab, pendingExtraction, isEditing, isProcessing]);

  // 取引履歴ページ、確定申告ページ、または監査予報ページ開いたらGoogle Sheetsからデータを取得
  useEffect(() => {
    if (activeTab === 'history' || activeTab === 'tax' || activeTab === 'dashboard') {
      loadTransactions();
    }
  }, [activeTab, loadTransactions]);

  // 画像圧縮設定（AI解析用に最適化：より小さく・高速）
  const MAX_WIDTH = 600;         // 最大幅600px（AI解析には十分）
  const MAX_FILE_SIZE = 100 * 1024; // 最大100KB（高速送信）

  // base64からBlobに変換（OCR用）
  const base64ToBlob = (base64: string): Blob => {
    const base64Data = base64.split(',')[1] || base64;
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    return new Blob([new Uint8Array(byteNumbers)], { type: 'image/jpeg' });
  };

  // base64からBlobサイズを計算
  const getBase64Size = (base64: string): number => {
    const base64WithoutPrefix = base64.split(',')[1] || base64;
    return Math.round((base64WithoutPrefix.length * 3) / 4);
  };

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // 幅を600pxに制限（アスペクト比維持）
        if (width > MAX_WIDTH) {
          height = Math.round(height * MAX_WIDTH / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // 白背景を設定（PNG透明部分対策）
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 画像を描画
        ctx.drawImage(img, 0, 0, width, height);
        
        // JPEG形式で出力（大幅にサイズ削減）
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.5);

        const finalSize = getBase64Size(compressedDataUrl);
        console.log(`🖼️ 画像圧縮完了: ${Math.round(finalSize / 1024)}KB (形式: JPEG, サイズ: ${width}x${height})`);
        resolve(compressedDataUrl);
      };
    });
  };

  // 画像をDriveにアップロードしてURLを取得
  const uploadImageToDrive = async (base64Image: string, userId: string): Promise<string> => {
    console.log('🔄 Driveアップロード開始:', userId);
    
    // Base64からBlobを作成
    const base64Data = base64Image.split(',')[1];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });
    console.log('📦 Blob作成完了:', blob.size, 'bytes');

    const formData = new FormData();
    formData.append('receipt', blob, `receipt_${Date.now()}.png`);
    formData.append('userId', userId);

    console.log('📤 /api/upload-receipt にリクエスト送信中...');
    const response = await fetch('http://localhost:3001/api/upload-receipt', {
      method: 'POST',
      body: formData,
    });

    console.log('📥 レスポンス:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ アップロード失敗:', errorText);
      throw new Error(`画像アップロードに失敗しました: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ アップロード成功:', result);
    return result.webViewLink || '';
  };

  const commitTransaction = async () => {
    if (!pendingExtraction) return;

    try {
      const { data, imageUrl } = pendingExtraction;
      const userId = authStatus?.userId || 'test-user';
      console.log('💾 保存開始: userId=', userId);

      // Determine type based on category
      const type = data.category === '売上' ? 'income' : 'expense';

      // 画像をDriveにアップロード（Base64ではなくURLを保存）
      let receiptUrl = '';
      if (imageUrl && imageUrl.startsWith('data:image')) {
        console.log('📸 画像をDriveにアップロード中...');
        try {
          receiptUrl = await uploadImageToDrive(imageUrl, userId);
          console.log('✅ 画像をDriveにアップロード:', receiptUrl);
        } catch (uploadError: any) {
          console.error('❌ 画像アップロードエラー:', uploadError.message);
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `⚠️ 画像アップロードに失敗しました: ${uploadError.message}`,
            timestamp: Date.now()
          }]);
        }
      }

      // Prepare data for API（URLのみを送信）
      const expenseData = {
        date: data.date || getTodayJSTString(),
        amount: Number(data.amount) || 0,
        category: data.category || '雑費',
        memo: data.description || '内容なし',
        receipt_url: receiptUrl, // URLのみ（Base64ではない）
        type: type,
        userId: authStatus?.userId || 'test-user',
        // 収入データの場合のみ支払者名と源泉徴収税額を追加
        ...(type === 'income' && {
          payerName: data.payerName || '',
          withholdingTax: Number(data.withholdingTax) || 0
        })
      };

      // ガード: dateに "/" が含まれていたらエラー
      if (expenseData.date.includes("/")) {
        throw new Error(`Invalid date format detected: ${expenseData.date}`);
      }

      // Save to Sheet via API
      console.log('📤 Sending expense data:', JSON.stringify(expenseData, null, 2));
      console.log('📅 Date format check:', expenseData.date, '(should be YYYY-MM-DD)');

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
      // Use server-returned ID (exp_5, inc_3 format) for consistency with getTransactions
      const newTx: Transaction = {
        id: result.id || crypto.randomUUID(),
        date: expenseData.date,
        amount: expenseData.amount,
        description: expenseData.memo,
        category: expenseData.category,
        type: type,
        receiptUrl: expenseData.receipt_url,
        createdAt: Date.now()
      };

      console.log('📋 新規取引のID:', newTx.id);

      // Update local state
      setTransactions(prev => [newTx, ...prev]);

      // Show success message
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `✅ 保存完了: ${newTx.description} (ID: ${newTx.id})`,
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
    if (isProcessing || isConvertingImage) {
      console.log('⚠️ 処理中のためスキップ: isProcessing=', isProcessing, 'isConvertingImage=', isConvertingImage);
      return;
    }
    if (!currentInput && !selectedImage && activePrefixes.length === 0) return;

    // アクティブなプレフィックスをメッセージに含める
    const prefixesText = activePrefixes.map(p => p.text).join(' ');
    const fullMessage = prefixesText ? `${prefixesText} ${currentInput}`.trim() : currentInput;

    setInputText('');
    setActivePrefixes([]); // 送信後にプレフィックスをクリア
    const currentImage = selectedImage;
    setSelectedImage(null);
    setIsProcessing(true);
    setPendingExtraction(null);

    // 15秒後に自動的にリセット（タイムアウト対策）
    const timeoutId = setTimeout(() => {
      console.log('⏰ AI応答タイムアウト、処理をリセットします');
      setIsProcessing(false);
    }, 15000);

    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'user',
      content: fullMessage || "画像を解析してください",
      image: currentImage || undefined,
      timestamp: Date.now()
    }]);

    try {
      // 画像がある場合はOCR処理を実行
      let textToProcess = currentInput;
      
      if (currentImage) {
        // Step 1: Vision API OCR
        console.log('📸 画像検出 - OCR処理開始');
        const imageBlob = base64ToBlob(currentImage);
        const ocrText = await performOCR(imageBlob);
        console.log('📄 OCR テキスト:', ocrText);
        
        // 入力テキストとOCR結果を結合
        textToProcess = `${currentInput}\n\n【OCR結果】\n${ocrText}`.trim();
        console.log('📝 統合入力テキスト:', textToProcess);
      }

      // Step 2: Gemini は成形だけ
      const response = await gemini.processInput(
        textToProcess,
        undefined, // 画像は渡さない（OCRテキストのみ）
        messages.slice(-4),
        rules
      );

      // デバッグ: Geminiレスポンスをコンソールに出力
      console.log('🤖 Gemini Response:', response);
      console.log('🤖 Actions:', response.actions);

      // AIレスポンスから手動で取引データを抽出（フォールバック）
      let extractedAction = null;

      if (response.actions && response.actions.length > 0) {
        // 正常な場合: actionsフィールドがある
        const action = response.actions.find(a => a.type === 'ADD_TRANSACTION' || a.type === 'CREATE_RULE');
        if (action && action.data) {
          console.log('✅ Action found in response:', action);
          extractedAction = action;
        }
      } else {
        // フォールバック: replyから手動で取引データを抽出
        console.log('⚠️ No actions in response, trying manual extraction from reply');

        const reply = response.reply || '';

        // 保存完了メッセージの場合 → 何もしない（既に保存されている）
        if (reply.includes('保存完了') || reply.includes('保存しました')) {
          console.log('ℹ️ Save confirmation detected - transaction already saved');
          // 既に保存されているので何もしない
          extractedAction = null;
        } else {
          // 通常の取引データ抽出
          const amountMatch = reply.match(/(\d{1,3}(?:,\d{3})*|\d+)円/);
          const categoryMatch = reply.match(/(売上|経費|支出|収入|食費|交通費|消耗品費|通信費|外注費|食事代|ソフトウェア・サブスク費|事務所家賃|地代家賃|光熱費|雑費)/);

          if (amountMatch && categoryMatch) {
            const amount = parseInt(amountMatch[1].replace(/,/g, ''));
            const category = categoryMatch[1];
            const description = reply.replace(/.*?(?:として|の)/, '').replace(/\d+円.*$/, '').trim();

            extractedAction = {
              type: 'ADD_TRANSACTION',
              data: {
                amount: amount,
                category: category,
                description: description || '内容なし'
              }
            };

            console.log('🔧 Manual extraction successful:', extractedAction);
          } else {
            console.log('❌ Manual extraction failed - no recognizable patterns found');
          }
        }
      }

      // Gemini AIのreplyは表示せず、確認ダイアログのみ表示
      // 保存完了メッセージはcommitTransaction/commitRuleで表示

      if (extractedAction) {
        // パターン1: 画像あり → Geminiが抽出した日付を使用
        // パターン2: 画像なし → 本日の日付を自動設定
        const todayDate = getTodayJSTString();
        const extractedDate = extractedAction.data.date;
        
        // 🔍 デバッグ
        console.log('🗓️ ========== 日付デバッグ ==========');
        console.log('🗓️ 画像あり:', !!currentImage);
        console.log('🗓️ Gemini抽出日付:', extractedDate);
        console.log('🗓️ 本日の日付:', todayDate);
        console.log('🗓️ 採用する日付:', currentImage && extractedDate ? extractedDate : todayDate);
        console.log('🗓️ ========== デバッグ完了 ==========');
        
        setPendingExtraction({
          type: extractedAction.type === 'ADD_TRANSACTION' ? 'transaction' : 'rule',
          data: {
            ...extractedAction.data,
            // 画像ありで Gemini が日付を返した場合はその日付を使用
            // それ以外は本日の日付を自動設定
            date: currentImage && extractedDate ? extractedDate : todayDate,
            // 収入データの場合にpayerNameとwithholdingTaxが含まれていない場合はデフォルト値を設定
            ...(extractedAction.data.type === 'income' && {
              payerName: extractedAction.data.payerName || '',
              withholdingTax: extractedAction.data.withholdingTax || 0
            })
          },
          imageUrl: currentImage || undefined
        });
      } else {
        // アクションが抽出できなかった場合はreplyを表示
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response.reply,
          timestamp: Date.now()
        }]);
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
  if (prefix === 'ルール：') {
    setShowRuleInputCard(true);
    setActivePrefixes([{ id: crypto.randomUUID(), text: prefix }]);
  } else {
    // 既存の処理（変更なし）
    const newPrefix: ActivePrefix = {
      id: crypto.randomUUID(),
      text: prefix
    };
    setActivePrefixes([newPrefix]);
    textareaRef.current?.focus();
  }
};

// Rule input submit handler
const handleRuleInputSubmit = async () => {
  // バリデーション
  if (!ruleInputData.keyword.trim()) {
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '❌ キーワードを入力してください',
      timestamp: Date.now()
    }]);
    return;
  }

  try {
    // 既存の/api/expensesと同じパターンでAPI呼び出し
    const response = await fetch('http://localhost:3001/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword: ruleInputData.keyword.trim(),
        category: ruleInputData.category,
        notes: ruleInputData.notes.trim(),
        userId: authStatus?.userId || 'test-user'
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.details || result.error || '保存に失敗しました');
    }

    // 成功処理
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `✅ ルール追加: 「${ruleInputData.keyword}」→「${ruleInputData.category}」`,
      timestamp: Date.now()
    }]);

    setShowRuleInputCard(false);
    setRuleInputData({ keyword: '', category: CATEGORIES[0], notes: '' });

    // ローカル状態も更新
    setRules(prev => [...prev, {
      id: result.id,
      keyword: ruleInputData.keyword,
      category: ruleInputData.category
    }]);

  } catch (error: any) {
    console.error('Rule save error:', error);
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `❌ 保存に失敗しました: ${error.message}`,
      timestamp: Date.now()
    }]);
  }
};

  const removePrefix = (id: string) => {
    setActivePrefixes(prev => prev.filter(p => p.id !== id));
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
      authService.clearIdToken(); // Clear the ID token on logout
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

  const handleYearSelect = (year: number) => {
    setSelectedTaxYear(year);
    setIsYearSelectionModalOpen(false);
    setActiveTab('tax');
  };

  const handleAuditYearSelect = (year: number) => {
    setSelectedAuditYear(year);
    setIsAuditYearSelectionModalOpen(false);
    setActiveTab('dashboard');
  };

  const getAvailableYears = (): number[] => {
    const currentYear = getCurrentYearJST();
    return [currentYear - 1, currentYear, currentYear + 1];
  };

  const getFilteredTransactions = () => {
    if (!selectedTaxYear) return transactions;
    return transactions.filter(t => {
      const transactionYear = new Date(t.date).getFullYear();
      return transactionYear === selectedTaxYear;
    });
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden relative">
      {/* Authentication Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <h2 className="text-xl font-bold mb-4">🔐 Google Sheets 連携が必要です</h2>
            <p className="text-gray-600 mb-6">
              アプリを使用するには Google アカウントでの認証が必須です。
            </p>
            <button
              onClick={() => window.location.href = 'http://localhost:3001/auth/google'}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition"
            >
              Google で連携する
            </button>
          </div>
        </div>
      )}
      <header className="bg-slate-900 text-white shadow-md flex items-center justify-between z-30">
        <div className="w-full lg:max-w-5xl lg:mx-auto lg:px-6 px-4 py-4">
          <div className="flex items-center justify-between">
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
          </div>
        </div>
      </header>

      {/* min-h-0 を追加してグラフ描画時のサイズ計算を安定化 */}
      <main className={`flex-1 overflow-y-auto bg-slate-50 relative min-h-0 ${showAuthModal ? 'pointer-events-none opacity-50' : ''}`}>
        {/* Responsive container - full width on mobile, more contained on desktop */}
        <div className="w-full lg:max-w-5xl lg:mx-auto lg:px-6">
          {activeTab === 'chat' ? (
          <div className="p-4 space-y-4 pb-48 lg:p-6 xl:p-8">
            {/* First Time Guide Banner */}
            {showFirstTimeGuide && (
              <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 shadow-lg animate-in slide-in-from-top-4 duration-500">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">まず、やりたいことを選んでください</h3>
                      <p className="text-sm text-gray-600">何をしたいですか？</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowFirstTimeGuide(false);
                      localStorage.setItem('hasSeenFirstTimeGuide', 'true');
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 transition"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      handleQuickAction('経費：');
                      setShowFirstTimeGuide(false);
                      localStorage.setItem('hasSeenFirstTimeGuide', 'true');
                    }}
                    className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition"
                  >
                    <BanknotesIcon className="w-5 h-5 text-green-600" />
                    <div className="text-left">
                      <p className="font-bold text-green-800 text-sm">経費を登録</p>
                      <p className="text-xs text-green-600">レシート撮影</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      handleQuickAction('売上：');
                      setShowFirstTimeGuide(false);
                      localStorage.setItem('hasSeenFirstTimeGuide', 'true');
                    }}
                    className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition"
                  >
                    <SparklesIcon className="w-5 h-5 text-blue-600" />
                    <div className="text-left">
                      <p className="font-bold text-blue-800 text-sm">売上を登録</p>
                      <p className="text-xs text-blue-600">収入記録</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      handleQuickAction('ルール：');
                      setShowFirstTimeGuide(false);
                      localStorage.setItem('hasSeenFirstTimeGuide', 'true');
                    }}
                    className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-xl hover:bg-purple-100 transition"
                  >
                    <TagIcon className="w-5 h-5 text-purple-600" />
                    <div className="text-left">
                      <p className="font-bold text-purple-800 text-sm">ルール設定</p>
                      <p className="text-xs text-purple-600">自動分類</p>
                    </div>
                  </button>

                </div>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${m.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'}`}>
                  {m.image && <img src={m.image} className="w-full h-48 object-cover rounded-lg mb-2 border border-black/10 shadow-inner" alt="添付" />}
                  <p className="whitespace-pre-wrap leading-relaxed text-sm font-medium">{m.content}</p>
                </div>
              </div>
            ))}

            {(isProcessing || isConvertingImage) && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 p-4 rounded-2xl flex items-center gap-3 text-slate-900 shadow-sm border-l-4 border-l-slate-900 animate-pulse">
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  <span className="text-xs font-bold tracking-widest uppercase">
                    {isConvertingImage ? 'Optimizing Image...' : 'Analyzing Data...'}
                  </span>
                </div>
              </div>
            )}

            {/* Rule input card - displayed when showRuleInputCard is true */}
            {showRuleInputCard && (
              <div className="flex justify-start animate-in slide-in-from-bottom-8 duration-500">
                <div className="w-full max-w-[95%] bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-2xl ring-4 ring-slate-50/50">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
                    <div className="flex items-center gap-2 text-slate-700 font-bold">
                      <TagIcon className="w-6 h-6" />
                      <span className="text-sm font-bold">ルール設定</span>
                    </div>
                    <button onClick={() => setShowRuleInputCard(false)} className="p-1 text-gray-300 hover:text-rose-400 transition">
                      <XMarkIcon className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* キーワード入力 */}
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">
                        キーワード（必須）
                      </label>
                      <input
                        type="text"
                        value={ruleInputData.keyword}
                        onChange={(e) => setRuleInputData(prev => ({ ...prev, keyword: e.target.value }))}
                        className="w-full p-3 border-2 border-slate-100 rounded-xl focus:border-slate-300 focus:outline-none"
                        placeholder="例: Amazon, Slack"
                      />
                    </div>

                    {/* カテゴリ選択 */}
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">
                        勘定科目（必須）
                      </label>
                      <select
                        value={ruleInputData.category}
                        onChange={(e) => setRuleInputData(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full p-3 border-2 border-slate-100 rounded-xl focus:border-slate-300 focus:outline-none"
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    {/* メモ入力 */}
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">
                        メモ（任意）
                      </label>
                      <textarea
                        value={ruleInputData.notes}
                        onChange={(e) => setRuleInputData(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full p-3 border-2 border-slate-100 rounded-xl focus:border-slate-300 focus:outline-none"
                        rows={2}
                        placeholder="例: オンラインショッピング"
                      />
                    </div>
                  </div>

                  {/* 送信ボタン */}
                  <button
                    onClick={handleRuleInputSubmit}
                    className="w-full mt-4 bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-xl hover:bg-slate-900 active:scale-95 transition"
                  >
                    ルールを追加
                  </button>
                </div>
              </div>
            )}

            {pendingExtraction && (
              <div className="flex justify-start animate-in slide-in-from-bottom-8 duration-500">
                <div className="w-full max-w-[95%] bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-2xl ring-4 ring-slate-50/50">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
                    <div className="flex items-center gap-2 text-slate-700 font-bold">
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
                          <div>
                            <label className="text-[10px] text-gray-400 font-bold mb-1 block">日付</label>
                            <input
                              type="date"
                              value={pendingExtraction.data.date || getTodayJSTString()}
                              onChange={(e) => setPendingExtraction({...pendingExtraction, data: {...pendingExtraction.data, date: e.target.value}})}
                              className="w-full p-2 rounded-lg border border-slate-200 text-sm font-bold outline-none"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] text-gray-400 font-bold mb-1 block">金額</label>
                              <input type="number" value={pendingExtraction.data.amount} onChange={(e) => setPendingExtraction({...pendingExtraction, data: {...pendingExtraction.data, amount: e.target.value}})} className="w-full p-2 rounded-lg border border-slate-200 text-sm font-bold outline-none" />
                            </div>
                            {/* 収入データの場合は種別を表示せず、支出データの場合のみ科目を表示 */}
                            {pendingExtraction.data.type !== 'income' && (
                              <div>
                                <label className="text-[10px] text-gray-400 font-bold mb-1 block">科目</label>
                                <select value={pendingExtraction.data.category} onChange={(e) => setPendingExtraction({...pendingExtraction, data: {...pendingExtraction.data, category: e.target.value}})} className="w-full p-2 rounded-lg border border-slate-200 text-sm font-bold outline-none">
                                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 font-bold mb-1 block">内容</label>
                            <input type="text" value={pendingExtraction.data.description} onChange={(e) => setPendingExtraction({...pendingExtraction, data: {...pendingExtraction.data, description: e.target.value}})} className="w-full p-2 rounded-lg border border-slate-200 text-sm font-bold outline-none" />
                          </div>
                          {/* 収入データの場合のみ支払者名と源泉徴収税額を編集可能 */}
                          {pendingExtraction.data.type === 'income' && (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] text-green-400 font-bold mb-1 block">支払者名</label>
                                <input type="text" value={pendingExtraction.data.payerName || ''} onChange={(e) => setPendingExtraction({...pendingExtraction, data: {...pendingExtraction.data, payerName: e.target.value}})} className="w-full p-2 rounded-lg border border-green-200 text-sm font-bold outline-none" placeholder="支払者名を入力" />
                              </div>
                              <div>
                                <label className="text-[10px] text-green-400 font-bold mb-1 block">源泉徴収税額</label>
                                <input type="number" value={pendingExtraction.data.withholdingTax || 0} onChange={(e) => setPendingExtraction({...pendingExtraction, data: {...pendingExtraction.data, withholdingTax: parseFloat(e.target.value) || 0}})} className="w-full p-2 rounded-lg border border-green-200 text-sm font-bold outline-none" placeholder="0" />
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <label className="text-[10px] text-gray-400 font-bold mb-1 block">キーワード</label>
                            <input type="text" value={pendingExtraction.data.keyword} onChange={(e) => setPendingExtraction({...pendingExtraction, data: {...pendingExtraction.data, keyword: e.target.value}})} className="w-full p-2 rounded-lg border border-slate-200 text-sm font-bold outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 font-bold mb-1 block">分類科目</label>
                            <select value={pendingExtraction.data.category} onChange={(e) => setPendingExtraction({...pendingExtraction, data: {...pendingExtraction.data, category: e.target.value}})} className="w-full p-2 rounded-lg border border-slate-200 text-sm font-bold outline-none">
                              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                        </div>
                      )}
                      <button onClick={() => setIsEditing(false)} className="w-full py-2 bg-slate-900 text-white rounded-xl font-bold text-xs">編集完了</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      {pendingExtraction.type === 'transaction' ? (
                        <>
                          <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-50">
                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">日付</p>
                            <p className="text-lg font-black text-slate-700">
                              {(() => {
                                const displayDate = pendingExtraction.data.date || getTodayJSTString();
                                console.log('🗓️ UI表示日付:', displayDate);
                                return displayDate;
                              })()}
                            </p>
                          </div>
                          <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-50">
                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">金額</p>
                            <p className="text-2xl font-black text-slate-700">¥{Number(pendingExtraction.data.amount || 0).toLocaleString()}</p>
                          </div>
                          {/* 収入データの場合は種別を表示せず、支出データの場合のみ勘定科目を表示 */}
                          {pendingExtraction.data.type !== 'income' && (
                            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-50">
                              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">勘定科目</p>
                              <p className="text-sm font-bold text-gray-800">{pendingExtraction.data.category || '未設定'}</p>
                            </div>
                          )}
                          <div className="col-span-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">内容</p>
                            <p className="text-sm font-bold text-gray-700">{pendingExtraction.data.description || '内容なし'}</p>
                          </div>
                          {/* 収入データの場合のみ支払者名と源泉徴収税額を表示 */}
                          {pendingExtraction.data.type === 'income' && (
                            <>
                              <div className="bg-green-50/50 p-4 rounded-2xl border border-green-50">
                                <p className="text-[10px] text-green-400 font-bold uppercase mb-1">支払者名</p>
                                <p className="text-sm font-bold text-gray-800">{pendingExtraction.data.payerName || '未設定'}</p>
                              </div>
                              <div className="bg-green-50/50 p-4 rounded-2xl border border-green-50">
                                <p className="text-[10px] text-green-400 font-bold uppercase mb-1">源泉徴収税額</p>
                                <p className="text-lg font-black text-green-700">¥{Number(pendingExtraction.data.withholdingTax || 0).toLocaleString()}</p>
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <div className="col-span-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <p className="text-sm font-bold text-gray-800 leading-relaxed">
                            「<span className="text-slate-900 font-black">{pendingExtraction.data.keyword}</span>」のときは
                            「<span className="text-slate-900 font-black">{pendingExtraction.data.category}</span>」に自動分類します。
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={pendingExtraction.type === 'transaction' ? commitTransaction : commitRule}
                      className="flex-[2] bg-slate-900 text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-slate-200 hover:bg-slate-900 active:scale-95 transition flex items-center justify-center gap-2"
                    >
                      <CheckCircleIcon className="w-6 h-6" />
                      この内容で保存
                    </button>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex-1 bg-white text-slate-900 py-4 rounded-2xl font-bold text-sm border-2 border-slate-100 hover:bg-slate-50 active:scale-95 transition flex items-center justify-center gap-1"
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
          <Dashboard
            transactions={transactions}
            onAuditQuery={setAuditQuery}
            onTabChange={setActiveTab}
            selectedAuditYear={selectedAuditYear}
            onAuditYearSelect={handleAuditYearSelect}
            availableYears={getAvailableYears()}
            onOpenYearModal={() => {
              setSelectedAuditYear(null);
              setIsAuditYearSelectionModalOpen(true);
            }}
          />
        ) : activeTab === 'tax' ? (() => {
          const filteredTransactions = getFilteredTransactions();
          return (
            <div>
              <div  className="space-y-8 p-4">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-800">📅 選択された年度</h3>
                  <button
                    onClick={() => setIsYearSelectionModalOpen(true)}
                    className="px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition"
                  >
                    年度変更
                  </button>
                </div>
                <p className="text-sm text-slate-700">
                  {selectedTaxYear}年度（{selectedTaxYear}年1月1日〜{selectedTaxYear}年12月31日）の取引データを集計しています。
                </p>
              </div>
              </div>
              <BetsuhyoA data={{
                売上: filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
                経費合計: filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
                所得金額: filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) - filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
                地代家賃: filteredTransactions.filter(t => t.category === '地代家賃').reduce((sum, t) => sum + t.amount, 0),
                給与賃金: filteredTransactions.filter(t => t.category === '給与賃金').reduce((sum, t) => sum + t.amount, 0),
                消耗品費: filteredTransactions.filter(t => t.category === '消耗品費').reduce((sum, t) => sum + t.amount, 0),
                通信費: filteredTransactions.filter(t => t.category === '通信費').reduce((sum, t) => sum + t.amount, 0),
                旅費交通費: filteredTransactions.filter(t => t.category === '旅費交通費').reduce((sum, t) => sum + t.amount, 0),
                // 第二表 所得の内訳データ生成（支払者名ごとに集計）
                所得の内訳: (() => {
                  const incomeTransactions = filteredTransactions.filter(t => t.type === 'income');

                  // income取得直後に一回だけログ出力（デバッグ用）
                  if (incomeTransactions.length > 0) {
                    console.log("🔎 income sample:", incomeTransactions.slice(0, 3));
                  }

                  const groupedByPayer = incomeTransactions.reduce((acc, t) => {
                    // 支払人キーを payerName に完全統一
                    const payer = t.payerName && t.payerName.trim()
                      ? t.payerName.trim()
                      : '未設定';

                    if (!acc[payer]) {
                      acc[payer] = {
                        種目: '営業等',
                        収入金額: 0,
                        源泉徴収税額: 0
                      };
                    }
                    acc[payer].収入金額 += t.amount;
                    acc[payer].源泉徴収税額 += t.withholdingTax || 0;
                    return acc;
                  }, {} as Record<string, { 種目: string; 収入金額: number; 源泉徴収税額: number }>);

                  console.log("📊 所得の内訳集計結果:", groupedByPayer);
                  return groupedByPayer;
                })()
              }} />
            </div>
          );
        })() : (
          <TransactionList
            transactions={transactions}
            onRemove={(id) => setTransactions(p => p.filter(t => t.id !== id))}
            onUpdate={(u) => setTransactions(p => p.map(t => t.id === u.id ? u : t))}
          />
        )}
        </div>
      </main>

      {activeTab === 'chat' && (
        <div className="bg-white border-t border-gray-100 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-40">
          <div className="w-full lg:max-w-5xl lg:mx-auto lg:px-6 px-4">
            <div className="pt-3 flex gap-2 overflow-x-auto no-scrollbar">
              {QUICK_ACTIONS.map((action, i) => (
                <button key={i} onClick={() => handleQuickAction(action.prefix)} className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-slate-900 text-[11px] font-bold shadow-sm hover:bg-slate-50 transition active:scale-95">
                  <action.icon className="w-3.5 h-3.5" /> {action.label}
                </button>
              ))}
            </div>
            <div className="p-4">
              {/* モード表示 */}
              {activePrefixes.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 text-sm text-slate-700 font-bold">
                    <div className="w-2 h-2 bg-slate-900 rounded-full"></div>
                    <span>
                      {activePrefixes[0].text === '経費：' && '📒 経費入力モード：レシート撮影または取引内容を教えてください'}
                      {activePrefixes[0].text === '売上：' && '💰 売上入力モード：収入内容を教えてください'}
                      {activePrefixes[0].text === 'ルール：' && '🏷️ ルール設定モード：自動分類ルールを作成します'}
                    </span>
                  </div>
                </div>
              )}

              {selectedImage && (
                <div className="mb-3 relative inline-block animate-in zoom-in-50 duration-200">
                  <img src={selectedImage} className="w-20 h-20 object-cover rounded-xl border-2 border-slate-200 shadow-md" alt="添付" />
                  <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1.5 shadow-lg active:scale-90 transition">
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex items-end gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing || activePrefixes.length === 0 || !['経費：', '売上：'].includes(activePrefixes[0]?.text)}
                  className="p-3.5 bg-slate-100 text-gray-600 rounded-2xl hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition active:scale-95"
                >
                  <CameraIcon className="w-6 h-6" />
                  <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleImageUpload} />
                </button>
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={activePrefixes.length === 0 ? "👆上から操作を選んでください（経費／売上／ルール）" : "メッセージ..."}
                  className="flex-1 bg-slate-100 rounded-2xl border-none focus:ring-2 focus:ring-slate-300 resize-none max-h-32 text-sm p-3.5 placeholder:text-slate-700 placeholder:font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  rows={1}
                  disabled={activePrefixes.length === 0}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { if (e.nativeEvent.isComposing) return; e.preventDefault(); handleSendMessage(); } }}
                />
                <button onClick={handleSendMessage} disabled={isProcessing || (!inputText.trim() && !selectedImage) || activePrefixes.length === 0} className="p-3.5 bg-slate-900 text-white rounded-2xl shadow-lg hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed active:scale-90 transition">
                  <PaperAirplaneIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="bg-white border-t border-gray-100 pb-6 sm:pb-2 z-30">
        <div className="w-full lg:max-w-5xl lg:mx-auto lg:px-6 px-4">
          <div className="flex justify-around items-center py-2">
            <button onClick={() => setActiveTab('chat')} className={`flex flex-col items-center gap-1 transition ${activeTab === 'chat' ? 'text-slate-900 scale-110' : 'text-gray-400'}`}>
              <ChatBubbleLeftRightIcon className="w-6 h-6" /> <span className="text-[10px] font-bold">チャット</span>
            </button>
            <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 transition ${activeTab === 'history' ? 'text-slate-900 scale-110' : 'text-gray-400'}`}>
              <ListBulletIcon className="w-6 h-6" /> <span className="text-[10px] font-bold">履歴</span>
            </button>
            <button onClick={() => {
              if (selectedTaxYear) {
                setActiveTab('tax');
              } else {
                setIsYearSelectionModalOpen(true);
              }
            }} className={`flex flex-col items-center gap-1 transition ${activeTab === 'tax' ? 'text-slate-900 scale-110' : 'text-gray-400'}`}>
              <ReceiptPercentIcon className="w-6 h-6" /> <span className="text-[10px] font-bold">確定申告</span>
            </button>
            <button onClick={() => {
              if (selectedAuditYear === null) {
                setIsAuditYearSelectionModalOpen(true);
              } else {
                setActiveTab('dashboard');
              }
            }} className={`flex flex-col items-center gap-1 transition ${activeTab === 'dashboard' ? 'text-slate-900 scale-110' : 'text-gray-400'}`}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg> <span className="text-[10px] font-bold">監査予報</span>
            </button>
          </div>
        </div>
      </nav>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        rules={rules}
        onDeleteRule={(id) => setRules(p => p.filter(r => r.id !== id))}
        onClearHistory={() => setMessages([{ id: 'welcome', role: 'assistant', content: '履歴をクリアしました。', timestamp: Date.now() }])}
        onInitializeSystem={handleInitializeSystem}
        authStatus={authStatus}
      />

      <YearSelectionModal
        isOpen={isYearSelectionModalOpen}
        onClose={() => setIsYearSelectionModalOpen(false)}
        onSelectYear={handleYearSelect}
        availableYears={getAvailableYears()}
      />

      <YearSelectionModal
        isOpen={isAuditYearSelectionModalOpen}
        onClose={() => setIsAuditYearSelectionModalOpen(false)}
        onSelectYear={(year) => {
          handleAuditYearSelect(year);
          setIsAuditYearSelectionModalOpen(false);
        }}
        availableYears={getAvailableYears()}
        type="audit"
      />



      {/* Folder Conflict Modal */}
      {folderConflict && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[80vh] shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col">
            <div className="flex-shrink-0 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">フォルダ名の重複を検出</h2>
                  <p className="text-sm text-gray-500">複数の同名フォルダが見つかりました</p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <p className="text-amber-800 text-sm font-medium">
                  {folderConflict.message}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6">
              <div className="mb-6">
                <p className="text-sm font-bold text-gray-700 mb-3">検出されたフォルダ一覧：</p>
                <div className="space-y-3">
                  {folderConflict.duplicateFolders.map((folder, index) => (
                    <div key={folder.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-700 font-bold text-sm flex-shrink-0">
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-800 truncate">{folder.name}</p>
                            <p className="text-xs text-gray-500 font-mono truncate">ID: {folder.id}</p>
                            <p className="text-xs text-gray-400">作成日: {folder.createdTime ? new Date(folder.createdTime).toLocaleString('ja-JP') : '不明'}</p>
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              await fetch('http://localhost:3001/api/select-folder', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId: authStatus?.userId || 'test-user', folderId: folder.id })
                              });
                              console.log(`📁 フォルダ ${folder.id} を選択しました`);

                              // Clear server cache
                              await fetch('http://localhost:3001/api/clear-folder-cache', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId: authStatus?.userId || 'test-user' })
                              });

                              // Close modal
                              setFolderConflict(null);

                              // Reload transactions directly
                              loadTransactions();
                            } catch (e) {
                              console.error('フォルダ選択エラー:', e);
                            }
                          }}
                          className="flex-shrink-0 px-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-900 active:scale-95 transition"
                        >
                          このフォルダを使用
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <p className="text-blue-800 text-sm">
                  <span className="font-bold">解決方法：</span>
                  <br />
                  Google Drive で「いらない方」のフォルダ名を変更してください。
                  <br />
                  例：「Gemini Expense Tracker_old」など
                  <br />
                  名前を変更すると、次回アプリを起動した際にこの警告は表示されなくなります。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
