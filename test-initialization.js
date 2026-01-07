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
    console.log('🎉 年別Google Sheets連携の準備が整いました！');
    console.log(`💡 作成されたファイル: "${result.spreadsheetName}"`);
    console.log('📊 含まれるシート: Expenses, Summary, Rules');

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
