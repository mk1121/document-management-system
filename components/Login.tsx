import React, { useState } from 'react';

interface LoginProps {
  onLogin: (username: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
      const response = await fetch(`${API_BASE_URL}/api/v1/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
           onLogin(username);
      } else {
           setError(data.message || 'Invalid credentials');
      }
    } catch (err) {
      console.error(err);
      setError('Network error or server unavailable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <div className="w-full max-w-sm p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md transition-colors">
        <h2 className="mb-6 text-2xl font-bold text-center text-gray-800 dark:text-gray-100">Login</h2>
        {error && <div className="p-2 mb-4 text-sm text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-100 rounded">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300" htmlFor="username">
              Username
            </label>
            <input
              className="w-full px-3 py-2 leading-tight text-gray-700 bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 border rounded shadow appearance-none focus:outline-none focus:shadow-outline focus:ring-2 focus:ring-blue-500"
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="mb-6">
            <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300" htmlFor="password">
              Password
            </label>
            <input
              className="w-full px-3 py-2 leading-tight text-gray-700 bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 border rounded shadow appearance-none focus:outline-none focus:shadow-outline focus:ring-2 focus:ring-blue-500"
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex items-center justify-center">
            <button
              className="px-4 py-2 font-bold text-white bg-blue-500 rounded hover:bg-blue-700 focus:outline-none focus:shadow-outline disabled:opacity-50 transition-colors"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
