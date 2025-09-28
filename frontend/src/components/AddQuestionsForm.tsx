'use client';

import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';

interface AddQuestionsFormProps {
  onQuestionsAdded: () => void;
  gameId?: string | null;
}

export default function AddQuestionsForm({ onQuestionsAdded, gameId: propGameId }: AddQuestionsFormProps) {
  const [gameId, setGameId] = useState(propGameId || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Update gameId when prop changes
  useEffect(() => {
    if (propGameId) {
      setGameId(propGameId);
    }
  }, [propGameId]);

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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setMessage('Error importing CSV file: ' + errorMessage);
    } finally {
      setLoading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Questions from CSV</h3>
      <p className="text-sm text-gray-600 mb-6">Upload a CSV file to add questions to your game. The file should contain question text, options, and correct answers.</p>
      
      {/* Game ID Input */}
      <div className="mb-6">
        <label htmlFor="gameId" className="block text-sm font-medium text-gray-700 mb-2">
          Game ID
          {propGameId && (
            <span className="ml-2 text-xs text-green-600 font-medium">
              ✓ Auto-filled from created game
            </span>
          )}
        </label>
        <input
          type="text"
          id="gameId"
          value={gameId}
          onChange={(e) => setGameId(e.target.value)}
          placeholder="Enter game ID"
          required
          readOnly={!!propGameId}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-gray-900 placeholder-gray-500 ${
            propGameId 
              ? 'border-green-300 bg-green-50 focus:ring-green-500 cursor-not-allowed' 
              : 'border-gray-300 focus:ring-blue-500'
          }`}
        />
        {propGameId && (
          <p className="mt-1 text-xs text-green-600">
            Game ID automatically filled from the game you just created! (Read-only)
          </p>
        )}
      </div>





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

      {/* Message Display */}
      {message && (
        <div className={`mt-4 p-3 rounded ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          <pre className="whitespace-pre-wrap text-sm">{message}</pre>
        </div>
      )}
    </div>
  );
}
