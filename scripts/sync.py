#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-2.0-or-later
"""Synchronize canonical console-theme files to sibling repositories.

Canonical source of truth:
  console-theme/
    assets/console/          -> all suite sites
    _includes/console-*.html -> Jekyll sites (_includes or public/_includes)
    _data/*                  -> Jekyll sites (_data or public/_data)

Target repositories:
  - kilavuzlar/              (assets/console, _includes, _data)
  - syscall/                 (public/assets/console, public/_includes, public/_data)
  - pin-atlas/               (public/assets/console, public/_includes, public/_data)
  - zaryob.github.io/        (assets/console, _includes, _data)
  - execmap/                 (public/assets/console, public/console-projects.json)

Usage:
  python3 scripts/sync.py              # Sync all files to siblings
  python3 scripts/sync.py --check      # Check parity without modifying files (exit 1 if diff)
  python3 scripts/sync.py --commit "msg" # Sync and commit in sibling repos
  python3 scripts/sync.py --auto-commit # Sync and commit using console-theme's latest commit msg

Every target is validated before the first file is copied. --check also rejects
files in a target's assets/console/ that are neither canonical nor listed in
ALLOWED_EXTRAS. --commit and --auto-commit require every target to be on its
main branch and commit only the files this script wrote.
"""

import argparse
from pathlib import Path
import shutil
import subprocess
import sys
from check_i18n import validate

REPO_ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = REPO_ROOT.parent

INCLUDES = [
    'console-header.html',
    'console-icon.html',
    'console-content-language.html',
    'console-alternates.html',
    'console-suite.html',
]

DATA_FILES = [
    'console_projects.json',
    'writing_topics.yml',
]

# Site-owned files that legitimately live beside the shared assets, relative to
# the target's assets/console/. Anything else found there is stale or misplaced.
ALLOWED_EXTRAS = {
    'kilavuzlar': set(),
    'syscall': {'syscall.css'},
    'pin-atlas': set(),
    'zaryob.github.io': {'bundle.scss', 'site.css'},
    'execmap': {'COPYING'},
}
IGNORED_NAMES = {'.DS_Store'}
COMMIT_BRANCH = 'main'


def get_console_theme_assets():
    """List all relative paths in assets/console/."""
    assets_dir = REPO_ROOT / 'assets' / 'console'
    if not assets_dir.is_dir():
        return []
    return [p.relative_to(assets_dir) for p in assets_dir.rglob('*') if p.is_file()]


def get_latest_commit_message():
    """Retrieve the latest commit subject from console-theme."""
    try:
        res = subprocess.run(
            ['git', 'log', '-1', '--format=%s'],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=True
        )
        return res.stdout.strip()
    except Exception:
        return 'Update console theme'


def run_git(repo_dir: Path, args: list) -> subprocess.CompletedProcess:
    return subprocess.run(
        ['git'] + args,
        cwd=repo_dir,
        capture_output=True,
        text=True
    )


def current_branch(repo_dir: Path):
    """Return the checked-out branch name, or None when detached or not a repository."""
    res = run_git(repo_dir, ['symbolic-ref', '--quiet', '--short', 'HEAD'])
    return res.stdout.strip() if res.returncode == 0 and res.stdout.strip() else None


def commit_sibling_changes(repo_dir: Path, staged_files: list, commit_msg: str):
    """Commit only the given files in a sibling repo, leaving any other staged work alone."""
    paths = [str(f.relative_to(repo_dir)) for f in staged_files]
    status = run_git(repo_dir, ['status', '--porcelain', '--'] + paths)
    if not status.stdout.strip():
        return False

    add = run_git(repo_dir, ['add', '--'] + paths)
    # The pathspec limits the commit to these paths even when the index holds unrelated changes.
    commit = add if add.returncode else run_git(repo_dir, ['commit', '-m', commit_msg, '--'] + paths)
    if commit.returncode == 0:
        print(f"  [git commit] {repo_dir.name}: {commit_msg}")
        return True
    else:
        print(f"  [git error] {repo_dir.name}: {commit.stderr.strip()}")
        return False


