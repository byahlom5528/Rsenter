import React, { useState, useEffect, useMemo } from 'react';
import { 
  Briefcase, 
  Search, 
  FileText, 
  ExternalLink, 
  Eye, 
  Download, 
  BookOpen, 
  ShieldAlert, 
  Presentation, 
  Link as LinkIcon, 
  X, 
  FolderOpen 
} from 'lucide-react';
import { BackpackResource } from '../types/database';
import { db } from '../services/db';
import { ensureValidUrl } from '../utils/mediaUtils';

export const BackpackPage: React.FC = () => {
  const [resources, setResources] = useState<BackpackResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Modal Preview State
  const [previewResource, setPreviewResource] = useState<BackpackResource | null>(null);

  const loadResources = async () => {
    try {
      const data = await db.getBackpackResources();
      setResources(data);
    } catch (err) {
      console.error('Failed to load backpack resources', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
    const unsubscribe = db.subscribe(loadResources);
    return () => unsubscribe();
  }, []);

  // Listen to Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewResource(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Extract dynamic list of categories
  const categories = useMemo(() => {
    return ['all', ...Array.from(new Set(resources.map((r) => r.category)))];
  }, [resources]);

  // Filtering
  const filteredResources = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return resources.filter((res) => {
      const matchesCategory = selectedCategory === 'all' || res.category === selectedCategory;
      if (!matchesCategory) return false;
      if (!term) return true;
      return (
        res.title.toLowerCase().includes(term) ||
        res.description.toLowerCase().includes(term) ||
        res.category.toLowerCase().includes(term)
      );
    });
  }, [resources, selectedCategory, searchTerm]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'אבטחת מידע':
        return <ShieldAlert className="w-4 h-4 text-rose-500" />;
      case 'מצגות והדרכות':
        return <Presentation className="w-4 h-4 text-amber-500" />;
      case 'קישורים שימושיים':
        return <LinkIcon className="w-4 h-4 text-blue-500" />;
      case 'נהלים ופקודות':
        return <BookOpen className="w-4 h-4 text-emerald-500" />;
      default:
        return <FileText className="w-4 h-4 text-brand-500" />;
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-slate-900 via-brand-950 to-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-8 text-white relative overflow-hidden shadow-xl border border-slate-800">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 bg-brand-500/20 text-brand-300 border border-brand-400/30 text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full mb-2">
            <Briefcase className="w-3.5 h-3.5" />
            <span>ספריית ידע, נהלים ומסמכים</span>
          </div>

          <h1 className="text-xl sm:text-3xl font-black tracking-tight text-white mb-1.5">
            התרמיל שלי
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            מאגר המשאבים, הנהלים, המצגות והטפסים המלווים את כניסתך לתפקיד.
          </p>
        </div>
      </div>

      {/* Search & Category Filter Controls */}
      <div className="sticky top-14 md:top-16 z-30 bg-slate-50/95 backdrop-blur-md py-2.5 -mx-3.5 px-3.5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
        
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="חיפוש מסמך, נוהל או מדריך..."
            className="w-full pl-4 pr-10 py-2.5 bg-white rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none text-xs sm:text-sm shadow-xs"
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

        {/* Category Pills (Horizontal scroll on mobile) */}
        <div className="flex gap-1.5 items-center overflow-x-auto pb-1.5 -mx-3.5 px-3.5 sm:mx-0 sm:px-0 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                selectedCategory === cat
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {cat === 'all' ? 'הכל' : cat}
            </button>
          ))}
        </div>

      </div>

      {/* Resource Cards Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-500">
          <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm">טוען משאבי ידע...</p>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="py-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
          <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700 mb-1">לא נמצאו משאבים מתאימים</h3>
          <p className="text-xs text-slate-400">נסה לשנות את מילות החיפוש או לבחור קטגוריה אחרת</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredResources.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-brand-300 transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Card Top: Category & Icon */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200">
                    {getCategoryIcon(item.category)}
                    <span>{item.category}</span>
                  </span>

                  {item.external_link ? (
                    <span className="text-[11px] text-blue-600 bg-blue-50 font-bold px-2 py-0.5 rounded">
                      קישור חיצוני
                    </span>
                  ) : (
                    <span className="text-[11px] text-emerald-700 bg-emerald-50 font-bold px-2 py-0.5 rounded">
                      קובץ מסמך
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="font-bold text-base text-slate-900 mb-2 group-hover:text-brand-700 transition-colors leading-snug">
                  {item.title}
                </h3>

                {/* Description */}
                <p className="text-xs text-slate-600 leading-relaxed mb-4 line-clamp-3">
                  {item.description}
                </p>
              </div>

              {/* Card Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setPreviewResource(item)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-brand-50 text-slate-700 hover:text-brand-700 font-bold text-xs py-2 px-3 rounded-lg border border-slate-200 hover:border-brand-200 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>תצוגה מקדימה</span>
                </button>

                {item.file_url ? (
                  <a
                    href={ensureValidUrl(item.file_url)}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="flex items-center justify-center gap-1 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs py-2 px-3 rounded-lg border border-slate-200 transition-colors"
                    title="הורדת קובץ"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                ) : item.external_link ? (
                  <a
                    href={ensureValidUrl(item.external_link)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-3 rounded-lg shadow-xs transition-colors"
                    title="מעבר לקישור"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : null}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Preview Modal with Backdrop Click Dismissal */}
      {previewResource && (
        <div 
          onClick={() => setPreviewResource(null)}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]"
          >
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
                  {getCategoryIcon(previewResource.category)}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">{previewResource.title}</h3>
                  <span className="text-xs text-slate-500">{previewResource.category}</span>
                </div>
              </div>

              <button
                onClick={() => setPreviewResource(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-1">תקציר המסמך</h4>
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {previewResource.description}
                </p>
              </div>

              {/* Embedded Document Mock Preview */}
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-100 p-8 text-center">
                <FileText className="w-16 h-16 text-slate-400 mx-auto mb-3" />
                <h5 className="font-bold text-slate-800 text-sm mb-1">{previewResource.title}</h5>
                <p className="text-xs text-slate-500 mb-4">
                  תצוגה מקדימה של מסמך ההנחיות והפקודות הרשמי
                </p>

                <div className="flex items-center justify-center gap-3 flex-wrap">
                  {previewResource.file_url && (
                    <a
                      href={ensureValidUrl(previewResource.file_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-sm transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>הורד מסמך מקור</span>
                    </a>
                  )}

                  {previewResource.external_link && (
                    <a
                      href={ensureValidUrl(previewResource.external_link)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-sm transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>פתח בפורטל החיצוני</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewResource(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors"
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
