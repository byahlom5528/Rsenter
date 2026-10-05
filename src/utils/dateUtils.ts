export interface RoleDaysInfo {
  days: number;
  isFuture: boolean;
  text: string;
}

/**
 * Calculates days in role or days until role based on user's entry_date.
 * - If entry date is in the future: returns days until role ("X ימים עד התפקיד" / "יום 1 עד התפקיד")
 * - If entry date has arrived (today or past): returns days in role ("X ימים בתפקיד" / "יום 1 בתפקיד")
 */
export function getRoleDaysInfo(entryDateStr?: string | null): RoleDaysInfo {
  if (!entryDateStr) {
    return {
      days: 1,
      isFuture: false,
      text: 'יום 1 בתפקיד',
    };
  }

  // Parse YYYY-MM-DD safely
  const parts = entryDateStr.split('-');
  let entryDate: Date;
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    entryDate = new Date(year, month, day);
  } else {
    entryDate = new Date(entryDateStr);
  }

  if (isNaN(entryDate.getTime())) {
    return {
      days: 1,
      isFuture: false,
      text: 'יום 1 בתפקיד',
    };
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Difference in calendar days (positive = in the past, negative = in the future)
  const diffTime = today.getTime() - entryDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    // The entry date is in the future (not arrived yet)
    const daysUntil = Math.abs(diffDays);
    return {
      days: daysUntil,
      isFuture: true,
      text: daysUntil === 1 ? 'יום 1 עד התפקיד' : `${daysUntil} ימים עד התפקיד`,
    };
  } else {
    // The entry date has arrived (today or past)
    const daysInRole = diffDays === 0 ? 1 : diffDays;
    return {
      days: daysInRole,
      isFuture: false,
      text: daysInRole === 1 ? 'יום 1 בתפקיד' : `${daysInRole} ימים בתפקיד`,
    };
  }
}
