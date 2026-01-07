// Google Sheets年別管理・Rules連携テストスクリプト
import { sheetsService } from './services/sheetsService.js';

async function testYearBasedSheets() {
  try {
    console.log('🔄 年別Google Sheets初期化を開始...');

    const currentYear = new Date().getFullYear();
    console.log(`📅 現在の年度: ${currentYear}`);

    // 年別スプレッドシートを初期化
    const result = await sheetsService.initialize(currentYear);

    console.log('✅ 初期化完了！');
    console.log('📊 Spreadsheet Name:', result.spreadsheetName);
    console.log('🆔 Spreadsheet ID:', result.spreadsheetId);
    console.log('');

    // Rulesを取得して表示
    console.log('📋 Rulesシートの内容を確認...');
    const rules = await sheetsService.getRules(currentYear);
    console.log(`📝 登録されているルール: ${rules.length}件`);

    rules.slice(0, 3).forEach((rule, index) => {
      console.log(`  ${index + 1}. "${rule.keyword}" → ${rule.category} (${rule.confidence}%)`);
    });

    if (rules.length > 3) {
      console.log(`  ...他 ${rules.length - 3}件`);
    }

    console.log('');
    console.log('🎉 年別Google Sheets・Drive連携の準備が整いました！');
    console.log('');
    console.log('📁 作成されたフォルダ構造:');
    console.log('Google Drive');
    console.log('└─ ExpenseGPT/');
    console.log(`    ├─ ${result.spreadsheetName}`);
    console.log(`    │   ├─ Expenses（日々の支出データ）`);
    console.log(`    │   ├─ Summary（月別・カテゴリ別集計）`);
    console.log(`    │   └─ Rules（ユーザー定義ルール）`);
    console.log(`    └─ ${currentYear}_Receipts/`);
    console.log(`        ├─ ${currentYear}-01/`);
    console.log(`        ├─ ${currentYear}-02/`);
    console.log(`        └─ ...（月別フォルダが自動作成）`);

    // テストデータを保存してみる
    console.log('');
    console.log('🧪 テストデータ保存...');
    await sheetsService.saveExpense({
      date: new Date().toISOString().split('T')[0],
      amount: 1000,
      category: '食費',
      memo: 'テストデータ',
      receipt_url: ''
    });
    console.log('✅ テストデータを保存しました');

  } catch (error) {
    console.error('❌ 初期化に失敗しました:', error.message);
    console.log('');
    console.log('🔧 以下の項目を確認してください:');
    console.log('1. GOOGLE_CLIENT_EMAIL が正しく設定されているか');
    console.log('2. GOOGLE_PRIVATE_KEY が正しく設定されているか');
    console.log('3. Google Sheets API が有効になっているか');
    console.log('4. Google Drive API が有効になっているか');
    console.log('5. サービスアカウントに適切な権限があるか');
  }
}

// 実行
testYearBasedSheets();
