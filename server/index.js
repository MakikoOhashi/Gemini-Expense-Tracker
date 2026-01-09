import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { google } from 'googleapis';
import { configManager } from './configManager.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // 10MBに増加（画像対応）

// Multer setup for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Google OAuth 2.0 setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Scopes for Google Sheets and Drive access
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file'
];

// In-memory token storage (in production, use a database)
let userTokens = {};

// Helper function to create OAuth client for a user
function createUserOAuthClient(tokens) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  client.setCredentials(tokens);
  return client;
}

// Helper function to get authenticated client for user
function getAuthenticatedClient(userId) {
  if (!userTokens[userId]) {
    throw new Error('User not authenticated');
  }

  // Check if token is expired and refresh if needed
  const tokens = userTokens[userId];
  const client = createUserOAuthClient(tokens);

  // If access token is expired, refresh it
  if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
    return client.refreshAccessToken().then(({ credentials }) => {
      userTokens[userId] = credentials;
      return createUserOAuthClient(credentials);
    });
  }

  return Promise.resolve(client);
}

// Global cache for spreadsheet IDs by year
const spreadsheetCache = new Map();

// Helper function to create or get Gemini Expense Tracker root folder
async function getOrCreateGeminiExpenseTrackerRootFolder(userId) {
  const client = await getAuthenticatedClient(userId);
  const drive = google.drive({ version: 'v3', auth: client });

  // 常に名前で検索（configManagerのIDは補助的に使用）
  console.log('🔍 Google Driveで "Gemini Expense Tracker" フォルダを検索...');

  try {
    const searchResponse = await drive.files.list({
      q: `name='Gemini Expense Tracker' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
    });

    if (searchResponse.data.files && searchResponse.data.files.length > 0) {
      const rootFolderId = searchResponse.data.files[0].id;
      console.log('📁 ✅ 既存の Gemini Expense Tracker フォルダを見つけました:', rootFolderId);

      // configManagerを更新（同期）
      configManager.setRootFolderId(rootFolderId);
      return rootFolderId;
    }
  } catch (error) {
    console.warn('フォルダ検索エラー:', error);
  }

  // 見つからない場合は新規作成
  console.log('📁 ⚠️ Gemini Expense Tracker フォルダが見つからないため新規作成します');

  const folderMetadata = {
    name: 'Gemini Expense Tracker',
    mimeType: 'application/vnd.google-apps.folder',
  };

  try {
    const response = await drive.files.create({
      resource: folderMetadata,
      fields: 'id',
    });

    const rootFolderId = response.data.id;
    configManager.setRootFolderId(rootFolderId);

    console.log('✅ Gemini Expense Tracker ルートフォルダを作成しました:', rootFolderId);
    return rootFolderId;
  } catch (error) {
    console.error('ルートフォルダ作成エラー:', error);
    throw error;
  }
}

// Helper function to create or get year folder (under ExpenseGPT root)
async function getOrCreateYearFolder(year, rootFolderId, userId) {
  const client = await getAuthenticatedClient(userId);
  const drive = google.drive({ version: 'v3', auth: client });

  let yearFolderId = configManager.getYearFolder(year);

  if (yearFolderId) {
    try {
      await drive.files.get({ fileId: yearFolderId, fields: 'id,name' });
      console.log(`📁 ${year}年度フォルダを確認:`, yearFolderId);
      return yearFolderId;
    } catch (error) {
      console.warn(`${year}年度フォルダが見つからないため新規作成します`);
    }
  }

  // Create year folder under ExpenseGPT root
  const folderMetadata = {
    name: year.toString(),
    mimeType: 'application/vnd.google-apps.folder',
    parents: [rootFolderId],
  };

  try {
    const response = await drive.files.create({
      resource: folderMetadata,
      fields: 'id',
    });

    yearFolderId = response.data.id;
    configManager.setYearFolder(year, yearFolderId);

    console.log(`✅ ${year}年度フォルダを作成しました:`, yearFolderId);
    return yearFolderId;
  } catch (error) {
    console.error(`${year}年度フォルダ作成エラー:`, error);
    throw error;
  }
}

// Helper function to create or get receipts folder for a year (under year folder)
async function getOrCreateReceiptsFolderForYear(year, yearFolderId, userId) {
  const client = await getAuthenticatedClient(userId);
  const drive = google.drive({ version: 'v3', auth: client });

  let receiptsFolderId = configManager.getReceiptsFolder(year);

  if (receiptsFolderId) {
    try {
      await drive.files.get({ fileId: receiptsFolderId, fields: 'id,name' });
      console.log(`📁 ${year}年度Receiptsフォルダを確認:`, receiptsFolderId);
      return receiptsFolderId;
    } catch (error) {
      console.warn(`${year}年度Receiptsフォルダが見つからないため新規作成します`);
    }
  }

  // Create receipts folder under year folder
  const folderMetadata = {
    name: 'Receipts',
    mimeType: 'application/vnd.google-apps.folder',
    parents: [yearFolderId],
  };

  try {
    const response = await drive.files.create({
      resource: folderMetadata,
      fields: 'id',
    });

    receiptsFolderId = response.data.id;
    configManager.setReceiptsFolder(year, receiptsFolderId);

    console.log(`✅ ${year}年度Receiptsフォルダを作成しました:`, receiptsFolderId);
    return receiptsFolderId;
  } catch (error) {
    console.error(`${year}年度Receiptsフォルダ作成エラー:`, error);
    throw error;
  }
}

// Helper function to create or get receipts folder for a year
async function getOrCreateReceiptsFolder(year, rootFolderId, userId) {
  const client = await getAuthenticatedClient(userId);
  const drive = google.drive({ version: 'v3', auth: client });

  let receiptsFolderId = configManager.getReceiptsFolder(year);

  if (receiptsFolderId) {
    try {
      await drive.files.get({ fileId: receiptsFolderId, fields: 'id,name' });
      console.log(`📁 ${year}年度レシートフォルダを確認:`, receiptsFolderId);
      return receiptsFolderId;
    } catch (error) {
      console.warn(`${year}年度レシートフォルダが見つからないため新規作成します`);
    }
  }

  // Create receipts folder for the year
  const folderMetadata = {
    name: `${year}_Receipts`,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [rootFolderId],
  };

  try {
    const response = await drive.files.create({
      resource: folderMetadata,
      fields: 'id',
    });

    receiptsFolderId = response.data.id;
    configManager.setReceiptsFolder(year, receiptsFolderId);

    console.log(`✅ ${year}年度レシートフォルダを作成しました:`, receiptsFolderId);
    return receiptsFolderId;
  } catch (error) {
    console.error(`${year}年度レシートフォルダ作成エラー:`, error);
    throw error;
  }
}

// Helper function to create or get monthly folder
async function getOrCreateMonthlyFolder(year, month, receiptsFolderId, userId) {
  const client = await getAuthenticatedClient(userId);
  const drive = google.drive({ version: 'v3', auth: client });

  const folderName = `${year}-${month.toString().padStart(2, '0')}`;
  let monthlyFolderId = configManager.getMonthlyFolder(year, month);

  if (monthlyFolderId) {
    try {
      await drive.files.get({ fileId: monthlyFolderId, fields: 'id,name' });
      console.log(`📁 月別フォルダを確認: ${folderName}`);
      return monthlyFolderId;
    } catch (error) {
      console.warn(`月別フォルダが見つからないため新規作成します: ${folderName}`);
    }
  }

  // Create monthly folder
  const folderMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [receiptsFolderId],
  };

  try {
    const response = await drive.files.create({
      resource: folderMetadata,
      fields: 'id',
    });

    monthlyFolderId = response.data.id;
    configManager.setMonthlyFolder(year, month, monthlyFolderId);

    console.log(`✅ 月別フォルダを作成しました: ${folderName}`);
    return monthlyFolderId;
  } catch (error) {
    console.error(`月別フォルダ作成エラー: ${folderName}`, error);
    throw error;
  }
}

// Helper function to upload file to Google Drive
async function uploadFileToDrive(fileBuffer, fileName, mimeType, parentFolderId, userId) {
  const client = await getAuthenticatedClient(userId);
  const drive = google.drive({ version: 'v3', auth: client });

  const fileMetadata = {
    name: fileName,
    parents: [parentFolderId],
  };

  const media = {
    mimeType: mimeType,
    body: fileBuffer,
  };

  try {
    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id,webViewLink',
    });

    return {
      fileId: response.data.id,
      webViewLink: response.data.webViewLink,
    };
  } catch (error) {
    console.error('ファイルアップロードエラー:', error);
    throw error;
  }
}

// Helper function to get or create spreadsheet for a specific year
async function getOrCreateSpreadsheetForYear(year, userId) {
  const client = await getAuthenticatedClient(userId);
  const drive = google.drive({ version: 'v3', auth: client });
  const sheets = google.sheets({ version: 'v4', auth: client });

  const spreadsheetName = `${year}_Expenses`;

  // Check cache first (セッション中の高速参照用)
  if (spreadsheetCache.has(year)) {
    const cached = spreadsheetCache.get(year);
    console.log(`📋 キャッシュから${year}年度スプレッドシートを取得:`, cached.spreadsheetId);
    return cached;
  }

  try {
    // Gemini Expense Tracker フォルダ配下を確認
    const rootFolderId = await getOrCreateGeminiExpenseTrackerRootFolder(userId);
    console.log(`🔍 ルートフォルダID: ${rootFolderId}`);

    // フォルダ配下でスプレッドシートを検索
    const searchQuery = `name='${spreadsheetName}' and mimeType='application/vnd.google-apps.spreadsheet' and '${rootFolderId}' in parents and trashed=false`;
    console.log(`🔍 検索クエリ: ${searchQuery}`);

    const searchResponse = await drive.files.list({
      q: searchQuery,
      fields: 'files(id, name)',
    });

    console.log(`🔍 検索結果: ${searchResponse.data.files ? searchResponse.data.files.length : 0}件見つかりました`);

    let spreadsheetId;
    let isNew = false;

    if (searchResponse.data.files && searchResponse.data.files.length > 0) {
      spreadsheetId = searchResponse.data.files[0].id;
      console.log(`📊 ✅ 既存の${year}年度スプレッドシートを見つけました:`, spreadsheetId);
    } else {
      console.log(`📊 ⚠️ ${year}年度スプレッドシートが見つからないため新規作成します`);

      // Incomeシートも含めて作成
      const createResponse = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: spreadsheetName,
          },
          sheets: [
            {
              properties: {
                title: 'Expenses',
                sheetType: 'GRID',
                gridProperties: {
                  rowCount: 10000,
                  columnCount: 5,
                },
              },
            },
            {
              properties: {
                title: 'Income',
                sheetType: 'GRID',
                gridProperties: {
                  rowCount: 10000,
                  columnCount: 5,
                },
              },
            },
            {
              properties: {
                title: 'Summary',
                sheetType: 'GRID',
                gridProperties: {
                  rowCount: 150,
                  columnCount: 12,
                },
              },
            },
            {
              properties: {
                title: 'Rules',
                sheetType: 'GRID',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 4,
                },
              },
            },
          ],
        },
      });

      spreadsheetId = createResponse.data.spreadsheetId;
      isNew = true;
      console.log(`📊 🆕 新しい${year}年度スプレッドシートを作成しました:`, spreadsheetId);

      // 作成したスプレッドシートをルートフォルダに移動
      await moveFileToParent(spreadsheetId, rootFolderId, userId);
      console.log(`📁 スプレッドシートをルートフォルダに移動しました`);
    }

    const result = { spreadsheetId, spreadsheetName, isNew };

    // Cache the result (セッション中の高速参照用)
    spreadsheetCache.set(year, result);

    // Initialize sheets if newly created
    if (isNew) {
      await initializeSheets(spreadsheetId, year, userId);
    }

    return result;
  } catch (error) {
    console.error(`${year}年度スプレッドシートの取得/作成エラー:`, error);
    throw error;
  }
}

// Helper function to initialize sheets
async function initializeSheets(spreadsheetId, year, userId) {
  const client = await getAuthenticatedClient(userId);
  const sheets = google.sheets({ version: 'v4', auth: client });

  try {
    // Initialize Expenses sheet with headers
    const expensesHeaders = [['日付', '金額', 'カテゴリ', 'メモ', 'レシートURL']];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Expenses!A1:E1',
      valueInputOption: 'RAW',
      resource: { values: expensesHeaders },
    });

    // Initialize Income sheet with headers
    const incomeHeaders = [['日付', '金額', 'カテゴリ', 'メモ', 'レシートURL']];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Income!A1:E1',
      valueInputOption: 'RAW',
      resource: { values: incomeHeaders },
    });

    console.log(`📊 ${year}年度Expenses & Incomeシート初期化完了`);

    // Initialize Summary sheet in multiple steps to avoid API limits

    // Step 1: 月別支出集計ヘッダー
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Summary!A1',
      valueInputOption: 'RAW',
      resource: { values: [['月別支出集計']] },
    });

    // Step 2: 月別支出データ (1-6月)
    const monthlyExpenseData1 = [
      ['1月', `=SUMPRODUCT(Expenses!B:B, MONTH(Expenses!A:A)=1, YEAR(Expenses!A:A)=${year})`],
      ['2月', `=SUMPRODUCT(Expenses!B:B, MONTH(Expenses!A:A)=2, YEAR(Expenses!A:A)=${year})`],
      ['3月', `=SUMPRODUCT(Expenses!B:B, MONTH(Expenses!A:A)=3, YEAR(Expenses!A:A)=${year})`],
      ['4月', `=SUMPRODUCT(Expenses!B:B, MONTH(Expenses!A:A)=4, YEAR(Expenses!A:A)=${year})`],
      ['5月', `=SUMPRODUCT(Expenses!B:B, MONTH(Expenses!A:A)=5, YEAR(Expenses!A:A)=${year})`],
      ['6月', `=SUMPRODUCT(Expenses!B:B, MONTH(Expenses!A:A)=6, YEAR(Expenses!A:A)=${year})`],
    ];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Summary!A2:B7',
      valueInputOption: 'USER_ENTERED',
      resource: { values: monthlyExpenseData1 },
    });

    // Step 3: 月別支出データ (7-12月)
    const monthlyExpenseData2 = [
      ['7月', `=SUMPRODUCT(Expenses!B:B, MONTH(Expenses!A:A)=7, YEAR(Expenses!A:A)=${year})`],
      ['8月', `=SUMPRODUCT(Expenses!B:B, MONTH(Expenses!A:A)=8, YEAR(Expenses!A:A)=${year})`],
      ['9月', `=SUMPRODUCT(Expenses!B:B, MONTH(Expenses!A:A)=9, YEAR(Expenses!A:A)=${year})`],
      ['10月', `=SUMPRODUCT(Expenses!B:B, MONTH(Expenses!A:A)=10, YEAR(Expenses!A:A)=${year})`],
      ['11月', `=SUMPRODUCT(Expenses!B:B, MONTH(Expenses!A:A)=11, YEAR(Expenses!A:A)=${year})`],
      ['12月', `=SUMPRODUCT(Expenses!B:B, MONTH(Expenses!A:A)=12, YEAR(Expenses!A:A)=${year})`],
    ];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Summary!A8:B13',
      valueInputOption: 'USER_ENTERED',
      resource: { values: monthlyExpenseData2 },
    });

    // Step 4: 月別売上集計ヘッダー
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Summary!D1',
      valueInputOption: 'RAW',
      resource: { values: [['月別売上集計']] },
    });

    // Step 5: 月別売上データ (1-6月)
    const monthlyIncomeData1 = [
      ['1月', `=SUMPRODUCT(Income!B:B, MONTH(Income!A:A)=1, YEAR(Income!A:A)=${year})`],
      ['2月', `=SUMPRODUCT(Income!B:B, MONTH(Income!A:A)=2, YEAR(Income!A:A)=${year})`],
      ['3月', `=SUMPRODUCT(Income!B:B, MONTH(Income!A:A)=3, YEAR(Income!A:A)=${year})`],
      ['4月', `=SUMPRODUCT(Income!B:B, MONTH(Income!A:A)=4, YEAR(Income!A:A)=${year})`],
      ['5月', `=SUMPRODUCT(Income!B:B, MONTH(Income!A:A)=5, YEAR(Income!A:A)=${year})`],
      ['6月', `=SUMPRODUCT(Income!B:B, MONTH(Income!A:A)=6, YEAR(Income!A:A)=${year})`],
    ];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Summary!D2:E7',
      valueInputOption: 'USER_ENTERED',
      resource: { values: monthlyIncomeData1 },
    });

    // Step 6: 月別売上データ (7-12月)
    const monthlyIncomeData2 = [
      ['7月', `=SUMPRODUCT(Income!B:B, MONTH(Income!A:A)=7, YEAR(Income!A:A)=${year})`],
      ['8月', `=SUMPRODUCT(Income!B:B, MONTH(Income!A:A)=8, YEAR(Income!A:A)=${year})`],
      ['9月', `=SUMPRODUCT(Income!B:B, MONTH(Income!A:A)=9, YEAR(Income!A:A)=${year})`],
      ['10月', `=SUMPRODUCT(Income!B:B, MONTH(Income!A:A)=10, YEAR(Income!A:A)=${year})`],
      ['11月', `=SUMPRODUCT(Income!B:B, MONTH(Income!A:A)=11, YEAR(Income!A:A)=${year})`],
      ['12月', `=SUMPRODUCT(Income!B:B, MONTH(Income!A:A)=12, YEAR(Income!A:A)=${year})`],
    ];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Summary!D8:E13',
      valueInputOption: 'USER_ENTERED',
      resource: { values: monthlyIncomeData2 },
    });

    // Step 7: カテゴリ別集計ヘッダー
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Summary!A17',
      valueInputOption: 'RAW',
      resource: { values: [['カテゴリ別支出集計']] },
    });

    // Step 8: カテゴリ別支出データ
    const categoryExpenseData = [
      ['食費', '=SUMIF(Expenses!C:C, "食費", Expenses!B:B)'],
      ['交通費', '=SUMIF(Expenses!C:C, "交通費", Expenses!B:B)'],
      ['日用品', '=SUMIF(Expenses!C:C, "日用品", Expenses!B:B)'],
      ['娯楽', '=SUMIF(Expenses!C:C, "娯楽", Expenses!B:B)'],
      ['その他', '=SUMIF(Expenses!C:C, "その他", Expenses!B:B)'],
    ];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Summary!A18:B23',
      valueInputOption: 'USER_ENTERED',
      resource: { values: categoryExpenseData },
    });

    // Step 9: カテゴリ別売上ヘッダー
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Summary!D17',
      valueInputOption: 'RAW',
      resource: { values: [['カテゴリ別売上集計']] },
    });

    // Step 10: カテゴリ別売上データ
    const categoryIncomeData = [
      ['サービス収入', '=SUMIF(Income!C:C, "サービス収入", Income!B:B)'],
      ['商品販売', '=SUMIF(Income!C:C, "商品販売", Income!B:B)'],
      ['その他収入', '=SUMIF(Income!C:C, "その他収入", Income!B:B)'],
    ];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Summary!D18:E21',
      valueInputOption: 'USER_ENTERED',
      resource: { values: categoryIncomeData },
    });

    // Step 11: 損益比較ヘッダー
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Summary!G1',
      valueInputOption: 'RAW',
      resource: { values: [['月別損益比較']] },
    });

    // Step 12: 損益比較データ
    const profitLossData = [
      ['月', '収入', '支出', '損益'],
      ['1月', '=E2', '=B2', '=E2-B2'],
      ['2月', '=E3', '=B3', '=E3-B3'],
      ['3月', '=E4', '=B4', '=E4-B4'],
      ['4月', '=E5', '=B5', '=E5-B5'],
      ['5月', '=E6', '=B6', '=E6-B6'],
      ['6月', '=E7', '=B7', '=E7-B7'],
      ['7月', '=E8', '=B8', '=E8-B8'],
      ['8月', '=E9', '=B9', '=E9-B9'],
      ['9月', '=E10', '=B10', '=E10-B10'],
      ['10月', '=E11', '=B11', '=E11-B11'],
      ['11月', '=E12', '=B12', '=E12-B12'],
      ['12月', '=E13', '=B13', '=E13-B13'],
    ];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Summary!G2:J14',
      valueInputOption: 'USER_ENTERED',
      resource: { values: profitLossData },
    });

    console.log(`📊 ${year}年度Summaryシート初期化完了`);

    // Initialize Rules sheet with headers and sample data
    const rulesHeaders = [['Keyword', 'Category', 'Confidence', 'Notes']];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Rules!A1:D1',
      valueInputOption: 'RAW',
      resource: { values: rulesHeaders },
    });

    // Rules data in smaller chunks
    const sampleRules1 = [
      ['ベローチェ', '地代家賃', 95, 'オフィス家賃'],
      ['Slack', '通信費', 90, 'サブスクリプション'],
      ['AWS', '外注費', 85, 'インフラサービス'],
      ['スターバックス', '食費', 88, 'カフェ・飲食'],
    ];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Rules!A2:D5',
      valueInputOption: 'RAW',
      resource: { values: sampleRules1 },
    });

    const sampleRules2 = [
      ['Amazon', '日用品', 75, 'オンラインショッピング'],
      ['Uber', '交通費', 92, 'タクシー・配車'],
      ['Netflix', '娯楽', 95, '動画配信サービス'],
      ['Zoom', '通信費', 85, 'ビデオ会議'],
    ];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Rules!A6:D9',
      valueInputOption: 'RAW',
      resource: { values: sampleRules2 },
    });

    console.log(`📊 ${year}年度Rulesシート初期化完了`);
    console.log(`✅ ${year}年度スプレッドシートの初期化完了`);
  } catch (error) {
    console.error('シート初期化エラー:', error);
    throw error;
  }
}

// Routes
app.post('/api/spreadsheet/:year', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const userId = req.body.userId || 'test-user';
    if (isNaN(year) || year < 2000 || year > 2100) {
      return res.status(400).json({ error: '無効な年度です' });
    }

    const result = await getOrCreateSpreadsheetForYear(year, userId);

    res.json({
      success: true,
      message: `${year}年度のスプレッドシートを${result.isNew ? '作成' : '取得'}しました`,
      spreadsheetId: result.spreadsheetId,
      spreadsheetName: result.spreadsheetName,
      isNew: result.isNew
    });

  } catch (error) {
    console.error('Spreadsheet Get/Create Error:', error);
    res.status(500).json({
      error: 'スプレッドシートの取得/作成に失敗しました',
      details: error.message
    });
  }
});

// Helper function to search or create folder
async function searchOrCreateFolder(folderName, parentFolderId, userId) {
  const client = await getAuthenticatedClient(userId);
  const drive = google.drive({ version: 'v3', auth: client });

  try {
    // Search for existing folder
    let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    if (parentFolderId) {
      query += ` and '${parentFolderId}' in parents`;
    }

    const searchResponse = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
    });

    if (searchResponse.data.files && searchResponse.data.files.length > 0) {
      console.log(`📁 既存フォルダ見つかりました: ${folderName} (${searchResponse.data.files[0].id})`);
      return searchResponse.data.files[0];
    }

    // Create new folder
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };

    if (parentFolderId) {
      folderMetadata.parents = [parentFolderId];
    }

    const createResponse = await drive.files.create({
      resource: folderMetadata,
      fields: 'id, name',
    });

    console.log(`📁 新規フォルダ作成しました: ${folderName} (${createResponse.data.id})`);
    return createResponse.data;

  } catch (error) {
    console.error(`フォルダ操作エラー (${folderName}):`, error);
    throw error;
  }
}

// Helper function to create spreadsheet in specific folder
async function createSpreadsheet(name, parentFolderId, userId) {
  const client = await getAuthenticatedClient(userId);
  const sheets = google.sheets({ version: 'v4', auth: client });

  try {
    const currentYear = new Date().getFullYear();

    // Create spreadsheet
    const createResponse = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: name,
        },
        sheets: [
          {
            properties: {
              title: 'Expenses',
              sheetType: 'GRID',
              gridProperties: {
                rowCount: 10000,
                columnCount: 5,
              },
            },
          },
          {
            properties: {
              title: 'Income',
              sheetType: 'GRID',
              gridProperties: {
                rowCount: 10000,
                columnCount: 5,
              },
            },
          },
          {
            properties: {
              title: 'Summary',
              sheetType: 'GRID',
              gridProperties: {
                rowCount: 150,
                columnCount: 12,
              },
            },
          },
          {
            properties: {
              title: 'Rules',
              sheetType: 'GRID',
              gridProperties: {
                rowCount: 1000,
                columnCount: 4,
              },
            },
          },
        ],
      },
    });

    const spreadsheetId = createResponse.data.spreadsheetId;
    console.log(`📊 スプレッドシート作成しました: ${name} (${spreadsheetId})`);

    // Move to parent folder
    await moveFileToParent(spreadsheetId, parentFolderId, userId);
    console.log(`📁 スプレッドシートをフォルダに移動しました: ${parentFolderId}`);

    // Initialize sheets
    await initializeSheets(spreadsheetId, currentYear, userId);
    console.log(`📊 スプレッドシート初期化完了: ${currentYear}年度`);

    return {
      spreadsheetId,
      spreadsheetName: name,
      isNew: true
    };

  } catch (error) {
    console.error('スプレッドシート作成エラー:', error);
    throw error;
  }
}

// Helper function to create receipts folder and monthly subfolders
async function createReceiptsStructure(parentFolderId, year, userId) {
  try {
    // Create Receipts folder
    const receiptsFolder = await searchOrCreateFolder('Receipts', parentFolderId, userId);
    console.log(`📁 Receiptsフォルダ作成完了: ${receiptsFolder.id}`);

    // Create monthly folders
    const monthlyFolders = [];
    for (let month = 1; month <= 12; month++) {
      const monthStr = month.toString().padStart(2, '0');
      const folderName = `${year}-${monthStr}`;
      const monthlyFolder = await searchOrCreateFolder(folderName, receiptsFolder.id, userId);
      monthlyFolders.push({ month, folderId: monthlyFolder.id });
    }

    console.log(`📁 月別フォルダ作成完了: ${year}-01 から ${year}-12`);
    return { receiptsFolderId: receiptsFolder.id, monthlyFolders };

  } catch (error) {
    console.error('Receipts構造作成エラー:', error);
    throw error;
  }
}

// Helper function to move file to parent folder
async function moveFileToParent(fileId, parentFolderId, userId) {
  const client = await getAuthenticatedClient(userId);
  const drive = google.drive({ version: 'v3', auth: client });

  try {
    // 現在の親フォルダを取得
    const fileResponse = await drive.files.get({
      fileId: fileId,
      fields: 'parents'
    });

    const currentParents = fileResponse.data.parents || [];

    // 新しい親フォルダを設定（現在の親を削除し、新しい親を追加）
    await drive.files.update({
      fileId: fileId,
      addParents: parentFolderId,
      removeParents: currentParents.join(','),
      fields: 'id, parents'
    });

    console.log(`📁 ファイルをフォルダに移動しました: ${fileId} → ${parentFolderId}`);
  } catch (error) {
    console.error('ファイル移動エラー:', error);
    throw error;
  }
}

// Helper function to ensure Gemini Expense Tracker root folder exists
async function ensureGeminiFolder(userId) {
  try {
    // getOrCreateGeminiExpenseTrackerRootFolder() を使用（既存関数）
    const rootFolderId = await getOrCreateGeminiExpenseTrackerRootFolder(userId);
    console.log('📁 Gemini Expense Tracker フォルダ確認済み');
    return rootFolderId;
  } catch (error) {
    console.error('Geminiフォルダ確保エラー:', error);
    throw error;
  }
}

// Helper function to ensure spreadsheet for specific year exists
async function ensureSpreadsheet(year, userId) {
  try {
    // getOrCreateSpreadsheetForYear() を使用（既存関数）
    const result = await getOrCreateSpreadsheetForYear(year, userId);
    console.log(`📊 ${year}年度スプレッドシート確認済み: ${result.spreadsheetId}`);
    return result.spreadsheetId;
  } catch (error) {
    console.error(`${year}年度スプレッドシート確保エラー:`, error);
    throw error;
  }
}

// Helper function to create spreadsheet under parent folder
async function createSpreadsheetUnderParent(spreadsheetName, parentFolderId, year, userId) {
  const client = await getAuthenticatedClient(userId);
  const sheets = google.sheets({ version: 'v4', auth: client });

  try {
    // Step 1: スプレッドシート作成（フォルダ指定なし）
    const createResponse = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: spreadsheetName,
        },
        sheets: [
          {
            properties: {
              title: 'Expenses',
              sheetType: 'GRID',
              gridProperties: {
                rowCount: 10000,
                columnCount: 5,
              },
            },
          },
          {
            properties: {
              title: 'Summary',
              sheetType: 'GRID',
              gridProperties: {
                rowCount: 100,
                columnCount: 10,
              },
            },
          },
          {
            properties: {
              title: 'Rules',
              sheetType: 'GRID',
              gridProperties: {
                rowCount: 1000,
                columnCount: 4,
              },
            },
          },
        ],
      },
    });

    const spreadsheetId = createResponse.data.spreadsheetId;
    console.log(`📊 新しい${year}年度スプレッドシートを作成しました:`, spreadsheetId);

    // Step 2: Drive API で親フォルダを設定
    await moveFileToParent(spreadsheetId, parentFolderId, userId);

    // Step 3: シート初期化
    await initializeSheets(spreadsheetId, year, userId);

    return {
      spreadsheetId,
      spreadsheetName,
      isNew: true
    };
  } catch (error) {
    console.error('スプレッドシート作成エラー:', error);
    throw error;
  }
}

app.post('/api/initialize', async (req, res) => {
  try {
    const userId = req.body.userId || 'test-user';
    // クエリパラメータで年を指定可能（テスト用）
    const queryYear = req.query.year ? parseInt(req.query.year) : null;
    const currentYear = queryYear && !isNaN(queryYear) ? queryYear : new Date().getFullYear();
    const spreadsheetName = `${currentYear}_Expenses`;

    console.log(`🔄 Gemini Expense Tracker システム初期化を開始... (年: ${currentYear})`);

    // Step 1: searchOrCreateFolder('Gemini Expense Tracker', null) → rootFolderId 確保
    console.log('1️⃣ Step 1: ルートフォルダ作成');
    const rootFolder = await searchOrCreateFolder('Gemini Expense Tracker', null, userId);
    console.log(`✅ Step 1 完了: rootFolderId = ${rootFolder.id}`);

    // Step 2: createSpreadsheet('2026_Expenses', rootFolderId) → スプレッドシート作成 & シート初期化
    console.log('2️⃣ Step 2: スプレッドシート作成');
    const spreadsheetResult = await createSpreadsheet(spreadsheetName, rootFolder.id, userId);
    console.log(`✅ Step 2 完了: spreadsheetId = ${spreadsheetResult.spreadsheetId}`);

    // Step 3: createFolder('Receipts', rootFolderId) → Receipts フォルダ作成 & 月別フォルダ生成
    console.log('3️⃣ Step 3: Receiptsフォルダ構造作成');
    const receiptsStructure = await createReceiptsStructure(rootFolder.id, currentYear, userId);
    console.log(`✅ Step 3 完了: receiptsFolderId = ${receiptsStructure.receiptsFolderId}`);

    // Save spreadsheet ID to config
    configManager.setSpreadsheetId(currentYear, spreadsheetResult.spreadsheetId);

    console.log('🎉 Gemini Expense Tracker システム初期化完了');
    console.log(`📁 Root Folder: ${rootFolder.id}`);
    console.log(`📊 Spreadsheet: ${spreadsheetResult.spreadsheetName} (${spreadsheetResult.spreadsheetId})`);
    console.log(`📂 Receipts Folder: ${receiptsStructure.receiptsFolderId}`);

    res.json({
      success: true,
      message: 'Gemini Expense Tracker システムの初期化が完了しました',
      spreadsheetId: spreadsheetResult.spreadsheetId,
      spreadsheetName: spreadsheetResult.spreadsheetName,
      rootFolderId: rootFolder.id,
      receiptsFolderId: receiptsStructure.receiptsFolderId,
      monthlyFolders: receiptsStructure.monthlyFolders,
      isNew: true
    });

  } catch (error) {
    console.error('System Initialization Error:', error);
    res.status(500).json({
      error: 'システムの初期化に失敗しました',
      details: error.message
    });
  }
});

app.get('/api/spreadsheet-id', async (req, res) => {
  try {
    const userId = req.query.userId || 'test-user';
    const currentYear = new Date().getFullYear();
    const result = await getOrCreateSpreadsheetForYear(currentYear, userId);

    res.json({
      spreadsheetId: result.spreadsheetId,
      spreadsheetName: result.spreadsheetName
    });

  } catch (error) {
    console.error('Get Spreadsheet ID Error:', error);
    res.status(500).json({
      error: 'スプレッドシートIDの取得に失敗しました',
      details: error.message
    });
  }
});

app.get('/api/rules/:year', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const userId = req.query.userId || 'test-user';
    if (isNaN(year) || year < 2000 || year > 2100) {
      return res.status(400).json({ error: '無効な年度です' });
    }

    const { spreadsheetId } = await getOrCreateSpreadsheetForYear(year, userId);
    const client = await getAuthenticatedClient(userId);
    const sheets = google.sheets({ version: 'v4', auth: client });

    // Get rules from Rules sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Rules!A2:D',
    });

    const rows = response.data.values || [];
    const rules = rows.map((row, index) => ({
      id: `${year}_${index + 2}`, // Row number as ID
      keyword: row[0] || '',
      category: row[1] || '',
      confidence: parseInt(row[2]) || 0,
      notes: row[3] || '',
    })).filter(rule => rule.keyword && rule.category);

    res.json({ rules });

  } catch (error) {
    console.error('Get Rules Error:', error);
    res.status(500).json({
      error: 'ルールの取得に失敗しました',
      details: error.message
    });
  }
});

app.post('/api/rules/:year', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const userId = req.body.userId || 'test-user';
    const { keyword, category, confidence, notes } = req.body;

    if (!keyword || !category) {
      return res.status(400).json({ error: 'キーワードとカテゴリは必須です' });
    }

    const { spreadsheetId } = await getOrCreateSpreadsheetForYear(year, userId);
    const client = await getAuthenticatedClient(userId);
    const sheets = google.sheets({ version: 'v4', auth: client });

    // Get current rules to find next empty row
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Rules!A:A',
    });

    const nextRow = (response.data.values || []).length + 1;

    // Add new rule
    const newRule = [[keyword, category, confidence || 80, notes || '']];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Rules!A${nextRow}:D${nextRow}`,
      valueInputOption: 'RAW',
      resource: { values: newRule },
    });

    const rule = {
      id: `${year}_${nextRow}`,
      keyword,
      category,
      confidence: confidence || 80,
      notes: notes || '',
    };

    res.json({
      success: true,
      message: 'ルールを追加しました',
      rule
    });

  } catch (error) {
    console.error('Add Rule Error:', error);
    res.status(500).json({
      error: 'ルールの追加に失敗しました',
      details: error.message
    });
  }
});

