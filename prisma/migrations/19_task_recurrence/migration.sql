-- Herhalende taken: bij afronden wordt automatisch een nieuwe taak gemaakt.
ALTER TABLE "Task" ADD COLUMN "recurrence" TEXT NOT NULL DEFAULT 'geen';
