process.env.GOOGLE_APPLICATION_CREDENTIALS = '/Users/makiko/Documents/dev/gemini-expense-tracker/gemini-expense-tracker-483604-7a0c4df6eb04.json';

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import vision from '@google-cloud/vision';
import { Readable } from 'stream';
import Busboy from 'busboy';
import jwt from 'jsonwebtoken';
import { userService } from '../services/userService.ts';
import { auditService } from '../services/auditService.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // 10MBに増加（画像対応）

// Google OAuth 2.0 setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Scopes for Google OAuth and API access
const SCOPES = [
  'openid',  // OpenID Connect
  'profile', // User profile information
  'email',   // User email address
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file'
];

// In-memory token storage (in production, use a database)
let userTokens = {};

// DEMO ONLY: Helper to check if user is in demo mode
// TODO: remove demo mode before production
function isDemoUser(userId) {
  return userId === 'demo-user';
}

// Helper function to get user context from request
function getUserContext(req) {
  // Check for demo session
  if (req.session?.isDemo) {
    return { id: 'demo-user', isDemo: true };
  }

  // Check for Bearer token in Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const idToken = authHeader.substring(7);
  try {
    const decoded = jwt.decode(idToken, { complete: true });
    if (!decoded || typeof decoded.payload !== 'object' || !decoded.payload.sub) {
      return null;
    }
    const googleId = decoded.payload.sub;
    return { id: googleId, isDemo: false };
  } catch (error) {
    console.error('Error decoding ID token:', error.message);
    return null;
  }
}

// Helper function to get authenticated Google ID (legacy, for backward compatibility)
function getAuthenticatedGoogleId(req) {
  const userId = req.body.userId || req.query.userId;
  if (!userId || !userTokens[userId]) {
    return null; // Not authenticated
  }
  return userId; // This should be the Google ID (sub) after OAuth
}

// Vision API client (uses Application Default Credentials)
const visionClient = new vision.ImageAnnotatorClient();

// Multer configuration for file uploads
const upload = multer({ storage: multer.memoryStorage() });

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

// Cache for base Gemini_Expenses spreadsheet creation (to prevent duplicate initialization)
const baseSpreadsheetCache = new Map();

// Folder cache for folder IDs (to avoid repeated Drive API calls)
const folderCache = new Map();

// User's selected folder ID (in production, use a database)
const userSelectedFolder = new Map();

