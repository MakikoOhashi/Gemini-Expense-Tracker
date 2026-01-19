import { db } from './lib/firebase.js';

(async () => {
  try {
    const collectionName = 'test';
    const docId = 'sampleDoc';

    const docRef = db.collection(collectionName).doc(docId);

    // ドキュメント書き込み
    await docRef.set({
      message: 'Firestore 初期化テスト - デフォルトDB使用',
      timestamp: new Date()
    });

    // 書き込み確認
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      console.log(`✅ Firestore 初期化・書き込み成功:`, docSnap.data());
    } else {
      console.log('❌ ドキュメントが見つかりません');
    }

  } catch (err) {
    console.error('❌ Firestore テスト失敗:', err);
  }
})();
