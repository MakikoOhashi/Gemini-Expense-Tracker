
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT, SYSTEM_PROMPT_WITH_IMAGE, SYSTEM_PROMPT_WITHOUT_IMAGE, SYSTEM_PROMPT_EN, SYSTEM_PROMPT_WITH_IMAGE_EN, SYSTEM_PROMPT_WITHOUT_IMAGE_EN } from "../constants";
import { AIResponse, ChatMessage, TransactionRule } from "../types.ts";
import { sheetsService } from "./sheetsService.ts";

export class GeminiService {
  async processInput(
    text: string,
    image?: string,
    history: ChatMessage[] = [],
    rules: TransactionRule[] = [],
    language: 'ja' | 'en' = 'ja'
  ): Promise<AIResponse> {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("APIキーが設定されていません。環境変数を確認してください。");
    }

    const ai = new GoogleGenAI({ apiKey });
    const modelName = 'gemini-2.5-flash-lite';

    // Get current year for rules
    const currentYear = new Date().getFullYear();

    // Get rules from Google Sheets
    let spreadsheetRules = [];
    try {
      const rulesResponse = await sheetsService.getRules(currentYear);
      spreadsheetRules = rulesResponse;
    } catch (error) {
      console.warn('Failed to fetch rules from Google Sheets:', error);
      // Continue without rules if fetching fails
    }

    // 履歴の構築
    const chatHistory = history
      .filter(h => h.id !== 'welcome')
      .slice(-4)
      .map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }]
      }));

    const currentParts: any[] = [];
    if (image) {
      const base64Data = image.includes(',') ? image.split(',')[1] : image;
      currentParts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data
        }
      });
    }
    currentParts.push({ text: text || "解析してください" });

    // Combine local rules and spreadsheet rules
    const allRules = [...rules, ...spreadsheetRules];
    const ruleString = allRules.length > 0
      ? allRules.map(r => `"${r.keyword}" → 勘定科目: ${r.category} (信頼度: ${r.confidence || 80}%)`).join('\n')
      : "なし";

    // 画像の有無によってプロンプトを選択
    const basePrompt = image
      ? (language === 'en' ? SYSTEM_PROMPT_WITH_IMAGE_EN : SYSTEM_PROMPT_WITH_IMAGE)
      : (language === 'en' ? SYSTEM_PROMPT_WITHOUT_IMAGE_EN : SYSTEM_PROMPT_WITHOUT_IMAGE);
    const systemInstruction = basePrompt.replace('{{RULES}}', ruleString) + (language === 'en'
      ? "\nReturn a single pure JSON object only."
      : "\n必ず純粋なJSONオブジェクト一つのみを返してください。");
    
    console.log(`📝 使用するプロンプト: ${image ? '画像あり（日付抽出あり）' : '画像なし（日付なし）'}`);

    try {
      // 15秒のタイムアウトを設定
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("AI応答タイムアウト（15秒経過）。もう一度送信してみてください。")), 15000)
      );

      const generatePromise = ai.models.generateContent({
        model: modelName,
        contents: [...chatHistory, { role: 'user', parts: currentParts }],
        config: {
          systemInstruction,
          temperature: 0.1, // 精度向上のため低めに設定
          // responseMimeTypeを使わずにテキストとして受け取り、手動パースすることでハングを回避
        },
      });

      const response: any = await Promise.race([generatePromise, timeoutPromise]);
      const responseText = response.text;

      if (!responseText) {
        throw new Error("AIから空の応答が返されました。");
      }

      // 頑丈なJSON抽出ロジック
      const jsonStart = responseText.indexOf('{');
      const jsonEnd = responseText.lastIndexOf('}');
      
      if (jsonStart === -1 || jsonEnd === -1) {
        // JSONが含まれない場合はテキストとして応答を作成
        return {
          reply: responseText,
          actions: []
        };
      }

      const jsonStr = responseText.substring(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(jsonStr);

      return {
        reply: parsed.reply || "内容を抽出しました。",
        actions: Array.isArray(parsed.actions) ? parsed.actions : []
      };

    } catch (error: any) {
      console.error("Gemini API Error Detail:", error);
      let errorMessage = error.message || "不明なエラーが発生しました。";
      
      if (errorMessage.includes("fetch")) errorMessage = "ネットワークエラー。接続を確認してください。";
      if (errorMessage.includes("429")) errorMessage = "リクエスト上限に達しました。1分ほど待ってから再試行してください。";
      if (errorMessage.includes("403")) errorMessage = "APIキーの権限エラー、またはモデルが未有効です。";
      
      throw new Error(errorMessage);
    }
  }
}
