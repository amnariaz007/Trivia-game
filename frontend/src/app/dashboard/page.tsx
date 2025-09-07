'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';
import StatsCard from '@/components/StatsCard';
import CreateGameForm from '@/components/CreateGameForm';
import AddQuestionsForm from '@/components/AddQuestionsForm';
import GamesList from '@/components/GamesList';
import UsersList from '@/components/UsersList';

interface DashboardStats {
  users: number;
  activeGame: {
    id: string;
    status: string;
    startTime: string;
    prizePool: string;
  } | null;
  recentGames: any[];
}


export default function DashboardPage() {
  const { isAuthenticated, loading, logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [games, setGames] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboard();
    }
  }, [isAuthenticated]);

  const loadDashboard = async () => {
    try {
      setLoadingStats(true);
      const [statsData, gamesData] = await Promise.all([
        apiService.getStats(),
        apiService.getGames()
      ]);
      setStats(statsData);
      setGames(gamesData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🎮 QRush Trivia Admin</h1>
              <p className="text-gray-600">Manage games, questions, and monitor player activity</p>
            </div>
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📊 Statistics</h2>
          {loadingStats ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
                  <div className="h-8 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatsCard
                title="Total Users"
                value={stats?.users || 0}
                icon="👥"
              />
              <StatsCard
                title="Active Game"
                value={stats?.activeGame ? 'Yes' : 'No'}
                icon="🎮"
              />
              <StatsCard
                title="Recent Games"
                value={stats?.recentGames?.length || 0}
                icon="📈"
              />
            </div>
          )}
        </div>

        {/* Create Game Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🎯 Create New Game</h2>
          <CreateGameForm onGameCreated={loadDashboard} />
        </div>

        {/* Add Questions Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">❓ Add Questions</h2>
          <AddQuestionsForm onQuestionsAdded={loadDashboard} />
        </div>

        {/* Games Management Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🎮 Manage Games</h2>
          <GamesList games={games} onGameUpdated={loadDashboard} />
        </div>

        {/* Users Management Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">👥 Manage Users</h2>
          <UsersList />
        </div>
      </div>
    </div>
  );
}
