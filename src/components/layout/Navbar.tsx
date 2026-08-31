import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  CheckSquare, 
  Briefcase, 
  Network, 
  ShieldAlert, 
  LogOut, 
  UserCircle2, 
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AppLogo } from '../common/AppLogo';

export const Navbar: React.FC = () => {
  const { currentUser, currentRole, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
        
        {/* ========================================================================= */}
        {/* MOBILE TOP BAR (< md screens): ONLY Emblem + Name + Personal ID + Logout */}
        {/* ========================================================================= */}
        <div className="flex md:hidden items-center justify-between h-14">
          {currentUser ? (
            <>
              {/* Right (RTL Start): Emblem + User Name + Personal ID */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 shadow-xs flex items-center justify-center p-1 shrink-0">
                  <AppLogo className="w-6 h-6 text-slate-950" />
                </div>

                <div className="flex flex-col min-w-0 leading-tight">
                  <span className="font-extrabold text-xs text-slate-900 truncate">
                    {currentUser.full_name}
                  </span>
                  <span className="font-mono font-bold text-[10px] text-slate-500">
                    {currentUser.personal_id}
                  </span>
                </div>
              </div>

              {/* Left (RTL End): Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200/80 rounded-lg shrink-0 transition-colors"
                title="התנתקות מהמערכת"
              >
                <LogOut className="w-3.5 h-3.5 text-red-500" />
                <span>התנתקות</span>
              </button>
            </>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 shadow-xs flex items-center justify-center p-1 shrink-0">
                  <AppLogo className="w-6 h-6 text-slate-950" />
                </div>
                <span className="font-extrabold text-sm text-slate-900">כניסה לתפקיד</span>
              </div>

              <NavLink
                to="/"
                className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>כניסה</span>
              </NavLink>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* DESKTOP TOP BAR (>= md screens): Full Branding + Tabs + Profile + Logout   */}
        {/* ========================================================================= */}
        <div className="hidden md:flex items-center justify-between h-16">
          
          {/* Right side (RTL Start): Logo & Branding */}
          <div className="flex items-center gap-6">
            <NavLink 
              to={currentUser ? (isAdmin && currentUser.personal_id === '0000000' ? '/admin' : '/dashboard') : '/'}
              className="flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center p-1 group-hover:scale-105 transition-transform duration-200">
                <AppLogo className="w-7 h-7 text-slate-950" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-lg text-slate-900 tracking-tight">כניסה לתפקיד</span>
                  <span className="bg-brand-50 text-brand-700 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-brand-200">
                    חניכה והסמכה
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">פורטל ליווי מקצועי ומעקב משימות</span>
              </div>
            </NavLink>

            {/* Navigation Tabs (For logged in users) */}
            {currentUser && (
              <nav className="flex items-center gap-1.5 mr-4">
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-brand-50 text-brand-700 font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`
                  }
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>דשבורד משימות</span>
                </NavLink>

                <NavLink
                  to="/backpack"
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-brand-50 text-brand-700 font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`
                  }
                >
                  <Briefcase className="w-4 h-4" />
                  <span>התרמיל שלי</span>
                </NavLink>

                <NavLink
                  to="/org-tree"
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-brand-50 text-brand-700 font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`
                  }
                >
                  <Network className="w-4 h-4" />
                  <span>עץ מבנה</span>
                </NavLink>

                {isAdmin && (
                  <NavLink
                    to="/admin"
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                          : 'text-amber-800 bg-amber-50/80 hover:bg-amber-100 border border-amber-200/70'
                      }`
                    }
                  >
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>מרכז ניהול</span>
                  </NavLink>
                )}
              </nav>
            )}
          </div>

          {/* Left side (RTL End): User info & Actions */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <>
                <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                  <div className="text-left">
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                        {currentUser.personal_id}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {currentUser.full_name}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate max-w-[160px] text-right">
                      {currentRole ? currentRole.name : (isAdmin ? 'מנהל מערכת' : 'חניך חדש')}
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center font-bold text-xs shadow-xs">
                    <UserCircle2 className="w-6 h-6 text-brand-600" />
                  </div>
                </div>

                {/* Prominent Logout Button */}
                <button
                  type="button"
                  onClick={handleLogout}
                  title="התנתק מהמערכת"
                  className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100/80 border border-red-200/80 rounded-xl transition-all hover:shadow-xs active:scale-95"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span>התנתקות</span>
                </button>
              </>
            ) : (
              <NavLink
                to="/"
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-sm hover:shadow transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>כניסה למערכת</span>
              </NavLink>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
