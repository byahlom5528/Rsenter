// Database Type Definitions for מערכת כניסה לתפקיד

export type TaskType = 'simple_check' | 'media_question' | 'text_question';

export interface Role {
  id: string;
  name: string;
  description: string;
  created_at?: string;
}

export interface User {
  id: string;
  personal_id: string; // 7 digits, e.g. "8345678" or "0000000"
  full_name: string;
  role_id: string | null;
  entry_date: string; // YYYY-MM-DD
  previous_roles: string[];
  is_admin: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  role_id: string;
  step_order: number; // 1-indexed sequential step
  title: string;
  description: string;
  type: TaskType;
  media_url?: string | null;
  question_prompt?: string | null;
  created_at?: string;
}

export interface UserTaskProgress {
  id: string;
  user_id: string;
  task_id: string;
  is_completed: boolean;
  answer_text?: string | null;
  completed_at?: string | null;
  created_at?: string;
}

export interface BackpackResource {
  id: string;
  title: string;
  category: string;
  description: string;
  file_url?: string | null;
  external_link?: string | null;
  created_at?: string;
}

export interface OrgNode {
  id: string;
  parent_id: string | null;
  title: string;
  holder_name: string;
  description: string;
  interface_details: string;
  role_interfaces?: Record<string, string>; // Mapping of role_id -> custom interface text
  created_at?: string;
}

// Composite & UI Types
export interface TaskWithProgress extends Task {
  progress?: UserTaskProgress;
  isLocked: boolean;
  isCurrentActive: boolean;
}

export interface UserProgressOverview {
  user: User;
  role?: Role;
  totalTasks: number;
  completedTasks: number;
  completionPercentage: number;
  lastActive?: string;
  tasksProgress: {
    task: Task;
    progress?: UserTaskProgress;
  }[];
}
