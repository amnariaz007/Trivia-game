const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

class ApiService {
  private getAuthHeaders() {
    const credentials = localStorage.getItem('admin_credentials');
    if (!credentials) {
      return {
        'Content-Type': 'application/json',
      };
    }
    
    // Parse credentials (format: "username:password")
    const [username, password] = credentials.split(':');
    return {
      'Content-Type': 'application/json',
      'username': username,
      'password': password,
    };
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Dashboard Stats
  async getStats() {
    return this.request('/admin/stats');
  }

  // Games
  async getGames() {
    return this.request('/admin/games');
  }

  async createGame(data: { startTime: string; prizePool: number; totalQuestions: number }) {
    return this.request('/admin/games', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getGame(id: string) {
    return this.request(`/admin/games/${id}`);
  }

  async updateGameStatus(id: string, status: string) {
    return this.request(`/admin/games/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async startGameRegistration(id: string) {
    return this.request(`/admin/games/${id}/register`, {
      method: 'POST',
    });
  }

  async startGame(id: string) {
    return this.request(`/admin/games/${id}/start`, {
      method: 'POST',
    });
  }

  // Questions
  async getGameQuestions(gameId: string) {
    return this.request(`/admin/games/${gameId}/questions`);
  }

  async addQuestions(gameId: string, questions: any[]) {
    return this.request(`/admin/games/${gameId}/questions`, {
      method: 'POST',
      body: JSON.stringify({ questions }),
    });
  }

  // Users
  async getUsers() {
    return this.request('/admin/users');
  }

  // Queue Stats
  async getQueueStats() {
    return this.request('/admin/queues');
  }

  async clearQueues() {
    return this.request('/admin/queues/clear', {
      method: 'POST',
    });
  }
}

export const apiService = new ApiService();
