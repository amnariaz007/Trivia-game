'use client';

import { useState } from 'react';
import { apiService } from '@/services/api';

interface AddQuestionsFormProps {
  onQuestionsAdded: () => void;
}

export default function AddQuestionsForm({ onQuestionsAdded }: AddQuestionsFormProps) {
  const [gameId, setGameId] = useState('');
  const [questionsText, setQuestionsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const questions = JSON.parse(questionsText);
      await apiService.addQuestions(gameId, questions);
      setMessage('Questions added successfully!');
      setGameId('');
      setQuestionsText('');
      onQuestionsAdded();
    } catch (error) {
      setMessage('Error adding questions. Check JSON format and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="gameId" className="block text-sm font-medium text-gray-700 mb-2">
            Game ID
          </label>
          <input
            type="text"
            id="gameId"
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
            placeholder="Enter game ID"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="questions" className="block text-sm font-medium text-gray-700 mb-2">
            Questions (JSON format)
          </label>
          <textarea
            id="questions"
            value={questionsText}
            onChange={(e) => setQuestionsText(e.target.value)}
            rows={10}
            placeholder={`[
  {
    "question_text": "What is the capital of France?",
    "option_a": "London",
    "option_b": "Paris",
    "option_c": "Berlin",
    "option_d": "Madrid",
    "correct_answer": "Paris"
  }
]`}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
        </div>

        {message && (
          <div className={`p-3 rounded ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add Questions'}
        </button>
      </form>
    </div>
  );
}
