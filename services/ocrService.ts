import Tesseract from 'tesseract.js';

export class OCRService {
  async performOCR(imageDataUrl: string): Promise<string> {
    console.log('🔍 OCR処理開始...');

    try {
      const result = await Tesseract.recognize(
        imageDataUrl,
        'jpn', // 日本語に明示指定
        {
          logger: (m) => console.log('📊 OCR進行度:', Math.round(m.progress * 100) + '%')
        }
      );

      const text = result.data.text.trim();
      console.log('📄 OCR結果:', text);
      return text;
    } catch (error: any) {
      console.error('❌ OCRエラー:', error);
      throw new Error(`OCR処理に失敗しました: ${error.message}`);
    }
  }
}

export const ocrService = new OCRService();
