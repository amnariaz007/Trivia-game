'use client';

import { useState } from 'react';
import { apiService } from '@/services/api';

interface CreateGameFormProps {
  onGameCreated: () => void;
}

export default function CreateGameForm({ onGameCreated }: CreateGameFormProps) {
  const [formData, setFormData] = useState({
    startTime: '',
    prizePool: 100,
    totalQuestions: 10
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await apiService.createGame(formData);
      setMessage('Game created successfully!');
      setFormData({
        startTime: '',
        prizePool: 100,
        totalQuestions: 10
      });
      onGameCreated();
    } catch (error) {
      setMessage('Error creating game. Please try again.');
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
              Start Time
            </label>
            <input
              type="datetime-local"
              id="startTime"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="prizePool" className="block text-sm font-medium text-gray-700 mb-2">
              Prize Pool ($)
            </label>
            <input
              type="number"
              id="prizePool"
              min="1"
              step="0.01"
              value={formData.prizePool}
              onChange={(e) => setFormData({ ...formData, prizePool: parseFloat(e.target.value) })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {message && (
          <div className={`p-3 rounded ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
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
