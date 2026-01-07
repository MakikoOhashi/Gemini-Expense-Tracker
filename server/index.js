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
app.use(express.json());

// Multer setup for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Google APIs setup
const auth = new google.auth.GoogleAuth({
  credentials: {
    type: "service_account",
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
  },
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.file'
  ],
});

const sheets = google.sheets({ version: 'v4', auth });
const drive = google.drive({ version: 'v3', auth });

// Global cache for spreadsheet IDs by year
const spreadsheetCache = new Map();

// Helper function to create or get ExpenseGPT root folder
async function getOrCreateExpenseGPTRootFolder() {
  let rootFolderId = configManager.getRootFolderId();

  if (rootFolderId) {
    try {
      // Verify the folder still exists
      await drive.files.get({ fileId: rootFolderId, fields: 'id,name' });
      console.log('📁 ExpenseGPT ルートフォルダを確認:', rootFolderId);
      return rootFolderId;
    } catch (error) {
      console.warn('既存のルートフォルダが見つからないため新規作成します');
    }
  }

  // Create ExpenseGPT root folder
  const folderMetadata = {
    name: 'ExpenseGPT',
    mimeType: 'application/vnd.google-apps.folder',
  };

  try {
    const response = await drive.files.create({
      resource: folderMetadata,
      fields: 'id',
    });

    rootFolderId = response.data.id;
    configManager.setRootFolderId(rootFolderId);

    console.log('✅ ExpenseGPT ルートフォルダを作成しました:', rootFolderId);
    return rootFolderId;
  } catch (error) {
    console.error('ルートフォルダ作成エラー:', error);
    throw error;
  }
}

