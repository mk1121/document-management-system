import React, { useState } from 'react';

interface LoginProps {
  onLogin: (username: string, role: string) => void;
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
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onLogin(username, data.role);
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
    <div className='w-full p-6 bg-white dark:bg-gray-800 rounded-lg shadow-xl transition-colors'>
      <div className='flex flex-col items-center mb-6'>
        <div className='flex items-center gap-3 mb-2'>
          <div className='p-2 rounded-lg bg-red-100 dark:bg-gray-700'>
            <img
              src="/icon-light.png"
              alt="Logo"
              className="w-10 h-10 object-contain dark:hidden"
            />
            <img
              src="/icon-dark.png"
              alt="Logo"
              className="w-10 h-10 object-contain hidden dark:block"
            />
          </div>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
            DocuDigitize Pro
          </h1>
        </div>
        <p className='text-sm text-gray-500 dark:text-gray-400'>
          Secure Access Portal
        </p>
      </div>

      <h2 className='mb-6 text-xl font-semibold text-center text-gray-800 dark:text-gray-100 border-b dark:border-gray-700 pb-2'>
        Login
      </h2>

      {error && (
        <div className='p-3 mb-4 text-sm text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-200 rounded-md border border-red-200 dark:border-red-800'>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className='mb-4'>
          <label
            className='block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300'
            htmlFor='username'
          >
            Username
          </label>
          <input
            className='w-full px-3 py-2 leading-tight text-gray-700 bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-oracle-500 focus:border-transparent transition-all'
            id='username'
            type='text'
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
            placeholder="Enter your username"
          />
        </div>
        <div className='mb-6'>
          <label
            className='block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300'
            htmlFor='password'
          >
            Password
          </label>
          <input
            className='w-full px-3 py-2 leading-tight text-gray-700 bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-oracle-500 focus:border-transparent transition-all'
            id='password'
            type='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your password"
          />
        </div>
        <div className='flex items-center justify-center'>
          <button
            className='w-full px-4 py-2.5 font-bold text-white bg-oracle-600 rounded-lg hover:bg-oracle-700 focus:outline-none focus:ring-4 focus:ring-oracle-600/30 disabled:opacity-50 transition-all shadow-lg shadow-oracle-600/20'
            type='submit'
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </div>
      </form>
    </div>
  );
};
