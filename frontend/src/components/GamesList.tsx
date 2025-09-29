'use client';

import { useState } from 'react';
import { apiService } from '@/services/api';

interface Game {
  id: string;
  status: string;
  prize_pool: string;
  start_time: string;
  players?: any[];
  winners?: Array<{
    nickname: string;
    whatsapp_number: string;
  }>;
}

interface GamesListProps {
  games: Game[];
  onGameUpdated: () => void;
}

export default function GamesList({ games, onGameUpdated }: GamesListProps) {
  const [loading, setLoading] = useState<string | null>(null);

  // Helper function to check if game is expired (1 minute grace period)
  const isGameExpired = (game: Game) => {
    const gameStartTime = new Date(game.start_time);
    const now = new Date();
    const gracePeriod = 60 * 1000; // 1 minute in milliseconds
    return now > (gameStartTime.getTime() + gracePeriod);
  };

  const handleStartRegistration = async (gameId: string) => {
    // Check if game has expired (1 minute grace period)
    const game = games.find(g => g.id === gameId);
    if (game) {
      const gameStartTime = new Date(game.start_time);
      const now = new Date();
      const gracePeriod = 60 * 1000; // 1 minute in milliseconds
      
      if (now > (gameStartTime.getTime() + gracePeriod)) {
        alert('❌ Cannot start registration!\n\n⏰ Game start time has passed (1 minute grace period expired).\n📅 Start Time: ' + gameStartTime.toLocaleString() + '\n🕐 Current Time: ' + now.toLocaleString() + '\n\nGame should be marked as expired.');
        return;
      }
    }
    
    setLoading(gameId);
    try {
      await apiService.startGameRegistration(gameId);
      alert('Registration started successfully!');
      onGameUpdated();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert('Error starting registration: ' + errorMessage);
    } finally {
      setLoading(null);
    }
  };

  const handleStartGame = async (gameId: string) => {
    // Check if game has expired (1 minute grace period)
    const game = games.find(g => g.id === gameId);
    if (game) {
      const gameStartTime = new Date(game.start_time);
      const now = new Date();
      const gracePeriod = 60 * 1000; // 1 minute in milliseconds
      
      if (now > (gameStartTime.getTime() + gracePeriod)) {
        alert('❌ Cannot start game!\n\n⏰ Game start time has passed (1 minute grace period expired).\n📅 Start Time: ' + gameStartTime.toLocaleString() + '\n🕐 Current Time: ' + now.toLocaleString() + '\n\nGame should be marked as expired.');
        return;
      }
    }
    
    setLoading(gameId);
    try {
      await apiService.startGame(gameId);
      alert('Game started successfully!');
      onGameUpdated();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert('Error starting game: ' + errorMessage);
    } finally {
      setLoading(null);
    }
  };

  const handleEndGame = async (gameId: string) => {
    // Show confirmation dialog for emergency end
    const confirmed = window.confirm(
      '🚨 EMERGENCY GAME END\n\n' +
      'Are you sure you want to immediately end this game?\n\n' +
      'This will:\n' +
      '• Stop all timers immediately\n' +
      '• Send emergency end message to all players\n' +
      '• Mark game as finished\n\n' +
      'This action cannot be undone!'
    );
    
    if (!confirmed) {
      return;
    }
    
    setLoading(gameId);
    try {
      const result = await apiService.endGame(gameId);
      alert(`🚨 Game ended successfully!\n\nWinners: ${result.winners.join(', ')}\nWinner Count: ${result.winnerCount}`);
      onGameUpdated();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert('❌ Error ending game: ' + errorMessage);
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert('Error exporting CSV: ' + errorMessage);
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
      case 'expired':
        return 'border-l-gray-400';
      default:
        return 'border-l-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    // Display UTC time as-is from database
    const date = new Date(dateString);
    return date.toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
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
                    <p><strong>Status:</strong> 
                      <span className={`ml-1 ${game.status === 'expired' ? 'text-gray-500' : ''}`}>
                        {game.status === 'expired' ? '⏰ Expired' : game.status.replace('_', ' ')}
                      </span>
                    </p>
                    <p><strong>Prize Pool:</strong> ${game.prize_pool}</p>
                    <p><strong>Start Time (EST):</strong> {formatDate(game.start_time)}</p>
                    <p><strong>Players:</strong> {game.players?.length || 0}</p>
                    {game.winners && game.winners.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-green-700">🏆 Winners:</p>
                        <div className="ml-2 space-y-1">
                          {game.winners.map((winner, index) => (
                            <p key={index} className="text-xs text-green-600">
                              • {winner.nickname} ({winner.whatsapp_number})
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                    {game.status === 'expired' && (
                      <p className="text-xs text-gray-500 italic">
                        ⚠️ Game time has passed - registration and starting are no longer available
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex space-x-2 ml-4">
                  {game.status === 'scheduled' && (
                    <button
                      onClick={() => handleStartRegistration(game.id)}
                      disabled={loading === game.id || isGameExpired(game)}
                      className={`px-3 py-1 rounded text-sm font-medium disabled:opacity-50 ${
                        isGameExpired(game) 
                          ? 'bg-gray-400 text-white cursor-not-allowed' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {loading === game.id ? 'Starting...' : isGameExpired(game) ? '⏰ EXPIRED' : 'Start Registration'}
                    </button>
                  )}
                  
                  {game.status === 'pre_game' && (
                    <button
                      onClick={() => handleStartGame(game.id)}
                      disabled={loading === game.id || isGameExpired(game)}
                      className={`px-3 py-1 rounded text-sm font-medium disabled:opacity-50 ${
                        isGameExpired(game) 
                          ? 'bg-gray-400 text-white cursor-not-allowed' 
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {loading === game.id ? 'Starting...' : isGameExpired(game) ? '⏰ EXPIRED' : 'Start Game'}
                    </button>
                  )}
                  
                  {game.status === 'in_progress' && (
                    <button
                      onClick={() => handleEndGame(game.id)}
                      disabled={loading === game.id}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium disabled:opacity-50"
                      title="Emergency: Immediately end the game and notify all players"
                    >
                      {loading === game.id ? 'Ending...' : '🚨 End Game'}
                    </button>
                  )}
                  
                  {(game.status === 'finished' || game.status === 'expired') && (
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
