export const TEXT = {
  ja: {
    // ヘッダー
    appTitle: 'Audit Risk Forecast Tracker',

    // タブ
    tabChat: 'チャット',
    tabDashboard: '監査予報',
    tabHistory: '履歴',
    tabTaxReturn: '確定申告',

    // クイックアクション
    addExpense: '経費入力',
    addIncome: '売上入力',
    setRule: 'ルール設定',

    // ボタン
    save: '保存',
    cancel: 'キャンセル',
    edit: '修正',
    delete: '削除',

    // ラベル
    date: '日付',
    amount: '金額',
    category: '勘定科目',
    description: '内容',
    notes: 'メモ',

    // メッセージ
    saveSuccess: '保存完了',
    saveFailed: '保存に失敗しました',

    // 年度選択
    selectYear: '年度を選択',
    yearSelection: '年度選択',

    // 言語切り替え
    language: '言語',
    japanese: '日本語',
    english: 'English',

    // 設定
    settings: '設定',
    editInSheets: 'Sheets で編集',

    // 監査予報
    auditForecast: '監査予報',
    auditRiskAnalysis: '監査リスク分析結果',
    overallAuditRisk: '総合監査リスク',
    highRisk: '高',
    mediumRisk: '中',
    lowRisk: '低',
    detectedAnomalies: '検知された異常',
    taxOfficePerspective: '税務調査での疑義ポイント',
    particularlyNote: '特に注意すべき点',
    justificationCases: '正当化されやすいケース',
    problemProneIndustries: '問題になりやすい業種',
    problemLessLikelyIndustries: '問題になりにくい業種',
    businessModelConsistency: '事業モデルとの整合性説明が成否を分けます',
    riskBasis: 'リスクの根拠',
    whatToDoNow: '今すぐやるべきこと',
    prepareContractReceipts: '契約書・領収書・使用実態資料を準備',
    createRelationshipMaterials: '売上と事業活動との関係性を説明できる資料を作成',
    organizeOtherExpenses: '他の経費項目が極端に少ない理由を整理',
    explainYearOverYearChange: '前年比変化の理由を言語化',
    taxOfficeView: '税務署からの見られ方',
    preparationAdvice: '推奨の準備事項',
    commonJustificationPoints: '汎用的な正当化ポイント',
    businessConsistencyExplanation: '事業内容との整合性説明と裏付け資料が重要です',
    evidence: 'エビデンス',
    nextActions: '次のアクション',
    reasoning: '推論を見る',
    close: '閉じる',

    // 取引履歴
    transactionHistory: '取引履歴',
    allTransactions: 'すべての取引',
    allCategories: 'すべての科目',
    dateOrder: '日付順',
    categoryOrder: '科目順',
    all: 'すべて',
    withReceipt: '証憑あり',
    withoutReceipt: '証憑なし',
    noRecords: '該当する記録がありません',
    memo: 'メモ',
    receipt: '証憑',
    viewReceipt: 'レシートを確認',
    removeReceipt: '証憑を削除',
    noReceipt: '証憑なし',
    editTransaction: '編集完了',
    saveTransaction: 'この内容で保存',
    modify: '修正',

    // 設定モーダル
    personalRuleSettings: '個人ルール設定',
    autoClassificationRules: '自動分類ルール',
    rulesCount: '件',
    checkRulesInSheets: 'Google Sheets でルールを確認',
    rulesDescription: 'チャットで「〜の時は〜の科目にして」と教えてもらうとここに自動追加されます。',
    systemSettings: 'システム設定',
    setupGoogleDrive: 'Google Drive と Sheet をセットアップ',
    dataManagement: 'データ管理',
    clearChatHistory: 'チャット履歴をクリア',
    clearHistoryConfirm: 'チャット履歴を全て削除しますか？',
    initializeSystem: 'Google Sheetsに保存',

    // 年度選択モーダル
    auditForecastYearSelection: '監査予報年度選択',
    historyYearSelection: '取引履歴年度選択',
    taxReturnYearSelection: '確定申告年度選択',
    selectAuditYearDescription: '監査予報に使用する年度のデータを選択してください',
    selectHistoryYearDescription: '取引履歴に表示する年度のデータを選択してください',
    selectTaxYearDescription: '確定申告に使用する年度のデータを選択してください',
    fiscalYear: '年度',
    currentYear: '当年度',
    yearRange: '年1月1日〜年12月31日の取引データ',
    yearSelectionNote: '選択した年度の取引データのみが使用されます。他の年度のデータは除外されます。',
    yearSelectionNoteAudit: '選択した年度の取引データのみが監査予報に使用されます。他の年度のデータは除外されます。',
    yearSelectionNoteHistory: '選択した年度の取引データのみが取引履歴に表示されます。他の年度のデータは除外されます。',
    yearSelectionNoteTax: '選択した年度の取引データのみが確定申告書に反映されます。他の年度のデータは除外されます。',

    // 監査予報ダッシュボード
    auditForecastDashboard: '監査予報',
    auditForecastDescription: 'スプシのデータから、数値の構成から推測される事業の特徴を踏まえ、税務署が確認しやすい観点とユーザーが説明として整理すべきポイントを列挙します。Gemini によるAI推論で監査リスクを予測します。',
    updateCrossTabulation: '監査用横断集計を更新',
    updating: '更新中...',
    update: '更新',
    crossTabulationDescription: '複数年度の取引データを横断集計し、監査用Summaryをスプレッドシートに作成します。本集計データをもとに、下記の監査予報を生成します。※ 新しい勘定科目や年度を反映する場合は、必ず更新してください',
    lastUpdated: '最終更新：',
    loadingSummaryData: '集計データを読み込み中...',
    todayAuditForecast: '今日の監査予報',
    mostLikelyItem: '今年、最も調査対象になりやすい項目は',
    noAuditData: '監査予報データが見つかりませんでした',
    individualBookkeepingChecks: '記帳チェック（個別）',
    fixInSpreadsheet: 'スプレッドシートで修正する',
    noCheckItems: 'チェック項目が見つかりませんでした',
    nextActionDescription: '赤字または高リスク項目について、分類根拠や証憑を確認し、必要に応じて修正してください。',

    // 確定申告
    selectedYearDescription: '年度（年度年1月1日〜年度年12月31日）の取引データを集計しています。',
    yearNotSelected: '年度が選択されていません。',

    // 監査異常タイプ
    compositionAnomaly: '構成比異常',
    statisticalAnomaly: '統計的異常',
    suddenChangeAnomaly: '急変異常',
    ratioChangeAnomaly: '比率変動異常',
    compositionDistortion: '支出構成の歪み',
    deviationFromAverage: '平均値からの乖離',
    suddenChange: '前年比の急激な変化',
    ratioVariation: '構成比の変動',

    // 監査詳細
    aiAnalysisResult: 'AI分析結果',
    aiPreparationAdvice: 'AI推奨の準備事項',
    suspicionView: '税務署からの見られ方',
    businessRelevance: '支出の実態と事業との関連性が確認されやすい',
    explainBusinessRelevance: '支出の妥当性を説明できる資料を準備してください',
    extremeConcentration: '一つの科目への極端な集中（通常の事業では複数経費が発生）',
    rapidYearOverYearChange: '前年比変化（売上との連動性が問われる）',
    statisticalDeviation: '業界平均から統計的に乖離',
    ratioVariationDescription: '構成比が変動している場合、事業構造の変化について確認されやすい',
    reasonableExpenditure: '事業規模・業種に合った合理的な支出額であること',
    clearCausality: '売上・事業活動との明確な因果関係が説明できること',
    marketAverage: '市場相場・業界平均と比較して妥当な水準であること',
    businessConsistency: '事業内容との整合性説明と裏付け資料が重要です',
    salesYearOverYearDifference: '売上前年差',
    accountRatio: '比率',
    averageDifference: '過去平均との差',
    compositionRatioChange: '構成比変動',
    dataInsufficientNote: '前年度データが存在しないため、前年差・平均との差の評価は参考値または未算出です。本リスクは「構成比異常」に基づいて検知されています。',
    prepareMaterials: '資料を準備',
    createExplanationMaterials: '説明資料を作成',
    organizeReasons: '理由を整理',
    explainChangeReason: '変化の理由を言語化',
    noteJustification: 'これらが説明できない場合、否認リスクが高まります',

    // 確定申告書
    attention: '注意',
    attentionMessage: '本画面に表示されている数値は、このアプリに登録された取引のみを集計した結果です。ここに含まれていない収入・経費がある場合は、国税庁の申告書上で必ず加算・修正してください。最終的な合計金額は、申告書上で計算した数値を使用してください。',
    legend: '凡例',
    legendDescription: '赤字で表示されている金額は、Google Sheetsから取得した取引データを集計したものです。マウスをホバーすると、各項目の説明が表示されます。',
    incomeSales: '売上',
    incomeSalesDescription: '経費を引く前の売上合計を記入します',
    householdConsumption: '家事消費',
    householdConsumptionDescription: '該当しない場合は 0 円のままにしてください。（飲食店・物販など、商品を私用で使う場合のみ記入）',

    // 認証
    googleAuthRequired: 'Google Sheets 連携が必要です',
    googleAuthDescription: 'アプリを使用するには Google アカウントでの認証が必須です。',
    googleAuthButton: 'Google で連携する',
    googleAuthSuccess: 'Google アカウントとの連携が完了しました！',
    googleAuthFailed: 'Google アカウントとの連携に失敗しました。',
    googleAuthConnected: 'Google連携済み',
    logout: 'ログアウト',
    authenticating: '連携中...',
    googleConnect: 'Google連携',

    // 成功メッセージ
    authSuccess: 'Google アカウントとの連携が完了しました！',
    authFailed: 'Google アカウントとの連携に失敗しました。',
    logoutSuccess: 'Google アカウントからログアウトしました。',
    historyCleared: '履歴をクリアしました。',
    saveCompleted: '保存完了: {description} (ID: {id})',
    ruleAdded: 'ルール追加: 「{keyword}」→「{category}」',

    // エラー
    authRequired: '認証が必要です。再度ログインしてください。',
    summaryGenerationFailed: '集計生成に失敗しました',
    dailyLimitReached: '本日の集計はすでに生成されています。明日再実行してください。',
    generalError: 'エラーが発生しました',
    saveError: '保存に失敗しました',
    updateError: '更新に失敗しました',
    deleteError: '削除に失敗しました',

    // 状態
    notSet: '未設定',

    // ファイルアップロード
    imageUpload: '画像アップロード',
    optimizingImage: 'Optimizing Image...',
    analyzingData: 'Analyzing Data...',
    uploadReceipt: 'レシートをアップロード',
    receiptUploaded: 'レシートをアップロードしました',

    // チャット
    chatPlaceholder: 'メッセージ...',
    selectOperation: '上から操作を選んでください（経費／売上／ルール）',
    expenseInputMode: '経費入力モード：レシート撮影または取引内容を教えてください',
    incomeInputMode: '売上入力モード：収入内容を教えてください',
    ruleSettingMode: 'ルール設定モード：自動分類ルールを作成します',
    welcomeMessage: 'こんにちは！Audit Risk Forecast Trackerです。入力内容からデータを抽出し、確認カードを表示します。',

    // ルール入力
    ruleInput: 'ルール設定',
    keyword: 'キーワード',
    keywordRequired: 'キーワードを入力してください',
    required: '必須',
    keywordPlaceholder: '例: Amazon, Slack',
    accountCategory: '勘定科目',
    ruleNotes: 'メモ',
    ruleNotesPlaceholder: '例: オンラインショッピング',
    addRule: 'ルールを追加',

    // 確認ダイアログ
    extractionConfirmation: '抽出内容の確認',
    confirmSave: 'この内容で保存',
    editContent: '修正',
    editComplete: '編集完了',
    saveWithThisContent: 'この内容で保存',
    payerName: '支払者名',
    payerNamePlaceholder: '支払者名を入力',
    withholdingTax: '源泉徴収税額',

    // フォルダ競合
    folderConflictDetected: 'フォルダ名の重複を検出',
    folderConflictDescription: '複数の同名フォルダが見つかりました',
    folderConflictResolution: 'Google Drive で「いらない方」のフォルダ名を変更してください。',
    folderConflictExample: '例：「Gemini Expense Tracker_old」など',
    folderConflictNote: '名前を変更すると、次回アプリを起動した際にこの警告は表示されなくなります。',
    useThisFolder: 'このフォルダを使用',

    // 初期ガイド
    firstTimeGuide: 'まず、やりたいことを選んでください',
    whatWouldYouLike: '何をしたいですか？',
    registerExpense: '経費を登録',
    registerExpenseSubtitle: 'レシート撮影',
    registerIncome: '売上を登録',
    registerIncomeSubtitle: '収入記録',
    setupRules: 'ルール設定',
    setupRulesSubtitle: '自動分類',

    // 通知
    setupComplete: 'セットアップ完了',
    setupError: 'セットアップエラー',
    initializationComplete: '初期化完了',
    initializationError: '初期化エラー',
    dataSaved: 'データを保存しました',
    dataSaveFailed: 'データの保存に失敗しました',
    dataUpdated: 'データを更新しました',
    dataUpdateFailed: 'データの更新に失敗しました',
    dataDeleted: 'データを削除しました',
    dataDeleteFailed: 'データの削除に失敗しました',

    // Prefixes
    expensePrefix: '経費：',
    incomePrefix: '売上：',

    // 科目
    categories: {
      雑費: '雑費',
      福利厚生費: '福利厚生費',
      修繕費: '修繕費',
      損害保険料: '損害保険料',
      接待交際費: '接待交際費',
      広告宣伝費: '広告宣伝費',
      水道光熱費: '水道光熱費',
      外注工賃: '外注工賃',
      家事消費: '家事消費',
      その他の収入: 'その他の収入',
      給料: '給料',
      減価償却費: '減価償却費',
      租税公課: '租税公課',
      荷造運賃: '荷造運賃',
      売上: '売上',
      経費合計: '経費合計',
      所得金額: '所得金額',
      地代家賃: '地代家賃',
      給与賃金: '給与賃金',
      消耗品費: '消耗品費',
      通信費: '通信費',
      旅費交通費: '旅費交通費'
    }
  },
  en: {
    // Header
    appTitle: 'Audit Risk Forecast Tracker',

    // Tabs
    tabChat: 'Chat',
    tabDashboard: 'Audit Forecast',
    tabHistory: 'History',
    tabTaxReturn: 'Tax Return',

    // Quick Actions
    addExpense: 'Add Expense',
    addIncome: 'Add Income',
    setRule: 'Set Rule',

    // Buttons
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',

    // Labels
    date: 'Date',
    amount: 'Amount',
    category: 'Category',
    description: 'Description',
    notes: 'Notes',

    // Messages
    saveSuccess: 'Saved successfully',
    saveFailed: 'Failed to save',

    // Year Selection
    selectYear: 'Select Year',
    yearSelection: 'Year Selection',

    // Language Switcher
    language: 'Language',
    japanese: 'Japanese',
    english: 'English',

    // Settings
    settings: 'Settings',
    editInSheets: 'Edit in Sheets',

    // Audit Forecast
    auditForecast: 'Audit Forecast',
    auditRiskAnalysis: 'Audit Risk Analysis Result',
    overallAuditRisk: 'Overall Audit Risk',
    highRisk: 'High',
    mediumRisk: 'Medium',
    lowRisk: 'Low',
    detectedAnomalies: 'Detected Anomalies',
    taxOfficePerspective: 'Tax Audit Perspective',
    particularlyNote: 'Particularly Note',
    justificationCases: 'Justification Cases',
    problemProneIndustries: 'Problem-prone Industries',
    problemLessLikelyIndustries: 'Problem-less-likely Industries',
    businessModelConsistency: 'Business model consistency explanation determines success or failure',
    riskBasis: 'Risk Basis',
    whatToDoNow: 'What to do now',
    prepareContractReceipts: 'Prepare contract, receipts, and usage evidence',
    createRelationshipMaterials: 'Create materials explaining relationship between sales and business activities',
    organizeOtherExpenses: 'Organize reasons why other expense items are extremely low',
    explainYearOverYearChange: 'Explain reasons for year-over-year changes',
    taxOfficeView: 'Tax Office View',
    preparationAdvice: 'Preparation Advice',
    commonJustificationPoints: 'Common Justification Points',
    businessConsistencyExplanation: 'Business content consistency explanation and supporting documents are important',
    evidence: 'Evidence',
    nextActions: 'Next Actions',
    reasoning: 'View Reasoning',
    close: 'Close',

    // Transaction History
    transactionHistory: 'Transaction History',
    allTransactions: 'All Transactions',
    allCategories: 'All Categories',
    dateOrder: 'Date Order',
    categoryOrder: 'Category Order',
    all: 'All',
    withReceipt: 'With Receipt',
    withoutReceipt: 'Without Receipt',
    noRecords: 'No records found',
    memo: 'Memo',
    receipt: 'Receipt',
    viewReceipt: 'View Receipt',
    removeReceipt: 'Remove Receipt',
    noReceipt: 'No Receipt',
    editTransaction: 'Finish Editing',
    saveTransaction: 'Save with this content',
    modify: 'Modify',

    // Settings Modal
    personalRuleSettings: 'Personal Rule Settings',
    autoClassificationRules: 'Auto Classification Rules',
    rulesCount: 'items',
    checkRulesInSheets: 'Check rules in Google Sheets',
    rulesDescription: 'When you teach in chat "when ~, make it ~ category", it will be automatically added here.',
    systemSettings: 'System Settings',
    setupGoogleDrive: 'Setup Google Drive and Sheet',
    dataManagement: 'Data Management',
    clearChatHistory: 'Clear Chat History',
    clearHistoryConfirm: 'Are you sure you want to clear all chat history?',
    initializeSystem: 'Save to Google Sheets',

    // Year Selection Modal
    auditForecastYearSelection: 'Audit Forecast Year Selection',
    historyYearSelection: 'Transaction History Year Selection',
    taxReturnYearSelection: 'Tax Return Year Selection',
    selectAuditYearDescription: 'Select the year data to use for audit forecast',
    selectHistoryYearDescription: 'Select the year data to display in transaction history',
    selectTaxYearDescription: 'Select the year data to use for tax return',
    fiscalYear: 'Fiscal Year',
    currentYear: 'Current Year',
    yearRange: 'Year 1/1 - Year 12/31 transactions',
    yearSelectionNote: 'Only transaction data for the selected year will be used. Data for other years will be excluded.',
    yearSelectionNoteAudit: 'Only transaction data for the selected year will be used in audit forecast. Data for other years will be excluded.',
    yearSelectionNoteHistory: 'Only transaction data for the selected year will be displayed in transaction history. Data for other years will be excluded.',
    yearSelectionNoteTax: 'Only transaction data for the selected year will be reflected in tax return. Data for other years will be excluded.',

    // Audit Forecast Dashboard
    auditForecastDashboard: 'Audit Forecast',
    auditForecastDescription: 'From spreadsheet data, based on the business characteristics inferred from the numerical composition, we list the perspectives that tax authorities can easily confirm and the points that users should organize as explanations. Predict audit risks with AI reasoning by Gemini.',
    updateCrossTabulation: 'Update Cross Tabulation for Audit',
    update: 'Update',
    crossTabulationDescription: 'Cross-tabulate transaction data from multiple years and create audit Summary in spreadsheet. Based on this aggregated data, the audit forecast below is generated. * Be sure to update when reflecting new account categories or years',
    lastUpdated: 'Last Updated:',
    loadingSummaryData: 'Loading summary data...',
    todayAuditForecast: 'Today\'s Audit Forecast',
    mostLikelyItem: 'This year, the item most likely to be investigated is',
    noAuditData: 'No audit forecast data found',
    individualBookkeepingChecks: 'Bookkeeping Checks (Individual)',
    fixInSpreadsheet: 'Fix in Spreadsheet',
    noCheckItems: 'No check items found',
    nextActionDescription: 'For red or high-risk items, check the classification basis and receipts, and make corrections as needed.',


    // Tax Return
    selectedYearDescription: 'Year (Year 1/1 - Year 12/31) transaction data is being aggregated.',
    yearNotSelected: 'No year selected.',

    // Audit Anomaly Types
    compositionAnomaly: 'Composition Anomaly',
    statisticalAnomaly: 'Statistical Anomaly',
    suddenChangeAnomaly: 'Sudden Change Anomaly',
    ratioChangeAnomaly: 'Ratio Change Anomaly',
    compositionDistortion: 'Expenditure composition distortion',
    deviationFromAverage: 'Deviation from average',
    suddenChange: 'Sudden change in year-over-year',
    ratioVariation: 'Ratio variation',

    // Audit Details
    aiAnalysisResult: 'AI Analysis Result',
    aiPreparationAdvice: 'AI Recommended Preparation',
    suspicionView: 'Tax Office View',
    businessRelevance: 'The reality of expenditures and their relationship with the business are easily confirmed',
    explainBusinessRelevance: 'Prepare materials that can explain the validity of expenditures',
    extremeConcentration: 'Extreme concentration in one category (multiple expenses usually occur in normal business)',
    rapidYearOverYearChange: 'Year-over-year change (causality with sales is questioned)',
    statisticalDeviation: 'Statistically deviated from industry average',
    ratioVariationDescription: 'When the composition ratio varies, changes in business structure are likely to be confirmed',
    reasonableExpenditure: 'Reasonable expenditure amount suitable for business scale and industry',
    clearCausality: 'Clear causality with sales and business activities can be explained',
    marketAverage: 'Reasonable level compared to market prices and industry averages',
    businessConsistency: 'Explanation of business content consistency and supporting documents are important',
    salesYearOverYearDifference: 'Sales Year-over-Year Difference',
    accountRatio: 'Ratio',
    averageDifference: 'Difference from Average',
    compositionRatioChange: 'Composition Ratio Change',
    dataInsufficientNote: 'Since previous year data does not exist, the evaluation of year-over-year difference and difference from average is reference value or not calculated. This risk is detected based on "Composition Anomaly".',
    prepareMaterials: 'Prepare materials',
    createExplanationMaterials: 'Create explanation materials',
    organizeReasons: 'Organize reasons',
    explainChangeReason: 'Explain reasons for change',
    noteJustification: 'If these cannot be explained, the risk of denial increases',

    // Tax Return Form
    attention: 'Attention',
    attentionMessage: 'The numbers displayed on this screen are the result of aggregating only the transactions registered in this app. If there are any income or expenses not included here, be sure to add or correct them on the National Tax Agency\'s declaration form. Use the final total amount calculated on the declaration form.',
    legend: 'Legend',
    legendDescription: 'The amounts displayed in red are aggregated from transaction data obtained from Google Sheets. Hover your mouse to see descriptions for each item.',
    incomeSales: 'Sales',
    incomeSalesDescription: 'Enter the total sales before deducting expenses',
    householdConsumption: 'Household Consumption',
    householdConsumptionDescription: 'Leave as 0 yen if not applicable. (Only enter if you use products for personal use, such as restaurants or retail)',

    // Authentication
    googleAuthRequired: 'Google Sheets Integration Required',
    googleAuthDescription: 'Authentication with Google account is required to use the app.',
    googleAuthButton: 'Connect with Google',
    googleAuthSuccess: 'Google account integration completed!',
    googleAuthFailed: 'Google account integration failed.',
    googleAuthConnected: 'Google Connected',
    logout: 'Logout',
    authenticating: 'Connecting...',
    googleConnect: 'Google Connect',

    // Success Messages
    authSuccess: 'Google account integration completed!',
    authFailed: 'Google account integration failed.',
    logoutSuccess: 'Logged out from Google account.',
    historyCleared: 'History cleared.',
    saveCompleted: 'Save completed: {description} (ID: {id})',
    ruleAdded: 'Rule added: "{keyword}" → "{category}"',

    // Errors
    authRequired: 'Authentication required. Please login again.',
    summaryGenerationFailed: 'Summary generation failed',
    dailyLimitReached: 'Today\'s summary has already been generated. Please try again tomorrow.',
    generalError: 'An error occurred',
    saveError: 'Failed to save',
    updateError: 'Failed to update',
    deleteError: 'Failed to delete',

    // Status
    notSet: 'Not set',
    processing: 'Processing...',
    loading: 'Loading...',
    saving: 'Saving...',
    updating: 'Updating...',
    deleting: 'Deleting...',

    // File Upload
    imageUpload: 'Image Upload',
    optimizingImage: 'Optimizing Image...',
    analyzingData: 'Analyzing Data...',
    uploadReceipt: 'Upload Receipt',
    receiptUploaded: 'Receipt uploaded',

    // Chat
    chatPlaceholder: 'Message...',
    selectOperation: 'Select operation from above (Expense/Income/Rule)',
    expenseInputMode: 'Expense input mode: Take a photo of receipt or tell transaction details',
    incomeInputMode: 'Income input mode: Tell income details',
    ruleSettingMode: 'Rule setting mode: Create auto classification rules',
    welcomeMessage: 'Hello! I am Audit Risk Forecast Tracker. I will extract data from your input and display confirmation cards.',

    // Rule Input
    ruleInput: 'Rule Setting',
    keyword: 'Keyword',
    keywordRequired: 'Please enter a keyword',
    required: 'Required',
    keywordPlaceholder: 'e.g., Amazon, Slack',
    accountCategory: 'Account Category',
    ruleNotes: 'Notes',
    ruleNotesPlaceholder: 'e.g., Online shopping',
    addRule: 'Add Rule',

    // Confirmation Dialog
    extractionConfirmation: 'Extraction Confirmation',
    confirmSave: 'Save with this content',
    editContent: 'Edit',
    editComplete: 'Edit Complete',
    saveWithThisContent: 'Save with this content',
    payerName: 'Payer Name',
    payerNamePlaceholder: 'Enter payer name',
    withholdingTax: 'Withholding Tax Amount',

    // Folder Conflict
    folderConflictDetected: 'Folder Name Conflict Detected',
    folderConflictDescription: 'Multiple folders with the same name found',
    folderConflictResolution: 'In Google Drive, rename the "unnecessary" folder.',
    folderConflictExample: 'e.g., "Gemini Expense Tracker_old"',
    folderConflictNote: 'Renaming will prevent this warning from appearing when you start the app next time.',
    useThisFolder: 'Use This Folder',

    // First Time Guide
    firstTimeGuide: 'First, choose what you want to do',
    whatWouldYouLike: 'What would you like to do?',
    registerExpense: 'Register Expense',
    registerExpenseSubtitle: 'Receipt Photography',
    registerIncome: 'Register Income',
    registerIncomeSubtitle: 'Income Recording',
    setupRules: 'Setup Rules',
    setupRulesSubtitle: 'Auto Classification',

    // Notifications
    setupComplete: 'Setup Complete',
    setupError: 'Setup Error',
    initializationComplete: 'Initialization Complete',
    initializationError: 'Initialization Error',
    dataSaved: 'Data saved',
    dataSaveFailed: 'Failed to save data',
    dataUpdated: 'Data updated',
    dataUpdateFailed: 'Failed to update data',
    dataDeleted: 'Data deleted',
    dataDeleteFailed: 'Failed to delete data',

    // Prefixes
    expensePrefix: 'Expense: ',
    incomePrefix: 'Income: ',

    // Categories
    categories: {
      雑費: 'Miscellaneous',
      福利厚生費: 'Welfare Expenses',
      修繕費: 'Repair Expenses',
      損害保険料: 'Insurance Premiums',
      接待交際費: 'Entertainment Expenses',
      広告宣伝費: 'Advertising Expenses',
      水道光熱費: 'Utilities',
      外注工賃: 'Outsourcing Expenses',
      家事消費: 'Household Consumption',
      その他の収入: 'Other Income',
      給料: 'Salary',
      減価償却費: 'Depreciation',
      租税公課: 'Taxes and Dues',
      荷造運賃: 'Packaging and Shipping',
      売上: 'Sales',
      経費合計: 'Total Expenses',
      所得金額: 'Income Amount',
      地代家賃: 'Rent',
      給与賃金: 'Salaries and Wages',
      消耗品費: 'Consumables',
      通信費: 'Communication Expenses',
      旅費交通費: 'Travel Expenses'
    }
  }
} as const;

export type Language = 'ja' | 'en';
export type TextKey = keyof typeof TEXT.ja;
