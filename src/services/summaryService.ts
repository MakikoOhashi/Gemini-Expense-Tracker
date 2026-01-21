const API_BASE_URL = 'http://localhost:3001';

export async function generateSummary(userId: string = 'test-user'): Promise<{ success: boolean; message: string; lastUpdated?: string }> {
  const response = await fetch(`${API_BASE_URL}/api/generate-summary`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userId}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });

  if (!response.ok) {
    throw new Error('Failed to generate summary');
  }

  return response.json();
}
