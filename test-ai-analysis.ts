import { auditService } from './services/auditService.ts';

// Test data with cross-category anomalies
const testTransactions = [
  {
    id: 'tx1',
    date: '2025-01-15',
    amount: 500000,
    category: '外注費',
    description: 'Web開発',
    memo: 'ABC開発',
    type: 'expense'
  },
  {
    id: 'tx2',
    date: '2025-01-16',
    amount: 500000,
    category: '消耗品費',
    description: 'Web開発',
    memo: 'ABC開発',
    type: 'expense'
  },
  {
    id: 'tx3',
    date: '2025-01-20',
    amount: 300000,
    category: '地代家賃',
    description: '家賃',
    memo: 'オフィス家賃',
    type: 'expense'
  }
];

// Mock the fetchSummaryAccountHistory method to avoid API calls
const originalFetchSummaryAccountHistory = auditService.fetchSummaryAccountHistory;
auditService.fetchSummaryAccountHistory = async () => [];

async function testAIAnalysis() {
  console.log('🧪 Testing AI Analysis with Cross-Category Anomalies');
  console.log('📊 Test transactions:', testTransactions);
  
  try {
    // Generate audit forecast which includes AI analysis
    const forecast = await auditService.generateAuditForecast(testTransactions, new Date().getFullYear());
    
    console.log('✅ AI Analysis completed successfully!');
    console.log('📈 Forecast results:', forecast.map(item => ({
      accountName: item.accountName,
      aiSuspicionView: item.aiSuspicionView,
      aiPreparationAdvice: item.aiPreparationAdvice,
      detectedAnomalies: item.detectedAnomalies?.map(a => ({
        dimension: a.dimension,
        crossCategoryMatches: a.crossCategoryMatches
      }))
    })));
    
  } catch (error) {
    console.error('❌ AI Analysis failed:', error);
  } finally {
    // Restore original method
    auditService.fetchSummaryAccountHistory = originalFetchSummaryAccountHistory;
  }
}

testAIAnalysis();
