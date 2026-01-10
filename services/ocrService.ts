import Tesseract from 'tesseract.js';

export async function performOCR(imageData: string): Promise<string> {
  try {
    const result = await Tesseract.recognize(
      imageData,
      'jpn', // 日本語のみ
      {
        logger: (m) => console.log(`📊 OCR進行度: ${Math.round(m.progress * 100)}%`)
      }
    );
    
    console.log('📄 OCR結果:', result.data.text);
    return result.data.text;
  } catch (error: any) {
    console.error('❌ OCR エラー:', error);
    throw new Error(`OCR処理に失敗しました: ${error.message}`);
  }
}
