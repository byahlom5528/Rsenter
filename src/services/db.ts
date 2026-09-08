import { 
  Role, 
  User, 
  Task, 
  UserTaskProgress, 
  BackpackResource, 
  OrgNode, 
  UserProgressOverview 
} from '../types/database';
import { 
  INITIAL_ROLES, 
  INITIAL_USERS, 
  INITIAL_TASKS, 
  INITIAL_PROGRESS, 
  INITIAL_BACKPACK, 
  INITIAL_ORG_NODES 
} from './initialData';
import { supabase, isSupabaseConfigured } from './supabase';

const STORAGE_KEYS = {
  ROLES: 'onboarding_roles',
  USERS: 'onboarding_users',
  TASKS: 'onboarding_tasks',
  PROGRESS: 'onboarding_user_task_progress',
  BACKPACK: 'onboarding_backpack_resources',
  ORG_NODES: 'onboarding_org_nodes',
  CURRENT_USER_ID: 'onboarding_current_user_id',
};

/**
 * Robust RFC4122 UUID v4 generator safe across browser contexts & PostgreSQL UUID validation.
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(id: string | null | undefined): boolean {
  if (!id || typeof id !== 'string') return false;
  return UUID_REGEX.test(id);
}

function sanitizeToUUID(rawId: string): string {
  if (isValidUUID(rawId)) return rawId;
  const replaced = rawId.replace(/[^0-9a-f-]/gi, 'a');
  if (isValidUUID(replaced)) return replaced;
  return generateUUID();
}

// Helper for local storage persistence
function getStored<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key} to localStorage:`, e);
  }
}

class DBService {
  private roles: Role[] = [];
  private users: User[] = [];
  private tasks: Task[] = [];
  private progress: UserTaskProgress[] = [];
  private backpack: BackpackResource[] = [];
  private orgNodes: OrgNode[] = [];
  private listeners: Set<() => void> = new Set();
  
  private isSyncing = false;

  constructor() {
    this.init();
  }

  private init() {
    if (!localStorage.getItem(STORAGE_KEYS.ROLES)) {
      this.resetToDefaults();
    } else {
      this.roles = getStored(STORAGE_KEYS.ROLES, INITIAL_ROLES);
      this.users = getStored(STORAGE_KEYS.USERS, INITIAL_USERS);
      this.tasks = getStored(STORAGE_KEYS.TASKS, INITIAL_TASKS);
      this.progress = getStored(STORAGE_KEYS.PROGRESS, INITIAL_PROGRESS);
      this.backpack = getStored(STORAGE_KEYS.BACKPACK, INITIAL_BACKPACK);
      this.orgNodes = getStored(STORAGE_KEYS.ORG_NODES, INITIAL_ORG_NODES);

      // Auto-migrate & sanitize any non-UUID legacy IDs from localStorage
      let needsSave = false;
      const taskIdMap = new Map<string, string>();

      this.tasks.forEach((t) => {
        if (!isValidUUID(t.id)) {
          const cleanId = sanitizeToUUID(t.id);
          taskIdMap.set(t.id, cleanId);
          t.id = cleanId;
          needsSave = true;
        }
        if (t.role_id && !isValidUUID(t.role_id)) {
          t.role_id = sanitizeToUUID(t.role_id);
          needsSave = true;
        }
      });

      if (taskIdMap.size > 0) {
        this.progress.forEach((p) => {
          if (taskIdMap.has(p.task_id)) {
            p.task_id = taskIdMap.get(p.task_id)!;
            needsSave = true;
          }
        });
      }

      this.roles.forEach((r) => {
        if (!isValidUUID(r.id)) {
          r.id = sanitizeToUUID(r.id);
          needsSave = true;
        }
      });

      this.orgNodes.forEach((n) => {
        if (!isValidUUID(n.id)) {
          n.id = sanitizeToUUID(n.id);
          needsSave = true;
        }
        if (n.parent_id && !isValidUUID(n.parent_id)) {
          n.parent_id = sanitizeToUUID(n.parent_id);
          needsSave = true;
        }
      });

      if (needsSave) {
        this.saveAll();
      }
    }

    // Initial background sync from Supabase
    this.syncFromSupabase();
  }

  public async syncFromSupabase(): Promise<void> {
    const client = supabase;
    if (!isSupabaseConfigured || !client || this.isSyncing) return;

    this.isSyncing = true;

    try {
      const [
        rolesRes,
        usersRes,
        tasksRes,
        progressRes,
        backpackRes,
        orgNodesRes
      ] = await Promise.all([
        client.from('roles').select('*').order('name'),
        client.from('users').select('*').order('created_at', { ascending: false }),
        client.from('tasks').select('*').order('step_order', { ascending: true }),
        client.from('user_task_progress').select('*'),
        client.from('backpack_resources').select('*'),
        client.from('org_nodes').select('*')
      ]);

      let changed = false;

      if (!rolesRes.error && rolesRes.data && rolesRes.data.length > 0) {
        this.roles = rolesRes.data as Role[];
        changed = true;
      }
      if (!usersRes.error && usersRes.data && usersRes.data.length > 0) {
        this.users = usersRes.data as User[];
        changed = true;
      }
      if (!tasksRes.error && tasksRes.data && tasksRes.data.length > 0) {
        this.tasks = tasksRes.data as Task[];
        changed = true;
      }
      if (!progressRes.error && progressRes.data) {
        this.progress = progressRes.data as UserTaskProgress[];
        changed = true;
      }
      if (!backpackRes.error && backpackRes.data && backpackRes.data.length > 0) {
        this.backpack = backpackRes.data as BackpackResource[];
        changed = true;
      }
      if (!orgNodesRes.error && orgNodesRes.data && orgNodesRes.data.length > 0) {
        this.orgNodes = orgNodesRes.data as OrgNode[];
        changed = true;
      }

      if (changed) {
        this.saveAll();
        this.notify();
      }
    } catch (e) {
      console.warn('Initial Supabase sync notice:', e);
    } finally {
      this.isSyncing = false;
    }
  }

  public resetToDefaults() {
    this.roles = [...INITIAL_ROLES];
    this.users = [...INITIAL_USERS];
    this.tasks = [...INITIAL_TASKS];
    this.progress = [...INITIAL_PROGRESS];
    this.backpack = [...INITIAL_BACKPACK];
    this.orgNodes = [...INITIAL_ORG_NODES];
    this.saveAll();
    this.notify();
  }

  private saveAll() {
    setStored(STORAGE_KEYS.ROLES, this.roles);
    setStored(STORAGE_KEYS.USERS, this.users);
    setStored(STORAGE_KEYS.TASKS, this.tasks);
    setStored(STORAGE_KEYS.PROGRESS, this.progress);
    setStored(STORAGE_KEYS.BACKPACK, this.backpack);
    setStored(STORAGE_KEYS.ORG_NODES, this.orgNodes);
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  // ==================== ROLES ====================
  async getRoles(): Promise<Role[]> {
    return [...this.roles];
  }

  async getRoleById(id: string): Promise<Role | null> {
    return this.roles.find((r) => r.id === id) || null;
  }

  async createRole(roleData: Omit<Role, 'id' | 'created_at'>): Promise<Role> {
    const newRole: Role = {
      ...roleData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('roles').insert([newRole]).select().single();
        if (!error && data) {
          this.roles.push(data as Role);
          this.saveAll();
          this.notify();
          return data as Role;
        }
      } catch (e) {
        console.warn('Supabase createRole error, fallback to local', e);
      }
    }

    this.roles.push(newRole);
    this.saveAll();
    this.notify();
    return newRole;
  }

  async updateRole(id: string, updateData: Partial<Role>): Promise<Role | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('roles')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        if (!error && data) {
          const idx = this.roles.findIndex((r) => r.id === id);
          if (idx !== -1) {
            this.roles[idx] = data as Role;
            this.saveAll();
            this.notify();
          }
          return data as Role;
        }
      } catch (e) {
        console.warn('Supabase updateRole error, fallback to local', e);
      }
    }

    const idx = this.roles.findIndex((r) => r.id === id);
    if (idx === -1) return null;

    this.roles[idx] = { ...this.roles[idx], ...updateData };
    this.saveAll();
    this.notify();
    return this.roles[idx];
  }

  async deleteRole(id: string): Promise<boolean> {
    const deletedTaskIds = this.tasks.filter((t) => t.role_id === id).map((t) => t.id);

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('roles').delete().eq('id', id);
        if (!error) {
          this.roles = this.roles.filter((r) => r.id !== id);
          this.tasks = this.tasks.filter((t) => t.role_id !== id);
          this.progress = this.progress.filter((p) => !deletedTaskIds.includes(p.task_id));
          this.users = this.users.map((u) => (u.role_id === id ? { ...u, role_id: null } : u));
          this.saveAll();
          this.notify();
          return true;
        }
      } catch (e) {
        console.warn('Supabase deleteRole error, fallback to local', e);
      }
    }

    const initialLen = this.roles.length;
    this.roles = this.roles.filter((r) => r.id !== id);
    this.tasks = this.tasks.filter((t) => t.role_id !== id);
    this.progress = this.progress.filter((p) => !deletedTaskIds.includes(p.task_id));
    this.users = this.users.map((u) => (u.role_id === id ? { ...u, role_id: null } : u));
    this.saveAll();
    this.notify();
    return this.roles.length < initialLen;
  }

  // ==================== USERS & AUTH ====================
  async getUserByPersonalId(personalId: string): Promise<User | null> {
    return this.users.find((u) => u.personal_id === personalId) || null;
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.find((u) => u.id === id) || null;
  }

  async getAllUsers(): Promise<User[]> {
    return [...this.users];
  }

  async createUser(userData: {
    personal_id: string;
    full_name: string;
    role_id: string;
    entry_date: string;
    previous_roles: string[];
    is_admin?: boolean;
  }): Promise<User> {
    const existingIndex = this.users.findIndex((u) => u.personal_id === userData.personal_id);

    if (existingIndex !== -1) {
      const existingUser = this.users[existingIndex];
      const updatedUser: User = {
        ...existingUser,
        full_name: userData.full_name,
        role_id: userData.role_id || null,
        entry_date: userData.entry_date,
        previous_roles: userData.previous_roles,
        is_admin: userData.is_admin ?? existingUser.is_admin,
      };

      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('users')
            .update(updatedUser)
            .eq('id', existingUser.id)
            .select()
            .single();
          if (!error && data) {
            this.users[existingIndex] = data as User;
            this.saveAll();
            if (data.role_id) {
              await this.initializeUserProgress(data.id, data.role_id);
            }
            this.notify();
            return data as User;
          }
        } catch (e) {
          console.warn('Supabase updateUser error', e);
        }
      }

      this.users[existingIndex] = updatedUser;
      this.saveAll();
      if (updatedUser.role_id) {
        await this.initializeUserProgress(updatedUser.id, updatedUser.role_id);
      }
      this.notify();
      return updatedUser;
    }

    const newUser: User = {
      id: generateUUID(),
      personal_id: userData.personal_id,
      full_name: userData.full_name,
      role_id: userData.role_id || null,
      entry_date: userData.entry_date,
      previous_roles: userData.previous_roles,
      is_admin: userData.is_admin ?? (userData.personal_id === '0000000'),
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('users').insert([newUser]).select().single();
        if (!error && data) {
          this.users.unshift(data as User);
          this.saveAll();
          if (data.role_id) {
            await this.initializeUserProgress(data.id, data.role_id);
          }
          this.notify();
          return data as User;
        }
      } catch (e) {
        console.warn('Supabase createUser error', e);
      }
    }

    this.users.unshift(newUser);
    this.saveAll();
    if (newUser.role_id) {
      await this.initializeUserProgress(newUser.id, newUser.role_id);
    }
    this.notify();
    return newUser;
  }

  async deleteUser(userId: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('user_task_progress').delete().eq('user_id', userId);
        const { error } = await supabase.from('users').delete().eq('id', userId);
        if (!error) {
          this.users = this.users.filter((u) => u.id !== userId);
          this.progress = this.progress.filter((p) => p.user_id !== userId);
          if (localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID) === userId) {
            localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
          }
          this.saveAll();
          this.notify();
          return true;
        }
      } catch (e) {
        console.warn('Supabase deleteUser error', e);
      }
    }

    const initialLen = this.users.length;
    this.users = this.users.filter((u) => u.id !== userId);
    this.progress = this.progress.filter((p) => p.user_id !== userId);
    if (localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID) === userId) {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    }
    this.saveAll();
    this.notify();
    return this.users.length < initialLen;
  }

  // ==================== TASKS ====================
  async getTasksByRole(roleId: string): Promise<Task[]> {
    return this.tasks
      .filter((t) => t.role_id === roleId)
      .sort((a, b) => a.step_order - b.step_order);
  }

  async getAllTasks(): Promise<Task[]> {
    return [...this.tasks];
  }

  async createTask(taskData: Omit<Task, 'id' | 'created_at'>): Promise<Task> {
    const existingTasksForRole = this.tasks.filter((t) => t.role_id === taskData.role_id);
    const stepOrder = taskData.step_order || existingTasksForRole.length + 1;

    const newTask: Task = {
      ...taskData,
      media_url: taskData.media_url?.trim() || null,
      question_prompt: taskData.question_prompt?.trim() || null,
      step_order: stepOrder,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('tasks').insert([newTask]).select().single();
        if (!error && data) {
          this.tasks.push(data as Task);
          await this.normalizeTaskStepsForRole(data.role_id);
          this.saveAll();
          this.notify();
          return data as Task;
        } else if (error) {
          console.warn('Supabase createTask error:', error);
        }
      } catch (e) {
        console.warn('Supabase createTask exception, fallback to local', e);
      }
    }

    // Local state fallback
    this.tasks.push(newTask);
    await this.normalizeTaskStepsForRole(newTask.role_id);

    // Auto add progress row for users with this role
    const relevantUsers = this.users.filter((u) => u.role_id === newTask.role_id);
    for (const u of relevantUsers) {
      const exists = this.progress.some((p) => p.user_id === u.id && p.task_id === newTask.id);
      if (!exists) {
        this.progress.push({
          id: generateUUID(),
          user_id: u.id,
          task_id: newTask.id,
          is_completed: false,
          answer_text: null,
          completed_at: null,
          created_at: new Date().toISOString(),
        });
      }
    }

    this.saveAll();
    this.notify();
    return newTask;
  }

  async updateTask(id: string, updateData: Partial<Task>): Promise<Task | null> {
    const cleanUpdate = {
      ...updateData,
      media_url: updateData.media_url !== undefined ? (updateData.media_url?.trim() || null) : undefined,
      question_prompt: updateData.question_prompt !== undefined ? (updateData.question_prompt?.trim() || null) : undefined,
    };

    if (isSupabaseConfigured && supabase && isValidUUID(id)) {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .update(cleanUpdate)
          .eq('id', id)
          .select()
          .single();
        if (!error && data) {
          const idx = this.tasks.findIndex((t) => t.id === id);
          if (idx !== -1) {
            this.tasks[idx] = data as Task;
            this.saveAll();
            this.notify();
          }
          return data as Task;
        }
      } catch (e) {
        console.warn('Supabase updateTask error, fallback to local', e);
      }
    }

    const idx = this.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return null;

    this.tasks[idx] = { ...this.tasks[idx], ...cleanUpdate };
    this.saveAll();
    this.notify();
    return this.tasks[idx];
  }

  async deleteTask(id: string): Promise<boolean> {
    const targetTask = this.tasks.find((t) => t.id === id);
    const roleId = targetTask?.role_id;

    if (isSupabaseConfigured && supabase && isValidUUID(id)) {
      try {
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (!error) {
          this.tasks = this.tasks.filter((t) => t.id !== id);
          this.progress = this.progress.filter((p) => p.task_id !== id);
          if (roleId) {
            await this.normalizeTaskStepsForRole(roleId);
          }
          this.saveAll();
          this.notify();
          return true;
        }
      } catch (e) {
        console.warn('Supabase deleteTask error, fallback to local', e);
      }
    }

    const initialLen = this.tasks.length;
    this.tasks = this.tasks.filter((t) => t.id !== id);
    this.progress = this.progress.filter((p) => p.task_id !== id);
    
    if (roleId) {
      await this.normalizeTaskStepsForRole(roleId);
    }
    this.saveAll();
    this.notify();
    return this.tasks.length < initialLen;
  }

  public async normalizeTaskStepsForRole(roleId: string): Promise<void> {
    const tasksForRole = this.tasks
      .filter((t) => t.role_id === roleId)
      .sort((a, b) => a.step_order - b.step_order);

    tasksForRole.forEach((task, index) => {
      task.step_order = index + 1;
    });

    this.saveAll();

    if (isSupabaseConfigured && supabase) {
      try {
        for (let i = 0; i < tasksForRole.length; i++) {
          const t = tasksForRole[i];
          if (isValidUUID(t.id)) {
            await supabase.from('tasks').update({ step_order: 1000 + i }).eq('id', t.id);
          }
        }
        for (let i = 0; i < tasksForRole.length; i++) {
          const t = tasksForRole[i];
          if (isValidUUID(t.id)) {
            await supabase.from('tasks').update({ step_order: i + 1 }).eq('id', t.id);
          }
        }
      } catch (e) {
        console.warn('Supabase normalizeTaskSteps error', e);
      }
    }
  }

  async reorderTasks(roleId: string, orderedTaskIds: string[]): Promise<Task[]> {
    orderedTaskIds.forEach((id, index) => {
      const task = this.tasks.find((t) => t.id === id && t.role_id === roleId);
      if (task) {
        task.step_order = index + 1;
      }
    });

    this.saveAll();
    this.notify();

    if (isSupabaseConfigured && supabase) {
      try {
        for (let i = 0; i < orderedTaskIds.length; i++) {
          const taskId = orderedTaskIds[i];
          if (isValidUUID(taskId)) {
            await supabase.from('tasks').update({ step_order: 1000 + i }).eq('id', taskId);
          }
        }
        for (let i = 0; i < orderedTaskIds.length; i++) {
          const taskId = orderedTaskIds[i];
          if (isValidUUID(taskId)) {
            await supabase.from('tasks').update({ step_order: i + 1 }).eq('id', taskId);
          }
        }
      } catch (e) {
        console.warn('Supabase reorderTasks error', e);
      }
    }

    return this.getTasksByRole(roleId);
  }

  // ==================== USER TASK PROGRESS ====================
  async initializeUserProgress(userId: string, roleId: string): Promise<void> {
    const roleTasks = this.tasks
      .filter((t) => t.role_id === roleId)
      .sort((a, b) => a.step_order - b.step_order);
    
    let added = false;
    for (const task of roleTasks) {
      const exists = this.progress.some((p) => p.user_id === userId && p.task_id === task.id);
      if (!exists) {
        const newProgressRow: UserTaskProgress = {
          id: generateUUID(),
          user_id: userId,
          task_id: task.id,
          is_completed: false,
          answer_text: null,
          completed_at: null,
          created_at: new Date().toISOString(),
        };

        this.progress.push(newProgressRow);
        added = true;

        if (isSupabaseConfigured && supabase) {
          try {
            await supabase.from('user_task_progress').insert([newProgressRow]);
          } catch (e) {
            console.warn('Supabase insert user_task_progress notice', e);
          }
        }
      }
    }

    if (added) {
      this.saveAll();
      this.notify();
    }
  }

  async getUserProgress(userId: string): Promise<UserTaskProgress[]> {
    return this.progress.filter((p) => p.user_id === userId);
  }

  async completeTask(userId: string, taskId: string, answerText?: string): Promise<UserTaskProgress> {
    const now = new Date().toISOString();
    let record = this.progress.find((p) => p.user_id === userId && p.task_id === taskId);

    if (record) {
      record.is_completed = true;
      record.answer_text = answerText !== undefined ? answerText : record.answer_text;
      record.completed_at = now;
    } else {
      record = {
        id: generateUUID(),
        user_id: userId,
        task_id: taskId,
        is_completed: true,
        answer_text: answerText || null,
        completed_at: now,
        created_at: now,
      };
      this.progress.push(record);
    }

    this.saveAll();
    this.notify();

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('user_task_progress').upsert({
          id: record.id,
          user_id: userId,
          task_id: taskId,
          is_completed: true,
          answer_text: record.answer_text,
          completed_at: now,
        });
      } catch (e) {
        console.warn('Supabase completeTask notice', e);
      }
    }

    return record;
  }

  async toggleTaskCompletion(userId: string, taskId: string, isCompleted: boolean): Promise<UserTaskProgress> {
    const now = new Date().toISOString();
    let record = this.progress.find((p) => p.user_id === userId && p.task_id === taskId);

    if (record) {
      record.is_completed = isCompleted;
      record.completed_at = isCompleted ? now : null;
    } else {
      record = {
        id: generateUUID(),
        user_id: userId,
        task_id: taskId,
        is_completed: isCompleted,
        answer_text: null,
        completed_at: isCompleted ? now : null,
        created_at: now,
      };
      this.progress.push(record);
    }

    this.saveAll();
    this.notify();

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('user_task_progress').upsert({
          id: record.id,
          user_id: userId,
          task_id: taskId,
          is_completed: isCompleted,
          completed_at: isCompleted ? now : null,
        });
      } catch (e) {
        console.warn('Supabase toggleTaskCompletion notice', e);
      }
    }

    return record;
  }

  async resetUserProgress(userId: string): Promise<void> {
    this.progress = this.progress.filter((p) => p.user_id !== userId);

    const user = this.users.find((u) => u.id === userId);
    if (user && user.role_id) {
      await this.initializeUserProgress(user.id, user.role_id);
    }

    this.saveAll();
    this.notify();

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('user_task_progress').delete().eq('user_id', userId);
        if (user && user.role_id) {
          await this.initializeUserProgress(user.id, user.role_id);
        }
      } catch (e) {
        console.warn('Supabase resetUserProgress notice', e);
      }
    }
  }

  async saveTaskProgress(progressData: {
    user_id: string;
    task_id: string;
    is_completed: boolean;
    answer_text?: string | null;
  }): Promise<UserTaskProgress> {
    const now = new Date().toISOString();
    let record = this.progress.find(
      (p) => p.user_id === progressData.user_id && p.task_id === progressData.task_id
    );

    if (record) {
      record.is_completed = progressData.is_completed;
      if (progressData.answer_text !== undefined) {
        record.answer_text = progressData.answer_text;
      }
      record.completed_at = progressData.is_completed ? (record.completed_at || now) : null;
    } else {
      record = {
        id: generateUUID(),
        user_id: progressData.user_id,
        task_id: progressData.task_id,
        is_completed: progressData.is_completed,
        answer_text: progressData.answer_text || null,
        completed_at: progressData.is_completed ? now : null,
        created_at: now,
      };
      this.progress.push(record);
    }

    this.saveAll();
    this.notify();

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('user_task_progress').upsert({
          id: record.id,
          user_id: record.user_id,
          task_id: record.task_id,
          is_completed: record.is_completed,
          answer_text: record.answer_text,
          completed_at: record.completed_at,
        });
      } catch (e) {
        console.warn('Supabase saveTaskProgress notice', e);
      }
    }

    return record;
  }

  // ==================== BACKPACK RESOURCES ====================
  async getBackpackResources(): Promise<BackpackResource[]> {
    return [...this.backpack];
  }

  async createBackpackResource(
    resourceData: Omit<BackpackResource, 'id' | 'created_at'>
  ): Promise<BackpackResource> {
    const newResource: BackpackResource = {
      ...resourceData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('backpack_resources').insert([newResource]).select().single();
        if (!error && data) {
          this.backpack.push(data as BackpackResource);
          this.saveAll();
          this.notify();
          return data as BackpackResource;
        }
      } catch (e) {
        console.warn('Supabase createBackpackResource error', e);
      }
    }

    this.backpack.push(newResource);
    this.saveAll();
    this.notify();
    return newResource;
  }

  async updateBackpackResource(
    id: string,
    updateData: Partial<BackpackResource>
  ): Promise<BackpackResource | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('backpack_resources')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        if (!error && data) {
          const idx = this.backpack.findIndex((r) => r.id === id);
          if (idx !== -1) {
            this.backpack[idx] = data as BackpackResource;
            this.saveAll();
            this.notify();
          }
          return data as BackpackResource;
        }
      } catch (e) {
        console.warn('Supabase updateBackpackResource error', e);
      }
    }

    const idx = this.backpack.findIndex((r) => r.id === id);
    if (idx === -1) return null;

    this.backpack[idx] = { ...this.backpack[idx], ...updateData };
    this.saveAll();
    this.notify();
    return this.backpack[idx];
  }

  async deleteBackpackResource(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('backpack_resources').delete().eq('id', id);
        if (!error) {
          this.backpack = this.backpack.filter((r) => r.id !== id);
          this.saveAll();
          this.notify();
          return true;
        }
      } catch (e) {
        console.warn('Supabase deleteBackpackResource error', e);
      }
    }

    const initialLen = this.backpack.length;
    this.backpack = this.backpack.filter((r) => r.id !== id);
    this.saveAll();
    this.notify();
    return this.backpack.length < initialLen;
  }

  // ==================== ORG TREE NODES ====================
  async getOrgNodes(): Promise<OrgNode[]> {
    return [...this.orgNodes];
  }

  async createOrgNode(nodeData: Omit<OrgNode, 'id' | 'created_at'>): Promise<OrgNode> {
    const validId = generateUUID();

    const newNode: OrgNode = {
      title: nodeData.title || '',
      holder_name: nodeData.holder_name || '',
      description: nodeData.description || 'תפקיד במבנה הארגוני',
      interface_details: nodeData.interface_details || 'ממשק עבודה שוטף וסנכרון תהליכים',
      parent_id: nodeData.parent_id && nodeData.parent_id.trim() !== '' ? nodeData.parent_id : null,
      role_interfaces: nodeData.role_interfaces || {},
      id: validId,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('org_nodes').insert([newNode]).select().single();
        if (!error && data) {
          this.orgNodes.push(data as OrgNode);
          this.saveAll();
          this.notify();
          return data as OrgNode;
        } else if (error) {
          const { role_interfaces, ...baseNode } = newNode;
          const retryRes = await supabase.from('org_nodes').insert([baseNode]).select().single();
          if (!retryRes.error && retryRes.data) {
            this.orgNodes.push({ ...retryRes.data, role_interfaces: newNode.role_interfaces } as OrgNode);
            this.saveAll();
            this.notify();
            return newNode;
          }
        }
      } catch (e) {
        console.warn('Supabase createOrgNode error', e);
      }
    }

    this.orgNodes.push(newNode);
    this.saveAll();
    this.notify();
    return newNode;
  }

  async updateOrgNode(id: string, updateData: Partial<OrgNode>): Promise<OrgNode | null> {
    let targetParent = updateData.parent_id && updateData.parent_id.trim() !== '' ? updateData.parent_id : null;
    if (targetParent === id) {
      targetParent = null;
    }

    const cleanData = {
      ...updateData,
      parent_id: targetParent,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('org_nodes')
          .update(cleanData)
          .eq('id', id)
          .select()
          .single();
        if (!error && data) {
          const idx = this.orgNodes.findIndex((n) => n.id === id);
          if (idx !== -1) {
            this.orgNodes[idx] = data as OrgNode;
            this.saveAll();
            this.notify();
          }
          return data as OrgNode;
        } else if (error) {
          const { role_interfaces, ...baseData } = cleanData;
          await supabase.from('org_nodes').update(baseData).eq('id', id);
        }
      } catch (e) {
        console.warn('Supabase updateOrgNode error', e);
      }
    }

    const idx = this.orgNodes.findIndex((n) => n.id === id);
    if (idx === -1) return null;

    this.orgNodes[idx] = { ...this.orgNodes[idx], ...cleanData };
    this.saveAll();
    this.notify();
    return this.orgNodes[idx];
  }

  async deleteOrgNode(id: string): Promise<boolean> {
    const targetNode = this.orgNodes.find((n) => n.id === id);
    const newParent = targetNode ? targetNode.parent_id : null;

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('org_nodes').update({ parent_id: newParent }).eq('parent_id', id);
        await supabase.from('org_nodes').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase deleteOrgNode error', e);
      }
    }

    this.orgNodes.forEach((n) => {
      if (n.parent_id === id) {
        n.parent_id = newParent;
      }
    });

    const initialLen = this.orgNodes.length;
    this.orgNodes = this.orgNodes.filter((n) => n.id !== id);
    this.saveAll();
    this.notify();
    return this.orgNodes.length < initialLen;
  }

  // ==================== ADMIN ANALYTICS & DRILL DOWN ====================
  async getAllUsersProgressOverview(): Promise<UserProgressOverview[]> {
    const users = this.users;
    const roles = this.roles;
    const allTasks = this.tasks;
    const allProgress = this.progress;

    const overviews: UserProgressOverview[] = [];

    for (const user of users) {
      if (user.is_admin && user.personal_id === '0000000') continue;

      const role = roles.find((r) => r.id === user.role_id);
      const userTasks = allTasks
        .filter((t) => t.role_id === user.role_id)
        .sort((a, b) => a.step_order - b.step_order);
      
      const userProgress = allProgress.filter((p) => p.user_id === user.id);

      const tasksProgress = userTasks.map((task) => {
        const progress = userProgress.find((p) => p.task_id === task.id);
        return { task, progress };
      });

      const totalTasks = userTasks.length;
      const completedTasks = tasksProgress.filter((tp) => tp.progress?.is_completed).length;
      const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Find last active timestamp
      const completedTimestamps = userProgress
        .map((p) => p.completed_at)
        .filter(Boolean) as string[];
      
      const lastActive = completedTimestamps.length > 0 
        ? completedTimestamps.sort().reverse()[0] 
        : user.created_at;

      overviews.push({
        user,
        role,
        totalTasks,
        completedTasks,
        completionPercentage,
        lastActive,
        tasksProgress,
      });
    }

    return overviews;
  }
}

export const db = new DBService();
