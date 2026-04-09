# Plans/Archive — compressed

Historical planning documents for closed execution cycles are stored in
`Archive.zip` alongside this file. The zip contains 77 `.md` files that
were individual files in `doc/SolidWorks-WorkFlow/Plans/Archive/` before
the Phase 3 cleanup (Session025, 2026-04-09).

## Why compressed

Archived planning documents historically reference file paths and source
code identifiers that were later moved, renamed, or removed. Those
references are valid as historical artifacts, but they created ~62
stale hits in grep-based dead-code / dead-links audits, forcing future
sessions to read historical noise.

Compressing the directory into a single `.zip` keeps the content
available through `git show` and on-demand extraction, while removing
the grep fallout from day-to-day work. The git history for the original
files remains intact — `git log --all --follow <old path>` still finds
each archived plan.

## How to access a specific archived plan

```bash
cd doc/SolidWorks-WorkFlow/Plans/
unzip -p Archive.zip Archive/<filename>.md | less
```

Or extract the whole archive into a scratch location:

```bash
unzip doc/SolidWorks-WorkFlow/Plans/Archive.zip -d /tmp/codeai-archive/
```

## How to add a new archived plan later

When closing out a new execution cycle that needs its planning-doc
archived, take the temporary route:

```bash
cd doc/SolidWorks-WorkFlow/Plans/
unzip -q Archive.zip
mv /path/to/NewCompletedPlan.md Archive/
rm Archive.zip
zip -r -q Archive.zip Archive/
rm -rf Archive/
git add Archive.zip
git commit -m "docs(archive): add <NewCompletedPlan> to Plans/Archive.zip"
```