// Helper function to search folder by name within parent folder
async function searchFolder(folderName, parentFolderId, userId) {
  const client = await getAuthenticatedClient(userId);
  const drive = google.drive({ version: 'v3', auth: client });

  try {
    // 親フォルダIDがnullの場合はMy Drive直下を検索
    let query;
    if (parentFolderId) {
      query = `name='${folderName}' and '${parentFolderId}' in parents and trashed=false and mimeType='application/vnd.google-apps.folder'`;
    } else {
      // My Drive直下のフォルダを検索（親がない＝root）
      query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false and 'root' in parents`;
    }

    console.log('🔍 検索クエリ:', query);

    const searchResponse = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    console.log('🔍 検索結果:', searchResponse.data.files);

    if (searchResponse.data.files && searchResponse.data.files.length > 0) {
      console.log(`📁 フォルダを発見: ${folderName} (${searchResponse.data.files[0].id})`);
      return searchResponse.data.files[0].id;
    }
    return null;
  } catch (error) {
    console.warn(`⚠️ フォルダ検索エラー (${folderName}): ${error.message}`);
    return null;
  }
}

// Helper function to create folder
async function createFolder(folderName, parentFolderId, userId) {
  const client = await getAuthenticatedClient(userId);
  const drive = google.drive({ version: 'v3', auth: client });

  const folderMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentFolderId],
  };

  try {
    const response = await drive.files.create({
      resource: folderMetadata,
      fields: 'id',
    });
    console.log(`📁 フォルダを作成: ${folderName} (${response.data.id})`);
    return response.data.id;
  } catch (error) {
    console.error(`❌ フォルダ作成エラー (${folderName}):`, error);
    throw error;
  }
}

// Helper function to get Gemini Expense Tracker root folder (returns array for conflict detection)
async function getGeminiExpenseTrackerRootFolderInfo(userId) {
  const folderName = 'Gemini Expense Tracker';
  
  const client = await getAuthenticatedClient(userId);
  const drive = google.drive({ version: 'v3', auth: client });

  // My Drive直下のフォルダを検索
  const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false and 'root' in parents`;
  
  const searchResponse = await drive.files.list({
    q: query,
    fields: 'files(id, name, createdTime)',
    spaces: 'drive'
  });

  const files = searchResponse.data.files || [];
  
  if (files.length > 0) {
    return files.map(f => ({
      id: f.id,
      name: f.name,
      createdTime: f.createdTime
    }));
  }
  
  return [];
}

// Helper function to get or create Gemini Expense Tracker root folder
// Returns: string (folderId) if single folder exists, or object with conflict info
async function getOrCreateGeminiExpenseTrackerRootFolder(userId) {
  const folderName = 'Gemini Expense Tracker';
  
  // ユーザーが選択したフォルダIDがあれば、それを優先使用
  const selectedFolderId = userSelectedFolder.get(userId);
  if (selectedFolderId) {
    console.log(`📁 ユーザーが選択したフォルダを使用: ${selectedFolderId}`);
    return selectedFolderId;
  }
  
  // 名前で検索（My Drive直下のみ）
  const client = await getAuthenticatedClient(userId);
  const drive = google.drive({ version: 'v3', auth: client });

  // My Drive直下のフォルダを検索
  const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false and 'root' in parents`;
  
  const searchResponse = await drive.files.list({
    q: query,
    fields: 'files(id, name, createdTime)',
    spaces: 'drive'
  });

  const files = searchResponse.data.files || [];
  
  if (files.length > 1) {
    // 複数同名フォルダがある場合は競合情報を返す
    const duplicateFolders = files.map(f => ({
      id: f.id,
      name: f.name,
      createdTime: f.createdTime
    }));
    
    console.warn(`⚠️ 警告: 「${folderName}」名が付けられたフォルダが${files.length}個見つかりました`);
    
    return {
      isFolderAmbiguous: true,
      folderConflict: {
        duplicateFolders: duplicateFolders,
        message: '複数の「Gemini Expense Tracker」フォルダが見つかりました'
      }
    };
  }
  
  if (files.length > 0) {
    console.log(`📁 フォルダを発見: ${folderName} (${files[0].id})`);
    return files[0].id;
  }
  
  // ないなら作成
  console.log(`📁 「${folderName}」フォルダが見つからないため作成します`);
  return await createFolder(folderName, null, userId);
}

// Helper function to get or create receipts folder
async function getOrCreateReceiptsFolder(year, rootFolderId, userId) {
  const folderName = 'Receipts';
  
  // rootFolderId 配下のみ検索（Gemini Expense Tracker 直下）
  const existingId = await searchFolder(folderName, rootFolderId, userId);
  
  if (existingId) {
    return existingId;
  }
  
  // ないなら rootFolderId 配下に作成
  return await createFolder(folderName, rootFolderId, userId);
}

// Helper function to get or create monthly folder
async function getOrCreateMonthlyFolder(year, month, receiptsFolderId, userId) {
  const folderName = `${year}-${String(month).padStart(2, '0')}`;
  
  // 名前で検索
  const existingId = await searchFolder(folderName, receiptsFolderId, userId);
  if (existingId) {
    return existingId;
  }
  
  // ないなら作成
  return await createFolder(folderName, receiptsFolderId, userId);
}

// Helper function to upload file to Google Drive
// Readable stream を使用して Drive API にアップロード
async function uploadFileToDrive(fileBuffer, fileName, mimeType, parentFolderId, userId) {
  const client = await getAuthenticatedClient(userId);
  const drive = google.drive({ version: 'v3', auth: client });

  console.log(`📦 アップロード開始: ${fileName}, ${mimeType}, buffer=${Buffer.isBuffer(fileBuffer)}`);

  // Buffer を Readable stream に変換
  const fileStream = Readable.from(fileBuffer);

  const fileMetadata = {
    name: fileName,
    parents: [parentFolderId],
  };

  // Readable stream を Drive API に渡す
  const media = {
    mimeType: mimeType,
    body: fileStream,
  };

  console.log('📤 Google Drive APIにアップロード中...');

  try {
    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id,webViewLink',
    });

    console.log('✅ Driveアップロード成功:', response.data.id);
    return {
      fileId: response.data.id,
      webViewLink: response.data.webViewLink,
    };
  } catch (error) {
    console.error('❌ Google Drive APIエラー:', error.message);
    if (error.response) {
      console.error('   レスポンスデータ:', JSON.stringify(error.response.data));
    }
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
    // Cache が文字列（フォルダID）の場合は何もしない、通常のキャッシュはオブジェクト
    if (typeof cached === 'string') {
      console.log(`📋 キャッシュから${year}年度スプレッドシートを取得:`, cached);
      return cached;
    }
    console.log(`📋 キャッシュから${year}年度スプレッドシートを取得:`, cached.spreadsheetId);
    return cached;
  }

  try {
    // Gemini Expense Tracker フォルダ配下を確認
    const folderResult = await getOrCreateGeminiExpenseTrackerRootFolder(userId);
    
    // 競合情報が返された場合は、エラーをスローして上位で処理
    if (typeof folderResult === 'object' && folderResult.isFolderAmbiguous) {
      console.warn('⚠️ フォルダ名の重複を検出しました');
      throw {
        isFolderAmbiguous: true,
        folderConflict: folderResult.folderConflict,
        message: '複数の「Gemini Expense Tracker」フォルダが見つかりました'
      };
    }
    
    const rootFolderId = folderResult;
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

      // 既存スプレッドシートのシート構成を確認・修正
      try {
        await ensureSheetsExist(spreadsheetId, year, userId);
      } catch (ensureError) {
        console.warn(`⚠️ シート構成確認エラー（既存スプレッドシート）:`, ensureError.message);
        // エラーが発生しても続行（シートは後で作成される）
      }
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
                columnCount: 6,
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

// Helper function to ensure required sheets exist in existing spreadsheet
async function ensureSheetsExist(spreadsheetId, year, userId) {
  const client = await getAuthenticatedClient(userId);
  const sheets = google.sheets({ version: 'v4', auth: client });

  try {
    // Get current sheets in the spreadsheet
    const spreadsheetResponse = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties'
    });

    const existingSheets = spreadsheetResponse.data.sheets || [];
    const existingSheetTitles = existingSheets.map(s => s.properties?.title);

    console.log(`📊 既存シート確認: ${existingSheetTitles.join(', ')}`);

    const requiredSheets = ['Expenses', 'Income', 'Rules'];
    const missingSheets = requiredSheets.filter(title => !existingSheetTitles.includes(title));

    if (missingSheets.length === 0) {
      console.log('✅ すべての必要なシートが存在します');
      return;
    }

    console.log(`⚠️ 不足しているシート: ${missingSheets.join(', ')} - 追加します`);

    // Add missing sheets
    const addSheetRequests = missingSheets.map(title => {
      let gridProperties = {};
      if (title === 'Income') {
        gridProperties = { rowCount: 10000, columnCount: 6 };
      } else if (title === 'Expenses') {
        gridProperties = { rowCount: 10000, columnCount: 5 };
      } else if (title === 'Summary') {
        gridProperties = { rowCount: 150, columnCount: 12 };
      } else if (title === 'Rules') {
        gridProperties = { rowCount: 1000, columnCount: 4 };
      }

      return {
        addSheet: {
          properties: {
            title,
            sheetType: 'GRID',
            gridProperties
          }
        }
      };
    });

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: { requests: addSheetRequests }
    });

    console.log(`✅ 不足していたシートを追加しました: ${missingSheets.join(', ')}`);

    // Initialize the newly added sheets
    await initializeSheets(spreadsheetId, year, userId);

  } catch (error) {
    console.error('シート構成確認エラー:', error);
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
    const incomeHeaders = [['日付', '金額', '支払者名', '源泉徴収税額', 'メモ', 'レシートURL']];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Income!A1:F1',
      valueInputOption: 'RAW',
      resource: { values: incomeHeaders },
    });

    console.log(`📊 ${year}年度Expenses & Incomeシート初期化完了`);

    // Summary sheet is no longer initialized - using Firestore as single source of truth
    console.log(`📊 ${year}年度スプレッドシート初期化完了（Summaryシートは使用せず）`);

    // Initialize Rules sheet with headers and sample data
    const rulesHeaders = [['Keyword', 'Category', 'Notes']];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Rules!A1:C1',
      valueInputOption: 'RAW',
      resource: { values: rulesHeaders },
    });

    // Rules data - minimal example
    const sampleRules = [
      ['Amazon', '消耗品費', 'オンラインショッピング'],
      ['Slack', '通信費', 'サブスクリプション'],
    ];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Rules!A2:C3',
      valueInputOption: 'RAW',
      resource: { values: sampleRules },
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
    const userId = getAuthenticatedGoogleId(req);
    if (!userId) {
      return res.status(401).json({ error: '認証が必要です' });
    }
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

// Global initialization lock to prevent concurrent spreadsheet creation
let initializationLock = null;

// Helper function to create or update spreadsheet with year-specific tabs
async function createOrUpdateSpreadsheetWithYearTabs(parentFolderId, year, userId) {
  const baseSpreadsheetName = 'Gemini_Expenses';
  const cacheKey = `${userId}_${parentFolderId}`;

  // Check cache first - if we have a cached result, use it
  if (baseSpreadsheetCache.has(cacheKey)) {
    const cached = baseSpreadsheetCache.get(cacheKey);
    console.log(`📋 キャッシュから${baseSpreadsheetName}スプレッドシートを取得: ${cached.spreadsheetId}`);

    // Ensure year-specific tabs exist even if cached
    await addYearSpecificTabs(cached.spreadsheetId, year, userId);

    return cached;
  }

  // Check if initialization is already in progress
  if (initializationLock === cacheKey) {
    console.log(`⏳ 初期化が進行中です、完了を待っています: ${cacheKey}`);

    // Wait for the lock to be released (simple polling)
    while (initializationLock === cacheKey) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Now check cache again
    if (baseSpreadsheetCache.has(cacheKey)) {
      const cached = baseSpreadsheetCache.get(cacheKey);

      // Ensure year-specific tabs exist even if cached
      await addYearSpecificTabs(cached.spreadsheetId, year, userId);

      return cached;
    }
  }

  // Acquire lock
  initializationLock = cacheKey;

  try {
    const client = await getAuthenticatedClient(userId);
    const sheets = google.sheets({ version: 'v4', auth: client });
    const drive = google.drive({ version: 'v3', auth: client });

    // Step 1: 既存の "Gemini_Expenses" スプレッドシートを検索
    // クエリ構築: parentFolderIdがnullの場合は親フォルダ条件を除外
    let searchQuery = `name='${baseSpreadsheetName}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;

    if (parentFolderId) {
      searchQuery += ` and '${parentFolderId}' in parents`;
    }

    console.log(`🔍 既存スプレッドシート検索: ${searchQuery}`);

    const searchResponse = await drive.files.list({
      q: searchQuery,
      fields: 'files(id, name)',
    });

    let spreadsheetId;
    let isNew = false;

    if (searchResponse.data.files && searchResponse.data.files.length > 0) {
      // 既存スプレッドシートが見つかった場合
      spreadsheetId = searchResponse.data.files[0].id;
      console.log(`📊 ✅ 既存の${baseSpreadsheetName}スプレッドシートを見つけました: ${spreadsheetId}`);

      // 年別タブを追加
      await addYearSpecificTabs(spreadsheetId, year, userId);
    } else {
      // 新規スプレッドシート作成
      console.log(`📊 ⚠️ ${baseSpreadsheetName}スプレッドシートが見つからないため新規作成します`);

      const createResponse = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: baseSpreadsheetName,
          },
          sheets: [
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
      console.log(`📊 🆕 新しい${baseSpreadsheetName}スプレッドシートを作成しました: ${spreadsheetId}`);

      // 作成したスプレッドシートをルートフォルダに移動（parentFolderIdがあれば）
      if (parentFolderId) {
        await moveFileToParent(spreadsheetId, parentFolderId, userId);
        console.log(`📁 スプレッドシートをルートフォルダに移動しました: ${parentFolderId}`);
      } else {
        console.log(`📁 parentFolderIdがnullのため、フォルダ移動をスキップします`);
      }

      // Rules シート初期化
      await initializeRulesSheet(spreadsheetId, userId);

      // 年別タブを追加
      await addYearSpecificTabs(spreadsheetId, year, userId);
    }

    const result = {
      spreadsheetId,
      spreadsheetName: baseSpreadsheetName,
      isNew
    };

    // Cache the result
    baseSpreadsheetCache.set(cacheKey, result);

    return result;

  } catch (error) {
    console.error('スプレッドシート作成/更新エラー:', error);
    throw error;
  } finally {
    // Release lock
    if (initializationLock === cacheKey) {
      initializationLock = null;
    }
  }
}

// Helper function to add year-specific tabs to existing spreadsheet
async function addYearSpecificTabs(spreadsheetId, year, userId) {
  const client = await getAuthenticatedClient(userId);
  const sheets = google.sheets({ version: 'v4', auth: client });

  try {
    // 現在のシート構成を確認
    const spreadsheetResponse = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties'
    });

    const existingSheets = spreadsheetResponse.data.sheets || [];
    const existingSheetTitles = existingSheets.map(s => s.properties?.title);

    console.log(`📊 既存シート確認: ${existingSheetTitles.join(', ')}`);

    const yearExpenseTabName = `${year}_Expenses`;
    const yearIncomeTabName = `${year}_Income`;

    // 追加が必要なタブをチェック
    const tabsToAdd = [];

    if (!existingSheetTitles.includes(yearExpenseTabName)) {
      tabsToAdd.push({
        properties: {
          title: yearExpenseTabName,
          sheetType: 'GRID',
          gridProperties: {
            rowCount: 10000,
            columnCount: 5,
          },
        },
      });
    }

    if (!existingSheetTitles.includes(yearIncomeTabName)) {
      tabsToAdd.push({
        properties: {
          title: yearIncomeTabName,
          sheetType: 'GRID',
          gridProperties: {
            rowCount: 10000,
            columnCount: 6,
          },
        },
      });
    }

    if (tabsToAdd.length === 0) {
      console.log(`✅ ${year}年度のタブは既に存在します`);
      return;
    }

    // 新しいタブを追加
    const addSheetRequests = tabsToAdd.map(tab => ({
      addSheet: {
        properties: tab.properties
      }
    }));

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: { requests: addSheetRequests }
    });

    console.log(`✅ ${year}年度のタブを追加しました: ${tabsToAdd.map(t => t.properties.title).join(', ')}`);

    // 年別タブの初期化
    await initializeYearSpecificSheets(spreadsheetId, year, userId);

  } catch (error) {
    console.error('年別タブ追加エラー:', error);
    throw error;
  }
}

// Helper function to initialize Rules sheet only
async function initializeRulesSheet(spreadsheetId, userId) {
  const client = await getAuthenticatedClient(userId);
  const sheets = google.sheets({ version: 'v4', auth: client });

  try {
    // Initialize Rules sheet with headers and sample data
    const rulesHeaders = [['Keyword', 'Category', 'Notes']];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Rules!A1:C1',
      valueInputOption: 'RAW',
      resource: { values: rulesHeaders },
    });

    // Rules data - minimal example
    const sampleRules = [
      ['Amazon', '消耗品費', 'オンラインショッピング'],
      ['Slack', '通信費', 'サブスクリプション'],
    ];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Rules!A2:C3',
      valueInputOption: 'RAW',
      resource: { values: sampleRules },
    });

    console.log(`📊 Rulesシート初期化完了`);
  } catch (error) {
    console.error('Rulesシート初期化エラー:', error);
    throw error;
  }
}

