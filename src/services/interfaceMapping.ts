import { OrgNode, Role } from '../types/database';

export interface SimplifiedRoleInterface {
  isMyNode: boolean;
  relationshipBadge: string;
  relationshipColor: string;
  headline: string;
  interfaceText: string;
  keyTouchpoint: string;
}

/**
 * Returns a simplified, unified work interface relative to the logged-in user's role.
 * If the admin defined custom text for this role in node.role_interfaces, it takes precedence.
 */
export function getSimplifiedRoleInterface(
  userRole: Role | null | undefined,
  targetNode: OrgNode
): SimplifiedRoleInterface {
  const roleName = userRole?.name || 'חניך';
  const roleId = userRole?.id;
  const nodeTitle = targetNode.title;
  const nodeHolder = targetNode.holder_name;

  // 1. Is this node the user's own role/position?
  const isMyNode = Boolean(
    userRole && 
    (nodeTitle.includes(roleName) || roleName.includes(nodeTitle))
  );

  if (isMyNode) {
    return {
      isMyNode: true,
      relationshipBadge: '⭐ התפקיד שלך',
      relationshipColor: 'bg-brand-100 text-brand-800 border-brand-300',
      headline: `זהו כרטיס התפקיד שלך בארגון`,
      interfaceText: `הובלה, ייזום וביצוע של כלל משימות הליבה בתחום ${roleName}, סנכרון שוטף מול המפקד והעמיתים, וניהול הפעילות השוטפת.`,
      keyTouchpoint: 'שגרת עבודה יומיומית ומשוב תקופתי.'
    };
  }

  // Check if admin has set custom interface text for this specific role ID or role Name
  if (targetNode.role_interfaces) {
    if (roleId && targetNode.role_interfaces[roleId]) {
      return {
        isMyNode: false,
        relationshipBadge: '⚡ ממשק ישיר מוגדר',
        relationshipColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
        headline: `ממשק עבודה מול ${roleName}`,
        interfaceText: targetNode.role_interfaces[roleId],
        keyTouchpoint: `סנכרון שוטף מול ${nodeHolder}.`
      };
    }
    if (targetNode.role_interfaces[roleName]) {
      return {
        isMyNode: false,
        relationshipBadge: '⚡ ממשק ישיר מוגדר',
        relationshipColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
        headline: `ממשק עבודה מול ${roleName}`,
        interfaceText: targetNode.role_interfaces[roleName],
        keyTouchpoint: `סנכרון שוטף מול ${nodeHolder}.`
      };
    }
  }

  // 2. Unit Commander (מפקד היחידה)
  if (nodeTitle.includes('מפקד היחידה') || nodeTitle.includes('אל"ם')) {
    return {
      isMyNode: false,
      relationshipBadge: '🎖️ פיקוד עליון',
      relationshipColor: 'bg-purple-100 text-purple-800 border-purple-300',
      headline: `ממשק פיקודי ויעדי יחידה`,
      interfaceText: `התוויית החזון והיעדים הרב-שנתיים של היחידה. בתפקידך כ-${roleName}, אתה פועל למימוש תוכניות העבודה הענפיות ומשתתף בשיחת סיכום כניסה לתפקיד במעמד המפקד.`,
      keyTouchpoint: 'כנסים יחידתיים ושיחת סיכום כניסה לתפקיד.'
    };
  }

  // 3. Smart Defaults by Role:

  // --- A. Role is 'מנהל פרויקטים טכנולוגי' ---
  if (roleName.includes('מנהל פרויקט') || roleName.includes('פרויקטים')) {
    if (nodeTitle.includes('טכנולוגיות') || nodeTitle.includes('רע"ן טכנולוגיות')) {
      return {
        isMyNode: false,
        relationshipBadge: '👑 פיקוד מקצועי ישיר',
        relationshipColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        headline: `פיקוד ישיר, תעדוף משימות ואישור אפיונים`,
        interfaceText: `המפקד הישיר שלך. ממשק יומיומי ושבועי להצגת תוכניות עבודה (לו"ז, תקציב ומשאבים), אישור מסמכי דרישות ואפיון, הסרת חסמים וקבלת הנחיות מקצועיות.`,
        keyTouchpoint: 'ישיבת סטטוס ענפית שבועית ושיחות חפיפה תקופתיות.'
      };
    }

    if (nodeTitle.includes('מערכות ליבה') || nodeTitle.includes('פיתוח') || nodeTitle.includes('DevOps') || nodeTitle.includes('ענן')) {
      return {
        isMyNode: false,
        relationshipBadge: '⚡ ממשק פיתוח ואינטגרציה',
        relationshipColor: 'bg-blue-100 text-blue-800 border-blue-300',
        headline: `הובלת שלבי הפיתוח ותיאום תוכנה`,
        interfaceText: `ממשק עבודה שוטף לתרגום דרישות הלקוח למשימות פיתוח, סנכרון תכולות העבודה, מעקב קצב התקדמות, בדיקות קבלה ותיאום שחרור גרסאות.`,
        keyTouchpoint: 'תכנון שלבי עבודה ועדכון יומי שוטף.'
      };
    }

    if (nodeTitle.includes('מבצעים') || nodeTitle.includes('חמ"ל')) {
      return {
        isMyNode: false,
        relationshipBadge: '🎯 לקוח וממשק מבצעי',
        relationshipColor: 'bg-amber-100 text-amber-800 border-amber-300',
        headline: `איסוף צרכים מבצעיים והטמעה בשטח`,
        interfaceText: `הבנת הצרכים של משתמשי הקצה בחמ"ל, קבלת פידבק בזמן אמת על תפקוד המערכות, והטמעת יכולות טכנולוגיות חדשות בפעילות המבצעית.`,
        keyTouchpoint: 'פורום סנכרון טכנו-מבצעי דו-שבועי ותרגילי חמ"ל.'
      };
    }
  }

  // --- B. Role is 'קצין מבצעים ותיאום' ---
  if (roleName.includes('מבצעים') || roleName.includes('תיאום')) {
    if (nodeTitle.includes('מבצעים') || nodeTitle.includes('חמ"ל')) {
      return {
        isMyNode: false,
        relationshipBadge: '👑 פיקוד מבצעי ישיר',
        relationshipColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        headline: `שליטה ומענה לאירועים בזמן אמת`,
        interfaceText: `שרשרת הפיקוד והשליטה הישירה שלך. סנכרון תמונת המצב המבצעית, הפעלת כוחות וכוננויות, יישום פקודות ותחקור אירועים חריגים.`,
        keyTouchpoint: 'תדריך פתיחת משמרת יומי והערכות מצב שבועיות.'
      };
    }

    if (nodeTitle.includes('טכנולוגיות') || nodeTitle.includes('פיתוח') || nodeTitle.includes('מערכות')) {
      return {
        isMyNode: false,
        relationshipBadge: '🛠️ שותף טכנולוגי ותמיכה',
        relationshipColor: 'bg-blue-100 text-blue-800 border-blue-300',
        headline: `כשירות מערכות שו"ב ודרישות שטח`,
        interfaceText: `הגדרת דרישות לשיפור מערכות השליטה והבקרה (שו"ב), דיווח על תקלות קריטיות בזמן אמת, והשתתפות בבדיקות קבלה מבצעיות לגרסאות חדשות.`,
        keyTouchpoint: 'דיווח תקלות בחמ"ל וועדות תעדוף חודשיות.'
      };
    }
  }

  // --- C. Role is 'מפתח תוכנה Full-Stack' ---
  if (roleName.includes('מפתח') || roleName.includes('תוכנה') || roleName.includes('Full-Stack')) {
    if (nodeTitle.includes('מערכות ליבה') || nodeTitle.includes('טכנולוגיות')) {
      return {
        isMyNode: false,
        relationshipBadge: '👑 ראש מדור ומנהל מקצועי',
        relationshipColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        headline: `הובלה ארכיטקטונית וביקורת קוד`,
        interfaceText: `המנהל המקצועי הישיר שלך. קבלת משימות פיתוח, ליווי ארכיטקטוני, ביקורת קוד וחניכה מעמיקה על מערכות הליבה.`,
        keyTouchpoint: 'עדכון סטטוס יומי ושיחות חניכה מקצועיות.'
      };
    }

    if (nodeTitle.includes('DevOps') || nodeTitle.includes('ענן')) {
      return {
        isMyNode: false,
        relationshipBadge: '☁️ תשתית, ענן ואוטומציה',
        relationshipColor: 'bg-cyan-100 text-cyan-800 border-cyan-300',
        headline: `סביבות ריצה, שרשרת פריסה ואבטחה`,
        interfaceText: `סנכרון על שרשרת הפריסה והאוטומציה, הקצאת משאבים בסביבות ענן ובדיקות, פתרון שגיאות תשתית ועמידה בסטנדרטי אבטחת מידע.`,
        keyTouchpoint: 'פריסות גרסה לסביבת הייצור וניטור ביצועים.'
      };
    }
  }

  // --- D. Default Fallback ---
  return {
    isMyNode: false,
    relationshipBadge: '🤝 ממשק עבודה הדדי',
    relationshipColor: 'bg-slate-100 text-slate-800 border-slate-300',
    headline: `ממשק עבודה וסנכרון שוטף`,
    interfaceText: targetNode.interface_details || `ממשק עבודה שוטף לתיאום משימות, סנכרון תהליכים יחידתיים ושיתוף פעולה הדדי להשגת יעדי הארגון.`,
    keyTouchpoint: 'פגישות עבודה תקופתיות וערוצי תקשורת יחידתיים.'
  };
}
