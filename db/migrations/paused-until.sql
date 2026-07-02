-- Observant — timed pause support for the Manage page.
-- The Manage/preferences flow (api/selfserve/preferences.js) writes a
-- `paused_until` timestamp when a partner takes a 30/90-day break, and the
-- cadence scheduler (api/cron/cadence.js) reads it to auto-resume once the
-- date passes. Without this column a timed pause silently becomes indefinite
-- (the write is dropped) and the UI shows a resume date that never fires.
--
-- Adds ONE optional, nullable column. Idempotent; safe to re-run.

alter table partners add column if not exists paused_until timestamptz;   -- auto-resume after this instant (null = indefinite / not paused)
