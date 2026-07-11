---
name: agent-context-management
description:
  Keep long-running agent sessions effective as context grows or gets compacted
  — externalize state into repo docs/ledgers/memory, work script-driven with
  filtered output, and recover cheaply after compaction. Use at the start of
  long tasks, when output gets heavy, or after a context reset.
---

# Agent context management (auto-driven)

An agent's conversation window is lossy (it compacts/resets); the **repo is
not**. The discipline: anything worth remembering must live in a file, and the
working style must stay cheap enough that compaction never hurts.

## 1. Externalize state — the repo is the memory

- **Single-source ledgers** carry the plan: feature backlog (`backlog.md`), UX
  debt (`ux-backlog.md`), and any product ledgers (spec coverage, upstream-sync
  obligations, release gates). Update them **at the moment of the change**
  (Definition of Done), never "later" — post-compaction you is the reader.
- **Milestone summaries go into docs/commits**, not just chat: a rich commit
  body + a ledger row survive; a chat summary doesn't.
- **Cross-session facts** (gotchas, environment quirks, decisions) go to the
  agent memory files; **recurring procedures** become skills. If you had to
  rediscover something twice, it wasn't externalized.
- Use the **task tracker** for multi-step work — after compaction it's the
  cheapest "where was I".

## 2. Spend tokens like money

- **Script-driven bulk edits** over N per-file edits: one generated
  mapping/script beats 200 Edit calls, and the analyzer/test loop verifies it.
- **Filter every long output**: `grep`/`tail`/`awk` the interesting lines;
  redirect full logs to a file and read slices on demand. Never cat a build log
  or full test output into the conversation.
- **Background long jobs** with a filtered completion line; don't poll.
- **Batch independent tool calls**; read only the file _ranges_ you need; never
  re-read files you just wrote (trust the tool result).
- Prefer **one authoritative helper** (harness function, shared widget, script)
  over repeating inline logic the next agent must re-derive.

## 3. Recover after compaction/reset

1. Read the repo's facts file (`AGENTS.md`) — it indexes the way-of-working.
2. Read the ledgers (§1) + task tracker for the live state;
   `git log --oneline -10` for what actually shipped.
3. Trust files over recalled chat: memory/summaries are point-in-time; verify
   against the code before asserting.

## 4. Keep the window clean proactively

- Close each work slice fully (verify → ship → tick ledgers) before starting the
  next; half-open slices are what makes compaction expensive.
- When a task will clearly be long, write its plan into the tracker/doc first —
  the plan then survives anything.
- Big mechanical migrations: land the **mapping/manifest as a file** first, then
  apply; if the session dies mid-way, the next one re-runs the script instead of
  re-authoring the mapping.
