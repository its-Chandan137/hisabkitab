import { createContext, useContext, useState } from 'react';
import { createId } from '../lib/utils';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = (toastId) => {
    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== toastId),
    );
  };

  const addToast = ({ title, message, tone = 'success' }) => {
    const toastId = createId('toast');

    setToasts((currentToasts) => [
      ...currentToasts,
      {
        id: toastId,
        title,
        message,
        tone,
      },
    ]);

    window.setTimeout(() => {
      removeToast(toastId);
    }, 2800);
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used inside ToastProvider');
  }

  return context;
}
