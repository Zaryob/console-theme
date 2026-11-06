#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-2.0-or-later
"""Verify that an export ref contains exactly HEAD's assets/console tree."""
import argparse
from pathlib import Path
import subprocess


ROOT = Path(__file__).resolve().parents[1]


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True).strip()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('ref', nargs='?', default='origin/assets')
    args = parser.parse_args()
    canonical = git('rev-parse', '--verify', 'HEAD:assets/console')
    exported = git('rev-parse', '--verify', f'{args.ref}^{{tree}}')
    if canonical != exported:
        print(f'{args.ref} differs from the canonical assets/console tree:')
        print(git('diff', '--name-status', canonical, exported))
        return 1
    print(f'{args.ref} matches the canonical assets/console tree exactly.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
