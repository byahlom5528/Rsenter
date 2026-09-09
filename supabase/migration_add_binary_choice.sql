-- ==============================================================================
-- קובץ עדכון לסופרבייס (Migration Script): תמיכה בסוג משימה חדש binary_choice
-- ==============================================================================
-- קובץ זה בטוח לחלוטין להרצה (Idempotent & Non-destructive):
-- 1. הוא אינו מוחק נתונים קיימים, טבלאות או שורות (אין כאן DROP TABLE / TRUNCATE).
-- 2. הוא שומר על כל המשימות, החניכים, התפקידים וההתקדמות הקיימים.
-- 3. הוא רק מעדכן את האילוץ (CHECK constraint) וה-ENUM כדי לאפשר יצירת משימות עם 'binary_choice'.
-- ==============================================================================

-- שלב 1: אם קיים טיפוס ENUM בשם task_type_enum, מוסיפים לו את הערך החדש
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_type_enum') THEN
    ALTER TYPE task_type_enum ADD VALUE IF NOT EXISTS 'binary_choice';
  END IF;
END $$;

-- שלב 2: עדכון אילוץ התקינות (CHECK constraint) של עמודת type בטבלת tasks
-- מסירים בבטחה אילוצי CHECK ישנים על עמודת type בלבד, ומוסיפים את האילוץ המעודכן
DO $$
DECLARE
  r RECORD;
BEGIN
  -- איתור והסרה בטוחה של כל אילוץ check שקיים כרגע על עמודת 'type' בטבלת tasks
  FOR r IN (
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
    WHERE rel.relname = 'tasks'
      AND att.attname = 'type'
      AND con.contype = 'c'
  ) LOOP
    EXECUTE 'ALTER TABLE tasks DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
  END LOOP;

  -- הוספת האילוץ המעודכן הכולל את 4 סוגי המשימות
  ALTER TABLE tasks ADD CONSTRAINT tasks_type_check 
    CHECK (type IN ('simple_check', 'media_question', 'text_question', 'binary_choice'));
END $$;

-- שלב 3: אימות שהעדכון הוחל בהצלחה
SELECT 
  conname AS "שם האילוץ", 
  pg_get_constraintdef(oid) AS "הגדרה מעודכנת"
FROM pg_constraint
WHERE conrelid = 'tasks'::regclass 
  AND conname = 'tasks_type_check';
