import React, { useState, useRef, useEffect } from 'react';
import { XMarkIcon, PaperAirplaneIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { AuditChatContext } from '../types';
import { auditService } from '../services/auditService';

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

    try {
      // 監査予報分析を実行
      const auditResponse = await auditService.analyzeAuditForecast([{
        category: context.accountName,
        amount: context.amount,
        description: context.comment,
        date: new Date().toISOString().split('T')[0]
      }]);

      const assistantMessage = {
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        content: auditResponse.reply,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Audit analysis error:', error);
      const errorMessage = {
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        content: `申し訳ありません。監査予報の分析中にエラーが発生しました：${error.message}`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
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
