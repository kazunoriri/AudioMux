# AudioMux Development Instructions

These instructions apply to all work in this repository.

## 1. Core development principle

Do not make speculative fixes when the root cause can be investigated first.

For difficult bugs or behavior involving Max for Live, Ableton Live, the Live API, asynchronous events, observers, dynamic parameters, or scheduler/timing behavior, investigate before implementing.

Prefer:

1. evidence,
2. root-cause analysis,
3. minimal implementation,
4. static audit,
5. runtime verification.

Do not prefer repeated trial-and-error builds when the relevant behavior can first be understood from code, patch structure, documentation, logs, or prior developer reports.

---

## 2. External research policy

When investigating unfamiliar, timing-sensitive, or difficult Max for Live / Live API behavior, do not rely only on official documentation or local code.

Before proposing a substantial fix:

1. Check official Cycling '74 and Ableton documentation.
2. Search community knowledge for closely related cases, especially:
   - Cycling '74 Forum
   - GitHub issues and repositories
   - Stack Overflow
   - Reddit
   - specialist Max / Max for Live blogs or technical posts when useful
3. Inspect the current AudioMux patch, source code, and runtime logs.
4. Compare the external information with the actual AudioMux implementation.

Do this research early, before spending significant time building a novel workaround for behavior that may already be known in the Max for Live community.

Community reports are clues, not proof.

Always distinguish between:

- documented behavior,
- community-reported behavior,
- behavior directly confirmed in AudioMux,
- inference or hypothesis.

Final conclusions must be verified against the current AudioMux implementation, patch structure, logs, and, when necessary, Ableton Live itself.

---

## 3. Research before architecture changes

Before introducing a new synchronization mechanism, state machine, retry system, workaround, or large patch structure:

- search for known behavior and prior developer reports,
- inspect the existing implementation,
- identify the actual failure path,
- explain why the existing mechanism is insufficient,
- consider a smaller fix first.

Do not introduce architectural complexity only because a race condition is theoretically possible.

If a risk is only theoretical and has not been demonstrated or cannot be derived from the current structure, clearly label it as such.

Prefer the smallest implementation that provides the required safety for the current issue.

---

## 4. Live API and asynchronous behavior

Treat Live API operations as potentially asynchronous unless ordering is explicitly guaranteed.

For code involving:

- `live.object`,
- `live.path`,
- `live.observer`,
- dynamic Chain enumeration,
- Chain rename,
- Chain add/remove,
- Chain reorder,
- dynamic Selector or enum updates,
- deferred Max messages,

do not assume that multiple values automatically form an atomic snapshot.

Explicitly consider:

- stale responses,
- overlapping requests,
- topology changes during a request,
- delayed observer notifications,
- mismatched Chain IDs and positions,
- partial multi-slot responses.

However, do not add complexity automatically.

First confirm which risks apply to the current patch.

---

## 5. Specification audit gate

Implementation completion is not the submission condition.

**Audit completion is the submission condition.**

Before changing code or an AMXD:

1. Convert the user's request into verifiable requirements.
2. Identify areas that must not change.
3. Identify invariants such as:
   - existing connections,
   - object positions where relevant,
   - object counts where relevant,
   - routing behavior,
   - UI behavior,
   - successful existing paths.

After implementation:

1. Run syntax/static checks.
2. Run structural checks.
3. Compare against the original requirements.
4. Audit all unchanged / protected areas.
5. Check for unintended effects outside the requested scope.
6. Only then report completion.

A change is not complete merely because it builds or appears to work.

---

## 6. Preserve successful paths

Previously verified behavior should be treated as a protected regression area.

When fixing one feature, do not casually rewrite or replace already working paths.

For AudioMux, examples may include:

- Chain count tracking,
- Selector generation,
- Chain add/remove handling,
- Chain reorder handling,
- Selector write paths,
- automation behavior,
- previously verified observer paths.

If an existing successful path must be changed, explain why before changing it and verify it again afterward.

---

## 7. Minimal-change policy

Avoid unrelated refactoring during bug fixes.

Do not:

- rename unrelated objects,
- reorganize unrelated patch areas,
- change UI unrelated to the task,
- remove objects only because they appear unnecessary,
- optimize working code without a task requirement.

Prefer localized, reviewable changes.

If temporary diagnostic instrumentation is needed, clearly separate it from production behavior.

---

## 8. Instrumentation and verification

For difficult bugs, diagnostic builds are allowed and encouraged.

Use instrumentation to make state transitions observable when necessary.

Separate:

- production functionality,
- diagnostic logging,
- test harnesses,
- temporary runtime probes.

Do not silently promote diagnostic-only components into production.

Before production promotion, explicitly classify each added component as:

- required production behavior,
- reusable test infrastructure,
- temporary diagnostic instrumentation.

---

## 9. Runtime verification policy

Use static analysis first.

Use Ableton Live runtime verification when behavior depends on things static analysis cannot prove, such as:

- observer firing,
- Live API notification ordering,
- actual Selector display updates,
- automation behavior,
- audio routing,
- save/reload behavior,
- click/noise behavior.

Do not use repetitive Live GUI testing as the primary debugging method when static inspection can narrow the problem first.

Runtime verification should normally be the final acceptance test, not the first diagnostic step.

---

## 10. Safety when controlling Ableton Live

Do not perform ambiguous GUI operations when the target cannot be identified safely.

Examples include:

- renaming an object when Chain vs Device cannot be distinguished,
- drag-and-drop operations with uncertain targets,
- destructive topology changes without a safe recovery path.

Prefer:

- Live API operations,
- dedicated test sets,
- copies of ALS files,
- automation harnesses,
- deterministic test fixtures.

Never save over a protected user ALS unless explicitly instructed.

---

## 11. Git and artifact discipline

Do not use `git add .` for AudioMux release or bug-fix work unless explicitly requested.

Stage only intended files.

Keep these separate:

- production files,
- experimental builds,
- candidates,
- backups,
- diagnostic builds,
- generated logs,
- test ALS files.

Do not commit temporary logs or local verification artifacts unless they are intentionally promoted to reusable test infrastructure.

Before committing:

- inspect `git status`,
- inspect the exact staged file list,
- confirm unrelated files are unchanged.

---

## 12. Evidence in final reports

When reporting a fix, distinguish clearly between:

- static inspection PASS,
- harness PASS,
- Max runtime PASS,
- Ableton Live runtime PASS,
- untested behavior.

Do not report an untested condition as verified.

If something remains untested, state it explicitly.

For difficult issues, report:

- root cause,
- changed files,
- changed paths,
- tests performed,
- audit results,
- residual risks,
- production promotion status.

---

## 13. Guiding principle

The goal is not to produce the fastest possible patch.

The goal is to reduce unnecessary human debugging loops while keeping changes minimal, explainable, testable, and safe.

Use existing knowledge before reinventing a solution.

Then verify that the solution is correct for AudioMux itself.
