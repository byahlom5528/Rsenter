-- ==============================================================================
-- קובץ מיגרציה ועדכון לסופרבייס (Supabase Migration Script)
-- תמיכה בשדות החדשים של עץ המבנה: הגדרת תפקיד, תחומי אחריות ושאלות נפוצות
-- ==============================================================================
-- סקריפט זה בטוח לחלוטין להרצה (Idempotent & Non-destructive):
-- 1. אינו מוחק נתונים קיימים, טבלאות או שורות.
-- 2. שומר על כלל המשתמשים, הצמתים, המשימות וההתקדמות הקיימים.
-- 3. מוסיף לטבלת org_nodes את העמודות החדשות הנדרשות:
--    - role_definition (הגדרת תפקיד מופרדת)
--    - responsibilities (רשימת תחומי אחריות בפורמט JSONB)
--    - faqs (רשימת שאלות נפוצות ומענה אופציונלי בפורמט JSONB)
--    - role_interfaces (התאמת ממשק ביחס לתפקיד ספציפי)
-- 4. מבצע השלמת נתונים (Backfill) חכמה עבור צמתים קיימים ללא שבירת מידע.
-- 5. מוודא הרשאות קריאה וכתיבה (RLS Policies).
-- ==============================================================================

-- שלב 1: הוספת עמודות חדשות לטבלת org_nodes (אם אינן קיימות כבר)
ALTER TABLE IF EXISTS org_nodes 
    ADD COLUMN IF NOT EXISTS role_definition TEXT DEFAULT '';

ALTER TABLE IF EXISTS org_nodes 
    ADD COLUMN IF NOT EXISTS responsibilities JSONB DEFAULT '[]'::jsonb NOT NULL;

ALTER TABLE IF EXISTS org_nodes 
    ADD COLUMN IF NOT EXISTS faqs JSONB DEFAULT '[]'::jsonb NOT NULL;

ALTER TABLE IF EXISTS org_nodes 
    ADD COLUMN IF NOT EXISTS role_interfaces JSONB DEFAULT '{}'::jsonb NOT NULL;

-- שלב 2: השלמת נתונים (Backfill) עבור רשומות קיימות
-- אם הגדרת התפקיד ריקה, משתמשים בתיאור הקיים
UPDATE org_nodes
SET role_definition = description
WHERE (role_definition IS NULL OR role_definition = '')
  AND description IS NOT NULL 
  AND description != '';

-- אם תחומי אחריות ריקים, מאתחלים עם ערכי ברירת המחדל
UPDATE org_nodes
SET responsibilities = '["דוגמה", "דוגמה"]'::jsonb
WHERE responsibilities IS NULL 
   OR responsibilities = '[]'::jsonb;

-- אם שאלות נפוצות ריקות, מאתחלים עם שאלות דוגמה (שאלה אחת עם מענה ושאלה אחת ללא מענה)
UPDATE org_nodes
SET faqs = '[{"question": "דוגמה", "answer": "דוגמה"}, {"question": "דוגמה"}]'::jsonb
WHERE faqs IS NULL 
   OR faqs = '[]'::jsonb;

-- שלב 3: וידוא עמודות משימות ותרמיל נוספות (אם טרם עודכנו בסופרבייס)
ALTER TABLE IF EXISTS tasks 
    ADD COLUMN IF NOT EXISTS hide_from_backpack BOOLEAN DEFAULT FALSE NOT NULL;

ALTER TABLE IF EXISTS tasks 
    ADD COLUMN IF NOT EXISTS is_standalone_media BOOLEAN DEFAULT FALSE NOT NULL;

ALTER TABLE IF EXISTS backpack_resources 
    ADD COLUMN IF NOT EXISTS media_url TEXT;

-- שלב 4: וידוא פוליסות אבטחה (Row Level Security - RLS)
ALTER TABLE IF EXISTS org_nodes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'org_nodes' AND policyname = 'Public full access org_nodes'
    ) THEN
        CREATE POLICY "Public full access org_nodes" ON org_nodes FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- שלב 5: אימות שהעמודות קיימות ומוכנות לשימוש
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'org_nodes'
  AND column_name IN ('role_definition', 'responsibilities', 'faqs', 'role_interfaces', 'title', 'holder_name')
ORDER BY column_name;
