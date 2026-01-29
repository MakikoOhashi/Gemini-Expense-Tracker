import { AuditService } from './services/auditService.ts';
import { userService } from './services/userService.ts';

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

async function testCrossCategoryFirestoreSave() {
  console.log('🧪 Testing cross-category anomaly detection and Firestore save...');
  
  const auditService = new AuditService();
  const testUserId = 'test-user-cross-category';
  const testYear = '2024';
  const testDate = '2024-01-28';
  
  try {
    // 1. Generate audit forecast with cross-category detection
    console.log('📊 Generating audit forecast with cross-category detection...');
    const forecast = await auditService.generateAuditForecast(testTransactions, new Date().getFullYear());
    
    console.log('📋 Audit Forecast Results:');
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
              console.log(`         Merchant: ${match.merchant}`);
            });
          }
        });
      }
    });
    
    // 2. Save to Firestore
    console.log('\n💾 Saving forecast to Firestore...');
    await userService.saveForecast(testUserId, testYear, testDate, forecast);
    console.log('✅ Forecast saved to Firestore successfully!');
    
    // 3. Retrieve from Firestore
    console.log('\n🔍 Retrieving forecast from Firestore...');
    const retrievedForecast = await userService.getForecast(testUserId, testYear, testDate);
    
    if (retrievedForecast) {
      console.log('📋 Retrieved Forecast Results:');
      retrievedForecast.forEach(item => {
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
                console.log(`         Merchant: ${match.merchant}`);
              });
            }
          });
        }
      });
      
      // 4. Verify cross-category data integrity
      console.log('\n✅ Verification Results:');
      const hasCrossCategoryData = retrievedForecast.some(item => 
        item.detectedAnomalies?.some(anomaly => 
          anomaly.crossCategoryMatches && anomaly.crossCategoryMatches.length > 0
        )
      );
      
      if (hasCrossCategoryData) {
        console.log('🎉 SUCCESS: Cross-category information is properly saved and retrieved from Firestore!');
      } else {
        console.log('❌ FAILURE: Cross-category information was not found in Firestore');
      }
      
    } else {
      console.log('❌ FAILURE: Could not retrieve forecast from Firestore');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testCrossCategoryFirestoreSave();