const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

class ApiService {
  private getAuthHeaders(): Record<string, string> {
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
  async getStats(): Promise<any> {
    return this.request('/admin/stats');
  }

  // Games
  async getGames(): Promise<any[]> {
    return this.request('/admin/games');
  }

  async createGame(data: { startTime: string; prizePool: number; totalQuestions: number }): Promise<any> {
    return this.request('/admin/games', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getGame(id: string): Promise<any> {
    return this.request(`/admin/games/${id}`);
  }

  async updateGameStatus(id: string, status: string): Promise<any> {
    return this.request(`/admin/games/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async startGameRegistration(id: string): Promise<any> {
    return this.request(`/admin/games/${id}/register`, {
      method: 'POST',
    });
  }

  async startGame(id: string): Promise<any> {
    return this.request(`/admin/games/${id}/start`, {
      method: 'POST',
    });
  }

  async endGame(id: string): Promise<any> {
    return this.request(`/admin/games/${id}/end`, {
      method: 'POST',
    });
  }

  // Questions
  async getGameQuestions(gameId: string): Promise<any[]> {
    return this.request(`/admin/games/${gameId}/questions`);
  }



  async importQuestionsCSV(gameId: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('csvFile', file);
    
    const url = `${API_BASE_URL}/admin/games/${gameId}/questions/import-csv`;
    const credentials = localStorage.getItem('admin_credentials');
    const [username, password] = credentials ? credentials.split(':') : ['', ''];
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'username': username,
        'password': password,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Import failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Users
  async getUsers(): Promise<any[]> {
    return this.request('/admin/users');
  }

  // Queue Stats
  async getQueueStats(): Promise<any> {
    return this.request('/admin/queues');
  }

  async clearQueues(): Promise<any> {
    return this.request('/admin/queues/clear', {
      method: 'POST',
    });
  }

  // Export game results as CSV
  async exportGameCSV(gameId: string): Promise<Blob> {
    const url = `${API_BASE_URL}/admin/games/${gameId}/export`;
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return response.blob();
  }
}

export const apiService = new ApiService();