// Helper function to initialize year-specific sheets
async function initializeYearSpecificSheets(spreadsheetId, year, userId) {
  const client = await getAuthenticatedClient(userId);
  const sheets = google.sheets({ version: 'v4', auth: client });

  try {
    const yearExpenseTabName = `${year}_Expenses`;
    const yearIncomeTabName = `${year}_Income`;

    // Initialize year-specific Expenses sheet with headers
    const expensesHeaders = [['日付', '金額', 'カテゴリ', 'メモ', 'レシートURL']];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${yearExpenseTabName}!A1:E1`,
      valueInputOption: 'RAW',
      resource: { values: expensesHeaders },
    });

    // Initialize year-specific Income sheet with headers
    const incomeHeaders = [['日付', '金額', '支払者名', '源泉徴収税額', 'メモ', 'レシートURL']];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${yearIncomeTabName}!A1:F1`,
      valueInputOption: 'RAW',
      resource: { values: incomeHeaders },
    });

    console.log(`📊 ${year}年度のExpenses & Incomeタブ初期化完了`);
  } catch (error) {
    console.error('年別タブ初期化エラー:', error);
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
    // 認証: Bearer IDトークンがあればそれを優先（googleId=sub を userId として扱う）
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.decode(token, { complete: true });
      if (decoded && decoded.payload && decoded.payload.sub) {
        userId = decoded.payload.sub;
      }
    }
    if (!userId) {
      userId = getAuthenticatedGoogleId(req);
    }
    if (!userId) {
      return res.status(401).json({ error: '認証が必要です' });
    }
    // クエリパラメータで年を指定可能（テスト用）
    const queryYear = req.query.year ? parseInt(req.query.year) : null;
    const currentYear = queryYear && !isNaN(queryYear) ? queryYear : new Date().getFullYear();
    const spreadsheetName = `${currentYear}_Expenses`;

    console.log(`🔄 Gemini Expense Tracker システム初期化を開始... (年: ${currentYear})`);

    // Step 1: searchOrCreateFolder('Gemini Expense Tracker', null) → rootFolderId 確保
    console.log('1️⃣ Step 1: ルートフォルダ作成');
    const rootFolder = await searchOrCreateFolder('Gemini Expense Tracker', null, userId);
    console.log(`✅ Step 1 完了: rootFolderId = ${rootFolder.id}`);

    // Step 2: createOrUpdateSpreadsheetWithYearTabs(rootFolderId, currentYear) → スプレッドシート作成/更新 & 年別タブ追加
    console.log('2️⃣ Step 2: スプレッドシート作成/更新');
    const spreadsheetResult = await createOrUpdateSpreadsheetWithYearTabs(rootFolder.id, currentYear, userId);
    console.log(`✅ Step 2 完了: spreadsheetId = ${spreadsheetResult.spreadsheetId}`);

    // Step 3: createFolder('Receipts', rootFolderId) → Receipts フォルダ作成 & 月別フォルダ生成
    console.log('3️⃣ Step 3: Receiptsフォルダ構造作成');
    const receiptsStructure = await createReceiptsStructure(rootFolder.id, currentYear, userId);
    console.log(`✅ Step 3 完了: receiptsFolderId = ${receiptsStructure.receiptsFolderId}`);

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

    // Get the actual Rules sheet gid
    const client = await getAuthenticatedClient(userId);
    const sheets = google.sheets({ version: 'v4', auth: client });
    
    const metadataResponse = await sheets.spreadsheets.get({
      spreadsheetId: result.spreadsheetId,
      fields: 'sheets.properties'
    });
    
    const rulesSheet = metadataResponse.data.sheets?.find(
      s => s.properties?.title === 'Rules'
    );
    const rulesSheetGid = rulesSheet?.properties?.sheetId;

    res.json({
      spreadsheetId: result.spreadsheetId,
      spreadsheetName: result.spreadsheetName,
      rulesSheetGid: rulesSheetGid !== undefined ? rulesSheetGid : 3
    });

  } catch (error) {
    console.error('Get Spreadsheet ID Error:', error);
    res.status(500).json({
      error: 'スプレッドシートIDの取得に失敗しました',
      details: error.message
    });
  }
});

app.get('/api/rules', async (req, res) => {
  try {
    const userId = req.query.userId || 'test-user';
    const year = parseInt(req.query.year) || new Date().getFullYear();

    // Get the base Gemini_Expenses spreadsheet (rules are shared across all years)
    const rootFolderId = await getOrCreateGeminiExpenseTrackerRootFolder(userId);
    const { spreadsheetId } = await createOrUpdateSpreadsheetWithYearTabs(rootFolderId, year, userId);

    const client = await getAuthenticatedClient(userId);
    const sheets = google.sheets({ version: 'v4', auth: client });

    // Rules シートから全ルールを取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Rules!A2:C',
    });

    const rows = response.data.values || [];
    const rules = rows.map((row, index) => ({
      id: `rule_${index + 2}`,
      keyword: row[0] || '',
      category: row[1] || '',
      notes: row[2] || '',
    }));

    res.json({
      success: true,
      rules,
      count: rules.length
    });
  } catch (error) {
    console.error('Get Rules Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
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
      range: 'Rules!A2:C',
    });

    const rows = response.data.values || [];
    const rules = rows.map((row, index) => ({
      id: `${year}_${index + 2}`, // Row number as ID
      keyword: row[0] || '',
      category: row[1] || '',
      notes: row[2] || '',
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
    const { keyword, category, notes } = req.body;

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
    const newRule = [[keyword, category, notes || '']];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Rules!A${nextRow}:C${nextRow}`,
      valueInputOption: 'RAW',
      resource: { values: newRule },
    });

    const rule = {
      id: `${year}_${nextRow}`,
      keyword,
      category,
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
      range: `Rules!A${rowNumber}:C${rowNumber}`,
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

    // Check for folder conflicts first
    const folderResult = await getOrCreateGeminiExpenseTrackerRootFolder(userId);

    // Check if result is a conflict info object
    if (typeof folderResult === 'object' && folderResult.isFolderAmbiguous === true) {
      console.log('📁 フォルダ競合を検出 - 早期リターン');
      return res.json({
        expenses: [],
        isFolderAmbiguous: true,
        folderConflict: folderResult.folderConflict
      });
    }

    // folderResult is a folder ID (string)
    const rootFolderId = folderResult;
    console.log(`🔍 ルートフォルダID: ${rootFolderId}`);

    // Get or create the base Gemini_Expenses spreadsheet with year-specific tabs
    const { spreadsheetId } = await createOrUpdateSpreadsheetWithYearTabs(rootFolderId, year, userId);
    const client = await getAuthenticatedClient(userId);
    const sheets = google.sheets({ version: 'v4', auth: client });

    // Get all data from year-specific Expenses tab
    const yearExpenseTabName = `${year}_Expenses`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${yearExpenseTabName}!A2:E`,
    });

    const rows = response.data.values || [];
    console.log(`📊 /api/expenses ${year}年度 ${yearExpenseTabName} 取得データ:`);
    console.log('  行数:', rows.length);
    if (rows.length > 0) {
      console.log('  1行目:', rows[0]);
      console.log('  receiptUrl (row[4]):', rows[0]?.[4] || '(なし)');
    }

    const expenses = rows.map((row, index) => {
      const id = `${year}exp-${index + 2}`;
      console.log(`Generated expense ID: ${id} | date: ${row[0]}`);
      return {
        id,
        date: row[0] || '',
        amount: parseFloat(row[1]) || 0,
        category: row[2] || '',
        memo: row[3] || '',
        receiptUrl: row[4] || '',
        type: 'expense',
        createdAt: Date.now()
      };
    });

    // Debug log
    console.log('📊 /api/expenses 最終レスポンス:', {
      expensesCount: expenses.length,
      isFolderAmbiguous: false,
      hasConflict: false
    });

    console.log('Sample IDs:', expenses.slice(0, 3).map(e => e.id));
    res.json({
      expenses,
      isFolderAmbiguous: false,
      folderConflict: null
    });

  } catch (error) {
    console.error('Get Expenses Error:', error);
    // Check if it's a folder conflict error
    if (error.isFolderAmbiguous) {
      return res.json({
        expenses: [],
        isFolderAmbiguous: true,
        folderConflict: error.folderConflict
      });
    }
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

    // Check for folder conflicts first
    const folderResult = await getOrCreateGeminiExpenseTrackerRootFolder(userId);

    // Check if result is a conflict info object
    if (typeof folderResult === 'object' && folderResult.isFolderAmbiguous === true) {
      console.log('📁 フォルダ競合を検出 - 早期リターン');
      return res.json({
        income: [],
        isFolderAmbiguous: true,
        folderConflict: folderResult.folderConflict
      });
    }

    // folderResult is a folder ID (string)
    const rootFolderId = folderResult;
    console.log(`🔍 ルートフォルダID: ${rootFolderId}`);

    // Get or create the base Gemini_Expenses spreadsheet with year-specific tabs
    const { spreadsheetId } = await createOrUpdateSpreadsheetWithYearTabs(rootFolderId, year, userId);
    const client = await getAuthenticatedClient(userId);
    const sheets = google.sheets({ version: 'v4', auth: client });

    // Get all data from year-specific Income tab
    const yearIncomeTabName = `${year}_Income`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${yearIncomeTabName}!A2:F`,
    });

    const rows = response.data.values || [];
    console.log(`📊 /api/income ${year}年度 ${yearIncomeTabName} 取得データ:`);
    console.log('  行数:', rows.length);
    if (rows.length > 0) {
      console.log('  1行目:', rows[0]);
      console.log('  receiptUrl (row[5]):', rows[0]?.[5] || '(なし)');
    }

    // Income データの正規化（バグ防止策）
    const normalizedRows = rows.map(row => {
      // row が配列かオブジェクトかを吸収
      if (Array.isArray(row)) {
        return {
          date: row[0],
          amount: Number(row[1] || 0),
          payerName: row[2]?.trim() || '',
          withholding: Number(row[3] || 0),
          memo: row[4] || '',
          receiptUrl: row[5] || ''
        };
      }

      // すでにオブジェクト化されてるケース
      return {
        date: row.date,
        amount: Number(row.amount || 0),
        payerName: row.payerName?.trim() || '',
        withholding: Number(row.withholding || 0),
        memo: row.memo || '',
        receiptUrl: row.receiptUrl || ''
      };
    });

    const income = normalizedRows.map((row, index) => {
      let { payerName } = row;
      // 支払人が空の場合のみ "未設定" と表示
      if (!payerName) payerName = '未設定';

      return {
        id: `${year}inc-${index + 2}`,
        date: row.date,
        amount: row.amount,
        payerName: payerName,
        withholding: row.withholding,
        memo: row.memo,
        receiptUrl: row.receiptUrl,
        type: 'income',
        createdAt: Date.now()
      };
    });

    console.log('📊 /api/income 最終レスポンス:', {
      incomeCount: income.length,
      isFolderAmbiguous: false,
      hasConflict: false
    });

    // APIレスポンス直前にログ出力
    console.log("🧾 income API sample:", income[0]);

    res.json({
      income,
      isFolderAmbiguous: false,
      folderConflict: null
    });

  } catch (error) {
    console.error('Get Income Error:', error);
    // Check if it's a folder conflict error
    if (error.isFolderAmbiguous) {
      return res.json({
        income: [],
        isFolderAmbiguous: true,
        folderConflict: error.folderConflict
      });
    }
    res.status(500).json({
      error: '売上データの取得に失敗しました',
      details: error.message
    });
  }
});

// Update transaction endpoint
app.post('/api/update-transaction', async (req, res) => {
  try {
    const userId = req.body.userId || 'test-user';
    const { id, date, amount, category, memo, receiptUrl, type } = req.body;
    console.log('ID:', id);

    if (!id || !date || !amount || !category) {
      return res.status(400).json({ error: '必須フィールドが不足しています' });
    }

    // Determine tab based on type and year
    const currentYear = new Date(date).getFullYear();
    const tabName = type === 'income' ? `${currentYear}_Income` : `${currentYear}_Expenses`;

    // Get the base Gemini_Expenses spreadsheet
    const rootFolderId = await getOrCreateGeminiExpenseTrackerRootFolder(userId);
    const { spreadsheetId } = await createOrUpdateSpreadsheetWithYearTabs(rootFolderId, currentYear, userId);

    const client = await getAuthenticatedClient(userId);
    const sheets = google.sheets({ version: 'v4', auth: client });

    // IDから行番号を抽出（新しい形式 "2026inc-5" または古い形式 "inc_5" に対応）
    let rowNumber;
    if (id.includes('-')) {
      // 新しい形式: "2026inc-5" → "5"
      rowNumber = parseInt(id.split('-')[1]);
    } else {
      // 古い形式: "inc_5" → "5"
      rowNumber = parseInt(id.split('_')[1]);
    }
    console.log('Row Number:', rowNumber);
    if (isNaN(rowNumber)) {
      return res.status(400).json({ error: '無効なIDです' });
    }

    const range = `${tabName}!A${rowNumber}:${type === 'income' ? 'F' : 'E'}${rowNumber}`;

    // 更新する値
    let values;
    if (type === 'income') {
      // Income tab: A: date, B: amount, C: payerName, D: withholdingTax, E: memo, F: receipt_url
      values = [[date, amount, '', 0, memo || '', receiptUrl || '']]; // payerName and withholdingTax not handled in update
    } else {
      // Expenses tab: A: date, B: amount, C: category, D: memo, E: receipt_url
      values = [[date, amount, category, memo || '', receiptUrl || '']];
    }

    console.log(`🔄 トランザクション更新: ${tabName}!${range}`, values);

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: { values },
    });

    console.log(`✅ トランザクション更新成功: ${id}`);

    res.json({
      success: true,
      message: 'データを更新しました',
      id: id,
      updated: { date, amount, category, memo, receiptUrl }
    });

  } catch (error) {
    console.error('Update Transaction Error:', error);
    res.status(500).json({
      error: 'データの更新に失敗しました',
      details: error.message
    });
  }
});

// POST new expense/income
app.post('/api/expenses', async (req, res) => {
  try {
    const userId = req.body.userId || 'test-user';
    const { date, amount, category, memo, receipt_url, type, payerName, withholdingTax } = req.body;

    if (!date || !amount || !category) {
      return res.status(400).json({ error: '必須フィールドが不足しています' });
    }

    // Determine tab based on type and year
    const transactionYear = new Date(date).getFullYear();
    const tabName = type === 'income' ? `${transactionYear}_Income` : `${transactionYear}_Expenses`;
    const message = type === 'income' ? '収入データが保存されました' : '支出データが保存されました';

    // Get the base Gemini_Expenses spreadsheet and ensure year-specific tabs exist
    console.log(`💾 データを保存しようとしています: 年=${transactionYear}, type=${type}, category=${category}`);
    const rootFolderId = await getOrCreateGeminiExpenseTrackerRootFolder(userId);
    const { spreadsheetId } = await createOrUpdateSpreadsheetWithYearTabs(rootFolderId, transactionYear, userId);
    console.log(`💾 スプレッドシートID取得: ${spreadsheetId}, タブ: ${tabName}`);

    const client = await getAuthenticatedClient(userId);
    const sheets = google.sheets({ version: 'v4', auth: client });

    // Append data to appropriate year-specific tab
    let values, range;
    if (type === 'income') {
      // Income tab: A: date, B: amount, C: payerName, D: withholdingTax, E: memo, F: receipt_url
      values = [[date, amount, payerName || '', withholdingTax || 0, memo || '', receipt_url || '']];
      range = `${tabName}!A:F`;
    } else {
      // Expenses tab: A: date, B: amount, C: category, D: memo, E: receipt_url
      values = [[date, amount, category, memo || '', receipt_url || '']];
      range = `${tabName}!A:E`;
    }

    console.log(`💾 タブ"${tabName}"にデータを追加: ${JSON.stringify(values)}`);
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
      // Extract row number from range like "2026_Expenses!A123:E123" or "2026_Income!A123:F123"
      const match = updatedRange.match(/!A(\d+):[EF]\d+/);
      if (match) {
        rowNumber = parseInt(match[1]);
      }
    }

    console.log(`💾 ${type === 'income' ? '収入' : '支出'}データを保存: ${category} - ¥${amount} (${rowNumber ? `行${rowNumber}` : ''})`);

    // Generate proper ID format (2026exp-5 or 2026inc-5)
    // If row number extraction fails, use timestamp as fallback to ensure uniqueness
    const idPrefix = type === 'income' ? 'inc' : 'exp';
    const generatedId = rowNumber
      ? `${transactionYear}${idPrefix}-${rowNumber}`
      : `${transactionYear}${idPrefix}-${Date.now()}`;

    console.log(`💾 Generated ID: ${generatedId}`);

    res.json({
      success: true,
      message: message,
      id: generatedId,
      rowNumber: rowNumber,
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

// POST new rule
app.post('/api/rules', async (req, res) => {
  try {
    const { keyword, category, notes, userId } = req.body;

    // バリデーション
    if (!keyword || !category) {
      return res.status(400).json({ error: 'キーワードとカテゴリは必須です' });
    }

    // Get the base Gemini_Expenses spreadsheet
    const rootFolderId = await getOrCreateGeminiExpenseTrackerRootFolder(userId);
    const { spreadsheetId } = await createOrUpdateSpreadsheetWithYearTabs(rootFolderId, new Date().getFullYear(), userId);

    const client = await getAuthenticatedClient(userId);
    const sheets = google.sheets({ version: 'v4', auth: client });

    // Get current rules to find next empty row
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Rules!A:A',
    });

    const nextRow = (response.data.values || []).length + 1;

    // Add new rule without confidence field
    const newRule = [[keyword, category, notes || '']];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Rules!A${nextRow}:C${nextRow}`,
      valueInputOption: 'RAW',
      resource: { values: newRule },
    });

    const rule = {
      id: crypto.randomUUID(),
      keyword,
      category,
      notes: notes || '',
    };

    res.json({
      success: true,
      id: rule.id,
      rule
    });

  } catch (error) {
    console.error('Rule save error:', error);
    res.status(500).json({
      error: 'ルールの保存に失敗しました',
      details: error.message
    });
  }
});