app.delete('/api/rules/:year/:id', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const userId = req.query.userId || 'test-user';
    const ruleId = req.params.id;
    const rowNumber = parseInt(ruleId.split('_')[1]);

    if (isNaN(rowNumber)) {
      return res.status(400).json({ error: '無効なルールIDです' });
    }

    const { spreadsheetId } = await getOrCreateSpreadsheetForYear(year, userId);
    const client = await getAuthenticatedClient(userId);
    const sheets = google.sheets({ version: 'v4', auth: client });

    // Clear the row (we can't delete rows in Google Sheets API easily)
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `Rules!A${rowNumber}:D${rowNumber}`,
    });

    res.json({
      success: true,
      message: 'ルールを削除しました'
    });

  } catch (error) {
    console.error('Delete Rule Error:', error);
    res.status(500).json({
      error: 'ルールの削除に失敗しました',
      details: error.message
    });
  }
});

// GET all expenses
app.get('/api/expenses', async (req, res) => {
  try {
    const userId = req.query.userId || 'test-user';
    const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();
    
    const { spreadsheetId } = await getOrCreateSpreadsheetForYear(year, userId);
    const client = await getAuthenticatedClient(userId);
    const sheets = google.sheets({ version: 'v4', auth: client });

    // Get all data from Expenses sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Expenses!A2:E',
    });

    const rows = response.data.values || [];
    const expenses = rows.map((row, index) => ({
      id: `${year}_exp_${index + 2}`,
      date: row[0] || '',
      amount: parseFloat(row[1]) || 0,
      category: row[2] || '',
      memo: row[3] || '',
      receiptUrl: row[4] || '',
      type: 'expense',
      createdAt: Date.now()
    }));

    res.json({ expenses });

  } catch (error) {
    console.error('Get Expenses Error:', error);
    res.status(500).json({
      error: '経費データの取得に失敗しました',
      details: error.message
    });
  }
});

