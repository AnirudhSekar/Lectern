-- TASK-1.13: Enable Realtime broadcasts on `lectures`
--
-- By default, Supabase Realtime's `postgres_changes` listener does not
-- receive events for a table until it's explicitly added to the
-- `supabase_realtime` publication. This is separate from RLS — RLS still
-- filters which rows a given client is allowed to receive events for.

alter publication supabase_realtime add table lectures;

-- REPLICA IDENTITY FULL means UPDATE payloads include the full `old`
-- row, not just the primary key. Not required for this task (the hook
-- below only reads `new.status`), but cheap insurance for a future
-- feature that might want to diff old vs. new.
alter table lectures replica identity full;