// Receipt upload endpoint - using Busboy for streaming
app.post('/api/upload-receipt', async (req, res) => {
  try {
    const userId = req.query.userId || 'test-user';
    const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();
    const month = req.query.month ? parseInt(req.query.month) : new Date().getMonth() + 1;

    if (isNaN(year) || year < 2000 || year > 2100) {
      return res.status(400).json({ error: '無効な年度です' });
    }

    if (isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: '無効な月です' });
    }

    // Busboyでストリーム処理
    const busboy = Busboy({ headers: req.headers });
    let fileBuffer = null;
    let fileName = '';
    let fileMimetype = '';
    let receivedUserId = userId;

    busboy.on('file', (fieldname, file, info) => {
      const chunks = [];
      file.on('data', (data) => chunks.push(data));
      file.on('end', () => {
        fileBuffer = Buffer.concat(chunks);
        fileName = info.filename || `receipt_${Date.now()}.jpg`;
        fileMimetype = info.mimeType || 'image/jpeg';
        console.log(`📦 ファイル受信完了: ${fileName}, ${fileBuffer.length} bytes`);
      });
    });

    busboy.on('field', (fieldname, value) => {
      if (fieldname === 'userId') {
        receivedUserId = value;
      }
      console.log(`📝 フィールド: ${fieldname} = ${value}`);
    });

    busboy.on('finish', async () => {
      if (!fileBuffer || fileBuffer.length === 0) {
        return res.status(400).json({ error: 'ファイルがアップロードされていません' });
      }

      console.log(`📤 Driveアップロード開始: userId=${receivedUserId}, year=${year}, month=${month}`);

      // Get or create folder structure
      const rootFolderId = await getOrCreateGeminiExpenseTrackerRootFolder(receivedUserId);
      const receiptsFolderId = await getOrCreateReceiptsFolder(year, rootFolderId, receivedUserId);
      const monthlyFolderId = await getOrCreateMonthlyFolder(year, month, receiptsFolderId, receivedUserId);

      // Generate unique filename
      const timestamp = Date.now();
      const extension = fileName.split('.').pop() || 'jpg';
      const uniqueFileName = `receipt_${timestamp}.${extension}`;

      // Upload file to Google Drive
      const uploadResult = await uploadFileToDrive(
        fileBuffer,
        uniqueFileName,
        fileMimetype,
        monthlyFolderId,
        receivedUserId
      );

      console.log(`✅ レシートをアップロードしました: ${uniqueFileName}`);

      res.json({
        success: true,
        message: 'レシートをアップロードしました',
        fileName: uniqueFileName,
        fileId: uploadResult.fileId,
        webViewLink: uploadResult.webViewLink,
        folderPath: `${year}-${month.toString().padStart(2, '0')}`
      });
    });

    req.pipe(busboy);

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
  res.json({
    success: true,
    message: 'configManagerは削除されました。名前でフォルダを検索してください。'
  });
});

// Check for folder conflicts (duplicate Gemini Expense Tracker folders)
app.get('/api/config/folder-conflict', async (req, res) => {
  try {
    const userId = req.query.userId || 'test-user';
    const folders = await getGeminiExpenseTrackerRootFolderInfo(userId);
    
    if (folders.length > 1) {
      res.json({
        isFolderAmbiguous: true,
        folderConflict: {
          duplicateFolders: folders,
          message: '複数の「Gemini Expense Tracker」フォルダが見つかりました'
        }
      });
    } else {
      res.json({
        isFolderAmbiguous: false,
        folderConflict: null
      });
    }
  } catch (error) {
    console.error('Folder Conflict Check Error:', error);
    res.status(500).json({
      error: 'フォルダ競合の確認に失敗しました',
      details: error.message
    });
  }
});

// Clear folder and spreadsheet caches (called after folder rename)
app.post('/api/clear-folder-cache', async (req, res) => {
  try {
    const userId = req.body.userId || 'test-user';
    
    // Clear caches
    spreadsheetCache.clear();
    folderCache.clear();
    
    console.log(`🧹 ユーザー ${userId} のキャッシュをクリアしました`);
    
    res.json({
      success: true,
      message: 'キャッシュをクリアしました'
    });
  } catch (error) {
    console.error('Clear Cache Error:', error);
    res.status(500).json({
      error: 'キャッシュのクリアに失敗しました',
      details: error.message
    });
  }
});

