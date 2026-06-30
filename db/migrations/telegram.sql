-- Observant — Telegram channel (#5).
-- The Telegram loop needs NOTHING new to run: the chat_id is stored in
-- partners.contact (channel='telegram'), reusing the existing schema. The
-- whole loop (api/telegram/webhook.js) works without this migration.
--
-- This adds ONE optional, nullable column: the partner's @username, captured
-- on /start purely for display ("who is this partner"). It is best-effort —
-- the webhook skips it silently if the column is absent — so running this is
-- optional. Idempotent; safe to re-run.

alter table partners add column if not exists handle text;   -- e.g. '@username' (optional, display only)
