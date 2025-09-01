'use client';

import { useState } from 'react';
import { apiService } from '@/services/api';

interface Game {
  id: string;
  status: string;
  prize_pool: string;
  start_time: string;
  players?: any[];
}

interface GamesListProps {
  games: Game[];
  onGameUpdated: () => void;
}

export default function GamesList({ games, onGameUpdated }: GamesListProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleStartRegistration = async (gameId: string) => {
    setLoading(gameId);
    try {
      await apiService.startGameRegistration(gameId);
      alert('Registration started successfully!');
      onGameUpdated();
    } catch (error) {
      alert('Error starting registration');
    } finally {
      setLoading(null);
    }
  };

  const handleStartGame = async (gameId: string) => {
    setLoading(gameId);
    try {
      await apiService.startGame(gameId);
      alert('Game started successfully!');
      onGameUpdated();
    } catch (error) {
      alert('Error starting game');
    } finally {
      setLoading(null);
    }
  };

  const handleEndGame = async (gameId: string) => {
    setLoading(gameId);
    try {
      const result = await apiService.endGame(gameId);
      alert(`Game ended successfully! Winners: ${result.winners.join(', ')}`);
      onGameUpdated();
    } catch (error) {
      alert('Error ending game');
    } finally {
      setLoading(null);
    }
  };

  const handleExportCSV = async (gameId: string) => {
    setLoading(gameId);
    try {
      const blob = await apiService.exportGameCSV(gameId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qrush-trivia-game-${gameId}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      alert('CSV exported successfully!');
    } catch (error) {
      alert('Error exporting CSV');
    } finally {
      setLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'border-l-yellow-500';
      case 'pre_game':
        return 'border-l-blue-500';
      case 'in_progress':
        return 'border-l-red-500';
      case 'finished':
        return 'border-l-green-500';
      default:
        return 'border-l-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="max-h-96 overflow-y-auto">
        {games.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No games found. Create a new game to get started.
          </div>
        ) : (
          games.map((game) => (
            <div
              key={game.id}
              className={`border-l-4 p-4 border-b border-gray-200 ${getStatusColor(game.status)}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">Game {game.id.slice(0, 8)}</h3>
                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    <p><strong>Status:</strong> {game.status.replace('_', ' ')}</p>
                    <p><strong>Prize Pool:</strong> ${game.prize_pool}</p>
                    <p><strong>Start Time:</strong> {formatDate(game.start_time)}</p>
                    <p><strong>Players:</strong> {game.players?.length || 0}</p>
                  </div>
                </div>
                
                <div className="flex space-x-2 ml-4">
                  {game.status === 'scheduled' && (
                    <button
                      onClick={() => handleStartRegistration(game.id)}
                      disabled={loading === game.id}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium disabled:opacity-50"
                    >
                      {loading === game.id ? 'Starting...' : 'Start Registration'}
                    </button>
                  )}
                  
                  {game.status === 'pre_game' && (
                    <button
                      onClick={() => handleStartGame(game.id)}
                      disabled={loading === game.id}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium disabled:opacity-50"
                    >
                      {loading === game.id ? 'Starting...' : 'Start Game'}
                    </button>
                  )}
                  
                  {game.status === 'in_progress' && (
                    <button
                      onClick={() => handleEndGame(game.id)}
                      disabled={loading === game.id}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium disabled:opacity-50"
                    >
                      {loading === game.id ? 'Ending...' : 'End Game'}
                    </button>
                  )}
                  
                  {game.status === 'finished' && (
                    <button
                      onClick={() => handleExportCSV(game.id)}
                      disabled={loading === game.id}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm font-medium disabled:opacity-50"
                    >
                      {loading === game.id ? 'Exporting...' : 'Export CSV'}
                    </button>
                  )}
                  
                  <button
                    onClick={() => alert(`Game Details:\nID: ${game.id}\nStatus: ${game.status}\nPrize: $${game.prize_pool}\nPlayers: ${game.players?.length || 0}`)}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm font-medium"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