// Check for folder conflicts immediately after auth (dedicated endpoint for fast checking)
app.get('/api/check-folder-conflict', async (req, res) => {
  try {
    const userId = req.query.userId || 'test-user';
    
    // Check if user has already selected a folder - if so, no conflict
    if (userSelectedFolder.has(userId)) {
      console.log(`📁 ユーザーが既にフォルダを選択済み: ${userId}`);
      res.json({
        isFolderAmbiguous: false,
        folderConflict: null
      });
      return;
    }
    
    const duplicateFolders = await getGeminiExpenseTrackerRootFolderInfo(userId);
    
    if (duplicateFolders.length > 1) {
      res.json({
        isFolderAmbiguous: true,
        folderConflict: {
          duplicateFolders: duplicateFolders,
          message: '複数の「Gemini Expense Tracker」フォルダが見つかりました'
        }
      });
    } else {
      res.json({
        isFolderAmbiguous: false,
        folderConflict: null
      });
    }
  } catch (error) {
    console.error('Folder Conflict Check Error:', error);
    res.status(500).json({
      error: 'フォルダ競合の確認に失敗しました',
      details: error.message
    });
  }
});

// Select a specific folder to use (stores user's choice)
app.post('/api/select-folder', async (req, res) => {
  try {
    const userId = req.body.userId || 'test-user';
    const selectedFolderId = req.body.folderId;
    
    if (!selectedFolderId) {
      return res.status(400).json({ error: 'フォルダIDが必要です' });
    }
    
    // Save selected folder ID
    userSelectedFolder.set(userId, selectedFolderId);
    
    console.log(`📁 ユーザーがフォルダを選択しました: userId=${userId}, folderId=${selectedFolderId}`);
    
    res.json({
      success: true,
      message: 'フォルダを選択しました',
      selectedFolderId
    });
  } catch (error) {
    console.error('Select Folder Error:', error);
    res.status(500).json({
      error: 'フォルダ選択に失敗しました',
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

  console.log('🔐 OAuth callback started');
  console.log('📋 Code received:', code ? 'YES' : 'NO');
  console.log('📋 State received:', state || 'NONE');

  try {
    console.log('🔄 Exchanging code for tokens...');
    const { tokens } = await oauth2Client.getToken(code);

    console.log('📋 Tokens received:');
    console.log('  - Access token:', tokens.access_token ? 'YES' : 'NO');
    console.log('  - Refresh token:', tokens.refresh_token ? 'YES' : 'NO');
    console.log('  - ID token:', tokens.id_token ? 'YES' : 'NO');
    console.log('  - Expiry date:', tokens.expiry_date || 'NONE');

    userTokens[userId] = tokens;

    // IDトークンからGoogle ID (sub) を取得してユーザードキュメントを作成
    if (tokens.id_token) {
      console.log('🔍 ID token found, attempting to decode...');
      try {
        const decoded = jwt.decode(tokens.id_token, { complete: true });
        console.log('📋 JWT decoded successfully');

        if (decoded && typeof decoded.payload === 'object') {
          console.log('📋 Payload keys:', Object.keys(decoded.payload));

          if ('sub' in decoded.payload) {
            const googleId = decoded.payload.sub;
            console.log(`🔑 Google ID (sub) extracted: ${googleId}`);
            console.log('📋 Full payload sub:', decoded.payload.sub);

            // ユーザードキュメントを作成または更新
            console.log(`💾 Creating/updating user document for Google ID: ${googleId}`);
            await userService.createOrUpdateUserDocument(googleId, {});
            console.log(`✅ User document created/updated for Google ID: ${googleId}`);

            // userTokensにGoogle IDを関連付ける
            userTokens[googleId] = tokens;
            console.log(`🔗 Associated tokens with Google ID: ${googleId}`);
          } else {
            console.warn('⚠️ No "sub" field found in JWT payload');
            console.log('📋 Available payload fields:', Object.keys(decoded.payload));
          }
        } else {
          console.warn('⚠️ JWT payload is not an object');
        }
      } catch (tokenError) {
        console.error('❌ Failed to extract Google ID from ID token:', tokenError.message);
        console.error('❌ Token error details:', tokenError);
      }
    } else {
      console.warn('⚠️ No ID token received from Google OAuth');
    }

    // ユーザーログイン時にキャッシュクリア
    spreadsheetCache.clear();
    console.log(`🧹 Cache cleared for user: ${userId}`);

    console.log(`✅ OAuth authentication completed successfully for user: ${userId}`);

    // Redirect to frontend with success
    res.redirect('http://localhost:3000?auth=success');
  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    console.error('❌ Error details:', error.message);
    res.redirect('http://localhost:3000?auth=error');
  }
});

app.get('/auth/status', (req, res) => {
  const userId = req.query.userId || 'test-user';
  const isAuthenticated = !!userTokens[userId];

  // Get the ID token for this user if available
  const tokens = userTokens[userId];
  const idToken = tokens?.id_token || null;

  // DEMO ONLY: Check if this is a demo user
  // TODO: remove demo mode before production
  const isDemo = isDemoUser(userId);

  res.json({
    authenticated: isAuthenticated,
    userId: userId,
    idToken: idToken,
    isDemo: isDemo
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

// Test endpoint to reset config
app.get('/api/test/reset-config', (req, res) => {
  res.json({
    success: true,
    message: 'configManagerは削除されました。'
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

// Chat API endpoint with demo mode guard
// DEMO ONLY: Chat is disabled in demo mode to reduce API cost and risk
// TODO: remove demo mode before production
app.post('/api/chat', async (req, res) => {
  try {
    const { userId } = req.body;

    // DEMO ONLY: Demo mode guard - chat is disabled for demo users
    if (isDemoUser(userId)) {
      return res.status(403).json({ error: 'Chat disabled in demo mode' });
    }

    // TODO: Implement actual chat processing with Gemini API
    // For now, return a placeholder response
    res.json({
      success: true,
      reply: 'Chat processing would happen here',
      actions: []
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    res.status(500).json({
      error: 'Chat processing failed',
      details: error.message
    });
  }
});

// Vision API OCR endpoint (multipart file upload)
app.post('/api/ocr', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'ファイルがアップロードされていません' });
    }

    console.log('🔍 Vision API OCR処理開始...', req.file.size, 'bytes');

    // Vision API でテキスト検出（bufferを使用）
    const [result] = await visionClient.textDetection(req.file.buffer);
    const text = result.fullTextAnnotation?.text || '';

    console.log('📄 OCR結果:', text.substring(0, 100) + '...');

    res.json({
      success: true,
      text: text
    });

  } catch (error) {
    console.error('Vision API OCR Error:', error);
    res.status(500).json({
      error: 'OCR処理に失敗しました',
      details: error.message
    });
  }
});

// User management endpoints

// Update last access date for audit forecast page
app.post('/api/user/last-access', async (req, res) => {
  try {
    const { googleId, year, accessDate } = req.body;

    if (!googleId || !year || !accessDate) {
      return res.status(400).json({ error: 'googleId、year、accessDateは必須です' });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(accessDate)) {
      return res.status(400).json({ error: 'accessDateはYYYY-MM-DD形式である必要があります' });
    }

    await userService.updateLastAccessDate(googleId, year, accessDate);

    console.log(`📅 Updated last access date for user ${googleId}, year ${year}: ${accessDate}`);

    res.json({
      success: true,
      message: '最終アクセス日時を更新しました',
      googleId,
      year,
      lastAccessDate: accessDate
    });

  } catch (error) {
    console.error('Update Last Access Date Error:', error);
    res.status(500).json({
      error: '最終アクセス日時の更新に失敗しました',
      details: error.message
    });
  }
});

// Get last access date
app.get('/api/user/last-access/:googleId', async (req, res) => {
  try {
    const { googleId } = req.params;
    const { year } = req.query;

    if (!googleId) {
      return res.status(400).json({ error: 'googleIdは必須です' });
    }

    if (!year) {
      return res.status(400).json({ error: 'yearは必須です' });
    }

    const lastAccessDate = await userService.getLastAccessDate(googleId, year);

    res.json({
      success: true,
      googleId,
      year,
      lastAccessDate: { [year]: lastAccessDate }
    });

  } catch (error) {
    console.error('Get Last Access Date Error:', error);
    res.status(500).json({
      error: '最終アクセス日時の取得に失敗しました',
      details: error.message
    });
  }
});

// Save forecast results
app.post('/api/user/forecast', async (req, res) => {
  try {
    console.log('📥 Received forecast request body sample:', {
      googleId: req.body.googleId,
      year: req.body.year,
      date: req.body.date,
      forecastResultsCount: req.body.forecastResults?.length || 0
    });

    // デバッグ: forecastResultsの中身を確認
    if (req.body.forecastResults && Array.isArray(req.body.forecastResults)) {
      console.log('📊 First forecast result sample:', JSON.stringify(req.body.forecastResults[0], null, 2));
    }

    const { googleId, year, date, forecastResults, taxAuthorityPerspective } = req.body;

    if (!googleId || !year || !date || !forecastResults) {
      console.log('❌ Missing required fields:', { googleId: !!googleId, year: !!year, date: !!date, forecastResults: !!forecastResults });
      return res.status(400).json({ error: 'googleId、year、date、forecastResultsは必須です' });
    }

    // taxAuthorityPerspective: optional string (daily overview)
    if (taxAuthorityPerspective !== undefined && typeof taxAuthorityPerspective !== 'string') {
      return res.status(400).json({ error: 'taxAuthorityPerspective は文字列である必要があります' });
    }
    if (typeof taxAuthorityPerspective === 'string' && taxAuthorityPerspective.length > 10000) {
      return res.status(400).json({ error: 'taxAuthorityPerspective が長すぎます（10000文字まで）' });
    }

    // Validate and parse year (accept both string and number)
    const parsedYear = Number(year);
    if (!Number.isInteger(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
      console.error(`❌ Invalid year: ${year} (parsed: ${parsedYear})`);
      return res.status(400).json({
        error: `yearは2000-2100の有効な整数である必要があります`,
        received: year,
        parsed: parsedYear
      });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      console.error(`❌ Invalid date format: ${date} (expected: YYYY-MM-DD)`);
      return res.status(400).json({
        error: 'dateはYYYY-MM-DD形式である必要があります',
        received: date,
        expected: 'YYYY-MM-DD'
      });
    }

    // Validate forecast results structure
    if (!Array.isArray(forecastResults)) {
      return res.status(400).json({ error: 'forecastResultsは配列である必要があります' });
    }

    // Size check (prevent overly large payloads)
    const payloadSize = JSON.stringify(forecastResults).length;
    if (payloadSize > 1024 * 1024) { // 1MB limit
      return res.status(400).json({
        error: 'forecastResultsのサイズが大きすぎます（1MBを超えています）',
        size: payloadSize,
        maxSize: 1024 * 1024
      });
    }

    // Validate forecast results count
    if (forecastResults.length === 0) {
      return res.status(400).json({ error: 'forecastResultsは空配列であってはいけません' });
    }

    if (forecastResults.length > 1000) {
      return res.status(400).json({
        error: 'forecastResultsの要素数が多すぎます（1000個まで）',
        count: forecastResults.length,
        maxCount: 1000
      });
    }

    // Validate and normalize each forecast result (AuditForecastItem structure)
    const normalizedForecastResults = [];
    for (let i = 0; i < forecastResults.length; i++) {
      const result = forecastResults[i];

      // Required field validations
      if (typeof result.id !== 'string' || !result.id.trim()) {
        console.error(`❌ Invalid forecast result at index ${i}: id is not valid string`, { id: result.id, type: typeof result.id });
        return res.status(400).json({
          error: `forecastResults[${i}].id は空でない文字列である必要があります`,
          invalidItem: result,
          field: 'id',
          expected: 'non-empty string',
          actual: result.id
        });
      }

      if (typeof result.accountName !== 'string' || !result.accountName.trim()) {
        console.error(`❌ Invalid forecast result at index ${i}: accountName is not valid string`, { accountName: result.accountName, type: typeof result.accountName });
        return res.status(400).json({
          error: `forecastResults[${i}].accountName は空でない文字列である必要があります`,
          invalidItem: result,
          field: 'accountName',
          expected: 'non-empty string',
          actual: result.accountName
        });
      }

      if (typeof result.totalAmount !== 'number' || !isFinite(result.totalAmount) || result.totalAmount < 0) {
        console.error(`❌ Invalid forecast result at index ${i}: totalAmount is not valid positive number`, {
          totalAmount: result.totalAmount,
          type: typeof result.totalAmount,
          isFinite: isFinite(result.totalAmount)
        });
        return res.status(400).json({
          error: `forecastResults[${i}].totalAmount は0以上の有効な数値である必要があります (${result.accountName})`,
          invalidItem: result,
          field: 'totalAmount',
          expected: 'finite number >= 0',
          actual: result.totalAmount,
          actualType: typeof result.totalAmount
        });
      }

      // Normalize and validate optional fields
      const normalizedResult = {
        id: result.id.trim(),
        accountName: result.accountName.trim(),
        totalAmount: Math.round(result.totalAmount * 100) / 100, // Round to 2 decimal places
        ratio: typeof result.ratio === 'number' && isFinite(result.ratio) ? Math.round(result.ratio * 100) / 100 : 0,
        riskLevel: typeof result.riskLevel === 'string' && ['low', 'medium', 'high'].includes(result.riskLevel)
          ? result.riskLevel
          : 'unknown',
        issues: Array.isArray(result.issues)
          ? result.issues.filter(issue => typeof issue === 'string' && issue.trim()).map(issue => issue.trim())
          : [],
        // 異常検知フィールドを追加
        zScore: typeof result.zScore === 'number' && isFinite(result.zScore) ? result.zScore : undefined,
        growthRate: typeof result.growthRate === 'number' && isFinite(result.growthRate) ? result.growthRate : undefined,
        diffRatio: typeof result.diffRatio === 'number' && isFinite(result.diffRatio) ? result.diffRatio : undefined,
        anomalyRisk: typeof result.anomalyRisk === 'string' && ['low', 'medium', 'high'].includes(result.anomalyRisk)
          ? result.anomalyRisk
          : undefined,

        // ← 以下2つを追加
        detectedAnomalies: Array.isArray(result.detectedAnomalies)
          ? result.detectedAnomalies.filter(anomaly =>
              anomaly &&
              typeof anomaly.dimension === 'string' &&
              typeof anomaly.accountName === 'string' &&
              typeof anomaly.value === 'number' &&
              typeof anomaly.severity === 'string' &&
              typeof anomaly.message === 'string'
            )
          : undefined,

        anomalyCount: typeof result.anomalyCount === 'number' && isFinite(result.anomalyCount) && result.anomalyCount >= 0
          ? result.anomalyCount
          : undefined
      };

      // Validate normalized result - allow undefined for zScore, growthRate, diffRatio, anomalyRisk
      const requiredFields = ['id', 'accountName', 'totalAmount', 'ratio', 'riskLevel', 'issues'];
      const hasUndefinedRequired = requiredFields.some(field => normalizedResult[field] === undefined);

      if (hasUndefinedRequired) {
        console.error(`❌ Normalized result contains undefined required values at index ${i}`, normalizedResult);
        return res.status(400).json({
          error: `forecastResults[${i}]の必須フィールドに未定義値が含まれています`,
          normalizedResult,
          originalResult: result
        });
      }

      normalizedForecastResults.push(normalizedResult);
    }

    console.log(`✅ Validated and normalized ${normalizedForecastResults.length} forecast results`);

    // 正規化されたデータを使用
    await userService.saveForecast(
      googleId,
      parsedYear.toString(),
      date,
      normalizedForecastResults,
      typeof taxAuthorityPerspective === 'string' ? taxAuthorityPerspective.trim() : null
    );

    console.log(`🔮 Saved forecast results for user ${googleId}, year ${year}, date ${date}: ${forecastResults.length} results`);

    res.json({
      success: true,
      message: '予報結果を保存しました',
      googleId,
      year,
      date,
      resultCount: forecastResults.length
    });

  } catch (error) {
    console.error('Save Forecast Results Error:', error);
    res.status(500).json({
      error: '予報結果の保存に失敗しました',
      details: error.message
    });
  }
});

// Get forecast results for a specific year and date (normalized format only)
app.get('/api/user/forecast/:googleId/:year/:date', async (req, res) => {
  try {
    const { googleId, year, date } = req.params;

    if (!googleId || !year || !date) {
      return res.status(400).json({ error: 'googleId、year、dateは必須です' });
    }

    // Validate and parse year (accept both string and number)
    const parsedYear = Number(year);
    if (!Number.isInteger(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
      return res.status(400).json({
        error: `yearは2000-2100の有効な整数である必要があります`,
        received: year,
        parsed: parsedYear
      });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        error: 'dateはYYYY-MM-DD形式である必要があります',
        received: date,
        expected: 'YYYY-MM-DD'
      });
    }

    console.log(`🔍 API: Getting forecast for ${googleId}, year: ${parsedYear}, date: ${date}`);

    // 予報結果（配列）＋日次総括（taxAuthorityPerspective）を返す
    const userDoc = await userService.getUserDocument(googleId);
    const forecastKey = `forecasts.${parsedYear.toString()}`;
    const forecastData = userDoc?.[forecastKey];

    let forecastResults = null;
    let taxAuthorityPerspective = null;
    if (forecastData && typeof forecastData === 'object' && !Array.isArray(forecastData)) {
      if (forecastData.date === date && Array.isArray(forecastData.results)) {
        forecastResults = forecastData.results;
        taxAuthorityPerspective = forecastData.taxAuthorityPerspective || null;
      }
    }

    // Validate response structure (normalized format only)
    if (forecastResults !== null && !Array.isArray(forecastResults)) {
      console.error('🚨 API Response validation failed: forecastResults should be array or null');
      return res.status(500).json({
        error: '予報結果の形式が正しくありません（正規化されたフォーマットのみサポート）',
        details: 'forecastResults must be an array in normalized format'
      });
    }

    console.log(`✅ API: Forecast retrieved successfully - ${forecastResults ? forecastResults.length : 0} results`);

    res.json({
      success: true,
      googleId,
      year: parsedYear.toString(),
      date,
      forecastResults,
      taxAuthorityPerspective
    });

  } catch (error) {
    console.error('Get Forecast Results Error:', error);

    // Check if it's a validation error (malformed structure detected)
    if (error.message.includes('Malformed forecast structure detected')) {
      return res.status(400).json({
        error: '監査予報データの構造が正しくありません。レガシー形式が検出されました。',
        details: 'Only normalized forecast format is supported: forecasts[year] = { date, results, updatedAt }',
        legacyFormatDetected: true
      });
    }

    res.status(500).json({
      error: '予報結果の取得に失敗しました',
      details: error.message
    });
  }
});

// Get summary metadata endpoint (deprecated - now using Firestore as single source of truth)
/*
app.get('/api/sheet/summary/meta', async (req, res) => {
  // This endpoint is deprecated. Use /api/user/last-summary-generated/:idToken instead
  res.status(410).json({
    error: 'このエンドポイントは廃止されました。Firestoreから直接取得してください。',
    deprecated: true
  });
});
*/

// Generate summary endpoint
app.post('/api/generate-summary', async (req, res) => {
  try {
    const { authorization } = req.headers;

    if (!authorization?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const idToken = authorization.substring(7);
    const googleId = userService.extractSubFromIdToken(idToken); // JWT から sub を抽出

    if (!googleId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = req.body.userId || 'test-user'; // userIdを取得
    const tokens = userTokens[userId];

    if (!tokens) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // JSTで今日の日付を取得（YYYY-MM-DD形式）
    const now = new Date();
    const todayJST = new Date(now.getTime() + (now.getTimezoneOffset() + 9 * 60) * 60 * 1000);
    const todayString = todayJST.toISOString().split('T')[0];

    // Firestoreから最終生成日時を取得して1日1回制限をチェック
    const lastGeneratedAt = await userService.getLastSummaryGeneratedAt(googleId);
    if (lastGeneratedAt === todayString) {
      return res.status(429).json({
        error: '本日すでに横断集計済みです',
        message: '本日すでに横断集計済みです'
      });
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials(tokens);

    const year = now.getFullYear().toString();

    // ユーザー設定からフォルダIDを取得
    const userDoc = await userService.getUserDocument(googleId);
    const folderId = userDoc?.settings?.folderId || null;

    console.log('� Using folderId:', folderId); // デバッグ用

    // スプレッドシート作成/更新 (folderIdは文字列またはnull)
    await createOrUpdateSpreadsheetWithYearTabs(folderId, year, googleId);

    // Firestoreに最終生成日時を保存（JSTの日付文字列）
    await userService.updateLastSummaryGeneratedAt(googleId, todayString);

    res.json({
      success: true,
      message: '横断集計生成が完了しました',
      lastSummaryGeneratedAt: todayString
    });
  } catch (error) {
    console.error('Generate Summary Error:', error);
    res.status(500).json({
      error: 'Failed to generate summary',
      message: error.message
    });
  }
});

// Get last summary generated date for authenticated user
app.get('/api/user/last-summary-generated/:idToken', async (req, res) => {
  try {
    const { idToken } = req.params;

    if (!idToken) {
      return res.status(400).json({ error: 'IDトークンは必須です' });
    }

    // Extract Google ID from ID token
    const googleId = userService.extractSubFromIdToken(idToken);
    if (!googleId) {
      return res.status(401).json({ error: '無効なトークンです' });
    }

    const lastSummaryGeneratedAt = await userService.getLastSummaryGeneratedAt(googleId);

    res.json({
      success: true,
      googleId,
      lastSummaryGeneratedAt
    });

  } catch (error) {
    console.error('Get Last Summary Generated Error:', error);
    res.status(500).json({
      error: '最終集計生成日の取得に失敗しました',
      details: error.message
    });
  }
});

// Helper function to get all years that have expense/income sheets
async function getAllAvailableYears(spreadsheetId, userId) {
  const client = await getAuthenticatedClient(userId);
  const sheets = google.sheets({ version: 'v4', auth: client });

  try {
    // Get all sheets in the spreadsheet
    const spreadsheetResponse = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties'
    });

    const allSheets = spreadsheetResponse.data.sheets || [];
    const sheetTitles = allSheets.map(s => s.properties?.title);

    // Extract years from sheet names like "2026_Expenses", "2026_Income", etc.
    const years = new Set();

    for (const title of sheetTitles) {
      const expenseMatch = title.match(/^(\d{4})_Expenses$/);
      const incomeMatch = title.match(/^(\d{4})_Income$/);

      if (expenseMatch || incomeMatch) {
        const year = parseInt(expenseMatch ? expenseMatch[1] : incomeMatch[1]);
        if (year >= 2000 && year <= 2100) {
          years.add(year);
        }
      }
    }

    return Array.from(years).sort();
  } catch (error) {
    console.error('Error getting available years:', error);
    return [];
  }
}

// Helper function to get unique categories from all expense sheets
async function getUniqueExpenseCategories(spreadsheetId, years, userId) {
  const client = await getAuthenticatedClient(userId);
  const sheets = google.sheets({ version: 'v4', auth: client });

  const categories = new Set();

  for (const year of years) {
    try {
      const sheetName = `${year}_Expenses`;
      // Get all data from column C (category column, 1-indexed as 3)
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!C:C`,
      });

      const rows = response.data.values || [];
      // Skip header row and add unique categories
      for (let i = 1; i < rows.length; i++) {
        const category = rows[i][0]?.trim();
        if (category && category !== 'カテゴリ') {
          categories.add(category);
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read categories from ${year}_Expenses:`, error.message);
    }
  }

  return Array.from(categories).sort();
}

// Audit forecast update endpoint - creates 3 Summary sheets
app.post('/api/audit-forecast-update', async (req, res) => {
  try {
    const { authorization } = req.headers;

    if (!authorization?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const idToken = authorization.substring(7);
    const googleId = userService.extractSubFromIdToken(idToken); // JWT から sub を抽出

    if (!googleId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = req.body.userId || 'test-user'; // userIdを取得
    const tokens = userTokens[userId];

    if (!tokens) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const year = req.body.year ? parseInt(req.body.year) : new Date().getFullYear();
    if (isNaN(year) || year < 2000 || year > 2100) {
      return res.status(400).json({ error: '無効な年度です' });
    }

    console.log(`🔮 監査予報更新を開始: ユーザー=${userId}, 年=${year}`);

    // JSTで今日の日付を取得（YYYY-MM-DD形式）: 1日1回制限に利用
    const now = new Date();
    const todayJST = new Date(now.getTime() + (now.getTimezoneOffset() + 9 * 60) * 60 * 1000);
    const todayString = todayJST.toISOString().split('T')[0];

    // Firestoreから最終生成日時を取得して1日1回制限をチェック
    try {
      const lastGeneratedAt = await userService.getLastSummaryGeneratedAt(googleId);
      if (lastGeneratedAt === todayString) {
        return res.status(429).json({
          error: '本日すでに横断集計済みです',
          message: '本日すでに横断集計済みです',
          lastSummaryGeneratedAt: lastGeneratedAt
        });
      }
    } catch (limitError) {
      // 制限チェックに失敗しても、集計自体は継続可能（ログのみ）
      console.warn('⚠️ Daily summary limit check failed (continuing):', limitError.message);
    }

    // Get or create the base Gemini_Expenses spreadsheet
    const rootFolderId = await getOrCreateGeminiExpenseTrackerRootFolder(userId);
    const { spreadsheetId } = await createOrUpdateSpreadsheetWithYearTabs(rootFolderId, year, userId);

    const client = await getAuthenticatedClient(userId);
    const sheets = google.sheets({ version: 'v4', auth: client });

    // Get current sheets in the spreadsheet
    const spreadsheetResponse = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties'
    });

    const existingSheets = spreadsheetResponse.data.sheets || [];
    const existingSheetTitles = existingSheets.map(s => s.properties?.title);

    console.log(`📊 既存シート確認: ${existingSheetTitles.join(', ')}`);

    // Define the 3 Summary sheets to create
    const sheetsToCreate = [
      { name: 'Summary_Base' },
      { name: 'Summary_Year_Total' },
      { name: 'Summary_Account_History' }
    ];

    const createdSheets = [];

    // Check each sheet and create if it doesn't exist
    for (const sheetConfig of sheetsToCreate) {
      const existingSheet = existingSheets.find(s => s.properties?.title === sheetConfig.name);

      if (!existingSheet) {
        // Create new sheet
        const addSheetRequest = {
          addSheet: {
            properties: {
              title: sheetConfig.name,
              sheetType: 'GRID',
              gridProperties: {
                rowCount: 1000,
                columnCount: 20,
              },
            }
          }
        };

        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: { requests: [addSheetRequest] }
        });

        console.log(`✅ ${sheetConfig.name} を作成しました`);
        createdSheets.push(sheetConfig.name);
      } else {
        // Sheet already exists - preserve existing content
        console.log(`📄 ${sheetConfig.name} は既に存在します（スキップ）`);
        createdSheets.push(sheetConfig.name);
      }
    }

    // **Step 2: Summary_Base タブに関数を入れる**
    console.log('📊 Summary_Base に関数を設定開始...');

    // Get all available years and categories
    const availableYears = await getAllAvailableYears(spreadsheetId, userId);
    const expenseCategories = await getUniqueExpenseCategories(spreadsheetId, availableYears, userId);

    console.log(`📅 利用可能な年度: ${availableYears.join(', ')}`);
    console.log(`📋 利用可能な勘定科目: ${expenseCategories.join(', ')}`);

    // Create Summary_Base header row
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Summary_Base!A1:D1',
      valueInputOption: 'RAW',
      resource: {
        values: [['年度', '勘定科目', '合計金額', '件数']]
      }
    });

    // Build data rows for Summary_Base
    const summaryRows = [];
    for (const year of availableYears) {
      // Add expense categories for this year
      for (const category of expenseCategories) {
        summaryRows.push([
          year,
          category,
          `=SUMIF(${year}_Expenses!C:C, "${category}", ${year}_Expenses!B:B)`,
          `=COUNTIF(${year}_Expenses!C:C, "${category}")`
        ]);
      }

      // Add income (売上) for this year
      summaryRows.push([
        year,
        '売上',
        `=SUM(${year}_Income!B:B)`,
        `=COUNTA(${year}_Income!B:B) - 1`  // Subtract 1 for header row
      ]);
    }

    // Update Summary_Base with data and formulas
    if (summaryRows.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Summary_Base!A2',
        valueInputOption: 'USER_ENTERED',  // Use USER_ENTERED to evaluate formulas
        resource: {
          values: summaryRows
        }
      });

      console.log(`✅ Summary_Base に ${summaryRows.length} 行のデータを入力しました`);
    } else {
      console.log('⚠️ Summary_Base に追加するデータがありませんでした');
    }

    // **Step 3: Summary_Year_Total タブに年度別集計関数を入れる**
    console.log('📊 Summary_Year_Total に関数を設定開始...');

    // Summary_Base から年度一覧を取得（一意な年度のみ）
    const baseYearsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Summary_Base!A2:A',  // A列から年度を取得（ヘッダー行を除く）
    });

    const baseYearsData = baseYearsResponse.data.values || [];
    const uniqueYears = [...new Set(baseYearsData.flat().map(year => parseInt(year)).filter(year => !isNaN(year)))].sort();

    console.log(`📅 Summary_Base から取得した年度一覧: ${uniqueYears.join(', ')}`);

    if (uniqueYears.length === 0) {
      console.log('⚠️ Summary_Base に年度データが見つからないため、Summary_Year_Total の作成をスキップします');
    } else {
      // Summary_Year_Total にヘッダー行を作成
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Summary_Year_Total!A1:E1',
        valueInputOption: 'RAW',
        resource: {
          values: [['年度', '支出合計', '収入合計', '収支', '件数合計']]
        }
      });

      // 各年度ごとの集計関数を作成
      const yearTotalRows = uniqueYears.map((year, idx) => {
        const rowNum = idx + 2;  // データ行は2行目から開始
        return [
          year,
          `=SUMIFS(Summary_Base!C:C, Summary_Base!A:A, ${year}, Summary_Base!B:B, "<>売上")`,  // 支出合計（売上以外）
          `=SUMIFS(Summary_Base!C:C, Summary_Base!A:A, ${year}, Summary_Base!B:B, "売上")`,    // 収入合計（売上のみ）
          `=C${rowNum} - B${rowNum}`,                                                          // 収支（収入-支出）
          `=SUMIFS(Summary_Base!D:D, Summary_Base!A:A, ${year})`                               // 件数合計
        ];
      });

      // Summary_Year_Total に関数を入力
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Summary_Year_Total!A2',
        valueInputOption: 'USER_ENTERED',  // 関数を評価させるため USER_ENTERED を使用
        resource: {
          values: yearTotalRows
        }
      });

      console.log(`✅ Summary_Year_Total に ${yearTotalRows.length} 年度分の集計関数を入力しました`);
    }

    // **Step 4: Summary_Account_History に「勘定科目×年度×合計金額」の履歴テーブルを構築する**
    console.log('📊 Summary_Account_History のクロス表構築開始...');

    // Summary_Base から年度一覧を取得（一意）
    const yearsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Summary_Base!A2:A',
    });
    const yearsData = yearsResponse.data.values || [];
    const years = [...new Set(yearsData.flat().map(year => parseInt(year)).filter(year => !isNaN(year)))].sort();

    // Summary_Base から勘定科目一覧を取得（一意、売上も含む）
    const accountResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Summary_Base!B2:B',
    });
    const accountData = accountResponse.data.values || [];
    const accountList = [...new Set(accountData.flat().filter(account => account && account.trim()))].sort();

    console.log(`📅 年度一覧: ${years.join(', ')}`);
    console.log(`📋 勘定科目一覧: ${accountList.join(', ')}`);

    // Summary_Account_History のヘッダー構築
    const header = ['勘定科目', ...years];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Summary_Account_History!A1',
      valueInputOption: 'RAW',
      resource: {
        values: [header]
      }
    });

    // 勘定科目 × 年度 のクロス表構築
    const historyRows = accountList.map(account => {
      const row = [account];
      for (const year of years) {
        row.push(`=SUMIFS(Summary_Base!C:C, Summary_Base!A:A, ${year}, Summary_Base!B:B, "${account}")`);
      }
      return row;
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Summary_Account_History!A2',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: historyRows
      }
    });

    console.log(`✅ Summary_Account_History に ${historyRows.length} 勘定科目分の履歴テーブルを作成しました`);

    console.log(`🎉 監査予報更新完了: ${createdSheets.length} つのシートが準備完了、Summary_Baseに${summaryRows.length}行、Summary_Account_Historyに${historyRows.length}行の関数を設定`);

    // Firestoreに最終生成日時を保存（JSTの日付文字列）
    try {
      await userService.updateLastSummaryGeneratedAt(googleId, todayString);
    } catch (updateMetaError) {
      // ここで失敗してもSummary自体は成功しているので、結果は返す（ログのみ）
      console.warn('⚠️ Failed to update lastSummaryGeneratedAt (continuing):', updateMetaError.message);
    }

    res.json({
      success: true,
      sheets: createdSheets,
      summaryBaseRows: summaryRows.length,
      summaryAccountHistoryRows: historyRows.length,
      availableYears: availableYears,
      expenseCategories: expenseCategories,
      years: years,
      accountList: accountList,
      lastSummaryGeneratedAt: todayString,
      message: `3 つのSummaryシートが準備完了し、Summary_Baseに${summaryRows.length}行、Summary_Account_Historyに${historyRows.length}行の関数を設定しました`
    });

  } catch (error) {
    console.error('Audit Forecast Update Error:', error);
    res.status(500).json({
      error: '監査予報更新に失敗しました',
      details: error.message
    });
  }
});

