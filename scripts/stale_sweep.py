import os
import sys

terms = [
    "33.1",
    "+33",
    "1.258",
    "1.675",
    "thread contention",
    "scheduler preemption",
    "proof",
    "Man-in-the-Middle Defense",
    "16.67",
    "10.67",
    "embedded",
]

search_targets = [
    "README.md",
    "report.md",
    "docs/report.md",
    "main.ipynb",
    "src",
    "backend",
    "frontend/src",
    "results",
    "assets",
]

def run_sweep():
    files_to_check = []
    for st in search_targets:
        if os.path.isfile(st):
            files_to_check.append(st)
        elif os.path.isdir(st):
            for root, dirs, files in os.walk(st):
                if any(ignored in root for ignored in ["node_modules", ".git", "__pycache__", ".venv"]):
                    continue
                for f in files:
                    if f.endswith((".py", ".md", ".ipynb", ".ts", ".tsx", ".json", ".csv", ".txt", ".html", ".css")):
                        files_to_check.append(os.path.join(root, f))

    hits = {t: [] for t in terms}
    for fpath in files_to_check:
        try:
            with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                for idx, line in enumerate(f, 1):
                    for t in terms:
                        if t.lower() in line.lower():
                            hits[t].append((fpath, idx, line.strip()))
        except Exception as e:
            pass

    return hits

if __name__ == "__main__":
    hits = run_sweep()
    total = sum(len(v) for v in hits.values())
    print(f"Total stale hits found: {total}")
    for t in terms:
        occurrences = hits[t]
        print(f"\n=== Query: '{t}' ({len(occurrences)} hits) ===")
        for fpath, lno, line in occurrences:
            print(f"  {fpath}:{lno}: {line[:130]}")
