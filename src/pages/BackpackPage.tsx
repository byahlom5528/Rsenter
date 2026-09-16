import React, { useState, useEffect, useMemo } from 'react';
import { 
  Briefcase, 
  Search, 
  FileText, 
  ExternalLink, 
  Eye, 
  PlayCircle,
  Video,
  X, 
  FolderOpen,
  Filter,
  Sparkles
} from 'lucide-react';
import { Task, Role } from '../types/database';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { ensureValidUrl, getMediaInfo } from '../utils/mediaUtils';

export const BackpackPage: React.FC = () => {
  const { currentUser, currentRole, isAdmin } = useAuth();

  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal Preview State
  const [previewTask, setPreviewTask] = useState<Task | null>(null);

  // 1. Initial Load of Roles & set active role
  useEffect(() => {
    const initRoles = async () => {
      try {
        const allRoles = await db.getRoles();
        setRoles(allRoles);

        // Determine default role: user's role if assigned, else first available role
        const defaultRoleId = currentUser?.role_id || (allRoles[0] ? allRoles[0].id : '');
        setSelectedRoleId(defaultRoleId);
      } catch (err) {
        console.error('Failed to load roles in Backpack', err);
      }
    };

    initRoles();
  }, [currentUser]);

  // 2. Load role tasks whenever selectedRoleId changes
  const loadRoleBackpack = async () => {
    if (!selectedRoleId) {
      setIsLoading(false);
      return;
    }

    try {
      const roleTasks = await db.getTasksByRole(selectedRoleId);
      setTasks(roleTasks);
    } catch (err) {
      console.error('Failed to load role tasks for backpack', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRoleBackpack();
    const unsubscribe = db.subscribe(loadRoleBackpack);
    return () => unsubscribe();
  }, [selectedRoleId, currentUser]);

  // Listen to Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewTask(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter tasks that have media_url AND are not hidden by admin
  const mediaTasks = useMemo(() => {
    return tasks.filter((t) => Boolean(t.media_url && t.media_url.trim().length > 0 && !t.hide_from_backpack));
  }, [tasks]);

  // Search filtering by title
  const filteredMediaTasks = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return mediaTasks.filter((task) => {
      if (!term) return true;
      return task.title.toLowerCase().includes(term);
    });
  }, [mediaTasks, searchTerm]);

  const activeRole = useMemo(() => {
    return roles.find((r) => r.id === selectedRoleId) || currentRole;
  }, [roles, selectedRoleId, currentRole]);

  return (
    <div className="space-y-8">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-slate-900 via-brand-950 to-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-white relative overflow-hidden shadow-xl border border-slate-800">
        <div className="relative z-10 max-w-3xl">
          
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="inline-flex items-center gap-1.5 bg-brand-500/20 text-brand-300 border border-brand-400/30 text-[11px] sm:text-xs font-semibold px-3 py-1 rounded-full">
              <Briefcase className="w-3.5 h-3.5 text-brand-400" />
              <span>התרמיל שלי • מרכז המדיה והידע</span>
            </div>

            {activeRole && (
              <span className="inline-flex items-center gap-1 bg-white/10 text-slate-200 border border-white/15 text-[11px] sm:text-xs font-bold px-3 py-1 rounded-full">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>{activeRole.name}</span>
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
            התרמיל של {activeRole?.name || 'התפקיד שלך'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
            מאגר המדיה והידע המותאם אישית לתפקידך – מרכז עבורך את כל סרטוני ההדרכה, המצגות, והמסמכים המקצועיים לצפייה ישירה.
          </p>

          {/* Admin Switch Role bar */}
          {isAdmin && roles.length > 1 && (
            <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold text-brand-300 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                <span>תצוגת תרמיל לפי תפקיד:</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {roles.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRoleId(r.id)}
                    className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all ${
                      selectedRoleId === r.id
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'bg-white/10 text-slate-300 hover:bg-white/20'
                    }`}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="sticky top-14 md:top-16 z-30 bg-slate-50/95 backdrop-blur-md py-2.5 -mx-3.5 px-3.5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-lg">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="חיפוש סרטון, הדרכה או מסמך בתרמיל לפי כותרת..."
            className="w-full pl-4 pr-10 py-2.5 bg-white rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none text-xs sm:text-sm shadow-xs font-medium"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Stats counter */}
        <div className="flex items-center gap-2 text-xs font-semibold shrink-0">
          <span className="bg-white border border-slate-200 px-3.5 py-1.5 rounded-xl text-slate-700 shadow-xs">
            סה"כ: <strong className="text-brand-600 font-bold">{mediaTasks.length}</strong> פריטי מדיה
          </span>
        </div>

      </div>

      {/* Media Cards Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-500">
          <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm font-medium">טוען משאבי מדיה מתאימים לתפקיד...</p>
        </div>
      ) : filteredMediaTasks.length === 0 ? (
        <div className="py-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 p-8 max-w-lg mx-auto shadow-xs">
          <FolderOpen className="w-14 h-14 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 mb-1">
            {searchTerm ? 'לא נמצאו פריטי מדיה תואמים' : 'אין עדיין פריטי מדיה בתפקיד זה'}
          </h3>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            {searchTerm 
              ? 'נסה לחפש במילים אחרות או נקה את שורת החיפוש.'
              : 'כאשר יתווספו קישורי וידאו, הדרכות או מסמכים לתפקיד זה, הם יופיעו כאן מיד.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMediaTasks.map((task) => {
            const mediaUrl = task.media_url || '';
            const mediaInfo = getMediaInfo(mediaUrl);

            return (
              <div
                key={task.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md hover:border-brand-300 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Card Top: Media Type Badge & Expand button */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div>
                      {mediaInfo.type === 'youtube' || mediaInfo.type === 'loom' ? (
                        <span className="text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1.5">
                          <Video className="w-3.5 h-3.5 text-red-600" />
                          <span>וידאו YouTube</span>
                        </span>
                      ) : mediaInfo.type === 'google_drive' ? (
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-amber-600" />
                          <span>Google Drive</span>
                        </span>
                      ) : mediaInfo.type === 'direct_video' ? (
                        <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1.5">
                          <PlayCircle className="w-3.5 h-3.5 text-blue-600" />
                          <span>סרטון וידאו</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          <span>מסמך / קובץ הדרכה</span>
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setPreviewTask(task)}
                      className="text-slate-400 hover:text-brand-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                      title="תצוגה מקדימה מלאה"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Title (Primary Identifier - same as task title) */}
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900 group-hover:text-brand-700 transition-colors leading-snug mb-3">
                    {task.title}
                  </h3>

                  {/* Embedded Media Player */}
                  {mediaUrl && (
                    <div className="mb-4 rounded-xl overflow-hidden border border-slate-200 bg-slate-950 shadow-inner">
                      <div className="p-2 bg-slate-900 text-slate-300 text-xs font-semibold flex items-center justify-between border-b border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <PlayCircle className="w-3.5 h-3.5 text-brand-400" />
                          <span className="text-[11px]">מדיה וצפייה</span>
                        </div>
                        <a
                          href={ensureValidUrl(mediaUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-brand-400 hover:text-brand-300 underline flex items-center gap-1 font-medium"
                        >
                          <span>פתיחה בחלון חדש</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      
                      <div className="w-full bg-black">
                        {(mediaInfo.type === 'youtube' || mediaInfo.type === 'google_drive' || mediaInfo.type === 'loom') && mediaInfo.embedUrl ? (
                          <div>
                            <div className="aspect-video w-full max-h-[260px]">
                              <iframe
                                src={mediaInfo.embedUrl}
                                title={task.title}
                                className="w-full h-full border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              ></iframe>
                            </div>
                            {mediaInfo.type === 'google_drive' && (
                              <div className="bg-slate-900/90 px-3 py-1.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-300">
                                <span>💡 דורש הרשאה?</span>
                                <a
                                  href={ensureValidUrl(mediaUrl)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-brand-400 hover:text-brand-300 font-bold underline flex items-center gap-1 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20"
                                >
                                  <span>פתח ב-Google Drive</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            )}
                          </div>
                        ) : mediaInfo.type === 'direct_video' && mediaInfo.embedUrl ? (
                          <div className="w-full max-h-[260px] flex justify-center bg-black">
                            <video
                              controls
                              src={mediaInfo.embedUrl}
                              className="w-full max-h-[260px]"
                            >
                              הדפדפן אינו תומך בניגון וידאו זה.
                            </video>
                          </div>
                        ) : (
                          <div className="w-full py-5 flex flex-col items-center justify-center text-slate-400 p-3 text-center">
                            <FileText className="w-7 h-7 text-slate-500 mb-1.5" />
                            <p className="text-xs font-medium text-slate-300 mb-2">מסמך / קובץ הדרכה</p>
                            <a
                              href={ensureValidUrl(mediaUrl)}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-xs"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>צפייה במסמך / קישור</span>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Bottom Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setPreviewTask(task)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-brand-50 text-slate-700 hover:text-brand-700 font-bold text-xs py-2 px-3 rounded-lg border border-slate-200 hover:border-brand-200 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>תצוגה מקדימה מלאה</span>
                  </button>

                  <a
                    href={ensureValidUrl(mediaUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 font-bold text-xs py-2 px-3 rounded-lg border border-slate-200 transition-colors"
                    title="פתיחה ישירה בחלון חדש"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>פתיחה</span>
                  </a>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewTask && (
        <div 
          onClick={() => setPreviewTask(null)}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
          >
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">
                  <Briefcase className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900">{previewTask.title}</h3>
                  <span className="text-xs text-slate-500">משאב מדיה מתוך התרמיל</span>
                </div>
              </div>

              <button
                onClick={() => setPreviewTask(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">

              {/* Embedded Player */}
              {(() => {
                const mediaUrl = previewTask.media_url || '';
                const mediaInfo = getMediaInfo(mediaUrl);

                return (
                  <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-950 shadow-inner">
                    <div className="p-2.5 bg-slate-900 text-slate-300 text-xs font-semibold flex items-center justify-between border-b border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <PlayCircle className="w-4 h-4 text-brand-400" />
                        <span>נגן מדיה והדרכה</span>
                      </div>
                      <a
                        href={ensureValidUrl(mediaUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-brand-400 hover:text-brand-300 underline flex items-center gap-1 font-medium"
                      >
                        <span>פתיחה ישירה בחלון חדש</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    <div className="w-full bg-black">
                      {(mediaInfo.type === 'youtube' || mediaInfo.type === 'google_drive' || mediaInfo.type === 'loom') && mediaInfo.embedUrl ? (
                        <div className="aspect-video w-full max-h-[440px]">
                          <iframe
                            src={mediaInfo.embedUrl}
                            title={previewTask.title}
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          ></iframe>
                        </div>
                      ) : mediaInfo.type === 'direct_video' && mediaInfo.embedUrl ? (
                        <div className="w-full max-h-[440px] flex justify-center bg-black">
                          <video controls src={mediaInfo.embedUrl} className="w-full max-h-[440px]">
                            הדפדפן אינו תומך בניגון וידאו זה.
                          </video>
                        </div>
                      ) : (
                        <div className="w-full py-8 flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                          <FileText className="w-12 h-12 text-slate-500 mb-2" />
                          <h5 className="font-bold text-slate-200 text-sm mb-1">{previewTask.title}</h5>
                          <p className="text-xs text-slate-400 mb-4">מסמך / קישור לעיון חיצוני</p>
                          <a
                            href={ensureValidUrl(mediaUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span>פתח את המסמך / הקישור</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <a
                href={ensureValidUrl(previewTask.media_url || '')}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <span>פתיחה ישירה בחלון חדש</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={() => setPreviewTask(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                סגור תצוגה
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
