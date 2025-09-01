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
  const [activeTab, setActiveTab] = useState<'json' | 'csv'>('json');

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

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage('');

    try {
      const result = await apiService.importQuestionsCSV(gameId, file);
      setMessage(`${result.imported} questions imported successfully!`);
      if (result.errors) {
        setMessage(prev => prev + `\nWarnings: ${result.errors.length} rows had issues.`);
      }
      onQuestionsAdded();
    } catch (error) {
      setMessage('Error importing CSV file. Check file format and try again.');
    } finally {
      setLoading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Questions to Game</h3>
      
      {/* Game ID Input */}
      <div className="mb-6">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
            />
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            type="button"
            onClick={() => setActiveTab('json')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'json'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            JSON Input
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('csv')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'csv'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            CSV Import
          </button>
        </nav>
      </div>

      {/* JSON Tab */}
      {activeTab === 'json' && (
        <form onSubmit={handleSubmit} className="space-y-4">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm text-gray-900 placeholder-gray-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !gameId}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Questions'}
          </button>
        </form>
      )}

      {/* CSV Tab */}
      {activeTab === 'csv' && (
        <div className="space-y-4">
          <div>
            <label htmlFor="csvFile" className="block text-sm font-medium text-gray-700 mb-2">
              Upload CSV File
            </label>
            <input
              type="file"
              id="csvFile"
              accept=".csv"
              onChange={handleCSVImport}
              disabled={loading || !gameId}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="mt-2 text-sm text-gray-500">
              CSV format: question_text,option_a,option_b,option_c,option_d,correct_answer
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded-md">
            <h4 className="text-sm font-medium text-blue-800 mb-2">CSV Format Example:</h4>
            <pre className="text-xs text-blue-700 overflow-x-auto">
{`question_text,option_a,option_b,option_c,option_d,correct_answer
"What is the capital of France?","London","Paris","Berlin","Madrid","Paris"
"Which planet is known as the Red Planet?","Venus","Mars","Jupiter","Saturn","Mars"`}
            </pre>
          </div>
        </div>
      )}

      {/* Message Display */}
      {message && (
        <div className={`mt-4 p-3 rounded ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          <pre className="whitespace-pre-wrap text-sm">{message}</pre>
        </div>
      )}
    </div>
  );
}
