# TODO/Archive — compressed

Completed `todo-plan.md` snapshots for closed execution cycles are
stored in `Archive.zip` alongside this file. The zip contains 22 `.md`
files that were individual files in `doc/TODO/Archive/` before the
Phase 3 cleanup (Session025, 2026-04-09).

## Why compressed

Old todo-plan snapshots reference file paths and commit hashes that
were later touched by other cleanup waves, producing stale matches in
grep-based audits. Compressing the directory removes the day-to-day
noise while keeping the content available through git history and
on-demand extraction.

Git history for each archived todo-plan is preserved:
`git log --all --follow doc/TODO/Archive/<old filename>` still finds it.

## How to read a specific archived plan

```bash
cd doc/TODO/
unzip -p Archive.zip Archive/<filename>.md | less
```

Or extract everything into a scratch directory:

```bash
unzip doc/TODO/Archive.zip -d /tmp/codeai-todo-archive/
```

## How to archive a new completed todo-plan later

When closing out a completed `doc/TODO/todo-plan.md`:

```bash
cd doc/TODO/
unzip -q Archive.zip
mv todo-plan.md Archive/todo-plan-phase<N>-<slug>.md
rm Archive.zip
zip -r -q Archive.zip Archive/
rm -rf Archive/
git add Archive.zip
git commit -m "docs(archive): add todo-plan-phase<N>-<slug> to TODO/Archive.zip"
```

After that a new empty `doc/TODO/todo-plan.md` can be created for the
next execution cycle.