// Helper function to create or get receipts folder for a year
async function getOrCreateReceiptsFolder(year, rootFolderId) {
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
async function getOrCreateMonthlyFolder(year, month, receiptsFolderId) {
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
async function uploadFileToDrive(fileBuffer, fileName, mimeType, parentFolderId) {
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
async function getOrCreateSpreadsheetForYear(year) {
  const spreadsheetName = `${year}_Expenses`;

  // Check cache first
  if (spreadsheetCache.has(year)) {
    const cached = spreadsheetCache.get(year);
    console.log(`📋 キャッシュから${year}年度スプレッドシートを取得:`, cached.spreadsheetId);
    return cached;
  }

  try {
    // Try to find existing spreadsheet by name
    const drive = google.drive({ version: 'v3', auth });
    const searchResponse = await drive.files.list({
      q: `name='${spreadsheetName}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
      fields: 'files(id, name)',
    });

    let spreadsheetId;
    let isNew = false;

    if (searchResponse.data.files && searchResponse.data.files.length > 0) {
      spreadsheetId = searchResponse.data.files[0].id;
      console.log(`📊 既存の${year}年度スプレッドシートを見つけました:`, spreadsheetId);
    } else {
      // Create new spreadsheet
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

      spreadsheetId = createResponse.data.spreadsheetId;
      isNew = true;
      console.log(`📊 新しい${year}年度スプレッドシートを作成しました:`, spreadsheetId);
    }

    const result = { spreadsheetId, spreadsheetName, isNew };

    // Cache the result
    spreadsheetCache.set(year, result);

    // Initialize sheets if newly created
    if (isNew) {
      await initializeSheets(spreadsheetId, year);
    }

    return result;
  } catch (error) {
    console.error(`${year}年度スプレッドシートの取得/作成エラー:`, error);
    throw error;
  }
}

// Helper function to initialize sheets
async function initializeSheets(spreadsheetId, year) {
  try {
    // Initialize Expenses sheet with headers
    const expensesHeaders = [['日付', '金額', 'カテゴリ', 'メモ', 'レシートURL']];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Expenses!A1:E1',
      valueInputOption: 'RAW',
      resource: { values: expensesHeaders },
    });

    // Initialize Summary sheet with formulas
    const summaryData = [
      ['月別支出集計'],
      ['1月', `=SUMPRODUCT(Expenses!B:B, MONTH(Expenses!A:A)=1, YEAR(Expenses!A:A)=${year})`],
      ['2月', `=SUMPRODUCT(Expenses!B:B, MONTH(Expenses!A:A)=2, YEAR(Expenses!A:A)=${year})`],
      ['3月', `=SUMPRODUCT(Expenses!B:B, MONTH(Expenses!A:A)=3, YEAR(Expenses!A:A)=${year})`],
      ['4月', `=SUMPRODUCT(Expenses!B:B, MONTH(Expenses!A:A)=4, YEAR(Expenses!A:A)=${year})`],
      ['5月', `=SUMPRODUCT(Expenses!B:B, MONTH(Expenses!A:A)=5, YEAR(Expenses!A:A)=${year})`],
      ['6月', `=SUMPRODUCT(Expenses!B:B, MONTH(Expenses!A:A)=6, YEAR(Expenses!A:A)=${year})`],
      ['7月', `=SUMPRODUCT(Expenses!B:B, MONTH(Expenses!A:A)=7, YEAR(Expenses!A:A)=${year})`],
      ['8月', `=SUMPRODUCT(Expenses!B:B, MONTH(Expenses!A:A)=8, YEAR(Expenses!A:A)=${year})`],
      ['9月', `=SUMPRODUCT(Expenses!B:B, MONTH(Expenses!A:A)=9, YEAR(Expenses!A:A)=${year})`],
      ['10月', `=SUMPRODUCT(Expenses!B:B, MONTH(Expenses!A:A)=10, YEAR(Expenses!A:A)=${year})`],
      ['11月', `=SUMPRODUCT(Expenses!B:B, MONTH(Expenses!A:A)=11, YEAR(Expenses!A:A)=${year})`],
      ['12月', `=SUMPRODUCT(Expenses!B:B, MONTH(Expenses!A:A)=12, YEAR(Expenses!A:A)=${year})`],
      [''],
      ['カテゴリ別支出集計'],
      ['食費', '=SUMIF(Expenses!C:C, "食費", Expenses!B:B)'],
      ['交通費', '=SUMIF(Expenses!C:C, "交通費", Expenses!B:B)'],
      ['日用品', '=SUMIF(Expenses!C:C, "日用品", Expenses!B:B)'],
      ['娯楽', '=SUMIF(Expenses!C:C, "娯楽", Expenses!B:B)'],
      ['その他', '=SUMIF(Expenses!C:C, "その他", Expenses!B:B)'],
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Summary!A1:B19',
      valueInputOption: 'USER_ENTERED',
      resource: { values: summaryData },
    });

    // Initialize Rules sheet with headers and sample data
    const rulesHeaders = [['Keyword', 'Category', 'Confidence', 'Notes']];
    const sampleRules = [
      ['ベローチェ', '地代家賃', 95, 'オフィス家賃'],
      ['Slack', '通信費', 90, 'サブスクリプション'],
      ['AWS', '外注費', 85, 'インフラサービス'],
      ['スターバックス', '食費', 88, 'カフェ・飲食'],
      ['Amazon', '日用品', 75, 'オンラインショッピング'],
      ['Uber', '交通費', 92, 'タクシー・配車'],
      ['Netflix', '娯楽', 95, '動画配信サービス'],
      ['Zoom', '通信費', 85, 'ビデオ会議'],
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Rules!A1:D1',
      valueInputOption: 'RAW',
      resource: { values: rulesHeaders },
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Rules!A2:D9',
      valueInputOption: 'RAW',
      resource: { values: sampleRules },
    });

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
    if (isNaN(year) || year < 2000 || year > 2100) {
      return res.status(400).json({ error: '無効な年度です' });
    }

    const result = await getOrCreateSpreadsheetForYear(year);

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

app.post('/api/initialize', async (req, res) => {
  try {
    console.log('🔄 ExpenseGPT システム初期化を開始...');

    // Create ExpenseGPT root folder
    const rootFolderId = await getOrCreateExpenseGPTRootFolder();

    // Create receipts folder for current year
    const currentYear = new Date().getFullYear();
    const receiptsFolderId = await getOrCreateReceiptsFolder(currentYear, rootFolderId);

    // Create spreadsheet
    const result = await getOrCreateSpreadsheetForYear(currentYear);

    // Save spreadsheet ID to config
    configManager.setSpreadsheetId(currentYear, result.spreadsheetId);

    console.log('✅ ExpenseGPT セットアップ完了');
    console.log(`📁 Root Folder ID: ${rootFolderId}`);
    console.log(`📄 スプレッドシート: ${result.spreadsheetName}`);

    res.json({
      success: true,
      message: 'ExpenseGPT システムの初期化が完了しました',
      spreadsheetId: result.spreadsheetId,
      spreadsheetName: result.spreadsheetName,
      rootFolderId,
      receiptsFolderId
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
    const currentYear = new Date().getFullYear();
    const result = await getOrCreateSpreadsheetForYear(currentYear);

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
    if (isNaN(year) || year < 2000 || year > 2100) {
      return res.status(400).json({ error: '無効な年度です' });
    }

    const { spreadsheetId } = await getOrCreateSpreadsheetForYear(year);

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
    const { keyword, category, confidence, notes } = req.body;

    if (!keyword || !category) {
      return res.status(400).json({ error: 'キーワードとカテゴリは必須です' });
    }

    const { spreadsheetId } = await getOrCreateSpreadsheetForYear(year);

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
    const ruleId = req.params.id;
    const rowNumber = parseInt(ruleId.split('_')[1]);

    if (isNaN(rowNumber)) {
      return res.status(400).json({ error: '無効なルールIDです' });
    }

    const { spreadsheetId } = await getOrCreateSpreadsheetForYear(year);

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

app.post('/api/expenses', async (req, res) => {
  try {
    const { date, amount, category, memo, receipt_url } = req.body;

    if (!date || !amount || !category) {
      return res.status(400).json({ error: '必須フィールドが不足しています' });
    }

    // Get current year's spreadsheet
    const currentYear = new Date().getFullYear();
    const { spreadsheetId } = await getOrCreateSpreadsheetForYear(currentYear);

    // Append data to sheet
    const values = [[date, amount, category, memo || '', receipt_url || '']];
    const range = 'Expenses!A:E'; // A: date, B: amount, C: category, D: memo, E: receipt_url

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: { values },
    });

    res.json({
      success: true,
      message: '支出データが保存されました',
      data: { date, amount, category, memo, receipt_url }
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

    const { year, month } = req.body;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();
    const currentMonth = month ? parseInt(month) : new Date().getMonth() + 1;

    if (isNaN(currentYear) || currentYear < 2000 || currentYear > 2100) {
      return res.status(400).json({ error: '無効な年度です' });
    }

    if (isNaN(currentMonth) || currentMonth < 1 || currentMonth > 12) {
      return res.status(400).json({ error: '無効な月です' });
    }

    // Get or create folder structure
    const rootFolderId = await getOrCreateExpenseGPTRootFolder();
    const receiptsFolderId = await getOrCreateReceiptsFolder(currentYear, rootFolderId);
    const monthlyFolderId = await getOrCreateMonthlyFolder(currentYear, currentMonth, receiptsFolderId);

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
      monthlyFolderId
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Expense Tracker API Server running on port ${PORT}`);
  console.log(`📊 Google Sheets integration ready`);
});
