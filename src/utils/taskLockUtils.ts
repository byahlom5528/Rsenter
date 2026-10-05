export interface TaskLockConfig {
  enabled: boolean;
  days: number;
  direction: 'before' | 'after' | 'on_day';
  offsetDays: number;
}

export interface TaskDateLockStatus {
  isDateLocked: boolean;
  unlockDate: Date | null;
  unlockDateFormatted: string;
  daysRemaining: number;
  lockExplanation: string;
}

const LOCK_COMMENT_REGEX = /<!--lock_offset:(-?\d+)-->/i;

/**
 * Extracts clean description and lock configuration from task description.
 * Zero database migration required: stored as a backward-compatible HTML comment in description.
 */
export function parseTaskLock(rawDescription?: string | null): {
  cleanDescription: string;
  lockConfig: TaskLockConfig;
} {
  const desc = rawDescription || '';
  const match = desc.match(LOCK_COMMENT_REGEX);

  if (!match) {
    return {
      cleanDescription: desc,
      lockConfig: {
        enabled: false,
        days: 1,
        direction: 'after',
        offsetDays: 0,
      },
    };
  }

  const offset = parseInt(match[1], 10);
  const cleanDescription = desc.replace(LOCK_COMMENT_REGEX, '').trim();

  let direction: 'before' | 'after' | 'on_day';
  if (offset < 0) {
    direction = 'before';
  } else if (offset === 0) {
    direction = 'on_day';
  } else {
    direction = 'after';
  }

  return {
    cleanDescription,
    lockConfig: {
      enabled: true,
      days: Math.abs(offset) || 1,
      direction,
      offsetDays: offset,
    },
  };
}

/**
 * Serializes task description with lock metadata tag if enabled.
 */
export function serializeTaskDescription(
  cleanDescription: string,
  lockConfig?: Partial<TaskLockConfig> | null
): string {
  const base = (cleanDescription || '').replace(LOCK_COMMENT_REGEX, '').trim();

  if (!lockConfig || !lockConfig.enabled) {
    return base;
  }

  let offset = 0;
  if (lockConfig.direction === 'before') {
    offset = -Math.abs(lockConfig.days || 1);
  } else if (lockConfig.direction === 'after') {
    offset = Math.abs(lockConfig.days || 1);
  } else {
    offset = 0;
  }

  return `${base}\n<!--lock_offset:${offset}-->`;
}

/**
 * Generates human-friendly badge text for Admin UI or summary cards.
 */
export function formatLockBadgeText(lockConfig: TaskLockConfig): string {
  if (!lockConfig.enabled) return '';
  if (lockConfig.direction === 'before') {
    return `נפתח ${lockConfig.days} ימים לפני הכניסה`;
  }
  if (lockConfig.direction === 'on_day') {
    return `נפתח ביום הכניסה לתפקיד`;
  }
  return `נפתח ${lockConfig.days} ימים לאחר הכניסה`;
}

/**
 * Evaluates whether a task is currently locked for a given user entry_date.
 */
export function evaluateTaskDateLock(
  rawDescription?: string | null,
  entryDateStr?: string | null
): TaskDateLockStatus {
  const { lockConfig } = parseTaskLock(rawDescription);

  if (!lockConfig.enabled || !entryDateStr) {
    return {
      isDateLocked: false,
      unlockDate: null,
      unlockDateFormatted: '',
      daysRemaining: 0,
      lockExplanation: '',
    };
  }

  // Parse entry date safely without timezone offset shift
  const parts = entryDateStr.split('-');
  let entryDate: Date;
  if (parts.length === 3) {
    entryDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  } else {
    entryDate = new Date(entryDateStr);
  }

  if (isNaN(entryDate.getTime())) {
    return {
      isDateLocked: false,
      unlockDate: null,
      unlockDateFormatted: '',
      daysRemaining: 0,
      lockExplanation: '',
    };
  }

  // Calculate unlock date: entryDate + offsetDays
  const unlockDate = new Date(entryDate);
  unlockDate.setDate(unlockDate.getDate() + lockConfig.offsetDays);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Difference in calendar days between today and unlock date
  const diffTime = unlockDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const isDateLocked = diffDays > 0;
  const unlockDateFormatted = unlockDate.toLocaleDateString('he-IL');

  let lockExplanation = '';
  if (lockConfig.direction === 'before') {
    lockExplanation = `ייפתח ${lockConfig.days} ימים לפני הכניסה לתפקיד (${unlockDateFormatted})`;
  } else if (lockConfig.direction === 'on_day') {
    lockExplanation = `ייפתח ביום הכניסה לתפקיד (${unlockDateFormatted})`;
  } else {
    lockExplanation = `ייפתח ${lockConfig.days} ימים לאחר הכניסה לתפקיד (${unlockDateFormatted})`;
  }

  if (isDateLocked) {
    if (diffDays === 1) {
      lockExplanation += ` • נפתח מחר!`;
    } else {
      lockExplanation += ` • בעוד ${diffDays} ימים`;
    }
  }

  return {
    isDateLocked,
    unlockDate,
    unlockDateFormatted,
    daysRemaining: Math.max(0, diffDays),
    lockExplanation,
  };
}
