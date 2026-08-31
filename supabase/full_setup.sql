-- =========================================================================
-- COMPLETE SUPABASE SETUP SCRIPT (CLEAN RESET + SCHEMA + SEED)
-- הרצת סקריפט זה מאפסת ויוצרת מחדש את כל הטבלאות בצורה נקייה ומושלמת
-- =========================================================================

-- 0. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. DROP EXISTING TABLES TO PREVENT FOREIGN KEY / CONSTRAINT MISMATCHES
DROP TABLE IF EXISTS user_task_progress CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS backpack_resources CASCADE;
DROP TABLE IF EXISTS org_nodes CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- 2. CREATE TABLES
-- 2.1 ROLES TABLE
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.2 USERS TABLE
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    personal_id VARCHAR(7) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    previous_roles JSONB DEFAULT '[]'::jsonb NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.3 TASKS TABLE
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('simple_check', 'media_question', 'text_question')),
    media_url TEXT,
    question_prompt TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_role_step UNIQUE (role_id, step_order)
);

-- 2.4 USER TASK PROGRESS TABLE
CREATE TABLE user_task_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT FALSE NOT NULL,
    answer_text TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_task UNIQUE (user_id, task_id)
);

-- 2.5 BACKPACK RESOURCES TABLE
CREATE TABLE backpack_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    file_url TEXT,
    external_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.6 ORG NODES TABLE
