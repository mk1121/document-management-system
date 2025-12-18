import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className='fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none pr-4 sm:pr-0'>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start p-4 mb-2 text-gray-500 bg-white rounded-lg shadow-lg dark:text-gray-400 dark:bg-gray-800 border-l-4 transform transition-all duration-300 ${
              toast.type === 'success'
                ? 'border-green-500'
                : toast.type === 'error'
                  ? 'border-red-500'
                  : toast.type === 'warning'
                    ? 'border-yellow-500'
                    : 'border-blue-500'
            }`}
            role='alert'
          >
            <div
              className={`inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg ${
                toast.type === 'success'
                  ? 'text-green-500 bg-green-100 dark:bg-green-800 dark:text-green-200'
                  : toast.type === 'error'
                    ? 'text-red-500 bg-red-100 dark:bg-red-800 dark:text-red-200'
                    : toast.type === 'warning'
                      ? 'text-yellow-500 bg-yellow-100 dark:bg-yellow-800 dark:text-yellow-200'
                      : 'text-blue-500 bg-blue-100 dark:bg-blue-800 dark:text-blue-200'
              }`}
            >
              {toast.type === 'success' && <CheckCircle size={20} />}
              {toast.type === 'error' && <AlertCircle size={20} />}
              {toast.type === 'warning' && <AlertTriangle size={20} />}
              {toast.type === 'info' && <Info size={20} />}
            </div>
            <div className='ml-3 text-sm font-normal pt-1 break-words w-full'>{toast.message}</div>
            <button
              type='button'
              className='ml-auto -mx-1.5 -my-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex h-8 w-8 dark:text-gray-500 dark:hover:text-white dark:bg-gray-800 dark:hover:bg-gray-700'
              onClick={() => removeToast(toast.id)}
            >
              <span className='sr-only'>Close</span>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
