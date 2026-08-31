import React from 'react';
import { Navbar } from './Navbar';
import { MobileBottomNav } from './MobileBottomNav';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-brand-500 selection:text-white relative">
      {/* Top Navigation */}
      <Navbar />

      {/* Main Content Area with safe bottom padding for mobile dock */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-8 pb-28 md:pb-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200/80 bg-white/60 py-4 text-xs text-slate-500 hidden sm:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>מערכת כניסה לתפקיד • פורטל חניכה והסמכה</span>
          </div>
          <div>
            <span>כל הזכויות שמורות © {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <MobileBottomNav />
    </div>
  );
};
