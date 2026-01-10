// Call server-side Vision API for OCR
export async function performOCR(imageData: string): Promise<string> {
  try {
    console.log('🔍 Vision API OCR処理開始...');

    const response = await fetch('http://localhost:3001/api/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: imageData }),
    });

    if (!response.ok) {
      throw new Error('OCR API error');
    }

    const result = await response.json();
    console.log('📄 OCR結果:', result.text);
    return result.text;
  } catch (error) {
    console.error('❌ OCR エラー:', error);
    throw error;
  }
}
