import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Briefcase, 
  User, 
  Calendar, 
  Tag, 
  Plus, 
  X, 
  Sparkles, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { Role } from '../types/database';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';

export const RegisterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialPersonalId = searchParams.get('personal_id') || '';
  
  const [step, setStep] = useState<1 | 2>(1);
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleTasksCount, setRoleTasksCount] = useState<Record<string, number>>({});
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);

  // Form State
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [fullName, setFullName] = useState('');
  const [personalId, setPersonalId] = useState(initialPersonalId);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [previousRoles, setPreviousRoles] = useState<string[]>([]);
  const [currentTagInput, setCurrentTagInput] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { registerUser } = useAuth();
  const navigate = useNavigate();

  // Load roles & tasks
  useEffect(() => {
    const loadRoles = async () => {
      try {
        const data = await db.getRoles();
        setRoles(data);
        if (data.length > 0) {
          setSelectedRoleId(data[0].id);
        }

        // Count tasks per role
        const counts: Record<string, number> = {};
        for (const r of data) {
          const tasks = await db.getTasksByRole(r.id);
          counts[r.id] = tasks.length;
        }
        setRoleTasksCount(counts);
      } catch (err) {
        console.error('Failed to load roles', err);
        setError('שגיאה בטעינת רשימת התפקידים.');
      } finally {
        setIsLoadingRoles(false);
      }
    };

    loadRoles();
  }, []);

  const handleAddTag = () => {
    const trimmed = currentTagInput.trim();
    if (trimmed && !previousRoles.includes(trimmed)) {
      setPreviousRoles([...previousRoles, trimmed]);
      setCurrentTagInput('');
    }
  };

  const handleRemoveTag = (indexToRemove: number) => {
    setPreviousRoles(previousRoles.filter((_, idx) => idx !== indexToRemove));
  };

  const handleKeyDownTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const addSuggestedTag = (tag: string) => {
    if (!previousRoles.includes(tag)) {
      setPreviousRoles([...previousRoles, tag]);
    }
  };

  const handleStepOneNext = () => {
    if (!selectedRoleId) {
      setError('אנא בחר תפקיד כדי להמשיך.');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setError('יש להזין שם מלא.');
      return;
    }
    if (personalId.length !== 7) {
      setError('מספר אישי חייב להכיל בדיוק 7 ספרות.');
      return;
    }
    if (!selectedRoleId) {
      setError('יש לבחור תפקיד.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await registerUser({
        personal_id: personalId,
        full_name: fullName.trim(),
        role_id: selectedRoleId,
        entry_date: entryDate,
        previous_roles: previousRoles,
      });

      navigate('/dashboard');
    } catch (err) {
      console.error('Registration failed:', err);
      setError('אירעה שגיאה ברישום המשתמש. אנא נסה שוב.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-8">
      
      {/* Wizard Progress Header */}
      <div className="mb-5 sm:mb-8">
        <div className="flex items-center justify-between max-w-xs sm:max-w-md mx-auto relative mb-3 sm:mb-4">
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 -translate-y-1/2 z-0"></div>
          <div 
            className="absolute top-1/2 right-0 h-1 bg-brand-600 -translate-y-1/2 z-0 transition-all duration-300"
            style={{ width: step === 1 ? '50%' : '100%' }}
          ></div>

          {/* Step 1 indicator */}
          <div className="relative z-10 flex flex-col items-center">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-colors ${
              step >= 1 ? 'bg-brand-600 text-white shadow-md shadow-brand-500/30 ring-4 ring-white' : 'bg-slate-200 text-slate-600'
            }`}>
              1
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-800 mt-1">בחירת תפקיד</span>
          </div>

          {/* Step 2 indicator */}
          <div className="relative z-10 flex flex-col items-center">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-colors ${
              step === 2 ? 'bg-brand-600 text-white shadow-md shadow-brand-500/30 ring-4 ring-white' : 'bg-slate-200 text-slate-500 ring-4 ring-white'
            }`}>
              2
            </div>
            <span className={`text-[11px] sm:text-xs font-bold mt-1 ${step === 2 ? 'text-slate-800' : 'text-slate-500'}`}>
              פרטים אישיים
            </span>
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {step === 1 ? 'שלב 1: בחירת התפקיד המיועד' : 'שלב 2: הגדרת פרופיל חניך'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            {step === 1
              ? 'בחר את התפקיד אליו אתה נכנס כדי לקבל את תוכנית המשימות והחפיפה'
              : 'מלא את פרטיך האישיים ליצירת תוכנית חניכה מותאמת'}
          </p>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-4 sm:p-8">
        
        {error && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-xs sm:text-sm text-red-700">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: ROLE SELECTION */}
        {step === 1 && (
          <div>
            {isLoadingRoles ? (
              <div className="py-12 text-center text-slate-500">
                <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-xs sm:text-sm">טוען רשימת תפקידים...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {roles.map((r) => {
                    const isSelected = selectedRoleId === r.id;
                    const tasksCount = roleTasksCount[r.id] || 0;

                    return (
                      <div
                        key={r.id}
                        onClick={() => setSelectedRoleId(r.id)}
                        className={`cursor-pointer rounded-xl p-4 sm:p-5 border-2 transition-all relative flex flex-col justify-between text-right ${
                          isSelected
                            ? 'border-brand-600 bg-brand-50/40 shadow-md shadow-brand-500/10 ring-2 ring-brand-500/20'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center ${
                                isSelected ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
                              }`}>
                                <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </div>
                              <h3 className="font-bold text-slate-900 text-sm sm:text-base">{r.name}</h3>
                            </div>

                            {isSelected && (
                              <span className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed mb-3">
                            {r.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100/80 text-[11px] sm:text-xs">
                          <span className="text-slate-500">מסלול הכשרה:</span>
                          <span className="font-bold text-brand-700 bg-brand-100/70 px-2 py-0.5 rounded-full">
                            {tasksCount} משימות חניכה
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 sm:pt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={handleStepOneNext}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold px-6 py-3 rounded-xl shadow-md shadow-brand-500/20 transition-all text-sm"
                  >
                    <span>המשך לשלב הבא</span>
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: PROFILE DETAILS */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Selected Role Summary Banner */}
            <div className="p-4 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-600 text-white flex items-center justify-center">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-brand-700 font-semibold block">התפקיד שנבחר:</span>
                  <strong className="text-slate-900 text-sm font-bold">{selectedRole?.name}</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-brand-700 hover:text-brand-800 font-bold underline px-2 py-1"
              >
                שנה תפקיד
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              {/* Full Name */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-brand-600" />
                  <span>שם מלא</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="לדוגמה: ישראל ישראלי"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none text-sm"
                />
              </div>

              {/* Personal ID */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-brand-600" />
                  <span>מספר אישי (7 ספרות)</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={7}
                  value={personalId}
                  onChange={(e) => setPersonalId(e.target.value.replace(/\D/g, '').slice(0, 7))}
                  placeholder="7654321"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none text-sm font-mono tracking-widest text-center"
                  style={{ direction: 'ltr' }}
                />
              </div>

              {/* Role Entry Date */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-brand-600" />
                  <span>תאריך כניסה לתפקיד</span>
                </label>
                <input
                  type="date"
                  required
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none text-sm bg-white"
                />
              </div>

              {/* Previous Roles Tag Manager */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-brand-600" />
                  <span>תפקידים וניסיון קודם (אופציונלי)</span>
                </label>
                
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={currentTagInput}
                    onChange={(e) => setCurrentTagInput(e.target.value)}
                    onKeyDown={handleKeyDownTag}
                    placeholder="הקלד תפקיד קודם ולחץ Enter או הוסף..."
                    className="flex-1 px-4 py-2 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>הוסף</span>
                  </button>
                </div>

                {/* Tag List */}
                {previousRoles.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    {previousRoles.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 bg-white text-slate-800 border border-slate-200 text-xs font-semibold px-3 py-1 rounded-full shadow-xs"
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(idx)}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 mt-1">
                    לא נוספו עדיין תפקידים קודמים. ניתן לבחור מההצעות:
                  </div>
                )}

                {/* Suggestions */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['מפתח תוכנה', 'קצין מטה', 'ראש צוות', 'מנהל פרויקט', 'בוגר קורס קצינים', 'סטודנט'].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => addSuggestedTag(sug)}
                      className="text-[11px] bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200 transition-colors"
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Action Buttons */}
            <div className="pt-5 border-t border-slate-100 flex flex-col-reverse sm:flex-row gap-3 sm:gap-0 sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 text-slate-600 hover:text-slate-900 font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-slate-200 sm:border-transparent hover:bg-slate-100 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                <span>חזרה לבחירת תפקיד</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-700 hover:to-blue-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-brand-500/25 transition-all text-xs sm:text-sm"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>יוצר תוכנית חניכה...</span>
                  </>
                ) : (
                  <>
                    <span>סיום רישום וכניסה לדשבורד</span>
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
