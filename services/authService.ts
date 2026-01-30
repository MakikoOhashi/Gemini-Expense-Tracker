export interface AuthStatus {
  authenticated: boolean;
  userId: string;
  idToken?: string | null;
  isDemo?: boolean;
}

export class AuthService {
  private baseUrl = 'http://localhost:3001';
  private idToken: string | null = null;

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

  // Set ID token after successful authentication
  setIdToken(token: string): void {
    this.idToken = token;
  }

  // Get the current ID token
  async getIdToken(): Promise<string | null> {
    return this.idToken;
  }

  // Clear ID token on logout
  clearIdToken(): void {
    this.idToken = null;
  }
}

export const authService = new AuthService();
