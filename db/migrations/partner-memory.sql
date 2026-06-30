-- Observant — per-person memory (follow-up migration; run in the Supabase SQL editor)
-- Gives each partner a compact MEMORY PROFILE synthesized from their intro
-- conversation (C4). api/selfserve/interview.js's `synthesize` action persists it
-- here, keyed by program + contact; `turn` / `translate` read it back so the
-- team's follow-up questions are tailored to the person.
--
-- Run db/schema.sql first (it creates the partners table this alters).

alter table partners add column if not exists memory jsonb;
