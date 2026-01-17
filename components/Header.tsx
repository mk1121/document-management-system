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
  Search,
  Menu,
  X,
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
          {/* Logo Section */}
          <div className='flex items-center'>
            <div className='flex-shrink-0 flex items-center gap-2'>
              <div className={`p-1.5 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-red-100'}`}>
                <img
                  src={darkMode ? "/icon-dark.png" : "/icon-light.png"}
                  alt="Logo"
                  className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
                />
              </div>
              <h1 className='text-lg sm:text-xl font-bold text-gray-900 dark:text-white hidden sm:block'>
                DocuDigitize Pro
              </h1>
            </div>

            {/* Desktop Navigation */}
            <div className='hidden md:flex ml-6 items-baseline space-x-2'>
              <button
                onClick={() => setViewMode(viewMode === 'form' ? 'list' : 'form')}
                className='inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              >
                {viewMode === 'form' ? <List size={16} className="mr-2" /> : <PlusCircle size={16} className="mr-2" />}
                {viewMode === 'form' ? 'View List' : 'New Record'}
              </button>

              <button
                onClick={() => setViewMode('search')}
                className={`inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md ${viewMode === 'search' ? 'border-oracle-500 text-oracle-600 bg-oracle-50 dark:bg-gray-700' : 'border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <Search size={16} className='mr-2' />
                Search
              </button>
            </div>
          </div>

          {/* Right Side Actions (Desktop + Some Mobile) */}
          <div className='flex items-center gap-2'>
            {/* Install App - Visible on Desktop only to save space, or part of menu */}
            {deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className='hidden md:flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all text-white bg-blue-600 hover:bg-blue-700 shadow-sm animate-pulse'
                title="Install Application"
              >
                <Download size={18} className='mr-2' />
                Install App
              </button>
            )}

            {/* Sync Button - Always Visible but compact on mobile */}
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
                className={`${isSyncing && pendingCount > 0 ? 'animate-spin' : ''}`}
              />
              {/* Hide text on very small screens if needed, but count is important */}
              <span className='ml-2 font-bold'>
                {isSyncing && pendingCount > 0 && syncStatus ? '' : `(${pendingCount})`}
              </span>
            </button>

            {/* Mobile Menu Button */}
            <div className='md:hidden ml-2'>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className='p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 focus:outline-none'
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>

            {/* Desktop Only Actions */}
            <div className='hidden md:flex items-center gap-1 border-l border-gray-200 dark:border-gray-700 pl-4'>
              {failedCount > 0 && (
                <button
                  onClick={onRetryFailed}
                  disabled={isSyncing}
                  className={`p-2 rounded-full text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={`Retry Failed (${failedCount})`}
                >
                  <AlertTriangle size={20} />
                </button>
              )}
              <button
                onClick={onClearData}
                className='p-2 rounded-full text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30'
                title='Reset App & Clear All Data'
              >
                <Trash2 size={20} />
              </button>
              <button
                onClick={toggleTheme}
                className='p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                title='Toggle Theme'
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className='md:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg'>
          <div className='px-4 pt-2 pb-4 space-y-1 sm:px-3'>
            <button
              onClick={() => { setViewMode(viewMode === 'form' ? 'list' : 'form'); setIsMenuOpen(false); }}
              className='block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
            >
              {viewMode === 'form' ? <span className='flex items-center'><List size={18} className='mr-2' /> View List</span> : <span className='flex items-center'><PlusCircle size={18} className='mr-2' /> New Record</span>}
            </button>

            <button
              onClick={() => { setViewMode('search'); setIsMenuOpen(false); }}
              className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${viewMode === 'search' ? 'text-oracle-600 bg-oracle-50 dark:bg-gray-700' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              <span className='flex items-center'><Search size={18} className='mr-2' /> Search Online</span>
            </button>

            {deferredPrompt && (
              <button
                onClick={() => { handleInstallClick(); setIsMenuOpen(false); }}
                className='block w-full text-left px-3 py-2 rounded-md text-base font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400'
              >
                <span className='flex items-center'><Download size={18} className='mr-2' /> Install App</span>
              </button>
            )}

            <div className='border-t border-gray-200 dark:border-gray-700 my-2 pt-2'>
              <div className='flex justify-around items-center'>
                <button
                  onClick={() => { toggleTheme(); }}
                  className='p-3 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                  title="Toggle Theme"
                >
                  {darkMode ? <Sun size={24} /> : <Moon size={24} />}
                </button>

                {failedCount > 0 && (
                  <button
                    onClick={() => { onRetryFailed(); setIsMenuOpen(false); }}
                    disabled={isSyncing}
                    className={`p-3 rounded-full text-red-600 hover:bg-red-50 dark:text-red-400 ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={`Retry Failed (${failedCount})`}
                  >
                    <AlertTriangle size={24} />
                  </button>
                )}

                <button
                  onClick={() => { onClearData(); setIsMenuOpen(false); }}
                  className='p-3 rounded-full text-red-500 hover:bg-red-50 dark:text-red-400'
                  title="Reset Data"
                >
                  <Trash2 size={24} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header >
  );
};
