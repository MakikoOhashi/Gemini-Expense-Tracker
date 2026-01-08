export interface AuthStatus {
  authenticated: boolean;
  userId: string;
}

export class AuthService {
  private baseUrl = 'http://localhost:3001';

  async checkAuthStatus(userId?: string): Promise<AuthStatus> {
    const params = userId ? `?userId=${userId}` : '';
    const response = await fetch(`${this.baseUrl}/auth/status${params}`);
    return response.json();
  }

  getAuthUrl(): string {
    return `${this.baseUrl}/auth/google`;
  }

  async logout(userId?: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: userId || 'test-user' }),
    });
    return response.json();
  }

  // Check URL parameters for auth result
  checkAuthResult(): 'success' | 'error' | null {
    const urlParams = new URLSearchParams(window.location.search);
    const auth = urlParams.get('auth');

    // Clean up URL
    if (auth) {
      const url = new URL(window.location.href);
      url.searchParams.delete('auth');
      window.history.replaceState({}, '', url.toString());
    }

    return auth as 'success' | 'error' | null;
  }
}

export const authService = new AuthService();
