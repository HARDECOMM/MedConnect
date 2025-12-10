import React, { useState } from 'react';
import { ViewState } from '../types';
import { LayoutDashboard, Video, Calendar, FileText, BookOpen, LogOut, Menu, X, Settings } from 'lucide-react';
import { UserProfile } from '../types';
import NotificationToast from './NotificationToast';
import SettingsModal from './SettingsModal';

interface LayoutProps {
  children: React.ReactNode;
  viewState: ViewState;
  setViewState: (view: ViewState) => void;
  user: UserProfile;
}

const Layout: React.FC<LayoutProps> = ({ children, viewState, setViewState, user }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState; icon: any; label: string }) => (
    <button
      onClick={() => {
        setViewState(view);
        setIsMobileMenuOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
        viewState === view 
          ? 'bg-teal-600 text-white shadow-md' 
          : 'text-slate-500 hover:bg-teal-50 hover:text-teal-700'
      }`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Notifications and Modals */}
      <NotificationToast />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center gap-2 mb-10">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">+</span>
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">MedConnect<span className="text-teal-600">NG</span></h1>
          </div>

          <nav className="flex-1 space-y-2">
            <NavItem view={ViewState.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />
            <NavItem view={ViewState.CONSULTATION} icon={Video} label="Consultations" />
            <NavItem view={ViewState.APPOINTMENTS} icon={Calendar} label="Appointments" />
            <NavItem view={ViewState.RECORDS} icon={FileText} label="Medical Records" />
            <NavItem view={ViewState.EDUCATION} icon={BookOpen} label="Health Edu" />
          </nav>

          <div className="pt-6 border-t border-slate-100 mt-6">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 mb-4">
              <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
                <p className="text-xs text-slate-500 truncate">{user.location}</p>
              </div>
            </div>
            
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-500 hover:bg-slate-50 rounded-lg transition-colors mb-1"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>

            <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">+</span>
            </div>
            <h1 className="font-bold text-slate-800">MedConnect NG</h1>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;