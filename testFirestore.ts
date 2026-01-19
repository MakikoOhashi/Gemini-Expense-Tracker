import { userService } from './services/userService.ts';

// Test user document creation and operations
async function testUserService() {
  console.log('🧪 Testing User Service...');

  const testGoogleId = 'test_google_id_12345';
  const testAccessDate = '2026-01-19';
  const testForecastDate = '2026-01-19';
  const testForecastResults = [
    { id: 1, prediction: 'Test prediction 1', score: 0.85 },
    { id: 2, prediction: 'Test prediction 2', score: 0.72 },
    { id: 3, prediction: 'Test prediction 3', score: 0.91 }
  ];

  try {
    // Test 1: Create or update user document
    console.log('\n📝 Test 1: Creating/updating user document...');
    await userService.createOrUpdateUserDocument(testGoogleId, {});
    console.log('✅ User document created/updated successfully');

    // Test 2: Update last access date
    console.log('\n📅 Test 2: Updating last access date...');
    await userService.updateLastAccessDate(testGoogleId, testAccessDate);
    console.log('✅ Last access date updated successfully');

    // Test 3: Save forecast results
    console.log('\n🔮 Test 3: Saving forecast results...');
    await userService.saveForecastResult(testGoogleId, testForecastDate, testForecastResults);
    console.log('✅ Forecast results saved successfully');

    // Test 4: Get user document
    console.log('\n📖 Test 4: Getting user document...');
    const userDoc = await userService.getUserDocument(testGoogleId);
    console.log('✅ User document retrieved:', JSON.stringify(userDoc, null, 2));

    // Test 5: Get last access date
    console.log('\n📅 Test 5: Getting last access date...');
    const lastAccessDate = await userService.getLastAccessDate(testGoogleId);
    console.log('✅ Last access date retrieved:', lastAccessDate);

    // Test 6: Get forecast results
    console.log('\n🔮 Test 6: Getting forecast results...');
    const forecastResults = await userService.getForecastResult(testGoogleId, testForecastDate);
    console.log('✅ Forecast results retrieved:', JSON.stringify(forecastResults, null, 2));

    // Test 7: Update with new forecast results for the same date
    console.log('\n🔄 Test 7: Updating forecast results for the same date...');
    const updatedForecastResults = [
      { id: 1, prediction: 'Updated prediction 1', score: 0.90 },
      { id: 2, prediction: 'Updated prediction 2', score: 0.75 },
      { id: 4, prediction: 'New prediction 4', score: 0.88 }
    ];
    await userService.saveForecastResult(testGoogleId, testForecastDate, updatedForecastResults);
    console.log('✅ Forecast results updated successfully');

    // Test 8: Get updated forecast results
    console.log('\n🔮 Test 8: Getting updated forecast results...');
    const updatedResults = await userService.getForecastResult(testGoogleId, testForecastDate);
    console.log('✅ Updated forecast results retrieved:', JSON.stringify(updatedResults, null, 2));

    // Test 9: Add forecast results for a different date
    console.log('\n📅 Test 9: Adding forecast results for a different date...');
    const differentDate = '2026-01-20';
    const differentDateResults = [
      { id: 1, prediction: 'Different date prediction 1', score: 0.82 },
      { id: 2, prediction: 'Different date prediction 2', score: 0.69 }
    ];
    await userService.saveForecastResult(testGoogleId, differentDate, differentDateResults);
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
