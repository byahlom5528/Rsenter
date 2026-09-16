import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, 
  Users, 
  CheckSquare, 
  Briefcase, 
  Network, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  ArrowUp, 
  ArrowDown, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Download,
  GraduationCap,
  Award,
  Check,
  TrendingUp,
  RotateCcw,
  Video,
  PlayCircle,
  FileText,
  ExternalLink,
  Sparkles,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/db';
import { 
  UserProgressOverview, 
  Role, 
  Task, 
  OrgNode,
  TaskType,
  BinaryQuestionItem
} from '../types/database';
import { ensureValidUrl, getMediaInfo } from '../utils/mediaUtils';
import { 
  parseBinaryQuestions, 
  serializeBinaryQuestions, 
  parseBinaryAnswers 
} from '../utils/binaryQuestions';

export const AdminPage: React.FC = () => {
  useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'users' | 'tasks' | 'backpack' | 'orgTree'>('users');
  const [isLoading, setIsLoading] = useState(true);

  // 1. Users Progress State
  const [userOverviews, setUserOverviews] = useState<UserProgressOverview[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedUserOverview, setSelectedUserOverview] = useState<UserProgressOverview | null>(null);

  // 2. Tasks & Roles CMS State
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const selectedRoleIdRef = useRef<string>('');
  selectedRoleIdRef.current = selectedRoleId;

  const [currentRoleTasks, setCurrentRoleTasks] = useState<Task[]>([]);
  const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);
  const [binaryQuestions, setBinaryQuestions] = useState<BinaryQuestionItem[]>([
    { id: 'bq_1', question: '', option1: 'כן', option2: 'לא' }
  ]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleFormName, setRoleFormName] = useState('');
  const [roleFormDesc, setRoleFormDesc] = useState('');

  // 3. Backpack Media CMS State
  const [isAddMediaModalOpen, setIsAddMediaModalOpen] = useState(false);
  const [newMediaForm, setNewMediaForm] = useState<{
    id?: string;
    title: string;
    media_url: string;
    role_id: string;
    show_in_backpack: boolean;
  }>({
    id: undefined,
    title: '',
    media_url: '',
    role_id: '',
    show_in_backpack: true,
  });

  // 4. Org Tree CMS State
  const [orgNodes, setOrgNodes] = useState<OrgNode[]>([]);
  const [editingNode, setEditingNode] = useState<Partial<OrgNode> | null>(null);
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
  const [customInterfaceRoleId, setCustomInterfaceRoleId] = useState<string>('');

  // System notification banner
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleSyncToSupabase = async () => {
    setIsSyncingSupabase(true);
    try {
      const res = await db.syncLocalTasksToSupabase();
      if (res.errors.length === 0) {
        showStatus(`סנכרון מלא לסופרבייס הושלם בהצלחה! (${res.synced} משימות ופריטי מדיה)`);
      } else if (res.synced > 0) {
        showStatus(`סונכרנו ${res.synced} מתוך ${res.total} פריטים לסופרבייס. חלק מהפריטים נדחו - יש להריץ את סקריפט ה-SQL בסופרבייס`, 'error');
      } else {
        showStatus(`שגיאה בסנכרון לסופרבייס: יש לוודא שהורץ סקריפט ה-SQL בסופרבייס לעדכון עמודות המדיה`, 'error');
      }
      await loadAllData(false);
    } catch (err) {
      console.error('Failed to sync to Supabase', err);
      showStatus('שגיאה בסנכרון מול Supabase', 'error');
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  const loadAllData = async (showSpinner = false) => {
    if (showSpinner) setIsLoading(true);
    try {
      const [overviews, allRoles, nodes] = await Promise.all([
        db.getAllUsersProgressOverview(),
        db.getRoles(),
        db.getOrgNodes(),
      ]);

      setUserOverviews(overviews);
      setRoles(allRoles);
      setOrgNodes(nodes);

      const targetRole = selectedRoleIdRef.current || (allRoles[0] ? allRoles[0].id : '');
      selectedRoleIdRef.current = targetRole;
      setSelectedRoleId(targetRole);
      if (targetRole) {
        const tasks = await db.getTasksByRole(targetRole);
        setCurrentRoleTasks(tasks);
      }
    } catch (err) {
      console.error('Failed to load admin data', err);
      showStatus('שגיאה בטעינת נתוני ניהול', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData(true);
    const unsubscribe = db.subscribe(() => {
      loadAllData(false);
    });
    return () => unsubscribe();
  }, []);

  // Listen to Escape key to close any active modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsTaskModalOpen(false);
        setIsRoleModalOpen(false);
        setIsAddMediaModalOpen(false);
        setIsNodeModalOpen(false);
        setEditingTask(null);
        setEditingRole(null);
        setEditingNode(null);
        setSelectedUserOverview(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update role tasks when selected role changes
  const handleRoleChange = async (roleId: string) => {
    selectedRoleIdRef.current = roleId;
    setSelectedRoleId(roleId);
    const tasks = await db.getTasksByRole(roleId);
    setCurrentRoleTasks(tasks);
  };


  // ==================== CSV EXPORT ====================
  const handleExportCSV = () => {
    if (userOverviews.length === 0) {
      showStatus('אין נתונים לייצוא', 'error');
      return;
    }

    const escapeCSV = (val: string | number | undefined | null) => {
      const str = String(val ?? '').replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = ['שם מלא', 'מספר אישי', 'תפקיד', 'תאריך כניסה', 'אחוז השלמה', 'משימות שהושלמו', 'סה"כ משימות', 'פעילות אחרונה'];
    const rows = userOverviews.map((item) => [
      escapeCSV(item.user.full_name),
      escapeCSV(item.user.personal_id),
      escapeCSV(item.role?.name || 'ללא תפקיד'),
      escapeCSV(item.user.entry_date),
      escapeCSV(`${item.completionPercentage}%`),
      escapeCSV(item.completedTasks),
      escapeCSV(item.totalTasks),
      escapeCSV(item.lastActive ? new Date(item.lastActive).toLocaleDateString('he-IL') : '-')
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `onboarding_trainees_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showStatus('דוח החניכים יוצא בהצלחה לקובץ CSV!');
  };

  const handleResetUserProgress = async (userId: string, userName: string) => {
    if (window.confirm(`האם אתה בטוח שברצונך לאפס את כל התקדמות המשימות של החניך "${userName}"? כל המשימות יסומנו מחדש כטרם הושלמו.`)) {
      try {
        await db.resetUserProgress(userId);
        showStatus(`ההתקדמות של "${userName}" אופסה בהצלחה.`);
        const overviews = await db.getAllUsersProgressOverview();
        setUserOverviews(overviews);
        const freshUserOverview = overviews.find((o) => o.user.id === userId);
        if (freshUserOverview) {
          setSelectedUserOverview(freshUserOverview);
        }
      } catch (err) {
        console.error('Failed to reset user progress', err);
        showStatus('שגיאה באיפוס התקדמות החניך', 'error');
      }
    }
  };

  // ==================== TASK CMS HANDLERS ====================
  const handleOpenNewTaskModal = () => {
    setEditingTask({
      role_id: selectedRoleId,
      step_order: currentRoleTasks.length + 1,
      title: '',
      description: '',
      type: 'simple_check',
      media_url: '',
      question_prompt: '',
    });
    setBinaryQuestions([{ id: 'bq_1', question: '', option1: '', option2: '' }]);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask({ ...task });
    if (task.type === 'binary_choice') {
      const parsed = parseBinaryQuestions(task.question_prompt);
      setBinaryQuestions(parsed.length > 0 ? parsed : [{ id: 'bq_1', question: '', option1: '', option2: '' }]);
    } else {
      setBinaryQuestions([{ id: 'bq_1', question: '', option1: '', option2: '' }]);
    }
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editingTask.title || !editingTask.role_id) return;

    if (editingTask.type === 'binary_choice') {
      const validQuestions = binaryQuestions.filter((q) => q.option1.trim().length > 0 && q.option2.trim().length > 0);
      if (validQuestions.length === 0) {
        showStatus('יש להגדיר לפחות זוג אפשרויות בחירה אחד עם שתי אופציות', 'error');
        return;
      }
    }

    try {
      const taskToSave = {
        ...editingTask,
        media_url: editingTask.media_url?.trim() || null,
        hide_from_backpack: Boolean(editingTask.hide_from_backpack),
        question_prompt: editingTask.type === 'binary_choice'
          ? serializeBinaryQuestions(binaryQuestions)
          : (editingTask.type === 'text_question' || editingTask.type === 'media_question')
          ? (editingTask.question_prompt?.trim() || null)
          : null,
      };

      if (editingTask.id) {
        await db.updateTask(editingTask.id, taskToSave);
        showStatus('המשימה עודכנה בהצלחה');
      } else {
        await db.createTask(taskToSave as Omit<Task, 'id' | 'created_at'>);
        showStatus('משימה חדשה נוצרה בהצלחה');
      }
      setIsTaskModalOpen(false);
      setEditingTask(null);
      await handleRoleChange(editingTask.role_id);
    } catch (err) {
      console.error('Error saving task', err);
      showStatus('שגיאה בשמירת המשימה', 'error');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('האם למחוק משימה זו לצמיתות? מספרי השלבים יסודרו מחדש.')) {
      await db.deleteTask(taskId);
      showStatus('המשימה נמחקה והשלבים סודרו מחדש');
      await handleRoleChange(selectedRoleId);
    }
  };

  const handleMoveTaskOrder = async (index: number, direction: 'up' | 'down') => {
    const newTasks = [...currentRoleTasks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newTasks.length) return;

    const [movedTask] = newTasks.splice(index, 1);
    newTasks.splice(targetIndex, 0, movedTask);

    const taskIds = newTasks.map((t) => t.id);
    const updated = await db.reorderTasks(selectedRoleId, taskIds);
    setCurrentRoleTasks(updated);
    showStatus('סדר המשימות עודכן בהצלחה');
  };

  // ==================== ROLE CMS HANDLERS ====================
  const handleOpenNewRoleModal = () => {
    setEditingRole(null);
    setRoleFormName('');
    setRoleFormDesc('');
    setIsRoleModalOpen(true);
  };

  const handleOpenEditRoleModal = () => {
    const currentRole = roles.find((r) => r.id === selectedRoleId);
    if (!currentRole) return;
    setEditingRole(currentRole);
    setRoleFormName(currentRole.name);
    setRoleFormDesc(currentRole.description);
    setIsRoleModalOpen(true);
  };

  const handleDeleteCurrentRole = async () => {
    const currentRole = roles.find((r) => r.id === selectedRoleId);
    if (!currentRole) return;
    if (window.confirm(`האם אתה בטוח שברצונך למחוק את התפקיד "${currentRole.name}"? כל המשימות המשויכות יימחקו.`)) {
      await db.deleteRole(currentRole.id);
      showStatus(`התפקיד "${currentRole.name}" נמחק בהצלחה.`);
      const updatedRoles = await db.getRoles();
      setRoles(updatedRoles);
      if (updatedRoles.length > 0) {
        setSelectedRoleId(updatedRoles[0].id);
        const tasks = await db.getTasksByRole(updatedRoles[0].id);
        setCurrentRoleTasks(tasks);
      } else {
        setSelectedRoleId('');
        setCurrentRoleTasks([]);
      }
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleFormName.trim()) {
      showStatus('נא למלא שם תפקיד', 'error');
      return;
    }

    try {
      if (editingRole) {
        await db.updateRole(editingRole.id, {
          name: roleFormName.trim(),
          description: roleFormDesc.trim(),
        });
        showStatus(`התפקיד "${roleFormName.trim()}" עודכן בהצלחה!`);
      } else {
        const created = await db.createRole({
          name: roleFormName.trim(),
          description: roleFormDesc.trim() || 'תפקיד מקצועי ביחידה',
        });
        showStatus(`תפקיד חדש "${created.name}" נוצר בהצלחה!`);
        setSelectedRoleId(created.id);
      }
      setIsRoleModalOpen(false);
      const updatedRoles = await db.getRoles();
      setRoles(updatedRoles);
      if (editingRole) {
        const tasks = await db.getTasksByRole(editingRole.id);
        setCurrentRoleTasks(tasks);
      }
    } catch (err) {
      console.error('Failed to save role', err);
      showStatus('שגיאה בשמירת התפקיד', 'error');
    }
  };

  // ==================== USER PROGRESS DRILLDOWN CONTROLS ====================
  const handleToggleUserTask = async (userId: string, taskId: string, isCompleted: boolean) => {
    try {
      await db.toggleTaskCompletion(userId, taskId, isCompleted);
      showStatus(isCompleted ? 'המשימה סומנה כהושלמה' : 'המשימה נפתחה מחדש לביצוע');
      // Refresh selected user overview
      const overviews = await db.getAllUsersProgressOverview();
      setUserOverviews(overviews);
      const freshUserOverview = overviews.find((o) => o.user.id === userId);
      if (freshUserOverview) {
        setSelectedUserOverview(freshUserOverview);
      }
    } catch (err) {
      console.error('Failed to toggle task completion', err);
      showStatus('שגיאה בעדכון סטטוס המשימה', 'error');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (window.confirm(`האם אתה בטוח שברצונך למחוק את המשתמש "${userName}" לצמיתות? כל נתוני ההתקדמות והתשובות שלו יימחקו מהמערכת.`)) {
      try {
        await db.deleteUser(userId);
        showStatus(`המשתמש "${userName}" נמחק בהצלחה מהמערכת.`);
        if (selectedUserOverview?.user.id === userId) {
          setSelectedUserOverview(null);
        }
        const overviews = await db.getAllUsersProgressOverview();
        setUserOverviews(overviews);
      } catch (err) {
        console.error('Failed to delete user', err);
        showStatus('שגיאה במחיקת המשתמש', 'error');
      }
    }
  };

  // ==================== BACKPACK MEDIA CMS HANDLERS ====================
  const handleToggleBackpackVisibility = async (task: Task) => {
    const newHide = !task.hide_from_backpack;
    try {
      await db.updateTask(task.id, { hide_from_backpack: newHide });
      showStatus(newHide ? 'המדיה הוסתרה מהתרמיל' : 'המדיה מוצגת כעת בתרמיל');
      if (selectedRoleId) {
        const tasks = await db.getTasksByRole(selectedRoleId);
        setCurrentRoleTasks(tasks);
      }
    } catch (err) {
      console.error('Failed to toggle backpack visibility', err);
      showStatus('שגיאה בעדכון הגדרות המדיה בתרמיל', 'error');
    }
  };

  const handleOpenAddMedia = () => {
    setNewMediaForm({
      id: undefined,
      title: '',
      media_url: '',
      role_id: selectedRoleId || (roles[0] ? roles[0].id : ''),
      show_in_backpack: true,
    });
    setIsAddMediaModalOpen(true);
  };

  const handleEditStandaloneMedia = (task: Task) => {
    setNewMediaForm({
      id: task.id,
      title: task.title,
      media_url: task.media_url || '',
      role_id: task.role_id,
      show_in_backpack: !task.hide_from_backpack,
    });
    setIsAddMediaModalOpen(true);
  };

  const handleSaveNewMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMediaForm.title.trim() || !newMediaForm.media_url.trim() || !newMediaForm.role_id) {
      showStatus('יש למלא כותרת, קישור למדיה ותפקיד', 'error');
      return;
    }

    try {
      if (newMediaForm.id) {
        await db.updateTask(newMediaForm.id, {
          role_id: newMediaForm.role_id,
          title: newMediaForm.title.trim(),
          media_url: newMediaForm.media_url.trim(),
          hide_from_backpack: !newMediaForm.show_in_backpack,
        });
        showStatus('המדיה עודכנה בהצלחה');
      } else {
        const roleTasks = await db.getTasksByRole(newMediaForm.role_id);
        await db.createTask({
          role_id: newMediaForm.role_id,
          title: newMediaForm.title.trim(),
          description: '',
          step_order: roleTasks.length + 1,
          type: 'simple_check',
          media_url: newMediaForm.media_url.trim(),
          question_prompt: null,
          hide_from_backpack: !newMediaForm.show_in_backpack,
          is_standalone_media: true,
        });
        showStatus('מדיה חדשה נוספה בהצלחה לתרמיל');
      }

      setIsAddMediaModalOpen(false);
      if (newMediaForm.role_id === selectedRoleId) {
        const tasks = await db.getTasksByRole(selectedRoleId);
        setCurrentRoleTasks(tasks);
      } else {
        await handleRoleChange(newMediaForm.role_id);
      }
    } catch (err) {
      console.error('Error saving media', err);
      showStatus('שגיאה בשמירת מדיה לתרמיל', 'error');
    }
  };

  const handleDeleteMedia = async (task: Task) => {
    if (window.confirm(`האם להסיר את המדיה "${task.title}" מהתרמיל?`)) {
      try {
        if (task.is_standalone_media) {
          await db.deleteTask(task.id);
        } else {
          await db.updateTask(task.id, { media_url: null });
        }
        showStatus('המדיה הוסרה מהתרמיל');
        if (selectedRoleId) {
          const tasks = await db.getTasksByRole(selectedRoleId);
          setCurrentRoleTasks(tasks);
        }
      } catch (err) {
        console.error('Failed to remove media', err);
        showStatus('שגיאה בהסרת המדיה', 'error');
      }
    }
  };

  // Helper to prevent circular parent references in the org tree hierarchy
  const getDescendantIds = (nodeId: string, allNodes: OrgNode[]): Set<string> => {
    const descendants = new Set<string>();
    const stack = [nodeId];
    while (stack.length > 0) {
      const current = stack.pop()!;
      const children = allNodes.filter((n) => n.parent_id === current);
      for (const child of children) {
        if (!descendants.has(child.id)) {
          descendants.add(child.id);
          stack.push(child.id);
        }
      }
    }
    return descendants;
  };

  // ==================== ORG TREE CMS HANDLERS ====================
  const handleOpenNewNode = () => {
    setEditingNode({
      title: '',
      holder_name: '',
      description: '',
      interface_details: 'ממשק עבודה שוטף וסנכרון תהליכים.',
      parent_id: orgNodes.length > 0 ? orgNodes[0].id : null,
      role_interfaces: {},
    });
    setCustomInterfaceRoleId('');
    setIsNodeModalOpen(true);
  };

  const handleSaveNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNode || !editingNode.title || !editingNode.holder_name) {
      showStatus('נא למלא תואר תפקיד ושם מאייש', 'error');
      return;
    }

    try {
      if (editingNode.id) {
        await db.updateOrgNode(editingNode.id, editingNode);
        showStatus('התפקיד בעץ עודכן בהצלחה');
      } else {
        await db.createOrgNode({
          title: editingNode.title.trim(),
          holder_name: editingNode.holder_name.trim(),
          description: editingNode.description?.trim() || 'תפקיד במבנה הארגוני',
          interface_details: editingNode.interface_details?.trim() || 'ממשק עבודה שוטף וסנכרון תהליכים.',
          parent_id: editingNode.parent_id && editingNode.parent_id.trim() !== '' ? editingNode.parent_id : null,
          role_interfaces: editingNode.role_interfaces || {},
        });
        showStatus('תפקיד חדש נוסף בהצלחה לעץ המבנה!');
      }
      setIsNodeModalOpen(false);
      setEditingNode(null);
      const nodes = await db.getOrgNodes();
      setOrgNodes(nodes);
    } catch (err) {
      console.error('Error saving org node', err);
      showStatus('שגיאה בשמירת התפקיד בעץ', 'error');
    }
  };

  const handleDeleteNode = async (id: string) => {
    if (window.confirm('האם למחוק צומת זה מהעץ הארגוני? הכפיפים ישויכו מחדש לממונה העליון.')) {
      await db.deleteOrgNode(id);
      showStatus('הצומת נמחק וההיררכיה עודכנה');
      const nodes = await db.getOrgNodes();
      setOrgNodes(nodes);
    }
  };

  // Memoized User list filter
  const filteredUserOverviews = useMemo(() => {
    const term = userSearchTerm.trim().toLowerCase();
    if (!term) return userOverviews;
    return userOverviews.filter((item) => {
      return (
        item.user.full_name.toLowerCase().includes(term) ||
        item.user.personal_id.includes(term) ||
        (item.role?.name.toLowerCase().includes(term) ?? false)
      );
    });
  }, [userOverviews, userSearchTerm]);

  // Memoized KPI Analytics calculations
  const { totalTrainees, certifiedTrainees, inProgressTrainees, avgCompletion } = useMemo(() => {
    const total = userOverviews.length;
    const certified = userOverviews.filter((u) => u.completionPercentage === 100).length;
    const inProgress = userOverviews.filter((u) => u.completionPercentage > 0 && u.completionPercentage < 100).length;
    const avg = total > 0 
      ? Math.round(userOverviews.reduce((acc, curr) => acc + curr.completionPercentage, 0) / total) 
      : 0;
    return {
      totalTrainees: total,
      certifiedTrainees: certified,
      inProgressTrainees: inProgress,
      avgCompletion: avg,
    };
  }, [userOverviews]);

  return (
    <div className="space-y-6 sm:space-y-8">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-amber-950 via-slate-900 to-amber-950 rounded-2xl sm:rounded-3xl p-4 sm:p-8 text-white relative overflow-hidden shadow-xl border border-amber-900/50">
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full mb-2">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>פאנל ניהול ראשי • מנהל מערכת (0000000)</span>
            </div>

            <h1 className="text-xl sm:text-3xl font-black tracking-tight text-white mb-1.5">
              מרכז ניהול ובקרת חניכה
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              ניהול כולל של מעקב חניכים, עריכת תוכניות הכשרה, ספריית משאבים ועץ המבנה הארגוני.
            </p>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {statusMessage && (
        <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm ${
          statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {isLoading && (
        <div className="py-12 text-center text-slate-500">
          <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs font-semibold">מרענן נתוני ניהול...</p>
        </div>
      )}

      {/* Admin Tabs Bar (Horizontal scroll on mobile) */}
      <div className="sticky top-14 md:top-16 z-30 bg-slate-50/95 backdrop-blur-md py-2.5 -mx-3.5 px-3.5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-slate-200/80 shadow-xs flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm shrink-0 transition-all ${
              activeTab === 'users'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>מעקב חניכים ({userOverviews.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm shrink-0 transition-all ${
              activeTab === 'tasks'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>ניהול משימות ותפקידים</span>
          </button>

          <button
            onClick={() => setActiveTab('backpack')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm shrink-0 transition-all ${
              activeTab === 'backpack'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>ניהול התרמיל</span>
          </button>

          <button
            onClick={() => setActiveTab('orgTree')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm shrink-0 transition-all ${
              activeTab === 'orgTree'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Network className="w-4 h-4" />
            <span>עץ מבנה</span>
          </button>
        </div>

        <button
          onClick={handleSyncToSupabase}
          disabled={isSyncingSupabase}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all shadow-xs shrink-0"
          title="סנכרן את כל המשימות ופריטי המדיה מול בסיס הנתונים Supabase"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSupabase ? 'animate-spin text-emerald-600' : 'text-emerald-500'}`} />
          <span>{isSyncingSupabase ? 'מסנכרן...' : 'סנכרון לסופרבייס'}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: USERS PROGRESS TRACKER & ANALYTICS */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          
          {/* KPI Analytics Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-bold block mb-1">סה"כ חניכים</span>
                <strong className="text-xl sm:text-2xl font-black text-slate-900">{totalTrainees}</strong>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-bold block mb-1">הוסמכו במלואם</span>
                <strong className="text-xl sm:text-2xl font-black text-emerald-600">{certifiedTrainees}</strong>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-bold block mb-1">בתהליך חניכה</span>
                <strong className="text-xl sm:text-2xl font-black text-amber-600">{inProgressTrainees}</strong>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-bold block mb-1">ממוצע השלמה כללי</span>
                <strong className="text-xl sm:text-2xl font-black text-purple-600 font-mono">{avgCompletion}%</strong>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Search bar & Export Action */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                placeholder="חיפוש חניך לפי שם, מספר אישי או תפקיד..."
                className="w-full pl-4 pr-10 py-2.5 bg-white rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none text-sm"
              />
            </div>
            
            <button
              onClick={handleExportCSV}
              className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-300 shadow-xs transition-colors"
            >
              <Download className="w-4 h-4 text-brand-600" />
              <span>ייצוא דוח מעקב (אקסל)</span>
            </button>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
                    <th className="py-3.5 px-4">שם החניך</th>
                    <th className="py-3.5 px-4">מספר אישי</th>
                    <th className="py-3.5 px-4">תפקיד מיועד</th>
                    <th className="py-3.5 px-4">תאריך כניסה</th>
                    <th className="py-3.5 px-4">התקדמות במשימות</th>
                    <th className="py-3.5 px-4">פעילות אחרונה</th>
                    <th className="py-3.5 px-4 text-center">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUserOverviews.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        לא נמצאו חניכים התואמים את החיפוש
                      </td>
                    </tr>
                  ) : (
                    filteredUserOverviews.map((item) => (
                      <tr 
                        key={item.user.id} 
                        onClick={() => setSelectedUserOverview(item)}
                        className="hover:bg-brand-50/60 cursor-pointer transition-colors group"
                        title="לחץ לצפייה בפירוט התקדמות ומשימות החניך"
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-900 group-hover:text-brand-700 transition-colors">
                          <div className="flex items-center gap-2">
                            <span>{item.user.full_name}</span>
                            {item.completionPercentage === 100 && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline shrink-0" />
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-600">
                          {item.user.personal_id}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          {item.role ? item.role.name : 'ללא תפקיד'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 text-xs">
                          {item.user.entry_date}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                              <div
                                className={`h-full rounded-full ${
                                  item.completionPercentage === 100 ? 'bg-emerald-500' : 'bg-brand-500'
                                }`}
                                style={{ width: `${item.completionPercentage}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-bold font-mono text-slate-700">
                              {item.completionPercentage}%
                            </span>
                            <span className="text-[11px] text-slate-400">
                              ({item.completedTasks}/{item.totalTasks})
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500">
                          {item.lastActive ? new Date(item.lastActive).toLocaleDateString('he-IL') : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {item.user.personal_id !== '0000000' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(item.user.id, item.user.full_name)}
                                className="inline-flex items-center p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors"
                                title="מחק משתמש לצמיתות"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Drill-down Drawer for Selected User */}
          {selectedUserOverview && (
            <div 
              onClick={() => setSelectedUserOverview(null)}
              className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center sm:justify-end p-2 sm:p-4 pb-safe"
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full max-w-xl h-full max-h-[86vh] sm:max-h-[90vh] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-left duration-300"
              >
                
                {/* Drawer Header */}
                <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
                  <div>
                    <span className="text-xs font-semibold text-brand-300 block mb-1">
                      דוח מעקב חניך מפורט
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      {selectedUserOverview.user.full_name} ({selectedUserOverview.user.personal_id})
                    </h3>
                    <p className="text-xs text-slate-400">
                      תפקיד: {selectedUserOverview.role?.name || 'ללא תפקיד'} • תאריך כניסה: {selectedUserOverview.user.entry_date}
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedUserOverview(null)}
                    className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Drawer Body: Tasks & Answers List */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 pb-20 custom-scrollbar overscroll-contain">
                  <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200 mb-2">
                    <div>
                      <span className="text-xs text-slate-500 font-bold block">שיעור השלמה</span>
                      <strong className="text-xl font-extrabold text-slate-900">
                        {selectedUserOverview.completedTasks} מתוך {selectedUserOverview.totalTasks} משימות
                      </strong>
                    </div>
                    
                    <div>
                      <span className="text-2xl font-black text-brand-600 font-mono">
                        {selectedUserOverview.completionPercentage}%
                      </span>
                    </div>
                  </div>

                  <h4 className="font-bold text-sm text-slate-800 mb-2">פירוט שלבי החניכה, תשובות ובקרת מנהל:</h4>

                  {selectedUserOverview.tasksProgress.map(({ task, progress }) => {
                    const isCompleted = Boolean(progress?.is_completed);

                    return (
                      <div
                        key={task.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isCompleted
                            ? 'bg-emerald-50/50 border-emerald-200'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              isCompleted ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {task.step_order}
                            </span>
                            <h5 className="font-bold text-sm text-slate-900">{task.title}</h5>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                              isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {isCompleted ? 'הושלמה' : 'טרם הושלמה'}
                            </span>

                            {/* Admin Quick Completion Toggle */}
                            <button
                              type="button"
                              onClick={() => handleToggleUserTask(selectedUserOverview.user.id, task.id, !isCompleted)}
                              className={`p-1 rounded-md text-xs font-bold border transition-colors ${
                                isCompleted 
                                  ? 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 border-slate-200' 
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-700'
                              }`}
                              title={isCompleted ? 'בטל סימון סיום' : 'סמן כמשימה שהושלמה'}
                            >
                              {isCompleted ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 mb-2 leading-relaxed">
                          {task.description}
                        </p>

                        {task.type === 'binary_choice' ? (
                          <div className="mt-2 space-y-2 p-2.5 bg-slate-100/70 rounded-xl border border-slate-200">
                            <span className="text-[11px] font-bold text-slate-700 block mb-1">
                              📋 אפשרויות בחירה ({parseBinaryQuestions(task.question_prompt).length}):
                            </span>
                            {parseBinaryQuestions(task.question_prompt).map((bq, i) => {
                              const chosen = parseBinaryAnswers(progress?.answer_text)[bq.id];
                              return (
                                <div key={bq.id || i} className="p-2 bg-white rounded-lg border border-slate-200/80 text-xs">
                                  <div className="font-semibold text-slate-900 mb-1">
                                    {bq.question ? `${i + 1}. ${bq.question}` : `בחירה #${i + 1}: [${bq.option1} / ${bq.option2}]`}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-slate-500 font-bold">תשובת החניך:</span>
                                    {chosen ? (
                                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-300">
                                        ✓ {chosen}
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-slate-400 italic">טרם נענה</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          task.question_prompt && (
                            <div className="mb-2 p-2 rounded-lg bg-blue-50/70 border border-blue-100 text-xs text-blue-900">
                              <span className="font-bold block mb-0.5">❓ שאלת אימות:</span>
                              <span>{task.question_prompt}</span>
                            </div>
                          )
                        )}

                        {/* Submitted Answer Display */}
                        {task.type !== 'binary_choice' && isCompleted && progress?.answer_text && (
                          <div className="mt-3 p-3 bg-white rounded-xl border border-emerald-200 text-xs">
                            <span className="font-bold text-emerald-800 block mb-1">
                              💬 תשובת החניך:
                            </span>
                            <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">
                              {progress.answer_text}
                            </p>
                          </div>
                        )}

                        {isCompleted && progress?.completed_at && (
                          <div className="mt-2 text-[11px] text-slate-400">
                            הושלם בתאריך: {new Date(progress.completed_at).toLocaleString('he-IL')}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0 z-10 shadow-xs">
                  <div className="flex items-center gap-2">
                    {selectedUserOverview.user.personal_id !== '0000000' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleResetUserProgress(selectedUserOverview.user.id, selectedUserOverview.user.full_name)}
                          className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300/80 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                          title="איפוס כל התקדמות המשימות לחניך זה"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                          <span>אפס התקדמות</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteUser(selectedUserOverview.user.id, selectedUserOverview.user.full_name)}
                          className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>מחק משתמש</span>
                        </button>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedUserOverview(null)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                  >
                    סגור חלונית
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TASKS & ROLES CMS */}
      {/* ========================================================================= */}
      {activeTab === 'tasks' && (
        <div className="space-y-6">
          
          {/* Role selector & Actions */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <label className="text-xs font-bold text-slate-700 shrink-0">בחר תפקיד לעריכה:</label>
              <select
                value={selectedRoleId}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="flex-1 sm:w-64 px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 font-bold text-sm text-slate-800 outline-none focus:border-brand-500"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>

              {/* Edit Current Role Button */}
              {selectedRoleId && (
                <button
                  type="button"
                  onClick={handleOpenEditRoleModal}
                  className="p-2 text-slate-600 hover:text-brand-600 hover:bg-brand-50 rounded-xl border border-slate-200 transition-colors"
                  title="ערוך פרטי תפקיד זה"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}

              {/* Delete Current Role Button */}
              {selectedRoleId && (
                <button
                  type="button"
                  onClick={handleDeleteCurrentRole}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-slate-200 transition-colors"
                  title="מחק תפקיד זה"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              {/* Create Role Button */}
              <button
                type="button"
                onClick={handleOpenNewRoleModal}
                className="flex items-center gap-1 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-all shadow-xs"
                title="הגדר תפקיד חדש במערכת"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>הגדר תפקיד חדש</span>
              </button>
            </div>

            {selectedRoleId && (
              <button
                onClick={handleOpenNewTaskModal}
                className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>הוסף משימת חניכה חדשה</span>
              </button>
            )}
          </div>

          {/* Sequential Tasks List for Selected Role */}
          <div className="space-y-3">
            {(() => {
              const onboardingTasks = currentRoleTasks.filter((t) => !t.is_standalone_media);
              if (onboardingTasks.length === 0) {
                return (
                  <div className="py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                    לא הוגדרו משימות עבור תפקיד זה. לחץ על "הוסף משימה" להגדרת השלב הראשון.
                  </div>
                );
              }

              return onboardingTasks.map((task, index) => (
                <div
                  key={task.id}
                  className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    {/* Order control arrows */}
                    <div className="flex flex-col items-center gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveTaskOrder(currentRoleTasks.findIndex((t) => t.id === task.id), 'up')}
                        className={`p-1 rounded text-slate-500 hover:bg-slate-100 ${index === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                        title="העבר שלב למעלה"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                        {index + 1}
                      </span>
                      <button
                        type="button"
                        disabled={index === onboardingTasks.length - 1}
                        onClick={() => handleMoveTaskOrder(currentRoleTasks.findIndex((t) => t.id === task.id), 'down')}
                        className={`p-1 rounded text-slate-500 hover:bg-slate-100 ${index === onboardingTasks.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                        title="העבר שלב למטה"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-slate-900 text-base">{task.title}</h4>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {task.type === 'simple_check'
                            ? 'סימון פשוט'
                            : task.type === 'media_question'
                            ? (task.question_prompt ? 'מדיה + שאלה' : 'צפייה במדיה')
                            : task.type === 'binary_choice'
                            ? (parseBinaryQuestions(task.question_prompt).length === 1 ? 'בחירה בין 2 אפשרויות' : `בחירה (${parseBinaryQuestions(task.question_prompt).length} סעיפים)`)
                            : 'שאלת הבנה'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed mb-1 line-clamp-2">
                        {task.description}
                      </p>
                      {task.type === 'binary_choice' ? (
                        <div className="mt-1 space-y-1">
                          {parseBinaryQuestions(task.question_prompt).map((bq, i) => (
                            <div key={bq.id || i} className="text-xs text-slate-800 flex items-center gap-1.5 font-medium">
                              <span>🔘 {bq.question ? `${i + 1}. ${bq.question}` : `בחירה #${i + 1}`}</span>
                              <span className="text-[10px] text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                                [{bq.option1} / {bq.option2}]
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        task.question_prompt && (
                          <p className="text-xs text-brand-700 font-medium">
                            ❓ שאלת אימות: {task.question_prompt}
                          </p>
                        )
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleEditTask(task)}
                      className="p-2 text-slate-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                      title="ערוך משימה"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="מחק משימה"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ));
            })()}
          </div>

          {/* Role Create / Edit Modal */}
          {isRoleModalOpen && (
            <div 
              onClick={() => setIsRoleModalOpen(false)}
              className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 pb-safe"
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full max-w-md max-h-[86vh] sm:max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border border-slate-200 p-6 animate-in fade-in zoom-in-95 duration-200"
              >
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-base text-slate-900">
                    {editingRole ? 'עריכת פרטי תפקיד' : 'הוספת תפקיד חדש למערכת'}
                  </h3>
                  <button onClick={() => setIsRoleModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveRole} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">שם התפקיד (כותרת)</label>
                    <input
                      type="text"
                      required
                      value={roleFormName}
                      onChange={(e) => setRoleFormName(e.target.value)}
                      placeholder="לדוגמה: מנהל אבטחת מידע וסייבר"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-brand-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">תיאור ייעוד התפקיד</label>
                    <textarea
                      rows={3}
                      required
                      value={roleFormDesc}
                      onChange={(e) => setRoleFormDesc(e.target.value)}
                      placeholder="תאר את תחומי האחריות והיעדים המרכזיים של התפקיד..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-brand-500"
                    ></textarea>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsRoleModalOpen(false)}
                      className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                    >
                      ביטול
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-sm"
                    >
                      {editingRole ? 'שמור שינויים' : 'צור תפקיד'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Task Edit/Create Modal */}
          {isTaskModalOpen && editingTask && (
            <div 
              onClick={() => setIsTaskModalOpen(false)}
              className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 pb-safe"
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 max-h-[86vh] sm:max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 sticky top-0 bg-white z-10">
                  <h3 className="font-bold text-base text-slate-900">
                    {editingTask.id ? 'עריכת משימת חניכה' : 'יצירת משימת חניכה חדשה'}
                  </h3>
                  <button onClick={() => setIsTaskModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveTask} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">כותרת המשימה</label>
                    <input
                      type="text"
                      required
                      value={editingTask.title || ''}
                      onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                      placeholder="לדוגמה: היכרות עם נוהל אבטחת מידע"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">סוג המשימה</label>
                    <select
                      value={editingTask.type || 'simple_check'}
                      onChange={(e) => {
                        const newType = e.target.value as TaskType;
                        setEditingTask({ ...editingTask, type: newType });
                        if (newType === 'binary_choice' && binaryQuestions.length === 0) {
                          setBinaryQuestions([{ id: 'bq_1', question: '', option1: '', option2: '' }]);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white outline-none focus:border-brand-500"
                    >
                      <option value="simple_check">סימון פשוט (קריאה ואישור)</option>
                      <option value="media_question">צפייה במדיה (שאלה אופציונלית)</option>
                      <option value="text_question">שאלת הבנה פתוחה (חובה מענה)</option>
                      <option value="binary_choice">בחירה בין 2 אפשרויות</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">הוראות ופירוט המשימה</label>
                    <textarea
                      rows={3}
                      required
                      value={editingTask.description || ''}
                      onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                      placeholder="פרט את הפעולות הנדרשות מהחניך בשלב זה..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-brand-500"
                    ></textarea>
                  </div>

                  {/* SUB-QUESTIONS BUILDER FOR BINARY_CHOICE */}
                  {editingTask.type === 'binary_choice' && (
                    <div className="space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="block text-xs font-bold text-slate-800">
                            אפשרויות בחירה (2 אופציות לבחירה)
                          </label>
                          <p className="text-[11px] text-slate-500">
                            ניתן להזין שאלה/כותרת (לא חובה) ושתי אופציות לבחירה.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setBinaryQuestions([
                              ...binaryQuestions,
                              { id: `bq_${Date.now()}`, question: '', option1: '', option2: '' }
                            ]);
                          }}
                          className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg flex items-center gap-1 transition-colors shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>הוסף אפשרות בחירה</span>
                        </button>
                      </div>

                      <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                        {binaryQuestions.map((bq, qIndex) => (
                          <div key={bq.id || qIndex} className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs relative">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold text-slate-700">
                                {binaryQuestions.length > 1 ? `אפשרות בחירה #${qIndex + 1}` : 'הגדרת האפשרויות'}
                              </span>
                              {binaryQuestions.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBinaryQuestions(binaryQuestions.filter((_, idx) => idx !== qIndex));
                                  }}
                                  className="text-slate-400 hover:text-red-500 p-1 rounded-md transition-colors"
                                  title="מחק סעיף זה"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            <div className="mb-2">
                              <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                                כותרת או שאלה (אופציונלי - ניתן להשאיר ריק):
                              </label>
                              <input
                                type="text"
                                value={bq.question}
                                onChange={(e) => {
                                  const updated = [...binaryQuestions];
                                  updated[qIndex].question = e.target.value;
                                  setBinaryQuestions(updated);
                                }}
                                placeholder="לדוגמה: האם ביצעת גיבוי? (או השאר ריק)"
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 outline-none focus:border-slate-500 font-medium"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">אפשרות 1</label>
                                <input
                                  type="text"
                                  required
                                  value={bq.option1}
                                  onChange={(e) => {
                                    const updated = [...binaryQuestions];
                                    updated[qIndex].option1 = e.target.value;
                                    setBinaryQuestions(updated);
                                  }}
                                  placeholder="אפשרות א'"
                                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 outline-none focus:border-slate-500 text-center font-semibold text-slate-800 bg-slate-50 focus:bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">אפשרות 2</label>
                                <input
                                  type="text"
                                  required
                                  value={bq.option2}
                                  onChange={(e) => {
                                    const updated = [...binaryQuestions];
                                    updated[qIndex].option2 = e.target.value;
                                    setBinaryQuestions(updated);
                                  }}
                                  placeholder="אפשרות ב'"
                                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 outline-none focus:border-slate-500 text-center font-semibold text-slate-800 bg-slate-50 focus:bg-white"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">קישור לסרטון, מצגת או מדיה</label>
                      <span className="text-[11px] text-slate-400 font-normal">YouTube, Drive, MP4, מסמך</span>
                    </div>
                    <input
                      type="text"
                      value={editingTask.media_url || ''}
                      onChange={(e) => setEditingTask({ ...editingTask, media_url: e.target.value })}
                      placeholder="https://www.youtube.com/watch?v=... או קישור ל-Google Drive / קובץ"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-brand-500 font-mono text-xs"
                    />
                    {editingTask.media_url && editingTask.media_url.trim().length > 0 && (
                      <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!editingTask.hide_from_backpack}
                          onChange={(e) => setEditingTask({ ...editingTask, hide_from_backpack: !e.target.checked })}
                          className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
                        />
                        <span className="text-xs font-medium text-slate-700">הצג מדיה זו ב"תרמיל שלי" של החניך</span>
                      </label>
                    )}
                  </div>

                  {(editingTask.type === 'media_question' || editingTask.type === 'text_question') && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700">
                          {editingTask.type === 'text_question' ? 'שאלת הבנה לחניך' : 'שאלת אימות והבנה לחניך (אופציונלי)'}
                        </label>
                        {editingTask.type === 'media_question' && (
                          <span className="text-[11px] text-slate-400 font-normal">לא חובה</span>
                        )}
                      </div>
                      <input
                        type="text"
                        required={editingTask.type === 'text_question'}
                        value={editingTask.question_prompt || ''}
                        onChange={(e) => setEditingTask({ ...editingTask, question_prompt: e.target.value })}
                        placeholder={
                          editingTask.type === 'text_question'
                            ? 'לדוגמה: מהם שלושת שלבי הדיווח הנדרשים בנוהל?'
                            : 'אופציונלי: הזן שאלה אם נדרש מענה מהחניך (השאר ריק לצפייה בלבד)'
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-brand-500"
                      />
                      {editingTask.type === 'media_question' && (
                        <p className="text-[11px] text-slate-500 mt-1">
                          💡 אם לא תוגדר שאלה, החניך יוכל לסמן את המשימה כהושלמה מיד לאחר הצפייה ללא צורך בהזנת תשובה.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsTaskModalOpen(false)}
                      className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                    >
                      ביטול
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-sm"
                    >
                      שמור משימה
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BACKPACK MEDIA CMS */}
      {/* ========================================================================= */}
      {activeTab === 'backpack' && (
        <div className="space-y-6">

          {/* Top Banner with Quick Actions */}
          <div className="bg-gradient-to-r from-brand-950 via-slate-900 to-brand-950 rounded-2xl p-5 sm:p-6 text-white border border-brand-800/40 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <div className="inline-flex items-center gap-1.5 bg-brand-500/20 text-brand-300 border border-brand-400/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>ניהול מדיה ותרמיל</span>
              </div>
              <h3 className="font-extrabold text-base sm:text-lg text-white">
                מדיות התרמיל מבוססות תפקיד
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                מדיות התרמיל של החניך מסונכרנות עם משימות התפקיד שלו. כאן תוכל לצפות בכל המדיות לפי תפקיד, להסתיר או להציג כל מדיה בתרמיל, ולהוסיף מדיה חדשה.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                onClick={handleOpenAddMedia}
                className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>הוסף מדיה חדשה</span>
              </button>

              <button
                onClick={() => navigate('/backpack')}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all border border-white/20"
              >
                <Eye className="w-4 h-4" />
                <span>צפייה בתרמיל החניכים</span>
              </button>
            </div>
          </div>

          {/* Role-Based Media Management Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-bold text-sm sm:text-base text-slate-900">
                  מדיות לפי תפקיד
                </h4>
                <p className="text-xs text-slate-500">
                  בחר תפקיד כדי לנהל את פריטי המדיה שלו, להסתיר מהתרמיל או להציג
                </p>
              </div>
            </div>

            {/* Role Switcher */}
            <div className="flex flex-wrap gap-2">
              {roles.map((r) => {
                const isSelected = selectedRoleId === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => handleRoleChange(r.id)}
                    className={`text-xs px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{r.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Media list of currently selected role */}
            {(() => {
              const mediaTasks = currentRoleTasks.filter((t) => Boolean(t.media_url && t.media_url.trim().length > 0));
              const nonMediaTasks = currentRoleTasks.filter((t) => !Boolean(t.media_url && t.media_url.trim().length > 0));
              const activeRoleObj = roles.find((r) => r.id === selectedRoleId);

              return (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      נמצאו <strong className="text-brand-600 font-bold">{mediaTasks.length}</strong> פריטי מדיה עבור {activeRoleObj?.name || 'תפקיד זה'}
                    </span>
                  </div>

                  {mediaTasks.length === 0 ? (
                    <div className="p-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center text-slate-500 space-y-3">
                      <p className="text-xs font-medium">לא נמצאו פריטי מדיה בתפקיד זה.</p>
                      <button
                        onClick={handleOpenAddMedia}
                        className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>הוסף מדיה ראשונה לתפקיד זה</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {mediaTasks.map((task) => {
                        const mediaInfo = getMediaInfo(task.media_url || '');
                        const isHidden = Boolean(task.hide_from_backpack);

                        return (
                          <div
                            key={task.id}
                            className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                              isHidden
                                ? 'bg-slate-50/60 border-slate-200 opacity-80'
                                : 'bg-white border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-brand-300'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2.5">
                                {/* Media Type Badge */}
                                {mediaInfo.type === 'youtube' || mediaInfo.type === 'loom' ? (
                                  <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <Video className="w-3 h-3 text-red-600" />
                                    <span>סרטון YouTube</span>
                                  </span>
                                ) : mediaInfo.type === 'google_drive' ? (
                                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <FileText className="w-3 h-3 text-amber-600" />
                                    <span>Google Drive</span>
                                  </span>
                                ) : mediaInfo.type === 'direct_video' ? (
                                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <PlayCircle className="w-3 h-3 text-blue-600" />
                                    <span>קובץ וידאו</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <FileText className="w-3 h-3 text-slate-500" />
                                    <span>מסמך / קישור</span>
                                  </span>
                                )}

                                {/* Visibility Badge */}
                                {isHidden ? (
                                  <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <EyeOff className="w-3 h-3 text-amber-600" />
                                    <span>מוסתר מהתרמיל</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <Eye className="w-3 h-3 text-emerald-600" />
                                    <span>מוצג בתרמיל</span>
                                  </span>
                                )}
                              </div>

                              <h5 className="font-bold text-sm text-slate-900 mb-2">{task.title}</h5>
                            </div>

                            <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                              <a
                                href={ensureValidUrl(task.media_url || '')}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-brand-600 hover:text-brand-800 underline flex items-center gap-1 truncate max-w-[180px]"
                              >
                                <ExternalLink className="w-3 h-3 shrink-0" />
                                <span className="truncate">{task.media_url}</span>
                              </a>

                              <div className="flex items-center gap-1.5">
                                {/* Toggle visibility button */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleBackpackVisibility(task)}
                                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1 ${
                                    isHidden
                                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                                  }`}
                                  title={isHidden ? 'הצג מדיה זו בתרמיל החניך' : 'הסתר מדיה זו מתרמיל החניך'}
                                >
                                  {isHidden ? (
                                    <>
                                      <Eye className="w-3 h-3" />
                                      <span>הצג בתרמיל</span>
                                    </>
                                  ) : (
                                    <>
                                      <EyeOff className="w-3 h-3" />
                                      <span>הסתר מהתרמיל</span>
                                    </>
                                  )}
                                </button>

                                {/* Edit button - only for standalone media, NEVER for tasks taken from onboarding */}
                                {Boolean(task.is_standalone_media) && (
                                  <button
                                    type="button"
                                    onClick={() => handleEditStandaloneMedia(task)}
                                    className="text-[11px] font-bold text-slate-700 hover:text-brand-600 bg-white hover:bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 transition-colors flex items-center gap-1"
                                    title="ערוך כותרת ומדיה"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                    <span>ערוך</span>
                                  </button>
                                )}

                                {/* Delete media button */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMedia(task)}
                                  className="text-[11px] font-bold text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors"
                                  title="הסר מדיה זו"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Tasks in this role without media (quick add) */}
                  {nonMediaTasks.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <h5 className="text-xs font-bold text-slate-500 mb-2">
                        משימות נוספות בתפקיד זה ללא קישור למדיה ({nonMediaTasks.length}):
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {nonMediaTasks.slice(0, 8).map((t) => (
                          <button
                            key={t.id}
                            onClick={() => handleEditTask(t)}
                            className="text-xs bg-slate-100 hover:bg-brand-50 text-slate-600 hover:text-brand-700 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-brand-200 transition-colors flex items-center gap-1"
                            title="לחץ להוספת קישור מדיה למשימה זו"
                          >
                            <Plus className="w-3 h-3 text-brand-500" />
                            <span>{t.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Modal: Add New Media to Backpack */}
          {isAddMediaModalOpen && (
            <div 
              onClick={() => setIsAddMediaModalOpen(false)}
              className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 pb-safe"
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 max-h-[86vh] sm:max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 sticky top-0 bg-white z-10">
                  <h3 className="font-bold text-base text-slate-900">
                    {newMediaForm.id ? 'עריכת מדיה בתרמיל' : 'הוספת מדיה חדשה לתרמיל'}
                  </h3>
                  <button onClick={() => setIsAddMediaModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveNewMedia} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">שיוך לתפקיד</label>
                    <select
                      value={newMediaForm.role_id}
                      onChange={(e) => setNewMediaForm({ ...newMediaForm, role_id: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white outline-none focus:border-brand-500"
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">כותרת המדיה</label>
                    <input
                      type="text"
                      required
                      value={newMediaForm.title}
                      onChange={(e) => setNewMediaForm({ ...newMediaForm, title: e.target.value })}
                      placeholder="לדוגמה: סרטון הדרכה במערכת השו''ב"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">קישור למדיה</label>
                      <span className="text-[11px] text-slate-400 font-normal">YouTube, Google Drive, MP4, מסמך</span>
                    </div>
                    <input
                      type="text"
                      required
                      value={newMediaForm.media_url}
                      onChange={(e) => setNewMediaForm({ ...newMediaForm, media_url: e.target.value })}
                      placeholder="https://www.youtube.com/watch?v=... או קישור ל-Google Drive"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-brand-500 font-mono text-xs"
                    />
                  </div>

                  <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newMediaForm.show_in_backpack}
                      onChange={(e) => setNewMediaForm({ ...newMediaForm, show_in_backpack: e.target.checked })}
                      className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
                    />
                    <span className="text-xs font-medium text-slate-700">הצג מדיה זו ב"תרמיל שלי" של חניכי התפקיד</span>
                  </label>

                  <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddMediaModalOpen(false)}
                      className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                    >
                      ביטול
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-sm"
                    >
                      {newMediaForm.id ? 'שמור שינויים' : 'הוסף מדיה לתרמיל'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ORG TREE CMS */}
      {/* ========================================================================= */}
      {activeTab === 'orgTree' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-slate-900">צמתים במבנה הארגוני ({orgNodes.length})</h3>
            <button
              onClick={handleOpenNewNode}
              className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>הוסף תפקיד למבנה הארגוני</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orgNodes.map((node) => {
              const parentNode = orgNodes.find((n) => n.id === node.parent_id);

              return (
                <div
                  key={node.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-500">
                        כפוף ל: {parentNode ? parentNode.title : 'פיקוד עליון (שורש)'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditingNode(node); setIsNodeModalOpen(true); }}
                          className="p-1.5 text-slate-500 hover:text-brand-600 rounded-lg hover:bg-slate-100"
                          title="ערוך צומת"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteNode(node.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                          title="מחק צומת"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <h4 className="font-bold text-base text-slate-900">{node.title}</h4>
                    <p className="text-xs text-brand-700 font-semibold mb-2">מאייש: {node.holder_name}</p>
                    
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div><strong className="text-slate-800">מהות:</strong> {node.description}</div>
                      <div><strong className="text-slate-800">ממשקים:</strong> {node.interface_details}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Org Node Modal */}
          {isNodeModalOpen && editingNode && (
            <div 
              onClick={() => setIsNodeModalOpen(false)}
              className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 pb-safe"
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 max-h-[86vh] sm:max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 sticky top-0 bg-white z-10">
                  <h3 className="font-bold text-base text-slate-900">
                    {editingNode.id ? 'עריכת צומת במבנה הארגוני' : 'הוספת צומת חדש לעץ'}
                  </h3>
                  <button onClick={() => setIsNodeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveNode} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">תואר התפקיד</label>
                    <input
                      type="text"
                      required
                      value={editingNode.title || ''}
                      onChange={(e) => setEditingNode({ ...editingNode, title: e.target.value })}
                      placeholder="לדוגמה: רמ&quot;ד תוכנה ותשתיות"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">שם מאייש התפקיד (דרגה ושם)</label>
                    <input
                      type="text"
                      required
                      value={editingNode.holder_name || ''}
                      onChange={(e) => setEditingNode({ ...editingNode, holder_name: e.target.value })}
                      placeholder="לדוגמה: רס&quot;ן אלון לוי"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">כפיפות בהיררכיה (תפקיד אב)</label>
                    <select
                      value={editingNode.parent_id || ''}
                      onChange={(e) => setEditingNode({ ...editingNode, parent_id: e.target.value || null })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white outline-none focus:border-brand-500"
                    >
                      <option value="">-- ללא ממונה (ראש הפירמידה / מפקד יחידה) --</option>
                      {orgNodes
                        .filter((n) => {
                          if (!editingNode.id) return true;
                          const descendants = getDescendantIds(editingNode.id, orgNodes);
                          return n.id !== editingNode.id && !descendants.has(n.id);
                        })
                        .map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.title} ({n.holder_name})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">מהות התפקיד ותחומי אחריות</label>
                    <textarea
                      rows={2}
                      required
                      value={editingNode.description || ''}
                      onChange={(e) => setEditingNode({ ...editingNode, description: e.target.value })}
                      placeholder="הגדרת ייעוד התפקיד ואחריות הליבה..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-brand-500"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ממשקי עבודה כלליים (ברירת מחדל)</label>
                    <textarea
                      rows={2}
                      required
                      value={editingNode.interface_details || ''}
                      onChange={(e) => setEditingNode({ ...editingNode, interface_details: e.target.value })}
                      placeholder="ממשק כללי מול ראשי ענפים, ספקים חיצוניים וצוותי פיתוח..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-brand-500"
                    ></textarea>
                  </div>

                  {/* Role-Specific Relative Interface Customizer */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-800">
                        התאמת ממשק ביחס לתפקיד ספציפי
                      </label>
                      <span className="text-[10px] text-brand-700 font-bold bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">
                        עריכה לפי תפקיד
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-600 shrink-0">בחר תפקיד:</span>
                        <select
                          value={customInterfaceRoleId}
                          onChange={(e) => setCustomInterfaceRoleId(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white outline-none focus:border-brand-500 font-medium"
                        >
                          <option value="">-- בחר תפקיד להגדרה מותאמת --</option>
                          {roles.map((r) => {
                            const isConfigured = Boolean(editingNode.role_interfaces?.[r.id] || editingNode.role_interfaces?.[r.name]);
                            return (
                              <option key={r.id} value={r.id}>
                                {r.name} {isConfigured ? '✓ (מותאם)' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {customInterfaceRoleId && (
                        <div>
                          <label className="block text-[11px] font-bold text-brand-900 mb-1">
                            תיאור הממשק שהחניך בתפקיד &quot;{roles.find((r) => r.id === customInterfaceRoleId)?.name}&quot; יראה:
                          </label>
                          <textarea
                            rows={3}
                            value={editingNode.role_interfaces?.[customInterfaceRoleId] || ''}
                            onChange={(e) => {
                              const currentMap = editingNode.role_interfaces || {};
                              setEditingNode({
                                ...editingNode,
                                role_interfaces: {
                                  ...currentMap,
                                  [customInterfaceRoleId]: e.target.value,
                                },
                              });
                            }}
                            placeholder="תאר את ממשק העבודה ההדדי, תחומי אחריות משותפים, למה לפנות אליו, ותדירות סנכרון..."
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs outline-none focus:border-brand-500 bg-white"
                          ></textarea>
                        </div>
                      )}

                      {/* Configured Roles Badges */}
                      {editingNode.role_interfaces && Object.keys(editingNode.role_interfaces).length > 0 && (
                        <div className="pt-2 border-t border-slate-200/60">
                          <span className="text-[10px] text-slate-500 block mb-1 font-semibold">תפקידים עם ממשק מותאם:</span>
                          <div className="flex flex-wrap gap-1">
                            {Object.keys(editingNode.role_interfaces).map((rId) => {
                              const roleObj = roles.find((r) => r.id === rId || r.name === rId);
                              const name = roleObj ? roleObj.name : rId;
                              return (
                                <span
                                  key={rId}
                                  onClick={() => setCustomInterfaceRoleId(roleObj?.id || rId)}
                                  className="cursor-pointer text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md hover:bg-indigo-100"
                                >
                                  {name} ✎
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsNodeModalOpen(false)}
                      className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                    >
                      ביטול
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-sm"
                    >
                      שמור צומת
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
