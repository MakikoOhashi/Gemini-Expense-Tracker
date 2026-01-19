import { userService } from './services/userService.js';

// Test user document creation and operations
async function testUserService() {
  console.log('🧪 Testing User Service...');

  const testGoogleId = 'test_google_id_12345';
  const testYear = '2025';
  const testAccessDate = '2026-01-19';
  const testForecastDate = '2026-01-19';
  const testAuditForecastResults = [
    {
      id: '1',
      accountName: '売上',
      totalAmount: 1000000,
      ratio: 45.5,
      riskLevel: 'medium' as const,
      issues: ['売上高の妥当性', '取引先の確認']
    },
    {
      id: '2',
      accountName: '外注工賃',
      totalAmount: 300000,
      ratio: 13.6,
      riskLevel: 'high' as const,
      issues: ['外注先の実在性', '業務内容の確認']
    }
  ];

  try {
    // Test 1: Create or update user document
    console.log('\n📝 Test 1: Creating/updating user document...');
    await userService.createOrUpdateUserDocument(testGoogleId, {});
    console.log('✅ User document created/updated successfully');

    // Test 2: Update last access date
    console.log('\n📅 Test 2: Updating last access date...');
    await userService.updateLastAccessDate(testGoogleId, testYear, testAccessDate);
    console.log('✅ Last access date updated successfully');

    // Test 3: Save forecast results
    console.log('\n🔮 Test 3: Saving forecast results...');
    await userService.saveForecast(testGoogleId, testYear, testForecastDate, testAuditForecastResults);
    console.log('✅ Forecast results saved successfully');

    // Test 4: Get user document
    console.log('\n📖 Test 4: Getting user document...');
    const userDoc = await userService.getUserDocument(testGoogleId);
    console.log('✅ User document retrieved:', JSON.stringify(userDoc, null, 2));

    // Test 5: Get last access date
    console.log('\n📅 Test 5: Getting last access date...');
    const lastAccessDate = await userService.getLastAccessDate(testGoogleId, testYear);
    console.log('✅ Last access date retrieved:', lastAccessDate);

    // Test 6: Get forecast results
    console.log('\n🔮 Test 6: Getting forecast results...');
    const forecastResults = await userService.getForecast(testGoogleId, testYear, testForecastDate);
    console.log('✅ Forecast results retrieved:', JSON.stringify(forecastResults, null, 2));

    // Test 7: Update with new forecast results for the same date
    console.log('\n🔄 Test 7: Updating forecast results for the same date...');
    const updatedForecastResults = [
      {
        id: '1',
        accountName: '売上',
        totalAmount: 1200000,
        ratio: 50.0,
        riskLevel: 'low' as const,
        issues: ['売上高の妥当性（更新）']
      },
      {
        id: '3',
        accountName: '広告宣伝費',
        totalAmount: 150000,
        ratio: 6.3,
        riskLevel: 'medium' as const,
        issues: ['広告費の内容確認']
      }
    ];
    await userService.saveForecast(testGoogleId, testYear, testForecastDate, updatedForecastResults);
    console.log('✅ Forecast results updated successfully');

    // Test 8: Get updated forecast results
    console.log('\n🔮 Test 8: Getting updated forecast results...');
    const updatedResults = await userService.getForecast(testGoogleId, testYear, testForecastDate);
    console.log('✅ Updated forecast results retrieved:', JSON.stringify(updatedResults, null, 2));

    // Test 9: Add forecast results for a different date
    console.log('\n📅 Test 9: Adding forecast results for a different date...');
    const differentDate = '2026-01-20';
    const differentDateResults = [
      {
        id: '1',
        accountName: '接待交際費',
        totalAmount: 80000,
        ratio: 3.4,
        riskLevel: 'high' as const,
        issues: ['接待費の合理性']
      }
    ];
    await userService.saveForecast(testGoogleId, testYear, differentDate, differentDateResults);
    console.log('✅ Forecast results for different date saved successfully');

    // Test 10: Get user document with multiple forecast dates
    console.log('\n📖 Test 10: Getting user document with multiple forecast dates...');
    const finalUserDoc = await userService.getUserDocument(testGoogleId);
    console.log('✅ Final user document:', JSON.stringify(finalUserDoc, null, 2));

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
testUserService().catch(console.error);
