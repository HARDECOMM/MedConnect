import React from 'react';
import { useNotification } from './NotificationContext';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const NotificationToast: React.FC = () => {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-3 w-full max-w-sm pointer-events-none">
      {notifications.map(notification => (
        <div 
          key={notification.id}
          className={`
            pointer-events-auto transform transition-all duration-300 ease-in-out animate-fade-in
            flex items-start gap-3 p-4 rounded-xl shadow-xl border
            ${notification.type === 'info' ? 'bg-white border-blue-100' : ''}
            ${notification.type === 'success' ? 'bg-white border-green-100' : ''}
            ${notification.type === 'warning' ? 'bg-white border-amber-100' : ''}
            ${notification.type === 'error' ? 'bg-white border-red-100' : ''}
          `}
        >
          <div className="shrink-0 mt-0.5">
             {notification.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
             {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
             {notification.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
             {notification.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
          </div>
          
          <div className="flex-1 min-w-0">
             <h4 className="font-bold text-slate-800 text-sm leading-tight mb-1">{notification.title}</h4>
             <p className="text-xs text-slate-500 leading-relaxed">{notification.message}</p>
          </div>

          <button 
            onClick={() => removeNotification(notification.id)}
            className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;