// GET all income
app.get('/api/income', async (req, res) => {
  try {
    const userId = req.query.userId || 'test-user';
    const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();
    
    const { spreadsheetId } = await getOrCreateSpreadsheetForYear(year, userId);
    const client = await getAuthenticatedClient(userId);
    const sheets = google.sheets({ version: 'v4', auth: client });

    // Get all data from Income sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Income!A2:E',
    });

    const rows = response.data.values || [];
    const income = rows.map((row, index) => ({
      id: `${year}_inc_${index + 2}`,
      date: row[0] || '',
      amount: parseFloat(row[1]) || 0,
      category: row[2] || '',
      memo: row[3] || '',
      receiptUrl: row[4] || '',
      type: 'income',
      createdAt: Date.now()
    }));

    res.json({ income });

  } catch (error) {
    console.error('Get Income Error:', error);
    res.status(500).json({
      error: '売上データの取得に失敗しました',
      details: error.message
    });
  }
});

// POST new expense/income
app.post('/api/expenses', async (req, res) => {
  try {
    const userId = req.body.userId || 'test-user';
    const { date, amount, category, memo, receipt_url, type } = req.body;

    if (!date || !amount || !category) {
      return res.status(400).json({ error: '必須フィールドが不足しています' });
    }

    // Determine sheet based on type
    const sheetType = type === 'income' ? 'Income' : 'Expenses';
    const message = type === 'income' ? '収入データが保存されました' : '支出データが保存されました';

    // Ensure spreadsheet exists for current year
    const currentYear = new Date().getFullYear();
    console.log(`💾 データを保存しようとしています: 年=${currentYear}, type=${type}, category=${category}`);
    const spreadsheetId = await ensureSpreadsheet(currentYear, userId);
    console.log(`💾 スプレッドシートID取得: ${spreadsheetId}`);

    const client = await getAuthenticatedClient(userId);
    const sheets = google.sheets({ version: 'v4', auth: client });

    // Append data to appropriate sheet
    const values = [[date, amount, category, memo || '', receipt_url || '']];
    const range = `${sheetType}!A:E`; // A: date, B: amount, C: category, D: memo, E: receipt_url

    console.log(`💾 シート"${sheetType}"にデータを追加: ${JSON.stringify(values)}`);
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: { values },
    });
    console.log(`💾 Google Sheets APIレスポンス:`, response.data);

    // Get the row number where data was added
    const updatedRange = response.data.updates?.updatedRange;
    let rowNumber = null;
    if (updatedRange) {
      // Extract row number from range like "Expenses!A123:E123"
      const match = updatedRange.match(/!A(\d+):E\d+/);
      if (match) {
        rowNumber = parseInt(match[1]);
      }
    }

    console.log(`💾 ${type === 'income' ? '収入' : '支出'}データを保存: ${category} - ¥${amount} (${rowNumber ? `行${rowNumber}` : ''})`);

    res.json({
      success: true,
      message: message,
      id: rowNumber,
      data: { date, amount, category, memo, receipt_url, type }
    });

  } catch (error) {
    console.error('Google Sheets API Error:', error);
    res.status(500).json({
      error: 'データの保存に失敗しました',
      details: error.message
    });
  }
});

