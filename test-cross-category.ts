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

async function testCrossCategoryDetection() {
  console.log('🧪 Testing cross-category anomaly detection...');
  
  const auditService = new AuditService();
  
  try {
    // Generate audit forecast
    const forecast = await auditService.generateAuditForecast(testTransactions, new Date().getFullYear());
    
    console.log('📊 Audit Forecast Results:');
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
            anomaly.crossCategoryMatches.forEach(match => {
              console.log(`       - ¥${match.sameAmount.toLocaleString()} with ${match.relatedAccount} (${match.dateGap})`);
            });
          }
        });
      }
    });
    
    console.log('\n✅ Cross-category detection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testCrossCategoryDetection();