import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  ArrowLeft, 
  KeyRound, 
  AlertCircle,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AppLogo } from '../components/common/AppLogo';

export const EntryPage: React.FC = () => {
  const [personalId, setPersonalId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { loginWithPersonalId } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 7);
    setPersonalId(value);
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (personalId.length !== 7) {
      setError('יש להזין מספר אישי תקין בעל 7 ספרות בדיוק.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await loginWithPersonalId(personalId);
      
      if (res.isAdmin) {
        navigate('/admin');
      } else if (res.isNewUser) {
        navigate(`/register?personal_id=${personalId}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('אירעה שגיאה באימות המשתמש. אנא נסה שוב.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[78vh] flex items-center justify-center py-3 sm:py-6 px-3 sm:px-4">
      <div className="w-full max-w-md">
        
        {/* Top Emblem / Header */}
        <div className="text-center mb-5 sm:mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white shadow-xl shadow-slate-200/80 border border-slate-200/80 p-3 mb-3 sm:mb-4 hover:scale-105 transition-transform duration-300">
            <AppLogo className="w-full h-full text-slate-950" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-1 sm:mb-2">
            מערכת כניסה לתפקיד
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
            פורטל חניכה אישי, ליווי שלבי הכניסה לתפקיד וניהול ידע ארגוני
          </p>
        </div>

        {/* Main Entry Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-5 sm:p-8 relative overflow-hidden">
          
          {/* Subtle decorative background gradient */}
          <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-brand-500 via-blue-600 to-indigo-600"></div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label 
                  htmlFor="personalId" 
                  className="block text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5"
                >
                  <KeyRound className="w-4 h-4 text-brand-600" />
                  <span>מספר אישי (7 ספרות)</span>
                </label>
                <span className="text-[11px] sm:text-xs text-slate-500">
                  {personalId.length}/7 ספרות
                </span>
              </div>

              <div className="relative">
                <input
                  id="personalId"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={7}
                  value={personalId}
                  onChange={handleInputChange}
                  placeholder="0000000"
                  autoFocus
                  className={`w-full px-3 py-3 sm:py-3.5 text-center text-xl sm:text-2xl font-mono tracking-widest rounded-xl border bg-slate-50/50 focus:bg-white transition-all outline-none font-bold text-slate-900 placeholder:text-slate-300 ${
                    error
                      ? 'border-red-400 focus:ring-2 focus:ring-red-400/20 focus:border-red-500'
                      : 'border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10'
                  }`}
                  style={{ direction: 'ltr' }}
                />
                {personalId.length === 7 && !error && (
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 animate-in fade-in zoom-in duration-200">
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || personalId.length === 0}
              className={`w-full py-3 sm:py-3.5 px-5 rounded-xl font-bold text-sm sm:text-base text-white shadow-md flex items-center justify-center gap-2 transition-all duration-200 ${
                personalId.length === 7 && !isSubmitting
                  ? 'bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-700 hover:to-blue-700 shadow-brand-500/25 hover:shadow-lg'
                  : 'bg-slate-300 cursor-not-allowed text-slate-500 shadow-none'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>בודק נתוני כניסה...</span>
                </>
              ) : (
                <>
                  <span>המשך לכניסה או רישום</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start gap-2 text-xs text-blue-800">
              <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                הזנת מספר אישי רשום תחבר אותך לדשבורד האישי, והזנת מספר אישי חדש תעביר אותך לטופס רישום והגדרת תפקיד.
              </span>
            </div>
          </form>

        </div>

        {/* Security badge footer */}
        <div className="text-center mt-4 sm:mt-6 flex items-center justify-center gap-1.5 text-[11px] sm:text-xs text-slate-600">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>מערכת מאובטחת • אימות נתונים פנימי</span>
        </div>

      </div>
    </div>
  );
};