def differs(src: Path, dst: Path) -> bool:
    return not dst.is_file() or src.read_bytes() != dst.read_bytes()


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--check', action='store_true', help='Verify parity without modifying files')
    parser.add_argument('--commit', type=str, metavar='MSG', help='Commit changes in sibling repos with MSG')
    parser.add_argument('--auto-commit', action='store_true', help='Commit changes using console-theme latest commit subject')
    parser.add_argument('--guides', type=Path, default=WORKSPACE_ROOT / 'kilavuzlar', help='Path to kilavuzlar repo')
    parser.add_argument('--syscall', type=Path, default=WORKSPACE_ROOT / 'syscall', help='Path to syscall repo')
    parser.add_argument('--pin-atlas', type=Path, default=WORKSPACE_ROOT / 'pin-atlas', help='Path to pin-atlas repo')
    parser.add_argument('--home', type=Path, default=WORKSPACE_ROOT / 'zaryob.github.io', help='Path to zaryob.github.io repo')
    parser.add_argument('--execmap', type=Path, default=WORKSPACE_ROOT / 'execmap', help='Path to execmap repo')
    args = parser.parse_args()
    try:
        validate(REPO_ROOT / 'assets/console/i18n.js')
    except (ValueError, IndexError) as error:
        sys.exit(f'Invalid shared vocabulary: {error}')

    assets = get_console_theme_assets()
    canonical_assets = {asset.as_posix() for asset in assets}
    commit_msg = None
    if args.commit:
        commit_msg = args.commit
    elif args.auto_commit:
        commit_msg = f"Sync console theme: {get_latest_commit_message()}"
    if args.check and commit_msg:
        sys.exit('--check does not modify or commit anything; drop --commit/--auto-commit.')

    # Ensure internal console-theme mirrors (_includes/console/ and _data/console/) stay synced
    internal_pairs = []
    for inc in INCLUDES:
        src = REPO_ROOT / '_includes' / inc
        if src.is_file():
            internal_pairs.append((src, REPO_ROOT / '_includes' / 'console' / inc))
    for dat in DATA_FILES:
        src = REPO_ROOT / '_data' / dat
        if src.is_file():
            internal_pairs.append((src, REPO_ROOT / '_data' / 'console' / dat))

    # Targets configuration: (name, repo_dir, target_base_dir)
    # Every asset is byte-identical, including English fallbacks and sibling license paths.
    # Execmap's Node adapter owns rendered markup/language policy, not asset forks.
    targets = [
        ('kilavuzlar', args.guides, args.guides),
        ('syscall', args.syscall, args.syscall / 'public'),
        ('pin-atlas', args.pin_atlas, args.pin_atlas / 'public'),
        ('zaryob.github.io', args.home, args.home),
        ('execmap', args.execmap, args.execmap / 'public'),
    ]

    # Pass 1: validate every target and plan the copies. Nothing is written here,
    # so a missing or unsuitable target cannot leave the suite half-synchronized.
    problems = []
    extras = []
    plan = {}
    for name, repo_path, target_base in targets:
        if not repo_path.is_dir():
            problems.append(f"{name}: directory not found: {repo_path}")
            continue
        if commit_msg:
            branch = current_branch(repo_path)
            if branch != COMMIT_BRANCH:
                problems.append(f"{name}: refusing to commit on {branch or 'a detached HEAD or non-repository'}; check out {COMMIT_BRANCH}: {repo_path}")
                continue

        pairs = [(REPO_ROOT / 'assets' / 'console' / asset, target_base / 'assets' / 'console' / asset) for asset in assets]
        for inc in ([] if name == 'execmap' else INCLUDES):
            pairs.append((REPO_ROOT / '_includes' / inc, target_base / '_includes' / inc))
        for dat in (['console_projects.json'] if name == 'execmap' else DATA_FILES):
            pairs.append((REPO_ROOT / '_data' / dat, target_base / ('console-projects.json' if name == 'execmap' else f'_data/{dat}')))
        plan[repo_path] = [(src, dst) for src, dst in pairs if src.is_file()]

        target_assets = target_base / 'assets' / 'console'
        if target_assets.is_dir():
            for found in sorted(target_assets.rglob('*')):
                relative = found.relative_to(target_assets).as_posix()
                if not found.is_file() or found.name in IGNORED_NAMES:
                    continue
                if relative not in canonical_assets and relative not in ALLOWED_EXTRAS[name]:
                    extras.append(f"{found} (not canonical and not in ALLOWED_EXTRAS['{name}'])")

    if args.check:
        differences = [str(dst) for src, dst in internal_pairs if differs(src, dst)] + problems
        differences += [str(dst) for pairs in plan.values() for src, dst in pairs if differs(src, dst)]
        differences += extras
        if differences:
            print("Console theme differences found:")
            for diff in differences:
                print(f"  - {diff}")
            sys.exit(1)
        else:
            print("✓ All 5 configured suite repositories match the shared asset and adapter packaging contract.")
            sys.exit(0)

    if problems:
        print("Nothing was copied. Unusable targets:\n" + "\n".join(f"  - {problem}" for problem in problems))
        sys.exit(1)

    # Pass 2: copy.
    updated_files = 0
    for src, dst in internal_pairs:
        if differs(src, dst):
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(src, dst)
            updated_files += 1

    modified_repos = {}
    for repo_path, pairs in plan.items():
        repo_files_affected = []
        for src, dst in pairs:
            if differs(src, dst):
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(src, dst)
                updated_files += 1
                repo_files_affected.append(dst)
        if repo_files_affected:
            modified_repos[repo_path] = repo_files_affected

    print(f"✓ Synchronized console-theme: {updated_files} file(s) updated across 5 configured repositories.")
    if extras:
        # Never deleted automatically: remove them by hand or list them in ALLOWED_EXTRAS.
        print("Unexpected files left in place (--check will fail until resolved):")
        for extra in extras:
            print(f"  - {extra}")

    if commit_msg:
        failed = False
        for repo_path, files in modified_repos.items():
            status = run_git(repo_path, ['status', '--porcelain', '--'] + [str(f.relative_to(repo_path)) for f in files])
            if status.stdout.strip() and not commit_sibling_changes(repo_path, files, commit_msg):
                failed = True
        if failed:
            sys.exit(1)


if __name__ == '__main__':
    main()