// Get latest forecast results for a specific year (normalized format only; ignores date)
app.get('/api/user/forecast-latest/:googleId/:year', async (req, res) => {
  try {
    const { googleId, year } = req.params;

    if (!googleId || !year) {
      return res.status(400).json({ error: 'googleId、yearは必須です' });
    }

    const parsedYear = Number(year);
    if (!Number.isInteger(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
      return res.status(400).json({
        error: `yearは2000-2100の有効な整数である必要があります`,
        received: year,
        parsed: parsedYear
      });
    }

    console.log(`🔍 API: Getting latest forecast for ${googleId}, year: ${parsedYear}`);

    const userDoc = await userService.getUserDocument(googleId);
    // 構造検証（レガシー形式を検出）
    userService.validateForecastStructure?.(userDoc); // 互換: privateの場合は実行されない

    const forecastKey = `forecasts.${parsedYear.toString()}`;
    const forecastData = userDoc?.[forecastKey];

    if (forecastData && typeof forecastData === 'object' && !Array.isArray(forecastData) && Array.isArray(forecastData.results)) {
      return res.json({
        success: true,
        googleId,
        year: parsedYear.toString(),
        date: forecastData.date || null,
        forecastResults: forecastData.results,
        taxAuthorityPerspective: forecastData.taxAuthorityPerspective || null
      });
    }

    return res.json({
      success: true,
      googleId,
      year: parsedYear.toString(),
      date: null,
      forecastResults: []
    });
  } catch (error) {
    console.error('Get Latest Forecast Results Error:', error);
    res.status(500).json({
      error: '最新の予報結果の取得に失敗しました',
      details: error.message
    });
  }
});

// Get user document
app.get('/api/user/:googleId', async (req, res) => {
  try {
    const { googleId } = req.params;

    if (!googleId) {
      return res.status(400).json({ error: 'googleIdは必須です' });
    }

    const userDocument = await userService.getUserDocument(googleId);

    res.json({
      success: true,
      googleId,
      userDocument
    });

  } catch (error) {
    console.error('Get User Document Error:', error);
    res.status(500).json({
      error: 'ユーザードキュメントの取得に失敗しました',
      details: error.message
    });
  }
});

// Summary_Account_History のデータを返すエンドポイント
app.get('/api/summary-account-history', async (req, res) => {
  try {
    // 認証: Bearer IDトークンがあればそれを優先（googleId=sub を userId として扱う）
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const idToken = authHeader.substring(7);
      const googleId = userService.extractSubFromIdToken(idToken);
      if (googleId) userId = googleId;
    }
    if (!userId) {
      // 互換: 従来の userId クエリ/ボディ方式
      userId = getAuthenticatedGoogleId(req);
    }
    if (!userId) return res.status(401).json({ error: '認証が必要です' });

    // yearは「どの年度のスプレッドシートを開くか」用途（シート内には複数年度の列がある）
    const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();

    const { spreadsheetId } = await getOrCreateSpreadsheetForYear(year, userId);
    const client = await getAuthenticatedClient(userId);
    const sheets = google.sheets({ version: 'v4', auth: client });

    // Step 1: Check if Summary_Account_History sheet exists
    const spreadsheetResponse = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties'
    });

    const existingSheets = spreadsheetResponse.data.sheets || [];
    const summarySheet = existingSheets.find(s => s.properties?.title === 'Summary_Account_History');

    if (!summarySheet) {
      console.log(`⚠️ Summary_Account_History シートが存在しません`);
      return res.json({
        usable: false,
        reason: 'Summary_Account_History シートが存在しません',
        data: []
      });
    }

    console.log(`✅ Summary_Account_History シートが存在します: ${summarySheet.properties?.sheetId}`);

    // Step 2: Get the data from Summary_Account_History
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Summary_Account_History!A1:ZZ1000',
    });

    const rows = response.data.values || [];
    
    // Step 3: Validate that we have valid data structure
    if (rows.length < 2 || (rows[0] || []).length < 2) {
      console.log(`⚠️ Summary_Account_History シートに有効なデータがありません`);
      return res.json({
        usable: false,
        reason: 'シートに有効なデータがありません（ヘッダー行またはデータ行が不足）',
        data: []
      });
    }

    const header = rows[0];
    const yearHeaders = header.slice(1).map(v => parseInt(String(v), 10));
    const validYearCols = [];
    
    // Step 4: Validate that we can parse annual columns
    yearHeaders.forEach((y, idx) => {
      if (!isNaN(y) && y >= 2000 && y <= 2100) {
        validYearCols.push({ colIndex: idx + 1, year: y });
      }
    });

    if (validYearCols.length === 0) {
      console.log(`⚠️ Summary_Account_History シートに有効な年度列が見つかりません`);
      return res.json({
        usable: false,
        reason: '年度列が1つも取得できません（年度列が存在しないか、解析できません）',
        data: []
      });
    }

    console.log(`✅ Summary_Account_History シートが使用可能です: ${validYearCols.length}年度列`);

    // 年度別の総支出（売上を除く）を算出 → ratio計算に使う
    const totalExpenseByYear = {};
    for (const { colIndex, year } of validYearCols) {
      let total = 0;
      for (let r = 1; r < rows.length; r++) {
        const accountName = rows[r]?.[0] || '';
        if (!accountName || accountName === '売上') continue;
        const raw = rows[r]?.[colIndex];
        const amount = typeof raw === 'number' ? raw : parseFloat(String(raw || '0'));
        if (typeof amount === 'number' && isFinite(amount)) total += amount;
      }
      totalExpenseByYear[year] = total;
    }

    // 縦持ちに変換して返却: { year, accountName, amount, ratio, count }
    const historyData = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const accountName = row[0] || '';
      if (!accountName) continue;

      for (const { colIndex, year } of validYearCols) {
        const raw = row[colIndex];
        const amount = typeof raw === 'number' ? raw : parseFloat(String(raw || '0'));
        const safeAmount = typeof amount === 'number' && isFinite(amount) ? amount : 0;
        const totalExpense = totalExpenseByYear[year] || 0;
        const ratio = accountName === '売上'
          ? 0
          : (totalExpense > 0 ? (safeAmount / totalExpense) * 100 : 0);

        historyData.push({
          year,
          accountName,
          amount: safeAmount,
          count: null, // クロス表には件数が無いのでnull
          ratio: Math.round(ratio * 10) / 10
        });
      }
    }

    res.json({
      usable: true,
      reason: undefined,
      data: historyData
    });

  } catch (error) {
    console.error('Get Account History Error:', error);
  
    if (error?.isFolderAmbiguous) {
      return res.json({
        usable: false,
        reason: '同名フォルダが複数存在するため Summary を特定できません',
        data: []
      });
    }
  
    res.status(500).json({
      usable: false,
      reason: `サーバーエラー: ${error.message}`,
      data: []
    });
  }
});

