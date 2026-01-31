import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
let serviceAccount;
// Render Secret Files のパス（デフォルト: /etc/secrets/<ファイル名>）
const secretFilePath = '/etc/secrets/serviceAccountKey.json';

try {
  // Render環境（Secret Filesを使用）
  serviceAccount = JSON.parse(readFileSync(secretFilePath, 'utf8'));
  console.log('✅ Firebase initialized with Secret File');
} catch (error) {
  // ローカル開発環境
  try {
    serviceAccount = JSON.parse(
      readFileSync(new URL('../serviceAccountKey.json', import.meta.url), 'utf8')
    );
    console.log('✅ Firebase initialized with local file');
  } catch (localError) {
    console.error('❌ Firebase initialization failed:', localError);
    throw localError;
  }
}
if (!admin.apps.length) {
  // databaseId 指定は削除してデフォルトDBを使う
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

export const db = admin.firestore();
