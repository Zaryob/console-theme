#!/usr/bin/env python3
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

Usage:
  python3 scripts/sync.py              # Sync all files to siblings
  python3 scripts/sync.py --check      # Check parity without modifying files (exit 1 if diff)
  python3 scripts/sync.py --commit "msg" # Sync and commit in sibling repos
  python3 scripts/sync.py --auto-commit # Sync and commit using console-theme's latest commit msg
"""

import argparse
from pathlib import Path
import shutil
import subprocess
import sys

REPO_ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = REPO_ROOT.parent

INCLUDES = [
    'console-header.html',
    'console-icon.html',
    'console-content-language.html',
    'console-alternates.html',
]

DATA_FILES = [
    'console_projects.json',
    'writing_topics.yml',
]


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


def commit_sibling_changes(repo_dir: Path, staged_files: list, commit_msg: str):
    """Stage and commit specific files in a sibling repo if modified."""
    status = run_git(repo_dir, ['status', '--porcelain'] + [str(f.relative_to(repo_dir)) for f in staged_files])
    if not status.stdout.strip():
        return False

    run_git(repo_dir, ['add'] + [str(f.relative_to(repo_dir)) for f in staged_files])
    commit = run_git(repo_dir, ['commit', '-m', commit_msg])
    if commit.returncode == 0:
        print(f"  [git commit] {repo_dir.name}: {commit_msg}")
        return True
    else:
        print(f"  [git error] {repo_dir.name}: {commit.stderr.strip()}")
        return False


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--check', action='store_true', help='Verify parity without modifying files')
    parser.add_argument('--commit', type=str, metavar='MSG', help='Commit changes in sibling repos with MSG')
    parser.add_argument('--auto-commit', action='store_true', help='Commit changes using console-theme latest commit subject')
    parser.add_argument('--guides', type=Path, default=WORKSPACE_ROOT / 'kilavuzlar', help='Path to kilavuzlar repo')
    parser.add_argument('--syscall', type=Path, default=WORKSPACE_ROOT / 'syscall', help='Path to syscall repo')
    parser.add_argument('--pin-atlas', type=Path, default=WORKSPACE_ROOT / 'pin-atlas', help='Path to pin-atlas repo')
    parser.add_argument('--home', type=Path, default=WORKSPACE_ROOT / 'zaryob.github.io', help='Path to zaryob.github.io repo')
    args = parser.parse_args()

    assets = get_console_theme_assets()
    differences = []
    updated_files = 0

    # Ensure internal console-theme mirrors (_includes/console/ and _data/console/) stay synced
    internal_pairs = []
    for inc in INCLUDES:
        src = REPO_ROOT / '_includes' / inc
        dst = REPO_ROOT / '_includes' / 'console' / inc
        if src.is_file():
            internal_pairs.append((src, dst))
    for dat in DATA_FILES:
        src = REPO_ROOT / '_data' / dat
        dst = REPO_ROOT / '_data' / 'console' / dat
        if src.is_file():
            internal_pairs.append((src, dst))

    for src, dst in internal_pairs:
        if args.check:
            if not dst.is_file() or src.read_bytes() != dst.read_bytes():
                differences.append(str(dst))
        else:
            dst.parent.mkdir(parents=True, exist_ok=True)
            if not dst.is_file() or src.read_bytes() != dst.read_bytes():
                shutil.copyfile(src, dst)
                updated_files += 1

    # Targets configuration: (name, repo_dir, target_base_dir)
    # All 4 suite projects now use Jekyll with standard _includes and _data!
    targets = [
        ('kilavuzlar', args.guides, args.guides),
        ('syscall', args.syscall, args.syscall / 'public'),
        ('pin-atlas', args.pin_atlas, args.pin_atlas / 'public'),
        ('zaryob.github.io', args.home, args.home),
    ]

    modified_repos = {}

    for name, repo_path, target_base in targets:
        if not repo_path.is_dir():
            print(f"Skipping {name} (directory not found: {repo_path})")
            continue

        repo_files_affected = []

        # 1. assets/console
        for asset in assets:
            src = REPO_ROOT / 'assets' / 'console' / asset
            dst = target_base / 'assets' / 'console' / asset
            if args.check:
                if not dst.is_file() or src.read_bytes() != dst.read_bytes():
                    differences.append(str(dst))
            else:
                dst.parent.mkdir(parents=True, exist_ok=True)
                if not dst.is_file() or src.read_bytes() != dst.read_bytes():
                    shutil.copyfile(src, dst)
                    updated_files += 1
                    repo_files_affected.append(dst)

        # 2. _includes
        for inc in INCLUDES:
            src = REPO_ROOT / '_includes' / inc
            dst = target_base / '_includes' / inc
            if src.is_file():
                if args.check:
                    if not dst.is_file() or src.read_bytes() != dst.read_bytes():
                        differences.append(str(dst))
                else:
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    if not dst.is_file() or src.read_bytes() != dst.read_bytes():
                        shutil.copyfile(src, dst)
                        updated_files += 1
                        repo_files_affected.append(dst)

        # 3. _data
        for dat in DATA_FILES:
            src = REPO_ROOT / '_data' / dat
            dst = target_base / '_data' / dat
            if src.is_file():
                if args.check:
                    if not dst.is_file() or src.read_bytes() != dst.read_bytes():
                        differences.append(str(dst))
                else:
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    if not dst.is_file() or src.read_bytes() != dst.read_bytes():
                        shutil.copyfile(src, dst)
                        updated_files += 1
                        repo_files_affected.append(dst)

        if repo_files_affected:
            modified_repos[repo_path] = repo_files_affected

    if args.check:
        if differences:
            print("Console theme differences found:")
            for diff in differences:
                print(f"  - {diff}")
            sys.exit(1)
        else:
            print("✓ All repositories are perfectly in sync with console-theme.")
            sys.exit(0)

    print(f"✓ Synchronized console-theme: {updated_files} file(s) updated across repos.")

    # Git commit handling if requested
    commit_msg = None
    if args.commit:
        commit_msg = args.commit
    elif args.auto_commit:
        latest = get_latest_commit_message()
        commit_msg = f"Sync console theme: {latest}"

    if commit_msg:
        for repo_path, files in modified_repos.items():
            commit_sibling_changes(repo_path, files, commit_msg)


if __name__ == '__main__':
    main()
