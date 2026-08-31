import React, { useState, useEffect, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  CheckCircle2, 
  Lock, 
  PlayCircle, 
  HelpCircle, 
  Calendar, 
  Award, 
  Sparkles, 
  AlertCircle, 
  Video, 
  FileText, 
  MessageSquare, 
  Check, 
  Trophy, 
  Briefcase, 
  ShieldAlert, 
  ExternalLink,
  Edit3,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/db';
import { TaskWithProgress } from '../types/database';
import { getMediaInfo, ensureValidUrl } from '../utils/mediaUtils';

export const DashboardPage: React.FC = () => {
  const { currentUser, currentRole, isAdmin, refreshUserData } = useAuth();
  
  const [tasksWithProgress, setTasksWithProgress] = useState<TaskWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  
  // State for task answer submissions
  const [answersState, setAnswersState] = useState<Record<string, string>>({});
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);
  const [errorMessages, setErrorMessages] = useState<Record<string, string>>({});
  const [editingAnswerTaskId, setEditingAnswerTaskId] = useState<string | null>(null);

  const loadDashboardData = async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    if (!currentUser.role_id) {
      setIsLoading(false);
      return;
    }

    try {
      const roleTasks = await db.getTasksByRole(currentUser.role_id);
      const userProgress = await db.getUserProgress(currentUser.id);

      // Pre-fill answer state from existing progress
      const initialAnswers: Record<string, string> = {};
      userProgress.forEach((p) => {
        if (p.answer_text) {
          initialAnswers[p.task_id] = p.answer_text;
        }
      });
      setAnswersState((prev) => ({ ...initialAnswers, ...prev }));

      // Build sequential locking state
      let previousTaskCompleted = true; // Task 1 is always unlocked
      const tasksProcessed: TaskWithProgress[] = [];

      for (let i = 0; i < roleTasks.length; i++) {
        const task = roleTasks[i];
        const progress = userProgress.find((p) => p.task_id === task.id);
        const isCompleted = Boolean(progress?.is_completed);

        const isLocked = !previousTaskCompleted;
        const isCurrentActive = previousTaskCompleted && !isCompleted;

        tasksProcessed.push({
          ...task,
          progress,
          isLocked,
          isCurrentActive,
        });

        // Current task must be completed to unlock the next task
        previousTaskCompleted = isCompleted;
      }

      setTasksWithProgress(tasksProcessed);
    } catch (err) {
      console.error('Failed to load dashboard tasks', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const unsubscribe = db.subscribe(loadDashboardData);
    return () => unsubscribe();
  }, [currentUser]);

  // Memoize task stats
  const { totalTasks, completedTasks, progressPercent, isAllCompleted } = useMemo(() => {
    const total = tasksWithProgress.length;
    const completed = tasksWithProgress.filter((t) => t.progress?.is_completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      totalTasks: total,
      completedTasks: completed,
      progressPercent: percent,
      isAllCompleted: total > 0 && completed === total,
    };
  }, [tasksWithProgress]);

  // Calculate days in role
  const calculateDaysInRole = () => {
    if (!currentUser?.entry_date) return 1;
    const entry = new Date(currentUser.entry_date);
    const now = new Date();
    const diff = Math.floor((now.getTime() - entry.getTime()) / (1000 * 3600 * 24));
    return Math.max(1, diff);
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#0e8ee9', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']
    });
  };

  const handleCompleteTask = async (task: TaskWithProgress) => {
    if (!currentUser) return;
    
    const currentAnswer = answersState[task.id] || '';

    // If task requires answer, validate it with minimum 4 characters
    if (task.type === 'media_question' || task.type === 'text_question') {
      if (!currentAnswer.trim() || currentAnswer.trim().length < 4) {
        setErrorMessages({
          ...errorMessages,
          [task.id]: 'נא למלא תשובה מנומקת (לפחות 4 תווים) כדי להשלים שלב זה.',
        });
        return;
      }
    }

    setSubmittingTaskId(task.id);
    setErrorMessages({ ...errorMessages, [task.id]: '' });

    try {
      await db.completeTask(currentUser.id, task.id, currentAnswer.trim() || undefined);
      triggerConfetti();
      setEditingAnswerTaskId(null);
      await loadDashboardData();
      await refreshUserData();
    } catch (err) {
      console.error('Failed to complete task', err);
      setErrorMessages({
        ...errorMessages,
        [task.id]: 'שגיאה בשמירת סטטוס המשימה. אנא נסה שוב.',
      });
    } finally {
      setSubmittingTaskId(null);
    }
  };

  const filteredTasks = useMemo(() => {
    if (filter === 'pending') return tasksWithProgress.filter((t) => !t.progress?.is_completed);
    if (filter === 'completed') return tasksWithProgress.filter((t) => t.progress?.is_completed);
    return tasksWithProgress;
  }, [tasksWithProgress, filter]);

  if (isLoading) {
    return (
      <div className="py-20 text-center text-slate-500">
        <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sm font-semibold">טוען את תוכנית החניכה האישית שלך...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* 1. Header & Hero Progress Card */}
      <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-l from-slate-900 via-navy-900 to-slate-900 text-white p-4 sm:p-8 shadow-xl shadow-slate-900/10 overflow-hidden border border-slate-800">
        
        {/* Ambient background glow elements */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 right-10 w-72 h-72 bg-blue-600/15 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          
          {/* User & Role Details */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="bg-brand-500/20 text-brand-300 border border-brand-400/30 text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-brand-400" />
                <span>מסלול חניכה אישי</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                מ.א: {currentUser?.personal_id}
              </span>
            </div>

            <h1 className="text-xl sm:text-3xl font-black tracking-tight text-white mb-2">
              שלום, {currentUser?.full_name} 👋
            </h1>

            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-300">
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/10">
                <Briefcase className="w-3.5 h-3.5 text-brand-400" />
                <span className="font-semibold">{currentRole?.name || (isAdmin ? 'מנהל מערכת' : 'חניך חדש')}</span>
              </div>

              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/10">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>יום {calculateDaysInRole()} בתפקיד</span>
              </div>
            </div>
          </div>

          {/* Overall Progress Gauge */}
          {totalTasks > 0 ? (
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl sm:rounded-2xl p-4 sm:p-5 w-full md:w-auto md:min-w-[260px] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">סטטוס התקדמות</span>
                <span className="text-xl sm:text-2xl font-extrabold text-brand-300 font-mono">{progressPercent}%</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-3 bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-white/10 mb-2">
                <div
                  className="h-full bg-gradient-to-r from-brand-500 to-emerald-400 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-300 font-medium">
                <span>{completedTasks}/{totalTasks} הושלמו</span>
                {isAllCompleted ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" /> הושלם!
                  </span>
                ) : (
                  <span className="text-brand-300">
                    נותרו {totalTasks - completedTasks} משימות
                  </span>
                )}
              </div>
            </div>
          ) : (
            isAdmin && (
              <NavLink
                to="/admin"
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-colors"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>מעבר למרכז הניהול</span>
              </NavLink>
            )
          )}

        </div>

      </div>

      {/* Admin Notice Card if user is Admin and has no tasks assigned directly */}
      {isAdmin && totalTasks === 0 && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-5 text-right shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-amber-950">
                אתה מחובר כמנהל מערכת ראשי (0000000)
              </h3>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                דשבורד המשימות מיועד למעקב חניכים אישי לפי תפקיד. באפשרותך לגשת למרכז הניהול לצפייה בכל החניכים, עריכת תוכניות ומשימות.
              </p>
            </div>
          </div>
          <NavLink
            to="/admin"
            className="w-full sm:w-auto text-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0"
          >
            פתח מרכז ניהול
          </NavLink>
        </div>
      )}

      {/* 2. All Completed Celebration Banner */}
      {isAllCompleted && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-2xl p-4 sm:p-6 shadow-lg shadow-emerald-500/20 border border-emerald-400/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white shrink-0 backdrop-blur-sm">
              <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-xl font-extrabold mb-1">כל הכבוד! השלמת את כל משימות הכניסה לתפקיד! 🎉</h3>
              <p className="text-xs sm:text-sm text-emerald-100">
                הוסמכת בהצלחה לתפקיד <strong>{currentRole?.name}</strong>. כל התשובות והידע נשמרו בפרופיל שלך.
              </p>
            </div>
          </div>
          <button
            onClick={triggerConfetti}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-emerald-800 font-bold px-4 py-2.5 rounded-xl shadow hover:bg-emerald-50 transition-colors text-xs sm:text-sm shrink-0"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>חגוג שוב</span>
          </button>
        </div>
      )}

      {/* 3. Filter Tabs & Task Counter Header */}
      {totalTasks > 0 && (
        <div className="sticky top-14 md:top-16 z-30 bg-slate-50/95 backdrop-blur-md py-2.5 -mx-3.5 px-3.5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>מסלול משימות רציף</span>
              <span className="text-[11px] sm:text-xs bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full border border-slate-200">
                {tasksWithProgress.length} שלבים
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              משימות נפתחות ברצף עוקב – כל משימה פותחת את השלב הבא
            </p>
          </div>

          {/* Filter Pills (Scrollable on mobile) */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto -mx-3.5 px-3.5 sm:mx-0 sm:px-1 no-scrollbar shrink-0">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all ${
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              הכל ({tasksWithProgress.length})
            </button>

            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all ${
                filter === 'pending'
                  ? 'bg-white text-brand-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              לביצוע ({totalTasks - completedTasks})
            </button>

            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all ${
                filter === 'completed'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              הושלמו ({completedTasks})
            </button>
          </div>
        </div>
      )}

      {/* 4. Sequential Tasks List */}
      <div className="space-y-4 sm:space-y-5">
        {totalTasks === 0 && !isAdmin ? (
          <div className="py-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-base mb-1">לא נמצאו משימות עבור תפקידך</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              מנהל המערכת טרם הגדיר שלבי חניכה עבור תפקיד זה. פנה למנהל לצורך שיוך משימות.
            </p>
          </div>
        ) : filteredTasks.length === 0 && totalTasks > 0 ? (
          <div className="py-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="font-bold text-slate-700 text-sm">אין משימות להצגה בקטגוריה זו</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isCompleted = Boolean(task.progress?.is_completed);
            const isLocked = task.isLocked;
            const isActive = task.isCurrentActive;
            const isSubmitting = submittingTaskId === task.id;
            const error = errorMessages[task.id];
            const isEditingAnswer = editingAnswerTaskId === task.id;
            const mediaInfo = getMediaInfo(task.media_url);

            return (
              <div
                key={task.id}
                className={`rounded-2xl transition-all duration-200 border text-right overflow-hidden ${
                  isCompleted
                    ? 'bg-white/90 border-emerald-200 shadow-xs'
                    : isActive
                    ? 'bg-white border-brand-500 shadow-lg shadow-brand-500/10 ring-2 ring-brand-500/20'
                    : 'bg-slate-50/80 border-slate-200/80 opacity-75'
                }`}
              >
                
                {/* Task Header Bar */}
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                    
                    {/* Step badge & Title */}
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 transition-transform ${
                        isCompleted
                          ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                          : isActive
                          ? 'bg-brand-600 text-white shadow-md shadow-brand-500/30 scale-105'
                          : 'bg-slate-200 text-slate-500'
                      }`}>
                        {isCompleted ? (
                          <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
                        ) : isLocked ? (
                          <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        ) : (
                          <span>{task.step_order}</span>
                        )}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className="text-[11px] font-extrabold text-slate-500">שלב #{task.step_order}</span>
                          
                          {/* Task Type Tag */}
                          {task.type === 'simple_check' && (
                            <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-slate-500" />
                              <span>קריאה ואישור</span>
                            </span>
                          )}
                          {task.type === 'media_question' && (
                            <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200 flex items-center gap-1">
                              <Video className="w-3 h-3 text-blue-600" />
                              <span>מדיה + שאלה</span>
                            </span>
                          )}
                          {task.type === 'text_question' && (
                            <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md border border-purple-200 flex items-center gap-1">
                              <MessageSquare className="w-3 h-3 text-purple-600" />
                              <span>שאלת הבנה</span>
                            </span>
                          )}

                          {/* Status Badge */}
                          {isCompleted && (
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>הושלם</span>
                            </span>
                          )}
                          {isActive && (
                            <span className="text-[10px] font-bold bg-brand-100 text-brand-800 px-2 py-0.5 rounded-full animate-pulse">
                              לביצוע כעת
                            </span>
                          )}
                          {isLocked && (
                            <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" />
                              <span>נעול</span>
                            </span>
                          )}
                        </div>

                        <h3 className={`text-sm sm:text-base font-bold ${isLocked ? 'text-slate-600' : 'text-slate-900'}`}>
                          {task.title}
                        </h3>
                      </div>
                    </div>

                    {/* Completion Date */}
                    {isCompleted && task.progress?.completed_at && (
                      <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-lg font-medium self-start sm:self-auto">
                        הושלם ב-{new Date(task.progress.completed_at).toLocaleDateString('he-IL')}
                      </span>
                    )}
                  </div>

                  {/* Task Instructions */}
                  <p className={`text-xs sm:text-sm leading-relaxed mb-3 ${isLocked ? 'text-slate-500' : 'text-slate-700'}`}>
                    {task.description}
                  </p>

                  {/* MEDIA EMBED (If type === 'media_question') */}
                  {task.type === 'media_question' && task.media_url && !isLocked && (
                    <div className="mb-4 rounded-xl overflow-hidden border border-slate-200 bg-slate-950 shadow-inner">
                      <div className="p-2 bg-slate-900 text-slate-300 text-xs font-semibold flex items-center justify-between border-b border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <PlayCircle className="w-3.5 h-3.5 text-brand-400" />
                          <span className="text-[11px]">מדיה והדרכה מקושרת</span>
                        </div>
                        <a
                          href={ensureValidUrl(task.media_url)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-brand-400 hover:text-brand-300 underline flex items-center gap-1"
                        >
                          <span>פתיחה בחלון חדש</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      
                      <div className="w-full bg-black">
                        {(mediaInfo.type === 'youtube' || mediaInfo.type === 'google_drive' || mediaInfo.type === 'loom') && mediaInfo.embedUrl ? (
                          <div>
                            <div className="aspect-video w-full max-h-[380px]">
                              <iframe
                                src={mediaInfo.embedUrl}
                                title={task.title}
                                className="w-full h-full border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              ></iframe>
                            </div>
                            {mediaInfo.type === 'google_drive' && (
                              <div className="bg-slate-900/90 px-3 py-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
                                <span>💡 אם הקובץ לא נטען או דורש הרשאה:</span>
                                <a
                                  href={ensureValidUrl(task.media_url)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-brand-400 hover:text-brand-300 font-bold underline flex items-center gap-1 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20"
                                >
                                  <span>פתיחה ישירה ב-Google Drive</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            )}
                          </div>
                        ) : mediaInfo.type === 'direct_video' && mediaInfo.embedUrl ? (
                          <div className="w-full max-h-[360px] flex justify-center bg-black">
                            <video
                              controls
                              src={mediaInfo.embedUrl}
                              className="w-full max-h-[360px]"
                            >
                              הדפדפן אינו תומך בניגון וידאו זה.
                            </video>
                          </div>
                        ) : (
                          <div className="w-full py-6 flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                            <FileText className="w-8 h-8 text-slate-500 mb-2" />
                            <p className="text-xs font-medium text-slate-300 mb-2">מסמך / קישור הדרכה מקושר</p>
                            <a
                              href={ensureValidUrl(task.media_url)}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-xs"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>צפייה במסמך / קישור</span>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* QUESTION PROMPT & INPUT (If media_question or text_question) */}
                  {(task.type === 'media_question' || task.type === 'text_question') && (
                    <div className="mb-3.5">
                      {task.question_prompt && (
                        <div className={`p-3 rounded-xl mb-2.5 flex items-start gap-2 ${
                          isLocked ? 'bg-slate-100 text-slate-500' : 'bg-brand-50/60 border border-brand-200/70 text-slate-900'
                        }`}>
                          <HelpCircle className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[11px] font-bold text-brand-800 block mb-0.5">שאלת אימות והבנה:</span>
                            <span className="text-xs sm:text-sm font-semibold">{task.question_prompt}</span>
                          </div>
                        </div>
                      )}

                      {/* If task is completed and not currently editing: Show submitted answer */}
                      {isCompleted && !isEditingAnswer && (
                        <div className="p-3 sm:p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>התשובה שהוגשה:</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAnswerTaskId(task.id);
                                setAnswersState((prev) => ({
                                  ...prev,
                                  [task.id]: task.progress?.answer_text || '',
                                }));
                              }}
                              className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 hover:underline"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>ערוך תשובה</span>
                            </button>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed bg-white p-2.5 sm:p-3 rounded-lg border border-emerald-100 font-normal">
                            {task.progress?.answer_text || 'לא הוזנה תשובה טקסטואלית.'}
                          </p>
                        </div>
                      )}

                      {/* If task is Active or user is editing existing answer: Textarea input */}
                      {(isActive || (isCompleted && isEditingAnswer)) && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-bold text-slate-700">
                              {isCompleted ? 'עריכת התשובה:' : 'הזן את תשובתך:'}
                            </label>
                            {isCompleted && isEditingAnswer && (
                              <button
                                type="button"
                                onClick={() => setEditingAnswerTaskId(null)}
                                className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-0.5"
                              >
                                <X className="w-3 h-3" />
                                <span>ביטול עריכה</span>
                              </button>
                            )}
                          </div>
                          <textarea
                            rows={3}
                            value={answersState[task.id] ?? ''}
                            onChange={(e) => setAnswersState({ ...answersState, [task.id]: e.target.value })}
                            placeholder="כתוב את תשובתך כאן בהתאם להנחיות..."
                            className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all resize-y bg-white"
                          ></textarea>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error display */}
                  {error && (
                    <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-600 font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Action Area for Active Task or Editing Completed Answer */}
                  {(isActive || (isCompleted && isEditingAnswer)) && (
                    <div className="pt-2 flex items-center justify-end">
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleCompleteTask(task)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-700 hover:to-blue-700 text-white font-bold px-6 py-3 sm:py-2.5 rounded-xl shadow-md shadow-brand-500/25 text-xs sm:text-sm transition-all"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>שומר נתונים...</span>
                          </>
                        ) : (
                          <>
                            <span>
                              {isCompleted 
                                ? 'שמור שינויים בתשובה' 
                                : task.type === 'simple_check' 
                                ? 'סמן כמשימה שהושלמה' 
                                : 'הגש תשובה והשלם שלב'}
                            </span>
                            <CheckCircle2 className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Locked notice */}
                  {isLocked && (
                    <div className="pt-1 flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500 font-medium">
                      <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        משימה זו נעולה עד להשלמת השלב הקודם ({task.step_order > 1 ? `שלב #${task.step_order - 1}` : 'השלב הקודם'}).
                      </span>
                    </div>
                  )}

                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