CREATE TABLE org_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES org_nodes(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    holder_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    interface_details TEXT NOT NULL,
    role_interfaces JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. CREATE INDEXES
CREATE INDEX idx_users_personal_id ON users(personal_id);
CREATE INDEX idx_tasks_role_step ON tasks(role_id, step_order);
CREATE INDEX idx_user_task_progress_user ON user_task_progress(user_id);
CREATE INDEX idx_org_nodes_parent ON org_nodes(parent_id);
CREATE INDEX idx_backpack_category ON backpack_resources(category);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_task_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE backpack_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public full access roles" ON roles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access user_task_progress" ON user_task_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access backpack_resources" ON backpack_resources FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access org_nodes" ON org_nodes FOR ALL USING (true) WITH CHECK (true);

-- =========================================================================
-- 5. INSERT SEED INITIAL DATA
-- =========================================================================

-- Roles
INSERT INTO roles (id, name, description) VALUES
('11111111-1111-1111-1111-111111111111', 'מנהל פרויקטים טכנולוגי', 'אחראי על הובלת פרויקטים טכנולוגיים חוצי ארגון, ניהול לו"ז, תקציב ואינטגרציה מול צוותי פיתוח ושותפים.'),
('22222222-2222-2222-2222-222222222222', 'קצין מבצעים ותיאום', 'ניהול השגרה המבצעית, מענה לאירועים בזמן אמת, סנכרון גורמי שטח וממשקי פיקוד.'),
('33333333-3333-3333-3333-333333333333', 'מפתח תוכנה Full-Stack', 'פיתוח מערכות ליבה, ארכיטקטורת ענן, ממשקי משתמש מתקדמים ואינטגרציית בסיסי נתונים מאובטחים.'),
('44444444-4444-4444-4444-444444444444', 'רמ"ד תכנון ובקרה', 'גיבוש תוכניות עבודה שנתיות, בקרת יעדים ומשאבים, והובלת תהליכי ייעול ארגוני.');

-- Admin & Users
INSERT INTO users (id, personal_id, full_name, role_id, entry_date, previous_roles, is_admin) VALUES
('00000000-0000-0000-0000-000000000000', '0000000', 'מנהל מערכת ראשי', NULL, CURRENT_DATE, '["קצין מטה", "מנהל פרויקט"]'::jsonb, TRUE),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '8345678', 'דניאל כהן', '11111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '14 days', '["מפתח תוכנה", "ראש צוות"]'::jsonb, FALSE),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '7654321', 'רוני לוי', '22222222-2222-2222-2222-222222222222', CURRENT_DATE - INTERVAL '30 days', '["סמל מבצעים", "קצין חמ\"ל"]'::jsonb, FALSE),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '8899112', 'יונתן גולדשטיין', '33333333-3333-3333-3333-333333333333', CURRENT_DATE - INTERVAL '3 days', '["סטודנט למדמ\"ח"]'::jsonb, FALSE);

-- Tasks for Role 1
INSERT INTO tasks (id, role_id, step_order, title, description, type, media_url, question_prompt) VALUES
('a1010000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 1, 'קליטה במערכת ופגישת פתיחה עם ראש הענף', 'קיום שיחת היכרות ראשונית עם רע"ן, קבלת דגשים מקצועיים וסקירת יעדי הענף לרבעון הקרוב.', 'simple_check', NULL, NULL),
('a1020000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 2, 'צפייה בסרטון: ארכיטקטורת המערכות והממשקים', 'צפה בסרטון ההדרכה המצורף המפרט את תשתית המערכות הארגונית וממשקי העבודה הבין-צוותיים.', 'media_question', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'מהם שלושת ממשקי הליבה שהוזכרו בסרטון שעליך לתאם מולם בשלב האפיון?'),
('a1030000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 3, 'הגדרת תוכנית עבודה חודשית ראשונית', 'נסח את עקרונות תוכנית העבודה שלך ל-30 הימים הקרובים, כולל פגישות מפתח ומסמכי דרישות שעליך להפיק.', 'text_question', NULL, 'פרט בקצרה 3 מטרות מרכזיות ל-30 הימים הראשונים שלך בתפקיד:'),
('a1040000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 4, 'מעבר על פקודות ונהלי אבטחת מידע וסייבר', 'קריאת נהלי אבטחת המידע ואישור הבנת ההנחיות לניהול הרשאות וגישה למאגרי מידע.', 'simple_check', NULL, NULL),
('a1050000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 5, 'הצגת סטטוס חניכה וסיכום שלב כניסה', 'הצגת תובנות מרכזיות מתוך תהליך החפיפה בפני מפקד המחלקה וקבלת אישור סיום חניכה רשמי.', 'text_question', NULL, 'מהו האתגר המשמעותי ביותר שזיהית עד כה בתהליכי העבודה ומה הצעתך לשיפור?');

-- Tasks for Role 2
INSERT INTO tasks (id, role_id, step_order, title, description, type, media_url, question_prompt) VALUES
('a2010000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 1, 'סיור חמ\"ל והכרת מערכות השליטה והבקרה (שו\"ב)', 'היכרות פיזית ומערכתית עם עמדות החמ"ל, קווי הקשר, ונהלי העברת משמרת.', 'simple_check', NULL, NULL),
('a2020000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 2, 'עיון בפקודת המבצעים הגזרתית וסרטון תדריך', 'צפייה בסרטון תדריך מודיעיני-מבצעי ועיון בעקרונות הפקודה המבצעית השנתית.', 'media_question', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'מהם זמני התגובה המוגדרים למעבר משגרה לחירום בהתאם לתדריך?'),
('a2030000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 3, 'תרגול נוהל הפעלת כוחות וכוננויות', 'מענה על תרחיש מבצעי לדוגמה: אירוע מתפרץ בגזרה ונדרשת הפעלת מענה משולב.', 'text_question', NULL, 'כיצד תפעל ברמת סדר הפעולות ב-10 הדקות הראשונות של אירוע חריג?');

-- Tasks for Role 3
INSERT INTO tasks (id, role_id, step_order, title, description, type, media_url, question_prompt) VALUES
('a3010000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 1, 'הגדרת סביבת פיתוח מקומית והרשאות Git', 'שיבוט הריפוזיטורי הראשי, התקנת Docker, והרצת סביבת הפיתוח המקומית.', 'simple_check', NULL, NULL),
('a3020000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 2, 'סקירת ארכיטקטורת מיקרו-סרוויסים', 'צפייה בהקלטת וובינר פנימי על תבניות הארכיטקטורה ועקרונות כתיבת קוד נקי בפרויקט.', 'media_question', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'איזה בסיס נתונים משמש כמנוע הזיכרון המטמון והשליפה המהירה במערכת ומה הסיבה לכך?'),
('a3030000-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 3, 'הגשת עדכון קוד ראשון לבדיקה', 'ביצוע משימת קוד ראשונית, כתיבת בדיקות יחידה, והגשת קוד לבדיקת עמיתים.', 'text_question', NULL, 'ציין את מזהה בקשת שילוב הקוד שפתחת ופרט בקצרה את השינוי שביצעת:');

-- User Progress
INSERT INTO user_task_progress (id, user_id, task_id, is_completed, answer_text, completed_at) VALUES
('f1000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1010000-0000-0000-0000-000000000001', TRUE, NULL, CURRENT_DATE - INTERVAL '12 days'),
('f1000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1020000-0000-0000-0000-000000000002', TRUE, '1. מחלקת אבטחת מידע, 2. צוות תשתיות ענן, 3. נציג הלקוח המבצעי.', CURRENT_DATE - INTERVAL '8 days'),
('f1000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1030000-0000-0000-0000-000000000003', FALSE, NULL, NULL),
('f1000000-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1040000-0000-0000-0000-000000000004', FALSE, NULL, NULL),
('f1000000-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1050000-0000-0000-0000-000000000005', FALSE, NULL, NULL);

-- Backpack
INSERT INTO backpack_resources (id, title, category, description, file_url, external_link) VALUES
('b1111111-1111-1111-1111-111111111111', 'פקודת השגרה ונוהל כניסה לתפקיד', 'נהלים ופקודות', 'מסמך המדיניות הרשמי המפרט את תהליכי החפיפה, לוחות הזמנים וטופסי הטיולים הנדרשים.', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', NULL),
('b2222222-2222-2222-2222-222222222222', 'מדריך אבטחת מידע וסייבר למשתמש', 'אבטחת מידע', 'הנחיות מחייבות לעבודה מול רשתות פנימיות, שימוש בכוננים מוצפנים, ושמירה על סודיות.', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', NULL),
('b3333333-3333-3333-3333-333333333333', 'מצגת פתיחה: מבנה היחידה ויעדים רב-שנתיים', 'מצגות והדרכות', 'סקירה מקיפה על ייעוד היחידה, זירות הפעילות, וההישגים הנדרשים לשנה הנוכחית.', NULL, 'https://docs.google.com/presentation'),
('b4444444-4444-4444-4444-444444444444', 'מילון מונחים וקיצורים יחידתי (ר"ת)', 'מדריכים ועזרי עבודה', 'מילון אינטראקטיבי המרכז מאות ראשי תיבות, קיצורים מקצועיים ושמות קוד ארגוניים.', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', NULL),
('b5555555-5555-5555-5555-555555555555', 'פורטל השירות והתמיכה הטכנולוגית', 'קישורים שימושיים', 'גישה ישירה לפתיחת תקלות מחשוב, בקשות הרשאה, והזמנת ציוד משרדי וטכנולוגי.', NULL, 'https://support.example.org'),
('b6666666-6666-6666-6666-666666666666', 'תבנית מסמך אפיון דרישות', 'טפסים ומסמכים', 'תבנית עבודה אחידה לכתיבת מפרטי דרישות פרויקטליים, כולל ארכיטקטורה ומדדי הצלחה.', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', NULL);

-- Org Nodes
INSERT INTO org_nodes (id, parent_id, title, holder_name, description, interface_details) VALUES
('c1000000-0000-0000-0000-000000000001', NULL, 'מפקד היחידה (אל"ם)', 'אל"ם אורי ברק', 'פיקוד כולל על היחידה, התוויית מדיניות אסטרטגית, וקביעת סדרי עדיפויות להפעלת כוח ובניין הכוח.', 'ממשק ישיר מול המטה הכללי, הפיקודים המרחביים, וראשי הענפים ביחידה. אישור תוכניות עבודה תקופתיות.');

INSERT INTO org_nodes (id, parent_id, title, holder_name, description, interface_details) VALUES
('c2000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'רע"ן טכנולוגיות ופיתוח (סא"ל)', 'סא"ל מאיה שפירא', 'אחריות על כלל פרויקטי הפיתוח, ארכיטקטורת התוכנה והתשתיות הדיגיטליות של היחידה.', 'עבודה שוטפת מול מנהלי פרויקטים, מפתחים, יועצי אבטחת מידע וספקי תוכנה חיצוניים.'),
('c2000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'רע"ן מבצעים ותיאום (סא"ל)', 'סא"ל גיא אלון', 'הובלת הזירה המבצעית, הפעלת החמ"ל, תיאום בין-ארגוני ומענה לאירועים בזמן אמת.', 'ממשק רציף מול מפקדי השטח, קציני המבצעים, גורמי מודיעין וזרועות הביטחון המקבילות.'),
('c2000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', 'רע"ן משאבים ותכנון (סא"ל)', 'סא"ל רן אברמוביץ''', 'ניהול תקציבי היחידה, משאבי אנוש, רכש ולוגיסטיקה, ובקרת לוחות זמנים.', 'ממשק מול גורמי כוח אדם, יועצים פיננסיים, וכלל מנהלי הפרויקטים לבקרה תקציבית.');

INSERT INTO org_nodes (id, parent_id, title, holder_name, description, interface_details) VALUES
('c3000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001', 'רמ"ד מערכות ליבה (רס"ן)', 'רס"ן נועה דגן', 'הובלת פיתוח מערכות המידע המבצעיות, אפיונים טכניים וניהול מפתחי התוכנה.', 'סנכרון יומיומי מול מנהלי הפרויקטים וצוותי הבדיקות לאישור גרסאות.'),
('c3000000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000001', 'רמ"ד ענן ותשתיות (רס"ן)', 'רס"ן עמית שטרן', 'ניהול תשתיות הענן, אבטחת שרשרת הפריסה והאוטומציה ושרידות המערכות במצבי עומס.', 'מתן שירותי תשתית לכלל צוותי הפיתוח וסנכרון מול מומחי אבטחת מידע.'),
('c3000000-0000-0000-0000-000000000003', 'c2000000-0000-0000-0000-000000000002', 'מפקד חמ"ל ראשי (סרן)', 'סרן עומר רוזן', 'אחריות ישירה על תפקוד החמ"ל, משמרות, וסנכרון תמונת המצב המבצעית 24/7.', 'עבודה ישירה מול קציני המבצעים הגזרתיים וגורמי הסיוע באוויר וביבשה.'),
('c3000000-0000-0000-0000-000000000004', 'c2000000-0000-0000-0000-000000000003', 'רמ"ד בקרה ומשאבים (רס"ן)', 'רס"ן מיכל גבע', 'תכנון תוכניות העבודה השנתיות, מעקב מדדי ביצוע והצלחה וניהול מכרזים.', 'ממשק מול ראשי הענפים ומנהלי הפרויקטים להבטחת עמידה ביעדים.');
