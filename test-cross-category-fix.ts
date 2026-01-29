import { AuditService } from './services/auditService.ts';

// Test data with cross-category anomalies
const testTransactions = [
  {
    id: '1',
    date: '2024-01-15',
    amount: 500000,
    memo: '株式会社ABC',
    category: '外注費',
    type: 'expense'
  },
  {
    id: '2',
    date: '2024-01-16',
    amount: 500000,
    memo: '株式会社ABC',
    category: '会議費',
    type: 'expense'
  },
  {
    id: '3',
    date: '2024-01-20',
    amount: 300000,
    memo: '株式会社XYZ',
    category: '消耗品費',
    type: 'expense'
  },
  {
    id: '4',
    date: '2024-01-21',
    amount: 300000,
    memo: '株式会社XYZ',
    category: '外注費',
    type: 'expense'
  }
];

async function testCrossCategoryFix() {
  console.log('🧪 Testing cross-category anomaly detection fix...');
  
  const auditService = new AuditService();
  
  try {
    // Generate audit forecast with cross-category detection
    console.log('📊 Generating audit forecast with cross-category detection...');
    const forecast = await auditService.generateAuditForecast(testTransactions, new Date().getFullYear());
    
    console.log('📋 Audit Forecast Results:');
    let hasCrossCategoryData = false;
    
    forecast.forEach(item => {
      console.log(`\n📋 ${item.accountName}:`);
      console.log(`   Amount: ¥${item.totalAmount.toLocaleString()}`);
      console.log(`   Ratio: ${item.ratio}%`);
      console.log(`   Risk Level: ${item.riskLevel}`);
      console.log(`   Anomalies: ${item.anomalyCount || 0}`);
      
      if (item.detectedAnomalies && item.detectedAnomalies.length > 0) {
        item.detectedAnomalies.forEach(anomaly => {
          console.log(`   - ${anomaly.dimension}: ${anomaly.message}`);
          if (anomaly.crossCategoryMatches && anomaly.crossCategoryMatches.length > 0) {
            console.log(`     🔄 Cross-category matches:`);
            hasCrossCategoryData = true;
            anomaly.crossCategoryMatches.forEach(match => {
              console.log(`       - ¥${match.sameAmount.toLocaleString()} with ${match.relatedAccount} (${match.dateGap})`);
              console.log(`         Merchant: ${match.merchant}`);
            });
          }
        });
      }
    });
    
    if (hasCrossCategoryData) {
      console.log('\n🎉 SUCCESS: Cross-category information is now properly detected and included in the forecast!');
      console.log('💾 This data will now be saved to Firestore correctly.');
    } else {
      console.log('\n❌ FAILURE: Cross-category information was not found in the forecast');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testCrossCategoryFix();