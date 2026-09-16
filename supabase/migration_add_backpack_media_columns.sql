-- ==============================================================================
-- קובץ עדכון לסופרבייס (Migration Script): תמיכה בעמודות תרמיל ומדיה חדשות
-- ==============================================================================
-- סקריפט זה בטוח לחלוטין להרצה (Idempotent & Non-destructive):
-- 1. הוא אינו מוחק נתונים קיימים, טבלאות או שורות.
-- 2. הוא שומר על כל המשימות, החניכים, התפקידים וההתקדמות הקיימים.
-- 3. הוא מוסיף לטבלת tasks את שתי העמודות החדשות הנדרשות על ידי המערכת:
--    - hide_from_backpack (הסתרת מדיה מהתרמיל)
--    - is_standalone_media (מדיה עצמאית שנוספה ישירות לתרמיל)
-- 4. מסיר בבטחה את אילוץ ה-unique על (role_id, step_order) כדי למנוע שגיאות התנגשות.
-- ==============================================================================

-- שלב 1: הוספת עמודת hide_from_backpack לטבלת tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS hide_from_backpack BOOLEAN DEFAULT FALSE NOT NULL;

-- שלב 2: הוספת עמודת is_standalone_media לטבלת tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_standalone_media BOOLEAN DEFAULT FALSE NOT NULL;

-- שלב 3: הסרת אילוץ ייחודיות של step_order (למניעת התנגשויות בהוספת מדיה מרובה לתרמיל)
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS unique_role_step;

-- שלב 4: וידוא ועדכון אילוץ CHECK על עמודת type (כולל binary_choice)
DO $$
DECLARE
  r RECORD;
BEGIN
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

  ALTER TABLE tasks ADD CONSTRAINT tasks_type_check 
    CHECK (type IN ('simple_check', 'media_question', 'text_question', 'binary_choice'));
END $$;

-- שלב 5: אימות שהעמודות והאילוצים קיימים ומעודכנים בהצלחה
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'tasks'
  AND column_name IN ('hide_from_backpack', 'is_standalone_media', 'type', 'media_url')
ORDER BY column_name;
