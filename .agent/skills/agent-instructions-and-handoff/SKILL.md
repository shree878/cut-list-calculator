---
name: agent-instructions-and-handoff
description: The AGENTS.md convention plus the progress.txt resume system that lets an AI agent stop (credit limit, disconnect) and continue later at minimal cost. Use at the start of every session, after every finished step, and when creating or editing AGENTS.md, plan.txt or progress.txt.
---

# Agent instruction files and resume protocol

Reference: https://agents.md

## Files and their jobs
- `AGENTS.md` (repo root): short, stable rules every session reads first. Under about 120 lines.
- `plan.txt`: the full roadmap: phases, tasks with IDs, Definition of Done, parking lot. Changes only when scope changes.
- `progress.txt`: the live state. Small, rewritten after every step. This is the only file needed to resume.
- `DESIGN.md`: the design system (see the design-system-tokens skill).
- `.agent/skills/*/SKILL.md`: these skills, loaded when relevant.

## AGENTS.md must contain
1. One-paragraph project summary.
2. Session start: read `progress.txt`, then only the plan.txt section for the current task. Do not scan the whole repo or re-derive history.
3. Tech stack and exact commands (install, dev, test, build).
4. Folder map: one line per important folder or file.
5. Hard rules: no work outside the current phase, use only design tokens, tests must pass, no new dependencies without a note in progress.txt, never promise "zero waste".
6. Session end: update `progress.txt` and commit.
7. Pointers to the skills list.

## progress.txt format (keep under about 80 lines, rewrite, do not append forever)
```
LAST UPDATED: <date time>
PHASE: <n and name>
CURRENT TASK: <ID: title>  STATUS: not started | in progress | blocked | done
NEXT ACTION: <one concrete sentence a fresh agent can execute>
MODEL NEEDED NOW: OPUS | SONNET     NEXT MODEL CHANGE: <model at task ID, or none>

DONE (newest first, one line each):
- <ID> <what> | files: <paths> | tests: pass/fail   (no commit hash here: a file cannot contain the hash of the commit that saves it. The task ID is in the commit message, so `git log --grep <ID>` finds it.)

IN PROGRESS / PARTIAL:
- <what is half done, which file, what is left>

TODO (next 3 to 5 tasks, IDs only with titles):

DECISIONS (short, with reason):

KNOWN ISSUES / BLOCKERS:

DEPLOY: last deployed commit and date, live URL
```
Older done items roll up into a one-line phase summary to keep the file small. History lives in git.

## Checkpoint rule (this is what makes credit cutoffs cheap)
- After every task, and after every sub-step that leaves the code working: run tests, update progress.txt, then `git commit` with message `<task ID>: <summary>`. (Do not use time as the trigger; an agent cannot reliably track time and cannot know when credits end.) The commit plus progress.txt is the save point.
- Before starting anything large, write NEXT ACTION first. If the session dies mid-task, the next agent knows exactly where to restart.
- Never leave the working tree in a broken state at a checkpoint. If a task is partial, commit to a branch or mark it clearly under IN PROGRESS with the exact leftover steps.

## Resume procedure (a fresh session with no memory)
1. Read AGENTS.md, then progress.txt. Nothing else yet.
2. Run `git status` and `git log -5 --oneline` to confirm the tree matches progress.txt. If they disagree, trust git for code, then fix progress.txt.
3. Run the tests once to confirm the baseline.
4. Read only the plan.txt section for the current task and the one or two skills it needs.
5. Execute NEXT ACTION. Do not redo finished work or re-read finished files unless a test fails.

## Bootstrap prompts (the only prompts you need to type)
- Start or resume: `Follow AGENTS.md session start, then do NEXT ACTION in progress.txt.`
- After a disconnect: same prompt. Nothing else is needed.

## Token-saving habits
- Read specific files, not directories. Prefer search to opening large files.
- Keep modules small with clear names so one read explains a file.
- Put decisions in progress.txt so they are never re-debated.
- Do not paste large outputs into notes. Reference paths.
- One task per session goal. Finish, checkpoint, then continue.
