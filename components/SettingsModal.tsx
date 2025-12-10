import React from 'react';
import { useNotification } from './NotificationContext';
import { X, Bell, Mail, Calendar, Pill } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings } = useNotification();

  if (!isOpen) return null;

  const Toggle = ({ 
    label, 
    description, 
    value, 
    onChange, 
    icon: Icon 
  }: { 
    label: string; 
    description: string; 
    value: boolean; 
    onChange: () => void;
    icon: any;
  }) => (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${value ? 'bg-teal-100 text-teal-700' : 'bg-slate-200 text-slate-500'}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
           <p className="font-bold text-slate-700 text-sm">{label}</p>
           <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <button 
        onClick={onChange}
        className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out relative ${value ? 'bg-teal-600' : 'bg-slate-300'}`}
      >
        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${value ? 'translate-x-6' : 'translate-x-0'}`} />
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
           <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
             <Bell className="w-5 h-5 text-teal-600" /> Notification Settings
           </h3>
           <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors">
             <X className="w-5 h-5" />
           </button>
        </div>
        
        <div className="p-6 space-y-4">
           <Toggle 
             label="Push Notifications"
             description="Receive alerts on your device"
             value={settings.pushNotifications}
             onChange={() => updateSettings({ pushNotifications: !settings.pushNotifications })}
             icon={Bell}
           />
           
           <Toggle 
             label="Email Notifications"
             description="Receive summaries via email"
             value={settings.emailNotifications}
             onChange={() => updateSettings({ emailNotifications: !settings.emailNotifications })}
             icon={Mail}
           />
           
           <div className="w-full h-px bg-slate-100 my-2"></div>
           
           <Toggle 
             label="Appointment Reminders"
             description="Get notified before consultations"
             value={settings.appointmentReminders}
             onChange={() => updateSettings({ appointmentReminders: !settings.appointmentReminders })}
             icon={Calendar}
           />
           
           <Toggle 
             label="Medication Reminders"
             description="Alerts for medication schedules"
             value={settings.medicationReminders}
             onChange={() => updateSettings({ medicationReminders: !settings.medicationReminders })}
             icon={Pill}
           />
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100">
           <button onClick={onClose} className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors shadow-lg">
             Save Preferences
           </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;