import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  CheckSquare, 
  Briefcase, 
  Network, 
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const MobileBottomNav: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();

  // If user is not logged in, don't show the bottom nav
  if (!currentUser) return null;

  return (
    <nav 
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
      style={{
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-2">
        
        {/* Tasks Dashboard Tab */}
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all select-none ${
              isActive
                ? 'text-brand-600 font-extrabold scale-105'
                : 'text-slate-500 font-medium hover:text-slate-800'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`p-1 rounded-lg ${isActive ? 'bg-brand-50 text-brand-600' : ''}`}>
                <CheckSquare className="w-5 h-5" />
              </div>
              <span className="text-[11px] mt-0.5 leading-none">משימות</span>
            </>
          )}
        </NavLink>

        {/* Backpack Tab */}
        <NavLink
          to="/backpack"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all select-none ${
              isActive
                ? 'text-brand-600 font-extrabold scale-105'
                : 'text-slate-500 font-medium hover:text-slate-800'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`p-1 rounded-lg ${isActive ? 'bg-brand-50 text-brand-600' : ''}`}>
                <Briefcase className="w-5 h-5" />
              </div>
              <span className="text-[11px] mt-0.5 leading-none">התרמיל</span>
            </>
          )}
        </NavLink>

        {/* Org Tree Tab */}
        <NavLink
          to="/org-tree"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all select-none ${
              isActive
                ? 'text-brand-600 font-extrabold scale-105'
                : 'text-slate-500 font-medium hover:text-slate-800'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`p-1 rounded-lg ${isActive ? 'bg-brand-50 text-brand-600' : ''}`}>
                <Network className="w-5 h-5" />
              </div>
              <span className="text-[11px] mt-0.5 leading-none">עץ מבנה</span>
            </>
          )}
        </NavLink>

        {/* Admin Tab (If Admin) */}
        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all select-none ${
                isActive
                  ? 'text-amber-800 font-extrabold scale-105'
                  : 'text-amber-700 font-medium hover:text-amber-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`p-1 rounded-lg ${isActive ? 'bg-amber-100 text-amber-800' : ''}`}>
                  <ShieldAlert className="w-5 h-5 text-amber-600" />
                </div>
                <span className="text-[11px] mt-0.5 leading-none">ניהול</span>
              </>
            )}
          </NavLink>
        )}

      </div>
    </nav>
  );
};