// Receipt upload endpoint
app.post('/api/upload-receipt', upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'ファイルがアップロードされていません' });
    }

    const userId = req.body.userId || 'test-user';
    const { year, month } = req.body;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();
    const currentMonth = month ? parseInt(month) : new Date().getMonth() + 1;

    if (isNaN(currentYear) || currentYear < 2000 || currentYear > 2100) {
      return res.status(400).json({ error: '無効な年度です' });
    }

    if (isNaN(currentMonth) || currentMonth < 1 || currentMonth > 12) {
      return res.status(400).json({ error: '無効な月です' });
    }

    // Get or create folder structure using new hierarchy
    const rootFolderId = await getOrCreateGeminiExpenseTrackerRootFolder(userId);
    const receiptsFolderId = await getOrCreateReceiptsFolder(currentYear, rootFolderId, userId);
    const monthlyFolderId = await getOrCreateMonthlyFolder(currentYear, currentMonth, receiptsFolderId, userId);

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = req.file.originalname;
    const extension = originalName.split('.').pop() || 'jpg';
    const fileName = `receipt_${timestamp}.${extension}`;

    // Upload file to Google Drive
    const uploadResult = await uploadFileToDrive(
      req.file.buffer,
      fileName,
      req.file.mimetype,
      monthlyFolderId,
      userId
    );

    console.log(`✅ レシートをアップロードしました: ${fileName}`);

    res.json({
      success: true,
      message: 'レシートをアップロードしました',
      fileName,
      fileId: uploadResult.fileId,
      webViewLink: uploadResult.webViewLink,
      folderPath: `${currentYear}-${currentMonth.toString().padStart(2, '0')}`
    });

  } catch (error) {
    console.error('Receipt Upload Error:', error);
    res.status(500).json({
      error: 'レシートのアップロードに失敗しました',
      details: error.message
    });
  }
});

