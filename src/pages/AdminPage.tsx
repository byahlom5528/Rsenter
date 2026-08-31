import React, { useState, useEffect } from 'react';
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
  Eye, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Download,
  GraduationCap,
  Award,
  Check,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/db';
import { 
  UserProgressOverview, 
  Role, 
  Task, 
  BackpackResource, 
  OrgNode,
  TaskType
} from '../types/database';
import { ensureValidUrl } from '../utils/mediaUtils';

export const AdminPage: React.FC = () => {
  useAuth();
  
  const [activeTab, setActiveTab] = useState<'users' | 'tasks' | 'backpack' | 'orgTree'>('users');
  const [isLoading, setIsLoading] = useState(true);

  // 1. Users Progress State
  const [userOverviews, setUserOverviews] = useState<UserProgressOverview[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedUserOverview, setSelectedUserOverview] = useState<UserProgressOverview | null>(null);

  // 2. Tasks & Roles CMS State
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [currentRoleTasks, setCurrentRoleTasks] = useState<Task[]>([]);
  const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleFormName, setRoleFormName] = useState('');
  const [roleFormDesc, setRoleFormDesc] = useState('');

  // 3. Backpack CMS State
  const [backpackResources, setBackpackResources] = useState<BackpackResource[]>([]);
  const [editingResource, setEditingResource] = useState<Partial<BackpackResource> | null>(null);
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);

  // 4. Org Tree CMS State
  const [orgNodes, setOrgNodes] = useState<OrgNode[]>([]);
  const [editingNode, setEditingNode] = useState<Partial<OrgNode> | null>(null);
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
  const [customInterfaceRoleId, setCustomInterfaceRoleId] = useState<string>('');

  // System notification banner
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [overviews, allRoles, resources, nodes] = await Promise.all([
        db.getAllUsersProgressOverview(),
        db.getRoles(),
        db.getBackpackResources(),
        db.getOrgNodes(),
      ]);

      setUserOverviews(overviews);
      setRoles(allRoles);
      setBackpackResources(resources);
      setOrgNodes(nodes);

      const targetRole = selectedRoleId || (allRoles[0] ? allRoles[0].id : '');
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
    loadAllData();
    const unsubscribe = db.subscribe(() => {
      loadAllData();
    });
    return () => unsubscribe();
  }, []);

  // Listen to Escape key to close any active modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsTaskModalOpen(false);
        setIsRoleModalOpen(false);
        setIsResourceModalOpen(false);
        setIsNodeModalOpen(false);
        setSelectedUserOverview(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update role tasks when selected role changes
  const handleRoleChange = async (roleId: string) => {
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

    const headers = ['שם מלא', 'מספר אישי', 'תפקיד', 'תאריך כניסה', 'אחוז השלמה', 'משימות שהושלמו', 'סה"כ משימות', 'פעילות אחרונה'];
    const rows = userOverviews.map((item) => [
      `"${item.user.full_name}"`,
      `"${item.user.personal_id}"`,
      `"${item.role?.name || 'ללא תפקיד'}"`,
      `"${item.user.entry_date}"`,
      `"${item.completionPercentage}%"`,
      `"${item.completedTasks}"`,
      `"${item.totalTasks}"`,
      `"${item.lastActive ? new Date(item.lastActive).toLocaleDateString('he-IL') : '-'}"`
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
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask({ ...task });
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editingTask.title || !editingTask.role_id) return;

    try {
      if (editingTask.id) {
        await db.updateTask(editingTask.id, editingTask);
        showStatus('המשימה עודכנה בהצלחה');
      } else {
        await db.createTask(editingTask as Omit<Task, 'id' | 'created_at'>);
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

  // ==================== BACKPACK CMS HANDLERS ====================
  const handleOpenNewResource = () => {
    setEditingResource({
      title: '',
      category: 'נהלים ופקודות',
      description: '',
      file_url: '',
      external_link: '',
    });
    setIsResourceModalOpen(true);
  };

  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResource || !editingResource.title) return;

    try {
      if (editingResource.id) {
        await db.updateBackpackResource(editingResource.id, {
          ...editingResource,
          file_url: editingResource.file_url ? ensureValidUrl(editingResource.file_url) : null,
          external_link: editingResource.external_link ? ensureValidUrl(editingResource.external_link) : null,
        });
        showStatus('המשאב עודכן בהצלחה');
      } else {
        await db.createBackpackResource({
          title: editingResource.title,
          category: editingResource.category || 'כללי',
          description: editingResource.description || '',
          file_url: editingResource.file_url ? ensureValidUrl(editingResource.file_url) : null,
          external_link: editingResource.external_link ? ensureValidUrl(editingResource.external_link) : null,
        });
        showStatus('משאב חדש נוסף בהצלחה');
      }
      setIsResourceModalOpen(false);
      setEditingResource(null);
      const res = await db.getBackpackResources();
      setBackpackResources(res);
    } catch (err) {
      console.error('Error saving resource', err);
      showStatus('שגיאה בשמירת המשאב', 'error');
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (window.confirm('האם למחוק משאב זה?')) {
      await db.deleteBackpackResource(id);
      showStatus('המשאב נמחק');
      const res = await db.getBackpackResources();
      setBackpackResources(res);
    }
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

  // User list filter
  const filteredUserOverviews = userOverviews.filter((item) => {
    const term = userSearchTerm.toLowerCase();
    return (
      item.user.full_name.toLowerCase().includes(term) ||
      item.user.personal_id.includes(term) ||
      (item.role?.name.toLowerCase().includes(term) ?? false)
    );
  });

  // KPI Analytics calculations
  const totalTrainees = userOverviews.length;
  const certifiedTrainees = userOverviews.filter((u) => u.completionPercentage === 100).length;
  const inProgressTrainees = userOverviews.filter((u) => u.completionPercentage > 0 && u.completionPercentage < 100).length;
  const avgCompletion = totalTrainees > 0 
    ? Math.round(userOverviews.reduce((acc, curr) => acc + curr.completionPercentage, 0) / totalTrainees) 
    : 0;

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
      <div className="sticky top-14 md:top-16 z-30 bg-slate-50/95 backdrop-blur-md py-2.5 -mx-3.5 px-3.5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-slate-200/80 shadow-xs flex gap-2 overflow-x-auto no-scrollbar">
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
                    <th className="py-3.5 px-4 text-center">פירוט ותשובות</th>
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
                      <tr key={item.user.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {item.user.full_name}
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
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedUserOverview(item)}
                              className="inline-flex items-center gap-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-brand-200 transition-colors"
                              title="עיון במשימות החניך"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>עיון</span>
                            </button>

                            {item.user.personal_id !== '0000000' && (
                              <button
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
              className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-end p-4"
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full max-w-xl h-full max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-left duration-300"
              >
                
                {/* Drawer Header */}
                <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                  <div>
                    <span className="text-xs font-semibold text-brand-300 block mb-1">
                      דוח מעקב חניך מפורט
                    </span>
                    <h3 className="text-lg font-bold text-white">
                      {selectedUserOverview.user.full_name} ({selectedUserOverview.user.personal_id})
                    </h3>
                    <p className="text-xs text-slate-400">
                      תפקיד: {selectedUserOverview.role?.name || 'ללא תפקיד'} • תאריך כניסה: {selectedUserOverview.user.entry_date}
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedUserOverview(null)}
                    className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Drawer Body: Tasks & Answers List */}
                <div className="p-6 overflow-y-auto flex-1 space-y-4">
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

                        {/* Submitted Answer Display */}
                        {isCompleted && progress?.answer_text && (
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

                <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                  {selectedUserOverview.user.personal_id !== '0000000' ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(selectedUserOverview.user.id, selectedUserOverview.user.full_name)}
                      className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>מחק משתמש זה לצמיתות</span>
                    </button>
                  ) : (
                    <div></div>
                  )}

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
            {currentRoleTasks.length === 0 ? (
              <div className="py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                לא הוגדרו משימות עבור תפקיד זה. לחץ על "הוסף משימה" להגדרת השלב הראשון.
              </div>
            ) : (
              currentRoleTasks.map((task, index) => (
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
                        onClick={() => handleMoveTaskOrder(index, 'up')}
                        className={`p-1 rounded text-slate-500 hover:bg-slate-100 ${index === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                        title="העבר שלב למעלה"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                        {task.step_order}
                      </span>
                      <button
                        type="button"
                        disabled={index === currentRoleTasks.length - 1}
                        onClick={() => handleMoveTaskOrder(index, 'down')}
                        className={`p-1 rounded text-slate-500 hover:bg-slate-100 ${index === currentRoleTasks.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                        title="העבר שלב למטה"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-slate-900 text-base">{task.title}</h4>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {task.type === 'simple_check' ? 'סימון פשוט' : task.type === 'media_question' ? 'מדיה + שאלה' : 'שאלת הבנה'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed mb-1 line-clamp-2">
                        {task.description}
                      </p>
                      {task.question_prompt && (
                        <p className="text-xs text-brand-700 font-medium">
                          ❓ שאלת אימות: {task.question_prompt}
                        </p>
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
              ))
            )}
          </div>

          {/* Role Create / Edit Modal */}
          {isRoleModalOpen && (
            <div 
              onClick={() => setIsRoleModalOpen(false)}
              className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
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
              className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 max-h-[90vh] overflow-y-auto"
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
                      onChange={(e) => setEditingTask({ ...editingTask, type: e.target.value as TaskType })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white outline-none focus:border-brand-500"
                    >
                      <option value="simple_check">סימון פשוט</option>
                      <option value="media_question">צפייה במדיה ומענה על שאלה</option>
                      <option value="text_question">שאלת הבנה פתוחה</option>
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

                  {editingTask.type === 'media_question' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">קישור לסרטון או מדיה</label>
                      <input
                        type="text"
                        value={editingTask.media_url || ''}
                        onChange={(e) => setEditingTask({ ...editingTask, media_url: e.target.value })}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-brand-500 font-mono text-xs"
                      />
                    </div>
                  )}

                  {(editingTask.type === 'media_question' || editingTask.type === 'text_question') && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">שאלת אימות והבנה לחניך</label>
                      <input
                        type="text"
                        required
                        value={editingTask.question_prompt || ''}
                        onChange={(e) => setEditingTask({ ...editingTask, question_prompt: e.target.value })}
                        placeholder="לדוגמה: מהם שלושת שלבי הדיווח הנדרשים בנוהל?"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-brand-500"
                      />
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
      {/* TAB 3: BACKPACK CMS */}
      {/* ========================================================================= */}
      {activeTab === 'backpack' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-slate-900">ספריית משאבי ידע ומסמכים ({backpackResources.length})</h3>
            <button
              onClick={handleOpenNewResource}
              className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>הוסף משאב חדש לתרמיל</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {backpackResources.map((res) => (
              <div
                key={res.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold bg-brand-50 text-brand-700 px-2.5 py-0.5 rounded-full border border-brand-200">
                      {res.category}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditingResource(res); setIsResourceModalOpen(true); }}
                        className="p-1.5 text-slate-500 hover:text-brand-600 rounded-lg hover:bg-slate-100"
                        title="ערוך משאב"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteResource(res.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                        title="מחק משאב"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h4 className="font-bold text-base text-slate-900 mb-1">{res.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed mb-3">{res.description}</p>
                </div>

                <div className="text-[11px] text-slate-400 font-mono truncate">
                  {res.file_url ? `קובץ: ${res.file_url}` : `קישור: ${res.external_link}`}
                </div>
              </div>
            ))}
          </div>

          {/* Resource Modal */}
          {isResourceModalOpen && editingResource && (
            <div 
              onClick={() => setIsResourceModalOpen(false)}
              className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 sticky top-0 bg-white z-10">
                  <h3 className="font-bold text-base text-slate-900">
                    {editingResource.id ? 'עריכת משאב תרמיל' : 'הוספת משאב חדש לתרמיל'}
                  </h3>
                  <button onClick={() => setIsResourceModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveResource} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">שם המשאב / מסמך</label>
                    <input
                      type="text"
                      required
                      value={editingResource.title || ''}
                      onChange={(e) => setEditingResource({ ...editingResource, title: e.target.value })}
                      placeholder="לדוגמה: פקודת השגרה היחידתית"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">קטגוריה</label>
                    <input
                      type="text"
                      required
                      value={editingResource.category || ''}
                      onChange={(e) => setEditingResource({ ...editingResource, category: e.target.value })}
                      placeholder="נהלים ופקודות / אבטחת מידע / מצגות..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">תקציר ותיאור</label>
                    <textarea
                      rows={3}
                      required
                      value={editingResource.description || ''}
                      onChange={(e) => setEditingResource({ ...editingResource, description: e.target.value })}
                      placeholder="תקציר מהות המסמך והנחיות שימוש..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-brand-500"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">קישור למסמך או קובץ</label>
                    <input
                      type="text"
                      value={editingResource.file_url || ''}
                      onChange={(e) => setEditingResource({ ...editingResource, file_url: e.target.value })}
                      placeholder="https://example.org/doc.pdf"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-brand-500 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">או קישור לפורטל חיצוני</label>
                    <input
                      type="text"
                      value={editingResource.external_link || ''}
                      onChange={(e) => setEditingResource({ ...editingResource, external_link: e.target.value })}
                      placeholder="https://support.example.org"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-brand-500 font-mono text-xs"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsResourceModalOpen(false)}
                      className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                    >
                      ביטול
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-sm"
                    >
                      שמור משאב
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
              className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 max-h-[90vh] overflow-y-auto"
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
                        .filter((n) => n.id !== editingNode.id)
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
