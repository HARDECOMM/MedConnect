import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Notification, NotificationSettings } from '../types';

interface NotificationContextType {
  notifications: Notification[];
  settings: NotificationSettings;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  updateSettings: (newSettings: Partial<NotificationSettings>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    appointmentReminders: true,
    medicationReminders: true,
  });

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString();
    setNotifications(prev => [...prev, { ...notification, id }]);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Simulating Reminders for demonstration
  useEffect(() => {
    // Simulate Medication Reminder shortly after load
    if (settings.medicationReminders) {
        const timer = setTimeout(() => {
            addNotification({
                title: 'Medication Reminder',
                message: 'It is time to take your Amartem (2:00 PM).',
                type: 'info'
            });
        }, 3000);
        return () => clearTimeout(timer);
    }
  }, [settings.medicationReminders, addNotification]);
  
  // Simulate Appointment Reminder
  useEffect(() => {
      if (settings.appointmentReminders) {
          const timer = setTimeout(() => {
              addNotification({
                  title: 'Upcoming Appointment',
                  message: 'You have a consultation with Dr. Ogundele tomorrow at 10:00 AM.',
                  type: 'warning'
              });
          }, 8000);
          return () => clearTimeout(timer);
      }
  }, [settings.appointmentReminders, addNotification]);

  return (
    <NotificationContext.Provider value={{ notifications, settings, addNotification, removeNotification, updateSettings }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within a NotificationProvider');
  return context;
};