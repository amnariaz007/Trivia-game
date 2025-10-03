'use client';

import { useState } from 'react';
import { apiService } from '@/services/api';

interface CreateGameFormProps {
  onGameCreated: (gameId: string) => void;
}

export default function CreateGameForm({ onGameCreated }: CreateGameFormProps) {
  const [formData, setFormData] = useState({
    startTime: '',
    prizePool: 0,
    totalQuestions: 10
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [gameId, setGameId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setGameId(null);

    try {
      // Create game with selected start time

      const result = await apiService.createGame(formData);
      setGameId(result.id);
      setMessage('Game created successfully!');
      setFormData({
        startTime: '',
        prizePool: 0,
        totalQuestions: 10
      });
      onGameCreated(result.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setMessage('Error creating game: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-2">
              Start Time (EST)
            </label>
            <input
              type="datetime-local"
              id="startTime"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>

          <div>
            <label htmlFor="prizePool" className="block text-sm font-medium text-gray-700 mb-2">
              Prize Pool ($)
            </label>
            <input
              type="number"
              id="prizePool"
              min="0"
              step="0.01"
              value={formData.prizePool}
              onChange={(e) => setFormData({ ...formData, prizePool: parseFloat(e.target.value) })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>

          <div>
            <label htmlFor="totalQuestions" className="block text-sm font-medium text-gray-700 mb-2">
              Number of Questions
            </label>
            <input
              type="number"
              id="totalQuestions"
              min="1"
              max="20"
              value={formData.totalQuestions}
              onChange={(e) => setFormData({ ...formData, totalQuestions: parseInt(e.target.value) })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>

        </div>

        {message && (
          <div className={`p-4 rounded-lg border ${message.includes('Error') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{message}</p>
                {gameId && (
                  <div className="mt-2">
                    <p className="text-sm text-green-600">Game ID: <span className="font-mono font-bold">{gameId}</span></p>
                    <p className="text-xs text-green-500 mt-1">Use this ID to add questions to the game</p>
                  </div>
                )}
              </div>
              {gameId && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(gameId)}
                  className={`ml-4 px-3 py-1 rounded text-sm font-medium transition-colors ${
                    copied 
                      ? 'bg-green-600 text-white' 
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {copied ? '✓ Copied!' : '📋 Copy ID'}
                </button>
              )}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Game'}
        </button>
      </form>
    </div>
  );
}
