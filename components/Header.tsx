import React, { useState, useEffect } from 'react';
import {
  Camera,
  PlusCircle,
  List,
  RefreshCw,
  AlertTriangle,
  Trash2,
  Sun,
  Moon,
  Download,
} from 'lucide-react';
import { ViewMode } from '../types';

interface HeaderProps {
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
  darkMode: boolean;
  toggleTheme: () => void;
  onSync: () => void;
  isSyncing: boolean;
  pendingCount: number;
  onRetryFailed: () => void;
  failedCount: number;
  onClearData: () => void;
  syncStatus: string;
}

export const Header: React.FC<HeaderProps> = ({
  viewMode,
  setViewMode,
  darkMode,
  toggleTheme,
  onSync,
  isSyncing,
  pendingCount,
  onRetryFailed,
  failedCount,
  onClearData,
  syncStatus,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
  };

  return (
    <header className='sticky top-0 z-50 w-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-200'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-between h-16 items-center'>
          <div className='flex items-center'>
            <div className='flex-shrink-0 flex items-center gap-2'>
              <div className={`p-1.5 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-red-100'}`}>
                {/* <Camera size={20} /> */}
                <img
                  src={darkMode ? "/icon-dark.png" : "/icon-light.png"}
                  alt="Logo"
                  className="w-10 h-10 object-contain"
                />
              </div>
              <h1 className='text-xl font-bold text-gray-900 dark:text-white hidden sm:block'>
                DocuDigitize Pro
              </h1>
            </div>
            <div className='ml-6 flex items-baseline space-x-4'>
              {viewMode === 'list' && (
                <button
                  onClick={() => setViewMode('form')}
                  className='inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-oracle-600 hover:bg-oracle-500 shadow-sm transition-colors'
                >
                  <PlusCircle size={16} className='mr-2' />
                  New Record
                </button>
              )}
              {viewMode === 'form' && (
                <button
                  onClick={() => setViewMode('list')}
                  className='inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                >
                  <List size={16} className='mr-2' />
                  View All
                </button>
              )}
            </div>
          </div>

          <div className='flex items-center gap-2 sm:gap-4'>
            {/* Install App Button */}
            {deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className='flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all text-white bg-blue-600 hover:bg-blue-700 shadow-sm animate-pulse'
                title="Install Application"
              >
                <Download size={18} className='mr-2' />
                <span className='hidden sm:inline'>Install App</span>
                <span className='sm:hidden'>Install</span>
              </button>
            )}

            {/* Sync Pending Button */}
            <button
              onClick={onSync}
              disabled={isSyncing || pendingCount === 0}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all ${pendingCount > 0
                ? 'text-oracle-600 bg-oracle-50 hover:bg-oracle-100 dark:bg-gray-700 dark:text-oracle-500'
                : 'text-gray-400 bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
                }`}
            >
              <RefreshCw
                size={18}
                className={`mr-2 ${isSyncing && pendingCount > 0 ? 'animate-spin' : ''}`}
              />
              <span className='hidden sm:inline'>
                {isSyncing && pendingCount > 0 && syncStatus
                  ? syncStatus
                  : `Sync (${pendingCount})`}
              </span>
              <span className='sm:hidden'>
                {isSyncing && pendingCount > 0 && syncStatus ? syncStatus : `(${pendingCount})`}
              </span>
            </button>

            {/* Retry Failed Button */}
            {failedCount > 0 && (
              <button
                onClick={onRetryFailed}
                disabled={isSyncing}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all text-red-600 bg-red-50 hover:bg-red-100 dark:bg-gray-700 dark:text-red-400 border border-red-200 dark:border-red-900 ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
              >
                <AlertTriangle size={18} className='mr-2' />
                <span className='hidden sm:inline'>Retry Failed ({failedCount})</span>
                <span className='sm:hidden'>Retry ({failedCount})</span>
              </button>
            )}

            <div className='flex items-center gap-1 border-l border-gray-200 dark:border-gray-700 pl-2 sm:pl-4'>
              <button
                onClick={onClearData}
                className='p-2 rounded-full text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 focus:outline-none'
                title='Reset App & Clear All Data'
              >
                <Trash2 size={20} />
              </button>

              <button
                onClick={toggleTheme}
                className='p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 focus:outline-none'
                title='Toggle Theme'
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
