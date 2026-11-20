# SPDX-License-Identifier: GPL-2.0-or-later
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class SuiteContracts(unittest.TestCase):
    def test_sync_checks_all_targets_and_adapter_packaging(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            targets = ['guides', 'home', 'syscall', 'pin-atlas', 'execmap', 'wire']
            for target in targets:
                (base / target).mkdir()
            command = [sys.executable, str(ROOT / 'scripts/sync.py')]
            for target in targets:
                command.extend([f'--{target}', str(base / target)])

            def run(*options):
                return subprocess.run(command + list(options), capture_output=True, text=True)

            self.assertEqual(run().returncode, 0)
            self.assertEqual(run('--check').returncode, 0)
            self.assertFalse((base / 'execmap/public/_includes').exists())
            self.assertFalse((base / 'execmap/public/_data').exists())
            self.assertFalse((base / 'wire/public/_includes').exists())
            self.assertFalse((base / 'wire/public/_data').exists())
            for target in targets:
                public = base / target / ('public' if target in ['syscall', 'pin-atlas', 'execmap', 'wire'] else '')
                registry = 'console-projects.json' if target in {'execmap', 'wire'} else '_data/console_projects.json'
                self.assertEqual((public / registry).read_bytes(), (ROOT / '_data/console_projects.json').read_bytes())
                if target not in {'execmap', 'wire'}:
                    self.assertTrue((public / '_includes/console-header.html').is_file())
                    self.assertTrue((public / '_data/writing_topics.yml').is_file())
                # These two former forks must never become parity exemptions.
                for relative in ['assets/console/theme.js', 'assets/console/site.svg', 'assets/console/language.js', registry]:
                    with self.subTest(target=target, relative=relative):
                        path = public / relative
                        original = path.read_bytes()
                        path.write_text('outdated')
                        result = run('--check')
                        self.assertEqual(result.returncode, 1)
                        self.assertIn(str(path), result.stdout)
                        self.assertEqual(path.read_text(), 'outdated', '--check must be read-only')
                        self.assertEqual(run().returncode, 0)
                        self.assertEqual(path.read_bytes(), original)
                self.assertIn('See ICONS-LICENSE.txt.', (public / 'assets/console/site.svg').read_text())
                self.assertTrue((public / 'assets/console/ICONS-LICENSE.txt').is_file())
            (base / 'home').rename(base / 'missing-home')
            self.assertEqual(run('--check').returncode, 1)

    def targets(self, base):
        names = ['guides', 'home', 'syscall', 'pin-atlas', 'execmap', 'wire']
        command = [sys.executable, str(ROOT / 'scripts/sync.py')]
        for name in names:
            (base / name).mkdir()
            command.extend([f'--{name}', str(base / name)])
        return names, lambda *options: subprocess.run(command + list(options), capture_output=True, text=True)

    def test_check_rejects_unlisted_extras_and_copy_validates_first(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            _, run = self.targets(base)
            # A missing target stops the run before anything is copied elsewhere.
            (base / 'execmap').rename(base / 'missing-execmap')
            result = run()
            self.assertEqual(result.returncode, 1)
            self.assertIn('Nothing was copied', result.stdout)
            self.assertFalse((base / 'guides/assets').exists())
            (base / 'missing-execmap').rename(base / 'execmap')
            self.assertEqual(run().returncode, 0)
            # The documented site-owned files are accepted only in their own target.
            allowed = [
                base / 'home/assets/console/bundle.scss', base / 'home/assets/console/site.css',
                base / 'syscall/public/assets/console/syscall.css', base / 'execmap/public/assets/console/COPYING',
                base / 'wire/public/assets/console/COPYING',
            ]
            for path in allowed:
                path.write_text('site-owned')
            self.assertEqual(run('--check').returncode, 0)
            for stale in [
                base / 'guides/assets/console/site.css', base / 'pin-atlas/public/assets/console/old-theme.js',
                base / 'execmap/public/assets/console/fonts/Removed.woff2',
                base / 'wire/public/assets/console/old-theme.js',
            ]:
                with self.subTest(stale=stale):
                    stale.write_text('stale')
                    result = run('--check')
                    self.assertEqual(result.returncode, 1)
                    self.assertIn(str(stale), result.stdout)
                    # Copy mode reports the file and never deletes it.
                    result = run()
                    self.assertEqual(result.returncode, 0)
                    self.assertIn(str(stale), result.stdout)
                    self.assertTrue(stale.is_file())
                    stale.unlink()
            self.assertEqual(run('--check').returncode, 0)

    def test_check_compares_hand_written_headers_with_the_include(self):
        include = (ROOT / '_includes/console-header.html').read_text()
        sys.path.insert(0, str(ROOT / 'scripts'))
        from header_contract import extract_header, strip_liquid
        # What a Node site writes: the include's markup without Liquid or the home-only links.
        header = strip_liquid(extract_header(include, 'include'))
        # A Node adapter: the same markup inside a template literal, with its own links and interpolations.
        adapter = 'const page = `' + header.replace('<div class="console-tools">', '${nav.map(item => `<a href="${item.url}">${item.label}</a>`).join(\'\')}<div class="console-tools">') + '`;\n'
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            _, run = self.targets(base)

            def check():
                self.assertEqual(run().returncode, 0)
                return run('--check')

            self.assertEqual(check().returncode, 0, 'a target without a build script has no header to compare')
            for name in ['execmap', 'wire']:
                script = base / name / 'scripts/build.mjs'
                script.parent.mkdir()
                script.write_text(adapter)
            self.assertEqual(check().returncode, 0)

            cases = {
                'language moved out of the tools': (
                    lambda text: text.replace(language, '').replace('<button class="console-menu"', language + '<button class="console-menu"'),
                    'div.console-header-actions > label.console-language'),
                'project menu is not a nav': (
                    lambda text: text.replace('<nav class="console-project-menu"', '<div class="console-project-menu"'),
                    'div.console-project-menu'),
                'theme select lost its id': (
                    lambda text: text.replace(' id="console-theme-select"', ''),
                    'select id=console-theme-select'),
                'actions follow the navigation': (
                    lambda text: text.replace(actions, '').replace('</nav>\n  </div>\n</header>', '</nav>\n' + actions + '\n  </div>\n</header>'),
                    'out of order'),
                'header is gone': (lambda text: 'const page = ``;\n', 'expected one <header'),
            }
            language = header[header.index('<label class="console-language">'):header.index('</label>', header.index('<label class="console-language">')) + len('</label>')]
            actions = header[header.index('<div class="console-header-actions">'):header.index('</div>', header.index('<div class="console-header-actions">')) + len('</div>')]
            script = base / 'execmap/scripts/build.mjs'
            for label, (change, expected) in cases.items():
                with self.subTest(label):
                    changed = change(adapter)
                    self.assertNotEqual(changed, adapter)
                    script.write_text(changed)
                    result = check()
                    self.assertEqual(result.returncode, 1)
                    self.assertIn(str(script), result.stdout)
                    self.assertIn(expected, result.stdout)
                    self.assertEqual(script.read_text(), changed, 'sync never rewrites hand-written markup')
            script.write_text(adapter)
            self.assertEqual(check().returncode, 0)

    def test_commit_is_limited_to_synced_files_and_refuses_other_branches(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            names, run = self.targets(base)
            environment = {
                **os.environ, 'GIT_CONFIG_GLOBAL': os.devnull, 'GIT_CONFIG_SYSTEM': os.devnull,
                'GIT_AUTHOR_NAME': 'Test', 'GIT_AUTHOR_EMAIL': 'test@example.invalid',
                'GIT_COMMITTER_NAME': 'Test', 'GIT_COMMITTER_EMAIL': 'test@example.invalid',
            }

            def git(name, *arguments):
                return subprocess.run(['git', *arguments], cwd=base / name, capture_output=True, text=True, env=environment, check=True).stdout

            for name in names:
                git(name, 'init', '--quiet', '--initial-branch=main')
                (base / name / 'README').write_text('site')
                git(name, 'add', 'README')
                git(name, 'commit', '--quiet', '-m', 'Initial')
            # Unrelated work is already staged in one sibling.
            (base / 'guides/unrelated.txt').write_text('in progress')
            git('guides', 'add', 'unrelated.txt')
            # Another sibling sits on a feature branch: refuse before copying anywhere.
            git('syscall', 'checkout', '--quiet', '-b', 'feature')
            command = [sys.executable, str(ROOT / 'scripts/sync.py')]
            for name in names:
                command.extend([f'--{name}', str(base / name)])
            commit = lambda *options: subprocess.run(command + list(options), capture_output=True, text=True, env=environment)
            result = commit('--commit', 'Sync theme')
            self.assertEqual(result.returncode, 1)
            self.assertIn('syscall: refusing to commit on feature', result.stdout)
            self.assertFalse((base / 'guides/assets').exists())
            self.assertEqual(commit('--check', '--commit', 'Sync theme').returncode, 1)
            git('syscall', 'checkout', '--quiet', 'main')
            result = commit('--commit', 'Sync theme')
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            for name in names:
                self.assertEqual(git(name, 'log', '-1', '--format=%s').strip(), 'Sync theme')
            committed = git('guides', 'show', '--name-only', '--format=', 'HEAD').split()
            self.assertIn('assets/console/theme.js', committed)
            self.assertNotIn('unrelated.txt', committed)
            self.assertEqual(git('guides', 'status', '--porcelain').strip(), 'A  unrelated.txt')
            self.assertEqual(run('--check').returncode, 0)

    def test_duplicate_keys_and_lost_placeholders_fail_validation(self):
        with tempfile.TemporaryDirectory() as directory:
            fixture = Path(directory) / 'i18n.js'
            for dictionary, message in [
                ('{"Position":"Sıra","Position":"Konum"}', 'Duplicate translation key'),
                ('{"{count} results":"Sonuçlar"}', 'Placeholder mismatch'),
                ('{"Results":"{count} sonuç"}', 'Placeholder mismatch'),
            ]:
                fixture.write_text('  const translations = ' + dictionary + ';')
                result = subprocess.run([sys.executable, str(ROOT / 'scripts/check_i18n.py'), str(fixture)], capture_output=True, text=True)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(message, result.stderr)


if __name__ == '__main__':
    unittest.main()