// Get folder configuration
app.get('/api/config/folders', (req, res) => {
  try {
    const config = configManager.getAllConfig();
    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Get Folders Config Error:', error);
    res.status(500).json({
      error: 'フォルダ設定の取得に失敗しました',
      details: error.message
    });
  }
});

// OAuth 2.0 endpoints
app.get('/auth/google', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state: 'test-user' // In production, use proper session/user management
  });
  res.redirect(authUrl);
});

app.get('/auth/google/callback', async (req, res) => {
  const { code, state } = req.query;
  const userId = state || 'test-user'; // In production, get from session

  try {
    const { tokens } = await oauth2Client.getToken(code);
    userTokens[userId] = tokens;

    // ユーザーログイン時にキャッシュクリア
    spreadsheetCache.clear();
    console.log(`🧹 User ${userId} login: cache cleared`);

    console.log(`✅ User ${userId} authenticated successfully`);

    // Redirect to frontend with success
    res.redirect('http://localhost:3000?auth=success');
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect('http://localhost:3000?auth=error');
  }
});

app.get('/auth/status', (req, res) => {
  const userId = req.query.userId || 'test-user';
  const isAuthenticated = !!userTokens[userId];

  res.json({
    authenticated: isAuthenticated,
    userId: userId
  });
});