// 税務調査対応アシスタント - 検知済み異常データから税務署の観点・質問・準備事項を生成
app.post('/api/tax-audit-assistance', async (req, res) => {
  try {
    const { forecastData } = req.body;

    if (!forecastData || !Array.isArray(forecastData)) {
      return res.status(400).json({
        error: 'forecastDataは必須で、配列である必要があります'
      });
    }

    // 各項目のバリデーション
    for (let i = 0; i < forecastData.length; i++) {
      const item = forecastData[i];
      if (!item.accountName || typeof item.totalAmount !== 'number' || typeof item.ratio !== 'number' || typeof item.anomalyCount !== 'number') {
        return res.status(400).json({
          error: `forecastData[${i}]の形式が正しくありません`,
          required: 'accountName(string), totalAmount(number), ratio(number), anomalyCount(number), detectedAnomalies(array)'
        });
      }
      if (!Array.isArray(item.detectedAnomalies)) {
        return res.status(400).json({
          error: `forecastData[${i}].detectedAnomaliesは配列である必要があります`
        });
      }
    }

    console.log(`🔍 税務調査対応アシスタント: ${forecastData.length}件の異常データを分析`);

    // auditServiceを使用して分析
    const result = await auditService.generateTaxAuditAssistance(forecastData);

    console.log(`✅ 分析完了: ${result.taxAuthorityConcerns.length}件の観点、${result.expectedQuestions.length}件の質問、${result.userPreparationPoints.length}件の準備事項`);

    res.json(result);

  } catch (error) {
    console.error('Tax Audit Assistance Error:', error);
    res.status(500).json({
      error: '税務調査対応アシスタントの実行に失敗しました',
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Gemini Expense Tracker API Server running on port ${PORT}`);
  console.log(`🔐 OAuth 2.0 ready - visit http://localhost:${PORT}/auth/google to authenticate`);
  console.log(`📊 Google Sheets integration ready`);
  console.log(`🧪 Test endpoint: GET /api/test/create-folders-only`);
});
