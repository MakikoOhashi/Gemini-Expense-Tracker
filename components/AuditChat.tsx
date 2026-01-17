import React, { useState, useRef, useEffect } from 'react';
import { XMarkIcon, PaperAirplaneIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { AuditChatContext } from '../types';

interface AuditChatProps {
  context: AuditChatContext;
  onClose: () => void;
}

const AuditChat: React.FC<AuditChatProps> = ({ context, onClose }) => {
  const [messages, setMessages] = useState<Array<{id: string, role: 'user' | 'assistant', content: string, timestamp: number}>>([
    {
      id: 'initial',
      role: 'assistant',
      content: 'この項目について、想定される税務上の確認点と、ユーザーが準備すべき説明を教えてください。',
      timestamp: Date.now()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ダミーの回答生成
  const generateDummyResponse = (userQuestion: string, context: AuditChatContext): string => {
    const templates = {
      '外注費': [
        '外注費の場合、税務署は業務委託契約書の存在と業務内容の妥当性を確認します。準備すべきものは：\n\n1. 業務委託契約書（契約金額・期間・業務内容）\n2. 請求書・領収書\n3. 作業成果物の確認書類\n4. 支払い記録\n\nこれらを整理して保管しておきましょう。',
        '外注費の税務上のポイントは「事業に必要な支出かどうか」です。クラウドサービスのような場合は、事業での利用実績を示す資料を準備してください。'
      ],
      '会議費': [
        '会議費の場合、参加者名簿と会議の目的・内容が重要です。準備すべきものは：\n\n1. 会議参加者名簿\n2. 会議議事録\n3. 領収書\n4. 会議資料\n\n参加者が社外者の場合は、会議の必要性を説明できる資料も必要です。',
        '会議費の税務調査では「実在の会議だったか」「参加者は誰か」が確認されます。議事録と参加者署名のある資料を準備しましょう。'
      ],
      '消耗品費': [
        '消耗品費の場合、事業用であることの立証が重要です。準備すべきものは：\n\n1. 購入時の領収書\n2. 使用目的の記録\n3. 在庫管理表（該当する場合）\n\n高額の場合は使用実績を示す資料も有効です。',
        '消耗品費の税務ポイントは「事業用の使用割合」です。購入品が事業で使用されたことを示す記録を残しておきましょう。'
      ],
      'default': [
        `${context.accountName}に関する税務上の確認点として、支出の「必要性」と「適正性」が問われます。\n\n準備すべき基本資料：\n1. 領収書・請求書\n2. 契約書（該当する場合）\n3. 使用目的の記録\n4. 支払い記録\n\nこれらを整理して税務調査に備えましょう。`,
        `この${context.accountName}について、税務署は「事業に必要な正当な支出かどうか」を確認します。支出の目的と金額の妥当性を説明できる資料を準備してください。`
      ]
    };

    const categoryTemplates = templates[context.accountName as keyof typeof templates] || templates.default;
    return categoryTemplates[Math.floor(Math.random() * categoryTemplates.length)];
  };

  const handleSendMessage = async () => {
    const currentInput = inputText.trim();
    if (!currentInput || isProcessing) return;

    setInputText('');
    setIsProcessing(true);

    // ユーザーメッセージを追加
    const userMessage = {
      id: crypto.randomUUID(),
      role: 'user' as const,
      content: currentInput,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);

    // ダミーレスポンスを生成（1-2秒の遅延をシミュレート）
    setTimeout(() => {
      const response = generateDummyResponse(currentInput, context);
      const assistantMessage = {
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        content: response,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsProcessing(false);
    }, 1000 + Math.random() * 1000); // 1-2秒のランダム遅延
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col animate-in zoom-in-95 duration-300">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-lg font-bold text-gray-800">監査相談チャット</h2>
              <p className="text-sm text-gray-600">
                {context.accountName} ¥{context.amount.toLocaleString()} - {context.comment}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* チャットエリア */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl p-3 shadow-sm ${
                message.role === 'user'
                  ? 'bg-slate-900 text-white rounded-tr-none'
                  : 'bg-gray-100 text-gray-800 rounded-tl-none'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-gray-100 border border-gray-200 p-3 rounded-2xl flex items-center gap-2 text-slate-600 shadow-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                </div>
                <span className="text-xs font-medium">回答を準備中...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 入力エリア */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-end gap-2">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="質問を入力してください..."
              className="flex-1 bg-gray-100 rounded-2xl border-none focus:ring-2 focus:ring-slate-300 resize-none max-h-20 text-sm p-3 placeholder:text-gray-400 font-medium"
              rows={1}
              disabled={isProcessing}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isProcessing}
              className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditChat;
