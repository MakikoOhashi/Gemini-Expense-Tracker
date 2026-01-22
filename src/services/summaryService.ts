const API_BASE_URL = 'http://localhost:3001';

export async function generateSummary(userId: string = 'test-user'): Promise<{ success: boolean; sheets: string[]; message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/audit-forecast-update`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userId}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ year: new Date().getFullYear() })
  });

  if (!response.ok) {
    throw new Error('監査予報更新に失敗しました');
  }

  return response.json();
}
