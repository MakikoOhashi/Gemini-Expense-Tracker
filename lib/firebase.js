import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serviceAccount = JSON.parse(readFileSync(join(__dirname, '../serviceAccountKey.json'), 'utf8'));

if (!admin.apps.length) {
  // databaseId 指定は削除してデフォルトDBを使う
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

export const db = admin.firestore();
