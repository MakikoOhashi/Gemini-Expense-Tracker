import { AuditService } from './services/auditService.ts';

// Debug test data with cross-category anomalies - adjusted for better detection
const debugTransactions = [
  {
    id: '1',
    date: '2024-01-15',
    amount: 600000,
    memo: '株式会社ABC',
    category: '外注費',
    type: 'expense'
  },
  {
    id: '2',
    date: '2024-01-16',
    amount: 600000,
    memo: '株式会社ABC',
    category: '会議費',
    type: 'expense'
  },
  {
    id: '3',
    date: '2024-01-20',
    amount: 400000,
    memo: '株式会社XYZ',
    category: '消耗品費',
    type: 'expense'
  },
  {
    id: '4',
    date: '2024-01-21',
    amount: 400000,
    memo: '株式会社XYZ',
    category: '外注費',
    type: 'expense'
  },
  // Add more transactions to make the ratios work better
  {
    id: '5',
    date: '2024-01-22',
    amount: 100000,
    memo: '日常消耗品',
    category: '消耗品費',
    type: 'expense'
  },
  {
    id: '6',
    date: '2024-01-23',
    amount: 100000,
    memo: '交通費',
    category: '交通費',
    type: 'expense'
  }
];

async function debugCrossCategoryDetection() {
  console.log('🔍 Debugging cross-category anomaly detection...');
  
  const auditService = new AuditService();
  
  try {
    // First, let's debug the cross-category detection directly
    console.log('📊 Testing cross-category detection directly...');
    
    // Create a mock auditForecastItems to test with
    const mockForecastItems = [
      { accountName: '外注費', id: '1' },
      { accountName: '会議費', id: '2' },
      { accountName: '消耗品費', id: '3' }
    ];
    
    // Call the private method directly (we need to access it somehow)
    // Let's create a test version of the detection logic
    
    console.log('🔍 Manual cross-category detection test...');
    
    // Manual detection logic
    const transactionGroups = new Map<string, any[]>();
    
    debugTransactions.forEach(tx => {
      console.log(`Processing transaction: ${tx.memo} - ¥${tx.amount} - ${tx.category}`);
      
      if (!tx.memo || tx.amount < 100000) {
        console.log(`  Skipping: memo=${!!tx.memo}, amount=${tx.amount}`);
        return;
      }
      
      const merchant = tx.memo.substring(0, 10);
      const key = `${merchant}_${tx.amount}`;
      
      console.log(`  Group key: ${key}`);
      
      if (!transactionGroups.has(key)) {
        transactionGroups.set(key, []);
      }
      transactionGroups.get(key)!.push(tx);
    });
    
    console.log('\n📊 Transaction groups:');
    transactionGroups.forEach((txs, key) => {
      console.log(`  ${key}:`);
      txs.forEach(tx => {
        console.log(`    - ${tx.category} ¥${tx.amount} (${tx.memo})`);
      });
      
      const categories = new Set(txs.map(t => t.category));
      console.log(`    Categories: ${Array.from(categories).join(', ')}`);
      
      if (categories.size >= 2) {
        console.log(`    🔄 CROSS-CATEGORY MATCH DETECTED!`);
      }
    });
    
    // Now test the full audit forecast generation
    console.log('\n📊 Generating full audit forecast...');
    const forecast = await auditService.generateAuditForecast(debugTransactions);
    
    console.log('\n📋 Full Audit Forecast Results:');
    forecast.forEach(item => {
      console.log(`\n📋 ${item.accountName}:`);
      console.log(`   Amount: ¥${item.totalAmount.toLocaleString()}`);
      console.log(`   Ratio: ${item.ratio}%`);
      console.log(`   Risk Level: ${item.riskLevel}`);
      console.log(`   Anomalies: ${item.anomalyCount || 0}`);
      
      if (item.detectedAnomalies && item.detectedAnomalies.length > 0) {
        console.log(`   📊 Detected Anomalies:`);
        item.detectedAnomalies.forEach((anomaly, index) => {
          console.log(`     ${index + 1}. ${anomaly.dimension}: ${anomaly.message}`);
          console.log(`        Severity: ${anomaly.severity}`);
          console.log(`        Account: ${anomaly.accountName}`);
          
          if (anomaly.crossCategoryMatches && anomaly.crossCategoryMatches.length > 0) {
            console.log(`        🔄 Cross-category matches:`);
            anomaly.crossCategoryMatches.forEach(match => {
              console.log(`           - ¥${match.sameAmount.toLocaleString()} with ${match.relatedAccount} (${match.dateGap})`);
              console.log(`             Merchant: ${match.merchant}`);
            });
          } else {
            console.log(`        🚫 No cross-category matches`);
          }
        });
      } else {
        console.log(`   🚫 No anomalies detected`);
      }
    });
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the debug
debugCrossCategoryDetection();