app.post('/auth/logout', (req, res) => {
  const userId = req.body.userId || 'test-user';
  delete userTokens[userId];

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Test endpoint to create folders only (without spreadsheets)
app.get('/api/test/create-folders-only', async (req, res) => {
  try {
    const userId = req.query.userId || 'test-user';
    console.log('🧪 フォルダ構造テスト開始...');

    // 1. Gemini Expense Tracker ルートフォルダ作成
    const rootFolderId = await getOrCreateGeminiExpenseTrackerRootFolder(userId);
    console.log('✅ Step 1: Gemini Expense Tracker ルートフォルダ作成完了');

    // 2. 2026年 Receipts フォルダ作成（年別フォルダは作成しない）
    const currentYear = 2026; // 固定で2026年を使用
    const receiptsFolderId = await getOrCreateReceiptsFolder(currentYear, rootFolderId, userId);
    console.log('✅ Step 2: Receiptsフォルダ作成完了');

    // 3. 月別フォルダ作成（1-12月）
    const monthlyFolderIds = [];
    for (let month = 1; month <= 12; month++) {
      const monthlyFolderId = await getOrCreateMonthlyFolder(currentYear, month, receiptsFolderId, userId);
      monthlyFolderIds.push({ month, folderId: monthlyFolderId });
    }
    console.log('✅ Step 3: 月別フォルダ作成完了（1-12月）');

    // 4. スプレッドシート作成はしない

    console.log('🎉 フォルダ構造テスト完了 - スプレッドシートは作成されていません');

    res.json({
      success: true,
      message: 'フォルダ構造のみ作成しました（スプレッドシートなし）',
      structure: {
        rootFolderId,
        receiptsFolderId,
        monthlyFolders: monthlyFolderIds
      },
      googleDrivePath: `Gemini Expense Tracker/${currentYear}_Receipts/`
    });

  } catch (error) {
    console.error('フォルダ構造テストエラー:', error);
    res.status(500).json({
      error: 'フォルダ構造テストに失敗しました',
      details: error.message
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Gemini Expense Tracker API Server running on port ${PORT}`);
  console.log(`🔐 OAuth 2.0 ready - visit http://localhost:${PORT}/auth/google to authenticate`);
  console.log(`📊 Google Sheets integration ready`);
  console.log(`🧪 Test endpoint: GET /api/test/create-folders-only`);
});
