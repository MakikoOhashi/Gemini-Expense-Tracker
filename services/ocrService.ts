// Call server-side Vision API for OCR (multipart file upload)
export async function performOCR(imageBlob: Blob): Promise<string> {
  try {
    console.log('🔍 Vision API OCR処理開始...', imageBlob.size, 'bytes');

    const formData = new FormData();
    formData.append('file', imageBlob, 'receipt.jpg');

    const response = await fetch('http://localhost:3001/api/ocr', {
      method: 'POST',
      body: formData,
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
